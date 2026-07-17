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
  ArrowRight,
  Boxes,
  CalendarDays,
  Check,
  CircleCheck,
  CircleX,
  Factory,
  Loader2,
  PackagePlus,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import useAdminVendorStore from "@/store/adminVendorStore";

const EMPTY_MODULES = {
  sampling: false,
  pattern: false,
  production: false,
  cuttingList: false,
};

const MODULE_OPTIONS = [
  {
    key: "sampling",
    title: "Sampling",
    description:
      "Access assigned sampling products and workflow.",
  },
  {
    key: "pattern",
    title: "Pattern",
    description:
      "Manage pattern jobs and pattern-ready status.",
  },
  {
    key: "production",
    title: "Production",
    description:
      "Access assigned production products and jobs.",
  },
  {
    key: "cuttingList",
    title: "Cutting List",
    description:
      "View assigned cutting requirements and lists.",
  },
];

/* =========================================================
   HELPERS
========================================================= */

const formatDate = (
  value,
  includeTime = false
) => {
  if (!value) return "Never";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Never";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  });
};

const getModules = (vendor) => ({
  sampling:
    vendor?.modules?.sampling ?? false,
  pattern:
    vendor?.modules?.pattern ?? false,
  production:
    vendor?.modules?.production ?? false,
  cuttingList:
    vendor?.modules?.cuttingList ?? false,
});

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

/* =========================================================
   COMPONENTS
========================================================= */

function InfoCard({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
          <Icon size={16} />
        </span>

        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-400">
            {label}
          </p>

          <p className="mt-1 break-words text-sm font-semibold text-zinc-800">
            {value || "Not available"}
          </p>
        </div>
      </div>
    </div>
  );
}

function ModuleOption({
  module,
  enabled,
  disabled,
  onToggle,
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={[
        "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
        enabled
          ? "border-zinc-950 bg-zinc-950 text-white"
          : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-400",
      ].join(" ")}
    >
      <span
        className={[
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
          enabled
            ? "border-white bg-white text-zinc-950"
            : "border-zinc-300 bg-white text-transparent",
        ].join(" ")}
      >
        <Check size={13} />
      </span>

      <span className="min-w-0">
        <span className="block text-sm font-bold">
          {module.title}
        </span>

        <span
          className={[
            "mt-1 block text-xs leading-5",
            enabled
              ? "text-zinc-300"
              : "text-zinc-500",
          ].join(" ")}
        >
          {module.description}
        </span>
      </span>
    </button>
  );
}

