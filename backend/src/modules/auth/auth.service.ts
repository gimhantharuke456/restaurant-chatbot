import { prisma } from "../../../lib/db.js";
import { sendEmail } from "../../config/nodemailer.js";
import type { User } from "../../../generated/prisma/client.js";
import type { z } from "zod";
import type { RegisterBodySchema, UpdateProfileBodySchema } from "./auth.schema.js";

export type RegisterInput = z.infer<typeof RegisterBodySchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileBodySchema>;

export const findOrCreateUser = async (input: RegisterInput): Promise<User> => {
  const existing = await prisma.user.findUnique({
    where: { firebaseUid: input.firebaseUid },
  });
  if (existing) return existing;

  const hasDiningPrefs = input.cuisines || input.dietaryRestrictions || input.budgetPreference;

  const user = await prisma.user.create({
    data: {
      firebaseUid: input.firebaseUid,
      email: input.email,
      name: input.name,
      phone: input.phone,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
      preferredLanguage: input.preferredLanguage,
      diningPreferences: hasDiningPrefs
        ? {
            cuisines: input.cuisines ?? [],
            dietaryRestrictions: input.dietaryRestrictions ?? [],
            budgetPreference: input.budgetPreference,
            preferredDiningTimes: [],
            seatingPreferences: [],
          }
        : undefined,
    },
  });

  await sendEmail(
    user.email,
    "Welcome to Restaurant Chatbot!",
    `<h2>Welcome ${user.name ?? ""}!</h2>
     <p>Your account is ready. Start discovering restaurants in Colombo today.</p>`,
  ).catch((err) => console.error("Welcome email failed (non-fatal):", err));

  return user;
};

export const getUserById = async (id: string): Promise<User | null> => {
  return prisma.user.findUnique({ where: { id } });
};

export const updateUser = async (
  id: string,
  data: UpdateProfileInput,
): Promise<User> => {
  return prisma.user.update({ where: { id }, data });
};
