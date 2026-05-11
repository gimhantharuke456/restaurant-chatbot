import { User, Restaurant, MenuItem, Reservation } from "@prisma/client";

export type SeedUser = User;
export type SeedRestaurant = Restaurant & { admin: User };
export type SeedMenuItem = MenuItem & { restaurant: Restaurant };
export type SeedReservation = Reservation & { user: User; restaurant: Restaurant };
