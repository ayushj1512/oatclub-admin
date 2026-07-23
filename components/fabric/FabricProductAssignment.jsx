"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Check,
  ChevronDown,
  Loader2,
  PackageSearch,
  Save,
  Search,
  Shirt,
  X,
} from "lucide-react";

import toast from "react-hot-toast";

import { useAdminProductStore } from "@/store/adminProductStore";
import useFabricStore from "@/store/fabricStore";

const normalizeProductCode = (value) => {
  const code = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

  if (!code) return "";

  if (/^\d+$/.test(code)) {
    return code.padStart(5, "0");
  }

  return code;
};

const getProductImage = (product) => {
  return (
    product?.thumbnail ||
    product?.images?.[0] ||
    ""
  );
};

const getProductCode = (product) => {
  return normalizeProductCode(product?.productCode);
};

const cx = (...classes) =>
  classes.filter(Boolean).join(" ");

export default function FabricProductAssignment({
  source = "fabrics",
}) {
  const {
    assignmentProducts,
    assignmentProductsLoading,
    fetchFabricAssignmentProducts,
    clearFabricAssignmentProducts,
  } = useAdminProductStore();

  const {
    fabricOptions,
    selectedFabric,
    loading: fabricLoading,
    formLoading,
    fetchFabricOptions,
    fetchFabricById,
    assignProductCodesToFabric,
    clearSelectedFabric,
  } = useFabricStore();

  const [selectedFabricId, setSelectedFabricId] =
    useState("");

  const [selectedProductCodes, setSelectedProductCodes] =
    useState([]);

  const [search, setSearch] = useState("");
  const [showOnlySelected, setShowOnlySelected] =
    useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        fetchFabricOptions(),
        fetchFabricAssignmentProducts({
          isActive: true,
        }),
      ]);
    };

    loadInitialData();

    return () => {
      clearSelectedFabric();
      clearFabricAssignmentProducts();
    };
  }, [
    fetchFabricOptions,
    fetchFabricAssignmentProducts,
    clearSelectedFabric,
    clearFabricAssignmentProducts,
  ]);

  useEffect(() => {
    const loadSelectedFabric = async () => {
      if (!selectedFabricId) {
        setSelectedProductCodes([]);
        clearSelectedFabric();
        return;
      }

      const res = await fetchFabricById(
        selectedFabricId
      );

      if (!res?.success || !res?.data) {
        setSelectedProductCodes([]);
        return;
      }

      const codes = Array.isArray(
        res.data.associatedProductCodes
      )
        ? res.data.associatedProductCodes
        : [];

      setSelectedProductCodes(
        [
          ...new Set(
            codes
              .map(normalizeProductCode)
              .filter(Boolean)
          ),
        ]
      );
    };

    loadSelectedFabric();
  }, [
    selectedFabricId,
    fetchFabricById,
    clearSelectedFabric,
  ]);

  const selectedCodeSet = useMemo(() => {
    return new Set(selectedProductCodes);
  }, [selectedProductCodes]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (assignmentProducts || []).filter(
      (product) => {
        const productCode = getProductCode(product);

        if (
          showOnlySelected &&
          !selectedCodeSet.has(productCode)
        ) {
          return false;
        }

        if (!query) return true;

        const searchableText = [
          product?.title,
          productCode,
          product?.sku,
          ...(Array.isArray(product?.categories)
            ? product.categories
            : []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(query);
      }
    );
  }, [
    assignmentProducts,
    search,
    showOnlySelected,
    selectedCodeSet,
  ]);

  const visibleProductCodes = useMemo(() => {
    return filteredProducts
      .map(getProductCode)
      .filter(Boolean);
  }, [filteredProducts]);

  const allVisibleSelected =
    visibleProductCodes.length > 0 &&
    visibleProductCodes.every((code) =>
      selectedCodeSet.has(code)
    );

  const toggleProduct = (productCode) => {
    const normalizedCode =
      normalizeProductCode(productCode);

    if (!normalizedCode) return;

    setSelectedProductCodes((current) => {
      if (current.includes(normalizedCode)) {
        return current.filter(
          (code) => code !== normalizedCode
        );
      }

      return [...current, normalizedCode];
    });
  };

  const selectAllVisible = () => {
    if (!visibleProductCodes.length) return;

    setSelectedProductCodes((current) => {
      const currentSet = new Set(current);

      if (allVisibleSelected) {
        visibleProductCodes.forEach((code) => {
          currentSet.delete(code);
        });
      } else {
        visibleProductCodes.forEach((code) => {
          currentSet.add(code);
        });
      }

      return Array.from(currentSet);
    });
  };

  const clearSelection = () => {
    setSelectedProductCodes([]);
  };

  const handleSave = async () => {
    if (!selectedFabricId) {
      toast.error("Please select a fabric");
      return;
    }

    const res = await assignProductCodesToFabric(
      selectedFabricId,
      selectedProductCodes
    );

    if (!res?.success) {
      toast.error(
        res?.message || "Assignment failed"
      );
      return;
    }

    toast.success(
      `${selectedProductCodes.length} product code(s) assigned`
    );
  };

  const isInitialLoading =
    assignmentProductsLoading ||
    (fabricLoading && !fabricOptions.length);

  return (
    <div className="min-h-screen bg-[#f7f7f7] p-4 sm:p-6">
      <div className="mx-auto max-w-[1500px]">
        {/* Header */}
        <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-black/10 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-black/45">
              {source === "products"
                ? "Product Management"
                : "Fabric Management"}
            </p>

            <h1 className="text-2xl font-semibold tracking-tight text-black">
              Fabric Product Assignment
            </h1>

            <p className="mt-1 text-sm text-black/55">
              Select a fabric and assign all related
              product codes from one screen.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={
              !selectedFabricId || formLoading
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-black px-5 text-sm font-semibold text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {formLoading ? (
              <Loader2
                size={17}
                className="animate-spin"
              />
            ) : (
              <Save size={17} />
            )}

            Save Assignment
          </button>
        </div>

        {/* Fabric selector */}
        <div className="mb-5 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <label className="mb-2 block text-sm font-semibold text-black">
                Select Fabric
              </label>

              <div className="relative">
                <select
                  value={selectedFabricId}
                  onChange={(event) =>
                    setSelectedFabricId(
                      event.target.value
                    )
                  }
                  className="h-12 w-full appearance-none rounded-xl border border-black/15 bg-white px-4 pr-11 text-sm text-black outline-none transition focus:border-black"
                >
                  <option value="">
                    Choose a fabric
                  </option>

                  {(fabricOptions || []).map(
                    (fabric) => (
                      <option
                        key={fabric._id}
                        value={fabric._id}
                      >
                        {fabric.code} — {fabric.name}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={18}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-black/45"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatBox
                label="Fabric"
                value={
                  selectedFabric?.code || "—"
                }
              />

              <StatBox
                label="Selected"
                value={selectedProductCodes.length}
              />

              <StatBox
                label="Products"
                value={
                  assignmentProducts?.length || 0
                }
                className="col-span-2 sm:col-span-1"
              />
            </div>
          </div>

          {selectedFabric && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/10 pt-4">
              <span className="rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white">
                {selectedFabric.code}
              </span>

              <span className="text-sm font-medium text-black">
                {selectedFabric.name}
              </span>

              <span className="text-sm text-black/45">
                {selectedFabric.category}
              </span>

              <span className="text-sm text-black/45">
                Stock:{" "}
                {selectedFabric.currentStock ?? 0}{" "}
                {selectedFabric.unit}
              </span>
            </div>
          )}
        </div>

        {/* Product panel */}
        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-black/10 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-xl">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-black/40"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search title, product code, SKU or category..."
                className="h-11 w-full rounded-xl border border-black/15 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-black"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setShowOnlySelected((value) => !value)
                }
                className={cx(
                  "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition",
                  showOnlySelected
                    ? "border-black bg-black text-white"
                    : "border-black/15 bg-white text-black hover:bg-black/5"
                )}
              >
                <Check size={16} />
                Selected only
              </button>

              <button
                type="button"
                onClick={selectAllVisible}
                disabled={
                  !selectedFabricId ||
                  !visibleProductCodes.length
                }
                className="h-10 rounded-xl border border-black/15 px-4 text-sm font-medium text-black transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {allVisibleSelected
                  ? "Unselect visible"
                  : "Select visible"}
              </button>

              <button
                type="button"
                onClick={clearSelection}
                disabled={
                  !selectedProductCodes.length
                }
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <X size={16} />
                Clear
              </button>
            </div>
          </div>

          {isInitialLoading ? (
            <div className="flex min-h-[420px] items-center justify-center">
              <Loader2
                size={28}
                className="animate-spin text-black"
              />
            </div>
          ) : !selectedFabricId ? (
            <EmptyState
              icon={Shirt}
              title="Select a fabric"
              description="Choose a fabric above to start assigning products."
            />
          ) : !filteredProducts.length ? (
            <EmptyState
              icon={PackageSearch}
              title="No products found"
              description="Try a different search or disable the selected-only filter."
            />
          ) : (
            <div className="grid grid-cols-1 gap-px bg-black/10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => {
                const productCode =
                  getProductCode(product);

                const isSelected =
                  selectedCodeSet.has(productCode);

                const image =
                  getProductImage(product);

                return (
                  <button
                    type="button"
                    key={
                      product._id ||
                      productCode
                    }
                    onClick={() =>
                      toggleProduct(productCode)
                    }
                    className={cx(
                      "group relative flex min-h-[126px] gap-3 bg-white p-4 text-left transition",
                      isSelected
                        ? "bg-neutral-50"
                        : "hover:bg-neutral-50"
                    )}
                  >
                    <div
                      className={cx(
                        "absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border transition",
                        isSelected
                          ? "border-black bg-black text-white"
                          : "border-black/20 bg-white text-transparent"
                      )}
                    >
                      <Check size={14} />
                    </div>

                    <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-neutral-100">
                      {image ? (
                        <img
                          src={image}
                          alt={
                            product.title ||
                            productCode
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Shirt
                            size={22}
                            className="text-black/25"
                          />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 pr-7">
                      <p className="mb-1 text-xs font-semibold tracking-wide text-black/45">
                        {productCode || "NO CODE"}
                      </p>

                      <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-black">
                        {product.title ||
                          "Untitled product"}
                      </h3>

                      <p className="mt-2 line-clamp-1 text-xs text-black/45">
                        {Array.isArray(
                          product.categories
                        )
                          ? product.categories.join(
                              ", "
                            )
                          : "No category"}
                      </p>

                      {Array.isArray(
                        product.fabrics
                      ) &&
                        product.fabrics.length >
                          0 && (
                          <p className="mt-1 line-clamp-1 text-xs text-black/55">
                            Current:{" "}
                            {product.fabrics
                              .map(
                                (fabric) =>
                                  fabric.fabricCode ||
                                  fabric.fabricName
                              )
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  className = "",
}) {
  return (
    <div
      className={cx(
        "min-w-[110px] rounded-xl border border-black/10 bg-neutral-50 px-4 py-3",
        className
      )}
    >
      <p className="text-xs font-medium text-black/45">
        {label}
      </p>

      <p className="mt-1 text-lg font-semibold text-black">
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white">
        <Icon size={24} />
      </div>

      <h3 className="text-base font-semibold text-black">
        {title}
      </h3>

      <p className="mt-1 max-w-sm text-sm text-black/50">
        {description}
      </p>
    </div>
  );
}