"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const app = (0, express_1.default)();
app.disable("x-powered-by");
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
}));
app.use(express_1.default.json({ limit: "10kb" }));
app.use((0, cookie_parser_1.default)());
app.get("/health", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "API is running",
    });
});
app.use("/api/auth", auth_routes_1.default);
app.use((error, _req, res, _next) => {
    if (res.headersSent)
        return;
    if (error instanceof SyntaxError && "body" in error) {
        res.status(400).json({
            success: false,
            message: "Invalid JSON request body.",
        });
        return;
    }
    console.error("Unhandled API error:", error.message);
    res.status(500).json({
        success: false,
        message: "Internal server error.",
    });
});
exports.default = app;
