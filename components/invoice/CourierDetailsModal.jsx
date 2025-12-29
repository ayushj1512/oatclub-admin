"use client";

import { useEffect, useState } from "react";

export default function CourierDetailsModal({
  open,
  onClose,
  initialData = {},
  onSave,
}) {
  const [courierName, setCourierName] = useState("");
  const [awb, setAwb] = useState("");

  /* ============================================================
     PREFILL (EDIT MODE)
  ============================================================ */
  useEffect(() => {
    if (open) {
      setCourierName(initialData?.name || "");
      setAwb(initialData?.awb || "");
    }
  }, [open, initialData]);

  if (!open) return null;

  /* ============================================================
     SAVE HANDLER
  ============================================================ */
  const handleSave = () => {
    onSave?.({
      name: courierName.trim(),
      awb: awb.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-md rounded-xl shadow-lg p-6">
        {/* ================= HEADER ================= */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Courier Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* ================= FORM ================= */}
        <div className="space-y-4">
          {/* COURIER NAME */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Courier Name
            </label>
            <input
              type="text"
              value={courierName}
              onChange={(e) => setCourierName(e.target.value)}
              placeholder="e.g. Delhivery / Shiprocket"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* AWB */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              AWB / Tracking Number
            </label>
            <input
              type="text"
              value={awb}
              onChange={(e) => setAwb(e.target.value)}
              placeholder="e.g. 1234567890"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* ================= ACTIONS ================= */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
