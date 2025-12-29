"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useAdminAbandonedCartStore } from "@/store/adminAbandonedCartStore";

/* ---------------- helpers ---------------- */
const safe = (v) => String(v ?? "").trim();
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "—");
const money = (v) => `₹${Number(v || 0).toFixed(0)}`;

/* ---------------- status pill ---------------- */
function CartStatusPill({ status }) {
  const s = safe(status).toLowerCase();
  const base =
    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset";

  if (s === "recovered")
    return (
      <span className={`${base} bg-emerald-50 text-emerald-700 ring-emerald-200`}>
        <CheckCircle2 size={14} /> Recovered
      </span>
    );

  if (s === "abandoned")
    return (
      <span className={`${base} bg-amber-50 text-amber-800 ring-amber-200`}>
        <ShoppingCart size={14} /> Abandoned
      </span>
    );

  return (
    <span className={`${base} bg-gray-100 text-gray-700 ring-gray-200`}>
      <XCircle size={14} /> Active
    </span>
  );
}

/* =========================================================
   ABANDONED CARTS SECTION (REUSABLE)
========================================================= */

export default function AbandonedCartsSection({
  customerId,
  customerEmail,
  customerUID,
  title = "Abandoned Carts",
}) {
  const {
    carts,
    total,
    loading,
    error,
    fetchCarts,
    setFilters,
    markRetargeted,
  } = useAdminAbandonedCartStore();

  /* ---------------- load carts for this customer ---------------- */
  useEffect(() => {
    if (!customerId && !customerEmail && !customerUID) return;

    // strongest match first
    setFilters({
      status: "",
      q: customerId || customerEmail || customerUID,
    });

    fetchCarts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  /* ---------------- UI ---------------- */
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" /> {title}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Matched by:{" "}
            <span className="font-semibold">
              {customerId || customerEmail || customerUID || "—"}
            </span>
          </p>
        </div>

        <button
          onClick={fetchCarts}
          className="inline-flex items-center gap-2 rounded-xl bg-black px-3 py-2 text-xs font-semibold text-white hover:opacity-90 transition"
        >
          Refresh
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5" /> {error}
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <p className="text-gray-500 animate-pulse">
          Loading abandoned carts…
        </p>
      )}

      {/* EMPTY */}
      {!loading && carts.length === 0 && (
        <p className="text-gray-600">
          No abandoned carts found for this customer.
        </p>
      )}

      {/* LIST */}
      {!loading && carts.length > 0 && (
        <>
          <div className="flex justify-between text-xs text-gray-600">
            <span>
              Showing <span className="font-semibold">{carts.length}</span> carts
            </span>
            <span>
              Total: <span className="font-semibold">{total}</span>
            </span>
          </div>

          <div className="space-y-3">
            {carts.map((c) => (
              <div
                key={c._id}
                className="border rounded-md p-4 hover:bg-gray-50 transition"
              >
                <div className="flex flex-col md:flex-row md:justify-between gap-3">
                  {/* LEFT */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-semibold text-blue-700 break-all">
                        {safe(c.cartId || c._id)}
                      </p>
                      <CartStatusPill status={c.status} />
                    </div>

                    <div className="mt-2 text-xs text-gray-600 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <span>Updated: {fmtDate(c.updatedAt)}</span>
                      <span>Abandoned: {fmtDate(c.abandonedAt)}</span>
                      <span>Recovered: {fmtDate(c.recoveredAt)}</span>
                    </div>

                    <div className="mt-3 text-sm text-gray-700">
                      <span className="font-medium">Items:</span>{" "}
                      <span className="font-semibold">{c.items.length}</span>
                      {" · "}
                      <span className="font-medium">Subtotal:</span>{" "}
                      <span className="font-semibold">
                        {money(c.subtotal)}
                      </span>
                      {" · "}
                      <span className="font-medium">Total:</span>{" "}
                      <span className="font-semibold">
                        {money(c.total)}
                      </span>
                    </div>
                  </div>

                  {/* RIGHT ACTIONS */}
                  <div className="flex md:flex-col gap-2 md:items-end">
                    <button
                      disabled={c.retargetCount > 0}
                      onClick={() => markRetargeted(c._id)}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ring-1 ring-inset transition
                        ${
                          c.retargetCount > 0
                            ? "bg-gray-100 text-gray-400 ring-gray-200 cursor-not-allowed"
                            : "bg-white text-sky-700 ring-sky-200 hover:bg-sky-50"
                        }`}
                    >
                      {c.retargetCount > 0
                        ? "Already Retargeted"
                        : "Mark Retargeted"}
                    </button>

                    <Link
                      href={`/abandoned-carts/${c._id}`}
                      className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ring-1 ring-inset bg-white text-blue-700 ring-blue-200 hover:bg-blue-50 transition"
                    >
                      View <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
