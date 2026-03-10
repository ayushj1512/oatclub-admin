"use client";

import React, { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Loader2,
  Search,
  X,
  Copy,
  ExternalLink,
  RefreshCcw,
  CheckCircle2,
  AlertTriangle,
  Package,
  Truck,
  MapPin,
  CreditCard,
  User,
  Phone,
  Mail,
  ShieldCheck,
  Ban,
  ChevronDown,
  Hash,
  Info,
  FileText,
} from "lucide-react";

import { useOrderStore } from "@/store/orderStore";
import { useShiprocketStore } from "@/store/ShipRocketStore";
import UniversalOrderPrintPanel from "@/components/invoice/UniversalOrderPrintPanel";
import OrderSearchTrackingCard from "@/components/orders/OrderSearchTrackingCard";

/* ================= Helpers ================= */
const IST = "Asia/Kolkata";
const safe = (v) => (v == null ? "" : String(v));
const pad6 = (n) => String(n).padStart(6, "0");

const normalizeOrderNumber = (input) => {
  const raw = String(input ?? "").trim().toUpperCase();
  if (!raw) return "";
  const s = raw.replace(/\s+/g, "");

  if (s.startsWith("MIRAY")) {
    const digits = s.replace(/^MIRAY-?/, "").replace(/\D/g, "");
    if (!digits) return "";
    return `MIRAY-${pad6(parseInt(digits, 10) || 0)}`;
  }

  const digits = s.replace(/\D/g, "");
  if (!digits) return "";
  return `MIRAY-${pad6(parseInt(digits, 10) || 0)}`;
};

const money = (n) => {
  const x = Number(n || 0);
  try {
    return x.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  } catch {
    return String(x);
  }
};

const dtIST = (value) => {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: IST,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

const copyText = (text, label = "Copied") => {
  const t = String(text || "");
  if (!t) return;
  try {
    navigator.clipboard.writeText(t);
    toast.success(label);
  } catch {
    toast.error("Copy failed");
  }
};

const cn = (...a) => a.filter(Boolean).join(" ");

const extractTracking = (payload) => {
  const d = payload?.data ?? payload ?? {};
  const awb =
    d?.trackingId ??
    d?.awb ??
    d?.awb_code ??
    d?.shipment?.shiprocket?.awb ??
    d?.shiprocket?.awb ??
    "";
  const courier =
    d?.courierName ??
    d?.courier ??
    d?.courier_name ??
    d?.shipment?.shiprocket?.courierName ??
    d?.shiprocket?.courierName ??
    "";
  const url =
    d?.trackingUrl ??
    d?.tracking_url ??
    d?.trackingLink ??
    d?.shipment?.shiprocket?.trackingUrl ??
    d?.shiprocket?.trackingUrl ??
    "";
  return {
    awb: String(awb || "").trim(),
    courier: String(courier || "").trim(),
    url: String(url || "").trim(),
  };
};

/* ================= Status options ================= */
const FULFILLMENT_OPTIONS = [
  "processing",
  "packed",
  "picked",
  "shipped",
  "out_for_delivery",
  "delivered",
  "pickup_initiated",
  "return_requested",
  "exchange_requested",
  "returned",
  "refunded",
  "exchanged",
  "cancelled",
  "rto",
];

const tone = (key) => {
  const k = safe(key).toLowerCase();
  if (["delivered", "refunded"].includes(k)) return "success";
  if (["cancelled", "rto"].includes(k)) return "danger";
  if (["exchange_requested", "exchanged"].includes(k)) return "violet";
  if (["shipped", "picked", "out_for_delivery"].includes(k)) return "info";
  if (k === "packed") return "indigo";
  if (k === "processing") return "amber";
  return "neutral";
};

/* ================= UI ================= */
function Pill({ children, variant = "neutral" }) {
  const map = {
    neutral: "bg-zinc-100 text-zinc-700",
    amber: "bg-amber-50 text-amber-800 ring-1 ring-amber-200/60",
    indigo: "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200/60",
    info: "bg-sky-50 text-sky-800 ring-1 ring-sky-200/60",
    violet: "bg-violet-50 text-violet-800 ring-1 ring-violet-200/60",
    success: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/60",
    danger: "bg-rose-50 text-rose-800 ring-1 ring-rose-200/60",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 text-[11px] uppercase tracking-wide",
        map[variant] || map.neutral
      )}
    >
      {children}
    </span>
  );
}

