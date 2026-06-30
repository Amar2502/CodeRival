import app from "./app";
import { config } from "./config/config";
import { db } from "./config/db";

const PORT = config.PORT;

async function start_server() {
    try {
        await db.$connect();
        console.log("Database connected successfully");
        
        app.listen(PORT, ()=> {
            console.log(`Server is running on port ${PORT}`);
        })
    }
    catch (error) {
        console.error("Database connection failed:", error);
    }
}

start_server()