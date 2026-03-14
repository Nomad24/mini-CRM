import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getCustomFieldsForEntity, saveCustomFieldValuesForEntity } from "@/lib/custom-field-values";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const lead = await prisma.lead.findFirst({
    where: { id, workspaceId: user.workspaceId },
    include: { contact: true, notes: { include: { author: true } }, tasks: true, assignee: true },
  });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const customFields = await getCustomFieldsForEntity({
    workspaceId: user.workspaceId,
    entityType: "LEAD",
    leadId: id,
  });
  return NextResponse.json({ lead, customFields });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const lead = await prisma.lead.findFirst({ where: { id, workspaceId: user.workspaceId } });
    if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const data = await req.json();
    const { customFields } = data;
    const updateData: Record<string, unknown> = {};
    const updatable = ["title", "description", "source", "status", "assignedTo"];
    for (const key of updatable) {
      if (key in data) updateData[key] = data[key];
    }
    if ("dueDate" in data) {
      updateData["dueDate"] = data["dueDate"] ? new Date(data["dueDate"]) : null;
    }
    if (customFields && typeof customFields === "object") {
      try {
        await saveCustomFieldValuesForEntity({
          workspaceId: user.workspaceId,
          entityType: "LEAD",
          leadId: id,
          customFields,
          mode: "update",
        });
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid custom fields" }, { status: 400 });
      }
    }
    const updated = await prisma.lead.update({ where: { id }, data: updateData });
    const mergedCustomFields = await getCustomFieldsForEntity({
      workspaceId: user.workspaceId,
      entityType: "LEAD",
      leadId: id,
    });
    return NextResponse.json({ lead: updated, customFields: mergedCustomFields });
  } catch (err) {
    console.error("PATCH /api/leads/[id] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const lead = await prisma.lead.findFirst({ where: { id, workspaceId: user.workspaceId } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.task.deleteMany({ where: { leadId: id } });
  await prisma.note.deleteMany({ where: { leadId: id } });
  await prisma.lead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
