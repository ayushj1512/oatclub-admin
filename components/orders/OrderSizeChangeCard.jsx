// components/orders/OrderSizeChangeCard.jsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, Ruler, Save } from "lucide-react";
import { toast } from "react-hot-toast";
import { useOrderStore } from "@/store/orderStore";

const API = (process.env.NEXT_PUBLIC_API_URL || "").trim();

const clean = (value) => String(value ?? "").trim();

const getAttributes = (variant = {}) => {
  const raw = variant?.attributes;

  if (Array.isArray(raw)) {
    return raw
      .filter(
        (attribute) =>
          attribute?.key != null &&
          attribute?.value != null,
      )
      .map((attribute) => ({
        key: clean(attribute.key),
        value: clean(attribute.value),
      }));
  }

  if (raw && typeof raw === "object") {
    return Object.entries(raw).map(([key, value]) => ({
      key: clean(key),
      value: clean(value),
    }));
  }

  return [];
};

const getAttributeValue = (variant, keys = []) => {
  const allowedKeys = keys.map((key) =>
    clean(key).toLowerCase(),
  );

  const attribute = getAttributes(variant).find((item) =>
    allowedKeys.includes(clean(item.key).toLowerCase()),
  );

  return clean(attribute?.value);
};

const getVariantSize = (variant = {}) => {
  const size = getAttributeValue(variant, ["size"]);

  if (size) return size;

  const skuParts = clean(variant?.sku)
    .toUpperCase()
    .split("-")
    .filter(Boolean);

  const allowedSizes = [
    "XXS",
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "3XL",
    "4XL",
    "5XL",
    "FREE",
  ];

  return (
    [...skuParts]
      .reverse()
      .find((part) => allowedSizes.includes(part)) || ""
  );
};

const getProductFromResponse = (data) =>
  data?.product || data?.data?.product || data?.data || data || null;

const getItemImage = (item = {}) =>
  item?.productSnapshot?.thumbnail ||
  item?.productSnapshot?.images?.[0] ||
  "";

const canChangeSize = (order = {}) => {
  const status = clean(
    order?.fulfillmentStatus || "processing",
  ).toLowerCase();

  return (
    ["processing", "packed"].includes(status) &&
    order?.cancellation?.isCancelled !== true
  );
};

