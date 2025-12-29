"use client";

import { useEffect, useState } from "react";
import { useFabricStore } from "@/store/fabricStore";
import AddEditFabricModal from "@/components/fabric/AddEditFabricModal";

/* ============================================================
   FABRIC MANAGER COMPONENT
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
  }, []);

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
    } catch (_) {}
  };

  /* -------------------------------
     RENDER
  -------------------------------- */
  return (
    <div className="p-6 space-y-6 bg-[#f5f6f8] min-h-screen">
  {/* ================= HEADER ================= */}
  <div className="flex items-center justify-between bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-200">
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">
        Fabric Management
      </h1>
      <p className="text-sm text-gray-500">
        Manage fabrics, usage status and availability
      </p>
    </div>

    <button
      onClick={openCreate}
      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow"
    >
      + Add Fabric
    </button>
  </div>

  {/* ================= FILTERS ================= */}
  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
    <div className="flex flex-wrap gap-3">
      <input
        placeholder="Search by name, code or category"
        value={filters.q}
        onChange={(e) => setFilters({ q: e.target.value })}
        className="border border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2 rounded-lg text-sm w-64 outline-none"
      />

      <select
        value={filters.status}
        onChange={(e) => setFilters({ status: e.target.value })}
        className="border border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2 rounded-lg text-sm outline-none"
      >
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="discontinued">Discontinued</option>
      </select>

      <select
        value={filters.movementStatus}
        onChange={(e) =>
          setFilters({ movementStatus: e.target.value })
        }
        className="border border-gray-300 focus:border-blue-500 focus:ring-blue-500 px-3 py-2 rounded-lg text-sm outline-none"
      >
        <option value="">All Movement</option>
        <option value="idle">Idle</option>
        <option value="incoming">Incoming</option>
        <option value="in_use">In Use</option>
        <option value="outgoing">Outgoing</option>
      </select>

      <button
        onClick={() => {
          clearFilters();
          fetchFabrics();
        }}
        className="text-sm text-blue-600 hover:underline ml-auto"
      >
        Reset Filters
      </button>
    </div>
  </div>

  {/* ================= TABLE ================= */}
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <table className="w-full text-sm">
      <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
        <tr>
          <th className="p-4 text-left">Name</th>
          <th className="p-4">Code</th>
          <th className="p-4">Category</th>
          <th className="p-4">Unit</th>
          <th className="p-4">Movement</th>
          <th className="p-4 text-right">Actions</th>
        </tr>
      </thead>

      <tbody className="divide-y divide-gray-200">
        {loading && (
          <tr>
            <td colSpan="6" className="p-6 text-center text-gray-500">
              Loading fabrics…
            </td>
          </tr>
        )}

        {!loading && fabrics.length === 0 && (
          <tr>
            <td colSpan="6" className="p-6 text-center text-gray-400">
              No fabrics found
            </td>
          </tr>
        )}

        {fabrics.map((f) => (
          <tr
            key={f._id}
            className="hover:bg-gray-50 transition"
          >
            <td className="p-4 font-medium text-gray-900">
              {f.name}
            </td>
            <td className="p-4 text-gray-600">{f.code}</td>
            <td className="p-4 text-gray-600">{f.category}</td>
            <td className="p-4 text-gray-600 uppercase">{f.unit}</td>

            <td className="p-4">
              <select
                value={f.movementStatus}
                onChange={(e) =>
                  updateMovementStatus(f._id, e.target.value)
                }
                className="border border-gray-300 rounded-md px-2 py-1 text-xs bg-white focus:border-blue-500 outline-none"
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
                className="text-blue-600 hover:text-blue-800 text-xs font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => deleteFabric(f._id)}
                className="text-red-600 hover:text-red-800 text-xs font-medium"
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  {/* ================= ERROR ================= */}
  {error && (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
      {error}
    </div>
  )}

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
