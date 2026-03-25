"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRemittanceStore } from "@/store/remittanceStore";

import RemittanceSummaryCards from "@/components/accounts/remittance/RemittanceSummaryCards";
import RemittanceFilters from "@/components/accounts/remittance/RemittanceFilters";
import RemittanceUploadCard from "@/components/accounts/remittance/RemittanceUploadCard";
import RemittanceTable from "@/components/accounts/remittance/RemittanceTable";
import PendingRemittanceTable from "@/components/accounts/remittance/PendingRemittanceTable";

const normalizeOrderType = (value) => {
  const v = String(value || "").trim().toLowerCase();
  if (v === "cod") return "cod";
  if (v === "razorpay" || v === "prepaid") return "razorpay";
  return "";
};

const toInputDate = (value) =>
  value ? String(value).slice(0, 10) : "";

const emptyForm = {
  ewayBillId: "",
  shippingNo: "",
  orderNumber: "",
  deliveredDate: "",
  orderType: "",
  remittanceDate: "",
  remittedAmount: "",
};

export default function RemittancePage() {
  const {
    rows,
    summary,
    pendingRows,
    pagination,
    pendingPagination,
    filters,
    pendingFilters,

    loading,
    summaryLoading,
    pendingLoading,
    createLoading,
    updateLoading,
    deleteLoading,
    importLoading,
    exportLoading,

    error,
    pendingError,
    actionError,

    setFilters,
    setPendingFilters,
    fetchRemittances,
    fetchSummary,
    fetchPendingRemittances,
    createRemittance,
    updateRemittance,
    deleteRemittance,
    importCsv,
    exportCsv,
    exportExcel,
    exportPendingCsv,
    clearErrors,
  } = useRemittanceStore();

  const [tab, setTab] = useState("remittance");
  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchSummary();
    fetchRemittances();
    fetchPendingRemittances();
  }, [fetchSummary, fetchRemittances, fetchPendingRemittances]);

  const heading = useMemo(
    () => (editingRow ? "Edit Remittance" : "Add Remittance"),
    [editingRow]
  );

  const busy = loading || summaryLoading || pendingLoading;

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openCreate = () => {
    clearErrors();
    setEditingRow(null);
    setForm(emptyForm);
    setShowForm(true);
    setTab("remittance");
  };

  const openEdit = (row) => {
    clearErrors();
    setEditingRow(row);
    setForm({
      ewayBillId: row?.ewayBillId || "",
      shippingNo: row?.shippingNo || "",
      orderNumber: row?.orderNumber || "",
      deliveredDate: toInputDate(row?.deliveredDate),
      orderType: normalizeOrderType(
        row?.orderType || row?.paymentMethod || row?.paymentModeLabel
      ),
      remittanceDate: toInputDate(row?.remittanceDate),
      remittedAmount:
        row?.remittedAmount === 0 || row?.remittedAmount
          ? String(row.remittedAmount)
          : "",
    });
    setShowForm(true);
    setTab("remittance");
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingRow(null);
    setForm(emptyForm);
  };

  const submitForm = async (e) => {
    e.preventDefault();

    const payload = {
      ewayBillId: form.ewayBillId,
      shippingNo: form.shippingNo,
      orderNumber: form.orderNumber,
      deliveredDate: form.deliveredDate || null,
      orderType: normalizeOrderType(form.orderType),
      remittanceDate: form.remittanceDate || null,
      remittedAmount: form.remittedAmount || 0,
    };

    try {
      if (editingRow?._id) {
        await updateRemittance(editingRow._id, payload);
      } else {
        await createRemittance(payload);
      }
      closeForm();
    } catch {}
  };

  const onDelete = async (row) => {
    if (!row?._id) return;
    if (!window.confirm(`Delete remittance for ${row.orderNumber}?`)) return;

    try {
      await deleteRemittance(row._id);
    } catch {}
  };

  const onUpload = async (file) => {
    try {
      await importCsv(file);
      setTab("remittance");
    } catch {}
  };

  const openPendingToCreate = (row) => {
    setTab("remittance");
    setEditingRow(null);
    setForm({
      ...emptyForm,
      shippingNo: row?.shippingNo || "",
      orderNumber: row?.orderNumber || "",
      deliveredDate: toInputDate(row?.deliveredDate),
      orderType: normalizeOrderType(
        row?.paymentMethod || row?.paymentModeLabel
      ),
      remittedAmount:
        row?.finalPayable === 0 || row?.finalPayable
          ? String(row.finalPayable)
          : "",
    });
    setShowForm(true);
  };

  return (
    <div className="w-full px-4 py-4 md:px-6">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">
            Remittance Portal
          </h1>
          <p className="text-sm text-zinc-500">
            Upload, track and manage remittance against delivered orders.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTab("remittance")}
            className={`rounded-xl border px-3 py-2 text-sm font-medium ${
              tab === "remittance"
                ? "border-black bg-black text-white"
                : "border-zinc-200 bg-white text-zinc-700"
            }`}
          >
            Remittance
          </button>

          <button
            onClick={() => setTab("pending")}
            className={`rounded-xl border px-3 py-2 text-sm font-medium ${
              tab === "pending"
                ? "border-black bg-black text-white"
                : "border-zinc-200 bg-white text-zinc-700"
            }`}
          >
            Pending
          </button>

          <button
            onClick={openCreate}
            className="rounded-xl border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
          >
            Add Entry
          </button>
        </div>
      </div>

      <RemittanceSummaryCards summary={summary} loading={summaryLoading} />

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="min-w-0 space-y-4">
          {tab === "remittance" ? (
            <>
              <RemittanceFilters
                filters={filters}
                onChange={setFilters}
                onApply={() => fetchRemittances({ page: 1 })}
                onExportCsv={() => exportCsv()}
                onExportExcel={() => exportExcel()}
                exportLoading={exportLoading}
                loading={loading}
              />

              {showForm && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-zinc-900">
                      {heading}
                    </h2>
                    <button
                      onClick={closeForm}
                      className="text-sm text-zinc-500 hover:text-zinc-900"
                    >
                      Close
                    </button>
                  </div>

                  <form
                    onSubmit={submitForm}
                    className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
                  >
                    <input
                      value={form.ewayBillId}
                      onChange={(e) => onChange("ewayBillId", e.target.value)}
                      placeholder="Eway Bill ID"
                      className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                    />

                    <input
                      value={form.shippingNo}
                      onChange={(e) => onChange("shippingNo", e.target.value)}
                      placeholder="Shipping No"
                      className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                    />

                    <input
                      value={form.orderNumber}
                      onChange={(e) => onChange("orderNumber", e.target.value)}
                      placeholder="Order Number"
                      required
                      className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                    />

                    <select
                      value={form.orderType}
                      onChange={(e) => onChange("orderType", e.target.value)}
                      className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                    >
                      <option value="">Select Order Type</option>
                      <option value="cod">COD</option>
                      <option value="razorpay">Prepaid</option>
                    </select>

                    <input
                      type="date"
                      value={form.deliveredDate}
                      onChange={(e) => onChange("deliveredDate", e.target.value)}
                      className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                    />

                    <input
                      type="date"
                      value={form.remittanceDate}
                      onChange={(e) => onChange("remittanceDate", e.target.value)}
                      className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                    />

                    <input
                      type="number"
                      step="0.01"
                      value={form.remittedAmount}
                      onChange={(e) => onChange("remittedAmount", e.target.value)}
                      placeholder="Remitted Amount"
                      className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={createLoading || updateLoading}
                        className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        {editingRow
                          ? updateLoading
                            ? "Updating..."
                            : "Update"
                          : createLoading
                          ? "Saving..."
                          : "Save"}
                      </button>

                      <button
                        type="button"
                        onClick={closeForm}
                        className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>

                  {actionError ? (
                    <p className="mt-3 text-sm text-red-600">{actionError}</p>
                  ) : null}
                </div>
              )}

              <RemittanceTable
                rows={rows}
                loading={loading}
                error={error}
                pagination={pagination}
                onPageChange={(page) => fetchRemittances({ page })}
                onEdit={openEdit}
                onDelete={onDelete}
                deleteLoading={deleteLoading}
              />
            </>
          ) : (
            <>
              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <input
                    value={pendingFilters.search}
                    onChange={(e) =>
                      setPendingFilters({ search: e.target.value, page: 1 })
                    }
                    placeholder="Search order number"
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                  />

                  <select
                    value={pendingFilters.sortBy}
                    onChange={(e) =>
                      setPendingFilters({ sortBy: e.target.value, page: 1 })
                    }
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                  >
                    <option value="deliveredDate">Delivered Date</option>
                    <option value="orderNumber">Order Number</option>
                    <option value="orderDate">Order Date</option>
                    <option value="finalPayable">Final Payable</option>
                    <option value="paymentMethod">Order Type</option>
                  </select>

                  <select
                    value={pendingFilters.sortOrder}
                    onChange={(e) =>
                      setPendingFilters({ sortOrder: e.target.value, page: 1 })
                    }
                    className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                  >
                    <option value="desc">Desc</option>
                    <option value="asc">Asc</option>
                  </select>

                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchPendingRemittances({ page: 1 })}
                      disabled={pendingLoading}
                      className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {pendingLoading ? "Loading..." : "Apply"}
                    </button>

                    <button
                      onClick={() => exportPendingCsv()}
                      disabled={exportLoading}
                      className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 disabled:opacity-50"
                    >
                      CSV
                    </button>
                  </div>
                </div>
              </div>

              <PendingRemittanceTable
                rows={pendingRows}
                loading={pendingLoading}
                error={pendingError}
                pagination={pendingPagination}
                onPageChange={(page) => fetchPendingRemittances({ page })}
                onQuickCreate={openPendingToCreate}
              />
            </>
          )}
        </div>

        <div className="min-w-0">
          <RemittanceUploadCard
            onUpload={onUpload}
            loading={importLoading}
            busy={busy}
          />
        </div>
      </div>
    </div>
  );
}