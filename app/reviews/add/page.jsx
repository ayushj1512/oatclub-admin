// app/reviews/add/page.jsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Star,
  Save,
  Loader2,
  User,
  BadgeCheck,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  Package,
} from "lucide-react";

import useLoginStore from "@/store/useLoginStore";
import {
  ROLE_DEFAULT_PERMS,
  DOMAIN_PERMISSIONS,
  hasPermission,
} from "@/config/loginConfig";

import { useAdminReviewStore } from "@/store/adminReviewStore";
import ProductPicker from "@/components/common/ProductPicker";
import MediaPickerModal from "@/components/media/MediaPickerModal";

/* ---------------- helpers ---------------- */
const safe = (v) => (v == null ? "" : String(v).trim());
const clamp = (n, a, b) => Math.min(Math.max(n, a), b);

const StarsPicker = ({ value = 5, onChange }) => {
  const v = clamp(Number(value) || 0, 1, 5);

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        const active = n <= v;

        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange?.(n)}
            className="rounded-xl p-2 transition hover:bg-gray-50 active:scale-95"
            title={`${n} star`}
          >
            <Star
              size={24}
              className={
                active
                  ? "fill-yellow-500 text-yellow-500"
                  : "text-gray-300"
              }
            />
          </button>
        );
      })}

      <span className="ml-2 text-sm font-semibold text-gray-800">
        {v}/5
      </span>
    </div>
  );
};

const pickUrl = (m) => safe(m?.url || m?.secure_url);
const pickPublicId = (m) => safe(m?.publicId || m?.public_id);

const uniqByPublicIdOrUrl = (arr = []) => {
  const map = new Map();

  for (const m of arr) {
    const key = pickPublicId(m) || pickUrl(m);
    if (!key) continue;
    map.set(key, m);
  }

  return Array.from(map.values());
};

