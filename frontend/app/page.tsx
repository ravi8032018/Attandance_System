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
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Smart attendance for{" "}
            <span className="text-success">faculty, CRs, and students</span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-xl">
            Token based attendance, CR approval workflow, real time
            notifications, and rich reporting — built for universities that
            want less admin chaos and more automation.
          </p>

          {/* Primary CTAs */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-success px-5 py-2.5 text-sm font-semibold text-success-foreground shadow-sm hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2 focus-visible:ring-offset-muted"
            >
              Sign in
            </Link>

            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-muted/60 px-5 py-2.5 text-sm font-semibold text-foreground/80 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border focus-visible:ring-offset-2 focus-visible:ring-offset-muted"
            >
              Sign up
            </Link>

            <span className="text-xs text-muted-foreground">
              Or try it instantly with demo accounts below.
            </span>
          </div>

          {/* Quick bullets */}
          <dl className="mt-6 grid gap-3 text-xs sm:text-sm text-foreground sm:grid-cols-2 max-w-md">
            <div className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-success" />
              <div>
                <dt className="font-medium">Role‑based dashboards</dt>
                <dd className="text-muted-foreground">
                  Separate views for faculty, CRs, and students.
                </dd>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-success" />
              <div>
                <dt className="font-medium">CR‑driven attendance</dt>
                <dd className="text-muted-foreground">
                  CR marks attendance, faculty reviews and approves.
                </dd>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-success" />
              <div>
                <dt className="font-medium">Real‑time notifications</dt>
                <dd className="text-muted-foreground">
                  WebSocket‑based alerts for sessions and approvals.
                </dd>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-success" />
              <div>
                <dt className="font-medium">Attendance analytics</dt>
                <dd className="text-muted-foreground">
                  Subject‑wise and combined reports with charts.
                </dd>
              </div>
            </div>
          </dl>
        </div>

        {/* Right: product preview card */}
        <div className="relative">
          <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-success/20 blur-2xl" />
          <div className="relative rounded-3xl border border-border bg-card p-4 shadow-xl">
            {/* Faux header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-success" />
                <span className="text-xs font-medium text-foreground">
                  Faculty dashboard · Demo
                </span>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                Live preview
              </span>
            </div>

            {/* Faux stats */}
            <div className="mt-4 grid gap-3 sm:grid-cols-3 text-xs">
              <div className="rounded-2xl border border-border bg-muted px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Today&apos;s sessions</p>
                <p className="mt-1 text-xl font-semibold text-foreground">4</p>
                <p className="mt-0.5 text-[11px] text-success">
                  2 pending approvals
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-muted px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Avg. attendance</p>
                <p className="mt-1 text-xl font-semibold text-foreground">86%</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Sem 4 · CS · BSc
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-muted px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Notifications</p>
                <p className="mt-1 text-xl font-semibold text-foreground">3</p>
                <p className="mt-0.5 text-[11px] text-success">
                  CR attendance requests
                </p>
              </div>
            </div>

            {/* Faux list */}
            <div className="mt-4 rounded-2xl border border-border bg-muted p-3 text-xs">
              <p className="mb-2 text-[11px] font-medium text-foreground">
                Recent attendance sessions
              </p>
              <ul className="space-y-1.5 text-[11px]">
                <li className="flex items-center justify-between">
                  <span className="text-foreground">CSDSC252 · Microprocessor</span>
                  <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] text-warning">
                    Pending
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-foreground">CSSEC251 · Lab (CR)</span>
                  <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] text-success">
                    Approved
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-foreground">
                    CSDSC253 · Discrete Math
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-foreground">
                    View report
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Separator */}
      <div className="mt-12 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Demo credentials section */}
      <section className="mt-10 grid gap-6 lg:grid-cols-[1.3fr,1fr]">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-xl   font-semibold text-foreground">
            Instant demo access
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use these read only demo accounts to explore the full product
            without creating an account. All dashboards and flows are identical
            to real users, but writes may be disabled for safety.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 text-md">
            {/* Student demo */}
            <div className="rounded-xl border border-border bg-muted p-4">
              <p className="text-[14px] font-semibold uppercase tracking-wide text-success">
                Student demo
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                View your profile, subject wise attendance, and combined reports.
              </p>

              <dl className="mt-3 space-y-1">
                <div>
                  <dt className="text-[12px] text-muted-foreground">Email</dt>
                  <dd className=" text-[12px] text-foreground">
                    Demo@User.com 
                    <CopyButton value={"Demo@User.com"} className={`size-6`}/>
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">Password</dt>
                  <dd className=" text-[11px] text-foreground">
                    demo1234
                  </dd>
                </div>
              </dl>
            </div>

            {/* Faculty demo */}
            <div className="rounded-xl border border-border bg-muted p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                Faculty demo
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Explore faculty dashboard, CR approvals, and notifications.
              </p>

              <dl className="mt-3 space-y-1">
                <div>
                  <dt className="text-[11px] text-muted-foreground">Email</dt>
                  <dd className=" text-[11px] text-foreground">
                    demo_faculty@unikart.app
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">Password</dt>
                  <dd className=" text-[11px] text-foreground">
                    demo1234
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <p className="mt-3 text-[11px] text-muted-foreground">
            Note: Demo accounts may have write operations disabled or simulated.
            Use the sign‑up flow for a real account if enabled.
          </p>
        </div>

        {/* Short “What this app does” card */}
        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-foreground shadow-sm">
          <h3 className="text-base font-semibold text-foreground">
            What is UNIkart Attendance?
          </h3>
          <p className="mt-2 text-sm text-foreground">
            UNIkart is a university attendance platform that connects{" "}
            <span className="font-semibold">faculty, class representatives,</span>{" "}
            and <span className="font-semibold">students</span> in a single
            workflow.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-foreground">
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
