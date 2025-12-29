"use client";

import { SELLER, FORMATTERS } from "./invoice.constants";

export default function PackingSlipTemplate({ data }) {
  if (!data) return null;

  const {
    orderNumber,
    orderDate,
    shipping = {},
    items = [],
  } = data;

  return (
    <div className="bg-white  p-10 text-sm text-black max-w-4xl mx-auto">
      {/* ================= LETTERHEAD ================= */}
      <div className="flex justify-between items-start border-b pb-6 mb-8">
        {/* LOGO + BRAND */}
        <div className="flex items-center gap-4">
          {SELLER.logo && (
            <img
              src={SELLER.logo}
              alt={SELLER.name}
              className="h-14 object-contain"
            />
          )}

          <div>
            <h1 className="text-lg font-bold tracking-wide">
              {SELLER.name}
            </h1>
            <p className="text-xs text-gray-600">
              {SELLER.website}
            </p>
          </div>
        </div>

        {/* DOCUMENT META */}
        <div className="text-right">
          <h2 className="text-xl font-bold uppercase tracking-wide">
            Packing Slip
          </h2>
          <p className="text-xs text-gray-600 mt-1">
            Order No: <span className="font-medium">#{orderNumber}</span>
          </p>
          <p className="text-xs text-gray-600">
            Order Date: {FORMATTERS.date(orderDate)}
          </p>
        </div>
      </div>

      {/* ================= ADDRESS SECTION ================= */}
      <div className="grid grid-cols-2 gap-10 mb-8">
        {/* SELLER ADDRESS */}
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
            Shipped From
          </p>

          <div className="leading-relaxed">
            <p className="font-semibold">{SELLER.name}</p>
            <p>{SELLER.address}</p>
            <p>
              {SELLER.city}, {SELLER.state} – {SELLER.pincode}
            </p>
            <p>{SELLER.country}</p>
            <p className="mt-1">
              Phone: {SELLER.phone}
            </p>
            <p>Email: {SELLER.email}</p>
          </div>
        </div>

        {/* SHIPPING ADDRESS */}
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
            Ship To
          </p>

          <div className="leading-relaxed">
            <p className="font-semibold">
              {shipping.fullName || "-"}
            </p>
            {shipping.line1 && <p>{shipping.line1}</p>}
            {shipping.line2 && <p>{shipping.line2}</p>}
            <p>
              {shipping.city || ""}{" "}
              {shipping.pincode ? `– ${shipping.pincode}` : ""}
            </p>
            {shipping.state && <p>{shipping.state}</p>}
            {shipping.phone && (
              <p className="mt-1">
                Phone: {shipping.phone}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ================= ITEMS TABLE ================= */}
      <div className="mb-10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-600">
              <th className="py-2 font-medium">Item Description</th>
              <th className="py-2 font-medium text-center w-24">
                Quantity
              </th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={2}
                  className="py-6 text-center text-gray-500"
                >
                  No items found
                </td>
              </tr>
            )}

            {items.map((item, idx) => (
              <tr
                key={idx}
                className="border-b last:border-b-0"
              >
                <td className="py-3">
                  {item.name}
                </td>
                <td className="py-3 text-center font-medium">
                  {item.quantity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ================= FOOTER ================= */}
      <div className="pt-6 border-t text-xs text-gray-500">
        <p>
          This is a system-generated packing slip and does not
          require a signature.
        </p>
      </div>
    </div>
  );
}
