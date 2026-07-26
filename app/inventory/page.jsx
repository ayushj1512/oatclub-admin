"use client";

import {
  Boxes,
  RotateCcw,
} from "lucide-react";

import InventoryTabs from "@/components/inventory/InventoryTabs";
import useSearchStore from "@/store/searchStore";
import { useVendorInventoryStore } from "@/store/vendorInventoryStore";

export default function VendorInventoryPage() {
  const { resetInventory } =
    useVendorInventoryStore();

  const { clearLookupProduct } =
    useSearchStore();

  const handleReset = () => {
    resetInventory();
    clearLookupProduct();
  };

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-neutral-500">
              <Boxes size={17} />

              <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                Vendor Inventory
              </p>
            </div>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
              Inventory Inward
            </h1>

            <p className="mt-1 text-sm text-neutral-500">
              Add inventory through
              barcode scanning or manual
              product entry.
            </p>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-800 transition hover:bg-neutral-100"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </header>

        <InventoryTabs />
      </div>
    </main>
  );
}