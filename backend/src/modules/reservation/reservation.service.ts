import { prisma } from "../../../lib/db.js";
import { adminFirestore } from "../../config/firebase.js";
import { sendEmail } from "../../config/nodemailer.js";
import { createNotification } from "../../../lib/notifications.js";
import { awardLoyaltyPoints } from "../user/user.service.js";
import type { z } from "zod";
import type {
  CreateReservationBodySchema,
  UpdateReservationBodySchema,
} from "./reservation.schema.js";

export type CreateReservationInput = z.infer<typeof CreateReservationBodySchema>;
export type UpdateReservationInput = z.infer<typeof UpdateReservationBodySchema>;

export const getUserReservations = async (userId: string) => {
  return prisma.reservation.findMany({
    where: { userId },
    include: {
      restaurant: true,
      payment: {
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          receiptUrl: true,
          orderItems: true,
          createdAt: true,
        },
      },
      review: { select: { id: true, rating: true, comment: true, imageUrls: true, createdAt: true } },
    },
    orderBy: { date: "desc" },
  });
};

export const getReservationById = async (id: string, userId: string) => {
  return prisma.reservation.findUnique({
    where: { id, userId },
    include: { restaurant: true, payment: true },
  });
};

export const createReservation = async (
  input: CreateReservationInput,
  userId: string,
  userEmail: string,
) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: input.restaurantId } });
  if (!restaurant || !restaurant.isActive) {
    throw Object.assign(new Error("Restaurant not found or inactive"), { status: 404 });
  }
  if (restaurant.totalSeats && input.partySize > restaurant.totalSeats) {
    throw Object.assign(
      new Error(`Party size exceeds restaurant capacity of ${restaurant.totalSeats}`),
      { status: 400 },
    );
  }

  // ── Slot availability check via Firestore ────────────────────────────────
  // Uses the same availability data the AI reservation agent reads, so there
  // is one source of truth and no extra DB query needed.
  // Firestore slots stay in sync: +1 on booking, -1 on cancellation.
  try {
    const availDoc = await adminFirestore
      .collection("restaurants")
      .doc(input.restaurantId)
      .collection("availability")
      .doc(input.date)
      .get();

    if (availDoc.exists) {
      type Slot = { time: string; bookedTables: number; totalTables: number; available: boolean };
      const slots: Slot[] = availDoc.data()?.slots ?? [];
      const slot = slots.find((s) => s.time === input.time);

      if (slot && !slot.available) {
        throw Object.assign(
          new Error("This time slot is fully booked. Please choose a different time."),
          { status: 409 },
        );
      }
    }
  } catch (e: unknown) {
    // Re-throw 409 conflicts; swallow Firestore read errors so a temporary
    // Firestore outage never blocks bookings.
    if ((e as { status?: number }).status === 409) throw e;
  }
  // ─────────────────────────────────────────────────────────────────────────

  const reservation = await prisma.reservation.create({
    data: {
      userId,
      restaurantId: input.restaurantId,
      date: new Date(input.date),
      time: input.time,
      partySize: input.partySize,
      specialRequests: input.specialRequests,
      status: "CONFIRMED",
    },
    include: { restaurant: true },
  });

  // Notify customer (best-effort)
  createNotification(
    userId,
    "RESERVATION_CONFIRMED",
    "Reservation Confirmed",
    `Your reservation at ${reservation.restaurant.name} on ${input.date} at ${input.time} is confirmed.`,
    { reservationId: reservation.id, restaurantId: input.restaurantId },
  ).catch(() => {});

  // Notify restaurant admin (best-effort)
  createNotification(
    reservation.restaurant.adminId,
    "RESERVATION_CONFIRMED",
    "New Reservation",
    `New reservation for ${input.partySize} guest(s) on ${input.date} at ${input.time}.`,
    { reservationId: reservation.id, restaurantId: input.restaurantId },
  ).catch(() => {});

  // Award loyalty points (best-effort)
  awardLoyaltyPoints(userId, 100, "EARN_RESERVATION", `Reservation at ${reservation.restaurant.name}`, reservation.id).catch(() => {});

  // Firestore sync (best-effort)
  adminFirestore
    .collection("reservations")
    .doc(reservation.id)
    .set({
      userId,
      restaurantId: input.restaurantId,
      date: input.date,
      time: input.time,
      partySize: input.partySize,
      status: "CONFIRMED",
      updatedAt: new Date().toISOString(),
    })
    .then(() => updateFirestoreSlot(input.restaurantId, input.date, input.time, +1))
    .catch((err) => console.error("Firestore sync failed (non-fatal):", err));

  // Confirmation email (best-effort)
  sendEmail(
    userEmail,
    "Reservation Confirmed!",
    `<h2>Your reservation is confirmed! 🎉</h2>
     <p><strong>Restaurant:</strong> ${reservation.restaurant.name}</p>
     <p><strong>Date:</strong> ${input.date}</p>
     <p><strong>Time:</strong> ${input.time}</p>
     <p><strong>Party size:</strong> ${input.partySize}</p>
     ${input.specialRequests ? `<p><strong>Special requests:</strong> ${input.specialRequests}</p>` : ""}
     <hr/>
     <p style="color:#555">👆 <strong>Next step:</strong> Return to the chat to pre-order food and beverages from the menu.
     Once you confirm your order, a secure payment link will be sent to this email.</p>`,
  ).catch((err) => console.error("Confirmation email failed (non-fatal):", err));

  return reservation;
};

