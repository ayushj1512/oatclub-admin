"use client";

import { useEffect, useState } from "react";
import { useAdminProductStore } from "@/store/adminProductStore";

/* ============================================================
   PRODUCTS → PRICING PAGE
============================================================ */
export default function ProductPricingPage() {
  const {
    products,
    fetchProducts,
    updateProduct,
    loading,
    saving,
  } = useAdminProductStore();

  const [edited, setEdited] = useState({});
const [search, setSearch] = useState("");
const [sort, setSort] = useState("");
  /* -------------------------------
     FETCH PRODUCTS
  -------------------------------- */
  useEffect(() => {
    fetchProducts({ limit: 50 });
  }, []);

  /* -------------------------------
     HANDLERS
  -------------------------------- */
  const handleChange = (id, field, value) => {
    setEdited((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const filteredProducts = products
  .filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku || "").toLowerCase().includes(search.toLowerCase())
  )
  .sort((a, b) => {
    if (sort === "title-asc") return a.title.localeCompare(b.title);
    if (sort === "title-desc") return b.title.localeCompare(a.title);
    if (sort === "price-asc") return a.price - b.price;
    if (sort === "price-desc") return b.price - a.price;
    return 0;
  });


  const handleSave = async (product) => {
    const changes = edited[product._id];
    if (!changes) return;

    await updateProduct(product._id, {
      price: Number(changes.price ?? product.price),
      compareAtPrice:
        changes.compareAtPrice === ""
          ? null
          : Number(changes.compareAtPrice ?? product.compareAtPrice),
      currency: changes.currency ?? product.currency,
      taxClass: changes.taxClass ?? product.taxClass,
    });

    setEdited((prev) => {
      const copy = { ...prev };
      delete copy[product._id];
      return copy;
    });
  };

  /* -------------------------------
     RENDER
  -------------------------------- */
  return (
     <div className="p-6 bg-[#f4f6f8] min-h-screen">
  {/* ================= MAIN WRAPPER ================= */}
  <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
    {/* ================= HEADER ================= */}
    <div className="px-6 py-5 border-b border-gray-200 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Product Pricing
          </h1>
          <p className="text-sm text-gray-500">
            Manage prices, discounts, and tax configuration
          </p>
        </div>

        <div className="text-xs text-gray-400">
          Inline save per product
        </div>
      </div>

      {/* ================= SEARCH + SORT ================= */}
      <div className="flex flex-wrap gap-3">
        {/* SEARCH */}
        <input
          type="text"
          placeholder="Search by product name or SKU"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />

        {/* SORT */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        >
          <option value="">Sort by</option>
          <option value="title-asc">Title (A → Z)</option>
          <option value="title-desc">Title (Z → A)</option>
          <option value="price-asc">Price (Low → High)</option>
          <option value="price-desc">Price (High → Low)</option>
        </select>
      </div>
    </div>

    {/* ================= TABLE ================= */}
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-gray-600 text-[11px] uppercase tracking-wide">
          <tr>
            <th className="p-4 text-left">Product</th>
            <th className="p-4 w-32">Price</th>
            <th className="p-4 w-36">Compare At</th>
            <th className="p-4 w-24">Currency</th>
            <th className="p-4 w-32">Tax Class</th>
            <th className="p-4 w-28 text-right">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-200">
          {loading && (
            <tr>
              <td colSpan="6" className="p-8 text-center text-gray-500">
                Loading product pricing…
              </td>
            </tr>
          )}

          {!loading && filteredProducts.length === 0 && (
            <tr>
              <td colSpan="6" className="p-8 text-center text-gray-400">
                No products found
              </td>
            </tr>
          )}

          {filteredProducts.map((p) => {
            const edit = edited[p._id] || {};
            const isDirty = Boolean(edited[p._id]);

            return (
              <tr
                key={p._id}
                className="hover:bg-gray-50 transition"
              >
                {/* PRODUCT */}
                <td className="p-4">
                  <div className="font-medium text-gray-900">
                    {p.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    SKU: {p.sku || "—"}
                  </div>
                </td>

                {/* PRICE */}
                <td className="p-4">
                  <input
                    type="number"
                    value={edit.price ?? p.price}
                    onChange={(e) =>
                      handleChange(p._id, "price", e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </td>

                {/* COMPARE AT */}
                <td className="p-4">
                  <input
                    type="number"
                    placeholder="Optional"
                    value={
                      edit.compareAtPrice ??
                      p.compareAtPrice ??
                      ""
                    }
                    onChange={(e) =>
                      handleChange(
                        p._id,
                        "compareAtPrice",
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </td>

                {/* CURRENCY */}
                <td className="p-4">
                  <select
                    value={edit.currency ?? p.currency}
                    onChange={(e) =>
                      handleChange(
                        p._id,
                        "currency",
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                  </select>
                </td>

                {/* TAX */}
                <td className="p-4">
                  <select
                    value={edit.taxClass ?? p.taxClass}
                    onChange={(e) =>
                      handleChange(
                        p._id,
                        "taxClass",
                        e.target.value
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    <option value="standard">Standard</option>
                    <option value="reduced">Reduced</option>
                    <option value="zero">Zero</option>
                  </select>
                </td>

                {/* ACTION */}
                <td className="p-4 text-right">
                  <button
                    disabled={saving || !isDirty}
                    onClick={() => handleSave(p)}
                    className={`px-4 py-1.5 text-xs rounded-lg font-medium transition
                      ${
                        isDirty
                          ? "bg-blue-600 hover:bg-blue-700 text-white shadow"
                          : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      }
                      disabled:opacity-50
                    `}
                  >
                    Save
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
</div>

  );
}
