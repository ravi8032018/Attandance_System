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
 * Formats faculty names with official title prefix (Dr. / Prof.) based on designation or string input.
 * Example: formatFacultyName({ first_name: "John", last_name: "Doe", designation: "Associate Professor" }) -> "Prof. John Doe"
 * Example: formatFacultyName("Prodipto Das") -> "Dr. Prodipto Das"
 */
export function formatFacultyName(
  facOrName?: string | { first_name?: string; last_name?: string; designation?: string; name?: string } | null,
  fallback = "Faculty Member"
): string {
  if (!facOrName) return fallback;
  if (typeof facOrName === "string") {
    const trimmed = facOrName.trim();
    if (!trimmed) return fallback;
    if (/^(dr|prof)\.?/i.test(trimmed)) return trimmed;
    return `Dr. ${trimmed}`;
  }

  const fn = (facOrName.first_name || "").trim();
  const ln = (facOrName.last_name || "").trim();
  let baseName = `${fn} ${ln}`.trim() || (facOrName.name || "").trim() || fallback;

  const desig = (facOrName.designation || "").toLowerCase();
  let prefix = "";
  if (desig.includes("doctor") || desig.includes("dr.") || desig.includes("dr ")) {
    prefix = "Dr. ";
  } else if (desig.includes("professor") || desig.includes("prof.") || desig.includes("prof ")) {
    prefix = "Prof. ";
  }

  if (prefix && baseName.toLowerCase().startsWith(prefix.toLowerCase().trim())) {
    prefix = "";
  }

  return `${prefix}${baseName}`.trim();
}

export function formatDesignation(desig?: string, fallback = "Assistant Professor"): string {
  if (!desig || !desig.trim()) return fallback;
  return desig.trim();
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

export function getFacultyInitials(name?: string, fallback = "F"): string {
  return getInitials(name, fallback);
}

export function getMissingProfileFields(user: any): string[] {
  if (!user) return [];
  const required = ["first_name", "last_name", "email", "phone_number", "contact_number"];
  return required.filter((field: string) => !user[field] || String(user[field]).trim() === "");
}

export function formatDateTimeIST(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return "N/A";
  try {
    const dateObj = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(dateObj.getTime())) return String(dateInput);

    return dateObj.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch (err) {
    return String(dateInput);
  }
}
