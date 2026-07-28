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
  Crown,
  Loader2,
  PackagePlus,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  UserCog,
  UserRound,
} from "lucide-react";

import useAdminVendorStore from "@/store/adminVendorStore";

const ALL_MODULES = {
  sampling: true,
  pattern: true,
  production: true,
  cuttingList: true,
};

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
    description: "Access sampling products and workflow.",
  },
  {
    key: "pattern",
    title: "Pattern",
    description: "Manage pattern workflow and pattern numbers.",
  },
  {
    key: "production",
    title: "Production",
    description: "Access production products and jobs.",
  },
  {
    key: "cuttingList",
    title: "Cutting List",
    description: "View cutting batches and requirements.",
  },
];

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

const isSuperAdminVendor = (vendor) =>
  vendor?.role === "superadmin";

const getModules = (vendor) => {
  if (isSuperAdminVendor(vendor)) {
    return {
      ...ALL_MODULES,
    };
  }

  return {
    sampling:
      vendor?.modules?.sampling === true,
    pattern:
      vendor?.modules?.pattern === true,
    production:
      vendor?.modules?.production === true,
    cuttingList:
      vendor?.modules?.cuttingList === true,
  };
};

const getProductImage = (product) => {
  const thumbnail = product?.thumbnail;

  if (typeof thumbnail === "string") {
    return thumbnail;
  }

  if (thumbnail?.url) {
    return thumbnail.url;
  }

  const image = product?.images?.[0];

  return typeof image === "string"
    ? image
    : image?.url || "";
};

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
          <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
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

