"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CakeSlice,
  CalendarDays,
  Download,
  Heart,
  LoaderCircle,
  Mail,
  MessageSquareText,
  Phone,
  RefreshCw,
  Search,
} from "lucide-react";

import useBdayStore from "@/store/bdaystore";

const EMPTY_WISHES = [];

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(date);
};

const getDayKey = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(date);
};

export default function BirthdayWishesPage() {
  const storeWishes = useBdayStore((state) => state.wishes);
  const loading = useBdayStore((state) => state.loading);
  const error = useBdayStore((state) => state.error);
  const fetchWishes = useBdayStore((state) => state.fetchWishes);

  const wishes = Array.isArray(storeWishes) ? storeWishes : EMPTY_WISHES;

  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    fetchWishes().catch(() => { });
  }, [fetchWishes]);

  const filteredWishes = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return wishes;

    return wishes.filter((wish) =>
      [wish?.name, wish?.email, wish?.phone, wish?.message].some((value) =>
        String(value ?? "").toLowerCase().includes(query)
      )
    );
  }, [wishes, search]);

  const todayCount = wishes.filter(
    (wish) =>
      wish?.createdAt &&
      getDayKey(wish.createdAt) === getDayKey(new Date())
  ).length;

  const downloadExcel = async () => {
    if (exporting || !filteredWishes.length) return;

    setExporting(true);
    setExportError("");

    try {
      const XLSX = await import("xlsx");

      const rows = filteredWishes.map((wish, index) => [
        index + 1,
        String(wish?.name ?? ""),
        String(wish?.email ?? ""),
        String(wish?.phone ?? ""),
        String(wish?.message ?? ""),
        formatDate(wish?.createdAt),
      ]);

      const worksheet = XLSX.utils.aoa_to_sheet([
        ["S.No.", "Name", "Email", "Phone", "Message", "Received At (IST)"],
        ...rows,
      ]);

      worksheet["!cols"] = [
        { wch: 8 },
        { wch: 24 },
        { wch: 36 },
        { wch: 20 },
        { wch: 90 },
        { wch: 28 },
      ];

      worksheet["!autofilter"] = {
        ref: worksheet["!ref"],
      };

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Birthday Wishes"
      );

      XLSX.writeFile(
        workbook,
        `OATCLUB-Birthday-Wishes-${getDayKey(new Date())}.xlsx`
      );
    } catch (err) {
      console.error("Birthday wishes export failed:", err);
      setExportError("Excel download failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f7f7] px-3 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full">
        {/* Compact header */}
        <section className="flex items-center gap-3 rounded-2xl bg-black px-4 py-5 text-white sm:px-6">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-black">
            <CakeSlice size={22} />
          </div>

          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-white/50">
              OATCLUB Community
            </p>

            <h1 className="mt-1 text-lg font-bold sm:text-2xl">
              Founder’s Birthday Wishes
            </h1>

            <p className="mt-1 text-xs text-white/60">
              A little love, a lot of lovely messages.
            </p>
          </div>
        </section>

        {/* Compact stats */}
        <section className="mt-3 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-white px-4 py-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-pink-50 text-pink-500">
              <Heart size={17} fill="currentColor" />
            </div>

            <div>
              <p className="text-[11px] text-neutral-500">Total wishes</p>
              <p className="text-xl font-bold text-black">{wishes.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-white px-4 py-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600">
              <CalendarDays size={17} />
            </div>

            <div>
              <p className="text-[11px] text-neutral-500">Received today</p>
              <p className="text-xl font-bold text-black">{todayCount}</p>
            </div>
          </div>
        </section>

        {/* Wishes */}
        <section className="mt-3 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-neutral-100 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-bold text-black">
                Birthday Messages
              </h2>

              <p className="mt-1 text-[11px] text-neutral-500">
                Showing {filteredWishes.length} of {wishes.length} wishes
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-0 flex-1 sm:min-w-64">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search wishes..."
                  aria-label="Search birthday wishes"
                  className="h-10 w-full rounded-lg bg-neutral-100 pl-9 pr-3 text-xs text-black outline-none transition focus:ring-2 focus:ring-black"
                />
              </div>

              <button
                type="button"
                onClick={() => fetchWishes().catch(() => { })}
                disabled={loading}
                aria-label="Refresh wishes"
                title="Refresh wishes"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-neutral-200 text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-50"
              >
                <RefreshCw
                  size={15}
                  className={loading ? "animate-spin" : ""}
                />
              </button>

              <button
                type="button"
                onClick={downloadExcel}
                disabled={exporting || loading || !filteredWishes.length}
                title="Download shown wishes as Excel"
                className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-black px-3 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {exporting ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <Download size={15} />
                )}

                {exporting ? "Exporting..." : "Excel"}
              </button>
            </div>
          </div>

          {(error || exportError) && (
            <div
              role="alert"
              className="m-4 space-y-1 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600"
            >
              {error && <p>{String(error)}</p>}
              {exportError && <p>{exportError}</p>}
            </div>
          )}

          {loading && !wishes.length ? (
            <div className="flex min-h-56 flex-col items-center justify-center text-neutral-400">
              <LoaderCircle size={25} className="animate-spin" />
              <p className="mt-3 text-xs">Loading wishes...</p>
            </div>
          ) : filteredWishes.length ? (
            <div className="divide-y divide-neutral-100">
              {filteredWishes.map((wish, index) => (
                <article
                  key={wish._id || index}
                  className="grid min-w-0 grid-cols-1 gap-3 px-4 py-4 transition hover:bg-neutral-50 lg:grid-cols-[260px_minmax(0,1fr)_170px] lg:items-start lg:gap-5"
                >
                  {/* Sender */}
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-pink-50 text-xs font-bold uppercase text-pink-600">
                      {String(wish?.name || "").trim().charAt(0) || "W"}
                    </div>

                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-black">
                        {wish.name || "Anonymous"}
                      </p>

                      <div className="mt-1.5 space-y-1">
                        <div className="flex items-start gap-1.5 text-[11px] text-neutral-500">
                          <Mail
                            size={12}
                            className="mt-0.5 shrink-0 text-neutral-400"
                          />

                          <span className="min-w-0 break-all">
                            {wish.email || "Email not provided"}
                          </span>
                        </div>

                        <div className="flex items-start gap-1.5 text-[11px] text-neutral-500">
                          <Phone
                            size={12}
                            className="mt-0.5 shrink-0 text-neutral-400"
                          />

                          <span className="min-w-0 break-all">
                            {wish.phone || "Phone not provided"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Full message */}
                  <div className="min-w-0 rounded-lg bg-neutral-50 px-3 py-2.5 lg:bg-transparent lg:p-0">
                    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-neutral-700 [overflow-wrap:anywhere]">
                      {wish.message || "—"}
                    </p>
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 lg:justify-end lg:pt-1">
                    <CalendarDays size={12} className="shrink-0" />

                    <time className="lg:text-right">
                      {formatDate(wish.createdAt)}
                    </time>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex min-h-56 flex-col items-center justify-center px-4 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-neutral-100 text-neutral-400">
                <MessageSquareText size={21} />
              </div>

              <h3 className="mt-3 text-sm font-semibold text-black">
                No wishes found
              </h3>

              <p className="mt-1 text-xs text-neutral-500">
                {search.trim()
                  ? "Try another name, email, phone number or message."
                  : "Birthday wishes will appear here once submitted."}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
