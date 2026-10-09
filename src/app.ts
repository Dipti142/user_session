import express, {
  Request,
  Response,
  NextFunction,
} from "express";

import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth.routes";

const app = express();

app.disable("x-powered-by");

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "API is running",
  });
});

app.use("/api/auth", authRoutes);

app.use(
  (
    error: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    if (res.headersSent) return;

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
  }
);

export default app;