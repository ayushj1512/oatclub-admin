"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshCcw,
  Save,
  Power,
  Plus,
  Trash2,
  PackageSearch,
  Hash,
  ClipboardList,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";

import ProductPicker from "@/components/common/ProductPicker";
import { useAdminCommerceManagerStore } from "@/store/adminCommerceManagerStore";
import { useAdminProductStore } from "@/store/adminProductStore";

const safeArray = (value) => (Array.isArray(value) ? value : []);

const normalizeCode = (value) => {
  const raw = String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (!raw) return "";
  if (/^\d+$/.test(raw)) return raw.padStart(6, "0");
  return raw;
};

const normalizeCodes = (codes = []) => [
  ...new Set(safeArray(codes).map(normalizeCode).filter(Boolean)),
];

const parseCodesFromText = (text = "") =>
  normalizeCodes(
    String(text)
      .split(/[\n,\s,;|]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  );

const getProductImage = (product) => {
  if (!product) return "";

  if (typeof product?.thumbnail === "string") return product.thumbnail;
  if (typeof product?.image === "string") return product.image;
  if (typeof product?.mainImage === "string") return product.mainImage;
  if (typeof product?.featuredImage === "string") return product.featuredImage;

  if (Array.isArray(product?.images) && product.images.length > 0) {
    const first = product.images[0];
    if (typeof first === "string") return first;
    if (typeof first?.url === "string") return first.url;
    if (typeof first?.src === "string") return first.src;
  }

  if (Array.isArray(product?.variants) && product.variants.length > 0) {
    const v = product.variants[0];
    if (typeof v?.image === "string") return v.image;
    if (typeof v?.image?.url === "string") return v.image.url;
    if (typeof v?.image?.src === "string") return v.image.src;
  }

  return "";
};

const getProductCode = (product) => {
  if (!product) return "";

  const candidates = [
    product?.productCode,
    product?.sku,
    product?.styleCode,
    product?.patternNumber,
    product?.code,
    product?.productDetails?.productCode,
    product?.productDetails?.code,
  ];

  for (const item of candidates) {
    const code = normalizeCode(item);
    if (code) return code;
  }

  return "";
};

const getTextFromCell = (value) => {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  return String(value).trim();
};

const cardClass =
  "rounded-[24px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)] ring-1 ring-black/5";
const softInputClass =
  "w-full rounded-2xl bg-[#f6f6f6] px-4 py-3 text-sm text-black placeholder:text-zinc-500 outline-none ring-1 ring-black/5 transition focus:bg-white focus:ring-black/15";
const softButtonClass =
  "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";
const iconWrapClass =
  "flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4f4f4] text-black ring-1 ring-black/5";

function StatCard({ icon: Icon, label, value, subValue }) {
  return (
    <div className="rounded-[22px] bg-[#fafafa] p-4 ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
            {label}
          </div>
          <div className="mt-2 text-2xl font-semibold text-black">{value}</div>
          {subValue ? (
            <div className="mt-1 text-xs text-zinc-500">{subValue}</div>
          ) : null}
        </div>
        <div className={iconWrapClass}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function CommerceManagerPage() {
  const {
    config,
    loading,
    saving,
    actionLoading,
    fetchConfig,
    updateConfig,
    addProductCodes,
    removeProductCodes,
    clearAllProductCodes,
    toggleStatus,
  } = useAdminCommerceManagerStore();

  const adminProducts = useAdminProductStore((state) => state.products);

  const [notes, setNotes] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [removeInput, setRemoveInput] = useState("");
  const [excelCodes, setExcelCodes] = useState([]);
  const [excelFileName, setExcelFileName] = useState("");
  const [excelLoading, setExcelLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    setNotes(config?.notes || "");
  }, [config?.notes]);

  const selectedCodes = useMemo(
    () => normalizeCodes(config?.selectedProductCodes || []),
    [config?.selectedProductCodes]
  );

  const selectedProductsMap = useMemo(() => {
    const map = new Map();

    safeArray(adminProducts).forEach((product) => {
      const code = getProductCode(product);
      if (code) map.set(code, product);
    });

    return map;
  }, [adminProducts]);

  const matchedSelectedProducts = useMemo(() => {
    return selectedCodes
      .map((code) => {
        const product = selectedProductsMap.get(code);

        if (!product) {
          return {
            _id: code,
            title: "Product not loaded in current picker cache",
            code,
            image: "",
          };
        }

        return {
          _id: product?._id || code,
          title: product?.title || product?.name || "Untitled Product",
          code,
          image: getProductImage(product),
        };
      })
      .sort((a, b) => String(a.title).localeCompare(String(b.title)));
  }, [selectedCodes, selectedProductsMap]);

  const pickerSelectedCodes = useMemo(() => {
    const idSet = new Set(safeArray(selectedProductIds).map(String));

    return normalizeCodes(
      safeArray(adminProducts)
        .filter((product) => idSet.has(String(product?._id || "")))
        .map((product) => getProductCode(product))
    );
  }, [selectedProductIds, adminProducts]);

  const pickerSelectedProductsPreview = useMemo(() => {
    const idSet = new Set(safeArray(selectedProductIds).map(String));

    return safeArray(adminProducts)
      .filter((product) => idSet.has(String(product?._id || "")))
      .map((product) => ({
        _id: String(product?._id || ""),
        title: product?.title || product?.name || "Untitled Product",
        code: getProductCode(product),
        image: getProductImage(product),
      }))
      .filter((item) => item.code);
  }, [selectedProductIds, adminProducts]);

  const stats = useMemo(
    () => ({
      totalCodes: selectedCodes.length,
      active: !!config?.isActive,
      lastUpdatedAt: config?.lastUpdatedAt,
      lastUpdatedBy: config?.lastUpdatedBy || "-",
    }),
    [
      selectedCodes.length,
      config?.isActive,
      config?.lastUpdatedAt,
      config?.lastUpdatedBy,
    ]
  );

  const handleRefresh = async () => {
    await fetchConfig(true);
  };

  const handleSaveNotes = async () => {
    await updateConfig({
      notes,
      lastUpdatedBy: "Admin",
    });
  };

  const handleToggleStatus = async () => {
    await toggleStatus({
      isActive: !config?.isActive,
      lastUpdatedBy: "Admin",
    });
  };

  const handleAddManualCodes = async () => {
    const codes = parseCodesFromText(manualInput);

    if (!codes.length) {
      toast.error("Please enter product codes");
      return;
    }

    const res = await addProductCodes({
      productCodes: codes,
      lastUpdatedBy: "Admin",
    });

    if (res?.success) {
      setManualInput("");
      toast.success(`${codes.length} code(s) added`);
    }
  };

  const handleRemoveManualCodes = async () => {
    const codes = parseCodesFromText(removeInput);

    if (!codes.length) {
      toast.error("Please enter product codes to remove");
      return;
    }

    const res = await removeProductCodes({
      productCodes: codes,
      lastUpdatedBy: "Admin",
    });

    if (res?.success) {
      setRemoveInput("");
      toast.success(`${codes.length} code(s) removed`);
    }
  };

  const handleAddPickerSelection = async () => {
    if (!pickerSelectedCodes.length) {
      toast.error("Please select products first");
      return;
    }

    const res = await addProductCodes({
      productCodes: pickerSelectedCodes,
      lastUpdatedBy: "Admin",
    });

    if (res?.success) {
      setSelectedProductIds([]);
      toast.success(`${pickerSelectedCodes.length} code(s) added`);
    }
  };

  const handleAddExcelCodes = async () => {
    if (!excelCodes.length) {
      toast.error("Please upload excel first");
      return;
    }

    const res = await addProductCodes({
      productCodes: excelCodes,
      lastUpdatedBy: "Admin",
    });

    if (res?.success) {
      toast.success(`${excelCodes.length} code(s) added from excel`);
      setExcelCodes([]);
      setExcelFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveSingleCode = async (code) => {
    await removeProductCodes({
      productCodes: [code],
      lastUpdatedBy: "Admin",
    });
  };

  const handleClearAll = async () => {
    if (!selectedCodes.length) {
      toast.error("No product codes to clear");
      return;
    }

    const ok = window.confirm("Clear all selected commerce manager product codes?");
    if (!ok) return;

    await clearAllProductCodes({
      lastUpdatedBy: "Admin",
    });
  };

  const parseExcelFile = async (file) => {
    if (!file) return;

    try {
      setExcelLoading(true);

      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames?.[0];

      if (!firstSheetName) {
        toast.error("No sheet found in file");
        return;
      }

      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: false,
      });

      if (!rows.length) {
        toast.error("Excel file is empty");
        return;
      }

      const detectedCodes = [];

      rows.forEach((row) => {
        const code =
          getTextFromCell(row.productCode) ||
          getTextFromCell(row.productcode) ||
          getTextFromCell(row.code) ||
          getTextFromCell(row.Code) ||
          getTextFromCell(row["Product Code"]) ||
          getTextFromCell(row["PRODUCT CODE"]) ||
          getTextFromCell(row["product code"]) ||
          getTextFromCell(row.sku) ||
          getTextFromCell(row.SKU);

        if (code) detectedCodes.push(code);
      });

      const normalized = normalizeCodes(detectedCodes);

      if (!normalized.length) {
        toast.error(
          "No valid codes found. Use column name: productCode / Product Code / code / sku"
        );
        return;
      }

      setExcelCodes(normalized);
      setExcelFileName(file.name);
      toast.success(`${normalized.length} code(s) loaded from excel`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to read excel file");
    } finally {
      setExcelLoading(false);
    }
  };

  const handleExcelInputChange = async (e) => {
    const file = e.target.files?.[0];
    await parseExcelFile(file);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    await parseExcelFile(file);
  };

  const handleDownloadSampleExcel = async () => {
    try {
      const XLSX = await import("xlsx");

      const data = [
        { productCode: "000243" },
        { productCode: "000456" },
        { productCode: "000999" },
        { productCode: "TOP-001" },
      ];

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

      worksheet["!cols"] = [{ wch: 18 }];

      XLSX.writeFile(workbook, "commerce-manager-product-codes-sample.xlsx");
      toast.success("Sample excel downloaded");
    } catch (error) {
      console.error(error);
      toast.error("Failed to download sample excel");
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f3f3f3] px-4 py-5 text-black md:px-6 md:py-6">
      <div className="w-full space-y-6">
        <section className={`${cardClass} overflow-hidden`}>
          <div className="bg-gradient-to-r from-white via-[#f7f7f7] to-[#efefef] p-5 md:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Commerce Feed Control
                </div>

                <div>
                  <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight md:text-3xl">
                    <span className={iconWrapClass}>
                      <PackageSearch className="h-5 w-5" />
                    </span>
                    Commerce Manager
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
                    Sirf selected product codes Meta Commerce Manager feed mein jayenge.
                    Manual add, picker selection aur excel upload tino support ready hai.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className={`${softButtonClass} bg-white text-black ring-1 ring-black/8 hover:bg-[#f7f7f7]`}
                >
                  <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>

                <button
                  onClick={handleToggleStatus}
                  disabled={actionLoading}
                  className={`${softButtonClass} ${
                    config?.isActive
                      ? "bg-black text-white hover:bg-zinc-800"
                      : "bg-zinc-700 text-white hover:bg-black"
                  }`}
                >
                  <Power className="h-4 w-4" />
                  {config?.isActive ? "Active" : "Inactive"}
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={ClipboardList}
                label="Selected Codes"
                value={stats.totalCodes}
                subValue="Currently in feed"
              />
              <StatCard
                icon={Power}
                label="Status"
                value={stats.active ? "Enabled" : "Disabled"}
                subValue="Feed sync control"
              />
              <StatCard
                icon={Hash}
                label="Last Updated By"
                value={stats.lastUpdatedBy}
                subValue="Latest admin action"
              />
              <StatCard
                icon={RefreshCcw}
                label="Last Updated"
                value={
                  stats.lastUpdatedAt
                    ? new Date(stats.lastUpdatedAt).toLocaleDateString()
                    : "-"
                }
                subValue={
                  stats.lastUpdatedAt
                    ? new Date(stats.lastUpdatedAt).toLocaleTimeString()
                    : "No updates yet"
                }
              />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className={`${cardClass} p-5 md:p-6 xl:col-span-1`}>
            <div className="mb-4 flex items-center gap-3">
              <div className={iconWrapClass}>
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Add Product Codes</h2>
                <p className="text-sm text-zinc-500">
                  Comma, space ya new line se codes add karo.
                </p>
              </div>
            </div>

            <textarea
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder={`Example:\n000243\n000456\nTOP-001\nDRS900`}
              rows={8}
              className={`${softInputClass} resize-none`}
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={handleAddManualCodes}
                disabled={actionLoading || saving}
                className={`${softButtonClass} bg-black text-white hover:bg-zinc-800`}
              >
                <Plus className="h-4 w-4" />
                Add Codes
              </button>
            </div>
          </div>

          <div className={`${cardClass} p-5 md:p-6 xl:col-span-1`}>
            <div className="mb-4 flex items-center gap-3">
              <div className={iconWrapClass}>
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Remove Product Codes</h2>
                <p className="text-sm text-zinc-500">
                  Remove karne ke liye codes paste karo.
                </p>
              </div>
            </div>

            <textarea
              value={removeInput}
              onChange={(e) => setRemoveInput(e.target.value)}
              placeholder={`Example:\n000243\nTOP-001`}
              rows={8}
              className={`${softInputClass} resize-none`}
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={handleRemoveManualCodes}
                disabled={actionLoading || saving}
                className={`${softButtonClass} bg-zinc-900 text-white hover:bg-black`}
              >
                <Trash2 className="h-4 w-4" />
                Remove Codes
              </button>

              <button
                onClick={handleClearAll}
                disabled={actionLoading || !selectedCodes.length}
                className={`${softButtonClass} bg-[#f4f4f4] text-black ring-1 ring-black/8 hover:bg-[#ebebeb]`}
              >
                <Trash2 className="h-4 w-4" />
                Clear All
              </button>
            </div>
          </div>

          <div className={`${cardClass} p-5 md:p-6 xl:col-span-1`}>
            <div className="mb-4 flex items-center gap-3">
              <div className={iconWrapClass}>
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Excel Upload</h2>
                <p className="text-sm text-zinc-500">
                  Excel upload karo, codes auto read ho jayenge.
                </p>
              </div>
            </div>

            <div
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(false);
              }}
              onDrop={handleDrop}
              className={`rounded-[22px] p-5 text-center transition ${
                dragActive ? "bg-[#ededed] ring-2 ring-black/15" : "bg-[#f6f6f6] ring-1 ring-black/5"
              }`}
            >
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white ring-1 ring-black/5">
                <Upload className="h-6 w-6" />
              </div>

              <div className="text-sm font-medium">
                Drag & drop excel here
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                Supports .xlsx, .xls, .csv
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelInputChange}
                className="hidden"
              />

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`${softButtonClass} bg-black text-white hover:bg-zinc-800`}
                >
                  <Upload className="h-4 w-4" />
                  Upload File
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSampleExcel}
                  className={`${softButtonClass} bg-white text-black ring-1 ring-black/8 hover:bg-[#f8f8f8]`}
                >
                  <Download className="h-4 w-4" />
                  Sample Excel
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-[20px] bg-[#fafafa] p-4 ring-1 ring-black/5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-black">
                    {excelFileName || "No file selected"}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {excelLoading
                      ? "Reading file..."
                      : `${excelCodes.length} code(s) ready`}
                  </div>
                </div>

                <button
                  onClick={handleAddExcelCodes}
                  disabled={actionLoading || !excelCodes.length}
                  className={`${softButtonClass} bg-black text-white hover:bg-zinc-800`}
                >
                  <Plus className="h-4 w-4" />
                  Add Excel Codes
                </button>
              </div>

              {!!excelCodes.length && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {excelCodes.slice(0, 30).map((code) => (
                    <span
                      key={code}
                      className="rounded-full bg-white px-3 py-1 text-xs font-medium text-black ring-1 ring-black/8"
                    >
                      {code}
                    </span>
                  ))}
                  {excelCodes.length > 30 && (
                    <span className="rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
                      +{excelCodes.length - 30} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className={`${cardClass} p-5 md:p-6`}>
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className={iconWrapClass}>
                <Search className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Product Picker</h2>
                <p className="text-sm text-zinc-500">
                  Search, scroll aur directly products select karke add karo.
                </p>
              </div>
            </div>

            <button
              onClick={handleAddPickerSelection}
              disabled={actionLoading || !pickerSelectedCodes.length}
              className={`${softButtonClass} bg-black text-white hover:bg-zinc-800`}
            >
              <Plus className="h-4 w-4" />
              Add Selected Products
            </button>
          </div>

          <div className="rounded-[24px] bg-[#f7f7f7] p-3 md:p-4 ring-1 ring-black/5">
            <ProductPicker
              title="Select Products for Commerce Manager"
              multiple
              value={selectedProductIds}
              onChange={setSelectedProductIds}
              defaultCategory={selectedCategory}
              categoryOptions={[]}
            />
          </div>

          <div className="mt-5 rounded-[22px] bg-[#fafafa] p-4 ring-1 ring-black/5">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-black">
                  Picker Selected Codes: {pickerSelectedCodes.length}
                </div>
                <div className="text-xs text-zinc-500">
                  Product code milne wale selected items hi add honge.
                </div>
              </div>
            </div>

            {!!pickerSelectedProductsPreview.length && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {pickerSelectedProductsPreview.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center gap-3 rounded-[20px] bg-white p-3 ring-1 ring-black/5"
                  >
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-[#f3f3f3] ring-1 ring-black/5">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-zinc-500">NO IMG</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-black">
                        {item.title}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                        <Hash className="h-3.5 w-3.5" />
                        {item.code}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className={`${cardClass} p-5 md:p-6`}>
          <div className="mb-5 flex items-center gap-3">
            <div className={iconWrapClass}>
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Selected Product Codes</h2>
              <p className="text-sm text-zinc-500">
                Yehi codes commerce manager feed ke liye use honge.
              </p>
            </div>
          </div>

          {!loading && !matchedSelectedProducts.length ? (
            <div className="rounded-[24px] bg-[#f8f8f8] px-6 py-10 text-center text-sm text-zinc-500 ring-1 ring-black/5">
              No product codes selected yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {matchedSelectedProducts.map((item) => (
                <div
                  key={item.code}
                  className="flex items-center gap-3 rounded-[22px] bg-[#fafafa] p-3 ring-1 ring-black/5"
                >
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-zinc-500">NO IMG</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-black">
                      {item.title}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                      <Hash className="h-3.5 w-3.5" />
                      {item.code}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveSingleCode(item.code)}
                    disabled={actionLoading}
                    className="rounded-2xl bg-white p-2.5 text-black ring-1 ring-black/8 transition hover:bg-[#f4f4f4] disabled:opacity-60"
                    title="Remove code"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className={`${cardClass} p-5 md:p-6`}>
          <div className="mb-4 flex items-center gap-3">
            <div className={iconWrapClass}>
              <Save className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Notes</h2>
              <p className="text-sm text-zinc-500">
                Commerce manager related notes save kar lo.
              </p>
            </div>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Write notes here..."
            rows={5}
            className={`${softInputClass} resize-none`}
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={handleSaveNotes}
              disabled={saving}
              className={`${softButtonClass} bg-black text-white hover:bg-zinc-800`}
            >
              <Save className="h-4 w-4" />
              Save Notes
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}