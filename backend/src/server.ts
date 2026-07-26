import app from "./app";
import http from "http";
import { config } from "./config/config";
import { db } from "./config/db";
import { initializeSocket } from "./socket";
import { startSubmissionWorker, stopSubmissionWorker } from "./modules/submission";

const server = http.createServer(app);
const PORT = config.PORT;

async function startServer() {
  try {
    await db.$connect();
    console.log("Database connected successfully");

    initializeSocket(server);
    console.log("Socket server initialized");

    // Initialize BullMQ submission worker
    startSubmissionWorker();

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

// Graceful shutdown handling
const shutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  try {
    await stopSubmissionWorker();
    await db.$disconnect();
    server.close(() => {
      console.log("HTTP server closed.");
      process.exit(0);
    });
  } catch (err) {
    console.error("Error during graceful shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer();