import { User } from "@prisma/client";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/server/auth/session";
import { unauthorized } from "@/lib/server/http/responses";

export async function requireApiUser(req: NextRequest): Promise<User> {
  const user = await getCurrentUser(req);
  if (!user) {
    throw unauthorized();
  }

  return user;
}