function ProductRow({
  assignment,
  onManage,
}) {
  const product =
    assignment?.product || assignment;

  const image = getProductImage(product);

  const enabledModules = Object.values(
    assignment?.modules || {}
  ).filter(Boolean).length;

  return (
    <div className="flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-5">
      <div className="h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
        {image ? (
          <img
            src={image}
            alt={product?.title || "Product"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-400">
            <Boxes size={18} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-zinc-950">
          {product?.title || "Untitled product"}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-xs font-medium text-zinc-500">
            Code:{" "}
            {product?.productCode || "—"}
          </p>

          <p className="text-[10px] font-semibold text-zinc-400">
            {enabledModules} module
            {enabledModules === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onManage}
        aria-label="Manage product assignment"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-950 hover:text-white"
      >
        <ArrowRight size={15} />
      </button>
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function VendorDetailPage({
  params,
}) {
  const resolvedParams = use(params);
  const vendorId = resolvedParams?.id;

  const router = useRouter();

  const {
    selectedVendor,
    assignedProducts,
    assignedPagination,

    loadingVendor,
    loadingAssignedProducts,
    updatingVendor,

    error,
    message,

    fetchVendorById,
    fetchAssignedProducts,
    updateVendor,
    toggleVendorStatus,

    clearMessages,
    clearSelectedVendor,
  } = useAdminVendorStore();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    modules: { ...EMPTY_MODULES },
  });

  const [localError, setLocalError] =
    useState("");

  const loadPage = useCallback(async () => {
    if (!vendorId) return;

    clearMessages();
    setLocalError("");

    await Promise.all([
      fetchVendorById(vendorId),
      fetchAssignedProducts(vendorId, {
        page: 1,
        limit: 8,
      }),
    ]);
  }, [
    vendorId,
    clearMessages,
    fetchVendorById,
    fetchAssignedProducts,
  ]);

  useEffect(() => {
    loadPage();

    return () => {
      clearSelectedVendor();
    };
  }, [loadPage, clearSelectedVendor]);

  useEffect(() => {
    if (!selectedVendor) return;

    setForm({
      name: selectedVendor.name || "",
      phone: selectedVendor.phone || "",
      modules: getModules(selectedVendor),
    });
  }, [selectedVendor]);

  const enabledModuleCount = useMemo(
    () =>
      Object.values(form.modules).filter(Boolean)
        .length,
    [form.modules]
  );

  const hasChanges = useMemo(() => {
    if (!selectedVendor) return false;

    const originalModules =
      getModules(selectedVendor);

    return (
      form.name.trim() !==
        String(selectedVendor.name || "").trim() ||
      form.phone.trim() !==
        String(selectedVendor.phone || "").trim() ||
      Object.keys(EMPTY_MODULES).some(
        (key) =>
          Boolean(form.modules[key]) !==
          Boolean(originalModules[key])
      )
    );
  }, [form, selectedVendor]);

  const assignedCount =
    assignedPagination.total ||
    selectedVendor?.assignedProductCount ||
    selectedVendor?.productsCount ||
    assignedProducts.length;

  const busy =
    loadingVendor ||
    loadingAssignedProducts ||
    updatingVendor;

  const manageAssignments = () => {
    router.push(
      `/vendors/${vendorId}/assign-products`
    );
  };

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setLocalError("");
    clearMessages();
  };

  const toggleModule = (moduleKey) => {
    setForm((current) => ({
      ...current,
      modules: {
        ...current.modules,
        [moduleKey]:
          !current.modules[moduleKey],
      },
    }));

    setLocalError("");
    clearMessages();
  };

  const handleSave = async () => {
    const name = form.name.trim();

    if (!name) {
      setLocalError(
        "Vendor name is required"
      );
      return;
    }

    setLocalError("");
    clearMessages();

    const result = await updateVendor(
      vendorId,
      {
        name,
        phone: form.phone.trim(),
        modules: form.modules,
      }
    );

    if (result?.success) {
      setForm({
        name: result.vendor?.name || name,
        phone:
          result.vendor?.phone ||
          form.phone.trim(),
        modules: getModules(
          result.vendor || {
            modules: form.modules,
          }
        ),
      });
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedVendor) return;

    clearMessages();
    setLocalError("");

    await toggleVendorStatus(
      vendorId,
      !selectedVendor.isActive
    );
  };

  const resetForm = () => {
    if (!selectedVendor) return;

    setForm({
      name: selectedVendor.name || "",
      phone: selectedVendor.phone || "",
      modules: getModules(selectedVendor),
    });

    setLocalError("");
    clearMessages();
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loadingVendor && !selectedVendor) {
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

  /* =======================================================
     NOT FOUND
  ======================================================= */

  if (!loadingVendor && !selectedVendor) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-7 text-center shadow-sm">
          <CircleX className="mx-auto h-10 w-10 text-red-500" />

          <h1 className="mt-4 text-xl font-black text-zinc-950">
            Vendor not found
          </h1>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            This vendor may have been removed or
            the vendor ID is invalid.
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
            router.push("/vendors")
          }
          disabled={updatingVendor}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-zinc-950 disabled:opacity-50"
        >
          <ArrowLeft size={16} />
          Back to vendors
        </button>

        {/* Header */}
        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-950 text-white">
                  <Factory size={20} />
                </span>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">
                      {selectedVendor.name}
                    </h1>

                    <span
                      className={[
                        "rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.13em]",
                        selectedVendor.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-red-50 text-red-700",
                      ].join(" ")}
                    >
                      {selectedVendor.isActive
                        ? "Active"
                        : "Disabled"}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-zinc-500">
                    @{selectedVendor.username}
                  </p>
                </div>
              </div>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-500">
                Manage vendor details, module
                permissions and assigned OATCLUB
                products.
              </p>
            </div>

            <div className="flex w-full gap-2 sm:w-auto">
              <button
                type="button"
                onClick={loadPage}
                disabled={busy}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              >
                <RefreshCw
                  size={16}
                  className={
                    loadingVendor ||
                    loadingAssignedProducts
                      ? "animate-spin"
                      : ""
                  }
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={manageAssignments}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 sm:flex-none"
              >
                <PackagePlus size={17} />
                Assign products
              </button>
            </div>
          </div>
        </section>

        {/* Messages */}
        {(localError || error) && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {localError || error}
          </div>
        )}

        {message && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {message}
          </div>
        )}

        {/* Information Cards */}
        <section className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <InfoCard
            icon={UserRound}
            label="Username"
            value={`@${selectedVendor.username}`}
          />

          <InfoCard
            icon={Phone}
            label="Phone"
            value={selectedVendor.phone}
          />

          <InfoCard
            icon={CalendarDays}
            label="Last login"
            value={formatDate(
              selectedVendor.lastLoginAt,
              true
            )}
          />

          <InfoCard
            icon={Boxes}
            label="Assigned products"
            value={String(assignedCount)}
          />
        </section>

        {/* Settings */}
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-black tracking-tight text-zinc-950">
                Vendor information
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Update the vendor&apos;s basic
                account details.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                  Vendor name
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    updateField(
                      "name",
                      event.target.value
                    )
                  }
                  disabled={updatingVendor}
                  className="h-11 w-full rounded-xl border border-zinc-200 px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-950 disabled:bg-zinc-50 disabled:opacity-70"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                  Phone number
                </label>

                <input
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    updateField(
                      "phone",
                      event.target.value.replace(
                        /[^\d+\-\s]/g,
                        ""
                      )
                    )
                  }
                  placeholder="+91 98765 43210"
                  disabled={updatingVendor}
                  className="h-11 w-full rounded-xl border border-zinc-200 px-4 text-sm text-zinc-950 outline-none transition focus:border-zinc-950 disabled:bg-zinc-50 disabled:opacity-70"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                  Created
                </label>

                <div className="flex h-11 items-center rounded-xl bg-zinc-50 px-4 text-sm font-medium text-zinc-600">
                  {formatDate(
                    selectedVendor.createdAt,
                    true
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                  Last updated
                </label>

                <div className="flex h-11 items-center rounded-xl bg-zinc-50 px-4 text-sm font-medium text-zinc-600">
                  {formatDate(
                    selectedVendor.updatedAt,
                    true
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={updatingVendor}
                className={[
                  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                  selectedVendor.isActive
                    ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                ].join(" ")}
              >
                {selectedVendor.isActive ? (
                  <>
                    <CircleX size={17} />
                    Disable vendor
                  </>
                ) : (
                  <>
                    <CircleCheck size={17} />
                    Enable vendor
                  </>
                )}
              </button>

              <div className="flex gap-2">
                {hasChanges && (
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={updatingVendor}
                    className="h-11 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Reset
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={
                    updatingVendor ||
                    !form.name.trim() ||
                    !hasChanges
                  }
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                >
                  {updatingVendor ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Saving
                    </>
                  ) : (
                    <>
                      <Save size={17} />
                      Save changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* Module Access */}
          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white">
                <ShieldCheck size={18} />
              </span>

              <div>
                <h2 className="text-lg font-black tracking-tight text-zinc-950">
                  Module access
                </h2>

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  {enabledModuleCount} of{" "}
                  {MODULE_OPTIONS.length} modules
                  enabled.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {MODULE_OPTIONS.map((module) => (
                <ModuleOption
                  key={module.key}
                  module={module}
                  enabled={Boolean(
                    form.modules[module.key]
                  )}
                  disabled={updatingVendor}
                  onToggle={() =>
                    toggleModule(module.key)
                  }
                />
              ))}
            </div>
          </section>
        </div>

        {/* Assigned Products */}
        <section className="mt-5 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-zinc-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight text-zinc-950">
                Assigned products
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Showing the latest assigned products
                for this vendor.
              </p>
            </div>

            <button
              type="button"
              onClick={manageAssignments}
              className="inline-flex items-center gap-2 text-sm font-bold text-zinc-700 transition hover:text-zinc-950"
            >
              Manage assignments
              <ArrowRight size={15} />
            </button>
          </div>

          {loadingAssignedProducts &&
          !assignedProducts.length ? (
            <div className="flex min-h-52 flex-col items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />

              <p className="text-sm font-medium text-zinc-500">
                Loading products...
              </p>
            </div>
          ) : assignedProducts.length ? (
            <>
              <div className="divide-y divide-zinc-100">
                {assignedProducts
                  .slice(0, 8)
                  .map((assignment) => {
                    const productId =
                      assignment?.product?._id ||
                      assignment?.product ||
                      assignment?._id;

                    return (
                      <ProductRow
                        key={
                          assignment?._id ||
                          productId
                        }
                        assignment={assignment}
                        onManage={
                          manageAssignments
                        }
                      />
                    );
                  })}
              </div>

              {assignedCount >
                assignedProducts.length && (
                <div className="border-t border-zinc-100 px-5 py-4 text-center">
                  <button
                    type="button"
                    onClick={manageAssignments}
                    className="inline-flex items-center gap-2 text-sm font-bold text-zinc-700 transition hover:text-zinc-950"
                  >
                    View all {assignedCount} products
                    <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex min-h-60 flex-col items-center justify-center px-6 py-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
                <Boxes size={23} />
              </span>

              <h3 className="mt-4 text-base font-bold text-zinc-950">
                No products assigned
              </h3>

              <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                Search OATCLUB products and assign
                the relevant products to this vendor.
              </p>

              <button
                type="button"
                onClick={manageAssignments}
                className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white"
              >
                <PackagePlus size={17} />
                Assign products
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}