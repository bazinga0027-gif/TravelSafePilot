// unsafe-area-service/src/server.ts

import express from "express";
import cors from "cors";
import morgan from "morgan";

import alertsRouter from "./routes/alerts";
import unsafeAreasRouter from "./routes/unsafeAreas";

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Mount feature routers
app.use("/alerts", alertsRouter);
app.use("/unsafe-areas", unsafeAreasRouter);

// Only start listening if this file is run directly
const port = process.env.PORT || 4001;
if (require.main === module) {
  app.listen(port, () => {
    console.log(`unsafe-area-service listening on port ${port}`);
  });
}

export default app;
