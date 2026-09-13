// app/ndr/all/page.jsx

"use client";

import { useState } from "react";
import NdrCasesView from "@/components/ndr/NdrCasesView";

export default function AllNdrCasesPage() {
  const [selectedCase, setSelectedCase] =
    useState(null);

  return (
    <>
      <NdrCasesView
        title="All NDR Cases"
        description="View Delhivery and Shiprocket delivery exceptions."
        cases={[]}
        onOpen={setSelectedCase}
      />

      {selectedCase && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setSelectedCase(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-5"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  NDR Case
                </p>

                <h2 className="mt-1 text-xl font-semibold text-zinc-950">
                  Order #{selectedCase.orderNumber}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedCase(null)
                }
                className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm text-zinc-600"
              >
                Close
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-zinc-50 p-4 text-sm">
              <div>
                <p className="text-xs text-zinc-500">
                  Courier
                </p>
                <p className="mt-1 capitalize text-zinc-900">
                  {selectedCase.provider || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500">
                  Waybill
                </p>
                <p className="mt-1 text-zinc-900">
                  {selectedCase.waybill || "—"}
                </p>
              </div>

              <div className="col-span-2">
                <p className="text-xs text-zinc-500">
                  NDR reason
                </p>
                <p className="mt-1 text-zinc-900">
                  {selectedCase.ndrReason || "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
