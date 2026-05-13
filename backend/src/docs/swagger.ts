import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import swaggerUi from "swagger-ui-express";
import type { Express } from "express";
import { registry } from "./registry.js";

// Side-effect imports — each registers its paths with the registry
import "../modules/auth/auth.schema.js";
import "../modules/user/user.schema.js";
import "../modules/restaurant/restaurant.schema.js";
import "../modules/reservation/reservation.schema.js";
import "../modules/payment/payment.schema.js";
import "../modules/chat/chat.schema.js";
import "../modules/admin/admin.schema.js";

export const buildSwaggerDocument = () => {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Restaurant Chatbot API",
      version: "1.0.0",
      description:
        "Agentic restaurant discovery and reservation system for the Colombo district, Sri Lanka.",
    },
    servers: [{ url: "http://localhost:3000", description: "Local development" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Firebase ID token — obtain from Firebase Auth client SDK",
        },
      },
    },
  });
};

export const setupSwagger = (app: Express): void => {
  const document = buildSwaggerDocument();
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(document));
  app.get("/api/docs.json", (_req, res) => res.json(document));
};
