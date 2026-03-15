import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/db/client";
import { requireApiUser } from "@/lib/server/auth/require-user";
import { saveCustomFieldValuesForEntity } from "@/lib/features/custom-fields/values";
import { badRequest, withApiHandler, jsonValidationError } from "@/lib/server/http/responses";

export async function GET(req: NextRequest) {
  return withApiHandler(async () => {
    const user = await requireApiUser(req);
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const source = url.searchParams.get("source");
    const assignedTo = url.searchParams.get("assigned_to");
    const search = url.searchParams.get("search");

    const where: {
      workspaceId: string;
      status?: "NEW" | "CONTACTED" | "BOOKED" | "IN_PROGRESS" | "DONE" | "LOST";
      source?: string;
      assignedTo?: string;
      OR?: Array<{
        title?: { contains: string };
        contact?: { name?: { contains: string }; phone?: { contains: string } };
      }>;
    } = { workspaceId: user.workspaceId };
    if (status && ["NEW", "CONTACTED", "BOOKED", "IN_PROGRESS", "DONE", "LOST"].includes(status)) {
      where.status = status as "NEW" | "CONTACTED" | "BOOKED" | "IN_PROGRESS" | "DONE" | "LOST";
    }
    if (source) where.source = source;
    if (assignedTo) where.assignedTo = assignedTo;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { contact: { name: { contains: search } } },
        { contact: { phone: { contains: search } } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      include: { contact: true, assignee: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ leads });
  });
}

export async function POST(req: NextRequest) {
  return withApiHandler(async () => {
    const user = await requireApiUser(req);
    const data = await req.json();
    const { title, contactName, phone, email, source, description, assignedTo, dueDate, customFields } = data;
    if (!title || !contactName || !phone) {
      throw badRequest("Required fields missing");
    }

    let contact = await prisma.contact.findFirst({ where: { workspaceId: user.workspaceId, phone } });
    if (!contact) {
      contact = await prisma.contact.create({
        data: { name: contactName, phone, email: email || null, workspaceId: user.workspaceId },
      });
    }

    const lead = await prisma.lead.create({
      data: {
        title,
        description: description || null,
        source: source || null,
        status: "NEW",
        workspaceId: user.workspaceId,
        contactId: contact.id,
        assignedTo: assignedTo || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    try {
      await saveCustomFieldValuesForEntity({
        workspaceId: user.workspaceId,
        entityType: "LEAD",
        leadId: lead.id,
        customFields: customFields || {},
        mode: "create",
      });
    } catch (error) {
      await prisma.lead.delete({ where: { id: lead.id } });
      return jsonValidationError(error, "Invalid custom fields");
    }

    return NextResponse.json({ lead });
  });
}
