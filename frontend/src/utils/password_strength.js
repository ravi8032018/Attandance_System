import zxcvbn from "zxcvbn";
import { useMemo } from "react";

export function PasswordStrengthBar({ password }) {
  // 0..4
  const score = useMemo(() => (password ? zxcvbn(password).score : 0), [password]);

  const steps = 4; // show 4 segments
  const active = Math.min(score, steps); // 0..4

  const colors = {
    0: "bg-slate-200",
    1: "bg-red-500",
    2: "bg-orange-500",
    3: "bg-amber-500",
    4: "bg-emerald-500",
  };

  const labels = {
    0: "Too weak",
    1: "Weak",
    2: "Fair",
    3: "Good",
    4: "Strong",
  };

  return (
    <div className="mt-2">
      {/* segmented bar */}
      <div className="flex gap-1">
        {Array.from({ length: steps }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 w-full rounded ${i < active ? colors[score] : "bg-slate-200"}`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-slate-500">{labels[score]}</p>
    </div>
  );
}
