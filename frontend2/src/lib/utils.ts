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
 * Evaluates role inputs (string, array, comma-separated) and returns the highest role in system hierarchy:
 * admin > hod > faculty > cr > student
 */
export function getHighestRole(rolesInput: string | string[] | undefined | null): string {
  const normalized = normalizeRoles(rolesInput);
  if (normalized.includes("admin")) return "admin";
  if (normalized.includes("hod")) return "hod";
  if (normalized.includes("faculty")) return "faculty";
  if (normalized.includes("cr")) return "cr";
  if (normalized.includes("student")) return "student";
  return normalized[0] || "user";
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

/**
 * Formats a date/time string, Date object, or timestamp into India Standard Time (IST, GMT+5:30).
 * Example output: "1 Aug 2026, 02:46 PM"
 */
export function formatDateTimeIST(dateInput: string | Date | number | null | undefined): string {
  if (!dateInput) return "—";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(dateInput);
  }
}

export function getMissingProfileFields(u: any): string[] {
  if (!u) return ["First Name", "Last Name", "Date of Birth", "Gender", "Contact Phone Number"];
  const missing: string[] = [];
  if (!u.first_name || !String(u.first_name).trim()) missing.push("First Name");
  if (!u.last_name || !String(u.last_name).trim()) missing.push("Last Name");
  if (!u.dob || !String(u.dob).trim()) missing.push("Date of Birth");
  if (!u.gender || !String(u.gender).trim()) missing.push("Gender");
  if (!u.contact_number && !u.phone && !u.contact_no) missing.push("Contact Phone Number");
  return missing;
}
