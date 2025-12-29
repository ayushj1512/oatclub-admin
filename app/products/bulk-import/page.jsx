"use client";

import { useEffect, useRef, useState } from "react";
import { useAdminBulkProductStore } from "@/store/adminBulkProductStore";
import { useCategoryStore } from "@/store/categorystore";
import {
  Upload,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  Download,
  ChevronDown,
  X,
} from "lucide-react";



/* =========================================================
   CATEGORY DROPDOWN (MULTI SELECT)
========================================================= */
function CategoryDropdown({ value = [], categories = [], onChange, required }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const cleanValue = Array.isArray(value)
    ? value.filter(Boolean)
    : [];

  const toggle = (slug) => {
    if (cleanValue.includes(slug)) {
      onChange(cleanValue.filter((v) => v !== slug));
    } else {
      onChange([...cleanValue, slug]);
    }
  };

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={ref} className="relative w-64">
      {/* INPUT */}
      <div
        onClick={() => setOpen(!open)}
        className={`min-h-[40px] cursor-pointer rounded-lg px-2 py-1 flex flex-wrap gap-1 items-center
          ${required && cleanValue.length === 0 ? "border border-red-400 bg-red-50" : "bg-gray-100"}
        `}
      >
        {cleanValue.length === 0 && (
          <span className="text-xs text-gray-500">
            Select category *
          </span>
        )}

        {cleanValue.map((slug) => {
          const cat = categories.find((c) => c.slug === slug);
          return (
            <span
              key={slug}
              className="flex items-center gap-1 bg-white px-2 py-0.5 rounded text-xs"
            >
              {cat?.name || slug}
              <X
                size={12}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(slug);
                }}
              />
            </span>
          );
        })}

        <ChevronDown size={14} className="ml-auto text-gray-500" />
      </div>

      {/* DROPDOWN */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg">
          <input
            placeholder="Search category..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-2 py-1 text-sm border-b outline-none"
          />

          <div className="max-h-48 overflow-y-auto">
            {filtered.map((cat) => (
              <label
                key={cat._id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={cleanValue.includes(cat.slug)}
                  onChange={() => toggle(cat.slug)}
                />
                {cat.name}
              </label>
            ))}

            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500">
                No categories found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


/* =========================================================
   MAIN PAGE
========================================================= */
export default function BulkUploadProductsPage() {
  const {
    previewRows,
    stats,
    uploading,
    creating,
    error,
    uploadCSVForPreview,
    createDraftProducts,
    updatePreviewRow,
    resetBulkImport,
  } = useAdminBulkProductStore();

  const { categories, fetchCategories } = useCategoryStore();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  /* ================= SAMPLE CSV ================= */
  const downloadSampleCSV = () => {
    const csv = `title,price,compareAtPrice,categories,shortDescription,description,tags
Kurti Peach,1299,1599,kurtis,Soft cotton kurti,This is a full description.,summer,cotton
Top Black,899,,tops,Black western top,Stylish black top.,party,western
`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk-products-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
<section className="min-h-screen bg-gray-50 px-6 py-8">
  <div className="max-w-7xl mx-auto space-y-6">

    {/* HEADER */}
    <div className="flex justify-between">
      <div>
        <h1 className="text-xl font-semibold">Bulk Product Upload</h1>
        <p className="text-sm text-gray-600">
          Upload CSV → Preview → Draft products
        </p>
      </div>

      {previewRows.length > 0 && (
        <button
          onClick={resetBulkImport}
          className="flex items-center gap-2 text-sm text-red-600"
        >
          <Trash2 size={14} /> Reset
        </button>
      )}
    </div>

    {/* UPLOAD */}
    {previewRows.length === 0 && (
      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <div className="flex justify-between">
          <span className="font-medium text-sm">Upload CSV</span>
          <button
            onClick={downloadSampleCSV}
            className="text-sm text-blue-600 flex items-center gap-1"
          >
            <Download size={14} /> Sample CSV
          </button>
        </div>

        <input
          type="file"
          accept=".csv"
          onChange={(e) =>
            uploadCSVForPreview(e.target.files?.[0])
          }
        />

        {uploading && (
          <div className="text-sm text-blue-600 flex gap-2">
            <Loader2 className="animate-spin" size={14} />
            Parsing CSV…
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    )}

    {/* STATS */}
    {previewRows.length > 0 && (
      <div className="flex gap-4 text-sm">
        <span>Total: {stats.total}</span>
        <span className="text-green-600">Valid: {stats.valid}</span>
        <span className="text-red-600">Invalid: {stats.invalid}</span>
      </div>
    )}

    {/* APPLY CATEGORY */}
    {previewRows.length > 0 && (
      <button
        onClick={() => {
          const firstValid = previewRows.find(
            (r) => Array.isArray(r.categories) && r.categories.length
          );
          if (!firstValid) return;

          previewRows.forEach((_, idx) =>
            updatePreviewRow(idx, {
              categories: firstValid.categories,
            })
          );
        }}
        className="text-sm text-blue-600 underline"
      >
        Apply first category to all rows
      </button>
    )}

    {/* TABLE WRAPPER (IMPORTANT FIX) */}
    {previewRows.length > 0 && (
      <div className="relative bg-white rounded-xl shadow">
        
        {/* horizontal scroll only */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Title</th>
                <th className="p-3">Price</th>
                <th className="p-3">Categories</th>
                <th className="p-3">Tags</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>

            <tbody>
              {previewRows.map((row, i) => (
                <tr
                  key={i}
                  className={`border-t ${
                    row.isValid ? "" : "bg-red-50"
                  }`}
                >
                  <td className="p-3">{row.row}</td>

                  <td className="p-3">
                    <input
                      className="input"
                      value={row.title}
                      onChange={(e) =>
                        updatePreviewRow(i, { title: e.target.value })
                      }
                    />
                  </td>

                  <td className="p-3">
                    <input
                      className="input w-24"
                      value={row.price}
                      onChange={(e) =>
                        updatePreviewRow(i, { price: e.target.value })
                      }
                    />
                  </td>

                  {/* CATEGORY CELL */}
                  <td className="p-3 w-72 relative z-20">
                    <CategoryDropdown
                      value={row.categories}
                      categories={categories}
                      required
                      onChange={(cats) =>
                        updatePreviewRow(i, { categories: cats })
                      }
                    />
                  </td>

                  <td className="p-3">
                    <input
                      className="input w-40"
                      value={row.tags?.join(", ") || ""}
                      onChange={(e) =>
                        updatePreviewRow(i, {
                          tags: e.target.value
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </td>

                  <td className="p-3">
                    {row.isValid ? (
                      <span className="text-green-600 flex gap-1">
                        <CheckCircle size={14} /> Valid
                      </span>
                    ) : (
                      <span className="text-red-600 flex gap-1">
                        <XCircle size={14} /> {row.errors.join(", ")}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {/* ACTION */}
    {previewRows.length > 0 && (
      <div className="flex justify-end">
        <button
          disabled={creating || stats.valid === 0}
          onClick={createDraftProducts}
          className="bg-black text-white px-6 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
        >
          {creating ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Creating…
            </>
          ) : (
            <>
              <Upload size={16} />
              Create Draft Products
            </>
          )}
        </button>
      </div>
    )}
  </div>

  <style jsx>{`
    .input {
      width: 100%;
      padding: 0.45rem 0.6rem;
      border-radius: 0.5rem;
      background: #f3f4f6;
      outline: none;
    }
  `}</style>
</section>

  );
}
