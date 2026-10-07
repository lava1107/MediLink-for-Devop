import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../../.env") });

export const PORT = Number(process.env.PORT) || 5000;
export const DB_HOST = process.env.DB_HOST || "localhost";
export const DB_PORT = Number(process.env.DB_PORT) || 3306;
export const DB_USER = process.env.DB_USER || "root";
export const DB_PASSWORD = process.env.DB_PASSWORD || "";
export const DB_NAME = process.env.DB_NAME || "medilink";
export const JWT_SECRET = process.env.JWT_SECRET || "medilink_secret_jwt_key_2026";
export const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// Communication & Notification Environment Variables (Supports EMAIL_* / SMTP_* naming)
export const EMAIL_HOST = process.env.EMAIL_HOST || process.env.SMTP_HOST || "";
export const EMAIL_PORT = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT) || 587;
export const EMAIL_USER = process.env.EMAIL_USER || process.env.SMTP_USER || "";
export const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || process.env.SMTP_PASS || "";
export const EMAIL_FROM = process.env.EMAIL_FROM || process.env.SMTP_FROM || "MediLink Healthcare <noreply@medilink.com>";
export const EMAIL_SECURE = (process.env.EMAIL_SECURE || process.env.SMTP_SECURE) === "true";

export const SMTP_HOST = EMAIL_HOST;
export const SMTP_PORT = EMAIL_PORT;
export const SMTP_USER = EMAIL_USER;
export const SMTP_PASS = EMAIL_PASSWORD;
export const SMTP_FROM = EMAIL_FROM;
export const SMTP_SECURE = EMAIL_SECURE;

// SMS Provider Environment Variables (Supports SMS_* / TWILIO_* naming)
export const SMS_ACCOUNT_SID = process.env.SMS_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID || "";
export const SMS_AUTH_TOKEN = process.env.SMS_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN || "";
export const SMS_FROM_NUMBER = process.env.SMS_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER || "";

export const TWILIO_ACCOUNT_SID = SMS_ACCOUNT_SID;
export const TWILIO_AUTH_TOKEN = SMS_AUTH_TOKEN;
export const TWILIO_PHONE_NUMBER = SMS_FROM_NUMBER;
export const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY || "";

// Google OAuth Environment Variables
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
export const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback";

// AI Chatbot Environment Variables
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY || "";
export const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

