"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Mail,
  Phone,
  User,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { useCustomerStore } from "@/store/customerStore";

const safe = (v) => String(v ?? "").trim();

function StatChip({ label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-zinc-900">{value}</div>
    </div>
  );
}

function SearchInput({ value, onChange, onSubmit, loading, disabled }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !disabled) onSubmit();
            }}
            placeholder="Search by name, mobile, email..."
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 pl-11 pr-4 text-sm text-zinc-900 outline-none transition focus:border-black/20 focus:bg-white"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onSubmit}
            disabled={loading || disabled}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-black px-5 text-sm font-medium text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ hasSearched, query }) {
  return (
    <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
        <Search className="h-6 w-6 text-zinc-500" />
      </div>

      <h3 className="mt-4 text-lg font-semibold text-zinc-900">
        {hasSearched ? "No customers found" : "Search customers"}
      </h3>

      <p className="mt-1 text-sm text-zinc-500">
        {hasSearched && query
          ? "Try another name, mobile number, or email."
          : "Nothing will load automatically here. Search to view customers."}
      </p>
    </div>
  );
}

function CustomerCard({ customer }) {
  const id = safe(customer?._id);
  const name = safe(customer?.name) || "Unnamed Customer";
  const email = safe(customer?.email) || "—";
  const phone = safe(customer?.phone) || "—";
  const joinedAt = customer?.createdAt
    ? new Date(customer.createdAt).toLocaleDateString("en-IN")
    : "—";
  const profileImage = safe(customer?.profileImage);

  return (
    <Link
      href={`/customers/${id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
          {profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profileImage}
              alt={name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User className="h-6 w-6 text-zinc-500" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-zinc-900">
                {name}
              </h3>
              <p className="mt-1 text-xs text-zinc-500">Joined: {joinedAt}</p>
            </div>

            <div className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-700">
              {customer?.isActive ? "Active" : "Inactive"}
            </div>
          </div>

          <div className="mt-4 grid gap-2 text-sm text-zinc-700">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-zinc-400" />
              <span className="truncate">{email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-zinc-400" />
              <span className="truncate">{phone}</span>
            </div>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-900">
            Open in new tab
            <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function CustomerSearchPage() {
  const { customers, total, loadingList, error, fetchCustomers } =
    useCustomerStore();

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const runSearch = async (q = search) => {
    const cleaned = safe(q);
    if (!cleaned) return;

    setAppliedSearch(cleaned);
    setHasSearched(true);

    await fetchCustomers({
      search: cleaned,
      page: 1,
      limit: 50,
    });
  };

  const resultCount = useMemo(
    () => (Array.isArray(customers) ? customers.length : 0),
    [customers]
  );

  const isSearchDisabled = !safe(search);

  return (
    <div className="min-h-screen bg-[#fafafa] p-4 md:p-8">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
              Customer Search
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Search by name, mobile, or email. Nothing loads until you search.
            </p>
          </div>

          <button
            onClick={() => runSearch(appliedSearch)}
            disabled={loadingList || !appliedSearch}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loadingList ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <SearchInput
          value={search}
          onChange={setSearch}
          onSubmit={() => runSearch()}
          loading={loadingList}
          disabled={isSearchDisabled}
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <StatChip
            label="Results on page"
            value={hasSearched ? resultCount : 0}
          />
          <StatChip
            label="Total matched"
            value={hasSearched ? total || 0 : 0}
          />
          <StatChip
            label="Current search"
            value={appliedSearch || "Not searched"}
          />
        </div>

        {error && hasSearched ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!hasSearched ? (
          <EmptyState hasSearched={false} query="" />
        ) : loadingList ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-3xl border border-zinc-200 bg-white"
              />
            ))}
          </div>
        ) : resultCount === 0 ? (
          <EmptyState hasSearched={true} query={appliedSearch} />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {customers.map((customer) => (
              <CustomerCard key={customer._id} customer={customer} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}