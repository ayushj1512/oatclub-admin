import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getEmailPreviewTemplateBySlug } from "@/components/email/emailPreviewData";

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const statusStyles = {
  Ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Review: "bg-amber-50 text-amber-700 border-amber-200",
  Draft: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

export default async function EmailPreviewPage({ params }) {
  const resolvedParams = await params;
  const template = await getEmailPreviewTemplateBySlug(resolvedParams?.slug);

  if (!template) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/email/library"
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-zinc-950"
          >
            <ArrowLeft size={16} />
            Back to email library
          </Link>

          <h1 className="mt-3 text-4xl font-black tracking-tight text-zinc-950">
            {template.name}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-600">
            {template.summary}
          </p>
        </div>

        <span
          className={`rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] ${statusStyles[template.status]}`}
        >
          {template.status}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Subject
          </p>
          <p className="mt-3 text-sm font-semibold leading-6 text-zinc-950">
            {template.subject}
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Preheader
          </p>
          <p className="mt-3 text-sm font-semibold leading-6 text-zinc-950">
            {template.preheader}
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Audience
          </p>
          <p className="mt-3 text-sm font-semibold leading-6 text-zinc-950">
            {template.audience}
          </p>
          <p className="mt-2 text-xs text-zinc-500">Updated {formatDate(template.updatedAt)}</p>
        </div>
      </div>

      <div className="rounded-[32px] border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap gap-2">
          {template.highlights.map((item) => (
            <span
              key={item}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600"
            >
              {item}
            </span>
          ))}
        </div>

        <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-[#f3efe8] p-3 sm:p-5">
          <div className="mx-auto max-w-[760px] overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-[0_24px_60px_rgba(9,9,11,0.08)]">
            <div dangerouslySetInnerHTML={{ __html: template.html }} />
          </div>
        </div>
      </div>
    </div>
  );
}
