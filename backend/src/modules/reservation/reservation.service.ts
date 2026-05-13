import { prisma } from "../../../lib/db.js";
import { adminFirestore } from "../../config/firebase.js";
import { sendEmail } from "../../config/nodemailer.js";
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
    include: { restaurant: true },
    orderBy: { date: "desc" },
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
    `<h2>Your reservation is confirmed!</h2>
     <p><strong>Restaurant:</strong> ${reservation.restaurant.name}</p>
     <p><strong>Date:</strong> ${input.date}</p>
     <p><strong>Time:</strong> ${input.time}</p>
     <p><strong>Party size:</strong> ${input.partySize}</p>
     ${input.specialRequests ? `<p><strong>Special requests:</strong> ${input.specialRequests}</p>` : ""}`,
  ).catch((err) => console.error("Confirmation email failed (non-fatal):", err));

  return reservation;
};

export const cancelReservation = async (id: string, userId: string) => {
  const reservation = await prisma.reservation.update({
    where: { id, userId },
    data: { status: "CANCELLED" },
    include: { restaurant: true },
  });

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
