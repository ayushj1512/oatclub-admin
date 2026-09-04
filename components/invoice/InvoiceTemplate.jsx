"use client";

import { FORMATTERS, SELLER } from "./invoice.constants";

export default function InvoiceTemplate({ data }) {
  if (!data) return null;

  const {
    seller: invoiceSeller = {},
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

  const seller = { ...SELLER, ...invoiceSeller };

  const n = (v) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };

  const round2 = (v) =>
    Math.round((n(v) + Number.EPSILON) * 100) / 100;

  const money = (v) => FORMATTERS.currency(round2(v));

  const logo =

    "https://res.cloudinary.com/znyqjoop/image/upload/v1785576332/oatclub/media/pxof76tqepbgg574zjgd.png";

  /* =========================================================
     ITEMS
  ========================================================= */

  const normalizedItems = items.map((it, index) => {
    const qty = Math.max(
      1,
      n(it.qty || it.quantity || 1)
    );

    const mrpUnit =
      n(it.compareAtPrice) ||
      n(it.originalPrice) ||
      n(it.priceIncl) ||
      n(it.price);

    const sellingBeforeCouponUnit =
      n(it.originalPrice) ||
      (n(it.originalSubtotal) && qty
        ? n(it.originalSubtotal) / qty
        : 0) ||
      n(it.priceIncl) ||
      n(it.price);

    const mrpSubtotal = round2(mrpUnit * qty);

    const markdownAmount = round2(
      Math.max(
        0,
        (mrpUnit - sellingBeforeCouponUnit) * qty
      )
    );

    const originalSubtotal =
      n(it.originalSubtotal) ||
      n(it.originalPrice) * qty ||
      n(it.subtotal) ||
      n(it.priceIncl || it.price) * qty;

    const finalSubtotal =
      n(it.subtotal) ||
      n(it.priceIncl || it.price) * qty;

    const discountAmount =
      n(it.discountAmount) ||
      Math.max(0, originalSubtotal - finalSubtotal);

    const unitPrice =
      qty > 0 ? round2(finalSubtotal / qty) : 0;

    const discountPercent =
      originalSubtotal > 0
        ? round2((discountAmount / originalSubtotal) * 100)
        : 0;

    const gstRate = n(it.taxRate || it.gstRate || 5);

    let taxableValue = n(it.taxableValue);
    let taxAmount = n(it.taxAmount);

    if (!taxableValue && finalSubtotal > 0) {
      taxableValue = round2(
        finalSubtotal / (1 + gstRate / 100)
      );
    }

    if (!taxAmount && finalSubtotal > 0) {
      taxAmount = round2(
        finalSubtotal - taxableValue
      );
    }

    const hsn = String(
      it.hsnCode ||
      it.productSnapshot?.hsnCode ||
      it.product?.hsnCode ||
      it.productId?.hsnCode ||
      "62105000"
    ).trim();

    return {
      id:
        it.productCode ||
        it.sku ||
        it.productSnapshot?.productCode ||
        it.productSnapshot?.sku ||
        String(index + 1).padStart(3, "0"),

      name:
        it.name ||
        it.title ||
        it.productSnapshot?.title ||
        "-",

      size:
        it.size ||
        it.selectedSize ||
        "-",

      hsn,

      qty,
      gstRate,
      unitPrice,
      originalSubtotal,
      finalSubtotal,
      discountAmount,
      discountPercent,
      taxableValue,
      taxAmount,
      mrpSubtotal,
      markdownAmount,
    };
  });

  /* =========================================================
     TOTALS
  ========================================================= */

  const mrpProductValue = round2(
    normalizedItems.reduce(
      (sum, it) => sum + it.mrpSubtotal,
      0
    )
  );

  const productMarkdown = round2(
    normalizedItems.reduce(
      (sum, it) => sum + it.markdownAmount,
      0
    )
  );


  const originalProductValue = round2(
    normalizedItems.reduce(
      (sum, it) => sum + it.originalSubtotal,
      0
    )
  );

  const finalProductValue = round2(
    normalizedItems.reduce(
      (sum, it) => sum + it.finalSubtotal,
      0
    )
  );

  const calculatedDiscount = round2(
    normalizedItems.reduce(
      (sum, it) => sum + it.discountAmount,
      0
    )
  );

  const discount = round2(
    n(totals.discount) || calculatedDiscount
  );

  const shippingFee = round2(
    totals.shippingFee ??
    totals.shipping ??
    0
  );

  const taxableValue = round2(
    normalizedItems.reduce(
      (sum, it) => sum + it.taxableValue,
      0
    )
  );

  const totalTax = round2(
    normalizedItems.reduce(
      (sum, it) => sum + it.taxAmount,
      0
    )
  );

  const sellerState = String(seller.state || "").trim().toLowerCase();

  const billingState = String(
    billing.state || shipping.state || ""
  ).trim().toLowerCase();

  const isInterstate =
    sellerState &&
    billingState &&
    sellerState !== billingState;

  const igst = isInterstate ? totalTax : 0;

  const cgst = !isInterstate
    ? round2(totalTax / 2)
    : 0;

  const sgst = !isInterstate
    ? round2(totalTax - cgst)
    : 0;

  /*
    IMPORTANT:
    finalProductValue already INCLUDES GST.
    GST must NOT be added again.
  */

  const beforeWalletTotal = round2(
    finalProductValue + shippingFee
  );

  const walletAmount = round2(
    n(
      totals.walletAmount ??
      payment.walletAmount ??
      0
    )
  );

  const finalPayable = round2(
    totals.finalPayable ??
    totals.grandTotal ??
    Math.max(0, beforeWalletTotal - walletAmount)
  );

  const totalQty = normalizedItems.reduce(
    (sum, it) => sum + it.qty,
    0
  );

  /* =========================================================
     GST SPLIT

     Same-state invoice:
     CGST 2.5% + SGST 2.5%

     Interstate:
     IGST 5%

     If you later pass totals.isInterstate,
     this automatically handles it.
  ========================================================= */
  /* =========================================================
     ADDRESS
  ========================================================= */

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
    fullName:
      shipping.fullName || billing.fullName,
    line1:
      shipping.line1 || billing.line1,
    line2:
      shipping.line2 || billing.line2,
    city:
      shipping.city || billing.city,
    state:
      shipping.state || billing.state,
    pincode:
      shipping.pincode || billing.pincode,
    phone:
      shipping.phone || billing.phone,
  });

  /* =========================================================
     PAYMENT LABEL
  ========================================================= */

  const paymentLabel = (() => {
    const method = String(
      payment.method ||
      payment.title ||
      ""
    ).toLowerCase();

    if (payment.isPartial || method === "partial_cod")
      return "PARTIAL COD";

    if (method === "razorpay")
      return "PREPAID";

    if (method === "cod")
      return "CASH ON DELIVERY";

    if (method === "wallet")
      return "WALLET";

    if (method === "manual_prepaid")
      return "MANUAL PREPAID";

    if (method === "exchange")
      return "EXCHANGE";

    if (method === "complimentary")
      return "COMPLIMENTARY";

    return payment.title || "-";
  })();

  const th = {
    padding: "9px 7px",
    background: "#000",
    color: "#fff",
    fontSize: "8px",
    fontWeight: 800,
    textAlign: "center",
    borderRight: "1px solid #333",
    whiteSpace: "nowrap",
  };

  const td = {
    padding: "9px 7px",
    fontSize: "8px",
    borderRight: "1px solid #e5e5e5",
    borderBottom: "1px solid #e5e5e5",
    verticalAlign: "middle",
  };

  return (
    <div
      id="invoice-root"
      style={{
        width: "210mm",
        minHeight: "297mm",
        margin: "0 auto",
        padding: "14mm",
        background: "#fff",
        color: "#111",
        boxSizing: "border-box",
        fontFamily: "Arial, sans-serif",
        fontSize: "9px",
      }}
    >
      {/* ================= HEADER ================= */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: "12px",
          borderBottom: "2px solid #000",
        }}
      >
        <img
          src={logo}
          alt={seller.name || "OATCLUB"}
          style={{
            width: "120px",
            height: "42px",
            objectFit: "contain",
            objectPosition: "left center",
          }}
        />

        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 900,
              letterSpacing: "1px",
            }}
          >
            TAX INVOICE
          </div>

          <div
            style={{
              marginTop: "4px",
              fontSize: "8px",
              color: "#666",
            }}
          >
            ORIGINAL FOR RECIPIENT
          </div>
        </div>
      </div>

      {/* ================= META ================= */}

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: "10px",
        }}
      >
        <tbody>
          <tr>
            <Meta
              label="ORDER"
              value={`#${orderNumber || "-"}`}
            />

            <Meta
              label="INVOICE"
              value={invoiceNumber || "-"}
            />

            <Meta
              label="DATE"
              value={FORMATTERS.date(orderDate)}
            />

            <Meta
              label="PAYMENT"
              value={paymentLabel}
            />
          </tr>
        </tbody>
      </table>

      {/* ================= ADDRESS ================= */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          border: "1px solid #ddd",
          marginTop: "10px",
        }}
      >
        <AddressBox
          title="SELLER"
          name={seller.name || seller.brand || "OATCLUB"}
          lines={[
            seller.address,
            seller.addressLine2,
            [
              seller.city,
              seller.state,
              seller.pincode,
            ]
              .filter(Boolean)
              .join(", "),
            seller.gstin
              ? `GSTIN: ${seller.gstin}`
              : "",
          ]}
        />

        <AddressBox
          title="BILL TO"
          name={bill.fullName}
          lines={[
            bill.line1,
            bill.line2,
            `${bill.city}, ${bill.state} - ${bill.pincode}`,
            bill.phone
              ? `Phone: ${bill.phone}`
              : "",
          ]}
        />

        <AddressBox
          title="SHIP TO"
          name={ship.fullName}
          last
          lines={[
            ship.line1,
            ship.line2,
            `${ship.city}, ${ship.state} - ${ship.pincode}`,
            ship.phone
              ? `Phone: ${ship.phone}`
              : "",
          ]}
        />
      </div>

      {/* ================= ITEMS TABLE ================= */}

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
          marginTop: "12px",
          border: "1px solid #ddd",
        }}
      >
        <thead>
          <tr>
            <th style={{ ...th, width: "8%" }}>ID</th>

            <th style={{ ...th, width: "30%", textAlign: "left" }}>
              PRODUCT NAME
            </th>

            <th style={{ ...th, width: "7%" }}>SIZE</th>

            <th style={{ ...th, width: "11%" }}>MRP</th>

            <th style={{ ...th, width: "12%" }}>HSN</th>

            <th style={{ ...th, width: "7%" }}>GST</th>

            <th style={{ ...th, width: "13%" }}>SELLING PRICE</th>

            <th style={{ ...th, width: "5%" }}>QTY</th>

            <th style={{ ...th, width: "12%", borderRight: 0 }}>
              TOTAL
            </th>
          </tr>
        </thead>

        <tbody>
          {normalizedItems.map((it, index) => (
            <tr key={index}>
              {/* ID */}
              <td
                style={{
                  ...td,
                  textAlign: "center",
                  fontWeight: 700,
                }}
              >
                {it.id}
              </td>

              {/* PRODUCT NAME */}
              <td style={td}>
                <div
                  style={{
                    fontWeight: 700,
                    lineHeight: 1.35,
                  }}
                >
                  {it.name}
                </div>
              </td>

              {/* SIZE */}
              <td style={{ ...td, textAlign: "center" }}>
                {it.size}
              </td>

              {/* MRP */}
              <td style={{ ...td, textAlign: "right" }}>
                {money(it.mrpSubtotal / it.qty)}
              </td>

              {/* HSN */}
              <td style={{ ...td, textAlign: "center" }}>
                {it.hsn}
              </td>

              {/* GST */}
              <td style={{ ...td, textAlign: "center" }}>
                {it.gstRate}%
              </td>

              {/* SELLING PRICE */}
              <td style={{ ...td, textAlign: "right" }}>
                {money(it.unitPrice)}
              </td>

              {/* QTY */}
              <td style={{ ...td, textAlign: "center" }}>
                {it.qty}
              </td>

              {/* TOTAL */}
              <td
                style={{
                  ...td,
                  textAlign: "right",
                  fontWeight: 800,
                  borderRight: 0,
                }}
              >
                {money(it.finalSubtotal)}
              </td>
            </tr>
          ))}

          {/* TOTAL ITEMS */}
          <tr>
            <td
              colSpan={7}
              style={{
                padding: "10px",
                background: "#f5f5f5",
                fontSize: "9px",
                fontWeight: 800,
                textAlign: "right",
                borderTop: "1px solid #ddd",
              }}
            >
              TOTAL ITEMS IN ORDER
            </td>

            <td
              style={{
                padding: "10px",
                background: "#f5f5f5",
                fontSize: "10px",
                fontWeight: 900,
                textAlign: "center",
                borderTop: "1px solid #ddd",
              }}
            >
              {totalQty}
            </td>

            <td
              style={{
                background: "#f5f5f5",
                borderTop: "1px solid #ddd",
              }}
            />
          </tr>
        </tbody>
      </table>

      {/* ================= SUMMARY ================= */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginTop: "14px",
          gap: "30px",
        }}
      >
        {/* AWB */}

        <div style={{ flex: 1 }}>
          {courier?.awb ? (
            <>
              <div
                style={{
                  fontSize: "7px",
                  fontWeight: 800,
                  color: "#666",
                  marginBottom: "4px",
                }}
              >
                AWB / TRACKING
              </div>

              <img
                src={`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(
                  courier.awb
                )}&code=Code128&dpi=300`}
                alt="AWB"
                style={{
                  width: "160px",
                  height: "42px",
                  objectFit: "contain",
                  objectPosition: "left center",
                }}
              />

              <div
                style={{
                  marginTop: "3px",
                  fontWeight: 700,
                }}
              >
                {courier.awb}
              </div>
            </>
          ) : null}
        </div>

        {/* TOTALS */}

        <div
          style={{
            width: "310px",
            borderTop: "1px solid #ddd",
          }}
        >

          <TotalRow
            label="Final Product Value"
            value={money(finalProductValue)}
            bold
          />

          <TotalRow
            label="Shipping / COD Charge"
            value={money(shippingFee)}
          />

          <TotalRow
            label="Taxable Value"
            value={money(taxableValue)}
          />

          {isInterstate ? (
            <TotalRow
              label="IGST (5% Included)"
              value={money(igst)}
            />
          ) : (
            <>
              <TotalRow
                label="CGST (2.5% Included)"
                value={money(cgst)}
              />

              <TotalRow
                label="SGST (2.5% Included)"
                value={money(sgst)}
              />
            </>
          )}

          {walletAmount > 0 && (
            <TotalRow
              label="Wallet Credit"
              value={`-${money(walletAmount)}`}
            />
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#000",
              color: "#fff",
              padding: "11px 10px",
              marginTop: "3px",
              fontSize: "12px",
              fontWeight: 900,
            }}
          >
            <span>FINAL PAYABLE</span>
            <span>{money(finalPayable)}</span>
          </div>
        </div>
      </div>

      {/* ================= PAYMENT INFO ================= */}

      {payment?.isPartial && (
        <div
          style={{
            width: "310px",
            marginLeft: "auto",
            marginTop: "5px",
            border: "1px solid #ddd",
            padding: "7px 10px",
            boxSizing: "border-box",
          }}
        >
          <TotalRow
            label="Paid Online"
            value={money(
              payment.paidAmount || 0
            )}
          />

          <TotalRow
            label="Balance Payable on Delivery"
            value={money(
              payment.remainingAmount || 0
            )}
            bold
          />
        </div>
      )}

      {/* ================= FOOTER ================= */}

      <div
        style={{
          marginTop: "20px",
          paddingTop: "10px",
          borderTop: "1px solid #ddd",
          display: "flex",
          justifyContent: "space-between",
          color: "#666",
          fontSize: "7px",
          lineHeight: 1.5,
        }}
      >
        <div>
          <strong style={{ color: "#111" }}>
            {seller.name ||
              seller.brand ||
              "OATCLUB"}
          </strong>

          <br />

          {seller.email || "HEY@OATCLUB.IN"}

          <br />

          {seller.website
            ? seller.website
              .replace(/^https?:\/\//, "")
              .replace(/\/$/, "")
            : "OATCLUB.IN"}
        </div>

        <div
          style={{
            textAlign: "right",
            maxWidth: "280px",
          }}
        >
          This is a computer generated tax invoice and
          does not require a physical signature.
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function Meta({ label, value }) {
  return (
    <td
      style={{
        width: "25%",
        padding: "8px 10px",
        border: "1px solid #ddd",
      }}
    >
      <div
        style={{
          fontSize: "6px",
          color: "#777",
          fontWeight: 700,
          marginBottom: "3px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: "9px",
          fontWeight: 800,
        }}
      >
        {value || "-"}
      </div>
    </td>
  );
}

function AddressBox({
  title,
  name,
  lines = [],
  last = false,
}) {
  return (
    <div
      style={{
        padding: "9px 10px",
        borderRight: last
          ? "none"
          : "1px solid #ddd",
        minHeight: "78px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          fontSize: "6px",
          color: "#777",
          fontWeight: 800,
          marginBottom: "5px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontWeight: 900,
          marginBottom: "3px",
        }}
      >
        {name}
      </div>

      {lines.filter(Boolean).map((line, i) => (
        <div
          key={i}
          style={{
            color: "#555",
            lineHeight: 1.4,
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
}

function TotalRow({
  label,
  value,
  bold = false,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "20px",
        padding: "7px 8px",
        borderBottom: "1px solid #e5e5e5",
        fontSize: "9px",
        fontWeight: bold ? 900 : 500,
      }}
    >
      <span>{label}</span>

      <span
        style={{
          flexShrink: 0,
          fontWeight: bold ? 900 : 700,
        }}
      >
        {value}
      </span>
    </div>
  );
}
