"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  FolderTree,
  Layers3,
  Loader2,
  Plus,
  Sparkles,
  TicketPercent,
  Trash2,
} from "lucide-react";

import { useCouponStore } from "@/store/couponStore";
import { useAdminCollectionStore } from "@/store/adminCollectionStore";
import { useCategoryStore } from "@/store/categorystore";

const initialForm = {
  code: "",
  type: "general",
  visibility: "public",
  description: "",

  autoApply: false,

  discountType: "percentage",
  discountValue: "",
  minPurchase: 0,
  maxDiscount: 0,

  cartRules: [],
  discountTarget: "cart",
  applyToAllEligibleItems: true,

  categories: [],
  collections: [],

  targetEmail: "",
  targetPhone: "",

  validFrom: "",
  validTill: "",
  usageLimit: 0,
  usageLimitPerCustomer: 1,
  isActive: true,
};

const ruleOptions = [
  { value: "primary_required", label: "Primary product required" },
  { value: "secondary_required", label: "Secondary product required" },
  { value: "category_required", label: "Category required" },
  { value: "collection_required", label: "Collection required" },
];

const discountTargetOptions = [
  { value: "cart", label: "Whole Cart" },
  { value: "primary_products", label: "Primary Products" },
  { value: "secondary_products", label: "Secondary Products" },
  { value: "category_products", label: "Category Products" },
  { value: "collection_products", label: "Collection Products" },
  { value: "matched_products", label: "Matched Products" },
];

