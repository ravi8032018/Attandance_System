// useScrolled.js
"use client";
import { useEffect, useRef, useState } from "react";

export default function useScrolled({ hideAt = 20, showAt = 8 } = {}) {
  const [scrolled, setScrolled] = useState(false);
  const scrolledRef = useRef(scrolled);
  const rafRef = useRef(null);

  useEffect(() => {
    scrolledRef.current = scrolled;
  }, [scrolled]);

  useEffect(() => {
    const update = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      const prev = scrolledRef.current;
      if (!prev && y > hideAt) setScrolled(true);
      else if (prev && y < showAt) setScrolled(false);
    };

    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [hideAt, showAt]);

  return scrolled;
}