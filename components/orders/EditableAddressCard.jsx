"use client";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Receipt, Pencil, X, Save, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useOrderStore } from "@/store/orderStore";

const Input = ({ label, value, onChange }) => (
  <div>
    <label className="text-xs font-semibold text-gray-600">{label}</label>
    <input
      className="mt-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 w-full text-sm focus:ring-2 focus:ring-black/10 outline-none"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

export default function EditableAddressCard({
  orderId,
  type = "shipping", // shipping | billing
  address,
  onRefresh,
}) {
  const { updateOrderAddress } = useOrderStore();

  const initialForm = useMemo(
    () => ({
      fullName: address?.fullName || "",
      line1: address?.line1 || "",
      line2: address?.line2 || "",
      city: address?.city || "",
      state: address?.state || "",
      pincode: address?.pincode || "",
      phone: address?.phone || "",
    }),
    [address]
  );

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

  // ✅ keep form in sync when order/address changes
  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  const handleCancel = () => {
    setEditing(false);
    setForm(initialForm);
  };

  const handleSave = async () => {
    if (!orderId) return;

    setSaving(true);
    try {
      await updateOrderAddress(orderId, { type, address: form });
      toast.success("Address updated ✅");
      setEditing(false);
      onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "Failed to update address");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-gray-100 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          {type === "shipping" ? <MapPin size={18} /> : <Receipt size={18} />}
          {type === "shipping" ? "Shipping Address" : "Billing Address"}
        </h2>

        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-semibold flex items-center gap-1 text-blue-600 hover:underline"
          >
            <Pencil size={14} /> Edit
          </button>
        ) : (
          <button
            onClick={handleCancel}
            className="text-xs font-semibold flex items-center gap-1 text-gray-500 hover:underline"
          >
            <X size={14} /> Cancel
          </button>
        )}
      </div>

      {/* VIEW MODE */}
      {!editing && (
        <div className="text-gray-700 leading-relaxed text-sm space-y-0.5">
          <p>{address?.fullName || "-"}</p>
          <p>{address?.line1 || "-"}</p>
          {address?.line2 && <p>{address.line2}</p>}
          <p>
            {address?.city || "-"}, {address?.state || "-"} -{" "}
            {address?.pincode || "-"}
          </p>
          {address?.phone && <p>📞 {address.phone}</p>}
        </div>
      )}

      {/* EDIT MODE */}
      {editing && (
        <>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <Input
              label="Full Name"
              value={form.fullName}
              onChange={(v) => setForm({ ...form, fullName: v })}
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v })}
            />
            <Input
              label="Address Line 1"
              value={form.line1}
              onChange={(v) => setForm({ ...form, line1: v })}
            />
            <Input
              label="Address Line 2"
              value={form.line2}
              onChange={(v) => setForm({ ...form, line2: v })}
            />
            <Input
              label="City"
              value={form.city}
              onChange={(v) => setForm({ ...form, city: v })}
            />
            <Input
              label="State"
              value={form.state}
              onChange={(v) => setForm({ ...form, state: v })}
            />
            <Input
              label="Pincode"
              value={form.pincode}
              onChange={(v) => setForm({ ...form, pincode: v })}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 px-6 py-2.5 rounded-lg bg-black text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Save Address
          </button>
        </>
      )}
    </div>
  );
}
