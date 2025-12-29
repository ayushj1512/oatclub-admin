"use client";

import { useEffect, useState } from "react";

/* ============================================================
   ADD / EDIT FABRIC MODAL
============================================================ */
export default function AddEditFabricModal({
  open,
  onClose,
  onSubmit,
  loading,
  fabric = null,
}) {
  const [form, setForm] = useState({
    name: "",
    category: "",
    unit: "meter",
    gsm: "",
    width: "",
    notes: "",
  });

  /* -------------------------------
     PREFILL ON EDIT
  -------------------------------- */
  useEffect(() => {
    if (fabric) {
      setForm({
        name: fabric.name || "",
        category: fabric.category || "",
        unit: fabric.unit || "meter",
        gsm: fabric.gsm || "",
        width: fabric.width || "",
        notes: fabric.notes || "",
      });
    } else {
      resetForm();
    }
  }, [fabric]);

  const resetForm = () => {
    setForm({
      name: "",
      category: "",
      unit: "meter",
      gsm: "",
      width: "",
      notes: "",
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      ...form,
      gsm: form.gsm ? Number(form.gsm) : null,
      width: form.width || null,
    };

    onSubmit(payload);
  };

  if (!open) return null;

  return (
   <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
  <form
    onSubmit={handleSubmit}
    className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-gray-200 overflow-hidden"
  >
    {/* ================= HEADER ================= */}
    <div className="px-6 py-4 border-b border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900">
        {fabric ? "Edit Fabric" : "Add Fabric"}
      </h2>
      <p className="text-sm text-gray-500">
        {fabric
          ? "Update fabric details and usage information"
          : "Add a new fabric to inventory"}
      </p>
    </div>

    {/* ================= BODY ================= */}
    <div className="px-6 py-5 space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Fabric Name
        </label>
        <input
          required
          placeholder="Eg. Georgette Floral Peach"
          value={form.name}
          onChange={(e) =>
            setForm({ ...form, name: e.target.value })
          }
          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Category
        </label>
        <input
          required
          placeholder="Eg. Georgette"
          value={form.category}
          onChange={(e) =>
            setForm({ ...form, category: e.target.value })
          }
          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Unit
        </label>
        <select
          value={form.unit}
          onChange={(e) =>
            setForm({ ...form, unit: e.target.value })
          }
          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        >
          <option value="meter">Meter</option>
          <option value="kg">Kilogram (KG)</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            GSM (optional)
          </label>
          <input
            placeholder="90"
            value={form.gsm}
            onChange={(e) =>
              setForm({ ...form, gsm: e.target.value })
            }
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Width (optional)
          </label>
          <input
            placeholder="44 inch"
            value={form.width}
            onChange={(e) =>
              setForm({ ...form, width: e.target.value })
            }
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Notes
        </label>
        <textarea
          placeholder="Optional internal notes..."
          value={form.notes}
          onChange={(e) =>
            setForm({ ...form, notes: e.target.value })
          }
          rows={3}
          className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
        />
      </div>
    </div>

    {/* ================= FOOTER ================= */}
    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save Fabric"}
      </button>
    </div>
  </form>
</div>

  );
}
