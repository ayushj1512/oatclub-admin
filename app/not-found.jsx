// app/not-found.jsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-oat-bg grid place-items-center p-6">
      <div className="w-full max-w-3xl">
        <div className="mb-6 flex items-center justify-center gap-2 text-xs text-oat-deep-umber">
          <span className="h-1.5 w-1.5 rounded-full bg-oat-latte-soft" />
          <span className="font-semibold">404</span>
          <span className="text-oat-sage">•</span>
          <span>Page not found</span>
        </div>

        <div className="relative overflow-hidden rounded-[32px] border border-zinc-100 bg-white/90 shadow-[0_30px_90px_rgba(9,9,11,0.045)]">
          <div className="relative p-8 sm:p-12">
            <div className="grid gap-10 md:grid-cols-[220px_1fr] md:items-center">
              <div className="flex justify-center">
                <div className="relative h-[220px] w-[220px] rounded-full bg-oat-almond shadow-inner shadow-[inset_0_0_0_1px_rgba(9,9,11,0.045)]">
                  <div className="absolute inset-6 rounded-full bg-oat-latte-soft" />
                  <div className="relative mx-auto mt-2 h-[170px] w-[170px] animate-[floaty_2.8s_ease-in-out_infinite] rounded-full bg-oat-cream-soft shadow-[0_16px_60px_rgba(9,9,11,0.06)]" />
                </div>
              </div>

              <div className="text-center md:text-left">
                <h1 className="text-6xl sm:text-7xl font-black tracking-tight text-oat-text">
                  404
                </h1>

                <p className="mt-3 text-lg sm:text-xl font-semibold text-oat-text">
                  The page you’re looking for is missing.
                </p>
                <p className="mt-2 text-sm sm:text-base text-oat-deep-umber leading-relaxed">
                  It may have moved, or the link may need a refresh. Head back to the dashboard to keep the day flowing.
                </p>

                <div className="mt-6 rounded-3xl border border-zinc-200 bg-oat-cream-soft p-4">
                  <p className="text-xs font-semibold text-oat-text">Need help?</p>
                  <a
                    href="mailto:support@oatclub.com"
                    className="text-sm text-oat-text hover:underline"
                  >
                    support@oatclub.com
                  </a>
                </div>

                <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                  <Link
                    href="/"
                    className="group inline-flex items-center justify-center rounded-2xl bg-oat-espresso px-6 py-3 text-white shadow-sm transition hover:bg-oat-soil-maroon"
                  >
                    Go to Home
                    <span className="ml-2 translate-x-0 transition group-hover:translate-x-0.5">
                      →
                    </span>
                  </Link>

                  <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 bg-white px-6 py-3 text-oat-text transition hover:bg-oat-bg"
                  >
                    Go to Dashboard
                  </Link>
                </div>

                <p className="mt-6 text-xs text-oat-deep-umber-70">
                  Tip: Try the dashboard route or verify the URL.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
