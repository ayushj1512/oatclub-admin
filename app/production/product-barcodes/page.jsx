"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Barcode, Printer, Search } from "lucide-react";
import { useAdminProductStore } from "@/store/adminProductStore";

const SIZES = ["XS", "S", "M", "L", "XL"];

function BarcodeGraphic({ value }) {
  const svgRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    import("jsbarcode")
      .then(({ default: JsBarcode }) => {
        if (!cancelled && svgRef.current) {
          JsBarcode(svgRef.current, value, {
            format: "CODE128",
            displayValue: false,
            margin: 0,
            height: 38,
            width: 1.5,
            background: "#ffffff",
            lineColor: "#000000",
          });
        }
      })
      .catch((error) => {
        console.error("Could not render barcode:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <svg
      ref={svgRef}
      aria-label={`Barcode ${value}`}
      className="barcode-svg"
    />
  );
}

export default function ProductBarcodesPage() {
  const searchProductForBarcode = useAdminProductStore(
    (state) => state.searchProductForBarcode,
  );

  const [productCode, setProductCode] = useState("");
  const [product, setProduct] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const findProduct = useCallback(
    async (event) => {
      event.preventDefault();

      const code = productCode.trim();

      if (!code) {
        setError("Enter a product code first.");
        setProduct(null);
        return;
      }

      setLoading(true);
      setError("");
      setProduct(null);
      setQuantities({});

      try {
        const result = await searchProductForBarcode(code);

        if (!result) {
          setError(`No product found for code ${code}.`);
          return;
        }

        setProduct(result);

        const initialQuantities = {};
        (result.variants || []).forEach((variant) => {
          const size = String(variant.size || "").toUpperCase();
          if (SIZES.includes(size)) initialQuantities[size] = 0;
        });

        setQuantities(initialQuantities);
      } catch (searchError) {
        setError(searchError.message || "Could not search for this product.");
      } finally {
        setLoading(false);
      }
    },
    [productCode, searchProductForBarcode],
  );

  const variantsBySize = new Map(
    (product?.variants || []).map((variant) => [
      String(variant.size || "").toUpperCase(),
      variant,
    ]),
  );

  const labels = SIZES.flatMap((size) => {
    const variant = variantsBySize.get(size);
    const quantity = Math.max(0, Math.floor(Number(quantities[size] || 0)));

    if (!variant || quantity === 0) return [];

    const barcode = variant.barcode || `${product.productCode}-${size}`;

    return Array.from({ length: quantity }, (_, index) => ({
      key: `${size}-${index}`,
      size,
      barcode,
    }));
  });

  const setSizeQuantity = (size, value) => {
    const parsed = Number(value);

    setQuantities((current) => ({
      ...current,
      [size]: Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0,
    }));
  };

  return (
    <main className="min-h-screen w-full bg-neutral-50 px-4 py-8 text-neutral-950 sm:px-8">
      <style jsx global>{`
        .barcode-print-area {
          display: none;
        }

        @page {
          size: 4in 1in;
          margin: 0;
        }

        @media print {
          html,
          body {
            width: 4in !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          body * {
            visibility: hidden !important;
          }

          #barcode-print-area,
          #barcode-print-area * {
            visibility: visible !important;
          }

          #barcode-print-area {
            display: grid !important;
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            grid-template-columns: 2in 2in !important;
            grid-auto-rows: 1in !important;
            width: 4in !important;
            margin: 0 !important;
            padding: 0 !important;
            gap: 0 !important;
          }

          .barcode-label {
            width: 2in !important;
            height: 1in !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .barcode-svg {
            width: 100% !important;
            height: 0.48in !important;
          }
        }
      `}</style>

      <section className="no-print w-full">
        <div className="mb-7 flex items-center gap-3">
          <div className="rounded-xl bg-black p-3 text-white">
            <Barcode size={22} />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Product Barcodes
            </h1>
            <p className="text-sm text-neutral-600">
              Search by product code, enter label quantities by size, then print.
            </p>
          </div>
        </div>

        <form
          onSubmit={findProduct}
          className="flex w-full flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row"
        >
          <label className="flex flex-1 items-center gap-3 rounded-xl border border-neutral-300 px-4">
            <Search size={18} className="shrink-0 text-neutral-500" />
            <input
              value={productCode}
              onChange={(event) => setProductCode(event.target.value)}
              placeholder="Enter product code, e.g. 00023"
              className="h-12 w-full bg-transparent text-sm outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="h-12 rounded-xl bg-black px-6 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Searching…" : "Search product"}
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {product && (
          <div className="mt-6 w-full rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {product.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.thumbnail}
                  alt={product.title}
                  className="h-20 w-20 rounded-xl border border-neutral-200 object-cover"
                />
              )}

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                  Product {product.productCode}
                </p>
                <h2 className="mt-1 text-lg font-bold">{product.title}</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {SIZES.map((size) => {
                const variant = variantsBySize.get(size);

                return (
                  <label
                    key={size}
                    className={`rounded-xl border p-3 ${variant
                        ? "border-neutral-200 bg-white"
                        : "border-neutral-100 bg-neutral-50 opacity-50"
                      }`}
                  >
                    <span className="flex items-center justify-between">
                      <span className="font-bold">{size}</span>
                      {variant ? (
                        <span className="text-xs text-neutral-500">
                          Stock: {Number(variant.stock || 0)}
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-400">
                          No variant
                        </span>
                      )}
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      disabled={!variant}
                      value={quantities[size] ?? 0}
                      onChange={(event) =>
                        setSizeQuantity(size, event.target.value)
                      }
                      aria-label={`Number of ${size} labels`}
                      className="mt-3 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-black disabled:bg-neutral-100"
                    />
                  </label>
                );
              })}
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-neutral-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-neutral-600">
                {labels.length} label{labels.length === 1 ? "" : "s"} ready
                {" · "}
                Two labels per row
              </p>

              <button
                type="button"
                onClick={() => window.print()}
                disabled={labels.length === 0}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Printer size={17} />
                Print / Save as PDF
              </button>
            </div>
          </div>
        )}

        <p className="mt-4 text-xs leading-5 text-neutral-500">
          Print setup: choose 4 × 1 inch paper for the two-label row, scale 100%,
          and turn off browser headers and footers. Each sticker is 2 × 1 inch.
        </p>
      </section>

      <section
        id="barcode-print-area"
        className="barcode-print-area"
        aria-label="Barcode labels"
      >
        {labels.map((label) => (
          <article
            key={label.key}
            className="barcode-label flex flex-col items-center justify-center bg-white text-center"
            style={{
              width: "2in",
              height: "1in",
              boxSizing: "border-box",
              padding: "0.08in",
              overflow: "hidden",
            }}
          >
            <BarcodeGraphic value={label.barcode} />

            <strong className="barcode-text">
              {label.barcode}
            </strong>
          </article>
        ))}
      </section>

      <style jsx global>{`
        .barcode-svg {
          display: block;
          width: 100%;
          height: 0.48in;
        }

        .barcode-text {
          display: block;
          margin-top: 0.015in;
          font-family: Arial, sans-serif;
          font-size: 10pt;
          font-weight: 800;
          line-height: 1;
          letter-spacing: 0.3px;
        }
      `}</style>
    </main>
  );
}
