// app/reviews/manage/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  ExternalLink,
  Star,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";

import useLoginStore from "@/store/useLoginStore";
import { ROLE_DEFAULT_PERMS, DOMAIN_PERMISSIONS, hasPermission } from "@/config/loginConfig";
import { useAdminReviewStore } from "@/store/adminReviewStore";

/* ---------------- helpers ---------------- */
const safe = (v) => (v == null ? "" : String(v).trim());
const clamp = (n, a, b) => Math.min(Math.max(n, a), b);

const fmtDateTime = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleString();
};

const Stars = ({ value = 0 }) => {
  const v = clamp(Number(value) || 0, 0, 5);
  const filled = clamp(Math.round(v), 0, 5);
  return (
    <div className="inline-flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          className={i < filled ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}
        />
      ))}
      <span className="text-xs text-gray-600 ml-1">{Number(v).toFixed(1)}</span>
    </div>
  );
};

const StatusPill = ({ status }) => {
  const st = safe(status) || "approved";
  const map = {
    approved: "bg-green-50 text-green-700 border-green-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    pending: "bg-yellow-50 text-yellow-800 border-yellow-200",
  };
  const label = st === "approved" ? "Approved" : st === "rejected" ? "Rejected" : "Pending";
  const Icon = st === "approved" ? CheckCircle2 : st === "rejected" ? XCircle : Clock;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border ${
        map[st] || map.approved
      }`}
    >
      <Icon size={14} />
      {label}
    </span>
  );
};

function ConfirmModal({
  open,
  title,
  desc,
  confirmText = "Confirm",
  danger = false,
  busy,
  onClose,
  onConfirm,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        className="w-full max-w-md rounded-3xl bg-white border border-gray-200 shadow-xl overflow-hidden"
      >
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="font-semibold text-gray-900">{title}</div>
            {desc ? <div className="text-sm text-gray-600 mt-1">{desc}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-2xl border border-gray-200 hover:bg-gray-50 flex items-center justify-center"
            disabled={!!busy}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl border border-gray-200 hover:bg-gray-50 text-sm"
            disabled={!!busy}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2.5 rounded-2xl text-sm text-white ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            } disabled:opacity-60`}
            disabled={!!busy}
          >
            {busy ? "Working..." : confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Lightbox({ open, images = [], index = 0, onClose, onPrev, onNext }) {
  if (!open) return null;

  const hasMany = images.length > 1;
  const src = images[index] || "";

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center"
        title="Close"
      >
        <X size={20} />
      </button>

      {hasMany && (
        <button
          type="button"
          onClick={onPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center"
          title="Prev"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      <div className="w-full">
        <div className="rounded-3xl overflow-hidden border border-white/10 bg-black/30 shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="review" className="w-full max-h-[84vh] object-contain" />
        </div>
        {hasMany && (
          <div className="mt-3 text-center text-xs text-white/80">
            {index + 1} / {images.length}
          </div>
        )}
      </div>

      {hasMany && (
        <button
          type="button"
          onClick={onNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center"
          title="Next"
        >
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  );
}

export default function ReviewsManagePage() {
  const router = useRouter();

  // auth + permission
  const admin = useLoginStore((s) => s.admin);
  const role = admin?.role || "viewer";
  const permissions =
    (admin?.permissions?.length ? admin.permissions : ROLE_DEFAULT_PERMS[role]) || [];
  const canAccess = hasPermission(permissions, DOMAIN_PERMISSIONS.reviews);

  // store
  const { items, meta, query, setQuery, fetchAdminReviews, deleteReview, isLoading, isSaving, error } =
    useAdminReviewStore();

  // modals
  const [confirm, setConfirm] = useState({ open: false, id: "" });
  const [lb, setLb] = useState({ open: false, images: [], index: 0 });

  // initial load
  useEffect(() => {
    if (!canAccess) return;
    fetchAdminReviews({ page: 1, limit: 20, sort: "latest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess]);

  // show errors
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const onApply = async (e) => {
    e?.preventDefault?.();
    await fetchAdminReviews({ page: 1 });
  };

  const onReset = async () => {
    setQuery({
      page: 1,
      limit: 20,
      status: "",
      rating: "",
      productCode: "",
      customerEmail: "",
      q: "",
      sort: "latest",
    });
    await fetchAdminReviews({
      page: 1,
      limit: 20,
      status: "",
      rating: "",
      productCode: "",
      customerEmail: "",
      q: "",
      sort: "latest",
    });
  };

  const goPage = async (p) => {
    const next = clamp(Number(p) || 1, 1, meta?.totalPages || 1);
    await fetchAdminReviews({ page: next });
  };

  const openDelete = (id) => setConfirm({ open: true, id: safe(id) });
  const runDelete = async () => {
    const id = confirm.id;
    setConfirm({ open: false, id: "" });
    if (!id) return;
    const res = await deleteReview(id);
    if (res) toast.success("Review deleted");
  };

  const openLightbox = (images = [], idx = 0) => {
    const arr = Array.isArray(images) ? images.filter(Boolean) : [];
    if (!arr.length) return;
    setLb({ open: true, images: arr, index: clamp(idx, 0, arr.length - 1) });
  };

  const lbPrev = () =>
    setLb((p) => ({ ...p, index: p.index <= 0 ? p.images.length - 1 : p.index - 1 }));
  const lbNext = () =>
    setLb((p) => ({ ...p, index: p.index >= p.images.length - 1 ? 0 : p.index + 1 }));

  const stats = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    const total = Number(meta?.total || 0);
    const approved = list.filter((x) => safe(x?.status) === "approved").length;
    const pending = list.filter((x) => safe(x?.status) === "pending").length;
    const rejected = list.filter((x) => safe(x?.status) === "rejected").length;
    return { total, approved, pending, rejected };
  }, [items, meta]);

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="text-lg font-semibold text-gray-900">Access denied</div>
          <div className="text-sm text-gray-600 mt-1">
            You don&apos;t have permission to manage Reviews.
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
        {/* Hero Header */}
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
                    Manage Reviews
                  </div>

                  <span className="text-[11px] px-2 py-1 rounded-full bg-white border border-blue-100 text-blue-700">
                    Delete • View • Lightbox
                  </span>

                  {isLoading ? (
                    <span className="text-[11px] px-2 py-1 rounded-full bg-white border border-gray-200 text-gray-600">
                      Loading…
                    </span>
                  ) : (
                    <span className="text-[11px] px-2 py-1 rounded-full bg-white border border-gray-200 text-gray-600">
                      Total: <span className="font-semibold text-gray-900">{stats.total}</span>
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="text-[11px] px-2 py-1 rounded-full border bg-white text-green-700 border-green-200">
                    Approved: <span className="font-semibold">{stats.approved}</span>
                  </span>
                  <span className="text-[11px] px-2 py-1 rounded-full border bg-white text-yellow-800 border-yellow-200">
                    Pending: <span className="font-semibold">{stats.pending}</span>
                  </span>
                  <span className="text-[11px] px-2 py-1 rounded-full border bg-white text-red-700 border-red-200">
                    Rejected: <span className="font-semibold">{stats.rejected}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <button
                type="button"
                onClick={() => router.push("/reviews/add")}
                className="px-5 py-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
              >
                Add Review
              </button>

              <button
                type="button"
                onClick={() => fetchAdminReviews({ page: query.page, limit: query.limit, sort: query.sort })}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 shadow-sm disabled:opacity-60"
                disabled={isLoading}
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <form
          onSubmit={onApply}
          className="mt-5 bg-white border border-gray-200 rounded-3xl shadow-sm"
        >
          <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-gray-900">Filters</div>
            <div className="text-xs text-gray-500">
              Page {meta?.page || 1} / {meta?.totalPages || 1}
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              {/* Search */}
              <div className="lg:col-span-5">
                <div className="text-[11px] font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <Search size={12} /> Search
                </div>
                <input
                  value={query.q}
                  onChange={(e) => setQuery({ q: e.target.value })}
                  placeholder="Search title/text/name/email/productCode..."
                  className="w-full px-3 py-3 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Status */}
              <div className="lg:col-span-2">
                <div className="text-[11px] font-medium text-gray-600 mb-1 flex items-center gap-1">
                  <Filter size={12} /> Status
                </div>
                <select
                  value={query.status}
                  onChange={(e) => setQuery({ status: e.target.value })}
                  className="w-full px-3 py-3 rounded-2xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Rating */}
              <div className="lg:col-span-2">
                <div className="text-[11px] font-medium text-gray-600 mb-1">Rating</div>
                <select
                  value={query.rating}
                  onChange={(e) => setQuery({ rating: e.target.value })}
                  className="w-full px-3 py-3 rounded-2xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All</option>
                  <option value="5">5</option>
                  <option value="4">4</option>
                  <option value="3">3</option>
                  <option value="2">2</option>
                  <option value="1">1</option>
                </select>
              </div>

              {/* Sort */}
              <div className="lg:col-span-3">
                <div className="text-[11px] font-medium text-gray-600 mb-1">Sort</div>
                <select
                  value={query.sort}
                  onChange={(e) => setQuery({ sort: e.target.value })}
                  className="w-full px-3 py-3 rounded-2xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="latest">Latest</option>
                  <option value="oldest">Oldest</option>
                  <option value="ratingHigh">Rating High</option>
                  <option value="ratingLow">Rating Low</option>
                </select>
              </div>

              {/* Product Code */}
              <div className="lg:col-span-6">
                <div className="text-[11px] font-medium text-gray-600 mb-1">Product Code</div>
                <input
                  value={query.productCode}
                  onChange={(e) => setQuery({ productCode: e.target.value })}
                  placeholder="e.g. MIRAY-00123"
                  className="w-full px-3 py-3 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Customer Email */}
              <div className="lg:col-span-6">
                <div className="text-[11px] font-medium text-gray-600 mb-1">Customer Email</div>
                <input
                  value={query.customerEmail}
                  onChange={(e) => setQuery({ customerEmail: e.target.value })}
                  placeholder="e.g. user@gmail.com"
                  className="w-full px-3 py-3 rounded-2xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 shadow-sm"
              >
                Reset
              </button>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:opacity-60"
                disabled={isLoading}
              >
                Apply
              </button>
            </div>
          </div>
        </form>

        {/* List */}
        <div className="mt-5 bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-sm font-semibold text-gray-900">Reviews</div>
            <div className="text-xs text-gray-500">
              Page {meta?.page || 1} of {meta?.totalPages || 1} • Total {meta?.total || 0}
            </div>
          </div>

          {isLoading ? (
            <div className="p-6 text-sm text-gray-600">Loading reviews...</div>
          ) : !items?.length ? (
            <div className="p-6 text-sm text-gray-600">No reviews found.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {items.map((r) => {
                const id = safe(r?._id);
                const prod = r?.product;
                const prodTitle = prod?.title || r?.productCode || "Product";

                // ✅ customer optional now
                const custName =
                  safe(r?.customerName) ||
                  safe(r?.customer?.name) ||
                  (safe(r?.customerEmail) ? "Customer" : "Admin Review");
                const custEmail = safe(r?.customerEmail) || safe(r?.customer?.email) || "";
                const images = Array.isArray(r?.images) ? r.images.filter(Boolean) : [];

                return (
                  <div key={id} className="p-4 sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold text-gray-900 truncate">{prodTitle}</div>

                          {r?.productCode ? (
                            <span className="text-[11px] px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                              {r.productCode}
                            </span>
                          ) : null}

                          <StatusPill status={r?.status} />

                          {images.length ? (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-700">
                              <ImageIcon size={14} />
                              {images.length}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                          <Stars value={r?.rating} />
                          <span className="text-gray-300">•</span>
                          <span className="truncate">{custName}</span>
                          {custEmail ? (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="truncate">{custEmail}</span>
                            </>
                          ) : null}
                          <span className="text-gray-300">•</span>
                          <span>{fmtDateTime(r?.createdAt)}</span>
                          {r?.verifiedPurchase ? (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded-full text-[11px]">
                                Verified
                              </span>
                            </>
                          ) : null}
                        </div>

                        {r?.title ? (
                          <div className="mt-3 font-medium text-gray-900">{r.title}</div>
                        ) : null}

                        {r?.reviewText ? (
                          <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                            {r.reviewText}
                          </div>
                        ) : (
                          <div className="mt-1 text-sm text-gray-400">No text</div>
                        )}

                        {/* Thumbs */}
                        {images.length ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {images.slice(0, 10).map((url, i) => (
                              <button
                                key={`${id}-img-${i}`}
                                type="button"
                                onClick={() => openLightbox(images, i)}
                                className="group relative w-[72px] h-[72px] rounded-2xl border border-gray-200 overflow-hidden bg-gray-50 shadow-sm"
                                title="Open"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt="review"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => toast("Hook a view route if you want (e.g. /reviews/view/[id])")}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 text-sm"
                        >
                          <ExternalLink size={16} />
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() => openDelete(id)}
                          disabled={isSaving}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-red-200 text-red-700 hover:bg-red-50 text-sm disabled:opacity-60"
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-gray-600">
              Showing {(items?.length || 0)} of {meta?.total || 0}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goPage((meta?.page || 1) - 1)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                disabled={isLoading || (meta?.page || 1) <= 1}
              >
                <ChevronLeft size={16} />
                Prev
              </button>

              <div className="text-sm text-gray-700 px-2">
                {meta?.page || 1} / {meta?.totalPages || 1}
              </div>

              <button
                type="button"
                onClick={() => goPage((meta?.page || 1) + 1)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                disabled={isLoading || (meta?.page || 1) >= (meta?.totalPages || 1)}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirm */}
      <ConfirmModal
        open={confirm.open}
        busy={isSaving}
        danger
        title="Delete this review?"
        desc="This will permanently delete the review and update product rating stats."
        confirmText="Delete"
        onClose={() => setConfirm({ open: false, id: "" })}
        onConfirm={runDelete}
      />

      {/* Lightbox */}
      <Lightbox
        open={lb.open}
        images={lb.images}
        index={lb.index}
        onClose={() => setLb({ open: false, images: [], index: 0 })}
        onPrev={lbPrev}
        onNext={lbNext}
      />
    </div>
  );
}
