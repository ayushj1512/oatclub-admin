"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Loader2,
  Package,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import { useAdminProductStore } from "@/store/adminProductStore";

const COLUMN_GROUPS = [
  {
    key: "basic",
    label: "Basic Details",
    description: "Product identity and basic information",
    columns: [
      "productCode",
      "title",
      "slug",
      "productType",
      "sku",
      "categories",
      "collections",
      "tags",
      "colors",
      "hsnCode",
    ],
  },
  {
    key: "pricing",
    label: "Pricing",
    description: "Product pricing and currency details",
    columns: [
      "price",
      "compareAtPrice",
      "currency",
    ],
  },
  {
    key: "inventory",
    label: "Inventory",
    description: "Product and variant stock information",
    columns: [
      "stock",
      "reservedStock",
      "availableStock",
      "isInStock",
      "variantStock",
      "variantReservedStock",
      "variantAvailableStock",
    ],
  },
  {
    key: "variants",
    label: "Variants",
    description: "Size, SKU, barcode and pattern details",
    columns: [
      "variantSize",
      "variantSku",
      "variantBarcode",
      "patternNumber",
    ],
  },
  {
    key: "fabric",
    label: "Fabric & Production",
    description: "Fabric, weight and production information",
    columns: [
      "fabricNames",
      "fabricCodes",
      "fabricColors",
      "fabricRoles",
      "avgFabricConsumption",
      "weight",
      "dimensions",
      "isPatternReady",
      "isSamplingDone",
      "isDispatchReady",
    ],
  },
  {
    key: "status",
    label: "Status & Publishing",
    description: "Product visibility and merchandising status",
    columns: [
      "isActive",
      "isDraft",
      "isFeatured",
      "isBestSeller",
      "isTrending",
      "availableForCollab",
      "isPrimaryProduct",
      "publishAt",
    ],
  },
  {
    key: "analytics",
    label: "Analytics",
    description: "Views, purchases and engagement",
    columns: [
      "averageRating",
      "totalReviews",
      "views",
      "purchases",
      "wishlistCount",
      "cartAdds",
      "searchAppearances",
    ],
  },
  {
    key: "seo",
    label: "SEO & External",
    description: "SEO, WordPress and source details",
    columns: [
      "metaTitle",
      "metaDescription",
      "keywords",
      "wordpressId",
      "originalProductLink",
      "createdAt",
      "updatedAt",
    ],
  },
];

const DEFAULT_COLUMNS = [
  "productCode",
  "title",
  "categories",
  "price",
  "compareAtPrice",
  "variantSize",
  "variantSku",
  "stock",
  "variantStock",
  "isActive",
];

const INVENTORY_COLUMNS = [
  "productCode",
  "title",
  "productType",
  "sku",
  "variantSize",
  "variantSku",
  "stock",
  "reservedStock",
  "availableStock",
  "variantStock",
  "variantReservedStock",
  "variantAvailableStock",
  "isInStock",
];

const PRODUCTION_COLUMNS = [
  "productCode",
  "title",
  "categories",
  "variantSize",
  "variantSku",
  "patternNumber",
  "fabricNames",
  "fabricCodes",
  "fabricColors",
  "avgFabricConsumption",
  "isPatternReady",
  "isSamplingDone",
  "isDispatchReady",
];

const CATALOG_COLUMNS = [
  "productCode",
  "title",
  "slug",
  "categories",
  "collections",
  "tags",
  "colors",
  "price",
  "compareAtPrice",
  "currency",
  "isActive",
  "isDraft",
  "isFeatured",
  "isBestSeller",
  "isTrending",
];

const safeText = (value = "") =>
  String(value ?? "").trim();

const normalizeColumns = (columns = []) =>
  Array.from(
    new Set(
      (Array.isArray(columns) ? columns : [])
        .map((column) =>
          typeof column === "object"
            ? safeText(column?.key)
            : safeText(column),
        )
        .filter(Boolean),
    ),
  );

