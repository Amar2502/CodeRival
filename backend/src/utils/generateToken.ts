import jwt from "jsonwebtoken"
import { config } from "../config/config"
import crypto from "crypto"

type JwtUser = {
  id: string;
  username: string;
  email: string;
};

export const generateAuthToken = (user: JwtUser) => {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      email: user.email,
    },
    config.jwtSecret,
    { expiresIn: "30d" }
  )
}

export const generatePasswordResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};