"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import StatusDropdown from "@/components/customer-support/StatusDropdown";
import OrderLookupPanel from "@/components/customer-support/OrderLookupPanel";
import {
  Clock,
  ExternalLink,
  Image as ImageIcon,
  Phone,
  ChevronDown,
  ChevronUp,
  Trash2,
  Clipboard,
  X,
  Save,
} from "lucide-react";

/* ---------------- helpers ---------------- */
const safe = (v) => String(v ?? "").trim();
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "-");

const isImageUrl = (a) => {
  const mt = safe(a?.mimeType).toLowerCase();
  const url = safe(a?.url).toLowerCase();
  if (mt.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(url);
};

const clip = async (text) => {
  try {
    await navigator.clipboard.writeText(String(text || ""));
    toast.success("Copied ✅");
  } catch {
    toast.error("Copy failed");
  }
};

// "23" -> "MIRAY-000023", "miray-23" -> "MIRAY-000023", "MIRAY-000271" stays
const normalizeOrderNumber = (input) => {
  const raw = safe(input);
  if (!raw) return "";
  const up = raw.toUpperCase();

  // already normalized MIRAY-000123
  const full = up.match(/^MIRAY-(\d{6})$/);
  if (full) return `MIRAY-${full[1]}`;

  // MIRAY-123
  const m = up.match(/^MIRAY-(\d+)$/);
  if (m) {
    const n = m[1].replace(/\D/g, "");
    if (!n) return "";
    return `MIRAY-${n.slice(-6).padStart(6, "0")}`;
  }

  // any digits
  const digits = up.replace(/[^\d]/g, "");
  if (!digits) return "";
  return `MIRAY-${digits.slice(-6).padStart(6, "0")}`;
};

/* ---------------- portal modals ---------------- */
function ModalShell({ open, onClose, children, z = 80 }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className={`fixed inset-0 z-[${z}] flex items-center justify-center p-4`}>
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close"
      />
      {children}
    </div>,
    document.body
  );
}

