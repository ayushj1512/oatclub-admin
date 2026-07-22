"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import { useAdminProductStore } from "@/store/adminProductStore";

const normalizeKeywords = (value) => {
  const list = Array.isArray(value)
    ? value
    : String(value || "").split(",");

  return Array.from(
    new Set(
      list
        .map((item) =>
          String(item || "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean),
    ),
  );
};

const keywordsToText = (value) =>
  normalizeKeywords(value).join(", ");

const createDraft = (product = {}) => ({
  metaTitle: String(
    product.metaTitle || "",
  ),

  metaDescription: String(
    product.metaDescription || "",
  ),

  keywords: keywordsToText(
    product.keywords,
  ),
});

const isDraftChanged = (
  product,
  draft,
) => {
  if (!product || !draft) return false;

  const currentTitle = String(
    product.metaTitle || "",
  ).trim();

  const currentDescription = String(
    product.metaDescription || "",
  ).trim();

  const currentKeywords = keywordsToText(
    product.keywords,
  );

  return (
    currentTitle !==
      String(
        draft.metaTitle || "",
      ).trim() ||
    currentDescription !==
      String(
        draft.metaDescription || "",
      ).trim() ||
    currentKeywords !==
      keywordsToText(draft.keywords)
  );
};

const inputClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-black outline-none transition focus:border-black";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

export default function ProductMetaManager({
  title = "Product Metadata",
  description = "Search, edit and bulk update product SEO metadata.",
  initialCategory = "",
  initialStatus = "all",
  showDispatchFilter = false,
}) {
  const {
    products,
    page,
    pages,
    total,
    loading,
    saving,
    metadataPreview,

    fetchProducts,
    previewBulkMetadata,
    confirmBulkMetadata,
    clearMetadataPreview,
  } = useAdminProductStore();

  const [search, setSearch] =
    useState("");

  const [productCode, setProductCode] =
    useState("");

  const [category, setCategory] =
    useState(initialCategory);

  const [status, setStatus] =
    useState(initialStatus);

  const [
    dispatchStatus,
    setDispatchStatus,
  ] = useState("all");

  const [currentPage, setCurrentPage] =
    useState(1);

  const [selectedIds, setSelectedIds] =
    useState([]);

  const [drafts, setDrafts] =
    useState({});

  const [bulkField, setBulkField] =
    useState("metaTitle");

  const [bulkValue, setBulkValue] =
    useState("");

  const limit = 50;

  const loadProducts = async (
    requestedPage = currentPage,
  ) => {
    const params = {
      page: requestedPage,
      limit,
      sort: "newest",
    };

    if (search.trim()) {
      params.search = search.trim();
    }

    if (productCode.trim()) {
      params.productCode =
        productCode.trim();
    }

    if (category.trim()) {
      params.category =
        category.trim();
    }

    if (status === "published") {
      params.isActive = true;
      params.isDraft = false;
    }

    if (status === "draft") {
      params.isDraft = true;
    }

    if (status === "inactive") {
      params.isActive = false;
    }

    if (
      showDispatchFilter &&
      dispatchStatus !== "all"
    ) {
      params.isDispatchReady =
        dispatchStatus === "ready";
    }

    await fetchProducts(params);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      loadProducts(1);
    }, 350);

    return () =>
      clearTimeout(timer);
  }, [
    search,
    productCode,
    category,
    status,
    dispatchStatus,
  ]);

  useEffect(() => {
    setDrafts(() => {
      const next = {};

      for (const product of products || []) {
        next[product._id] =
          createDraft(product);
      }

      return next;
    });

    setSelectedIds([]);
    clearMetadataPreview();
  }, [products]);

  const changedIds = useMemo(
    () =>
      (products || [])
        .filter((product) =>
          isDraftChanged(
            product,
            drafts[product._id],
          ),
        )
        .map((product) => product._id),
    [products, drafts],
  );

  const changedRows = useMemo(
    () =>
      (products || [])
        .filter((product) =>
          changedIds.includes(
            product._id,
          ),
        )
        .map((product) => {
          const draft =
            drafts[product._id] || {};

          return {
            productCode:
              product.productCode,

            metaTitle: String(
              draft.metaTitle || "",
            ).trim(),

            metaDescription: String(
              draft.metaDescription || "",
            ).trim(),

            keywords:
              normalizeKeywords(
                draft.keywords,
              ),
          };
        }),
    [products, drafts, changedIds],
  );

  const allVisibleSelected =
    products.length > 0 &&
    products.every((product) =>
      selectedIds.includes(product._id),
    );

  const updateDraft = (
    id,
    field,
    value,
  ) => {
    setDrafts((current) => ({
      ...current,

      [id]: {
        ...(current[id] || {}),
        [field]: value,
      },
    }));

    clearMetadataPreview();
  };

  const toggleSelected = (id) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter(
            (item) => item !== id,
          )
        : [...current, id],
    );
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(
      products.map(
        (product) => product._id,
      ),
    );
  };

  const selectChangedRows = () => {
    setSelectedIds(changedIds);
  };

  const resetRow = (product) => {
    setDrafts((current) => ({
      ...current,
      [product._id]:
        createDraft(product),
    }));

    clearMetadataPreview();
  };

  const resetAllChanges = () => {
    const next = {};

    for (const product of products) {
      next[product._id] =
        createDraft(product);
    }

    setDrafts(next);
    clearMetadataPreview();
  };

  const applyBulkValue = () => {
    if (!selectedIds.length) return;

    setDrafts((current) => {
      const next = { ...current };

      selectedIds.forEach((id) => {
        next[id] = {
          ...(next[id] || {}),

          [bulkField]:
            bulkField === "keywords"
              ? keywordsToText(
                  bulkValue,
                )
              : bulkValue,
        };
      });

      return next;
    });

    clearMetadataPreview();
  };

  const previewChanges = async () => {
    if (!changedRows.length) return;

    await previewBulkMetadata(
      changedRows,
    );
  };

  const confirmChanges = async () => {
    const result =
      await confirmBulkMetadata();

    if (result) {
      await loadProducts(currentPage);
    }
  };

  const goToPage = async (
    nextPage,
  ) => {
    if (
      nextPage < 1 ||
      nextPage > pages
    ) {
      return;
    }

    setCurrentPage(nextPage);
    await loadProducts(nextPage);
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4 text-black md:p-6">
      <div className="mx-auto max-w-[1600px] space-y-5">
        {/* Header */}

        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-5 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {title}
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              {description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium">
              {total} products
            </span>

            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
              {changedIds.length} changed
            </span>

            <button
              type="button"
              onClick={() =>
                loadProducts(
                  currentPage,
                )
              }
              disabled={loading}
              className={`${buttonClass} border border-neutral-200 bg-white hover:border-black`}
            >
              <RefreshCw
                size={16}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>
          </div>
        </div>

          {metadataPreview ? (
          <div className="rounded-2xl border border-black bg-white p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <h2 className="text-lg font-semibold">
                  Confirm metadata changes
                </h2>

                <p className="mt-1 text-sm text-neutral-500">
                  Review the detected
                  changes before updating
                  products.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  clearMetadataPreview
                }
                className="rounded-lg border border-neutral-200 p-2"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <SummaryCard
                label="Changed"
                value={
                  metadataPreview
                    ?.summary
                    ?.changedProducts ||
                  0
                }
              />

              <SummaryCard
                label="Unchanged"
                value={
                  metadataPreview
                    ?.summary
                    ?.unchangedProducts ||
                  0
                }
              />

              <SummaryCard
                label="Not found"
                value={
                  metadataPreview
                    ?.summary
                    ?.notFoundProducts ||
                  0
                }
              />
            </div>

            <div className="mt-5 max-h-[360px] space-y-2 overflow-y-auto">
              {(
                metadataPreview.changes ||
                []
              ).map((item) => (
                <div
                  key={
                    item.productCode
                  }
                  className="rounded-xl border border-neutral-200 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">
                        {item.title}
                      </p>

                      <p className="text-xs text-neutral-500">
                        #
                        {
                          item.productCode
                        }
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {(
                        item.changedFields ||
                        []
                      ).map(
                        (field) => (
                          <span
                            key={field}
                            className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-700"
                          >
                            {field}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={
                  clearMetadataPreview
                }
                className={`${buttonClass} border border-neutral-200 bg-white`}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  confirmChanges
                }
                disabled={
                  saving ||
                  !metadataPreview
                    ?.changes?.length
                }
                className={`${buttonClass} bg-black text-white hover:bg-neutral-800`}
              >
                <Save size={16} />

                {saving
                  ? "Updating..."
                  : "Confirm update"}
              </button>
            </div>
          </div>
        ) : null}

        {/* Filters */}

        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Filter size={17} />

            <h2 className="text-sm font-semibold">
              Search & filters
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search title or metadata"
                className={`${inputClass} pl-9`}
              />
            </div>

            <input
              value={productCode}
              onChange={(event) =>
                setProductCode(
                  event.target.value,
                )
              }
              placeholder="Product code"
              className={inputClass}
            />

            <input
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target.value,
                )
              }
              placeholder="Category"
              className={inputClass}
            />

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value,
                )
              }
              className={inputClass}
            >
              <option value="all">
                All statuses
              </option>

              <option value="published">
                Published
              </option>

              <option value="draft">
                Draft
              </option>

              <option value="inactive">
                Inactive
              </option>
            </select>

            {showDispatchFilter ? (
              <select
                value={dispatchStatus}
                onChange={(event) =>
                  setDispatchStatus(
                    event.target.value,
                  )
                }
                className={inputClass}
              >
                <option value="all">
                  All dispatch statuses
                </option>

                <option value="ready">
                  Dispatch ready
                </option>

                <option value="not-ready">
                  Not dispatch ready
                </option>
              </select>
            ) : null}
          </div>
        </div>

        {/* Bulk editor */}

        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid flex-1 gap-3 sm:grid-cols-[220px_1fr_auto]">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-500">
                  Bulk field
                </label>

                <select
                  value={bulkField}
                  onChange={(event) =>
                    setBulkField(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                >
                  <option value="metaTitle">
                    Meta title
                  </option>

                  <option value="metaDescription">
                    Meta description
                  </option>

                  <option value="keywords">
                    Keywords
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-500">
                  Bulk value
                </label>

                <input
                  value={bulkValue}
                  onChange={(event) =>
                    setBulkValue(
                      event.target.value,
                    )
                  }
                  placeholder={
                    bulkField ===
                    "keywords"
                      ? "dress, women, party"
                      : "Enter value"
                  }
                  className={inputClass}
                />
              </div>

              <button
                type="button"
                disabled={
                  !selectedIds.length
                }
                onClick={applyBulkValue}
                className={`${buttonClass} bg-black text-white hover:bg-neutral-800`}
              >
                <Sparkles size={16} />
                Apply to selected
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={
                  selectChangedRows
                }
                disabled={
                  !changedIds.length
                }
                className={`${buttonClass} border border-neutral-200 bg-white`}
              >
                Select changed
              </button>

              <button
                type="button"
                onClick={
                  resetAllChanges
                }
                disabled={
                  !changedIds.length
                }
                className={`${buttonClass} border border-neutral-200 bg-white`}
              >
                <X size={16} />
                Reset
              </button>

              <button
                type="button"
                onClick={
                  previewChanges
                }
                disabled={
                  loading ||
                  !changedRows.length
                }
                className={`${buttonClass} bg-black text-white hover:bg-neutral-800`}
              >
                <Check size={16} />
                Preview changes
              </button>
            </div>
          </div>

          <p className="mt-3 text-xs text-neutral-500">
            {selectedIds.length} selected ·{" "}
            {changedIds.length} modified
          </p>
        </div>

        {/* Products table */}

        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-[1300px] w-full border-collapse">
              <thead className="bg-neutral-50">
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={
                        allVisibleSelected
                      }
                      onChange={
                        toggleSelectAll
                      }
                    />
                  </th>

                  <th className="px-4 py-3">
                    Product
                  </th>

                  <th className="w-[300px] px-4 py-3">
                    Meta title
                  </th>

                  <th className="w-[420px] px-4 py-3">
                    Meta description
                  </th>

                  <th className="w-[300px] px-4 py-3">
                    Keywords
                  </th>

                  <th className="w-28 px-4 py-3">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-16 text-center text-sm text-neutral-500"
                    >
                      Loading products...
                    </td>
                  </tr>
                ) : products.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-16 text-center text-sm text-neutral-500"
                    >
                      No products found.
                    </td>
                  </tr>
                ) : (
                  products.map(
                    (product) => {
                      const draft =
                        drafts[
                          product._id
                        ] ||
                        createDraft(
                          product,
                        );

                      const changed =
                        changedIds.includes(
                          product._id,
                        );

                      return (
                        <tr
                          key={
                            product._id
                          }
                          className={`border-b border-neutral-100 align-top ${
                            changed
                              ? "bg-amber-50/60"
                              : "bg-white"
                          }`}
                        >
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(
                                product._id,
                              )}
                              onChange={() =>
                                toggleSelected(
                                  product._id,
                                )
                              }
                            />
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex min-w-[220px] gap-3">
                              <img
                                src={
                                  product.thumbnail ||
                                  product.images?.[0] ||
                                  "/placeholder.png"
                                }
                                alt={
                                  product.title
                                }
                                className="h-14 w-12 rounded-lg border border-neutral-200 object-cover"
                              />

                              <div>
                                <p className="line-clamp-2 text-sm font-medium">
                                  {
                                    product.title
                                  }
                                </p>

                                <p className="mt-1 text-xs text-neutral-500">
                                  #
                                  {
                                    product.productCode
                                  }
                                </p>

                                <div className="mt-2 flex flex-wrap gap-1">
                                  {changed ? (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                      Modified
                                    </span>
                                  ) : null}

                                  {!product.isActive ? (
                                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                                      Inactive
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <textarea
                              rows={3}
                              maxLength={70}
                              value={
                                draft.metaTitle
                              }
                              onChange={(
                                event,
                              ) =>
                                updateDraft(
                                  product._id,
                                  "metaTitle",
                                  event.target
                                    .value,
                                )
                              }
                              className={inputClass}
                            />

                            <p className="mt-1 text-right text-[10px] text-neutral-400">
                              {
                                draft
                                  .metaTitle
                                  .length
                              }
                              /70
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <textarea
                              rows={4}
                              maxLength={180}
                              value={
                                draft.metaDescription
                              }
                              onChange={(
                                event,
                              ) =>
                                updateDraft(
                                  product._id,
                                  "metaDescription",
                                  event.target
                                    .value,
                                )
                              }
                              className={inputClass}
                            />

                            <p className="mt-1 text-right text-[10px] text-neutral-400">
                              {
                                draft
                                  .metaDescription
                                  .length
                              }
                              /180
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <textarea
                              rows={4}
                              value={
                                draft.keywords
                              }
                              onChange={(
                                event,
                              ) =>
                                updateDraft(
                                  product._id,
                                  "keywords",
                                  event.target
                                    .value,
                                )
                              }
                              placeholder="keyword one, keyword two"
                              className={inputClass}
                            />
                          </td>

                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() =>
                                resetRow(
                                  product,
                                )
                              }
                              disabled={
                                !changed
                              }
                              className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-medium hover:border-black disabled:opacity-40"
                            >
                              Reset
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

          {/* Pagination */}

          <div className="flex flex-col justify-between gap-3 border-t border-neutral-200 px-4 py-3 sm:flex-row sm:items-center">
            <p className="text-xs text-neutral-500">
              Page {page || currentPage} of{" "}
              {pages || 1}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={
                  currentPage <= 1 ||
                  loading
                }
                onClick={() =>
                  goToPage(
                    currentPage - 1,
                  )
                }
                className={`${buttonClass} border border-neutral-200 bg-white`}
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <button
                type="button"
                disabled={
                  currentPage >= pages ||
                  loading
                }
                onClick={() =>
                  goToPage(
                    currentPage + 1,
                  )
                }
                className={`${buttonClass} border border-neutral-200 bg-white`}
              >
                Next
                <ChevronRight
                  size={16}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Preview */}

      
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-neutral-50 p-4">
      <p className="text-xs text-neutral-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-semibold">
        {value}
      </p>
    </div>
  );
}