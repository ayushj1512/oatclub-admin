"use client";

import { useEffect, useMemo, useState } from "react";
import { useFabricStore } from "@/store/fabricStore";
import AddEditFabricModal from "@/components/fabric/AddEditFabricModal";

/* ============================================================
   FABRIC MANAGER (B/W CLEAN UI)
============================================================ */
export default function FabricManager() {
  const {
    fabrics,
    loading,
    error,
    filters,
    fetchFabrics,
    createFabric,
    updateFabric,
    deleteFabric,
    updateMovementStatus,
    setFilters,
    clearFilters,
  } = useFabricStore();

  /* -------------------------------
     LOCAL STATE
  -------------------------------- */
  const [showModal, setShowModal] = useState(false);
  const [editingFabric, setEditingFabric] = useState(null);

  /* -------------------------------
     FETCH ON LOAD
  -------------------------------- */
  useEffect(() => {
    fetchFabrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------------
     DERIVED
  -------------------------------- */
  const count = fabrics?.length || 0;

  const activeFilterLabel = useMemo(() => {
    const parts = [];
    if (filters.q) parts.push(`q: "${filters.q}"`);
    if (filters.status) parts.push(`status: ${filters.status}`);
    if (filters.movementStatus) parts.push(`movement: ${filters.movementStatus}`);
    return parts.length ? parts.join(" • ") : "No filters";
  }, [filters]);

  /* -------------------------------
     MODAL HANDLERS
  -------------------------------- */
  const openCreate = () => {
    setEditingFabric(null);
    setShowModal(true);
  };

  const openEdit = (fabric) => {
    setEditingFabric(fabric);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingFabric(null);
  };

  const handleSubmit = async (payload) => {
    try {
      if (editingFabric) {
        await updateFabric(editingFabric._id, payload);
      } else {
        await createFabric(payload);
      }
      closeModal();
      // optional: refresh list if backend mutates fields
      await fetchFabrics();
    } catch (_) {}
  };

  const handleReset = async () => {
    clearFilters();
    await fetchFabrics();
  };

  /* -------------------------------
     RENDER
  -------------------------------- */
  return (
    <div className="min-h-screen bg-white text-black p-4 md:p-6">
      {/* ================= HEADER ================= */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Fabric Management
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage fabrics, movement status, and availability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchFabrics()}
            className="px-3 py-2 rounded-lg border border-black/15 hover:border-black/30 hover:bg-black/5 text-sm"
            disabled={loading}
          >
            Refresh
          </button>

          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg bg-black text-white hover:bg-black/90 text-sm font-medium"
          >
            + Add Fabric
          </button>
        </div>
      </div>

      {/* ================= FILTER BAR ================= */}
      <div className="mt-5 border border-black/10 rounded-2xl p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="flex-1 min-w-[240px]">
              <label className="text-xs text-gray-600">Search</label>
              <input
                placeholder="Name / code / category"
                value={filters.q}
                onChange={(e) => setFilters({ q: e.target.value })}
                className="mt-1 w-full border border-black/15 rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
              />
            </div>

            <div className="min-w-[180px]">
              <label className="text-xs text-gray-600">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ status: e.target.value })}
                className="mt-1 w-full border border-black/15 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-black"
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>

            <div className="min-w-[180px]">
              <label className="text-xs text-gray-600">Movement</label>
              <select
                value={filters.movementStatus}
                onChange={(e) => setFilters({ movementStatus: e.target.value })}
                className="mt-1 w-full border border-black/15 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-black"
              >
                <option value="">All</option>
                <option value="idle">Idle</option>
                <option value="incoming">Incoming</option>
                <option value="in_use">In Use</option>
                <option value="outgoing">Outgoing</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between lg:justify-end gap-3">
            <div className="text-xs text-gray-600">
              <span className="font-medium text-black">{count}</span> fabrics •{" "}
              {activeFilterLabel}
            </div>

            <button
              onClick={handleReset}
              className="text-sm underline underline-offset-4 hover:opacity-80"
              disabled={loading}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div className="mt-5 border border-black/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-black text-white">
              <tr className="text-left">
                <th className="p-4 font-medium w-[260px]">Name</th>
                <th className="p-4 font-medium w-[160px]">Code</th>
                <th className="p-4 font-medium w-[220px]">Category</th>
                <th className="p-4 font-medium w-[110px]">Unit</th>
                <th className="p-4 font-medium w-[180px]">Movement</th>
                <th className="p-4 font-medium text-right w-[160px]">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-black/10">
              {loading && (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-gray-600">
                    Loading fabrics…
                  </td>
                </tr>
              )}

              {!loading && fabrics.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-gray-500">
                    No fabrics found
                  </td>
                </tr>
              )}

              {!loading &&
                fabrics.map((f) => (
                  <tr key={f._id} className="hover:bg-black/5 transition">
                    <td className="p-4">
                      <div className="font-medium">{f.name}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        <span className="text-gray-500">ID:</span> {f._id}
                      </div>
                    </td>

                    <td className="p-4 text-gray-800">
                      {f.code || <span className="text-gray-400">—</span>}
                    </td>

                    <td className="p-4 text-gray-800">
                      {f.category || <span className="text-gray-400">—</span>}
                    </td>

                    <td className="p-4 text-gray-800 uppercase">
                      {f.unit || <span className="text-gray-400">—</span>}
                    </td>

                    <td className="p-4">
                      <select
                        value={f.movementStatus}
                        onChange={(e) =>
                          updateMovementStatus(f._id, e.target.value)
                        }
                        className="border border-black/15 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-black"
                      >
                        <option value="idle">Idle</option>
                        <option value="incoming">Incoming</option>
                        <option value="in_use">In Use</option>
                        <option value="outgoing">Outgoing</option>
                      </select>
                    </td>

                    <td className="p-4 text-right space-x-3">
                      <button
                        onClick={() => openEdit(f)}
                        className="text-sm underline underline-offset-4 hover:opacity-80"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteFabric(f._id)}
                        className="text-sm underline underline-offset-4 text-red-600 hover:opacity-80"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* FOOTER STRIP */}
        <div className="px-4 py-3 bg-white border-t border-black/10 text-xs text-gray-600 flex items-center justify-between">
          <div>
            Showing <span className="font-medium text-black">{count}</span> fabrics
          </div>
          <div className="flex items-center gap-2">
            {error ? (
              <span className="text-red-600">{error}</span>
            ) : (
              <span>—</span>
            )}
          </div>
        </div>
      </div>

      {/* ================= ADD / EDIT MODAL ================= */}
      <AddEditFabricModal
        open={showModal}
        onClose={closeModal}
        onSubmit={handleSubmit}
        fabric={editingFabric}
        loading={loading}
      />
    </div>
  );
}