function RoleOption({
  value,
  currentRole,
  icon: Icon,
  title,
  description,
  disabled,
  onChange,
}) {
  const active =
    value === currentRole;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(value)}
      className={[
        "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
        active
          ? "border-zinc-950 bg-zinc-950 text-white"
          : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-400",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          active
            ? "bg-white text-zinc-950"
            : "bg-zinc-100 text-zinc-600",
        ].join(" ")}
      >
        <Icon size={18} />
      </span>

      <span>
        <span className="block text-sm font-bold">
          {title}
        </span>

        <span
          className={[
            "mt-1 block text-xs leading-5",
            active
              ? "text-zinc-300"
              : "text-zinc-500",
          ].join(" ")}
        >
          {description}
        </span>
      </span>
    </button>
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
      disabled={disabled}
      onClick={onToggle}
      className={[
        "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
        enabled
          ? "border-zinc-950 bg-zinc-950 text-white"
          : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-400",
      ].join(" ")}
    >
      <span
        className={[
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
          enabled
            ? "border-white bg-white text-zinc-950"
            : "border-zinc-300 bg-white text-transparent",
        ].join(" ")}
      >
        <Check size={13} />
      </span>

      <span>
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
  superAdmin,
  onManage,
}) {
  const product =
    assignment?.product || assignment;

  const image =
    getProductImage(product);

  const enabledModules = superAdmin
    ? 4
    : Object.values(
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
          {product?.title ||
            "Untitled product"}
        </p>

        <div className="mt-1 flex flex-wrap gap-3">
          <p className="text-xs font-medium text-zinc-500">
            Code:{" "}
            {product?.productCode || "—"}
          </p>

          <p className="text-[10px] font-semibold text-zinc-400">
            {superAdmin
              ? "Full access"
              : `${enabledModules} modules`}
          </p>
        </div>
      </div>

      {!superAdmin && (
        <button
          type="button"
          onClick={onManage}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-950 hover:text-white"
        >
          <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
}

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
    role: "vendor",
    modules: {
      ...EMPTY_MODULES,
    },
  });

  const [localError, setLocalError] =
    useState("");

  const superAdmin =
    form.role === "superadmin";

  const loadPage = useCallback(async () => {
    if (!vendorId) return;

    clearMessages();
    setLocalError("");

    const vendorResult =
      await fetchVendorById(vendorId);

    if (vendorResult?.success) {
      await fetchAssignedProducts(
        vendorId,
        {
          page: 1,
          limit: 8,
        }
      );
    }
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
      name:
        selectedVendor.name || "",
      phone:
        selectedVendor.phone || "",
      role:
        selectedVendor.role ===
        "superadmin"
          ? "superadmin"
          : "vendor",
      modules:
        getModules(selectedVendor),
    });
  }, [selectedVendor]);

  const enabledModuleCount = useMemo(
    () =>
      superAdmin
        ? MODULE_OPTIONS.length
        : Object.values(
            form.modules
          ).filter(Boolean).length,
    [form.modules, superAdmin]
  );

  const hasChanges = useMemo(() => {
    if (!selectedVendor) {
      return false;
    }

    const originalRole =
      selectedVendor.role ===
      "superadmin"
        ? "superadmin"
        : "vendor";

    const originalModules =
      getModules(selectedVendor);

    return (
      form.name.trim() !==
        String(
          selectedVendor.name || ""
        ).trim() ||
      form.phone.trim() !==
        String(
          selectedVendor.phone || ""
        ).trim() ||
      form.role !== originalRole ||
      Object.keys(
        EMPTY_MODULES
      ).some(
        (key) =>
          Boolean(
            form.modules[key]
          ) !==
          Boolean(
            originalModules[key]
          )
      )
    );
  }, [form, selectedVendor]);

  const assignedCount =
    superAdmin
      ? "All"
      : assignedPagination.total ||
        selectedVendor
          ?.assignedProductCount ||
        selectedVendor?.productsCount ||
        assignedProducts.length;

  const busy =
    loadingVendor ||
    loadingAssignedProducts ||
    updatingVendor;

  const manageAssignments = () => {
    if (superAdmin) return;

    router.push(
      `/vendors/${vendorId}/assign-products`
    );
  };

  const updateField = (
    field,
    value
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setLocalError("");
    clearMessages();
  };

  const updateRole = (role) => {
    setForm((current) => ({
      ...current,
      role,
      modules:
        role === "superadmin"
          ? {
              ...ALL_MODULES,
            }
          : current.modules,
    }));

    setLocalError("");
    clearMessages();
  };

  const toggleModule = (moduleKey) => {
    if (superAdmin) return;

    setForm((current) => ({
      ...current,
      modules: {
        ...current.modules,
        [moduleKey]:
          !current.modules[
            moduleKey
          ],
      },
    }));

    setLocalError("");
    clearMessages();
  };

  const resetForm = () => {
    if (!selectedVendor) return;

    setForm({
      name:
        selectedVendor.name || "",
      phone:
        selectedVendor.phone || "",
      role:
        selectedVendor.role ===
        "superadmin"
          ? "superadmin"
          : "vendor",
      modules:
        getModules(selectedVendor),
    });

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

    if (
      !superAdmin &&
      !enabledModuleCount
    ) {
      setLocalError(
        "Enable at least one module"
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
        role: form.role,
        modules: superAdmin
          ? {
              ...ALL_MODULES,
            }
          : form.modules,
      }
    );

    if (result?.success) {
      const updatedVendor =
        result.vendor || {
          ...selectedVendor,
          name,
          phone: form.phone.trim(),
          role: form.role,
          modules: form.modules,
        };

      setForm({
        name:
          updatedVendor.name || name,
        phone:
          updatedVendor.phone || "",
        role:
          updatedVendor.role ===
          "superadmin"
            ? "superadmin"
            : "vendor",
        modules:
          getModules(updatedVendor),
      });

      await fetchAssignedProducts(
        vendorId,
        {
          page: 1,
          limit: 8,
        }
      );
    }
  };

  const handleToggleStatus =
    async () => {
      if (!selectedVendor) return;

      clearMessages();
      setLocalError("");

      await toggleVendorStatus(
        vendorId,
        !selectedVendor.isActive
      );
    };

  if (
    loadingVendor &&
    !selectedVendor
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
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
          <CircleX className="mx-auto h-10 w-10 text-red-500" />

          <h1 className="mt-4 text-xl font-black text-zinc-950">
            Vendor not found
          </h1>

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
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-950 disabled:opacity-50"
        >
          <ArrowLeft size={16} />
          Back to vendors
        </button>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-950 text-white">
                  {superAdmin ? (
                    <Crown size={20} />
                  ) : (
                    <UserCog size={20} />
                  )}
                </span>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-black text-zinc-950 sm:text-3xl">
                      {selectedVendor.name}
                    </h1>

                    <span
                      className={[
                        "rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider",
                        superAdmin
                          ? "bg-amber-50 text-amber-700"
                          : "bg-zinc-100 text-zinc-600",
                      ].join(" ")}
                    >
                      {superAdmin
                        ? "Super Admin"
                        : "Vendor"}
                    </span>

                    <span
                      className={[
                        "rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider",
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

              <p className="mt-4 text-sm text-zinc-500">
                {superAdmin
                  ? "Full access to every module and product."
                  : "Manage vendor permissions and assigned products."}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={loadPage}
                disabled={busy}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-200 px-4 text-sm font-semibold disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={
                    busy
                      ? "animate-spin"
                      : ""
                  }
                />
                Refresh
              </button>

              {!superAdmin && (
                <button
                  type="button"
                  onClick={
                    manageAssignments
                  }
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white"
                >
                  <PackagePlus size={17} />
                  Assign products
                </button>
              )}
            </div>
          </div>
        </section>

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
            icon={
              superAdmin
                ? ShieldCheck
                : Boxes
            }
            label={
              superAdmin
                ? "Product access"
                : "Assigned products"
            }
            value={String(
              assignedCount
            )}
          />
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-5">
            <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-black text-zinc-950">
                Account role
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Changing to super admin grants
                complete access.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <RoleOption
                  value="vendor"
                  currentRole={form.role}
                  icon={UserCog}
                  title="Vendor"
                  description="Selected modules and assigned products."
                  disabled={updatingVendor}
                  onChange={updateRole}
                />

                <RoleOption
                  value="superadmin"
                  currentRole={form.role}
                  icon={Crown}
                  title="Super Admin"
                  description="All modules and all products."
                  disabled={updatingVendor}
                  onChange={updateRole}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-black text-zinc-950">
                Vendor information
              </h2>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Vendor name
                  </label>

                  <input
                    value={form.name}
                    onChange={(event) =>
                      updateField(
                        "name",
                        event.target.value
                      )
                    }
                    disabled={updatingVendor}
                    className="h-11 w-full rounded-xl border border-zinc-200 px-4 text-sm outline-none focus:border-zinc-950 disabled:bg-zinc-50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Phone number
                  </label>

                  <input
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
                    disabled={updatingVendor}
                    className="h-11 w-full rounded-xl border border-zinc-200 px-4 text-sm outline-none focus:border-zinc-950 disabled:bg-zinc-50"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={
                    handleToggleStatus
                  }
                  disabled={updatingVendor}
                  className={[
                    "inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold disabled:opacity-50",
                    selectedVendor.isActive
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700",
                  ].join(" ")}
                >
                  {selectedVendor.isActive ? (
                    <>
                      <CircleX size={17} />
                      Disable
                    </>
                  ) : (
                    <>
                      <CircleCheck size={17} />
                      Enable
                    </>
                  )}
                </button>

                <div className="flex gap-2">
                  {hasChanges && (
                    <button
                      type="button"
                      onClick={resetForm}
                      disabled={updatingVendor}
                      className="h-11 rounded-xl border border-zinc-200 px-4 text-sm font-semibold"
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
                      !hasChanges ||
                      (!superAdmin &&
                        !enabledModuleCount)
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white disabled:opacity-50"
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
          </div>

          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white">
                <ShieldCheck size={18} />
              </span>

              <div>
                <h2 className="text-lg font-black text-zinc-950">
                  Module access
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  {superAdmin
                    ? "All modules enabled automatically."
                    : `${enabledModuleCount} of ${MODULE_OPTIONS.length} enabled.`}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {MODULE_OPTIONS.map(
                (module) => (
                  <ModuleOption
                    key={module.key}
                    module={module}
                    enabled={
                      superAdmin ||
                      Boolean(
                        form.modules[
                          module.key
                        ]
                      )
                    }
                    disabled={
                      superAdmin ||
                      updatingVendor
                    }
                    onToggle={() =>
                      toggleModule(
                        module.key
                      )
                    }
                  />
                )
              )}
            </div>
          </section>
        </div>

        <section className="mt-5 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-5">
            <div>
              <h2 className="text-lg font-black text-zinc-950">
                {superAdmin
                  ? "Accessible products"
                  : "Assigned products"}
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                {superAdmin
                  ? "Super admin can access every product."
                  : "Latest products assigned to this vendor."}
              </p>
            </div>

            {!superAdmin && (
              <button
                type="button"
                onClick={
                  manageAssignments
                }
                className="inline-flex items-center gap-2 text-sm font-bold text-zinc-700"
              >
                Manage
                <ArrowRight size={15} />
              </button>
            )}
          </div>

          {loadingAssignedProducts &&
          !assignedProducts.length ? (
            <div className="flex min-h-52 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            </div>
          ) : assignedProducts.length ? (
            <div className="divide-y divide-zinc-100">
              {assignedProducts
                .slice(0, 8)
                .map((assignment) => {
                  const product =
                    assignment?.product ||
                    assignment;

                  return (
                    <ProductRow
                      key={
                        assignment?._id ||
                        product?._id
                      }
                      assignment={
                        assignment
                      }
                      superAdmin={
                        superAdmin
                      }
                      onManage={
                        manageAssignments
                      }
                    />
                  );
                })}
            </div>
          ) : (
            <div className="flex min-h-60 flex-col items-center justify-center px-6 text-center">
              <Boxes className="h-10 w-10 text-zinc-300" />

              <h3 className="mt-4 font-bold text-zinc-950">
                {superAdmin
                  ? "No products found"
                  : "No products assigned"}
              </h3>

              {!superAdmin && (
                <button
                  type="button"
                  onClick={
                    manageAssignments
                  }
                  className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white"
                >
                  <PackagePlus size={17} />
                  Assign products
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}