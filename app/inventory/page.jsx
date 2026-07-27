"use client";

import { Boxes } from "lucide-react";

export default function VendorInventoryPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-black text-white shadow-lg">
          <Boxes size={36} />
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          Coming Soon
        </h1>

        <p className="mt-3 text-base text-neutral-600">
          The Vendor Inventory module is currently under development and will be
          available soon.
        </p>

        <div className="mt-8 inline-flex rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-500">
          🚧 Work in Progress
        </div>
      </div>
    </main>
  );
}