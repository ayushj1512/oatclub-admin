"use client";

import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";

const csvToFile = (csvText, originalName = "remittance.csv") => {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  return new File([blob], originalName.replace(/\.(xlsx|xls)$/i, ".csv"), {
    type: "text/csv",
  });
};

const downloadSampleCsv = () => {
  const sample = [
    [
      "eway bill id",
      "shipping no",
      "order number",
      "delivered date",
      "order type",
      "remittance date",
      "remitted amount",
    ],
    [
      "EWB123456",
      "SHIP123456",
      "MIRAY-000001",
      "2026-03-20",
      "shipment",
      "2026-03-25",
      "1499",
    ],
    [
      "EWB123457",
      "SHIP123457",
      "MIRAY-000002",
      "2026-03-21",
      "shipment",
      "2026-03-26",
      "999",
    ],
  ]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "remittance_sample.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(url);
};

export default function RemittanceUploadCard({ onUpload, loading, busy }) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [info, setInfo] = useState("");

  const handleFile = async (file) => {
    if (!file) return;

    try {
      setInfo("");
      setFileName(file.name);

      const isExcel = /\.(xlsx|xls)$/i.test(file.name);

      if (!isExcel) {
        await onUpload(file);
        setInfo("Uploaded successfully.");
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const csv = XLSX.utils.sheet_to_csv(firstSheet);
      const csvFile = csvToFile(csv, file.name);

      await onUpload(csvFile);
      setInfo("Excel converted and uploaded successfully.");
      if (inputRef.current) inputRef.current.value = "";
    } catch (error) {
      setInfo(error?.message || "Upload failed");
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Upload Remittance</h2>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            CSV direct upload supported. Excel file bhi chalegi — first sheet ko CSV
            mein convert karke upload kar denge.
          </p>
        </div>

        <button
          type="button"
          onClick={downloadSampleCsv}
          className="shrink-0 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Sample CSV
        </button>
      </div>

      <div className="mt-3 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => handleFile(e.target.files?.[0])}
          disabled={loading || busy}
          className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded-xl file:border-0 file:bg-black file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
        />

        {fileName ? (
          <p className="mt-3 text-xs text-zinc-500">Selected: {fileName}</p>
        ) : null}

        {info ? <p className="mt-2 text-xs text-zinc-600">{info}</p> : null}
      </div>

      <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
        <p className="text-xs font-medium text-zinc-700">Expected columns</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          eway bill id, shipping no, order number, delivered date, order type,
          remittance date, remitted amount
        </p>
      </div>
    </div>
  );
}