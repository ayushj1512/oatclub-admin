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
import { Search, Download, Plus, CheckCircle, EyeOff } from "lucide-react";
import * as XLSX from "xlsx";

import { useNewsletterAdminStore } from "@/stores/newsletterStore";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL + "/api/newsletters/subscribers";

// simple email regex
const validEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function NewsletterAdminPage() {
  /* ---------------- STORE ---------------- */
  const {
    subscribers,
    fetchSubscribers,
    loading,
    error,
  } = useNewsletterAdminStore();

  /* ---------------- LOCAL UI STATE ---------------- */
  const [globalFilter, setGlobalFilter] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);

  /* ---------------- FETCH DATA ---------------- */
  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

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

      await fetchSubscribers(); // refresh list
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
          <span className="font-medium text-gray-800">
            {info.getValue()}
          </span>
        ),
      }),

      columnHelper.accessor("isVerified", {
        header: "Verified",
        cell: (info) =>
          info.getValue() ? (
            <span className="text-green-600 font-semibold flex items-center gap-1">
              <CheckCircle size={14} /> Yes
            </span>
          ) : (
            <span className="text-red-500 flex items-center gap-1">
              <EyeOff size={14} /> No
            </span>
          ),
      }),

      columnHelper.accessor("isActive", {
        header: "Status",
        cell: (info) =>
          info.getValue() ? (
            <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">
              Active
            </span>
          ) : (
            <span className="px-2 py-1 rounded-full bg-gray-200 text-gray-600 text-xs">
              Inactive
            </span>
          ),
      }),

      columnHelper.accessor("subscribedAt", {
        header: "Subscribed On",
        cell: (info) =>
          new Date(info.getValue()).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: subscribers,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  /* ---------------- EXPORT ---------------- */
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(subscribers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Subscribers");
    XLSX.writeFile(wb, "newsletter_subscribers.xlsx");
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="p-6 w-full max-w-7xl mx-auto">
      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold mb-6 text-blue-700"
      >
        Newsletter Subscribers
      </motion.h1>

      {/* SEARCH + EXPORT */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex items-center border px-3 py-2 rounded-lg bg-white shadow-sm w-full md:w-1/3">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            placeholder="Search email..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="ml-2 outline-none text-sm w-full"
          />
        </div>

        <button
          onClick={exportExcel}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 text-sm"
        >
          <Download size={16} /> Export
        </button>
      </div>

      {/* ADD EMAIL */}
      <div className="flex gap-3 mb-6">
        <input
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="Add new email..."
          className="border rounded-lg px-3 py-2 text-sm bg-white shadow-sm flex-1"
        />

        <button
          onClick={addSubscriber}
          disabled={adding}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 text-sm disabled:opacity-50"
        >
          <Plus size={16} />
          {adding ? "Adding..." : "Add"}
        </button>
      </div>

      {/* TABLE */}
      <motion.div className="overflow-x-auto border rounded-xl shadow bg-white">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading...</div>
        ) : error ? (
          <div className="p-6 text-center text-red-500">{error}</div>
        ) : (
          <table className="w-full text-sm text-gray-800">
            <thead className="bg-blue-50 border-b">
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className="p-3 cursor-pointer text-left"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {{
                        asc: " ↑",
                        desc: " ↓",
                      }[header.column.getIsSorted()] ?? null}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-3">
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
                  <td colSpan={4} className="p-4 text-center text-gray-500">
                    No subscribers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </motion.div>

      {/* PAGINATION */}
      <div className="flex items-center justify-between mt-4 text-sm">
        <span>
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </span>

        <div className="flex gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-3 py-1 border rounded disabled:opacity-40"
          >
            Prev
          </button>

          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-3 py-1 border rounded disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
