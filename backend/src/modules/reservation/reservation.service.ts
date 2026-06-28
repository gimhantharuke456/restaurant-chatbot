import { prisma } from "../../../lib/db.js";
import { adminFirestore } from "../../config/firebase.js";
import { sendEmail } from "../../config/nodemailer.js";
import { createNotification } from "../../../lib/notifications.js";
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
