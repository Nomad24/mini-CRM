import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { parseOptions } from "@/lib/custom-fields";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.customFieldDefinition.findFirst({ where: { id, workspaceId: user.workspaceId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  if (body.fieldType !== undefined || body.entityType !== undefined || body.slug !== undefined) {
    return NextResponse.json({ error: "fieldType, entityType and slug cannot be changed" }, { status: 400 });
  }

  const options = body.options !== undefined ? parseOptions(body.options) : null;
  if (existing.fieldType === "SELECT" && options !== null && options.length === 0) {
    return NextResponse.json({ error: "Select field requires at least one option" }, { status: 400 });
  }

  const updated = await prisma.customFieldDefinition.update({
    where: { id },
    data: {
      name: body.name !== undefined ? String(body.name).trim() : existing.name,
      isRequired: body.isRequired !== undefined ? Boolean(body.isRequired) : existing.isRequired,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
      sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : existing.sortOrder,
      placeholder: body.placeholder !== undefined ? (body.placeholder ? String(body.placeholder) : null) : existing.placeholder,
      helpText: body.helpText !== undefined ? (body.helpText ? String(body.helpText) : null) : existing.helpText,
      optionsJson: options !== null ? (options.length > 0 ? JSON.stringify(options) : null) : existing.optionsJson,
    },
  });

  return NextResponse.json({
    field: {
      id: updated.id,
      entityType: updated.entityType,
      name: updated.name,
      slug: updated.slug,
      fieldType: updated.fieldType,
      isRequired: updated.isRequired,
      isActive: updated.isActive,
      sortOrder: updated.sortOrder,
      placeholder: updated.placeholder,
      helpText: updated.helpText,
      options: updated.optionsJson ? JSON.parse(updated.optionsJson) : [],
    },
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.customFieldDefinition.findFirst({ where: { id, workspaceId: user.workspaceId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.customFieldDefinition.delete({ where: { id } });

  return NextResponse.json({ ok: true, deletedId: id });
}
