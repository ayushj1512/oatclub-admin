"use client";

import { RotateCcw, SlidersHorizontal } from "lucide-react";

const controlClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-black/10";

const excludeClass =
  "w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100";

const option = (value, label) => ({ value, label });


const EXCHANGE_ORDER = [
  option("", "All Orders"),
  option("true", "Exchange Orders"),
  option("false", "Non Exchange Orders"),
];

const CALL_CONFIRMATION = [
  option("", "All Orders"),
  option("true", "Call Confirmation"),
];

const READY_TO_FULFILL = [
  option("", "All Orders"),
  option("true", "Ready to Fulfill"),
];

const Field = ({ label, children, exclude = false }) => (
  <div>
    <label
      className={`mb-1 block text-xs font-semibold ${exclude ? "text-red-700" : "text-gray-700"
        }`}
    >
      {label}
    </label>

    {children}
  </div>
);

const Select = ({
  label,
  name,
  value,
  options,
  setFilter,
  exclude = false,
}) => (
  <Field label={label} exclude={exclude}>
    <select
      value={value || ""}
      onChange={(e) => setFilter(name, e.target.value)}
      className={exclude ? excludeClass : controlClass}
    >
      {options.map(({ value, label }) => (
        <option key={`${name}-${value}`} value={value}>
          {label}
        </option>
      ))}
    </select>
  </Field>
);

const Input = ({
  label,
  name,
  value,
  setFilter,
  placeholder = "",
  type = "text",
  exclude = false,
}) => (
  <Field label={label} exclude={exclude}>
    <input
      type={type}
      value={value || ""}
      placeholder={placeholder}
      onChange={(e) => setFilter(name, e.target.value)}
      className={exclude ? excludeClass : controlClass}
    />
  </Field>
);


const QUICK_DATE = [
  option("", "All Dates"),
  option("today", "Today"),
  option("yesterday", "Yesterday"),
  option("last_7_days", "Last 7 Days"),
  option("last_30_days", "Last 30 Days"),
  option("this_month", "This Month"),
];

const PAYMENT_STATUS = [
  option("", "All Payment Statuses"),
  option("pending", "Pending"),
  option("paid", "Paid"),
  option("failed", "Failed"),
  option("refund_pending", "Refund Pending"),
  option("partially_refunded", "Partially Refunded"),
  option("refunded", "Refunded"),
  option("not_applicable", "Not Applicable"),
];

const PAYMENT_METHOD = [
  option("", "All Payment Methods"),
  option("cod", "Cash on Delivery"),
  option("razorpay", "Razorpay"),
  option("wallet", "Wallet"),
  option("manual_prepaid", "Manual Prepaid"),
  option("exchange", "Exchange"),
];

const FULFILLMENT = [
  option("", "All Fulfillment Statuses"),
  option("processing", "Processing"),
  option("packed", "Packed"),
  option("picked", "Picked"),
  option("shipped", "Shipped"),
  option("out_for_delivery", "Out for Delivery"),
  option("delivered", "Delivered"),
  option("return_requested", "Return Requested"),
  option("exchange_requested", "Exchange Requested"),
  option("pickup_initiated", "Pickup Initiated"),
  option("returned", "Returned"),
  option("exchanged", "Exchanged"),
  option("rto", "RTO"),
  option("cancelled", "Cancelled"),
  option("refunded", "Refunded"),
  option("failed", "Failed"),
];

const PRIORITY = [
  option("", "All Priorities"),
  option("normal", "Normal"),
  option("medium", "Medium"),
  option("high", "High"),
];

const CONFIRMATION = [
  option("", "All Confirmation Statuses"),
  option("confirmed", "Confirmed"),
  option("not_confirmed", "Not Confirmed"),
];

const INFLUENCER = [
  option("", "All Orders"),
  option("true", "Influencer Orders"),
  option("false", "Normal Orders"),
];

const AVAILABILITY = (label) => [
  option("", `All ${label}`),
  option("true", "Available"),
  option("false", "Missing"),
];

const COUPON = [
  option("", "All Coupon Orders"),
  option("true", "Coupon Applied"),
  option("false", "No Coupon"),
];

const excludeOptions = (options, label) => [
  option("", `Exclude No ${label}`),
  ...options
    .filter((item) => item.value)
    .map((item) => option(item.value, `Exclude ${item.label}`)),
];

