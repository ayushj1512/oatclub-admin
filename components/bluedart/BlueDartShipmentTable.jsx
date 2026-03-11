"use client";

import Link from "next/link";
import { RefreshCcw, Eye } from "lucide-react";
import { useBlueDartStore } from "@/store/bluedartStore";
import BlueDartShipmentBadge from "@/components/bluedart/BlueDartShipmentBadge";

const safe = (v) => (v == null ? "" : String(v));
const fmt = (v) => (v ? new Date(v).toLocaleString("en-IN") : "-");

export default function BlueDartShipmentTable({ shipments = [] }) {
  const { tracking, trackShipment } = useBlueDartStore();

  return (
    <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 px-5 py-4">
        <h2 className="text-base font-semibold text-neutral-900">
          BlueDart Shipments
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-neutral-50">
            <tr className="text-left text-sm text-neutral-600">
              <th className="px-4 py-3 font-semibold">Order Number</th>
              <th className="px-4 py-3 font-semibold">AWB</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Last Sync</th>
              <th className="px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>

          <tbody>
            {shipments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-14 text-center text-sm text-neutral-500">
                  No BlueDart shipments found.
                </td>
              </tr>
            ) : (
              shipments.map((s) => (
                <tr key={s?._id} className="border-b border-neutral-100 last:border-b-0">
                  <td className="px-4 py-4 font-medium text-neutral-900">
                    {safe(s?.orderNumber) || "-"}
                  </td>
                  <td className="px-4 py-4 text-sm text-neutral-700">
                    {safe(s?.awbNumber) || "-"}
                  </td>
                  <td className="px-4 py-4 text-sm text-neutral-700">
                    {safe(s?.recipient?.fullName) || "-"}
                  </td>
                  <td className="px-4 py-4">
                    <BlueDartShipmentBadge status={s?.status} />
                  </td>
                  <td className="px-4 py-4 text-sm text-neutral-700">
                    {fmt(s?.lastSyncedAt)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => trackShipment(s?._id)}
                        disabled={tracking}
                        className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
                      >
                        <RefreshCcw size={14} />
                        Track
                      </button>

                      <Link
                        href={`/bluedart/${s?._id}`}
                        className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
                      >
                        <Eye size={14} />
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}