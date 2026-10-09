"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSessionToken = generateSessionToken;
exports.hashSessionToken = hashSessionToken;
const node_crypto_1 = require("node:crypto");
function generateSessionToken() {
    return (0, node_crypto_1.randomBytes)(32).toString("hex");
}
function hashSessionToken(token) {
    return (0, node_crypto_1.createHash)("sha256")
        .update(token)
        .digest("hex");
}
