"use client";

import BarcodeRenderer from "./BarcodeRenderer";
import "./barcodeTag.css";

const LOGO =
  "https://res.cloudinary.com/dpsvrt4sd/image/upload/v1780338447/qavpt44lsxsy3wrvuwi8.png";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const normalizeBarcodeValue = (value = "") =>
  String(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");

export default function BarcodeTag({
  item,
  selectable = false,
  selected = false,
  compact = false,
  showMeta = false,
  onSelect,
}) {
  if (!item) return null;

  const rawScanValue =
    item.scanCode ||
    (item.serialCode
      ? `OC${item.serialCode}`
      : "") ||
    item.barcode;

  const scanValue =
    normalizeBarcodeValue(rawScanValue);

  return (
    <article
      className={`barcode-tag-wrapper ${
        selected ? "selected" : ""
      }`}
      data-barcode-tag
      data-barcode-id={item._id || ""}
    >
      {selectable && (
        <button
          type="button"
          className={`barcode-select ${
            selected ? "active" : ""
          }`}
          onClick={() =>
            onSelect?.(item._id)
          }
          aria-label={
            selected
              ? "Remove barcode from selection"
              : "Select barcode"
          }
        >
          {selected ? "✓" : ""}
        </button>
      )}

      <div
        className={`barcode-tag ${
          compact ? "compact" : ""
        }`}
      >
        <div
          className="minimal-lines-bg"
          aria-hidden="true"
        />

        <div className="barcode-inner">
          <div
            className="tag-hole"
            aria-hidden="true"
          />

          <div className="logo-area">
            <img
              src={LOGO}
              alt="OATCLUB"
            />
          </div>

          <div className="exchange">
            <strong>
              Easy Exchange &amp; Return
            </strong>

            <span>
              https://www.oatclub.in/exchange-and-return
            </span>

            <p>
              DO NOT REMOVE TAG FOR EXCHANGE
              &amp; RETURN
            </p>
          </div>

          <div className="barcode-area">
            {scanValue ? (
              <BarcodeRenderer
                value={scanValue}
                className="barcode-svg"
                format="CODE128"
                width={1.8}
                height={62}
                margin={10}
                displayValue={false}
                lineColor="#000000"
                background="#ffffff"
              />
            ) : (
              <span className="barcode-error">
                Barcode unavailable
              </span>
            )}
          </div>

          <div className="scan-code">
            {scanValue}
          </div>

          <div className="product-id">
            {item.productId}
          </div>

          <div className="serial">
            SERIAL{" "}
            {item.serialCode || "—"}
          </div>

          <div className="details">
            <div>
              <span>Size</span>
              <strong>
                {item.size || "—"}
              </strong>
            </div>

            <div>
              <span>Net Qty</span>
              <strong>1 N</strong>
            </div>

            <div>
              <span>MRP</span>
              <strong>
                {money(item.price)}
              </strong>
            </div>
          </div>

          <div className="tax">
            Inclusive of all applicable
            taxes
          </div>

          <div className="tag-footer">
            <strong>
              Manufactured &amp; Marketed
              by OATCLUB
            </strong>

            <span>Made in India</span>

            <span>
              support@oatclub.com
            </span>
          </div>

          {showMeta && item.barcode && (
            <div className="tag-reference">
              Reference: {item.barcode}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}