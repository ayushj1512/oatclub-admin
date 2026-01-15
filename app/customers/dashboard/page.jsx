"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAdminProductStore } from "@/store/adminProductStore"; // ✅ use product store

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function formatMoney(n) {
  const num = Number(n || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
}

function Badge({ children, tone = "neutral" }) {
  const tones = {
    neutral: "bg-zinc-100 text-zinc-700",
    good: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    bad: "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone] || tones.neutral
      )}
    >
      {children}
    </span>
  );
}

function Card({ title, right, children }) {
  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-100">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="text-sm font-semibold text-zinc-900">{title}</div>
        {right ? <div className="text-xs text-zinc-500">{right}</div> : null}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-xl bg-zinc-50 ring-1 ring-zinc-100 px-4 py-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-zinc-900">{value}</div>
      {sub ? <div className="mt-1 text-xs text-zinc-500">{sub}</div> : null}
    </div>
  );
}

function SkeletonLine({ w = "w-full" }) {
  return <div className={cx("h-3 rounded bg-zinc-100 animate-pulse", w)} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-100 p-5">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-zinc-100 animate-pulse" />
          <div className="flex-1 space-y-2">
            <SkeletonLine w="w-56" />
            <SkeletonLine w="w-40" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-100 p-5 space-y-3">
          <SkeletonLine w="w-24" />
          <SkeletonLine w="w-40" />
          <SkeletonLine w="w-32" />
        </div>
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-100 p-5 space-y-3">
          <SkeletonLine w="w-24" />
          <SkeletonLine w="w-40" />
          <SkeletonLine w="w-32" />
        </div>
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-100 p-5 space-y-3">
          <SkeletonLine w="w-24" />
          <SkeletonLine w="w-40" />
          <SkeletonLine w="w-32" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-100 p-5 space-y-3">
          <SkeletonLine w="w-36" />
          <SkeletonLine w="w-full" />
          <SkeletonLine w="w-4/5" />
          <SkeletonLine w="w-2/3" />
        </div>
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-100 p-5 space-y-3">
          <SkeletonLine w="w-36" />
          <SkeletonLine w="w-full" />
          <SkeletonLine w="w-4/5" />
          <SkeletonLine w="w-2/3" />
        </div>
      </div>
    </div>
  );
}

