"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { formatDateTimeIST } from "@/lib/utils";

interface AuditLogEntry {
  action: string;
  timestamp: string;
  user_email?: string;
  user_name?: string;
  user_id?: string;
  user_role?: string;
  details?: string;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/admin/audit-logs?limit=100");
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

  const filteredLogs = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    return (
      (log.action || "").toLowerCase().includes(term) ||
      (log.user_email || "").toLowerCase().includes(term) ||
      (log.details || "").toLowerCase().includes(term)
    );
  });

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              System Audit Logs
            </h1>
            <Badge variant="primary">Security & Audit</Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Timestamped audit trail of administrative actions, user logins, role changes, and system events.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="rounded-xl border border-border bg-card hover:bg-muted text-foreground px-4 py-2.5 text-xs font-bold transition-colors duration-150"
        >
          🔄 Refresh Logs
        </button>
      </div>

      {/* Search Input */}
      <div className="solid-card rounded-2xl p-4 border border-border bg-card">
        <input
          type="text"
          placeholder="🔍 Search audit logs by action, user email, or event details..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2.5 rounded-xl border border-border bg-background text-xs"
        />
      </div>

      {/* Logs Table */}
      <div className="solid-card rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs font-bold text-muted-foreground animate-pulse">
            Loading system audit logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No audit logs found matching your query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border font-bold text-muted-foreground">
                <tr>
                  <th className="p-4">Timestamp (IST)</th>
                  <th className="p-4">Action</th>
                  <th className="p-4">User</th>
                  <th className="p-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      {formatDateTimeIST(log.timestamp)}
                    </td>
                    <td className="p-4 font-bold text-foreground">
                      <Badge variant="primary" className="font-mono text-[10px] uppercase">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="p-4">
                      {log.user_email ? (
                        <span className="font-extrabold text-foreground block">{log.user_email}</span>
                      ) : (
                        <span className="text-muted-foreground italic">System</span>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground font-mono text-[11px] max-w-xs truncate">
                      {log.details || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
