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

  const seller = {
    ...SELLER,
    ...invoiceSeller,
  };

  const logo =
    seller.logo ||
    "http://res.cloudinary.com/dpsvrt4sd/image/upload/v1781123546/odb5ckquouajjzfbxin0.webp";

  const n = (v) => Number(v || 0);
  const round2 = (v) => Math.round((n(v) + Number.EPSILON) * 100) / 100;

  const mrpProductValue = round2(
    items.reduce((sum, it) => {
      const qty = Math.max(1, n(it.qty || it.quantity || 1));

      const mrpUnit =
        n(it.compareAtPrice) ||
        n(it.originalPrice) ||
        n(it.priceIncl) ||
        n(it.price);

      return sum + mrpUnit * qty;
    }, 0)
  );

  const subtotalProductValue = round2(
    items.reduce((sum, it) => {
      const qty = Math.max(1, n(it.qty || it.quantity || 1));

      const beforeDiscountUnit =
        n(it.originalPrice) ||
        n(it.priceIncl) ||
        n(it.price);

      return (
        sum +
        (n(it.originalSubtotal) || beforeDiscountUnit * qty)
      );
    }, 0)
  );

  const finalProductValue = round2(
    items.reduce((sum, it) => {
      const qty = Math.max(1, n(it.qty || it.quantity || 1));

      return (
        sum +
        (n(it.subtotal) ||
          n(it.priceIncl || it.price) * qty)
      );
    }, 0)
  );

  const productMarkdown = round2(
    Math.max(
      0,
      mrpProductValue - subtotalProductValue
    )
  );

  const discountAmount = round2(
    Math.max(
      0,
      n(totals.discount) ||
      items.reduce(
        (sum, it) => sum + n(it.discountAmount),
        0
      ) ||
      subtotalProductValue - finalProductValue
    )
  );

  let taxableAmount = round2(
    items.reduce((sum, it) => sum + n(it.taxableValue), 0)
  );

  let totalTax = round2(
    items.reduce((sum, it) => sum + n(it.taxAmount), 0)
  );

  if (!taxableAmount && finalProductValue > 0) {
    taxableAmount = round2(finalProductValue / 1.05);
  }

  if (!totalTax && finalProductValue > 0) {
    totalTax = round2(finalProductValue - taxableAmount);
  }

  const shippingFee = round2(
    totals.shippingFee ?? totals.shipping ?? 0
  );

  const payable = round2(
    totals.finalPayable ??
    totals.grandTotal ??
    finalProductValue + shippingFee
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
        padding: "20px 24px",
        boxSizing: "border-box",
        fontFamily: "Lato, Arial, sans-serif",
        fontSize: "10px",
      }}
    >
      {/* =========================
        HERO
    ========================= */}
      <div
        className="bg-black text-white"
        style={{
          margin: "-20px -24px 12px",
          padding: "14px 18px 12px",
          height: "118px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            height: "62px",
          }}
        >
          <div
            style={{
              fontSize: "8px",
              fontWeight: 900,
              color: "#d4d4d8",
            }}
          >
            ORDER #{orderNumber || "-"}
          </div>

          {/* LOGO */}
          <div style={{ textAlign: "center" }}>
            <img
              src={logo}
              alt={seller.name || "OATCLUB"}
              style={{
                display: "block",
                width: "125px",
                maxWidth: "125px",
                height: "42px",
                maxHeight: "42px",
                objectFit: "contain",
                margin: "0 auto",
              }}
            />

            <div
              style={{
                marginTop: "3px",
                fontSize: "7px",
                lineHeight: 1,
                fontWeight: 900,
                letterSpacing: "2.5px",
                color: "#d4d4d8",
              }}
            >
              OWN ALL TREND
            </div>
          </div>

          <div
            style={{
              textAlign: "right",
              fontSize: "8px",
              fontWeight: 900,
              color: "#d4d4d8",
            }}
          >
            {FORMATTERS.date(orderDate)}
          </div>
        </div>

        <div
          style={{
            height: "1px",
            background: "#3f3f46",
            margin: "8px 0",
          }}
        />

        <div
          style={{
            textAlign: "center",
            fontSize: "9px",
            fontWeight: 900,
            letterSpacing: "1.8px",
            lineHeight: 1.2,
          }}
        >
          TAX INVOICE / ORDER RECEIPT
        </div>
      </div>

      {/* =========================
        META
    ========================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "7px",
          marginBottom: "10px",
        }}
      >
        {[
          {
            label: "Order",
            value: orderNumber || "-",
          },
          {
            label: "Payment",
            value:
              payment?.status ||
              payment?.title ||
              "-",
          },
          {
            label: "Method",
            value: payment?.title || "-",
          },
          {
            label: "Invoice",
            value: invoiceNumber || "-",
          },
        ].map((meta) => (
          <div
            key={meta.label}
            style={{
              border: "1px solid #e4e4e7",
              background: "#fafafa",
              padding: "7px 8px",
              minHeight: "39px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                fontSize: "7px",
                color: "#71717a",
                letterSpacing: "0.7px",
                marginBottom: "3px",
                lineHeight: 1,
              }}
            >
              {meta.label}
            </div>

            <div
              style={{
                fontSize: "9px",
                fontWeight: 900,
                lineHeight: 1.2,
              }}
            >
              {meta.value}
            </div>
          </div>
        ))}
      </div>

      {/* =========================
        SELLER DETAILS
    ========================= */}
      <div
        style={{
          border: "1px solid #e4e4e7",
          padding: "9px 11px",
          marginBottom: "10px",
        }}
      >
        <div
          style={{
            marginBottom: "5px",
            fontSize: "8px",
            fontWeight: 900,
            letterSpacing: "0.6px",
            fontFamily:
              "Nunito Sans, Arial, sans-serif",
          }}
        >
          Seller Details
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            columnGap: "28px",
            fontSize: "8px",
            lineHeight: 1.4,
            color: "#71717a",
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 2px",
                color: "#000",
                fontWeight: 900,
              }}
            >
              {seller.name ||
                seller.brand ||
                "OATCLUB"}
            </p>

            {seller.address ? (
              <p style={{ margin: 0 }}>
                {seller.address}
              </p>
            ) : null}

            {seller.addressLine2 ? (
              <p style={{ margin: 0 }}>
                {seller.addressLine2}
              </p>
            ) : null}

            <p style={{ margin: 0 }}>
              {[
                seller.city,
                seller.state,
                seller.pincode,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>

            {seller.country ? (
              <p style={{ margin: 0 }}>
                {seller.country}
              </p>
            ) : null}
          </div>

          <div>
            {seller.gstin ? (
              <p style={{ margin: 0 }}>
                <strong style={{ color: "#000" }}>
                  GSTIN:
                </strong>{" "}
                {seller.gstin}
              </p>
            ) : null}

            {seller.pan ? (
              <p style={{ margin: 0 }}>
                <strong style={{ color: "#000" }}>
                  PAN:
                </strong>{" "}
                {seller.pan}
              </p>
            ) : null}

            {seller.phone ? (
              <p style={{ margin: 0 }}>
                <strong style={{ color: "#000" }}>
                  Phone:
                </strong>{" "}
                {seller.phone}
              </p>
            ) : null}

            {seller.email ? (
              <p style={{ margin: 0 }}>
                <strong style={{ color: "#000" }}>
                  Email:
                </strong>{" "}
                {seller.email}
              </p>
            ) : null}

            {seller.website ? (
              <p style={{ margin: 0 }}>
                <strong style={{ color: "#000" }}>
                  Website:
                </strong>{" "}
                {seller.website}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* =========================
        CUSTOMER
    ========================= */}
      <div
        style={{
          border: "1px solid #e4e4e7",
          padding: "9px 11px",
          marginBottom: "10px",
        }}
      >
        <div
          style={{
            marginBottom: "5px",
            fontSize: "8px",
            fontWeight: 900,
            letterSpacing: "0.6px",
            fontFamily:
              "Nunito Sans, Arial, sans-serif",
          }}
        >
          Customer / Shipping Details
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            columnGap: "28px",
            fontSize: "8px",
            lineHeight: 1.4,
            color: "#71717a",
          }}
        >
          {/* BILLING */}
          <div>
            <p
              style={{
                margin: "0 0 2px",
                color: "#000",
                fontWeight: 900,
              }}
            >
              Bill To
            </p>

            <p style={{ margin: 0 }}>
              {bill.fullName}
            </p>

            <p style={{ margin: 0 }}>
              {bill.line1}
            </p>

            {bill.line2 ? (
              <p style={{ margin: 0 }}>
                {bill.line2}
              </p>
            ) : null}

            <p style={{ margin: 0 }}>
              {bill.city}, {bill.state} -{" "}
              {bill.pincode}
            </p>

            {bill.phone ? (
              <p style={{ margin: 0 }}>
                Phone: {bill.phone}
              </p>
            ) : null}

            {bill.email ? (
              <p style={{ margin: 0 }}>
                Email: {bill.email}
              </p>
            ) : null}
          </div>

          {/* SHIPPING */}
          <div>
            <p
              style={{
                margin: "0 0 2px",
                color: "#000",
                fontWeight: 900,
              }}
            >
              Ship To
            </p>

            <p style={{ margin: 0 }}>
              {ship.fullName}
            </p>

            <p style={{ margin: 0 }}>
              {ship.line1}
            </p>

            {ship.line2 ? (
              <p style={{ margin: 0 }}>
                {ship.line2}
              </p>
            ) : null}

            <p style={{ margin: 0 }}>
              {ship.city}, {ship.state} -{" "}
              {ship.pincode}
            </p>
          </div>
        </div>
      </div>

      {/* =========================
        ITEMS
    ========================= */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                width: "43%",
                borderTop:
                  "1px solid #e4e4e7",
                borderBottom:
                  "1px solid #e4e4e7",
                padding: "6px",
                textAlign: "left",
                fontSize: "8px",
              }}
            >
              Product
            </th>

            <th
              style={{
                width: "13%",
                borderTop:
                  "1px solid #e4e4e7",
                borderBottom:
                  "1px solid #e4e4e7",
                padding: "6px",
                textAlign: "left",
                fontSize: "8px",
              }}
            >
              HSN
            </th>

            <th
              style={{
                width: "8%",
                borderTop:
                  "1px solid #e4e4e7",
                borderBottom:
                  "1px solid #e4e4e7",
                padding: "6px",
                textAlign: "left",
                fontSize: "8px",
              }}
            >
              Size
            </th>

            <th
              style={{
                width: "7%",
                borderTop:
                  "1px solid #e4e4e7",
                borderBottom:
                  "1px solid #e4e4e7",
                padding: "6px",
                textAlign: "right",
                fontSize: "8px",
              }}
            >
              Qty
            </th>

            <th
              style={{
                width: "11%",
                borderTop:
                  "1px solid #e4e4e7",
                borderBottom:
                  "1px solid #e4e4e7",
                padding: "6px",
                textAlign: "right",
                fontSize: "8px",
              }}
            >
              Price
            </th>

            <th
              style={{
                width: "7%",
                borderTop:
                  "1px solid #e4e4e7",
                borderBottom:
                  "1px solid #e4e4e7",
                padding: "6px",
                textAlign: "right",
                fontSize: "8px",
              }}
            >
              GST
            </th>

            <th
              style={{
                width: "11%",
                borderTop:
                  "1px solid #e4e4e7",
                borderBottom:
                  "1px solid #e4e4e7",
                padding: "6px",
                textAlign: "right",
                fontSize: "8px",
              }}
            >
              Total
            </th>
          </tr>
        </thead>

        <tbody>
          {items.map((it, idx) => {
            const qty = Math.max(
              1,
              Number(
                it.qty ||
                it.quantity ||
                1
              )
            );

            const mrpUnit = Number(
              it.compareAtPrice ||
              it.originalPrice ||
              it.priceIncl ||
              it.price ||
              0
            );

            const beforeDiscountUnit =
              Number(
                it.originalPrice ||
                (it.originalSubtotal &&
                  qty
                  ? Number(
                    it.originalSubtotal
                  ) / qty
                  : 0) ||
                it.priceIncl ||
                it.price ||
                0
              );

            const unit = Number(
              it.priceIncl ||
              it.price ||
              beforeDiscountUnit
            );

            const markdownAmount =
              Math.max(
                0,
                (mrpUnit -
                  beforeDiscountUnit) *
                qty
              );

            const itemDiscount =
              Number(
                it.discountAmount ||
                Math.max(
                  0,
                  (beforeDiscountUnit -
                    unit) *
                  qty
                )
              );

            const total = Number(
              it.subtotal ||
              unit * qty
            );

            const cellStyle = {
              borderBottom:
                "1px solid #f4f4f5",
              padding: "7px 6px",
              verticalAlign: "top",
              fontSize: "9px",
              lineHeight: 1.3,
            };

            return (
              <tr key={idx}>
                <td style={cellStyle}>
                  <div
                    style={{
                      fontWeight: 900,
                      marginBottom: "2px",
                    }}
                  >
                    {it.name ||
                      it.title ||
                      "-"}
                  </div>

                  <div
                    style={{
                      fontSize: "7px",
                      color: "#71717a",
                    }}
                  >
                    {it.sku ||
                      it.productCode ||
                      ""}
                  </div>

                  <div
                    style={{
                      fontSize: "7px",
                      color: "#71717a",
                      fontWeight: 700,
                      marginTop: "2px",
                      lineHeight: 1.25,
                    }}
                  >
                    MRP{" "}
                    {FORMATTERS.currency(
                      mrpUnit
                    )}

                    {markdownAmount > 0
                      ? ` · Selling ${FORMATTERS.currency(
                        beforeDiscountUnit
                      )}`
                      : ""}

                    {itemDiscount > 0
                      ? ` · Discount -${FORMATTERS.currency(
                        itemDiscount
                      )}`
                      : ""}
                  </div>
                </td>

                <td style={cellStyle}>
                  {getHsn(it)}
                </td>

                <td style={cellStyle}>
                  {it.size ||
                    it.selectedSize ||
                    "-"}
                </td>

                <td
                  style={{
                    ...cellStyle,
                    textAlign: "right",
                  }}
                >
                  {qty}
                </td>

                <td
                  style={{
                    ...cellStyle,
                    textAlign: "right",
                  }}
                >
                  {FORMATTERS.currency(
                    unit
                  )}
                </td>

                <td
                  style={{
                    ...cellStyle,
                    textAlign: "right",
                  }}
                >
                  {it.gstRate ||
                    it.taxRate ||
                    5}
                  %
                </td>

                <td
                  style={{
                    ...cellStyle,
                    textAlign: "right",
                    fontWeight: 900,
                  }}
                >
                  {FORMATTERS.currency(
                    total
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* =========================
        SUMMARY AREA
    ========================= */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent:
            "space-between",
          gap: "20px",
          marginTop: "10px",
        }}
      >
        {/* AWB */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            paddingTop: "2px",
          }}
        >
          {courier?.awb ? (
            <>
              <img
                src={`https://barcode.tec-it.com/barcode.ashx?data=${courier.awb}&code=Code128&dpi=300`}
                alt="AWB Barcode"
                style={{
                  width: "170px",
                  maxWidth: "170px",
                  height: "45px",
                  objectFit: "contain",
                  objectPosition: "left center",
                  display: "block",
                }}
              />

              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "8px",
                  color: "#71717a",
                }}
              >
                {courier.awb}
              </p>
            </>
          ) : null}
        </div>

        {/* SUMMARY BOX */}
        <div
          style={{
            width: "270px",
            flexShrink: 0,
            border: "1px solid #e4e4e7",
            padding: "7px 11px",
            boxSizing: "border-box",
          }}
        >
          <SummaryRow
            label="MRP Value"
            value={FORMATTERS.currency(
              mrpProductValue
            )}
          />

          {productMarkdown > 0 ? (
            <SummaryRow
              label="Product Markdown"
              value={`-${FORMATTERS.currency(
                productMarkdown
              )}`}
            />
          ) : null}

          <SummaryRow
            label="Subtotal"
            value={FORMATTERS.currency(
              subtotalProductValue
            )}
          />

          {discountAmount > 0 ? (
            <SummaryRow
              label="Coupon / Order Discount"
              value={`-${FORMATTERS.currency(
                discountAmount
              )}`}
              bold
            />
          ) : null}

          <SummaryRow
            label="Final Product Value"
            value={FORMATTERS.currency(
              finalProductValue
            )}
            bold
            strongBorder
          />

          <SummaryRow
            label="Taxable Value"
            value={FORMATTERS.currency(
              taxableAmount
            )}
          />

          <SummaryRow
            label="GST (5% Included)"
            value={FORMATTERS.currency(
              totalTax
            )}
          />

          {shippingFee > 0 ? (
            <SummaryRow
              label="Shipping"
              value={FORMATTERS.currency(
                shippingFee
              )}
            />
          ) : null}

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              borderTop:
                "1px solid #a1a1aa",
              marginTop: "3px",
              paddingTop: "7px",
              fontSize: "12px",
              fontWeight: 900,
            }}
          >
            <span>Order Total</span>

            <span>
              {FORMATTERS.currency(
                payable
              )}
            </span>
          </div>

          {/* PARTIAL PAYMENT */}
          {payment?.isPartial ? (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  borderTop:
                    "1px solid #e4e4e7",
                  marginTop: "6px",
                  paddingTop: "6px",
                  fontSize: "9px",
                }}
              >
                <span>
                  Paid Online
                  {payment?.upfrontPercent >
                    0
                    ? ` (${payment.upfrontPercent}%)`
                    : ""}
                </span>

                <strong>
                  {FORMATTERS.currency(
                    payment?.paidAmount ||
                    0
                  )}
                </strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  borderTop:
                    "1px solid #e4e4e7",
                  marginTop: "5px",
                  paddingTop: "6px",
                  fontSize: "11px",
                  fontWeight: 900,
                }}
              >
                <span>
                  Remaining COD
                </span>

                <span>
                  {FORMATTERS.currency(
                    payment?.remainingAmount ||
                    0
                  )}
                </span>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* =========================
        FOOTER
    ========================= */}
      <div
        style={{
          marginTop: "12px",
          fontSize: "8px",
          lineHeight: 1.5,
          color: "#71717a",
        }}
      >
        {seller.email ||
          "HEY@OATCLUB.IN"}
        <br />

        {seller.website
          ? seller.website
            .replace(
              /^https?:\/\//,
              ""
            )
            .replace(/\/$/, "")
          : "OATCLUB.IN"}

        <br />

        {[
          seller.city,
          seller.state,
          seller.country,
        ]
          .filter(Boolean)
          .join(", ")}
      </div>
    </div>
  );
}


function SummaryRow({
  label,
  value,
  bold = false,
  strongBorder = false,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        padding: "4px 0",
        borderBottom: strongBorder
          ? "1px solid #d4d4d8"
          : "1px solid #f4f4f5",
        fontSize: "9px",
        lineHeight: 1.2,
        fontWeight: bold ? 900 : 400,
      }}
    >
      <span>{label}</span>
      <span
        style={{
          flexShrink: 0,
          fontWeight: bold ? 900 : 600,
        }}
      >
        {value}
      </span>
    </div>
  );
}