export default function CustomerDashboardPage() {
  const searchParams = useSearchParams();

  const {
    customer,
    loadingSingle,
    error,
    setError,
    fetchCustomerById,
  } =useAdminProductStore();

  const idFromQuery = searchParams.get("id");

  const [resolvedId, setResolvedId] = useState(idFromQuery || "");

  useEffect(() => {
    // ✅ Resolve ID from query OR localStorage fallback
    if (idFromQuery) {
      setResolvedId(idFromQuery);
      return;
    }

    // fallback: localStorage
    try {
      const fromLS =
        window.localStorage.getItem("customerMongoId") ||
        window.localStorage.getItem("customerId") ||
        "";
      if (fromLS) setResolvedId(fromLS);
    } catch {
      // ignore
    }
  }, [idFromQuery]);

  useEffect(() => {
    if (!resolvedId) return;
    setError("");
    fetchCustomerById(resolvedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedId]);

  const headline = useMemo(() => {
    if (!customer) return "Customer Dashboard";
    const name = customer?.name?.trim() || "Guest";
    const cid = customer?.customerId ? `#${customer.customerId}` : "";
    return `${name} ${cid}`.trim();
  }, [customer]);

  const location = useMemo(() => {
    if (!customer) return "—";
    const parts = [customer.city, customer.state, customer.country].filter(Boolean).map((s) => String(s).trim()).filter(Boolean);
    return parts.length ? parts.join(", ") : "—";
  }, [customer]);

  const statusTone = customer?.isActive ? "good" : "bad";

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-zinc-500">
              Account
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
              {headline}
            </h1>
            <div className="mt-1 text-sm text-zinc-600">
              {customer?.email ? (
                <span className="text-zinc-700">{customer.email}</span>
              ) : (
                <span className="text-zinc-500">No email on file</span>
              )}
              <span className="mx-2 text-zinc-300">•</span>
              <span className="text-zinc-600">{location}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge tone={statusTone}>
              {customer?.isActive ? "Active" : "Inactive"}
            </Badge>
            <Badge tone="neutral">
              Joined {formatDate(customer?.joinedAt || customer?.createdAt)}
            </Badge>
          </div>
        </div>

        {/* States */}
        {loadingSingle ? (
          <DashboardSkeleton />
        ) : error ? (
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-100 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-zinc-900">
                  Something went wrong
                </div>
                <div className="mt-1 text-sm text-zinc-600">{error}</div>
              </div>
              <button
                onClick={() => resolvedId && fetchCustomerById(resolvedId)}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 active:scale-[0.99]"
              >
                Retry
              </button>
            </div>
          </div>
        ) : !customer ? (
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-100 p-5">
            <div className="text-sm font-semibold text-zinc-900">
              No customer loaded
            </div>
            <div className="mt-1 text-sm text-zinc-600">
              Pass an id like <span className="font-mono">/customer/dashboard?id=...</span>{" "}
              or store it in localStorage as{" "}
              <span className="font-mono">customerMongoId</span>.
            </div>
          </div>
        ) : (
          <>
            {/* Top stats */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Stat
                label="Total Spend"
                value={formatMoney(customer?.analytics?.totalSpend)}
                sub="Lifetime"
              />
              <Stat
                label="Total Orders"
                value={String(customer?.analytics?.totalOrders ?? 0)}
                sub="Completed"
              />
              <Stat
                label="Avg Order Value"
                value={formatMoney(customer?.analytics?.avgOrderValue)}
                sub="Across orders"
              />
            </div>

            {/* Main grid */}
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card title="Profile">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-zinc-200">
                    {customer?.profileImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={customer.profileImage}
                        alt={customer?.name || "Customer"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-500">
                        {(customer?.name?.trim()?.[0] || "G").toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-zinc-900">
                      {customer?.name?.trim() || "Guest Customer"}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                      <span className="rounded-lg bg-zinc-50 px-2 py-1 ring-1 ring-zinc-100">
                        Gender: {customer?.gender || "unknown"}
                      </span>
                      <span className="rounded-lg bg-zinc-50 px-2 py-1 ring-1 ring-zinc-100">
                        Age group: {customer?.ageGroup || "Unknown"}
                      </span>
                      <span className="rounded-lg bg-zinc-50 px-2 py-1 ring-1 ring-zinc-100">
                        DOB: {formatDate(customer?.dateOfBirth)}
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-zinc-500">
                      Customer ID:{" "}
                      <span className="font-mono text-zinc-700">
                        {customer?.customerId || "—"}
                      </span>
                      <span className="mx-2 text-zinc-300">•</span>
                      Firebase UID:{" "}
                      <span className="font-mono text-zinc-700">
                        {customer?.firebaseUID || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="Cart & Activity" right="Live snapshot">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Stat
                    label="Cart Items"
                    value={String(customer?.cart?.cartCount ?? 0)}
                    sub={customer?.cart?.activeCartType ? `Type: ${customer.cart.activeCartType}` : undefined}
                  />
                  <Stat
                    label="Abandoned Carts"
                    value={String(customer?.cart?.abandonedCartCount ?? 0)}
                    sub={customer?.cart?.lastCartActivityAt ? `Last: ${formatDate(customer.cart.lastCartActivityAt)}` : "Last: —"}
                  />
                </div>

                <div className="mt-4 rounded-xl bg-zinc-50 ring-1 ring-zinc-100 px-4 py-3">
                  <div className="text-xs text-zinc-500">Active Cart</div>
                  <div className="mt-1 font-mono text-xs text-zinc-700 break-all">
                    {customer?.cart?.activeCartId || "—"}
                  </div>

                  <div className="mt-3 text-xs text-zinc-500">Last Abandoned</div>
                  <div className="mt-1 font-mono text-xs text-zinc-700 break-all">
                    {customer?.cart?.lastAbandonedCartId || "—"}
                  </div>
                </div>
              </Card>

              <Card title="Preferences">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-zinc-50 ring-1 ring-zinc-100 px-4 py-3">
                    <div className="text-xs text-zinc-500">Favorite brands</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(customer?.preferences?.favoriteBrands || []).length ? (
                        customer.preferences.favoriteBrands.slice(0, 12).map((b, idx) => (
                          <span
                            key={`${b}-${idx}`}
                            className="rounded-full bg-white px-2.5 py-1 text-xs text-zinc-700 ring-1 ring-zinc-200"
                          >
                            {b}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-zinc-600">—</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-zinc-50 ring-1 ring-zinc-100 px-4 py-3">
                    <div className="text-xs text-zinc-500">Budget range</div>
                    <div className="mt-2 text-sm font-semibold text-zinc-900">
                      {formatMoney(customer?.preferences?.budgetRange?.min)}{" "}
                      <span className="mx-2 text-zinc-300">→</span>
                      {formatMoney(customer?.preferences?.budgetRange?.max)}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      (If 0 → set it from preferences)
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-zinc-50 ring-1 ring-zinc-100 px-4 py-3">
                  <div className="text-xs text-zinc-500">Categories</div>
                  <div className="mt-1 text-sm text-zinc-700">
                    {(customer?.preferences?.categories || []).length
                      ? `${customer.preferences.categories.length} selected`
                      : "—"}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    (Showing count only; populate names by API if needed)
                  </div>
                </div>
              </Card>

              <Card title="More Analytics">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Stat
                    label="Wishlist"
                    value={String(customer?.analytics?.wishlistCount ?? 0)}
                  />
                  <Stat
                    label="Coupon Uses"
                    value={String(customer?.analytics?.couponUses ?? 0)}
                  />
                  <Stat
                    label="Credits Earned"
                    value={String(customer?.analytics?.creditsEarned ?? 0)}
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-zinc-50 ring-1 ring-zinc-100 px-4 py-3">
                  <div className="text-xs text-zinc-500">
                    Last updated: {formatDate(customer?.updatedAt)}
                  </div>
                  <button
                    onClick={() => resolvedId && fetchCustomerById(resolvedId)}
                    className="rounded-xl bg-white px-3 py-2 text-sm font-medium text-zinc-900 ring-1 ring-zinc-200 hover:bg-zinc-50 active:scale-[0.99]"
                  >
                    Refresh
                  </button>
                </div>
              </Card>
            </div>

            {/* Footer hint */}
            <div className="mt-8 text-xs text-zinc-500">
              Tip: If you want this dashboard to work without query params, save the
              Mongo id in <span className="font-mono">localStorage.customerMongoId</span>{" "}
              after login/checkout.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
