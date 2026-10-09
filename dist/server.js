"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const PORT = Number(process.env.PORT || 3000);
async function startServer() {
    try {
        await db_1.pool.query("SELECT 1");
        const server = app_1.default.listen(PORT, () => {
            console.log(`API running at http://localhost:${PORT}`);
        });
        const shutdown = () => {
            console.log("Shutting down server...");
            server.close(() => {
                void db_1.pool.end().finally(() => process.exit(0));
            });
        };
        process.on("SIGTERM", shutdown);
        process.on("SIGINT", shutdown);
    }
    catch (error) {
        console.error("Failed to start server:", error);
        await db_1.pool.end();
        process.exit(1);
    }
}
void startServer();
