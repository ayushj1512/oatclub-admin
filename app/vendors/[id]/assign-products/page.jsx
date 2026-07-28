  "use client";

  import {
    use,
    useCallback,
    useEffect,
    useMemo,
    useState,
  } from "react";
  import { useRouter } from "next/navigation";
  import {
    ArrowLeft,
    Boxes,
    Check,
    ChevronLeft,
    ChevronRight,
    Factory,
    Loader2,
    PackagePlus,
    RefreshCw,
    Search,
    Settings2,
    Trash2,
    X,
  } from "lucide-react";
  import toast from "react-hot-toast";

  import { useAdminProductStore } from "@/store/adminProductStore";
  import useAdminVendorStore from "@/store/adminVendorStore";

  const PRODUCT_LIMIT = 24;
  const ASSIGNED_LIMIT = 100;

  const DEFAULT_MODULES = {
    sampling: true,
    pattern: true,
    production: true,
    cuttingList: true,
  };

  const MODULE_OPTIONS = [
    {
      key: "sampling",
      label: "Sampling",
    },
    {
      key: "pattern",
      label: "Pattern",
    },
    {
      key: "production",
      label: "Production",
    },
    {
      key: "cuttingList",
      label: "Cutting List",
    },
  ];

  /* =========================================================
    HELPERS
  ========================================================= */

  const getAssignedProduct = (assignment) =>
    assignment?.product || assignment;

  const getAssignedProductId = (assignment) =>
    String(
      assignment?.product?._id ||
        assignment?.product ||
        ""
    );

  const getProductImage = (product) => {
    const thumbnail = product?.thumbnail;

    if (typeof thumbnail === "string") {
      return thumbnail;
    }

    if (thumbnail?.url) {
      return thumbnail.url;
    }

    const firstImage = product?.images?.[0];

    if (typeof firstImage === "string") {
      return firstImage;
    }

    return firstImage?.url || "";
  };

  const formatPrice = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN")}`;

  const normalizeProductCode = (value = "") => {
    const code = String(value)
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");

    if (!code) return "";

    return /^\d+$/.test(code)
      ? code.padStart(5, "0")
      : code;
  };

  const getEnabledModuleKeys = (modules = {}) =>
    MODULE_OPTIONS.map(({ key }) => key).filter(
      (key) => modules?.[key] === true
    );

  /* =========================================================
    COMPONENTS
  ========================================================= */

  function ProductImage({
    product,
    className = "h-20 w-16",
  }) {
    const image = getProductImage(product);

    return (
      <div
        className={`${className} shrink-0 overflow-hidden rounded-xl bg-zinc-100`}
      >
        {image ? (
          <img
            src={image}
            alt={product?.title || "Product"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-400">
            <Boxes size={19} />
          </div>
        )}
      </div>
    );
  }

  function Checkbox({ checked }) {
    return (
      <span
        className={[
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition",
          checked
            ? "border-white bg-white text-zinc-950"
            : "border-zinc-300 bg-white text-transparent",
        ].join(" ")}
      >
        <Check size={14} />
      </span>
    );
  }

  function ProductCard({
    product,
    selected,
    onToggle,
  }) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={[
          "relative flex min-w-0 items-start gap-3 rounded-2xl border p-3 text-left transition",
          selected
            ? "border-zinc-950 bg-zinc-950 text-white shadow-sm"
            : "border-zinc-200 bg-white hover:border-zinc-400 hover:bg-zinc-50",
        ].join(" ")}
      >
        <ProductImage product={product} />

        <div className="min-w-0 flex-1">
          <p
            className={[
              "line-clamp-2 text-sm font-bold leading-5",
              selected
                ? "text-white"
                : "text-zinc-950",
            ].join(" ")}
          >
            {product?.title || "Untitled product"}
          </p>

          <p
            className={[
              "mt-2 text-xs font-semibold",
              selected
                ? "text-zinc-300"
                : "text-zinc-500",
            ].join(" ")}
          >
            Code: {product?.productCode || "—"}
          </p>

          <p
            className={[
              "mt-1 text-xs",
              selected
                ? "text-zinc-400"
                : "text-zinc-500",
            ].join(" ")}
          >
            {formatPrice(product?.price)}
          </p>
        </div>

        <Checkbox checked={selected} />
      </button>
    );
  }

  function ModuleButton({
    label,
    enabled,
    disabled = false,
    compact = false,
    onClick,
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={[
          "flex items-center justify-between border text-left transition disabled:cursor-not-allowed disabled:opacity-50",
          compact
            ? "rounded-lg px-3 py-2"
            : "w-full rounded-xl px-4 py-3",
          enabled
            ? "border-zinc-950 bg-zinc-950 text-white"
            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400",
        ].join(" ")}
      >
        <span
          className={
            compact
              ? "text-[11px] font-bold"
              : "text-sm font-bold"
          }
        >
          {label}
        </span>

        <span
          className={[
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
            enabled
              ? "border-white bg-white text-zinc-950"
              : "border-zinc-300 bg-white text-transparent",
          ].join(" ")}
        >
          <Check size={13} />
        </span>
      </button>
    );
  }

  function AssignedProductCard({
    assignment,
    updating,
    removing,
    onToggleModule,
    onRemove,
  }) {
    const product =
      getAssignedProduct(assignment);

    const modules = {
      sampling:
        assignment?.modules?.sampling ?? false,
      pattern:
        assignment?.modules?.pattern ?? false,
      production:
        assignment?.modules?.production ?? false,
      cuttingList:
        assignment?.modules?.cuttingList ?? false,
    };

    return (
      <div className="p-4">
        <div className="flex items-start gap-3">
          <ProductImage
            product={product}
            className="h-16 w-14"
          />

          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-bold leading-5 text-zinc-950">
              {product?.title || "Untitled product"}
            </p>

            <p className="mt-1 text-xs font-medium text-zinc-500">
              Code: {product?.productCode || "—"}
            </p>
          </div>

          <button
            type="button"
            onClick={onRemove}
            disabled={removing || updating}
            aria-label="Remove assigned product"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {removing ? (
              <Loader2
                size={15}
                className="animate-spin"
              />
            ) : (
              <Trash2 size={15} />
            )}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {MODULE_OPTIONS.map((module) => (
            <ModuleButton
              key={module.key}
              label={module.label}
              compact
              enabled={Boolean(
                modules[module.key]
              )}
              disabled={updating || removing}
              onClick={() =>
                onToggleModule(
                  module.key,
                  modules
                )
              }
            />
          ))}
        </div>

        {assignment?.assignedAt && (
          <p className="mt-3 text-[10px] font-medium text-zinc-400">
            Assigned{" "}
            {new Date(
              assignment.assignedAt
            ).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}
      </div>
    );
  }

  /* =========================================================
    PAGE
  ========================================================= */

  export default function AssignVendorProductsPage({
    params,
  }) {
    const resolvedParams = use(params);
    const vendorId = resolvedParams?.id;

    const router = useRouter();

    const {
      products,
      page,
      pages,
      total,
      limit,
      loading: loadingProducts,
      error: productError,
      fetchProducts,
    } = useAdminProductStore();

    const {
      selectedVendor,
      assignedProducts,
      assignedPagination,

      loadingVendor,
      loadingAssignedProducts,
      assigningProducts,
      removingProducts,
      updatingProductModules,

      error: vendorError,
      message,

      fetchVendorById,
      fetchAssignedProducts,
      assignProducts,
      removeAssignedProducts,
      updateAssignedProductModules,

      clearMessages,
      clearSelectedVendor,
    } = useAdminVendorStore();

    const [search, setSearch] = useState("");
    const [productCode, setProductCode] =
      useState("");

    const [selectedIds, setSelectedIds] =
      useState([]);

    const [
      selectedModules,
      setSelectedModules,
    ] = useState({ ...DEFAULT_MODULES });

    const [removingProductId, setRemovingProductId] =
      useState("");

    const [
      updatingAssignmentId,
      setUpdatingAssignmentId,
    ] = useState("");

    const assignedIds = useMemo(
      () =>
        new Set(
          assignedProducts
            .map(getAssignedProductId)
            .filter(Boolean)
        ),
      [assignedProducts]
    );

    const selectedIdSet = useMemo(
      () =>
        new Set(
          selectedIds.map(String)
        ),
      [selectedIds]
    );

    const availableProducts = useMemo(
      () =>
        products.filter(
          (product) =>
            !assignedIds.has(
              String(product?._id || "")
            )
        ),
      [products, assignedIds]
    );

    const enabledModules = useMemo(
      () =>
        getEnabledModuleKeys(
          selectedModules
        ),
      [selectedModules]
    );

    const assignedTotal =
      assignedPagination.total ||
      assignedProducts.length;

    const allVisibleSelected =
      availableProducts.length > 0 &&
      availableProducts.every((product) =>
        selectedIdSet.has(
          String(product._id)
        )
      );

    const busy =
      loadingVendor ||
      loadingAssignedProducts ||
      loadingProducts ||
      assigningProducts ||
      removingProducts ||
      updatingProductModules;

    /* =======================================================
      LOADERS
    ======================================================= */

    const loadProducts = useCallback(
      async ({
        targetPage = 1,
        currentSearch = search,
        currentProductCode = productCode,
      } = {}) => {
        setSelectedIds([]);

        return fetchProducts({
          page: targetPage,
          limit: limit || PRODUCT_LIMIT,

          search:
            currentSearch.trim() ||
            undefined,

          productCode:
            normalizeProductCode(
              currentProductCode
            ) || undefined,

          isActive: true,
          isDraft: false,
          sort: "newest",
        });
      },
      [
        fetchProducts,
        limit,
        search,
        productCode,
      ]
    );

    const loadAssignedProducts =
      useCallback(async () => {
        if (!vendorId) return;

        return fetchAssignedProducts(
          vendorId,
          {
            page: 1,
            limit: ASSIGNED_LIMIT,
          }
        );
      }, [
        vendorId,
        fetchAssignedProducts,
      ]);

    const loadPage = useCallback(
      async () => {
        if (!vendorId) return;

        clearMessages();
        setSelectedIds([]);

        await Promise.all([
          fetchVendorById(vendorId),

          fetchAssignedProducts(
            vendorId,
            {
              page: 1,
              limit: ASSIGNED_LIMIT,
            }
          ),

          fetchProducts({
            page: 1,
            limit: PRODUCT_LIMIT,
            isActive: true,
            isDraft: false,
            sort: "newest",
          }),
        ]);
      },
      [
        vendorId,
        clearMessages,
        fetchVendorById,
        fetchAssignedProducts,
        fetchProducts,
      ]
    );

    useEffect(() => {
      loadPage();

      return () => {
        clearSelectedVendor();
      };
    }, [loadPage, clearSelectedVendor]);

    /* =======================================================
      SEARCH
    ======================================================= */

    const handleSearch = async (event) => {
      event.preventDefault();

      clearMessages();

      await loadProducts({
        targetPage: 1,
      });
    };

    const resetSearch = async () => {
      setSearch("");
      setProductCode("");
      setSelectedIds([]);

      clearMessages();

      await fetchProducts({
        page: 1,
        limit: PRODUCT_LIMIT,
        isActive: true,
        isDraft: false,
        sort: "newest",
      });
    };

    /* =======================================================
      PRODUCT SELECTION
    ======================================================= */

    const toggleProduct = (productId) => {
      const id = String(productId);

      setSelectedIds((current) =>
        current.includes(id)
          ? current.filter(
              (item) => item !== id
            )
          : [...current, id]
      );
    };

    const selectAllVisible = () => {
      const visibleIds =
        availableProducts.map((product) =>
          String(product._id)
        );

      if (allVisibleSelected) {
        setSelectedIds((current) =>
          current.filter(
            (id) =>
              !visibleIds.includes(id)
          )
        );

        return;
      }

      setSelectedIds((current) => [
        ...new Set([
          ...current,
          ...visibleIds,
        ]),
      ]);
    };

    /* =======================================================
      MODULE SELECTION
    ======================================================= */

    const toggleSelectedModule = (
      moduleKey
    ) => {
      setSelectedModules((current) => ({
        ...current,
        [moduleKey]:
          !current[moduleKey],
      }));
    };

    const selectAllModules = () => {
      setSelectedModules({
        ...DEFAULT_MODULES,
      });
    };

    const clearModules = () => {
      setSelectedModules({
        sampling: false,
        pattern: false,
        production: false,
        cuttingList: false,
      });
    };

    /* =======================================================
      ASSIGN PRODUCTS
    ======================================================= */

    const handleAssign = async () => {
      if (!selectedIds.length) {
        toast.error(
          "Select at least one product"
        );
        return;
      }

      if (!enabledModules.length) {
        toast.error(
          "Enable at least one module"
        );
        return;
      }

      clearMessages();

      const result = await assignProducts(
        vendorId,
        selectedIds,
        enabledModules
      );

      if (!result?.success) return;

      toast.success(
        result.message ||
          "Products assigned successfully"
      );

      setSelectedIds([]);

      await loadAssignedProducts();
    };

    /* =======================================================
      REMOVE PRODUCT
    ======================================================= */

    const handleRemove = async (productId) => {
      if (!productId) return;

      setRemovingProductId(
        String(productId)
      );

      clearMessages();

      try {
        const result =
          await removeAssignedProducts(
            vendorId,
            [productId]
          );

        if (!result?.success) return;

        toast.success(
          result.message ||
            "Product removed successfully"
        );

        await loadAssignedProducts();
      } finally {
        setRemovingProductId("");
      }
    };

    /* =======================================================
      UPDATE ASSIGNMENT MODULE
    ======================================================= */

    const handleAssignmentModuleToggle =
      async (
        productId,
        moduleKey,
        currentModules
      ) => {
        if (!productId) return;

        const nextModules = {
          sampling:
            currentModules?.sampling ??
            false,
          pattern:
            currentModules?.pattern ??
            false,
          production:
            currentModules?.production ??
            false,
          cuttingList:
            currentModules?.cuttingList ??
            false,

          [moduleKey]:
            !currentModules?.[moduleKey],
        };

        const enabledCount =
          Object.values(
            nextModules
          ).filter(Boolean).length;

        if (!enabledCount) {
          toast.error(
            "At least one module must remain enabled"
          );
          return;
        }

        setUpdatingAssignmentId(
          String(productId)
        );

        clearMessages();

        try {
          const result =
            await updateAssignedProductModules(
              vendorId,
              productId,
              nextModules
            );

          if (!result?.success) return;

          toast.success(
            result.message ||
              "Permissions updated"
          );
        } finally {
          setUpdatingAssignmentId("");
        }
      };

    /* =======================================================
      LOADING / NOT FOUND
    ======================================================= */

    if (
      loadingVendor &&
      !selectedVendor
    ) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-zinc-50">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />

            <p className="text-sm font-medium text-zinc-500">
              Loading vendor...
            </p>
          </div>
        </main>
      );
    }

    if (
      !loadingVendor &&
      !selectedVendor
    ) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-7 text-center shadow-sm">
            <X className="mx-auto h-10 w-10 text-red-500" />

            <h1 className="mt-4 text-xl font-black text-zinc-950">
              Vendor not found
            </h1>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              This vendor may have been
              removed or the vendor ID is
              invalid.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push("/vendors")
              }
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white"
            >
              <ArrowLeft size={16} />
              Back to vendors
            </button>
          </div>
        </main>
      );
    }

    return (
      <main className="min-h-screen bg-zinc-50 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <button
            type="button"
            onClick={() =>
              router.push(
                `/vendors/${vendorId}`
              )
            }
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-zinc-950"
          >
            <ArrowLeft size={16} />
            Back to vendor
          </button>

          {/* Header */}
          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-950 text-white">
                    <PackagePlus size={20} />
                  </span>

                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                      Product assignment
                    </p>

                    <h1 className="mt-1 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">
                      {selectedVendor?.name ||
                        "Vendor"}
                    </h1>

                    <p className="mt-1 text-sm text-zinc-500">
                      @
                      {selectedVendor?.username ||
                        "vendor"}
                    </p>
                  </div>
                </div>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-500">
                  Search OATCLUB products,
                  choose module permissions and
                  assign them to this vendor.
                </p>
              </div>

              <button
                type="button"
                onClick={loadPage}
                disabled={busy}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <RefreshCw
                  size={16}
                  className={
                    busy ? "animate-spin" : ""
                  }
                />
                Refresh
              </button>
            </div>
          </section>

          {/* Messages */}
          {(vendorError || productError) && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {vendorError ||
                productError}
            </div>
          )}

          {message && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {message}
            </div>
          )}

          <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
            {/* Product Search */}
            <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 p-4 sm:p-5">
                <h2 className="text-lg font-black tracking-tight text-zinc-950">
                  Search products
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Search by product title
                  or exact product code.
                </p>

                <form
                  onSubmit={handleSearch}
                  className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_auto]"
                >
                  <div className="relative">
                    <Search
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                    />

                    <input
                      type="search"
                      value={search}
                      onChange={(event) =>
                        setSearch(
                          event.target.value
                        )
                      }
                      placeholder="Search product title"
                      className="h-11 w-full rounded-xl border border-zinc-200 pl-10 pr-10 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-950"
                    />

                    {search && (
                      <button
                        type="button"
                        onClick={() =>
                          setSearch("")
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-950"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  <input
                    value={productCode}
                    onChange={(event) =>
                      setProductCode(
                        event.target.value
                      )
                    }
                    placeholder="Product code"
                    className="h-11 rounded-xl border border-zinc-200 px-3 text-sm uppercase outline-none transition placeholder:normal-case placeholder:text-zinc-400 focus:border-zinc-950"
                  />

                  <button
                    type="submit"
                    disabled={loadingProducts}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {loadingProducts ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <Search size={16} />
                    )}
                    Search
                  </button>
                </form>

                {(search || productCode) && (
                  <button
                    type="button"
                    onClick={resetSearch}
                    disabled={loadingProducts}
                    className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-zinc-500 transition hover:text-zinc-950 disabled:opacity-50"
                  >
                    <X size={14} />
                    Clear filters
                  </button>
                )}
              </div>

              {/* Selection Bar */}
              <div className="flex flex-col gap-3 border-b border-zinc-100 bg-zinc-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-600">
                    {total} products found
                  </p>

                  {!!selectedIds.length && (
                    <p className="mt-1 text-[10px] font-medium text-zinc-500">
                      {selectedIds.length} selected
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={selectAllVisible}
                  disabled={
                    !availableProducts.length
                  }
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-40"
                >
                  {allVisibleSelected ? (
                    <X size={14} />
                  ) : (
                    <Check size={14} />
                  )}

                  {allVisibleSelected
                    ? "Clear visible"
                    : "Select visible"}
                </button>
              </div>

              {/* Products */}
              {loadingProducts &&
              !products.length ? (
                <div className="flex min-h-72 flex-col items-center justify-center gap-3">
                  <Loader2 className="h-7 w-7 animate-spin text-zinc-400" />

                  <p className="text-sm font-medium text-zinc-500">
                    Loading products...
                  </p>
                </div>
              ) : availableProducts.length ? (
                <div className="grid gap-3 p-4 sm:grid-cols-2">
                  {availableProducts.map(
                    (product) => {
                      const productId =
                        String(product._id);

                      return (
                        <ProductCard
                          key={productId}
                          product={product}
                          selected={selectedIdSet.has(
                            productId
                          )}
                          onToggle={() =>
                            toggleProduct(
                              productId
                            )
                          }
                        />
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
                    <Boxes size={23} />
                  </span>

                  <h3 className="mt-4 text-base font-bold text-zinc-950">
                    No available products
                  </h3>

                  <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                    Products may already be
                    assigned or no products
                    match the current filters.
                  </p>
                </div>
              )}

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-4 py-4">
                  <button
                    type="button"
                    disabled={
                      loadingProducts ||
                      page <= 1
                    }
                    onClick={() =>
                      loadProducts({
                        targetPage:
                          page - 1,
                      })
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40 sm:px-4 sm:text-sm"
                  >
                    <ChevronLeft size={15} />
                    Previous
                  </button>

                  <p className="text-xs font-semibold text-zinc-500">
                    Page {page} of {pages}
                  </p>

                  <button
                    type="button"
                    disabled={
                      loadingProducts ||
                      page >= pages
                    }
                    onClick={() =>
                      loadProducts({
                        targetPage:
                          page + 1,
                      })
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40 sm:px-4 sm:text-sm"
                  >
                    Next
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </section>

            {/* Sidebar */}
            <aside className="space-y-5">
              {/* Assignment Settings */}
              <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white">
                    <Settings2 size={18} />
                  </span>

                  <div>
                    <h2 className="text-lg font-black text-zinc-950">
                      Assignment settings
                    </h2>

                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      Choose where the selected
                      products should appear.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllModules}
                    className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600 hover:text-zinc-950"
                  >
                    Select all
                  </button>

                  <span className="text-zinc-300">
                    ·
                  </span>

                  <button
                    type="button"
                    onClick={clearModules}
                    className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600 hover:text-zinc-950"
                  >
                    Clear
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {MODULE_OPTIONS.map(
                    (module) => (
                      <ModuleButton
                        key={module.key}
                        label={module.label}
                        enabled={Boolean(
                          selectedModules[
                            module.key
                          ]
                        )}
                        onClick={() =>
                          toggleSelectedModule(
                            module.key
                          )
                        }
                      />
                    )
                  )}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-zinc-50 p-4">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                      Products
                    </p>

                    <p className="mt-1 text-2xl font-black text-zinc-950">
                      {selectedIds.length}
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                      Modules
                    </p>

                    <p className="mt-1 text-2xl font-black text-zinc-950">
                      {enabledModules.length}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAssign}
                  disabled={
                    assigningProducts ||
                    !selectedIds.length ||
                    !enabledModules.length
                  }
                  className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {assigningProducts ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Assigning products
                    </>
                  ) : (
                    <>
                      <PackagePlus size={17} />
                      Assign selected
                    </>
                  )}
                </button>
              </section>

              {/* Assigned Products */}
              <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
                <div className="border-b border-zinc-100 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black text-zinc-950">
                        Assigned products
                      </h2>

                      <p className="mt-1 text-xs text-zinc-500">
                        {assignedTotal} products
                        assigned.
                      </p>
                    </div>

                    <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-zinc-100 px-2 text-xs font-black text-zinc-700">
                      {assignedTotal}
                    </span>
                  </div>
                </div>

                {loadingAssignedProducts &&
                !assignedProducts.length ? (
                  <div className="flex min-h-48 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
                  </div>
                ) : assignedProducts.length ? (
                  <div className="max-h-[720px] divide-y divide-zinc-100 overflow-y-auto">
                    {assignedProducts.map(
                      (assignment) => {
                        const productId =
                          getAssignedProductId(
                            assignment
                          );

                        return (
                          <AssignedProductCard
                            key={
                              assignment?._id ||
                              productId
                            }
                            assignment={
                              assignment
                            }
                            removing={
                              removingProductId ===
                              productId
                            }
                            updating={
                              updatingAssignmentId ===
                                productId ||
                              updatingProductModules
                            }
                            onRemove={() =>
                              handleRemove(
                                productId
                              )
                            }
                            onToggleModule={(
                              moduleKey,
                              currentModules
                            ) =>
                              handleAssignmentModuleToggle(
                                productId,
                                moduleKey,
                                currentModules
                              )
                            }
                          />
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div className="flex min-h-52 flex-col items-center justify-center px-5 py-8 text-center">
                    <Factory className="h-8 w-8 text-zinc-400" />

                    <h3 className="mt-3 text-sm font-bold text-zinc-950">
                      No assigned products
                    </h3>

                    <p className="mt-2 text-xs leading-5 text-zinc-500">
                      Select products and assign
                      them using the settings above.
                    </p>
                  </div>
                )}
              </section>
            </aside>
          </section>
        </div>
      </main>
    );
  }