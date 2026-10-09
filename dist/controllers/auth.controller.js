"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.logout = logout;
exports.getMe = getMe;
const bcrypt_1 = __importDefault(require("bcrypt"));
const zod_1 = require("zod");
const db_1 = require("../config/db");
const token_1 = require("../utils/token");
const COOKIE_NAME = process.env.COOKIE_NAME || "session_token";
const TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 168);
if (!Number.isInteger(TTL_HOURS) || TTL_HOURS < 1 || TTL_HOURS > 720) {
    throw new Error("SESSION_TTL_HOURS must be between 1 and 720");
}
const sameSite = (process.env.COOKIE_SAME_SITE || "lax");
const secure = process.env.COOKIE_SECURE === "true";
if (sameSite === "none" && !secure) {
    throw new Error("SameSite=None requires COOKIE_SECURE=true");
}
const cookieOptions = {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    maxAge: TTL_HOURS * 60 * 60 * 1000,
};
const clearCookieOptions = {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
};
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(100),
    email: zod_1.z.string().trim().email().max(255),
    password: zod_1.z.string().min(8).max(72),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email().max(255),
    password: zod_1.z.string().min(1).max(72),
});
function getValidationErrors(error) {
    return error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
    }));
}
// POST /api/auth/register
async function register(req, res, next) {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: getValidationErrors(parsed.error),
            });
            return;
        }
        const name = parsed.data.name;
        const email = parsed.data.email.toLowerCase();
        const passwordHash = await bcrypt_1.default.hash(parsed.data.password, 12);
        const result = await db_1.pool.query(`INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (LOWER(email)) DO NOTHING
       RETURNING id, name, email, created_at`, [name, email, passwordHash]);
        if (result.rowCount === 0) {
            res.status(409).json({
                success: false,
                message: "An account with this email already exists.",
            });
            return;
        }
        res.status(201).json({
            success: true,
            message: "Registration successful. Please log in.",
            user: result.rows[0],
        });
    }
    catch (error) {
        next(error);
    }
}
// POST /api/auth/login
async function login(req, res, next) {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: getValidationErrors(parsed.error),
            });
            return;
        }
        const email = parsed.data.email.toLowerCase();
        const result = await db_1.pool.query(`SELECT id, name, email, password_hash
       FROM users
       WHERE LOWER(email) = $1
       LIMIT 1`, [email]);
        if (result.rowCount === 0) {
            res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
            return;
        }
        const user = result.rows[0];
        const passwordMatches = await bcrypt_1.default.compare(parsed.data.password, user.password_hash);
        if (!passwordMatches) {
            res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
            return;
        }
        const token = (0, token_1.generateSessionToken)();
        const tokenHash = (0, token_1.hashSessionToken)(token);
        const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000);
        // Replace the existing session atomically.
        await db_1.pool.query(`INSERT INTO user_sessions
         (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id)
       DO UPDATE SET
         token_hash = EXCLUDED.token_hash,
         expires_at = EXCLUDED.expires_at,
         created_at = NOW()`, [user.id, tokenHash, expiresAt]);
        res.cookie(COOKIE_NAME, token, cookieOptions);
        res.status(200).json({
            success: true,
            message: "Login successful.",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
            expiresAt,
        });
    }
    catch (error) {
        next(error);
    }
}
// POST /api/auth/logout
async function logout(req, res, next) {
    try {
        const token = req.cookies?.[COOKIE_NAME];
        if (typeof token === "string" && token.length > 0) {
            await db_1.pool.query(`DELETE FROM user_sessions
         WHERE token_hash = $1`, [(0, token_1.hashSessionToken)(token)]);
        }
        res.clearCookie(COOKIE_NAME, clearCookieOptions);
        res.status(200).json({
            success: true,
            message: "Logged out successfully.",
        });
    }
    catch (error) {
        next(error);
    }
}
// GET /api/auth/me
async function getMe(req, res) {
    res.status(200).json({
        success: true,
        user: req.user,
    });
}
