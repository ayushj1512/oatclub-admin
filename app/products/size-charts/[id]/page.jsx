"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { X, GripVertical, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useAdminSizeChartStore } from "@/store/adminSizeChartStore";

export default function SizeChartViewPage() {
  const { id } = useParams();
  const router = useRouter();

  const {
    activeSizeChart,
    fetchSizeChartById,
    updateSizeChart,
    loading,
    saving,
  } = useAdminSizeChartStore();

  const [local, setLocal] = useState(null);
  const [dragColIndex, setDragColIndex] = useState(null);

  /* ================= FETCH ================= */
  useEffect(() => {
    if (id) fetchSizeChartById(id);
  }, [id, fetchSizeChartById]);

  useEffect(() => {
    if (!activeSizeChart) return;

    setLocal({
      ...activeSizeChart,
      headers: [...activeSizeChart.headers],
      rows: activeSizeChart.rows.map((r) => [...r]),
    });
  }, [activeSizeChart]);

  if (loading || !local) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Loading size chart…
      </div>
    );
  }

  /* ================= TABLE ACTIONS ================= */
  const addColumn = () => {
    setLocal((p) => ({
      ...p,
      headers: [...p.headers, ""],
      rows: p.rows.map((r) => [...r, ""]),
    }));
  };

  const removeColumn = (index) => {
    if (local.headers.length <= 1) return;

    setLocal((p) => ({
      ...p,
      headers: p.headers.filter((_, i) => i !== index),
      rows: p.rows.map((r) => r.filter((_, i) => i !== index)),
    }));
  };

  const addRow = () => {
    setLocal((p) => ({
      ...p,
      rows: [...p.rows, Array(p.headers.length).fill("")],
    }));
  };

  const removeRow = (rowIndex) => {
    if (local.rows.length <= 1) return;

    setLocal((p) => ({
      ...p,
      rows: p.rows.filter((_, i) => i !== rowIndex),
    }));
  };

  /* ================= DRAG REORDER ================= */
  const onDragStart = (index) => setDragColIndex(index);

  const onDrop = (index) => {
    if (dragColIndex === null || dragColIndex === index) return;

    const newHeaders = [...local.headers];
    const [movedHeader] = newHeaders.splice(dragColIndex, 1);
    newHeaders.splice(index, 0, movedHeader);

    const newRows = local.rows.map((row) => {
      const r = [...row];
      const [movedCell] = r.splice(dragColIndex, 1);
      r.splice(index, 0, movedCell);
      return r;
    });

    setLocal((p) => ({
      ...p,
      headers: newHeaders,
      rows: newRows,
    }));

    setDragColIndex(null);
  };

  /* ================= EXCEL PASTE ================= */
  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData?.getData("text/plain");
    if (!text) return;

    const lines = text
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);

    if (!lines.length) return;

    const parsed = lines.map((l) =>
      l.split("\t").map((c) => c.trim())
    );

    const hasHeaders = parsed[0].some(
      (c) => c && isNaN(Number(c))
    );

    if (hasHeaders) {
      const cols = parsed[0].length;
      const rows = parsed.slice(1).map((r) =>
        Array.from({ length: cols }, (_, i) => r[i] || "")
      );

      setLocal((p) => ({
        ...p,
        headers: parsed[0],
        rows: rows.length ? rows : [Array(cols).fill("")],
      }));
    } else {
      const cols = local.headers.length;
      const rows = parsed.map((r) =>
        Array.from({ length: cols }, (_, i) => r[i] || "")
      );

      setLocal((p) => ({
        ...p,
        rows: [...p.rows, ...rows],
      }));
    }
  };

  /* ================= SAVE ================= */
  const save = async () => {
    await updateSizeChart(id, {
      title: local.title,
      unit: local.unit,
      headers: local.headers,
      rows: local.rows,
      note: local.note,
    });

    router.push("/products/size-charts");
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <Link
            href="/products/size-charts"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black"
          >
            <ArrowLeft size={16} />
            Back
          </Link>

          <h1 className="text-2xl font-semibold text-gray-900 mt-3">
            Edit Size Chart
          </h1>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          <Save size={16} />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* CARD */}
      <div className="bg-white rounded-2xl shadow-sm divide-y">

        {/* BASIC */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-gray-500">
              Title
            </label>
            <input
              value={local.title}
              onChange={(e) =>
                setLocal({ ...local, title: e.target.value })
              }
              className="mt-2 w-full rounded-xl bg-gray-50 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500">
              Unit
            </label>
            <select
              value={local.unit}
              onChange={(e) =>
                setLocal({ ...local, unit: e.target.value })
              }
              className="mt-2 w-full rounded-xl bg-gray-50 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="cm">CM</option>
              <option value="inch">INCH</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="p-6" onPaste={handlePaste}>
          <div className="flex justify-between mb-3">
            <p className="text-sm font-semibold text-gray-800">
              Size Chart Table
            </p>

            <div className="flex gap-3 text-sm text-blue-600">
              <button onClick={addColumn}>+ Column</button>
              <button onClick={addRow}>+ Row</button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl bg-gray-50">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  {local.headers.map((h, i) => (
                    <th
                      key={i}
                      draggable
                      onDragStart={() => onDragStart(i)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => onDrop(i)}
                      className="px-4 py-3 group cursor-move"
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical size={14} className="text-gray-400" />
                        <input
                          value={h}
                          onChange={(e) => {
                            const next = [...local.headers];
                            next[i] = e.target.value;
                            setLocal({ ...local, headers: next });
                          }}
                          className="w-full rounded-lg bg-white px-3 py-2"
                        />
                        {local.headers.length > 1 && (
                          <button
                            onClick={() => removeColumn(i)}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="w-8"></th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {local.rows.map((row, ri) => (
                  <tr key={ri} className="group">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-4 py-2">
                        <input
                          value={cell}
                          onChange={(e) => {
                            const next = [...local.rows];
                            next[ri][ci] = e.target.value;
                            setLocal({ ...local, rows: next });
                          }}
                          className="w-full rounded-lg bg-white px-3 py-2"
                        />
                      </td>
                    ))}
                    <td className="text-center">
                      {local.rows.length > 1 && (
                        <button
                          onClick={() => removeRow(ri)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600"
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

        {/* NOTE */}
        <div className="p-6">
          <label className="text-xs font-medium text-gray-500">
            Note
          </label>
          <textarea
            value={local.note || ""}
            onChange={(e) =>
              setLocal({ ...local, note: e.target.value })
            }
            rows={3}
            className="mt-2 w-full rounded-xl bg-gray-50 px-4 py-3 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
