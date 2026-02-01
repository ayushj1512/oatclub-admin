"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdminProductStore } from "@/store/adminProductStore";

export default function SamplingPage() {
  const {
    products,
    loading,
    saving,
    fetchAllProducts,
    updateSamplingStatus,
  } = useAdminProductStore();

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all"); // all | pending | done

  useEffect(() => {
    fetchAllProducts({});
  }, [fetchAllProducts]);

  const totals = useMemo(() => {
    const all = Array.isArray(products) ? products : [];
    const done = all.filter((p) => Boolean(p?.isSamplingDone)).length;
    const pending = all.length - done;
    return { total: all.length, done, pending };
  }, [products]);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();

    let out = Array.isArray(products) ? products : [];

    if (query) {
      out = out.filter((p) => {
        const title = String(p?.title || "").toLowerCase();
        const code = String(p?.productCode || "").toLowerCase();
        const slug = String(p?.slug || "").toLowerCase();
        return title.includes(query) || code.includes(query) || slug.includes(query);
      });
    }

    if (filter === "done") out = out.filter((p) => Boolean(p?.isSamplingDone));
    if (filter === "pending") out = out.filter((p) => !Boolean(p?.isSamplingDone));

    // newest first (optional)
    out = out.slice().sort((a, b) => {
      const da = new Date(a?.createdAt || 0).getTime();
      const db = new Date(b?.createdAt || 0).getTime();
      return db - da;
    });

    return out;
  }, [products, q, filter]);

  const onToggle = async (p) => {
    const next = !Boolean(p?.isSamplingDone);
    await updateSamplingStatus(p._id, next);
  };

  const getImage = (p) =>
    p?.thumbnail || (Array.isArray(p?.images) && p.images[0]) || "";

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-semibold">Production • Sampling</h1>
          <p className="text-sm text-gray-500">
            Sampling status manage karo (Done / Undo)
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              Total: {totals.total}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              Done: {totals.done}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
              Pending: {totals.pending}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <div className="relative">
            <input
              className="w-full md:w-96 rounded-xl bg-gray-50 px-4 py-2.5 text-sm outline-none ring-1 ring-gray-200 focus:bg-white focus:ring-2 focus:ring-black/20"
              placeholder="Search by title / productCode / slug..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <select
            className="rounded-xl bg-gray-50 px-3 py-2.5 text-sm outline-none ring-1 ring-gray-200 focus:bg-white focus:ring-2 focus:ring-black/20"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="done">Done</option>
          </select>

          <button
            className="rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            onClick={() => fetchAllProducts({})}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* List */}
      <div className="mt-5">
        {loading ? (
          <div className="rounded-2xl bg-gray-50 p-6 text-sm text-gray-600 ring-1 ring-gray-200">
            Loading...
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl bg-gray-50 p-6 text-sm text-gray-600 ring-1 ring-gray-200">
            No products found.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {list.map((p) => {
              const img = getImage(p);
              const done = Boolean(p?.isSamplingDone);

              return (
                <div
                  key={p._id}
                  className="rounded-2xl bg-white p-3 md:p-4 shadow-sm ring-1 ring-gray-200 hover:shadow-md transition"
                >
                  <div className="flex gap-3 md:gap-4">
                    {/* Image (bigger, contain) */}
                    <div className="h-24 w-24 md:h-28 md:w-28 shrink-0 rounded-xl bg-gray-50 ring-1 ring-gray-200 overflow-hidden flex items-center justify-center">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt={p?.title || "product"}
                          className="w-full h-full object-contain p-2"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">No image</span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm text-gray-500">
                            Code: <span className="font-semibold text-gray-700">{p?.productCode || "-"}</span>
                          </div>

                          <div className="mt-0.5 text-base font-semibold text-gray-900 truncate">
                            {p?.title || "-"}
                          </div>

                          {p?.slug ? (
                            <div className="mt-0.5 text-xs text-gray-500 truncate">
                              /{p.slug}
                            </div>
                          ) : null}
                        </div>

                        {/* Right side: status + action */}
                        <div className="flex items-center gap-2 md:gap-3">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              done
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {done ? "Done ✅" : "Pending ⏳"}
                          </span>

                          <button
                            className={`rounded-xl px-4 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                              done
                                ? "bg-gray-100 text-gray-800 hover:bg-gray-200"
                                : "bg-black text-white hover:opacity-90"
                            }`}
                            onClick={() => onToggle(p)}
                            disabled={saving}
                            title={done ? "Undo sampling" : "Mark sampling done"}
                          >
                            {saving ? "..." : done ? "Undo" : "Done"}
                          </button>
                        </div>
                      </div>

                      {/* small meta row (optional) */}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className="rounded-full bg-gray-50 px-2 py-1 ring-1 ring-gray-200">
                          Type: {p?.productType || "-"}
                        </span>
                        {Array.isArray(p?.categories) && p.categories.length ? (
                          <span className="rounded-full bg-gray-50 px-2 py-1 ring-1 ring-gray-200">
                            Category: {String(p.categories[0] || "").toLowerCase()}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 text-xs text-gray-500">
          Showing: <span className="font-semibold text-gray-700">{list.length}</span>{" "}
          (Total products:{" "}
          <span className="font-semibold text-gray-700">{totals.total}</span>)
        </div>
      </div>
    </div>
  );
}