export default function CreateCouponPage() {
  const router = useRouter();

  const { createCoupon, loading, error, success, clearMessages } =
    useCouponStore();

  const {
    collections,
    loading: collectionsLoading,
    fetchCollections,
  } = useAdminCollectionStore();

  const {
    categories,
    loading: categoriesLoading,
    fetchCategories,
  } = useCategoryStore();

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    fetchCollections();
    fetchCategories();
  }, [fetchCollections, fetchCategories]);

  const isTargeted = Boolean(
    form.targetEmail?.trim() || form.targetPhone?.trim()
  );

  const activeCategories = useMemo(() => {
    return (categories || []).filter((cat) => cat?.isActive !== false);
  }, [categories]);

  const activeCollections = useMemo(() => {
    return (collections || []).filter((col) => col?.isActive !== false);
  }, [collections]);

  const inputClass =
    "w-full rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none ring-1 ring-gray-100 transition placeholder:text-gray-400 focus:bg-white focus:ring-gray-300";

  const labelClass = "mb-1.5 block text-sm font-medium text-gray-800";
  const helpClass = "mt-1.5 text-xs leading-5 text-gray-400";

  const clearStatus = () => {
    if (error || success) clearMessages();
  };

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    clearStatus();
  };

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;

    let nextValue = type === "checkbox" ? checked : value;

    if (name === "code") nextValue = String(nextValue).toUpperCase();
    if (name === "targetPhone") nextValue = String(nextValue).replace(/\D/g, "");

    updateField(name, nextValue);
  };

  const addRule = (ruleType = "primary_required") => {
    setForm((prev) => ({
      ...prev,
      cartRules: [
        ...prev.cartRules,
        {
          ruleType,
          categories: [],
          collections: [],
          matchMode: "any",
          isActive: true,
        },
      ],
    }));

    clearStatus();
  };

  const removeRule = (index) => {
    setForm((prev) => ({
      ...prev,
      cartRules: prev.cartRules.filter((_, i) => i !== index),
    }));

    clearStatus();
  };

  const updateRule = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      cartRules: prev.cartRules.map((rule, i) =>
        i === index ? { ...rule, [key]: value } : rule
      ),
    }));

    clearStatus();
  };

  const toggleRuleMultiSelect = (index, field, id) => {
    setForm((prev) => ({
      ...prev,
      cartRules: prev.cartRules.map((rule, i) => {
        if (i !== index) return rule;

        const current = Array.isArray(rule[field]) ? rule[field] : [];
        const exists = current.includes(id);

        return {
          ...rule,
          [field]: exists
            ? current.filter((item) => item !== id)
            : [...current, id],
        };
      }),
    }));

    clearStatus();
  };

  const applyBudgetBeesPreset = () => {
    setForm((prev) => ({
      ...prev,
      autoApply: true,
      discountType: "percentage",
      discountValue: prev.discountValue || 50,
      discountTarget: "collection_products",
      applyToAllEligibleItems: true,
      cartRules: [
        {
          ruleType: "primary_required",
          categories: [],
          collections: [],
          matchMode: "any",
          isActive: true,
        },
        {
          ruleType: "collection_required",
          categories: [],
          collections: prev.collections || [],
          matchMode: "any",
          isActive: true,
        },
      ],
    }));

    clearStatus();
  };

  const toggleGlobalMultiSelect = (field, id) => {
    setForm((prev) => {
      const current = Array.isArray(prev[field]) ? prev[field] : [];
      const exists = current.includes(id);

      return {
        ...prev,
        [field]: exists
          ? current.filter((item) => item !== id)
          : [...current, id],
      };
    });

    clearStatus();
  };

  const buildPayload = () => {
    const activeRules = (form.cartRules || [])
      .filter((rule) => rule?.ruleType)
      .map((rule) => ({
        ruleType: rule.ruleType,
        categories:
          rule.ruleType === "category_required" ? rule.categories || [] : [],
        collections:
          rule.ruleType === "collection_required"
            ? rule.collections || []
            : [],
        matchMode: rule.matchMode || "any",
        isActive: rule.isActive !== false,
      }));

    const ruleCategories = activeRules.flatMap((rule) => rule.categories || []);
    const ruleCollections = activeRules.flatMap(
      (rule) => rule.collections || []
    );

    return {
      ...form,

      code: form.code.trim().toUpperCase(),
      description: form.description?.trim() || "",

      discountValue: Number(form.discountValue || 0),
      minPurchase: Number(form.minPurchase || 0),
      maxDiscount: Number(form.maxDiscount || 0),

      usageLimit: Number(form.usageLimit || 0),
      usageLimitPerCustomer: Number(form.usageLimitPerCustomer || 0),

      targetEmail: form.targetEmail?.trim() || null,
      targetPhone: form.targetPhone?.trim() || null,

      validFrom: form.validFrom || undefined,

      cartRules: activeRules,
      discountTarget: form.discountTarget || "cart",
      applyToAllEligibleItems: form.applyToAllEligibleItems !== false,

      categories: Array.from(new Set([...(form.categories || []), ...ruleCategories])),
      collections: Array.from(
        new Set([...(form.collections || []), ...ruleCollections])
      ),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    try {
      const payload = buildPayload();
      await createCoupon(payload);

      setTimeout(() => {
        router.push("/coupons/manage");
      }, 900);
    } catch (err) {
      console.log("Create coupon error:", err?.message);
    }
  };

  const RuleCard = ({ title, desc, icon: Icon, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className="rounded-3xl bg-white p-4 text-left text-gray-800 ring-1 ring-gray-100 transition hover:bg-gray-50"
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-50 text-gray-900">
        <Icon size={20} />
      </div>

      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-gray-500">{desc}</p>
    </button>
  );

  const MultiSelectBox = ({
    title,
    items,
    selected,
    onToggle,
    loadingText,
  }) => (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className={labelClass}>{title}</label>
        <span className="text-xs text-gray-400">
          {(selected || []).length} selected
        </span>
      </div>

      <div className="max-h-64 overflow-y-auto rounded-3xl bg-gray-50 p-2 ring-1 ring-gray-100">
        {loadingText ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
            <Loader2 size={16} className="animate-spin" />
            {loadingText}
          </div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            No records found.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {items.map((item) => {
              const checked = (selected || []).includes(item._id);

              return (
                <button
                  type="button"
                  key={item._id}
                  onClick={() => onToggle(item._id)}
                  className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition ${
                    checked
                      ? "bg-white text-gray-950 shadow-sm ring-1 ring-gray-200"
                      : "text-gray-600 hover:bg-white"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {item.name}
                    </span>
                    {item.slug ? (
                      <span className="block truncate text-xs text-gray-400">
                        {item.slug}
                      </span>
                    ) : null}
                  </span>

                  <span
                    className={`h-4 w-4 shrink-0 rounded-full ring-1 ${
                      checked
                        ? "bg-gray-950 ring-gray-950"
                        : "bg-white ring-gray-300"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.04)] ring-1 ring-gray-100 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gray-50 text-gray-700 ring-1 ring-gray-100 transition hover:bg-gray-100"
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <TicketPercent size={22} className="text-gray-900" />
                <h1 className="text-2xl font-semibold tracking-tight text-gray-950">
                  Create Coupon
                </h1>
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                Create manual, targeted, auto-apply and multi cart rule coupons.
              </p>
            </div>
          </div>

          {isTargeted ? (
            <span className="w-fit rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
              Targeted coupon
            </span>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="rounded-3xl bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.035)] ring-1 ring-gray-100 sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-950">
                Basic Details
              </h2>
              <p className="text-sm text-gray-500">
                Coupon number will be generated automatically from backend.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div>
                <label className={labelClass}>Coupon Code</label>
                <input
                  type="text"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="MIRAY50"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Coupon Type</label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="general">General</option>
                  <option value="influencer">Influencer</option>
                  <option value="system">System</option>
                  <option value="company">Company</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Visibility</label>
                <select
                  name="visibility"
                  value={form.visibility}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div className="flex items-center justify-between rounded-3xl bg-gray-50 p-4 ring-1 ring-gray-100">
                <div>
                  <label className="text-sm font-semibold text-gray-900">
                    Auto Apply
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    Best eligible coupon can apply automatically.
                  </p>
                </div>

                <input
                  type="checkbox"
                  name="autoApply"
                  checked={form.autoApply}
                  onChange={handleChange}
                  className="h-5 w-5 accent-gray-950"
                />
              </div>

              <div className="lg:col-span-2">
                <label className={labelClass}>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Short internal/admin description..."
                  rows={3}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.035)] ring-1 ring-gray-100 sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-950">
                Discount & Limits
              </h2>
              <p className="text-sm text-gray-500">
                Set discount amount, purchase conditions and usage limits.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div>
                <label className={labelClass}>Discount Type</label>
                <select
                  name="discountType"
                  value={form.discountType}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat Amount (₹)</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Discount Value</label>
                <input
                  type="number"
                  name="discountValue"
                  value={form.discountValue}
                  onChange={handleChange}
                  placeholder="50"
                  min="0"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Minimum Purchase</label>
                <input
                  type="number"
                  name="minPurchase"
                  value={form.minPurchase}
                  onChange={handleChange}
                  min="0"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Max Discount</label>
                <input
                  type="number"
                  name="maxDiscount"
                  value={form.maxDiscount}
                  onChange={handleChange}
                  min="0"
                  className={inputClass}
                />
                <p className={helpClass}>Use 0 for no maximum cap.</p>
              </div>

              <div>
                <label className={labelClass}>Total Usage Limit</label>
                <input
                  type="number"
                  name="usageLimit"
                  value={form.usageLimit}
                  onChange={handleChange}
                  min="0"
                  className={inputClass}
                />
                <p className={helpClass}>Use 0 for unlimited usage.</p>
              </div>

              <div>
                <label className={labelClass}>Usage Per Customer</label>
                <input
                  type="number"
                  name="usageLimitPerCustomer"
                  value={form.usageLimitPerCustomer}
                  onChange={handleChange}
                  min="0"
                  className={inputClass}
                />
                <p className={helpClass}>Use 0 for unlimited per customer.</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.035)] ring-1 ring-gray-100 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-950">
                  Multi Cart Rules
                </h2>
                <p className="text-sm text-gray-500">
                  Add multiple rules. All active rules must pass for coupon to
                  apply.
                </p>
              </div>

              <button
                type="button"
                onClick={() => addRule()}
                className="inline-flex w-fit items-center gap-2 rounded-2xl bg-gray-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black"
              >
                <Plus size={16} />
                Add Rule
              </button>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
              <RuleCard
                title="Basic Coupon"
                desc="No cart rule. Applies on complete cart total."
                icon={TicketPercent}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    cartRules: [],
                    discountTarget: "cart",
                  }))
                }
              />

              <RuleCard
                title="Primary + Secondary"
                desc="Primary required, discount on secondary products."
                icon={Layers3}
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    cartRules: [
                      {
                        ruleType: "primary_required",
                        categories: [],
                        collections: [],
                        matchMode: "any",
                        isActive: true,
                      },
                      {
                        ruleType: "secondary_required",
                        categories: [],
                        collections: [],
                        matchMode: "any",
                        isActive: true,
                      },
                    ],
                    discountTarget: "secondary_products",
                  }))
                }
              />

              <RuleCard
                title="Budget Bees Preset"
                desc="Primary required + selected collection gets discount."
                icon={Sparkles}
                onClick={applyBudgetBeesPreset}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div>
                <label className={labelClass}>Discount Target</label>
                <select
                  name="discountTarget"
                  value={form.discountTarget}
                  onChange={handleChange}
                  className={inputClass}
                >
                  {discountTargetOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <p className={helpClass}>
                  For Budget Bees use Collection Products.
                </p>
              </div>

              <label className="flex items-center gap-3 rounded-3xl bg-gray-50 p-4 ring-1 ring-gray-100">
                <input
                  type="checkbox"
                  name="applyToAllEligibleItems"
                  checked={form.applyToAllEligibleItems}
                  onChange={handleChange}
                  className="h-5 w-5 accent-gray-950"
                />
                <span>
                  <span className="block text-sm font-semibold text-gray-900">
                    Apply to all eligible items
                  </span>
                  <span className="block text-xs text-gray-500">
                    Recommended for collection/category offers.
                  </span>
                </span>
              </label>
            </div>

            <div className="mt-5 space-y-4">
              {form.cartRules.length === 0 ? (
                <div className="rounded-3xl bg-gray-50 p-5 text-sm text-gray-500 ring-1 ring-gray-100">
                  No cart rules added. Coupon will apply as a basic coupon.
                </div>
              ) : (
                form.cartRules.map((rule, index) => (
                  <div
                    key={index}
                    className="rounded-3xl bg-gray-50 p-4 ring-1 ring-gray-100"
                  >
                    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-950">
                          Rule #{index + 1}
                        </h3>
                        <p className="text-xs text-gray-500">
                          Configure condition required in cart.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeRule(index)}
                        className="inline-flex w-fit items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-medium text-red-600 ring-1 ring-red-100 transition hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div>
                        <label className={labelClass}>Rule Type</label>
                        <select
                          value={rule.ruleType}
                          onChange={(e) =>
                            updateRule(index, "ruleType", e.target.value)
                          }
                          className={inputClass}
                        >
                          {ruleOptions.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>Match Mode</label>
                        <select
                          value={rule.matchMode || "any"}
                          onChange={(e) =>
                            updateRule(index, "matchMode", e.target.value)
                          }
                          className={inputClass}
                          disabled={
                            !["category_required", "collection_required"].includes(
                              rule.ruleType
                            )
                          }
                        >
                          <option value="any">Any</option>
                          <option value="all">All</option>
                        </select>
                      </div>

                      <label className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-gray-100 lg:col-span-2">
                        <input
                          type="checkbox"
                          checked={rule.isActive !== false}
                          onChange={(e) =>
                            updateRule(index, "isActive", e.target.checked)
                          }
                          className="h-5 w-5 accent-gray-950"
                        />
                        <span className="text-sm font-medium text-gray-900">
                          Rule active
                        </span>
                      </label>
                    </div>

                    {rule.ruleType === "category_required" && (
                      <div className="mt-4">
                        <MultiSelectBox
                          title="Required Categories"
                          items={activeCategories}
                          selected={rule.categories || []}
                          onToggle={(id) =>
                            toggleRuleMultiSelect(index, "categories", id)
                          }
                          loadingText={
                            categoriesLoading ? "Loading categories..." : ""
                          }
                        />
                      </div>
                    )}

                    {rule.ruleType === "collection_required" && (
                      <div className="mt-4">
                        <MultiSelectBox
                          title="Required Collections"
                          items={activeCollections}
                          selected={rule.collections || []}
                          onToggle={(id) =>
                            toggleRuleMultiSelect(index, "collections", id)
                          }
                          loadingText={
                            collectionsLoading ? "Loading collections..." : ""
                          }
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.035)] ring-1 ring-gray-100 sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-950">
                Optional Global Filters
              </h2>
              <p className="text-sm text-gray-500">
                Optional. Useful for admin filtering and old coupon support.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <MultiSelectBox
                title="Categories"
                items={activeCategories}
                selected={form.categories}
                onToggle={(id) => toggleGlobalMultiSelect("categories", id)}
                loadingText={categoriesLoading ? "Loading categories..." : ""}
              />

              <MultiSelectBox
                title="Collections"
                items={activeCollections}
                selected={form.collections}
                onToggle={(id) => toggleGlobalMultiSelect("collections", id)}
                loadingText={
                  collectionsLoading ? "Loading collections..." : ""
                }
              />
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.035)] ring-1 ring-gray-100 sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-950">
                Targeting & Validity
              </h2>
              <p className="text-sm text-gray-500">
                Optional email/phone targeting and coupon validity period.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div>
                <label className={labelClass}>Target Email</label>
                <input
                  type="email"
                  name="targetEmail"
                  value={form.targetEmail}
                  onChange={handleChange}
                  placeholder="customer@gmail.com"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Target Phone</label>
                <input
                  type="text"
                  name="targetPhone"
                  value={form.targetPhone}
                  onChange={handleChange}
                  placeholder="919876543210"
                  inputMode="numeric"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Valid From</label>
                <input
                  type="date"
                  name="validFrom"
                  value={form.validFrom}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Valid Till</label>
                <input
                  type="date"
                  name="validTill"
                  value={form.validTill}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>

              <label className="flex items-center gap-3 rounded-3xl bg-gray-50 p-4 ring-1 ring-gray-100 lg:col-span-2">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleChange}
                  className="h-5 w-5 accent-gray-950"
                />
                <span>
                  <span className="block text-sm font-semibold text-gray-900">
                    Coupon Active
                  </span>
                  <span className="block text-xs text-gray-500">
                    Backend will also sync active status with expiry date.
                  </span>
                </span>
              </label>
            </div>
          </section>

          <section className="sticky bottom-4 z-10 rounded-3xl bg-white/90 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.08)] ring-1 ring-gray-100 backdrop-blur">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                {(success || error) && (
                  <div
                    className={`flex items-center gap-2 text-sm font-medium ${
                      error ? "text-red-600" : "text-green-700"
                    }`}
                  >
                    <CheckCircle size={17} />
                    {error || success}
                  </div>
                )}

                {!success && !error && (
                  <p className="text-sm text-gray-500">
                    Review details before creating the coupon.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => router.push("/coupons/manage")}
                  className="rounded-2xl bg-gray-100 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <TicketPercent size={17} />
                      Create Coupon
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}