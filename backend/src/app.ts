import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimiter } from "./middleware/rateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { setupSwagger } from "./docs/swagger.js";
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import restaurantRoutes from "./modules/restaurant/restaurant.routes.js";

const app = express();

app.use(helmet());
app.use(cors({
  origin: `http://localhost:${process.env.FRONTEND_PORT || 3001}`,
  credentials: true,
}));
app.use(express.json());
app.use(rateLimiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

setupSwagger(app);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/restaurants", restaurantRoutes);

// more module routes added in later phases

app.use(errorHandler);

export default app;
