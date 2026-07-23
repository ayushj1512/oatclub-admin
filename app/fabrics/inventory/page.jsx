"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Upload,
  Plus,
  Minus,
  SlidersHorizontal,
  CheckCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import useFabricStore from "@/store/fabricStore";
import useFabricLogStore from "@/store/fabricLogStore";

const initialForm = {
  code: "",
  type: "add",
  quantity: "",
  note: "",
  createdBy: "admin",
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function FabricInventoryPage() {
  const { fabricOptions, fetchFabricOptions } = useFabricStore();

  const {
    fabricLogs,
    fabricLogsLoading,
    createFabricLogLoading,
    fetchFabricLogs,
    createFabricStockLog,
  } = useFabricLogStore();

  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchFabricOptions();
    fetchFabricLogs({ page: 1, limit: 20 });
  }, []);

  const selectedFabric = useMemo(() => {
    return fabricOptions.find((item) => item.code === form.code);
  }, [fabricOptions, form.code]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.code || !form.quantity) {
      setMessage("Please select fabric and enter quantity.");
      return;
    }

    const res = await createFabricStockLog({
      code: form.code,
      type: form.type,
      quantity: Number(form.quantity),
      note: form.note,
      createdBy: form.createdBy || "admin",
    });

    if (res.success) {
      setMessage("Stock updated successfully.");
      setForm(initialForm);
      await fetchFabricOptions();
      await fetchFabricLogs({ page: 1, limit: 20 });
    } else {
      setMessage(res.message || "Failed to update stock.");
    }
  };

  const handleExportLogs = () => {
    const rows = fabricLogs.map((item) => ({
      Date: formatDate(item.logDate),
      Code: item.fabricCode,
      Fabric: item.fabricName,
      Unit: item.unit,
      Action: item.action,
      Type: item.type,
      Quantity: item.quantity,
      "Previous Stock": item.previousStock,
      "New Stock": item.newStock,
      Note: item.note,
      By: item.createdBy,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Fabric Stock Logs");
    XLSX.writeFile(wb, `fabric-stock-logs-${Date.now()}.xlsx`);
  };

  const handleSampleImportDownload = () => {
    const rows = [
      {
        code: "F00001",
        type: "add",
        quantity: 50,
        note: "New purchase entry",
        createdBy: "admin",
      },
      {
        code: "F00002",
        type: "subtract",
        quantity: 10,
        note: "Used in production",
        createdBy: "admin",
      },
      {
        code: "F00003",
        type: "adjust",
        quantity: 100,
        note: "Physical stock correction",
        createdBy: "admin",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Stock Import Sample");
    XLSX.writeFile(wb, "fabric-stock-import-sample.xlsx");
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4 text-neutral-950 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <Link
              href="/fabrics"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-950"
            >
              <ArrowLeft size={16} />
              Back to fabrics
            </Link>

            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Fabric Inventory
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Add, subtract or adjust fabric stock with proper stock logs.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSampleImportDownload}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-100"
            >
              <Upload size={16} />
              Sample Import
            </button>

            <button
              onClick={handleExportLogs}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-100"
            >
              <Download size={16} />
              Export Logs
            </button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
          >
            <h2 className="text-sm font-semibold">Stock Entry</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Every stock change will create a fabric log.
            </p>

            <div className="mt-5 space-y-4">
              <Field label="Select Fabric">
                <select
                  value={form.code}
                  onChange={(e) => updateField("code", e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Choose fabric</option>
                  {fabricOptions.map((item) => (
                    <option key={item._id} value={item.code}>
                      {item.code} — {item.name} ({item.currentStock} {item.unit})
                    </option>
                  ))}
                </select>
              </Field>

              {selectedFabric ? (
                <div className="rounded-2xl bg-neutral-50 p-4">
                  <p className="text-xs text-neutral-500">Current Stock</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {selectedFabric.currentStock} {selectedFabric.unit}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {selectedFabric.name} · {selectedFabric.category}
                  </p>
                </div>
              ) : null}

              <Field label="Entry Type">
                <div className="grid grid-cols-3 gap-2">
                  <TypeButton
                    active={form.type === "add"}
                    icon={Plus}
                    label="Add"
                    onClick={() => updateField("type", "add")}
                  />
                  <TypeButton
                    active={form.type === "subtract"}
                    icon={Minus}
                    label="Subtract"
                    onClick={() => updateField("type", "subtract")}
                  />
                  <TypeButton
                    active={form.type === "adjust"}
                    icon={SlidersHorizontal}
                    label="Adjust"
                    onClick={() => updateField("type", "adjust")}
                  />
                </div>
              </Field>

              <Field label={form.type === "adjust" ? "New Stock" : "Quantity"}>
                <input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) => updateField("quantity", e.target.value)}
                  placeholder="0"
                  className="input"
                  required
                />
              </Field>

              <Field label="Note">
                <textarea
                  value={form.note}
                  onChange={(e) => updateField("note", e.target.value)}
                  placeholder="Reason / reference / purchase note..."
                  rows={4}
                  className="input h-auto resize-none py-3"
                />
              </Field>

              {message ? (
                <div className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-700">
                  {message}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={createFabricLogLoading}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
              >
                <CheckCircle size={16} />
                {createFabricLogLoading ? "Updating..." : "Update Stock"}
              </button>
            </div>
          </form>

          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 p-4">
              <h2 className="text-sm font-semibold">Recent Stock Movements</h2>
              <p className="mt-1 text-xs text-neutral-500">
                Latest add, subtract and adjustment logs.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Fabric</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">Previous</th>
                    <th className="px-4 py-3">New</th>
                    <th className="px-4 py-3">Note</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100">
                  {fabricLogsLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-neutral-500">
                        Loading logs...
                      </td>
                    </tr>
                  ) : fabricLogs.length ? (
                    fabricLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3 text-neutral-500">
                          {formatDate(log.logDate)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{log.fabricName}</p>
                          <p className="text-xs text-neutral-500">{log.fabricCode}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium">
                            {log.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">{log.quantity}</td>
                        <td className="px-4 py-3">{log.previousStock}</td>
                        <td className="px-4 py-3 font-semibold">{log.newStock}</td>
                        <td className="px-4 py-3 text-neutral-500">
                          {log.note || log.description || "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-neutral-500">
                        No stock logs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .input {
          min-height: 44px;
          width: 100%;
          border-radius: 12px;
          border: 1px solid #e5e5e5;
          background: #ffffff;
          padding: 0 12px;
          font-size: 14px;
          outline: none;
        }

        .input:focus {
          border-color: #171717;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-neutral-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function TypeButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium ${
        active
          ? "border-neutral-950 bg-neutral-950 text-white"
          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100"
      }`}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}
