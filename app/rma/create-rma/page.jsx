"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Check,
  Loader2,
  Package,
  RotateCcw,
  Search,
} from "lucide-react";
import { toast } from "react-hot-toast";

import { useOrderStore } from "@/store/orderStore";
import { useRmaStore } from "@/store/useRmaStore";

const SIZES = ["XS", "S", "M", "L", "XL"];

const REASONS = [
  {
    value: "wrong_size",
    label: "Size issue",
  },
  {
    value: "wrong_item",
    label: "Wrong item received",
  },
  {
    value: "damaged",
    label: "Damaged product",
  },
  {
    value: "defective",
    label: "Defective product",
  },
  {
    value: "quality_issue",
    label: "Quality issue",
  },
  {
    value: "changed_mind",
    label: "Product not as expected",
  },
  {
    value: "other",
    label: "Other",
  },
];

const normalize = (value) =>
  String(value ?? "").trim();

const lower = (value) =>
  normalize(value).toLowerCase();

const getItemTitle = (item) =>
  normalize(
    item?.productSnapshot?.title ||
    item?.title ||
    item?.productName ||
    "Product"
  );

const getItemImage = (item) => {
  const snapshot = item?.productSnapshot || {};

  const image =
    item?.image ||
    item?.imageUrl ||
    item?.productImage ||
    snapshot?.image ||
    snapshot?.imageUrl ||
    snapshot?.thumbnail ||
    snapshot?.images?.[0];

  if (typeof image === "string") {
    return image;
  }

  return (
    image?.url ||
    image?.secure_url ||
    image?.src ||
    ""
  );
};

const getItemSize = (item) => {
  const attributes = Array.isArray(
    item?.variant?.attributes
  )
    ? item.variant.attributes
    : [];

  const sizeAttribute = attributes.find(
    (attribute) =>
      lower(
        attribute?.key ||
        attribute?.attributeName ||
        attribute?.name
      ) === "size"
  );

  return normalize(
    sizeAttribute?.value ||
    sizeAttribute?.val ||
    item?.size ||
    item?.selectedSize ||
    item?.productSnapshot?.size
  );
};

const getProductId = (item) =>
  normalize(
    item?.productId ||
    item?.variant?.productId ||
    item?.productSnapshot?.productId
  );

const getSku = (item) =>
  normalize(
    item?.variant?.sku ||
    item?.sku ||
    item?.productSnapshot?.sku
  );

const getCustomerName = (order) =>
  normalize(
    order?.shippingAddressSnapshot?.fullName ||
    order?.customerSnapshot?.fullName ||
    order?.customer?.fullName ||
    order?.customerName
  );

const getCustomerPhone = (order) =>
  normalize(
    order?.shippingAddressSnapshot?.phone ||
    order?.customerSnapshot?.phone ||
    order?.customer?.phone ||
    order?.phone
  );

function ProductImage({ item }) {
  const image = getItemImage(item);

  if (!image) {
    return (
      <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-xl bg-gray-100">
        <Package
          size={20}
          className="text-gray-400"
        />
      </div>
    );
  }

  return (
    <img
      src={image}
      alt={getItemTitle(item)}
      className="h-20 w-16 shrink-0 rounded-xl bg-gray-100 object-cover"
    />
  );
}

