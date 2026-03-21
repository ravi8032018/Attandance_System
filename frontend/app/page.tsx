// app/page.js
import Link from "next/link";
import { CopyButton} from "@/src/_hooks/basic_fn";

export default function Home() {
  return (
    <main className="mx-auto py-10 lg:py-16 max-w-6xl">
      {/* Hero Section */}
      <section className="grid gap-10 lg:grid-cols-2 lg:items-center">
        {/* Left: copy + CTAs */}
        <div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Smart attendance for{" "}
            <span className="text-emerald-600">faculty, CRs, and students</span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-xl">
            Token based attendance, CR approval workflow, real time
            notifications, and rich reporting — built for universities that
            want less admin chaos and more automation.
          </p>

          {/* Primary CTAs */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
            >
              Sign in
            </Link>

            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-gray-300/60 px-5 py-2.5 text-sm font-semibold text-slate-800/80 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
            >
              Sign up
            </Link>

            <span className="text-xs text-slate-500">
              Or try it instantly with demo accounts below.
            </span>
          </div>

          {/* Quick bullets */}
          <dl className="mt-6 grid gap-3 text-xs sm:text-sm text-slate-700 sm:grid-cols-2 max-w-md">
            <div className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <div>
                <dt className="font-medium">Role‑based dashboards</dt>
                <dd className="text-slate-500">
                  Separate views for faculty, CRs, and students.
                </dd>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <div>
                <dt className="font-medium">CR‑driven attendance</dt>
                <dd className="text-slate-500">
                  CR marks attendance, faculty reviews and approves.
                </dd>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <div>
                <dt className="font-medium">Real‑time notifications</dt>
                <dd className="text-slate-500">
                  WebSocket‑based alerts for sessions and approvals.
                </dd>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <div>
                <dt className="font-medium">Attendance analytics</dt>
                <dd className="text-slate-500">
                  Subject‑wise and combined reports with charts.
                </dd>
              </div>
            </div>
          </dl>
        </div>

        {/* Right: product preview card */}
        <div className="relative">
          <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-emerald-100/50 blur-2xl" />
          <div className="relative rounded-3xl border border-slate-200 bg-white p-4 shadow-xl">
            {/* Faux header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium text-slate-700">
                  Faculty dashboard · Demo
                </span>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                Live preview
              </span>
            </div>

            {/* Faux stats */}
            <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] text-slate-500">Today&apos;s sessions</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">4</p>
                <p className="mt-0.5 text-[11px] text-emerald-600">
                  2 pending approvals
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] text-slate-500">Avg. attendance</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">86%</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Sem 4 · CS · BSc
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] text-slate-500">Notifications</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">3</p>
                <p className="mt-0.5 text-[11px] text-emerald-600">
                  CR attendance requests
                </p>
              </div>
            </div>

            {/* Faux list */}
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <p className="mb-2 text-[11px] font-medium text-slate-700">
                Recent attendance sessions
              </p>
              <ul className="space-y-1.5 text-[11px]">
                <li className="flex items-center justify-between">
                  <span className="text-slate-700">CSDSC252 · Microprocessor</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">
                    Pending
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-slate-700">CSSEC251 · Lab (CR)</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700">
                    Approved
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-slate-700">
                    CSDSC253 · Discrete Math
                  </span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-800">
                    View report
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Separator */}
      <div className="mt-12 h-px w-full bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

      {/* Demo credentials section */}
      <section className="mt-10 grid gap-6 lg:grid-cols-[1.3fr,1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl   font-semibold text-slate-900">
            Instant demo access
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Use these read only demo accounts to explore the full product
            without creating an account. All dashboards and flows are identical
            to real users, but writes may be disabled for safety.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 text-md">
            {/* Student demo */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[14px] font-semibold uppercase tracking-wide text-emerald-700">
                Student demo
              </p>
              <p className="mt-1 text-[13px] text-slate-600">
                View your profile, subject wise attendance, and combined reports.
              </p>

              <dl className="mt-3 space-y-1">
                <div>
                  <dt className="text-[12px] text-slate-500">Email</dt>
                  <dd className="font-mono text-[12px] text-slate-900">
                    Demo@User.com 
                    <CopyButton value={"Demo@User.com"} className={`size-6`}/>
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-500">Password</dt>
                  <dd className="font-mono text-[11px] text-slate-900">
                    demo1234
                  </dd>
                </div>
              </dl>
            </div>

            {/* Faculty demo */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                Faculty demo
              </p>
              <p className="mt-1 text-[11px] text-slate-600">
                Explore faculty dashboard, CR approvals, and notifications.
              </p>

              <dl className="mt-3 space-y-1">
                <div>
                  <dt className="text-[11px] text-slate-500">Email</dt>
                  <dd className="font-mono text-[11px] text-slate-900">
                    demo_faculty@unikart.app
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-slate-500">Password</dt>
                  <dd className="font-mono text-[11px] text-slate-900">
                    demo1234
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-slate-500">
            Note: Demo accounts may have write operations disabled or simulated.
            Use the sign‑up flow for a real account if enabled.
          </p>
        </div>

        {/* Short “What this app does” card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-800 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">
            What is UNIkart Attendance?
          </h3>
          <p className="mt-2 text-sm text-slate-700">
            UNIkart is a university attendance platform that connects{" "}
            <span className="font-semibold">faculty, class representatives,</span>{" "}
            and <span className="font-semibold">students</span> in a single
            workflow.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
            <li>• Faculty generate secure tokens for each class.</li>
            <li>• CRs take attendance on behalf of faculty.</li>
            <li>• Faculty approve sessions with a single click.</li>
            <li>• Students see live attendance and detailed reports.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
