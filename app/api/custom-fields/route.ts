import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { normalizeEntityType, normalizeFieldType, parseOptions, slugifyFieldName } from "@/lib/custom-fields";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const entityType = normalizeEntityType(url.searchParams.get("entityType"));
  const activeOnly = url.searchParams.get("activeOnly") === "1";

  const where: { workspaceId: string; entityType?: "LEAD" | "CONTACT"; isActive?: boolean } = { workspaceId: user.workspaceId };
  if (entityType) where.entityType = entityType;
  if (activeOnly) where.isActive = true;

  const definitions = await prisma.customFieldDefinition.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({
    fields: definitions.map((item) => ({
      id: item.id,
      entityType: item.entityType,
      name: item.name,
      slug: item.slug,
      fieldType: item.fieldType,
      isRequired: item.isRequired,
      isActive: item.isActive,
      sortOrder: item.sortOrder,
      placeholder: item.placeholder,
      helpText: item.helpText,
      options: item.optionsJson ? JSON.parse(item.optionsJson) : [],
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const entityType = normalizeEntityType(body.entityType);
  const fieldType = normalizeFieldType(body.fieldType);
  const name = String(body.name || "").trim();

  if (!entityType || !fieldType || !name) {
    return NextResponse.json({ error: "entityType, fieldType, name are required" }, { status: 400 });
  }

  const slug = slugifyFieldName(name);
  if (!slug) return NextResponse.json({ error: "Invalid field name" }, { status: 400 });

  const exists = await prisma.customFieldDefinition.findFirst({
    where: { workspaceId: user.workspaceId, entityType, slug },
  });
  if (exists) return NextResponse.json({ error: "Field slug already exists" }, { status: 409 });

  const options = parseOptions(body.options);
  if (fieldType === "SELECT" && options.length === 0) {
    return NextResponse.json({ error: "Select field requires at least one option" }, { status: 400 });
  }

  const maxSort = await prisma.customFieldDefinition.aggregate({
    where: { workspaceId: user.workspaceId, entityType },
    _max: { sortOrder: true },
  });

  const created = await prisma.customFieldDefinition.create({
    data: {
      workspaceId: user.workspaceId,
      entityType,
      name,
      slug,
      fieldType,
      isRequired: Boolean(body.isRequired),
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : (maxSort._max.sortOrder ?? -1) + 1,
      placeholder: body.placeholder ? String(body.placeholder) : null,
      helpText: body.helpText ? String(body.helpText) : null,
      optionsJson: options.length > 0 ? JSON.stringify(options) : null,
    },
  });

  return NextResponse.json({
    field: {
      id: created.id,
      entityType: created.entityType,
      name: created.name,
      slug: created.slug,
      fieldType: created.fieldType,
      isRequired: created.isRequired,
      isActive: created.isActive,
      sortOrder: created.sortOrder,
      placeholder: created.placeholder,
      helpText: created.helpText,
      options,
    },
  });
}
