"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
  ShoppingBag,
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
  quantityRule: {
  enabled: false,
  minItems: 0,
  countMode: "total_quantity",
},

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

const toId = (v) => String(v?._id || v || "");

const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

const normalizeRulesFromCoupon = (coupon) => {
  if (Array.isArray(coupon?.cartRules) && coupon.cartRules.length) {
    return coupon.cartRules.map((rule) => ({
      ruleType: rule.ruleType || "primary_required",
      categories: Array.isArray(rule.categories)
        ? rule.categories.map(toId).filter(Boolean)
        : [],
      collections: Array.isArray(rule.collections)
        ? rule.collections.map(toId).filter(Boolean)
        : [],
      matchMode: rule.matchMode || "any",
      isActive: rule.isActive !== false,
    }));
  }

  const oldRule = coupon?.cartRule;

  if (!oldRule?.enabled || oldRule.ruleType === "none") return [];

  if (oldRule.ruleType === "primary_secondary") {
    return [
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
    ];
  }

  if (oldRule.ruleType === "category_collection") {
    const rules = [];

    if (coupon?.categories?.length) {
      rules.push({
        ruleType: "category_required",
        categories: coupon.categories.map(toId).filter(Boolean),
        collections: [],
        matchMode: oldRule.matchMode || "any",
        isActive: true,
      });
    }

    if (coupon?.collections?.length) {
      rules.push({
        ruleType: "collection_required",
        categories: [],
        collections: coupon.collections.map(toId).filter(Boolean),
        matchMode: oldRule.matchMode || "any",
        isActive: true,
      });
    }

    return rules;
  }

  return [];
};

const hydrateCouponForm = (coupon) => ({
  ...initialForm,
  ...coupon,

  code: coupon?.code || "",
  type: coupon?.type || "general",
  visibility: coupon?.visibility || "public",
  description: coupon?.description || "",
  autoApply: Boolean(coupon?.autoApply),

  discountType: coupon?.discountType || "percentage",
  discountValue: coupon?.discountValue ?? "",
  minPurchase: coupon?.minPurchase ?? 0,
  maxDiscount: coupon?.maxDiscount ?? 0,
  quantityRule: {
  enabled: Boolean(coupon?.quantityRule?.enabled),
  minItems: Number(coupon?.quantityRule?.minItems || 0),
  countMode: coupon?.quantityRule?.countMode || "total_quantity",
},

  cartRules: normalizeRulesFromCoupon(coupon),
  discountTarget:
    coupon?.discountTarget || coupon?.cartRule?.discountTarget || "cart",
  applyToAllEligibleItems:
    coupon?.applyToAllEligibleItems ??
    coupon?.cartRule?.applyToAllEligibleItems ??
    true,

  categories: Array.isArray(coupon?.categories)
    ? coupon.categories.map(toId).filter(Boolean)
    : [],
  collections: Array.isArray(coupon?.collections)
    ? coupon.collections.map(toId).filter(Boolean)
    : [],

  targetEmail: coupon?.targetEmail || "",
  targetPhone: coupon?.targetPhone || "",

  validFrom: formatDate(coupon?.validFrom),
  validTill: formatDate(coupon?.validTill),

  usageLimit: coupon?.usageLimit ?? 0,
  usageLimitPerCustomer: coupon?.usageLimitPerCustomer ?? 1,
  isActive: coupon?.isActive !== false,
});

export default function EditCouponPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  const {
    fetchCoupons,
    fetchCouponByIdOrCode,
    updateCoupon,
    getCouponById,
    selectedCoupon,
    loading,
    error,
    success,
    clearMessages,
  } = useCouponStore();

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
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    fetchCollections();
    fetchCategories();
  }, [fetchCollections, fetchCategories]);

  useEffect(() => {
    if (!id) return;

    const hydrate = async () => {
      try {
        setHydrating(true);

        const couponFromStore = getCouponById(id);

        if (couponFromStore) {
          setForm(hydrateCouponForm(couponFromStore));
          return;
        }

        const single = await fetchCouponByIdOrCode(id).catch(() => null);

        if (single) {
          setForm(hydrateCouponForm(single));
          return;
        }

        await fetchCoupons();
        const afterFetch = getCouponById(id);

        if (afterFetch) {
          setForm(hydrateCouponForm(afterFetch));
        }
      } finally {
        setHydrating(false);
      }
    };

    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (selectedCoupon?._id === id) {
      setForm(hydrateCouponForm(selectedCoupon));
    }
  }, [selectedCoupon, id]);

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
  const updateQuantityRule = (key, value) => {
  setForm((prev) => ({
    ...prev,
    quantityRule: {
      ...prev.quantityRule,
      [key]: value,
    },
  }));

  clearStatus();
};

