"use client";

import { useState } from "react";

export default function ShiprocketNotDeliverablesPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#fafafa] text-gray-900">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                Shiprocket – Not Deliverables
              </h1>
            </div>

            <p className="mt-2 text-sm text-gray-600">
              Manage pincodes where delivery is unavailable / restricted.
            </p>
          </div>

          <button
            className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-900"
            disabled
          >
            + Add Pincode
          </button>
        </div>

        {/* Controls */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by pincode, city or state..."
            className="w-full sm:max-w-sm rounded-xl bg-white px-4 py-2.5 text-sm ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-black/10"
          />

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
            Coming soon: Shiprocket sync
          </div>
        </div>

        {/* Table Card */}
        <div className="mt-6 rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
          <div className="px-5 py-4 border-b border-black/5">
            <div className="text-sm font-semibold">
              Non-Serviceable Locations
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              This list is currently static (UI ready)
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">
                    Pincode
                  </th>
                  <th className="px-5 py-3 text-left font-medium">
                    City
                  </th>
                  <th className="px-5 py-3 text-left font-medium">
                    State
                  </th>
                  <th className="px-5 py-3 text-left font-medium">
                    Reason
                  </th>
                  <th className="px-5 py-3 text-right font-medium">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-black/5">
                {/* Empty state */}
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-gray-400" />
                      <div className="text-sm font-medium">
                        No data available
                      </div>
                      <div className="text-xs text-gray-400">
                        Shiprocket API integration coming next
                      </div>
                    </div>
                  </td>
                </tr>

                {/* Example row (future use)
                <tr>
                  <td className="px-5 py-3">791001</td>
                  <td className="px-5 py-3">Itanagar</td>
                  <td className="px-5 py-3">Arunachal Pradesh</td>
                  <td className="px-5 py-3">Courier unavailable</td>
                  <td className="px-5 py-3 text-right">
                    <button className="text-xs text-red-600 hover:underline">
                      Remove
                    </button>
                  </td>
                </tr>
                */}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info box */}
        <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-black/5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            <div className="text-sm font-semibold">Notes</div>
          </div>

          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gray-400" />
              Ye section Shiprocket ke non-serviceable pincodes ke liye hai.
            </li>
            <li className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gray-400" />
              Aage chalke yahan API sync, CSV upload, manual override add
              kar sakte hain.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
