"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  PackageSearch,
  RotateCcw,
  ShoppingBag,
  Users,
} from "lucide-react";

const REASON_ORDER = [
  "wrong_size",
  "quality_issue",
  "defective",
  "damaged",
  "wrong_item",
  "changed_mind",
  "other",
];

const reasonLabel = (value = "") =>
  ({
    wrong_size: "Wrong Size",
    quality_issue: "Quality Issue",
    defective: "Defective",
    damaged: "Damaged",
    wrong_item: "Wrong Item",
    changed_mind: "Changed Mind",
    other: "Other",
  })[value] ||
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const formatLabel = (value = "") =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function Stat({ label, value }) {
  return (
    <div className="min-w-[48px]">
      <p className="text-[8px] font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <p className="mt-0.5 truncate text-[11px] font-semibold text-zinc-900">
        {value ?? 0}
      </p>
    </div>
  );
}

function DetailRow({ rma }) {
  return (
    <tr className="border-t border-zinc-100 hover:bg-zinc-50">
      <td className="whitespace-nowrap px-2 py-1.5 font-semibold text-zinc-900">
        #{rma?.orderNumber || "—"}
      </td>

      <td className="whitespace-nowrap px-2 py-1.5">
        <div className="font-medium text-zinc-800">
          {rma?.customerName || "—"}
        </div>
        {rma?.customerPhone && (
          <div className="text-[9px] text-zinc-400">
            {rma.customerPhone}
          </div>
        )}
      </td>

      <td className="whitespace-nowrap px-2 py-1.5">
        {rma?.productSize || "—"}
      </td>

      <td className="whitespace-nowrap px-2 py-1.5">
        <span
          className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${rma?.type === "return"
              ? "bg-red-50 text-red-700"
              : "bg-blue-50 text-blue-700"
            }`}
        >
          {formatLabel(rma?.type)}
        </span>
      </td>

      <td className="whitespace-nowrap px-2 py-1.5">
        {reasonLabel(rma?.reason)}
      </td>

      <td className="px-2 py-1.5 font-semibold">
        {rma?.quantity || 0}
      </td>

      <td className="whitespace-nowrap px-2 py-1.5">
        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-600">
          {formatLabel(rma?.status)}
        </span>
      </td>

      <td className="max-w-[220px] px-2 py-1.5">
        <p className="truncate text-zinc-500">
          {rma?.customerNote || "—"}
        </p>
      </td>

      <td className="whitespace-nowrap px-2 py-1.5 text-zinc-500">
        {formatDate(rma?.rmaCreatedAt || rma?.createdAt)}
      </td>
    </tr>
  );
}

export default function ProductRmaInsightCard({ item }) {
  const [open, setOpen] = useState(false);

  if (!item) return null;

  const reasons = useMemo(
    () =>
      REASON_ORDER.map((key) => ({
        key,
        label: reasonLabel(key),
        count: Number(
          item?.reasonSummary?.[key]?.count || 0
        ),
        qty: Number(
          item?.reasonSummary?.[key]?.qty || 0
        ),
      })).filter(
        (row) => row.count > 0 || row.qty > 0
      ),
    [item]
  );

  const topReason = useMemo(
    () =>
      [...reasons].sort(
        (a, b) => b.qty - a.qty
      )[0],
    [reasons]
  );

  const rmas = Array.isArray(item?.recentRmas)
    ? item.recentRmas
    : [];

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      {/* =====================================================
          COLLAPSED ROW
      ===================================================== */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="grid w-full grid-cols-[42px_minmax(0,1fr)_28px] items-center gap-2 px-2 py-1.5 text-left transition hover:bg-zinc-50 sm:grid-cols-[44px_minmax(180px,1fr)_repeat(7,minmax(45px,auto))_28px]"
      >
        {/* IMAGE */}
        <div className="relative h-10 w-10 overflow-hidden rounded-md bg-zinc-100 sm:h-11 sm:w-11">
          {item?.image ? (
            <Image
              src={item.image}
              alt={
                item?.title ||
                item?.productCode ||
                "Product"
              }
              fill
              className="object-cover"
              sizes="50px"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <PackageSearch className="h-4 w-4 text-zinc-400" />
            </div>
          )}
        </div>

        {/* BASIC PRODUCT INFO */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[9px] font-bold text-white">
              {item?.productCode || "NA"}
            </span>

            <span className="text-[11px] font-semibold text-zinc-900">
              {money(item?.price)}
            </span>

            {topReason && (
              <span className="hidden rounded bg-red-50 px-1.5 py-0.5 text-[8px] font-semibold text-red-700 md:inline">
                {topReason.label}
              </span>
            )}
          </div>

          <p className="mt-0.5 truncate text-[11px] font-medium text-zinc-800 sm:text-xs">
            {item?.title || "Untitled Product"}
          </p>

          {/* MOBILE QUICK SUMMARY */}
          <div className="mt-0.5 flex gap-2 text-[8px] text-zinc-400 sm:hidden">
            <span>RMA {item?.totalRmaQty || 0}</span>
            <span>Ret {item?.returnCases || 0}</span>
            <span>Ex {item?.exchangeCases || 0}</span>
            <span>Ord {item?.affectedOrdersCount || 0}</span>
          </div>
        </div>

        {/* DESKTOP STATS */}
        <div className="hidden sm:block">
          <Stat
            label="RMA"
            value={item?.totalRmaQty || 0}
          />
        </div>

        <div className="hidden sm:block">
          <Stat
            label="Cases"
            value={item?.totalRmaCases || 0}
          />
        </div>

        <div className="hidden sm:block">
          <Stat
            label="Returns"
            value={item?.returnCases || 0}
          />
        </div>

        <div className="hidden sm:block">
          <Stat
            label="Exchange"
            value={item?.exchangeCases || 0}
          />
        </div>

        <div className="hidden sm:block">
          <Stat
            label="Orders"
            value={item?.affectedOrdersCount || 0}
          />
        </div>

        <div className="hidden sm:block">
          <Stat
            label="Customers"
            value={item?.affectedCustomersCount || 0}
          />
        </div>

        <div className="hidden max-w-[90px] sm:block">
          <Stat
            label="Top Issue"
            value={topReason?.label || "—"}
          />
        </div>

        {/* EXPAND */}
        <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-100 text-zinc-600">
          {open ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </div>
      </button>

      {/* =====================================================
          EXPANDED DETAILS
      ===================================================== */}
      {open && (
        <div className="border-t border-zinc-100 bg-zinc-50/60 px-2 py-2">
          {/* REASON SUMMARY */}
          <div className="mb-2 flex flex-wrap items-center gap-1">
            {reasons.map((reason) => (
              <span
                key={reason.key}
                className={`rounded-md border px-1.5 py-1 text-[9px] ${[
                    "quality_issue",
                    "defective",
                    "damaged",
                  ].includes(reason.key)
                    ? "border-red-100 bg-red-50 text-red-700"
                    : "border-zinc-200 bg-white text-zinc-600"
                  }`}
              >
                {reason.label}
                <b className="ml-1">
                  {reason.qty}
                </b>
              </span>
            ))}

            <span className="ml-auto hidden items-center gap-1 text-[9px] text-zinc-400 sm:flex">
              <ShoppingBag className="h-3 w-3" />
              {item?.affectedOrdersCount || 0} orders
              <Users className="ml-1 h-3 w-3" />
              {item?.affectedCustomersCount || 0} customers
            </span>
          </div>

          {/* RMA TABLE */}
          {rmas.length ? (
            <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
              <table className="w-full min-w-[900px] text-left text-[10px]">
                <thead className="bg-zinc-50 text-[8px] font-semibold uppercase tracking-wide text-zinc-400">
                  <tr>
                    <th className="px-2 py-1.5">
                      Order
                    </th>
                    <th className="px-2 py-1.5">
                      Customer
                    </th>
                    <th className="px-2 py-1.5">
                      Size
                    </th>
                    <th className="px-2 py-1.5">
                      Type
                    </th>
                    <th className="px-2 py-1.5">
                      Reason
                    </th>
                    <th className="px-2 py-1.5">
                      Qty
                    </th>
                    <th className="px-2 py-1.5">
                      Status
                    </th>
                    <th className="px-2 py-1.5">
                      Note
                    </th>
                    <th className="px-2 py-1.5">
                      RMA Date
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rmas.map((rma, index) => (
                    <DetailRow
                      key={
                        rma?.rmaNumber ||
                        `${rma?.orderNumber}-${index}`
                      }
                      rma={rma}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-[10px] text-zinc-500">
              No detailed RMA records found.
            </div>
          )}

          {/* QUICK FOOTER */}
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[9px] text-zinc-400">
            <span>
              Returns:{" "}
              <b className="text-zinc-700">
                {item?.returnCases || 0}
              </b>
            </span>

            <span>
              Exchanges:{" "}
              <b className="text-zinc-700">
                {item?.exchangeCases || 0}
              </b>
            </span>

            <span>
              Total Qty:{" "}
              <b className="text-zinc-700">
                {item?.totalRmaQty || 0}
              </b>
            </span>

            {topReason && (
              <span className="text-red-600">
                Top issue:{" "}
                <b>{topReason.label}</b>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
