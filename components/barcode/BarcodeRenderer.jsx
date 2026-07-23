"use client";

import {
  useEffect,
  useState,
} from "react";

export default function BarcodeRenderer({
  value,
  format = "CODE128",
  moduleWidth = 2,
  barHeight = 95,
  margin = 14,
  displayValue = false,
  className = "",
  ariaLabel,
}) {
  const [barcodeUrl, setBarcodeUrl] =
    useState("");

  const barcodeValue = String(
    value || ""
  ).trim();

  useEffect(() => {
    let cancelled = false;

    const generateBarcode =
      async () => {
        setBarcodeUrl("");

        if (
          typeof window === "undefined" ||
          !barcodeValue
        ) {
          return;
        }

        try {
          const module =
            await import("jsbarcode");

          const JsBarcode =
            module.default || module;

          const canvas =
            document.createElement(
              "canvas"
            );

          JsBarcode(
            canvas,
            barcodeValue,
            {
              format,

              /*
               * Keeps bars thick enough
               * for physical scanning.
               */
              width: moduleWidth,
              height: barHeight,

              /*
               * Small but safe white quiet
               * zone on left and right.
               */
              margin: 0,
              marginLeft: margin,
              marginRight: margin,
              marginTop: 5,
              marginBottom: 5,

              displayValue,
              lineColor: "#000000",
              background: "#ffffff",

              valid: (isValid) => {
                if (!isValid) {
                  console.error(
                    `Invalid barcode: ${barcodeValue}`
                  );
                }
              },
            }
          );

          if (cancelled) {
            return;
          }

          setBarcodeUrl(
            canvas.toDataURL(
              "image/png",
              1
            )
          );
        } catch (error) {
          console.error(
            `Unable to generate barcode "${barcodeValue}":`,
            error
          );

          if (!cancelled) {
            setBarcodeUrl("");
          }
        }
      };

    generateBarcode();

    return () => {
      cancelled = true;
    };
  }, [
    barcodeValue,
    format,
    moduleWidth,
    barHeight,
    margin,
    displayValue,
  ]);

  if (!barcodeValue) {
    return (
      <div
        role="img"
        aria-label="Barcode unavailable"
        className={className}
      />
    );
  }

  if (!barcodeUrl) {
    return (
      <div
        role="status"
        aria-label="Generating barcode"
        className={[
          "flex h-[58px] w-full",
          "items-center justify-center",
          "bg-white text-[8px]",
          "text-neutral-400",
          className,
        ].join(" ")}
      >
        Generating barcode...
      </div>
    );
  }

  return (
    <img
      src={barcodeUrl}
      alt={
        ariaLabel ||
        `Barcode ${barcodeValue}`
      }
      draggable={false}
      className={[
        /*
         * Full available tag width.
         * Height remains short.
         */
        "block h-[58px] w-full",
        "object-fill",
        "bg-white",
        "print:h-[15mm]",
        "print:w-full",
        className,
      ].join(" ")}
    />
  );
}