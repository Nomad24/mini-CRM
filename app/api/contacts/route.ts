import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { saveCustomFieldValuesForEntity } from "@/lib/custom-field-values";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const contacts = await prisma.contact.findMany({
    where: { workspaceId: user.workspaceId },
    include: { leads: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ contacts });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();
  const email = body.email ? String(body.email).trim() : null;
  const customFields = body.customFields || {};

  if (!name || !phone) {
    return NextResponse.json({ error: "name and phone are required" }, { status: 400 });
  }

  const contact = await prisma.contact.create({
    data: {
      workspaceId: user.workspaceId,
      name,
      phone,
      email,
    },
  });

  try {
    await saveCustomFieldValuesForEntity({
      workspaceId: user.workspaceId,
      entityType: "CONTACT",
      contactId: contact.id,
      customFields,
      mode: "create",
    });
  } catch (error) {
    await prisma.contact.delete({ where: { id: contact.id } });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid custom fields" }, { status: 400 });
  }

  return NextResponse.json({ contact });
}
