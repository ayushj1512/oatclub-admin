"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Crown,
  Globe2,
  Layers3,
  Lock,
  RefreshCcw,
  Search,
  Sparkles,
  Target,
  TicketPercent,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useCouponStore } from "@/store/couponStore";

const targetLabels = {
  cart: "Cart",
  primary_products: "Primary",
  secondary_products: "Secondary",
  category_products: "Category",
  collection_products: "Collection",
  matched_products: "Matched",
};

const ruleLabels = {
  primary_required: "Primary",
  secondary_required: "Secondary",
  category_required: "Category",
  collection_required: "Collection",
};

const COLORS = ["#111827", "#6b7280", "#d1d5db", "#9ca3af", "#e5e7eb"];

export default function CouponReportsPage() {
  const { coupons, loading, fetchCoupons } = useCouponStore();

  const [filters, setFilters] = useState({
    search: "",
    ruleType: "",
    discountTarget: "",
    autoApply: "",
  });

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const now = useMemo(() => new Date(), []);

  const getRules = (coupon) => {
    if (Array.isArray(coupon?.cartRules) && coupon.cartRules.length) {
      return coupon.cartRules.filter((r) => r?.isActive !== false);
    }

    const old = coupon?.cartRule;
    if (!old?.enabled || old?.ruleType === "none") return [];

    if (old.ruleType === "primary_secondary") {
      return [{ ruleType: "primary_required" }, { ruleType: "secondary_required" }];
    }

    if (old.ruleType === "category_collection") {
      return [{ ruleType: "category_required" }, { ruleType: "collection_required" }];
    }

    return [];
  };

  const getTarget = (coupon) =>
    coupon.discountTarget || coupon?.cartRule?.discountTarget || "cart";

  const getRuleLabel = (coupon) => {
    const rules = getRules(coupon);
    if (!rules.length) return "Basic";

    return rules
      .map((r) => ruleLabels[r.ruleType] || "Rule")
      .join(" + ");
  };

  const getStatus = (coupon) => {
    if (!coupon.isActive) return "Inactive";
    if (new Date(coupon.validTill) < now) return "Expired";
    return "Active";
  };

  const filteredCoupons = useMemo(() => {
    const q = filters.search.trim().toLowerCase();

    return coupons.filter((coupon) => {
      const rules = getRules(coupon);
      const ruleTypes = rules.map((r) => r.ruleType);
      const target = getTarget(coupon);

      if (q) {
        const text = [
          coupon.code,
          coupon.couponNumber,
          coupon.description,
          getRuleLabel(coupon),
          target,
          ...ruleTypes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!text.includes(q)) return false;
      }

      if (filters.ruleType) {
        if (filters.ruleType === "basic" && rules.length) return false;
        if (filters.ruleType !== "basic" && !ruleTypes.includes(filters.ruleType)) {
          return false;
        }
      }

      if (filters.discountTarget && target !== filters.discountTarget) return false;

      if (filters.autoApply !== "") {
        if (Boolean(coupon.autoApply) !== (filters.autoApply === "true")) {
          return false;
        }
      }

      return true;
    });
  }, [coupons, filters]);

  const stats = useMemo(() => {
    const total = filteredCoupons.length;
    const active = filteredCoupons.filter((c) => getStatus(c) === "Active").length;
    const expired = filteredCoupons.filter((c) => getStatus(c) === "Expired").length;
    const inactive = filteredCoupons.filter((c) => getStatus(c) === "Inactive").length;
    const auto = filteredCoupons.filter((c) => c.autoApply).length;
    const targeted = filteredCoupons.filter((c) => c.targetEmail || c.targetPhone).length;

    const used = filteredCoupons.reduce((sum, c) => sum + Number(c.usedCount || 0), 0);

    const limited = filteredCoupons.reduce((sum, c) => {
      const limit = Number(c.usageLimit || 0);
      return sum + (limit > 0 ? limit : 0);
    }, 0);

    const avgUsage = total ? Math.round(used / total) : 0;

    return {
      total,
      active,
      expired,
      inactive,
      auto,
      targeted,
      used,
      limited,
      avgUsage,
    };
  }, [filteredCoupons]);

  const statusPie = useMemo(
    () => [
      { name: "Active", value: stats.active },
      { name: "Expired", value: stats.expired },
      { name: "Inactive", value: stats.inactive },
    ].filter((x) => x.value > 0),
    [stats]
  );

  const rulePie = useMemo(() => {
    const map = {};

    filteredCoupons.forEach((coupon) => {
      const label = getRuleLabel(coupon);
      map[label] = (map[label] || 0) + 1;
    });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredCoupons]);

  const targetPie = useMemo(() => {
    const map = {};

    filteredCoupons.forEach((coupon) => {
      const target = getTarget(coupon);
      const label = targetLabels[target] || target;
      map[label] = (map[label] || 0) + 1;
    });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredCoupons]);

  const topUsed = useMemo(() => {
    return [...filteredCoupons]
      .sort((a, b) => Number(b.usedCount || 0) - Number(a.usedCount || 0))
      .slice(0, 8);
  }, [filteredCoupons]);

  const barData = useMemo(() => {
    return topUsed.map((c) => ({
      code: c.code,
      used: Number(c.usedCount || 0),
    }));
  }, [topUsed]);

  const resetFilters = () => {
    setFilters({
      search: "",
      ruleType: "",
      discountTarget: "",
      autoApply: "",
    });
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.04)] ring-1 ring-gray-100 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-950 text-white">
                <TicketPercent size={24} />
              </div>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
                  Coupon Reports
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Usage, rule performance, target split and coupon health.
                </p>
              </div>
            </div>

            <button
              onClick={() => fetchCoupons()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-black"
            >
              <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-3xl bg-white p-4 shadow-[0_12px_35px_rgba(0,0,0,0.035)] ring-1 ring-gray-100">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_repeat(3,1fr)_auto]">
            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={filters.search}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, search: e.target.value }))
                }
                placeholder="Search coupon, rule, target..."
                className="w-full rounded-2xl bg-gray-50 py-2.5 pl-10 pr-3 text-sm outline-none ring-1 ring-gray-100 focus:bg-white focus:ring-gray-300"
              />
            </div>

            <select
              value={filters.ruleType}
              onChange={(e) =>
                setFilters((p) => ({ ...p, ruleType: e.target.value }))
              }
              className={selectClass}
            >
              <option value="">All Rules</option>
              <option value="basic">Basic</option>
              <option value="primary_required">Primary</option>
              <option value="secondary_required">Secondary</option>
              <option value="category_required">Category</option>
              <option value="collection_required">Collection</option>
            </select>

            <select
              value={filters.discountTarget}
              onChange={(e) =>
                setFilters((p) => ({ ...p, discountTarget: e.target.value }))
              }
              className={selectClass}
            >
              <option value="">All Targets</option>
              <option value="cart">Cart</option>
              <option value="primary_products">Primary</option>
              <option value="secondary_products">Secondary</option>
              <option value="category_products">Category</option>
              <option value="collection_products">Collection</option>
              <option value="matched_products">Matched</option>
            </select>

            <select
              value={filters.autoApply}
              onChange={(e) =>
                setFilters((p) => ({ ...p, autoApply: e.target.value }))
              }
              className={selectClass}
            >
              <option value="">All Apply</option>
              <option value="true">Auto</option>
              <option value="false">Manual</option>
            </select>

            <button
              onClick={resetFilters}
              className="rounded-2xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Coupons" value={stats.total} icon={TrendingUp} />
          <StatCard label="Total Redemptions" value={stats.used} icon={Crown} />
          <StatCard label="Auto Apply" value={stats.auto} icon={Sparkles} />
          <StatCard label="Targeted" value={stats.targeted} icon={Lock} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active" value={stats.active} icon={CheckCircle} />
          <StatCard label="Expired" value={stats.expired} icon={AlertTriangle} />
          <StatCard label="Inactive" value={stats.inactive} icon={XCircle} />
          <StatCard label="Avg Usage" value={stats.avgUsage} icon={TicketPercent} />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <ChartCard title="Coupon Health" subtitle="Active vs expired vs inactive">
            <Donut data={statusPie} />
          </ChartCard>

          <ChartCard title="Rule Distribution" subtitle="Rules used in coupons">
            <Donut data={rulePie} />
          </ChartCard>

          <ChartCard title="Discount Target Split" subtitle="Where discount applies">
            <Donut data={targetPie} />
          </ChartCard>
        </div>

        <div className="mt-5 rounded-3xl bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.035)] ring-1 ring-gray-100">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-950">
                Top Coupon Usage
              </h2>
              <p className="text-sm text-gray-500">
                Top 8 coupons sorted by redemption count.
              </p>
            </div>

            <Badge>{stats.used} total uses</Badge>
          </div>

          <div className="h-72">
            {barData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="code" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="used" radius={[10, 10, 0, 0]} fill="#111827" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState text="No coupon usage found yet." />
            )}
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-[0_12px_35px_rgba(0,0,0,0.035)] ring-1 ring-gray-100">
          <div className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-950">
                Detailed Coupon Values
              </h2>
              <p className="text-sm text-gray-500">
                Codes, rules, targets, usage and status.
              </p>
            </div>

            <Badge>{filteredCoupons.length} coupons</Badge>
          </div>

          {loading ? (
            <div className="py-14 text-center text-sm text-gray-500">
              Loading reports...
            </div>
          ) : filteredCoupons.length === 0 ? (
            <EmptyState text="No coupons found." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-sm">
                <thead>
                  <tr className="bg-gray-50/70 text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="px-4 py-4 font-medium">Coupon</th>
                    <th className="px-4 py-4 font-medium">Rule</th>
                    <th className="px-4 py-4 font-medium">Target</th>
                    <th className="px-4 py-4 font-medium">Badges</th>
                    <th className="px-4 py-4 font-medium">Discount</th>
                    <th className="px-4 py-4 font-medium">Used</th>
                    <th className="px-4 py-4 font-medium">Limit</th>
                    <th className="px-4 py-4 font-medium">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredCoupons.map((coupon) => {
                    const status = getStatus(coupon);
                    const target = getTarget(coupon);
                    const targeted = Boolean(coupon.targetEmail || coupon.targetPhone);

                    return (
                      <tr key={coupon._id} className="transition hover:bg-gray-50/70">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-gray-950">
                            {coupon.code}
                          </div>
                          <div className="text-xs text-gray-400">
                            #{coupon.couponNumber || "---"}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-gray-700">
                          <div className="flex items-center gap-2">
                            <Layers3 size={15} className="text-gray-400" />
                            {getRuleLabel(coupon)}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <Badge>{targetLabels[target] || target}</Badge>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {coupon.visibility === "private" ? (
                              <Badge>
                                <Lock size={12} className="mr-1" />
                                Private
                              </Badge>
                            ) : (
                              <Badge>
                                <Globe2 size={12} className="mr-1" />
                                Public
                              </Badge>
                            )}

                            {coupon.autoApply && (
                              <Badge>
                                <Sparkles size={12} className="mr-1" />
                                Auto
                              </Badge>
                            )}

                            {targeted && <Badge>Targeted</Badge>}
                          </div>
                        </td>

                        <td className="px-4 py-4 font-medium text-gray-800">
                          {coupon.discountType === "percentage"
                            ? `${coupon.discountValue}%`
                            : `₹${coupon.discountValue}`}
                        </td>

                        <td className="px-4 py-4 font-semibold text-gray-950">
                          {coupon.usedCount || 0}
                        </td>

                        <td className="px-4 py-4 text-gray-600">
                          {coupon.usageLimit > 0 ? coupon.usageLimit : "∞"}
                        </td>

                        <td className="px-4 py-4">
                          <StatusBadge status={status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const selectClass =
  "rounded-2xl bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300";

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.035)] ring-1 ring-gray-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight text-gray-950">
            {value}
          </h2>
        </div>

        <div className="rounded-2xl bg-gray-50 p-3 text-gray-800">
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.035)] ring-1 ring-gray-100">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-950">{title}</h2>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>

      <div className="h-72">{children}</div>
    </div>
  );
}

function Donut({ data }) {
  if (!data.length) return <EmptyState text="No data available." />;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          innerRadius={58}
          outerRadius={92}
          paddingAngle={3}
          dataKey="value"
          nameKey="name"
        >
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
      {children}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    Active: "bg-green-50 text-green-700",
    Expired: "bg-amber-50 text-amber-700",
    Inactive: "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        map[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}

function EmptyState({ text }) {
  return (
    <div className="flex h-full min-h-44 flex-col items-center justify-center gap-2 text-center text-sm text-gray-500">
      <AlertTriangle size={30} className="text-gray-300" />
      {text}
    </div>
  );
}