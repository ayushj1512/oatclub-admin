"use client";

import { Search } from "lucide-react";

export default function BlueDartBookingFilters({
  search = "",
  onSearchChange,
  paymentFilter = "all",
  onPaymentFilterChange,
  bookingFilter = "all",
  onBookingFilterChange,
  page = 1,
  totalPages = 1,
}) {
  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search by order number, customer, phone, city, pincode..."
            className="w-full rounded-2xl border border-neutral-300 bg-white py-3 pl-11 pr-4 text-sm text-black outline-none transition focus:border-black"
          />
        </div>

        <select
          value={paymentFilter}
          onChange={(e) => onPaymentFilterChange?.(e.target.value)}
          className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-black"
        >
          <option value="all">All Payments</option>
          <option value="cod">COD</option>
          <option value="prepaid">Prepaid</option>
        </select>

        <select
          value={bookingFilter}
          onChange={(e) => onBookingFilterChange?.(e.target.value)}
          className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-black outline-none transition focus:border-black"
        >
          <option value="all">All Booking States</option>
          <option value="not_booked">Not Booked</option>
          <option value="order_pushed">Pushed</option>
          <option value="booked">Booked</option>
        </select>

        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
          Page <span className="font-semibold text-black">{page}</span> of{" "}
          <span className="font-semibold text-black">{totalPages}</span>
        </div>
      </div>
    </section>
  );
}
