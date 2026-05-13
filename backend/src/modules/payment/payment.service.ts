import { stripe } from "../../config/stripe.js";
import { prisma } from "../../../lib/db.js";
import { sendEmail } from "../../config/nodemailer.js";
import type Stripe from "stripe";

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

export const handleStripeWebhook = async (
  rawBody: Buffer,
  signature: string,
): Promise<void> => {
  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!,
  );

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const { reservationId, userId } = intent.metadata;

    const payment = await prisma.payment.create({
      data: {
        reservationId,
        userId,
        amount: intent.amount / 100,
        currency: intent.currency.toUpperCase(),
        stripePaymentId: intent.id,
        status: "SUCCEEDED",
      },
      include: {
        user: true,
        reservation: { include: { restaurant: true } },
      },
    });

    sendEmail(
      payment.user.email,
      "Payment Receipt",
      `<h2>Payment Successful</h2>
       <p><strong>Restaurant:</strong> ${payment.reservation.restaurant.name}</p>
       <p><strong>Amount:</strong> LKR ${payment.amount.toFixed(2)}</p>
       <p><strong>Transaction ID:</strong> ${intent.id}</p>`,
    ).catch((err) => console.error("Receipt email failed (non-fatal):", err));
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const { reservationId, userId } = intent.metadata;

    await prisma.payment.upsert({
      where: { stripePaymentId: intent.id },
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
