"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Expand,
  IndianRupee,
  Loader2,
  RefreshCw,
  Save,
  Search,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "react-hot-toast";

import { useAdminProductStore } from "@/store/adminProductStore";
import { useProductCostingStore } from "@/store/productCostingStore";

const PAGE_SIZE = 100;

const COST_FIELDS = [
  { key: "fabricCost", label: "Fabric" },
  { key: "trimsCost", label: "Trims" },
  { key: "cuttingCost", label: "Cutting" },
  { key: "stitchingCost", label: "Stitching" },
  { key: "finishingCost", label: "Finishing" },
  { key: "ironingCost", label: "Ironing" },
  { key: "packagingCost", label: "Packaging" },
  { key: "miscellaneousCost", label: "Misc." },
];

const EMPTY_COSTING = {
  fabricCost: "",
  trimsCost: "",
  cuttingCost: "",
  stitchingCost: "",
  finishingCost: "",
  ironingCost: "",
  packagingCost: "",
  miscellaneousCost: "",
  note: "",
};

const num = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num(value));

const getTotal = (row = {}) =>
  COST_FIELDS.reduce(
    (sum, field) => sum + num(row[field.key]),
    0,
  );

const getImage = (product = {}) =>
  product.thumbnail ||
  product.image ||
  product.images?.[0] ||
  "/placeholder.png";

