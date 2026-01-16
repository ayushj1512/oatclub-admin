"use client";

import { FORMATTERS } from "./invoice.constants";

export default function InvoiceTemplate({ data }) {
  if (!data) return null;

  const {
    seller,
    billing = {},
    shipping = {},
    courier = {},
    items = [],
    totals = {},
    orderNumber,
    orderDate,
    invoiceNumber,
    payment = {},
  } = data;

  /* ================= SAFE TAX CALC ================= */
  const grandTotal =
    totals.grandTotal !== undefined
      ? Number(totals.grandTotal)
      : Number(totals.taxable || 0);

  let taxableAmount = Number(totals.taxable || 0);
  let totalTax = Number(totals.tax || 0);

  // 👉 If tax is 0, assume price is INCLUSIVE of 5% GST
  if (totalTax === 0 && grandTotal > 0) {
    taxableAmount = +(grandTotal / 1.05).toFixed(2);
    totalTax = +(grandTotal - taxableAmount).toFixed(2);
  }

  const orderDiscount = Number(totals.discount || 0);

  // ✅ Payable: prefer backend finalPayable, else grandTotal - discount
  const payable =
    totals.finalPayable !== undefined
      ? Number(totals.finalPayable)
      : grandTotal - orderDiscount;

  // ✅ for proportional discount split across items
  const baseTotal = items.reduce(
    (s, it) => s + Number(it.priceIncl || it.price || 0) * Number(it.qty || 0),
    0
  );

  const getHsn = (it) =>
    String(
      it?.hsnCode ||
        it?.productSnapshot?.hsnCode ||
        it?.product?.hsnCode ||
        it?.productId?.hsnCode ||
        "62105000"
    ).trim() || "62105000";

  return (
    <div
      id="invoice-root"
      className="p-10 text-sm bg-white text-black max-w-4xl mx-auto"
    >
      {/* ================= LETTERHEAD ================= */}
      <div className="grid grid-cols-2 gap-6 items-start">
        <div className="pr-4">
          {seller?.logo && (
            <img
              src={seller.logo}
              alt={seller.name}
              className="h-16 mb-2 object-contain"
            />
          )}

          <p className="font-semibold mb-1">Dispatch & Return Address</p>
          <p className="font-bold">{seller.name}</p>
          <p className="text-xs leading-snug">{seller.address}</p>

          <div className="mt-2 space-y-[2px] text-xs">
            <p>
              <span className="font-semibold">GSTIN:</span> {seller.gstin}
            </p>
            <p>
              <span className="font-semibold">PAN:</span> {seller.pan}
            </p>
          </div>

          <div className="mt-2 text-xs space-y-[2px]">
            <p>
              <span className="font-semibold">Email:</span> {seller.email}
            </p>
            <p>
              <span className="font-semibold">Phone:</span> {seller.phone}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className=" p-3 rounded mb-3">
            <p className="font-bold text-lg tracking-wide mb-1">TAX INVOICE</p>
            <p className="text-xs">
              Invoice No:{" "}
              <span className="font-medium">{invoiceNumber || "-"}</span>
            </p>
            <p className="text-xs">Order No: #{orderNumber}</p>
            <p className="text-xs">
              Invoice Date: {FORMATTERS.date(orderDate)}
            </p>
          </div>

          {(courier?.awb || courier?.name) && (
            <div className=" p-3 rounded text-xs">
              <p className="font-semibold mb-1">Courier Details</p>
              {courier.name && (
                <p>
                  Courier: <span className="font-medium">{courier.name}</span>
                </p>
              )}
              {courier.awb && (
                <p className="mt-[2px]">
                  AWB No: <span className="font-medium">{courier.awb}</span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-b mt-2 mb-2" />

      <div className="grid grid-cols-2 gap-8 mb-4 text-[11px] leading-snug">
        {/* BILL TO */}
        <div>
          <p className="font-semibold mb-[2px] text-xs">Bill To</p>
          <p>{billing.fullName || "-"}</p>
          <p>{billing.line1 || "-"}</p>
          {billing.line2 ? <p>{billing.line2}</p> : null}
          <p>
            {(billing.city || "-")} – {(billing.pincode || "-")}
          </p>
          {billing.state ? <p>{billing.state}</p> : null}
          {billing.phone ? <p>Phone: {billing.phone}</p> : null}
          {billing.email ? <p>Email: {billing.email}</p> : null}
        </div>

        {/* SHIP TO */}
        <div>
          <p className="font-semibold mb-[2px] text-xs">Ship To</p>

          <p>{shipping.fullName || billing.fullName || "-"}</p>
          <p>{shipping.line1 || billing.line1 || "-"}</p>
          {(shipping.line2 || billing.line2) ? (
            <p>{shipping.line2 || billing.line2}</p>
          ) : null}

          <p>
            {(shipping.city || billing.city || "-")} –{" "}
            {(shipping.pincode || billing.pincode || "-")}
          </p>

          {(shipping.state || billing.state) ? (
            <p>{shipping.state || billing.state}</p>
          ) : null}
        </div>
      </div>

      <p className="text-[11px] mb-4">
        <span className="font-semibold">Payment Mode:</span>{" "}
        {payment?.title || "-"}
        {orderDiscount > 0 && (
          <>
            {"  |  "}
            <span className="font-semibold">
              Discount {totals.couponCode ? `(${totals.couponCode})` : ""}:
            </span>{" "}
            -{FORMATTERS.currency(orderDiscount)}
          </>
        )}
      </p>

      {/* ================= ITEMS ================= */}
      <table className="w-full text-[11px] mb-5 border-collapse">
        <thead>
          <tr className="border-b text-left">
            <th className="py-1 w-[5%]">#</th>
            <th className="py-1 w-[34%]">Item</th>
            <th className="py-1 w-[10%]">Size</th>
            <th className="py-1 w-[12%]">HSN</th>
            <th className="py-1 w-[8%] text-center">Qty</th>
            <th className="py-1 w-[12%] text-right">Price</th>
            <th className="py-1 w-[9%] text-right">Disc.</th>
            <th className="py-1 w-[10%] text-right">GST</th>
            <th className="py-1 w-[15%] text-right">Total</th>
          </tr>
        </thead>

        <tbody>
          {items.map((it, idx) => {
            const size = it.size || it.selectedSize || "-";
            const unit = Number(it.priceIncl || it.price || 0);
            const qty = Number(it.qty || 0);
            const sub = +(unit * qty).toFixed(2);

            const itemDisc =
              it.discountType === "PERCENT"
                ? +(sub * (Number(it.discountPct || 0) / 100)).toFixed(2)
                : Number(it.discountAmount || it.discount || 0);

            const allocatedDisc =
              itemDisc > 0
                ? +itemDisc.toFixed(2)
                : !orderDiscount || !baseTotal
                ? 0
                : idx === items.length - 1
                ? +(
                    orderDiscount -
                    items.slice(0, idx).reduce((s, x, j) => {
                      const u = Number(x.priceIncl || x.price || 0);
                      const q = Number(x.qty || 0);
                      const ss = u * q;
                      return s + +((orderDiscount * ss) / baseTotal).toFixed(2);
                    }, 0)
                  ).toFixed(2)
                : +((orderDiscount * sub) / baseTotal).toFixed(2);

            const total = +(sub - allocatedDisc).toFixed(2);
            const hsn = getHsn(it);

            return (
              <tr key={`${it.sr ?? idx + 1}-main`} className="border-b align-top">
                <td className="py-1">{it.sr ?? idx + 1}</td>

                <td className="py-1 font-medium leading-snug">
                  {(it.name || "").length > 100
                    ? (it.name || "").slice(0, 45) + "…"
                    : it.name || "-"}
                </td>

                <td className="py-1 whitespace-nowrap">{size}</td>
                <td className="py-1 whitespace-nowrap">{hsn}</td>
                <td className="py-1 text-center">{qty}</td>

                <td className="py-1 text-right whitespace-nowrap">
                  {FORMATTERS.currency(unit)}
                </td>

                <td className="py-1 text-right whitespace-nowrap">
                  {allocatedDisc > 0
                    ? `-${FORMATTERS.currency(allocatedDisc)}`
                    : "-"}
                </td>

                <td className="py-1 text-right whitespace-nowrap">{it.gstRate}%</td>

                <td className="py-1 text-right whitespace-nowrap">
                  {FORMATTERS.currency(total)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ================= TOTALS + BARCODE ================= */}
      <div className="flex justify-between items-start mb-6 text-[11px]">
        {courier?.awb && (
          <div className="leading-tight">
            <img
              src={`https://barcode.tec-it.com/barcode.ashx?data=${courier.awb}&code=Code128&dpi=300`}
              alt="AWB Barcode"
              className="h-16 w-60 mb-1"
            />
          </div>
        )}

        <div className="w-64 leading-tight space-y-[2px]">
          <div className="flex justify-between">
            <span>Taxable</span>
            <span>{FORMATTERS.currency(taxableAmount)}</span>
          </div>

          <div className="flex justify-between">
            <span>Tax</span>
            <span>{FORMATTERS.currency(totalTax)}</span>
          </div>

          <div className="flex justify-between font-semibold border-t pt-1 mt-1">
            <span>Grand Total</span>
            <span>{FORMATTERS.currency(payable)}</span>
          </div>
        </div>
      </div>

      {/* ================= SIGNATURE ================= */}
      <div className=" flex justify-end">
        <div className="text-center text-[11px] leading-tight">
          <img
            src="https://res.cloudinary.com/djtva6hec/image/upload/v1767081191/miray/media/bjyys289bzzwlesw3938.png"
            alt="Authorized Signature"
            className="h-20 mx-auto mb-[2px] object-contain"
          />
          <p className="font-semibold">Authorized Signatory</p>
        </div>
      </div>

      {/* ================= FOOTER ================= */}
      <div className="mt-6 pt-2 border-t text-center text-[10px] leading-snug text-gray-700 print-footer">
        <p className="mt-[2px]">
          <span className="font-semibold">Registered Address:</span>{" "}
          {seller.address}
        </p>

        <p className="mt-[2px]">
          <span className="font-semibold">GSTIN:</span> {seller.gstin}
          {"  |  "}
          <span className="font-semibold">PAN:</span> {seller.pan}
        </p>
      </div>
    </div>
  );
}
