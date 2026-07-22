"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  PackageCheck,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import { useAdminProductStore } from "@/store/adminProductStore";

const inputClass =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-black outline-none transition focus:border-black";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

export default function DispatchReadyManager() {
  const {
    products,
    total,
    pages,
    loading,
    saving,
    fetchProducts,
    setDispatchReady,
  } = useAdminProductStore();

  const [search, setSearch] = useState("");
  const [productCode, setProductCode] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("all");
  const [dispatchFilter, setDispatchFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const limit = 50;

  const loadProducts = useCallback(
    async (requestedPage = 1) => {
      const params = {
        page: requestedPage,
        limit,
        sort: "newest",
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (productCode.trim()) {
        params.productCode = productCode.trim();
      }

      if (category.trim()) {
        params.category = category.trim();
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

      if (dispatchFilter !== "all") {
        params.isDispatchReady =
          dispatchFilter === "ready";
      }

      await fetchProducts(params);
    },
    [
      category,
      dispatchFilter,
      fetchProducts,
      productCode,
      search,
      status,
    ],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      setSelectedIds([]);
      loadProducts(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [loadProducts]);

  const readyCount = useMemo(
    () =>
      (products || []).filter(
        (product) => product.isDispatchReady,
      ).length,
    [products],
  );

  const notReadyCount = Math.max(
    0,
    (products || []).length - readyCount,
  );

  const allVisibleSelected =
    products.length > 0 &&
    products.every((product) =>
      selectedIds.includes(product._id),
    );

  const toggleSelection = (id) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(
      products.map((product) => product._id),
    );
  };

  const handleSingleUpdate = async (
    product,
    nextValue,
  ) => {
    await setDispatchReady(
      product._id,
      nextValue,
    );
  };

  const handleBulkUpdate = async (
    nextValue,
  ) => {
    if (!selectedIds.length) return;

    const result = await setDispatchReady(
      selectedIds,
      nextValue,
    );

    if (result) {
      setSelectedIds([]);
    }
  };

  const handleRefresh = async () => {
    setSelectedIds([]);
    await loadProducts(currentPage);
  };

  const goToPage = async (nextPage) => {
    if (
      nextPage < 1 ||
      nextPage > Math.max(1, pages) ||
      loading
    ) {
      return;
    }

    setCurrentPage(nextPage);
    setSelectedIds([]);

    await loadProducts(nextPage);
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4 text-black md:p-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        {/* Header */}

        <section className="flex flex-col justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-5 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <PackageCheck size={24} />

              <h1 className="text-2xl font-semibold tracking-tight">
                Dispatch Ready Products
              </h1>
            </div>

            <p className="mt-1 text-sm text-neutral-500">
              Manage products that can be dispatched
              within 24–48 hours.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium">
              {total || 0} products
            </span>

            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
              {readyCount} ready on page
            </span>

            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
              {notReadyCount} not ready
            </span>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className={`${buttonClass} border border-neutral-200 bg-white hover:border-black`}
            >
              <RefreshCw
                size={16}
                className={
                  loading ? "animate-spin" : ""
                }
              />

              Refresh
            </button>
          </div>
        </section>

        {/* Filters */}

        <section className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search products"
                className={`${inputClass} pl-9`}
              />
            </div>

            <input
              value={productCode}
              onChange={(event) =>
                setProductCode(event.target.value)
              }
              placeholder="Product code"
              className={inputClass}
            />

            <input
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
              placeholder="Category"
              className={inputClass}
            />

            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value)
              }
              className={inputClass}
            >
              <option value="all">
                All product statuses
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

            <select
              value={dispatchFilter}
              onChange={(event) =>
                setDispatchFilter(
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
          </div>
        </section>

        {/* Bulk actions */}

        <section className="flex flex-col justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium">
              {selectedIds.length} product(s)
              selected
            </p>

            <p className="mt-0.5 text-xs text-neutral-500">
              Bulk update the selected products.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={
                !selectedIds.length || saving
              }
              onClick={() =>
                handleBulkUpdate(true)
              }
              className={`${buttonClass} bg-black text-white hover:bg-neutral-800`}
            >
              <Check size={16} />

              Mark Dispatch Ready
            </button>

            <button
              type="button"
              disabled={
                !selectedIds.length || saving
              }
              onClick={() =>
                handleBulkUpdate(false)
              }
              className={`${buttonClass} border border-neutral-200 bg-white hover:border-black`}
            >
              <X size={16} />

              Mark Not Ready
            </button>
          </div>
        </section>

        {/* Product table */}

        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse">
              <thead className="bg-neutral-50">
                <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                    />
                  </th>

                  <th className="px-4 py-3">
                    Product
                  </th>

                  <th className="px-4 py-3">
                    Category
                  </th>

                  <th className="px-4 py-3">
                    Product status
                  </th>

                  <th className="px-4 py-3">
                    Dispatch status
                  </th>

                  <th className="w-52 px-4 py-3">
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
                ) : !products.length ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-16 text-center text-sm text-neutral-500"
                    >
                      No products found.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => {
                    const isReady =
                      Boolean(
                        product.isDispatchReady,
                      );

                    return (
                      <tr
                        key={product._id}
                        className="border-b border-neutral-100 align-middle hover:bg-neutral-50"
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(
                              product._id,
                            )}
                            onChange={() =>
                              toggleSelection(
                                product._id,
                              )
                            }
                          />
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex min-w-[270px] items-center gap-3">
                            <img
                              src={
                                product.thumbnail ||
                                product.images?.[0] ||
                                "/placeholder.png"
                              }
                              alt={
                                product.title ||
                                "Product"
                              }
                              className="h-16 w-12 rounded-lg border border-neutral-200 object-cover"
                            />

                            <div>
                              <p className="line-clamp-2 text-sm font-medium">
                                {product.title}
                              </p>

                              <p className="mt-1 text-xs text-neutral-500">
                                #
                                {
                                  product.productCode
                                }
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex max-w-[240px] flex-wrap gap-1">
                            {(
                              product.categories || []
                            )
                              .slice(0, 3)
                              .map((item) => (
                                <span
                                  key={item}
                                  className="rounded-full bg-neutral-100 px-2 py-1 text-[11px]"
                                >
                                  {item}
                                </span>
                              ))}

                            {!product.categories?.length ? (
                              <span className="text-xs text-neutral-400">
                                —
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              product.isActive
                                ? "bg-emerald-50 text-emerald-700"
                                : product.isDraft
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-neutral-100 text-neutral-600"
                            }`}
                          >
                            {product.isDraft
                              ? "Draft"
                              : product.isActive
                                ? "Published"
                                : "Inactive"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          {isReady ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                              <PackageCheck
                                size={14}
                              />

                              Dispatch Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                              <Clock3 size={14} />

                              Not Ready
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              handleSingleUpdate(
                                product,
                                !isReady,
                              )
                            }
                            className={
                              isReady
                                ? `${buttonClass} border border-neutral-200 bg-white hover:border-black`
                                : `${buttonClass} bg-black text-white hover:bg-neutral-800`
                            }
                          >
                            {isReady ? (
                              <>
                                <X size={15} />
                                Remove Ready
                              </>
                            ) : (
                              <>
                                <Check size={15} />
                                Mark Ready
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}

          <div className="flex flex-col justify-between gap-3 border-t border-neutral-200 px-4 py-3 sm:flex-row sm:items-center">
            <p className="text-xs text-neutral-500">
              Page {currentPage} of{" "}
              {Math.max(1, pages || 1)}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={
                  currentPage <= 1 || loading
                }
                onClick={() =>
                  goToPage(currentPage - 1)
                }
                className={`${buttonClass} border border-neutral-200 bg-white`}
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <button
                type="button"
                disabled={
                  currentPage >=
                    Math.max(1, pages || 1) ||
                  loading
                }
                onClick={() =>
                  goToPage(currentPage + 1)
                }
                className={`${buttonClass} border border-neutral-200 bg-white`}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}