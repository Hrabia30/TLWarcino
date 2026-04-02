import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 4000,
  databaseUrl:
    process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/awarie",
  jwtSecret: process.env.JWT_SECRET || "super_secret_it_key",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  seedItEmail: process.env.SEED_IT_EMAIL || "it@firma.local",
  seedItPassword: process.env.SEED_IT_PASSWORD || "Admin123!"
};
