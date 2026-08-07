"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const GUIDE = [
  {
    title: "Pending",
    text: "Stock available nahi hai. Processing order ke liye pending reservation normal hai.",
  },
  {
    title: "Reserved",
    text: "Stock order ke liye locked hai. Available stock already reduce ho chuka hai.",
  },
  {
    title: "Consumed",
    text: "Inventory final use ho chuka hai. Isko normally edit/delete nahi karna.",
  },
];

export default function InventoryReservationGuide() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open]);

  const modal =
    open && mounted
      ? createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-3 md:p-6"
          onMouseDown={() => setOpen(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-black">
                  Inventory Reservation Guide
                </h2>

                <p className="mt-0.5 text-xs text-gray-500">
                  Quick guide for warehouse and admin users.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-lg font-bold hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            {/* Scrollable content */}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              {/* Status */}
              <section>
                <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-gray-500">
                  Reservation Status
                </h3>

                <div className="grid gap-2 md:grid-cols-3">
                  {GUIDE.map((item) => (
                    <div
                      key={item.title}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                    >
                      <div className="text-sm font-black">
                        {item.title}
                      </div>

                      <p className="mt-1 text-xs leading-5 text-gray-600">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Flow */}
              <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="text-sm font-black text-blue-950">
                  Normal Order Flow
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-blue-900">
                  <strong>Processing</strong>
                  <span>→</span>
                  <span>Pending / Reserved</span>
                  <span>→</span>
                  <span>Packed</span>
                  <span>→</span>
                  <span>Consumed</span>
                </div>
              </section>

              {/* Repair */}
              <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="text-sm font-black text-amber-950">
                  Repair Pending
                </div>

                <p className="mt-1 text-xs leading-5 text-amber-900">
                  Use this to find pending reservations
                  linked to orders that are no longer
                  processing.
                </p>

                <div className="mt-3 space-y-1 rounded-lg bg-white p-3 text-xs text-gray-700">
                  <RepairRow
                    title="Pending + Processing"
                    result="Keep"
                    safe
                  />

                  <RepairRow
                    title="Pending + Packed / Shipped / Delivered"
                    result="Delete"
                  />

                  <RepairRow
                    title="Pending + Cancelled / RTO / Failed"
                    result="Delete"
                  />

                  <RepairRow
                    title="Order missing"
                    result="Delete stale reservation"
                  />
                </div>
              </section>

              {/* Actions */}
              <section>
                <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-gray-500">
                  Actions
                </h3>

                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <GuideRow
                    action="Release"
                    description="Reserved stock unlock karta hai. Cancellation/manual correction ke liye."
                  />

                  <GuideRow
                    action="Consume"
                    description="Physical stock aur reserved stock final reduce karta hai."
                  />

                  <GuideRow
                    action="Move Pending"
                    description="Reserved stock unlock karke waiting queue mein bhejta hai."
                  />

                  <GuideRow
                    action="Transfer"
                    description="Reserved inventory ko another eligible order par move karta hai."
                  />

                  <GuideRow
                    action="Delete"
                    description="Legacy ya incorrect reservation cleanup ke liye."
                  />
                </div>
              </section>

              {/* Procedure */}
              <section className="rounded-xl border border-gray-200 p-4">
                <div className="text-sm font-black">
                  Recommended Procedure
                </div>

                <ol className="mt-2 space-y-1.5 text-xs leading-5 text-gray-600">
                  <li>
                    <strong>1.</strong> Refresh reservations.
                  </li>

                  <li>
                    <strong>2.</strong> Repair Pending run karo.
                  </li>

                  <li>
                    <strong>3.</strong> Detected order
                    status verify karo.
                  </li>

                  <li>
                    <strong>4.</strong> Invalid rows
                    select karo.
                  </li>

                  <li>
                    <strong>5.</strong> Delete Selected
                    run karo.
                  </li>

                  <li>
                    <strong>6.</strong> Uske baad stock
                    add/reconcile karo.
                  </li>
                </ol>
              </section>

              {/* Warning */}
              <section className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="text-sm font-black text-red-800">
                  Important
                </div>

                <p className="mt-1 text-xs leading-5 text-red-700">
                  Reserved ya Consumed rows par action
                  carefully karo. Release / Consume
                  inventory quantities directly affect
                  kar sakte hain.
                </p>
              </section>
            </div>

            {/* Footer */}
            <div className="flex shrink-0 justify-end border-t border-gray-200 bg-gray-50 px-5 py-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-9 rounded-lg bg-gray-950 px-5 text-xs font-bold text-white hover:bg-black"
              >
                Got it
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-xs font-bold hover:bg-gray-50"
      >
        How to Use
      </button>

      {modal}
    </>
  );
}

function RepairRow({ title, result, safe = false }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <strong>{title}</strong>

      <span
        className={
          safe
            ? "font-bold text-emerald-700"
            : "font-bold text-red-600"
        }
      >
        {result}
      </span>
    </div>
  );
}

function GuideRow({ action, description }) {
  return (
    <div className="grid gap-1 border-b border-gray-100 px-3 py-2.5 last:border-b-0 sm:grid-cols-[110px_1fr]">
      <div className="text-xs font-black">
        {action}
      </div>

      <div className="text-xs leading-5 text-gray-600">
        {description}
      </div>
    </div>
  );
}
