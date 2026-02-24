// components/orders/OrderRow.jsx
"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Pencil,
  Check,
  X,
  Loader2,
  Copy,
} from "lucide-react";
import { useRouter } from "next/navigation";

import OrderStatusDropdown from "@/components/orders/OrderStatusDropdown";
import OrderPriorityDropdown from "@/components/orders/OrderPriorityDropdown";
import DuplicateOrderCreatin from "@/components/orders/DuplicateOrderCreatin";
import OrderRowTracking from "@/components/orders/OrderRowTracking";

// ✅ NEW: 3-dots options (download/print invoice etc.)
import OrderRowActions from "@/components/orders/OrderRowActions";

const BASE_URL = "https://mirayfashions.com";
const API = process.env.NEXT_PUBLIC_BACKEND_URL || "";

const safe = (v) => (v == null ? "" : String(v));
const money = (n) =>
  Number.isFinite(Number(n)) ? Number(n).toLocaleString("en-IN") : "0";

const getPaymentBadge = (order) => {
  const pm = String(order?.paymentMethod || "").toLowerCase();
  const ps = String(order?.paymentStatus || "").toLowerCase();

  if (pm === "exchange")
    return {
      label: "Exchange",
      cls: "bg-blue-50 text-blue-700 border border-blue-100",
    };
  if (pm === "cod")
    return {
      label: "COD",
      cls: "bg-gray-100 text-gray-700 border border-gray-200",
    };

  if (pm === "razorpay") {
    if (ps === "paid")
      return {
        label: "Paid ✅",
        cls: "bg-green-50 text-green-700 border border-green-100",
      };
    if (ps === "pending")
      return {
        label: "Pending ⏳",
        cls: "bg-yellow-50 text-yellow-700 border border-yellow-100",
      };
    if (ps === "refund_pending")
      return {
        label: "Refund Pending ⏳",
        cls: "bg-orange-50 text-orange-700 border border-orange-100",
      };
    if (ps === "refunded")
      return {
        label: "Refunded ✅",
        cls: "bg-emerald-50 text-emerald-700 border border-emerald-100",
      };
    return {
      label: "Failed ❌",
      cls: "bg-red-50 text-red-700 border border-red-100",
    };
  }

  if (ps === "not_applicable")
    return {
      label: "N/A",
      cls: "bg-gray-50 text-gray-600 border border-gray-200",
    };

  return {
    label: "Unknown",
    cls: "bg-gray-100 text-gray-700 border border-gray-200",
  };
};

const FULFILLMENT_STATUSES = [
  "processing",
  "packed",
  "picked",
  "shipped",
  "out_for_delivery",
  "delivered",
  "return_requested",
  "exchange_requested",
  "returned",
  "cancelled",
  "rto",
  "refunded",
];

const STATUS_LABELS = {
  processing: "Processing",
  packed: "Packed",
  picked: "Picked",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  return_requested: "Return Requested",
  exchange_requested: "Exchange Requested",
  returned: "Returned",
  cancelled: "Cancelled",
  rto: "RTO",
  refunded: "Refunded",
};

const formatOrderDateTime = (value) => {
  if (!value) return { time: "", date: "" };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { time: "", date: "" };
  return {
    time: d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
    date: d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }),
  };
};

const formatAddress = (a) =>
  a
    ? [a.line1, a.line2, a.city, a.state, a.pincode, a.country]
        .filter(Boolean)
        .join(", ")
    : "";

const getCouponLabel = (order) => {
  const c = order?.coupon;
  if (!c) return "";
  if (typeof c === "string") return c;
  return c.code || c.couponCode || c.name || c.title || c._id || "";
};

const buildProductUrl = (item) => {
  const productId = item?.productId?._id || item?.productId;
  return productId ? `${BASE_URL}/category/products/name/${productId}` : "";
};

