"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useAdminAffiliateStore } from "@/store/adminAffiliateStore";
import {
  AffiliatePageHeader,
  EmptyState,
  SearchField,
  SectionCard,
  SelectField,
  StatusBadge,
  TableLoader,
  formatCurrency,
  formatDate,
} from "@/components/affiliate/AffiliateUI";

export default function GlobalAffiliateOrdersPage() {
  const {
    affiliates,
    loading,
    fetchAffiliates,
    fetchAffiliateOrders,
  } = useAdminAffiliateStore();

  const [affiliateId, setAffiliateId] = useState("");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAffiliates({
      page: 1,
      limit: 100,
      sortBy: "name",
      sortOrder: "asc",
    }).catch(() => {});
  }, [fetchAffiliates]);

  useEffect(() => {
    if (!affiliateId) {
      setOrders([]);
      return;
    }

    setOrdersLoading(true);

    fetchAffiliateOrders(affiliateId, {
      page: 1,
      limit: 100,
    })
      .then((data) => setOrders(data?.data || []))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [affiliateId, fetchAffiliateOrders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return orders;

    return orders.filter((order) =>
      [
        order.orderNumber,
        order.shippingAddressSnapshot?.fullName,
        order.shippingAddressSnapshot?.phone,
        order.coupon?.code,
      ].some((value) =>
        String(value || "").toLowerCase().includes(query)
      )
    );
  }, [orders, search]);

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1700px] space-y-7">
        <AffiliatePageHeader
          title="Affiliate Orders"
          description="Select an affiliate and inspect every attributed order with calculated commission."
          backHref="/affiliate"
        />

        <SectionCard>
          <div className="grid gap-3 border-b border-neutral-200 p-4 lg:grid-cols-[320px_1fr]">
            <SelectField
              value={affiliateId}
              onChange={setAffiliateId}
            >
              <option value="">Select affiliate</option>

              {affiliates.map((affiliate) => (
                <option
                  key={affiliate._id}
                  value={affiliate._id}
                >
                  {affiliate.name} · {affiliate.coupon?.code}
                </option>
              ))}
            </SelectField>

            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search order, customer, phone or coupon..."
            />
          </div>

          {loading || ordersLoading ? (
            <TableLoader />
          ) : !affiliateId ? (
            <EmptyState
              title="Select an affiliate"
              description="Choose an affiliate above to view attributed orders."
            />
          ) : filteredOrders.length === 0 ? (
            <EmptyState title="No affiliate orders found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1250px] w-full">
                <thead className="bg-neutral-50">
                  <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                    <th className="px-5 py-3">Order</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Coupon</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Commission</th>
                    <th className="px-5 py-3">Payment</th>
                    <th className="px-5 py-3">Fulfillment</th>
                    <th className="px-5 py-3">Created</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-neutral-100">
                  {filteredOrders.map((order) => (
                    <tr key={order._id}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-black">
                          {order.orderNumber}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-black">
                          {order.shippingAddressSnapshot?.fullName ||
                            "Customer"}
                        </p>

                        <p className="mt-1 text-xs text-neutral-500">
                          {order.shippingAddressSnapshot?.phone || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-black">
                        {order.coupon?.code || "—"}
                      </td>

                      <td className="px-5 py-4 font-medium text-black">
                        {formatCurrency(order.finalPayable)}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-black">
                          {formatCurrency(
                            order.affiliateEvaluation?.amount
                          )}
                        </p>

                        <div className="mt-1">
                          <StatusBadge
                            status={
                              order.affiliateEvaluation?.status
                            }
                          />
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={order.paymentStatus} />
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={order.fulfillmentStatus}
                        />
                      </td>

                      <td className="px-5 py-4 text-xs text-neutral-500">
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </main>
  );
}