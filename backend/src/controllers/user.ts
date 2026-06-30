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
