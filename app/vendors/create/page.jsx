"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Crown,
  Eye,
  EyeOff,
  Loader2,
  Save,
  ShieldCheck,
  UserCog,
} from "lucide-react";

import useAdminVendorStore from "@/store/adminVendorStore";

const DEFAULT_MODULES = {
  sampling: true,
  pattern: true,
  production: true,
  cuttingList: true,
};

const INITIAL_FORM = {
  name: "",
  username: "",
  password: "",
  phone: "",
  role: "vendor",
  modules: {
    ...DEFAULT_MODULES,
  },
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
    description: "Access production jobs and requirements.",
  },
  {
    key: "cuttingList",
    title: "Cutting List",
    description: "View cutting batches and requirements.",
  },
];

function FieldLabel({
  children,
  required = false,
}) {
  return (
    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
      {children}

      {required && (
        <span className="ml-1 text-red-500">
          *
        </span>
      )}
    </label>
  );
}

function RoleOption({
  role,
  active,
  icon: Icon,
  title,
  description,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(role)}
      className={[
        "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition",
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
        "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition",
        enabled
          ? "border-zinc-950 bg-zinc-950 text-white"
          : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-400",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "",
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

export default function CreateVendorPage() {
  const router = useRouter();

  const {
    createVendor,
    creatingVendor,
    error,
    message,
    clearMessages,
  } = useAdminVendorStore();

  const [form, setForm] =
    useState(INITIAL_FORM);

  const [showPassword, setShowPassword] =
    useState(false);

  const [localError, setLocalError] =
    useState("");

  const superAdmin =
    form.role === "superadmin";

  const enabledModuleCount = useMemo(
    () =>
      superAdmin
        ? Object.keys(DEFAULT_MODULES).length
        : Object.values(
            form.modules
          ).filter(Boolean).length,
    [form.modules, superAdmin]
  );

  const updateField = (field, value) => {
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
              ...DEFAULT_MODULES,
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
          !current.modules[moduleKey],
      },
    }));

    setLocalError("");
    clearMessages();
  };

  const validateForm = () => {
    const name = form.name.trim();
    const username =
      form.username.trim();

    if (!name) {
      return "Vendor name is required";
    }

    if (!username) {
      return "Username is required";
    }

    if (
      !/^[a-zA-Z0-9._-]+$/.test(
        username
      )
    ) {
      return "Username can only contain letters, numbers, dot, underscore and hyphen";
    }

    if (!form.password) {
      return "Password is required";
    }

    if (form.password.length < 6) {
      return "Password must contain at least 6 characters";
    }

    if (
      !superAdmin &&
      !enabledModuleCount
    ) {
      return "Enable at least one vendor module";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError =
      validateForm();

    if (validationError) {
      setLocalError(validationError);
      return;
    }

    setLocalError("");
    clearMessages();

    const result = await createVendor({
      name: form.name.trim(),

      username: form.username
        .trim()
        .toLowerCase(),

      password: form.password,

      phone: form.phone.trim(),

      role: form.role,

      modules: superAdmin
        ? {
            ...DEFAULT_MODULES,
          }
        : form.modules,
    });

    if (!result?.success) return;

    const vendorId =
      result.vendor?._id;

    router.push(
      vendorId
        ? `/vendors/${vendorId}`
        : "/vendors"
    );
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() =>
            router.push("/vendors")
          }
          disabled={creatingVendor}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-zinc-950 disabled:opacity-50"
        >
          <ArrowLeft size={16} />
          Back to vendors
        </button>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                <UserCog size={13} />
                Vendor Management
              </span>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
                Create vendor
              </h1>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Create a normal vendor or vendor
                super admin account.
              </p>
            </div>

            <div className="rounded-2xl bg-zinc-50 px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                Access
              </p>

              <p className="mt-1 text-lg font-black text-zinc-950">
                {superAdmin
                  ? "Full access"
                  : `${enabledModuleCount} modules`}
              </p>
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

        <form
          onSubmit={handleSubmit}
          className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]"
        >
          <div className="space-y-5">
            <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-black text-zinc-950">
                Account role
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Super admins automatically get
                every module and product.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <RoleOption
                  role="vendor"
                  active={
                    form.role === "vendor"
                  }
                  icon={UserCog}
                  title="Vendor"
                  description="Selected modules and assigned products only."
                  onClick={updateRole}
                />

                <RoleOption
                  role="superadmin"
                  active={superAdmin}
                  icon={Crown}
                  title="Super Admin"
                  description="All modules and all current or future products."
                  onClick={updateRole}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-black text-zinc-950">
                Vendor information
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Login and contact details.
              </p>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel required>
                    Name
                  </FieldLabel>

                  <input
                    value={form.name}
                    onChange={(event) =>
                      updateField(
                        "name",
                        event.target.value
                      )
                    }
                    placeholder="Example: Arora Garments"
                    disabled={creatingVendor}
                    className="h-11 w-full rounded-xl border border-zinc-200 px-4 text-sm outline-none focus:border-zinc-950 disabled:bg-zinc-50"
                  />
                </div>

                <div>
                  <FieldLabel required>
                    Username
                  </FieldLabel>

                  <input
                    value={form.username}
                    onChange={(event) =>
                      updateField(
                        "username",
                        event.target.value
                          .toLowerCase()
                          .replace(/\s+/g, "")
                      )
                    }
                    placeholder="arora.vendor"
                    disabled={creatingVendor}
                    className="h-11 w-full rounded-xl border border-zinc-200 px-4 text-sm outline-none focus:border-zinc-950 disabled:bg-zinc-50"
                  />
                </div>

                <div>
                  <FieldLabel>
                    Phone
                  </FieldLabel>

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
                    disabled={creatingVendor}
                    className="h-11 w-full rounded-xl border border-zinc-200 px-4 text-sm outline-none focus:border-zinc-950 disabled:bg-zinc-50"
                  />
                </div>

                <div className="sm:col-span-2">
                  <FieldLabel required>
                    Password
                  </FieldLabel>

                  <div className="relative">
                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={form.password}
                      onChange={(event) =>
                        updateField(
                          "password",
                          event.target.value
                        )
                      }
                      placeholder="Minimum 6 characters"
                      disabled={creatingVendor}
                      className="h-11 w-full rounded-xl border border-zinc-200 px-4 pr-12 text-sm outline-none focus:border-zinc-950 disabled:bg-zinc-50"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (value) => !value
                        )
                      }
                      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100"
                    >
                      {showPassword ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
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

                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  {superAdmin
                    ? "All modules are automatically enabled."
                    : "Choose accessible workspaces."}
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
                    disabled={superAdmin}
                    onToggle={() =>
                      toggleModule(module.key)
                    }
                  />
                )
              )}
            </div>
          </section>

          <section className="flex flex-col-reverse gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:justify-end lg:col-span-2">
            <button
              type="button"
              onClick={() =>
                router.push("/vendors")
              }
              disabled={creatingVendor}
              className="h-11 rounded-xl border border-zinc-200 px-5 text-sm font-semibold text-zinc-700"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                creatingVendor ||
                (!superAdmin &&
                  !enabledModuleCount)
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {creatingVendor ? (
                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                  Creating
                </>
              ) : (
                <>
                  <Save size={17} />
                  Create account
                </>
              )}
            </button>
          </section>
        </form>
      </div>
    </main>
  );
}