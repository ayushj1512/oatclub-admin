"use client";

import {
  Boxes,
  Loader2,
  Save,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useAdminProductStore } from "@/store/adminProductStore";

const normalizeStockType = (value) =>
  value === "limited"
    ? "limited"
    : "unlimited";

export default function ProductStockTypeManager({
  product,
  onUpdated,
}) {
  const updateProductStockType =
    useAdminProductStore(
      (state) =>
        state.updateProductStockType,
    );

  const storeSaving = useAdminProductStore(
    (state) => state.saving,
  );

  const currentStockType =
    normalizeStockType(
      product?.stockType,
    );

  const [stockType, setStockType] =
    useState(currentStockType);

  useEffect(() => {
    setStockType(currentStockType);
  }, [currentStockType]);

  const hasChanged =
    stockType !== currentStockType;

  const handleSave = async () => {
    if (
      !product?._id ||
      !hasChanged ||
      storeSaving
    ) {
      return;
    }

    if (
      stockType === "limited" &&
      !window.confirm(
        "Mark this product as limited stock? Only variants with available stock will remain purchasable.",
      )
    ) {
      return;
    }

    try {
      const updated =
        await updateProductStockType(
          product._id,
          stockType,
        );

      onUpdated?.(updated);
    } catch {
      // Store already handles error toast
    }
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-xl bg-gray-100 p-2 text-gray-700">
            <Boxes size={18} />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Stock Type
            </h2>

            <p className="mt-1 text-xs leading-5 text-gray-500">
              Unlimited products can be
              manufactured again. Limited
              products sell only their
              remaining stock.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={stockType}
            onChange={(event) =>
              setStockType(
                event.target.value,
              )
            }
            disabled={storeSaving}
            className="h-10 min-w-40 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-800 outline-none transition focus:border-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="unlimited">
              Unlimited
            </option>

            <option value="limited">
              Limited
            </option>
          </select>

          <button
            type="button"
            onClick={handleSave}
            disabled={
              !hasChanged || storeSaving
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {storeSaving ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <Save size={16} />
            )}

            {storeSaving
              ? "Saving"
              : "Update"}
          </button>
        </div>
      </div>

      <div
        className={`mt-3 rounded-xl px-3 py-2 text-xs ${stockType === "limited"
            ? "bg-amber-50 text-amber-800"
            : "bg-emerald-50 text-emerald-700"
          }`}
      >
        {stockType === "limited"
          ? "Limited: Out-of-stock sizes will not be available for purchase."
          : "Unlimited: All configured sizes remain available for purchase."}
      </div>
    </section>
  );
}
