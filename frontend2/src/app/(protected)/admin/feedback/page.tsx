"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { exportToCSV, exportToPDF } from "@/lib/reportExporter";

interface SystemInfo {
  currentUrl?: string;
  browserDetails?: string;
  screenSize?: string;
  isOnline?: boolean;
  language?: string;
}

interface FeedbackItem {
  id: string;
  report_id?: string;
  user_name: string;
  user_email: string;
  user_role: string;
  type: string;
  title: string;
  description: string;
  attachment_name?: string | null;
  attachment_data?: string | null;
  system_info?: SystemInfo;
  status: string;
  created_at: string;
}

function FeedbackPageContent() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Accordion Expanded Cards (keyed by item ID)
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Mobile Actions Menu Dropdown state
  const [showMobileActions, setShowMobileActions] = useState<boolean>(false);

  // Universal Attachment viewer state (PDF, Images, Docs)
  const [activeAttachment, setActiveAttachment] = useState<{
    src: string;
    title: string;
    isPdf: boolean;
    isImage: boolean;
    virtualUrl?: string;
  } | null>(null);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const endpoint = statusFilter === "all" ? "/notifications/feedback" : `/notifications/feedback?status=${statusFilter}`;
      const res = await apiFetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data.items) ? data.items : []);
      }
    } catch (e) {
      // Silent error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [statusFilter]);

  const toggleAccordion = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await apiFetch(`/notifications/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
        );
      }
    } catch (e) {
      // Silent error
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredItems = items.filter((item) => {
    if (typeFilter === "all") return true;
    return item.type === typeFilter;
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "bug":
        return <Badge variant="error" showDot={false}>🐛 Bug Report</Badge>;
      case "feature":
        return <Badge variant="warning" showDot={false}>💡 Feature Suggestion</Badge>;
      case "performance":
        return <Badge variant="secondary" showDot={false}>⚡ Performance</Badge>;
      case "other":
        return <Badge variant="muted" showDot={false}>🌀 Other</Badge>;
      default:
        return <Badge variant="primary" showDot={false}>💬 Feedback</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return <Badge variant="success" showDot={false}>✓ Resolved</Badge>;
      case "in_progress":
        return <Badge variant="warning" showDot={false}>⏳ In Progress</Badge>;
      default:
        return <Badge variant="outline" showDot={false}>🟡 Open</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    const r = (role || "user").toLowerCase();
    if (r.includes("admin")) {
      return <Badge variant="success" showDot={false}>👑 ADMIN</Badge>;
    }
    if (r.includes("hod")) {
      return <Badge variant="warning" showDot={false}>🏛️ HOD</Badge>;
    }
    if (r.includes("cr")) {
      return <Badge variant="teal" showDot={false}>⭐ CR</Badge>;
    }
    if (r.includes("faculty") || r.includes("teacher")) {
      return <Badge variant="primary" showDot={false}>👨‍🏫 FACULTY</Badge>;
    }
    if (r.includes("student")) {
      return <Badge variant="teal" showDot={false}>🎓 STUDENT</Badge>;
    }
    return <Badge variant="muted" showDot={false}>👤 {(role || "USER").toUpperCase()}</Badge>;
  };

  const handleExportCSV = () => {
    setShowMobileActions(false);
    const cols = [
      { key: "report_id", label: "Report ID" },
      { key: "created_at_fmt", label: "Timestamp" },
      { key: "type_fmt", label: "Category" },
      { key: "status_fmt", label: "Status" },
      { key: "user_name", label: "Submitter Name" },
      { key: "user_role_fmt", label: "Role" },
      { key: "user_email", label: "Email" },
      { key: "reported_url", label: "Reported URL" },
      { key: "description_esc", label: "Description" },
      { key: "environment", label: "Environment" },
      { key: "attachment_route", label: "Attachment" },
    ];

    const dataToExport = filteredItems.map((item) => {
      const sys = item.system_info || {};
      const host = typeof window !== "undefined" ? window.location.origin : "";
      const attachmentRoute = item.attachment_data || item.attachment_name
        ? `${host}/api/notifications/feedback/${item.id}/attachment`
        : "None";

      return {
        report_id: item.report_id || `BUG-${item.id.slice(-5).toUpperCase()}`,
        created_at_fmt: new Date(item.created_at).toLocaleString(),
        type_fmt: item.type.toUpperCase(),
        status_fmt: item.status.toUpperCase(),
        user_name: item.user_name || "Anonymous",
        user_role_fmt: (item.user_role || "USER").toUpperCase(),
        user_email: item.user_email || "N/A",
        reported_url: sys.currentUrl || "N/A",
        description_esc: item.description || "",
        environment: `${sys.screenSize || "Unknown"} | Online: ${sys.isOnline ?? true} | ${sys.browserDetails || "Unknown"}`,
        attachment_route: attachmentRoute,
      };
    });

    exportToCSV("SAMS_Feedback_Telemetry_Report.csv", cols, dataToExport);
  };

  const handleExportPDF = () => {
    setShowMobileActions(false);
    const banner = [
      { label: "Status Filter:", value: statusFilter === "all" ? "All Statuses" : statusFilter.toUpperCase().replace("_", " ") },
      { label: "Category Filter:", value: typeFilter === "all" ? "All Categories" : typeFilter.toUpperCase() },
      { label: "Total Reports:", value: String(filteredItems.length) },
      { label: "Pending Bugs:", value: String(filteredItems.filter((d) => d.type === "bug" && d.status === "open").length) },
    ];

    const cols = [
      { key: "report_id", label: "Report ID" },
      { key: "title", label: "Title / Summary" },
      { key: "user_name", label: "Submitter" },
      { key: "type_fmt", label: "Category" },
      { key: "status_fmt", label: "Status" },
      { key: "reported_url", label: "Reported URL" },
      { key: "description", label: "Description" },
    ];

    const dataToExport = filteredItems.map((item) => ({
      report_id: item.report_id || `BUG-${item.id.slice(-5).toUpperCase()}`,
      title: item.title,
      user_name: `${item.user_name} (${(item.user_role || 'user').toUpperCase()})`,
      type_fmt: item.type.toUpperCase(),
      status_fmt: item.status.toUpperCase(),
      reported_url: item.system_info?.currentUrl || "N/A",
      description: item.description,
    }));

    exportToPDF("System Feedback & Bug Telemetry Report", banner, cols, dataToExport, undefined, undefined, "landscape");
  };

  const handleOpenAttachment = (item: FeedbackItem) => {
    const dataUrl = item.attachment_data || "";
    const name = item.attachment_name || "Attachment";
    const reportId = item.report_id || `BUG-${item.id.slice(-5).toUpperCase()}`;

    const isPdf = dataUrl.startsWith("data:application/pdf") || name.toLowerCase().endsWith(".pdf");
    const isImage = dataUrl.startsWith("data:image") || /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(name);

    setActiveAttachment({
      src: dataUrl,
      title: `${name} (${reportId})`,
      isPdf,
      isImage,
      virtualUrl: `/notifications/feedback/${item.id}/attachment`,
    });
  };

  return (
    <main className="p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header - Task 4 Button Reorder: Refresh First, CSV Second, Print/PDF Third */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <span>💡 Feedback &amp; Bug Reports</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Sequential tracking telemetry, bug investigation, and archival export engine.
          </p>
        </div>

        {/* Desktop Export & Refresh Actions (Refresh first, Export CSV second, Print/PDF third) */}
        <div className="hidden md:flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            onClick={fetchFeedback}
            className="rounded-xl border border-border bg-card hover:bg-muted text-foreground px-3.5 py-2 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
          >
            <span>🔄 Refresh</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
          >
            <span>📥 Export CSV</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
          >
            <span>🖨️ Print / PDF</span>
          </button>
        </div>

        {/* Mobile Consolidated Actions Dropdown */}
        <div className="relative md:hidden flex items-center justify-between gap-2">
          <button
            onClick={fetchFeedback}
            className="rounded-xl border border-border bg-card hover:bg-muted text-foreground px-3 py-1.5 text-xs font-bold transition-all shadow-xs flex items-center gap-1 shrink-0"
          >
            <span>🔄 Refresh</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMobileActions(!showMobileActions)}
              className="rounded-xl bg-indigo-600 text-white px-3.5 py-1.5 text-xs font-bold transition-all shadow-xs flex items-center gap-1 shrink-0"
            >
              <span>⚙️ Actions ⚙️</span>
            </button>

            {showMobileActions && (
              <div className="absolute right-0 top-full mt-2 z-50 w-44 rounded-xl border border-border bg-card shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={handleExportCSV}
                  className="w-full text-left px-3 py-2 text-xs font-bold rounded-lg hover:bg-muted flex items-center gap-2 text-emerald-600 dark:text-emerald-400"
                >
                  <span>📥 Export CSV</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full text-left px-3 py-2 text-xs font-bold rounded-lg hover:bg-muted flex items-center gap-2 text-purple-600 dark:text-purple-400"
                >
                  <span>🖨️ Print / PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters Bar with CustomSelect System Standards & Task 3 Total Reports Count Badge */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card border border-border rounded-2xl p-1 sm:p-4 shadow-xs">
        {/* Left Side: Desktop Status Tabs & Total Reports Counter Badge */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Desktop Status Tabs */}
          <div className="hidden md:flex rounded-xl border border-border bg-muted p-1 gap-1">
            {(["all", "open", "in_progress", "resolved"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-2 py-1 text-xs font-bold capitalize transition-colors ${statusFilter === st
                  ? "bg-indigo-600 dark:bg-indigo-500 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Task 3: Total Reports Count Badge paired with active filters */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted dark:bg-muted border border-indigo-500/20 font-bold text-xs shrink-0">
            <span>📊 Total Reports:</span>
            <span className="text-xs font-black px-2 py-0.5 ">
              {filteredItems.length}
            </span>
          </div>
        </div>

        {/* Mobile Status CustomSelect */}
        <div className="flex md:hidden items-center justify-between gap-2">
          <CustomSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            className="w-full"
            options={[
              { value: "all", label: "All Statuses" },
              { value: "open", label: "🟢 Open Reports" },
              { value: "in_progress", label: "⏳ In Progress" },
              { value: "resolved", label: "✓ Resolved" },
            ]}
          />
        </div>

        {/* Category Filter CustomSelect (System UI Standard with 'Other' type) */}
        <div className="w-full md:w-64">
          <CustomSelect
            label="Category"
            value={typeFilter}
            onChange={setTypeFilter}
            className="w-full"
            options={[
              { value: "all", label: "All Categories" },
              { value: "bug", label: "🐛 Bug Reports" },
              { value: "feature", label: "💡 Feature Suggestions" },
              { value: "general", label: "💬 General Feedback" },
              { value: "performance", label: "⚡ Performance" },
              { value: "other", label: "🌀 Other / Misc" },
            ]}
          />
        </div>
      </div>

      {/* Content List - Accordion Cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="solid-card rounded-2xl p-4 border border-border animate-pulse flex items-center justify-between">
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-1/6" />
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="solid-card rounded-2xl p-12 text-center border border-border bg-card space-y-2">
          <div className="text-3xl">📥</div>
          <h3 className="text-base font-extrabold text-foreground">No Reports Found</h3>
          <p className="text-xs text-muted-foreground">
            There are currently no feedback or bug reports matching the selected filters.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const reportId = item.report_id || `BUG-${item.id.slice(-5).toUpperCase()}`;
            const sys = item.system_info || {};
            const isExpanded = Boolean(expandedCards[item.id]);

            return (
              <div
                key={item.id}
                className="solid-card rounded-2xl border border-border bg-card hover:border-indigo-500/40 transition-all duration-200 shadow-xs overflow-hidden"
              >
                {/* 2-LINE HEADER ARCHITECTURE */}
                <div
                  onClick={() => toggleAccordion(item.id)}
                  className="p-4 cursor-pointer select-none hover:bg-muted/30 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Line 1: Report Title with ID Badge */}
                    <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-foreground truncate">
                      <span className="font-mono text-[13px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20 mr-2">
                        {reportId}
                      </span>
                      {item.title}
                    </h3>

                    {/* Line 2: Submitter Name, Role Badge, Category Badge, Status Badge */}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="font-bold text-foreground truncate max-w-fit">
                        Reported By: {item.user_name}
                      </span>

                      {/* Submitter Role Badge */}
                      {getRoleBadge(item.user_role)}

                      {/* Category Badge */}
                      {getTypeBadge(item.type)}

                      {/* Status Badge */}
                      {getStatusBadge(item.status)}
                    </div>
                  </div>

                  {/* Right: Expand/Collapse Chevron Icon */}
                  <div className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground transition-all shrink-0">
                    <svg
                      className={`w-5 h-5 transition-transform duration-300 ease-in-out ${isExpanded ? "rotate-180 text-indigo-500" : "rotate-0"
                        }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded Accordion Body */}
                <div
                  className={`transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${isExpanded ? "max-h-[1200px] opacity-100 border-t border-border/60" : "max-h-0 opacity-0"
                    }`}
                >
                  <div className="p-4 sm:p-5 space-y-4 bg-muted/10">
                    {/* Submitter Details bar for mobile view */}
                    {item.user_email && (
                      <div className="text-[11px] font-medium text-muted-foreground flex flex-wrap items-center gap-2 pb-1 border-b border-border/40">
                        <span>Email: <strong className="text-foreground">{item.user_email}</strong></span>
                        <span>•</span>
                        <span>Date: <strong className="text-foreground">{new Date(item.created_at).toLocaleString()}</strong></span>
                      </div>
                    )}

                    {/* Full Description Box */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                        Description
                      </span>
                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap p-3.5 rounded-xl border border-border/60 bg-muted/40">
                        {item.description}
                      </p>
                    </div>

                    {/* Environmental Telemetry Block */}
                    {(sys.currentUrl || sys.browserDetails) && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                          🖥️ Environmental Telemetry
                        </span>
                        <div className="p-3.5 rounded-xl border border-border/60 bg-muted/40 text-[11px] font-mono space-y-1.5 text-muted-foreground">
                          {sys.currentUrl && (
                            <div className="truncate">
                              <span className="font-bold text-foreground">URL: </span>
                              <span className="text-indigo-500 underline break-all">{sys.currentUrl}</span>
                            </div>
                          )}
                          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
                            {sys.screenSize && (
                              <span>
                                Viewport: <span className="text-foreground font-bold">{sys.screenSize}</span>
                              </span>
                            )}
                            {sys.isOnline !== undefined && (
                              <span>
                                Network State:{" "}
                                <span className={sys.isOnline ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>
                                  {sys.isOnline ? "🟢 Online" : "🔴 Offline"}
                                </span>
                              </span>
                            )}
                            {sys.language && (
                              <span>
                                Language: <span className="text-foreground font-bold">{sys.language}</span>
                              </span>
                            )}
                          </div>
                          {sys.browserDetails && (
                            <div className="text-[10px] text-muted-foreground/80 break-words pt-0.5">
                              Agent: {sys.browserDetails}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Attachment Link Chip Trigger */}
                    {(item.attachment_data || item.attachment_name) && (
                      <div className="pt-1 text-xs">
                        <span>📎 Attachment: </span>
                        <span className="text-indigo-500 font-mono underline">
                          {item.attachment_name || "attachment_file"} </span>
                        <button onClick={() => handleOpenAttachment(item)} className="cursor-pointer transition-all duration-200 hover:bg-muted/80 text-[10px] font-extrabold text-muted-foreground ml-1 bg-muted rounded-xl px-2 py-1 border border-border">
                          👁️ View File
                        </button>
                      </div>
                    )}

                    {/* Actions Footer */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-border/40">
                      {item.status !== "resolved" && (
                        <button
                          type="button"
                          disabled={updatingId === item.id}
                          onClick={() => handleUpdateStatus(item.id, "resolved")}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 text-center"
                        >
                          Mark as Resolved
                        </button>
                      )}
                      {item.status !== "in_progress" && item.status !== "resolved" && (
                        <button
                          type="button"
                          disabled={updatingId === item.id}
                          onClick={() => handleUpdateStatus(item.id, "in_progress")}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-bold transition-all disabled:opacity-50 text-center"
                        >
                          Mark In Progress
                        </button>
                      )}
                      {item.status === "resolved" && (
                        <button
                          type="button"
                          disabled={updatingId === item.id}
                          onClick={() => handleUpdateStatus(item.id, "open")}
                          className="w-full sm:w-auto px-4 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground text-xs font-bold transition-all disabled:opacity-50 text-center"
                        >
                          Re-open Report
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Universal Attachment Lightbox & PDF Viewer Modal */}
      {activeAttachment && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
          onClick={() => setActiveAttachment(null)}
        >
          <div
            className="relative w-full max-w-5xl h-[85vh] overflow-hidden rounded-2xl bg-card border border-border p-4 shadow-2xl flex flex-col space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h4 className="text-xs font-bold text-foreground font-mono truncate">
                📎 {activeAttachment.title}
              </h4>
              <div className="flex items-center gap-2">
                {activeAttachment.virtualUrl && (
                  <a
                    href={activeAttachment.virtualUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-indigo-600 text-white px-2.5 py-1 text-xs font-bold hover:bg-indigo-700 transition-colors"
                  >
                    ↗ Open in New Tab
                  </a>
                )}
                <button
                  onClick={() => setActiveAttachment(null)}
                  className="rounded-lg bg-muted text-foreground px-2.5 py-1 text-xs font-bold hover:bg-muted/80"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden flex items-center justify-center bg-black/30 rounded-xl">
              {activeAttachment.isPdf ? (
                activeAttachment.src ? (
                  <iframe
                    src={activeAttachment.src}
                    title={activeAttachment.title}
                    className="w-full h-full border-0 rounded-xl"
                  />
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <p className="text-xs font-bold text-foreground">
                      Document format ready for download or preview.
                    </p>
                    {activeAttachment.virtualUrl && (
                      <a
                        href={activeAttachment.virtualUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                      >
                        View Full PDF Document ↗
                      </a>
                    )}
                  </div>
                )
              ) : activeAttachment.isImage && activeAttachment.src ? (
                <img
                  src={activeAttachment.src}
                  alt={activeAttachment.title}
                  className="max-h-full max-w-full object-contain rounded-xl"
                />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <p className="text-xs font-bold text-muted-foreground">
                    Attachment file ready for inspection.
                  </p>
                  {activeAttachment.virtualUrl && (
                    <a
                      href={activeAttachment.virtualUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                    >
                      Download / Open Attachment ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function FeedbackAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs font-bold text-muted-foreground animate-pulse">
          Loading feedback ...
        </div>
      }
    >
      <FeedbackPageContent />
    </Suspense>
  );
}
