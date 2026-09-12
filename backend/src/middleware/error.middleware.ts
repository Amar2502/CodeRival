import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import multer from "multer";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  console.error(`[Error] ${req.method} ${req.url}:`, err);

  const isProduction = process.env.NODE_ENV === "production";

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size exceeds limit. Maximum allowed size is 5MB.",
      });
    }
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`,
    });
  }

  if (err instanceof AppError) {
    const isServerError = err.statusCode >= 500;
    return res.status(err.statusCode).json({
      success: false,
      message: isProduction && isServerError ? "Internal Server Error" : err.message,
      ...(err.details && (!isProduction || !isServerError) ? { details: err.details } : {}),
    });
  }

  return res.status(500).json({
    success: false,
    message: isProduction ? "Internal Server Error" : (err.message || "Internal Server Error"),
    ...(!isProduction && err.stack ? { stack: err.stack } : {}),
  });
};
