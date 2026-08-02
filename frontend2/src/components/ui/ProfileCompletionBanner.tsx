import React, { useState } from "react";
import Link from "next/link";
import { useUserMe } from "@/hooks/useUserMe";
import { getMissingProfileFields } from "@/lib/utils";

interface ProfileCompletionBannerProps {
  isProfileComplete?: boolean;
  userRole: "student" | "faculty";
  onOpenProfileModal?: () => void;
}

export function ProfileCompletionBanner({
  isProfileComplete,
  userRole,
  onOpenProfileModal,
}: ProfileCompletionBannerProps) {
  const { user } = useUserMe();
  const [dismissed, setDismissed] = useState(false);

  const missingFields = getMissingProfileFields(user);
  const complete = isProfileComplete ?? (user ? user.profile_complete === true || missingFields.length === 0 : false);

  if (complete || dismissed) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-500/30 p-4 mb-6 backdrop-blur-md shadow-lg shadow-amber-500/5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 text-xl shrink-0">
            ⚠️
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-amber-200 tracking-tight">
              Action Required: Complete Your Profile
            </h4>
            <p className="text-xs text-amber-300/80 max-w-2xl">
              Your account profile is missing required information. Please update your details to ensure seamless attendance records & system notifications.
            </p>
            {missingFields.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-bold text-amber-300">Pending:</span>
                {missingFields.map((field) => (
                  <span
                    key={field}
                    className="text-[10px] font-bold bg-amber-500/20 text-amber-200 border border-amber-500/40 px-2 py-0.5 rounded-md"
                  >
                    ⚠️ {field}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {onOpenProfileModal ? (
            <button
              onClick={onOpenProfileModal}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-amber-500/20"
            >
              Complete Now
            </button>
          ) : (
            <Link
              href={userRole === "faculty" ? "/faculty/profile?edit=true" : "/student/profile?edit=true"}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-amber-500/20"
            >
              Complete Now
            </Link>
          )}

          <button
            onClick={() => setDismissed(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-white font-medium text-xs border border-slate-700/50 transition-colors"
            title="Remind me on next login"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

