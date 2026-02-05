"use client";

import { useState } from "react";

export default function ShiprocketPage() {
  const [status, setStatus] = useState("idle");

  return (
    <div className="min-h-screen bg-[#f6f7f9] p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Shiprocket Dashboard
        </h1>
        <p className="text-sm text-gray-500">
          Dummy page – API integration pending
        </p>
      </div>

      {/* Card */}
      <div className="bg-white border border-black/10 rounded-xl p-6 max-w-xl">
        <h2 className="text-lg font-medium text-gray-800 mb-2">
          Shiprocket Status
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          This is a placeholder page for Shiprocket module.
        </p>

        {/* Dummy status */}
        <div className="mb-4">
          <span className="text-sm text-gray-700">Current status:</span>
          <span className="ml-2 px-3 py-1 text-xs rounded-full bg-gray-100 border">
            {status}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => setStatus("connected")}
            className="px-4 py-2 rounded-lg bg-black text-white text-sm"
          >
            Simulate Connect
          </button>

          <button
            onClick={() => setStatus("idle")}
            className="px-4 py-2 rounded-lg border border-black/20 text-sm"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
