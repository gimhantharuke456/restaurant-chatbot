import express from "express";
import cors from "cors";
import helmet from "helmet";
import { setupSwagger } from "./docs/swagger.js";

const app = express();

app.use(helmet());
app.use(cors({
  origin: `http://localhost:${process.env.FRONTEND_PORT || 3001}`,
  credentials: true,
}));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

setupSwagger(app);

// Module routes will be added in later phases here

export default app;
