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
} from "lucide-react";

import useLoginStore from "@/store/useLoginStore";
import { ROLE_DEFAULT_PERMS, DOMAIN_PERMISSIONS, hasPermission } from "@/config/loginConfig";

import ProductPicker from "@/components/common/ProductPicker";
import MediaPickerModal from "@/components/media/MediaPickerModal";

/* ---------------- helpers ---------------- */
const API = (process.env.NEXT_PUBLIC_API_URL || "").trim();
const safe = (v) => (v == null ? "" : String(v).trim());
const clamp = (n, a, b) => Math.min(Math.max(n, a), b);

async function requestJSON(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}

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
            className="p-2 rounded-xl hover:bg-gray-50 active:scale-95 transition"
            title={`${n} star`}
          >
            <Star
              size={22}
              className={active ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}
            />
          </button>
        );
      })}
      <span className="ml-2 text-sm text-gray-800 font-semibold">{v}/5</span>
    </div>
  );
};

const pickUrl = (m) => safe(m?.url);
const pickPublicId = (m) => safe(m?.publicId);

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

  // permission gate
  const admin = useLoginStore((s) => s.admin);
  const role = admin?.role || "viewer";
  const permissions =
    (admin?.permissions?.length ? admin.permissions : ROLE_DEFAULT_PERMS[role]) || [];
  const canAccess = hasPermission(permissions, DOMAIN_PERMISSIONS.reviews);

  // state
  const [saving, setSaving] = useState(false);

  // ✅ ProductPicker (single select)
  const [productId, setProductId] = useState(null);

  // review fields
  const [customerId, setCustomerId] = useState(""); // ✅ optional now
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [verifiedPurchase, setVerifiedPurchase] = useState(true);

  // optional customer snapshot fields (useful when customerId not present)
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // ✅ Media system
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaFolder, setMediaFolder] = useState("miray/reviews");
  const [selectedMedia, setSelectedMedia] = useState([]);

  const images = useMemo(() => {
    return uniqByPublicIdOrUrl(selectedMedia)
      .map((m) => pickUrl(m))
      .filter(Boolean);
  }, [selectedMedia]);

  const removeMediaAt = (idx) => setSelectedMedia((prev) => prev.filter((_, i) => i !== idx));

  // ✅ only product is required now (rating always has default)
  const canSubmit = useMemo(() => {
    return !!safe(productId) && !saving;
  }, [productId, saving]);

  const onCreate = async () => {
    const product = safe(productId);
    const customer = safe(customerId); // may be ""
    const r = clamp(Number(rating) || 0, 1, 5);

    if (!product) return toast.error("Product selection required");

    // if customerId not given, at least one snapshot field should exist (nice UX)
    const hasSnapshot =
      !!safe(customerName) || !!safe(customerEmail) || !!safe(customerPhone);

    if (!customer && !hasSnapshot) {
      // allow still, but warn (admin might want anonymous)
      toast("Customer is optional. Add name/email/phone if you want.", { icon: "ℹ️" });
    }

    setSaving(true);
    try {
      const payload = {
        product,
        rating: r,
        title: safe(title),
        reviewText: safe(reviewText),
        verifiedPurchase: !!verifiedPurchase,
        images,
        // ✅ send customer only if present (backend won’t try to find customer then)
        ...(customer ? { customer } : {}),
        // ✅ send snapshots (backend schema supports these)
        ...(safe(customerName) ? { customerName: safe(customerName) } : {}),
        ...(safe(customerEmail) ? { customerEmail: safe(customerEmail) } : {}),
        ...(safe(customerPhone) ? { customerPhone: safe(customerPhone) } : {}),
      };

      await requestJSON(`${API}/api/reviews`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success("Review created");
      router.push("/reviews");
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Failed to create review");
    } finally {
      setSaving(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="text-lg font-semibold text-gray-900">Access denied</div>
          <div className="text-sm text-gray-600 mt-1">
            You don&apos;t have permission to add Reviews.
          </div>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-3 sm:px-6 md:px-8 py-6 sm:py-10">
      <div>
        {/* Top Bar */}
        <div className="rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 px-4 sm:px-6 py-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-white border border-blue-100 shrink-0 shadow-sm">
                <Sparkles size={18} className="text-blue-700" />
              </span>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => router.push("/reviews")}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 shadow-sm"
                    title="Back"
                  >
                    <ArrowLeft size={16} />
                  </button>

                  <div className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">
                    Add Review
                  </div>

                  <span className="text-[11px] px-2 py-1 rounded-full bg-white border border-blue-100 text-blue-700">
                    Product required • Customer optional
                  </span>
                </div>

                <div className="mt-1 text-xs sm:text-[13px] text-gray-600">
                  No custom upload logic — everything goes through the central Media Library.
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="text-xs text-gray-600 bg-white border border-gray-200 rounded-2xl px-3 py-2">
                Images: <span className="font-semibold text-gray-900">{images.length}</span>
              </div>

              <button
                type="button"
                onClick={onCreate}
                disabled={!canSubmit}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:opacity-60"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Create Review
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mt-6 grid grid-cols-1 xl:grid-cols-[1.2fr_.8fr] gap-4 sm:gap-6">
          {/* Left: Details */}
          <div className="bg-white border border-gray-200 rounded-3xl shadow-sm">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="text-sm font-semibold text-gray-900">Review Details</div>
              <div className="text-xs text-gray-600 mt-1">
                Select product, (optional) customer, write review, set rating.
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {/* Product */}
              <div className="rounded-2xl border border-gray-200 p-3 sm:p-4 bg-gray-50">
                <ProductPicker
                  title="Pick a product for review"
                  multiple={false}
                  required
                  value={productId}
                  onChange={setProductId}
                />
                <div className="mt-2 text-[11px] text-gray-600">
                  Selected Product ID:{" "}
                  <span className="font-semibold text-gray-900">{safe(productId) || "—"}</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Customer ID (optional) */}
                <div className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
                      <User size={12} /> Customer ID (optional)
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Leave blank for admin/anonymous review
                    </div>
                  </div>
                  <input
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    placeholder="Mongo ObjectId (optional)"
                    className="w-full px-3 py-3 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Snapshots (optional) */}
                <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-gray-900">Customer Snapshot (optional)</div>
                    <div className="text-[11px] text-gray-600">
                      Useful when Customer ID is blank
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Name"
                      className="w-full px-3 py-3 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                    />
                    <input
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="Email"
                      className="w-full px-3 py-3 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                    />
                    <input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Phone"
                      className="w-full px-3 py-3 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                    />
                  </div>
                </div>

                {/* Rating */}
                <div className="lg:col-span-2">
                  <div className="text-[11px] font-medium text-gray-600 mb-2">Rating</div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-3">
                    <StarsPicker value={rating} onChange={setRating} />
                  </div>
                </div>

                {/* Title */}
                <div className="lg:col-span-2">
                  <div className="text-[11px] font-medium text-gray-600 mb-1">Title (optional)</div>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Great quality!"
                    maxLength={100}
                    className="w-full px-3 py-3 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Text */}
                <div className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[11px] font-medium text-gray-600">Review Text</div>
                    <div className="text-[11px] text-gray-500">{safe(reviewText).length}/1000</div>
                  </div>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Write review..."
                    rows={6}
                    maxLength={1000}
                    className="w-full px-3 py-3 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-100 resize-y"
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
          <div className="bg-white border border-gray-200 rounded-3xl shadow-sm">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex items-end justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">Review Images</div>
                <div className="text-xs text-gray-600 mt-1">
                  Select images using the central Media Library.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMediaOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
              >
                <ImageIcon size={18} />
                Select Media
              </button>
            </div>

            <div className="p-4 sm:p-6">
              {/* Folder */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
                <div className="text-[11px] font-medium text-gray-600 mb-1">
                  Cloudinary folder (optional)
                </div>
                <input
                  value={mediaFolder}
                  onChange={(e) => setMediaFolder(e.target.value)}
                  placeholder="miray/reviews"
                  className="w-full px-3 py-3 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-100 bg-white"
                />
                <div className="mt-1 text-[11px] text-gray-500">Passed to MediaPickerModal.</div>
              </div>

              {/* Selected media */}
              <div className="mt-4">
                {!selectedMedia.length ? (
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700">
                    No media selected yet.
                    <div className="text-xs text-gray-500 mt-1">
                      Click <span className="font-semibold">Select Media</span> to pick/upload.
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[11px] font-medium text-gray-600">
                        Selected ({images.length})
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedMedia([])}
                        className="text-[11px] px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50"
                      >
                        Clear all
                      </button>
                    </div>

                    <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(92px,1fr))]">
                      {uniqByPublicIdOrUrl(selectedMedia).map((m, idx) => {
                        const url = pickUrl(m);
                        const name = safe(m?.originalName) || "media";
                        return (
                          <motion.div
                            key={(pickPublicId(m) || url) + "-" + idx}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="group relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50"
                          >
                            <div className="aspect-square w-full">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt={name} className="w-full h-full object-cover" />
                            </div>

                            <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2">
                              <span className="text-[10px] px-2 py-1 rounded-full bg-white/90 border border-gray-200 truncate max-w-[78%]">
                                {name}
                              </span>

                              <button
                                type="button"
                                onClick={() => removeMediaAt(idx)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center w-8 h-8 rounded-xl bg-white/90 border border-red-200 text-red-700 hover:bg-red-50"
                                title="Remove"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    <div className="mt-3 text-[11px] text-gray-500">
                      Review will store only <span className="font-semibold">image URLs</span>.
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Media System Modal */}
      <MediaPickerModal
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        multiple
        folder={mediaFolder || "miray/reviews"}
        onSelect={(mediaList) => {
          const list = Array.isArray(mediaList) ? mediaList : mediaList ? [mediaList] : [];
          const merged = uniqByPublicIdOrUrl([...(selectedMedia || []), ...list]);
          setSelectedMedia(merged);
          setMediaOpen(false);
          toast.success("Media selected");
        }}
      />
    </div>
  );
}
