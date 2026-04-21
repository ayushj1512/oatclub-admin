"use client";

import Image from "next/image";
import {
  ArrowLeftRight,
  BadgeIndianRupee,
  Boxes,
  ClipboardList,
  PackageSearch,
  RefreshCcw,
  ShieldAlert,
} from "lucide-react";

const formatReasonLabel = (value = "") => {
  const reasonMap = {
    wrong_size: "Wrong Size",
    quality_issue: "Quality Issue",
    defective: "Defective Product",
    damaged: "Damaged Product",
    wrong_item: "Wrong Item",
    changed_mind: "Changed Mind",
    other: "Other",
  };

  return reasonMap[value] || value;
};

const REASON_ORDER = [
  "wrong_size",
  "quality_issue",
  "defective",
  "damaged",
  "wrong_item",
  "changed_mind",
  "other",
];

function StatPill({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-zinc-50 px-3 py-2">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <div className="mt-1 text-sm font-semibold text-zinc-900">{value}</div>
    </div>
  );
}

function ReasonRow({ label, count = 0, qty = 0, highlight = false }) {
  return (
    <div
      className={`flex items-center justify-between rounded-2xl px-3 py-2 ${
        highlight ? "bg-red-50 text-red-700" : "bg-zinc-50 text-zinc-700"
      }`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{label}</p>
      </div>

      <div className="ml-4 flex items-center gap-2 text-xs font-semibold">
        <span className="rounded-full bg-white/80 px-2 py-1">
          Cases: {count}
        </span>
        <span className="rounded-full bg-white/80 px-2 py-1">
          Qty: {qty}
        </span>
      </div>
    </div>
  );
}

export default function ProductRmaInsightCard({ item }) {
  if (!item) return null;

  const reasons = REASON_ORDER.map((key) => ({
    key,
    label: formatReasonLabel(key),
    count: Number(item?.reasonSummary?.[key]?.count || 0),
    qty: Number(item?.reasonSummary?.[key]?.qty || 0),
  })).filter((row) => row.count > 0 || row.qty > 0);

  const topReason = [...reasons].sort((a, b) => b.qty - a.qty)[0];

  return (
    <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)] ring-1 ring-zinc-100">
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex items-start gap-4">
            <div className="relative h-20 w-16 overflow-hidden rounded-2xl bg-zinc-100 sm:h-24 sm:w-20">
              {item?.image ? (
                <Image
                  src={item.image}
                  alt={item?.title || item?.productCode || "Product"}
                  fill
                  className="object-cover"
                  sizes="120px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-400">
                  <PackageSearch className="h-5 w-5" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-700">
                  {item?.productCode || "NA"}
                </span>

                {topReason ? (
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-red-700">
                    Top Issue: {topReason.label}
                  </span>
                ) : null}
              </div>

              <h3 className="mt-2 text-base font-semibold text-zinc-900 sm:text-lg">
                {item?.title || "Untitled Product"}
              </h3>

              {item?.description ? (
                <p className="mt-2 line-clamp-3 max-w-3xl text-sm leading-6 text-zinc-600">
                  {item.description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4 lg:max-w-[520px]">
            <StatPill
              icon={RefreshCcw}
              label="RMA Cases"
              value={item?.totalRmaCases || 0}
            />
            <StatPill
              icon={Boxes}
              label="RMA Qty"
              value={item?.totalRmaQty || 0}
            />
            <StatPill
              icon={ArrowLeftRight}
              label="Exchanges"
              value={item?.exchangeCases || 0}
            />
            <StatPill
              icon={BadgeIndianRupee}
              label="Price"
              value={`₹${Number(item?.price || 0).toLocaleString("en-IN")}`}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[24px] bg-zinc-50/80 p-3 sm:p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-zinc-700" />
              <h4 className="text-sm font-semibold text-zinc-900">
                Grouped Reasons
              </h4>
            </div>

            <div className="space-y-2">
              {reasons.length > 0 ? (
                reasons.map((reason) => (
                  <ReasonRow
                    key={reason.key}
                    label={reason.label}
                    count={reason.count}
                    qty={reason.qty}
                    highlight={
                      reason.key === "quality_issue" ||
                      reason.key === "defective" ||
                      reason.key === "damaged"
                    }
                  />
                ))
              ) : (
                <div className="rounded-2xl bg-white px-3 py-3 text-sm text-zinc-500">
                  No grouped reasons found.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[24px] bg-zinc-50/80 p-3 sm:p-4">
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-zinc-700" />
              <h4 className="text-sm font-semibold text-zinc-900">
                Impact Summary
              </h4>
            </div>

            <div className="space-y-2">
              <div className="rounded-2xl bg-white px-3 py-3 text-sm text-zinc-700">
                <span className="font-semibold text-zinc-900">
                  Orders Affected:
                </span>{" "}
                {item?.affectedOrdersCount || 0}
              </div>

              <div className="rounded-2xl bg-white px-3 py-3 text-sm text-zinc-700">
                <span className="font-semibold text-zinc-900">
                  Customers Affected:
                </span>{" "}
                {item?.affectedCustomersCount || 0}
              </div>

              <div className="rounded-2xl bg-white px-3 py-3 text-sm text-zinc-700">
                <span className="font-semibold text-zinc-900">
                  Returns:
                </span>{" "}
                {item?.returnCases || 0}
              </div>

              <div className="rounded-2xl bg-white px-3 py-3 text-sm text-zinc-700">
                <span className="font-semibold text-zinc-900">
                  Exchanges:
                </span>{" "}
                {item?.exchangeCases || 0}
              </div>

              {topReason ? (
                <div className="rounded-2xl bg-red-50 px-3 py-3 text-sm text-red-700">
                  <span className="font-semibold">Key Action Area:</span>{" "}
                  {topReason.label} is the most frequent issue.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}