"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Minus,
  PackagePlus,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";

import { useOrderStore } from "@/store/orderStore";
import { useAdminProductStore } from "@/store/adminProductStore";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const clean = (value) => String(value ?? "").trim();

const getVariantSize = (variant) => {
  if (variant?.size) return clean(variant.size).toUpperCase();

  const attributes = Array.isArray(variant?.attributes)
    ? variant.attributes
    : [];

  return clean(
    attributes.find((attribute) =>
      ["size", "sizes"].includes(
        clean(attribute?.key).toLowerCase(),
      ),
    )?.value,
  ).toUpperCase();
};

const getAvailableStock = (product, variant = null) => {
  if (variant) {
    return Math.max(
      0,
      Number(variant.stock || 0) -
        Number(variant.reservedStock || 0),
    );
  }

  return Math.max(
    0,
    Number(product?.stock || 0) -
      Number(product?.reservedStock || 0),
  );
};

const isEditableOrder = (order) => {
  const blockedStatuses = new Set([
    "packed",
    "picked",
    "shipped",
    "out_for_delivery",
    "delivered",
    "cancelled",
    "rto",
    "returned",
    "refunded",
  ]);

  return !blockedStatuses.has(
    clean(order?.fulfillmentStatus).toLowerCase(),
  );
};

