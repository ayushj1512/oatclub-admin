"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  Loader2,
  Megaphone,
  MoreVertical,
  Printer,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useReactToPrint } from "react-to-print";

import InvoiceTemplate from "@/components/invoice/InvoiceTemplate";
import { useOrderStore } from "@/store/orderStore";

const safe = (value) => String(value ?? "").trim();

export default function OrderRowActions({
  order,
  courierName = "",
  trackingId = "",
  onRefresh,
}) {
  const menuRef = useRef(null);
  const invoiceRef = useRef(null);

  const fetchInvoiceByOrderNumber = useOrderStore(
    (state) => state.fetchInvoiceByOrderNumber
  );

  const fetchInvoiceByOrderId = useOrderStore(
    (state) => state.fetchInvoiceByOrderId
  );

  const markOrderAsInfluencer = useOrderStore(
    (state) => state.markOrderAsInfluencer
  );

  const [open, setOpen] = useState(false);
  const [invoice, setInvoice] = useState(null);

  const [loading, setLoading] = useState(false);
  const [updatingInfluencer, setUpdatingInfluencer] =
    useState(false);

  const [error, setError] = useState("");
  const [pendingPrint, setPendingPrint] = useState(false);

  const [isInfluencerOrder, setIsInfluencerOrder] = useState(
    order?.isInfluencerOrder === true
  );

  const orderId = safe(order?._id || order?.id);
  const orderNumber = safe(order?.orderNumber);
  const printTitle = orderNumber || orderId || "order";

  useEffect(() => {
    setIsInfluencerOrder(order?.isInfluencerOrder === true);
  }, [order?.isInfluencerOrder]);

  const printInvoice = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: `Invoice-${printTitle}`,
    pageStyle: `
      @page {
        size: A4;
        margin: 10mm;
      }

      @media print {
        html,
        body {
          margin: 0;
          padding: 0;
          background: white;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
  });

  const loadInvoice = useCallback(async () => {
    if (!orderNumber && !orderId) {
      throw new Error("Order number or order ID is missing.");
    }

    const result = orderNumber
      ? await fetchInvoiceByOrderNumber(orderNumber, {
          silent: true,
        })
      : await fetchInvoiceByOrderId(orderId, {
          silent: true,
        });

    if (!result) {
      throw new Error("Backend did not return invoice data.");
    }

    return {
      ...result,

      courier: {
        ...(result?.courier || {}),

        name:
          safe(result?.courier?.name) ||
          safe(result?.courier?.courierName) ||
          safe(courierName) ||
          "-",

        courierName:
          safe(result?.courier?.courierName) ||
          safe(result?.courier?.name) ||
          safe(courierName) ||
          "-",

        awb:
          safe(result?.courier?.awb) ||
          safe(result?.courier?.trackingId) ||
          safe(trackingId) ||
          "-",

        trackingId:
          safe(result?.courier?.trackingId) ||
          safe(result?.courier?.awb) ||
          safe(trackingId) ||
          "-",
      },
    };
  }, [
    orderNumber,
    orderId,
    courierName,
    trackingId,
    fetchInvoiceByOrderNumber,
    fetchInvoiceByOrderId,
  ]);

  const handlePrint = async () => {
    setOpen(false);
    setLoading(true);
    setError("");

    try {
      const result = await loadInvoice();

      setInvoice(result);
      setPendingPrint(true);
    } catch (fetchError) {
      console.error(
        "OrderRowActions invoice error:",
        fetchError
      );

      setError(
        fetchError?.message || "Failed to load invoice."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInfluencerToggle = async () => {
    if (!orderId || updatingInfluencer) return;

    const previousValue = isInfluencerOrder;
    const nextValue = !previousValue;

    setOpen(false);
    setUpdatingInfluencer(true);
    setIsInfluencerOrder(nextValue);

    try {
      await markOrderAsInfluencer(orderId, nextValue);

      toast.success(
        nextValue
          ? "Marked as influencer order"
          : "Removed from influencer orders"
      );

      await onRefresh?.();
    } catch (updateError) {
      console.error(
        "OrderRowActions influencer update error:",
        updateError
      );

      setIsInfluencerOrder(previousValue);

      toast.error(
        updateError?.message ||
          "Failed to update influencer order"
      );
    } finally {
      setUpdatingInfluencer(false);
    }
  };

  useEffect(() => {
    if (!pendingPrint || !invoice) return undefined;

    const timer = window.setTimeout(() => {
      printInvoice?.();
      setPendingPrint(false);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [pendingPrint, invoice, printInvoice]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  if (!order) return null;

  const isBusy = loading || updatingInfluencer;

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          disabled={isBusy}
          title="Order actions"
          className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-700 transition hover:bg-black/[0.05] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBusy ? (
            <Loader2
              size={18}
              className="animate-spin"
            />
          ) : (
            <MoreVertical size={18} />
          )}
        </button>

        {open && (
          <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isBusy}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs font-bold text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <Printer size={15} />
              )}

              <span>
                {loading
                  ? "Preparing..."
                  : "Print Invoice"}
              </span>
            </button>

            <div className="h-px bg-zinc-100" />

            <button
              type="button"
              onClick={handleInfluencerToggle}
              disabled={isBusy || !orderId}
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                {updatingInfluencer ? (
                  <Loader2
                    size={15}
                    className="animate-spin text-zinc-600"
                  />
                ) : isInfluencerOrder ? (
                  <BadgeCheck
                    size={15}
                    className="text-green-600"
                  />
                ) : (
                  <Megaphone
                    size={15}
                    className="text-zinc-600"
                  />
                )}

                <div>
                  <div className="text-xs font-bold text-zinc-800">
                    {isInfluencerOrder
                      ? "Remove Influencer Tag"
                      : "Mark as Influencer"}
                  </div>

                  <div className="mt-0.5 text-[10px] font-medium text-zinc-500">
                    {isInfluencerOrder
                      ? "Include in normal reports"
                      : "Exclude from reconciliation"}
                  </div>
                </div>
              </div>

              <span
                className={`rounded-full px-2 py-1 text-[9px] font-bold ${
                  isInfluencerOrder
                    ? "bg-black text-white"
                    : "bg-zinc-100 text-zinc-500"
                }`}
              >
                {isInfluencerOrder ? "ACTIVE" : "OFF"}
              </span>
            </button>
          </div>
        )}

        {error && (
          <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-red-200 bg-red-50 p-3 shadow-lg">
            <div className="flex items-start gap-2 text-xs text-red-800">
              <AlertCircle
                size={15}
                className="mt-0.5 shrink-0"
              />

              <div className="min-w-0 flex-1">
                <div>{error}</div>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="mt-2 inline-flex items-center gap-1 font-bold hover:underline"
                >
                  <RefreshCw size={12} />
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: "-200vw",
          top: 0,
          width: "210mm",
          height: 0,
          overflow: "hidden",
          pointerEvents: "none",
          background: "#ffffff",
        }}
      >
        <div
          ref={invoiceRef}
          style={{
            width: "210mm",
            background: "#ffffff",
          }}
        >
          {invoice ? (
            <InvoiceTemplate data={invoice} />
          ) : null}
        </div>
      </div>
    </>
  );
}