"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Minus,
  RefreshCcw,
  Package2,
  CalendarDays,
  FileText,
  PencilLine,
  Loader2,
} from "lucide-react";
import { useFabricStore } from "@/store/fabricStore";

const LOG_API = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/fabric-logs`
  : "/api/fabric-logs";

const ACTIONS = [
  { label: "Add Stock", value: "add" },
  { label: "Subtract Stock", value: "subtract" },
  { label: "Adjust Stock", value: "adjust" },
];

const formatDateTimeLocal = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, "0");
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatQty = (value) => {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
};

const getActionStyles = (type) => {
  if (type === "add") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (type === "subtract") {
    return "bg-red-50 text-red-700 border-red-200";
  }
  return "bg-amber-50 text-amber-700 border-amber-200";
};

export default function FabricActionsPage() {
  const { fabricOptions, fetchFabricOptions, loading, error, clearError } =
    useFabricStore();

  const [query, setQuery] = useState("");
  const [selectedCode, setSelectedCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [serverSuccess, setServerSuccess] = useState("");

  const [form, setForm] = useState({
    type: "add",
    quantity: "",
    description: "",
    note: "",
    createdBy: "admin",
    logDate: formatDateTimeLocal(),
  });

  useEffect(() => {
    fetchFabricOptions().catch(() => {});
  }, [fetchFabricOptions]);

  const filteredFabrics = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return fabricOptions || [];

    return (fabricOptions || []).filter((item) => {
      const name = String(item?.name || "").toLowerCase();
      const code = String(item?.code || "").toLowerCase();
      const category = String(item?.category || "").toLowerCase();
      return (
        name.includes(term) || code.includes(term) || category.includes(term)
      );
    });
  }, [fabricOptions, query]);

  const selectedFabric = useMemo(() => {
    return (fabricOptions || []).find((item) => item.code === selectedCode) || null;
  }, [fabricOptions, selectedCode]);

  const previewStock = useMemo(() => {
    if (!selectedFabric) return null;

    const current = formatQty(selectedFabric.currentStock);
    const qty = formatQty(form.quantity);

    if (form.type === "add") {
      return current + qty;
    }

    if (form.type === "subtract") {
      return current - qty;
    }

    if (form.type === "adjust") {
      return qty;
    }

    return current;
  }, [selectedFabric, form.type, form.quantity]);

  const stockAlert =
    selectedFabric &&
    form.type === "subtract" &&
    Number.isFinite(previewStock) &&
    previewStock < 0;

  const handleSelectFabric = (fabric) => {
    setSelectedCode(fabric.code);
    setServerError("");
    setServerSuccess("");
  };

  const handleChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
    setServerError("");
    setServerSuccess("");
  };

  const resetForm = () => {
    setForm({
      type: "add",
      quantity: "",
      description: "",
      note: "",
      createdBy: "admin",
      logDate: formatDateTimeLocal(),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFabric) {
      setServerError("Please select a fabric");
      return;
    }

    const quantity = Number(form.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) {
      setServerError("Please enter a valid non-negative quantity");
      return;
    }

    try {
      setSubmitting(true);
      setServerError("");
      setServerSuccess("");

      const res = await fetch(LOG_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: selectedFabric.code,
          type: form.type,
          quantity,
          description: form.description,
          note: form.note,
          createdBy: form.createdBy || "admin",
          logDate: form.logDate ? new Date(form.logDate).toISOString() : new Date().toISOString(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "Failed to save fabric action");
      }

      setServerSuccess(data?.message || "Fabric action saved successfully");
      resetForm();
      await fetchFabricOptions().catch(() => {});
    } catch (err) {
      setServerError(err.message || "Failed to save fabric action");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              Fabric Actions
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Add, subtract, or adjust fabric stock with notes and date.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchFabricOptions().catch(() => {})}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-100"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {(error || serverError || serverSuccess) && (
          <div className="mb-5 space-y-2">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {serverError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            {serverSuccess && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {serverSuccess}
              </div>
            )}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm md:p-5">
            <div className="mb-4 flex items-center gap-2">
              <Search className="h-4 w-4 text-neutral-500" />
              <h2 className="text-base font-semibold text-neutral-900">
                Select Fabric
              </h2>
            </div>

            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by fabric name, code, category"
                className="w-full rounded-2xl border border-neutral-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-neutral-400"
              />
            </div>

            <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
              {loading ? (
                <div className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading fabrics...
                </div>
              ) : filteredFabrics.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500">
                  No fabrics found.
                </div>
              ) : (
                filteredFabrics.map((fabric) => {
                  const active = selectedCode === fabric.code;

                  return (
                    <button
                      key={fabric._id}
                      type="button"
                      onClick={() => handleSelectFabric(fabric)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-neutral-900 bg-neutral-900 text-white shadow"
                          : "border-neutral-200 bg-white hover:bg-neutral-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">
                            {fabric.name}
                          </div>
                          <div
                            className={`mt-1 text-xs ${
                              active ? "text-neutral-300" : "text-neutral-500"
                            }`}
                          >
                            {fabric.code} • {fabric.category}
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            active
                              ? "bg-white/10 text-white"
                              : "bg-neutral-100 text-neutral-700"
                          }`}
                        >
                          {formatQty(fabric.currentStock)} {fabric.unit}
                        </span>
                      </div>

                      <div
                        className={`mt-3 flex flex-wrap gap-2 text-xs ${
                          active ? "text-neutral-200" : "text-neutral-500"
                        }`}
                      >
                        <span className="rounded-full bg-black/5 px-2.5 py-1">
                          {fabric.status || "active"}
                        </span>
                        <span className="rounded-full bg-black/5 px-2.5 py-1">
                          {fabric.movementStatus || "idle"}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm md:p-5">
            <div className="mb-4 flex items-center gap-2">
              <Package2 className="h-4 w-4 text-neutral-500" />
              <h2 className="text-base font-semibold text-neutral-900">
                Stock Action
              </h2>
            </div>

            {selectedFabric ? (
              <>
                <div className="mb-5 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-neutral-900">
                        {selectedFabric.name}
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">
                        {selectedFabric.code} • {selectedFabric.category}
                      </div>
                    </div>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-700 shadow-sm">
                      {formatQty(selectedFabric.currentStock)} {selectedFabric.unit}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-neutral-600">
                    <div className="rounded-xl bg-white px-3 py-2">
                      <span className="block text-neutral-400">Unit</span>
                      <span className="font-medium text-neutral-800">
                        {selectedFabric.unit}
                      </span>
                    </div>
                    <div className="rounded-xl bg-white px-3 py-2">
                      <span className="block text-neutral-400">Movement</span>
                      <span className="font-medium text-neutral-800">
                        {selectedFabric.movementStatus || "idle"}
                      </span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Action Type
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {ACTIONS.map((item) => {
                        const active = form.type === item.value;
                        const Icon =
                          item.value === "add"
                            ? Plus
                            : item.value === "subtract"
                            ? Minus
                            : RefreshCcw;

                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => handleChange("type", item.value)}
                            className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-medium transition ${
                              active
                                ? `${getActionStyles(item.value)}`
                                : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.quantity}
                        onChange={(e) => handleChange("quantity", e.target.value)}
                        placeholder={`Enter ${selectedFabric.unit}`}
                        className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Log Date
                      </label>
                      <div className="relative">
                        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                        <input
                          type="datetime-local"
                          value={form.logDate}
                          onChange={(e) => handleChange("logDate", e.target.value)}
                          className="w-full rounded-2xl border border-neutral-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-neutral-400"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-neutral-500">Current</div>
                        <div className="mt-1 font-semibold text-neutral-900">
                          {formatQty(selectedFabric.currentStock)} {selectedFabric.unit}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-neutral-500">Action</div>
                        <div className="mt-1 font-semibold capitalize text-neutral-900">
                          {form.type}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-neutral-500">New Balance</div>
                        <div
                          className={`mt-1 font-semibold ${
                            stockAlert ? "text-red-600" : "text-neutral-900"
                          }`}
                        >
                          {Number.isFinite(previewStock) ? previewStock : 0}{" "}
                          {selectedFabric.unit}
                        </div>
                      </div>
                    </div>

                    {stockAlert && (
                      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                        This action will make stock negative. Backend will block it.
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Description
                    </label>
                    <div className="relative">
                      <FileText className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-neutral-400" />
                      <input
                        type="text"
                        value={form.description}
                        onChange={(e) => handleChange("description", e.target.value)}
                        placeholder="Eg. Used for leisure production"
                        className="w-full rounded-2xl border border-neutral-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-neutral-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      Note
                    </label>
                    <div className="relative">
                      <PencilLine className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-neutral-400" />
                      <textarea
                        rows={4}
                        value={form.note}
                        onChange={(e) => handleChange("note", e.target.value)}
                        placeholder="Extra note, supplier detail, batch note, production note..."
                        className="w-full rounded-2xl border border-neutral-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-neutral-400"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : form.type === "add" ? (
                        <Plus className="h-4 w-4" />
                      ) : form.type === "subtract" ? (
                        <Minus className="h-4 w-4" />
                      ) : (
                        <RefreshCcw className="h-4 w-4" />
                      )}
                      Save Action
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        resetForm();
                        clearError?.();
                        setServerError("");
                        setServerSuccess("");
                      }}
                      className="inline-flex items-center justify-center rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                    >
                      Reset
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
                <div>
                  <Package2 className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
                  <p className="text-sm font-medium text-neutral-700">
                    Select a fabric first
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Then you can add, subtract, or adjust stock.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}