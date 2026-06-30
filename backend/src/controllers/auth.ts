import { Request, Response } from "express";
import { db } from "../config/db";
import { generateToken } from "../utils/generateToken";

export const register = async (req: Request, res: Response) => {
  const { name, email, username, password } = req.body;

  if (!name || !email || !password || !username) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }

  try {

    const emailExists = await db.user.findUnique({
      where: { email },
    });
    if (emailExists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const usernameExists = await db.user.findUnique({
      where: { username },
    });
    if (usernameExists) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const user = await db.user.create({
      data: {
        name,
        email,
        username,
        passwordHash: password,
      },
    });

    const token = generateToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      userId: user.id,
      username: user.username,
      email: user.email,
      message: "User registered successfully",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  const { id, password } = req.body;

  if (!id || !password) {
    res.status(400).json({ message: "All fields are required" });
    return;
  }
  try {
    const user = await db.user.findFirst({
      where: {
        OR: [{ email: id }, { username: id }],
      },
    });

    if (!user) {
      res.status(400).json({ message: "User does not exist" });
      return;
    }

    if (user.passwordHash !== password) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    const token = generateToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      userId: user.id,
      email: user.email,
      username: user.username,
      message: "User logged in successfully",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
