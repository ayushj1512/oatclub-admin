// app/reviews/page.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Star,
  Filter,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Trash2,
  ShieldAlert,
  Sparkles,
  ArrowLeft,
  Image as ImageIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import useLoginStore from "@/store/useLoginStore";
import { ROLE_DEFAULT_PERMS, DOMAIN_PERMISSIONS, hasPermission } from "@/config/loginConfig";
import { useAdminReviewStore } from "@/store/adminReviewStore";

/* ---------------- helpers ---------------- */
const safe = (v) => (v == null ? "" : String(v));
const s = (v) => safe(v).trim();
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
  const st = s(status) || "approved";
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
  onClose,
  onConfirm,
  busy,
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
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <span
              className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl ${
                danger ? "bg-red-50" : "bg-blue-50"
              }`}
            >
              <ShieldAlert className={danger ? "text-red-600" : "text-blue-700"} size={18} />
            </span>
            <div className="min-w-0">
              <div className="font-semibold text-gray-900">{title}</div>
              {desc ? <div className="text-sm text-gray-600 mt-1">{desc}</div> : null}
            </div>
          </div>
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

export default function ReviewsDashboardPage() {
  const router = useRouter();

  // auth + permission
  const admin = useLoginStore((s) => s.admin);
  const role = admin?.role || "viewer";
  const permissions =
    (admin?.permissions?.length ? admin.permissions : ROLE_DEFAULT_PERMS[role]) || [];
  const canAccess = hasPermission(permissions, DOMAIN_PERMISSIONS.reviews);

  // store
  const {
    items,
    meta,
    query,
    setQuery,
    fetchAdminReviews,
    updateReview,
    deleteReview,
    bulkUpdateStatus,
    bulkDelete,
    selectedIds,
    toggleSelect,
    selectAllOnPage,
    clearSelection,
    isLoading,
    isSaving,
    error,
  } = useAdminReviewStore();

  // local UI
  const [confirm, setConfirm] = useState({ open: false, type: "", id: "", status: "" });

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

  const selectedCount = selectedIds?.length || 0;

  const stats = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    const approved = list.filter((x) => s(x?.status) === "approved").length;
    const pending = list.filter((x) => s(x?.status) === "pending").length;
    const rejected = list.filter((x) => s(x?.status) === "rejected").length;
    const total = Number(meta?.total || 0);
    return { total, approved, pending, rejected };
  }, [items, meta]);

  const filtersSummary = useMemo(() => {
    const parts = [];
    if (query.status) parts.push(`Status: ${query.status}`);
    if (query.rating) parts.push(`Rating: ${query.rating}`);
    if (query.productCode) parts.push(`ProductCode: ${query.productCode}`);
    if (query.customerEmail) parts.push(`Email: ${query.customerEmail}`);
    if (query.q) parts.push(`Search: ${query.q}`);
    return parts.length ? parts.join(" • ") : "Showing latest reviews";
  }, [query]);

  const onRefresh = async () => {
    await fetchAdminReviews({ page: query.page, limit: query.limit, sort: query.sort });
    toast.success("Refreshed");
  };

  const onApplyFilters = async (e) => {
    e?.preventDefault?.();
    clearSelection();
    await fetchAdminReviews({ page: 1 });
  };

  const onReset = async () => {
    clearSelection();
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

  const goPage = async (nextPage) => {
    const p = clamp(Number(nextPage) || 1, 1, meta?.totalPages || 1);
    clearSelection();
    await fetchAdminReviews({ page: p });
  };

  const openStatusConfirm = (id, status) => setConfirm({ open: true, type: "status", id, status });
  const openDeleteConfirm = (id) => setConfirm({ open: true, type: "delete", id, status: "" });
  const openBulkStatusConfirm = (status) =>
    setConfirm({ open: true, type: "bulkStatus", id: "", status });
  const openBulkDeleteConfirm = () =>
    setConfirm({ open: true, type: "bulkDelete", id: "", status: "" });

  const runConfirm = async () => {
    const { type, id, status } = confirm;
    setConfirm((c) => ({ ...c, open: false }));

    if (type === "status") {
      const res = await updateReview(id, { status });
      if (res) toast.success("Review updated");
      return;
    }

    if (type === "delete") {
      const res = await deleteReview(id);
      if (res) toast.success("Review deleted");
      return;
    }

    if (type === "bulkStatus") {
      const res = await bulkUpdateStatus(status);
      if (res) toast.success("Bulk status updated");
      return;
    }

    if (type === "bulkDelete") {
      const res = await bulkDelete();
      if (res) toast.success("Bulk delete done");
      return;
    }
  };

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="text-lg font-semibold text-gray-900">Access denied</div>
          <div className="text-sm text-gray-600 mt-1">
            You don&apos;t have permission to view Reviews.
          </div>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
          >
            <ChevronLeft size={16} />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-3 sm:px-6 md:px-8 py-6 sm:py-10">
      <div>
        {/* Hero */}
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
                    onClick={() => router.push("/")}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 shadow-sm"
                    title="Back to Dashboard"
                  >
                    <ArrowLeft size={16} />
                  </button>

                  <div className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">
                    Reviews Dashboard
                  </div>

                  <span className="text-[11px] px-2 py-1 rounded-full bg-white border border-blue-100 text-blue-700">
                    Recent + Bulk Actions
                  </span>

                  <span className="text-[11px] px-2 py-1 rounded-full bg-white border border-gray-200 text-gray-600">
                    Total: <span className="font-semibold text-gray-900">{stats.total}</span>
                  </span>
                </div>

                <div className="mt-2 text-xs text-gray-600">{filtersSummary}</div>

                <div className="mt-3 flex flex-wrap gap-2">
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
                onClick={() => router.push("/reviews/manage")}
                className="px-5 py-3 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 shadow-sm"
              >
                Manage Page
              </button>

              <button
                type="button"
                onClick={onRefresh}
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
        <form onSubmit={onApplyFilters} className="mt-5 bg-white border border-gray-200 rounded-3xl shadow-sm">
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

        {/* Bulk actions */}
        <div className="mt-5 bg-white border border-gray-200 rounded-3xl shadow-sm">
          <div className="p-4 sm:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-700">
                Selected: <span className="font-semibold">{selectedCount}</span>
              </span>

              <button
                type="button"
                onClick={selectAllOnPage}
                className="px-4 py-2.5 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50"
                disabled={!items?.length}
              >
                Select page
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="px-4 py-2.5 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50"
                disabled={!selectedCount}
              >
                Clear
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openBulkStatusConfirm("approved")}
                className="px-4 py-2.5 rounded-2xl bg-green-600 text-white hover:bg-green-700 shadow-sm disabled:opacity-60"
                disabled={!selectedCount || isSaving}
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => openBulkStatusConfirm("pending")}
                className="px-4 py-2.5 rounded-2xl bg-yellow-600 text-white hover:bg-yellow-700 shadow-sm disabled:opacity-60"
                disabled={!selectedCount || isSaving}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => openBulkStatusConfirm("rejected")}
                className="px-4 py-2.5 rounded-2xl bg-red-600 text-white hover:bg-red-700 shadow-sm disabled:opacity-60"
                disabled={!selectedCount || isSaving}
              >
                Reject
              </button>

              <button
                type="button"
                onClick={openBulkDeleteConfirm}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-red-200 text-red-700 hover:bg-red-50 shadow-sm disabled:opacity-60"
                disabled={!selectedCount || isSaving}
              >
                <Trash2 size={16} />
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="mt-5 bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-sm font-semibold text-gray-900">Recent Reviews</div>
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
                const id = String(r?._id || "");
                const prod = r?.product;
                const prodTitle = prod?.title || r?.productCode || "Product";

                // ✅ customer optional now
                const custName =
                  s(r?.customerName) ||
                  s(r?.customer?.name) ||
                  (s(r?.customerEmail) ? "Customer" : "Admin Review");
                const custEmail = s(r?.customerEmail) || s(r?.customer?.email) || "";

                const checked = selectedIds.includes(id);
                const images = Array.isArray(r?.images) ? r.images.filter(Boolean) : [];
                const hasImages = images.length > 0;

                return (
                  <div key={id} className="p-4 sm:p-6">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(id)}
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-semibold text-gray-900 truncate">{prodTitle}</div>

                              {r?.productCode ? (
                                <span className="text-[11px] px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                                  {r.productCode}
                                </span>
                              ) : null}

                              <StatusPill status={r?.status} />

                              {hasImages ? (
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

                            {hasImages ? (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {images.slice(0, 8).map((url, i) => (
                                  <a
                                    key={`${id}-img-${i}`}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group"
                                    title="Open image"
                                  >
                                    <div className="w-[72px] h-[72px] rounded-2xl border border-gray-200 overflow-hidden bg-gray-50 shadow-sm">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={url}
                                        alt="review"
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      />
                                    </div>
                                  </a>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => openStatusConfirm(id, "approved")}
                              className="px-4 py-2.5 rounded-2xl bg-green-600 text-white hover:bg-green-700 text-sm disabled:opacity-60"
                              disabled={isSaving}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => openStatusConfirm(id, "pending")}
                              className="px-4 py-2.5 rounded-2xl bg-yellow-600 text-white hover:bg-yellow-700 text-sm disabled:opacity-60"
                              disabled={isSaving}
                            >
                              Pending
                            </button>
                            <button
                              type="button"
                              onClick={() => openStatusConfirm(id, "rejected")}
                              className="px-4 py-2.5 rounded-2xl bg-red-600 text-white hover:bg-red-700 text-sm disabled:opacity-60"
                              disabled={isSaving}
                            >
                              Reject
                            </button>

                            <button
                              type="button"
                              onClick={() => openDeleteConfirm(id)}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-red-200 text-red-700 hover:bg-red-50 text-sm disabled:opacity-60"
                              disabled={isSaving}
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>

                            <button
                              type="button"
                              onClick={() => toast("Hook your product/details route here")}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 text-sm"
                            >
                              <ExternalLink size={16} />
                              View
                            </button>
                          </div>
                        </div>
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

      {/* Confirm Modal */}
      <ConfirmModal
        open={confirm.open}
        busy={isSaving}
        danger={
          confirm.type === "delete" ||
          confirm.type === "bulkDelete" ||
          confirm.status === "rejected"
        }
        title={
          confirm.type === "status"
            ? `Set status to "${confirm.status}"`
            : confirm.type === "bulkStatus"
            ? `Update ${selectedCount} reviews to "${confirm.status}"`
            : confirm.type === "bulkDelete"
            ? `Delete ${selectedCount} reviews?`
            : "Delete this review?"
        }
        desc={
          confirm.type === "bulkDelete"
            ? "This will permanently delete selected reviews."
            : confirm.type === "delete"
            ? "This will permanently delete the review."
            : "This will affect product rating stats as well."
        }
        confirmText={confirm.type === "delete" || confirm.type === "bulkDelete" ? "Delete" : "Confirm"}
        onClose={() => setConfirm({ open: false, type: "", id: "", status: "" })}
        onConfirm={runConfirm}
      />
    </div>
  );
}
