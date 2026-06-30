import { Request, Response } from "express";
import { db } from "../config/db";

export const checkUsername = async (req: Request, res: Response) => {
  const username = req.query.username;

  if (!username) {
    return res.status(400).json({ message: "Username required" });
  }

  const user = await db.user.findUnique({
    where: { username: String(username) },
  });

  return res.status(200).json({ available: !user });
};

export const getMe = (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  return res.status(200).json({
    user: {
      id: req.user.userId,
      username: req.user.username,
      email: req.user.email,
    },
  });
};