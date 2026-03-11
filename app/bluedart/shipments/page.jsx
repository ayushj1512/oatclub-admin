"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCcw,
  Package,
  Truck,
  ChevronRight,
} from "lucide-react";

import { useBlueDartStore } from "@/store/bluedartStore";
import BlueDartShipmentTable from "@/components/bluedart/BlueDartShipmentTable";

const safe = (v) => (v == null ? "" : String(v));

export default function BlueDartShipmentsPage() {
  const { shipments, listLoading, fetchShipments } = useBlueDartStore();

  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchShipments({ page: 1, limit: 200 });
  }, [fetchShipments]);

  const filtered = useMemo(() => {
    const q = safe(search).toLowerCase().trim();
    if (!q) return shipments || [];

    return (shipments || []).filter((s) => {
      return (
        safe(s.orderNumber).toLowerCase().includes(q) ||
        safe(s.awbNumber).toLowerCase().includes(q) ||
        safe(s.status).toLowerCase().includes(q)
      );
    });
  }, [shipments, search]);

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-6 md:px-6">
      <div className="mx-auto space-y-5">
        {/* Header */}
        <section className="rounded-[28px] bg-white px-5 py-5 shadow-sm ring-1 ring-black/5 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-sm">
                <Truck size={20} />
              </div>

              <div>
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
                  Logistics
                  <ChevronRight size={12} />
                  BlueDart
                </div>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
                  BlueDart Shipments
                </h1>
                <p className="mt-1 text-sm text-neutral-500">
                  Clean shipment overview with quick search and refresh.
                </p>
              </div>
            </div>

            <button
              onClick={() => fetchShipments({ page: 1, limit: 200 })}
              disabled={listLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw
                size={16}
                className={listLoading ? "animate-spin" : ""}
              />
              {listLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </section>

        {/* Search + Stats */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-black/5 md:p-5">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by AWB, order number, or status"
                className="h-12 w-full rounded-2xl bg-neutral-100 pl-11 pr-4 text-sm text-neutral-900 outline-none ring-1 ring-transparent placeholder:text-neutral-400 focus:bg-white focus:ring-neutral-300"
              />
            </div>
          </div>

          <div className="rounded-[28px] bg-white p-4 shadow-sm ring-1 ring-black/5 md:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900 text-white">
                <Package size={18} />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                  Visible Shipments
                </p>
                <h2 className="text-xl font-semibold text-neutral-900">
                  {filtered.length}
                </h2>
              </div>
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-black/5">
          <BlueDartShipmentTable shipments={filtered} loading={listLoading} />
        </section>
      </div>
    </main>
  );
}