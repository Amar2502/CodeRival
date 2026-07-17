import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../../config/config";
import cookie from "cookie";
import { JwtPayload } from "../../types/auth.types";

export const authSocket = (socket: Socket, next: (err?: Error) => void) => {
  try {
    const cookies = cookie.parseCookie(socket.handshake.headers.cookie || "");

    const token = cookies.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    socket.data.user = {
      id: decoded.userId,
    };

    next();
  } catch {
    next(new Error("Invalid token"));
  }
};
