"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  timestamp: string;
  status: "unread" | "read" | "archived";
}

export function useNotifications(pollIntervalMs = 8000) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiFetch("/notifications?status=all");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Filter out archived notifications safety check
          setNotifications(data.filter((n) => n.status !== "archived"));
          setError(null);
        }
      }
    } catch (err: any) {
      // Silent catch for background polling resilience
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, pollIntervalMs);

    return () => clearInterval(interval);
  }, [fetchNotifications, pollIntervalMs]);

  const unreadCount = notifications.filter((n) => n.status === "unread").length;

  const markAsRead = async (id: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: "read" } : n))
      );
      await apiFetch(`/notifications/${id}/mark-read`, { method: "PATCH" });
    } catch (err) {
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadList = notifications.filter((n) => n.status === "unread");
      setNotifications((prev) => prev.map((n) => ({ ...n, status: "read" })));
      await Promise.all(
        unreadList.map((n) => apiFetch(`/notifications/${n.id}/mark-read`, { method: "PATCH" }))
      );
    } catch (err) {
      fetchNotifications();
    }
  };

  const deleteNotification = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    try {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      await apiFetch(`/notifications/${id}`, { method: "DELETE" });
    } catch (err) {
      fetchNotifications();
    }
  };

  const clearAllNotifications = async () => {
    try {
      setNotifications([]);
      await apiFetch("/notifications", { method: "DELETE" });
    } catch (err) {
      fetchNotifications();
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  };
}