export default function OrderAdvancedFilters({
  filters,
  setFilter,
  onClear,
  currentPageSize = 100,
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} />

            <h2 className="font-bold text-gray-900">
              Advanced Filters
            </h2>
          </div>

          <p className="mt-1 text-xs text-gray-500">
            Use commas only where multiple text values are required.
          </p>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <RotateCcw size={15} />
          Clear
        </button>
      </div>

      {/* Include filters */}
      <section>
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">
          Include Filters
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Select
            label="Quick Date"
            name="quickDate"
            value={filters.quickDate}
            options={QUICK_DATE}
            setFilter={setFilter}
          />

          <Input
            label="Start Date"
            name="startDate"
            type="date"
            value={filters.startDate}
            setFilter={setFilter}
          />

          <Input
            label="End Date"
            name="endDate"
            type="date"
            value={filters.endDate}
            setFilter={setFilter}
          />

          <Input
            label="Min Amount"
            name="minAmount"
            type="number"
            value={filters.minAmount}
            placeholder="₹0"
            setFilter={setFilter}
          />

          <Input
            label="Max Amount"
            name="maxAmount"
            type="number"
            value={filters.maxAmount}
            placeholder="₹5000"
            setFilter={setFilter}
          />

          <Select
            label="Payment Status"
            name="paymentStatus"
            value={filters.paymentStatus}
            options={PAYMENT_STATUS}
            setFilter={setFilter}
          />

          <Select
            label="Payment Method"
            name="paymentMethod"
            value={filters.paymentMethod}
            options={PAYMENT_METHOD}
            setFilter={setFilter}
          />

          <Select
            label="Fulfillment"
            name="fulfillmentStatus"
            value={filters.fulfillmentStatus}
            options={FULFILLMENT}
            setFilter={setFilter}
          />

          <Select
            label="Priority"
            name="priority"
            value={filters.priority}
            options={PRIORITY}
            setFilter={setFilter}
          />

          <Select
            label="Confirmation"
            name="confirmFilter"
            value={filters.confirmFilter}
            options={CONFIRMATION}
            setFilter={setFilter}
          />

          <Select
            label="Influencer"
            name="isInfluencerOrder"
            value={filters.isInfluencerOrder}
            options={INFLUENCER}
            setFilter={setFilter}
          />

          <Select
            label="Exchange Order"
            name="isExchangeOrder"
            value={filters.isExchangeOrder}
            options={EXCHANGE_ORDER}
            setFilter={setFilter}
          />

          <Select
            label="Call Confirmation"
            name="callConfirmation"
            value={filters.callConfirmation}
            options={CALL_CONFIRMATION}
            setFilter={setFilter}
          />

          <Select
            label="Ready to Fulfill"
            name="readyToFulfill"
            value={filters.readyToFulfill}
            options={READY_TO_FULFILL}
            setFilter={setFilter}
          />

          <Select
            label="AWB"
            name="hasAwb"
            value={filters.hasAwb}
            options={AVAILABILITY("AWB Orders")}
            setFilter={setFilter}
          />

          <Select
            label="Tracking"
            name="hasTracking"
            value={filters.hasTracking}
            options={AVAILABILITY("Tracking Orders")}
            setFilter={setFilter}
          />

          <Select
            label="Shipping Label"
            name="hasLabel"
            value={filters.hasLabel}
            options={AVAILABILITY("Label Orders")}
            setFilter={setFilter}
          />

          <Select
            label="Coupon"
            name="hasCoupon"
            value={filters.hasCoupon}
            options={COUPON}
            setFilter={setFilter}
          />

          <Input
            label="Product Code"
            name="productCode"
            value={filters.productCode}
            placeholder="00034, 00081"
            setFilter={setFilter}
          />

          <Input
            label="SKU"
            name="sku"
            value={filters.sku}
            placeholder="OAT-00034-M"
            setFilter={setFilter}
          />

          <Input
            label="Size"
            name="size"
            value={filters.size}
            placeholder="S, M, L"
            setFilter={setFilter}
          />

          <Input
            label="Color"
            name="color"
            value={filters.color}
            placeholder="Black, White"
            setFilter={setFilter}
          />

          <Input
            label="City"
            name="city"
            value={filters.city}
            placeholder="Delhi, Gurugram"
            setFilter={setFilter}
          />

          <Input
            label="State"
            name="state"
            value={filters.state}
            placeholder="Delhi, Haryana"
            setFilter={setFilter}
          />

          <Input
            label="Pincode"
            name="pincode"
            value={filters.pincode}
            placeholder="110001, 122001"
            setFilter={setFilter}
          />

          <Input
            label="Courier"
            name="courier"
            value={filters.courier}
            placeholder="Blue Dart"
            setFilter={setFilter}
          />

          <Input
            label="Coupon Code"
            name="couponCode"
            value={filters.couponCode}
            placeholder="FIRST10"
            setFilter={setFilter}
          />

          <Input
            label="Attribution Source"
            name="attributionSource"
            value={filters.attributionSource}
            placeholder="facebook, google"
            setFilter={setFilter}
          />

          <Input
            label="Campaign"
            name="attributionCampaign"
            value={filters.attributionCampaign}
            placeholder="payday-sale"
            setFilter={setFilter}
          />
        </div>
      </section>

      {/* Exclude filters */}
      <section className="mt-6 rounded-xl border border-red-100 bg-red-50/40 p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-red-600">
          Exclude Filters
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Select
            exclude
            label="Exclude Payment Status"
            name="excludePaymentStatus"
            value={filters.excludePaymentStatus}
            options={excludeOptions(PAYMENT_STATUS, "Payment Status")}
            setFilter={setFilter}
          />

          <Select
            exclude
            label="Exclude Payment Method"
            name="excludePaymentMethod"
            value={filters.excludePaymentMethod}
            options={excludeOptions(PAYMENT_METHOD, "Payment Method")}
            setFilter={setFilter}
          />

          <Select
            exclude
            label="Exclude Fulfillment"
            name="excludeFulfillmentStatus"
            value={filters.excludeFulfillmentStatus}
            options={excludeOptions(FULFILLMENT, "Fulfillment")}
            setFilter={setFilter}
          />

          <Select
            exclude
            label="Exclude Priority"
            name="excludePriority"
            value={filters.excludePriority}
            options={excludeOptions(PRIORITY, "Priority")}
            setFilter={setFilter}
          />

          <Input
            exclude
            label="Exclude Product Code"
            name="excludeProductCode"
            value={filters.excludeProductCode}
            placeholder="00019, 00024"
            setFilter={setFilter}
          />

          <Input
            exclude
            label="Exclude SKU"
            name="excludeSku"
            value={filters.excludeSku}
            placeholder="OAT-00019-S"
            setFilter={setFilter}
          />

          <Input
            exclude
            label="Exclude Size"
            name="excludeSize"
            value={filters.excludeSize}
            placeholder="XS, XL"
            setFilter={setFilter}
          />

          <Input
            exclude
            label="Exclude Color"
            name="excludeColor"
            value={filters.excludeColor}
            placeholder="Red, Green"
            setFilter={setFilter}
          />

          <Input
            exclude
            label="Exclude City"
            name="excludeCity"
            value={filters.excludeCity}
            placeholder="Mumbai, Pune"
            setFilter={setFilter}
          />

          <Input
            exclude
            label="Exclude State"
            name="excludeState"
            value={filters.excludeState}
            placeholder="Maharashtra"
            setFilter={setFilter}
          />

          <Input
            exclude
            label="Exclude Pincode"
            name="excludePincode"
            value={filters.excludePincode}
            placeholder="110096"
            setFilter={setFilter}
          />

          <Input
            exclude
            label="Exclude Courier"
            name="excludeCourier"
            value={filters.excludeCourier}
            placeholder="Delhivery"
            setFilter={setFilter}
          />

          <Input
            exclude
            label="Exclude Coupon"
            name="excludeCouponCode"
            value={filters.excludeCouponCode}
            placeholder="INFLUENCER"
            setFilter={setFilter}
          />

          <Input
            exclude
            label="Exclude Source"
            name="excludeAttributionSource"
            value={filters.excludeAttributionSource}
            placeholder="direct, organic"
            setFilter={setFilter}
          />

          <Input
            exclude
            label="Exclude Campaign"
            name="excludeAttributionCampaign"
            value={filters.excludeAttributionCampaign}
            placeholder="test-campaign"
            setFilter={setFilter}
          />
        </div>
      </section>

      <div className="mt-4 text-right text-xs text-gray-400">
        {currentPageSize} orders per page
      </div>
    </div>
  );
}
