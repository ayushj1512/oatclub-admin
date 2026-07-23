"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  Download,
  RefreshCw,
  Tags,
  ToggleLeft,
  Activity,
} from "lucide-react";
import * as XLSX from "xlsx";
import useFabricStore from "@/store/fabricStore";

const statusOptions = ["active", "inactive", "discontinued"];
const movementOptions = ["idle", "incoming", "in_use", "outgoing"];

export default function FabricActionsPage() {
  const {
    fabrics,
    loading,
    formLoading,
    fetchFabrics,
    bulkUpdateFabrics,
    addAssociatedProductCodes,
    removeAssociatedProductCodes,
  } = useFabricStore();

  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkMovement, setBulkMovement] = useState("");
  const [productCodes, setProductCodes] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchFabrics({ page: 1, limit: 200 });
  }, []);

  const selectedFabrics = useMemo(
    () => fabrics.filter((item) => selectedIds.includes(item._id)),
    [fabrics, selectedIds]
  );

  const parsedProductCodes = useMemo(
    () =>
      productCodes
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    [productCodes]
  );

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    setMessage("");
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      prev.length === fabrics.length ? [] : fabrics.map((item) => item._id)
    );
    setMessage("");
  };

  const handleBulkStatus = async () => {
    if (!selectedIds.length || !bulkStatus) {
      setMessage("Select fabrics and status first.");
      return;
    }

    const ok = window.confirm(
      `Update status to ${bulkStatus} for ${selectedIds.length} fabrics?`
    );
    if (!ok) return;

    const res = await bulkUpdateFabrics(selectedIds, {
      status: bulkStatus,
      isActive: bulkStatus === "active",
    });

    setMessage(res.success ? "Bulk status updated successfully." : res.message);
  };

  const handleBulkMovement = async () => {
    if (!selectedIds.length || !bulkMovement) {
      setMessage("Select fabrics and movement status first.");
      return;
    }

    const ok = window.confirm(
      `Update movement to ${bulkMovement} for ${selectedIds.length} fabrics?`
    );
    if (!ok) return;

    const res = await bulkUpdateFabrics(selectedIds, {
      movementStatus: bulkMovement,
    });

    setMessage(res.success ? "Bulk movement updated successfully." : res.message);
  };

  const handleAddProductCodes = async () => {
    if (!selectedIds.length || !parsedProductCodes.length) {
      setMessage("Select fabrics and enter product codes first.");
      return;
    }

    const ok = window.confirm(
      `Add ${parsedProductCodes.length} product codes to ${selectedIds.length} fabrics?`
    );
    if (!ok) return;

    let success = 0;
    let failed = 0;

    for (const id of selectedIds) {
      const res = await addAssociatedProductCodes(id, parsedProductCodes);
      if (res.success) success += 1;
      else failed += 1;
    }

    await fetchFabrics({ page: 1, limit: 200 });
    setMessage(`Product code mapping done. Success: ${success}, Failed: ${failed}`);
  };

  const handleRemoveProductCodes = async () => {
    if (!selectedIds.length || !parsedProductCodes.length) {
      setMessage("Select fabrics and enter product codes first.");
      return;
    }

    const ok = window.confirm(
      `Remove ${parsedProductCodes.length} product codes from ${selectedIds.length} fabrics?`
    );
    if (!ok) return;

    let success = 0;
    let failed = 0;

    for (const id of selectedIds) {
      const res = await removeAssociatedProductCodes(id, parsedProductCodes);
      if (res.success) success += 1;
      else failed += 1;
    }

    await fetchFabrics({ page: 1, limit: 200 });
    setMessage(`Product code removal done. Success: ${success}, Failed: ${failed}`);
  };

  const handleExportSelected = () => {
    const rows = selectedFabrics.map((item) => ({
      Code: item.code,
      Name: item.name,
      Category: item.category,
      Unit: item.unit,
      Stock: item.currentStock,
      Status: item.status,
      Movement: item.movementStatus,
      "Product Codes": item.associatedProductCodes?.join(", ") || "",
      Notes: item.notes || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Selected Fabrics");
    XLSX.writeFile(wb, `selected-fabrics-${Date.now()}.xlsx`);
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
              Fabric Bulk Actions
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Bulk update status, movement and product code mapping.
            </p>
          </div>

          <button
            onClick={() => fetchFabrics({ page: 1, limit: 200 })}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-100"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {message ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-700 shadow-sm">
            {message}
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <ActionCard
            icon={ToggleLeft}
            title="Bulk Status"
            description="Update active, inactive or discontinued status."
          >
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="input"
            >
              <option value="">Select status</option>
              {statusOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <button
              disabled={formLoading}
              onClick={handleBulkStatus}
              className="btn-dark"
            >
              Apply Status
            </button>
          </ActionCard>

          <ActionCard
            icon={Activity}
            title="Bulk Movement"
            description="Update movement status for selected fabrics."
          >
            <select
              value={bulkMovement}
              onChange={(e) => setBulkMovement(e.target.value)}
              className="input"
            >
              <option value="">Select movement</option>
              {movementOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <button
              disabled={formLoading}
              onClick={handleBulkMovement}
              className="btn-dark"
            >
              Apply Movement
            </button>
          </ActionCard>

          <ActionCard
            icon={Tags}
            title="Product Code Mapping"
            description="Add or remove product codes from selected fabrics."
          >
            <textarea
              value={productCodes}
              onChange={(e) => setProductCodes(e.target.value)}
              placeholder="00277, 00441, 00561"
              rows={3}
              className="input h-auto resize-none py-3"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={formLoading}
                onClick={handleAddProductCodes}
                className="btn-dark"
              >
                Add Codes
              </button>

              <button
                disabled={formLoading}
                onClick={handleRemoveProductCodes}
                className="btn-light"
              >
                Remove Codes
              </button>
            </div>
          </ActionCard>
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-neutral-200 p-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-sm font-semibold">Select Fabrics</h2>
              <p className="text-xs text-neutral-500">
                {selectedIds.length} selected from {fabrics.length} loaded records
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-100"
              >
                <CheckCircle size={16} />
                {selectedIds.length === fabrics.length ? "Clear All" : "Select All"}
              </button>

              <button
                disabled={!selectedIds.length}
                onClick={handleExportSelected}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium hover:bg-neutral-100 disabled:opacity-40"
              >
                <Download size={16} />
                Export Selected
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Select</th>
                  <th className="px-4 py-3">Fabric</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Movement</th>
                  <th className="px-4 py-3">Products</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-neutral-500">
                      Loading fabrics...
                    </td>
                  </tr>
                ) : fabrics.length ? (
                  fabrics.map((fabric) => (
                    <tr key={fabric._id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(fabric._id)}
                          onChange={() => toggleSelect(fabric._id)}
                          className="h-4 w-4 accent-neutral-950"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-semibold">{fabric.name}</p>
                        <p className="text-xs text-neutral-500">{fabric.code}</p>
                      </td>

                      <td className="px-4 py-3">{fabric.category}</td>
                      <td className="px-4 py-3">
                        {fabric.currentStock} {fabric.unit}
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium">
                          {fabric.status}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-neutral-950 px-3 py-1 text-xs font-medium text-white">
                          {fabric.movementStatus}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {fabric.associatedProductsCount || 0}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-neutral-500">
                      No fabrics found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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

        .btn-dark {
          min-height: 44px;
          border-radius: 12px;
          background: #171717;
          color: #ffffff;
          padding: 0 16px;
          font-size: 14px;
          font-weight: 500;
        }

        .btn-light {
          min-height: 44px;
          border-radius: 12px;
          border: 1px solid #e5e5e5;
          background: #ffffff;
          color: #171717;
          padding: 0 16px;
          font-size: 14px;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

function ActionCard({ icon: Icon, title, description, children }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-neutral-100 p-2">
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-neutral-500">{description}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}
