"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Loader2,
  Printer,
  Trash2,
} from "lucide-react";

import BarcodeTag from "@/components/barcode/BarcodeTag";
import { useBarcodeStore } from "@/store/barcodeStore";

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
  });
};

export default function BarcodeDetailPage() {
  const params = useParams();
  const id = params?.id;

  const {
    selectedItem,
    loading,
    deleting,
    error,
    fetchBarcodeItemById,
    deleteBarcodeItem,
    getBarcodePngUrl,
    clearSelectedItem,
  } = useBarcodeStore();

  useEffect(() => {
    if (!id) return;

    fetchBarcodeItemById(id).catch(() => {});

    return () => {
      clearSelectedItem();
    };
  }, [id, fetchBarcodeItemById, clearSelectedItem]);

  const handleDelete = async () => {
    if (!selectedItem?._id) return;

    const confirmed = window.confirm(
      `Delete barcode ${selectedItem.barcode}?`
    );

    if (!confirmed) return;

    try {
      await deleteBarcodeItem(selectedItem._id);
      window.location.href = "/barcodes";
    } catch {
      // Store handles error.
    }
  };

  if (loading && !selectedItem) {
    return (
      <main className="grid min-h-screen place-items-center bg-neutral-50">
        <Loader2 className="animate-spin" />
      </main>
    );
  }

  if (error && !selectedItem) {
    return (
      <main className="grid min-h-screen place-items-center bg-neutral-50 p-5 text-center">
        <div>
          <strong className="text-base text-red-600">
            {error}
          </strong>

          <Link
            href="/barcodes"
            className="mt-4 block text-sm font-semibold underline"
          >
            Return to barcodes
          </Link>
        </div>
      </main>
    );
  }

  if (!selectedItem) return null;

  return (
    <main className="min-h-screen bg-neutral-50 p-4 md:p-7">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="no-print flex flex-col justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-5 md:flex-row md:items-center">
          <Link
            href="/barcodes"
            className="inline-flex items-center gap-2 text-xs font-semibold"
          >
            <ArrowLeft size={16} />
            Back to Barcodes
          </Link>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-neutral-950 px-4 text-xs font-semibold"
            >
              <Printer size={16} />
              Print Tag
            </button>

            <a
              href={getBarcodePngUrl(selectedItem._id)}
              download={`${selectedItem.barcode}.png`}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 text-xs font-semibold text-white"
            >
              <Download size={16} />
              Download PNG
            </a>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-300 px-4 text-xs font-semibold text-red-600 disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}

              Delete
            </button>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-[360px_1fr]">
          <div className="print-tag mx-auto w-full max-w-[360px]">
            <BarcodeTag
              item={selectedItem}
              showMeta
            />
          </div>

          <div className="no-print rounded-2xl border border-neutral-200 bg-white p-5 md:p-7">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
              Physical Product Identity
            </span>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-neutral-950">
              Serial {selectedItem.serialCode}
            </h1>

            <dl className="mt-7 grid gap-5 sm:grid-cols-2">
              <Detail
                label="Product ID"
                value={selectedItem.productId}
              />

              <Detail
                label="Size"
                value={selectedItem.size}
              />

              <Detail
                label="MRP"
                value={`₹${Number(
                  selectedItem.price || 0
                ).toLocaleString("en-IN")}`}
              />

              <Detail
                label="Serial Number"
                value={selectedItem.serialNumber}
              />

              <Detail
                label="Serial Code"
                value={selectedItem.serialCode}
              />

              <Detail
                label="Created At"
                value={formatDate(selectedItem.createdAt)}
              />

              <div className="sm:col-span-2">
                <Detail
                  label="Complete Barcode"
                  value={selectedItem.barcode}
                  mono
                />
              </div>
            </dl>
          </div>
        </section>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
          }

          .no-print {
            display: none !important;
          }

          main {
            min-height: auto !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          main > div {
            max-width: none !important;
          }

          main section {
            display: block !important;
          }

          .print-tag {
            width: 70mm !important;
            max-width: 70mm !important;
            margin: 0 auto !important;
          }

          .barcode-tag-wrapper {
            padding: 0 !important;
            border: 0 !important;
            box-shadow: none !important;
          }

          .barcode-meta {
            display: none !important;
          }
        }
      `}</style>
    </main>
  );
}

function Detail({ label, value, mono = false }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </dt>

      <dd
        className={`mt-2 break-all text-sm font-semibold text-neutral-950 ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}