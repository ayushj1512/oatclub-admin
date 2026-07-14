"use client";

import { useEffect, useRef } from "react";

export default function BarcodeRenderer({
  value,
  format = "CODE128",
  width = 1.8,
  height = 62,
  displayValue = false,
  lineColor = "#000000",
  background = "#ffffff",
  margin = 10,
  className = "",
  ariaLabel,
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const renderBarcode = async () => {
      const svg = svgRef.current;
      const barcodeValue = String(value || "").trim();

      if (!svg) return;

      svg.innerHTML = "";
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.removeAttribute("viewBox");

      if (!barcodeValue) return;

      try {
        const module = await import("jsbarcode");
        const JsBarcode = module.default;

        if (cancelled || !svgRef.current) return;

        JsBarcode(svgRef.current, barcodeValue, {
          format,
          width,
          height,
          displayValue,
          lineColor,
          background,

          margin,
          marginLeft: margin,
          marginRight: margin,
          marginTop: 3,
          marginBottom: 3,

          textAlign: "center",
          textPosition: "bottom",
          font: "monospace",
          fontSize: 11,

          valid: (isValid) => {
            if (!isValid) {
              console.error(
                `Invalid barcode value: ${barcodeValue}`
              );
            }
          },
        });

        svgRef.current?.setAttribute(
          "preserveAspectRatio",
          "xMidYMid meet"
        );
      } catch (error) {
        if (svgRef.current) {
          svgRef.current.innerHTML = "";
        }

        console.error(
          `Unable to render barcode "${barcodeValue}":`,
          error
        );
      }
    };

    renderBarcode();

    return () => {
      cancelled = true;
    };
  }, [
    value,
    format,
    width,
    height,
    displayValue,
    lineColor,
    background,
    margin,
  ]);

  const barcodeValue = String(value || "").trim();

  if (!barcodeValue) {
    return (
      <div
        className={className}
        role="img"
        aria-label="Barcode unavailable"
      />
    );
  }

  return (
    <svg
      ref={svgRef}
      className={className}
      role="img"
      aria-label={
        ariaLabel || `Barcode ${barcodeValue}`
      }
      preserveAspectRatio="xMidYMid meet"
    />
  );
}