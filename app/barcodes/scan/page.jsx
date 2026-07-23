"use client";

import { useEffect, useRef, useState } from "react";
import {
  Barcode,
  Loader2,
  PackageCheck,
  ScanLine,
  X,
} from "lucide-react";

import BarcodeTag from "@/components/barcode/BarcodeTag";
import { useBarcodeStore } from "@/store/barcodeStore";

const STATUS_STYLES = {
  available:
    "border-emerald-200 bg-emerald-50 text-emerald-700",
  reserved:
    "border-amber-200 bg-amber-50 text-amber-700",
  allocated:
    "border-blue-200 bg-blue-50 text-blue-700",
  packed:
    "border-violet-200 bg-violet-50 text-violet-700",
  shipped:
    "border-cyan-200 bg-cyan-50 text-cyan-700",
  delivered:
    "border-green-200 bg-green-50 text-green-700",
  returned:
    "border-orange-200 bg-orange-50 text-orange-700",
  damaged:
    "border-red-200 bg-red-50 text-red-700",
  lost:
    "border-red-200 bg-red-50 text-red-700",
  removed:
    "border-neutral-300 bg-neutral-100 text-neutral-600",
};

const normalizeBarcodeInput = (value = "") =>
  String(value || "")
    .trim()
    .toUpperCase();

const formatStatus = (value = "") => {
  const status = String(value || "")
    .trim()
    .toLowerCase();

  if (!status) return "Unknown";

  return status
    .split("-")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
};

