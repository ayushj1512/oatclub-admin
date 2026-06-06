// app/orders/remark/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useOrderStore } from "@/store/orderStore";
import { Check, ChevronDown, ChevronUp, RefreshCw, Search } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "";

const s = (v) => (v == null ? "" : String(v));
const n0 = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const money = (v) => Math.round(n0(v)).toString();
const normPhone = (v) => s(v).replace(/[^\d]/g, "");
const dt = (v) => (v ? new Date(v).toLocaleString() : "—");

const firstImg = (it) =>
  s(it?.productSnapshot?.thumbnail) ||
  s(it?.productSnapshot?.images?.[0]) ||
  s(it?.productId?.thumbnail) ||
  s(it?.productId?.images?.[0]) ||
  "";

const itemTitle = (it) => s(it?.productSnapshot?.title) || s(it?.productId?.title) || "Item";

// ✅ status accent colors (tailwind)
const statusPill = (stRaw) => {
  const st = s(stRaw).trim().toLowerCase();

  if (["delivered"].includes(st))
    return "bg-green-50 text-green-700 border-green-200";
  if (["shipped", "out_for_delivery"].includes(st))
    return "bg-blue-50 text-blue-700 border-blue-200";
  if (["packed", "picked"].includes(st))
    return "bg-amber-50 text-amber-700 border-amber-200";
  if (["processing"].includes(st))
    return "bg-slate-50 text-slate-700 border-slate-200";
  if (["cancelled", "rto", "returned"].includes(st))
    return "bg-red-50 text-red-700 border-red-200";
  if (["return_requested", "exchange_requested"].includes(st))
    return "bg-purple-50 text-purple-700 border-purple-200";

  return "bg-gray-50 text-gray-700 border-gray-200";
};