function ConfirmDeleteModal({ open, ticketId, loading, onClose, onConfirm }) {
  return (
    <ModalShell open={open} onClose={onClose}>
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-black/10">
        <div className="flex items-start justify-between gap-3 p-4 border-b border-gray-200">
          <div>
            <p className="text-sm font-extrabold text-gray-900">Delete Ticket?</p>
            <p className="mt-1 text-xs text-gray-600">This action cannot be undone.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs text-gray-600">Ticket ID</p>
            <p className="mt-1 text-sm font-bold text-gray-900">{ticketId || "-"}</p>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-red-600 text-white hover:opacity-90 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              {loading ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function Lightbox({ open, src, alt, onClose }) {
  return (
    <ModalShell open={open} onClose={onClose} z={90}>
      <div className="relative w-full max-w-5xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow ring-1 ring-black/10 hover:bg-gray-50"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative w-full max-h-[85vh] aspect-[16/10] overflow-hidden rounded-2xl bg-black/30 ring-1 ring-white/10">
          <Image
            src={src}
            alt={alt || "preview"}
            fill
            sizes="(max-width: 768px) 100vw, 1000px"
            className="object-contain"
            priority
          />
        </div>
      </div>
    </ModalShell>
  );
}

/* ---------------- component ---------------- */
export default function CustomerTicketRow({
  t,
  isOpen,
  onToggle,
  onDeleted,
  apiBase,

  checked = false,
  onCheck = () => {},
}) {
  const API_BASE = useMemo(() => {
    if (apiBase) return apiBase;
    const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "";
    return `${BACKEND}/api/support`;
  }, [apiBase]);

  const id = safe(t?.ticketId);
  const phone = safe(t?.phone);
  const email = safe(t?.email);
  const atts = Array.isArray(t?.attachments) ? t.attachments : [];
  const atCount = atts.length;

  const serverOrderRaw = safe(t?.orderNumber);
  const serverOrder = useMemo(() => normalizeOrderNumber(serverOrderRaw), [serverOrderRaw]);

  const [orderInput, setOrderInput] = useState(serverOrderRaw);
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => setOrderInput(serverOrderRaw), [serverOrderRaw]);

  const normalizedPreview = useMemo(
    () => normalizeOrderNumber(orderInput || serverOrderRaw),
    [orderInput, serverOrderRaw]
  );

  // ✅ If ticket has order number, we still show OrderLookupPanel but in "attached view mode"
  const showOrderEditor = !serverOrder;

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [lb, setLb] = useState({ open: false, src: "", alt: "" });
  const openLb = (src, alt) => setLb({ open: true, src: safe(src), alt: safe(alt) });
  const closeLb = () => setLb({ open: false, src: "", alt: "" });

  const confirmDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/tickets/${encodeURIComponent(id)}`, {
        method: "DELETE",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || `Delete failed (${res.status})`);
      }
      toast.success("Ticket deleted ✅");
      setDeleteOpen(false);
      onDeleted?.(id);
    } catch (e) {
      toast.error(e?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const saveOrderNumber = async (forceOrderNumber = null) => {
    if (!id) return;

    const next = normalizeOrderNumber(forceOrderNumber ?? orderInput);
    if (!next) return toast.error("Enter order number like 23 or MIRAY-000023");

    setSavingOrder(true);
    try {
      const res = await fetch(`${API_BASE}/tickets/${encodeURIComponent(id)}/order`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: next }),
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || `Failed (${res.status})`);
      }

      toast.success("Order number saved ✅");
      setOrderInput(next); // local update
      // NOTE: parent list should refresh t.orderNumber from server; but panel below uses `attachedOrderNumber`
    } catch (e) {
      toast.error(e?.message || "Failed to save order number");
    } finally {
      setSavingOrder(false);
    }
  };

  // ✅ IMPORTANT: we added 1 extra column (Select), so colspan becomes 12 now
  const COLSPAN = 12;

  return (
    <Fragment>
      <ConfirmDeleteModal
        open={deleteOpen}
        ticketId={id}
        loading={deleting}
        onClose={() => !deleting && setDeleteOpen(false)}
        onConfirm={confirmDelete}
      />
      <Lightbox open={lb.open} src={lb.src} alt={lb.alt} onClose={closeLb} />

      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3">
          <input
            type="checkbox"
            checked={!!checked}
            disabled={!id}
            onChange={(e) => onCheck(e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 accent-blue-600"
            aria-label="Select ticket"
          />
        </td>

        <td className="px-4 py-3 text-xs font-semibold text-blue-700">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-2 hover:underline"
            title="Expand"
          >
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {id || "-"}
          </button>
        </td>

        <td className="px-4 py-3">
          <StatusDropdown ticketId={id} value={t?.status} adminNotes={t?.adminNotes} />
        </td>

        <td className="px-4 py-3">{safe(t?.name) || "-"}</td>
        <td className="px-4 py-3">{email || "-"}</td>

        <td className="px-4 py-3 text-xs text-gray-800">
          {phone ? (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3.5 w-3.5 text-gray-400" /> {phone}
            </span>
          ) : (
            "-"
          )}
        </td>

        <td className="px-4 py-3">{safe(t?.issueType) || "-"}</td>

        <td className="px-4 py-3 max-w-[380px]">
          <span className="line-clamp-1">{safe(t?.subject) || "-"}</span>
          <div className="mt-1 text-[11px] text-gray-500">
            Order:{" "}
            <span className="font-semibold text-gray-700">
              {serverOrder ? serverOrder : normalizedPreview ? normalizedPreview : "—"}
            </span>
          </div>
        </td>

        <td className="px-4 py-3 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {fmtDate(t?.createdAt)}
          </span>
        </td>

        <td className="px-4 py-3 text-xs text-gray-700">
          {atCount ? (
            <span className="inline-flex items-center gap-1">
              <ImageIcon className="h-3.5 w-3.5" /> {atCount}
            </span>
          ) : (
            "-"
          )}
        </td>

        <td className="px-4 py-3">
          <button
            type="button"
            onClick={onToggle}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold ring-1 ring-inset ${
              isOpen
                ? "bg-blue-600 text-white ring-blue-600"
                : "bg-white text-blue-700 ring-blue-200 hover:bg-blue-50"
            }`}
          >
            {isOpen ? "Hide" : "View"} <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </td>

        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => id && setDeleteOpen(true)}
            disabled={!id}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ring-1 ring-inset transition ${
              id
                ? "bg-white text-red-700 ring-red-200 hover:bg-red-50"
                : "bg-gray-100 text-gray-400 ring-gray-200 cursor-not-allowed"
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </td>
      </tr>

      {isOpen ? (
        <tr className="bg-gray-50">
          <td colSpan={COLSPAN} className="px-4 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8">
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500">Message</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                        {safe(t?.message) || "-"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => clip(id)}
                      className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold bg-white ring-1 ring-inset ring-gray-200 hover:bg-gray-50"
                    >
                      <Clipboard className="h-4 w-4" /> Copy ID
                    </button>
                  </div>

                  {/* ✅ ALWAYS show lookup panel:
                      - If order number exists -> details auto show (attachedOrderNumber)
                      - Else -> it helps search and attach
                  */}
                  {(email || phone || serverOrder || safe(orderInput)) ? (
                    <div className="mt-4">
                      <OrderLookupPanel
                        email={email}
                        phone={phone}
                        disabled={savingOrder}
                        initialAutoSearch={!serverOrder} // if already have orderNumber, avoid extra identity search on open
                        attachedOrderNumber={serverOrder || normalizeOrderNumber(orderInput)}
                        onAttach={(orderNumber) => saveOrderNumber(orderNumber)}
                      />
                    </div>
                  ) : null}

                  {/* manual add (only when missing server order) */}
                  {showOrderEditor ? (
                    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs font-semibold text-gray-500">
                        Add Order Number (23 → MIRAY-000023)
                      </p>

                      <div className="mt-2 flex items-center gap-2">
                        <input
                          value={orderInput}
                          onChange={(e) => setOrderInput(e.target.value)}
                          placeholder="e.g. 23 or MIRAY-23"
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                        />
                        <button
                          type="button"
                          onClick={() => saveOrderNumber()}
                          disabled={savingOrder || !safe(orderInput)}
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                        >
                          <Save className="h-4 w-4" />
                          {savingOrder ? "Saving…" : "Save"}
                        </button>
                      </div>

                      {normalizedPreview ? (
                        <p className="mt-2 text-[11px] text-gray-600">
                          Normalized: <span className="font-semibold">{normalizedPreview}</span>
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {safe(t?.adminNotes) ? (
                    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs font-semibold text-gray-500">Admin Notes</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                        {safe(t?.adminNotes)}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="lg:col-span-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-xs font-semibold text-gray-500">Attachments</p>

                  {!atts.length ? (
                    <p className="mt-2 text-sm text-gray-600">No files</p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {atts.map((a, i) => {
                        const url = safe(a?.url);
                        const img = isImageUrl(a);
                        const name = safe(a?.filename) || `file-${i + 1}`;

                        return (
                          <div
                            key={`${id || "ticket"}-att-${i}`}
                            className="rounded-xl border border-gray-200 bg-white p-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs font-semibold text-gray-800 line-clamp-1">
                                {name}
                              </p>
                              <a
                                href={url || "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
                              >
                                Open <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </div>

                            {img && url ? (
                              <button
                                type="button"
                                onClick={() => openLb(url, name)}
                                className="mt-2 w-full text-left"
                                title="Open preview"
                              >
                                <div className="relative w-full h-[220px] overflow-hidden rounded-lg border border-gray-100">
                                  <Image
                                    src={url}
                                    alt={name}
                                    fill
                                    sizes="(max-width: 768px) 100vw, 420px"
                                    className="object-cover hover:opacity-95"
                                  />
                                </div>
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  <Link
                    href={id ? `/customer-support/${encodeURIComponent(id)}` : "#"}
                    className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ring-1 ring-inset transition ${
                      id
                        ? "bg-blue-600 text-white ring-blue-600 hover:opacity-90"
                        : "bg-gray-100 text-gray-400 ring-gray-200 pointer-events-none"
                    }`}
                  >
                    Open Full Page <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}