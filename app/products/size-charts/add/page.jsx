"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminSizeChartStore } from "@/store/adminSizeChartStore";
import { X, GripVertical } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "";

export default function AddSizeChartPage() {
  const router = useRouter();
  const { createSizeChart, saving, error } =
    useAdminSizeChartStore();

  /* ================= BASIC ================= */
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState("cm");
  const [note, setNote] = useState("");

  /* ================= TABLE ================= */
  const [headers, setHeaders] = useState(["Size"]);
  const [rows, setRows] = useState([[""]]);

  /* ================= CATEGORY ================= */
const [categories, setCategories] = useState([]);
const [selectedCategories, setSelectedCategories] = useState([]);

  /* ================= DRAG STATE ================= */
  const [dragColIndex, setDragColIndex] = useState(null);

  /* ================= FETCH CATEGORIES ================= */
  useEffect(() => {
    fetch(`${API}/api/categories`)
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  /* ================= ADD ROW / COLUMN ================= */
  const addColumn = () => {
    setHeaders((h) => [...h, ""]);
    setRows((r) => r.map((row) => [...row, ""]));
  };

  const addRow = () => {
    setRows((r) => [...r, Array(headers.length).fill("")]);
  };

  /* ================= DRAG REORDER ================= */
  const onDragStart = (index) => {
    setDragColIndex(index);
  };

  const onDrop = (index) => {
    if (dragColIndex === null || dragColIndex === index) return;

    const newHeaders = [...headers];
    const [movedHeader] = newHeaders.splice(dragColIndex, 1);
    newHeaders.splice(index, 0, movedHeader);

    const newRows = rows.map((row) => {
      const newRow = [...row];
      const [movedCell] = newRow.splice(dragColIndex, 1);
      newRow.splice(index, 0, movedCell);
      return newRow;
    });

    setHeaders(newHeaders);
    setRows(newRows);
    setDragColIndex(null);
  };

  /* ================= EXCEL PASTE ================= */
  const handlePaste = (e) => {
  e.preventDefault();

  const text = e.clipboardData?.getData("text/plain");
  if (!text) return;

  // Split rows
  const lines = text
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);

  if (!lines.length) return;

  // Parse cells
  const parsed = lines.map((line) =>
    line.split("\t").map((cell) => cell.trim())
  );

  // Detect header row (contains non-numeric values)
  const hasHeaders = parsed[0].some(
    (cell) => cell && isNaN(Number(cell))
  );

  if (hasHeaders) {
    const pastedHeaders = parsed[0];
    const pastedRows = parsed.slice(1);

    const colCount = pastedHeaders.length;

    // Normalize rows length
    const normalizedRows = pastedRows.map((row) =>
      Array.from({ length: colCount }, (_, i) => row[i] || "")
    );

    setHeaders(pastedHeaders);
    setRows(normalizedRows.length ? normalizedRows : [Array(colCount).fill("")]);
  } else {
    // Pasting rows only → align with existing headers
    const colCount = headers.length;

    const normalizedRows = parsed.map((row) =>
      Array.from({ length: colCount }, (_, i) => row[i] || "")
    );

    setRows((prev) => [...prev, ...normalizedRows]);
  }
};


  const removeColumn = (colIndex) => {
  if (headers.length <= 1) return; // safety
  setHeaders(headers.filter((_, i) => i !== colIndex));
  setRows(rows.map((r) => r.filter((_, i) => i !== colIndex)));
};

const removeRow = (rowIndex) => {
  if (rows.length <= 1) return; // safety
  setRows(rows.filter((_, i) => i !== rowIndex));
};


  /* ================= SAVE ================= */
 const save = async () => {
  if (!title.trim()) {
    alert("Size chart title is required");
    return;
  }

  if (!selectedCategories.length) {
    alert("Please select at least one category");
    return;
  }

  await createSizeChart({
    title,
    unit,
    headers,
    rows,
    note,
    categories: selectedCategories, // ✅ correct
  });

  router.push("/products/size-charts");
};


  return (
   <div className="p-6  mx-auto">
  {/* ================= PAGE HEADER ================= */}
  <div className="mb-10">
    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
      Add Size Chart
    </h1>
    <p className="text-sm text-gray-500 mt-1">
      Create once, reuse across categories. Paste directly from Excel if needed.
    </p>
  </div>

  {/* ================= ERROR ================= */}
  {error && (
    <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
      {error}
    </div>
  )}

  {/* ================= MAIN CARD ================= */}
  <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-100">

    {/* ================= SECTION: BASIC INFO ================= */}
    <div className="p-6">
      <h2 className="text-sm font-semibold text-gray-800 mb-4">
        Basic Information
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Title */}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Size Chart Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Women’s Tops Size Chart"
            className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Unit */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Measurement Unit
          </label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="cm">Centimeters (CM)</option>
            <option value="inch">Inches (IN)</option>
          </select>
        </div>
      </div>
    </div>

    {/* ================= SECTION: CATEGORY ================= */}
    <div className="p-6">
  <h2 className="text-sm font-semibold text-gray-800 mb-1">
    Applicable Categories
  </h2>

  <p className="text-xs text-gray-500 mb-4">
    Select one or more categories this size chart applies to.
    Products under these categories will automatically display this size chart.
  </p>

  {/* CATEGORY CHIPS */}
  <div className="flex flex-wrap gap-2">
    {categories.map((c) => {
      const active = selectedCategories.includes(c._id);

      return (
        <button
          key={c._id}
          type="button"
          onClick={() =>
            setSelectedCategories((prev) =>
              active
                ? prev.filter((id) => id !== c._id)
                : [...prev, c._id]
            )
          }
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
            active
              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
              : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
          }`}
        >
          {c.name}
        </button>
      );
    })}
  </div>

  {/* VALIDATION HINT */}
  {selectedCategories.length === 0 && (
    <p className="mt-3 text-xs text-red-600">
      Please select at least one category.
    </p>
  )}

  {/* COUNT */}
  {selectedCategories.length > 0 && (
    <p className="mt-3 text-xs text-gray-500">
      Selected categories:{" "}
      <b className="text-gray-800">{selectedCategories.length}</b>
    </p>
  )}
</div>


    {/* ================= SECTION: TABLE ================= */}
 {/* ================= SECTION: TABLE ================= */}
<div className="p-6">
  <div className="flex items-center justify-between mb-3">
    <div>
      <h2 className="text-sm font-semibold text-gray-800">
        Size Chart Table
      </h2>
      <p className="text-xs text-gray-500">
        Paste from Excel • Drag columns to reorder
      </p>
    </div>

    <div className="flex gap-3">
      <button
        type="button"
        onClick={addColumn}
        className="text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        + Column
      </button>
      <button
        type="button"
        onClick={addRow}
        className="text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        + Row
      </button>
    </div>
  </div>

  {/* TABLE */}
  <div
    className="overflow-x-auto rounded-xl bg-gray-50"
    onPaste={handlePaste}
  >
    <table className="w-full text-sm">
      <thead className="bg-gray-100 text-gray-600">
        <tr>
          {headers.map((h, i) => (
            <th
              key={i}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(i)}
              className="px-4 py-3 cursor-move group"
            >
              <div className="flex items-center gap-2">
                <GripVertical size={14} className="text-gray-400" />

                <input
                  value={h}
                  onChange={(e) => {
                    const next = [...headers];
                    next[i] = e.target.value;
                    setHeaders(next);
                  }}
                  placeholder="Column"
                  className="w-full rounded-lg bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* REMOVE COLUMN */}
                {headers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeColumn(i)}
                    className="opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-red-600"
                    title="Remove column"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </th>
          ))}

          {/* empty header for row delete column */}
          <th className="w-8"></th>
        </tr>
      </thead>

      <tbody className="divide-y divide-gray-200">
        {rows.map((row, ri) => (
          <tr key={ri} className="group">
            {row.map((cell, ci) => (
              <td key={ci} className="px-4 py-2">
                <input
                  value={cell}
                  onChange={(e) => {
                    const next = [...rows];
                    next[ri][ci] = e.target.value;
                    setRows(next);
                  }}
                  placeholder="—"
                  className="w-full rounded-lg bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </td>
            ))}

            {/* REMOVE ROW */}
            <td className="px-2 py-2 text-center">
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(ri)}
                  className="opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-red-600"
                  title="Remove row"
                >
                  <X size={14} />
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>


    {/* ================= SECTION: NOTE ================= */}
    <div className="p-6">
      <h2 className="text-sm font-semibold text-gray-800 mb-2">
        Additional Note
      </h2>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        placeholder="Measurements may vary by 1–2 cm"
        className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    {/* ================= ACTION BAR ================= */}
    <div className="p-6 bg-gray-50 flex justify-end rounded-b-2xl">
      <button
        onClick={save}
        disabled={saving}
        className="rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-sm font-medium text-white shadow-sm disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save Size Chart"}
      </button>
    </div>
  </div>
</div>

  );
}