export default function OrderRemarkPage() {
  const { orders, loading, error, fetchAllOrders } = useOrderStore();

  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState(() => new Set());
  const [draft, setDraft] = useState(() => ({}));
  const [saving, setSaving] = useState(() => ({}));

  useEffect(() => {
    fetchAllOrders().catch(() => {});
  }, [fetchAllOrders]);

  const filtered = useMemo(() => {
    const query = s(q).trim().toLowerCase();
    const list = Array.isArray(orders) ? orders : [];
    if (!query) return list;

    const qDigits = normPhone(query);

    return list.filter((o) => {
      const orderNo = s(o?.orderNumber).toLowerCase();
      const phone = normPhone(o?.shippingAddressSnapshot?.phone);
      const id = s(o?._id).toLowerCase();
      return orderNo.includes(query) || (qDigits && phone.includes(qDigits)) || id.includes(query);
    });
  }, [orders, q]);

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const initialRemark = (o) => s(o?.customerSupportRemark).trim();

  const ensureDraft = (o) => {
    const id = s(o?._id);
    if (!id) return;
    setDraft((d) => (d[id] != null ? d : { ...d, [id]: initialRemark(o) }));
  };

  const saveRemark = async (o) => {
    const id = s(o?._id);
    if (!id) return;

    const remark = s(draft[id]).trim();
    setSaving((st) => ({ ...st, [id]: true }));

    try {
      const res = await fetch(`${API}/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerSupportRemark: remark }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to save remark");

      await fetchAllOrders().catch(() => {});
    } catch (e) {
      alert(e?.message || "Save failed");
    } finally {
      setSaving((st) => ({ ...st, [id]: false }));
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-xl font-bold text-gray-900">Order Remarks</div>
          <div className="text-sm text-gray-500">
            Search by <b>Order Number</b> or <b>Mobile Number</b> and edit remark.
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-[340px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search: 000123 or 98765..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>

          <button
            onClick={() => fetchAllOrders().catch(() => {})}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm hover:bg-gray-50"
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {s(error)}
        </div>
      ) : null}

      {/* table */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                <th className="px-4 py-3 w-[170px]">Order</th>
                <th className="px-4 py-3 w-[240px]">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3 w-[120px]">Total</th>
                <th className="px-4 py-3 w-[160px]">Status</th>
                <th className="px-4 py-3 w-[180px]">Updated</th>
                <th className="px-4 py-3 w-[90px] text-right">Expand</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {(filtered || []).map((o) => {
                const id = s(o?._id);
                const open = expanded.has(id);
                const customerName =
                  s(o?.customerId?.name) || s(o?.shippingAddressSnapshot?.fullName) || "-";
                const phone = s(o?.shippingAddressSnapshot?.phone);
                const items = Array.isArray(o?.items) ? o.items : [];

                return (
                  <>
                    <tr key={id} className="hover:bg-gray-50/50 align-top">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{s(o?.orderNumber) || "-"}</div>
                        <div className="text-xs text-gray-500 break-all">{id}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{customerName}</div>
                        <div className="text-xs text-gray-500">{phone || "—"}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          {items.slice(0, 3).map((it, idx) => {
                            const img = firstImg(it);
                            return (
                              <div key={idx} className="flex items-center gap-2">
                                <div className="w-10 h-12 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex-shrink-0">
                                  {img ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={img}
                                      alt={itemTitle(it)}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : null}
                                </div>

                                <div className="min-w-0">
                                  <div className="text-gray-900 font-medium truncate">
                                    {itemTitle(it)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Qty: {n0(it?.quantity)}
                                    {(it?.selectedSize || it?.selectedColor) ? (
                                      <>
                                        {" • "}
                                        {s(it?.selectedSize)}
                                        {it?.selectedColor ? ` / ${s(it?.selectedColor)}` : ""}
                                      </>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {items.length > 3 ? (
                            <div className="text-xs text-gray-500">+{items.length - 3} more</div>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-3 font-semibold text-gray-900">
                        ₹{money(o?.finalPayable)}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${statusPill(
                            o?.fulfillmentStatus
                          )}`}
                        >
                          {s(o?.fulfillmentStatus) || "-"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-gray-600">{dt(o?.updatedAt)}</td>

                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            toggle(id);
                            if (!open) ensureDraft(o);
                          }}
                          className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm hover:bg-gray-50"
                          title={open ? "Collapse" : "Expand"}
                        >
                          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                    </tr>

                    {open ? (
                      <tr key={`${id}-remark`} className="bg-gray-50/40">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                            <div className="lg:col-span-10">
                              <div className="text-xs font-semibold text-gray-700 mb-2">
                                Customer Support Remark
                              </div>
                              <textarea
                                className="w-full min-h-[100px] rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-gray-200"
                                value={s(draft[id])}
                                onChange={(e) =>
                                  setDraft((d) => ({ ...d, [id]: e.target.value }))
                                }
                                placeholder="Type remark..."
                              />
                              <div className="text-xs text-gray-500 mt-1">
                                Saved in <b>order.customerSupportRemark</b>
                              </div>
                            </div>

                            <div className="lg:col-span-2 flex lg:flex-col gap-2 lg:items-stretch items-center justify-end">
                              <button
                                onClick={() => saveRemark(o)}
                                disabled={saving[id]}
                                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-black text-white text-sm hover:opacity-90 disabled:opacity-50"
                              >
                                <Check size={16} />
                                {saving[id] ? "Saving..." : "Save"}
                              </button>

                              <button
                                onClick={() =>
                                  setDraft((d) => ({ ...d, [id]: initialRemark(o) }))
                                }
                                className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm hover:bg-gray-50"
                              >
                                Reset
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </>
                );
              })}

              {!loading && (!filtered || filtered.length === 0) ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    No orders found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {loading ? (
          <div className="px-4 py-3 text-sm text-gray-500 border-t border-gray-100">
            Loading...
          </div>
        ) : null}
      </div>
    </div>
  );
}
