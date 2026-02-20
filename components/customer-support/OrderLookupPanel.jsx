"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  Search,
  Loader2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Package,
  Truck,
  CreditCard,
  X,
} from "lucide-react";
import { useOrderStore } from "@/store/orderStore";

/* ---------------- helpers ---------------- */
const safe = (v) => String(v ?? "").trim();
const fmtMoney = (n, cur = "INR") => {
  const x = Number(n || 0);
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: cur }).format(x);
  } catch {
    return `${cur} ${x.toFixed(2)}`;
  }
};
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "-");

const clip = async (text) => {
  try {
    await navigator.clipboard.writeText(String(text || ""));
    toast.success("Copied ✅");
  } catch {
    toast.error("Copy failed");
  }
};

const getThumb = (it) =>
  safe(it?.productSnapshot?.thumbnail) || safe(it?.productSnapshot?.images?.[0]) || "";

/* ---------------- compact ui helpers ---------------- */
const Badge = ({ icon: Icon, children }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
    <Icon className="h-3.5 w-3.5" />
    {children}
  </span>
);

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-2">
      <p className="text-[11px] font-semibold text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm font-extrabold text-gray-900">{value}</p>
    </div>
  );
}

/* -------------------------------------------------------
   OrderLookupPanel
   - Finds orders by email/phone
   - Displays details
   - ✅ Shows already-attached order details (orderNumber)
   - Attach orderNumber to ticket via onAttach(orderNumber)
-------------------------------------------------------- */
export default function OrderLookupPanel({
  email = "",
  phone = "",
  onAttach = () => {},
  disabled = false,
  initialAutoSearch = true,

  // ✅ NEW: if ticket already has order number saved, pass it here
  attachedOrderNumber = "",
}) {
  const { fetchOrdersByIdentity, fetchOrderByNumber, loading } = useOrderStore();

  const initialEmail = useMemo(() => safe(email), [email]);
  const initialPhone = useMemo(() => safe(phone), [phone]);

  const [qEmail, setQEmail] = useState(initialEmail);
  const [qPhone, setQPhone] = useState(initialPhone);

  const [orders, setOrders] = useState([]);
  const [openId, setOpenId] = useState("");
  const [didAuto, setDidAuto] = useState(false);

  // ✅ already attached order (from ticket)
  const [savedOrder, setSavedOrder] = useState(null);
  const [savedLoading, setSavedLoading] = useState(false);

  const canSearch = Boolean(safe(qEmail) || safe(qPhone));

  const search = async () => {
    if (!canSearch) return toast.error("Enter email or phone");
    try {
      const res = await fetchOrdersByIdentity({ email: qEmail, phone: qPhone });
      const list = Array.isArray(res) ? res : [];
      setOrders(list);
      setOpenId(list?.[0]?._id || "");
      if (!list.length) toast.error("No orders found");
    } catch (e) {
      toast.error(e?.message || "Search failed");
    }
  };

  // ✅ auto search once on mount (safe)
  useEffect(() => {
    if (!initialAutoSearch) return;
    if (didAuto) return;
    if (!initialEmail && !initialPhone) return;
    setDidAuto(true);
    Promise.resolve().then(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAutoSearch, didAuto, initialEmail, initialPhone]);

  // ✅ fetch attached/saved order details (ticket already has orderNumber)
  useEffect(() => {
    const onum = safe(attachedOrderNumber);
    if (!onum || !fetchOrderByNumber) {
      setSavedOrder(null);
      return;
    }

    let alive = true;
    setSavedLoading(true);

    Promise.resolve()
      .then(() => fetchOrderByNumber(onum))
      .then((o) => {
        if (!alive) return;
        setSavedOrder(o || null);
      })
      .catch((e) => {
        if (!alive) return;
        setSavedOrder(null);
        toast.error(e?.message || "Failed to load saved order");
      })
      .finally(() => {
        if (!alive) return;
        setSavedLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [attachedOrderNumber, fetchOrderByNumber]);

  const SelectedDetails = ({ order, header = "Selected Order", rightSlot = null }) => {
    if (!order) return null;

    const cur = safe(order?.currency) || "INR";
    const orderNumber = safe(order?.orderNumber);

    const ship =
      order?.shipment?.shiprocket?.awb ||
      order?.shipment?.xpressbees?.awb ||
      order?.trackingDetails?.trackingId ||
      "";

    const courier =
      safe(order?.shipment?.shiprocket?.courierName) ||
      safe(order?.shipment?.xpressbees?.courierName) ||
      safe(order?.trackingDetails?.courierName) ||
      "";

    const trackingUrl =
      safe(order?.shipment?.shiprocket?.trackingUrl) ||
      safe(order?.shipment?.xpressbees?.trackingUrl) ||
      safe(order?.trackingDetails?.trackingUrl) ||
      "";

    const address = order?.shippingAddressSnapshot || {};
    const items = Array.isArray(order?.items) ? order.items : [];
    const rmas = Array.isArray(order?.rmas) ? order.rmas : [];

    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-gray-500">{header}</p>
            <p className="mt-0.5 truncate text-base font-extrabold text-gray-900">
              {orderNumber || "-"}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge icon={Package}>{safe(order?.fulfillmentStatus) || "-"}</Badge>
              <Badge icon={CreditCard}>
                {safe(order?.paymentMethod) || "-"} / {safe(order?.paymentStatus) || "-"}
              </Badge>
              {ship ? (
                <Badge icon={Truck}>
                  {courier ? `${courier} · ` : ""}
                  {ship}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {rightSlot}
            <button
              type="button"
              onClick={() => clip(orderNumber)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-2.5 py-2 text-xs font-semibold ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
            >
              <Copy className="h-4 w-4" />
              Copy
            </button>

            <button
              type="button"
              onClick={() => orderNumber && onAttach(orderNumber)}
              disabled={disabled || !orderNumber}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-2.5 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              Attach
            </button>
          </div>
        </div>

        {/* totals */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Subtotal" value={fmtMoney(order?.subtotal, cur)} />
          <Stat label="Discount" value={fmtMoney(order?.discount, cur)} />
          <Stat label="Shipping" value={fmtMoney(order?.shippingFee, cur)} />
          <Stat label="Payable" value={fmtMoney(order?.finalPayable, cur)} />
        </div>

        {/* tracking */}
        {trackingUrl ? (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
          >
            Open Tracking <ExternalLink className="h-4 w-4" />
          </a>
        ) : null}

        {/* address */}
        <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2">
          <p className="text-[11px] font-semibold text-gray-500">Shipping</p>
          <p className="mt-0.5 text-sm font-semibold text-gray-900">
            {safe(address?.fullName) || "-"} {safe(address?.phone) ? `· ${safe(address.phone)}` : ""}
          </p>
          <p className="mt-0.5 text-sm text-gray-700">
            {[
              safe(address?.line1),
              safe(address?.line2),
              safe(address?.city),
              safe(address?.state),
              safe(address?.pincode),
              safe(address?.country),
            ]
              .filter(Boolean)
              .join(", ") || "-"}
          </p>
        </div>

        {/* items */}
        <div className="mt-3">
          <p className="text-[11px] font-semibold text-gray-500">Items ({items.length})</p>
          <div className="mt-2 space-y-2">
            {items.map((it, idx) => {
              const title = safe(it?.productSnapshot?.title) || "Item";
              const qty = Number(it?.quantity || 1);
              const price = fmtMoney(it?.price, cur);
              const size = safe(it?.selectedSize);
              const color = safe(it?.selectedColor);
              const thumb = getThumb(it);

              return (
                <div
                  key={it?.lineId || `${order?._id}-it-${idx}`}
                  className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-2.5"
                >
                  <div className="relative h-11 w-11 overflow-hidden rounded-xl bg-gray-100 ring-1 ring-black/5">
                    {thumb ? (
                      <Image src={thumb} alt={title} fill sizes="44px" className="object-cover" />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 line-clamp-1">{title}</p>
                    <p className="mt-0.5 text-xs text-gray-600">
                      Qty: <span className="font-semibold">{qty}</span> · {price}
                      {size ? ` · Size: ${size}` : ""}
                      {color ? ` · Color: ${color}` : ""}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-extrabold text-gray-900">
                      {fmtMoney(it?.subtotal, cur)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RMAs */}
        {rmas.length ? (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-2.5">
            <p className="text-[11px] font-semibold text-amber-900">RMAs ({rmas.length})</p>
            <div className="mt-2 space-y-2">
              {rmas.map((r, i) => (
                <div
                  key={`${order?._id}-rma-${i}`}
                  className="rounded-xl bg-white/70 p-2.5 ring-1 ring-inset ring-amber-200"
                >
                  <p className="text-sm font-extrabold text-gray-900">
                    {safe(r?.rmaNumber) || "RMA"}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-700">
                    {safe(r?.type)} · {safe(r?.status)} · resolution:{" "}
                    <span className="font-semibold">{safe(r?.resolution) || "-"}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3">
      {/* ✅ show already attached order at top */}
      {safe(attachedOrderNumber) ? (
        <div className="mb-3">
          {savedLoading ? (
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading saved order ({safe(attachedOrderNumber)})…
            </div>
          ) : savedOrder ? (
            <SelectedDetails
              order={savedOrder}
              header="Attached Order (Saved in Ticket)"
              rightSlot={
                <button
                  type="button"
                  onClick={() => {
                    setSavedOrder(null);
                    toast.success("Attached order cleared (UI only)");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-2 text-xs font-semibold ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
                  title="Hide (does not remove from ticket)"
                >
                  <X className="h-4 w-4" />
                  Hide
                </button>
              }
            />
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              Saved order <span className="font-extrabold">{safe(attachedOrderNumber)}</span> not found.
            </div>
          )}
        </div>
      ) : null}

      {/* header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-gray-500">Order Lookup</p>
          <p className="mt-0.5 text-sm font-extrabold text-gray-900">
            Find customer orders by email / phone
          </p>
        </div>

        <button
          type="button"
          onClick={search}
          disabled={disabled || loading || !canSearch}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </button>
      </div>

      {/* inputs */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          value={qEmail}
          onChange={(e) => setQEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200"
        />
        <input
          value={qPhone}
          onChange={(e) => setQPhone(e.target.value)}
          placeholder="Phone"
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200"
        />
      </div>

      {!orders.length ? (
        <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700">
          <span className="font-semibold">Tip:</span> phone/email ticket se auto-fill ho jayega.
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* list */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                <p className="text-[11px] font-semibold text-gray-600">
                  Found Orders ({orders.length})
                </p>
              </div>

              <div className="max-h-[320px] overflow-auto">
                {orders.map((o) => {
                  const active = String(openId) === String(o?._id);
                  const onum = safe(o?.orderNumber) || "-";
                  const cur = safe(o?.currency) || "INR";
                  const status = safe(o?.fulfillmentStatus) || "-";

                  return (
                    <button
                      key={o?._id}
                      type="button"
                      onClick={() => setOpenId(o?._id)}
                      className={`w-full text-left px-3 py-2.5 border-b last:border-b-0 transition ${
                        active ? "bg-gray-900 text-white" : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold">{onum}</p>
                          <p className={`mt-0.5 text-[11px] ${active ? "text-white/80" : "text-gray-500"}`}>
                            {fmtDate(o?.orderDate || o?.createdAt)}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-bold">
                            {fmtMoney(o?.finalPayable ?? o?.totalAmount, cur)}
                          </p>
                          <p className={`mt-0.5 text-[11px] ${active ? "text-white/80" : "text-gray-500"}`}>
                            {status}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* details */}
          <div className="lg:col-span-7">
            {(() => {
              const o = orders.find((x) => String(x?._id) === String(openId)) || orders[0];
              if (!o) return null;
              return <SelectedDetails order={o} header="Selected Order" />;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}