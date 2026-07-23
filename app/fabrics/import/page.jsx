"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Download,
  ImagePlus,
  Loader2,
  Pencil,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";

import ProductPicker from "@/components/common/ProductPicker";
import MediaPickerModal from "@/components/media/MediaPickerModal";
import { useAdminProductStore } from "@/store/adminProductStore";
import useFabricStore from "@/store/fabricStore";

const requiredHeaders = ["name", "category", "unit", "currentStock"];

const sampleRows = [
  {
    name: "Cotton Lycra",
    category: "Cotton",
    unit: "meter",
    currentStock: 100,
    imageLink: "",
    gsm: 180,
    width: '58"',
    associatedProductCodes: "00277,00441",
    notes: "Opening stock",
  },
];

const normalizeCode = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";

  return digits.slice(-5).padStart(5, "0");
};

const getProductCode = (product) =>
  normalizeCode(
    product?.productCode ||
      product?.styleCode ||
      product?.patternNumber ||
      product?.code ||
      product?.sku
  );

const normalizeRow = (row = {}) => ({
  name: String(row.name || row.Name || "").trim(),
  category: String(row.category || row.Category || "").trim(),
  unit: String(row.unit || row.Unit || "")
    .trim()
    .toLowerCase(),
  currentStock: Number(row.currentStock ?? row.Stock ?? row.stock ?? 0),
  imageLink: String(
    row.imageLink || row.ImageLink || row.image || ""
  ).trim(),
  imagePublicId: "",
  gsm: row.gsm || row.GSM ? Number(row.gsm || row.GSM) : null,
  width: String(row.width || row.Width || "").trim() || null,
  associatedProductCodes: String(
    row.associatedProductCodes ||
      row.productCodes ||
      row["Product Codes"] ||
      ""
  )
    .split(",")
    .map(normalizeCode)
    .filter(Boolean),
  selectedProductIds: [],
  notes: String(row.notes || row.Notes || "").trim(),
  status: "active",
  movementStatus: "idle",
  isActive: true,
});

const validateRow = (row) => {
  const errors = [];

  if (!row.name) errors.push("Missing fabric name");
  if (!row.category) errors.push("Missing category");

  if (!["meter", "kg"].includes(row.unit)) {
    errors.push("Unit must be meter or kg");
  }

  if (!Number.isFinite(row.currentStock) || row.currentStock < 0) {
    errors.push("Stock must be non-negative");
  }

  return errors;
};

