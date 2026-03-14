import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conversation = await prisma.conversation.findFirst({
    where: { id, workspaceId: user.workspaceId },
  });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const name = String(body.name || conversation.externalName || conversation.externalUsername || `Chat ${conversation.externalChatId}`).trim();
  const phone = String(body.phone || conversation.externalPhone || "").trim();
  const email = String(body.email || conversation.externalEmail || "").trim() || null;

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!phone && !email) return NextResponse.json({ error: "phone or email is required" }, { status: 400 });
  // phone is required by Contact model; use email domain placeholder if none provided
  const contactPhone = phone || `email-${(email || "unknown").replace(/[^a-z0-9]/gi, "-")}`;

  const contact = await prisma.contact.create({
    data: {
      workspaceId: user.workspaceId,
      name,
      phone: contactPhone,
      email: email || undefined,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { contactId: contact.id },
  });

  return NextResponse.json({ contact }, { status: 201 });
}
