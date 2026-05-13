import type { Request } from "express";

export interface AuthUser {
  uid: string;
  email: string;
  role: string;
  dbId: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}
