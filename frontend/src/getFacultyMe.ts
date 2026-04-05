// src/hooks/useFacultyMe.ts
"use client";

import { useEffect, useState } from "react";
import { getFacultyDetails } from "@/src/_hooks/getFacultyHelper";

export function useFacultyMe() {
  const [faculty, setFaculty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr("");
  console.log("getFacultyHelper - IN Fetching faculty details..."); // Debug log

      try {
        const data = await getFacultyDetails();
        if (!cancelled) setFaculty(data);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load faculty profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
  console.log("getFacultyHelper - OUT Fetching faculty details..."); // Debug log

    return () => {
      cancelled = true;
    };
  }, []);

  return { faculty, loading, err };
}