const applyAovPreset = (minItems = 2, discountValue = 200) => {
  setForm((prev) => ({
    ...prev,
    autoApply: true,
    discountType: "flat",
    discountValue,
    discountTarget: "cart",
    quantityRule: {
      enabled: true,
      minItems,
      countMode: "total_quantity",
    },
  }));

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

  const toggleRuleMultiSelect = (index, field, itemId) => {
    setForm((prev) => ({
      ...prev,
      cartRules: prev.cartRules.map((rule, i) => {
        if (i !== index) return rule;

        const current = Array.isArray(rule[field]) ? rule[field] : [];
        const exists = current.includes(itemId);

        return {
          ...rule,
          [field]: exists
            ? current.filter((id) => id !== itemId)
            : [...current, itemId],
        };
      }),
    }));

    clearStatus();
  };

  const toggleGlobalMultiSelect = (field, itemId) => {
    setForm((prev) => {
      const current = Array.isArray(prev[field]) ? prev[field] : [];
      const exists = current.includes(itemId);

      return {
        ...prev,
        [field]: exists
          ? current.filter((id) => id !== itemId)
          : [...current, itemId],
      };
    });

    clearStatus();
  };

  const applyBasicPreset = () => {
    setForm((prev) => ({
      ...prev,
      cartRules: [],
      discountTarget: "cart",
    }));
    clearStatus();
  };

  const applyPrimarySecondaryPreset = () => {
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
      applyToAllEligibleItems: true,
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
      code: form.code.trim().toUpperCase(),
      type: form.type,
      visibility: form.visibility,
      description: form.description?.trim() || "",

      autoApply: Boolean(form.autoApply),

      discountType: form.discountType,
      discountValue: Number(form.discountValue || 0),
      minPurchase: Number(form.minPurchase || 0),
      maxDiscount: Number(form.maxDiscount || 0),
      quantityRule: {
  enabled:
    Boolean(form.quantityRule?.enabled) &&
    Number(form.quantityRule?.minItems || 0) > 0,
  minItems: Number(form.quantityRule?.minItems || 0),
  countMode: form.quantityRule?.countMode || "total_quantity",
},

      usageLimit: Number(form.usageLimit || 0),
      usageLimitPerCustomer: Number(form.usageLimitPerCustomer || 0),

      targetEmail: form.targetEmail?.trim() || null,
      targetPhone: form.targetPhone?.trim() || null,

      validFrom: form.validFrom || undefined,
      validTill: form.validTill,
      isActive: Boolean(form.isActive),

      cartRules: activeRules,
      discountTarget: form.discountTarget || "cart",
      applyToAllEligibleItems: form.applyToAllEligibleItems !== false,

      categories: Array.from(new Set([...(form.categories || []), ...ruleCategories])),
      collections: Array.from(
        new Set([...(form.collections || []), ...ruleCollections])
      ),

      // old field disabled so old logic does not conflict
      cartRule: {
        enabled: false,
        ruleType: "none",
        requiresPrimaryProduct: false,
        requiresSecondaryProduct: false,
        discountTarget: "cart",
        matchMode: "any",
        applyToAllEligibleItems: true,
      },
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearMessages();

    try {
      const payload = buildPayload();
      await updateCoupon(id, payload);

      setTimeout(() => {
        router.push("/coupons/manage");
      }, 900);
    } catch (err) {
      console.log("Update coupon error:", err?.message);
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
    selected = [],
    onToggle,
    loadingText,
  }) => (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className={labelClass}>{title}</label>
        <span className="text-xs text-gray-400">{selected.length} selected</span>
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
              const checked = selected.includes(item._id);

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

  if (hydrating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
        <div className="flex items-center gap-2 rounded-3xl bg-white px-5 py-4 text-sm text-gray-600 shadow-sm ring-1 ring-gray-100">
          <Loader2 size={17} className="animate-spin" />
          Loading coupon...
        </div>
      </div>
    );
  }

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
              <div className="flex flex-wrap items-center gap-2">
                <TicketPercent size={22} className="text-gray-900" />
                <h1 className="text-2xl font-semibold tracking-tight text-gray-950">
                  Edit Coupon
                </h1>

                {form.couponNumber ? (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                    #{form.couponNumber}
                  </span>
                ) : null}
              </div>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                Update multi-rule coupon conditions, targets and validity.
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
                Coupon number is auto-generated and cannot be edited manually.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div>
                <label className={labelClass}>Coupon Code</label>
                <input
                  type="text"
                  name="code"
                  value={form.code || ""}
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
                  checked={Boolean(form.autoApply)}
                  onChange={handleChange}
                  className="h-5 w-5 accent-gray-950"
                />
              </div>

              <div className="lg:col-span-2">
                <label className={labelClass}>Description</label>
                <textarea
                  name="description"
                  value={form.description || ""}
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
                Update discount amount, purchase conditions and usage limits.
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
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.035)] ring-1 ring-gray-100 sm:p-6">
  <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <h2 className="text-lg font-semibold text-gray-950">
        AOV Quantity Rule
      </h2>
      <p className="text-sm text-gray-500">
        Use this for offers like Buy 2 get ₹200 off or Buy 3 get ₹300 off.
      </p>
    </div>

    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => applyAovPreset(2, 200)}
        className="rounded-2xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
      >
        Buy 2 ₹200 Off
      </button>

      <button
        type="button"
        onClick={() => applyAovPreset(3, 300)}
        className="rounded-2xl bg-gray-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black"
      >
        Buy 3 ₹300 Off
      </button>
    </div>
  </div>

  <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
    <label className="flex items-center gap-3 rounded-3xl bg-gray-50 p-4 ring-1 ring-gray-100">
      <input
        type="checkbox"
        checked={Boolean(form.quantityRule?.enabled)}
        onChange={(e) => updateQuantityRule("enabled", e.target.checked)}
        className="h-5 w-5 accent-gray-950"
      />
      <span>
        <span className="block text-sm font-semibold text-gray-900">
          Enable quantity rule
        </span>
        <span className="block text-xs text-gray-500">
          Coupon applies only after minimum items.
        </span>
      </span>
    </label>

    <div>
      <label className={labelClass}>Minimum Items</label>
      <input
        type="number"
        min="0"
        value={form.quantityRule?.minItems || 0}
        onChange={(e) => updateQuantityRule("minItems", e.target.value)}
        placeholder="2"
        className={inputClass}
      />
      <p className={helpClass}>Example: 2 for Buy 2 offer.</p>
    </div>

    <div>
      <label className={labelClass}>Count Mode</label>
      <select
        value={form.quantityRule?.countMode || "total_quantity"}
        onChange={(e) => updateQuantityRule("countMode", e.target.value)}
        className={inputClass}
      >
        <option value="total_quantity">Total Quantity</option>
        <option value="unique_items">Unique Items</option>
      </select>
      <p className={helpClass}>
        Total quantity counts same product qty also.
      </p>
    </div>
  </div>

  {form.quantityRule?.enabled &&
  Number(form.quantityRule?.minItems || 0) > 0 ? (
    <div className="mt-4 rounded-3xl bg-gray-50 p-4 ring-1 ring-gray-100">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gray-950 text-white">
          <ShoppingBag size={18} />
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-950">
            Buy {form.quantityRule.minItems}+ items and get{" "}
            {form.discountType === "percentage"
              ? `${form.discountValue || 0}% off`
              : `₹${form.discountValue || 0} off`}
          </p>
          <p className="mt-1 text-xs leading-5 text-gray-500">
            Keep discount type as Flat Amount for AOV offers like ₹200/₹300 off.
          </p>
        </div>
      </div>
    </div>
  ) : null}