export default function OrderSizeChangeCard({
  order,
  onRefresh,
}) {
  const changeOrderItemSize = useOrderStore(
    (state) => state.changeOrderItemSize,
  );

  const items = useMemo(
    () => (Array.isArray(order?.items) ? order.items : []),
    [order?.items],
  );

  const [selectedLineId, setSelectedLineId] = useState("");
  const [selectedVariantId, setSelectedVariantId] =
    useState("");

  const [product, setProduct] = useState(null);
  const [loadingVariants, setLoadingVariants] =
    useState(false);
  const [saving, setSaving] = useState(false);

  const editable = canChangeSize(order);

  const selectedItem = useMemo(
    () =>
      items.find(
        (item) =>
          clean(item?.lineId) === clean(selectedLineId),
      ) || null,
    [items, selectedLineId],
  );

  const variants = useMemo(
    () =>
      Array.isArray(product?.variants)
        ? product.variants
        : [],
    [product],
  );

  const sizeVariants = useMemo(() => {
    return variants
      .map((variant) => ({
        ...variant,
        size: getVariantSize(variant),
      }))
      .filter((variant) => variant.size);
  }, [variants]);

  const selectedTargetVariant = useMemo(
    () =>
      sizeVariants.find(
        (variant) =>
          clean(variant?._id) ===
          clean(selectedVariantId),
      ) || null,
    [sizeVariants, selectedVariantId],
  );

  useEffect(() => {
    if (!selectedLineId && items.length) {
      setSelectedLineId(clean(items[0]?.lineId));
    }
  }, [items, selectedLineId]);

  useEffect(() => {
    const fetchProduct = async () => {
      const productId = clean(selectedItem?.productId);

      setProduct(null);
      setSelectedVariantId("");

      if (!productId) return;

      setLoadingVariants(true);

      try {
        const response = await fetch(
          `${API}/api/products/${encodeURIComponent(
            productId,
          )}`,
          {
            cache: "no-store",
          },
        );

        const data = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Failed to load product variants",
          );
        }

        setProduct(getProductFromResponse(data));
      } catch (error) {
        toast.error(
          error?.message ||
            "Failed to load available sizes",
        );
      } finally {
        setLoadingVariants(false);
      }
    };

    fetchProduct();
  }, [selectedItem?.productId]);

  const handleChangeSize = async () => {
    if (!order?._id) {
      toast.error("Order ID is missing");
      return;
    }

    if (!selectedItem?.lineId) {
      toast.error("Select an order item");
      return;
    }

    if (!selectedVariantId) {
      toast.error("Select a new size");
      return;
    }

    if (
      clean(selectedItem?.variant?.variantId) ===
      clean(selectedVariantId)
    ) {
      toast.error("This size is already selected");
      return;
    }

    setSaving(true);

    try {
      await changeOrderItemSize(
        order._id,
        selectedItem.lineId,
        selectedVariantId,
      );

      toast.success(
        `Size changed to ${
          selectedTargetVariant?.size || "selected size"
        }`,
      );

      setSelectedVariantId("");

      if (typeof onRefresh === "function") {
        await onRefresh();
      }
    } catch (error) {
      toast.error(
        error?.message || "Failed to change size",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!items.length) return null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
          <Ruler size={19} className="text-gray-700" />
        </div>

        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Change Product Size
          </h2>

          <p className="mt-0.5 text-xs text-gray-500">
            Replace the selected variant without changing
            quantity or price.
          </p>
        </div>
      </div>

      {!editable && (
        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          Size change is unavailable for{" "}
          <span className="font-semibold">
            {clean(order?.fulfillmentStatus) ||
              "this order status"}
          </span>
          .
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-gray-600">
            Order Product
          </label>

          <select
            value={selectedLineId}
            onChange={(event) =>
              setSelectedLineId(event.target.value)
            }
            disabled={!editable || saving}
            className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm outline-none transition focus:border-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {items.map((item) => (
              <option
                key={item.lineId}
                value={item.lineId}
              >
                {item?.productSnapshot?.productCode
                  ? `${item.productSnapshot.productCode} — `
                  : ""}
                {item?.productSnapshot?.title ||
                  "Product"}
                {item?.selectedSize
                  ? ` (${item.selectedSize})`
                  : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-600">
            New Size
          </label>

          <div className="relative mt-2">
            <select
              value={selectedVariantId}
              onChange={(event) =>
                setSelectedVariantId(
                  event.target.value,
                )
              }
              disabled={
                !editable ||
                saving ||
                loadingVariants ||
                !selectedItem
              }
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm outline-none transition focus:border-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">
                {loadingVariants
                  ? "Loading sizes..."
                  : "Select new size"}
              </option>

              {sizeVariants.map((variant) => {
                const isCurrent =
                  clean(
                    selectedItem?.variant?.variantId,
                  ) === clean(variant?._id);

                return (
                  <option
                    key={variant._id}
                    value={variant._id}
                    disabled={isCurrent}
                  >
                    {variant.size}
                    {variant.sku
                      ? ` — ${variant.sku}`
                      : ""}
                    {isCurrent ? " (Current)" : ""}
                  </option>
                );
              })}
            </select>

            {loadingVariants && (
              <Loader2
                size={16}
                className="absolute right-10 top-3.5 animate-spin text-gray-400"
              />
            )}
          </div>
        </div>
      </div>

      {selectedItem && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
          {getItemImage(selectedItem) ? (
            <img
              src={getItemImage(selectedItem)}
              alt={
                selectedItem?.productSnapshot?.title ||
                "Product"
              }
              className="h-14 w-14 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white text-xs text-gray-400">
              No image
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">
              {selectedItem?.productSnapshot?.title ||
                "Product"}
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span>
                Code:{" "}
                {selectedItem?.productSnapshot
                  ?.productCode || "-"}
              </span>

              <span>•</span>

              <span>
                Qty: {selectedItem?.quantity || 1}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold">
              {selectedItem?.selectedSize || "-"}
            </span>

            <ArrowRight
              size={15}
              className="text-gray-400"
            />

            <span className="rounded-lg bg-black px-3 py-1.5 text-xs font-semibold text-white">
              {selectedTargetVariant?.size || "New"}
            </span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleChangeSize}
        disabled={
          !editable ||
          saving ||
          loadingVariants ||
          !selectedVariantId
        }
        className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? (
          <>
            <Loader2 size={17} className="animate-spin" />
            Changing Size...
          </>
        ) : (
          <>
            <Save size={17} />
            Change Size
          </>
        )}
      </button>
    </div>
  );
}