"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpDown,
  Boxes,
  Layers3,
  Package,
  Plus,
  RefreshCcw,
  Search,
  Warehouse,
} from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

const formatQty = (n) => {
  const num = Number(n || 0);
  if (Number.isNaN(num)) return "0";
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(num);
};

const getQty = (item) =>
  item?.currentQuantity ??
  item?.quantity ??
  item?.availableQuantity ??
  item?.stock ??
  item?.currentStock ??
  0;

const inputClass =
  "h-11 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-black";

export default function FabricInventoryPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [unit, setUnit] = useState("");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const fetchInventory = async (showRefresh = false) => {
    try {
      setError("");
      showRefresh ? setRefreshing(true) : setLoading(true);

      const params = new URLSearchParams();
      if (search.trim()) params.append("q", search.trim());
      if (unit) params.append("unit", unit);
      if (sortBy) params.append("sortBy", sortBy);
      if (sortOrder) params.append("sortOrder", sortOrder);

      const res = await fetch(
        `${BASE_URL}/api/fabrics?${params.toString()}`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to fetch inventory");

      setRows(data.data || []);
    } catch (err) {
      setError(err.message || "Failed to fetch inventory");
      setRows([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(() => rows, [rows]);

  const summary = useMemo(() => {
    const totalItems = filteredRows.length;
    const totalQty = filteredRows.reduce(
      (sum, item) => sum + Number(getQty(item) || 0),
      0
    );
    const meterCount = filteredRows.filter(
      (item) => item?.unit === "meter"
    ).length;
    const kgCount = filteredRows.filter((item) => item?.unit === "kg").length;

    return { totalItems, totalQty, meterCount, kgCount };
  }, [filteredRows]);

  const handleReset = () => {
    setSearch("");
    setUnit("");
    setSortBy("updatedAt");
    setSortOrder("desc");

    setTimeout(() => {
      fetchInventory(true);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-6">
      <div className="space-y-5">
        <div className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-800 p-5 text-white md:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-white/10 p-2.5 ring-1 ring-white/15">
                  <Warehouse className="h-5 w-5" />
                </div>

                <div>
                  <h1 className="text-xl font-semibold md:text-2xl">
                    Fabric Inventory
                  </h1>
                  <p className="mt-1 text-sm text-neutral-300">
                    View current stock, monitor quantity, and manage fabric
                    inventory entries.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => fetchInventory(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
                >
                  <RefreshCcw
                    className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>

                <Link
                  href="/inventory/fabric-inventory/add"
                  className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white ring-1 ring-white/10 transition hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  Add Inventory
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Fabrics"
            value={summary.totalItems}
            icon={<Package className="h-4 w-4 text-neutral-500" />}
          />
          <SummaryCard
            label="Total Quantity"
            value={formatQty(summary.totalQty)}
            icon={<Layers3 className="h-4 w-4 text-neutral-500" />}
          />
          <SummaryCard
            label="Meter Fabrics"
            value={summary.meterCount}
            icon={<ArrowUpDown className="h-4 w-4 text-neutral-500" />}
          />
          <SummaryCard
            label="KG Fabrics"
            value={summary.kgCount}
            icon={<Boxes className="h-4 w-4 text-neutral-500" />}
          />
        </div>

        <div className="rounded-[28px] border border-neutral-200 bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-neutral-100 p-2.5">
              <Search className="h-4 w-4 text-neutral-700" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Search & Filters
              </h2>
              <p className="text-sm text-neutral-500">
                Filter fabric inventory by keyword, unit, and sorting.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative xl:col-span-2">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by fabric name, code, category..."
                className="h-11 w-full rounded-2xl border border-neutral-200 bg-white pl-10 pr-4 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-black"
              />
            </div>

            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className={inputClass}
            >
              <option value="">All Units</option>
              <option value="meter">Meter</option>
              <option value="kg">KG</option>
            </select>

            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-11 flex-1 rounded-2xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-black"
              >
                <option value="updatedAt">Updated</option>
                <option value="createdAt">Created</option>
                <option value="name">Name</option>
                <option value="code">Code</option>
                <option value="currentQuantity">Quantity</option>
              </select>

              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="h-11 w-28 rounded-2xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none transition focus:border-black"
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => fetchInventory(true)}
              className="rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Apply Filters
            </button>

            <button
              onClick={handleReset}
              className="rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-sm text-neutral-500">
              Loading fabric inventory...
            </div>
          ) : error ? (
            <div className="p-12 text-center text-sm text-red-600">{error}</div>
          ) : filteredRows.length === 0 ? (
            <div className="p-12 text-center text-sm text-neutral-500">
              No inventory found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-100/80 text-left text-neutral-600">
                  <tr>
                    <th className="px-5 py-3.5 font-medium">Fabric</th>
                    <th className="px-5 py-3.5 font-medium">Code</th>
                    <th className="px-5 py-3.5 font-medium">Category</th>
                    <th className="px-5 py-3.5 font-medium">Unit</th>
                    <th className="px-5 py-3.5 font-medium">Current Qty</th>
                    <th className="px-5 py-3.5 font-medium">Updated</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((item) => (
                    <tr
                      key={item._id}
                      className="border-t border-neutral-100 transition hover:bg-neutral-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
                            {item?.imageLink ? (
                              <Image
                                src={item.imageLink}
                                alt={item.name || "fabric"}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[11px] text-neutral-400">
                                No Img
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-neutral-900">
                              {item?.name || "—"}
                            </p>
                            <p className="mt-1 text-xs text-neutral-500">
                              <StatusBadge value={item?.status || "active"} />
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-xl bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700">
                          {item?.code || "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-neutral-700">
                        {item?.category || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                          {item?.unit || "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-neutral-900">
                          {formatQty(getQty(item))}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-neutral-500">
                        {item?.updatedAt
                          ? new Date(item.updatedAt).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon }) {
  return (
    <div className="rounded-[24px] border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-500">{label}</span>
        <div className="rounded-xl bg-neutral-100 p-2">{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

function StatusBadge({ value }) {
  const map = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    inactive: "bg-neutral-100 text-neutral-700 border-neutral-200",
    discontinued: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        map[value] || "bg-neutral-100 text-neutral-700 border-neutral-200"
      }`}
    >
      {value}
    </span>
  );
}