"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRemittanceStore } from "@/store/remittanceStore";

import RemittanceSummaryCards from "@/components/accounts/remittance/RemittanceSummaryCards";
import RemittanceFilters from "@/components/accounts/remittance/RemittanceFilters";
import RemittanceUploadCard from "@/components/accounts/remittance/RemittanceUploadCard";
import RemittanceTable from "@/components/accounts/remittance/RemittanceTable";
import PendingRemittanceTable from "@/components/accounts/remittance/PendingRemittanceTable";

const normalizeOrderType = (
  value
) => {
  const type = String(
    value || ""
  )
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  if (type === "cod") {
    return "cod";
  }

  if (type === "partial_cod") {
    return "partial_cod";
  }

  if (
    type === "razorpay" ||
    type === "prepaid"
  ) {
    return "razorpay";
  }

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

    importSources,
    importResult,

    loading,
    summaryLoading,
    pendingLoading,
    createLoading,
    updateLoading,
    deleteLoading,
    importLoading,
    sourcesLoading,
    exportLoading,

    error,
    pendingError,
    actionError,

    setFilters,
    setPendingFilters,

    fetchRemittances,
    fetchSummary,
    fetchPendingRemittances,
    fetchImportSources,

    createRemittance,
    updateRemittance,
    deleteRemittance,

    importReport,
    clearImportResult,

    exportCsv,
    exportExcel,
    exportPendingCsv,
    razorpaySyncLoading,
    razorpaySyncResult,
    syncRazorpayRemittance,
    clearRazorpaySyncResult,

    clearErrors,
  } = useRemittanceStore();

  const [tab, setTab] = useState("remittance");
  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showHowTo, setShowHowTo] = useState(false);
  const [razorpayMonth, setRazorpayMonth] = useState(() => {
    const now = new Date();

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });

  useEffect(() => {
    fetchSummary();
    fetchRemittances();
    fetchPendingRemittances();
    fetchImportSources();
  }, [
    fetchSummary,
    fetchRemittances,
    fetchPendingRemittances,
    fetchImportSources,
  ]);

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
    clearImportResult();

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

  const onUpload = async (
    source,
    file
  ) => {
    try {
      await importReport(
        source,
        file
      );

      setTab("remittance");
    } catch { }
  };

  const handleRazorpaySync = async () => {
    const [year, month] = razorpayMonth.split("-").map(Number);

    clearErrors();
    clearRazorpaySyncResult();

    try {
      await syncRazorpayRemittance({
        year,
        month,
      });

      setTab("remittance");
    } catch { }
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
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">
              Remittance Portal
            </h1>

            <p className="text-sm text-zinc-500">
              Upload, track and manage remittance against delivered orders.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHowTo((prev) => !prev)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              {showHowTo ? "Hide Guide" : "How to Use"}
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Add Entry
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-3 xl:flex-row xl:items-center xl:justify-between">
          {/* Main tabs */}
          <div className="inline-flex w-fit rounded-xl bg-zinc-100 p-1">
            <button
              type="button"
              onClick={() => setTab("remittance")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${tab === "remittance"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900"
                }`}
            >
              Remittance Entries
            </button>

            <button
              type="button"
              onClick={() => setTab("pending")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${tab === "pending"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900"
                }`}
            >
              Pending Orders
            </button>
          </div>

          {/* Razorpay action */}
          <div className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-2 sm:flex-row sm:items-center">
            <div className="px-1">
              <p className="text-xs font-semibold text-emerald-900">
                Razorpay Settlement
              </p>

              <p className="text-[11px] text-emerald-700">
                Select month and sync
              </p>
            </div>

            <input
              type="month"
              value={razorpayMonth}
              onChange={(event) => setRazorpayMonth(event.target.value)}
              disabled={razorpaySyncLoading}
              className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 disabled:opacity-50"
            />

            <button
              type="button"
              onClick={handleRazorpaySync}
              disabled={!razorpayMonth || razorpaySyncLoading || busy}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {razorpaySyncLoading ? "Syncing..." : "Sync Razorpay"}
            </button>
          </div>
        </div>
      </div>

      {showHowTo ? (
  <div className="mb-4 rounded-2xl border border-zinc-200 bg-white p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">
          How to Use Remittance Portal
        </h2>

        <p className="mt-1 text-xs text-zinc-500">
          Match received payments against delivered orders.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setShowHowTo(false)}
        className="text-xs font-medium text-zinc-500 hover:text-zinc-900"
      >
        Close
      </button>
    </div>

    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
        <p className="text-xs font-semibold text-zinc-900">
          1. Delhivery
        </p>
        <p className="mt-1 text-xs leading-5 text-zinc-600">
          Select Delhivery and upload the original CSV remittance report.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
        <p className="text-xs font-semibold text-zinc-900">
          2. Shiprocket
        </p>
        <p className="mt-1 text-xs leading-5 text-zinc-600">
          Download the COD remittance report and upload its original XLS or
          XLSX file.
        </p>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
        <p className="text-xs font-semibold text-emerald-900">
          3. Razorpay
        </p>
        <p className="mt-1 text-xs leading-5 text-emerald-700">
          Select the settlement month and click Sync Razorpay. No file upload
          is required.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
        <p className="text-xs font-semibold text-zinc-900">
          4. Manual Entry
        </p>
        <p className="mt-1 text-xs leading-5 text-zinc-600">
          Use Add Entry when a payment cannot be imported or requires a manual
          adjustment.
        </p>
      </div>
    </div>

    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
      <p className="text-xs leading-5 text-amber-800">
        Always upload the original courier report without renaming columns.
        Review Unmapped, Review and Failed counts after every import.
      </p>
    </div>
  </div>
) : null}

<RemittanceSummaryCards
  summary={summary}
  loading={summaryLoading}
/>


      {razorpaySyncResult?.stats ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Razorpay sync completed
              </p>

              <p className="mt-1 text-xs text-emerald-700">
                Processed: {razorpaySyncResult.stats.processed || 0}
                {" · "}
                Existing: {razorpaySyncResult.stats.duplicates || 0}
                {" · "}
                Unmapped: {razorpaySyncResult.stats.unmapped || 0}
                {" · "}
                Review: {razorpaySyncResult.stats.needsReview || 0}
                {" · "}
                Failed: {razorpaySyncResult.stats.failed || 0}
              </p>
            </div>

            <button
              type="button"
              onClick={clearRazorpaySyncResult}
              className="text-xs font-medium text-emerald-800"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

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
                      onChange={(event) =>
                        onChange(
                          "orderType",
                          event.target.value
                        )
                      }
                      className="rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                    >
                      <option value="">
                        Select Payment Type
                      </option>

                      <option value="cod">
                        COD
                      </option>

                      <option value="partial_cod">
                        Partial COD
                      </option>

                      <option value="razorpay">
                        Prepaid
                      </option>
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
            sources={importSources}
            sourcesLoading={
              sourcesLoading
            }
            importResult={importResult}
            loading={importLoading}
            busy={busy}
            error={
              showForm
                ? ""
                : actionError
            }
            onUpload={onUpload}
            onManual={openCreate}
            onClearResult={
              clearImportResult
            }
          />
        </div>
      </div>
    </div>
  );
}