export default function ProductExcelExportPage() {
  const {
    excelColumns,
    excelColumnsLoading,
    excelExporting,
    bulkSelectedIds,
    fetchProductExcelColumns,
    exportProductsExcel,
  } = useAdminProductStore();

  const [selectedColumns, setSelectedColumns] =
    useState(DEFAULT_COLUMNS);

  const [search, setSearch] = useState("");
  const [variantMode, setVariantMode] =
    useState("separate_rows");

  const [exportScope, setExportScope] =
    useState("all");

  const [fileName, setFileName] =
    useState("oatclub-products");

  const [filters, setFilters] = useState({
    search: "",
    category: "",
    isActive: "",
    isDraft: "",
    isInStock: "",
    isDispatchReady: "",
    availableForCollab: "",
  });

  const [openGroups, setOpenGroups] = useState(
    () =>
      new Set([
        "basic",
        "pricing",
        "inventory",
        "variants",
      ]),
  );

  useEffect(() => {
    fetchProductExcelColumns();
  }, [fetchProductExcelColumns]);

  const columnMap = useMemo(() => {
    const map = new Map();

    (excelColumns || []).forEach((column) => {
      map.set(column.key, column);
    });

    return map;
  }, [excelColumns]);

  const availableColumnKeys = useMemo(
    () =>
      new Set(
        (excelColumns || []).map(
          (column) => column.key,
        ),
      ),
    [excelColumns],
  );

  useEffect(() => {
    if (!availableColumnKeys.size) return;

    setSelectedColumns((current) => {
      const valid = current.filter((key) =>
        availableColumnKeys.has(key),
      );

      if (valid.length) return valid;

      return DEFAULT_COLUMNS.filter((key) =>
        availableColumnKeys.has(key),
      );
    });
  }, [availableColumnKeys]);

  const groupedColumns = useMemo(() => {
    const groupedKeys = new Set(
      COLUMN_GROUPS.flatMap(
        (group) => group.columns,
      ),
    );

    const groups = COLUMN_GROUPS.map((group) => ({
      ...group,
      columns: group.columns
        .map((key) => columnMap.get(key))
        .filter(Boolean),
    })).filter((group) => group.columns.length);

    const uncategorized = (excelColumns || []).filter(
      (column) => !groupedKeys.has(column.key),
    );

    if (uncategorized.length) {
      groups.push({
        key: "other",
        label: "Other Fields",
        description: "Additional available product fields",
        columns: uncategorized,
      });
    }

    return groups;
  }, [columnMap, excelColumns]);

  const visibleGroups = useMemo(() => {
    const query = safeText(search).toLowerCase();

    if (!query) return groupedColumns;

    return groupedColumns
      .map((group) => ({
        ...group,
        columns: group.columns.filter(
          (column) =>
            column.label
              ?.toLowerCase()
              .includes(query) ||
            column.key
              ?.toLowerCase()
              .includes(query),
        ),
      }))
      .filter((group) => group.columns.length);
  }, [groupedColumns, search]);

  const selectedSet = useMemo(
    () => new Set(selectedColumns),
    [selectedColumns],
  );

  const allAvailableKeys = useMemo(
    () =>
      (excelColumns || []).map(
        (column) => column.key,
      ),
    [excelColumns],
  );

  const selectedCount = selectedColumns.length;
  const totalCount = allAvailableKeys.length;

  const toggleColumn = (key) => {
    setSelectedColumns((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  };

  const toggleGroup = (group) => {
    const groupKeys = group.columns.map(
      (column) => column.key,
    );

    const allSelected = groupKeys.every((key) =>
      selectedSet.has(key),
    );

    setSelectedColumns((current) => {
      const next = new Set(current);

      groupKeys.forEach((key) => {
        if (allSelected) {
          next.delete(key);
        } else {
          next.add(key);
        }
      });

      return Array.from(next);
    });
  };

  const toggleGroupOpen = (groupKey) => {
    setOpenGroups((current) => {
      const next = new Set(current);

      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }

      return next;
    });
  };

  const selectAll = () => {
    setSelectedColumns(allAvailableKeys);
  };

  const clearAll = () => {
    setSelectedColumns([]);
  };

  const applyPreset = (columns) => {
    const validColumns = normalizeColumns(
      columns,
    ).filter((key) =>
      availableColumnKeys.has(key),
    );

    setSelectedColumns(validColumns);
  };

  const resetPage = () => {
    setSelectedColumns(
      DEFAULT_COLUMNS.filter((key) =>
        availableColumnKeys.has(key),
      ),
    );

    setSearch("");
    setVariantMode("separate_rows");
    setExportScope("all");
    setFileName("oatclub-products");

    setFilters({
      search: "",
      category: "",
      isActive: "",
      isDraft: "",
      isInStock: "",
      isDispatchReady: "",
      availableForCollab: "",
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const cleanFilters = useMemo(() => {
    return Object.fromEntries(
      Object.entries(filters).filter(
        ([, value]) =>
          value !== undefined &&
          value !== null &&
          safeText(value) !== "",
      ),
    );
  }, [filters]);

  const handleExport = async () => {
    const productIds =
      exportScope === "selected"
        ? bulkSelectedIds || []
        : [];

    await exportProductsExcel({
      columns: selectedColumns,
      productIds,
      filters: cleanFilters,
      variantMode,
      fileName:
        safeText(fileName) ||
        "oatclub-products",
    });
  };

  const canExport =
    selectedColumns.length > 0 &&
    !excelExporting &&
    !excelColumnsLoading &&
    !(
      exportScope === "selected" &&
      !(bulkSelectedIds || []).length
    );

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-5 text-neutral-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-black text-white">
              <FileSpreadsheet size={23} />
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                OATCLUB Admin
              </p>

              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Product Excel Export
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                Choose only the columns you need,
                apply filters and download a clean
                product Excel report.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={resetPage}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-medium transition hover:bg-neutral-50"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm">
              <div className="border-b border-neutral-100 p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">
                      Select columns
                    </h2>

                    <p className="mt-1 text-sm text-neutral-500">
                      {selectedCount} of {totalCount}{" "}
                      columns selected
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={selectAll}
                      disabled={!totalCount}
                      className="rounded-xl border border-neutral-200 px-3.5 py-2 text-sm font-medium transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Select all
                    </button>

                    <button
                      type="button"
                      onClick={clearAll}
                      disabled={!selectedCount}
                      className="rounded-xl border border-neutral-200 px-3.5 py-2 text-sm font-medium transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Clear all
                    </button>
                  </div>
                </div>

                <div className="relative mt-5">
                  <Search
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
                  />

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search columns..."
                    className="h-12 w-full rounded-2xl border border-neutral-200 bg-neutral-50 pl-11 pr-11 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white"
                  />

                  {search ? (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-200 hover:text-neutral-900"
                    >
                      <X size={16} />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {excelColumnsLoading ? (
                  <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-neutral-500">
                    <Loader2
                      size={28}
                      className="animate-spin"
                    />
                    <p className="text-sm">
                      Loading export columns...
                    </p>
                  </div>
                ) : !visibleGroups.length ? (
                  <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-6 text-center">
                    <Search
                      size={28}
                      className="mb-3 text-neutral-400"
                    />

                    <h3 className="font-semibold">
                      No columns found
                    </h3>

                    <p className="mt-1 text-sm text-neutral-500">
                      Try a different search term.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleGroups.map((group) => {
                      const groupKeys =
                        group.columns.map(
                          (column) => column.key,
                        );

                      const selectedInGroup =
                        groupKeys.filter((key) =>
                          selectedSet.has(key),
                        ).length;

                      const allGroupSelected =
                        selectedInGroup ===
                        groupKeys.length;

                      const isOpen =
                        openGroups.has(group.key) ||
                        Boolean(search);

                      return (
                        <div
                          key={group.key}
                          className="overflow-hidden rounded-2xl border border-neutral-200"
                        >
                          <div className="flex items-center gap-3 bg-neutral-50 p-3 sm:p-4">
                            <button
                              type="button"
                              onClick={() =>
                                toggleGroup(group)
                              }
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
                                allGroupSelected
                                  ? "border-black bg-black text-white"
                                  : selectedInGroup > 0
                                    ? "border-black bg-neutral-200 text-black"
                                    : "border-neutral-300 bg-white text-transparent"
                              }`}
                            >
                              <Check size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                toggleGroupOpen(
                                  group.key,
                                )
                              }
                              className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-semibold">
                                    {group.label}
                                  </h3>

                                  <span className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-500">
                                    {selectedInGroup}/
                                    {
                                      group.columns
                                        .length
                                    }
                                  </span>
                                </div>

                                <p className="mt-1 truncate text-xs text-neutral-500 sm:text-sm">
                                  {group.description}
                                </p>
                              </div>

                              <ChevronDown
                                size={18}
                                className={`shrink-0 text-neutral-500 transition-transform ${
                                  isOpen
                                    ? "rotate-180"
                                    : ""
                                }`}
                              />
                            </button>
                          </div>

                          {isOpen ? (
                            <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3">
                              {group.columns.map(
                                (column) => {
                                  const checked =
                                    selectedSet.has(
                                      column.key,
                                    );

                                  return (
                                    <button
                                      key={column.key}
                                      type="button"
                                      onClick={() =>
                                        toggleColumn(
                                          column.key,
                                        )
                                      }
                                      className={`flex min-h-14 items-center gap-3 rounded-xl border p-3 text-left transition ${
                                        checked
                                          ? "border-black bg-black text-white"
                                          : "border-neutral-200 bg-white hover:border-neutral-400 hover:bg-neutral-50"
                                      }`}
                                    >
                                      <span
                                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                          checked
                                            ? "border-white bg-white text-black"
                                            : "border-neutral-300 text-transparent"
                                        }`}
                                      >
                                        <Check
                                          size={13}
                                        />
                                      </span>

                                      <span className="min-w-0">
                                        <span className="block truncate text-sm font-medium">
                                          {column.label}
                                        </span>

                                        <span
                                          className={`mt-0.5 block truncate text-[11px] ${
                                            checked
                                              ? "text-neutral-300"
                                              : "text-neutral-400"
                                          }`}
                                        >
                                          {column.key}
                                        </span>
                                      </span>
                                    </button>
                                  );
                                },
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
            <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <Sparkles size={19} />

                <div>
                  <h2 className="font-semibold">
                    Quick presets
                  </h2>

                  <p className="text-xs text-neutral-500">
                    Start with a useful column set
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <PresetButton
                  label="Standard"
                  onClick={() =>
                    applyPreset(DEFAULT_COLUMNS)
                  }
                />

                <PresetButton
                  label="Inventory"
                  onClick={() =>
                    applyPreset(INVENTORY_COLUMNS)
                  }
                />

                <PresetButton
                  label="Production"
                  onClick={() =>
                    applyPreset(PRODUCTION_COLUMNS)
                  }
                />

                <PresetButton
                  label="Catalogue"
                  onClick={() =>
                    applyPreset(CATALOG_COLUMNS)
                  }
                />
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold">
                Export settings
              </h2>

              <div className="mt-5 space-y-5">
                <Field label="File name">
                  <input
                    value={fileName}
                    onChange={(event) =>
                      setFileName(
                        event.target.value,
                      )
                    }
                    placeholder="oatclub-products"
                    className="h-11 w-full rounded-xl border border-neutral-200 px-3.5 text-sm outline-none transition focus:border-neutral-400"
                  />
                </Field>

                <Field label="Export scope">
                  <div className="grid grid-cols-2 gap-2">
                    <ChoiceButton
                      active={
                        exportScope === "all"
                      }
                      title="All products"
                      subtitle="Use filters"
                      onClick={() =>
                        setExportScope("all")
                      }
                    />

                    <ChoiceButton
                      active={
                        exportScope ===
                        "selected"
                      }
                      title="Selected"
                      subtitle={`${
                        bulkSelectedIds?.length ||
                        0
                      } selected`}
                      onClick={() =>
                        setExportScope(
                          "selected",
                        )
                      }
                    />
                  </div>
                </Field>

                <Field label="Variant layout">
                  <div className="space-y-2">
                    <ChoiceButton
                      active={
                        variantMode ===
                        "separate_rows"
                      }
                      title="Separate rows"
                      subtitle="One Excel row per size"
                      onClick={() =>
                        setVariantMode(
                          "separate_rows",
                        )
                      }
                      fullWidth
                    />

                    <ChoiceButton
                      active={
                        variantMode ===
                        "single_row"
                      }
                      title="Single row"
                      subtitle="All sizes inside one product row"
                      onClick={() =>
                        setVariantMode(
                          "single_row",
                        )
                      }
                      fullWidth
                    />
                  </div>
                </Field>
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold">
                Filters
              </h2>

              <p className="mt-1 text-xs text-neutral-500">
                Leave empty to export every matching
                product.
              </p>

              <div className="mt-5 space-y-4">
                <Field label="Search">
                  <input
                    value={filters.search}
                    onChange={(event) =>
                      handleFilterChange(
                        "search",
                        event.target.value,
                      )
                    }
                    placeholder="Title, code, SKU..."
                    className="h-11 w-full rounded-xl border border-neutral-200 px-3.5 text-sm outline-none transition focus:border-neutral-400"
                  />
                </Field>

                <Field label="Category">
                  <input
                    value={filters.category}
                    onChange={(event) =>
                      handleFilterChange(
                        "category",
                        event.target.value,
                      )
                    }
                    placeholder="dresses"
                    className="h-11 w-full rounded-xl border border-neutral-200 px-3.5 text-sm outline-none transition focus:border-neutral-400"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <SelectField
                    label="Active"
                    value={filters.isActive}
                    onChange={(value) =>
                      handleFilterChange(
                        "isActive",
                        value,
                      )
                    }
                  />

                  <SelectField
                    label="Draft"
                    value={filters.isDraft}
                    onChange={(value) =>
                      handleFilterChange(
                        "isDraft",
                        value,
                      )
                    }
                  />

                  <SelectField
                    label="In stock"
                    value={filters.isInStock}
                    onChange={(value) =>
                      handleFilterChange(
                        "isInStock",
                        value,
                      )
                    }
                  />

                  <SelectField
                    label="Dispatch ready"
                    value={
                      filters.isDispatchReady
                    }
                    onChange={(value) =>
                      handleFilterChange(
                        "isDispatchReady",
                        value,
                      )
                    }
                  />

                  <div className="col-span-2">
                    <SelectField
                      label="Collab ready"
                      value={
                        filters.availableForCollab
                      }
                      onChange={(value) =>
                        handleFilterChange(
                          "availableForCollab",
                          value,
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-black p-5 text-white shadow-lg">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Package size={19} />
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    Ready to export
                  </p>

                  <p className="mt-1 text-xs leading-5 text-neutral-400">
                    {selectedCount} columns ·{" "}
                    {variantMode ===
                    "separate_rows"
                      ? "one row per variant"
                      : "one row per product"}
                  </p>
                </div>
              </div>

              {exportScope === "selected" &&
              !(bulkSelectedIds || []).length ? (
                <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs leading-5 text-amber-200">
                  No products are selected. Select
                  products from the product listing or
                  choose “All products”.
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleExport}
                disabled={!canExport}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {excelExporting ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    Preparing Excel...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Download Excel
                  </>
                )}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </span>

      {children}
    </label>
  );
}

function PresetButton({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm font-medium transition hover:border-neutral-400 hover:bg-white"
    >
      {label}
    </button>
  );
}

function ChoiceButton({
  active,
  title,
  subtitle,
  onClick,
  fullWidth = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${fullWidth ? "w-full" : ""} rounded-xl border p-3 text-left transition ${
        active
          ? "border-black bg-black text-white"
          : "border-neutral-200 bg-white hover:border-neutral-400"
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">
          {title}
        </span>

        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
            active
              ? "border-white bg-white text-black"
              : "border-neutral-300 text-transparent"
          }`}
        >
          <Check size={12} />
        </span>
      </span>

      <span
        className={`mt-1 block text-xs ${
          active
            ? "text-neutral-300"
            : "text-neutral-500"
        }`}
      >
        {subtitle}
      </span>
    </button>
  );
}

function SelectField({
  label,
  value,
  onChange,
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <select
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="h-11 w-full appearance-none rounded-xl border border-neutral-200 bg-white px-3.5 pr-9 text-sm outline-none transition focus:border-neutral-400"
        >
          <option value="">All</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>

        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
        />
      </div>
    </Field>
  );
}