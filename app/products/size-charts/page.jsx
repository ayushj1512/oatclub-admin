"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Plus, Eye, Trash2 } from "lucide-react";
import { useAdminSizeChartStore } from "@/store/adminSizeChartStore";

export default function SizeChartsPage() {
  const {
    sizeCharts,
    fetchSizeCharts,
    deleteSizeChart,
    loading,
    error,
  } = useAdminSizeChartStore();

  useEffect(() => {
    fetchSizeCharts();
  }, []);

  return (
  <div className="p-6 max-w-7xl mx-auto">
    {/* ================= HEADER ================= */}
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Size Charts
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage category-wise size charts for products
        </p>
      </div>

      <Link
        href="/products/size-charts/add"
        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition"
      >
        <Plus size={16} />
        Add Size Chart
      </Link>
    </div>

    {/* ================= ERROR ================= */}
    {error && (
      <div className="mb-6 rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">
        {error}
      </div>
    )}

    {/* ================= TABLE CARD ================= */}
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="px-6 py-4 font-medium">Title</th>
            <th className="px-6 py-4 font-medium">Unit</th>
            <th className="px-6 py-4 font-medium">Columns</th>
            <th className="px-6 py-4 font-medium text-right">
              Actions
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {/* Loading */}
          {loading && (
            <tr>
              <td
                colSpan="4"
                className="px-6 py-10 text-center text-gray-500"
              >
                Loading size charts...
              </td>
            </tr>
          )}

          {/* Empty */}
          {!loading && sizeCharts.length === 0 && (
            <tr>
              <td
                colSpan="4"
                className="px-6 py-12 text-center text-gray-400"
              >
                No size charts created yet
              </td>
            </tr>
          )}

          {/* Rows */}
          {sizeCharts.map((chart) => (
            <tr
              key={chart._id}
              className="hover:bg-gray-50 transition"
            >
              <td className="px-6 py-4 font-medium text-gray-900">
                {chart.title}
              </td>

              <td className="px-6 py-4 uppercase text-gray-600">
                {chart.unit}
              </td>

              <td className="px-6 py-4 text-gray-600">
                {chart.headers.length}
              </td>

              <td className="px-6 py-4">
                <div className="flex justify-end gap-4">
                  <Link
                    href={`/products/size-charts/${chart._id}`}
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium transition"
                  >
                    <Eye size={14} />
                    View
                  </Link>

                  <button
                    onClick={() => {
                      if (
                        confirm(
                          "Are you sure you want to delete this size chart?"
                        )
                      ) {
                        deleteSizeChart(chart._id);
                      }
                    }}
                    className="inline-flex items-center gap-1 text-gray-400 hover:text-red-600 transition"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

}
