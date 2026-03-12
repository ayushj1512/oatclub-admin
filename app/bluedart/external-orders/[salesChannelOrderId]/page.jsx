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
} from "lucide-react";

import { useBlueDartStore } from "@/store/bluedartStore";

const safe = (v) => (v == null ? "" : String(v));

const labelize = (value = "") =>
  safe(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const formatCurrency = (amount, currency = "INR") => {
  const value = Number(amount || 0);
  if (!Number.isFinite(value)) return "-";
  return `${currency} ${value.toLocaleString("en-IN")}`;
};

export default function BlueDartExternalOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const salesChannelOrderId = decodeURIComponent(
    params?.salesChannelOrderId || ""
  );

  const {
    externalOrder,
    externalOrderLoading,
    fetchExternalOrderById,
  } = useBlueDartStore();

  useEffect(() => {
    if (salesChannelOrderId) {
      fetchExternalOrderById(salesChannelOrderId);
    }
  }, [salesChannelOrderId, fetchExternalOrderById]);

  const order = externalOrder || null;

  const receiverName = useMemo(() => {
    if (!order?.receiver) return "";
    return [safe(order.receiver.first_name), safe(order.receiver.last_name)]
      .filter(Boolean)
      .join(" ");
  }, [order]);

  const senderName = useMemo(() => {
    if (!order?.sender) return "";
    return [safe(order.sender.first_name), safe(order.sender.last_name)]
      .filter(Boolean)
      .join(" ");
  }, [order]);

  const receiverAddress = useMemo(() => {
    if (!order?.receiver) return "-";
    return [
      safe(order.receiver.address),
      safe(order.receiver.city),
      safe(order.receiver.state),
      safe(order.receiver.zipcode),
      safe(order.receiver.country),
    ]
      .filter(Boolean)
      .join(", ");
  }, [order]);

  const senderAddress = useMemo(() => {
    if (!order?.sender) return "-";
    return [
      safe(order.sender.address),
      safe(order.sender.city),
      safe(order.sender.state),
      safe(order.sender.zipcode),
      safe(order.sender.country),
    ]
      .filter(Boolean)
      .join(", ");
  }, [order]);

  return (
    <main className="min-h-screen bg-[#f7f7f7] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={() => router.back()}
                className="mb-3 inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-neutral-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                BlueDart / eShipz
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900 break-all">
                External Order {salesChannelOrderId}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                Single external order detail with receiver, sender, items,
                parcels and raw payload snapshot.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/bluedart/external-orders"
                className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
              >
                <Package className="h-4 w-4" />
                All External Orders
              </Link>

              <button
                type="button"
                onClick={() => fetchExternalOrderById(salesChannelOrderId)}
                disabled={externalOrderLoading}
                className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
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
        </section>

        {externalOrderLoading ? (
          <section className="rounded-3xl bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading external order...
            </div>
          </section>
        ) : !order ? (
          <section className="rounded-3xl bg-white p-8 shadow-sm">
            <p className="text-sm text-neutral-500">Order not found.</p>
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={Hash}
                label="Order ID"
                value={order.orderId || order.id || "-"}
              />
              <StatCard
                icon={Truck}
                label="Status"
                value={labelize(order.shipStatus || order.status || "-")}
              />
              <StatCard
                icon={CreditCard}
                label="Payment Mode"
                value={labelize(order.paymentMode || "-")}
              />
              <StatCard
                icon={Package}
                label="AWB Number"
                value={order.awbNumber || "-"}
              />
            </section>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <section className="space-y-6">
                <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Order Summary
                  </h2>
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <InfoRow label="Order Number" value={order.orderNumber || "-"} />
                    <InfoRow label="Order ID" value={order.orderId || order.id || "-"} />
                    <InfoRow label="Order Status" value={labelize(order.status || "-")} />
                    <InfoRow
                      label="Ship Status"
                      value={labelize(order.shipStatus || "-")}
                    />
                    <InfoRow
                      label="Shipment Value"
                      value={formatCurrency(order.shipmentValue, order.currency)}
                    />
                    <InfoRow
                      label="COD Amount"
                      value={formatCurrency(order.codAmount, order.currency)}
                    />
                    <InfoRow label="Currency" value={order.currency || "INR"} />
                    <InfoRow label="AWB" value={order.awbNumber || "-"} />
                  </div>
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
                  <div className="flex items-center gap-2">
                    <Boxes className="h-5 w-5 text-neutral-700" />
                    <h2 className="text-lg font-semibold text-neutral-900">
                      Items
                    </h2>
                  </div>

                  {Array.isArray(order.items) && order.items.length ? (
                    <div className="mt-5 space-y-3">
                      {order.items.map((item, index) => (
                        <div
                          key={`${safe(item?.sku)}-${index}`}
                          className="rounded-2xl border border-neutral-200 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-neutral-900">
                                {safe(item?.description) || `Item ${index + 1}`}
                              </p>
                              <p className="text-xs text-neutral-500">
                                SKU: {safe(item?.sku) || "-"}
                              </p>
                              <p className="text-xs text-neutral-500">
                                HS Code: {safe(item?.hs_code) || "-"}
                              </p>
                            </div>

                            <div className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                              Qty {Number(item?.quantity || 0) || 0}
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <InfoMini
                              label="Value"
                              value={formatCurrency(
                                item?.value?.amount,
                                item?.value?.currency || order.currency
                              )}
                            />
                            <InfoMini
                              label="Weight"
                              value={
                                item?.weight?.value
                                  ? `${item.weight.value} ${safe(
                                      item?.weight?.unit_of_measurement || "kg"
                                    )}`
                                  : "-"
                              }
                            />
                            <InfoMini
                              label="Dimensions"
                              value={
                                item?.dimensions
                                  ? `${safe(item.dimensions.length) || 0} × ${
                                      safe(item.dimensions.width) || 0
                                    } × ${safe(item.dimensions.height) || 0}`
                                  : "-"
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">
                      No item data available.
                    </div>
                  )}
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-neutral-700" />
                    <h2 className="text-lg font-semibold text-neutral-900">
                      Parcels
                    </h2>
                  </div>

                  {Array.isArray(order.parcels) && order.parcels.length ? (
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      {order.parcels.map((parcel, index) => (
                        <div
                          key={index}
                          className="rounded-2xl border border-neutral-200 p-4"
                        >
                          <p className="text-sm font-semibold text-neutral-900">
                            Parcel {index + 1}
                          </p>
                          <div className="mt-3 space-y-2 text-sm text-neutral-600">
                            <p>
                              Quantity:{" "}
                              <span className="font-medium text-neutral-900">
                                {Number(parcel?.quantity || 0) || 0}
                              </span>
                            </p>
                            <p>
                              Weight:{" "}
                              <span className="font-medium text-neutral-900">
                                {parcel?.weight?.value || "-"}{" "}
                                {safe(parcel?.weight?.unit_of_measurement || "kg")}
                              </span>
                            </p>
                            <p>
                              Dimensions:{" "}
                              <span className="font-medium text-neutral-900">
                                {safe(parcel?.dimensions?.length) || 0} ×{" "}
                                {safe(parcel?.dimensions?.width) || 0} ×{" "}
                                {safe(parcel?.dimensions?.height) || 0}
                              </span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">
                      No parcel data available.
                    </div>
                  )}
                </div>
              </section>

              <aside className="space-y-6">
                <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-neutral-700" />
                    <h2 className="text-lg font-semibold text-neutral-900">
                      Receiver
                    </h2>
                  </div>

                  <div className="mt-4 space-y-3">
                    <MiniInfo
                      icon={User}
                      title={receiverName || "Customer"}
                      subtitle={[
                        safe(order?.receiver?.phone),
                        safe(order?.receiver?.email),
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    />
                    <MiniInfo
                      icon={MapPin}
                      title="Address"
                      subtitle={receiverAddress}
                    />
                  </div>
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-neutral-700" />
                    <h2 className="text-lg font-semibold text-neutral-900">
                      Sender
                    </h2>
                  </div>

                  <div className="mt-4 space-y-3">
                    <MiniInfo
                      icon={User}
                      title={senderName || "Sender"}
                      subtitle={[
                        safe(order?.sender?.phone),
                        safe(order?.sender?.email),
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    />
                    <MiniInfo
                      icon={MapPin}
                      title="Address"
                      subtitle={senderAddress}
                    />
                  </div>
                </div>

                <div className="rounded-3xl bg-white p-5 shadow-sm md:p-6">
                  <div className="flex items-center gap-2">
                    <FileJson className="h-5 w-5 text-neutral-700" />
                    <h2 className="text-lg font-semibold text-neutral-900">
                      Raw Response
                    </h2>
                  </div>

                  <pre className="mt-4 max-h-[520px] overflow-auto rounded-2xl bg-neutral-950 p-4 text-xs leading-6 text-neutral-100">
{JSON.stringify(order.raw || {}, null, 2)}
                  </pre>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            {label}
          </p>
          <p className="mt-2 break-all text-lg font-semibold text-neutral-900">
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
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-neutral-50 px-4 py-3">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="break-all text-right text-sm font-medium text-neutral-900">
        {value}
      </span>
    </div>
  );
}

function InfoMini({ label, value }) {
  return (
    <div className="rounded-2xl bg-neutral-50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-neutral-900">{value}</p>
    </div>
  );
}

function MiniInfo({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-neutral-50 p-4">
      <div className="rounded-2xl bg-white p-2 shadow-sm">
        <Icon className="h-4 w-4 text-neutral-700" />
      </div>
      <div>
        <p className="text-sm font-medium text-neutral-900">{title}</p>
        <p className="mt-1 text-xs text-neutral-500">{subtitle || "-"}</p>
      </div>
    </div>
  );
}