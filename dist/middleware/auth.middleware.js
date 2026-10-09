"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const db_1 = require("../config/db");
const token_1 = require("../utils/token");
const COOKIE_NAME = process.env.COOKIE_NAME || "session_token";
const cookieOptions = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: (process.env.COOKIE_SAME_SITE || "lax"),
    path: "/",
};
async function authenticate(req, res, next) {
    try {
        const token = req.cookies?.[COOKIE_NAME];
        if (typeof token !== "string" || !token) {
            res.status(401).json({
                success: false,
                message: "Please log in.",
            });
            return;
        }
        const tokenHash = (0, token_1.hashSessionToken)(token);
        const result = await db_1.pool.query(`SELECT u.id, u.name, u.email
       FROM user_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1
         AND s.expires_at > NOW()
       LIMIT 1`, [tokenHash]);
        if (result.rowCount === 0) {
            res.clearCookie(COOKIE_NAME, cookieOptions);
            res.status(401).json({
                success: false,
                message: "Session expired or replaced. Please log in again.",
            });
            return;
        }
        req.user = result.rows[0];
        next();
    }
    catch (error) {
        next(error);
    }
}
