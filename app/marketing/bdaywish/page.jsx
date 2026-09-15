"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CakeSlice,
  CalendarDays,
  Heart,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";

import useBdayStore from "@/store/bdaystore";

const formatDate = (value) => {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

export default function BirthdayWishesPage() {
  const wishes = useBdayStore((state) => state.wishes);
  const loading = useBdayStore((state) => state.loading);
  const error = useBdayStore((state) => state.error);
  const fetchWishes = useBdayStore(
    (state) => state.fetchWishes
  );

  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchWishes().catch(() => { });
  }, [fetchWishes]);

  const filteredWishes = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return wishes;

    return wishes.filter((wish) => {
      return [wish?.name, wish?.message]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        );
    });
  }, [wishes, search]);

  const todayCount = useMemo(() => {
    const today = new Date().toDateString();

    return wishes.filter(
      (wish) =>
        wish?.createdAt &&
        new Date(wish.createdAt).toDateString() === today
    ).length;
  }, [wishes]);

  return (
    <main className="min-h-screen bg-[#f7f7f7] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto w-full">
        <section className="relative overflow-hidden rounded-3xl bg-black px-5 py-7 text-white sm:px-8 sm:py-9">
          <div className="absolute -right-14 -top-20 h-48 w-48 rounded-full bg-pink-500/20 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-yellow-400/15 blur-3xl" />

          <Sparkles className="absolute right-8 top-7 text-yellow-300" />

          <div className="relative">
            <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-white text-black">
              <CakeSlice size={24} />
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/50">
              Marketing Campaign
            </p>

            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
              Founder’s Birthday Wishes
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">
              All the lovely birthday messages received from
              the OATCLUB community.
            </p>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-500">
                  Total wishes
                </p>

                <p className="mt-1 text-2xl font-bold text-black">
                  {wishes.length}
                </p>
              </div>

              <div className="grid h-10 w-10 place-items-center rounded-xl bg-pink-50 text-pink-500">
                <Heart size={19} fill="currentColor" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-500">
                  Received today
                </p>

                <p className="mt-1 text-2xl font-bold text-black">
                  {todayCount}
                </p>
              </div>

              <div className="grid h-10 w-10 place-items-center rounded-xl bg-yellow-50 text-yellow-600">
                <CalendarDays size={19} />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-black">
                Birthday Messages
              </h2>

              <p className="mt-1 text-xs text-neutral-500">
                Showing {filteredWishes.length} wishes
              </p>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1 sm:w-72">
                <Search
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search wishes..."
                  className="h-11 w-full rounded-xl bg-neutral-100 pl-10 pr-4 text-sm outline-none transition focus:ring-2 focus:ring-black"
                />
              </div>

              <button
                type="button"
                onClick={() => fetchWishes().catch(() => { })}
                disabled={loading}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-black text-white disabled:opacity-50"
                aria-label="Refresh wishes"
              >
                <RefreshCw
                  size={17}
                  className={loading ? "animate-spin" : ""}
                />
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {loading && !wishes.length ? (
            <div className="flex min-h-72 flex-col items-center justify-center text-neutral-400">
              <LoaderCircle
                size={28}
                className="animate-spin"
              />

              <p className="mt-3 text-sm">Loading wishes...</p>
            </div>
          ) : filteredWishes.length ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredWishes.map((wish) => (
                <article
                  key={wish._id}
                  className="group rounded-2xl bg-neutral-50 p-4 transition hover:bg-neutral-100 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-black text-sm font-bold uppercase text-white">
                      {wish?.name?.trim()?.charAt(0) || "W"}
                    </div>

                    <MessageSquareText
                      size={18}
                      className="text-neutral-300 transition group-hover:text-pink-400"
                    />
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-neutral-700">
                    “{wish.message}”
                  </p>

                  <div className="mt-5 border-t border-neutral-200 pt-4">
                    <p className="text-sm font-bold text-black">
                      {wish.name}
                    </p>

                    <p className="mt-1 text-[11px] text-neutral-400">
                      {formatDate(wish.createdAt)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center px-4 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-neutral-100 text-neutral-400">
                <MessageSquareText size={24} />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-black">
                No wishes found
              </h3>

              <p className="mt-1 text-xs text-neutral-500">
                {search
                  ? "Try searching with another name or message."
                  : "Birthday wishes will appear here once submitted."}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