function Card({ title, icon: Icon, accent = "neutral", right, children }) {
  const bar =
    {
      neutral: "bg-zinc-200",
      amber: "bg-amber-300",
      indigo: "bg-indigo-300",
      info: "bg-sky-300",
      violet: "bg-violet-300",
      success: "bg-emerald-300",
      danger: "bg-rose-300",
    }[accent] || "bg-zinc-200";

  return (
    <div className="bg-white shadow-sm ring-1 ring-zinc-200/60">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <div className="flex items-center gap-3">
          <span className={cn("h-4 w-1", bar)} />
          <div className="flex items-center gap-2">
            {Icon ? <Icon className="h-4 w-4 text-zinc-700" /> : null}
            <div className="text-sm font-semibold text-zinc-900">{title}</div>
          </div>
        </div>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Row({ label, value, mono = false }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-zinc-100 last:border-b-0">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={cn("text-sm text-zinc-900 text-right", mono && "font-mono")}>
        {value}
      </div>
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none bg-white px-3 py-2 text-sm ring-1 ring-zinc-200/70 focus:ring-zinc-400 outline-none"
      >
        {options.map((op) => (
          <option key={op} value={op}>
            {op}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
    </div>
  );
}

function Btn({ children, onClick, disabled, variant = "dark" }) {
  const base =
    "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm transition disabled:opacity-60";
  const variants = {
    dark: "bg-zinc-900 text-white hover:bg-black",
    light: "bg-white text-zinc-900 hover:bg-zinc-50 ring-1 ring-zinc-200/70",
    danger: "bg-rose-50 text-rose-800 hover:bg-rose-100 ring-1 ring-rose-200/70",
    indigo: "bg-indigo-600 text-white hover:bg-indigo-700",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(base, variants[variant] || variants.dark)}
    >
      {children}
    </button>
  );
}

function Img({ src, alt }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) {
    return (
      <div className="h-16 w-14 bg-zinc-100 ring-1 ring-zinc-200/60 flex items-center justify-center text-[10px] text-zinc-500">
        NO IMG
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setBad(true)}
      className="h-16 w-14 object-cover bg-zinc-100 ring-1 ring-zinc-200/60"
      loading="lazy"
    />
  );
}

/* ================= Page ================= */
export default function OrderSearchPage() {
  const {
    fetchOrderByNumber,
    confirmOrder,
    updateOrderStatus,
    cancelOrder,
    bookShiprocketIfMissing,
  } = useOrderStore();

  const { syncTracking, syncLoading, syncErrorCode } = useShiprocketStore();

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [order, setOrder] = useState(null);

  const normalized = useMemo(() => normalizeOrderNumber(q), [q]);

  const fs = safe(order?.fulfillmentStatus) || "processing";
  const ps = safe(order?.paymentStatus) || "pending";

  const [nextFulfillment, setNextFulfillment] = useState("processing");
  const syncNextFromOrder = useCallback((o) => {
    const cur = safe(o?.fulfillmentStatus) || "processing";
    setNextFulfillment(
      FULFILLMENT_OPTIONS.includes(cur) ? cur : "processing"
    );
  }, []);

  const search = useCallback(async () => {
    const ord = normalizeOrderNumber(q);
    if (!ord)
      return toast.error("Enter valid order number (MIRAY-000123 or 123)");
    setLoading(true);
    try {
      const o = await fetchOrderByNumber(ord);
      if (!o?._id) {
        setOrder(null);
        return toast.error("Order not found");
      }
      setOrder(o);
      syncNextFromOrder(o);
      toast.success("Order loaded");
    } catch (e) {
      console.error(e);
      setOrder(null);
      toast.error(e?.message || "Failed to fetch order");
    } finally {
      setLoading(false);
    }
  }, [q, fetchOrderByNumber, syncNextFromOrder]);

  const refresh = useCallback(async () => {
    if (!order?.orderNumber) return;
    setLoading(true);
    try {
      const o = await fetchOrderByNumber(order.orderNumber);
      setOrder(o || null);
      syncNextFromOrder(o);
      toast.success("Refreshed");
    } catch (e) {
      console.error(e);
      toast.error("Refresh failed");
    } finally {
      setLoading(false);
    }
  }, [order, fetchOrderByNumber, syncNextFromOrder]);

  const doConfirm = useCallback(async () => {
    if (!order?._id) return;
    setActionBusy(true);
    try {
      const o = await confirmOrder(order._id);
      setOrder(o || order);
      syncNextFromOrder(o || order);
      toast.success("Order confirmed");
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Confirm failed");
    } finally {
      setActionBusy(false);
    }
  }, [order, confirmOrder, syncNextFromOrder]);

  const applyStatus = useCallback(async () => {
    if (!order?._id) return;
    setActionBusy(true);
    try {
      const o = await updateOrderStatus(order._id, {
        fulfillmentStatus: nextFulfillment,
      });
      setOrder(o || order);
      syncNextFromOrder(o || order);
      toast.success("Status updated");
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Status update failed");
    } finally {
      setActionBusy(false);
    }
  }, [order, updateOrderStatus, nextFulfillment, syncNextFromOrder]);

  const markPacked = useCallback(async () => {
    if (!order?._id) return;
    setActionBusy(true);
    try {
      const o = await updateOrderStatus(order._id, {
        fulfillmentStatus: "packed",
      });
      setOrder(o || order);
      syncNextFromOrder(o || order);
      toast.success("Marked packed");
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Failed to mark packed");
    } finally {
      setActionBusy(false);
    }
  }, [order, updateOrderStatus, syncNextFromOrder]);

  const doCancel = useCallback(async () => {
    if (!order?._id) return;
    setActionBusy(true);
    try {
      const o = await cancelOrder(order._id, "cancelled_by_admin");
      setOrder(o || order);
      syncNextFromOrder(o || order);
      toast.success("Order cancelled");
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Cancel failed");
    } finally {
      setActionBusy(false);
    }
  }, [order, cancelOrder, syncNextFromOrder]);

  const doBookShiprocket = useCallback(async () => {
    if (!order?._id) return;
    setActionBusy(true);
    try {
      await bookShiprocketIfMissing(order._id);
      toast.success("Booking attempted");
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Shiprocket booking failed");
    } finally {
      setActionBusy(false);
    }
  }, [order, bookShiprocketIfMissing, refresh]);

  const syncTrackingNow = useCallback(async () => {
    if (!order?._id && !order?.orderNumber)
      return toast.error("Order not loaded");
    try {
      const data = order?._id
        ? await syncTracking({ orderId: order._id })
        : await syncTracking({ orderNumber: order.orderNumber });

      const t = extractTracking(data);
      if (t.awb || t.courier || t.url) toast.success("Tracking synced ✅");
      else toast(data?.message || "Tracking not available yet", { icon: "ℹ️" });

      await refresh();
    } catch (e) {
      toast.error(e?.message || "Tracking sync failed");
    }
  }, [order, syncTracking, refresh]);

  const items = Array.isArray(order?.items) ? order.items : [];

  const shipProvider = safe(order?.shipment?.provider) || "shiprocket";
  const shiprocket = order?.shipment?.shiprocket || {};
  const xpress = order?.shipment?.xpressbees || {};
  const tracking = order?.trackingDetails || {};

  const trackingId =
    safe(tracking?.trackingId) ||
    (shipProvider === "shiprocket" ? safe(shiprocket?.awb) : "") ||
    (shipProvider === "xpressbees" ? safe(xpress?.awb) : "");

  const trackingUrl =
    safe(tracking?.trackingUrl) ||
    (shipProvider === "shiprocket" ? safe(shiprocket?.trackingUrl) : "") ||
    (shipProvider === "xpressbees" ? safe(xpress?.trackingUrl) : "");

  const courierName =
    safe(tracking?.courierName) ||
    (shipProvider === "shiprocket" ? safe(shiprocket?.courierName) : "") ||
    (shipProvider === "xpressbees" ? safe(xpress?.courierName) : "");

  const totals = useMemo(() => {
    return {
      subtotal: Number(order?.subtotal || 0),
      discount: Number(order?.discount || 0),
      shippingFee: Number(order?.shippingFee || 0),
      tax: Number(order?.tax || 0),
      totalAmount: Number(order?.totalAmount || 0),
      finalPayable: Number(order?.finalPayable || 0),
    };
  }, [order]);

  const canConfirm = !!order?._id && !order?.isConfirmed;
  const canPack =
    !!order?._id &&
    !!order?.isConfirmed &&
    fs === "processing" &&
    safe(order?.orderType).toLowerCase() !== "parent";

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="px-4 py-6 space-y-4">
        {/* Search */}
        <div className="bg-white shadow-sm ring-1 ring-zinc-200/60">
          <div className="px-4 py-4 md:py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zinc-900">
                  Order Search
                </div>
                <div className="text-xs text-zinc-500">
                  Paste MIRAY-000123 or just 123
                </div>
              </div>

              <button
                onClick={refresh}
                disabled={!order?._id || loading}
                className="inline-flex items-center gap-2 text-sm text-zinc-900 hover:text-black disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Refresh
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && search()}
                  placeholder="MIRAY-000123"
                  className="w-full bg-white px-3 py-3 text-sm outline-none ring-1 ring-zinc-200/70 focus:ring-zinc-400"
                />
                {q ? (
                  <button
                    onClick={() => setQ("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-zinc-500 hover:text-zinc-900"
                    title="Clear"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <button
                onClick={search}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-3 text-sm bg-zinc-900 text-white hover:bg-black disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Search
              </button>
            </div>

            <div className="mt-2 text-xs text-zinc-500">
              Normalized:{" "}
              <span className="font-mono text-zinc-900">
                {normalized || "—"}
              </span>
            </div>
          </div>
        </div>

        {!order?._id ? (
          <div className="bg-white shadow-sm ring-1 ring-zinc-200/60 p-6">
            <div className="text-sm font-semibold text-zinc-900">
              No order loaded
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              Search an order number above.
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* left */}
              <div className="lg:col-span-8 space-y-4">
                <Card
                  title="Overview"
                  icon={Hash}
                  accent={tone(fs)}
                  right={
                    <div className="flex items-center gap-2">
                      <Pill variant={tone(fs)}>{fs}</Pill>
                      <Pill variant={tone(ps)}>{ps}</Pill>
                      {order?.isConfirmed ? (
                        <Pill variant="success">
                          <CheckCircle2 className="h-3 w-3" /> confirmed
                        </Pill>
                      ) : (
                        <Pill variant="amber">
                          <AlertTriangle className="h-3 w-3" /> not confirmed
                        </Pill>
                      )}
                    </div>
                  }
                >
                  <Row
                    label="Order Number"
                    value={
                      <div className="inline-flex items-center gap-2">
                        <span className="font-mono">
                          {safe(order.orderNumber)}
                        </span>
                        <button
                          onClick={() =>
                            copyText(order.orderNumber, "Order number copied")
                          }
                          className="inline-flex items-center gap-1 text-xs text-zinc-700 hover:text-black"
                        >
                          <Copy className="h-3 w-3" /> copy
                        </button>
                      </div>
                    }
                  />
                  <Row label="Order ID" value={safe(order._id)} mono />
                  <Row label="Placed At" value={dtIST(order.orderDate)} />
                  <Row label="Priority" value={safe(order.priority)} />
                  <Row label="Order Type" value={safe(order.orderType)} />
                  <Row label="Split Suffix" value={safe(order.splitSuffix)} />
                  <Row
                    label="Parent Order ID"
                    value={safe(order.parentOrderId)}
                    mono
                  />
                </Card>

                <Card title={`Items (${items.length})`} icon={Package} accent="info">
                  <div className="space-y-3">
                    {items.map((it, idx) => {
                      const snap = it?.productSnapshot || {};
                      const img =
                        safe(snap?.thumbnail) ||
                        (Array.isArray(snap?.images) && snap.images.length
                          ? safe(snap.images[0])
                          : "") ||
                        "";

                      const attrs = Array.isArray(it?.variant?.attributes)
                        ? it.variant.attributes
                        : [];
                      const size =
                        safe(it?.selectedSize) ||
                        safe(
                          attrs.find(
                            (a) => safe(a?.key).toLowerCase() === "size"
                          )?.value
                        );
                      const color =
                        safe(it?.selectedColor) ||
                        safe(
                          attrs.find((a) =>
                            ["color", "colour"].includes(
                              safe(a?.key).toLowerCase()
                            )
                          )?.value
                        );

                      return (
                        <div
                          key={safe(it?.lineId) || idx}
                          className="flex gap-3 py-3 border-b border-zinc-100 last:border-b-0"
                        >
                          <Img src={img} alt={safe(snap?.title) || "Product"} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-zinc-900 truncate">
                                  {safe(snap?.title) || "Untitled item"}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-600">
                                  {safe(snap?.productCode) ? (
                                    <span className="inline-flex items-center gap-1">
                                      <Hash className="h-3 w-3" />{" "}
                                      {safe(snap.productCode)}
                                    </span>
                                  ) : null}
                                  {safe(it?.lineId) ? (
                                    <span className="font-mono">
                                      line: {safe(it.lineId)}
                                    </span>
                                  ) : null}
                                  {size ? <span>Size: {size}</span> : null}
                                  {color ? <span>Color: {color}</span> : null}
                                  {safe(it?.variant?.sku) ? (
                                    <span>SKU: {safe(it.variant.sku)}</span>
                                  ) : null}
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-sm text-zinc-900">
                                  ₹{money(it?.price)}{" "}
                                  <span className="text-xs text-zinc-500">×</span>{" "}
                                  <span className="font-semibold">
                                    {Number(it?.quantity || 1)}
                                  </span>
                                </div>
                                <div className="text-xs text-zinc-500 mt-1">
                                  Subtotal: ₹{money(it?.subtotal)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <Card title="Payment & Totals" icon={CreditCard} accent="indigo">
                  <Row label="Payment Method" value={safe(order?.paymentMethod)} />
                  <Row label="Payment Status" value={safe(order?.paymentStatus)} />
                  <Row label="Subtotal" value={`₹${money(totals.subtotal)}`} />
                  <Row label="Discount" value={`₹${money(totals.discount)}`} />
                  <Row label="Shipping Fee" value={`₹${money(totals.shippingFee)}`} />
                  <Row label="Tax" value={`₹${money(totals.tax)}`} />
                  <Row label="Total Amount" value={`₹${money(totals.totalAmount)}`} />
                  <Row
                    label="Final Payable"
                    value={`₹${money(totals.finalPayable)}`}
                  />
                </Card>
              </div>

              {/* right */}
              <div className="lg:col-span-4 space-y-4">
                <Card title="Actions" icon={ShieldCheck} accent="success">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <Btn
                        onClick={doConfirm}
                        disabled={!canConfirm || actionBusy}
                        variant="dark"
                      >
                        {actionBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="h-4 w-4" />
                        )}
                        Confirm
                      </Btn>
                      <Btn
                        onClick={markPacked}
                        disabled={!canPack || actionBusy}
                        variant="indigo"
                      >
                        {actionBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Package className="h-4 w-4" />
                        )}
                        Packed
                      </Btn>
                    </div>

                    <div className="bg-zinc-50 ring-1 ring-zinc-200/60 p-3 space-y-2">
                      <div className="text-xs text-zinc-600">
                        Change fulfillment status
                      </div>
                      <Select
                        value={nextFulfillment}
                        onChange={setNextFulfillment}
                        options={FULFILLMENT_OPTIONS}
                      />
                      <Btn
                        onClick={applyStatus}
                        disabled={actionBusy || !order?._id}
                        variant="dark"
                      >
                        {actionBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        Apply Status
                      </Btn>
                      <div className="text-[11px] text-zinc-500">
                        Shipping stages require confirmed order.
                      </div>
                    </div>

                    <Btn
                      onClick={doBookShiprocket}
                      disabled={actionBusy || !order?._id}
                      variant="light"
                    >
                      {actionBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Truck className="h-4 w-4" />
                      )}
                      Book Shiprocket (if missing)
                    </Btn>

                    <Btn
                      onClick={doCancel}
                      disabled={actionBusy || !order?._id}
                      variant="danger"
                    >
                      {actionBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Ban className="h-4 w-4" />
                      )}
                      Cancel Order
                    </Btn>
                  </div>
                </Card>

                <Card title="Print Documents" icon={FileText} accent="indigo">
                  <div className="text-xs text-zinc-500 mb-3">
                    Invoice aur packing slip yahin se preview, print ya save as PDF kar lo.
                  </div>

                  <div className="rounded border border-zinc-200 overflow-hidden">
                    <UniversalOrderPrintPanel
                      order={order}
                      courierName={courierName}
                      trackingId={trackingId}
                      title={`Documents • ${safe(order?.orderNumber)}`}
                    />
                  </div>
                </Card>

             <OrderSearchTrackingCard
  orderId={order?._id}
  orderNumber={order?.orderNumber}
  shipment={order?.shipment}
  trackingDetails={order?.trackingDetails}
  onRefresh={refresh}
  compact
/>

                <Card title="Customer" icon={User} accent="neutral">
                  <Row label="Customer ID" value={safe(order?.customerId)} mono />
                  <Row label="Customer Message" value={safe(order?.customerMessage)} />
                  <Row label="Admin Remarks" value={safe(order?.adminRemarks)} />
                </Card>

                <Card title="Shipping Address" icon={MapPin} accent="neutral">
                  {safe(order?.shippingAddressSnapshot?.fullName) ? (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-zinc-900">
                        {safe(order.shippingAddressSnapshot.fullName)}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-zinc-600">
                        {safe(order?.shippingAddressSnapshot?.phone) ? (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />{" "}
                            {safe(order.shippingAddressSnapshot.phone)}
                          </span>
                        ) : null}
                        {safe(order?.shippingAddressSnapshot?.email) ? (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" />{" "}
                            {safe(order.shippingAddressSnapshot.email)}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-sm text-zinc-800 whitespace-pre-line">
                        {safe(order?.shippingAddressSnapshot?.line1)}
                        {safe(order?.shippingAddressSnapshot?.line2)
                          ? `\n${safe(order.shippingAddressSnapshot.line2)}`
                          : ""}
                        {"\n"}
                        {safe(order?.shippingAddressSnapshot?.city)}
                        {safe(order?.shippingAddressSnapshot?.state)
                          ? `, ${safe(order.shippingAddressSnapshot.state)}`
                          : ""}
                        {"\n"}
                        {safe(order?.shippingAddressSnapshot?.pincode)}{" "}
                        {safe(order?.shippingAddressSnapshot?.country)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-500">
                      No address snapshot found.
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}