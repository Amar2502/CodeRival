import jwt from "jsonwebtoken"
import { config } from "../config/config"

type JwtUser = {
  id: string;
  username: string;
  email: string;
};

export const generateToken = (user: JwtUser) => {
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