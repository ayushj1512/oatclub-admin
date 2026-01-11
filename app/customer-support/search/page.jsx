"use client";

import React, { useMemo, useState } from "react";
import { useCustomerSupportLookupStore } from "@/store/customerSupportLookupStore";
import { useCustomerStore } from "@/store/customerStore";
import { useOrderStore } from "@/store/orderStore";
import { useCustomerTicketStore } from "@/store/customerTicketStore";

/* ================= utils ================= */

const normalizeOrderNumber = (raw, prefix = "MIRAY", pad = 6) => {
  if (raw === null || raw === undefined) return "";
  if (Array.isArray(raw)) raw = raw?.[0]?.orderNumber ?? raw?.[0]?.number ?? "";
  if (typeof raw === "object") raw = raw?.orderNumber ?? raw?.number ?? "";

  const s = String(raw).trim();
  if (!s) return "";

  const digits = (s.match(/\d+/g) || []).join("");
  if (!digits) return s.toUpperCase();

  const num = String(parseInt(digits, 10));
  return `${String(prefix).toUpperCase()}-${num.padStart(pad, "0")}`;
};

const money = (v) => {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? `₹ ${n.toLocaleString("en-IN")}` : String(v);
};

const safe = (v, fallback = "—") =>
  v === null || v === undefined || v === "" ? fallback : String(v);

const getId = (x) => {
  if (!x) return "";
  if (typeof x === "string") return x;
  if (typeof x === "number") return String(x);
  if (typeof x === "object") return String(x._id || x.id || x.customerId || x.userId || "");
  return "";
};

/* ================= page ================= */

