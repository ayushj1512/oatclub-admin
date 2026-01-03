"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import BulkProductSetupModal from "@/components/product/BulkProductSetupModal";
import { useAdminBulkProductStore } from "@/store/adminBulkProductStore";

export default function BulkImportPage() {
  const {
    previewRows,
    uploading,
    creating,
    error,
    successMessage,

    uploadCSVForPreview,
    toggleRowSelection,
    selectedRowIds,
    selectAllValidRows,
    clearSelection,

    createDraftProducts,
    resetBulkImport,

    setGlobalDefaults,
    applyDefaultsToSelectedRows,

    addManualRow,
    updateManualRowField,
    deleteManualRow,
  } = useAdminBulkProductStore();

  const [setupOpen, setSetupOpen] = useState(false); // global setup modal
  const [fileName, setFileName] = useState("");

  // ✅ Row-level modal states
  const [rowSetupOpen, setRowSetupOpen] = useState(false);
  const [activeRowId, setActiveRowId] = useState(null);

  useEffect(() => {
    if (error) toast.error(error);
    if (successMessage) toast.success(successMessage);
  }, [error, successMessage]);

  const validCount = useMemo(
    () => previewRows.filter((r) => r.isValid).length,
    [previewRows]
  );

  const invalidCount = useMemo(
    () => previewRows.filter((r) => !r.isValid).length,
    [previewRows]
  );

  const selectedCount = selectedRowIds.length;

  const handleCSVUpload = async (file) => {
    if (!file) return;
    setFileName(file.name);
    await uploadCSVForPreview(file);
  };

  const downloadSampleCSV = () => {
    const sampleCSV = `title,price,compareAtPrice,category,stock,tags,shortDescription,description,images,thumbnail,attributes,variants
Cotton Shirt,999,1499,shirts,10,"cotton,men,shirt","Soft cotton shirt","Full product long description","https://res.cloudinary.com/demo/image/upload/sample.jpg,https://res.cloudinary.com/demo/image/upload/sample.jpg","https://res.cloudinary.com/demo/image/upload/sample.jpg","size:S,M,L|color:Black,White","size:S;color:Black;price:999;stock:5|size:M;color:Black;price:999;stock:5"
`;

    const blob = new Blob([sampleCSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "bulk-products-sample.csv";
    link.click();

    URL.revokeObjectURL(url);
    toast.success("✅ Sample CSV downloaded");
  };

  // ✅ Open row-level modal
  const openRowSetup = (rowId) => {
    setActiveRowId(rowId);
    setRowSetupOpen(true);
  };

  // ✅ Find active row data
  const activeRow = useMemo(() => {
    if (!activeRowId) return null;
    return previewRows.find((r) => r.row === activeRowId) || null;
  }, [activeRowId, previewRows]);

  // ✅ Apply row config from modal
  const applyRowConfig = (config) => {
    if (!activeRowId) return;

    updateManualRowField(activeRowId, "categories", config.categories || []);
    updateManualRowField(activeRowId, "attributes", config.attributes || []);
    updateManualRowField(activeRowId, "images", config.images || []);
    updateManualRowField(activeRowId, "thumbnail", config.thumbnail || "");
updateManualRowField(activeRowId, "shortDescription", config.shortDescription || "");
updateManualRowField(activeRowId, "description", config.description || "");
updateManualRowField(activeRowId, "tags", config.tags || []);

    toast.success(`✅ Row ${activeRowId} updated`);
  };

  return (
   <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6">
  {/* Header */}
  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
        Bulk Product Import
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Upload CSV or manually add rows, then create draft products.
      </p>
    </div>

    <div className="flex flex-wrap gap-2">
      <button
        onClick={downloadSampleCSV}
        className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
      >
        Download Sample CSV
      </button>

      <button
        onClick={() => setSetupOpen(true)}
        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
      >
        Global Setup
      </button>

      <button
        onClick={resetBulkImport}
        className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90"
      >
        Reset
      </button>
    </div>
  </div>

  {/* Controls */}
  <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
    {/* CSV Upload */}
    <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] ring-1 ring-gray-200/70">
      <h2 className="text-sm font-semibold text-gray-800">Upload CSV</h2>

      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center hover:bg-gray-100">
        <p className="text-sm font-medium text-gray-700">
          Click to upload or drag & drop
        </p>
        <p className="mt-1 text-xs text-gray-500">CSV only</p>

        <input
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => handleCSVUpload(e.target.files?.[0])}
        />
      </label>

      {uploading && (
        <p className="mt-3 text-xs text-gray-500">Uploading & parsing…</p>
      )}

      {!!fileName && (
        <p className="mt-3 text-xs text-gray-600">
          File: <b>{fileName}</b>
        </p>
      )}
    </div>

    {/* Manual */}
    <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] ring-1 ring-gray-200/70">
      <h2 className="text-sm font-semibold text-gray-800">Manual Add Rows</h2>
      <p className="mt-1 text-xs text-gray-500">
        Create rows manually without CSV upload
      </p>

      <button
        onClick={addManualRow}
        className="mt-5 w-full rounded-xl bg-black px-4 py-3 text-sm font-medium text-white shadow-sm hover:opacity-90"
      >
        + Add Manual Row
      </button>
    </div>
  </div>

  {/* Stats */}
  {!!previewRows.length && (
    <div className="mt-8 flex flex-wrap gap-3">
      <span className="rounded-full bg-white px-4 py-2 text-xs font-medium text-gray-800 shadow-sm ring-1 ring-gray-200">
        Total: <b>{previewRows.length}</b>
      </span>

      <span className="rounded-full bg-green-50 px-4 py-2 text-xs font-medium text-green-800 ring-1 ring-green-200">
        Valid: <b>{validCount}</b>
      </span>

      <span className="rounded-full bg-red-50 px-4 py-2 text-xs font-medium text-red-700 ring-1 ring-red-200">
        Invalid: <b>{invalidCount}</b>
      </span>

      <span className="rounded-full bg-blue-50 px-4 py-2 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
        Selected: <b>{selectedCount}</b>
      </span>
    </div>
  )}

  {/* Actions */}
  {!!previewRows.length && (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200/70">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={selectAllValidRows}
          className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
        >
          Select All Valid
        </button>

        <button
          onClick={clearSelection}
          className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
        >
          Clear Selection
        </button>

        <button
          onClick={applyDefaultsToSelectedRows}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          Apply Global Defaults
        </button>
      </div>

      <button
        disabled={creating || !selectedRowIds.length}
        onClick={createDraftProducts}
        className="rounded-xl bg-black px-5 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-40"
      >
        {creating ? "Creating Drafts..." : "Create Draft Products"}
      </button>
    </div>
  )}

  {/* Table */}
  {!!previewRows.length && (
    <div className="mt-6 overflow-auto rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] ring-1 ring-gray-200/70">
      <table className="w-full min-w-[1400px] text-left text-sm">
        <thead className="sticky top-0 z-10 bg-white text-xs uppercase text-gray-500 shadow-sm">
          <tr className="border-b border-gray-200/60">
            <th className="p-4">Select</th>
            <th className="p-4">Row</th>
            <th className="p-4">Title</th>
            <th className="p-4">Price</th>
            <th className="p-4">Categories</th>
            <th className="p-4">Attributes</th>
            <th className="p-4">Media</th>
            <th className="p-4">Stock</th>
            <th className="p-4">Valid</th>
            <th className="p-4">Errors</th>
            <th className="p-4">Actions</th>
          </tr>
        </thead>

        <tbody>
          {previewRows.map((r) => {
            const selected = selectedRowIds.includes(r.row);
            const thumb = r.thumbnail || "";
            const imagesCount = Array.isArray(r.images) ? r.images.length : 0;
            const categories = Array.isArray(r.categories) ? r.categories : [];
            const attributes = Array.isArray(r.attributes) ? r.attributes : [];

            return (
              <tr
                key={r.row}
                className={`border-b border-gray-100 hover:bg-gray-50/60 transition ${
                  !r.isValid ? "bg-red-50/30" : ""
                }`}
              >
                <td className="p-4">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleRowSelection(r.row)}
                    className="h-4 w-4 accent-blue-600"
                  />
                </td>

                <td className="p-4 font-medium text-gray-900">{r.row}</td>

                {/* Title */}
                <td className="p-4">
                  <input
                    value={r.title || ""}
                    onChange={(e) =>
                      updateManualRowField(r.row, "title", e.target.value)
                    }
                    className="w-full rounded-xl bg-gray-50 px-3 py-2 text-sm ring-1 ring-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </td>

                {/* Price */}
                <td className="p-4">
                  <input
                    value={r.price ?? ""}
                    type="number"
                    onChange={(e) =>
                      updateManualRowField(r.row, "price", e.target.value)
                    }
                    className="w-28 rounded-xl bg-gray-50 px-3 py-2 text-sm ring-1 ring-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </td>

                {/* Categories */}
                <td className="p-4">
                  {categories.length ? (
                    <div className="flex flex-wrap gap-1">
                      {categories.slice(0, 3).map((c) => (
                        <span
                          key={c}
                          className="rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-800"
                        >
                          {c}
                        </span>
                      ))}
                      {categories.length > 3 && (
                        <span className="text-[11px] text-gray-500">
                          +{categories.length - 3} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">No category</span>
                  )}
                </td>

                {/* Attributes */}
                <td className="p-4">
                  {attributes.length ? (
                    <div className="flex flex-col gap-1">
                      {attributes.slice(0, 2).map((a) => (
                        <span
                          key={a._id || a.key}
                          className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] text-gray-800"
                        >
                          {a.name || a.key}
                        </span>
                      ))}
                      {attributes.length > 2 && (
                        <span className="text-[11px] text-gray-500">
                          +{attributes.length - 2} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">No attributes</span>
                  )}
                </td>

                {/* Media */}
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt="thumb"
                        className="h-11 w-11 rounded-xl object-cover ring-1 ring-gray-200"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-xl bg-gray-100 ring-1 ring-gray-200" />
                    )}

                    <div className="text-xs text-gray-600">
                      <div>Thumb: {thumb ? "✅" : "❌"}</div>
                      <div>Images: {imagesCount}</div>
                    </div>
                  </div>
                </td>

                {/* Stock */}
                <td className="p-4">
                  <input
                    value={r.stock ?? 0}
                    type="number"
                    onChange={(e) =>
                      updateManualRowField(r.row, "stock", e.target.value)
                    }
                    className="w-20 rounded-xl bg-gray-50 px-3 py-2 text-sm ring-1 ring-gray-200 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </td>

                {/* Valid */}
                <td className="p-4">
                  {r.isValid ? (
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-green-200">
                      ✅ Valid
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 ring-1 ring-red-200">
                      ❌ Invalid
                    </span>
                  )}
                </td>

                {/* Errors */}
                <td className="p-4 text-xs text-red-600">
                  {r.errors?.length ? r.errors.join(", ") : "-"}
                </td>

                {/* Actions */}
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openRowSetup(r.row)}
                      className="rounded-xl bg-black px-3 py-2 text-xs font-medium text-white hover:opacity-90"
                    >
                      Setup
                    </button>

                    <button
                      onClick={() => deleteManualRow(r.row)}
                      className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-gray-800 ring-1 ring-gray-200 hover:bg-gray-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  )}

  {/* ✅ Global Setup Modal */}
  <BulkProductSetupModal
    open={setupOpen}
    onClose={() => setSetupOpen(false)}
    onApply={(config) => {
      setGlobalDefaults(config);
    }}
  />

  {/* ✅ Row Setup Modal */}
  <BulkProductSetupModal
    open={rowSetupOpen}
    onClose={() => {
      setRowSetupOpen(false);
      setActiveRowId(null);
    }}
    defaultValues={{
      categories: activeRow?.categories || [],
      attributes: activeRow?.attributes || [],
      images: activeRow?.images || [],
      thumbnail: activeRow?.thumbnail || "",
      shortDescription: activeRow?.shortDescription || "",
      description: activeRow?.description || "",
      tags: activeRow?.tags || [],
    }}
    onApply={applyRowConfig}
  />
</div>

  );
}
