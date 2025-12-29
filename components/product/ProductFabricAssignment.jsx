"use client";

import { Plus, Trash2 } from "lucide-react";

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function ProductFabricAssignment({
  value = [],
  onChange,
  editable = true,
}) {
  const fabrics = Array.isArray(value) ? value : [];

  const addFabric = () => {
    onChange([
      ...fabrics,
      {
        fabricCode: "",
        role: "main",
        consumptionPerUnit: "",
        unit: "meter",
      },
    ]);
  };

  const updateFabric = (index, patch) => {
    const next = [...fabrics];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const removeFabric = (index) => {
    const next = [...fabrics];
    next.splice(index, 1);
    onChange(next);
  };

  return (
    <div className="bg-white p-5 md:p-6 rounded-xl shadow space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">
            Fabric Usage
          </h2>
          <p className="text-sm text-gray-600">
            Assign fabrics used to manufacture this product
          </p>
        </div>

        {editable && (
          <button
            type="button"
            onClick={addFabric}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={14} />
            Add Fabric
          </button>
        )}
      </div>

      {/* EMPTY STATE */}
      {fabrics.length === 0 && (
        <p className="text-sm text-gray-500">
          No fabrics assigned to this product
        </p>
      )}

      {/* FABRIC ROWS */}
      {fabrics.map((f, index) => (
        <div
          key={index}
          className="border border-gray-200 rounded-lg p-4 space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* FABRIC CODE */}
            <input
              disabled={!editable}
              value={f.fabricCode || ""}
              onChange={(e) =>
                updateFabric(index, { fabricCode: e.target.value })
              }
              placeholder="Fabric Code (e.g. FAB-000123)"
              className="input"
            />

            {/* ROLE */}
            <select
              disabled={!editable}
              value={f.role || "main"}
              onChange={(e) =>
                updateFabric(index, { role: e.target.value })
              }
              className="input"
            >
              <option value="main">Main</option>
              <option value="lining">Lining</option>
              <option value="contrast">Contrast</option>
              <option value="padding">Padding</option>
              <option value="other">Other</option>
            </select>

            {/* CONSUMPTION */}
            <input
              disabled={!editable}
              type="number"
              value={f.consumptionPerUnit ?? ""}
              onChange={(e) =>
                updateFabric(index, {
                  consumptionPerUnit: toNum(e.target.value),
                })
              }
              placeholder="Consumption / unit"
              className="input"
            />

            {/* UNIT */}
            <select
              disabled={!editable}
              value={f.unit || "meter"}
              onChange={(e) =>
                updateFabric(index, { unit: e.target.value })
              }
              className="input"
            >
              <option value="meter">Meter</option>
              <option value="kg">KG</option>
            </select>
          </div>

          {/* REMOVE */}
          {editable && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => removeFabric(index)}
                className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700"
              >
                <Trash2 size={14} />
                Remove
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
