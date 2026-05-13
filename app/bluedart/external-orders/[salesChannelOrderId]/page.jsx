"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCcw,
  Loader2,
  Package,
  User,
  MapPin,
  CreditCard,
  Truck,
  Boxes,
  Hash,
  FileJson,
  IndianRupee,
  ShieldCheck,
  ExternalLink,
  Copy,
} from "lucide-react";

import { useBlueDartStore } from "@/store/bluedartStore";

const safe = (v) => (v == null ? "" : String(v));

const labelize = (value = "") =>
  safe(value)
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const formatCurrency = (amount, currency = "INR") => {
  const value = Number(amount || 0);
  if (!Number.isFinite(value)) return "-";

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency || "INR"} ${value.toLocaleString("en-IN")}`;
  }
};

const getStatusTone = (status = "") => {
  const s = safe(status).toLowerCase();

  if (s.includes("deliver")) return "bg-emerald-50 text-emerald-700";
  if (s.includes("cancel") || s.includes("fail"))
    return "bg-rose-50 text-rose-700";
  if (s.includes("rto") || s.includes("return"))
    return "bg-orange-50 text-orange-700";
  if (s.includes("ship") || s.includes("transit") || s.includes("ofd"))
    return "bg-blue-50 text-blue-700";

  return "bg-neutral-100 text-neutral-700";
};

const pick = (obj = {}, keys = []) => {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null && obj?.[key] !== "") {
      return obj[key];
    }
  }
  return "";
};

const getName = (person = {}) =>
  safe(
    pick(person, ["name", "full_name", "fullName"]) ||
      [person?.first_name, person?.last_name].filter(Boolean).join(" ") ||
      [person?.firstName, person?.lastName].filter(Boolean).join(" ")
  ).trim();

const getPhone = (person = {}) =>
  pick(person, ["phone", "mobile", "contact", "contact_number", "phone_number"]);

const getEmail = (person = {}) => pick(person, ["email", "email_id"]);

const getAddress = (person = {}) =>
  [
    pick(person, ["address", "address1", "line1", "street"]),
    pick(person, ["address2", "line2", "landmark"]),
    pick(person, ["city"]),
    pick(person, ["state", "province"]),
    pick(person, ["zipcode", "zip", "pincode", "postal_code"]),
    pick(person, ["country"]),
  ]
    .filter(Boolean)
    .join(", ");

const getItemTitle = (item = {}, index) =>
  pick(item, ["description", "name", "title", "product_name", "item_name"]) ||
  `Item ${index + 1}`;

const getItemSku = (item = {}) =>
  pick(item, ["sku", "product_sku", "item_sku", "code"]);

const getItemQty = (item = {}) =>
  Number(pick(item, ["quantity", "qty", "count"]) || 0) || 0;

const getItemAmount = (item = {}) =>
  item?.value?.amount ??
  item?.price?.amount ??
  item?.amount ??
  item?.value ??
  item?.price ??
  item?.unit_price ??
  0;

const getItemCurrency = (item = {}, fallback = "INR") =>
  item?.value?.currency || item?.price?.currency || item?.currency || fallback;

const getWeightText = (obj = {}) => {
  const weight =
    obj?.weight?.value ?? obj?.weight_value ?? obj?.weight ?? obj?.actual_weight;

  if (!weight) return "-";

  return `${weight} ${safe(
    obj?.weight?.unit_of_measurement ||
      obj?.weight_unit ||
      obj?.weightUnit ||
      "kg"
  )}`;
};

const getDimensionText = (obj = {}) => {
  const d = obj?.dimensions || obj || {};

  const length = d?.length ?? d?.l ?? d?.shipment_length;
  const width = d?.width ?? d?.breadth ?? d?.b ?? d?.shipment_width;
  const height = d?.height ?? d?.h ?? d?.shipment_height;

  if (!length && !width && !height) return "-";

  return `${length || 0} × ${width || 0} × ${height || 0}`;
};

export default function BlueDartExternalOrderDetailPage() {
  const params = useParams();
  const router = useRouter();

  const salesChannelOrderId = decodeURIComponent(
    safe(params?.salesChannelOrderId)
  );

  const {
    externalOrder,
    externalOrderLoading,
    externalResponse,
    fetchExternalOrderById,
    error,
  } = useBlueDartStore();

  useEffect(() => {
    if (salesChannelOrderId) {
      fetchExternalOrderById(salesChannelOrderId);
    }
  }, [salesChannelOrderId, fetchExternalOrderById]);

  const order = externalOrder || null;

  const receiverName = useMemo(() => getName(order?.receiver), [order]);
  const senderName = useMemo(() => getName(order?.sender), [order]);

  const receiverAddress = useMemo(
    () => getAddress(order?.receiver) || "-",
    [order]
  );

  const senderAddress = useMemo(
    () => getAddress(order?.sender) || "-",
    [order]
  );

  const rawJson = useMemo(
    () => JSON.stringify(order?.raw || externalResponse || {}, null, 2),
    [order, externalResponse]
  );

  const copyRaw = async () => {
    try {
      await navigator.clipboard.writeText(rawJson || "{}");
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f7f7] p-4 text-neutral-950 md:p-6">
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
          <div className="relative p-5 md:p-7">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-[4rem] bg-neutral-100/80" />

            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>

                <div className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  <ExternalLink className="h-3.5 w-3.5" />
                  BlueDart / Eshipz
                </div>

                <h1 className="mt-4 break-all text-2xl font-semibold tracking-tight text-neutral-950 md:text-3xl">
                  External Order {salesChannelOrderId}
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                  Single Eshipz order ka detailed view — receiver, sender,
                  shipment, items, parcels aur raw response snapshot.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/bluedart/external-orders"
                  className="inline-flex items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-200"
                >
                  <Package className="h-4 w-4" />
                  All Orders
                </Link>

                <button
                  type="button"
                  onClick={() => fetchExternalOrderById(salesChannelOrderId)}
                  disabled={externalOrderLoading || !salesChannelOrderId}
                  className="inline-flex items-center gap-2 rounded-2xl bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {externalOrderLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCcw className="h-4 w-4" />
                  )}
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <section className="rounded-[2rem] bg-rose-50 p-4 text-sm font-medium text-rose-700">
            {error}
          </section>
        ) : null}

        {externalOrderLoading ? (
          <section className="rounded-[2rem] bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3 text-sm font-medium text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading external order...
            </div>
          </section>
        ) : !order ? (
          <section className="rounded-[2rem] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100">
              <Package className="h-6 w-6 text-neutral-500" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-neutral-950">
              Order not found
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              Eshipz se is sales channel order id ka data nahi mila.
            </p>
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <StatCard
                icon={Hash}
                label="Order ID"
                value={order.orderId || order.id || "-"}
              />
              <StatCard
                icon={Truck}
                label="Ship Status"
                value={labelize(order.shipStatus || order.status || "-")}
              />
              <StatCard
                icon={CreditCard}
                label="Payment"
                value={labelize(order.paymentMode || "-")}
              />
              <StatCard
                icon={Package}
                label="AWB"
                value={order.awbNumber || order.awb || "-"}
              />
              <StatCard
                icon={IndianRupee}
                label="Value"
                value={formatCurrency(order.shipmentValue, order.currency)}
              />
            </section>

            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <section className="space-y-5">
                <Card title="Order Summary" icon={ShieldCheck}>
                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoRow
                      label="Order Number"
                      value={order.orderNumber || "-"}
                    />
                    <InfoRow
                      label="Order ID"
                      value={order.orderId || order.id || "-"}
                    />
                    <InfoRow
                      label="Shipment ID"
                      value={order.shipmentId || "-"}
                    />
                    <InfoRow
                      label="Order Status"
                      value={labelize(order.status || "-")}
                    />
                    <InfoRow
                      label="Ship Status"
                      value={labelize(order.shipStatus || "-")}
                    />
                    <InfoRow
                      label="Payment Mode"
                      value={labelize(order.paymentMode || "-")}
                    />
                    <InfoRow
                      label="Shipment Value"
                      value={formatCurrency(
                        order.shipmentValue,
                        order.currency
                      )}
                    />
                    <InfoRow
                      label="COD Amount"
                      value={formatCurrency(order.codAmount, order.currency)}
                    />
                    <InfoRow label="Currency" value={order.currency || "INR"} />
                    <InfoRow
                      label="AWB"
                      value={order.awbNumber || order.awb || "-"}
                    />
                  </div>
                </Card>

                <Card title="Items" icon={Boxes}>
                  {Array.isArray(order.items) && order.items.length ? (
                    <div className="space-y-3">
                      {order.items.map((item, index) => (
                        <div
                          key={`${getItemSku(item) || "item"}-${index}`}
                          className="rounded-3xl bg-neutral-50 p-4 ring-1 ring-neutral-100"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="break-words text-sm font-semibold text-neutral-950">
                                {getItemTitle(item, index)}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2 text-xs text-neutral-500">
                                <span>SKU: {getItemSku(item) || "-"}</span>
                                <span>•</span>
                                <span>
                                  HS Code:{" "}
                                  {pick(item, ["hs_code", "hsCode"]) || "-"}
                                </span>
                              </div>
                            </div>

                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-700 shadow-sm">
                              Qty {getItemQty(item)}
                            </span>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <InfoMini
                              label="Value"
                              value={formatCurrency(
                                getItemAmount(item),
                                getItemCurrency(item, order.currency)
                              )}
                            />
                            <InfoMini
                              label="Weight"
                              value={getWeightText(item)}
                            />
                            <InfoMini
                              label="Dimensions"
                              value={getDimensionText(item)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyBlock text="No item data available." />
                  )}
                </Card>

                <Card title="Parcels" icon={Package}>
                  {Array.isArray(order.parcels) && order.parcels.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {order.parcels.map((parcel, index) => (
                        <div
                          key={index}
                          className="rounded-3xl bg-neutral-50 p-4 ring-1 ring-neutral-100"
                        >
                          <p className="text-sm font-semibold text-neutral-950">
                            Parcel {index + 1}
                          </p>

                          <div className="mt-4 grid gap-3">
                            <InfoMini
                              label="Quantity"
                              value={
                                Number(
                                  pick(parcel, ["quantity", "qty", "count"]) ||
                                    0
                                ) || 0
                              }
                            />
                            <InfoMini
                              label="Weight"
                              value={getWeightText(parcel)}
                            />
                            <InfoMini
                              label="Dimensions"
                              value={getDimensionText(parcel)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyBlock text="No parcel data available." />
                  )}
                </Card>
              </section>

              <aside className="space-y-5">
                <Card title="Receiver" icon={User}>
                  <div className="space-y-3">
                    <MiniInfo
                      icon={User}
                      title={receiverName || "Customer"}
                      subtitle={[getPhone(order?.receiver), getEmail(order?.receiver)]
                        .filter(Boolean)
                        .join(" • ")}
                    />
                    <MiniInfo
                      icon={MapPin}
                      title="Address"
                      subtitle={receiverAddress}
                    />
                  </div>
                </Card>

                <Card title="Sender" icon={Truck}>
                  <div className="space-y-3">
                    <MiniInfo
                      icon={User}
                      title={senderName || "Sender"}
                      subtitle={[getPhone(order?.sender), getEmail(order?.sender)]
                        .filter(Boolean)
                        .join(" • ")}
                    />
                    <MiniInfo
                      icon={MapPin}
                      title="Address"
                      subtitle={senderAddress}
                    />
                  </div>
                </Card>

                <Card
                  title="Raw Response"
                  icon={FileJson}
                  action={
                    <button
                      type="button"
                      onClick={copyRaw}
                      className="inline-flex items-center gap-2 rounded-xl bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-200"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  }
                >
                  <pre className="max-h-[560px] overflow-auto rounded-3xl bg-neutral-950 p-4 text-xs leading-6 text-neutral-100">
                    {rawJson}
                  </pre>
                </Card>
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Card({ title, icon: Icon, children, action }) {
  return (
    <section className="rounded-[2rem] bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-2xl bg-neutral-100 p-2">
            <Icon className="h-4 w-4 text-neutral-700" />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-neutral-950">
            {title}
          </h2>
        </div>

        {action || null}
      </div>

      {children}
    </section>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
            {label}
          </p>
          <p className="mt-2 break-all text-lg font-semibold text-neutral-950">
            {value}
          </p>
        </div>
        <div className="rounded-2xl bg-neutral-100 p-3">
          <Icon className="h-5 w-5 text-neutral-700" />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-neutral-50 px-4 py-3 ring-1 ring-neutral-100">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="break-all text-right text-sm font-semibold text-neutral-950">
        {value || "-"}
      </span>
    </div>
  );
}

function InfoMini({ label, value }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">
        {label}
      </p>
      <p className="mt-1 break-all text-sm font-semibold text-neutral-900">
        {value || "-"}
      </p>
    </div>
  );
}

function MiniInfo({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 rounded-3xl bg-neutral-50 p-4 ring-1 ring-neutral-100">
      <div className="rounded-2xl bg-white p-2 shadow-sm">
        <Icon className="h-4 w-4 text-neutral-700" />
      </div>
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold text-neutral-950">
          {title || "-"}
        </p>
        <p className="mt-1 break-words text-xs leading-5 text-neutral-500">
          {subtitle || "-"}
        </p>
      </div>
    </div>
  );
}

function EmptyBlock({ text }) {
  return (
    <div className="rounded-3xl bg-neutral-50 p-5 text-sm font-medium text-neutral-500 ring-1 ring-neutral-100">
      {text}
    </div>
  );
}