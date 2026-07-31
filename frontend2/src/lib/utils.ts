export function qs(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") {
      searchParams.append(key, String(value));
    }
  }
  const str = searchParams.toString();
  return str ? `?${str}` : "";
}

export function normalizeRoles(rolesInput: string | string[] | undefined | null): string[] {
  if (!rolesInput) return [];
  const rawArray = Array.isArray(rolesInput) ? rolesInput : [rolesInput];
  return rawArray
    .filter((r): r is string => typeof r === "string" && r.trim().length > 0)
    .map((r) => r.trim().toLowerCase());
}

export function hasRole(userRoles: string | string[] | undefined | null, targetRole: "faculty" | "hod" | "student" | "admin" | "cr"): boolean {
  const normalized = normalizeRoles(userRoles);
  if (targetRole === "faculty") {
    return normalized.includes("faculty") || normalized.includes("hod");
  }
  return normalized.includes(targetRole);
}

/**
 * Ensures faculty names always have "Dr." prefix when displayed as text.
 * Example: "Prodipto Das" -> "Dr. Prodipto Das"
 */
export function formatFacultyName(name?: string, fallback = "Dr. Faculty"): string {
  if (!name || !name.trim()) return fallback;
  const trimmed = name.trim();
  if (/^dr\.?/i.test(trimmed)) {
    return trimmed;
  }
  return `Dr. ${trimmed}`;
}

/**
 * Extracts uppercase initials from a name, ignoring honorific titles (Dr., Prof., Mr., etc.).
 * Example: "Dr. Prodipto Das" -> "PD"
 * Example: "Dr. Pankaj Kumar Deva" -> "PKD"
 */
export function getInitials(name?: string, fallback = "F"): string {
  if (!name || !name.trim()) return fallback;
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => !/^(dr|prof|mr|mrs|ms)\.?$/i.test(part));

  if (parts.length === 0) return fallback;
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

export function getFacultyInitials(firstName?: string, lastName?: string): string {
  const rawName = `${firstName || ""} ${lastName || ""}`.trim();
  return getInitials(rawName, "F");
}

/**
 * Normalizes and formats faculty designation to Title Case.
 * Example: "ASSISTANT PROFESSOR" -> "Assistant Professor"
 * Example: "Associate PROFESSOR" -> "Associate Professor"
 * Example: "lab assistant" -> "Lab Assistant"
 */
export function formatDesignation(designation?: string, fallback = "Faculty"): string {
  if (!designation || !designation.trim()) return fallback;
  return designation
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

