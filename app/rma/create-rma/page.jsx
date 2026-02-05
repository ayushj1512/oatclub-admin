"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useOrderStore } from "@/store/orderStore";
import { useRmaStore } from "@/store/useRmaStore";

/* theme */
const ACCENT = "#111827";
const bg = "bg-[#f6f7f9]";
const card = "bg-white";
const b1 = "border border-black/10";
const b2 = "border border-black/5";

/* ✅ allowed sizes only */
const SIZE_OPTIONS = ["xs", "s", "m", "l", "xl"];

/* helpers */
const safe = (v) => (v == null ? "" : String(v));
const lower = (v) => safe(v).trim().toLowerCase();
const money = (n) =>
  Number.isFinite(Number(n)) ? Number(n).toLocaleString("en-IN") : "0";
const fmtDT = (d) => {
  const dt = d ? new Date(d) : null;
  return !dt || Number.isNaN(dt.getTime())
    ? "-"
    : dt.toLocaleString("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
};
const statusPill = (s) => {
  const v = lower(s);
  if (v === "delivered") return "bg-emerald-50 text-emerald-700";
  if (v === "shipped") return "bg-sky-50 text-sky-700";
  if (v === "processing" || v === "confirmed")
    return "bg-amber-50 text-amber-700";
  if (v.includes("cancel")) return "bg-rose-50 text-rose-700";
  if (v.includes("return")) return "bg-purple-50 text-purple-700";
  if (v.includes("exchange")) return "bg-indigo-50 text-indigo-700";
  return "bg-black/5 text-black/70";
};
const paymentBadge = (o) => {
  const pm = lower(o?.paymentMethod);
  const ps = lower(o?.paymentStatus);
  if (pm === "exchange") return { label: "Exchange", cls: "bg-blue-50 text-blue-700" };
  if (pm === "cod") return { label: "COD", cls: "bg-black/5 text-black/80" };
  if (ps === "paid") return { label: "Paid", cls: "bg-emerald-50 text-emerald-700" };
  if (ps === "pending") return { label: "Pending", cls: "bg-amber-50 text-amber-700" };
  if (ps === "refunded") return { label: "Refunded", cls: "bg-purple-50 text-purple-700" };
  return { label: safe(o?.paymentStatus || o?.paymentMethod || "-") || "-", cls: "bg-black/5 text-black/70" };
};
const pickImage = (it) => {
  const snap = it?.productSnapshot || {};
  return (
    it?.image ||
    it?.imageUrl ||
    it?.productImage ||
    snap?.image ||
    snap?.imageUrl ||
    snap?.thumbnail ||
    snap?.thumb ||
    (Array.isArray(snap?.images) ? snap.images[0] : null) ||
    null
  );
};
const pickSize = (it) => {
  const snap = it?.productSnapshot || {};
  const attrs = Array.isArray(it?.variant?.attributes) ? it.variant.attributes : [];
  return (
    attrs.find((a) => lower(a?.key) === "size")?.value ||
    attrs.find((a) => lower(a?.attributeName) === "size")?.value ||
    it?.size ||
    it?.selectedSize ||
    snap?.size ||
    ""
  );
};

function ImgThumb({ src, alt }) {
  const s = safe(src);
  if (!s)
    return (
      <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center">
        <ImageIcon size={16} className="text-black/40" />
      </div>
    );
  return (
    <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/5">
      <Image
        src={s}
        alt={alt || "product"}
        width={40}
        height={40}
        className="w-10 h-10 object-cover"
        unoptimized
      />
    </div>
  );
}

function ItemRow({ it }) {
  const snap = it?.productSnapshot || {};
  return (
    <div className="grid grid-cols-12 gap-2 py-2 border-b border-black/5 last:border-b-0">
      <div className="col-span-5 flex items-center gap-2 min-w-0">
        <ImgThumb src={pickImage(it)} alt={snap?.title || it?.title} />
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">
            {safe(snap?.title || it?.title || "-")}
          </div>
          <div className="text-xs text-black/55 truncate">
            SKU: {safe(it?.variant?.sku || it?.sku || "-")}
          </div>
        </div>
      </div>
      <div className="col-span-2 text-sm text-black/80">{safe(it?.lineId || "-")}</div>
      <div className="col-span-2 text-sm text-black/80">{safe(pickSize(it) || "-")}</div>
      <div className="col-span-1 text-sm text-black/80">{Number(it?.quantity || 0)}</div>
      <div className="col-span-2 text-sm text-black/80">
        ₹{money(it?.price || it?.salePrice || 0)}
      </div>
    </div>
  );
}

/**
 * ✅ Exchange rule:
 * - same productId
 * - size only (XS/S/M/L/XL)
 * - one line item at a time
 * Sends exchangeTo.attributes = [{key:"size", value:"m"}]
 */
function RmaCreatePanel({ order }) {
  const { createRma, loading } = useRmaStore();
  const [type, setType] = useState("return");
  const [reason, setReason] = useState("other");
  const [note, setNote] = useState("");
  const [qtyByLineId, setQtyByLineId] = useState({});
  const [exchangeSizeByLineId, setExchangeSizeByLineId] = useState({});

  const items = Array.isArray(order?.items) ? order.items : [];

  useEffect(() => {
    const q = {};
    const s = {};
    for (const it of items) {
      const id = safe(it?.lineId);
      if (!id) continue;
      q[id] = 0;
      s[id] = ""; // selected size
    }
    setQtyByLineId(q);
    setExchangeSizeByLineId(s);
    setType("return");
    setReason("other");
    setNote("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?._id]);

  const selectedLines = useMemo(() => {
    const out = [];
    for (const [lineId, q] of Object.entries(qtyByLineId || {})) {
      const qty = Number(q);
      if (Number.isFinite(qty) && qty > 0) out.push({ lineId, qty });
    }
    return out;
  }, [qtyByLineId]);

  const canSubmit = selectedLines.length > 0;

  const getProductIdForLine = (lineId) => {
    const it = items.find((x) => safe(x?.lineId) === safe(lineId));
    return (
      safe(it?.variant?.productId) ||
      safe(it?.productId) ||
      safe(it?.productSnapshot?.productId) ||
      ""
    );
  };

  const submit = async () => {
    if (!order?._id) return;
    if (!canSubmit) return toast.error("Select qty");

    const payload = {
      type,
      reason,
      customerNote: note,
      items: selectedLines.map((x) => ({ orderLineId: x.lineId, quantity: x.qty })),
    };

    if (type === "exchange") {
      if (selectedLines.length !== 1) return toast.error("Exchange: select only 1 line item");
      const lineId = selectedLines[0].lineId;

      const productId = getProductIdForLine(lineId);
      if (!productId) return toast.error("productId missing in order item");

      const newSize = lower(exchangeSizeByLineId?.[lineId]);
      if (!newSize) return toast.error("Select new size");
      if (!SIZE_OPTIONS.includes(newSize)) return toast.error("Invalid size (only XS/S/M/L/XL)");

      payload.exchangeTo = {
        productId,
        variantId: "", // backend should resolve by productId + attributes(size)
        variantSku: "",
        note: `Size change to ${newSize.toUpperCase()}`,
        attributes: [{ key: "size", value: newSize }],
      };
    }

    try {
      await createRma(order._id, payload);
      toast.success("RMA created");
    } catch (e) {
      toast.error(e?.message || "Failed");
    }
  };

  return (
    <div className={`mt-3 rounded-2xl ${b2} ${card} p-3`}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm font-semibold text-black/90">Create RMA</div>

        <select
          className="ml-auto rounded-xl px-2 py-1 text-sm bg-white border border-black/10 focus:outline-none focus:ring-2"
          style={{ outlineColor: ACCENT }}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="return">Return</option>
          <option value="exchange">Exchange (Size)</option>
        </select>

        <select
          className="rounded-xl px-2 py-1 text-sm bg-white border border-black/10 focus:outline-none focus:ring-2"
          style={{ outlineColor: ACCENT }}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        >
          <option value="other">Other</option>
          <option value="size_issue">Size issue</option>
          <option value="damaged">Damaged</option>
          <option value="wrong_item">Wrong item</option>
          <option value="quality_issue">Quality issue</option>
        </select>
      </div>

      <div className="mt-2 grid grid-cols-12 gap-2 text-xs font-medium text-black/55 px-1">
        <div className="col-span-7">Item</div>
        <div className="col-span-2">LineId</div>
        <div className="col-span-1">Bought</div>
        <div className="col-span-2">Request</div>
      </div>

      <div className="mt-1">
        {items.map((it, idx) => {
          const lineId = safe(it?.lineId);
          const bought = Number(it?.quantity || 0);
          const snap = it?.productSnapshot || {};
          const title = safe(snap?.title || it?.title || "-");
          const currentSize = lower(pickSize(it));

          return (
            <div key={`${lineId}-${idx}`} className="border-b border-black/5 last:border-b-0">
              <div className="grid grid-cols-12 gap-2 items-center py-2">
                <div className="col-span-7 flex items-center gap-2 min-w-0">
                  <ImgThumb src={pickImage(it)} alt={title} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{title}</div>
                    <div className="text-xs text-black/55 truncate">
                      SKU: {safe(it?.variant?.sku || "-")} • Size:{" "}
                      {(currentSize || "-").toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="col-span-2 text-sm text-black/75">{lineId || "-"}</div>
                <div className="col-span-1 text-sm text-black/75">{bought}</div>

                <div className="col-span-2">
                  <input
                    className="w-full rounded-xl px-2 py-1 text-sm bg-white border border-black/10 focus:outline-none focus:ring-2"
                    style={{ outlineColor: ACCENT }}
                    type="number"
                    min="0"
                    max={bought}
                    value={qtyByLineId?.[lineId] ?? 0}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setQtyByLineId((s) => ({
                        ...(s || {}),
                        [lineId]: Number.isFinite(v) ? v : 0,
                      }));
                    }}
                  />
                </div>
              </div>

              {type === "exchange" ? (
                <div className="pb-2 pl-12 pr-2">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 md:col-span-6">
                      <label className="text-xs text-black/50">New Size (XS/S/M/L/XL)</label>
                      <select
                        className="mt-1 w-full rounded-xl px-2 py-2 text-sm bg-white border border-black/10 focus:outline-none focus:ring-2"
                        style={{ outlineColor: ACCENT }}
                        value={exchangeSizeByLineId?.[lineId] || ""}
                        onChange={(e) =>
                          setExchangeSizeByLineId((s) => ({
                            ...(s || {}),
                            [lineId]: e.target.value,
                          }))
                        }
                      >
                        <option value="">Select size</option>
                        {SIZE_OPTIONS.map((sz) => (
                          <option
                            key={sz}
                            value={sz}
                            disabled={lower(currentSize) === sz} // ✅ prevent same size
                          >
                            {sz.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-12 md:col-span-6 text-xs text-black/45">
                      Same product exchange. Backend should resolve correct variant by size.
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <textarea
        className="mt-3 w-full rounded-2xl px-3 py-2 text-sm bg-white border border-black/10 focus:outline-none focus:ring-2"
        style={{ outlineColor: ACCENT }}
        placeholder="Customer note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
      />

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={submit}
          disabled={!canSubmit || loading}
          className="px-3 py-2 rounded-2xl text-sm text-white disabled:opacity-60"
          style={{ backgroundColor: ACCENT }}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} />
              Creating...
            </span>
          ) : type === "exchange" ? (
            "Request Exchange"
          ) : (
            "Request Return"
          )}
        </button>

        {type === "exchange" ? (
          <div className="text-xs text-black/50">
            Exchange = <b>one line</b> + only size XS/S/M/L/XL.
          </div>
        ) : !canSubmit ? (
          <div className="text-xs text-black/50">Select qty to proceed</div>
        ) : null}
      </div>
    </div>
  );
}

export default function CreateRmaAdminPage() {
  const router = useRouter();
  const { orders, loading, error, fetchOrders } = useOrderStore();
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState(() => new Set());

  useEffect(() => {
    fetchOrders?.({ limit: 140 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const delivered = useMemo(() => {
    const arr = Array.isArray(orders) ? orders : [];
    return arr.filter((o) => lower(o?.fulfillmentStatus) === "delivered");
  }, [orders]);

  const list = useMemo(() => {
    const query = lower(q);
    if (!query) return delivered;
    return delivered.filter((o) => {
      const orderNumber = lower(o?.orderNumber);
      const phone = lower(o?.shippingAddressSnapshot?.phone);
      const email = lower(o?.shippingAddressSnapshot?.email);
      return orderNumber.includes(query) || phone.includes(query) || email.includes(query);
    });
  }, [delivered, q]);

  const toggle = (id) =>
    setExpanded((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <div className={`${bg} min-h-screen p-4 md:p-6`}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-xl font-semibold text-black/90">Create RMA</div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
            <input
              className="pl-9 pr-3 py-2 rounded-2xl text-sm w-[340px] max-w-[80vw] bg-white border border-black/10 focus:outline-none focus:ring-2"
              style={{ outlineColor: ACCENT }}
              placeholder="Search delivered: order no / phone / email"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <button
            onClick={() => fetchOrders?.({ limit: 140 })}
            className="px-3 py-2 rounded-2xl text-sm bg-white border border-black/10 hover:bg-black/[0.03]"
          >
            Reload
          </button>

          <button
            onClick={() => router.refresh?.()}
            className="px-3 py-2 rounded-2xl text-sm bg-white border border-black/10 hover:bg-black/[0.03]"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-2 text-sm text-black/60">
        Showing <span className="font-semibold text-black/80">{list.length}</span> delivered orders.
      </div>

      <div className={`mt-4 rounded-3xl ${b1} ${card} overflow-hidden`}>
        <div className="overflow-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-black/[0.03]">
              <tr className="text-left text-black/70">
                <th className="p-3 w-[60px]"></th>
                <th className="p-3">Order</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Items</th>
                <th className="p-3">Delivered At</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>

            {loading ? (
              <tbody>
                <tr>
                  <td className="p-4" colSpan={7}>
                    <div className="flex items-center gap-2 text-black/60">
                      <Loader2 className="animate-spin" size={18} />
                      Loading orders...
                    </div>
                  </td>
                </tr>
              </tbody>
            ) : safe(error) ? (
              <tbody>
                <tr>
                  <td className="p-4 text-rose-600" colSpan={7}>
                    {safe(error)}
                  </td>
                </tr>
              </tbody>
            ) : list.length === 0 ? (
              <tbody>
                <tr>
                  <td className="p-4 text-black/60" colSpan={7}>
                    No delivered orders found
                  </td>
                </tr>
              </tbody>
            ) : (
              list.map((o) => {
                const id = safe(o?._id);
                const open = expanded.has(id);
                const pay = paymentBadge(o);
                const deliveredAt = o?.trackingDetails?.deliveredAt;
                const itemsCount = Array.isArray(o?.items)
                  ? o.items.reduce((a, it) => a + Number(it?.quantity || 0), 0)
                  : 0;
                const cust = o?.shippingAddressSnapshot || {};

                return (
                  <tbody key={id}>
                    <tr className="border-t border-black/5">
                      <td className="p-3 align-top">
                        <button
                          onClick={() => toggle(id)}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-white border border-black/10 hover:bg-black/[0.03]"
                          title={open ? "Collapse" : "Expand"}
                        >
                          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>

                      <td className="p-3 align-top">
                        <div className="font-semibold text-black/90">{safe(o?.orderNumber || "-")}</div>
                        <div className="text-xs text-black/50">{fmtDT(o?.createdAt)}</div>
                        <div className={`mt-1 inline-flex px-2 py-1 rounded-full text-xs ${statusPill(o?.fulfillmentStatus)}`}>
                          {safe(o?.fulfillmentStatus || "-")}
                        </div>
                      </td>

                      <td className="p-3 align-top">
                        <div className="font-medium text-black/85">{safe(cust?.fullName || "-")}</div>
                        <div className="text-xs text-black/50 truncate max-w-[320px]">
                          {safe(cust?.phone || "-")} • {safe(cust?.email || "-")}
                        </div>
                      </td>

                      <td className="p-3 align-top">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs ${pay.cls}`}>
                          {pay.label}
                        </span>
                      </td>

                      <td className="p-3 align-top text-black/80">{itemsCount}</td>
                      <td className="p-3 align-top text-black/70">{fmtDT(deliveredAt)}</td>

                      <td className="p-3 align-top text-right font-semibold text-black/90">
                        ₹{money(o?.totalAmount || o?.finalAmount || o?.grandTotal || 0)}
                      </td>
                    </tr>

                    {open ? (
                      <tr className="border-t border-black/5 bg-black/[0.02]">
                        <td className="p-3" colSpan={7}>
                          <div className={`rounded-3xl ${b2} ${card} p-3`}>
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-semibold text-black/90">Order Items</div>
                              <div className="ml-auto text-xs text-black/45">OrderId: {id}</div>
                            </div>

                            <div className={`mt-2 rounded-3xl ${b2} overflow-hidden`}>
                              <div className="grid grid-cols-12 gap-2 bg-black/[0.03] px-3 py-2 text-xs font-medium text-black/55">
                                <div className="col-span-5">Item</div>
                                <div className="col-span-2">LineId</div>
                                <div className="col-span-2">Size</div>
                                <div className="col-span-1">Qty</div>
                                <div className="col-span-2">Price</div>
                              </div>
                              <div className="px-3">
                                {(o?.items || []).map((it, idx) => (
                                  <ItemRow it={it} key={`${safe(it?.lineId)}-${idx}`} />
                                ))}
                              </div>
                            </div>

                            <RmaCreatePanel order={o} />
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                );
              })
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
