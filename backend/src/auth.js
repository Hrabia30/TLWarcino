import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "./config.js";

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name
    },
    config.jwtSecret,
    { expiresIn: "7d" }
  );
}

export function authRequired(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Brak tokenu autoryzacji." });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token jest nieprawidlowy." });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Brak uprawnien." });
    }

    next();
  };
}
