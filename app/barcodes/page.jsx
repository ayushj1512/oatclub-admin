"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Barcode,
  ChevronRight,
  CircleCheck,
  History,
  Loader2,
  PackagePlus,
  Printer,
  ScanLine,
} from "lucide-react";

import { useBarcodeStore } from "@/store/barcodeStore";

const ACTIONS = [
  {
    title: "Generate Barcodes",
    description:
      "Create unique productCode-size-pieceId barcodes for physical inventory.",
    href: "/barcodes/generate",
    icon: PackagePlus,
  },
  {
    title: "Print Tags",
    description:
      "Search, select and print existing OATCLUB physical product tags.",
    href: "/barcodes/print",
    icon: Printer,
  },
  {
    title: "Scan Barcode",
    description:
      "Scan a barcode to identify the exact physical piece and its order status.",
    href: "/barcodes/scan",
    icon: ScanLine,
  },
];

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

const formatStatus = (value = "") => {
  const status = String(value || "")
    .trim()
    .toLowerCase();

  if (!status) return "Unknown";

  return status
    .split("-")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
};

export default function BarcodesDashboardPage() {
  const {
    items,
    loading,
    pagination,
    error,
    fetchBarcodeItems,
  } = useBarcodeStore();

  useEffect(() => {
    fetchBarcodeItems({
      page: 1,
      limit: 8,
      sort: "newest",
    }).catch(() => {});
  }, [fetchBarcodeItems]);

  const stats = useMemo(() => {
    const uniqueProducts = new Set(
      items
        .map((item) => item.productCode)
        .filter(Boolean)
    ).size;

    const latestSequence = items.reduce(
      (highest, item) =>
        Math.max(
          highest,
          Number(item.sequence || 0)
        ),
      0
    );

    const availablePieces = items.filter(
      (item) => item.status === "available"
    ).length;

    return {
      total:
        pagination.total || items.length,
      products: uniqueProducts,
      latestSequence,
      availablePieces,
    };
  }, [items, pagination.total]);

  return (
    <main className="min-h-screen bg-neutral-50 p-4 md:p-7">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 md:p-8">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
            OATCLUB · Physical Inventory Identity
          </span>

          <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-[-0.04em] text-neutral-950 md:text-5xl">
                Barcode Management
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">
                Track every physical piece using a
                product-code, size and unique piece ID.
                Example: 00034-M-29.
              </p>
            </div>

            <Link
              href="/barcodes/generate"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-xs font-semibold text-white transition hover:bg-neutral-800"
            >
              <PackagePlus size={17} />
              Generate Barcodes
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Pieces"
            value={stats.total}
            icon={Barcode}
          />

          <StatCard
            label="Products Visible"
            value={stats.products}
            icon={History}
          />

          <StatCard
            label="Latest Piece ID"
            value={
              stats.latestSequence
                ? String(stats.latestSequence)
                : "—"
            }
            icon={ScanLine}
          />

          <StatCard
            label="Available Visible"
            value={stats.availablePieces}
            icon={CircleCheck}
          />
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {ACTIONS.map((action) => {
            const Icon = action.icon;

            return (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-2xl border border-neutral-200 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-neutral-950 text-white">
                    <Icon size={19} />
                  </div>

                  <ChevronRight
                    size={18}
                    className="text-neutral-400 transition group-hover:translate-x-1"
                  />
                </div>

                <h2 className="mt-5 text-base font-semibold text-neutral-950">
                  {action.title}
                </h2>

                <p className="mt-2 text-xs leading-6 text-neutral-500">
                  {action.description}
                </p>
              </Link>
            );
          })}
        </section>

        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-950">
                Recently Generated
              </h2>

              <p className="mt-1 text-[11px] text-neutral-500">
                Latest individually tracked physical pieces
              </p>
            </div>

            <Link
              href="/barcodes/print"
              className="text-xs font-semibold text-neutral-950 underline underline-offset-4"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <div className="grid min-h-52 place-items-center">
              <Loader2 className="animate-spin" />
            </div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600">
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="grid min-h-52 place-items-center px-5 text-center">
              <div>
                <Barcode
                  size={30}
                  className="mx-auto text-neutral-400"
                />

                <strong className="mt-3 block text-sm text-neutral-950">
                  No physical pieces generated
                </strong>

                <p className="mt-1 text-xs text-neutral-500">
                  Generate your first traceable product barcode.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-neutral-50 text-[10px] uppercase tracking-wider text-neutral-500">
                  <tr>
                    <th className="px-5 py-3">
                      Piece ID
                    </th>

                    <th className="px-5 py-3">
                      Product Code
                    </th>

                    <th className="px-5 py-3">
                      Size
                    </th>

                    <th className="px-5 py-3">
                      Piece SKU
                    </th>

                    <th className="px-5 py-3">
                      Status
                    </th>

                    <th className="px-5 py-3">
                      Order
                    </th>

                    <th className="px-5 py-3">
                      Price Snapshot
                    </th>

                    <th className="px-5 py-3">
                      Created
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => {
                    const status =
                      item.status || "unknown";

                    return (
                      <tr
                        key={item._id}
                        className="border-t border-neutral-100 text-xs transition hover:bg-neutral-50"
                      >
                        <td className="px-5 py-4 font-semibold text-neutral-950">
                          {item.uniqueId ||
                            item.sequence ||
                            "—"}
                        </td>

                        <td className="px-5 py-4 font-medium text-neutral-950">
                          {item.productCode || "—"}
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex min-w-8 items-center justify-center rounded-md border border-neutral-200 bg-white px-2 py-1 font-semibold">
                            {item.size || "—"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <Link
                            href={`/barcodes/${item._id}`}
                            className="font-mono text-[11px] font-semibold text-neutral-950 underline-offset-4 hover:underline"
                          >
                            {item.pieceSku ||
                              item.barcode ||
                              "—"}
                          </Link>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                              STATUS_STYLES[
                                status
                              ] ||
                              "border-neutral-200 bg-neutral-50 text-neutral-600"
                            }`}
                          >
                            {formatStatus(status)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-neutral-600">
                          {item.assignedOrderNumber ||
                            "Unassigned"}
                        </td>

                        <td className="px-5 py-4">
                          {formatPrice(
                            item.priceSnapshot
                          )}
                        </td>

                        <td className="px-5 py-4 text-neutral-500">
                          {formatDate(
                            item.createdAt
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}) {
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          {label}
        </span>

        <Icon
          size={17}
          className="text-neutral-500"
        />
      </div>

      <strong className="mt-5 block text-2xl font-bold tracking-tight text-neutral-950">
        {value}
      </strong>
    </article>
  );
}