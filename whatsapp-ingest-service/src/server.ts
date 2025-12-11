// src/server.ts
import express from "express";
import { config } from "./config";
import { webhookRouter } from "./routes/webhook";
import { incidentsRouter } from "./routes/incidents";

const app = express();

// Parse JSON bodies
app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "whatsapp-ingest-service" });
});

// Webhook routes for WhatsApp
app.use("/webhook", webhookRouter);

// Incident APIs (for web/app + map)
app.use("/", incidentsRouter);

app.listen(config.port, () => {
  console.log(`whatsapp-ingest-service listening on port ${config.port}`);
});
