"use client";

import { useEffect, useMemo } from "react";
import { useCustomerStore } from "@/store/customerStore";

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

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-100 p-5">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-zinc-900">{value}</div>
      {sub ? <div className="mt-1 text-xs text-zinc-500">{sub}</div> : null}
    </div>
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

function ProgressRow({ label, value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="text-zinc-700">{label}</div>
        <div className="text-zinc-500">{value} ({pct}%)</div>
      </div>
      <div className="h-2 w-full rounded-full bg-zinc-100">
        <div className="h-2 rounded-full bg-zinc-900" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function CustomersDashboardPage() {
  const {
    customers,
    total,
    loadingList,
    error,
    fetchAllCustomersForDashboard, // ✅ new helper
    fetchCustomers, // fallback
  } = useCustomerStore();

  useEffect(() => {
    // Prefer fetchAllCustomersForDashboard if added, else use fetchCustomers with high limit
    if (fetchAllCustomersForDashboard) fetchAllCustomersForDashboard();
    else fetchCustomers({ page: 1, limit: 500 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const metrics = useMemo(() => {
    const list = Array.isArray(customers) ? customers : [];
    const totalCount = total || list.length;

    let active = 0;
    let inactive = 0;

    const byCountry = new Map();
    const byAgeGroup = new Map();

    const now = Date.now();
    const d7 = now - 7 * 24 * 60 * 60 * 1000;
    const d30 = now - 30 * 24 * 60 * 60 * 1000;

    let new7 = 0;
    let new30 = 0;

    let totalSpendSum = 0;
    let ordersSum = 0;

    for (const c of list) {
      if (c?.isActive) active++;
      else inactive++;

      const country = (c?.country || "Unknown").trim?.() ? c.country : "Unknown";
      byCountry.set(country, (byCountry.get(country) || 0) + 1);

      const ag = (c?.ageGroup || "Unknown").trim?.() ? c.ageGroup : "Unknown";
      byAgeGroup.set(ag, (byAgeGroup.get(ag) || 0) + 1);

      const created = new Date(c?.createdAt || c?.joinedAt || 0).getTime();
      if (!Number.isNaN(created) && created > 0) {
        if (created >= d7) new7++;
        if (created >= d30) new30++;
      }

      const spend = Number(c?.analytics?.totalSpend || 0);
      const orders = Number(c?.analytics?.totalOrders || 0);
      totalSpendSum += spend;
      ordersSum += orders;
    }

    const aovOverall = ordersSum > 0 ? Math.round(totalSpendSum / ordersSum) : 0;

    const topCountries = [...byCountry.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const ageGroups = [...byAgeGroup.entries()]
      .sort((a, b) => b[1] - a[1]);

    const topSpenders = [...list]
      .sort((a, b) => Number(b?.analytics?.totalSpend || 0) - Number(a?.analytics?.totalSpend || 0))
      .slice(0, 8);

    return {
      totalCount,
      active,
      inactive,
      topCountries,
      ageGroups,
      new7,
      new30,
      totalSpendSum,
      ordersSum,
      aovOverall,
      topSpenders,
    };
  }, [customers, total]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wider text-zinc-500">
            Customers
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">
            Customers Dashboard
          </h1>
          <div className="mt-1 text-sm text-zinc-600">
            Overview metrics from <span className="font-mono">/api/customers</span>
          </div>
        </div>

        {loadingList ? (
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-100 p-5">
            <div className="text-sm text-zinc-600">Loading customers…</div>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-zinc-100 p-5">
            <div className="text-sm font-semibold text-zinc-900">Error</div>
            <div className="mt-1 text-sm text-zinc-600">{error}</div>
          </div>
        ) : (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Stat label="Total Customers" value={String(metrics.totalCount)} sub="All time" />
              <Stat label="Active" value={String(metrics.active)} sub="isActive = true" />
              <Stat label="New (7 days)" value={String(metrics.new7)} sub="createdAt / joinedAt" />
              <Stat label="Overall AOV" value={formatMoney(metrics.aovOverall)} sub="totalSpend / totalOrders" />
            </div>

            {/* Distribution */}
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card title="Top Countries" right={`Top ${metrics.topCountries.length}`}>
                <div className="space-y-3">
                  {metrics.topCountries.length ? (
                    metrics.topCountries.map(([k, v]) => (
                      <ProgressRow key={k} label={k} value={v} total={metrics.totalCount} />
                    ))
                  ) : (
                    <div className="text-sm text-zinc-600">No data</div>
                  )}
                </div>
              </Card>

              <Card title="Age Groups" right={`${metrics.ageGroups.length} groups`}>
                <div className="space-y-3">
                  {metrics.ageGroups.length ? (
                    metrics.ageGroups.slice(0, 8).map(([k, v]) => (
                      <ProgressRow key={k} label={k} value={v} total={metrics.totalCount} />
                    ))
                  ) : (
                    <div className="text-sm text-zinc-600">No data</div>
                  )}
                </div>
              </Card>
            </div>

            {/* Top Spenders */}
            <div className="mt-6">
              <Card title="Top Spenders" right="By analytics.totalSpend">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-zinc-500">
                        <th className="py-2 pr-4">Customer</th>
                        <th className="py-2 pr-4">Email</th>
                        <th className="py-2 pr-4">Country</th>
                        <th className="py-2 pr-4">Orders</th>
                        <th className="py-2 pr-4">Spend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {metrics.topSpenders.map((c) => (
                        <tr key={c?._id || c?.customerId}>
                          <td className="py-3 pr-4 font-medium text-zinc-900">
                            {c?.name || "—"}
                          </td>
                          <td className="py-3 pr-4 text-zinc-600">{c?.email || "—"}</td>
                          <td className="py-3 pr-4 text-zinc-600">{c?.country || "—"}</td>
                          <td className="py-3 pr-4 text-zinc-600">
                            {String(c?.analytics?.totalOrders ?? 0)}
                          </td>
                          <td className="py-3 pr-4 font-semibold text-zinc-900">
                            {formatMoney(c?.analytics?.totalSpend)}
                          </td>
                        </tr>
                      ))}
                      {!metrics.topSpenders.length ? (
                        <tr>
                          <td className="py-4 text-zinc-600" colSpan={5}>
                            No spenders found
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 text-xs text-zinc-500">
                  Note: metrics depend on fields like <span className="font-mono">analytics.totalSpend</span>,{" "}
                  <span className="font-mono">analytics.totalOrders</span>,{" "}
                  <span className="font-mono">createdAt</span>.
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