export default function CreateRmaPage() {
  const {
    order,
    loading: orderLoading,
    fetchOrderByNumber,
  } = useOrderStore();

  const {
    createAdminRma,
    loading: rmaLoading,
  } = useRmaStore();

  const [orderNumber, setOrderNumber] =
    useState("");

  const [type, setType] =
    useState("return");

  const [reason, setReason] =
    useState("wrong_size");

  const [adminNote, setAdminNote] =
    useState("");
  const [allowException, setAllowException] =
    useState(false);

  const [exceptionReason, setExceptionReason] =
    useState("");

  const [selectedItems, setSelectedItems] =
    useState({});

  const [exchangeSize, setExchangeSize] =
    useState("");


  const items = useMemo(
    () =>
      Array.isArray(order?.items)
        ? order.items
        : [],
    [order]
  );

  const selectedEntries = useMemo(
    () =>
      Object.entries(selectedItems)
        .filter(
          ([, quantity]) =>
            Number(quantity) > 0
        )
        .map(([orderLineId, quantity]) => ({
          orderLineId,
          quantity: Number(quantity),
        })),
    [selectedItems]
  );

  const selectedExchangeItem =
    type === "exchange" &&
      selectedEntries.length === 1
      ? items.find(
        (item) =>
          normalize(item?.lineId) ===
          selectedEntries[0].orderLineId
      )
      : null;

  const resetForm = () => {
    setType("return");
    setReason("wrong_size");
    setAdminNote("");
    setSelectedItems({});
    setExchangeSize("");
    setAllowException(false);
    setExceptionReason("");
  };

  const searchOrder = async (event) => {
    event?.preventDefault();

    const value = normalize(orderNumber);

    if (!value) {
      toast.error("Enter an order number");
      return;
    }

    try {
      resetForm();

      const foundOrder =
        await fetchOrderByNumber(value);

      if (!foundOrder) {
        toast.error("Order not found");
        return;
      }

      toast.success(
        `Order ${foundOrder.orderNumber} found`
      );
    } catch (error) {
      toast.error(
        error?.message ||
        "Unable to find order"
      );
    }
  };

  const changeType = (nextType) => {
    setType(nextType);
    setSelectedItems({});
    setExchangeSize("");
  };

  const toggleProduct = (item) => {
    const lineId = normalize(item?.lineId);

    if (!lineId) {
      toast.error(
        "This product does not have a line ID"
      );
      return;
    }

    setSelectedItems((current) => {
      const alreadySelected =
        Number(current[lineId]) > 0;

      if (type === "exchange") {
        return alreadySelected
          ? {}
          : { [lineId]: 1 };
      }

      const next = { ...current };

      if (alreadySelected) {
        delete next[lineId];
      } else {
        next[lineId] = 1;
      }

      return next;
    });

    if (type === "exchange") {
      setExchangeSize("");
    }
  };

  const changeQuantity = (
    item,
    nextQuantity
  ) => {
    const lineId = normalize(item?.lineId);
    const purchasedQuantity = Number(
      item?.quantity || 1
    );

    const quantity = Math.max(
      1,
      Math.min(
        Number(nextQuantity || 1),
        purchasedQuantity
      )
    );

    setSelectedItems((current) => ({
      ...current,
      [lineId]: quantity,
    }));
  };

  const submitRma = async () => {
    if (!order?._id) {
      toast.error("Search an order first");
      return;
    }

    if (!selectedEntries.length) {
      toast.error(
        "Select at least one product"
      );
      return;
    }

    if (!reason) {
      toast.error("Select a reason");
      return;
    }

    if (!normalize(adminNote)) {
      toast.error(
        "Enter an internal admin note"
      );
      return;
    }

    if (
      type === "exchange" &&
      selectedEntries.length !== 1
    ) {
      toast.error(
        "Select one product for exchange"
      );
      return;
    }

    if (
      type === "exchange" &&
      !exchangeSize
    ) {
      toast.error(
        "Select the new exchange size"
      );
      return;
    }

    if (
      type === "exchange" &&
      !getProductId(selectedExchangeItem)
    ) {
      toast.error(
        "Product ID is missing in this order item"
      );
      return;
    }

    if (
      allowException &&
      !normalize(exceptionReason)
    ) {
      toast.error(
        "Enter exception approval reason"
      );
      return;
    }

    const payload = {
      type,
      reason,
      customerNote: "",
      adminNote: normalize(adminNote),
      allowException,
      exceptionReason: allowException
        ? normalize(exceptionReason)
        : "",

      items: selectedEntries.map(
        ({ orderLineId, quantity }) => ({
          orderLineId,
          quantity,
        })
      ),
    };

    if (type === "exchange") {
      payload.exchangeTo = {
        productId: getProductId(
          selectedExchangeItem
        ),

        attributes: [
          {
            key: "size",
            value: lower(exchangeSize),
          },
        ],

        note: `Admin size exchange to ${exchangeSize}`,
      };
    }

    try {
      const response =
        await createAdminRma(
          order._id,
          payload
        );

      toast.success(
        `${type === "exchange" ? "Exchange" : "Return"} RMA created successfully`
      );

      setSelectedItems({});
      setExchangeSize("");
      setAdminNote("");

      console.log(
        "Admin RMA created:",
        response
      );
    } catch (error) {
      toast.error(
        error?.message ||
        "Unable to create RMA"
      );
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div>
          <h1 className="text-xl font-bold text-gray-950 sm:text-2xl">
            Create RMA
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Create a return or exchange
            request without customer photos.
          </p>
        </div>

        {/* Search order */}
        <form
          onSubmit={searchOrder}
          className="mt-6 rounded-2xl border border-gray-200 bg-white p-4"
        >
          <label className="text-sm font-semibold text-gray-900">
            Order number
          </label>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                value={orderNumber}
                onChange={(event) =>
                  setOrderNumber(
                    event.target.value
                  )
                }
                placeholder="Example: 000509"
                className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-black"
              />
            </div>

            <button
              type="submit"
              disabled={orderLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {orderLoading ? (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <Search size={17} />
              )}

              Search Order
            </button>
          </div>
        </form>

        {order ? (
          <>
            {/* Order summary */}
            <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Order
                  </p>

                  <h2 className="mt-1 text-lg font-bold text-gray-950">
                    #{order.orderNumber}
                  </h2>
                </div>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold capitalize text-emerald-700">
                  {normalize(
                    order.fulfillmentStatus
                  ) || "Unknown"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 border-t border-gray-100 pt-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-gray-500">
                    Customer
                  </p>

                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {getCustomerName(order) ||
                      "Not available"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Phone
                  </p>

                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {getCustomerPhone(order) ||
                      "Not available"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Products
                  </p>

                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {items.length}
                  </p>
                </div>
              </div>
            </section>

            {/* Type */}
            <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-gray-950">
                What do you want to create?
              </h2>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    changeType("return")
                  }
                  className={`flex min-h-20 items-center gap-3 rounded-xl border p-3 text-left transition ${type === "return"
                      ? "border-black bg-black text-white"
                      : "border-gray-200 bg-white text-gray-900 hover:border-gray-400"
                    }`}
                >
                  <RotateCcw size={20} />

                  <div>
                    <p className="text-sm font-semibold">
                      Return
                    </p>

                    <p
                      className={`mt-0.5 text-xs ${type === "return"
                          ? "text-white/70"
                          : "text-gray-500"
                        }`}
                    >
                      Select one or more products
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    changeType("exchange")
                  }
                  className={`flex min-h-20 items-center gap-3 rounded-xl border p-3 text-left transition ${type === "exchange"
                      ? "border-black bg-black text-white"
                      : "border-gray-200 bg-white text-gray-900 hover:border-gray-400"
                    }`}
                >
                  <ArrowLeftRight size={20} />

                  <div>
                    <p className="text-sm font-semibold">
                      Exchange
                    </p>

                    <p
                      className={`mt-0.5 text-xs ${type === "exchange"
                          ? "text-white/70"
                          : "text-gray-500"
                        }`}
                    >
                      Select one product and new size
                    </p>
                  </div>
                </button>
              </div>
            </section>

            {/* Products */}
            <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-950">
                  Select product
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  {type === "exchange"
                    ? "Only one product can be exchanged at a time."
                    : "You can select multiple products for return."}
                </p>
              </div>

              <div className="mt-4 space-y-3">
                {items.map((item, index) => {
                  const lineId = normalize(
                    item?.lineId
                  );

                  const isSelected =
                    Number(
                      selectedItems[lineId]
                    ) > 0;

                  const purchasedQuantity =
                    Number(
                      item?.quantity || 1
                    );

                  return (
                    <div
                      key={
                        lineId ||
                        `${getItemTitle(item)}-${index}`
                      }
                      className={`rounded-xl border p-3 transition ${isSelected
                          ? "border-black bg-gray-50"
                          : "border-gray-200 bg-white"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            toggleProduct(item)
                          }
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${isSelected
                              ? "border-black bg-black text-white"
                              : "border-gray-300 bg-white"
                            }`}
                        >
                          {isSelected ? (
                            <Check size={15} />
                          ) : null}
                        </button>

                        <ProductImage
                          item={item}
                        />

                        <button
                          type="button"
                          onClick={() =>
                            toggleProduct(item)
                          }
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-sm font-semibold text-gray-950">
                            {getItemTitle(item)}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            SKU:{" "}
                            {getSku(item) || "-"}
                          </p>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                              Size:{" "}
                              {getItemSize(item) ||
                                "-"}
                            </span>

                            <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                              Purchased:{" "}
                              {purchasedQuantity}
                            </span>
                          </div>
                        </button>
                      </div>

                      {isSelected &&
                        type === "return" &&
                        purchasedQuantity > 1 ? (
                        <div className="mt-3 border-t border-gray-200 pt-3">
                          <label className="text-xs font-medium text-gray-700">
                            Return quantity
                          </label>

                          <select
                            value={
                              selectedItems[
                              lineId
                              ]
                            }
                            onChange={(event) =>
                              changeQuantity(
                                item,
                                event.target
                                  .value
                              )
                            }
                            className="mt-1 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-black sm:w-40"
                          >
                            {Array.from(
                              {
                                length:
                                  purchasedQuantity,
                              },
                              (_, quantityIndex) =>
                                quantityIndex + 1
                            ).map((quantity) => (
                              <option
                                key={quantity}
                                value={quantity}
                              >
                                {quantity}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Exchange size */}
            {type === "exchange" &&
              selectedExchangeItem ? (
              <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                <h2 className="text-sm font-semibold text-gray-950">
                  Select new size
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Current size:{" "}
                  {getItemSize(
                    selectedExchangeItem
                  ) || "-"}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {SIZES.map((size) => {
                    const currentSize = lower(
                      getItemSize(
                        selectedExchangeItem
                      )
                    );

                    const isCurrent =
                      currentSize ===
                      lower(size);

                    const isActive =
                      exchangeSize === size;

                    return (
                      <button
                        type="button"
                        key={size}
                        disabled={isCurrent}
                        onClick={() =>
                          setExchangeSize(size)
                        }
                        className={`h-11 min-w-12 rounded-xl border px-4 text-sm font-semibold transition ${isActive
                            ? "border-black bg-black text-white"
                            : "border-gray-200 bg-white text-gray-900"
                          } disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {/* Details */}
            <section className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-gray-900">
                    Reason
                  </label>

                  <select
                    value={reason}
                    onChange={(event) =>
                      setReason(
                        event.target.value
                      )
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-black"
                  >
                    {REASONS.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-900">
                    Internal admin note
                  </label>

                  <textarea
                    value={adminNote}
                    onChange={(event) =>
                      setAdminNote(
                        event.target.value
                      )
                    }
                    placeholder="Why is the admin creating this RMA?"
                    rows={3}
                    className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                  />
                </div>

                <div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={allowException}
                      onChange={(event) => {
                        setAllowException(
                          event.target.checked
                        );

                        if (!event.target.checked) {
                          setExceptionReason("");
                        }
                      }}
                      className="mt-1 h-4 w-4 accent-black"
                    />

                    <div>
                      <p className="text-sm font-semibold text-gray-950">
                        Allow exception return
                      </p>

                      <p className="mt-0.5 text-xs text-gray-600">
                        Bypass the normal RMA date window for this order.
                      </p>
                    </div>
                  </label>

                  {allowException ? (
                    <textarea
                      value={exceptionReason}
                      onChange={(event) =>
                        setExceptionReason(
                          event.target.value
                        )
                      }
                      placeholder="Why is this exception being approved?"
                      rows={2}
                      className="mt-3 w-full resize-none rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    />
                  ) : null}
                </div>
              </div>
            </section>

            {/* Submit */}
            <div className="sticky bottom-3 mt-4 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur">
              <button
                type="button"
                onClick={submitRma}
                disabled={
                  rmaLoading ||
                  !selectedEntries.length
                }
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {rmaLoading ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    Creating RMA...
                  </>
                ) : (
                  <>
                    {type === "exchange" ? (
                      <ArrowLeftRight
                        size={18}
                      />
                    ) : (
                      <RotateCcw
                        size={18}
                      />
                    )}

                    Create{" "}
                    {type === "exchange"
                      ? "Exchange"
                      : "Return"}{" "}
                    RMA
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-12 text-center">
            <Search
              size={28}
              className="mx-auto text-gray-300"
            />

            <p className="mt-3 text-sm font-semibold text-gray-800">
              Search an order to continue
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Enter the exact order number
              above.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
