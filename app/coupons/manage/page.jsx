"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle,
  FolderTree,
  Globe2,
  Layers3,
  Lock,
  Pencil,
  PlusCircle,
  RefreshCcw,
  Search,
  ShoppingBag,
  Sparkles,
  Target,
  TicketPercent,
  Trash2,
  XCircle,
} from "lucide-react";

import { useCouponStore } from "@/store/couponStore";

const ruleLabels = {
  primary_required: "Primary",
  secondary_required: "Secondary",
  category_required: "Category",
  collection_required: "Collection",
  none: "Basic",
  primary_secondary: "Primary + Secondary",
  category_collection: "Category / Collection",
};

const targetLabels = {
  cart: "Cart",
  primary_products: "Primary Products",
  secondary_products: "Secondary Products",
  category_products: "Category Products",
  collection_products: "Collection Products",
  matched_products: "Matched Products",
};

export default function ManageCouponsPage() {
  const router = useRouter();
  const { coupons, loading, fetchCoupons, deleteCoupon } = useCouponStore();

  const [deletingId, setDeletingId] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    visibility: "",
    type: "",
    isActive: "",
    autoApply: "",
    quantityRule: "",
    ruleType: "",
    discountTarget: "",
  });

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const now = useMemo(() => new Date(), []);

  const hasQuantityRule = (coupon) =>
    Boolean(
      coupon?.quantityRule?.enabled && Number(coupon?.quantityRule?.minItems) > 0
    );

  const getQuantityLabel = (coupon) => {
    if (!hasQuantityRule(coupon)) return null;

    const rule = coupon.quantityRule;
    return `${rule.minItems}+ ${
      rule.countMode === "unique_items" ? "unique items" : "qty"
    }`;
  };

  const getRules = (coupon) => {
    if (Array.isArray(coupon?.cartRules) && coupon.cartRules.length) {
      return coupon.cartRules.filter((rule) => rule?.isActive !== false);
    }

    const oldRule = coupon?.cartRule;
    if (!oldRule?.enabled || oldRule?.ruleType === "none") return [];

    return [{ ruleType: oldRule.ruleType, isActive: true }];
  };

  const getRuleLabel = (coupon) => {
    if (hasQuantityRule(coupon)) {
      return `Buy ${coupon.quantityRule.minItems}+ Items`;
    }

    const rules = getRules(coupon);
    if (!rules.length) return "Basic";

    return rules
      .map((rule) => ruleLabels[rule.ruleType] || "Rule")
      .filter(Boolean)
      .join(" + ");
  };

  const getRuleIcon = (coupon) => {
    if (hasQuantityRule(coupon)) return ShoppingBag;

    const rules = getRules(coupon);
    const types = rules.map((rule) => rule.ruleType);

    if (!rules.length) return TicketPercent;
    if (types.includes("category_required") || types.includes("collection_required")) {
      return FolderTree;
    }
    if (types.includes("primary_required") || types.includes("secondary_required")) {
      return Layers3;
    }

    return Target;
  };

  const getDiscountTarget = (coupon) =>
    coupon.discountTarget || coupon?.cartRule?.discountTarget || "cart";

  const filteredCoupons = useMemo(() => {
    const q = filters.search.trim().toLowerCase();

    return coupons.filter((coupon) => {
      const rules = getRules(coupon);
      const ruleTypes = rules.map((rule) => rule.ruleType);
      const discountTarget = getDiscountTarget(coupon);
      const quantityEnabled = hasQuantityRule(coupon);

      if (q) {
        const haystack = [
          coupon.code,
          coupon.couponNumber,
          coupon.description,
          coupon.type,
          coupon.visibility,
          discountTarget,
          getQuantityLabel(coupon),
          quantityEnabled ? "aov quantity buy items" : "",
          ...ruleTypes,
          getRuleLabel(coupon),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(q)) return false;
      }

      if (filters.visibility && coupon.visibility !== filters.visibility) return false;
      if (filters.type && coupon.type !== filters.type) return false;

      if (filters.isActive !== "") {
        if (Boolean(coupon.isActive) !== (filters.isActive === "true")) return false;
      }

      if (filters.autoApply !== "") {
        if (Boolean(coupon.autoApply) !== (filters.autoApply === "true")) return false;
      }

      if (filters.quantityRule !== "") {
        if (quantityEnabled !== (filters.quantityRule === "true")) return false;
      }

      if (filters.ruleType) {
        if (filters.ruleType === "basic" && (rules.length || quantityEnabled)) return false;

        if (
          filters.ruleType !== "basic" &&
          filters.ruleType !== "quantity" &&
          !ruleTypes.includes(filters.ruleType)
        ) {
          return false;
        }

        if (filters.ruleType === "quantity" && !quantityEnabled) return false;
      }

      if (filters.discountTarget && discountTarget !== filters.discountTarget) {
        return false;
      }

      return true;
    });
  }, [coupons, filters]);

  const resetFilters = () => {
    setFilters({
      search: "",
      visibility: "",
      type: "",
      isActive: "",
      autoApply: "",
      quantityRule: "",
      ruleType: "",
      discountTarget: "",
    });
  };

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const formatDiscount = (coupon) => {
    if (coupon.discountType === "percentage") return `${coupon.discountValue}%`;
    return `₹${coupon.discountValue}`;
  };

  const getStatus = (coupon) => {
    const expiry = new Date(coupon.validTill);

    if (!coupon.isActive) return { label: "Inactive", tone: "red", icon: XCircle };
    if (expiry < now) return { label: "Expired", tone: "amber", icon: AlertTriangle };

    return { label: "Active", tone: "green", icon: CheckCircle };
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;

    try {
      setDeletingId(id);
      await deleteCoupon(id);
    } catch (err) {
      alert(err?.message || "Error deleting coupon.");
    } finally {
      setDeletingId(null);
    }
  };

  const Badge = ({ children, tone = "gray" }) => {
    const tones = {
      gray: "bg-gray-100 text-gray-700",
      dark: "bg-gray-950 text-white",
      blue: "bg-blue-50 text-blue-700",
      green: "bg-green-50 text-green-700",
      amber: "bg-amber-50 text-amber-700",
      purple: "bg-purple-50 text-purple-700",
      red: "bg-red-50 text-red-700",
      slate: "bg-slate-100 text-slate-700",
      black: "bg-gray-950 text-white",
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

  const selectClass =
    "rounded-2xl bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none ring-1 ring-gray-100 transition focus:bg-white focus:ring-gray-300";

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.04)] ring-1 ring-gray-100 sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-950 text-white">
                <TicketPercent size={25} />
              </div>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
                  Manage Coupons
                </h1>
                <p className="mt-1 text-sm leading-6 text-gray-500">
                  View, filter, edit and delete all coupon rules including AOV offers.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => fetchCoupons()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
              >
                <RefreshCcw size={16} />
                Refresh
              </button>

              <button
                onClick={() => router.push("/coupons/create")}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-black"
              >
                <PlusCircle size={16} />
                Create Coupon
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-3xl bg-white p-4 shadow-[0_12px_35px_rgba(0,0,0,0.035)] ring-1 ring-gray-100">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.4fr_repeat(7,1fr)_auto]">
            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                placeholder="Search code, rule, AOV..."
                className="w-full rounded-2xl bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-gray-700 outline-none ring-1 ring-gray-100 transition placeholder:text-gray-400 focus:bg-white focus:ring-gray-300"
              />
            </div>

            <select className={selectClass} value={filters.visibility} onChange={(e) => updateFilter("visibility", e.target.value)}>
              <option value="">All Visibility</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>

            <select className={selectClass} value={filters.type} onChange={(e) => updateFilter("type", e.target.value)}>
              <option value="">All Types</option>
              <option value="general">General</option>
              <option value="influencer">Influencer</option>
              <option value="system">System</option>
              <option value="company">Company</option>
            </select>

            <select className={selectClass} value={filters.isActive} onChange={(e) => updateFilter("isActive", e.target.value)}>
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>

            <select className={selectClass} value={filters.autoApply} onChange={(e) => updateFilter("autoApply", e.target.value)}>
              <option value="">All Apply</option>
              <option value="true">Auto</option>
              <option value="false">Manual</option>
            </select>

            <select className={selectClass} value={filters.quantityRule} onChange={(e) => updateFilter("quantityRule", e.target.value)}>
              <option value="">All AOV</option>
              <option value="true">AOV Rule</option>
              <option value="false">Non AOV</option>
            </select>

            <select className={selectClass} value={filters.ruleType} onChange={(e) => updateFilter("ruleType", e.target.value)}>
              <option value="">All Rules</option>
              <option value="basic">Basic</option>
              <option value="quantity">AOV Quantity</option>
              <option value="primary_required">Primary Required</option>
              <option value="secondary_required">Secondary Required</option>
              <option value="category_required">Category Required</option>
              <option value="collection_required">Collection Required</option>
            </select>

            <select className={selectClass} value={filters.discountTarget} onChange={(e) => updateFilter("discountTarget", e.target.value)}>
              <option value="">All Targets</option>
              <option value="cart">Cart</option>
              <option value="primary_products">Primary Products</option>
              <option value="secondary_products">Secondary Products</option>
              <option value="category_products">Category Products</option>
              <option value="collection_products">Collection Products</option>
              <option value="matched_products">Matched Products</option>
            </select>

            <button
              onClick={resetFilters}
              className="rounded-2xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
            >
              Clear
            </button>
          </div>

          <p className="mt-3 text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-950">{filteredCoupons.length}</span> of{" "}
            <span className="font-semibold text-gray-950">{coupons.length}</span> coupons
          </p>
        </div>

        <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-[0_12px_35px_rgba(0,0,0,0.035)] ring-1 ring-gray-100">
          {loading ? (
            <div className="py-14 text-center text-sm text-gray-500">
              Loading coupons...
            </div>
          ) : filteredCoupons.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-sm text-gray-500">
              <AlertTriangle size={34} className="text-gray-300" />
              No coupons found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1360px] text-sm">
                <thead>
                  <tr className="bg-gray-50/70 text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="px-4 py-4 font-medium">No.</th>
                    <th className="px-4 py-4 font-medium">Coupon</th>
                    <th className="px-4 py-4 font-medium">Rules</th>
                    <th className="px-4 py-4 font-medium">Target</th>
                    <th className="px-4 py-4 font-medium">Badges</th>
                    <th className="px-4 py-4 font-medium">Discount</th>
                    <th className="px-4 py-4 font-medium">Min / Max</th>
                    <th className="px-4 py-4 font-medium">Usage</th>
                    <th className="px-4 py-4 font-medium">Valid Till</th>
                    <th className="px-4 py-4 font-medium">Status</th>
                    <th className="px-4 py-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredCoupons.map((coupon) => {
                    const status = getStatus(coupon);
                    const StatusIcon = status.icon;
                    const RuleIcon = getRuleIcon(coupon);
                    const rules = getRules(coupon);
                    const discountTarget = getDiscountTarget(coupon);
                    const quantityEnabled = hasQuantityRule(coupon);

                    const targeted = Boolean(coupon.targetEmail || coupon.targetPhone);
                    const hasCategory = Array.isArray(coupon.categories) && coupon.categories.length > 0;
                    const hasCollection = Array.isArray(coupon.collections) && coupon.collections.length > 0;

                    return (
                      <tr key={coupon._id} className="transition hover:bg-gray-50/70">
                        <td className="px-4 py-4">
                          <span className="font-semibold text-gray-950">
                            #{coupon.couponNumber || "---"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="font-semibold text-gray-950">{coupon.code}</div>
                          <div className="mt-0.5 max-w-[220px] truncate text-xs text-gray-400">
                            {coupon.description || "No description"}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-gray-700">
                            <RuleIcon size={15} className="text-gray-400" />
                            <span className="max-w-[220px] truncate">
                              {getRuleLabel(coupon)}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-gray-400">
                            {quantityEnabled
                              ? getQuantityLabel(coupon)
                              : rules.length
                                ? `${rules.length} rule(s)`
                                : "No rule"}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <Badge tone="slate">
                            {targetLabels[discountTarget] || discountTarget}
                          </Badge>
                        </td>

                        <td className="px-4 py-4">
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

                            {coupon.autoApply && (
                              <Badge tone="purple">
                                <Sparkles size={12} className="mr-1" />
                                Auto
                              </Badge>
                            )}

                            {quantityEnabled && (
                              <Badge tone="black">
                                <ShoppingBag size={12} className="mr-1" />
                                AOV
                              </Badge>
                            )}

                            {targeted && <Badge tone="amber">Targeted</Badge>}
                            {hasCategory && <Badge tone="green">Category</Badge>}
                            {hasCollection && <Badge tone="green">Collection</Badge>}
                          </div>
                        </td>

                        <td className="px-4 py-4 font-medium text-gray-800">
                          {formatDiscount(coupon)}
                        </td>

                        <td className="px-4 py-4 text-gray-600">
                          <div>Min ₹{coupon.minPurchase || 0}</div>
                          <div className="text-xs text-gray-400">
                            Max{" "}
                            {coupon.maxDiscount > 0
                              ? `₹${coupon.maxDiscount}`
                              : "No cap"}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-gray-700">
                          {coupon.usedCount || 0}
                          {coupon.usageLimit > 0 ? ` / ${coupon.usageLimit}` : " / ∞"}
                        </td>

                        <td className="px-4 py-4 text-gray-500">
                          {coupon.validTill
                            ? new Date(coupon.validTill).toLocaleDateString()
                            : "-"}
                        </td>

                        <td className="px-4 py-4">
                          <Badge tone={status.tone}>
                            <StatusIcon size={12} className="mr-1" />
                            {status.label}
                          </Badge>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => router.push(`/coupons/edit/${coupon._id}`)}
                              className="rounded-2xl bg-gray-100 p-2.5 text-gray-700 transition hover:bg-gray-200"
                              title="Edit coupon"
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              onClick={() => handleDelete(coupon._id)}
                              disabled={deletingId === coupon._id}
                              className="rounded-2xl bg-red-50 p-2.5 text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                              title="Delete coupon"
                            >
                              {deletingId === coupon._id ? (
                                <RefreshCcw size={16} className="animate-spin" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
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