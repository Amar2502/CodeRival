export interface JwtPayload {
  userId: string;
  username: string;
  email: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface User {
      id: string;
      userId: string;
      username: string;
      email: string;
    }
  }
}