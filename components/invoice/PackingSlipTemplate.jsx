"use client";

import { SELLER, FORMATTERS } from "./invoice.constants";
import Barcode from "react-barcode";

export default function PackingSlipTemplate({ data }) {
  if (!data) return null;

  const { orderNumber, orderDate, items = [], courier = {} } = data;

  const totalQty = items.reduce((sum, it) => sum + Number(it.qty || 0), 0);

  return (
    <div
      id="packing-root"
      className="bg-white text-black border mx-auto"
      style={{
        width: "210mm",           // ✅ A4 width
        height: "148.5mm",        // ✅ EXACT HALF A4 HEIGHT
        padding: "10mm",          // ✅ slightly smaller padding
        fontSize: "11px",
        boxSizing: "border-box",  // ✅ prevents padding from increasing height
        overflow: "hidden",       // ✅ ensures no spill
      }}
    >
      {/* ================= HEADER ================= */}
      <div className="flex justify-between mb-3">
        {/* LEFT */}
        <div className="flex gap-3 items-center">
          {SELLER.logo && (
            <img
              src={SELLER.logo}
              alt={SELLER.name}
              className="h-10 object-contain"
            />
          )}

          <div>
            <p className="font-bold text-sm">{SELLER.name}</p>
            <p className="text-xs">
              Courier: <b>{courier.name || "-"}</b>
            </p>
            <p className="text-xs">
              AWB: <b>{courier.awb || "-"}</b>
            </p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="text-right">
          <p className="font-bold uppercase">Packing Manifest</p>
          <p className="text-xs text-gray-600">
            Order No: <b>#{orderNumber}</b>
          </p>
          <p className="text-xs text-gray-600">
            Generated: {FORMATTERS.date(orderDate)}
          </p>
        </div>
      </div>

      {/* ================= ITEMS TABLE ================= */}
      <table className="w-full border text-xs mt-2">
        <thead>
          <tr className="border bg-gray-100">
            <th className="border px-2 py-1 w-[45px]">S.No</th>
            <th className="border px-2 py-1 w-[110px]">Order No</th>
            <th className="border px-2 py-1 w-[130px]">AWB No</th>
            <th className="border px-2 py-1">Contents</th>
            <th className="border px-2 py-1 w-[200px]">Barcode</th>
          </tr>
        </thead>

        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-gray-500">
                No items found
              </td>
            </tr>
          )}

          {items.map((item, idx) => (
            <tr key={idx} className="border">
              <td className="border px-2 py-1 text-center">{idx + 1}</td>

              <td className="border px-2 py-1 text-center">{orderNumber}</td>

              <td className="border px-2 py-1 text-center font-medium">
                {courier.awb || "—"}
              </td>

              <td className="border px-2 py-1">
                <p className="font-medium">{item.name}</p>
                <p className="text-[11px] text-gray-600">
                  Qty: {item.qty}
                </p>
              </td>

              {/* ✅ REAL BARCODE */}
              <td className="border px-2 py-2 text-center align-middle">
                {courier.awb ? (
                  <Barcode
                    value={String(courier.awb)}
                    height={50}
                    width={2}
                    margin={2}
                    displayValue={true}
                    fontSize={11}
                  />
                ) : (
                  <span className="text-[10px] text-gray-400">No AWB</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ================= PICKUP SECTION ================= */}
      <div className="mt-4 border-t pt-3 text-xs">
        <p className="font-semibold mb-2 uppercase">
          To Be Filled By Courier Executive
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p>Pickup Time: __________________</p>
            <p>FE Name: __________________</p>
            <p>FE Signature: ________________</p>
            <p>FE Phone: __________________</p>
          </div>

          <div className="space-y-1">
            <p>
              Total Items Picked: <b>{totalQty}</b>
            </p>
            <p>
              Seller Name: <b>{SELLER.name}</b>
            </p>
            <p>Seller Signature: _____________</p>
          </div>
        </div>
      </div>

      {/* ================= FOOTER ================= */}
      <div className="mt-4 text-center text-[10px] text-gray-600 leading-relaxed space-y-1">
        <p>{SELLER.address}</p>

        <p>
          Phone: <span className="font-medium">{SELLER.phone}</span> | Email:{" "}
          <span className="font-medium">{SELLER.email}</span>
        </p>
        <p className="mt-1">This is a system generated document</p>
      </div>
    </div>
  );
}