export default function AddReviewPage() {
  const router = useRouter();

  const admin = useLoginStore((s) => s.admin);
  const role = admin?.role || "viewer";

  const permissions =
    (admin?.permissions?.length ? admin.permissions : ROLE_DEFAULT_PERMS[role]) ||
    [];

  const canAccess = hasPermission(permissions, DOMAIN_PERMISSIONS.reviews);

  const { createProductRating, isSaving } = useAdminReviewStore();

  const [productId, setProductId] = useState(null);
  const [customerId, setCustomerId] = useState("");

  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [verifiedPurchase, setVerifiedPurchase] = useState(true);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [orderNumber, setOrderNumber] = useState("");

  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaFolder, setMediaFolder] = useState("review");
  const [selectedMedia, setSelectedMedia] = useState([]);

  const images = useMemo(() => {
    return uniqByPublicIdOrUrl(selectedMedia)
      .map((m) => pickUrl(m))
      .filter(Boolean);
  }, [selectedMedia]);

  const canSubmit = useMemo(() => {
    return !!safe(productId) && !isSaving;
  }, [productId, isSaving]);

  const removeMediaAt = (idx) => {
    setSelectedMedia((prev) => prev.filter((_, i) => i !== idx));
  };

  const resetForm = () => {
    setProductId(null);
    setCustomerId("");
    setRating(5);
    setReviewText("");
    setVerifiedPurchase(true);
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setOrderNumber("");
    setSelectedMedia([]);
  };

  const onCreate = async () => {
    const product = safe(productId);
    const customer = safe(customerId);
    const r = clamp(Number(rating) || 0, 1, 5);

    if (!product) {
      toast.error("Product selection required");
      return;
    }

    const payload = {
      product,
      rating: r,
      reviewText: safe(reviewText),
      verifiedPurchase: !!verifiedPurchase,
      images,
      ...(customer ? { customer } : {}),
      ...(safe(customerName) ? { customerName: safe(customerName) } : {}),
      ...(safe(customerEmail) ? { customerEmail: safe(customerEmail) } : {}),
      ...(safe(customerPhone) ? { customerPhone: safe(customerPhone) } : {}),
      ...(safe(orderNumber) ? { orderNumber: safe(orderNumber).toUpperCase() } : {}),
    };

    const res = await createProductRating(payload);

    if (res) {
      toast.success("Review created");
      router.push("/reviews");
    }
  };

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="text-lg font-semibold text-gray-900">
            Access denied
          </div>

          <div className="mt-1 text-sm text-gray-600">
            You don&apos;t have permission to add Reviews.
          </div>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-6 sm:px-6 sm:py-10 md:px-8">
      {/* Header */}
      <div className="rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 px-4 py-5 shadow-sm sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-white shadow-sm">
              <Sparkles size={18} className="text-blue-700" />
            </span>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/reviews")}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm hover:bg-gray-50"
                  title="Back"
                >
                  <ArrowLeft size={16} />
                </button>

                <div className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
                  Add Review
                </div>

                <span className="rounded-full border border-blue-100 bg-white px-2 py-1 text-[11px] text-blue-700">
                  Product required • Customer optional
                </span>
              </div>

              <div className="mt-1 text-xs text-gray-600 sm:text-[13px]">
                Create manual reviews with rating, review text, optional customer
                snapshot and optional images.
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600">
              Images:{" "}
              <span className="font-semibold text-gray-900">
                {images.length}
              </span>
            </div>

            <button
              type="button"
              onClick={resetForm}
              disabled={isSaving}
              className="rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-sm hover:bg-gray-50 disabled:opacity-60"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={onCreate}
              disabled={!canSubmit}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {isSaving ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Save size={18} />
              )}
              Create Review
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[1.2fr_.8fr]">
        {/* Left */}
        <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-4 sm:p-6">
            <div className="text-sm font-semibold text-gray-900">
              Review Details
            </div>

            <div className="mt-1 text-xs text-gray-600">
              Select product, add rating and write optional review text.
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {/* Product */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
              <ProductPicker
                title="Pick a product for review"
                multiple={false}
                required
                value={productId}
                onChange={setProductId}
              />

              <div className="mt-2 text-[11px] text-gray-600">
                Selected Product ID:{" "}
                <span className="font-semibold text-gray-900">
                  {safe(productId) || "—"}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {/* Order Number */}
              <div className="lg:col-span-2">
                <div className="mb-1 flex items-center gap-1 text-[11px] font-medium text-gray-600">
                  <Package size={12} />
                  Order Number optional
                </div>

                <input
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="OATCLUB-000123"
                  className="w-full rounded-2xl border border-gray-200 px-3 py-3 outline-none focus:ring-2 focus:ring-blue-100"
                />

                <div className="mt-1 text-[11px] text-gray-500">
                  Use this only when manually linking review to an order.
                </div>
              </div>

              {/* Customer ID */}
              <div className="lg:col-span-2">
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[11px] font-medium text-gray-600">
                    <User size={12} />
                    Customer ID optional
                  </div>

                  <div className="text-[11px] text-gray-500">
                    Leave blank for admin/anonymous review
                  </div>
                </div>

                <input
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="Mongo ObjectId optional"
                  className="w-full rounded-2xl border border-gray-200 px-3 py-3 outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Customer Snapshot */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:p-4 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-gray-900">
                    Customer Snapshot optional
                  </div>

                  <div className="text-[11px] text-gray-600">
                    Useful when Customer ID is blank
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Name"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 outline-none focus:ring-2 focus:ring-blue-100"
                  />

                  <input
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 outline-none focus:ring-2 focus:ring-blue-100"
                  />

                  <input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Phone"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Rating */}
              <div className="lg:col-span-2">
                <div className="mb-2 text-[11px] font-medium text-gray-600">
                  Rating
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-3">
                  <StarsPicker value={rating} onChange={setRating} />
                </div>
              </div>

              {/* Review Text */}
              <div className="lg:col-span-2">
                <div className="mb-1 flex items-center justify-between">
                  <div className="text-[11px] font-medium text-gray-600">
                    Review Text
                  </div>

                  <div className="text-[11px] text-gray-500">
                    {safe(reviewText).length}/1000
                  </div>
                </div>

                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Write review..."
                  rows={7}
                  maxLength={1000}
                  className="w-full resize-y rounded-2xl border border-gray-200 px-3 py-3 outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Verified */}
              <div className="lg:col-span-2">
                <label className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <span className="inline-flex items-center gap-2 text-sm text-gray-800">
                    <input
                      type="checkbox"
                      checked={verifiedPurchase}
                      onChange={(e) => setVerifiedPurchase(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />

                    <BadgeCheck size={16} className="text-green-700" />
                    Verified Purchase
                  </span>

                  <span className="text-xs text-gray-600">Optional flag</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Media */}
        <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-end justify-between gap-3 border-b border-gray-100 p-4 sm:p-6">
            <div>
              <div className="text-sm font-semibold text-gray-900">
                Review Images
              </div>

              <div className="mt-1 text-xs text-gray-600">
                Optional. Review works without images too.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMediaOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-white shadow-sm hover:bg-blue-700"
            >
              <ImageIcon size={18} />
              Select Media
            </button>
          </div>

          <div className="p-4 sm:p-6">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
              <div className="mb-1 text-[11px] font-medium text-gray-600">
                Cloudinary folder
              </div>

              <input
                value={mediaFolder}
                onChange={(e) => setMediaFolder(e.target.value)}
                placeholder="review"
                className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 outline-none focus:ring-2 focus:ring-blue-100"
              />

              <div className="mt-1 text-[11px] text-gray-500">
                Backend upload folder for direct uploads is also{" "}
                <span className="font-semibold">review</span>.
              </div>
            </div>

            <div className="mt-4">
              {!selectedMedia.length ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700">
                  No media selected.
                  <div className="mt-1 text-xs text-gray-500">
                    Images are optional for review.
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[11px] font-medium text-gray-600">
                      Selected ({images.length})
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedMedia([])}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] hover:bg-gray-50"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(92px,1fr))]">
                    {uniqByPublicIdOrUrl(selectedMedia).map((m, idx) => {
                      const url = pickUrl(m);
                      const name = safe(m?.originalName || m?.filename) || "media";

                      return (
                        <motion.div
                          key={(pickPublicId(m) || url) + "-" + idx}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50"
                        >
                          <div className="aspect-square w-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={name}
                              className="h-full w-full object-cover"
                            />
                          </div>

                          <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2">
                            <span className="max-w-[78%] truncate rounded-full border border-gray-200 bg-white/90 px-2 py-1 text-[10px]">
                              {name}
                            </span>

                            <button
                              type="button"
                              onClick={() => removeMediaAt(idx)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-red-200 bg-white/90 text-red-700 opacity-0 transition-opacity hover:bg-red-50 group-hover:opacity-100"
                              title="Remove"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <MediaPickerModal
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        multiple
        folder={mediaFolder || "review"}
        onSelect={(mediaList) => {
          const list = Array.isArray(mediaList)
            ? mediaList
            : mediaList
            ? [mediaList]
            : [];

          const merged = uniqByPublicIdOrUrl([
            ...(selectedMedia || []),
            ...list,
          ]);

          setSelectedMedia(merged);
          setMediaOpen(false);
          toast.success("Media selected");
        }}
      />
    </div>
  );
}