export default function OrderRow({ order, onUpdated }) {
  const router = useRouter();

  const [open, setOpen] = useState(false); // row expand
  const [dupOpen, setDupOpen] = useState(false); // modal

  // remark edit
  const [editingRemark, setEditingRemark] = useState(false);
  const [remarkDraft, setRemarkDraft] = useState("");
  const [savingRemark, setSavingRemark] = useState(false);

  const items = Array.isArray(order?.items) ? order.items : [];
  const orderId = order?._id || order?.id;

  const pay = useMemo(() => getPaymentBadge(order), [order]);
  const effectiveStatus = String(
    order?.fulfillmentStatus || "processing"
  ).toLowerCase();
  const dt = useMemo(
    () => formatOrderDateTime(order?.createdAt || order?.orderDate),
    [order?.createdAt, order?.orderDate]
  );

  const bill =
    order?.billingAddressSnapshot || order?.shippingAddressSnapshot || null;
  const couponLabel = useMemo(() => getCouponLabel(order), [order]);
  const remarkValue = safe(order?.customerSupportRemark).trim();

  const toggleOpen = () => setOpen((v) => !v);

  const goToOrder = () => {
    if (!orderId) return;
    router.push(`/orders/${orderId}`);
  };

  const startRemarkEdit = () => {
    setRemarkDraft(remarkValue);
    setEditingRemark(true);
    setOpen(true);
  };

  const cancelRemarkEdit = () => {
    setRemarkDraft(remarkValue);
    setEditingRemark(false);
  };

  const saveRemark = async () => {
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
  };

  return (
    <>
      {/* ================= ROW ================= */}
      <tr className="hover:bg-black/[0.03] transition">
        <td className="py-4 px-5 font-semibold text-gray-900">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleOpen}
              className="p-1.5 rounded-lg hover:bg-black/[0.05] transition"
              title="Expand"
              type="button"
            >
              {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {/* ✅ Clickable order number -> navigate to /orders/[id] */}
            <button
              type="button"
              onClick={goToOrder}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  goToOrder();
                }
              }}
              className="text-left inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-black/[0.05] focus:outline-none focus:ring-2 focus:ring-black/10"
              title="Open order"
            >
              <span className="underline underline-offset-2 decoration-black/30 hover:decoration-black">
                {order?.orderNumber || "-"}
              </span>
              <ExternalLink size={14} className="opacity-70" />
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-1">
            {items?.[0]?.productSnapshot?.title
              ? `${items[0].productSnapshot.title}${
                  items.length > 1 ? ` +${items.length - 1} more` : ""
                }`
              : "No items"}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {order?.isConfirmed ? (
              <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 text-green-700 border border-green-100">
                Confirmed ✅
              </span>
            ) : (
              <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                Not Confirmed
              </span>
            )}

            <OrderPriorityDropdown
              orderId={orderId}
              currentPriority={order?.priority}
              onUpdated={(u) => onUpdated?.(u?.order ?? u)}
            />
          </div>
        </td>

        <td className="py-4 px-5">
          <div className="font-medium text-gray-900">
            {order?.customerId?.name ||
              order?.shippingAddressSnapshot?.fullName ||
              "Unknown"}
          </div>
          <div className="text-xs text-gray-500">
            {order?.customerId?.phone ||
              order?.shippingAddressSnapshot?.phone ||
              ""}
          </div>
          <div className="text-xs text-gray-500">
            {order?.customerId?.email ||
              order?.shippingAddressSnapshot?.email ||
              ""}
          </div>
        </td>

        <td className="py-4 px-5">
          <span
            className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${pay.cls}`}
          >
            {pay.label}
          </span>
        </td>

        <td className="py-4 px-5">
          <OrderStatusDropdown
            orderId={orderId}
            currentStatus={effectiveStatus}
            statuses={FULFILLMENT_STATUSES}
            labels={STATUS_LABELS}
            onUpdated={(u) => onUpdated?.(u?.order ?? u)}
          />
        </td>

        <td className="py-4 px-5 font-semibold text-gray-900">
          ₹{money(order?.finalPayable)}
        </td>

        <td className="py-4 px-5 text-gray-700">
          <div className="leading-tight">
            <div className="text-sm font-medium text-gray-900">{dt.time}</div>
            <div className="text-[11px] text-gray-500">{dt.date}</div>
          </div>
        </td>

        {/* ✅ ACTIONS COLUMN */}
        <td className="py-4 px-5">
          <div className="flex items-center justify-end gap-2">
            <OrderRowActions
              order={order}
              courierName={
                order?.shipment?.courierName || order?.courierName || ""
              }
              trackingId={order?.shipment?.awb || order?.trackingId || ""}
            />
          </div>
        </td>
      </tr>

      {/* ================= EXPANDED ================= */}
      {open ? (
        <tr className="bg-black/[0.015]">
          <td colSpan={7} className="px-5 pb-4">
            <div className="mt-3 bg-white rounded-2xl px-4 py-4 space-y-4">
              {/* TOP: address + coupon + actions */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-gray-700">
                      Billing Address
                    </div>
                    <div className="text-sm text-gray-900 mt-1">
                      {bill?.fullName || "-"}
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {bill?.phone || ""}
                      {bill?.email ? ` • ${bill.email}` : ""}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {formatAddress(bill) || "—"}
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col gap-2">
                    <div>
                      <div className="text-xs font-semibold text-gray-700">
                        Coupon
                      </div>
                      <div className="mt-1 text-sm text-gray-900 font-semibold">
                        {couponLabel || "—"}
                      </div>
                      {order?.discount ? (
                        <div className="text-xs text-gray-600 mt-0.5">
                          Discount: ₹{money(order.discount)}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 mt-0.5">
                          No discount
                        </div>
                      )}
                    </div>

                    {/* ✅ ACTIONS INSIDE EXPAND */}
                    <div className="flex flex-wrap gap-2 justify-start lg:justify-end pt-1">
                      <button
                        onClick={() => setDupOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black text-white text-xs font-semibold hover:opacity-90 transition"
                        type="button"
                        title="Create Exchange / Replacement duplicate"
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

              {/* ✅ TRACKING */}
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
                <h3 className="font-semibold text-gray-900 text-sm">
                  Items ({items.length})
                </h3>

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
                          ? [
                              size ? `Size: ${size}` : "",
                              color ? `Color: ${color}` : "",
                            ]
                              .filter(Boolean)
                              .join(" • ")
                          : Array.isArray(v?.attributes)
                          ? v.attributes
                              .map((a) => `${a?.key}:${a?.value}`)
                              .filter(Boolean)
                              .join(", ")
                          : "";

                      const productUrl = buildProductUrl(it);
                      const key = `${orderId}-item-${idx}`;

                      return (
                        <div
                          key={key}
                          className="py-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={snap.thumbnail || "/placeholder.png"}
                              className="w-10 h-10 rounded-xl object-cover border border-gray-100"
                              alt={snap.title || "Product"}
                              loading="lazy"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {snap.title || "-"}
                                </p>
                                {productUrl ? (
                                  <a
                                    href={productUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                                    title="Open product on mirayfashions.com"
                                  >
                                    Go to <ExternalLink size={14} />
                                  </a>
                                ) : null}
                              </div>

                              <p className="text-xs text-gray-500 truncate">
                                {variantText ||
                                  (v?.sku || snap?.sku
                                    ? `SKU: ${v?.sku || snap?.sku}`
                                    : "")}
                              </p>

                              {v?.variantId ? (
                                <p className="text-[11px] text-gray-400 truncate mt-0.5">
                                  VariantId:{" "}
                                  {String(v.variantId).slice(0, 10)}...
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-gray-900">
                              ₹{money(it?.price)} × {money(it?.quantity)}
                            </p>
                            <p className="text-xs text-gray-500">
                              ₹{money(it?.subtotal)}
                            </p>
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
                    <div className="text-xs font-semibold text-gray-700">
                      Remark
                    </div>
                    {!editingRemark ? (
                      <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                        {remarkValue || "—"}
                      </div>
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
                        {savingRemark ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}{" "}
                        Save
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </td>
        </tr>
      ) : null}

      {/* MODAL */}
      <DuplicateOrderCreatin
        open={dupOpen}
        onClose={() => setDupOpen(false)}
        order={order}
        onCreated={(newOrder) => {
          setDupOpen(false);
          onUpdated?.(order);
          // if (newOrder?._id) router.push(`/orders/${newOrder._id}`);
        }}
      />
    </>
  );
}