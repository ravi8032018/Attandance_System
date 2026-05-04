"use client";
import {useRef, useState, useEffect} from "react";

export function ContactCell({student}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    // Use capture so we see the event even if inner elements stopPropagation.
    const onPointerDown = (e) => {
      const panel = panelRef.current;
      const btn = btnRef.current;
      if (!panel || !btn) return;
      const t = e.target;
      if (!panel.contains(t) && !btn.contains(t)) {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown, {capture: true, passive: true});

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown, {capture: true});
    };
  }, [open]);

  const rawPhone = student?.contact_number || "";
  const phone = rawPhone.replace(/\s+/g, "");
  const name = [student?.first_name, student?.last_name].filter(Boolean).join(" ");
  const email = student?.email || "";

  return (
      <div className="relative ">
        {/* Trigger: show number as a button for a11y and reliable ref */}
        <button
            ref={btnRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={open}
            className="px-0 py-0 text-left transition-all hover:underline hover:underline-offset-2 hover:font-semibold"
        >
          {phone || "—"}
        </button>

        {open && (
    <div
                ref={panelRef}
                role="menu"
                aria-label="Contact options"
                className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-md border bg-card-background shadow-lg leading-6"
            >
              <a
                  role="menuitem"
                  href={phone ? `tel:${phone}` : undefined}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted-background focus:bg-muted-background outline-none"
                  onClick={() => setOpen(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="size-8" xmlSpace="preserve">
  <path
    fill="hsl(var(--success))"
    d="M33.9 29.5c-1.02-.52-3.5-1.77-4.05-1.96-.55-.2-.94-.3-1.34.3-.4.6-1.56 1.96-1.86 2.36-.32.4-.6.46-1.12.14-.52-.3-2.54-.9-4.83-3-.95-.94-1.98-2.2-2.22-2.58-.24-.38-.03-.59.18-.8.18-.18.39-.43.58-.66.2-.22.24-.39.4-.64.14-.25.07-.48-.03-.67-.1-.2-.89-2.0-1.22-2.73-.33-.73-.65-.63-.9-.63h-.78c-.28 0-.7.1-1.08.47-.38.38-1.43 1.43-1.43 3.48 0 2.05 1.48 4.04 1.69 4.31.2.28 2.9 4.43 7.02 6.21.98.42 1.75.66 2.33.84.98.31 1.86.27 2.56.17.79-.11 2.38-.98 2.73-1.93.34-.95.34-1.75.24-1.92-.1-.17-.38-.28-.78-.49z"
  />
</svg>
                Call
              </a>
              <a
                  role="menuitem"
                  href={phone ? `sms:${phone}?&body=${encodeURIComponent("Hello " + name)}` : undefined}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted-background focus:bg-muted-background outline-none"
                  onClick={() => setOpen(false)}
              >
                {/*<ChatBubbleLeftEllipsisIcon className="h-4 w-4 text-muted-foreground"/>*/}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="size-4" xmlSpace="preserve">
  <path
    fill="hsl(var(--primary))"
    d="M12 14h24c2.2 0 4 1.8 4 4v10c0 2.2-1.8 4-4 4H23l-6.5 4.8c-.78.57-1.8-.1-1.8-1.06V32h-2c-2.2 0-4-1.8-4-4V18c0-2.2 1.8-4 4-4z"
  />
  <rect x="16" y="20" width="16" height="3" rx="1.5" fill="hsl(var(--primary-foreground))" />
  <rect x="16" y="25" width="12" height="3" rx="1.5" fill="hsl(var(--primary-foreground))" />
</svg>

                SMS
              </a>
              <a
                  role="menuitem"
                  href={phone ? `https://wa.me/${phone.replace(/^\+/, "")}` : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted-background focus:bg-muted-background outline-none"
                  onClick={() => setOpen(false)}
              >

            <svg className={"size-5"} version="1.1" id="Capa_1"
              xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="-5.8 -5.8 69.60 69.60" xmlSpace="preserve" fill="#000000" stroke="#000000" strokeWidth={0.116}
            >
              <g id="SVGRepo_bgCarrier" strokeWidth={0} />
              <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" stroke="#CCCCCC" strokeWidth={0.348} />
              <g id="SVGRepo_iconCarrier">
                <g>
                  <path
                    style={{ fill: "hsl(var(--success))" }}
                    d="M0,58l4.988-14.963C2.457,38.78,1,33.812,1,28.5C1,12.76,13.76,0,29.5,0S58,12.76,58,28.5
                       S45.24,57,29.5,57c-4.789,0-9.299-1.187-13.26-3.273L0,58z"
                  />
                  <path
                    style={{ fill: "hsl(var(--primary-foreground))" }}
                    d="M47.683,37.985c-1.316-2.487-6.169-5.331-6.169-5.331c-1.098-0.626-2.423-0.696-3.049,0.42
                       c0,0-1.577,1.891-1.978,2.163c-1.832,1.241-3.529,1.193-5.242-0.52l-3.981-3.981l-3.981-3.981c-1.713-1.713-1.761-3.41-0.52-5.242
                       c0.272-0.401,2.163-1.978,2.163-1.978c1.116-0.627,1.046-1.951,0.42-3.049c0,0-2.844-4.853-5.331-6.169
                       c-1.058-0.56-2.357-0.364-3.203,0.482l-1.758,1.758c-5.577,5.577-2.831,11.873,2.746,17.45l5.097,5.097l5.097,5.097
                       c5.577,5.577,11.873,8.323,17.45,2.746l1.758-1.758C48.048,40.341,48.243,39.042,47.683,37.985z"
                  />
                </g>
              </g>
            </svg>
                WhatsApp
              </a>
            </div>
        )}
      </div>
  );
}