export const cancelReservation = async (id: string, userId: string) => {
  const reservation = await prisma.reservation.update({
    where: { id, userId },
    data: { status: "CANCELLED" },
    include: { restaurant: true },
  });

  // Notify customer
  createNotification(
    reservation.userId,
    "RESERVATION_CANCELLED",
    "Reservation Cancelled",
    `Your reservation at ${reservation.restaurant.name} has been cancelled.`,
    { reservationId: id },
  ).catch(() => {});

  // Notify restaurant admin
  createNotification(
    reservation.restaurant.adminId,
    "RESERVATION_CANCELLED",
    "Reservation Cancelled",
    `A reservation for ${reservation.date.toISOString().split("T")[0]} at ${reservation.time} has been cancelled by the customer.`,
    { reservationId: id },
  ).catch(() => {});

  adminFirestore
    .collection("reservations")
    .doc(id)
    .update({ status: "CANCELLED", updatedAt: new Date().toISOString() })
    .then(() =>
      updateFirestoreSlot(
        reservation.restaurantId,
        reservation.date.toISOString().split("T")[0],
        reservation.time,
        -1,
      ),
    )
    .then(() => {
      // Notify waitlist that a slot has opened
      import("../waitlist/waitlist.service.js")
        .then(({ notifyWaitlistForSlot }) => {
          const dateStr = reservation.date.toISOString().split("T")[0];
          notifyWaitlistForSlot(reservation.restaurantId, dateStr, reservation.time).catch(() => {});
        })
        .catch(() => {});
    })
    .catch((err) => console.error("Firestore cancel sync failed (non-fatal):", err));

  return reservation;
};

export const updateReservation = async (
  id: string,
  userId: string,
  data: UpdateReservationInput,
) => {
  return prisma.reservation.update({
    where: { id, userId },
    data: {
      ...(data.date && { date: new Date(data.date) }),
      ...(data.time && { time: data.time }),
      ...(data.partySize && { partySize: data.partySize }),
      ...(data.specialRequests !== undefined && {
        specialRequests: data.specialRequests,
      }),
    },
  });
};

// ── internal helper ───────────────────────────────────────────────────────────

const updateFirestoreSlot = async (
  restaurantId: string,
  date: string,
  time: string,
  delta: number,
): Promise<void> => {
  const ref = adminFirestore
    .collection("restaurants")
    .doc(restaurantId)
    .collection("availability")
    .doc(date);

  const doc = await ref.get();
  if (!doc.exists) return;

  type Slot = { time: string; bookedTables: number; totalTables: number; available: boolean };
  const slots: Slot[] = doc.data()?.slots ?? [];

  const updated = slots.map((slot) => {
    if (slot.time !== time) return slot;
    const booked = Math.max(0, slot.bookedTables + delta);
    return { ...slot, bookedTables: booked, available: booked < slot.totalTables };
  });

  await ref.update({ slots: updated });
};
