"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  RefreshCw,
  Download,
  Upload,
  Eye,
  Package,
  Layers,
  AlertCircle,
  Activity,
} from "lucide-react";
import * as XLSX from "xlsx";
import useFabricStore from "@/store/fabricStore";

const statusOptions = ["active", "inactive", "discontinued"];
const movementOptions = ["idle", "incoming", "in_use", "outgoing"];
const unitOptions = ["meter", "kg"];

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function FabricsPage() {
  const {
    fabrics,
    fabricStats,
    loading,
    error,
    filters,
    pagination,
    setFilters,
    fetchFabrics,
    fetchFabricStats,
    updateFabricStatus,
    activateFabric,
    deleteFabric,
  } = useFabricStore();

  const [searchText, setSearchText] = useState(filters.q || "");

  useEffect(() => {
    fetchFabrics();
    fetchFabricStats();
  }, []);

  const stats = useMemo(
    () => [
      {
        label: "Total Fabrics",
        value: fabricStats?.total || 0,
        icon: Layers,
      },
      {
        label: "Active",
        value: fabricStats?.active || 0,
        icon: Activity,
      },
      {
        label: "Zero Stock",
        value: fabricStats?.zeroStock || 0,
        icon: AlertCircle,
      },
      {
        label: "Total Stock",
        value: fabricStats?.totalStock || 0,
        icon: Package,
      },
    ],
    [fabricStats]
  );

  const handleSearch = () => {
    fetchFabrics({ q: searchText, page: 1 });
  };

  const handleFilterChange = (key, value) => {
    const next = { [key]: value, page: 1 };
    setFilters(next);
    fetchFabrics(next);
  };

  const handleReset = () => {
    setSearchText("");
    fetchFabrics({
      q: "",
      status: "",
      movementStatus: "",
      category: "",
      unit: "",
      isActive: "",
      page: 1,
    });
  };

  const handleExportExcel = () => {
    const rows = fabrics.map((item) => ({
      Code: item.code,
      Name: item.name,
      Category: item.category,
      Unit: item.unit,
      Stock: item.currentStock,
      Status: item.status,
      Movement: item.movementStatus,
      "Product Codes": item.associatedProductCodes?.join(", ") || "",
      "Product Count": item.associatedProductsCount || 0,
      GSM: item.gsm || "",
      Width: item.width || "",
      Notes: item.notes || "",
      "Last Stock Updated": formatDate(item.lastStockUpdatedAt),
      "Created At": formatDate(item.createdAt),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Fabrics");
    XLSX.writeFile(wb, `fabric-master-${Date.now()}.xlsx`);
  };

  const handleStatusToggle = async (fabric) => {
    if (fabric.isActive === false) {
      await activateFabric(fabric._id);
      return;
    }

    const ok = window.confirm(`Deactivate ${fabric.code}?`);
    if (!ok) return;

    await deleteFabric(fabric._id);
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4 text-neutral-950 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">
              Fabric Management
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
              Fabrics
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Manage fabric master, stock, logs, pricing and product mapping.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-100"
            >
              <Download size={16} />
              Export Excel
            </button>

            <Link
              href="/fabrics/import"
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-100"
            >
              <Upload size={16} />
              Import Excel
            </Link>

            <Link
              href="/fabrics/add-fabric"
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-950 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              <Plus size={16} />
              Add Fabric
            </Link>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-neutral-500">
                    {item.label}
                  </p>
                  <Icon size={17} className="text-neutral-400" />
                </div>
                <p className="mt-3 text-2xl font-semibold">{item.value}</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto]">
            <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3">
              <Search size={16} className="text-neutral-400" />
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search by fabric name, code, category..."
                className="h-11 w-full bg-transparent text-sm outline-none"
              />
            </div>

            <select
              value={filters.status || ""}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none"
            >
              <option value="">All Status</option>
              {statusOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={filters.movementStatus || ""}
              onChange={(e) =>
                handleFilterChange("movementStatus", e.target.value)
              }
              className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none"
            >
              <option value="">All Movement</option>
              {movementOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={filters.unit || ""}
              onChange={(e) => handleFilterChange("unit", e.target.value)}
              className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none"
            >
              <option value="">All Units</option>
              {unitOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={filters.isActive || ""}
              onChange={(e) => handleFilterChange("isActive", e.target.value)}
              className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none"
            >
              <option value="">All</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>

            <div className="flex gap-2">
              <button
                onClick={handleSearch}
                className="h-11 rounded-xl bg-neutral-950 px-4 text-sm font-medium text-white"
              >
                Search
              </button>
              <button
                onClick={handleReset}
                className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-200 p-4">
            <div>
              <h2 className="text-sm font-semibold">Fabric Master</h2>
              <p className="text-xs text-neutral-500">
                {pagination.total} records found
              </p>
            </div>

            <div className="flex gap-2 text-xs">
              <Link href="/fabrics/inventory" className="rounded-lg border px-3 py-2">
                Inventory
              </Link>
              <Link href="/fabrics/logs" className="rounded-lg border px-3 py-2">
                Logs
              </Link>
              <Link
                href="/fabrics/price-logs"
                className="rounded-lg border px-3 py-2"
              >
                Price Logs
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Fabric</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Movement</th>
                  <th className="px-4 py-3">Products</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-neutral-500">
                      Loading fabrics...
                    </td>
                  </tr>
                ) : fabrics.length ? (
                  fabrics.map((fabric) => (
                    <tr key={fabric._id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 overflow-hidden rounded-xl bg-neutral-100">
                            {fabric.imageLink ? (
                              <img
                                src={fabric.imageLink}
                                alt={fabric.name}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>

                          <div>
                            <p className="font-semibold">{fabric.name}</p>
                            <p className="text-xs text-neutral-500">{fabric.code}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">{fabric.category || "-"}</td>

                      <td className="px-4 py-3">
                        <span
                          className={`font-semibold ${
                            Number(fabric.currentStock || 0) <= 0
                              ? "text-red-600"
                              : "text-neutral-950"
                          }`}
                        >
                          {fabric.currentStock || 0}
                        </span>
                      </td>

                      <td className="px-4 py-3">{fabric.unit}</td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium">
                          {fabric.status}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-neutral-950 px-3 py-1 text-xs font-medium text-white">
                          {fabric.movementStatus}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {fabric.associatedProductsCount || 0}
                      </td>

                      <td className="px-4 py-3 text-neutral-500">
                        {formatDate(fabric.updatedAt)}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/fabrics/${fabric._id}`}
                            className="rounded-lg border border-neutral-200 p-2 hover:bg-neutral-100"
                            title="View"
                          >
                            <Eye size={16} />
                          </Link>

                          <button
                            onClick={() => handleStatusToggle(fabric)}
                            className="rounded-lg border border-neutral-200 px-3 py-2 text-xs hover:bg-neutral-100"
                          >
                            {fabric.isActive === false ? "Activate" : "Deactivate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-neutral-500">
                      No fabrics found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-neutral-200 p-4 text-sm md:flex-row">
            <p className="text-neutral-500">
              Page {pagination.page} of {pagination.totalPages}
            </p>

            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1 || loading}
                onClick={() => fetchFabrics({ page: pagination.page - 1 })}
                className="rounded-xl border border-neutral-200 px-4 py-2 disabled:opacity-40"
              >
                Previous
              </button>

              <button
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => fetchFabrics({ page: pagination.page + 1 })}
                className="rounded-xl border border-neutral-200 px-4 py-2 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
