export default function qs(obj: Record<string, unknown>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && String(value).trim().length > 0) {
      params.set(key, String(value));
    }
  }

  return params.toString();
}