export default function FabricImportPage() {
  const { createFabric, formLoading } = useFabricStore();

  const products = useAdminProductStore((state) => state.products || []);

  const [rows, setRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const [editingIndex, setEditingIndex] = useState(null);
  const [draft, setDraft] = useState(null);
  const [mediaOpen, setMediaOpen] = useState(false);

  const summary = useMemo(() => {
    const valid = rows.filter((item) => !item.errors.length).length;

    return {
      total: rows.length,
      valid,
      invalid: rows.length - valid,
    };
  }, [rows]);

  const openEditor = (index) => {
    setEditingIndex(index);
    setDraft({ ...rows[index] });
  };

  const closeEditor = () => {
    setEditingIndex(null);
    setDraft(null);
    setMediaOpen(false);
  };

  const updateDraft = (key, value) => {
    setDraft((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleProductsChange = (productIds) => {
    const selectedIds = Array.isArray(productIds) ? productIds : [];
    const selectedSet = new Set(selectedIds.map(String));

    const productCodes = Array.from(
      new Set(
        products
          .filter((product) => selectedSet.has(String(product?._id)))
          .map(getProductCode)
          .filter(Boolean)
      )
    );

    setDraft((prev) => ({
      ...prev,
      selectedProductIds: selectedIds,
      associatedProductCodes: productCodes,
    }));
  };

  const handleMediaSelect = (media) => {
    if (!media) return;

    setDraft((prev) => ({
      ...prev,
      imageLink: media.url || "",
      imagePublicId: media.publicId || "",
    }));

    setMediaOpen(false);
  };

  const removeImage = () => {
    setDraft((prev) => ({
      ...prev,
      imageLink: "",
      imagePublicId: "",
    }));
  };

  const saveEditedRow = () => {
    if (editingIndex === null || !draft) return;

    const updated = {
      ...draft,
      name: String(draft.name || "").trim(),
      category: String(draft.category || "").trim(),
      currentStock: Number(draft.currentStock || 0),
      gsm: draft.gsm ? Number(draft.gsm) : null,
      width: String(draft.width || "").trim() || null,
      notes: String(draft.notes || "").trim(),
    };

    updated.errors = validateRow(updated);

    setRows((prev) =>
      prev.map((row, index) => (index === editingIndex ? updated : row))
    );

    closeEditor();
  };

  const handleDownloadSample = () => {
    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Fabric Import Sample"
    );

    XLSX.writeFile(workbook, "fabric-import-sample.xlsx");
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const data = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
      });

      const parsedRows = data.map((raw, index) => {
        const normalized = normalizeRow(raw);

        return {
          rowNumber: index + 2,
          ...normalized,
          errors: validateRow(normalized),
        };
      });

      setRows(parsedRows);
    } catch (error) {
      console.error("Fabric import file error:", error);
      setRows([]);
    } finally {
      event.target.value = "";
    }
  };

  const handleImport = async () => {
    const confirmed = window.confirm(
      "Are you sure the Excel data is correct? This will create the fabrics."
    );

    if (!confirmed) return;

    const validRows = rows.filter((item) => !item.errors.length);

    setImporting(true);
    setResult(null);

    const report = {
      total: validRows.length,
      success: 0,
      failed: 0,
      failedRows: [],
    };

    for (const row of validRows) {
      const payload = {
        name: row.name,
        category: row.category,
        unit: row.unit,
        currentStock: Number(row.currentStock || 0),
        imageLink: row.imageLink || "",
        imagePublicId: row.imagePublicId || "",
        gsm: row.gsm ? Number(row.gsm) : null,
        width: row.width || null,
        associatedProductCodes: row.associatedProductCodes || [],
        notes: row.notes || "",
        status: row.status || "active",
        movementStatus: row.movementStatus || "idle",
        isActive: true,
      };

      try {
        const response = await createFabric(payload);

        if (response?.success) {
          report.success += 1;
        } else {
          report.failed += 1;
          report.failedRows.push({
            rowNumber: row.rowNumber,
            name: row.name,
            message: response?.message || "Import failed",
          });
        }
      } catch (error) {
        report.failed += 1;
        report.failedRows.push({
          rowNumber: row.rowNumber,
          name: row.name,
          message: error?.message || "Import failed",
        });
      }
    }

    setResult(report);
    setImporting(false);
  };

  return (
    <>
      <main className="min-h-screen bg-neutral-50 p-4 text-neutral-950 md:p-6">
        <div className="mx-auto max-w-7xl space-y-5">
          <header>
            <Link
              href="/fabrics"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-950"
            >
              <ArrowLeft size={16} />
              Back to fabrics
            </Link>

            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Import Fabrics
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              Upload Excel, review every row and assign media or products before
              importing.
            </p>
          </header>

          <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-sm font-semibold">Excel Upload</h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Required columns: {requiredHeaders.join(", ")}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="secondary-button"
                >
                  <Download size={16} />
                  Sample Excel
                </button>

                <label className="primary-button cursor-pointer">
                  <Upload size={16} />
                  Upload Excel

                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </section>

          {rows.length ? (
            <>
              <section className="grid gap-3 sm:grid-cols-3">
                <SummaryCard title="Total Rows" value={summary.total} />

                <SummaryCard
                  title="Valid Rows"
                  value={summary.valid}
                  success
                />

                <SummaryCard
                  title="Rows With Errors"
                  value={summary.invalid}
                  danger={summary.invalid > 0}
                />
              </section>

              <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-3 border-b border-neutral-200 p-4 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-sm font-semibold">Import Preview</h2>
                    <p className="mt-1 text-xs text-neutral-500">
                      Use Edit Details to select fabric images and associated
                      products.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={
                      summary.valid === 0 || importing || formLoading
                    }
                    onClick={handleImport}
                    className="primary-button disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {importing || formLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle size={16} />
                    )}

                    {importing ? "Importing..." : "Confirm Import"}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1200px] text-left text-sm">
                    <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                      <tr>
                        <th className="px-4 py-3">Row</th>
                        <th className="px-4 py-3">Image</th>
                        <th className="px-4 py-3">Fabric</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Unit</th>
                        <th className="px-4 py-3">Stock</th>
                        <th className="px-4 py-3">GSM</th>
                        <th className="px-4 py-3">Width</th>
                        <th className="px-4 py-3">Products</th>
                        <th className="px-4 py-3">Validation</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-neutral-100">
                      {rows.map((row, index) => (
                        <tr
                          key={`${row.rowNumber}-${index}`}
                          className="hover:bg-neutral-50/70"
                        >
                          <td className="px-4 py-3 text-neutral-500">
                            {row.rowNumber}
                          </td>

                          <td className="px-4 py-3">
                            <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-neutral-100">
                              {row.imageLink ? (
                                <Image
                                  src={row.imageLink}
                                  alt={row.name || "Fabric"}
                                  fill
                                  sizes="48px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-neutral-400">
                                  <ImagePlus size={17} />
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3 font-medium">
                            {row.name || "-"}
                          </td>

                          <td className="px-4 py-3">
                            {row.category || "-"}
                          </td>

                          <td className="px-4 py-3 capitalize">
                            {row.unit || "-"}
                          </td>

                          <td className="px-4 py-3">
                            {row.currentStock}
                          </td>

                          <td className="px-4 py-3">{row.gsm || "-"}</td>

                          <td className="px-4 py-3">{row.width || "-"}</td>

                          <td className="max-w-[240px] px-4 py-3">
                            {row.associatedProductCodes?.length ? (
                              <div className="flex flex-wrap gap-1">
                                {row.associatedProductCodes
                                  .slice(0, 3)
                                  .map((code) => (
                                    <span
                                      key={code}
                                      className="rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-medium"
                                    >
                                      {code}
                                    </span>
                                  ))}

                                {row.associatedProductCodes.length > 3 ? (
                                  <span className="rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-medium">
                                    +{row.associatedProductCodes.length - 3}
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-neutral-400">None</span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {row.errors.length ? (
                              <div className="flex max-w-[220px] items-start gap-2 text-red-600">
                                <AlertTriangle
                                  size={16}
                                  className="mt-0.5 shrink-0"
                                />

                                <span className="text-xs">
                                  {row.errors.join(", ")}
                                </span>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                                <CheckCircle size={13} />
                                Valid
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openEditor(index)}
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 px-3 text-xs font-medium hover:bg-neutral-100"
                            >
                              <Pencil size={14} />
                              Edit Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : null}

          {result ? (
            <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold">Import Result</h2>

              <div className="mt-3 flex flex-wrap gap-2">
                <ResultBadge label="Total" value={result.total} />
                <ResultBadge
                  label="Success"
                  value={result.success}
                  success
                />
                <ResultBadge label="Failed" value={result.failed} danger />
              </div>

              {result.failedRows.length ? (
                <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                  {result.failedRows.map((item) => (
                    <p key={`${item.rowNumber}-${item.name}`}>
                      Row {item.rowNumber}: {item.name} — {item.message}
                    </p>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        <style jsx>{`
          .primary-button,
          .secondary-button {
            display: inline-flex;
            height: 40px;
            align-items: center;
            justify-content: center;
            gap: 8px;
            border-radius: 12px;
            padding: 0 16px;
            font-size: 14px;
            font-weight: 500;
          }

          .primary-button {
            background: #171717;
            color: white;
          }

          .primary-button:hover {
            background: #262626;
          }

          .secondary-button {
            border: 1px solid #e5e5e5;
            background: white;
          }

          .secondary-button:hover {
            background: #f5f5f5;
          }
        `}</style>
      </main>

      {draft ? (
        <RowEditorModal
          draft={draft}
          onClose={closeEditor}
          onSave={saveEditedRow}
          updateDraft={updateDraft}
          onProductsChange={handleProductsChange}
          onOpenMedia={() => setMediaOpen(true)}
          onRemoveImage={removeImage}
        />
      ) : null}

      <MediaPickerModal
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        onSelect={handleMediaSelect}
        folder="miray/fabrics"
      />
    </>
  );
}

function RowEditorModal({
  draft,
  onClose,
  onSave,
  updateDraft,
  onProductsChange,
  onOpenMedia,
  onRemoveImage,
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm md:p-6">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-neutral-50 shadow-2xl">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-4 md:px-6">
          <div>
            <h2 className="text-lg font-semibold">Edit Fabric Details</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Row {draft.rowNumber} · {draft.name || "Unnamed fabric"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-neutral-100"
          >
            <X size={19} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6">
          <section className="rounded-2xl border border-neutral-200 bg-white p-4">
            <h3 className="mb-4 text-sm font-semibold">
              Fabric Information
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Fabric Name" required>
                <input
                  value={draft.name}
                  onChange={(event) =>
                    updateDraft("name", event.target.value)
                  }
                  className="field-input"
                />
              </Field>

              <Field label="Category" required>
                <input
                  value={draft.category}
                  onChange={(event) =>
                    updateDraft("category", event.target.value)
                  }
                  className="field-input"
                />
              </Field>

              <Field label="Unit" required>
                <select
                  value={draft.unit}
                  onChange={(event) =>
                    updateDraft("unit", event.target.value)
                  }
                  className="field-input"
                >
                  <option value="meter">Meter</option>
                  <option value="kg">Kilogram</option>
                </select>
              </Field>

              <Field label="Opening Stock">
                <input
                  type="number"
                  min="0"
                  value={draft.currentStock}
                  onChange={(event) =>
                    updateDraft("currentStock", event.target.value)
                  }
                  className="field-input"
                />
              </Field>

              <Field label="GSM">
                <input
                  type="number"
                  min="1"
                  value={draft.gsm || ""}
                  onChange={(event) =>
                    updateDraft("gsm", event.target.value)
                  }
                  className="field-input"
                />
              </Field>

              <Field label="Width">
                <input
                  value={draft.width || ""}
                  onChange={(event) =>
                    updateDraft("width", event.target.value)
                  }
                  placeholder={'58"'}
                  className="field-input"
                />
              </Field>

              <Field label="Notes" className="md:col-span-2">
                <textarea
                  rows={3}
                  value={draft.notes || ""}
                  onChange={(event) =>
                    updateDraft("notes", event.target.value)
                  }
                  className="field-input min-h-24 resize-none py-3"
                />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-4">
            <h3 className="mb-4 text-sm font-semibold">Fabric Image</h3>

            {draft.imageLink ? (
              <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 p-3 sm:flex-row sm:items-center">
                <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                  <Image
                    src={draft.imageLink}
                    alt={draft.name || "Fabric"}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Image selected</p>

                  <p className="mt-1 truncate text-xs text-neutral-500">
                    {draft.imageLink}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={onOpenMedia}
                      className="editor-button"
                    >
                      <ImagePlus size={15} />
                      Replace Image
                    </button>

                    <button
                      type="button"
                      onClick={onRemoveImage}
                      className="editor-button text-red-600"
                    >
                      <Trash2 size={15} />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenMedia}
                className="flex min-h-32 w-full flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-neutral-500 hover:border-neutral-950 hover:text-neutral-950"
              >
                <ImagePlus size={22} />
                <span className="mt-2 text-sm font-medium">
                  Select from Media Library
                </span>
              </button>
            )}
          </section>

          <ProductPicker
            value={draft.selectedProductIds || []}
            onChange={onProductsChange}
            multiple
            title="Associated Products"
            initialLimit={20}
          />

          {draft.associatedProductCodes?.length ? (
            <section className="rounded-xl border border-neutral-200 bg-white p-4">
              <p className="text-xs font-medium text-neutral-500">
                Selected product codes
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                {draft.associatedProductCodes.map((code) => (
                  <span
                    key={code}
                    className="rounded-lg bg-neutral-100 px-2.5 py-1.5 text-xs font-medium"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-neutral-200 bg-white p-4 sm:flex-row sm:justify-end md:px-6">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-neutral-200 px-5 text-sm font-medium hover:bg-neutral-100"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSave}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            <Save size={16} />
            Save Row
          </button>
        </footer>

        <style jsx>{`
          .field-input {
            min-height: 44px;
            width: 100%;
            border-radius: 12px;
            border: 1px solid #e5e5e5;
            background: white;
            padding-left: 12px;
            padding-right: 12px;
            font-size: 14px;
            outline: none;
          }

          .field-input:focus {
            border-color: #171717;
          }

          .editor-button {
            display: inline-flex;
            height: 36px;
            align-items: center;
            justify-content: center;
            gap: 6px;
            border-radius: 10px;
            border: 1px solid #e5e5e5;
            padding: 0 12px;
            font-size: 12px;
            font-weight: 500;
          }

          .editor-button:hover {
            background: #f5f5f5;
          }
        `}</style>
      </div>
    </div>
  );
}

function Field({ label, required, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-neutral-700">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>

      {children}
    </label>
  );
}

function SummaryCard({ title, value, danger, success }) {
  return (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-sm ${
        danger
          ? "border-red-200"
          : success
            ? "border-green-200"
            : "border-neutral-200"
      }`}
    >
      <p className="text-xs font-medium text-neutral-500">{title}</p>

      <p
        className={`mt-2 text-2xl font-semibold ${
          danger
            ? "text-red-600"
            : success
              ? "text-green-700"
              : "text-neutral-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ResultBadge({ label, value, success, danger }) {
  return (
    <span
      className={`rounded-lg px-3 py-2 text-sm font-medium ${
        success
          ? "bg-green-50 text-green-700"
          : danger
            ? "bg-red-50 text-red-700"
            : "bg-neutral-100 text-neutral-700"
      }`}
    >
      {label}: {value}
    </span>
  );
}