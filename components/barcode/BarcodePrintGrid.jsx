"use client";

import { useMemo, useState } from "react";
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
  const [selectedIds, setSelectedIds] = useState(
    () => new Set()
  );

  const validItems = useMemo(
    () =>
      Array.isArray(items)
        ? items.filter((item) => item?._id)
        : [],
    [items]
  );

  const selectedItems = useMemo(
    () =>
      validItems.filter((item) =>
        selectedIds.has(item._id)
      ),
    [validItems, selectedIds]
  );

  const allSelected =
    validItems.length > 0 &&
    selectedIds.size === validItems.length;

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
      new Set(validItems.map((item) => item._id))
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
    if (!printItems.length) return;

    window.print();
  };

  return (
    <section className="barcode-print-section">
      {showToolbar && (
        <header className="barcode-print-toolbar no-print">
          <div className="barcode-print-heading">
            <h2>{title}</h2>

            <p>
              {validItems.length} tags available ·{" "}
              {selectedItems.length} selected
            </p>
          </div>

          <div className="barcode-print-actions">
            <button
              type="button"
              className="barcode-toolbar-button"
              onClick={toggleAll}
              disabled={!validItems.length}
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
              className="barcode-toolbar-button"
              onClick={clearSelection}
              disabled={!selectedIds.size}
            >
              <X size={16} />
              Clear
            </button>

            <button
              type="button"
              className="barcode-toolbar-button barcode-toolbar-primary"
              onClick={handlePrint}
              disabled={!printItems.length}
            >
              <Printer size={16} />
              Print {printItems.length}
            </button>

            <button
              type="button"
              className="barcode-toolbar-button barcode-toolbar-primary"
              onClick={handlePrint}
              disabled={!printItems.length}
            >
              <Download size={16} />
              Save PDF
            </button>
          </div>
        </header>
      )}

      {!validItems.length ? (
        <div className="barcode-empty-state no-print">
          <strong>No barcode tags found</strong>
          <span>{emptyMessage}</span>
        </div>
      ) : (
        <div className="barcode-print-grid">
          {validItems.map((item) => {
            const selected = selectedIds.has(
              item._id
            );

            const hiddenDuringPrint =
              selectedIds.size > 0 && !selected;

            return (
              <div
                key={item._id}
                className={
                  hiddenDuringPrint
                    ? "barcode-print-hidden"
                    : ""
                }
              >
                <BarcodeTag
                  item={item}
                  selectable
                  selected={selected}
                  showMeta
                  onSelect={toggleItem}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}