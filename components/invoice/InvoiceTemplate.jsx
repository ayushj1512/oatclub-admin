"use client";

import { FORMATTERS } from "./invoice.constants";

export default function InvoiceTemplate({ data }) {
  if (!data) return null;

  const {
    seller = {},
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

  const logo =
    seller.logo ||
    "http://res.cloudinary.com/dpsvrt4sd/image/upload/v1781123546/odb5ckquouajjzfbxin0.webp";

  const grandTotal =
    totals.grandTotal !== undefined
      ? Number(totals.grandTotal)
      : Number(totals.taxable || 0);

  let taxableAmount = Number(totals.taxable || 0);
  let totalTax = Number(totals.tax || 0);

  if (totalTax === 0 && grandTotal > 0) {
    taxableAmount = +(grandTotal / 1.05).toFixed(2);
    totalTax = +(grandTotal - taxableAmount).toFixed(2);
  }

  const orderDiscount = Number(totals.discount || 0);

  const payable =
    totals.finalPayable !== undefined
      ? Number(totals.finalPayable)
      : grandTotal - orderDiscount;

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

  const getAddress = (addr = {}) => ({
    fullName: addr.fullName || "-",
    line1: addr.line1 || "-",
    line2: addr.line2 || "",
    city: addr.city || "-",
    state: addr.state || "",
    pincode: addr.pincode || "-",
    phone: addr.phone || "",
    email: addr.email || "",
  });

  const bill = getAddress(billing);
  const ship = getAddress({
    ...billing,
    ...shipping,
    fullName: shipping.fullName || billing.fullName,
    line1: shipping.line1 || billing.line1,
    line2: shipping.line2 || billing.line2,
    city: shipping.city || billing.city,
    state: shipping.state || billing.state,
    pincode: shipping.pincode || billing.pincode,
  });

  return (
    <div
      id="invoice-root"
      className="mx-auto bg-white text-black uppercase"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: 26,
        fontFamily: "Lato, Arial, sans-serif",
      }}
    >
      {/* HERO */}
      <div
        className="bg-black text-white"
        style={{ margin: "-26px -26px 22px", padding: 20 }}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <div className="text-[10px] font-black text-zinc-300">
            ORDER #{orderNumber || "-"}
          </div>

          <div className="text-center">
            <img
              src={logo}
              alt={seller.name || "OATCLUB"}
              className="mx-auto block w-[150px] object-contain"
            />
            <div className="mt-[5px] text-[9px] font-black tracking-[3px] text-zinc-300">
              OWN ALL TREND
            </div>
          </div>

          <div className="text-right text-[10px] font-black text-zinc-300">
            {FORMATTERS.date(orderDate)}
          </div>
        </div>

        <div className="my-[18px] h-px bg-zinc-700" />

        <div className="text-center text-[11px] font-black tracking-[2px]">
          TAX INVOICE / ORDER RECEIPT
        </div>
      </div>

      {/* META */}
      <div className="grid grid-cols-4 gap-[10px] mt-4">
        <div className="border border-zinc-200 bg-zinc-50 p-[10px]">
          <span className="block text-[9px] tracking-[0.8px] text-zinc-500 mb-1">
            Order
          </span>
          <span className="text-[11px] font-black">{orderNumber || "-"}</span>
        </div>

        <div className="border border-zinc-200 bg-zinc-50 p-[10px]">
          <span className="block text-[9px] tracking-[0.8px] text-zinc-500 mb-1">
            Payment
          </span>
          <span className="text-[11px] font-black">
            {payment?.status || payment?.title || "-"}
          </span>
        </div>

        <div className="border border-zinc-200 bg-zinc-50 p-[10px]">
          <span className="block text-[9px] tracking-[0.8px] text-zinc-500 mb-1">
            Method
          </span>
          <span className="text-[11px] font-black">
            {payment?.title || "-"}
          </span>
        </div>

        <div className="border border-zinc-200 bg-zinc-50 p-[10px]">
          <span className="block text-[9px] tracking-[0.8px] text-zinc-500 mb-1">
            Invoice
          </span>
          <span className="text-[11px] font-black">
            {invoiceNumber || "-"}
          </span>
        </div>
      </div>

      {/* CUSTOMER */}
      <div className="border border-zinc-200 p-[14px] my-[18px]">
        <div
          className="mb-2 text-[10px] font-black tracking-[0.6px]"
          style={{ fontFamily: "Nunito Sans, Arial, sans-serif" }}
        >
          Customer / Shipping Details
        </div>

        <div className="grid grid-cols-2 gap-8 text-[10px] leading-[1.7] text-zinc-500">
          <div>
            <p className="font-black text-black mb-1">Bill To</p>
            <p>{bill.fullName}</p>
            <p>{bill.line1}</p>
            {bill.line2 ? <p>{bill.line2}</p> : null}
            <p>
              {bill.city}, {bill.state} - {bill.pincode}
            </p>
            {bill.phone ? <p>Phone : {bill.phone}</p> : null}
            {bill.email ? <p>Email : {bill.email}</p> : null}
          </div>

          <div>
            <p className="font-black text-black mb-1">Ship To</p>
            <p>{ship.fullName}</p>
            <p>{ship.line1}</p>
            {ship.line2 ? <p>{ship.line2}</p> : null}
            <p>
              {ship.city}, {ship.state} - {ship.pincode}
            </p>
          </div>
        </div>
      </div>

      {/* ITEMS */}
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border-y border-zinc-200 px-[6px] py-[10px] text-left text-[10px]">
              Product
            </th>
            <th className="border-y border-zinc-200 px-[6px] py-[10px] text-left text-[10px]">
              HSN
            </th>
            <th className="border-y border-zinc-200 px-[6px] py-[10px] text-left text-[10px]">
              Size
            </th>
            <th className="border-y border-zinc-200 px-[6px] py-[10px] text-right text-[10px]">
              Qty
            </th>
            <th className="border-y border-zinc-200 px-[6px] py-[10px] text-right text-[10px]">
              Price
            </th>
            <th className="border-y border-zinc-200 px-[6px] py-[10px] text-right text-[10px]">
              Disc.
            </th>
            <th className="border-y border-zinc-200 px-[6px] py-[10px] text-right text-[10px]">
              GST
            </th>
            <th className="border-y border-zinc-200 px-[6px] py-[10px] text-right text-[10px]">
              Total
            </th>
          </tr>
        </thead>

        <tbody>
          {items.map((it, idx) => {
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
                    items.slice(0, idx).reduce((sum, x) => {
                      const u = Number(x.priceIncl || x.price || 0);
                      const q = Number(x.qty || 0);
                      return sum + +((orderDiscount * (u * q)) / baseTotal).toFixed(2);
                    }, 0)
                  ).toFixed(2)
                : +((orderDiscount * sub) / baseTotal).toFixed(2);

            const total = +(sub - allocatedDisc).toFixed(2);

            return (
              <tr key={idx}>
                <td className="border-b border-zinc-100 px-[6px] py-3 align-top text-[11px]">
                  <div className="font-black mb-[3px]">
                    {it.name || it.title || "-"}
                  </div>
                  <div className="text-[9px] text-zinc-500">
                    {it.sku || it.productCode || ""}
                  </div>
                </td>

                <td className="border-b border-zinc-100 px-[6px] py-3 align-top text-[11px]">
                  {getHsn(it)}
                </td>

                <td className="border-b border-zinc-100 px-[6px] py-3 align-top text-[11px]">
                  {it.size || it.selectedSize || "-"}
                </td>

                <td className="border-b border-zinc-100 px-[6px] py-3 align-top text-right text-[11px]">
                  {qty}
                </td>

                <td className="border-b border-zinc-100 px-[6px] py-3 align-top text-right text-[11px]">
                  {FORMATTERS.currency(unit)}
                </td>

                <td className="border-b border-zinc-100 px-[6px] py-3 align-top text-right text-[11px]">
                  {allocatedDisc > 0
                    ? `-${FORMATTERS.currency(allocatedDisc)}`
                    : "-"}
                </td>

                <td className="border-b border-zinc-100 px-[6px] py-3 align-top text-right text-[11px]">
                  {it.gstRate || 5}%
                </td>

                <td className="border-b border-zinc-100 px-[6px] py-3 align-top text-right text-[11px] font-black">
                  {FORMATTERS.currency(total)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* SUMMARY */}
      <div className="mt-4 flex justify-between items-start">
        <div>
          {courier?.awb ? (
            <>
              <img
                src={`https://barcode.tec-it.com/barcode.ashx?data=${courier.awb}&code=Code128&dpi=300`}
                alt="AWB Barcode"
                className="h-16 w-60 object-contain"
              />
              <p className="text-[10px] text-zinc-500">{courier.awb}</p>
            </>
          ) : null}
        </div>

        <div className="ml-auto w-[285px] border border-zinc-200 px-[14px] py-3">
          <div className="flex justify-between border-b border-zinc-100 py-[7px] text-[11px]">
            <span>Taxable</span>
            <span>{FORMATTERS.currency(taxableAmount)}</span>
          </div>

          {orderDiscount > 0 ? (
            <div className="flex justify-between border-b border-zinc-100 py-[7px] text-[11px]">
              <span>
                Discount {totals.couponCode ? totals.couponCode : ""}
              </span>
              <span>-{FORMATTERS.currency(orderDiscount)}</span>
            </div>
          ) : null}

          <div className="flex justify-between border-b border-zinc-100 py-[7px] text-[11px]">
            <span>Tax</span>
            <span>{FORMATTERS.currency(totalTax)}</span>
          </div>

          <div className="mt-1 flex justify-between border-t border-zinc-200 pt-[11px] text-[15px] font-black">
            <span>Final Payable</span>
            <span>{FORMATTERS.currency(payable)}</span>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-[30px] border-t border-zinc-200 pt-[18px]">
        <div className="grid grid-cols-3 gap-[18px]">
          <div>
            <div className="mb-2 text-[10px] font-black tracking-[0.6px]">
              Payment
            </div>
            <p className="text-[10px] leading-[1.7] text-zinc-500">
              Method : {payment?.title || "-"}
              <br />
              Status : {payment?.status || "-"}
              <br />
              Currency : INR
            </p>
          </div>

          <div>
            <div className="mb-2 text-[10px] font-black tracking-[0.6px]">
              Shipment
            </div>
            <p className="text-[10px] leading-[1.7] text-zinc-500">
              Courier : {courier?.name || "-"}
              <br />
              AWB : {courier?.awb || "-"}
              <br />
              Provider : {courier?.provider || "SHIPROCKET"}
            </p>
          </div>

          <div>
            <div className="mb-2 text-[10px] font-black tracking-[0.6px]">
              Support
            </div>
            <p className="text-[10px] leading-[1.7] text-zinc-500">
              {seller.email || "SUPPORT@OATCLUB.IN"}
              <br />
              OATCLUB.IN
              <br />
              {seller.location || "DELHI NCR, INDIA"}
            </p>
          </div>
        </div>

        <div className="mt-[22px] text-center text-[10px] leading-[1.8] tracking-[0.4px] text-zinc-500">
          THANK YOU FOR SHOPPING WITH OATCLUB
          <br />
          OWN ALL TRENDS
        </div>
      </div>
    </div>
  );
}