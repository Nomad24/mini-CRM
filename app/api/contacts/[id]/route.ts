import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getCustomFieldsForEntity, saveCustomFieldValuesForEntity } from "@/lib/custom-field-values";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const contact = await prisma.contact.findFirst({
    where: { id, workspaceId: user.workspaceId },
    include: {
      leads: {
        select: {
          id: true,
          title: true,
          status: true,
          source: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const lastActivity = contact.leads[0]?.updatedAt ?? null;
  const customFields = await getCustomFieldsForEntity({
    workspaceId: user.workspaceId,
    entityType: "CONTACT",
    contactId: id,
  });
  return NextResponse.json({ contact, lastActivity, customFields });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await req.json();
  const { customFields } = data;
  const contact = await prisma.contact.findFirst({ where: { id, workspaceId: user.workspaceId } });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (customFields && typeof customFields === "object") {
    try {
      await saveCustomFieldValuesForEntity({
        workspaceId: user.workspaceId,
        entityType: "CONTACT",
        contactId: id,
        customFields,
        mode: "update",
      });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid custom fields" }, { status: 400 });
    }
  }

  const updated = await prisma.contact.update({ where: { id }, data: { name: data.name ?? contact.name, email: data.email ?? contact.email, phone: data.phone ?? contact.phone } });

  const mergedCustomFields = await getCustomFieldsForEntity({
    workspaceId: user.workspaceId,
    entityType: "CONTACT",
    contactId: id,
  });
  return NextResponse.json({ contact: updated, customFields: mergedCustomFields });
}
