// app/ndr/customer-responses/page.jsx

"use client";

import { useState } from "react";
import NdrCasesView from "@/components/ndr/NdrCasesView";

export default function CustomerResponsesPage() {
  const [selected, setSelected] =
    useState(null);

  return (
    <>
      <NdrCasesView
        title="Customer Responses"
        description="Review delivery instructions submitted by customers."
        cases={[]}
        onOpen={setSelected}
      />

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-5"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500">
                  Customer Response
                </p>

                <h2 className="mt-1 text-xl font-semibold">
                  Order #{selected.orderNumber}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm">
              <div className="rounded-xl bg-zinc-50 p-4">
                <p className="text-xs text-zinc-500">
                  Selected action
                </p>

                <p className="mt-1 font-medium capitalize">
                  {selected.customerAction
                    ?.replaceAll("_", " ") ||
                    "No response"}
                </p>
              </div>

              {selected.customerMessage && (
                <div>
                  <p className="text-xs text-zinc-500">
                    Customer message
                  </p>

                  <p className="mt-1 text-zinc-800">
                    {selected.customerMessage}
                  </p>
                </div>
              )}

              <button
                type="button"
                className="w-full rounded-xl bg-zinc-950 py-3 font-medium text-white"
              >
                Process Customer Request
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
