import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const conversation = await prisma.conversation.findFirst({
    where: { id, workspaceId: user.workspaceId },
    include: { contact: true },
  });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const providerLabel = conversation.provider === "WHATSAPP" ? "WhatsApp"
    : conversation.provider === "EMAIL" ? "Email"
    : conversation.provider === "TELEGRAM" ? "Telegram"
    : String(conversation.provider);

  // Determine title
  const defaultTitle = conversation.subject
    ? conversation.subject
    : conversation.lastMessagePreview
      ? `${providerLabel}: ${conversation.lastMessagePreview.slice(0, 60)}`
      : `${providerLabel} inquiry`;

  const title = String(body.title || defaultTitle).trim();
  const source = String(body.source || providerLabel).trim();
  const description = String(body.description || "").trim() || null;
  const dueDate = body.dueDate ? new Date(String(body.dueDate)) : null;

  // Resolve or create contact
  let contactId = conversation.contactId;

  if (!contactId) {
    // Try to find by phone or email
    const existingContact = conversation.externalPhone
      ? await prisma.contact.findFirst({ where: { workspaceId: user.workspaceId, phone: conversation.externalPhone } })
      : conversation.externalEmail
        ? await prisma.contact.findFirst({ where: { workspaceId: user.workspaceId, email: conversation.externalEmail } })
        : null;

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      const name = String(body.contactName || conversation.externalName || conversation.externalUsername || `Chat ${conversation.externalChatId}`).trim();
      const phone = String(body.phone || conversation.externalPhone || "").trim();
      const email = String(body.email || conversation.externalEmail || "").trim() || null;
      const contactPhone = phone || `email-${(email || "unknown").replace(/[^a-z0-9]/gi, "-")}`;

      const newContact = await prisma.contact.create({
        data: {
          workspaceId: user.workspaceId,
          name,
          phone: contactPhone,
          email: email || undefined,
        },
      });
      contactId = newContact.id;
    }
  }

  const lead = await prisma.lead.create({
    data: {
      workspaceId: user.workspaceId,
      contactId,
      title,
      source,
      description,
      dueDate,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      leadId: lead.id,
      contactId,
    },
  });

  return NextResponse.json({ lead }, { status: 201 });
}
