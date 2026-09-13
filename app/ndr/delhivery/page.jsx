// app/ndr/delhivery/page.jsx

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  HelpCircle,
  Loader2,
  MessageCircle,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  Truck,
} from "lucide-react";

import useDelhiveryStore from "@/store/delhiveryStore";

const ACTIONS = [
  {
    value: "RE-ATTEMPT",
    label: "Reattempt",
    icon: RotateCcw,
  },
  {
    value: "DEFER_DLV",
    label: "Reschedule",
    icon: CalendarDays,
  },
];

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const customerOf = (order = {}) => {
  const address = order.shippingAddress || {};

  return {
    name:
      order.customer?.name ||
      address.name ||
      "Customer",
    phone:
      order.customer?.phone ||
      address.phone ||
      "",
  };
};

export default function DelhiveryNdrPage() {
  const {
    ndrOrders = [],
    ndrSummary,
    loading,
    error,
    ndr,
    syncNdrOrders,
    updateNdr,
    clearError,
  } = useDelhiveryStore();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [action, setAction] =
    useState("RE-ATTEMPT");
  const [deferredDate, setDeferredDate] =
    useState("");
  const [submitting, setSubmitting] =
    useState(false);

  useEffect(() => {
    syncNdrOrders().catch(() => { });
  }, [syncNdrOrders]);

  const orders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return ndrOrders;

    return ndrOrders.filter((order) => {
      const customer = customerOf(order);

      return [
        order.orderNumber,
        order.ndr?.waybill,
        order.ndr?.reason,
        customer.name,
        customer.phone,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(query),
      );
    });
  }, [ndrOrders, search]);

  const selectOrder = (order) => {
    clearError();
    setSelected(order);
    setAction("RE-ATTEMPT");
    setDeferredDate("");
  };

  const callCustomer = () => {
    const phone = customerOf(selected).phone;
    if (phone) window.location.href = `tel:${phone}`;
  };

  const messageCustomer = () => {
    if (!selected) return;

    const customer = customerOf(selected);
    const digits = customer.phone
      .replace(/\D/g, "")
      .replace(/^0+/, "");

    if (!digits) return;

    const phone =
      digits.length === 10 ? `91${digits}` : digits;

    const storefront =
      window.location.hostname === "localhost"
        ? "http://localhost:4001"
        : "https://oatclub.in";

    const link =
      `${storefront}/orders/ndr/${selected.orderNumber}`;

    const message = [
      `Delivery Update: Order #${selected.orderNumber}`,
      "",
      `Hi ${customer.name},`,
      "",
      `We could not deliver your OATCLUB order due to: ${selected.ndr?.reason ||
      selected.ndr?.rawStatus ||
      "Delivery could not be completed"
      }.`,
      "",
      "Please confirm a delivery reattempt or select another delivery date:",
      "",
      link,
      "",
      "Kindly respond soon to prevent the order from being returned.",
      "",
      "Team OATCLUB",
      "Own All Trends",
    ].join("\n");

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(
        message,
      )}`,
      "_blank",
    );
  };

  const submitAction = async () => {
    const waybill = selected?.ndr?.waybill;
    if (!waybill) return;

    const payload = { action };

    if (action === "DEFER_DLV") {
      if (!deferredDate) {
        alert("Please select a delivery date.");
        return;
      }

      payload.deferredDate = deferredDate;
    }

    try {
      setSubmitting(true);
      await updateNdr(waybill, payload);
      await syncNdrOrders();
      setSelected(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-6">
      <div className="mx-auto space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
              OATCLUB Logistics
            </p>

            <h1 className="mt-1 text-2xl font-semibold">
              Delhivery NDR
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Contact customers and resolve failed
              delivery attempts.
            </p>
          </div>

          <button
            disabled={loading}
            onClick={() =>
              syncNdrOrders().catch(() => { })
            }
            className="flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            {loading ? "Syncing..." : "Sync Orders"}
          </button>
        </header>

        <div className="grid grid-cols-2 gap-3">
          <Stat
            label="Orders Checked"
            value={ndrSummary?.totalOrders || 0}
          />
          <Stat
            label="NDR Orders"
            value={
              ndrSummary?.totalNdrOrders ||
              ndrOrders.length
            }
          />
        </div>

        <details className="rounded-xl bg-white p-4">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <HelpCircle size={16} />
            How to use
          </summary>

          <ol className="mt-3 space-y-1 text-xs leading-5 text-zinc-600">
            <li>1. Sync the latest orders.</li>
            <li>2. Select an NDR order.</li>
            <li>3. Call or message the customer.</li>
            <li>4. Select the confirmed action.</li>
            <li>5. Submit the NDR action.</li>
          </ol>
        </details>

        {error && <Notice error>{error}</Notice>}

        {ndr && (
          <Notice>
            <CheckCircle2 size={16} />
            NDR action submitted successfully.
          </Notice>
        )}

        <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <section className="rounded-2xl bg-white p-4">
            <div className="relative mb-4">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search order, AWB, customer or phone"
                className="w-full rounded-xl border border-zinc-200 py-3 pl-10 pr-3 text-sm outline-none focus:border-zinc-500"
              />
            </div>

            <div className="space-y-2">
              {!loading && !orders.length && <Empty />}

              {orders.map((order) => {
                const customer = customerOf(order);

                return (
                  <button
                    key={order._id}
                    onClick={() => selectOrder(order)}
                    className={`w-full rounded-xl border p-4 text-left ${selected?._id === order._id
                        ? "border-zinc-950 bg-zinc-50"
                        : "border-zinc-200"
                      }`}
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          Order #{order.orderNumber}
                        </p>
                        <p className="mt-1 text-sm text-zinc-600">
                          {customer.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {customer.phone ||
                            "Phone unavailable"}
                        </p>
                      </div>

                      <div className="max-w-52 text-right">
                        <span className="inline-block rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                          {order.ndr?.reason ||
                            order.ndr?.rawStatus ||
                            "Delivery failed"}
                        </span>

                        <p className="mt-1 text-[10px] text-zinc-400">
                          {order.ndr?.statusCode || "NDR"}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-zinc-500">
                      AWB: {order.ndr?.waybill}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <OrderPanel
            order={selected}
            action={action}
            setAction={setAction}
            deferredDate={deferredDate}
            setDeferredDate={setDeferredDate}
            submitting={submitting}
            onCall={callCustomer}
            onMessage={messageCustomer}
            onSubmit={submitAction}
          />
        </div>
      </div>
    </main>
  );
}

function OrderPanel({
  order,
  action,
  setAction,
  deferredDate,
  setDeferredDate,
  submitting,
  onCall,
  onMessage,
  onSubmit,
}) {
  if (!order) {
    return (
      <aside className="grid min-h-64 place-items-center rounded-2xl bg-white p-6 text-center">
        <div>
          <Truck className="mx-auto text-zinc-300" />
          <p className="mt-2 text-sm font-medium">
            Select an NDR order
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Order and action details will appear here.
          </p>
        </div>
      </aside>
    );
  }

  const customer = customerOf(order);
  const products = order.products || [];
  const total =
    order.pricing?.finalPayable ||
    order.finalPayable ||
    0;

  return (
    <aside className="h-fit space-y-4 rounded-2xl bg-white p-5 lg:sticky lg:top-5">
      <div>
        <p className="text-xs text-zinc-500">
          Selected order
        </p>
        <h2 className="text-lg font-semibold">
          #{order.orderNumber}
        </h2>
        <p className="text-xs text-zinc-500">
          AWB: {order.ndr?.waybill}
        </p>
      </div>

      <div className="rounded-xl bg-zinc-50 p-3">
        <p className="text-sm font-medium">
          {customer.name}
        </p>
        <p className="text-xs text-zinc-500">
          {customer.phone || "Phone unavailable"}
        </p>
      </div>

      {products.map((product, index) => (
        <div
          key={product.lineId || index}
          className="flex gap-3 rounded-xl border p-2"
        >
          {product.image && (
            <img
              src={product.image}
              alt=""
              className="h-14 w-12 rounded-lg object-cover"
            />
          )}

          <div>
            <p className="text-sm font-medium">
              {product.title}
            </p>
            <p className="text-xs text-zinc-500">
              Qty {product.quantity}
              {product.selectedSize
                ? ` · Size ${product.selectedSize}`
                : ""}
            </p>
            <p className="mt-1 text-xs font-medium">
              {money(product.subtotal)}
            </p>
          </div>
        </div>
      ))}

      <div className="flex justify-between border-t pt-3 text-sm">
        <span className="text-zinc-500">
          Amount payable
        </span>
        <strong>{money(total)}</strong>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onCall}
          disabled={!customer.phone}
          className="flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium disabled:opacity-40"
        >
          <Phone size={16} />
          Call
        </button>

        <button
          onClick={onMessage}
          disabled={!customer.phone}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3 text-sm font-medium text-emerald-700 disabled:opacity-40"
        >
          <MessageCircle size={16} />
          WhatsApp
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ACTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setAction(value)}
            className={`rounded-xl border p-3 text-left ${action === value
                ? "border-zinc-950 bg-zinc-950 text-white"
                : "border-zinc-200"
              }`}
          >
            <Icon size={16} />
            <p className="mt-2 text-xs font-medium">
              {label}
            </p>
          </button>
        ))}
      </div>

      {action === "DEFER_DLV" && (
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium">
            Preferred delivery date
          </span>

          <input
            type="date"
            value={deferredDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(event) =>
              setDeferredDate(event.target.value)
            }
            className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-950"
          />
        </label>
      )}

      <button
        onClick={onSubmit}
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? (
          <Loader2
            size={16}
            className="animate-spin"
          />
        ) : (
          <CheckCircle2 size={16} />
        )}

        {submitting
          ? "Submitting..."
          : "Submit NDR Action"}
      </button>

      <p className="text-center text-xs text-zinc-500">
        Submit only after customer confirmation.
      </p>
    </aside>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-white p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">
        {value}
      </p>
    </div>
  );
}

function Notice({ children, error }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${error
          ? "bg-red-50 text-red-700"
          : "bg-emerald-50 text-emerald-700"
        }`}
    >
      {children}
    </div>
  );
}

function Empty() {
  return (
    <div className="py-14 text-center text-sm text-zinc-500">
      <Truck
        size={28}
        className="mx-auto mb-2 text-zinc-300"
      />
      No eligible NDR orders.
    </div>
  );
}
