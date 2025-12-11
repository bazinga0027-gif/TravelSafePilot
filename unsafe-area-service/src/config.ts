import dotenv from "dotenv";

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),

  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    name: process.env.DB_NAME || "unsafe_areas",
    user: process.env.DB_USER || "unsafe_user",
    password: process.env.DB_PASSWORD || "unsafe_password",
    ssl: process.env.DB_SSL === "true"
  },

  corsOrigin: process.env.CORS_ORIGIN || "*"
};
