import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db/client";
import { requireApiUser } from "@/lib/server/auth/require-user";
import { saveCustomFieldValuesForEntity } from "@/lib/features/custom-fields/values";
import { badRequest, withApiHandler, jsonValidationError } from "@/lib/server/http/responses";

export async function GET(req: NextRequest) {
  return withApiHandler(async () => {
    const user = await requireApiUser(req);
    const contacts = await prisma.contact.findMany({
      where: { workspaceId: user.workspaceId },
      include: { leads: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ contacts });
  });
}

export async function POST(req: NextRequest) {
  return withApiHandler(async () => {
    const user = await requireApiUser(req);

    const body = await req.json();
    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const email = body.email ? String(body.email).trim() : null;
    const customFields = body.customFields || {};

    if (!name || !phone) {
      throw badRequest("name and phone are required");
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
      return jsonValidationError(error, "Invalid custom fields");
    }

    return NextResponse.json({ contact });
  });
}
