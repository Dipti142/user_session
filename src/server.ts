import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { pool } from "./config/db";

const PORT = Number(process.env.PORT || 3000);

async function startServer(): Promise<void> {
  try {
    await pool.query("SELECT 1");

    const server = app.listen(PORT, () => {
      console.log(`API running at http://localhost:${PORT}`);
    });

    const shutdown = () => {
      console.log("Shutting down server...");

      server.close(() => {
        void pool.end().finally(() => process.exit(0));
      });
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    console.error("Failed to start server:", error);
    await pool.end();
    process.exit(1);
  }
}

void startServer();