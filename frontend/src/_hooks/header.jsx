// app/_components/Header.jsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import useScrolled from "@/src/_hooks/is_scrolled";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll(); // set initial
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const hideDept = useScrolled({ hideAt:15, showAt:6, debounceMs: 100})
  // console.log(hideDept);
  return (
    <header
      className={`overflow-hidden ease-in-out sticky top-0 z-0 bg-white border-transparent transition-all ${
        hideDept ? "border-slate-300" : "border-white"}
      }`}
    >
      <div
        className={`overflow-hidden ease-in-out mx-8 max-w-8xl duration-300 transition-all ${
          hideDept ? "p-2" : "p-4"
        }`}
      >
        <div className="flex items-center justify-between">
          {/* Logo block */}
          <Link href="/" className="flex items-center gap-3">
            {/* Big logo shrinks on scroll */}
            <img
              src="https://upload.wikimedia.org/wikipedia/en/6/6e/Assam_University_Logo.png"
              alt="logo"
              className={`overflow-hidden ease-in-out transition-all duration-300 ${
                hideDept ? "h-12 w-auto" : "h-20 w-auto"
              }`}
            />
            <div
              className={`overflow-hidden ease-in-out font-semibold tracking-widest transition-all duration-300 ${
                hideDept ? "text-base" : "text-xl"
              }`}
            >
              <div className={`overflow-hidden ease-in-out block font-bold transition-all duration-300 ${hideDept ? "text-2xl" : " p-0 text-4xl"}`}
              >AUS&nbsp;CS</div>

              <div className={`overflow-hidden ease-in-out duration-400 font-mono text-xs tracking-tighter grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-0 ${hideDept ? "max-h-0 opacity-0" : "max-h-8 opacity-100"}`}>
                <ul className={"text-left border-r-2 p-0"}><li>Assam University<br></br>Silchar</li> </ul>
                <ul className={"pl-2 text-left"}><li>Department of<br></br>Computer Science</li> </ul>

              </div>
            </div>
          </Link>

          {/* Nav */}
          <nav className={`overflow-hidden ease-in-out flex font-mono transition-all duration-300 ${hideDept ? "text-sm font-semibold gap-4" : "text-md gap-10"}`}>
            <Link href="/research" className="text-slate-700 hover:text-slate-900 ">
              Research
            </Link>
            <Link href="/people" className="text-slate-700 hover:text-slate-900">
              People
            </Link>
            <Link href="/news" className="text-slate-700 hover:text-slate-900">
              News
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