const formatPrice = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "—";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default function ScanBarcodePage() {
  const inputRef = useRef(null);

  const {
    scannedItem,
    lastParsedScan,
    scanning,
    error,
    successMessage,
    scanBarcode,
    clearScannedItem,
    clearMessages,
  } = useBarcodeStore();

  const [barcodeText, setBarcodeText] =
    useState("");

  useEffect(() => {
    inputRef.current?.focus();

    return () => {
      clearScannedItem();
      clearMessages();
    };
  }, [
    clearMessages,
    clearScannedItem,
  ]);

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    const value =
      normalizeBarcodeInput(
        barcodeText
      );

    if (!value) return;

    try {
      await scanBarcode(value);

      setBarcodeText("");

      window.requestAnimationFrame(
        () => {
          inputRef.current?.focus();
        }
      );
    } catch {
      window.requestAnimationFrame(
        () => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }
      );
    }
  };

  const handleScanAnother = () => {
    clearScannedItem();
    clearMessages();
    setBarcodeText("");

    window.requestAnimationFrame(
      () => {
        inputRef.current?.focus();
      }
    );
  };

  const status =
    scannedItem?.status || "unknown";

  return (
    <main className="min-h-screen bg-neutral-50 p-4 md:p-7">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 md:p-8">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
            Warehouse Scanner
          </span>

          <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-neutral-950 md:text-5xl">
            Scan Product Barcode
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">
            Scan an exact physical product
            piece using the format
            productCode-size-pieceId.
            Example: 00034-M-29.
          </p>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-neutral-950 text-white">
              <ScanLine size={20} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-neutral-950">
                Scanner Input
              </h2>

              <p className="mt-1 text-xs leading-6 text-neutral-500">
                Most handheld scanners
                automatically press Enter after
                scanning.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-6 flex flex-col gap-3 md:flex-row"
          >
            <div className="relative flex-1">
              <Barcode
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
              />

              <input
                ref={inputRef}
                type="text"
                value={barcodeText}
                onChange={(event) =>
                  setBarcodeText(
                    event.target.value
                  )
                }
                placeholder="00034-M-29"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="min-h-14 w-full rounded-xl border border-neutral-300 bg-white pl-12 pr-4 font-mono text-sm uppercase outline-none transition focus:border-neutral-950"
              />
            </div>

            <button
              type="submit"
              disabled={
                scanning ||
                !barcodeText.trim()
              }
              className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-7 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {scanning ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <ScanLine size={18} />
              )}

              {scanning
                ? "Scanning..."
                : "Scan"}
            </button>
          </form>

          <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="font-mono text-[11px] text-neutral-600">
              Expected format:
              PRODUCTCODE-SIZE-UNIQUEID
            </p>
          </div>
        </section>

        {(error ||
          successMessage) && (
          <div
            className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-xs ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            <span>
              {error ||
                successMessage}
            </span>

            <button
              type="button"
              onClick={clearMessages}
              className="shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {scannedItem ? (
          <section className="grid gap-5 rounded-2xl border border-neutral-200 bg-white p-5 md:grid-cols-[340px_1fr] md:p-6">
            <div className="mx-auto w-full max-w-[340px]">
              <BarcodeTag
                item={scannedItem}
                compact
                showMeta
              />
            </div>

            <div className="rounded-2xl bg-neutral-50 p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Verified Physical Unit
                  </span>

                  <h2 className="mt-2 text-lg font-bold text-neutral-950">
                    {scannedItem.pieceSku ||
                      scannedItem.barcode}
                  </h2>
                </div>

                <span
                  className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-[10px] font-semibold ${
                    STATUS_STYLES[
                      status
                    ] ||
                    "border-neutral-200 bg-white text-neutral-600"
                  }`}
                >
                  {formatStatus(status)}
                </span>
              </div>

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <DetailRow
                  label="Product Code"
                  value={
                    scannedItem.productCode
                  }
                />

                <DetailRow
                  label="Size"
                  value={scannedItem.size}
                />

                <DetailRow
                  label="Unique Piece ID"
                  value={
                    scannedItem.uniqueId ||
                    scannedItem.sequence
                  }
                />

                <DetailRow
                  label="Variant SKU"
                  value={
                    scannedItem.variantSku
                  }
                  mono
                />

                <DetailRow
                  label="Piece SKU"
                  value={
                    scannedItem.pieceSku
                  }
                  mono
                />

                <DetailRow
                  label="Barcode"
                  value={
                    scannedItem.barcode
                  }
                  mono
                />

                <DetailRow
                  label="Price Snapshot"
                  value={formatPrice(
                    scannedItem.priceSnapshot
                  )}
                />

                <DetailRow
                  label="MRP Snapshot"
                  value={formatPrice(
                    scannedItem.mrpSnapshot
                  )}
                />

                <DetailRow
                  label="Assigned Order"
                  value={
                    scannedItem.assignedOrderNumber ||
                    "Unassigned"
                  }
                />

                <DetailRow
                  label="Inward Batch"
                  value={
                    scannedItem.inwardBatchCode ||
                    "—"
                  }
                />

                <DetailRow
                  label="Source"
                  value={formatStatus(
                    scannedItem.source
                  )}
                />

                <DetailRow
                  label="Created"
                  value={formatDate(
                    scannedItem.createdAt
                  )}
                />
              </dl>

              {scannedItem.assignedOrderNumber && (
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <PackageCheck
                    size={18}
                    className="mt-0.5 shrink-0 text-blue-700"
                  />

                  <div>
                    <p className="text-xs font-semibold text-blue-900">
                      Assigned to order{" "}
                      {
                        scannedItem.assignedOrderNumber
                      }
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-blue-700">
                      This unique physical piece
                      is already linked with an
                      order. Verify before using
                      it again.
                    </p>
                  </div>
                </div>
              )}

              {lastParsedScan && (
                <div className="mt-5 rounded-xl border border-neutral-200 bg-white p-4">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                    Parsed Scan
                  </span>

                  <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-3">
                    <ParsedValue
                      label="Product"
                      value={
                        lastParsedScan.productCode
                      }
                    />

                    <ParsedValue
                      label="Size"
                      value={
                        lastParsedScan.size
                      }
                    />

                    <ParsedValue
                      label="Unique ID"
                      value={
                        lastParsedScan.uniqueId
                      }
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={
                  handleScanAnother
                }
                className="mt-6 w-full rounded-xl border border-neutral-950 bg-white px-4 py-3 text-xs font-semibold transition hover:bg-neutral-950 hover:text-white"
              >
                Scan Another Product
              </button>
            </div>
          </section>
        ) : (
          <section className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-neutral-300 bg-white px-5 text-center">
            <div>
              <ScanLine
                size={35}
                className="mx-auto text-neutral-400"
              />

              <strong className="mt-4 block text-sm text-neutral-950">
                Waiting for barcode scan
              </strong>

              <p className="mt-2 text-xs text-neutral-500">
                The exact physical piece,
                inventory status and assigned
                order will appear here.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}) {
  return (
    <div className="border-b border-neutral-200 pb-4">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </dt>

      <dd
        className={`mt-1 break-all text-sm font-semibold text-neutral-950 ${
          mono
            ? "font-mono text-xs"
            : ""
        }`}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

function ParsedValue({
  label,
  value,
}) {
  return (
    <div>
      <span className="block text-[9px] font-semibold uppercase tracking-wider text-neutral-400">
        {label}
      </span>

      <strong className="mt-1 block font-mono text-neutral-950">
        {value || "—"}
      </strong>
    </div>
  );
}