import rateLimit from "express-rate-limit";

const isDev = process.env.NODE_ENV !== "production";

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 10_000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev,
  message: { error: "Too many requests, please try again later." },
});
