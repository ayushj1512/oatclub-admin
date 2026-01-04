"use client";

import { useEffect, useState } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAdminProductStore } from "@/store/adminProductStore";

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function QuickVariantStockInlineEditor({ product }) {
  const { updateVariantStock, saving } = useAdminProductStore();

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const isVariable = product?.productType === "variable" && variants.length > 0;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  // ✅ total stock for badge
  const totalStock = isVariable
    ? variants.reduce((acc, v) => acc + (v.stock || 0), 0)
    : product?.stock || 0;

  useEffect(() => {
    if (!editing) setDraft("");
  }, [editing]);

  const save = async () => {
    const stockVal = toNum(draft);

    if (stockVal < 0) {
      toast.error("Stock cannot be negative");
      return;
    }

    try {
      // ✅ ONE CLICK = update ALL variants
      await Promise.all(
        variants.map((v) =>
          updateVariantStock(product._id, v._id, stockVal)
        )
      );

      toast.success("All variant stock updated ✅");
      setEditing(false);
    } catch (e) {
      toast.error(e.message || "Failed to update variants");
    }
  };

  /* ✅ SIMPLE PRODUCT (no variants) => normal badge only */
  if (!isVariable) {
    return (
      <span
        className={`text-xs font-semibold px-2 py-1 rounded-full border ${
          totalStock > 0
            ? "bg-green-50 text-green-700 border-green-200"
            : "bg-red-50 text-red-700 border-red-200"
        }`}
      >
        {totalStock > 0 ? `In Stock (${totalStock})` : "Out of Stock"}
      </span>
    );
  }

  /* ✅ VARIABLE PRODUCT => badge + quick apply */
  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span
          className={`text-xs font-semibold px-2 py-1 rounded-full border ${
            totalStock > 0
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {totalStock > 0 ? `Total (${totalStock})` : "Out of Stock"}
        </span>

        {/* ✅ Quick Edit Button */}
        <button
          onClick={() => setEditing(true)}
          title="Quick update all variant stock"
          className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          <Pencil size={14} />
        </button>
      </div>
    );
  }

  /* ✅ EDIT MODE */
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Stock"
        className="px-2 py-1 border rounded-md w-[90px] text-sm outline-none"
      />

      <button
        onClick={save}
        disabled={saving}
        className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-60"
        title="Apply to all variants"
      >
        {saving ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Check size={14} />
        )}
      </button>

      <button
        onClick={() => {
          setDraft("");
          setEditing(false);
        }}
        className="p-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
        title="Cancel"
      >
        <X size={14} />
      </button>
    </div>
  );
}
