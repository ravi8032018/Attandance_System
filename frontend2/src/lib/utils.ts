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

export function hasRole(userRoles: string | string[] | undefined | null, targetRole: "faculty" | "hod" | "student" | "admin"): boolean {
  const normalized = normalizeRoles(userRoles);
  if (targetRole === "faculty") {
    return normalized.includes("faculty") || normalized.includes("hod");
  }
  return normalized.includes(targetRole);
}
