"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
} from "lucide-react";

export function AffiliatePageHeader({
  eyebrow = "OATCLUB Affiliate Program",
  title,
  description,
  backHref,
  actions,
}) {
  return (
    <div className="flex flex-col gap-5 border-b border-neutral-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-neutral-500 transition hover:text-black"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
        ) : null}

        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
          {eyebrow}
        </p>

        <h1 className="text-3xl font-semibold tracking-tight text-black sm:text-4xl">
          {title}
        </h1>

        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  loading = false,
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
            {label}
          </p>

          <div className="mt-3 min-h-9">
            {loading ? (
              <Loader2 className="animate-spin text-neutral-400" size={22} />
            ) : (
              <p className="text-2xl font-semibold tracking-tight text-black">
                {value}
              </p>
            )}
          </div>

          {helper ? (
            <p className="mt-2 text-xs text-neutral-500">{helper}</p>
          ) : null}
        </div>

        {Icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-black">
            <Icon size={18} strokeWidth={1.8} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SectionCard({ title, description, actions, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      {(title || description || actions) && (
        <div className="flex flex-col gap-3 border-b border-neutral-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title ? (
              <h2 className="text-sm font-semibold text-black">{title}</h2>
            ) : null}

            {description ? (
              <p className="mt-1 text-xs leading-5 text-neutral-500">
                {description}
              </p>
            ) : null}
          </div>

          {actions ? <div>{actions}</div> : null}
        </div>
      )}

      {children}
    </section>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder = "Search...",
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
      />

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-4 text-sm text-black outline-none transition placeholder:text-neutral-400 focus:border-black"
      />
    </div>
  );
}

export function SelectField({ value, onChange, children, className = "" }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-black outline-none transition focus:border-black ${className}`}
    >
      {children}
    </select>
  );
}

export function StatusBadge({ status }) {
  const normalized = String(status || "").toLowerCase();

  const styles = {
    active: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    delivered: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",

    pending: "bg-amber-50 text-amber-700 ring-amber-600/10",
    processing: "bg-amber-50 text-amber-700 ring-amber-600/10",

    paused: "bg-neutral-100 text-neutral-700 ring-neutral-600/10",

    blocked: "bg-red-50 text-red-700 ring-red-600/10",
    cancelled: "bg-red-50 text-red-700 ring-red-600/10",
    rejected: "bg-red-50 text-red-700 ring-red-600/10",
    refunded: "bg-red-50 text-red-700 ring-red-600/10",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1 ring-inset ${
        styles[normalized] ||
        "bg-neutral-100 text-neutral-600 ring-neutral-600/10"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
}

export function EmptyState({
  title = "No records found",
  description = "Try changing the filters or create a new record.",
}) {
  return (
    <div className="px-6 py-16 text-center">
      <p className="text-sm font-semibold text-black">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-neutral-500">
        {description}
      </p>
    </div>
  );
}

export function TableLoader() {
  return (
    <div className="flex items-center justify-center gap-3 px-6 py-16 text-sm text-neutral-500">
      <Loader2 size={18} className="animate-spin" />
      Loading data...
    </div>
  );
}

export function Pagination({
  pagination,
  onPageChange,
}) {
  const page = Number(pagination?.page || 1);
  const totalPages = Number(pagination?.totalPages || 1);
  const total = Number(pagination?.total || 0);

  return (
    <div className="flex flex-col gap-3 border-t border-neutral-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-neutral-500">
        Page <span className="font-medium text-black">{page}</span> of{" "}
        <span className="font-medium text-black">{totalPages || 1}</span>
        {" · "}
        {total} records
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!pagination?.hasPreviousPage}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-xs font-medium text-black transition hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={14} />
          Previous
        </button>

        <button
          type="button"
          disabled={!pagination?.hasNextPage}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-xs font-medium text-black transition hover:border-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

export function PrimaryButton({
  children,
  type = "button",
  onClick,
  disabled,
  href,
}) {
  const className =
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-4 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50";

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  type = "button",
  onClick,
  disabled,
  href,
}) {
  const className =
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-xs font-semibold uppercase tracking-[0.12em] text-black transition hover:border-black disabled:cursor-not-allowed disabled:opacity-50";

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  );
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}