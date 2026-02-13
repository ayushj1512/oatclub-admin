// components/orders/DuplicateOrderCreatin.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Plus, RefreshCcw, X } from "lucide-react";
import { useOrderStore } from "@/store/orderStore";

const API = process.env.NEXT_PUBLIC_API_URL || "";

/* ---------------- utils ---------------- */
const str = (v) => (v == null ? "" : String(v));
const n = (v, d = 1) => {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? x : d;
};
const pickAttr = (attrs = [], key) => {
  const k = str(key).trim().toLowerCase();
  const found = (attrs || []).find((a) => str(a?.key).trim().toLowerCase() === k);
  return found?.value ? str(found.value) : "";
};

/* ================= Portal Modal ================= */
function PortalModal({
  open,
  onClose,
  title,
  widthClass = "max-w-4xl",
  footer,
  children,
  disableClose = false,
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !mounted) return;

    const onKey = (e) => {
      if (e.key === "Escape" && !disableClose) onClose?.();
    };
    document.addEventListener("keydown", onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, mounted, onClose, disableClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <button
        type="button"
        aria-label="Close overlay"
        disabled={disableClose}
        onClick={() => (!disableClose ? onClose?.() : null)}
        className="absolute inset-0 bg-black/50"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className={`w-full ${widthClass} rounded-3xl bg-white shadow-2xl border border-black/10 overflow-hidden`}
        >
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-gray-900 truncate">{title}</div>
            </div>
            <button
              type="button"
              disabled={disableClose}
              onClick={() => (!disableClose ? onClose?.() : null)}
              className="shrink-0 p-2 rounded-xl hover:bg-black/[0.06] disabled:opacity-40 transition"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-5 py-4 max-h-[75vh] overflow-auto">{children}</div>

          {footer ? (
            <div className="px-5 py-4 border-t border-gray-100 bg-white">{footer}</div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ================= Component ================= */
export default function DuplicateOrderCreatin({ open, onClose, order, onCreated }) {
  const orderId = order?._id || order?.id;
  const items = Array.isArray(order?.items) ? order.items : [];

  const duplicateExchangeOrder = useOrderStore((s) => s.duplicateExchangeOrder);

  const [reason, setReason] = useState("other");
  const [adminNote, setAdminNote] = useState("");
  const [customerNote, setCustomerNote] = useState("");

  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [productCache, setProductCache] = useState({});
  const [loadingProduct, setLoadingProduct] = useState({});

  const fetchProductIfNeeded = async (productId) => {
    const pid = str(productId).trim();
    if (!pid || productCache[pid] || loadingProduct[pid]) return;

    setLoadingProduct((m) => ({ ...m, [pid]: true }));
    try {
      const res = await fetch(`${API}/api/products/${pid}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Product fetch failed");
      setProductCache((m) => ({ ...m, [pid]: data?.product ?? data }));
    } catch (e) {
      console.warn("Product fetch failed:", e?.message || e);
    } finally {
      setLoadingProduct((m) => ({ ...m, [pid]: false }));
    }
  };

  useEffect(() => {
    if (!open) return;

    setErr("");
    setReason("other");
    setAdminNote("");
    setCustomerNote("");

    const init = items.map((it, idx) => {
      const productId = str(it?.productId?._id || it?.productId || "");
      const fromVariantId = str(it?.variant?.variantId || it?.variantId || "");
      const fromVariantAttrs = it?.variant?.attributes || [];
      const size = str(it?.selectedSize || pickAttr(fromVariantAttrs, "size") || "");
      const color = str(it?.selectedColor || pickAttr(fromVariantAttrs, "color") || "");
      const title = str(it?.productSnapshot?.title || it?.productId?.title || it?.productSnapshot?.name || "");

      return {
        key: `${productId}-${idx}`,
        include: true,
        lineId: str(it?.lineId || ""),
        productId,
        title,
        qty: n(it?.quantity, 1),
        fromVariantId,
        fromSize: size,
        fromColor: color,
        toVariantId: "",
      };
    });

    setRows(init);
    init.forEach((r) => r.productId && fetchProductIfNeeded(r.productId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const included = useMemo(() => rows.filter((r) => r.include), [rows]);

  const updateRow = (idx, patch) => {
    setRows((arr) => {
      const next = [...arr];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const isVariableProduct = (pid) =>
    Array.isArray(productCache[pid]?.variants) && productCache[pid].variants.length > 0;

  const getVariants = (pid) => (Array.isArray(productCache[pid]?.variants) ? productCache[pid].variants : []);

  const getSizeOptions = (pid) => {
    const sizes = getVariants(pid)
      .map((v) => pickAttr(v?.attributes || [], "size"))
      .filter(Boolean)
      .map((s) => str(s).trim());
    return Array.from(new Set(sizes));
  };

  const findVariantIdBySize = (pid, size) => {
    const want = str(size).trim().toLowerCase();
    const found = getVariants(pid).find(
      (v) => str(pickAttr(v?.attributes, "size")).trim().toLowerCase() === want
    );
    return found?._id ? str(found._id) : "";
  };

  const selectedSizeFromVariantId = (pid, variantId) => {
    if (!variantId) return "";
    const v = getVariants(pid).find((x) => str(x?._id) === str(variantId));
    return v ? str(pickAttr(v?.attributes || [], "size")) : "";
  };

  const validate = () => {
    if (!orderId) return "Order not found";
    if (!included.length) return "Select at least 1 product.";

    for (const r of included) {
      if (isVariableProduct(r.productId) && !str(r.toVariantId).trim()) {
        return `Select size/variant for: ${r.title || r.productId}`;
      }
    }
    return "";
  };

  // ✅ IMPORTANT: backend expects item.variantId
  const buildPayload = () => ({
    reason: str(reason).trim(),
    adminNote: str(adminNote).trim(),
    customerNote: str(customerNote).trim(),
    resolution: "exchange",
    items: included.map((r) => ({
      productId: r.productId,
      quantity: n(r.qty, 1),
      variantId: r.toVariantId || undefined, // ✅ FIX
    })),
  });

  const submit = async () => {
    setErr("");
    const msg = validate();
    if (msg) return setErr(msg);

    try {
      setSaving(true);
      const newOrder = await duplicateExchangeOrder(orderId, buildPayload());
      onCreated?.(newOrder);
      onClose?.();
    } catch (e) {
      setErr(e?.message || "Duplicate failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalModal
      open={open}
      onClose={saving ? undefined : onClose}
      disableClose={saving}
      title={`Duplicate (Exchange) • ${order?.orderNumber || ""}`}
      widthClass="max-w-4xl"
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-red-600">{err}</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-100 text-gray-800 text-xs font-semibold hover:bg-gray-200 disabled:opacity-40 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={submit}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Create {order?.orderNumber ? `${order.orderNumber}-R*` : "Duplicate"}
            </button>
          </div>
        </div>
      }
    >
      {/* Reason */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-xs font-semibold text-gray-700">
          Mode: <span className="text-black font-extrabold">Exchange</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700">Reason</span>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-black/20"
          >
            <option value="size_issue">Size Issue</option>
            <option value="damaged">Damaged</option>
            <option value="wrong_item">Wrong Item</option>
            <option value="quality_issue">Quality Issue</option>
            <option value="customer_request">Customer Request</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Items */}
      <div className="mt-4 rounded-2xl border border-gray-100">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-2xl flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900">Select Products ({rows.length})</div>
          <button
            type="button"
            onClick={() => rows.forEach((r) => r.productId && fetchProductIfNeeded(r.productId))}
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition"
          >
            <RefreshCcw size={14} /> Refresh sizes
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {rows.map((r, idx) => {
            const pid = r.productId;
            const hasVariants = isVariableProduct(pid);
            const sizes = getSizeOptions(pid);
            const productLoading = !!loadingProduct[pid];

            return (
              <div key={r.key} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!r.include}
                        onChange={(e) => updateRow(idx, { include: e.target.checked })}
                        className="h-4 w-4"
                      />
                      <span className="text-sm font-semibold text-gray-900 truncate">{r.title || "Product"}</span>
                    </label>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {productLoading ? (
                        <span className="inline-flex items-center gap-2 text-xs text-gray-600">
                          <Loader2 size={14} className="animate-spin" /> Loading sizes...
                        </span>
                      ) : hasVariants ? (
                        <>
                          <span className="text-[11px] text-gray-500">
                            Current: {r.fromSize ? `Size ${r.fromSize}` : "—"}
                            {r.fromColor ? ` • ${r.fromColor}` : ""}
                          </span>

                          <select
                            value={selectedSizeFromVariantId(pid, r.toVariantId)}
                            onChange={(e) =>
                              updateRow(idx, { toVariantId: findVariantIdBySize(pid, e.target.value) })
                            }
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-black/20"
                          >
                            <option value="">Choose new size</option>
                            {sizes.map((s) => (
                              <option key={`${pid}-size-${s}`} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>

                          <span className="text-[11px] text-gray-500">{r.toVariantId ? "Selected ✅" : "Required"}</span>
                        </>
                      ) : (
                        <span className="text-[11px] text-gray-500">Simple product — size change not applicable</span>
                      )}
                    </div>

                    {!productLoading && hasVariants && sizes.length === 0 ? (
                      <div className="mt-2 text-xs text-orange-600">
                        No size variants found (check product variants/attributes).
                      </div>
                    ) : null}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-700">Qty</span>
                    <input
                      type="number"
                      min={1}
                      value={r.qty}
                      onChange={(e) => updateRow(idx, { qty: n(e.target.value, 1) })}
                      className="w-20 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-black/20"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-gray-100 p-3">
          <div className="text-xs font-semibold text-gray-700">Admin Note</div>
          <textarea
            rows={3}
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="Internal note..."
            className="mt-2 w-full rounded-2xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-black/20 resize-none"
          />
        </div>

        <div className="rounded-2xl border border-gray-100 p-3">
          <div className="text-xs font-semibold text-gray-700">Customer Note</div>
          <textarea
            rows={3}
            value={customerNote}
            onChange={(e) => setCustomerNote(e.target.value)}
            placeholder="Shown to customer..."
            className="mt-2 w-full rounded-2xl border border-gray-200 bg-white p-3 text-sm outline-none focus:border-black/20 resize-none"
          />
        </div>
      </div>
    </PortalModal>
  );
}
