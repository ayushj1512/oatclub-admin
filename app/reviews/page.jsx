"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAdminReviews,
  setAdminReviewQuery,
  toggleSelect,
  selectAllOnPage,
  clearSelection,
  adminBulkUpdateStatus,
  adminBulkDelete,
  adminCreateReview,
  adminUpdateReview,
  adminDeleteReview,
  clearAdminReviewError,
} from "@/store/adminReviewsSlice";

const StatusBadge = ({ status }) => {
  const cls =
    status === "approved"
      ? "bg-green-100 text-green-700"
      : status === "rejected"
      ? "bg-red-100 text-red-700"
      : "bg-yellow-100 text-yellow-800";

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
};

const Input = (props) => (
  <input
    {...props}
    className={`w-full rounded border px-3 py-2 text-sm outline-none focus:ring ${
      props.className || ""
    }`}
  />
);

const Select = (props) => (
  <select
    {...props}
    className={`w-full rounded border px-3 py-2 text-sm outline-none focus:ring ${
      props.className || ""
    }`}
  />
);

const Modal = ({ open, title, children, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-base font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-sm hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

function ReviewForm({ initial, onSubmit, submitting }) {
  const [form, setForm] = useState(() => ({
    product: initial?.product?._id || initial?.product || "",
    customer: initial?.customer?._id || initial?.customer || "",
    rating: initial?.rating ?? 5,
    status: initial?.status ?? "approved",
    title: initial?.title ?? "",
    reviewText: initial?.reviewText ?? "",
    verifiedPurchase: initial?.verifiedPurchase ?? false,
  }));

  useEffect(() => {
    setForm({
      product: initial?.product?._id || initial?.product || "",
      customer: initial?.customer?._id || initial?.customer || "",
      rating: initial?.rating ?? 5,
      status: initial?.status ?? "approved",
      title: initial?.title ?? "",
      reviewText: initial?.reviewText ?? "",
      verifiedPurchase: initial?.verifiedPurchase ?? false,
    });
  }, [initial]);

  const update = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  return (
    <form
      className="grid grid-cols-1 gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      {/* IDs because admin can add reviews too */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Product ID
          </label>
          <Input
            value={form.product}
            onChange={(e) => update("product", e.target.value)}
            placeholder="Mongo ObjectId"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Customer ID
          </label>
          <Input
            value={form.customer}
            onChange={(e) => update("customer", e.target.value)}
            placeholder="Mongo ObjectId"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Rating
          </label>
          <Input
            type="number"
            min={1}
            max={5}
            value={form.rating}
            onChange={(e) => update("rating", e.target.value)}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Status
          </label>
          <Select
            value={form.status}
            onChange={(e) => update("status", e.target.value)}
          >
            <option value="approved">approved</option>
            <option value="pending">pending</option>
            <option value="rejected">rejected</option>
          </Select>
        </div>

        <div className="flex items-center gap-2 pt-6">
          <input
            id="vp"
            type="checkbox"
            checked={!!form.verifiedPurchase}
            onChange={(e) => update("verifiedPurchase", e.target.checked)}
          />
          <label htmlFor="vp" className="text-sm">
            Verified Purchase
          </label>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Title
        </label>
        <Input
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          placeholder="Amazing quality!"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">
          Review Text
        </label>
        <textarea
          className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring"
          rows={5}
          value={form.reviewText}
          onChange={(e) => update("reviewText", e.target.value)}
          placeholder="Write review..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}

export default function ReviewsPage() {
  const dispatch = useDispatch();
  const { items, meta, query, selectedIds, loading, error } = useSelector(
    (s) => s.adminReviews
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const selectedSet = useMemo(
    () => new Set(selectedIds.map(String)),
    [selectedIds]
  );

  const load = (patch = {}) => {
    const nextQuery = { ...query, ...patch };
    dispatch(setAdminReviewQuery(nextQuery));
    dispatch(fetchAdminReviews(nextQuery));
  };

  useEffect(() => {
    // initial load (latest + page 1)
    dispatch(fetchAdminReviews(query));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onEdit = (r) => {
    setEditing(r);
    setEditOpen(true);
  };

  const onDelete = (id) => {
    if (!confirm("Delete this review?")) return;
    dispatch(adminDeleteReview(id));
  };

  const bulkStatus = (status) => {
    if (!selectedIds.length) return alert("Select reviews first");
    dispatch(adminBulkUpdateStatus({ ids: selectedIds, status }));
  };

  const bulkDelete = () => {
    if (!selectedIds.length) return alert("Select reviews first");
    if (!confirm(`Delete ${selectedIds.length} reviews?`)) return;
    dispatch(adminBulkDelete({ ids: selectedIds }));
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Reviews</h1>
          <p className="text-sm text-gray-600">
            Manage all reviews (add / edit / delete / approve / reject).
          </p>
        </div>

        <div className="flex gap-2">
          <a
            href="/reviews/analytics"
            className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Analytics
          </a>
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded bg-black px-3 py-2 text-sm font-medium text-white"
          >
            + Add Review
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border bg-white p-4 md:grid-cols-6">
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Search (title/text/customer/productCode)
          </label>
          <Input
            value={query.q}
            onChange={(e) => dispatch(setAdminReviewQuery({ q: e.target.value }))}
            placeholder="eg: amazing, ayush, 00012..."
            onKeyDown={(e) => e.key === "Enter" && load({ page: 1 })}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Status
          </label>
          <Select
            value={query.status}
            onChange={(e) =>
              dispatch(setAdminReviewQuery({ status: e.target.value }))
            }
          >
            <option value="">all</option>
            <option value="approved">approved</option>
            <option value="pending">pending</option>
            <option value="rejected">rejected</option>
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Rating
          </label>
          <Select
            value={query.rating}
            onChange={(e) =>
              dispatch(setAdminReviewQuery({ rating: e.target.value }))
            }
          >
            <option value="">all</option>
            <option value="5">5</option>
            <option value="4">4</option>
            <option value="3">3</option>
            <option value="2">2</option>
            <option value="1">1</option>
          </Select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Sort
          </label>
          <Select
            value={query.sort}
            onChange={(e) => dispatch(setAdminReviewQuery({ sort: e.target.value }))}
          >
            <option value="latest">latest</option>
            <option value="oldest">oldest</option>
            <option value="ratingHigh">rating high</option>
            <option value="ratingLow">rating low</option>
          </Select>
        </div>

        <div className="flex items-end gap-2">
          <button
            onClick={() => load({ page: 1 })}
            className="w-full rounded bg-black px-3 py-2 text-sm font-medium text-white"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Bulk bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-gray-600">
          Total: <span className="font-medium">{meta.total}</span>
          {selectedIds.length ? (
            <>
              {" "}
              • Selected:{" "}
              <span className="font-medium">{selectedIds.length}</span>
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => dispatch(selectAllOnPage())}
            className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Select page
          </button>
          <button
            onClick={() => dispatch(clearSelection())}
            className="rounded border px-3 py-2 text-sm hover:bg-gray-50"
          >
            Clear
          </button>
          <button
            onClick={() => bulkStatus("approved")}
            className="rounded bg-green-600 px-3 py-2 text-sm font-medium text-white"
          >
            Approve
          </button>
          <button
            onClick={() => bulkStatus("rejected")}
            className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white"
          >
            Reject
          </button>
          <button
            onClick={() => bulkStatus("pending")}
            className="rounded bg-yellow-600 px-3 py-2 text-sm font-medium text-white"
          >
            Pending
          </button>
          <button
            onClick={bulkDelete}
            className="rounded bg-black px-3 py-2 text-sm font-medium text-white"
          >
            Delete selected
          </button>
        </div>
      </div>

      {/* Error */}
      {error ? (
        <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => dispatch(clearAdminReviewError())}
              className="rounded px-2 py-1 hover:bg-red-100"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-3">Sel</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={8}>
                    Loading...
                  </td>
                </tr>
              ) : items.length ? (
                items.map((r) => (
                  <tr key={r._id} className="border-t">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedSet.has(String(r._id))}
                        onChange={() => dispatch(toggleSelect(String(r._id)))}
                      />
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium">{r?.product?.title || "—"}</div>
                      <div className="text-xs text-gray-500">
                        code: {r.productCode || r?.product?.productCode || "—"}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium">{r.customerName || r?.customer?.name || "—"}</div>
                      <div className="text-xs text-gray-500">{r.customerEmail || r?.customer?.email || ""}</div>
                    </td>

                    <td className="px-4 py-3 font-medium">{r.rating}</td>

                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>

                    <td className="px-4 py-3">
                      <div className="max-w-[260px] truncate">{r.title || "—"}</div>
                      {r.reviewText ? (
                        <div className="max-w-[260px] truncate text-xs text-gray-500">
                          {r.reviewText}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3 text-xs text-gray-600">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => onEdit(r)}
                          className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(r._id)}
                          className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500" colSpan={8}>
                    No reviews found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
          <div className="text-gray-600">
            Page <span className="font-medium">{meta.page}</span> of{" "}
            <span className="font-medium">{meta.totalPages}</span>
          </div>

          <div className="flex gap-2">
            <button
              disabled={meta.page <= 1}
              onClick={() => load({ page: meta.page - 1 })}
              className="rounded border px-3 py-2 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              disabled={meta.page >= meta.totalPages}
              onClick={() => load({ page: meta.page + 1 })}
              className="rounded border px-3 py-2 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Create modal */}
      <Modal
        open={createOpen}
        title="Add Review"
        onClose={() => setCreateOpen(false)}
      >
        <ReviewForm
          submitting={false}
          onSubmit={async (data) => {
            await dispatch(adminCreateReview(data));
            setCreateOpen(false);
            load({ page: 1 });
          }}
        />
      </Modal>

      {/* Edit modal */}
      <Modal
        open={editOpen}
        title="Edit Review"
        onClose={() => {
          setEditOpen(false);
          setEditing(null);
        }}
      >
        <ReviewForm
          initial={editing}
          submitting={false}
          onSubmit={async (data) => {
            await dispatch(adminUpdateReview({ id: editing._id, data }));
            setEditOpen(false);
            setEditing(null);
          }}
        />
      </Modal>
    </div>
  );
}
