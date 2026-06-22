"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Layers3, MailOpen, Search, Sparkles } from "lucide-react";

const statusStyles = {
  Live: "bg-zinc-950 text-white border-zinc-950",
  Ready: "bg-zinc-950 text-white border-zinc-950",
  Review: "bg-zinc-100 text-zinc-800 border-zinc-200",
  Draft: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

const statToneStyles = {
  neutral: "bg-zinc-950 text-white",
  success: "bg-zinc-100 text-zinc-800",
  warning: "bg-zinc-100 text-zinc-800",
  muted: "bg-zinc-100 text-zinc-700",
};

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function EmailPreviewWorkspace({
  templates = [],
  selectedSlug = null,
  mode = "dashboard",
}) {
  const [query, setQuery] = useState("");
  const [activeSlug, setActiveSlug] = useState(selectedSlug);

  useEffect(() => {
    setActiveSlug(selectedSlug);
  }, [selectedSlug]);

  const filteredTemplates = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return templates;

    return templates.filter((item) =>
      [item.name, item.subject, item.category, item.audience, item.status, item.sourceFile]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [query, templates]);

  const emailSummaryStats = useMemo(
    () => [
      { label: "Total templates", value: templates.length, tone: "neutral" },
      {
        label: "Customer emails",
        value: templates.filter((item) => item.audience !== "Admin team").length,
        tone: "success",
      },
      {
        label: "Admin alerts",
        value: templates.filter((item) => item.audience === "Admin team").length,
        tone: "warning",
      },
      {
        label: "Order flow mails",
        value: templates.filter((item) => item.category === "Order Flow").length,
        tone: "muted",
      },
    ],
    [templates]
  );

  const activeTemplate =
    templates.find((item) => item.slug === activeSlug) ||
    filteredTemplates[0] ||
    templates[0] ||
    null;

  const listHeading =
    mode === "library" ? "Template library" : "Preview everything before you touch it";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-zinc-200 bg-white shadow-[0_24px_70px_rgba(9,9,11,0.04)]">
        <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
              <MailOpen size={14} />
              Email workspace
            </div>

            <h1 className="mt-4 text-4xl font-black leading-[1.02] tracking-tight text-zinc-950 sm:text-5xl">
              OATCLUB email previews, all in one place.
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
              See every real backend email template, subject line, audience, and final HTML
              preview before making any change. This is now tied to the OATCLUB nodemailer
              templates, not dummy concept content.
            </p>
          </div>

          <div className="rounded-[28px] border border-zinc-200 bg-zinc-50 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              What you can do here
            </p>
            <div className="mt-3 grid gap-2 text-sm text-zinc-700">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-zinc-500" />
                Browse all OATCLUB mail templates
              </div>
              <div className="flex items-center gap-2">
                <Layers3 size={16} className="text-zinc-500" />
                See which backend file each preview came from
              </div>
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-zinc-500" />
                Switch previews instantly without leaving this screen
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-t border-zinc-100 px-5 py-5 sm:px-7 md:grid-cols-2 xl:grid-cols-4">
          {emailSummaryStats.map((item) => (
            <div key={item.label} className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                {item.label}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-3xl font-black text-zinc-950">{item.value}</p>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${statToneStyles[item.tone]}`}
                >
                  Live
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <div className="rounded-[26px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black tracking-tight text-zinc-950">{listHeading}</h2>
                <p className="mt-1 text-sm text-zinc-500">Search and switch any email preview instantly.</p>
              </div>

              <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                <Search size={16} className="text-zinc-500" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search templates..."
                  className="w-full min-w-[180px] bg-transparent text-sm outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {filteredTemplates.map((item) => {
              const isActive = activeTemplate?.slug === item.slug;

              return (
                <button
                  type="button"
                  key={item.slug}
                  onClick={() => setActiveSlug(item.slug)}
                  className={`rounded-[26px] border p-4 transition-all ${
                    isActive
                      ? "border-zinc-950 bg-zinc-950 text-white shadow-[0_18px_40px_rgba(9,9,11,0.18)]"
                      : "border-zinc-200 bg-white text-zinc-950 shadow-sm hover:-translate-y-0.5 hover:border-zinc-300"
                  } text-left`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                          isActive ? "text-white/65" : "text-zinc-500"
                        }`}
                      >
                        {item.category}
                      </p>
                      <h3 className="mt-2 text-lg font-black">{item.name}</h3>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${
                        isActive
                          ? "border-white/20 bg-white/10 text-white"
                          : statusStyles[item.status] || statusStyles.Live
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <p className={`mt-3 text-sm leading-6 ${isActive ? "text-white/78" : "text-zinc-600"}`}>
                    {item.subject}
                  </p>

                  <div className={`mt-3 text-xs ${isActive ? "text-white/60" : "text-zinc-500"}`}>
                    {item.sourceFile}
                  </div>

                  <div className={`mt-4 flex items-center justify-between text-xs ${isActive ? "text-white/60" : "text-zinc-500"}`}>
                    <span>{item.audience}</span>
                    <span>Updated {formatDate(item.updatedAt)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          {activeTemplate ? (
            <>
              <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                        {activeTemplate.category}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${
                          statusStyles[activeTemplate.status] || statusStyles.Live
                        }`}
                      >
                        {activeTemplate.status}
                      </span>
                    </div>

                    <h2 className="mt-4 text-3xl font-black tracking-tight text-zinc-950">
                      {activeTemplate.name}
                    </h2>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl bg-zinc-50 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                          Subject line
                        </p>
                        <p className="mt-2 text-sm font-medium leading-6 text-zinc-900">
                          {activeTemplate.subject}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-zinc-50 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                          Preheader
                        </p>
                        <p className="mt-2 text-sm font-medium leading-6 text-zinc-900">
                          {activeTemplate.preheader}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-zinc-600">{activeTemplate.summary}</p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {activeTemplate.highlights.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4 lg:w-[300px]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      Quick details
                    </p>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-zinc-500">Audience</span>
                        <span className="text-right font-semibold text-zinc-900">
                          {activeTemplate.audience}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-zinc-500">Source</span>
                        <span className="text-right font-semibold text-zinc-900">
                          {activeTemplate.sourceFile}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-zinc-500">Last updated</span>
                        <span className="font-semibold text-zinc-900">
                          {formatDate(activeTemplate.updatedAt)}
                        </span>
                      </div>
                      <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800">
                        Preview updates here instantly.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[30px] border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-zinc-950">Email preview</h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      This preview is rendered from the actual backend OATCLUB template.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-800">
                    Live in-place preview
                  </div>
                </div>

                <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-zinc-100 p-3 sm:p-5">
                  <div className="mx-auto min-h-[520px] max-w-[720px] overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-[0_20px_50px_rgba(9,9,11,0.08)]">
                    <div
                      className="min-h-[520px]"
                      dangerouslySetInnerHTML={{ __html: activeTemplate.html }}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-[28px] border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-500">
              No template matched your search.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
