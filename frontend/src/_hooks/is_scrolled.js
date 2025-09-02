// useScrolled.js
"use client";
import { useEffect, useRef, useState } from "react";

export default function useScrolled({ hideAt = 32, showAt = 12, debounceMs = 80 } = {}) {
  const [scrolled, setScrolled] = useState(false);
  const scrolledRef = useRef(scrolled);
  const tRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => { scrolledRef.current = scrolled; }, [scrolled]);

  useEffect(() => {
    const update = () => {
      const y = window.scrollY || 0;
      const prev = scrolledRef.current;
      if (!prev && y > hideAt) setScrolled(true);
      else if (prev && y < showAt) setScrolled(false);
    };
    const onScroll = () => {
      if (tRef.current) return;
      tRef.current = setTimeout(() => {
        tRef.current = null;
        rafRef.current = requestAnimationFrame(update);
      }, debounceMs);
    };

    // init and listen
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (tRef.current) clearTimeout(tRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [hideAt, showAt, debounceMs]);

  return scrolled;
}