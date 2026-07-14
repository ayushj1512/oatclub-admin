"use client";

import { useEffect, useRef, useState } from "react";
import {
  Barcode,
  Loader2,
  ScanLine,
  X,
} from "lucide-react";

import BarcodeTag from "@/components/barcode/BarcodeTag";
import { useBarcodeStore } from "@/store/barcodeStore";

export default function ScanBarcodePage() {
  const inputRef = useRef(null);

  const {
    scannedItem,
    scanning,
    error,
    successMessage,
    scanBarcode,
    clearScannedItem,
    clearMessages,
  } = useBarcodeStore();

  const [barcodeText, setBarcodeText] = useState("");

  useEffect(() => {
    inputRef.current?.focus();

    return () => {
      clearScannedItem();
      clearMessages();
    };
  }, [clearMessages, clearScannedItem]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const value = barcodeText.trim();

    if (!value) return;

    try {
      await scanBarcode(value);
      setBarcodeText("");
      inputRef.current?.focus();
    } catch {
      inputRef.current?.focus();
    }
  };

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
            Keep the input focused and scan a physical OATCLUB
            barcode using your handheld scanner.
          </p>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-neutral-950 text-white">
              <ScanLine size={20} />
            </div>

            <div>
              <h2 className="text-base font-semibold">
                Scanner Input
              </h2>

              <p className="mt-1 text-xs leading-6 text-neutral-500">
                Barcode scanners normally submit automatically
                after scanning.
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
                  setBarcodeText(event.target.value)
                }
                placeholder="OATCLUB-1081-XS-1499-00000001"
                autoComplete="off"
                className="min-h-14 w-full rounded-xl border border-neutral-300 bg-white pl-12 pr-4 font-mono text-xs outline-none focus:border-neutral-950"
              />
            </div>

            <button
              type="submit"
              disabled={scanning || !barcodeText.trim()}
              className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-7 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {scanning ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <ScanLine size={18} />
              )}

              {scanning ? "Scanning..." : "Scan"}
            </button>
          </form>
        </section>

        {(error || successMessage) && (
          <div
            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            <span>{error || successMessage}</span>

            <button type="button" onClick={clearMessages}>
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Verified Physical Unit
              </span>

              <dl className="mt-5 space-y-4">
                <DetailRow
                  label="Product ID"
                  value={scannedItem.productId}
                />

                <DetailRow
                  label="Size"
                  value={scannedItem.size}
                />

                <DetailRow
                  label="Price"
                  value={`₹${Number(
                    scannedItem.price || 0
                  ).toLocaleString("en-IN")}`}
                />

                <DetailRow
                  label="Serial Number"
                  value={scannedItem.serialCode}
                />

                <DetailRow
                  label="Barcode"
                  value={scannedItem.barcode}
                  mono
                />
              </dl>

              <button
                type="button"
                onClick={() => {
                  clearScannedItem();
                  clearMessages();
                  inputRef.current?.focus();
                }}
                className="mt-6 w-full rounded-xl border border-neutral-950 bg-white px-4 py-3 text-xs font-semibold"
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

              <strong className="mt-4 block text-sm">
                Waiting for barcode scan
              </strong>

              <p className="mt-2 text-xs text-neutral-500">
                Scanned product information will appear here.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function DetailRow({ label, value, mono = false }) {
  return (
    <div className="border-b border-neutral-200 pb-4 last:border-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </dt>

      <dd
        className={`mt-1 break-all text-sm font-semibold text-neutral-950 ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value || "—"}
      </dd>
    </div>
  );
}