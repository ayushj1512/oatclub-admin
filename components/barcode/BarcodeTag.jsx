"use client";

import BarcodeRenderer from "./BarcodeRenderer";

const LOGO =
  "https://res.cloudinary.com/dpsvrt4sd/image/upload/v1780338447/qavpt44lsxsy3wrvuwi8.png";

const normalizeText = (value = "") =>
  String(value ?? "").trim();

const normalizeUppercase = (
  value = ""
) =>
  normalizeText(value).toUpperCase();

const normalizeBarcodeValue = (
  value = ""
) =>
  normalizeUppercase(value).replace(
    /[^A-Z0-9-]/g,
    ""
  );

const money = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "—";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }
  ).format(amount);
};

export default function BarcodeTag({
  item,
  selectable = false,
  selected = false,
  compact = false,
  showMeta = false,
  onSelect,
}) {
  if (!item) return null;

  const productCode =
    normalizeUppercase(
      item.productCode
    ) || "—";

  const size =
    normalizeUppercase(item.size) ||
    "—";

  const uniqueId =
    normalizeText(
      item.uniqueId ||
        item.sequence ||
        item.pieceNumber
    ) || "—";

  /*
   * Compact permanent scan identity.
   *
   * Example:
   * 00001-XS-1
   */
  const scanValue =
    normalizeBarcodeValue(
      [
        productCode !== "—"
          ? productCode
          : "",
        size !== "—" ? size : "",
        uniqueId !== "—"
          ? uniqueId
          : "",
      ]
        .filter(Boolean)
        .join("-")
    );

  const mrp =
    item.mrpSnapshot ??
    item.priceSnapshot ??
    item.mrp ??
    item.price ??
    null;

  return (
    <article
      data-barcode-tag
      data-barcode-id={
        item._id || ""
      }
      className={[
        "relative w-fit",
        "print:m-0 print:w-[2.5in]",
        selected
          ? "ring-2 ring-black"
          : "",
      ].join(" ")}
    >
      {selectable && (
        <button
          type="button"
          onClick={() =>
            onSelect?.(item._id)
          }
          aria-label={
            selected
              ? "Remove barcode from selection"
              : "Select barcode"
          }
          className={[
            "absolute right-2 top-2 z-20",
            "grid size-7 place-items-center",
            "rounded-full border text-xs font-bold",
            "print:hidden",
            selected
              ? "border-black bg-black text-white"
              : "border-neutral-300 bg-white text-transparent",
          ].join(" ")}
        >
          {selected ? "✓" : ""}
        </button>
      )}

      <div
        className={[
          "relative box-border",
          "h-[4in] w-[2.5in]",
          "overflow-hidden",
          "border border-neutral-300",
          "bg-white text-black",
          "font-sans",
          "print:h-[4in]",
          "print:w-[2.5in]",
          compact ? "" : "",
        ].join(" ")}
      >
        <div
          className={[
            /*
             * Very small side padding so
             * barcode gets maximum width.
             */
            "box-border flex h-full w-full",
            "flex-col items-stretch",
            "bg-white px-[6px]",
            "pb-[8px] pt-[8px]",
            "print:px-[1.5mm]",
            "print:pb-[2mm]",
            "print:pt-[2mm]",
          ].join(" ")}
        >
          {/* Tag hole */}
          <div
            aria-hidden="true"
            className={[
              "mx-auto mb-[5px]",
              "size-[10px] shrink-0",
              "rounded-full",
              "border border-neutral-400",
              "bg-white",
            ].join(" ")}
          />

          {/* Header */}
          <header className="flex shrink-0 flex-col items-center text-center">
            <img
              src={LOGO}
              alt="OATCLUB"
              className={[
                "block h-[25px]",
                "w-[112px]",
                "max-w-[65%]",
                "object-contain",
              ].join(" ")}
            />

            <span className="mt-[1px] text-[5px] font-medium tracking-[0.2em] text-neutral-500">
              OWN ALL TRENDS
            </span>
          </header>

          {/* Product information */}
          <section className="mt-[6px] flex shrink-0 flex-col items-center text-center">
            <span className="text-[5px] font-medium tracking-[0.14em] text-neutral-500">
              PRODUCT CODE
            </span>

            <strong className="mt-[1px] max-w-full truncate text-[15px] font-bold leading-none tracking-[0.08em] text-black">
              {productCode}
            </strong>

            <span className="mt-[2px] text-[6px] font-medium uppercase tracking-[0.1em] text-neutral-500">
              PIECE ID {uniqueId}
            </span>
          </section>

          {/* Full-width barcode */}
          <section
            className={[
              "mt-[6px] flex",
              "h-[62px] w-full",
              "shrink-0 items-center",
              "justify-center",
              "overflow-hidden bg-white",
              "print:h-[16mm]",
              "print:w-full",
              "print:bg-white",
            ].join(" ")}
          >
            {scanValue ? (
              <BarcodeRenderer
                value={scanValue}
                format="CODE128"
                moduleWidth={2}
                barHeight={95}
                margin={14}
                displayValue={false}
                ariaLabel={`Barcode ${scanValue}`}
                className="w-full"
              />
            ) : (
              <span className="text-[8px] font-medium text-neutral-500">
                Barcode unavailable
              </span>
            )}
          </section>

          <div
            className={[
              "mt-[1px] w-full",
              "shrink-0 whitespace-nowrap",
              "text-center font-mono",
              "text-[7px] font-bold",
              "leading-none tracking-[0.03em]",
              "text-black",
              "print:text-[7pt]",
            ].join(" ")}
          >
            {scanValue || "—"}
          </div>

          {/* Details */}
          <section
            className={[
              "mt-[7px] grid shrink-0",
              "grid-cols-[1fr_1fr_1.35fr]",
              "border-y border-neutral-300",
            ].join(" ")}
          >
            <div
              className={[
                "flex min-h-[40px]",
                "min-w-0 flex-col",
                "items-center justify-center",
                "border-r border-neutral-200",
                "px-1 py-[5px] text-center",
              ].join(" ")}
            >
              <span className="text-[5px] font-medium tracking-[0.08em] text-neutral-500">
                SIZE
              </span>

              <strong className="mt-[2px] max-w-full truncate text-[10px] font-bold text-black">
                {size}
              </strong>
            </div>

            <div
              className={[
                "flex min-h-[40px]",
                "min-w-0 flex-col",
                "items-center justify-center",
                "border-r border-neutral-200",
                "px-1 py-[5px] text-center",
              ].join(" ")}
            >
              <span className="text-[5px] font-medium tracking-[0.08em] text-neutral-500">
                NET QTY
              </span>

              <strong className="mt-[2px] text-[10px] font-bold text-black">
                1 N
              </strong>
            </div>

            <div
              className={[
                "flex min-h-[40px]",
                "min-w-0 flex-col",
                "items-center justify-center",
                "px-1 py-[5px]",
                "text-center",
              ].join(" ")}
            >
              <span className="text-[5px] font-medium tracking-[0.08em] text-neutral-500">
                MRP
              </span>

              <strong className="mt-[2px] max-w-full truncate text-[11px] font-bold text-black">
                {money(mrp)}
              </strong>
            </div>
          </section>

          <p className="mt-[3px] shrink-0 text-center text-[5px] leading-none text-neutral-500">
            Inclusive of all applicable
            taxes
          </p>

          {/* Exchange */}
          <section className="mt-[6px] flex shrink-0 flex-col items-center text-center">
            <strong className="text-[6px] font-bold tracking-[0.04em] text-neutral-900">
              EASY EXCHANGE &amp; RETURN
            </strong>

            <span className="mt-[1px] text-[5px] leading-tight text-neutral-600">
              oatclub.in/exchange-and-return
            </span>

            <p className="mt-[2px] max-w-[94%] text-[5px] font-normal leading-tight text-neutral-500">
              Do not remove this tag for
              exchange or return.
            </p>
          </section>

          {/* Footer */}
          <footer
            className={[
              "mt-auto flex shrink-0",
              "flex-col items-center",
              "border-t border-neutral-200",
              "pt-[5px] text-center",
              "text-[5px] leading-[1.3]",
              "text-neutral-500",
            ].join(" ")}
          >
            <strong className="text-[5px] font-semibold text-neutral-600">
              Manufactured &amp; Marketed
              by OATCLUB
            </strong>

            <span>
             hey@oatclub.in · Made
              in India
            </span>
          </footer>

          {showMeta && (
            <div className="hidden">
              {scanValue}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}