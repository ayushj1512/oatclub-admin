"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCollaborationStore } from "@/store/CollaborationStore";

/**
 * app/collaboration/page.jsx
 * Sober black/white/grey UI (like /add)
 * - Metrics cards
 * - Platform + Status splits
 * - Recent list + quick status actions
 * - No heavy borders (uses subtle ring)
 */

const PLATFORMS = [
  "instagram",
  "youtube",
  "facebook",
  "snapchat",
  "twitter",
  "linkedin",
  "website",
  "other",
];

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-3xl bg-white p-5 md:p-6 ring-1 ring-gray-100 ${className}`}>
      {children}
    </div>
  );
}

function StatCard({ title, value, hint }) {
  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-gray-100">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-gray-400">{hint}</div> : null}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={
        "w-full rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-900 " +
        "placeholder:text-gray-400 outline-none ring-1 ring-gray-100 " +
        "focus:bg-white focus:ring-2 focus:ring-gray-200 transition"
      }
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className={
        "w-full rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-900 " +
        "outline-none ring-1 ring-gray-100 focus:bg-white focus:ring-2 focus:ring-gray-200 transition"
      }
    />
  );
}

function PillButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-2xl px-4 py-2 text-sm transition ring-1 " +
        (active
          ? "bg-gray-900 text-white ring-gray-900"
          : "bg-white text-gray-800 ring-gray-100 hover:bg-gray-50")
      }
    >
      {children}
    </button>
  );
}

function MiniBarRow({ label, value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 truncate text-sm text-gray-600">{label}</div>
      <div className="flex-1">
        <div className="h-2 w-full rounded-full bg-gray-100">
          <div className="h-2 rounded-full bg-gray-900" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="w-10 text-right text-sm text-gray-700">{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const base = "inline-flex items-center rounded-full px-2.5 py-1 text-xs ring-1";
  if (status === "ongoing") return <span className={`${base} bg-gray-900 text-white ring-gray-900`}>ongoing</span>;
  if (status === "completed") return <span className={`${base} bg-white text-gray-700 ring-gray-100`}>completed</span>;
  if (status === "cancelled") return <span className={`${base} bg-gray-50 text-gray-700 ring-gray-100`}>cancelled</span>;
  return <span className={`${base} bg-gray-50 text-gray-600 ring-gray-100`}>{status || "unknown"}</span>;
}

export default function CollaborationDashboardPage() {
  const router = useRouter();

  const {
    items,
    loading,
    error,
    meta,
    filters,
    setFilters,
    setPage,
    setLimit,
    fetchList,
    updateOne,
    clearError,
  } = useCollaborationStore();

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.status,
    filters.platform,
    filters.productId,
    filters.state,
    filters.q,
    filters.sort,
    meta.page,
    meta.limit,
  ]);

  const metrics = useMemo(() => {
    const totalShown = items?.length || 0;

    const byStatus = items.reduce(
      (acc, c) => {
        const s = c?.status || "unknown";
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      },
      { ongoing: 0, completed: 0, cancelled: 0 }
    );

    const byPlatform = items.reduce((acc, c) => {
      const p = c?.platform || "unknown";
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {});

    const uniqueProducts = new Set(
      items.map((c) => c?.productId?._id || c?.productId).filter(Boolean)
    ).size;

    const uniqueInfluencers = new Set(
      items
        .map((c) => (c?.influencer?.name || "").trim().toLowerCase())
        .filter(Boolean)
    ).size;

    const platformEntries = Object.entries(byPlatform).sort((a, b) => b[1] - a[1]);
    const maxPlatform = platformEntries.length ? platformEntries[0][1] : 0;

    const statusMax = Math.max(byStatus.ongoing || 0, byStatus.completed || 0, byStatus.cancelled || 0);

    return {
      totalShown,
      byStatus,
      uniqueProducts,
      uniqueInfluencers,
      platformEntries,
      maxPlatform,
      statusMax,
    };
  }, [items]);

  const recent = useMemo(() => (items || []).slice(0, 10), [items]);

  const onQuickStatus = (status) => {
    clearError?.();
    setFilters({ status });
  };

  const onSearch = (e) => setFilters({ q: e.target.value });

  const onMarkCompleted = async (id) => id && (await updateOne(id, { status: "completed" }));
  const onMarkCancelled = async (id) => id && (await updateOne(id, { status: "cancelled" }));

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 md:py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-2xl font-semibold text-gray-900">Collaborations</div>
            <div className="mt-1 text-sm text-gray-500">
              Clean view for status, platforms, and recent activity.
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => router.push("/collaboration/add")}
              className="rounded-2xl bg-gray-900 px-5 py-3 text-sm text-white hover:bg-gray-800 transition"
            >
              Add Collaboration
            </button>

            <Input
              value={filters.q || ""}
              onChange={onSearch}
              placeholder="Search influencer name..."
            />
          </div>
        </div>

        {/* Error */}
        {error ? (
          <div className="mt-5 rounded-3xl bg-gray-50 p-4 text-sm text-gray-800 ring-1 ring-gray-100">
            <div className="font-medium">Something went wrong</div>
            <div className="mt-1 text-gray-600">{error}</div>
          </div>
        ) : null}

        {/* Quick filters */}
        <div className="mt-6 flex flex-wrap gap-2">
          <PillButton active={filters.status === "ongoing"} onClick={() => onQuickStatus("ongoing")}>
            Ongoing
          </PillButton>
          <PillButton active={filters.status === "completed"} onClick={() => onQuickStatus("completed")}>
            Completed
          </PillButton>
          <PillButton active={filters.status === "cancelled"} onClick={() => onQuickStatus("cancelled")}>
            Cancelled
          </PillButton>
          <PillButton active={!filters.status} onClick={() => setFilters({ status: "" })}>
            All
          </PillButton>

          <div className="flex-1" />

          <div className="min-w-[220px]">
            <Select
              value={filters.platform || ""}
              onChange={(e) => setFilters({ platform: e.target.value })}
            >
              <option value="">All platforms</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total (current page)"
            value={metrics.totalShown}
            hint={`API total: ${meta.total ?? 0}`}
          />
          <StatCard title="Ongoing" value={metrics.byStatus.ongoing || 0} />
          <StatCard title="Unique Products" value={metrics.uniqueProducts} />
          <StatCard title="Unique Influencers" value={metrics.uniqueInfluencers} />
        </div>

        {/* Splits */}
        <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-gray-900">Platform Split</div>
              <div className="text-xs text-gray-400">Current view</div>
            </div>

            <div className="mt-4 space-y-3">
              {metrics.platformEntries.length ? (
                metrics.platformEntries.slice(0, 8).map(([p, count]) => (
                  <MiniBarRow key={p} label={p} value={count} max={metrics.maxPlatform} />
                ))
              ) : (
                <div className="text-sm text-gray-500">No data for current filters.</div>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-semibold text-gray-900">Status Split</div>
              <div className="text-xs text-gray-400">Current view</div>
            </div>

            <div className="mt-4 space-y-3">
              {["ongoing", "completed", "cancelled"].map((s) => (
                <MiniBarRow key={s} label={s} value={metrics.byStatus[s] || 0} max={metrics.statusMax} />
              ))}
            </div>

            <div className="mt-4 rounded-2xl bg-gray-50 p-3 text-xs text-gray-600 ring-1 ring-gray-100">
              For org-wide totals, add an aggregation endpoint like{" "}
              <span className="font-mono">/api/collaborations/metrics</span>.
            </div>
          </Card>
        </div>

        {/* Recent list */}
        <Card className="mt-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-base font-semibold text-gray-900">Recent Collaborations</div>
              <div className="text-sm text-gray-500">Latest items from current list.</div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                value={filters.sort || "-createdAt"}
                onChange={(e) => setFilters({ sort: e.target.value })}
              >
                <option value="-createdAt">Newest first</option>
                <option value="createdAt">Oldest first</option>
                <option value="-updatedAt">Recently updated</option>
              </Select>

              <Select
                value={meta.limit || 20}
                onChange={(e) => setLimit(parseInt(e.target.value, 10))}
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </Select>

              <button
                type="button"
                onClick={() => fetchList()}
                className="rounded-2xl bg-gray-900 px-5 py-3 text-sm text-white hover:bg-gray-800 transition"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="mt-5 divide-y divide-gray-100">
            {loading ? (
              <div className="py-8 text-center text-sm text-gray-500">Loading...</div>
            ) : recent.length ? (
              recent.map((c) => {
                const product = c?.productId;
                const productTitle =
                  typeof product === "object" && product
                    ? product.title || product.productCode || product.slug || product._id
                    : String(product || "");

                const primaryLink =
                  Array.isArray(c?.influencer?.links) && c.influencer.links.length
                    ? c.influencer.links[0]
                    : "";

                return (
                  <div key={c._id} className="py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium text-gray-900 truncate">
                          {c?.influencer?.name || "-"}
                        </div>
                        <StatusBadge status={c?.status} />
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
                          {c?.platform || "-"}
                        </span>
                      </div>

                      <div className="mt-1 text-sm text-gray-600">
                        <span className="text-gray-500">Product:</span>{" "}
                        <span className="font-medium text-gray-800">{productTitle || "-"}</span>
                        {c?.influencer?.state ? (
                          <>
                            <span className="mx-2 text-gray-300">•</span>
                            <span className="text-gray-500">State:</span>{" "}
                            <span className="text-gray-700">{c.influencer.state}</span>
                          </>
                        ) : null}
                      </div>

                      {primaryLink ? (
                        <a
                          href={primaryLink}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-xs text-gray-500 hover:text-gray-800 transition break-all"
                        >
                          {primaryLink}
                        </a>
                      ) : null}

                      <div className="mt-1 text-xs text-gray-400">
                        {c?.createdAt ? new Date(c.createdAt).toLocaleString() : "-"}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 md:justify-end">
                      {c?.status === "ongoing" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onMarkCompleted(c._id)}
                            className="rounded-2xl bg-gray-100 px-4 py-2 text-sm text-gray-900 hover:bg-gray-200 transition"
                          >
                            Mark Completed
                          </button>
                          <button
                            type="button"
                            onClick={() => onMarkCancelled(c._id)}
                            className="rounded-2xl bg-gray-100 px-4 py-2 text-sm text-gray-900 hover:bg-gray-200 transition"
                          >
                            Mark Cancelled
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => updateOne(c._id, { status: "ongoing" })}
                          className="rounded-2xl bg-gray-100 px-4 py-2 text-sm text-gray-900 hover:bg-gray-200 transition"
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-10 text-center text-sm text-gray-500">
                No collaborations found for current filters.
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-600">
              Page <span className="font-medium">{meta.page}</span> of{" "}
              <span className="font-medium">{meta.pages || 1}</span> — Total{" "}
              <span className="font-medium">{meta.total || 0}</span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={meta.page <= 1 || loading}
                onClick={() => setPage(Math.max((meta.page || 1) - 1, 1))}
                className="rounded-2xl bg-gray-100 px-5 py-3 text-sm text-gray-900 hover:bg-gray-200 disabled:opacity-60 transition"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={(meta.pages ? meta.page >= meta.pages : false) || loading}
                onClick={() => setPage((meta.page || 1) + 1)}
                className="rounded-2xl bg-gray-100 px-5 py-3 text-sm text-gray-900 hover:bg-gray-200 disabled:opacity-60 transition"
              >
                Next
              </button>
            </div>
          </div>
        </Card>

        <div className="mt-8 text-center text-xs text-gray-400">
          Metrics are computed from the current list view (filters + pagination).
        </div>
      </div>
    </div>
  );
}