export default function OrderProductEditor({
  order,
  onRefresh,
}) {
  const {
    addProductToOrder,
    removeProductFromOrder,
  } = useOrderStore();

  const {
    products,
    loading: productsLoading,
    fetchProducts,
  } = useAdminProductStore();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] =
    useState(null);
  const [selectedVariantId, setSelectedVariantId] =
    useState("");
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false);
  const [removingLineId, setRemovingLineId] =
    useState("");

  const editable = useMemo(
    () => isEditableOrder(order),
    [order],
  );

  const orderItems = Array.isArray(order?.items)
    ? order.items
    : [];

  const selectedVariant = useMemo(() => {
    if (!selectedProduct || !selectedVariantId) {
      return null;
    }

    return (selectedProduct.variants || []).find(
      (variant) =>
        String(variant?._id) ===
        String(selectedVariantId),
    );
  }, [selectedProduct, selectedVariantId]);

  const selectedAvailableStock = useMemo(
    () =>
      getAvailableStock(
        selectedProduct,
        selectedVariant,
      ),
    [selectedProduct, selectedVariant],
  );

  const hasVariants =
    Array.isArray(selectedProduct?.variants) &&
    selectedProduct.variants.length > 0;

  useEffect(() => {
    if (!open) return;

    const timeout = setTimeout(() => {
      fetchProducts({
        page: 1,
        limit: 20,
        search: search || undefined,
        isActive: true,
        isDraft: false,
        sort: "newest",
      });
    }, 350);

    return () => clearTimeout(timeout);
  }, [open, search, fetchProducts]);

  const resetSelection = () => {
    setSelectedProduct(null);
    setSelectedVariantId("");
    setQuantity(1);
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setQuantity(1);

    const variants = Array.isArray(product?.variants)
      ? product.variants
      : [];

    if (variants.length === 1) {
      setSelectedVariantId(String(variants[0]._id));
    } else {
      setSelectedVariantId("");
    }
  };

  const handleAddProduct = async () => {
    if (!order?._id || !selectedProduct?._id) {
      return;
    }

    if (hasVariants && !selectedVariantId) {
      toast.error("Select a size");
      return;
    }

    if (selectedAvailableStock < quantity) {
      toast.error(
        `Only ${selectedAvailableStock} piece(s) available`,
      );
      return;
    }

    setSaving(true);

    try {
      await addProductToOrder(order._id, {
        productId: selectedProduct._id,
        variantId: selectedVariantId || undefined,
        quantity,
      });

      toast.success("Product added to order");
      resetSelection();
      setSearch("");
      setOpen(false);

      await onRefresh?.();
    } catch (error) {
      toast.error(
        error?.message || "Failed to add product",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (
    lineId,
    removeQuantity = null,
  ) => {
    if (!order?._id || !lineId) return;

    const actionText = removeQuantity
      ? "reduce this product quantity"
      : "remove this product";

    const confirmed = window.confirm(
      `Are you sure you want to ${actionText}?`,
    );

    if (!confirmed) return;

    setRemovingLineId(lineId);

    try {
      await removeProductFromOrder(
        order._id,
        lineId,
        removeQuantity,
      );

      toast.success(
        removeQuantity
          ? "Product quantity reduced"
          : "Product removed from order",
      );

      await onRefresh?.();
    } catch (error) {
      toast.error(
        error?.message || "Failed to remove product",
      );
    } finally {
      setRemovingLineId("");
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <PackagePlus size={18} />
            Order Products
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            Add, reduce or remove order products.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!editable}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
        >
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {!editable && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
          Products cannot be edited when order status is{" "}
          {order?.fulfillmentStatus}.
        </div>
      )}

      <div className="mt-5 space-y-3">
        {orderItems.map((item) => {
          const lineId = clean(item?.lineId);
          const quantity = Number(item?.quantity || 0);
          const isRemoving =
            removingLineId === lineId;

          return (
            <div
              key={lineId}
              className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 sm:flex-row sm:items-center"
            >
              <img
                src={
                  item?.productSnapshot?.thumbnail ||
                  "/placeholder.png"
                }
                alt={item?.productSnapshot?.title || ""}
                className="h-20 w-16 shrink-0 rounded-lg object-cover"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {item?.productSnapshot?.title ||
                    "Product"}
                </p>

                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                  <span>
                    Code:{" "}
                    {item?.productSnapshot?.productCode ||
                      "-"}
                  </span>

                  {item?.selectedSize && (
                    <span>
                      Size: {item.selectedSize}
                    </span>
                  )}

                  <span>Qty: {quantity}</span>

                  <span>{money(item?.price)}</span>
                </div>

                <p className="mt-1 text-sm font-semibold text-gray-800">
                  {money(item?.subtotal)}
                </p>
              </div>

              {editable && (
                <div className="flex shrink-0 items-center gap-2">
                  {quantity > 1 && (
                    <button
                      type="button"
                      disabled={isRemoving}
                      onClick={() =>
                        handleRemove(lineId, 1)
                      }
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                    >
                      {isRemoving ? (
                        <Loader2
                          size={14}
                          className="animate-spin"
                        />
                      ) : (
                        <Minus size={14} />
                      )}
                      Reduce
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={
                      isRemoving ||
                      orderItems.length === 1
                    }
                    onClick={() =>
                      handleRemove(lineId)
                    }
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isRemoving ? (
                      <Loader2
                        size={14}
                        className="animate-spin"
                      />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    Remove
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4 text-sm sm:grid-cols-5">
        <div>
          <p className="text-xs text-gray-400">
            Subtotal
          </p>
          <p className="font-semibold">
            {money(order?.subtotal)}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-400">
            Discount
          </p>
          <p className="font-semibold">
            -{money(order?.discount)}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-400">
            Shipping
          </p>
          <p className="font-semibold">
            {money(order?.shippingFee)}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-400">
            Tax
          </p>
          <p className="font-semibold">
            {money(order?.tax)}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-400">
            Final Payable
          </p>
          <p className="text-base font-bold text-gray-900">
            {money(order?.finalPayable)}
          </p>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="font-semibold text-gray-900">
                  Add Product
                </h3>
                <p className="text-xs text-gray-500">
                  Search and select a product.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  resetSelection();
                }}
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5">
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search title, code or SKU..."
                  className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none focus:border-black"
                />
              </div>

              <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
                {productsLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="animate-spin" />
                  </div>
                ) : products.length ? (
                  products.map((product) => {
                    const active =
                      String(selectedProduct?._id) ===
                      String(product?._id);

                    return (
                      <button
                        key={product._id}
                        type="button"
                        onClick={() =>
                          handleSelectProduct(product)
                        }
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                          active
                            ? "border-black bg-gray-50"
                            : "border-gray-100 hover:border-gray-300"
                        }`}
                      >
                        <img
                          src={
                            product.thumbnail ||
                            product.images?.[0] ||
                            "/placeholder.png"
                          }
                          alt={product.title}
                          className="h-16 w-14 rounded-lg object-cover"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {product.title}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {product.productCode} ·{" "}
                            {money(product.price)}
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            Stock:{" "}
                            {getAvailableStock(product)}
                          </p>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="py-10 text-center text-sm text-gray-500">
                    No products found.
                  </div>
                )}
              </div>

              {selectedProduct && (
                <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-semibold">
                    {selectedProduct.title}
                  </p>

                  {hasVariants && (
                    <div className="mt-4">
                      <label className="text-xs font-semibold text-gray-600">
                        Select Size
                      </label>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {selectedProduct.variants.map(
                          (variant) => {
                            const size =
                              getVariantSize(variant) ||
                              "Variant";

                            const available =
                              getAvailableStock(
                                selectedProduct,
                                variant,
                              );

                            const active =
                              String(selectedVariantId) ===
                              String(variant._id);

                            return (
                              <button
                                key={variant._id}
                                type="button"
                                disabled={available <= 0}
                                onClick={() =>
                                  setSelectedVariantId(
                                    String(variant._id),
                                  )
                                }
                                className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                                  active
                                    ? "border-black bg-black text-white"
                                    : "border-gray-200 bg-white text-gray-700"
                                } disabled:cursor-not-allowed disabled:opacity-40`}
                              >
                                {size} ({available})
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-gray-500">
                        Quantity
                      </p>

                      <div className="mt-1 flex items-center rounded-lg border border-gray-200 bg-white">
                        <button
                          type="button"
                          onClick={() =>
                            setQuantity((current) =>
                              Math.max(1, current - 1),
                            )
                          }
                          className="p-2"
                        >
                          <Minus size={15} />
                        </button>

                        <span className="min-w-10 text-center text-sm font-semibold">
                          {quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            setQuantity((current) =>
                              Math.min(
                                selectedAvailableStock,
                                current + 1,
                              ),
                            )
                          }
                          className="p-2"
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        Line Total
                      </p>
                      <p className="font-bold">
                        {money(
                          Number(
                            selectedProduct.price || 0,
                          ) * quantity,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  resetSelection();
                }}
                className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  saving ||
                  !selectedProduct ||
                  (hasVariants &&
                    !selectedVariantId) ||
                  selectedAvailableStock < quantity
                }
                onClick={handleAddProduct}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-black px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving && (
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                )}
                Add to Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}