"use client";

import { useMemo, useState, useCallback } from "react";
import { ExternalLink, Pencil, Check, X, Loader2, Copy } from "lucide-react";
import { useRouter } from "next/navigation";

import DuplicateOrderCreatin from "@/components/orders/DuplicateOrderCreatin";
import OrderRowTracking from "@/components/orders/OrderRowTracking";

const safe = (v) => (v == null ? "" : String(v));
const money = (n) =>
  Number.isFinite(Number(n)) ? Number(n).toLocaleString("en-IN") : "0";

const formatAddress = (a) =>
  a
    ? [a.line1, a.line2, a.city, a.state, a.pincode, a.country].filter(Boolean).join(", ")
    : "";

const getCouponLabel = (order) => {
  const c = order?.coupon;
  if (!c) return "";
  if (typeof c === "string") return c;
  return c.code || c.couponCode || c.name || c.title || c._id || "";
};

const buildProductUrl = (BASE_URL, item) => {
  const productId = item?.productId?._id || item?.productId;
  return productId ? `${BASE_URL}/category/products/name/${productId}` : "";
};

export default function ExpandedOrderRow({ order, onUpdated, API, BASE_URL }) {
  const router = useRouter();
  const [dupOpen, setDupOpen] = useState(false);

  const [editingRemark, setEditingRemark] = useState(false);
  const [remarkDraft, setRemarkDraft] = useState("");
  const [savingRemark, setSavingRemark] = useState(false);

  const items = useMemo(() => (Array.isArray(order?.items) ? order.items : []), [order?.items]);
  const orderId = order?._id || order?.id;

  const bill = order?.billingAddressSnapshot || order?.shippingAddressSnapshot || null;
  const couponLabel = useMemo(() => getCouponLabel(order), [order]);
  const remarkValue = safe(order?.customerSupportRemark).trim();

  const goToOrder = useCallback(() => {
    if (!orderId) return;
    router.push(`/orders/${orderId}`);
  }, [router, orderId]);

  const startRemarkEdit = useCallback(() => {
    setRemarkDraft(remarkValue);
    setEditingRemark(true);
  }, [remarkValue]);

  const cancelRemarkEdit = useCallback(() => {
    setRemarkDraft(remarkValue);
    setEditingRemark(false);
  }, [remarkValue]);

  const saveRemark = useCallback(async () => {
    if (!orderId) return;
    try {
      setSavingRemark(true);
      const res = await fetch(`${API}/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerSupportRemark: remarkDraft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to update remark");

      const updated = data?.order || data;
      setEditingRemark(false);
      onUpdated?.(updated);
    } catch (e) {
      alert(e?.message || "Remark update failed");
    } finally {
      setSavingRemark(false);
    }
  }, [API, orderId, remarkDraft, onUpdated]);

  return (
    <div className="mt-3 bg-white rounded-2xl px-4 py-4 space-y-4">
      {/* TOP: address + coupon + actions */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-gray-700">Billing Address</div>
            <div className="text-sm text-gray-900 mt-1">{bill?.fullName || "-"}</div>
            <div className="text-xs text-gray-600 mt-0.5">
              {bill?.phone || ""}
              {bill?.email ? ` • ${bill.email}` : ""}
            </div>
            <div className="text-xs text-gray-600 mt-1">{formatAddress(bill) || "—"}</div>
          </div>

          <div className="shrink-0 flex flex-col gap-2">
            <div>
              <div className="text-xs font-semibold text-gray-700">Coupon</div>
              <div className="mt-1 text-sm text-gray-900 font-semibold">{couponLabel || "—"}</div>
              {order?.discount ? (
                <div className="text-xs text-gray-600 mt-0.5">Discount: ₹{money(order.discount)}</div>
              ) : (
                <div className="text-xs text-gray-500 mt-0.5">No discount</div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 justify-start lg:justify-end pt-1">
              <button
                onClick={() => setDupOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black text-white text-xs font-semibold hover:opacity-90 transition"
                type="button"
              >
                <Copy size={14} /> Exchange Order
              </button>

              <button
                onClick={goToOrder}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-gray-900 text-xs font-semibold hover:bg-gray-50 transition"
                type="button"
              >
                Open <ExternalLink size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TRACKING */}
      <OrderRowTracking
        orderId={orderId}
        orderNumber={order?.orderNumber}
        shipment={order?.shipment}
        trackingDetails={order?.trackingDetails}
        onUpdated={(u) => onUpdated?.(u?.order ?? u)}
        onRefresh={async () => {}}
      />

      {/* ITEMS */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900 text-sm">Items ({items.length})</h3>

        {items.length === 0 ? (
          <p className="text-xs text-gray-500">No items</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((it, idx) => {
              const snap = it?.productSnapshot || {};
              const v = it?.variant || {};
              const size = it?.selectedSize || "";
              const color = it?.selectedColor || "";

              const variantText =
                size || color
                  ? [size ? `Size: ${size}` : "", color ? `Color: ${color}` : ""]
                      .filter(Boolean)
                      .join(" • ")
                  : Array.isArray(v?.attributes)
                  ? v.attributes
                      .map((a) => `${a?.key}:${a?.value}`)
                      .filter(Boolean)
                      .join(", ")
                  : "";

              const productUrl = buildProductUrl(BASE_URL, it);

              return (
                <div key={`${orderId}-item-${idx}`} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={snap.thumbnail || "/placeholder.png"}
                      className="w-10 h-10 rounded-xl object-cover border border-gray-100"
                      alt={snap.title || "Product"}
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{snap.title || "-"}</p>
                        {productUrl ? (
                          <a
                            href={productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                          >
                            Go to <ExternalLink size={14} />
                          </a>
                        ) : null}
                      </div>

                      <p className="text-xs text-gray-500 truncate">
                        {variantText || (v?.sku || snap?.sku ? `SKU: ${v?.sku || snap?.sku}` : "")}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-900">
                      ₹{money(it?.price)} × {money(it?.quantity)}
                    </p>
                    <p className="text-xs text-gray-500">₹{money(it?.subtotal)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TOTALS */}
      <div className="border-t border-gray-100 pt-3 flex flex-wrap gap-2 text-xs text-gray-700">
        <span className="px-3 py-1 rounded-full bg-gray-100">
          Subtotal: <b>₹{money(order?.subtotal)}</b>
        </span>
        <span className="px-3 py-1 rounded-full bg-gray-100">
          Discount: <b>₹{money(order?.discount)}</b>
        </span>
        <span className="px-3 py-1 rounded-full bg-gray-100">
          Shipping: <b>₹{money(order?.shippingFee)}</b>
        </span>
        <span className="px-3 py-1 rounded-full bg-gray-100">
          Tax: <b>₹{money(order?.tax)}</b>
        </span>
        <span className="ml-auto px-4 py-1 rounded-full bg-black text-white font-semibold">
          Final: ₹{money(order?.finalPayable)}
        </span>
      </div>

      {/* REMARK */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-gray-700">Remark</div>
            {!editingRemark ? (
              <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{remarkValue || "—"}</div>
            ) : null}
          </div>

          {!editingRemark ? (
            <button
              onClick={startRemarkEdit}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black text-white text-xs font-semibold hover:opacity-90 transition"
              type="button"
            >
              <Pencil size={14} /> Edit
            </button>
          ) : null}
        </div>

        {editingRemark ? (
          <div className="mt-3 space-y-3">
            <textarea
              value={remarkDraft}
              onChange={(e) => setRemarkDraft(e.target.value)}
              rows={3}
              placeholder="Type remark..."
              className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-black/20 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelRemarkEdit}
                disabled={savingRemark}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 text-gray-800 text-xs font-semibold hover:bg-gray-200 disabled:opacity-40 transition"
                type="button"
              >
                <X size={14} /> Cancel
              </button>
              <button
                onClick={saveRemark}
                disabled={savingRemark}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-black text-white text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition"
                type="button"
              >
                {savingRemark ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* MODAL (mount only when opened) */}
      {dupOpen ? (
        <DuplicateOrderCreatin
          open={dupOpen}
          onClose={() => setDupOpen(false)}
          order={order}
          onCreated={() => {
            setDupOpen(false);
            onUpdated?.(order);
          }}
        />
      ) : null}
    </div>
  );
}