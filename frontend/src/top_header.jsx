"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import useScrolled from "@/src/_hooks/is_scrolled";
import LogoutButton from "@/src/logout"

export default function Top_Header() {
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
          <Link href="/frontend/public" className="flex items-center gap-3">
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
          <nav className={`overflow-hidden ease-in-out flex font-mono items-center-safe transition-all duration-300 ${hideDept ? "text-sm font-semibold gap-4" : "text-md gap-8"}`}>
            <Link href="/student/notifications" className="flex gap-2 text-slate-700 hover:text-slate-900 ">
              <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="25" height="25" viewBox="0 0 50 50">
<path d="M 25 1 A 4 4 0 0 0 25 9 A 4 4 0 0 0 25 1 z M 19.400391 7.0996094 C 14.800391 8.9996094 12 13.4 12 19 C 12 29.4 9.2 31.9 7.5 33.5 C 6.7 34.2 6 34.9 6 36 C 6 40 12.2 42 25 42 C 37.8 42 44 40 44 36 C 44 34.9 43.3 34.2 42.5 33.5 C 40.8 31.9 38 29.4 38 19 C 38 13.3 35.299609 8.9996094 30.599609 7.0996094 C 29.799609 9.3996094 27.6 11 25 11 C 22.4 11 20.200391 9.3996094 19.400391 7.0996094 z M 19.099609 43.800781 C 19.499609 46.800781 22 49 25 49 C 28 49 30.500391 46.800781 30.900391 43.800781 C 29.000391 44.000781 27 44 25 44 C 23 44 20.999609 44.000781 19.099609 43.800781 z"></path>
              </svg>

            </Link>
            <Link href="/people" className="text-slate-700 hover:text-slate-900">
              People
            </Link>
            <Link href="/news" className="text-slate-700 hover:text-slate-900">
              News
            </Link>
            <div className={`overflow-hidden ease-in-out flex font-mono justify-items-center-safe transition-all duration-100 ${hideDept ? "text-sm font-semibold gap-4 max-h-0 opacity-0" : "text-md gap-10 max-h-8 opacity-100"}`}>
              <LogoutButton />
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
