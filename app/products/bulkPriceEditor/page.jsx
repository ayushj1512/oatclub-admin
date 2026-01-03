"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdminProductStore } from "@/store/adminProductStore";
import { useCategoryStore } from "@/store/categorystore";
import { useAdminCollectionStore } from "@/store/adminCollectionStore";
import { toast } from "react-hot-toast";
import Image from "next/image";

export default function BulkPriceEditorPage() {
  /* ---------------- STORES ---------------- */
  const {
    products,
    loading,
    saving,
    page,
    pages,
    total,
    fetchProducts,

    bulkSelectedIds,
    bulkPriceDraft,
    toggleBulkSelect,
    selectAllOnPage,
    clearBulkSelection,
    setBulkDraft,
    applyBulkPricingRule,
    saveBulkPricing,
  } = useAdminProductStore();

  const { categories, fetchCategories } = useCategoryStore();
  const { collections, fetchCollections } = useAdminCollectionStore();

  /* ---------------- FILTER STATE ---------------- */
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [collection, setCollection] = useState("");
  const [status, setStatus] = useState(""); // published | draft | unpublished | all
  const [limit, setLimit] = useState(20);

  /* ---------------- BULK RULE STATE ---------------- */
  const [bulkField, setBulkField] = useState("price"); // price | compareAtPrice
  const [bulkMode, setBulkMode] = useState("set"); // set | inc_pct | dec_pct | inc_amt | dec_amt
  const [bulkValue, setBulkValue] = useState("");

  /* ---------------- FETCH DROPDOWNS ON LOAD ---------------- */
  useEffect(() => {
    fetchCategories();
    fetchCollections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- FETCH PRODUCTS (filters) ---------------- */
  const queryParams = useMemo(() => {
  const q = { page: 1, limit: 99999 };

    if (search) q.search = search;
    if (category) q.category = category;
    if (collection) q.collection = collection;

    // map status to backend fields
    if (status === "published") {
      q.isActive = true;
      q.isDraft = false;
    }
    if (status === "draft") {
      q.isActive = true;
      q.isDraft = true;
    }
    if (status === "unpublished") {
      q.isActive = false;
    }

    return q;
  }, [search, category, collection, status, limit]);

  useEffect(() => {
    fetchProducts(queryParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams]);

  /* ---------------- HELPERS ---------------- */
  const isSelected = (id) => bulkSelectedIds.includes(id);

  const getDraftValue = (id, field, fallback) =>
    bulkPriceDraft?.[id]?.[field] ?? fallback ?? "";

  const changedCount = useMemo(
    () => Object.keys(bulkPriceDraft || {}).length,
    [bulkPriceDraft]
  );

  const handleBulkApply = () => {
    if (!bulkValue || isNaN(Number(bulkValue))) {
      toast.error("Enter valid number");
      return;
    }
    applyBulkPricingRule({
      mode: bulkMode,
      field: bulkField,
      value: Number(bulkValue),
    });
  };

  /* ---------------- UI ---------------- */
  return (
  <div className="p-6 space-y-5 bg-gray-50 min-h-screen">
  {/* Header */}
  <div className="flex items-start justify-between">
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">
        Bulk Price Editor
      </h1>
      <p className="text-sm text-gray-500 mt-1">
        Edit product pricing in bulk with smart rules. Minimal, fast & safe.
      </p>
    </div>

    <div className="text-xs text-gray-500">
      Selected:{" "}
      <span className="font-semibold text-gray-900">
        {bulkSelectedIds.length}
      </span>{" "}
      • Changed:{" "}
      <span className="font-semibold text-gray-900">{changedCount}</span>
    </div>
  </div>

  {/* FILTER BAR */}
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search products…"
        className="w-full rounded-xl bg-gray-50 px-4 py-2.5 text-sm outline-none ring-1 ring-transparent focus:ring-blue-500 transition"
      />

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full rounded-xl bg-gray-50 px-4 py-2.5 text-sm outline-none ring-1 ring-transparent focus:ring-blue-500 transition"
      >
        <option value="">All Categories</option>
        {categories?.map((c) => (
          <option key={c._id} value={c.slug || c.name}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        value={collection}
        onChange={(e) => setCollection(e.target.value)}
        className="w-full rounded-xl bg-gray-50 px-4 py-2.5 text-sm outline-none ring-1 ring-transparent focus:ring-blue-500 transition"
      >
        <option value="">All Collections</option>
        {collections?.map((c) => (
          <option key={c._id} value={c._id}>
            {c.title}
          </option>
        ))}
      </select>

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="w-full rounded-xl bg-gray-50 px-4 py-2.5 text-sm outline-none ring-1 ring-transparent focus:ring-blue-500 transition"
      >
        <option value="">All Status</option>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
        <option value="unpublished">Unpublished</option>
      </select>
    </div>

    {/* Utility Buttons */}
    <div className="flex flex-col md:flex-row md:items-center gap-3 mt-4">
      <div className="flex items-center gap-2">
        <button
          onClick={selectAllOnPage}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-900 text-white hover:bg-black transition"
        >
          Select All (Filtered)
        </button>

        <button
          onClick={clearBulkSelection}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition"
        >
          Clear
        </button>
      </div>

      {/* Bulk Rule Controls */}
      <div className="flex flex-wrap items-center gap-2 md:ml-auto">
        <select
          value={bulkField}
          onChange={(e) => setBulkField(e.target.value)}
          className="rounded-xl bg-gray-50 px-4 py-2.5 text-sm outline-none ring-1 ring-transparent focus:ring-blue-500 transition"
        >
          <option value="price">Price</option>
          <option value="compareAtPrice">Compare At Price</option>
        </select>

        <select
          value={bulkMode}
          onChange={(e) => setBulkMode(e.target.value)}
          className="rounded-xl bg-gray-50 px-4 py-2.5 text-sm outline-none ring-1 ring-transparent focus:ring-blue-500 transition"
        >
          <option value="set">Set</option>
          <option value="inc_pct">Increase %</option>
          <option value="dec_pct">Decrease %</option>
          <option value="inc_amt">Increase ₹</option>
          <option value="dec_amt">Decrease ₹</option>
        </select>

        <input
          value={bulkValue}
          onChange={(e) => setBulkValue(e.target.value)}
          placeholder="Value"
          className="w-28 rounded-xl bg-gray-50 px-4 py-2.5 text-sm outline-none ring-1 ring-transparent focus:ring-blue-500 transition"
        />

        <button
          onClick={handleBulkApply}
          disabled={saving}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
        >
          Apply
        </button>

        <button
          onClick={saveBulkPricing}
          disabled={saving || changedCount === 0}
          className="px-5 py-2 rounded-xl text-sm font-semibold bg-gray-900 text-white hover:bg-black transition disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  </div>

  {/* TABLE */}
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
            <th className="p-3">Select</th>
            <th className="p-3">Product</th>
            <th className="p-3">Current</th>
            <th className="p-3">Compare</th>
            <th className="p-3">New Price</th>
            <th className="p-3">New Compare</th>
            <th className="p-3">Diff</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {loading ? (
            <tr>
              <td colSpan={7} className="p-6 text-center text-gray-500">
                Loading...
              </td>
            </tr>
          ) : products?.length ? (
            products.map((p) => {
              const draftPrice = getDraftValue(p._id, "price", p.price);
              const draftCompare = getDraftValue(
                p._id,
                "compareAtPrice",
                p.compareAtPrice
              );

              const diff =
                draftPrice !== "" && p.price
                  ? Number(draftPrice) - Number(p.price)
                  : 0;

              return (
                <tr key={p._id} className="text-sm hover:bg-gray-50 transition">
                  {/* Select */}
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={isSelected(p._id)}
                      onChange={() => toggleBulkSelect(p._id)}
                      className="h-4 w-4 accent-blue-600"
                    />
                  </td>

                  {/* Product */}
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-xl bg-gray-100 overflow-hidden">
                        {p.thumbnail ? (
                          <Image
                            src={p.thumbnail}
                            alt={p.title}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : null}
                      </div>

                      <div>
                        <div className="font-semibold text-gray-900">
                          {p.title}
                        </div>
                        <div className="text-xs text-gray-500">{p.slug}</div>
                      </div>
                    </div>
                  </td>

                  <td className="p-3 text-gray-900 font-medium">₹{p.price}</td>

                  <td className="p-3 text-gray-700">
                    {p.compareAtPrice ? `₹${p.compareAtPrice}` : "-"}
                  </td>

                  <td className="p-3">
                    <input
                      value={draftPrice ?? ""}
                      onChange={(e) =>
                        setBulkDraft(p._id, { price: Number(e.target.value) })
                      }
                      type="number"
                      className="w-28 rounded-xl bg-gray-50 px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-blue-500 transition"
                    />
                  </td>

                  <td className="p-3">
                    <input
                      value={draftCompare ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setBulkDraft(p._id, {
                          compareAtPrice: v === "" ? null : Number(v),
                        });
                      }}
                      type="number"
                      className="w-28 rounded-xl bg-gray-50 px-3 py-2 text-sm outline-none ring-1 ring-transparent focus:ring-blue-500 transition"
                    />
                  </td>

                  <td className="p-3">
                    <span
                      className={`font-semibold ${
                        diff > 0
                          ? "text-blue-600"
                          : diff < 0
                          ? "text-gray-900"
                          : "text-gray-400"
                      }`}
                    >
                      {diff === 0 ? "-" : diff > 0 ? `+₹${diff}` : `₹${diff}`}
                    </span>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={7} className="p-6 text-center text-gray-500">
                No products found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>

    {/* Footer */}
    <div className="flex justify-between items-center px-4 py-3 bg-gray-50 text-xs text-gray-600">
      <div>
        Total: <span className="font-semibold text-gray-900">{total}</span>
      </div>
      <div className="text-gray-500">
        Showing:{" "}
        <span className="font-semibold text-gray-900">{products.length}</span>
      </div>
    </div>
  </div>
</div>


  );
}
