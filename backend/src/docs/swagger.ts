import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import swaggerUi from "swagger-ui-express";
import type { Express } from "express";
import { registry } from "./registry.js";

// Side-effect imports — each file registers its paths with the registry.
// Add a new import here whenever a new module schema file is created.
// (populated in later phases)

export const buildSwaggerDocument = () => {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Restaurant Chatbot API",
      version: "1.0.0",
      description:
        "Agentic restaurant discovery and reservation system for the Colombo district.",
    },
    servers: [
      { url: "http://localhost:3000", description: "Local development" },
    ],
  });
};

export const setupSwagger = (app: Express): void => {
  const document = buildSwaggerDocument();
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(document));
  app.get("/api/docs.json", (_req, res) => res.json(document));
};
