"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "@/lib/api";
import { CustomSelect } from "@/components/ui/CustomSelect";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [mounted, setMounted] = useState(false);
  const [feedbackType, setFeedbackType] = useState<string>("bug");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [attachmentData, setAttachmentData] = useState<string | null>(null);

  if (!isOpen || !mounted) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAttachment(file);
      const reader = new FileReader();
      reader.onload = () => {
        setAttachmentData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const systemInfo = {
        currentUrl: typeof window !== "undefined" ? window.location.href : "",
        browserDetails: typeof navigator !== "undefined" ? navigator.userAgent : "",
        screenSize: typeof window !== "undefined" ? `${window.innerWidth} x ${window.innerHeight}` : "",
        isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
        language: typeof navigator !== "undefined" ? navigator.language : "en-US",
      };

      const payload = {
        type: feedbackType,
        title: title.trim(),
        description: description.trim(),
        attachment_name: attachment ? attachment.name : null,
        attachment_data: attachmentData,
        system_info: systemInfo,
        submitted_at: new Date().toISOString(),
      };

      await apiFetch("/notifications/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => null);

      setSubmitting(false);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setTitle("");
        setDescription("");
        setAttachment(null);
        setAttachmentData(null);
        onClose();
      }, 1800);
    } catch (err: any) {
      setSubmitting(false);
      setErrorMsg("Failed to send feedback. Please try again.");
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 text-foreground animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-border/80 bg-muted/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">💡</span>
            <div>
              <h3 className="text-base font-black tracking-tight text-foreground">
                Submit Feedback / Report Bug
              </h3>
              <p className="text-[11px] text-muted-foreground font-medium">
                Report issues, suggest features, or share platform feedback.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Content / Form */}
        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-500 text-2xl font-bold">
              ✓
            </div>
            <h4 className="text-base font-extrabold text-foreground">
              Feedback Received!
            </h4>
            <p className="text-xs text-muted-foreground">
              Thank you for your submission. Our technical team will review your report.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 font-bold">
                {errorMsg}
              </div>
            )}

            {/* Type Dropdown */}
            <CustomSelect
              label="Feedback Type"
              value={feedbackType}
              onChange={setFeedbackType}
              className="w-full"
              options={[
                { value: "bug", label: "🐛 Bug Report (System Issue)" },
                { value: "feature", label: "💡 Feature Suggestion" },
                { value: "general", label: "💬 General Feedback" },
                { value: "performance", label: "⚡ Performance & UI Issue" },
                { value: "other", label: "🌀 Other / Miscellaneous" },
              ]}
            />

            {/* Title Input */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">
                Title / Summary
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Page loading issue or feature idea"
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-indigo-500/30 outline-none"
              />
            </div>

            {/* Description Textarea */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">
                Detailed Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the steps to reproduce the issue or detail your suggestion..."
                className="w-full p-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-indigo-500/30 outline-none resize-none"
              />
            </div>

            {/* Attachment Screenshot */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">
                Screenshot / Attachment (Optional)
              </label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-muted/40 hover:bg-muted/80 text-foreground text-xs font-bold transition-colors">
                  <span>📎 Attach File</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {attachment ? (
                  <span className="text-[11px] font-mono text-emerald-500 truncate max-w-[200px]">
                    ✓ {attachment.name}
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground/70">
                    PNG, JPG or PDF (Max 5MB)
                  </span>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/80">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-border text-muted-foreground font-bold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 text-white font-extrabold flex items-center gap-2 shadow-xs disabled:opacity-50 transition-all"
              >
                {submitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Submit Feedback</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
