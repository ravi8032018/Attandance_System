"use client";

import { useEffect, useRef, useState } from "react";

export interface UseScrolledOptions {
  hideAt?: number;
  showAt?: number;
}

export function useScrolled({ hideAt = 20, showAt = 8 }: UseScrolledOptions = {}): boolean {
  const [scrolled, setScrolled] = useState<boolean>(false);
  const scrolledRef = useRef<boolean>(scrolled);
  const rafRef = useRef<number | null>(null);

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
