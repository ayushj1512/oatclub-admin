"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CheckCircle2,
  IndianRupee,
  Loader2,
  MessageCircle,
  Package,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  Undo2,
} from "lucide-react";
import { useShiprocketStore } from "@/store/ShipRocketStore";

const STOREFRONT_URL = (
  process.env.NEXT_PUBLIC_STOREFRONT_URL ||
  "https://oatclub.in"
).replace(/\/+$/, "");

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const phoneNumber = (value) => {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .replace(/^0+/, "");

  return digits.length === 10
    ? `91${digits}`
    : digits;
};

const today = () =>
  new Date().toISOString().split("T")[0];

export default function ShiprocketNdrPage() {
  const {
    ndrList,
    ndrSummary,
    ndrLoading,
    ndrError,
    ndrResult,
    syncNdrOrders,
    submitNdrAction,
    clearNdrError,
    clearNdrResult,
  } = useShiprocketStore();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] =
    useState("");
  const [form, setForm] = useState({
    phone: "",
    address1: "",
    address2: "",
    deferredDate: "",
    comments: "",
  });

  const syncOrders = () =>
    syncNdrOrders().catch(() => { });

  useEffect(() => {
    syncOrders();
  }, []);

  const orders = Array.isArray(ndrList)
    ? ndrList
    : [];

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return orders;

    return orders.filter((order) =>
      [
        order.orderNumber,
        order.ndr?.awb,
        order.customer?.name,
        order.customer?.phone,
        order.ndr?.reason,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [orders, search]);

  const selectOrder = (order) => {
    setSelected(order);
    setForm({
      phone: order.customer?.phone || "",
      address1:
        order.shippingAddress?.line1 || "",
      address2:
        order.shippingAddress?.line2 || "",
      deferredDate: "",
      comments: "",
    });

    clearNdrError();
    clearNdrResult();

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const callCustomer = (order) => {
    const phone = phoneNumber(
      order.customer?.phone,
    );

    if (phone) {
      window.location.href = `tel:+${phone}`;
    }
  };

  const messageCustomer = (order) => {
    const phone = phoneNumber(
      order.customer?.phone,
    );

    if (!phone) return;

    const orderNumber = order.orderNumber;
    const customerName =
      order.customer?.name || "Customer";

    const reason =
      order.ndr?.reason ||
      "Delivery attempt was unsuccessful";

    const actionLink =
      `${STOREFRONT_URL}/orders/ndr/` +
      encodeURIComponent(orderNumber);

    const message = `Delivery Update: Order #${orderNumber}

Hi ${customerName},

We could not deliver your OATCLUB order due to: ${reason}.

Please confirm the appropriate delivery action using the link below:

${actionLink}

Kindly respond soon to prevent the order from being returned.

Team OATCLUB
Own All Trends`;

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(
        message,
      )}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleAction = async (action) => {
    if (!selected?.ndr?.awb) return;

    if (
      action === "return" &&
      !window.confirm(
        `Mark order #${selected.orderNumber} for return?`,
      )
    ) {
      return;
    }

    setActionLoading(action);

    try {
      await submitNdrAction(
        selected.ndr.awb,
        action,
        {
          comments:
            form.comments.trim() ||
            (action === "return"
              ? "Customer requested return to origin"
              : "Customer confirmed delivery reattempt"),
          ...(action === "re-attempt" && {
            phone: form.phone.trim(),
            address1: form.address1.trim(),
            address2: form.address2.trim(),
            deferredDate:
              form.deferredDate,
          }),
        },
      );

      await syncNdrOrders();
      setSelected(null);
    } catch {
      // Error is already stored in Zustand.
    } finally {
      setActionLoading("");
    }
  };

  const stats = [
    {
      label: "Orders checked",
      value: ndrSummary?.totalOrders || 0,
    },
    {
      label: "AWBs checked",
      value: ndrSummary?.totalAwbs || 0,
    },
    {
      label: "Pages checked",
      value: ndrSummary?.totalPages || 0,
    },
    {
      label: "Open NDR",
      value:
        ndrSummary?.totalNdrOrders ||
        orders.length,
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
              OATCLUB NDR
            </p>

            <h1 className="mt-1 text-2xl font-semibold text-zinc-950">
              Shiprocket NDR
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Contact customers and resolve all
              undelivered Shiprocket orders.
            </p>
          </div>

          <button
            type="button"
            disabled={ndrLoading}
            onClick={syncOrders}
            className="flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={
                ndrLoading ? "animate-spin" : ""
              }
            />
            {ndrLoading
              ? "Syncing all orders..."
              : "Sync all orders"}
          </button>
        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200"
            >
              <p className="text-xs text-zinc-500">
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-zinc-950">
                {stat.value}
              </p>
            </div>
          ))}
        </section>

        {ndrError && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {ndrError}
          </div>
        )}

        {ndrResult && !selected && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 size={17} />
            NDR action submitted successfully.
          </div>
        )}

        {selected && (
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-zinc-950">
                    Order #{selected.orderNumber}
                  </h2>

                  <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700">
                    Attempt{" "}
                    {selected.ndr?.attemptCount || 1}
                  </span>
                </div>

                <p className="mt-1 text-sm text-zinc-500">
                  AWB: {selected.ndr?.awb}
                </p>

                <p className="mt-2 text-sm font-medium text-red-600">
                  {selected.ndr?.reason ||
                    "Delivery attempt failed"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-sm font-medium text-zinc-500 hover:text-zinc-950"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-zinc-950">
                    {selected.customer?.name}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {selected.customer?.phone}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {[
                      selected.shippingAddress?.line1,
                      selected.shippingAddress?.line2,
                      selected.shippingAddress?.city,
                      selected.shippingAddress?.state,
                      selected.shippingAddress?.pincode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      callCustomer(selected)
                    }
                    className="flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white"
                  >
                    <Phone size={16} />
                    Call customer
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      messageCustomer(selected)
                    }
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    <MessageCircle size={16} />
                    Send WhatsApp
                  </button>
                </div>

                <div className="space-y-2">
                  {selected.products?.map(
                    (product, index) => (
                      <div
                        key={
                          product.lineId ||
                          `${product.productId}-${index}`
                        }
                        className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3"
                      >
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.title}
                            className="h-14 w-11 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-14 w-11 items-center justify-center rounded-lg bg-zinc-200">
                            <Package
                              size={18}
                              className="text-zinc-500"
                            />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-zinc-900">
                            {product.title}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {[
                              product.productCode,
                              product.selectedSize,
                              `Qty ${product.quantity}`,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>

                        <p className="text-sm font-medium">
                          {money(product.subtotal)}
                        </p>
                      </div>
                    ),
                  )}
                </div>

                <div className="flex items-center justify-between rounded-xl bg-zinc-950 px-4 py-3 text-white">
                  <span className="flex items-center gap-1 text-sm">
                    <IndianRupee size={15} />
                    Amount payable
                  </span>

                  <strong>
                    {money(
                      selected.pricing
                        ?.finalPayable,
                    )}
                  </strong>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  value={form.phone}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      phone: event.target.value,
                    })
                  }
                  placeholder="Customer phone"
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-500"
                />

                <input
                  value={form.address1}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      address1:
                        event.target.value,
                    })
                  }
                  placeholder="Address line 1"
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-500"
                />

                <input
                  value={form.address2}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      address2:
                        event.target.value,
                    })
                  }
                  placeholder="Address line 2"
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-500"
                />

                <input
                  type="date"
                  min={today()}
                  value={form.deferredDate}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      deferredDate:
                        event.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-500"
                />

                <textarea
                  rows={3}
                  value={form.comments}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      comments:
                        event.target.value,
                    })
                  }
                  placeholder="Action comments"
                  className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-500"
                />

                {ndrResult && (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
                    <CheckCircle2 size={17} />
                    Action submitted successfully.
                  </div>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={Boolean(
                      actionLoading,
                    )}
                    onClick={() =>
                      handleAction("re-attempt")
                    }
                    className="flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {actionLoading ===
                      "re-attempt" ? (
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                    ) : (
                      <RotateCcw size={17} />
                    )}
                    Reattempt delivery
                  </button>

                  <button
                    type="button"
                    disabled={Boolean(
                      actionLoading,
                    )}
                    onClick={() =>
                      handleAction("return")
                    }
                    className="flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    {actionLoading === "return" ? (
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                    ) : (
                      <Undo2 size={17} />
                    )}
                    Return to origin
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200">
          <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-zinc-950">
                Open Shiprocket NDR orders
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                {filtered.length} order(s)
              </p>
            </div>

            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Order, AWB, customer or phone"
                className="w-full rounded-xl border border-zinc-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-zinc-400 sm:w-80"
              />
            </div>
          </div>

          {ndrLoading && !orders.length ? (
            <div className="py-20 text-center text-sm text-zinc-500">
              <Loader2
                size={24}
                className="mx-auto mb-3 animate-spin"
              />
              Checking all Shiprocket NDR pages...
            </div>
          ) : filtered.length ? (
            <div className="divide-y divide-zinc-100">
              {filtered.map((order) => (
                <article
                  key={order._id}
                  className="grid gap-4 p-4 hover:bg-zinc-50 lg:grid-cols-[1fr_1fr_1.4fr_auto] lg:items-center"
                >
                  <div>
                    <p className="font-semibold text-zinc-950">
                      #{order.orderNumber}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      AWB: {order.ndr?.awb}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {order.customer?.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {order.customer?.phone}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-red-600">
                      {order.ndr?.reason}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Attempt{" "}
                      {order.ndr?.attemptCount || 1}
                      {" · "}
                      {money(
                        order.pricing
                          ?.finalPayable,
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <button
                      type="button"
                      title="Call customer"
                      onClick={() =>
                        callCustomer(order)
                      }
                      className="rounded-lg bg-zinc-100 p-2.5 text-zinc-700 hover:bg-zinc-200"
                    >
                      <Phone size={16} />
                    </button>

                    <button
                      type="button"
                      title="Send WhatsApp"
                      onClick={() =>
                        messageCustomer(order)
                      }
                      className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700 hover:bg-emerald-100"
                    >
                      <MessageCircle size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        selectOrder(order)
                      }
                      className="rounded-lg bg-zinc-950 px-3 py-2.5 text-xs font-medium text-white hover:bg-zinc-800"
                    >
                      Take action
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <CheckCircle2
                size={30}
                className="mx-auto text-emerald-500"
              />
              <p className="mt-3 font-medium text-zinc-900">
                No open Shiprocket NDR orders
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                New NDR cases will appear after sync.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
