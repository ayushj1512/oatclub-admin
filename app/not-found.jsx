// app/not-found.jsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.12),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(168,85,247,0.10),transparent_60%)] bg-gray-50 grid place-items-center p-6">
      <div className="w-full max-w-3xl">
        {/* Top decorative row */}
        <div className="mb-6 flex items-center justify-center gap-2 text-xs text-gray-600">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500/60" />
          <span className="font-medium">404</span>
          <span className="text-gray-400">•</span>
          <span>Page Not Found</span>
        </div>

        <div className="relative rounded-[32px] border border-gray-200 bg-white/70 backdrop-blur-xl shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)] overflow-hidden">
          {/* Animated ambient blobs */}
          <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-400/20 blur-3xl animate-[blob_10s_ease-in-out_infinite]" />
          <div className="pointer-events-none absolute -bottom-28 -right-20 h-72 w-72 rounded-full bg-purple-400/20 blur-3xl animate-[blob_12s_ease-in-out_infinite_reverse]" />

          {/* Sparkles */}
          <div className="pointer-events-none absolute inset-0 opacity-60">
            {Array.from({ length: 10 }).map((_, i) => (
              <span
                key={i}
                className="absolute h-1.5 w-1.5 rounded-full bg-gray-900/20 animate-[twinkle_3.8s_ease-in-out_infinite]"
                style={{
                  left: `${10 + i * 8}%`,
                  top: `${15 + ((i * 13) % 60)}%`,
                  animationDelay: `${i * 0.25}s`,
                }}
              />
            ))}
          </div>

          <div className="relative p-8 sm:p-12">
            <div className="grid gap-10 md:grid-cols-[240px_1fr] md:items-center">
              {/* 👻 Ghost */}
              <div className="flex justify-center">
                <div className="relative h-[220px] w-[220px]">
                  {/* glow */}
                  <div className="absolute inset-6 rounded-full bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 blur-3xl opacity-80 animate-[glow_2.8s_ease-in-out_infinite]" />

                  <div className="relative mx-auto mt-2 h-[170px] w-[170px] animate-[floaty_2.8s_ease-in-out_infinite]">
                    <svg viewBox="0 0 180 180" className="h-full w-full">
                      {/* body */}
                      <path
                        d="M90 20
                           C62 20 42 40 42 68
                           V130
                           C42 140 50 146 59 141
                           C66 137 70 137 76 141
                           C82 146 98 146 104 141
                           C110 137 114 137 121 141
                           C130 146 138 140 138 130
                           V68
                           C138 40 118 20 90 20Z"
                        fill="url(#g)"
                        stroke="#E5E7EB"
                        strokeWidth="3"
                      />

                      {/* wavy bottom */}
                      <path
                        d="M42 128
                           C52 140 64 140 74 128
                           C84 116 96 116 106 128
                           C116 140 128 140 138 128
                           V130
                           C138 140 130 146 121 141
                           C114 137 110 137 104 141
                           C98 146 82 146 76 141
                           C70 137 66 137 59 141
                           C50 146 42 140 42 130Z"
                        fill="rgba(255,255,255,0.85)"
                      />

                      {/* eyes blink */}
                      <g className="origin-center animate-[blink_5.2s_infinite]">
                        <rect x="68" y="78" width="12" height="18" rx="6" fill="#111827" />
                        <rect x="100" y="78" width="12" height="18" rx="6" fill="#111827" />
                      </g>

                      {/* blush */}
                      <circle cx="60" cy="104" r="7" fill="rgba(244,114,182,0.25)" />
                      <circle cx="120" cy="104" r="7" fill="rgba(244,114,182,0.25)" />

                      {/* mouth */}
                      <path
                        d="M78 116 Q90 126 102 116"
                        fill="none"
                        stroke="#111827"
                        strokeWidth="4"
                        strokeLinecap="round"
                        className="animate-[smile_2.8s_ease-in-out_infinite]"
                      />

                      <defs>
                        <linearGradient id="g" x1="40" y1="20" x2="140" y2="160">
                          <stop stopColor="white" />
                          <stop offset="1" stopColor="rgba(255,255,255,0.92)" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* shadow */}
                    <div className="absolute left-1/2 -bottom-8 -translate-x-1/2 h-[18px] w-[120px] rounded-full bg-black/10 blur-md animate-[shadow_2.8s_ease-in-out_infinite]" />
                  </div>
                </div>
              </div>

              {/* Text + CTAs */}
              <div className="text-center md:text-left">
                <h1 className="text-6xl sm:text-7xl font-black tracking-tight text-gray-900">
                  404
                </h1>

                <p className="mt-3 text-lg sm:text-xl font-semibold text-gray-900">
                  Page not found.
                </p>
                <p className="mt-2 text-sm sm:text-base text-gray-600 leading-relaxed">
                  The link may be incorrect, or the page may have been moved.
                  If the issue keeps happening, please contact the admin.
                </p>

                <div className="mt-6 rounded-2xl border border-gray-200 bg-white/70 p-4">
                  <p className="text-xs font-semibold text-gray-800">Contact Admin</p>
                  <a
                    href="mailto:miray.ayushjuneja@gmail.com"
                    className="text-sm text-blue-700 hover:underline"
                  >
                    miray.ayushjuneja@gmail.com
                  </a>
                </div>

                <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                  <Link
                    href="/"
                    className="group inline-flex items-center justify-center rounded-2xl bg-black px-6 py-3 text-white shadow-sm transition hover:bg-gray-900"
                  >
                    Go to Home
                    <span className="ml-2 translate-x-0 transition group-hover:translate-x-0.5">
                      →
                    </span>
                  </Link>

                  <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-3 text-gray-900 transition hover:bg-gray-50"
                  >
                    Go to Dashboard
                  </Link>
                </div>

                <p className="mt-6 text-xs text-gray-500">
                  Tip: Check the URL spelling or try the dashboard route.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom border shine */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gray-300/70 to-transparent" />
        </div>
      </div>
    </main>
  );
}
