"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Check,
  Download,
  Printer,
  Square,
  X,
} from "lucide-react";

import BarcodeTag from "./BarcodeTag";

export default function BarcodePrintGrid({
  items = [],
  title = "Barcode Tags",
  showToolbar = true,
  emptyMessage = "No barcode tags available.",
}) {
  const [
    selectedIds,
    setSelectedIds,
  ] = useState(() => new Set());

  const validItems = useMemo(
    () =>
      Array.isArray(items)
        ? items.filter(
            (item) => item?._id
          )
        : [],
    [items]
  );

  useEffect(() => {
    const validIds = new Set(
      validItems.map(
        (item) => item._id
      )
    );

    setSelectedIds((current) => {
      const next = new Set(
        [...current].filter((id) =>
          validIds.has(id)
        )
      );

      if (
        next.size === current.size
      ) {
        return current;
      }

      return next;
    });
  }, [validItems]);

  const selectedItems = useMemo(
    () =>
      validItems.filter((item) =>
        selectedIds.has(item._id)
      ),
    [validItems, selectedIds]
  );

  const allSelected =
    validItems.length > 0 &&
    selectedIds.size ===
      validItems.length;

  const printItems =
    selectedItems.length > 0
      ? selectedItems
      : validItems;

  const toggleItem = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(
      new Set(
        validItems.map(
          (item) => item._id
        )
      )
    );
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const toggleAll = () => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAll();
    }
  };

  const handlePrint = () => {
    if (!printItems.length) {
      return;
    }

    document.body.setAttribute(
      "data-barcode-print-mode",
      selectedItems.length > 0
        ? "selected"
        : "all"
    );

    /*
     * Let images finish decoding before
     * opening the print dialog.
     */
    const images = Array.from(
      document.querySelectorAll(
        "[data-barcode-tag] img"
      )
    );

    Promise.all(
      images.map((image) => {
        if (image.complete) {
          return image.decode?.().catch(
            () => undefined
          );
        }

        return new Promise(
          (resolve) => {
            image.addEventListener(
              "load",
              resolve,
              { once: true }
            );

            image.addEventListener(
              "error",
              resolve,
              { once: true }
            );
          }
        );
      })
    ).finally(() => {
      window.requestAnimationFrame(
        () => {
          window.requestAnimationFrame(
            () => window.print()
          );
        }
      );
    });
  };

  useEffect(() => {
    const cleanup = () => {
      document.body.removeAttribute(
        "data-barcode-print-mode"
      );
    };

    window.addEventListener(
      "afterprint",
      cleanup
    );

    return () => {
      window.removeEventListener(
        "afterprint",
        cleanup
      );

      cleanup();
    };
  }, []);

  const baseButton =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <>
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 0.25in;
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          body > * {
            visibility: hidden !important;
          }

          [data-barcode-print-section],
          [data-barcode-print-section] * {
            visibility: visible !important;
          }

          [data-barcode-print-section] {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
          }

          body[data-barcode-print-mode="selected"]
            [data-barcode-print-item]:not(
              [data-selected="true"]
            ) {
            display: none !important;
          }

          [data-barcode-print-grid] {
            display: grid !important;
            grid-template-columns: repeat(
              3,
              2.5in
            ) !important;
            justify-content: center !important;
            align-items: start !important;
            column-gap: 0.04in !important;
            row-gap: 0.12in !important;
          }

          [data-barcode-print-item] {
            width: 2.5in !important;
            min-width: 2.5in !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          [data-barcode-tag] {
            width: 2.5in !important;
            margin: 0 !important;
            padding: 0 !important;
            transform: none !important;
          }

          [data-barcode-tag] img {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>

      <section
        data-barcode-print-section
        className="w-full"
      >
        {showToolbar && (
          <header className="mb-[18px] flex items-center justify-between gap-[18px] rounded-xl border border-neutral-200 bg-white p-4 print:hidden max-[850px]:flex-col max-[850px]:items-start">
            <div>
              <h2 className="m-0 text-lg font-bold tracking-[-0.02em] text-neutral-900">
                {title}
              </h2>

              <p className="mt-1 text-[11px] text-neutral-500">
                {validItems.length} tags
                available ·{" "}
                {selectedItems.length}{" "}
                selected
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 max-[850px]:w-full max-[560px]:grid max-[560px]:grid-cols-2">
              <button
                type="button"
                onClick={toggleAll}
                disabled={
                  !validItems.length
                }
                className={`${baseButton} border-neutral-300 bg-white text-neutral-900 hover:border-black hover:bg-neutral-50`}
              >
                {allSelected ? (
                  <Check size={16} />
                ) : (
                  <Square size={16} />
                )}

                {allSelected
                  ? "Unselect all"
                  : "Select all"}
              </button>

              <button
                type="button"
                onClick={clearSelection}
                disabled={
                  !selectedIds.size
                }
                className={`${baseButton} border-neutral-300 bg-white text-neutral-900 hover:border-black hover:bg-neutral-50`}
              >
                <X size={16} />
                Clear
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={
                  !printItems.length
                }
                className={`${baseButton} border-black bg-black text-white hover:bg-neutral-800`}
              >
                <Printer size={16} />
                Print {printItems.length}
              </button>

              <button
                type="button"
                onClick={handlePrint}
                disabled={
                  !printItems.length
                }
                className={`${baseButton} border-black bg-black text-white hover:bg-neutral-800`}
              >
                <Download size={16} />
                Save PDF
              </button>
            </div>
          </header>
        )}

        {!validItems.length ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-white text-center text-neutral-500 print:hidden">
            <strong className="text-sm text-neutral-900">
              No barcode tags found
            </strong>

            <span className="max-w-[360px] text-[11px] leading-relaxed">
              {emptyMessage}
            </span>
          </div>
        ) : (
          <div
            data-barcode-print-grid
            className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] items-start gap-5 max-[560px]:grid-cols-1"
          >
            {validItems.map(
              (item) => {
                const selected =
                  selectedIds.has(
                    item._id
                  );

                return (
                  <div
                    key={item._id}
                    data-barcode-print-item
                    data-selected={
                      selected
                        ? "true"
                        : "false"
                    }
                    className="flex min-w-0 justify-center break-inside-avoid"
                  >
                    <BarcodeTag
                      item={item}
                      selectable
                      selected={
                        selected
                      }
                      showMeta
                      onSelect={
                        toggleItem
                      }
                    />
                  </div>
                );
              }
            )}
          </div>
        )}
      </section>
    </>
  );
}