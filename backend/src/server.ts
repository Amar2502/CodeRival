import app from "./app";
import http from "http";
import { config } from "./config/config";
import { db } from "./config/db";
import { initializeSocket } from "./socket";

const server = http.createServer(app);
const PORT = config.PORT;

async function startServer() {
    try {
        await db.$connect();
        console.log("Database connected successfully");

        initializeSocket(server);
        console.log("Socket server initialized");

        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Database connection failed:", error);
        process.exit(1);
    }
}

startServer();