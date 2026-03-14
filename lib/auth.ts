import bcrypt from "bcryptjs";
import jwt from "jwt-simple";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";
const COOKIE_NAME = "crm_session";

export const hashPassword = (password: string) => bcrypt.hashSync(password, 10);
export const comparePassword = (password: string, hash: string) => bcrypt.compareSync(password, hash);

export function createToken(payload: object) {
  return jwt.encode({ ...payload, iat: Date.now() }, JWT_SECRET);
}

export function decodeToken(token: string) {
  try {
    return jwt.decode(token, JWT_SECRET) as { userId?: string } | null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const decoded = decodeToken(token);
  if (!decoded?.userId) return null;
  try {
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    return user;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return null;
    }
    throw error;
  }
}

export function getSessionCookie(token: string) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`;
}
export function getLogoutCookie() {
  return `${COOKIE_NAME}=deleted; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