export default function ProductCostingPage() {
  const firstLoad = useRef(false);

  const {
    products,
    loading,
    page,
    pages,
    total,
    fetchProducts,
  } = useAdminProductStore();

  const {
    costings,
    saving,
    fetchCostings,
    saveCosting,
  } = useProductCostingStore();

  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState({});
  const [savingCode, setSavingCode] = useState(null);

  const [preview, setPreview] = useState(null);
  const [mounted, setMounted] = useState(false);


  /* =========================================================
     COSTING MAP
  ========================================================= */

  const costingMap = useMemo(
    () =>
      new Map(
        (costings || []).map((item) => [
          String(item.productCode || ""),
          item,
        ]),
      ),
    [costings],
  );

  /* =========================================================
     LOAD
  ========================================================= */

  const load = async ({
    nextPage = 1,
    searchValue = search,
  } = {}) => {
    await Promise.all([
      fetchProducts({
        page: nextPage,
        limit: PAGE_SIZE,
        search: searchValue,
        sortKey: "productCode",
        sortDir: "asc",
      }),

      fetchCostings({
        all: true,
      }),
    ]);
  };

  useEffect(() => {
    if (firstLoad.current) return;

    firstLoad.current = true;

    load({
      nextPage: 1,
      searchValue: "",
    });
  }, []);

  /* =========================================================
     ESC CLOSE IMAGE PREVIEW
  ========================================================= */

  useEffect(() => {
    if (!preview) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setPreview(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      document.body.style.overflow =
        oldOverflow;
    };
  }, [preview]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* =========================================================
     SYNC COSTINGS
  ========================================================= */

  useEffect(() => {
    if (!products?.length) return;

    setDrafts((previous) => {
      const next = { ...previous };

      products.forEach((product) => {
        const code = String(
          product.productCode || "",
        );

        if (
          !code ||
          next[code] !== undefined
        ) {
          return;
        }

        const saved =
          costingMap.get(code);

        next[code] = saved
          ? {
            ...EMPTY_COSTING,
            fabricCost:
              saved.fabricCost ?? "",
            trimsCost:
              saved.trimsCost ?? "",
            cuttingCost:
              saved.cuttingCost ?? "",
            stitchingCost:
              saved.stitchingCost ?? "",
            finishingCost:
              saved.finishingCost ?? "",
            ironingCost:
              saved.ironingCost ?? "",
            packagingCost:
              saved.packagingCost ?? "",
            miscellaneousCost:
              saved.miscellaneousCost ??
              "",
            note: saved.note || "",
          }
          : { ...EMPTY_COSTING };
      });

      return next;
    });
  }, [products, costingMap]);

  /* =========================================================
     UPDATE
  ========================================================= */

  const updateCell = (
    productCode,
    key,
    value,
  ) => {
    setDrafts((state) => ({
      ...state,

      [productCode]: {
        ...EMPTY_COSTING,
        ...(state[productCode] || {}),
        [key]: value,
      },
    }));
  };

  /* =========================================================
     SAVE
  ========================================================= */

  const handleSave = async (
    productCode,
  ) => {
    try {
      setSavingCode(productCode);

      const draft =
        drafts[productCode] ||
        EMPTY_COSTING;

      const payload = {};

      COST_FIELDS.forEach(({ key }) => {
        payload[key] = num(
          draft[key],
        );
      });

      payload.note = String(
        draft.note || "",
      ).trim();

      await saveCosting(
        productCode,
        payload,
      );

      toast.success(
        `Costing saved for ${productCode}`,
      );

      await fetchCostings({
        all: true,
      });
    } catch (error) {
      toast.error(
        error?.message ||
        "Failed to save costing",
      );
    } finally {
      setSavingCode(null);
    }
  };

  /* =========================================================
     SEARCH
  ========================================================= */

  const handleSearch = async (e) => {
    e?.preventDefault();

    await load({
      nextPage: 1,
      searchValue: search.trim(),
    });
  };

  const clearSearch = async () => {
    setSearch("");

    await load({
      nextPage: 1,
      searchValue: "",
    });
  };

  /* =========================================================
     IMAGE PREVIEW
  ========================================================= */

  const openPreview = (product) => {
    const image = getImage(product);

    if (
      !image ||
      image === "/placeholder.png"
    ) {
      toast.error(
        "Product image not available",
      );
      return;
    }

    setPreview({
      src: image,
      title:
        product.title ||
        product.name ||
        "Product",
      code:
        product.productCode || "",
    });
  };

  /* =========================================================
     EXCEL
  ========================================================= */

  const exportExcel = async () => {
    try {
      const XLSX =
        await import("xlsx");

      const API =
        process.env
          .NEXT_PUBLIC_BACKEND_URL;

      const params =
        new URLSearchParams();

      params.set("page", "1");
      params.set("limit", "10000");
      params.set(
        "sortKey",
        "productCode",
      );
      params.set("sortDir", "asc");

      if (search.trim()) {
        params.set(
          "search",
          search.trim(),
        );
      }

      const res = await fetch(
        `${API}/api/products?${params.toString()}`,
        {
          cache: "no-store",
          credentials: "include",
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.message ||
          "Failed to load products",
        );
      }

      const allProducts =
        Array.isArray(data?.products)
          ? data.products
          : [];

      const costingRes =
        await fetch(
          `${API}/api/product-costing?all=true`,
          {
            cache: "no-store",
            credentials: "include",
          },
        );

      const costingData =
        await costingRes.json();

      if (!costingRes.ok) {
        throw new Error(
          costingData?.message ||
          "Failed to load costings",
        );
      }

      const map = new Map(
        (
          costingData?.data || []
        ).map((costing) => [
          String(
            costing.productCode ||
            "",
          ),
          costing,
        ]),
      );

      const rows = allProducts.map(
        (product) => {
          const code = String(
            product.productCode ||
            "",
          );

          const costing =
            map.get(code) || {};

          const row = {
            "Product Code": code,
            "Product Name":
              product.title ||
              product.name ||
              "",
            Currency: "INR",
          };

          COST_FIELDS.forEach(
            ({ key, label }) => {
              row[
                `${label} Cost (₹)`
              ] = num(costing[key]);
            },
          );

          row[
            "Manufacturing Cost (₹)"
          ] = getTotal(costing);

          row.Note =
            costing.note || "";

          return row;
        },
      );

      const worksheet =
        XLSX.utils.json_to_sheet(
          rows,
        );

      worksheet["!cols"] = [
        { wch: 16 },
        { wch: 40 },
        { wch: 10 },
        ...COST_FIELDS.map(() => ({
          wch: 16,
        })),
        { wch: 22 },
        { wch: 35 },
      ];

      const workbook =
        XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Product Costing",
      );

      XLSX.writeFile(
        workbook,
        "oatclub-product-costing-INR.xlsx",
      );

      toast.success(
        "Excel exported successfully",
      );
    } catch (error) {
      console.error(
        "Costing Excel Export:",
        error,
      );

      toast.error(
        error?.message ||
        "Excel export failed",
      );
    }
  };

  return (
    <>
      <div className="min-h-screen bg-[#f5f6f8] text-gray-950">
        <div className="w-full space-y-4 p-3 sm:p-4 lg:p-6">
          {/* HEADER */}
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white">
                      <IndianRupee
                        size={17}
                      />
                    </div>

                    <div>
                      <h1 className="text-xl font-black tracking-tight sm:text-2xl">
                        Product Costing
                      </h1>

                      <p className="mt-0.5 text-sm text-gray-500">
                        Manufacturing
                        costing in INR (₹)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      load({
                        nextPage:
                          page || 1,
                      })
                    }
                    disabled={loading}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    <RefreshCw
                      size={15}
                      className={
                        loading
                          ? "animate-spin"
                          : ""
                      }
                    />
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={exportExcel}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-black px-4 text-sm font-bold text-white transition hover:bg-gray-800"
                  >
                    <Download
                      size={15}
                    />
                    Export Excel
                  </button>
                </div>
              </div>
            </div>

            {/* SEARCH */}
            <div className="border-t border-gray-100 bg-gray-50/70 p-4">
              <form
                onSubmit={
                  handleSearch
                }
                className="flex max-w-3xl gap-2"
              >
                <div className="relative flex-1">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    value={search}
                    onChange={(e) =>
                      setSearch(
                        e.target.value,
                      )
                    }
                    placeholder="Search product code or name..."
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-10 text-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/5"
                  />

                  {search && (
                    <button
                      type="button"
                      onClick={
                        clearSearch
                      }
                      className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-black"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="h-10 rounded-xl bg-black px-5 text-sm font-bold text-white"
                >
                  Search
                </button>
              </form>
            </div>
          </section>

          {/* STATS */}
          <div className="flex items-center justify-between gap-3">
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm">
              <span className="text-xs font-bold text-gray-400">
                PRODUCTS
              </span>

              <p className="text-lg font-black">
                {Number(
                  total || 0,
                ).toLocaleString(
                  "en-IN",
                )}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-right shadow-sm">
              <span className="text-xs font-bold text-gray-400">
                PAGE
              </span>

              <p className="text-lg font-black">
                {page || 1} /{" "}
                {pages || 1}
              </p>
            </div>
          </div>

          {/* TABLE */}
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div>
                <h2 className="text-sm font-black">
                  Cost Sheet
                </h2>

                <p className="text-xs text-gray-400">
                  Click image to
                  preview • Values in ₹
                </p>
              </div>

              <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-black text-gray-600">
                INR ₹
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1780px] border-collapse text-sm">
                <thead className="sticky top-0 z-30 bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="sticky left-0 z-40 w-[70px] bg-gray-50 px-3 py-3 text-left text-[11px] font-black uppercase text-gray-500">
                      Image
                    </th>

                    <th className="sticky left-[70px] z-40 w-[110px] bg-gray-50 px-3 py-3 text-left text-[11px] font-black uppercase text-gray-500">
                      Code
                    </th>

                    <th className="sticky left-[180px] z-40 min-w-[250px] bg-gray-50 px-3 py-3 text-left text-[11px] font-black uppercase text-gray-500">
                      Product
                    </th>

                    {COST_FIELDS.map(
                      (field) => (
                        <th
                          key={
                            field.key
                          }
                          className="min-w-[128px] px-2 py-3 text-left text-[11px] font-black uppercase text-gray-500"
                        >
                          {
                            field.label
                          }{" "}
                          ₹
                        </th>
                      ),
                    )}

                    <th className="min-w-[150px] px-3 py-3 text-left text-[11px] font-black uppercase text-gray-500">
                      Total ₹
                    </th>

                    <th className="min-w-[200px] px-3 py-3 text-left text-[11px] font-black uppercase text-gray-500">
                      Note
                    </th>

                    <th className="sticky right-0 z-40 w-[95px] bg-gray-50 px-3 py-3 text-right text-[11px] font-black uppercase text-gray-500">
                      Save
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={
                          COST_FIELDS.length +
                          6
                        }
                        className="py-24 text-center"
                      >
                        <Loader2
                          size={24}
                          className="mx-auto animate-spin text-gray-400"
                        />
                      </td>
                    </tr>
                  ) : !products?.length ? (
                    <tr>
                      <td
                        colSpan={
                          COST_FIELDS.length +
                          6
                        }
                        className="py-24 text-center text-gray-400"
                      >
                        No products
                        found.
                      </td>
                    </tr>
                  ) : (
                    products.map(
                      (product) => {
                        const code =
                          String(
                            product.productCode ||
                            "",
                          );

                        const draft =
                          drafts[
                          code
                          ] ||
                          EMPTY_COSTING;

                        const hasCosting =
                          costingMap.has(
                            code,
                          );

                        const totalCost =
                          getTotal(
                            draft,
                          );

                        const image =
                          getImage(
                            product,
                          );

                        const isSaving =
                          savingCode ===
                          code;

                        return (
                          <tr
                            key={
                              product._id ||
                              code
                            }
                            className="group border-b border-gray-100 transition hover:bg-gray-50"
                          >
                            {/* IMAGE */}
                            <td className="sticky left-0 z-20 bg-white px-3 py-2 group-hover:bg-gray-50">
                              <button
                                type="button"
                                onClick={() =>
                                  openPreview(
                                    product,
                                  )
                                }
                                className="group/image relative block h-11 w-11 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-sm transition hover:border-black hover:shadow-md"
                              >
                                <img
                                  src={
                                    image
                                  }
                                  alt={
                                    product.title ||
                                    product.name ||
                                    code
                                  }
                                  className="h-full w-full object-cover transition duration-200 group-hover/image:scale-105"
                                />

                                <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover/image:bg-black/35 group-hover/image:opacity-100">
                                  <Expand
                                    size={
                                      15
                                    }
                                  />
                                </span>
                              </button>
                            </td>

                            {/* CODE */}
                            <td className="sticky left-[70px] z-20 bg-white px-3 py-2 group-hover:bg-gray-50">
                              <p className="font-black">
                                {code ||
                                  "-"}
                              </p>

                              <span
                                className={`mt-1 inline-flex rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${hasCosting
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                                  }`}
                              >
                                {hasCosting
                                  ? "Filled"
                                  : "Pending"}
                              </span>
                            </td>

                            {/* PRODUCT */}
                            <td className="sticky left-[180px] z-20 bg-white px-3 py-2 group-hover:bg-gray-50">
                              <p className="max-w-[240px] truncate font-bold">
                                {product.title ||
                                  product.name ||
                                  "-"}
                              </p>
                            </td>

                            {/* COSTS */}
                            {COST_FIELDS.map(
                              ({
                                key,
                                label,
                              }) => (
                                <td
                                  key={
                                    key
                                  }
                                  className="px-2 py-2"
                                >
                                  <div className="relative">
                                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                                      ₹
                                    </span>

                                    <input
                                      type="number"
                                      inputMode="decimal"
                                      min="0"
                                      step="0.01"
                                      value={
                                        draft[
                                        key
                                        ] ??
                                        ""
                                      }
                                      onChange={(
                                        e,
                                      ) =>
                                        updateCell(
                                          code,
                                          key,
                                          e
                                            .target
                                            .value,
                                        )
                                      }
                                      onWheel={(
                                        e,
                                      ) =>
                                        e.currentTarget.blur()
                                      }
                                      aria-label={`${label} cost in rupees`}
                                      placeholder="0"
                                      className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-6 pr-2 text-right font-bold tabular-nums outline-none transition focus:border-black focus:ring-2 focus:ring-black/5"
                                    />
                                  </div>
                                </td>
                              ),
                            )}

                            {/* TOTAL */}
                            <td className="px-3 py-2">
                              <div className="rounded-xl bg-black px-3 py-2.5 text-right font-black tabular-nums text-white">
                                {formatINR(
                                  totalCost,
                                )}
                              </div>
                            </td>

                            {/* NOTE */}
                            <td className="px-2 py-2">
                              <input
                                value={
                                  draft.note ||
                                  ""
                                }
                                onChange={(
                                  e,
                                ) =>
                                  updateCell(
                                    code,
                                    "note",
                                    e
                                      .target
                                      .value,
                                  )
                                }
                                placeholder="Optional note"
                                className="h-9 w-full rounded-lg border border-gray-200 px-3 outline-none focus:border-black"
                              />
                            </td>

                            {/* SAVE */}
                            <td className="sticky right-0 z-20 bg-white px-3 py-2 text-right group-hover:bg-gray-50">
                              <button
                                type="button"
                                onClick={() =>
                                  handleSave(
                                    code,
                                  )
                                }
                                disabled={
                                  saving ||
                                  isSaving ||
                                  !code
                                }
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-black px-3 text-xs font-black text-white transition hover:bg-gray-800 disabled:opacity-40"
                              >
                                {isSaving ? (
                                  <Loader2
                                    size={
                                      14
                                    }
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Save
                                    size={
                                      14
                                    }
                                  />
                                )}

                                {isSaving
                                  ? "Saving"
                                  : "Save"}
                              </button>
                            </td>
                          </tr>
                        );
                      },
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* PAGINATION */}
          <section className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
            <p className="text-sm font-bold">
              Page {page || 1} of{" "}
              {pages || 1}
            </p>

            <div className="flex gap-2">
              <button
                disabled={
                  loading ||
                  Number(page || 1) <=
                  1
                }
                onClick={() =>
                  load({
                    nextPage:
                      Number(
                        page || 1,
                      ) - 1,
                  })
                }
                className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm font-bold disabled:opacity-40"
              >
                <ChevronLeft
                  size={15}
                />
                Previous
              </button>

              <button
                disabled={
                  loading ||
                  Number(page || 1) >=
                  Number(
                    pages || 1,
                  )
                }
                onClick={() =>
                  load({
                    nextPage:
                      Number(
                        page || 1,
                      ) + 1,
                  })
                }
                className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-sm font-bold disabled:opacity-40"
              >
                Next
                <ChevronRight
                  size={15}
                />
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* =====================================================
          CUSTOM IMAGE PREVIEW MODAL
      ===================================================== */}

      {mounted &&
        preview &&
        createPortal(
          <div
            className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Product image preview"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                setPreview(null);
              }
            }}
          >
            <div
              className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* HEADER */}
              <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-gray-950">
                    {preview.title}
                  </p>

                  {preview.code && (
                    <p className="mt-0.5 text-xs font-medium text-gray-400">
                      Product #{preview.code}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  aria-label="Close image preview"
                  className="ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-100 hover:text-black"
                >
                  <X size={18} />
                </button>
              </div>

              {/* IMAGE */}
              <div className="flex min-h-0 flex-1 items-center justify-center bg-[#f6f6f6] p-4 sm:p-6">
                <img
                  src={preview.src}
                  alt={preview.title}
                  className="max-h-[80vh] max-w-full select-none rounded-xl object-contain"
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
