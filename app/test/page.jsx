"use client";

import { useMemo } from "react";

/* -------------------------------
   Mock JSON Data (Safe Testing)
--------------------------------*/
const mockReservations = [
  {
    _id: "r1",
    orderNumber: "MIRAY-000010",
    createdAt: "2026-02-26T01:00:00.000Z",
    orderDoc: { priority: "normal" },
  },
  {
    _id: "r2",
    orderNumber: "MIRAY-000002",
    createdAt: "2026-02-26T02:00:00.000Z",
    orderDoc: { priority: "normal" },
  },
  {
    _id: "r3",
    orderNumber: "MIRAY-000007",
    createdAt: "2026-02-26T03:00:00.000Z",
    orderDoc: { priority: "high" },
  },
  {
    _id: "r4",
    orderNumber: "MIRAY-000001",
    createdAt: "2026-02-26T04:00:00.000Z",
    orderDoc: { priority: "high" },
  },
  {
    _id: "r5",
    orderNumber: "MIRAY-000003",
    createdAt: "2026-02-26T05:00:00.000Z",
    orderDoc: { priority: "medium" },
  },
  {
    _id: "r6",
    orderNumber: "",
    createdAt: "2026-02-26T06:00:00.000Z",
    orderDoc: null,
  },
];

/* -------------------------------
   Sorting Helpers
--------------------------------*/
const priorityRank = (p) => {
  const x = String(p || "").toLowerCase();
  if (x === "high") return 0;
  if (x === "medium") return 1;
  if (x === "normal") return 2;
  return 3;
};

const cmpOrderNumber = (a, b) =>
  String(a || "").localeCompare(String(b || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });

function sortReservations(rows) {
  return [...rows].sort((a, b) => {
    const pa = priorityRank(a?.orderDoc?.priority);
    const pb = priorityRank(b?.orderDoc?.priority);
    if (pa !== pb) return pa - pb;

    const on = cmpOrderNumber(a?.orderNumber, b?.orderNumber);
    if (on !== 0) return on;

    const ca = new Date(a?.createdAt).getTime();
    const cb = new Date(b?.createdAt).getTime();
    return ca - cb;
  });
}

function isSorted(rows) {
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1];
    const b = rows[i];

    const pa = priorityRank(a?.orderDoc?.priority);
    const pb = priorityRank(b?.orderDoc?.priority);
    if (pa > pb) return false;

    if (pa === pb) {
      const on = cmpOrderNumber(a?.orderNumber, b?.orderNumber);
      if (on > 0) return false;

      if (on === 0) {
        const ca = new Date(a?.createdAt).getTime();
        const cb = new Date(b?.createdAt).getTime();
        if (ca > cb) return false;
      }
    }
  }
  return true;
}

/* -------------------------------
   Page Component
--------------------------------*/
export default function ReservationSortTest() {
  const sorted = useMemo(() => sortReservations(mockReservations), []);

  const ok = useMemo(() => isSorted(sorted), [sorted]);

  return (
    <div className="p-6 space-y-6">
      <div className="text-xl font-semibold">
        🔬 Reservation Sorting Test (Mock JSON Only)
      </div>

      <div className="text-sm text-gray-600">
        Rule: priority (high → medium → normal) → orderNumber ASC → createdAt ASC
      </div>

      <div className="text-lg">
        Result:{" "}
        {ok ? (
          <span className="text-green-600 font-bold">✅ PASS</span>
        ) : (
          <span className="text-red-600 font-bold">❌ FAIL</span>
        )}
      </div>

      <div className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-2 text-left">#</th>
              <th className="p-2 text-left">Priority</th>
              <th className="p-2 text-left">Order Number</th>
              <th className="p-2 text-left">Created At</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r._id} className="border-b">
                <td className="p-2">{i + 1}</td>
                <td className="p-2">{r?.orderDoc?.priority || "none"}</td>
                <td className="p-2">{r.orderNumber || "—"}</td>
                <td className="p-2">{r.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-gray-500">
        This page uses static JSON data. No API calls. No database impact.
      </div>
    </div>
  );
}