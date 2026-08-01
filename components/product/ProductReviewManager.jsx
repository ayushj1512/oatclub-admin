"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ImagePlus,
  Loader2,
  MessageSquarePlus,
  Star,
  Trash2,
  X,
} from "lucide-react";

import MediaPickerModal from "@/components/media/MediaPickerModal";

const API_BASE = (
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  ""
).replace(/\/+$/, "");

const clean = (value) => String(value ?? "").trim();

const cleanMedia = (value) => {
  const items = Array.isArray(value) ? value : [];

  const unique = new Map();

  items.forEach((item) => {
    const media =
      typeof item === "string"
        ? {
            url: clean(item),
            publicId: "",
            resourceType: "image",
          }
        : {
            ...item,
            url: clean(item?.url),
            publicId: clean(item?.publicId),
            resourceType: clean(item?.resourceType) || "image",
          };

    if (!media.url) return;

    unique.set(media.url, media);
  });

  return Array.from(unique.values());
};

const getInitialForm = () => ({
  customerName: "",
  rating: 5,
  reviewText: "",
});

function RatingSelector({ value, onChange, disabled = false }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((rating) => {
        const active = rating <= (hovered || value);

        return (
          <button
            key={rating}
            type="button"
            disabled={disabled}
            onMouseEnter={() => setHovered(rating)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(rating)}
            className="rounded-md p-0.5 transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`${rating} star rating`}
          >
            <Star
              size={26}
              className={
                active
                  ? "fill-amber-400 text-amber-400"
                  : "text-gray-300"
              }
            />
          </button>
        );
      })}

      <span className="ml-2 text-sm font-medium text-gray-700">
        {value}/5
      </span>
    </div>
  );
}

