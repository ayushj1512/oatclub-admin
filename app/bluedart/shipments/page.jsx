"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Search,
  RefreshCcw,
  Package,
  Truck,
  ChevronRight,
  RadioTower,
  CheckCircle2,
  Clock3,
  AlertTriangle,
} from "lucide-react";

import { useBlueDartStore } from "@/store/bluedartStore";
import BlueDartShipmentTable from "@/components/bluedart/BlueDartShipmentTable";

const safe = (v) => (v == null ? "" : String(v));
const lower = (v) => safe(v).toLowerCase().trim();

const STATUS_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Pushed", value: "order_pushed" },
  { label: "Booked", value: "booked" },
  { label: "Pickup Pending", value: "pickup_pending" },
  { label: "Pickup Scheduled", value: "pickup_scheduled" },
  { label: "Picked", value: "picked" },
  { label: "Shipped", value: "shipped" },
  { label: "In Transit", value: "in_transit" },
  { label: "OFD", value: "out_for_delivery" },
  { label: "Delivered", value: "delivered" },
  { label: "RTO", value: "rto" },
  { label: "Failed", value: "failed" },
  { label: "Cancelled", value: "cancelled" },
];

const StatCard = ({ icon: Icon, label, value, hint }) => (
  <div className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-neutral-100">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-100 text-black">
        <Icon size={18} />
      </div>

      {hint ? (
        <span className="rounded-full bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-500 ring-1 ring-neutral-100">
          {hint}
        </span>
      ) : null}
    </div>

    <p className="text-sm font-medium text-neutral-500">{label}</p>
    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
      {value}
    </h2>
  </div>
);

export default function BlueDartShipmentsPage() {
  const { shipments, listLoading, fetchShipments } = useBlueDartStore();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [carrierFilter, setCarrierFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const loadShipments = useCallback(() => {
    return fetchShipments({
      page: 1,
      limit: 500,
      status: statusFilter === "all" ? "" : statusFilter,
      carrierName: carrierFilter === "all" ? "" : carrierFilter,
    });
  }, [fetchShipments, statusFilter, carrierFilter]);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  const carrierOptions = useMemo(() => {
    const set = new Set();

    for (const shipment of shipments || []) {
      const carrier = safe(shipment?.carrierName || shipment?.courierName);
      if (carrier) set.add(carrier);
    }

    if (!set.size) set.add("BlueDart");

    return [...set];
  }, [shipments]);

  const filtered = useMemo(() => {
    const q = lower(search);

    return (shipments || []).filter((s) => {
      const matchesQuery =
        !q ||
        [
          s?.orderNumber,
          s?.awbNumber,
          s?.awb,
          s?.shipmentId,
          s?.shipmentIdExternal,
          s?.referenceNumber,
          s?.status,
          s?.rawStatus,
          s?.carrierName,
          s?.carrierSlug,
          s?.recipient?.fullName,
          s?.recipient?.phone,
          s?.recipient?.city,
          s?.recipient?.pincode,
        ]
          .map(lower)
          .some((value) => value.includes(q));

      const matchesStatus =
        statusFilter === "all" || lower(s?.status) === lower(statusFilter);

      const matchesCarrier =
        carrierFilter === "all" ||
        lower(s?.carrierName || s?.courierName) === lower(carrierFilter);

      const matchesPayment =
        paymentFilter === "all" || lower(s?.paymentMode) === lower(paymentFilter);

      return matchesQuery && matchesStatus && matchesCarrier && matchesPayment;
    });
  }, [shipments, search, statusFilter, carrierFilter, paymentFilter]);

  const stats = useMemo(() => {
    const rows = shipments || [];

    const delivered = rows.filter((s) => lower(s?.status) === "delivered").length;
    const active = rows.filter((s) =>
      [
        "created",
        "booked",
        "pickup_pending",
        "pickup_scheduled",
        "picked",
        "shipped",
        "in_transit",
        "out_for_delivery",
      ].includes(lower(s?.status))
    ).length;

    const failed = rows.filter((s) =>
      ["failed", "exception", "cancelled", "rto"].includes(lower(s?.status))
    ).length;

    return {
      total: rows.length,
      visible: filtered.length,
      active,
      delivered,
      failed,
    };
  }, [shipments, filtered]);

  return (
    <main className="min-h-screen bg-[#f6f6f6] px-4 py-6 md:px-6">
      <div className="space-y-6">
        <section className="rounded-[32px] bg-white px-5 py-5 shadow-sm ring-1 ring-neutral-100 md:px-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-black text-white shadow-sm">
                <Truck size={20} />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                  Logistics
                  <ChevronRight size={12} />
                  Eshipz
                  <ChevronRight size={12} />
                  BlueDart
                </div>

                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950">
                  Eshipz / BlueDart Shipments
                </h1>

                <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">
                  Local shipment ledger for Eshipz bookings. Carrier is BlueDart,
                  provider remains{" "}
                  <span className="font-semibold text-neutral-900">eshipz</span>{" "}
                  in the order model.
                </p>
              </div>
            </div>

            <button
              onClick={loadShipments}
              disabled={listLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw
                size={16}
                className={listLoading ? "animate-spin" : ""}
              />
              {listLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard icon={Package} label="Total Shipments" value={stats.total} />
          <StatCard
            icon={Search}
            label="Visible Results"
            value={stats.visible}
            hint="filtered"
          />
          <StatCard icon={RadioTower} label="Active" value={stats.active} />
          <StatCard
            icon={CheckCircle2}
            label="Delivered"
            value={stats.delivered}
          />
          <StatCard
            icon={AlertTriangle}
            label="Issues"
            value={stats.failed}
            hint="rto/failed"
          />
        </section>

        <section className="rounded-[32px] bg-white p-4 shadow-sm ring-1 ring-neutral-100 md:p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-1">
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Search
              </label>
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="AWB, order no, name, phone..."
                  className="h-12 w-full rounded-2xl bg-neutral-50 pl-11 pr-4 text-sm text-neutral-900 outline-none ring-1 ring-neutral-200 placeholder:text-neutral-400 transition focus:bg-white focus:ring-black"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-12 w-full rounded-2xl bg-neutral-50 px-4 text-sm text-neutral-900 outline-none ring-1 ring-neutral-200 transition focus:bg-white focus:ring-black"
              >
                {STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Carrier
              </label>
              <select
                value={carrierFilter}
                onChange={(e) => setCarrierFilter(e.target.value)}
                className="h-12 w-full rounded-2xl bg-neutral-50 px-4 text-sm text-neutral-900 outline-none ring-1 ring-neutral-200 transition focus:bg-white focus:ring-black"
              >
                <option value="all">All Carriers</option>
                {carrierOptions.map((carrier) => (
                  <option key={carrier} value={carrier}>
                    {carrier}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700">
                Payment
              </label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="h-12 w-full rounded-2xl bg-neutral-50 px-4 text-sm text-neutral-900 outline-none ring-1 ring-neutral-200 transition focus:bg-white focus:ring-black"
              >
                <option value="all">All Payments</option>
                <option value="COD">COD</option>
                <option value="Prepaid">Prepaid</option>
              </select>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[32px] bg-white shadow-sm ring-1 ring-neutral-100">
          <BlueDartShipmentTable shipments={filtered} loading={listLoading} />
        </section>
      </div>
    </main>
  );
}