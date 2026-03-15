import type { CustomFieldType } from "@prisma/client";

export const FIELD_TYPES: CustomFieldType[] = [
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "DATE",
  "SELECT",
  "BOOLEAN",
  "PHONE",
  "EMAIL",
];

export function normalizeEntityType(value: string | null | undefined): "LEAD" | "CONTACT" | null {
  if (!value) return null;
  const normalized = value.toUpperCase();
  if (normalized === "LEAD") return "LEAD";
  if (normalized === "CONTACT") return "CONTACT";
  return null;
}

export function normalizeFieldType(value: string | null | undefined): CustomFieldType | null {
  if (!value) return null;
  const normalized = value.toUpperCase() as CustomFieldType;
  return FIELD_TYPES.includes(normalized) ? normalized : null;
}

export function slugifyFieldName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_\-]/g, "")
    .replace(/[\s\-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

export function parseOptions(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => String(item ?? "").trim())
    .filter((item) => item.length > 0);
}

export function parseBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

export function validateEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validatePhone(value: string): boolean {
  return /^[+()\d\s-]{6,25}$/.test(value);
}

export function isValueEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

export function formatCustomFieldValue(definition: { fieldType: CustomFieldType }, value: {
  valueText?: string | null;
  valueNumber?: number | null;
  valueDate?: Date | string | null;
  valueBoolean?: boolean | null;
}) {
  switch (definition.fieldType) {
    case "NUMBER":
      return value.valueNumber ?? null;
    case "DATE":
      return value.valueDate ? new Date(value.valueDate).toISOString() : null;
    case "BOOLEAN":
      return value.valueBoolean ?? null;
    default:
      return value.valueText ?? null;
  }
}