function MediaCard({ media, onRemove }) {
  const isVideo =
    media?.resourceType === "video" ||
    /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(media?.url || "") ||
    String(media?.url || "").includes("/video/upload/");

  return (
    <div className="group relative overflow-hidden rounded-xl border bg-gray-50">
      <div className="aspect-square">
        {isVideo ? (
          <video
            src={media.url}
            muted
            controls
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <img
            src={media.url}
            alt={media?.originalName || "Review media"}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="absolute right-2 top-2 rounded-full bg-white/95 p-1.5 text-red-600 shadow transition hover:bg-red-50"
        aria-label="Remove media"
      >
        <Trash2 size={14} />
      </button>

      <span className="absolute bottom-2 left-2 rounded-full bg-black/75 px-2 py-1 text-[10px] font-medium text-white">
        {isVideo ? "Video" : "Image"}
      </span>
    </div>
  );
}

export default function ProductReviewManager({
  productId,
  productCode = "",
  productTitle = "",
  onCreated,
}) {
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  const [form, setForm] = useState(getInitialForm);
  const [media, setMedia] = useState([]);

  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const images = media.filter(
    (item) => item?.resourceType !== "video",
  );

  const videos = media.filter(
    (item) => item?.resourceType === "video",
  );

  const canSubmit =
    clean(productId) &&
    form.rating >= 1 &&
    form.rating <= 5 &&
    clean(form.customerName).length >= 2 &&
    clean(form.reviewText).length >= 3 &&
    !submitting;

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (message.text) {
      setMessage({
        type: "",
        text: "",
      });
    }
  };

  const handleMediaSelect = (selected) => {
    const selectedItems = cleanMedia(
      Array.isArray(selected) ? selected : [selected],
    );

    setMedia((previous) =>
      cleanMedia([...previous, ...selectedItems]).slice(0, 5),
    );

    setMediaPickerOpen(false);
  };

  const removeMedia = (url) => {
    setMedia((previous) =>
      previous.filter((item) => item.url !== url),
    );
  };

  const resetForm = () => {
    setForm(getInitialForm());
    setMedia([]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!clean(productId)) {
      setMessage({
        type: "error",
        text: "Product ID is missing.",
      });
      return;
    }

    if (clean(form.customerName).length < 2) {
      setMessage({
        type: "error",
        text: "Enter a display name.",
      });
      return;
    }

    if (clean(form.reviewText).length < 3) {
      setMessage({
        type: "error",
        text: "Review text must contain at least 3 characters.",
      });
      return;
    }

    try {
      setSubmitting(true);
      setMessage({
        type: "",
        text: "",
      });

      const payload = {
        product: productId,
        productCode,
        customerName: clean(form.customerName),
        rating: Number(form.rating),
        reviewText: clean(form.reviewText),
        verifiedPurchase: false,

        images: images.map((item) => item.url),
        videos: videos.map((item) => item.url),
      };

      const response = await fetch(
        `${API_BASE}/api/reviews/rating`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Failed to create product review",
        );
      }

      setMessage({
        type: "success",
        text: "Review added and approved successfully.",
      });

      resetForm();
      onCreated?.(data?.review || data);
    } catch (error) {
      setMessage({
        type: "error",
        text: error?.message || "Failed to create review.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <MessageSquarePlus size={20} />
              Add Product Feedback
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Add approved admin-curated feedback for this product.
            </p>
          </div>

          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
            Auto-approved
          </span>
        </div>

        {productTitle || productCode ? (
          <div className="rounded-xl bg-gray-50 px-4 py-3">
            {productTitle ? (
              <p className="font-medium text-gray-900">
                {productTitle}
              </p>
            ) : null}

            {productCode ? (
              <p className="mt-0.5 text-xs text-gray-500">
                Product code: {productCode}
              </p>
            ) : null}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-gray-700">
                Display name
              </span>

              <input
                type="text"
                value={form.customerName}
                onChange={(event) =>
                  updateField("customerName", event.target.value)
                }
                placeholder="Example: Priya S."
                maxLength={80}
                disabled={submitting}
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-black disabled:bg-gray-50"
              />
            </label>

            <div className="space-y-1.5">
              <span className="text-sm font-medium text-gray-700">
                Rating
              </span>

              <div className="flex min-h-11 items-center rounded-xl border border-gray-200 px-3">
                <RatingSelector
                  value={form.rating}
                  disabled={submitting}
                  onChange={(rating) =>
                    updateField("rating", rating)
                  }
                />
              </div>
            </div>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-700">
              Feedback
            </span>

            <textarea
              value={form.reviewText}
              onChange={(event) =>
                updateField("reviewText", event.target.value)
              }
              placeholder="Write the product feedback..."
              rows={5}
              maxLength={1000}
              disabled={submitting}
              className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-3 text-sm outline-none transition focus:border-black disabled:bg-gray-50"
            />

            <div className="flex justify-between gap-3 text-xs text-gray-400">
              <span>Minimum 3 characters</span>
              <span>{form.reviewText.length}/1000</span>
            </div>
          </label>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Review media
                </p>

                <p className="text-xs text-gray-400">
                  Select up to 5 images or videos from Media Library.
                </p>
              </div>

              <button
                type="button"
                disabled={submitting || media.length >= 5}
                onClick={() => setMediaPickerOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-black hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ImagePlus size={16} />
                Add Media
              </button>
            </div>

            {media.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {media.map((item) => (
                  <MediaCard
                    key={item.url}
                    media={item}
                    onRemove={() => removeMedia(item.url)}
                  />
                ))}
              </div>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={() => setMediaPickerOpen(true)}
                className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 px-5 py-8 text-center transition hover:border-gray-500 disabled:opacity-50"
              >
                <ImagePlus size={24} className="text-gray-400" />

                <span className="mt-2 text-sm font-medium text-gray-700">
                  Select from Media Library
                </span>

                <span className="mt-1 text-xs text-gray-400">
                  Upload new media or select existing media
                </span>
              </button>
            )}
          </div>

          {message.text ? (
            <div
              className={[
                "flex items-start gap-2 rounded-xl px-4 py-3 text-sm",
                message.type === "success"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700",
              ].join(" ")}
            >
              {message.type === "success" ? (
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0"
                />
              ) : (
                <X size={18} className="mt-0.5 shrink-0" />
              )}

              <span>{message.text}</span>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <p className="text-xs text-gray-500">
              Media is managed through the central Media Library.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetForm}
                disabled={submitting}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Clear
              </button>

              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Add Approved Review
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </section>

      <MediaPickerModal
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={handleMediaSelect}
        multiple
        folder="oatclub/reviews"
      />
    </>
  );
}