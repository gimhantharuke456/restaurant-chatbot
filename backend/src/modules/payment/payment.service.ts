import { stripe } from "../../config/stripe.js";
import { prisma } from "../../../lib/db.js";
import { sendEmail } from "../../config/nodemailer.js";
import { createNotification } from "../../../lib/notifications.js";
import type Stripe from "stripe";

const SERVICE_CHARGE_RATE = 0.10;

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3001";

export interface OrderItemInput {
  menuItemId?: string | null;
  name: string;
  price: number;
  quantity: number;
  category?: string;
}

export const createPaymentIntent = async (
  reservationId: string,
  amount: number,
  userId: string,
): Promise<{ clientSecret: string }> => {
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: "lkr",
    metadata: { reservationId, userId },
  });
  return { clientSecret: intent.client_secret! };
};

export const createCheckoutSession = async (
  reservationId: string,
  userId: string,
  userEmail: string,
  orderItems: OrderItemInput[],
): Promise<{ paymentUrl: string; paymentId: string; amount: number }> => {
  // Resolve authoritative prices from the DB for any item that references a menuItemId.
  // Client-supplied prices are never trusted for identified menu items.
  const menuItemIds = orderItems
    .filter((i) => i.menuItemId)
    .map((i) => i.menuItemId as string);

  const dbItems = menuItemIds.length
    ? await prisma.menuItem.findMany({ where: { id: { in: menuItemIds }, isAvailable: true } })
    : [];
  const dbPriceMap = new Map(dbItems.map((m) => [m.id, m.price]));

  const verifiedItems = orderItems.map((item) => {
    if (!item.menuItemId) return item;
    const dbPrice = dbPriceMap.get(item.menuItemId);
    if (dbPrice === undefined) {
      throw Object.assign(
        new Error(`Menu item ${item.menuItemId} not found or unavailable`),
        { status: 400 },
      );
    }
    return { ...item, price: dbPrice };
  });

  const subtotal = verifiedItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const serviceCharge = Math.round(subtotal * SERVICE_CHARGE_RATE);
  const total = subtotal + serviceCharge;

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    ...verifiedItems.map((item) => ({
      price_data: {
        currency: "lkr" as const,
        product_data: { name: item.name, ...(item.category ? { description: item.category } : {}) },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    })),
    {
      price_data: {
        currency: "lkr" as const,
        product_data: { name: "Service Charge (10%)" },
        unit_amount: Math.round(serviceCharge * 100),
      },
      quantity: 1,
    },
  ];

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: lineItems,
    success_url: `${FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/payment/cancel`,
    customer_email: userEmail,
    metadata: { reservationId, userId },
    expires_at: Math.floor(Date.now() / 1000) + 86400, // 24 hours
  });

  const payment = await prisma.payment.create({
    data: {
      reservationId,
      userId,
      amount: total,
      currency: "LKR",
      stripePaymentId: session.id,
      status: "PENDING",
      checkoutUrl: session.url,
      orderItems: verifiedItems as object[],
    },
  });

  return { paymentUrl: session.url!, paymentId: payment.id, amount: total };
};

export const handleStripeWebhook = async (
  rawBody: Buffer,
  signature: string,
): Promise<void> => {
  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!,
  );

  // ── Checkout session completed ──────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const payment = await prisma.payment.update({
      where: { stripePaymentId: session.id },
      data: { status: "SUCCEEDED", receiptUrl: session.url ?? undefined },
      include: {
        user: true,
        reservation: { include: { restaurant: true } },
      },
    }).catch(() => null);

    if (payment) {
      createNotification(
        payment.userId,
        "PAYMENT_CONFIRMED",
        "Payment Confirmed",
        `Payment of LKR ${payment.amount.toLocaleString()} for your reservation at ${payment.reservation.restaurant.name} was successful.`,
        { paymentId: payment.id, reservationId: payment.reservationId },
      ).catch(() => {});

      const items = payment.orderItems as OrderItemInput[] | null;
      const itemRows = items?.map(
        (i) => `<tr><td>${i.name}</td><td>× ${i.quantity}</td><td>LKR ${(i.price * i.quantity).toLocaleString()}</td></tr>`
      ).join("") ?? "";

      sendEmail(
        payment.user.email,
        "Payment Confirmed — Your Order is Ready!",
        `<h2>Payment Successful!</h2>
         <p><strong>Restaurant:</strong> ${payment.reservation.restaurant.name}</p>
         <p><strong>Date:</strong> ${payment.reservation.date.toISOString().split("T")[0]}</p>
         <p><strong>Time:</strong> ${payment.reservation.time}</p>
         ${itemRows ? `<h3>Your Order</h3><table border="1" cellpadding="6" style="border-collapse:collapse">${itemRows}</table>` : ""}
         <p><strong>Total Paid:</strong> LKR ${payment.amount.toLocaleString()}</p>
         <p><em>Transaction: ${session.payment_intent as string}</em></p>`,
      ).catch((err) => console.error("Receipt email failed:", err));
    }
  }

  // ── PaymentIntent succeeded (legacy / fallback) ─────────────────
  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const { reservationId, userId } = intent.metadata;
    if (!reservationId) return; // not from our checkout flow

    // Skip if already handled via checkout.session.completed
    const existing = await prisma.payment.findUnique({ where: { reservationId } });
    if (existing?.status === "SUCCEEDED") return;

    if (!existing) {
      const payment = await prisma.payment.create({
        data: {
          reservationId,
          userId,
          amount: intent.amount / 100,
          currency: intent.currency.toUpperCase(),
          stripePaymentId: intent.id,
          status: "SUCCEEDED",
        },
        include: { user: true, reservation: { include: { restaurant: true } } },
      });

      sendEmail(
        payment.user.email,
        "Payment Receipt",
        `<h2>Payment Successful</h2>
         <p><strong>Restaurant:</strong> ${payment.reservation.restaurant.name}</p>
         <p><strong>Amount:</strong> LKR ${payment.amount.toFixed(2)}</p>
         <p><strong>Transaction ID:</strong> ${intent.id}</p>`,
      ).catch((err) => console.error("Receipt email failed:", err));
    } else {
      await prisma.payment.update({
        where: { reservationId },
        data: { status: "SUCCEEDED", stripePaymentId: intent.id },
      });
    }
  }

  // ── PaymentIntent failed ────────────────────────────────────────
  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const { reservationId, userId } = intent.metadata;
    if (!reservationId) return;

    await prisma.payment.upsert({
      where: { reservationId },
      create: {
        reservationId,
        userId,
        amount: intent.amount / 100,
        currency: intent.currency.toUpperCase(),
        stripePaymentId: intent.id,
        status: "FAILED",
      },
      update: { status: "FAILED" },
    });
  }
};

export const getPaymentHistory = async (userId: string) => {
  return prisma.payment.findMany({
    where: { userId },
    include: { reservation: { include: { restaurant: true } } },
    orderBy: { createdAt: "desc" },
  });
};
