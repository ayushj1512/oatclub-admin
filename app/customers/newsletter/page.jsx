"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { motion } from "framer-motion";
import { Search, Download, Plus, X } from "lucide-react";
import * as XLSX from "xlsx";

import { useNewsletterAdminStore } from "@/store/newsletterStore";

/* ✅ ENV SAFE BASE URL */
const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:5000";

/* ✅ API BASE */
const API_BASE = `${BASE_URL}/api/newsletters`;

/* simple email regex */
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function NewsletterAdminPage() {
  /* ---------------- STORE ---------------- */
  const { subscribers, total, fetchSubscribers, loading, error } =
    useNewsletterAdminStore();

  /* ---------------- LOCAL UI STATE ---------------- */
  const [globalFilter, setGlobalFilter] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);

  /* ✅ Page size */
  const [pageSize, setPageSize] = useState(100);
  const pageSizeOptions = [25, 50, 100, 250];

  /* ---------------- FETCH DATA ---------------- */
  useEffect(() => {
    fetchSubscribers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- ADD SUBSCRIBER ---------------- */
  const addSubscriber = async () => {
    if (!validEmail(newEmail)) {
      alert("Invalid email format");
      return;
    }

    setAdding(true);
    try {
      const res = await fetch(`${API_BASE}/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email: newEmail }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.message || "Failed to add subscriber");
      }

      await fetchSubscribers();
      setNewEmail("");
    } catch (e) {
      alert(e.message || "Network error");
    } finally {
      setAdding(false);
    }
  };

  /* ---------------- TABLE CONFIG ---------------- */
  const columnHelper = createColumnHelper();

  const columns = useMemo(
    () => [
      columnHelper.accessor("email", {
        header: "Email",
        cell: (info) => (
          <span className="font-medium text-black">{info.getValue()}</span>
        ),
      }),

      columnHelper.accessor("isVerified", {
        header: "Verified",
        cell: (info) => (info.getValue() ? "Yes" : "No"),
      }),

      columnHelper.accessor("isActive", {
        header: "Status",
        cell: (info) => (info.getValue() ? "Active" : "Inactive"),
      }),

      columnHelper.accessor("subscribedAt", {
        header: "Subscribed",
        cell: (info) => {
          const val = info.getValue();
          if (!val) return "-";
          return new Date(val).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data: subscribers || [],
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize,
      },
    },
  });

  useEffect(() => {
    table.setPageSize(pageSize);
  }, [pageSize, table]);

  /* ---------------- EXPORT ---------------- */
  const exportExcel = () => {
    const clean = (subscribers || []).map((s) => ({
      email: s.email,
      isActive: s.isActive,
      isVerified: s.isVerified,
      subscribedAt: s.subscribedAt,
      source: s.source,
      tags: Array.isArray(s.tags) ? s.tags.join(", ") : "",
    }));

    const ws = XLSX.utils.json_to_sheet(clean);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Subscribers");
    XLSX.writeFile(wb, "newsletter_subscribers.xlsx");
  };

  /* ---------------- UI HELPERS ---------------- */
  const pageIndex = table.getState().pagination.pageIndex;
  const currentRows = table.getRowModel().rows.length;
  const showingFrom = currentRows ? pageIndex * pageSize + 1 : 0;
  const showingTo = pageIndex * pageSize + currentRows;

  return (
    <div className="p-6 w-full max-w-7xl mx-auto text-black">
      {/* HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-semibold tracking-tight">
          Newsletter Subscribers
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Premium admin view — search, add, export & manage your subscribers.
        </p>

        {/* STAT CHIP */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-neutral-900 text-white px-4 py-2 text-sm shadow-sm">
          <span className="opacity-80">Total</span>
          <span className="font-semibold">{total || subscribers?.length || 0}</span>
        </div>
      </motion.div>

      {/* TOP BAR */}
      <div className="flex flex-col lg:flex-row gap-3 mb-6 items-start lg:items-center justify-between">
        {/* SEARCH */}
        <div className="w-full lg:w-[380px]">
          <div className="flex items-center rounded-xl bg-white shadow-sm ring-1 ring-black/5 px-3 py-2">
            <Search className="w-4 h-4 text-neutral-500" />
            <input
              placeholder="Search by email..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="ml-2 outline-none text-sm w-full bg-transparent placeholder:text-neutral-400"
            />
            {globalFilter && (
              <button
                onClick={() => setGlobalFilter("")}
                className="ml-2 text-neutral-400 hover:text-black transition"
                title="Clear"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* RIGHT CONTROLS */}
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* PAGE SIZE */}
          <div className="flex items-center gap-2 rounded-xl bg-white shadow-sm ring-1 ring-black/5 px-3 py-2">
            <span className="text-sm text-neutral-500">Rows</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="text-sm outline-none bg-transparent"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          {/* EXPORT */}
          <button
            onClick={exportExcel}
            disabled={!subscribers?.length}
            className="flex items-center justify-center gap-2 rounded-xl bg-black text-white px-5 py-2 text-sm shadow-sm hover:opacity-90 disabled:opacity-40 transition w-full sm:w-auto"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* ADD SUBSCRIBER */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 rounded-xl bg-white shadow-sm ring-1 ring-black/5 px-3 py-2">
          <input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSubscriber()}
            placeholder="Add new email..."
            className="w-full outline-none text-sm bg-transparent placeholder:text-neutral-400"
          />
        </div>

        <button
          onClick={addSubscriber}
          disabled={adding}
          className="flex items-center justify-center gap-2 rounded-xl bg-black text-white px-4 py-2 text-sm shadow-sm hover:opacity-90 disabled:opacity-40 transition"
        >
          <Plus size={16} />
          {adding ? "Adding..." : "Add"}
        </button>
      </div>

      {/* TABLE */}
      <motion.div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-neutral-500">Loading...</div>
        ) : error ? (
          <div className="p-12 text-center text-neutral-500">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-black/5">
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id}>
                    {group.headers.map((header) => (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className="px-5 py-4 text-left font-semibold cursor-pointer select-none whitespace-nowrap"
                      >
                        <div className="flex items-center gap-2">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {{
                            asc: "↑",
                            desc: "↓",
                          }[header.column.getIsSorted()] ?? null}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>

              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-black/5 hover:bg-neutral-50/70 transition"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-5 py-4 text-neutral-700 whitespace-nowrap"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}

                {table.getRowModel().rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-12 text-center text-neutral-500"
                    >
                      No subscribers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* PAGINATION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-6 gap-3 text-sm">
        <span className="text-neutral-600">
          Showing{" "}
          <span className="text-black font-medium">
            {currentRows ? `${showingFrom}-${showingTo}` : "0"}
          </span>{" "}
          of{" "}
          <span className="text-black font-medium">
            {table.getFilteredRowModel().rows.length}
          </span>
        </span>

        <div className="flex gap-2">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-2 rounded-xl bg-white shadow-sm ring-1 ring-black/5 hover:bg-neutral-50 disabled:opacity-40 transition"
          >
            First
          </button>

          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-2 rounded-xl bg-white shadow-sm ring-1 ring-black/5 hover:bg-neutral-50 disabled:opacity-40 transition"
          >
            Prev
          </button>

          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-2 rounded-xl bg-white shadow-sm ring-1 ring-black/5 hover:bg-neutral-50 disabled:opacity-40 transition"
          >
            Next
          </button>

          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="px-3 py-2 rounded-xl bg-white shadow-sm ring-1 ring-black/5 hover:bg-neutral-50 disabled:opacity-40 transition"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}
