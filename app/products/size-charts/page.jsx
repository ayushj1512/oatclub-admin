"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { Plus, Eye, Trash2, AlertTriangle, X } from "lucide-react";

import { useAdminSizeChartStore } from "@/store/adminSizeChartStore";
import { useCategoryStore } from "@/store/categorystore";

export default function SizeChartsPage() {
  const {
    sizeCharts,
    fetchSizeCharts,
    deleteSizeChart,
    updateSizeChart,
    loading,
    saving,
    error,
  } = useAdminSizeChartStore();

  const {
    categories,
    fetchCategories,
    loading: categoryLoading,
  } = useCategoryStore();

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    fetchSizeCharts();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= FIND MISSING CATEGORIES ================= */
  const missingCategories = useMemo(() => {
    if (!Array.isArray(categories) || categories.length === 0) return [];

    const covered = new Set();

    (Array.isArray(sizeCharts) ? sizeCharts : []).forEach((chart) => {
      (chart?.categories || []).forEach((c) => {
        covered.add(String(c?._id || c));
      });
    });

    return categories.filter((cat) => !covered.has(String(cat._id)));
  }, [categories, sizeCharts]);

  /* ================= REMOVE CATEGORY FROM SIZECHART (DOUBLE CONFIRM) ================= */
  const handleRemoveCategory = async (chart, category) => {
    const chartId = chart?._id;
    if (!chartId) return;

    const categoryId = String(category?._id || category);
    const categoryName = category?.name || categoryId;
    const chartTitle = chart?.title || "this size chart";

    // ✅ Confirm 1
    const first = confirm(
      `Remove "${categoryName}" from "${chartTitle}"?`
    );
    if (!first) return;

    // ✅ Confirm 2 (strong warning)
    const second = confirm(
      `This action cannot be undone.\n\nAre you 100% sure you want to remove "${categoryName}"?`
    );
    if (!second) return;

    try {
      const updatedCategories = (chart?.categories || [])
        .map((c) => String(c?._id || c))
        .filter((id) => id !== categoryId);

      await updateSizeChart(chartId, {
        categories: updatedCategories,
      });

      // refresh list
      fetchSizeCharts();
    } catch (err) {
      console.error(err);
    }
  };

  /* ================= RENDER CATEGORIES WITH REMOVE BUTTON ================= */
  const renderCategories = (chart) => {
    const cats = Array.isArray(chart?.categories) ? chart.categories : [];

    if (cats.length === 0) {
      return <span className="text-gray-500 text-xs">No categories</span>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {cats.map((cat, idx) => {
          const id = String(cat?._id || cat);
          const name = typeof cat === "object" ? cat?.name : id;

          return (
            <span
              key={`${id}-${idx}`}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white border border-gray-300 text-gray-900 text-xs font-medium"
            >
              {name}

              <button
                type="button"
                onClick={() => handleRemoveCategory(chart, cat)}
                disabled={saving}
                className="ml-1 rounded-full p-0.5 hover:bg-gray-200 transition disabled:opacity-50"
                title="Remove from chart"
              >
                <X size={12} className="text-gray-900" />
              </button>
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto text-gray-900">
      {/* ================= HEADER ================= */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Size Charts</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage category-wise size charts for products
          </p>
        </div>

        <Link
          href="/products/size-charts/add"
          className="inline-flex items-center gap-2 bg-black hover:bg-gray-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition"
        >
          <Plus size={16} />
          Add Size Chart
        </Link>
      </div>

      {/* ================= ALERT: Missing Categories ================= */}
      {!categoryLoading && (
        <>
          {missingCategories.length > 0 ? (
            <div className="mb-6 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 mt-0.5 text-gray-900" />

                <div className="flex-1">
                  <p className="font-semibold">
                    {missingCategories.length} categor
                    {missingCategories.length > 1 ? "ies" : "y"} missing size
                    chart
                  </p>

                  <p className="text-gray-700 mt-1">
                    These categories do not have any size chart assigned:
                  </p>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {missingCategories.map((cat) => (
                      <span
                        key={cat._id}
                        className="px-2.5 py-1 rounded-full bg-white border border-gray-300 text-gray-900 text-xs font-medium"
                      >
                        {cat.name}
                      </span>
                    ))}
                  </div>
                </div>

                <Link
                  href="/products/size-charts/add"
                  className="shrink-0 inline-flex items-center justify-center rounded-lg bg-black hover:bg-gray-900 text-white px-3 py-2 text-xs font-semibold transition"
                >
                  Fix Now
                </Link>
              </div>
            </div>
          ) : (
            <div className="mb-6 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 mt-0.5 flex items-center justify-center rounded-full bg-black text-white text-xs">
                  ✓
                </span>

                <div className="flex-1">
                  <p className="font-semibold">Everything is going right ✅</p>
                  <p className="text-gray-700 mt-1">
                    All categories have size charts assigned.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ================= ERROR ================= */}
      {error && (
        <div className="mb-6 rounded-lg bg-white border border-gray-300 text-gray-900 px-4 py-3 text-sm shadow-sm">
          {error}
        </div>
      )}

      {/* ================= TABLE CARD ================= */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-300">
        <table className="w-full text-sm">
          <thead className="bg-white text-gray-900 border-b border-gray-300">
            <tr>
              <th className="px-6 py-4 font-medium text-left">Title</th>
              <th className="px-6 py-4 font-medium text-left">Unit</th>
              <th className="px-6 py-4 font-medium text-left">Columns</th>
              <th className="px-6 py-4 font-medium text-left">Categories</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {/* Loading */}
            {loading && (
              <tr>
                <td colSpan="5" className="px-6 py-10 text-center text-gray-600">
                  Loading size charts...
                </td>
              </tr>
            )}

            {/* Empty */}
            {!loading && sizeCharts.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-gray-600">
                  No size charts created yet
                </td>
              </tr>
            )}

            {/* Rows */}
            {sizeCharts.map((chart) => (
              <tr key={chart._id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 font-medium text-gray-900">
                  {chart.title}
                </td>

                <td className="px-6 py-4 uppercase text-gray-700">
                  {chart.unit}
                </td>

                <td className="px-6 py-4 text-gray-700">
                  {chart.headers.length}
                </td>

                <td className="px-6 py-4">{renderCategories(chart)}</td>

                <td className="px-6 py-4">
                  <div className="flex justify-end gap-4">
                    <Link
                      href={`/products/size-charts/${chart._id}`}
                      className="inline-flex items-center gap-1 text-gray-900 hover:text-gray-600 font-medium transition"
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
                      className="inline-flex items-center gap-1 text-gray-900 hover:text-gray-600 transition"
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

        {/* ================= FOOTER NOTE ================= */}
        <div className="px-6 py-3 text-xs text-gray-600 border-t border-gray-300">
          Tip: Click the <span className="font-semibold">×</span> on a category
          chip to remove it from that size chart (double confirmation required).
        </div>
      </div>
    </div>
  );
}