export default function CustomerSupportSearch() {
  const {
    query,
    setQuery,
    runSearch,
    selectCustomer,
    selectOrder,
    selectTicket,
    matchedCustomers,
    loading,
    error,
    clearAll,
    clearResults,
    loadProductsForOrder,
    orderProducts,
  } = useCustomerSupportLookupStore();

  const { customer, loadingSingle, error: customerError } = useCustomerStore();
  const { orders, order, loading: orderLoading, error: orderError, clearOrders } = useOrderStore();
  const {
    tickets,
    ticket,
    loading: ticketLoading,
    error: ticketError,
    resetTickets,
  } = useCustomerTicketStore();

  const [expanded, setExpanded] = useState(false);

  const busy = loading || loadingSingle || orderLoading || ticketLoading;
  const allErr = error || customerError || orderError || ticketError;

  const hasAnyResult = useMemo(
    () =>
      Boolean(customer) ||
      (matchedCustomers?.length || 0) > 0 ||
      Boolean(order) ||
      (orders?.length || 0) > 0 ||
      (tickets?.length || 0) > 0 ||
      Boolean(ticket),
    [customer, matchedCustomers, order, orders, tickets, ticket]
  );

  const customerMongoId = customer?._id || customer?.id || null;
  const customerEmail = String(customer?.email || query.email || "").trim();

  const handleSearch = async () => {
    clearOrders?.();
    resetTickets?.();
    setExpanded(false);

    // always take latest query from store (no stale closures)
    const store = useCustomerSupportLookupStore.getState();
    const q = store.query;

    const next = {
      phone: String(q.phone || "").trim(),
      name: String(q.name || "").trim(),
      email: String(q.email || "").trim().toLowerCase(),
      orderNumber: q.orderNumber ? normalizeOrderNumber(q.orderNumber, "MIRAY", 6) : "",
      ticketStatus: String(q.ticketStatus || "").trim(),
    };

    store.setQuery(next);
    await store.runSearch(); // ✅ store now auto-loads orders & tickets
  };

  /* ===== order detail helpers ===== */

  const orderNumberShown =
    normalizeOrderNumber(order?.orderNumber, "MIRAY", 6) || order?._id || "Order";

  const shipping =
    order?.shippingAddressSnapshot ||
    order?.shippingAddress ||
    order?.shipping ||
    order?.address ||
    order?.shipment?.address ||
    null;

  const billing =
    order?.billingAddressSnapshot ||
    order?.billingAddress ||
    order?.billing ||
    null;

  const customerFromOrder = order?.customerId || order?.customer || order?.user || null;
  const orderEmail =
    customerFromOrder?.email ||
    order?.email ||
    shipping?.email ||
    billing?.email ||
    customerEmail ||
    "";

  const payment = {
    method: order?.paymentMethod || order?.payment?.method,
    status: order?.paymentStatus || order?.payment?.status,
  };

  const shipment = order?.shipment || {};
  const shiprocket = shipment?.shiprocket || {};
  const trackingUrl = shiprocket?.trackingUrl || "";
  const awb = shiprocket?.awb || "";

  const items = Array.isArray(order?.items)
    ? order.items
    : Array.isArray(order?.orderItems)
    ? order.orderItems
    : [];

  const totals = {
    subtotal: order?.subtotal ?? order?.subTotal ?? order?.itemsSubtotal,
    discount: order?.discount ?? order?.coupon?.discount ?? order?.discountTotal,
    shipping: order?.shippingFee ?? order?.shippingCost,
    tax: order?.tax ?? order?.gst,
    total: order?.finalPayable ?? order?.total ?? order?.grandTotal ?? order?.amount,
  };

  const productIds = useMemo(() => {
    const ids = items
      .map((it) =>
        getId(it?.productId || it?.product || it?.variant?.productId || it?.variant?.product)
      )
      .filter(Boolean);
    return [...new Set(ids)];
  }, [items]);

  const canLoadProducts = Boolean(order) && productIds.length > 0;
  const productsLoaded = (orderProducts?.length || 0) > 0;

  const orderHasItems = (o) =>
    Array.isArray(o?.items)
      ? o.items.length > 0
      : Array.isArray(o?.orderItems)
      ? o.orderItems.length > 0
      : false;

  const orderItemsForCard = (o) =>
    Array.isArray(o?.items) ? o.items : Array.isArray(o?.orderItems) ? o.orderItems : [];

  /* ================= UI ================= */

  return (
    <div className="px-4 py-4 md:px-6 md:py-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-semibold tracking-tight">Customer Support</h1>
          <p className="text-sm text-gray-500">
            Search → customer loads → orders & tickets auto load → select order to see products.
          </p>
        </div>

        <div className="flex gap-2">
          <Btn onClick={clearResults} disabled={busy} variant="ghost">
            Clear
          </Btn>
          <Btn onClick={clearAll} disabled={busy} variant="ghost">
            Reset
          </Btn>
        </div>
      </div>

      {/* Search */}
      <div className="mt-4 rounded-2xl bg-white/70 p-3 shadow-sm ring-1 ring-black/5 backdrop-blur">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
          <Input placeholder="Phone" value={query.phone} onChange={(v) => setQuery({ phone: v })} />
          <Input placeholder="Email" value={query.email} onChange={(v) => setQuery({ email: v })} />
          <Input placeholder="Name" value={query.name} onChange={(v) => setQuery({ name: v })} />

          <Input
            placeholder="Order No. (MIRAY-000031)"
            value={query.orderNumber}
            onChange={(v) => {
              if (!v) return setQuery({ orderNumber: "" });
              const hasDigit = /\d/.test(v);
              setQuery({
                orderNumber: hasDigit ? normalizeOrderNumber(v, "MIRAY", 6) : v.toUpperCase(),
              });
            }}
          />

          <Select
            value={query.ticketStatus || ""}
            onChange={(v) => setQuery({ ticketStatus: v })}
            options={[
              { label: "Tickets: All", value: "" },
              { label: "Open", value: "open" },
              { label: "Pending", value: "pending" },
              { label: "Resolved", value: "resolved" },
              { label: "Closed", value: "closed" },
            ]}
          />

          <Btn onClick={handleSearch} disabled={busy} variant="primary">
            {busy ? "Searching…" : "Search"}
          </Btn>
        </div>

        {allErr ? (
          <div className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-100">
            {allErr}
          </div>
        ) : null}
      </div>

      {/* Results */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-4">
        {/* Customer */}
        <Card title="Customer">
          {!hasAnyResult ? <Empty text="No results yet. Search above." /> : null}

          {matchedCustomers?.length > 0 ? (
            <div className="mt-2 space-y-2">
              <div className="text-xs text-gray-500">
                {matchedCustomers.length} matches • select one
              </div>

              {matchedCustomers.map((c) => (
                <button
                  key={c._id || c.id}
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    clearOrders?.();
                    resetTickets?.();
                    setExpanded(false);
                    await selectCustomer(c); // ✅ store will auto-load orders/tickets
                  }}
                  className="w-full rounded-xl bg-gray-50 px-3 py-2 text-left ring-1 ring-black/5 hover:bg-gray-100 disabled:opacity-60"
                >
                  <div className="text-sm font-medium">{c?.name || "—"}</div>
                  <div className="text-xs text-gray-600">
                    {c?.email || "—"} • {c?.phone || c?.mobile || "—"}
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {customer ? (
            <div className="mt-3 rounded-xl bg-gray-50 p-3 ring-1 ring-black/5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{customer?.name || "—"}</div>
                  <div className="mt-1 text-xs text-gray-700 space-y-1">
                    <Row k="Email" v={safe(customer?.email)} />
                    <Row k="Phone" v={safe(customer?.phone)} />
                    <Row k="Mongo ID" v={safe(customer?._id)} />
                    <Row k="Customer ID" v={safe(customer?.customerId)} />
                    {customer?.country ? <Row k="Country" v={customer.country} /> : null}
                    {customer?.isActive !== undefined ? (
                      <Row k="Status" v={customer.isActive ? "Active" : "Inactive"} />
                    ) : null}
                  </div>
                </div>

                {customer?._id ? (
                  <a
                    className="text-xs text-gray-700 underline underline-offset-4 hover:text-black"
                    href={`/admin/customers/${customer._id}`}
                  >
                    Open
                  </a>
                ) : null}
              </div>

              {!!customerMongoId ? (
                <div className="mt-3 text-[11px] text-gray-500">
                  Auto: Orders + Tickets loaded for this customer.
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>

        {/* Orders */}
        <Card
          title="Orders"
          right={
            <div className="flex gap-2">
              <Btn
                onClick={() => useOrderStore.getState().fetchOrdersByCustomer?.(customerMongoId)}
                disabled={busy || !customerMongoId}
                size="xs"
              >
                Reload
              </Btn>
              <Btn
                onClick={() => {
                  clearOrders?.();
                  setExpanded(false);
                }}
                disabled={busy || !orders?.length}
                size="xs"
                variant="ghost"
              >
                Clear
              </Btn>
            </div>
          }
        >
          {!orders?.length ? (
            <Empty text={customer ? "Orders will appear here (auto loaded)." : "Search a customer first."} />
          ) : (
            <div className="mt-2 space-y-2">
              {orders.map((o) => {
                const its = orderItemsForCard(o);
                const showInline = orderHasItems(o);

                return (
                  <div
                    key={o._id}
                    className="w-full rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-black/5"
                  >
                    <button
                      type="button"
                      onClick={async () => {
                        setExpanded(false);
                        await selectOrder(o);
                      }}
                      disabled={busy}
                      className="w-full text-left hover:opacity-90 disabled:opacity-60"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium">
                          {normalizeOrderNumber(o?.orderNumber, "MIRAY", 6) || o?._id || "Order"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {o?.createdAt ? new Date(o.createdAt).toLocaleDateString() : ""}
                        </div>
                      </div>

                      <div className="mt-1 text-xs text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
                        {o?.paymentStatus ? <Pill text={o.paymentStatus} /> : null}
                        {o?.fulfillmentStatus ? <Pill text={o.fulfillmentStatus} /> : null}
                        {o?.finalPayable !== undefined ? (
                          <span className="text-gray-700">{money(o.finalPayable)}</span>
                        ) : null}
                        <span className="text-gray-400">
                          {showInline ? "• Products inline" : "• Click to view products"}
                        </span>
                      </div>
                    </button>

                    {showInline ? (
                      <div className="mt-2 space-y-1">
                        {its.slice(0, 3).map((it, idx) => {
                          const snap = it?.productSnapshot || {};
                          const title = snap?.title || it?.name || it?.productName || "Item";
                          const qty = it?.quantity ?? it?.qty ?? 1;
                          const price = it?.price ?? it?.unitPrice ?? it?.sellingPrice;

                          return (
                            <div
                              key={idx}
                              className="rounded-lg bg-gray-50 px-2 py-1 text-[11px] text-gray-700 ring-1 ring-black/5 flex items-center justify-between gap-2"
                            >
                              <span className="truncate">{title}</span>
                              <span className="shrink-0 text-gray-600">
                                Qty {qty}
                                {price !== undefined ? ` • ${money(price)}` : ""}
                              </span>
                            </div>
                          );
                        })}
                        {its.length > 3 ? (
                          <div className="text-[11px] text-gray-500">+{its.length - 3} more…</div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Order */}
        <Card
          title="Order"
          right={
            <div className="flex items-center gap-2">
              {order ? (
                <>
                  <Btn
                    size="xs"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setExpanded((v) => !v)}
                  >
                    {expanded ? "Less" : "More"}
                  </Btn>

                  <Btn
                    size="xs"
                    disabled={busy || !canLoadProducts}
                    onClick={() => loadProductsForOrder?.(order)}
                  >
                    {productsLoaded ? "Reload Products" : "Load Products"}
                  </Btn>
                </>
              ) : null}

              {order?._id ? (
                <a
                  className="text-xs text-gray-700 underline underline-offset-4 hover:text-black"
                  href={`/admin/orders/${order._id}`}
                >
                  Open
                </a>
              ) : null}
            </div>
          }
        >
          {!order ? (
            <Empty text="Select an order (or search by order no.)." />
          ) : (
            <div className="mt-2 space-y-3">
              {/* Summary */}
              <div className="rounded-xl bg-gray-50 p-3 ring-1 ring-black/5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{orderNumberShown}</div>
                    <div className="mt-1 text-xs text-gray-700 space-y-1">
                      {order?.orderDate ? (
                        <Row k="Order Date" v={new Date(order.orderDate).toLocaleString()} />
                      ) : order?.createdAt ? (
                        <Row k="Created" v={new Date(order.createdAt).toLocaleString()} />
                      ) : null}

                      <Row k="Payment" v={safe(payment?.status)} />
                      <Row k="Method" v={safe(payment?.method)} />
                      <Row k="Fulfillment" v={safe(order?.fulfillmentStatus)} />
                      {totals.total !== undefined ? <Row k="Final Payable" v={money(totals.total)} /> : null}

                      {awb ? <Row k="AWB" v={awb} /> : null}
                      {shipment?.status ? <Row k="Shipment" v={shipment.status} /> : null}
                      {trackingUrl ? (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-gray-500">Tracking</span>
                          <a
                            className="text-gray-800 underline underline-offset-4 hover:text-black text-right"
                            href={trackingUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open
                          </a>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {order?.adminRemarks ? <Pill text={order.adminRemarks} /> : null}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {totals.subtotal !== undefined ? <Mini k="Subtotal" v={money(totals.subtotal)} /> : null}
                  {totals.discount !== undefined ? <Mini k="Discount" v={money(totals.discount)} /> : null}
                  {order?.coupon?.code ? <Mini k="Coupon" v={order.coupon.code} /> : null}
                  {order?.shippingFee !== undefined ? <Mini k="Shipping" v={money(order.shippingFee)} /> : null}
                  {order?.tax !== undefined ? <Mini k="Tax" v={money(order.tax)} /> : null}
                </div>
              </div>

              {/* Customer/Address */}
              {shipping || billing || orderEmail || customerFromOrder ? (
                <div className="rounded-xl bg-white p-3 ring-1 ring-black/5">
                  <div className="text-xs font-semibold text-gray-800">Customer / Address</div>
                  <div className="mt-2 text-xs text-gray-700 space-y-1">
                    {customerFromOrder?.name ? <Row k="Name" v={customerFromOrder.name} /> : null}
                    {orderEmail ? <Row k="Email" v={orderEmail} /> : null}
                    {customerFromOrder?._id ? <Row k="Customer Mongo ID" v={customerFromOrder._id} /> : null}

                    {shipping ? (
                      <>
                        <div className="pt-2 text-[11px] font-semibold text-gray-600">Shipping</div>
                        <Row k="Name" v={safe(shipping?.fullName || shipping?.name)} />
                        <Row k="Phone" v={safe(shipping?.phone)} />
                        <Row
                          k="Address"
                          v={safe(
                            [
                              shipping?.line1,
                              shipping?.line2,
                              shipping?.city,
                              shipping?.state,
                              shipping?.pincode,
                              shipping?.country,
                            ]
                              .filter(Boolean)
                              .join(", "),
                            "—"
                          )}
                        />
                      </>
                    ) : null}

                    {billing ? (
                      <>
                        <div className="pt-2 text-[11px] font-semibold text-gray-600">Billing</div>
                        <Row k="Name" v={safe(billing?.fullName || billing?.name)} />
                        <Row k="Phone" v={safe(billing?.phone)} />
                        <Row
                          k="Address"
                          v={safe(
                            [
                              billing?.line1,
                              billing?.line2,
                              billing?.city,
                              billing?.state,
                              billing?.pincode,
                              billing?.country,
                            ]
                              .filter(Boolean)
                              .join(", "),
                            "—"
                          )}
                        />
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Items */}
              {items?.length ? (
                <div className="rounded-xl bg-white p-3 ring-1 ring-black/5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-gray-800">Items / Products</div>
                    <div className="text-xs text-gray-500">{items.length}</div>
                  </div>

                  <div className="mt-2 space-y-2">
                    {(expanded ? items : items.slice(0, 4)).map((it, idx) => {
                      const snap = it?.productSnapshot || {};
                      const variant = it?.variant || {};
                      const qty = it?.quantity ?? it?.qty ?? 1;

                      const title =
                        snap?.title || it?.name || it?.productName || it?.title || "Item";

                      const productCode = snap?.productCode || "";
                      const slug = snap?.slug || "";
                      const thumb = snap?.thumbnail || variant?.image || "";
                      const sku = variant?.sku || snap?.sku || it?.sku || "";
                      const size = it?.selectedSize || "";
                      const color = it?.selectedColor || "";

                      const price = it?.price ?? it?.unitPrice ?? it?.sellingPrice;
                      const compareAt = it?.compareAtPrice;
                      const subtotal = it?.subtotal;

                      const variantId = variant?.variantId || "";
                      const lineId = it?.lineId || "";

                      return (
                        <div key={idx} className="rounded-lg bg-gray-50 p-2 text-xs ring-1 ring-black/5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 truncate">{title}</div>
                              <div className="mt-1 text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
                                {productCode ? <span>Code {productCode}</span> : null}
                                {sku ? <span>SKU {sku}</span> : null}
                                {size ? <span>Size {size}</span> : null}
                                {color ? <span>Color {color}</span> : null}
                                {qty ? <span>Qty {qty}</span> : null}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-gray-800">{price !== undefined ? money(price) : ""}</div>
                              {compareAt !== null && compareAt !== undefined ? (
                                <div className="text-[11px] text-gray-500">MRP {money(compareAt)}</div>
                              ) : null}
                              {subtotal !== undefined ? (
                                <div className="text-[11px] text-gray-600">Subtotal {money(subtotal)}</div>
                              ) : null}
                            </div>
                          </div>

                          {thumb ? (
                            <div className="mt-2 flex items-center gap-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={thumb}
                                alt={title}
                                className="h-12 w-12 rounded-lg object-cover ring-1 ring-black/5"
                              />
                              <div className="text-[11px] text-gray-600 break-all">
                                {slug ? <div>/{slug}</div> : null}
                                {variantId ? <div>VariantID: {variantId}</div> : null}
                                {lineId ? <div>LineID: {lineId}</div> : null}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 text-[11px] text-gray-500">
                              {slug ? `/${slug}` : null}
                              {variantId ? ` • VariantID: ${variantId}` : null}
                              {lineId ? ` • LineID: ${lineId}` : null}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {!expanded && items.length > 4 ? (
                      <div className="text-xs text-gray-500">+{items.length - 4} more…</div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </Card>

        {/* Tickets */}
        <Card
          title="Tickets"
          right={
            <div className="flex gap-2">
              <Btn
                onClick={() =>
                  useCustomerTicketStore.getState().fetchTicketsByEmail?.({
                    email: customerEmail,
                    status: query.ticketStatus || undefined,
                    page: 1,
                    limit: 10,
                  })
                }
                disabled={busy || !customerEmail}
                size="xs"
              >
                Reload
              </Btn>
              <Btn
                onClick={() => resetTickets?.()}
                disabled={busy || !tickets?.length}
                size="xs"
                variant="ghost"
              >
                Clear
              </Btn>
            </div>
          }
        >
          {!tickets?.length ? (
            <Empty
              text={
                customerEmail
                  ? "Tickets will appear here (auto loaded if email exists)."
                  : "Need customer email (search customer first)."
              }
            />
          ) : (
            <div className="mt-2 space-y-2">
              {tickets.map((t) => (
                <button
                  key={t.ticketId || t._id}
                  type="button"
                  onClick={() => selectTicket?.(t.ticketId || t._id)}
                  disabled={busy}
                  className="w-full rounded-xl bg-white px-3 py-2 text-left shadow-sm ring-1 ring-black/5 hover:bg-gray-50 disabled:opacity-60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{t.ticketId || t._id}</div>
                    <div className="text-xs text-gray-500">
                      {t?.createdAt ? new Date(t.createdAt).toLocaleDateString() : ""}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
                    {t?.status ? <Pill text={t.status} /> : null}
                    {t?.issueType ? <Pill text={t.issueType} /> : null}
                    {t?.subject ? <span className="text-gray-700">{t.subject}</span> : null}
                  </div>
                </button>
              ))}
            </div>
          )}

          {ticket ? (
            <div className="mt-3 rounded-xl bg-gray-50 p-3 ring-1 ring-black/5">
              <div className="text-xs font-semibold text-gray-700">Ticket Detail</div>
              <div className="mt-2 text-xs text-gray-700 space-y-1">
                <Row k="Ticket" v={safe(ticket.ticketId || ticket._id)} />
                {ticket?.status ? <Row k="Status" v={ticket.status} /> : null}
                {ticket?.issueType ? <Row k="Type" v={ticket.issueType} /> : null}
                {ticket?.message ? <Row k="Message" v={ticket.message} /> : null}
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

/* ================= small UI helpers ================= */

function Card({ title, right, children }) {
  return (
    <div className="rounded-2xl bg-white/70 p-4 shadow-sm ring-1 ring-black/5 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }) {
  return <div className="mt-3 text-sm text-gray-500">{text}</div>;
}

function Row({ k, v }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500">{k}</span>
      <span className="text-gray-800 text-right">{v}</span>
    </div>
  );
}

function Mini({ k, v }) {
  return (
    <div className="rounded-lg bg-gray-50 px-2 py-1 ring-1 ring-black/5">
      <div className="text-[11px] text-gray-500">{k}</div>
      <div className="text-xs text-gray-800">{safe(v)}</div>
    </div>
  );
}

function Pill({ text }) {
  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700 ring-1 ring-black/5">
      {text}
    </span>
  );
}

function Btn({ children, onClick, disabled, variant = "default", size = "sm" }) {
  const base =
    "inline-flex items-center justify-center rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { xs: "px-2 py-1 text-xs", sm: "px-3 py-2 text-sm" };
  const variants = {
    default: "bg-white hover:bg-gray-50 ring-1 ring-black/5",
    ghost: "bg-transparent hover:bg-gray-50 ring-1 ring-black/5",
    primary: "bg-black text-white hover:bg-black/90",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]}`}
    >
      {children}
    </button>
  );
}

function Input({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-black/5 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-black/10"
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-black/10"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
