"use client";

import { useRouter } from "next/navigation";
import {
  TicketPercent,
  PlusCircle,
  FileSpreadsheet,
  Settings,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Layers3,
  FolderTree,
  Lock,
  Globe2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useCouponStore } from "@/store/couponStore";

export default function CouponDashboard() {
  const router = useRouter();
  const { coupons, loading, fetchCoupons } = useCouponStore();

  const [filters, setFilters] = useState({
    visibility: "",
    type: "",
    autoApply: "",
    ruleType: "",
  });

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const now = useMemo(() => new Date(), []);

  const cards = [
    {
      id: "create",
      title: "Create Coupon",
      desc: "Create manual, targeted, auto-apply, category or collection coupons.",
      icon: PlusCircle,
      route: "/coupons/create",
    },
    {
      id: "manage",
      title: "Manage Coupons",
      desc: "Edit coupon rules, expiry, visibility and usage limits.",
      icon: Settings,
      route: "/coupons/manage",
    },
    {
      id: "reports",
      title: "Usage Reports",
      desc: "Track coupon performance, redemptions and customer activity.",
      icon: FileSpreadsheet,
      route: "/coupons/reports",
    },
  ];

  const filteredCoupons = useMemo(() => {
    return coupons.filter((coupon) => {
      if (filters.visibility && coupon.visibility !== filters.visibility) return false;
      if (filters.type && coupon.type !== filters.type) return false;

      if (filters.autoApply !== "") {
        if (Boolean(coupon.autoApply) !== (filters.autoApply === "true")) return false;
      }

      if (filters.ruleType && coupon?.cartRule?.ruleType !== filters.ruleType) return false;

      return true;
    });
  }, [coupons, filters]);

  const stats = useMemo(() => {
    const active = filteredCoupons.filter(
      (c) => c.isActive && new Date(c.validTill) > now
    ).length;

    const expired = filteredCoupons.filter((c) => new Date(c.validTill) < now).length;

    const autoApply = filteredCoupons.filter((c) => c.autoApply).length;

    const categoryCollection = filteredCoupons.filter(
      (c) => c?.cartRule?.ruleType === "category_collection"
    ).length;

    const primarySecondary = filteredCoupons.filter(
      (c) => c?.cartRule?.ruleType === "primary_secondary"
    ).length;

    return {
      total: filteredCoupons.length,
      active,
      expired,
      autoApply,
      categoryCollection,
      primarySecondary,
    };
  }, [filteredCoupons, now]);

  const recentCoupons = useMemo(() => {
    return [...filteredCoupons]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 6);
  }, [filteredCoupons]);

  const resetFilters = () => {
    setFilters({
      visibility: "",
      type: "",
      autoApply: "",
      ruleType: "",
    });
  };

  const Badge = ({ children, tone = "gray" }) => {
    const tones = {
      gray: "bg-gray-100 text-gray-700",
      dark: "bg-gray-900 text-white",
      blue: "bg-blue-50 text-blue-700",
      green: "bg-green-50 text-green-700",
      amber: "bg-amber-50 text-amber-700",
      purple: "bg-purple-50 text-purple-700",
      red: "bg-red-50 text-red-700",
    };

    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
          tones[tone] || tones.gray
        }`}
      >
        {children}
      </span>
    );
  };

  const StatCard = ({ label, value, icon: Icon, hint }) => (
    <div className="rounded-3xl bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.04)] ring-1 ring-gray-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <h2 className="mt-1 text-2xl font-semibold text-gray-950">
            {loading ? "…" : value}
          </h2>
          {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
        </div>

        <div className="rounded-2xl bg-gray-50 p-3 text-gray-800">
          <Icon size={21} />
        </div>
      </div>
    </div>
  );

  const formatDiscount = (coupon) => {
    if (coupon.discountType === "percentage") return `${coupon.discountValue}%`;
    return `₹${coupon.discountValue}`;
  };

  const getRuleLabel = (coupon) => {
    const rule = coupon?.cartRule?.ruleType;

    if (!coupon?.cartRule?.enabled || rule === "none") return "Basic";
    if (rule === "primary_secondary") return "Primary + Secondary";
    if (rule === "category_collection") return "Category / Collection";

    return "Rule";
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="rounded-3xl bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.04)] ring-1 ring-gray-100 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-950 text-white">
                <TicketPercent size={25} />
              </div>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
                  Coupons Dashboard
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                  Track coupon health, auto-apply rules, category/collection offers and
                  recent coupon activity.
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push("/coupons/create")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-950 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-black sm:w-auto"
            >
              <PlusCircle size={17} />
              Create Coupon
            </button>
          </div>
        </div>

        {/* FILTERS */}
        <div className="mt-5 rounded-3xl bg-white p-4 shadow-[0_12px_35px_rgba(0,0,0,0.035)] ring-1 ring-gray-100">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <select
                className="rounded-2xl bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
                value={filters.visibility}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, visibility: e.target.value }))
                }
              >
                <option value="">All Visibility</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>

              <select
                className="rounded-2xl bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
                value={filters.type}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, type: e.target.value }))
                }
              >
                <option value="">All Types</option>
                <option value="general">General</option>
                <option value="influencer">Influencer</option>
                <option value="system">System</option>
                <option value="company">Company</option>
              </select>

              <select
                className="rounded-2xl bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
                value={filters.autoApply}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, autoApply: e.target.value }))
                }
              >
                <option value="">All Apply Modes</option>
                <option value="true">Auto Apply</option>
                <option value="false">Manual Apply</option>
              </select>

              <select
                className="rounded-2xl bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300"
                value={filters.ruleType}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, ruleType: e.target.value }))
                }
              >
                <option value="">All Rules</option>
                <option value="none">Basic</option>
                <option value="primary_secondary">Primary + Secondary</option>
                <option value="category_collection">Category / Collection</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                Showing{" "}
                <span className="font-semibold text-gray-900">
                  {filteredCoupons.length}
                </span>{" "}
                coupons
              </p>

              <button
                onClick={resetFilters}
                className="rounded-2xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Total" value={stats.total} icon={TrendingUp} />
          <StatCard label="Active" value={stats.active} icon={CheckCircle} />
          <StatCard label="Expired" value={stats.expired} icon={AlertTriangle} />
          <StatCard label="Auto Apply" value={stats.autoApply} icon={Sparkles} />
          <StatCard label="Category Rules" value={stats.categoryCollection} icon={FolderTree} />
          <StatCard label="Primary Rules" value={stats.primarySecondary} icon={Layers3} />
        </div>

        {/* QUICK ACTIONS */}
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <button
                key={card.id}
                onClick={() => router.push(card.route)}
                className="group rounded-3xl bg-white p-5 text-left shadow-[0_12px_35px_rgba(0,0,0,0.035)] ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(0,0,0,0.06)]"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-950 text-white transition group-hover:scale-105">
                  <Icon size={21} />
                </div>

                <h2 className="text-base font-semibold text-gray-950">{card.title}</h2>
                <p className="mt-1 text-sm leading-6 text-gray-500">{card.desc}</p>
              </button>
            );
          })}
        </div>

        {/* RECENT COUPONS */}
        <div className="mt-5 rounded-3xl bg-white p-4 shadow-[0_12px_35px_rgba(0,0,0,0.035)] ring-1 ring-gray-100 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-950">Recent Coupons</h2>
              <p className="text-sm text-gray-500">Latest coupon rules created in admin.</p>
            </div>

            <button
              onClick={() => router.push("/coupons/manage")}
              className="rounded-2xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
            >
              View All
            </button>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-gray-500">Loading coupons…</div>
          ) : recentCoupons.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">No coupons found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="px-3 py-3 font-medium">No.</th>
                    <th className="px-3 py-3 font-medium">Coupon</th>
                    <th className="px-3 py-3 font-medium">Rule</th>
                    <th className="px-3 py-3 font-medium">Badges</th>
                    <th className="px-3 py-3 font-medium">Discount</th>
                    <th className="px-3 py-3 font-medium">Usage</th>
                    <th className="px-3 py-3 font-medium">Expiry</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {recentCoupons.map((coupon) => {
                    const targeted = Boolean(coupon.targetEmail || coupon.targetPhone);
                    const expired = new Date(coupon.validTill) < now;
                    const hasCategory = Array.isArray(coupon.categories) && coupon.categories.length > 0;
                    const hasCollection =
                      Array.isArray(coupon.collections) && coupon.collections.length > 0;

                    return (
                      <tr key={coupon._id} className="transition hover:bg-gray-50/70">
                        <td className="px-3 py-4">
                          <span className="font-semibold text-gray-950">
                            #{coupon.couponNumber || "---"}
                          </span>
                        </td>

                        <td className="px-3 py-4">
                          <div className="font-semibold text-gray-950">{coupon.code}</div>
                          <div className="text-xs capitalize text-gray-400">{coupon.type}</div>
                        </td>

                        <td className="px-3 py-4 text-gray-700">{getRuleLabel(coupon)}</td>

                        <td className="px-3 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {coupon.visibility === "private" ? (
                              <Badge tone="dark">
                                <Lock size={12} className="mr-1" />
                                Private
                              </Badge>
                            ) : (
                              <Badge tone="blue">
                                <Globe2 size={12} className="mr-1" />
                                Public
                              </Badge>
                            )}

                            {coupon.autoApply && <Badge tone="purple">Auto</Badge>}
                            {targeted && <Badge tone="amber">Targeted</Badge>}
                            {hasCategory && <Badge tone="green">Category</Badge>}
                            {hasCollection && <Badge tone="green">Collection</Badge>}
                            {expired && <Badge tone="red">Expired</Badge>}
                          </div>
                        </td>

                        <td className="px-3 py-4 font-medium text-gray-800">
                          {formatDiscount(coupon)}
                        </td>

                        <td className="px-3 py-4 text-gray-600">
                          {coupon.usedCount || 0}
                          {coupon.usageLimit > 0 ? ` / ${coupon.usageLimit}` : " / ∞"}
                        </td>

                        <td className="px-3 py-4 text-gray-500">
                          {coupon.validTill
                            ? new Date(coupon.validTill).toLocaleDateString()
                            : "-"}
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