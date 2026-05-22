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
  Package,
  MessageSquare,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

import useLoginStore from "@/store/useLoginStore";
import {
  ROLE_DEFAULT_PERMS,
  DOMAIN_PERMISSIONS,
  hasPermission,
} from "@/config/loginConfig";
import { useAdminReviewStore } from "@/store/adminReviewStore";

/* ---------------- helpers ---------------- */
const safe = (v) => (v == null ? "" : String(v));
const s = (v) => safe(v).trim();
const clamp = (n, a, b) => Math.min(Math.max(n, a), b);

const fmtDateTime = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
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
          className={
            i < filled
              ? "fill-yellow-500 text-yellow-500"
              : "text-gray-300"
          }
        />
      ))}

      <span className="ml-1 text-xs text-gray-600">
        {Number(v).toFixed(1)}
      </span>
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

  const label =
    st === "approved" ? "Approved" : st === "rejected" ? "Rejected" : "Pending";

  const Icon = st === "approved" ? CheckCircle2 : st === "rejected" ? XCircle : Clock;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] ${
        map[st] || map.approved
      }`}
    >
      <Icon size={14} />
      {label}
    </span>
  );
};

const SourcePill = ({ source }) => {
  if (!source) return null;

  const label =
    source === "order_link"
      ? "Order Review"
      : source === "admin"
      ? "Admin"
      : "Website";

  return (
    <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] text-blue-700">
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
        className="w-full max-w-md overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl"
      >
        <div className="border-b border-gray-100 p-5">
          <div className="flex items-start gap-3">
            <span
              className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${
                danger ? "bg-red-50" : "bg-blue-50"
              }`}
            >
              <ShieldAlert
                className={danger ? "text-red-600" : "text-blue-700"}
                size={18}
              />
            </span>

            <div>
              <div className="font-semibold text-gray-900">{title}</div>
              {desc ? (
                <div className="mt-1 text-sm text-gray-600">{desc}</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-5">
          <button
            type="button"
            onClick={onClose}
            disabled={!!busy}
            className="rounded-2xl border border-gray-200 px-4 py-2.5 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={!!busy}
            className={`rounded-2xl px-4 py-2.5 text-sm text-white disabled:opacity-60 ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
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

  const admin = useLoginStore((st) => st.admin);
  const role = admin?.role || "viewer";

  const permissions =
    (admin?.permissions?.length ? admin.permissions : ROLE_DEFAULT_PERMS[role]) ||
    [];

  const canAccess = hasPermission(permissions, DOMAIN_PERMISSIONS.reviews);

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

  const [confirm, setConfirm] = useState({
    open: false,
    type: "",
    id: "",
    status: "",
  });

  useEffect(() => {
    if (!canAccess) return;

    fetchAdminReviews({
      page: 1,
      limit: 20,
      sort: "latest",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const selectedCount = selectedIds?.length || 0;

  const stats = useMemo(() => {
    const list = Array.isArray(items) ? items : [];

    return {
      total: Number(meta?.total || 0),
      approved: list.filter((x) => s(x?.status) === "approved").length,
      pending: list.filter((x) => s(x?.status) === "pending").length,
      rejected: list.filter((x) => s(x?.status) === "rejected").length,
    };
  }, [items, meta]);

  const filtersSummary = useMemo(() => {
    const parts = [];

    if (query.status) parts.push(`Status: ${query.status}`);
    if (query.rating) parts.push(`Rating: ${query.rating}`);
    if (query.productCode) parts.push(`Product: ${query.productCode}`);
    if (query.customerEmail) parts.push(`Email: ${query.customerEmail}`);
    if (query.orderNumber) parts.push(`Order: ${query.orderNumber}`);
    if (query.q) parts.push(`Search: ${query.q}`);

    return parts.length ? parts.join(" • ") : "Showing latest reviews";
  }, [query]);

  const onRefresh = async () => {
    await fetchAdminReviews({
      page: query.page,
      limit: query.limit,
      sort: query.sort,
    });

    toast.success("Refreshed");
  };

  const onApplyFilters = async (e) => {
    e?.preventDefault?.();
    clearSelection();
    await fetchAdminReviews({ page: 1 });
  };

  const onReset = async () => {
    clearSelection();

    const reset = {
      page: 1,
      limit: 20,
      status: "",
      rating: "",
      productCode: "",
      customerEmail: "",
      orderNumber: "",
      q: "",
      sort: "latest",
    };

    setQuery(reset);
    await fetchAdminReviews(reset);
  };

  const goPage = async (nextPage) => {
    const p = clamp(Number(nextPage) || 1, 1, meta?.totalPages || 1);
    clearSelection();
    await fetchAdminReviews({ page: p });
  };

  const openStatusConfirm = (id, status) =>
    setConfirm({ open: true, type: "status", id, status });

  const openDeleteConfirm = (id) =>
    setConfirm({ open: true, type: "delete", id, status: "" });

  const openBulkStatusConfirm = (status) =>
    setConfirm({ open: true, type: "bulkStatus", id: "", status });

  const openBulkDeleteConfirm = () =>
    setConfirm({ open: true, type: "bulkDelete", id: "", status: "" });

  const runConfirm = async () => {
    const { type, id, status } = confirm;

    setConfirm({
      open: false,
      type: "",
      id: "",
      status: "",
    });

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
            You don&apos;t have permission to view Reviews.
          </div>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <ChevronLeft size={16} />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-6 sm:px-6 sm:py-10 md:px-8">
      {/* Hero */}
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
                  onClick={() => router.push("/")}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm hover:bg-gray-50"
                  title="Back to Dashboard"
                >
                  <ArrowLeft size={16} />
                </button>

                <div className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
                  Reviews Dashboard
                </div>

                <span className="rounded-full border border-blue-100 bg-white px-2 py-1 text-[11px] text-blue-700">
                  Order Reviews + Bulk Actions
                </span>

                <span className="rounded-full border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600">
                  Total:{" "}
                  <span className="font-semibold text-gray-900">
                    {stats.total}
                  </span>
                </span>
              </div>

              <div className="mt-2 text-xs text-gray-600">
                {filtersSummary}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-green-200 bg-white px-2 py-1 text-[11px] text-green-700">
                  Approved: <span className="font-semibold">{stats.approved}</span>
                </span>

                <span className="rounded-full border border-yellow-200 bg-white px-2 py-1 text-[11px] text-yellow-800">
                  Pending: <span className="font-semibold">{stats.pending}</span>
                </span>

                <span className="rounded-full border border-red-200 bg-white px-2 py-1 text-[11px] text-red-700">
                  Rejected: <span className="font-semibold">{stats.rejected}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => router.push("/reviews/add")}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-white shadow-sm hover:bg-blue-700"
            >
              Add Review
            </button>

            <button
              type="button"
              onClick={() => router.push("/reviews/manage")}
              className="rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-sm hover:bg-gray-50"
            >
              Manage Page
            </button>

            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-sm hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Quick Cards */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => router.push("/reviews/manage")}
          className="rounded-3xl border border-gray-200 bg-white p-4 text-left transition hover:shadow-md"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50">
            <MessageSquare className="text-blue-700" size={18} />
          </div>

          <div className="font-semibold text-gray-900">Manage Reviews</div>
          <div className="mt-1 text-sm text-gray-500">
            Moderate customer reviews
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push("/reviews/add")}
          className="rounded-3xl border border-gray-200 bg-white p-4 text-left transition hover:shadow-md"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-green-50">
            <Star className="text-green-700" size={18} />
          </div>

          <div className="font-semibold text-gray-900">Add Review</div>
          <div className="mt-1 text-sm text-gray-500">Create manual reviews</div>
        </button>

        <button
          type="button"
          onClick={() => router.push("/reviews/pending")}
          className="rounded-3xl border border-gray-200 bg-white p-4 text-left transition hover:shadow-md"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-50">
            <Clock className="text-yellow-700" size={18} />
          </div>

          <div className="font-semibold text-gray-900">Pending Reviews</div>
          <div className="mt-1 text-sm text-gray-500">
            Reviews waiting approval
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push("/reviews/order")}
          className="rounded-3xl border border-gray-200 bg-white p-4 text-left transition hover:shadow-md"
        >
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50">
            <Package className="text-purple-700" size={18} />
          </div>

          <div className="font-semibold text-gray-900">Order Reviews</div>
          <div className="mt-1 text-sm text-gray-500">
            Search by order number
          </div>
        </button>
      </div>

      {/* Filters */}
      <form
        onSubmit={onApplyFilters}
        className="mt-5 rounded-3xl border border-gray-200 bg-white shadow-sm"
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-4 sm:p-6">
          <div className="text-sm font-semibold text-gray-900">Filters</div>

          <div className="text-xs text-gray-500">
            Page {meta?.page || 1} / {meta?.totalPages || 1}
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <div className="mb-1 flex items-center gap-1 text-[11px] font-medium text-gray-600">
                <Search size={12} />
                Search
              </div>

              <input
                value={query.q}
                onChange={(e) => setQuery({ q: e.target.value })}
                placeholder="Search text/name/email/product/order..."
                className="w-full rounded-2xl border border-gray-200 px-3 py-3 outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="lg:col-span-2">
              <div className="mb-1 flex items-center gap-1 text-[11px] font-medium text-gray-600">
                <Filter size={12} />
                Status
              </div>

              <select
                value={query.status}
                onChange={(e) => setQuery({ status: e.target.value })}
                className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <div className="mb-1 text-[11px] font-medium text-gray-600">
                Rating
              </div>

              <select
                value={query.rating}
                onChange={(e) => setQuery({ rating: e.target.value })}
                className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All</option>
                <option value="5">5</option>
                <option value="4">4</option>
                <option value="3">3</option>
                <option value="2">2</option>
                <option value="1">1</option>
              </select>
            </div>

            <div className="lg:col-span-3">
              <div className="mb-1 text-[11px] font-medium text-gray-600">
                Sort
              </div>

              <select
                value={query.sort}
                onChange={(e) => setQuery({ sort: e.target.value })}
                className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-3 outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="latest">Latest</option>
                <option value="oldest">Oldest</option>
                <option value="ratingHigh">Rating High</option>
                <option value="ratingLow">Rating Low</option>
              </select>
            </div>

            <div className="lg:col-span-4">
              <div className="mb-1 text-[11px] font-medium text-gray-600">
                Product Code
              </div>

              <input
                value={query.productCode}
                onChange={(e) => setQuery({ productCode: e.target.value })}
                placeholder="Product code"
                className="w-full rounded-2xl border border-gray-200 px-3 py-3 outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="lg:col-span-4">
              <div className="mb-1 text-[11px] font-medium text-gray-600">
                Customer Email
              </div>

              <input
                value={query.customerEmail}
                onChange={(e) => setQuery({ customerEmail: e.target.value })}
                placeholder="user@gmail.com"
                className="w-full rounded-2xl border border-gray-200 px-3 py-3 outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="lg:col-span-4">
              <div className="mb-1 text-[11px] font-medium text-gray-600">
                Order Number
              </div>

              <input
                value={query.orderNumber}
                onChange={(e) => setQuery({ orderNumber: e.target.value })}
                placeholder="MIRAY-000123"
                className="w-full rounded-2xl border border-gray-200 px-3 py-3 outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-sm hover:bg-gray-50"
            >
              Reset
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              Apply
            </button>
          </div>
        </div>
      </form>

      {/* Bulk Actions */}
      <div className="mt-5 rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-700">
              Selected: <span className="font-semibold">{selectedCount}</span>
            </span>

            <button
              type="button"
              onClick={selectAllOnPage}
              disabled={!items?.length}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 hover:bg-gray-50"
            >
              Select page
            </button>

            <button
              type="button"
              onClick={clearSelection}
              disabled={!selectedCount}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 hover:bg-gray-50 disabled:opacity-60"
            >
              Clear
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openBulkStatusConfirm("approved")}
              disabled={!selectedCount || isSaving}
              className="rounded-2xl bg-green-600 px-4 py-2.5 text-white shadow-sm hover:bg-green-700 disabled:opacity-60"
            >
              Approve
            </button>

            <button
              type="button"
              onClick={() => openBulkStatusConfirm("pending")}
              disabled={!selectedCount || isSaving}
              className="rounded-2xl bg-yellow-600 px-4 py-2.5 text-white shadow-sm hover:bg-yellow-700 disabled:opacity-60"
            >
              Pending
            </button>

            <button
              type="button"
              onClick={() => openBulkStatusConfirm("rejected")}
              disabled={!selectedCount || isSaving}
              className="rounded-2xl bg-red-600 px-4 py-2.5 text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
            >
              Reject
            </button>

            <button
              type="button"
              onClick={openBulkDeleteConfirm}
              disabled={!selectedCount || isSaving}
              className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-60"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="mt-5 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="text-sm font-semibold text-gray-900">
            Recent Reviews
          </div>

          <div className="text-xs text-gray-500">
            Page {meta?.page || 1} of {meta?.totalPages || 1} • Total{" "}
            {meta?.total || 0}
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

              const custName =
                s(r?.customerName) ||
                s(r?.customer?.name) ||
                (s(r?.customerEmail) ? "Customer" : "Admin Review");

              const custEmail = s(r?.customerEmail) || s(r?.customer?.email) || "";
              const checked = selectedIds.includes(id);
              const images = Array.isArray(r?.images)
                ? r.images.filter(Boolean)
                : [];
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
                            <div className="truncate font-semibold text-gray-900">
                              {prodTitle}
                            </div>

                            {r?.productCode ? (
                              <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] text-gray-700">
                                {r.productCode}
                              </span>
                            ) : null}

                            <StatusPill status={r?.status} />
                            <SourcePill source={r?.source} />

                            {hasImages ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700">
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
                                <span className="rounded-full border border-green-200 bg-green-50 px-2 py-1 text-[11px] text-green-700">
                                  Verified Purchase
                                </span>
                              </>
                            ) : null}
                          </div>

                          {r?.orderNumber ? (
                            <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                              <Package size={13} />
                              <span className="font-medium">{r.orderNumber}</span>
                            </div>
                          ) : null}

                          {r?.reviewText ? (
                            <div className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
                              {r.reviewText}
                            </div>
                          ) : (
                            <div className="mt-3 text-sm text-gray-400">
                              No text
                            </div>
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
                                  <div className="h-[72px] w-[72px] overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-sm">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={url}
                                      alt="review"
                                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                    />
                                  </div>
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openStatusConfirm(id, "approved")}
                            disabled={isSaving}
                            className="rounded-2xl bg-green-600 px-4 py-2.5 text-sm text-white hover:bg-green-700 disabled:opacity-60"
                          >
                            Approve
                          </button>

                          <button
                            type="button"
                            onClick={() => openStatusConfirm(id, "pending")}
                            disabled={isSaving}
                            className="rounded-2xl bg-yellow-600 px-4 py-2.5 text-sm text-white hover:bg-yellow-700 disabled:opacity-60"
                          >
                            Pending
                          </button>

                          <button
                            type="button"
                            onClick={() => openStatusConfirm(id, "rejected")}
                            disabled={isSaving}
                            className="rounded-2xl bg-red-600 px-4 py-2.5 text-sm text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            Reject
                          </button>

                          <button
                            type="button"
                            onClick={() => openDeleteConfirm(id)}
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>

                          <button
                            type="button"
                            onClick={() => toast("Hook product/details route here")}
                            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm hover:bg-gray-50"
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
        <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-100 px-4 py-4 sm:flex-row sm:px-6">
          <div className="text-xs text-gray-600">
            Showing {items?.length || 0} of {meta?.total || 0}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goPage((meta?.page || 1) - 1)}
              disabled={isLoading || (meta?.page || 1) <= 1}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft size={16} />
              Prev
            </button>

            <div className="px-2 text-sm text-gray-700">
              {meta?.page || 1} / {meta?.totalPages || 1}
            </div>

            <button
              type="button"
              onClick={() => goPage((meta?.page || 1) + 1)}
              disabled={
                isLoading || (meta?.page || 1) >= (meta?.totalPages || 1)
              }
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

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
        confirmText={
          confirm.type === "delete" || confirm.type === "bulkDelete"
            ? "Delete"
            : "Confirm"
        }
        onClose={() =>
          setConfirm({
            open: false,
            type: "",
            id: "",
            status: "",
          })
        }
        onConfirm={runConfirm}
      />
    </div>
  );
}