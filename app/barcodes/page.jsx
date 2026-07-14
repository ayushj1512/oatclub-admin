"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Barcode,
  ChevronRight,
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
      "Generate unique serial barcodes for individual physical products.",
    href: "/barcodes/generate",
    icon: PackagePlus,
  },
  {
    title: "Print Tags",
    description:
      "Search, select and print existing OATCLUB product tags.",
    href: "/barcodes/print",
    icon: Printer,
  },
  {
    title: "Scan Barcode",
    description:
      "Scan and verify a physical product using its barcode.",
    href: "/barcodes/scan",
    icon: ScanLine,
  },
];

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
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
    }).catch(() => {});
  }, [fetchBarcodeItems]);

  const stats = useMemo(() => {
    const uniqueProducts = new Set(
      items.map((item) => item.productId).filter(Boolean)
    ).size;

    const latestSerial = items.reduce(
      (highest, item) =>
        Math.max(highest, Number(item.serialNumber || 0)),
      0
    );

    return {
      total: pagination.total || items.length,
      products: uniqueProducts,
      latestSerial,
    };
  }, [items, pagination.total]);

  return (
    <main className="min-h-screen bg-neutral-50 p-4 md:p-7">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 md:p-8">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
            OATCLUB · Inventory Identity
          </span>

          <div className="mt-3 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-3xl font-bold tracking-[-0.04em] text-neutral-950 md:text-5xl">
                Barcode Management
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">
                Generate and manage globally unique serial
                barcodes for every individual physical product.
              </p>
            </div>

            <Link
              href="/barcodes/generate"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-xs font-semibold text-white"
            >
              <PackagePlus size={17} />
              Generate Barcodes
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Barcodes"
            value={stats.total}
            icon={Barcode}
          />

          <StatCard
            label="Products Visible"
            value={stats.products}
            icon={History}
          />

          <StatCard
            label="Latest Serial"
            value={
              stats.latestSerial
                ? String(stats.latestSerial).padStart(8, "0")
                : "—"
            }
            icon={ScanLine}
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
                Latest individual product serials
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
                  No barcodes generated
                </strong>

                <p className="mt-1 text-xs text-neutral-500">
                  Generate your first physical product barcode.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-neutral-50 text-[10px] uppercase tracking-wider text-neutral-500">
                  <tr>
                    <th className="px-5 py-3">Serial</th>
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">Size</th>
                    <th className="px-5 py-3">Price</th>
                    <th className="px-5 py-3">Barcode</th>
                    <th className="px-5 py-3">Created</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item._id}
                      className="border-t border-neutral-100 text-xs"
                    >
                      <td className="px-5 py-4 font-semibold">
                        {item.serialCode}
                      </td>

                      <td className="px-5 py-4">
                        {item.productId}
                      </td>

                      <td className="px-5 py-4">
                        {item.size}
                      </td>

                      <td className="px-5 py-4">
                        {formatPrice(item.price)}
                      </td>

                      <td className="px-5 py-4 font-mono text-[10px]">
                        {item.barcode}
                      </td>

                      <td className="px-5 py-4 text-neutral-500">
                        {formatDate(item.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          {label}
        </span>

        <Icon size={17} className="text-neutral-500" />
      </div>

      <strong className="mt-5 block text-2xl font-bold tracking-tight text-neutral-950">
        {value}
      </strong>
    </article>
  );
}