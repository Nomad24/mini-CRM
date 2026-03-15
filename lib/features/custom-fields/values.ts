import { prisma } from "@/lib/server/db/client";
import {
  formatCustomFieldValue,
  isValueEmpty,
  normalizeEntityType,
  parseBoolean,
  validateEmail,
  validatePhone,
} from "@/lib/features/custom-fields/definitions";

function valueDataFromInput(fieldType: string, rawValue: unknown, options: string[]) {
  if (isValueEmpty(rawValue)) return null;

  const cleanText = String(rawValue).trim();

  if (["TEXT", "TEXTAREA"].includes(fieldType)) {
    return { valueText: cleanText, valueNumber: null, valueDate: null, valueBoolean: null };
  }

  if (fieldType === "PHONE") {
    if (!validatePhone(cleanText)) throw new Error("Invalid phone format");
    return { valueText: cleanText, valueNumber: null, valueDate: null, valueBoolean: null };
  }

  if (fieldType === "EMAIL") {
    if (!validateEmail(cleanText)) throw new Error("Invalid email format");
    return { valueText: cleanText, valueNumber: null, valueDate: null, valueBoolean: null };
  }

  if (fieldType === "SELECT") {
    if (!options.includes(cleanText)) throw new Error("Invalid select option");
    return { valueText: cleanText, valueNumber: null, valueDate: null, valueBoolean: null };
  }

  if (fieldType === "NUMBER") {
    const numberValue = Number(rawValue);
    if (Number.isNaN(numberValue)) throw new Error("Invalid number format");
    return { valueText: null, valueNumber: numberValue, valueDate: null, valueBoolean: null };
  }

  if (fieldType === "DATE") {
    const dateValue = new Date(String(rawValue));
    if (Number.isNaN(dateValue.getTime())) throw new Error("Invalid date format");
    return { valueText: null, valueNumber: null, valueDate: dateValue, valueBoolean: null };
  }

  if (fieldType === "BOOLEAN") {
    const bool = parseBoolean(rawValue);
    if (bool === null) throw new Error("Invalid boolean format");
    return { valueText: null, valueNumber: null, valueDate: null, valueBoolean: bool };
  }

  throw new Error("Unsupported field type");
}

export async function saveCustomFieldValuesForEntity(params: {
  workspaceId: string;
  entityType: string;
  leadId?: string;
  contactId?: string;
  customFields?: Record<string, unknown>;
  mode: "create" | "update";
}) {
  const entityType = normalizeEntityType(params.entityType);
  if (!entityType) throw new Error("Invalid entity type");

  const customFields = params.customFields ?? {};
  if (typeof customFields !== "object" || Array.isArray(customFields)) {
    throw new Error("customFields must be an object");
  }

  const definitions = await prisma.customFieldDefinition.findMany({
    where: { workspaceId: params.workspaceId, entityType, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const bySlug = new Map(definitions.map((definition) => [definition.slug, definition]));

  for (const slug of Object.keys(customFields)) {
    if (!bySlug.has(slug)) {
      throw new Error(`Unknown custom field: ${slug}`);
    }
  }

  for (const definition of definitions) {
    const hasValue = Object.prototype.hasOwnProperty.call(customFields, definition.slug);
    const rawValue = (customFields as Record<string, unknown>)[definition.slug];

    if (params.mode === "create" && definition.isRequired && (!hasValue || isValueEmpty(rawValue))) {
      throw new Error(`Required custom field missing: ${definition.name}`);
    }

    if (params.mode === "update" && !hasValue) {
      continue;
    }

    const options = definition.optionsJson ? JSON.parse(definition.optionsJson) : [];
    const typed = valueDataFromInput(definition.fieldType, rawValue, options);

    const whereUnique = entityType === "LEAD"
      ? { definitionId_leadId: { definitionId: definition.id, leadId: params.leadId! } }
      : { definitionId_contactId: { definitionId: definition.id, contactId: params.contactId! } };

    if (!typed) {
      await prisma.customFieldValue.deleteMany({
        where: {
          definitionId: definition.id,
          leadId: entityType === "LEAD" ? params.leadId : null,
          contactId: entityType === "CONTACT" ? params.contactId : null,
        },
      });
      continue;
    }

    await prisma.customFieldValue.upsert({
      where: whereUnique,
      update: typed,
      create: {
        workspaceId: params.workspaceId,
        definitionId: definition.id,
        entityType,
        leadId: entityType === "LEAD" ? params.leadId! : null,
        contactId: entityType === "CONTACT" ? params.contactId! : null,
        ...typed,
      },
    });
  }
}

export async function getCustomFieldsForEntity(params: {
  workspaceId: string;
  entityType: string;
  leadId?: string;
  contactId?: string;
}) {
  const entityType = normalizeEntityType(params.entityType);
  if (!entityType) return [];

  const definitions = await prisma.customFieldDefinition.findMany({
    where: { workspaceId: params.workspaceId, entityType, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const values = await prisma.customFieldValue.findMany({
    where: {
      workspaceId: params.workspaceId,
      entityType,
      leadId: entityType === "LEAD" ? params.leadId : undefined,
      contactId: entityType === "CONTACT" ? params.contactId : undefined,
    },
  });

  const valueMap = new Map(values.map((value) => [value.definitionId, value]));

  return definitions.map((definition) => {
    const value = valueMap.get(definition.id);
    return {
      id: definition.id,
      name: definition.name,
      slug: definition.slug,
      fieldType: definition.fieldType,
      isRequired: definition.isRequired,
      placeholder: definition.placeholder,
      helpText: definition.helpText,
      options: definition.optionsJson ? JSON.parse(definition.optionsJson) : [],
      value: value
        ? formatCustomFieldValue(definition, {
            valueText: value.valueText,
            valueNumber: value.valueNumber,
            valueDate: value.valueDate,
            valueBoolean: value.valueBoolean,
          })
        : null,
    };
  });
}
