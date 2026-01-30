// app/reviews/add/page.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useAdminProductStore } from "@/store/adminProductStore"; // ✅ Zustand product store

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const REVIEWS_API = `${BASE_URL}/api/reviews`;

/* ------------------------------------------------------------
  Tiny UI helpers
------------------------------------------------------------ */

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

const Button = ({ variant = "solid", className = "", ...props }) => {
  const base =
    "rounded px-3 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "solid"
      ? "bg-black text-white hover:opacity-90"
      : "border hover:bg-gray-50";
  return <button {...props} className={`${base} ${styles} ${className}`} />;
};

export default function AddReviewPage() {
  /* ------------------------------------------------------------
    ✅ Product Store (Zustand)
    - loads products for dropdown
  ------------------------------------------------------------ */
  const {
    products,
    loading: productsLoading,
    error: productsError,
    fetchAllProducts,
  } = useAdminProductStore();

  /* ------------------------------------------------------------
    Form state
  ------------------------------------------------------------ */
  const [productId, setProductId] = useState("");
  const [customerId, setCustomerId] = useState("");

  const [rating, setRating] = useState(5);
  const [status, setStatus] = useState("approved");
  const [verifiedPurchase, setVerifiedPurchase] = useState(false);

  const [title, setTitle] = useState("");
  const [reviewText, setReviewText] = useState("");

  // optional snapshots (backend snapshots anyway)
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // optional images
  const [images, setImages] = useState([]);

  /* ------------------------------------------------------------
    Derived: sorted products for dropdown
  ------------------------------------------------------------ */
  const productOptions = useMemo(() => {
    return (products || [])
      .slice()
      .sort((a, b) => String(a?.title || "").localeCompare(String(b?.title || "")));
  }, [products]);

  /* ------------------------------------------------------------
    Load products once
  ------------------------------------------------------------ */
  useEffect(() => {
    fetchAllProducts().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------
    Helpers
  ------------------------------------------------------------ */
  const reset = () => {
    setProductId("");
    setCustomerId("");
    setRating(5);
    setStatus("approved");
    setVerifiedPurchase(false);
    setTitle("");
    setReviewText("");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setImages([]);
  };

  const submit = async () => {
    if (!productId) return toast.error("Select a product");
    if (!customerId) return toast.error("Customer ID is required");

    const r = Number(rating);
    if (Number.isNaN(r) || r < 1 || r > 5) return toast.error("Rating must be 1-5");

    try {
      const hasImages = images?.length > 0;

      // ✅ Review payload (json OR multipart)
      const body = {
        product: productId,
        customer: customerId,
        rating: r,
        status,
        verifiedPurchase: !!verifiedPurchase,
        title,
        reviewText,

        // optional snapshots
        customerName,
        customerEmail,
        customerPhone,
      };

      const payload = hasImages ? new FormData() : null;

      if (hasImages) {
        Object.entries(body).forEach(([k, v]) => payload.append(k, String(v ?? "")));
        // ✅ backend multer should be: upload.array("images")
        images.forEach((file) => payload.append("images", file));
      }

      const res = await fetch(REVIEWS_API, {
        method: "POST",
        credentials: "include",
        headers: hasImages ? undefined : { "Content-Type": "application/json" },
        body: hasImages ? payload : JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to add review");

      toast.success("Review added ✅");
      reset();
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Failed to add review");
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Add Review</h1>
        <p className="text-sm text-gray-600">
          Admin can create reviews manually (useful for importing offline reviews).
        </p>
      </div>

      {/* product store error */}
      {productsError ? (
        <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Failed to load products: {productsError}
        </div>
      ) : null}

      <div className="rounded-xl border bg-white p-4 md:p-6">
        {/* Product + customer */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {/* ✅ Product dropdown (from store) */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Product
            </label>

            <Select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              disabled={productsLoading}
            >
              <option value="">
                {productsLoading ? "Loading products..." : "Select product"}
              </option>

              {productOptions.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.title} ({p.productCode})
                </option>
              ))}
            </Select>

            {/* manual fallback */}
            <div className="mt-2 text-xs text-gray-500">Or paste Product ObjectId</div>
            <Input
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="Product ObjectId"
              className="mt-2"
            />
          </div>

          {/* Customer */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Customer ID
            </label>
            <Input
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="Customer ObjectId"
              required
            />

            {/* optional snapshot fields */}
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Name (optional)"
              />
              <Input
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Email (optional)"
              />
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Phone (optional)"
              />
            </div>

            <div className="mt-1 text-xs text-gray-500">
              * Optional — backend will snapshot from Customer model anyway.
            </div>
          </div>
        </div>

        {/* Rating / status / verified */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Rating (1-5)
            </label>
            <Input
              type="number"
              min={1}
              max={5}
              value={rating}
              onChange={(e) => setRating(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Status</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="approved">approved</option>
              <option value="pending">pending</option>
              <option value="rejected">rejected</option>
            </Select>
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              id="vp"
              type="checkbox"
              checked={verifiedPurchase}
              onChange={(e) => setVerifiedPurchase(e.target.checked)}
            />
            <label htmlFor="vp" className="text-sm">
              Verified Purchase
            </label>
          </div>
        </div>

        {/* Title + text */}
        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-gray-600">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Amazing quality!"
          />
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Review Text
          </label>
          <textarea
            className="w-full rounded border px-3 py-2 text-sm outline-none focus:ring"
            rows={5}
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Write review..."
          />
        </div>

        {/* Images */}
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Images (optional)
          </label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setImages(Array.from(e.target.files || []))}
          />
          <div className="mt-1 text-xs text-gray-500">
            Backend should use <b>upload.array("images")</b> so <b>req.files</b> works.
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={reset}>
            Reset
          </Button>
          <Button onClick={submit} disabled={productsLoading}>
            Create Review
          </Button>
        </div>
      </div>
    </div>
  );
}
