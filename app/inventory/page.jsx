"use client";

import {
  Construction,
  Heart,
  Loader2,
  Sparkles,
  WandSparkles,
} from "lucide-react";

export default function FabricInventoryPage() {
  return (
    <main className="relative flex min-h-[calc(100vh-64px)] items-center justify-center overflow-hidden bg-[#fafafa] px-4 py-10 text-black">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-pink-100/70 blur-3xl" />

        <div className="absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-violet-100/70 blur-3xl" />

        <div className="absolute left-1/2 top-1/3 h-52 w-52 -translate-x-1/2 rounded-full bg-amber-50 blur-3xl" />
      </div>

      <section className="relative w-full max-w-2xl overflow-hidden rounded-[32px] border border-black/10 bg-white/90 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.08)] backdrop-blur sm:p-10">
        {/* Top badge */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-pink-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-pink-700">
            <Sparkles size={14} />
            Something lovely is coming
          </div>
        </div>

        {/* Illustration */}
        <div className="relative mx-auto mb-8 flex h-36 w-36 items-center justify-center">
          <div className="absolute inset-0 animate-pulse rounded-[38px] bg-gradient-to-br from-pink-100 via-white to-violet-100" />

          <div className="absolute inset-3 rounded-[30px] border border-black/10 bg-white shadow-sm" />

          <Construction
            size={48}
            strokeWidth={1.7}
            className="relative z-10 text-black"
          />

          <div className="absolute -right-2 top-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-pink-200 bg-pink-50 shadow-sm">
            <WandSparkles
              size={18}
              className="text-pink-600"
            />
          </div>

          <div className="absolute -bottom-1 left-1 flex h-9 w-9 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 shadow-sm">
            <Heart
              size={16}
              className="text-violet-600"
            />
          </div>
        </div>

        {/* Content */}
        <div className="text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-black/40">
            Fabric Inventory
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-black sm:text-4xl">
            Work in progress
          </h1>

          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-black/55 sm:text-base">
            We are carefully stitching together a better fabric
            inventory experience for OATCLUB.
          </p>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/45">
            Fabric stock, movement, pricing and product
            assignments will all be managed beautifully from
            here.
          </p>
        </div>

        {/* Progress */}
        <div className="mx-auto mt-8 max-w-md rounded-2xl border border-black/10 bg-[#fafafa] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Loader2
                size={16}
                className="animate-spin text-black"
              />

              <span className="text-sm font-medium text-black">
                Building the module
              </span>
            </div>

            <span className="text-xs font-semibold text-black/45">
              In progress
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-black/5">
            <div className="h-full w-[68%] animate-pulse rounded-full bg-black" />
          </div>
        </div>

        {/* Mini feature cards */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FeatureCard
            emoji="🧵"
            title="Fabric stock"
          />

          <FeatureCard
            emoji="₹"
            title="Price history"
          />

          <FeatureCard
            emoji="✨"
            title="Smart logs"
          />
        </div>

        <div className="mt-8 border-t border-black/10 pt-5 text-center">
          <p className="text-xs text-black/40">
            OATCLUB · Own All Trends
          </p>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ emoji, title }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-sm">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/5 text-sm">
        {emoji}
      </span>

      <span className="text-xs font-medium text-black/65">
        {title}
      </span>
    </div>
  );
}