</section>

          <section className="rounded-3xl bg-white p-5 shadow-[0_12px_35px_rgba(0,0,0,0.035)] ring-1 ring-gray-100 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-950">
                  Multi Cart Rules
                </h2>
                <p className="text-sm text-gray-500">
                  All active rules must pass for coupon to apply.
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
                onClick={applyBasicPreset}
              />

              <RuleCard
                title="Primary + Secondary"
                desc="Primary required, discount on secondary products."
                icon={Layers3}
                onClick={applyPrimarySecondaryPreset}
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
                    Recommended for category/collection offers.
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
                          onToggle={(itemId) =>
                            toggleRuleMultiSelect(index, "categories", itemId)
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
                          onToggle={(itemId) =>
                            toggleRuleMultiSelect(index, "collections", itemId)
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
                Useful for admin filtering and old coupon support.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <MultiSelectBox
                title="Categories"
                items={activeCategories}
                selected={form.categories}
                onToggle={(itemId) =>
                  toggleGlobalMultiSelect("categories", itemId)
                }
                loadingText={categoriesLoading ? "Loading categories..." : ""}
              />

              <MultiSelectBox
                title="Collections"
                items={activeCollections}
                selected={form.collections}
                onToggle={(itemId) =>
                  toggleGlobalMultiSelect("collections", itemId)
                }
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
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div>
                <label className={labelClass}>Target Email</label>
                <input
                  type="email"
                  name="targetEmail"
                  value={form.targetEmail || ""}
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
                  value={form.targetPhone || ""}
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
                  value={form.validFrom || ""}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Valid Till</label>
                <input
                  type="date"
                  name="validTill"
                  value={form.validTill || ""}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>

              <label className="flex items-center gap-3 rounded-3xl bg-gray-50 p-4 ring-1 ring-gray-100 lg:col-span-2">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={Boolean(form.isActive)}
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
                    Review details before updating the coupon.
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
                      Updating...
                    </>
                  ) : (
                    <>
                      <TicketPercent size={17} />
                      Update Coupon
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