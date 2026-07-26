import cron from "node-cron";
import { prisma } from "../../lib/db.js";
import { sendEmail } from "../config/nodemailer.js";

const REMINDER_WINDOW_HOURS = 3;

function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}

export const sendReservationReminders = async (): Promise<void> => {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

  // Narrow with a date-only range first (cheap index scan), then filter
  // precisely in JS once date + time are combined into a real timestamp.
  const candidates = await prisma.reservation.findMany({
    where: {
      status: "CONFIRMED",
      reminderSent: false,
      date: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), lte: windowEnd },
    },
    include: { restaurant: true, user: true },
  });

  for (const reservation of candidates) {
    const reservationAt = combineDateAndTime(reservation.date, reservation.time);
    if (reservationAt < now || reservationAt > windowEnd) continue;

    try {
      await sendEmail(
        reservation.user.email,
        `Reminder: your reservation at ${reservation.restaurant.name} is coming up`,
        `<h2>See you soon! 🍽️</h2>
         <p>This is a reminder for your upcoming reservation:</p>
         <p><strong>Restaurant:</strong> ${reservation.restaurant.name}</p>
         <p><strong>Address:</strong> ${reservation.restaurant.address}, ${reservation.restaurant.area}</p>
         <p><strong>Date:</strong> ${reservation.date.toDateString()}</p>
         <p><strong>Time:</strong> ${reservation.time}</p>
         <p><strong>Party size:</strong> ${reservation.partySize}</p>`,
      );
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { reminderSent: true },
      });
    } catch (err) {
      console.error(`Reservation reminder email failed for ${reservation.id}:`, err);
    }
  }
};

/** Runs every 15 minutes for the lifetime of the process. */
export const scheduleReservationReminders = (): void => {
  cron.schedule("*/15 * * * *", () => {
    sendReservationReminders().catch((err) =>
      console.error("Reservation reminder job failed:", err),
    );
  });
};
