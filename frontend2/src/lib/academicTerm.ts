export type TermMode = "odd" | "even" | "all";

export interface SemesterOption {
  value: string;
  label: string;
}

const ACADEMIC_TERM_KEY = "sams_academic_term_mode";

/**
 * Reads current term mode preference from localStorage (default: "odd").
 */
export function getSavedTermMode(): TermMode {
  if (typeof window === "undefined") return "odd";
  const saved = localStorage.getItem(ACADEMIC_TERM_KEY) as TermMode;
  if (saved && ["odd", "even", "all"].includes(saved)) {
    return saved;
  }
  return "odd";
}

/**
 * Saves term mode preference to localStorage and dispatches event.
 */
export function saveTermMode(mode: TermMode): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACADEMIC_TERM_KEY, mode);
  window.dispatchEvent(new Event("academic_term_change"));
}

/**
 * Returns active semester numbers for given term mode.
 */
export function getActiveSemesters(mode: TermMode): string[] {
  if (mode === "odd") {
    return ["1", "3", "5", "7"];
  }
  if (mode === "even") {
    return ["2", "4", "6", "8"];
  }
  return ["1", "2", "3", "4", "5", "6", "7", "8"];
}

/**
 * Generates options for CustomSelect dropdowns based on term mode.
 */
export function getSemesterSelectOptions(
  mode: TermMode = "odd",
  includeAllOption: boolean = true
): SemesterOption[] {
  const options: SemesterOption[] = [];

  if (includeAllOption) {
    options.push({ value: "all", label: "All Semesters" });
  }

  const activeSems = getActiveSemesters(mode);
  for (const sem of activeSems) {
    options.push({ value: sem, label: `Semester ${sem}` });
  }

  return options;
}
