import jwt from "jsonwebtoken"
import { config } from "../config/config"

export const generateToken = (user: any) => {
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