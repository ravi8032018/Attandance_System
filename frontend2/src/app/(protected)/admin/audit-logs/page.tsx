"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { formatDateTimeIST, getHighestRole, normalizeRoles } from "@/lib/utils";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { exportToPDF, ReportColumn } from "@/lib/reportExporter";

interface AuditLogEntry {
  action: string;
  timestamp: string;
  severity?: "INFO" | "MODIFY" | "MODIFICATION" | "CRITICAL" | string;
  user_email?: string;
  user_name?: string;
  user_id?: string;
  user_role?: string;
  ip_address?: string;
  user_agent?: string;
  previous_state?: any;
  new_state?: any;
  details?: any;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtering Array States
  const [searchTerm, setSearchTerm] = useState("");
  const [datePreset, setDatePreset] = useState<"today" | "7days" | "30days" | "all" | "custom">("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Severity Toggles (Default: INFO = false to eliminate routine static, MODIFY & CRITICAL = true)
  const [severityFilters, setSeverityFilters] = useState<{ INFO: boolean; MODIFY: boolean; CRITICAL: boolean }>({
    INFO: false,
    MODIFY: true,
    CRITICAL: true,
  });

  const [actorRoleFilter, setActorRoleFilter] = useState<string>("all");

  // Expandable Accordion Rows State
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/admin/audit-logs?limit=500");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const toggleRowExpanded = (idx: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  // Preset Date Filter Handler
  const handleDatePresetChange = (preset: "today" | "7days" | "30days" | "all" | "custom") => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10);
      setStartDate(start);
      setEndDate(start);
    } else if (preset === "7days") {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === "30days") {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
  };

  // Helper to categorize severity if missing
  const getSeverity = (log: AuditLogEntry): "INFO" | "MODIFY" | "CRITICAL" => {
    const raw = (log.severity || "").toUpperCase();
    if (raw === "CRITICAL") return "CRITICAL";
    if (raw === "MODIFY" || raw === "MODIFICATION") return "MODIFY";
    if (raw === "INFO") return "INFO";

    const act = (log.action || "").toLowerCase();
    if (anyMatch(act, ["login", "signup", "delete", "promote", "revoke", "password", "role"])) return "CRITICAL";
    if (anyMatch(act, ["create", "update", "add", "assign", "unassign", "edit", "save"])) return "MODIFY";
    return "INFO";
  };

  function anyMatch(str: string, terms: string[]): boolean {
    return terms.some((t) => str.includes(t));
  }

  // Filtered dataset
  const filteredLogs = logs.filter((log) => {
    const sev = getSeverity(log);

    // 1. Severity filter check
    if (!severityFilters[sev]) return false;

    // 2. Actor Role check
    if (actorRoleFilter !== "all") {
      const highestRole = getHighestRole(log.user_role).toLowerCase();
      const normRoles = normalizeRoles(log.user_role);
      const targetRole = actorRoleFilter.toLowerCase();
      const isMatch = highestRole === targetRole || normRoles.includes(targetRole);
      if (!isMatch) return false;
    }

    // 3. Date Range check
    if (startDate) {
      const logDate = log.timestamp ? log.timestamp.slice(0, 10) : "";
      if (logDate < startDate) return false;
    }
    if (endDate) {
      const logDate = log.timestamp ? log.timestamp.slice(0, 10) : "";
      if (logDate > endDate) return false;
    }

    // 4. Search query check
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const concat = `${log.action || ""} ${log.user_email || ""} ${log.user_name || ""} ${log.user_id || ""} ${getHighestRole(log.user_role)} ${log.ip_address || ""} ${log.user_agent || ""} ${typeof log.details === "string" ? log.details : JSON.stringify(log.details || "")}`.toLowerCase();
      if (!concat.includes(term)) return false;
    }

    return true;
  });

  // Compliance Export: CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ["Timestamp (IST)", "Severity", "Action", "Actor Email", "Actor Name", "Actor ID", "Highest Role", "IP Address", "User Agent", "Details"];
    const rows = filteredLogs.map((l) => [
      `"${formatDateTimeIST(l.timestamp)}"`,
      `"${getSeverity(l)}"`,
      `"${l.action || ""}"`,
      `"${l.user_email || ""}"`,
      `"${l.user_name || ""}"`,
      `"${l.user_id || ""}"`,
      `"${getHighestRole(l.user_role).toUpperCase()}"`,
      `"${l.ip_address || "N/A"}"`,
      `"${(l.user_agent || "N/A").replace(/"/g, '""')}"`,
      `"${typeof l.details === "string" ? l.details.replace(/"/g, '""') : JSON.stringify(l.details || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_security_matrix_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compliance Export: Print / PDF (HOD Dashboard Standard, Portrait Mode)
  const handleExportPDF = () => {
    if (filteredLogs.length === 0) return;

    const auditColumns: ReportColumn[] = [
      { key: "timestamp", label: "Timestamp (IST)", align: "center" },
      { key: "severity", label: "Severity", align: "center" },
      { key: "action", label: "Action Event", align: "left" },
      { key: "actor", label: "Actor Identity", align: "left" },
      { key: "ip", label: "IP Address", align: "center" },
      { key: "details", label: "Payload / Details", align: "left" },
    ];

    const pdfData = filteredLogs.map((l) => ({
      timestamp: formatDateTimeIST(l.timestamp),
      severity: getSeverity(l),
      action: l.action || "N/A",
      actor: l.user_email
        ? `${l.user_email} (${getHighestRole(l.user_role).toUpperCase()})`
        : `System (${getHighestRole(l.user_role).toUpperCase()})`,
      ip: l.ip_address || "N/A",
      details: typeof l.details === "string" ? l.details : JSON.stringify(l.details || ""),
    }));

    const timelineLabel =
      datePreset === "today"
        ? "Today"
        : datePreset === "7days"
          ? "Last 7 Days"
          : datePreset === "30days"
            ? "Last 30 Days"
            : datePreset === "custom"
              ? `${startDate || "Start"} to ${endDate || "Present"}`
              : "All Time";

    exportToPDF(
      "System Security Audit Matrix Report",
      [
        { label: "Report Type:", value: "System Security Audit Matrix" },
        { label: "Timeline:", value: timelineLabel },
        { label: "Actor Filter:", value: actorRoleFilter === "all" ? "All System Roles" : actorRoleFilter.toUpperCase() },
        { label: "Total Records:", value: `${filteredLogs.length}` },
      ],
      auditColumns,
      pdfData,
      undefined,
      undefined,
      "portrait"
    );
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Compliance Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <span>🛡️ System Security & Audit Matrix</span>
            </h1>
            <Badge variant="primary">High-Fidelity Telemetry</Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Real-time forensic telemetry stream, payload state diffs, device tracking, and compliance pivot controls.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchLogs}
            className="rounded-xl border border-border bg-card hover:bg-muted text-foreground px-3.5 py-2 text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center gap-1.5"
          >
            <span>🔄 Refresh</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3.5 py-2 text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center gap-1.5"
          >
            <span>📥 Export CSV</span>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={filteredLogs.length === 0}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3.5 py-2 text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center gap-1.5"
          >
            <span>📄 Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Advanced HUD Filtering Array */}
      <div className="solid-card rounded-2xl p-4 sm:p-5 border border-border bg-card space-y-4 shadow-sm">
        {/* Row 1: Search & Actor Role */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground block mb-1">
              🔍 Telemetry Search Query
            </label>
            <input
              type="text"
              placeholder="Search by action, email, user ID, IP address, or payload details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-border bg-background text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="flex items-end justify-center">
            <CustomSelect
              label="👤 Role Filter"
              value={actorRoleFilter}
              onChange={(val) => setActorRoleFilter(val)}
              options={[
                { value: "all", label: "All System Roles", sublabel: "Admin, HOD, Faculty, CR, Student" },
                { value: "admin", label: "ADMIN", sublabel: "System Administrator" },
                { value: "hod", label: "HOD", sublabel: "Head of Department" },
                { value: "faculty", label: "FACULTY", sublabel: "Teaching Staff" },
                { value: "cr", label: "CR", sublabel: "Class Representative" },
                { value: "student", label: "STUDENT", sublabel: "Enrolled Student" },
              ]}
            />
          </div>
        </div>

        {/* Row 2: Timeline Controls & Severity Level Toggles */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-border/70">
          {/* Timeline Date Range Presets */}
          <div className="space-y-2">
            <span className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground block">
              📅 Timeline Controls
            </span>
            <div className="flex gap-3">
              <div className="flex flex-wrap items-center gap-1.5 bg-muted/80 rounded-xl px-2 py-1.5 ">
                {[
                  { key: "all", label: "All Time" },
                  { key: "today", label: "Today" },
                  { key: "7days", label: "Last 7 Days" },
                  { key: "30days", label: "Last 30 Days" },
                  { key: "custom", label: "Custom" },
                ].map((p) => (
                  <button
                    key={p.key}
                    onClick={() => handleDatePresetChange(p.key as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${datePreset === p.key
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {datePreset === "custom" && (
                <div className="flex flex-wrap items-center gap-3 animate-in fade-in duration-150 bg-muted/80 rounded-xl px-2 py-0.5 max-w-fit">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="p-1.5 rounded-lg border border-border bg-background text-xs font-mono"
                  />
                  <span className="text-xs font-bold text-muted-foreground">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="p-1.5 rounded-lg border border-border bg-background text-xs font-mono"
                  />
                </div>
              )}
            </div>

          </div>

          {/* Severity Level Toggles (Short names & clean buttons without On/Off text) */}
          <div className="space-y-1.5 ">
            <span className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground block ">
              ⚡ Severity Level Toggles
            </span>
            <div className="flex items-center gap-2 bg-muted rounded-xl px-2 py-1.5">
              <button
                type="button"
                onClick={() => setSeverityFilters((prev) => ({ ...prev, INFO: !prev.INFO }))}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${severityFilters.INFO
                  ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/40 shadow-xs font-extrabold"
                  : "bg-muted/40 text-muted-foreground border-transparent opacity-50 hover:opacity-100"
                  }`}
              >
                <span>🔵 INFO</span>
              </button>

              <button
                type="button"
                onClick={() => setSeverityFilters((prev) => ({ ...prev, MODIFY: !prev.MODIFY }))}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${severityFilters.MODIFY
                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-xs font-extrabold"
                  : "bg-muted/40 text-muted-foreground border-transparent opacity-50 hover:opacity-100"
                  }`}
              >
                <span>🟠 MODIFY</span>
              </button>

              <button
                type="button"
                onClick={() => setSeverityFilters((prev) => ({ ...prev, CRITICAL: !prev.CRITICAL }))}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${severityFilters.CRITICAL
                  ? "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/40 shadow-xs font-extrabold"
                  : "bg-muted/40 text-muted-foreground border-transparent opacity-50 hover:opacity-100"
                  }`}
              >
                <span>🔴 CRITICAL</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Telemetry Table / Accordion Architecture */}
      <div className="solid-card rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        {/* Table Summary Bar */}
        <div className="px-5 py-3 border-b border-border bg-muted/40 flex items-center justify-between text-xs">
          <span className="font-extrabold text-foreground">
            Displaying <span className="text-indigo-600 dark:text-indigo-400 font-mono">{filteredLogs.length}</span> of {logs.length} Total Telemetry Records
          </span>
          {!severityFilters.INFO && (
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
              <span>💡 Routine INFO logs hidden (click "🔵 INFO" button to show)</span>
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-muted-foreground animate-pulse flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span>Parsing high-fidelity telemetry stream...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <span className="text-2xl block">🔍</span>
            <h3 className="text-sm font-bold text-foreground">No Telemetry Logs Match Active Filters</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Try enabling the 🔵 INFO severity button or clearing your search query to view routine audit events.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 border-b border-border font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4 w-8"></th>
                  <th className="p-4">Severity</th>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Action Event</th>
                  <th className="p-4">Actor Email & Role</th>
                  <th className="p-4">Details / Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {filteredLogs.map((log, idx) => {
                  const isExpanded = expandedRows.has(idx);
                  const sev = getSeverity(log);
                  const parsedDetails = typeof log.details === "string" ? log.details : JSON.stringify(log.details || {});
                  const highestRole = getHighestRole(log.user_role).toUpperCase();

                  return (
                    <React.Fragment key={idx}>
                      {/* Main Table Row */}
                      <tr
                        onClick={() => toggleRowExpanded(idx)}
                        className={`cursor-pointer transition-colors ${isExpanded ? "bg-indigo-500/5" : "hover:bg-muted/40"
                          }`}
                      >
                        <td className="p-4 text-center font-bold text-muted-foreground">
                          {isExpanded ? "▼" : "▶"}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${sev === "CRITICAL"
                              ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30"
                              : sev === "MODIFY"
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                              }`}
                          >
                            {sev}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {formatDateTimeIST(log.timestamp)}
                        </td>
                        <td className="p-4 font-bold text-foreground">
                          <span className="font-extrabold text-foreground block tracking-tight">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            {log.user_email ? (
                              <Link
                                href={`/admin/users?search=${encodeURIComponent(log.user_email)}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-extrabold hover:underline hover:text-indigo-500 transition-colors block"
                                title="Click to teleport directly to this user's dossier in User Manager"
                              >
                                {log.user_email}
                              </Link>
                            ) : (
                              <span className="text-muted-foreground italic">System Internal</span>
                            )}
                            <Badge
                              variant={
                                highestRole === "ADMIN"
                                  ? "warning"
                                  : highestRole === "HOD"
                                    ? "warning"
                                    : highestRole === "CR"
                                      ? "primary"
                                      : "secondary"
                              }
                              className="text-[9px] px-1.5 py-0 uppercase font-black"
                            >
                              {highestRole}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground font-mono text-[11px] max-w-xs truncate">
                          {parsedDetails}
                        </td>
                      </tr>

                      {/* Expandable Accordion Forensic Drawer */}
                      {isExpanded && (
                        <tr className="bg-muted/20 border-b border-border">
                          <td colSpan={6} className="p-4 sm:p-6 space-y-4">
                            <div className="bg-card rounded-xl border border-border p-4 space-y-4 shadow-sm">
                              {/* Metadata Telemetry Header */}
                              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border text-xs">
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="font-bold text-foreground flex items-center gap-1">
                                    <span>🌐 IP Address:</span>
                                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded-md">
                                      {log.ip_address || "127.0.0.1 (Local Client)"}
                                    </span>
                                  </span>

                                  <span className="font-bold text-foreground flex items-center gap-1">
                                    <span>💻 Device & Browser:</span>
                                    <span className="font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md text-[11px] max-w-sm truncate">
                                      {log.user_agent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
                                    </span>
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(JSON.stringify(log, null, 2), idx);
                                    }}
                                    className="px-3 py-1 rounded-lg border border-border bg-background hover:bg-muted text-xs font-bold text-foreground transition-all flex items-center gap-1"
                                  >
                                    <span>{copiedIdx === idx ? "✓ Copied!" : "📋 Copy Payload JSON"}</span>
                                  </button>
                                </div>
                              </div>

                              {/* State Diff Comparison Box (Before vs After) */}
                              {(log.previous_state || log.new_state) ? (
                                <div className="space-y-2">
                                  <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <span>🔄 Stateful Record Differential (Before vs After)</span>
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {/* Previous State (Red / Before) */}
                                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 space-y-1">
                                      <span className="text-[10px] font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wider block">
                                        ❌ Previous State (Before Event)
                                      </span>
                                      <pre className="text-[11px] font-mono text-red-700 dark:text-red-300 overflow-x-auto p-2 rounded-lg bg-black/20">
                                        {JSON.stringify(log.previous_state || { note: "No previous state recorded" }, null, 2)}
                                      </pre>
                                    </div>

                                    {/* New State (Green / After) */}
                                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                                      <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                                        ✅ New State (After Event)
                                      </span>
                                      <pre className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 overflow-x-auto p-2 rounded-lg bg-black/20">
                                        {JSON.stringify(log.new_state || { note: "No new state payload" }, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                </div>
                              ) : null}

                              {/* Pretty JSON Viewer */}
                              <div className="space-y-1">
                                <span className="flex items-left justify-left text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">
                                  📜 Full Raw Event Telemetry Object
                                </span>
                                <pre className="p-3 text-left flex justify-left rounded-xl bg-background border border-border text-foreground font-mono text-[11px] overflow-x-auto max-h-60">
                                  {JSON.stringify(log, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
