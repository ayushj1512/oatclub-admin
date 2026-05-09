"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  IndianRupee,
  MousePointerClick,
  Search,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { useAdminMarketingCampaignStore } from "@/store/adminMarketingCampaignStore";

const formatMoney = (value = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDateTime = (value) => {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getRate = (part, total) => {
  const p = Number(part || 0);
  const t = Number(total || 0);
  if (!t) return 0;
  return Number(((p / t) * 100).toFixed(1));
};

const countJourney = (link, event) => {
  return (link?.journey || []).filter((item) => item?.event === event).length;
};

export default function CampaignConversionsPage() {
  const params = useParams();
  const campaignSlug = params?.campaignSlug;

  const {
    selectedCampaign,
    stats,
    isDetailsLoading,
    error,
    fetchCampaignDetails,
  } = useAdminMarketingCampaignStore();

  const [search, setSearch] = useState("");

  useEffect(() => {
    if (campaignSlug) fetchCampaignDetails(campaignSlug);
  }, [campaignSlug, fetchCampaignDetails]);

  const links = selectedCampaign?.links || [];

  const conversions = useMemo(() => {
    return links
      .filter((link) => link.converted)
      .map((link) => ({
        id: link._id || link.shortCode,
        name: link.name || "Guest",
        phone: link.phone || "—",
        shortCode: link.shortCode,
        destinationUrl: link.destinationUrl || "",
        orderId: link.orderId,
        orderNumber: link.orderNumber || "—",
        revenue: Number(link.revenue || 0),
        convertedAt: link.convertedAt,
        firstClickedAt: link.firstClickedAt,
        lastClickedAt: link.lastClickedAt,
        clickCount: Number(link.clickCount || 0),
        productViews: countJourney(link, "product_view"),
        collectionViews: countJourney(link, "collection_view"),
        addToCarts: countJourney(link, "add_to_cart"),
        checkoutStarted: countJourney(link, "checkout_started"),
      }))
      .sort((a, b) => new Date(b.convertedAt) - new Date(a.convertedAt));
  }, [links]);

  const filteredConversions = useMemo(() => {
    const q = search.toLowerCase().trim();

    if (!q) return conversions;

    return conversions.filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q) ||
        item.shortCode.toLowerCase().includes(q) ||
        item.orderNumber.toLowerCase().includes(q) ||
        item.destinationUrl.toLowerCase().includes(q)
      );
    });
  }, [conversions, search]);

  const summary = useMemo(() => {
    const totalRevenue = conversions.reduce(
      (sum, item) => sum + Number(item.revenue || 0),
      0
    );

    const avgOrderValue = conversions.length
      ? totalRevenue / conversions.length
      : 0;

    const uniqueClicks =
      stats?.uniqueClicks ||
      links.filter((link) => Number(link?.uniqueClickCount || 0) > 0).length;

    return {
      conversions: conversions.length,
      totalRevenue,
      avgOrderValue,
      uniqueClicks,
      conversionRate:
        stats?.conversionRate ?? getRate(conversions.length, uniqueClicks),
    };
  }, [conversions, links, stats]);

  if (isDetailsLoading) {
    return (
      <div className="min-h-screen bg-white p-6 text-sm text-gray-500">
        Loading conversions...
      </div>
    );
  }

  if (error && !selectedCampaign) {
    return (
      <div className="min-h-screen bg-white p-6">
        <p className="text-sm text-red-500">{error}</p>

        <Link
          href="/marketing/campaigns"
          className="mt-4 inline-flex text-sm font-medium text-black"
        >
          Back to campaigns
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-5 md:px-6 lg:px-8">
      <div className="flex flex-col gap-5">
        <div className="rounded-3xl bg-gray-50 p-5 shadow-sm ring-1 ring-gray-100">
          <Link
            href={`/marketing/campaigns/${campaignSlug}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-black"
          >
            <ArrowLeft size={16} />
            Back to campaign
          </Link>

          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-gray-400">
              Campaign Conversions
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-black md:text-3xl">
              Orders & Revenue
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
              Customers who clicked campaign links, moved through the journey
              and placed orders.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">Conversions</p>
                <p className="mt-2 text-2xl font-semibold text-black">
                  {summary.conversions}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
                <ShoppingBag size={18} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">Revenue</p>
                <p className="mt-2 text-2xl font-semibold text-black">
                  {formatMoney(summary.totalRevenue)}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
                <IndianRupee size={18} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">Conversion Rate</p>
                <p className="mt-2 text-2xl font-semibold text-black">
                  {summary.conversionRate}%
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
                <TrendingUp size={18} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm text-gray-500">Avg Order Value</p>
            <p className="mt-2 text-2xl font-semibold text-black">
              {formatMoney(summary.avgOrderValue)}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm text-gray-500">Unique Clicked Links</p>
            <p className="mt-2 text-2xl font-semibold text-black">
              {summary.uniqueClicks}
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm text-gray-500">Total Clicks Before Orders</p>
            <p className="mt-2 text-2xl font-semibold text-black">
              {conversions.reduce(
                (sum, item) => sum + Number(item.clickCount || 0),
                0
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm text-gray-500">Checkout Starts</p>
            <p className="mt-2 text-2xl font-semibold text-black">
              {conversions.reduce(
                (sum, item) => sum + Number(item.checkoutStarted || 0),
                0
              )}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-black">
                Conversion Orders
              </h2>
              <p className="text-sm text-gray-500">
                Orders mapped with campaign tracking links and journey events.
              </p>
            </div>

            <div className="relative w-full md:max-w-sm">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search orders..."
                className="w-full rounded-xl bg-white py-2.5 pl-9 pr-3 text-sm text-black outline-none ring-1 ring-gray-100 transition placeholder:text-gray-400 focus:ring-black/10"
              />
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Revenue</th>
                    <th className="px-4 py-3 font-medium">
                      Clicks Before Order
                    </th>
                    <th className="px-4 py-3 font-medium">Journey</th>
                    <th className="px-4 py-3 font-medium">First Click</th>
                    <th className="px-4 py-3 font-medium">Converted At</th>
                    <th className="px-4 py-3 font-medium">Short Code</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredConversions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-10 text-center text-sm text-gray-500"
                      >
                        No conversions found.
                      </td>
                    </tr>
                  ) : (
                    filteredConversions.map((item) => (
                      <tr
                        key={item.id}
                        className="text-sm transition hover:bg-gray-50/70"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <UserRound size={16} className="text-gray-400" />

                            <div>
                              <p className="font-medium text-black">
                                {item.name}
                              </p>
                              <p className="mt-1 text-xs text-gray-400">
                                {item.phone}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-medium text-black">
                            {item.orderNumber}
                          </p>
                          <p className="mt-1 max-w-[180px] truncate text-xs text-gray-400">
                            {item.orderId || "No order id"}
                          </p>
                        </td>

                        <td className="px-4 py-4 font-semibold text-black">
                          {formatMoney(item.revenue)}
                        </td>

                        <td className="px-4 py-4">
                          <div className="inline-flex items-center gap-2 text-gray-600">
                            <MousePointerClick size={15} />
                            {item.clickCount}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">
                              PV {item.productViews}
                            </span>
                            <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">
                              CV {item.collectionViews}
                            </span>
                            <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">
                              ATC {item.addToCarts}
                            </span>
                            <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">
                              CO {item.checkoutStarted}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-gray-500">
                          {formatDateTime(item.firstClickedAt)}
                        </td>

                        <td className="px-4 py-4 text-gray-500">
                          {formatDateTime(item.convertedAt)}
                        </td>

                        <td className="px-4 py-4 font-mono text-xs text-black">
                          {item.shortCode}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-400">
            Conversion tab uses links where converted=true. Order create API
            should call markConversion after successful order placement.
          </p>
        </div>
      </div>
    </div>
  );
}