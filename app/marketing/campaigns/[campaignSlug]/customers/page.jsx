"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  MousePointerClick,
  Search,
  ShoppingBag,
  ShoppingCart,
  UserRound,
  Users,
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

const countJourney = (link, event) => {
  return (link?.journey || []).filter((item) => item?.event === event).length;
};

export default function CampaignCustomersPage() {
  const params = useParams();
  const campaignSlug = params?.campaignSlug;

  const {
    selectedCampaign,
    isDetailsLoading,
    error,
    fetchCampaignDetails,
  } = useAdminMarketingCampaignStore();

  const [search, setSearch] = useState("");

  useEffect(() => {
    if (campaignSlug) fetchCampaignDetails(campaignSlug);
  }, [campaignSlug, fetchCampaignDetails]);

  const customers = useMemo(() => {
    return (selectedCampaign?.links || []).map((link) => ({
      id: link._id || link.shortCode,
      customerId: link.customerId,
      name: link.name || "Guest",
      phone: link.phone || "—",
      shortCode: link.shortCode,
      destinationUrl: link.destinationUrl || "",
      clickCount: Number(link.clickCount || 0),
      uniqueClickCount: Number(link.uniqueClickCount || 0),
      firstClickedAt: link.firstClickedAt,
      lastClickedAt: link.lastClickedAt,
      productViews: countJourney(link, "product_view"),
      collectionViews: countJourney(link, "collection_view"),
      addToCarts: countJourney(link, "add_to_cart"),
      checkoutStarted: countJourney(link, "checkout_started"),
      converted: Boolean(link.converted),
      convertedAt: link.convertedAt,
      orderNumber: link.orderNumber || "—",
      revenue: Number(link.revenue || 0),
    }));
  }, [selectedCampaign]);

  const filteredCustomers = useMemo(() => {
    const q = search.toLowerCase().trim();

    if (!q) return customers;

    return customers.filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q) ||
        item.shortCode.toLowerCase().includes(q) ||
        item.orderNumber.toLowerCase().includes(q) ||
        item.destinationUrl.toLowerCase().includes(q)
      );
    });
  }, [customers, search]);

  const summary = useMemo(() => {
    return customers.reduce(
      (acc, item) => {
        acc.targeted += 1;
        acc.clicked += item.clickCount > 0 ? 1 : 0;
        acc.converted += item.converted ? 1 : 0;
        acc.revenue += Number(item.revenue || 0);
        acc.addToCarts += Number(item.addToCarts || 0);
        acc.checkoutStarted += Number(item.checkoutStarted || 0);
        return acc;
      },
      {
        targeted: 0,
        clicked: 0,
        converted: 0,
        revenue: 0,
        addToCarts: 0,
        checkoutStarted: 0,
      }
    );
  }, [customers]);

  if (isDetailsLoading) {
    return (
      <div className="min-h-screen bg-white p-6 text-sm text-gray-500">
        Loading customers...
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
              Campaign Customers
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-black md:text-3xl">
              Customers
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
              See targeted, clicked and converted customers with journey
              activity from this campaign.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm text-gray-500">Targeted</p>
            <p className="mt-2 text-2xl font-semibold text-black">
              {summary.targeted}
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm text-gray-500">Clicked</p>
            <p className="mt-2 text-2xl font-semibold text-black">
              {summary.clicked}
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm text-gray-500">Converted</p>
            <p className="mt-2 text-2xl font-semibold text-black">
              {summary.converted}
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm text-gray-500">Revenue</p>
            <p className="mt-2 text-2xl font-semibold text-black">
              {formatMoney(summary.revenue)}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm text-gray-500">Add To Cart Events</p>
            <p className="mt-2 text-2xl font-semibold text-black">
              {summary.addToCarts}
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm text-gray-500">Checkout Started Events</p>
            <p className="mt-2 text-2xl font-semibold text-black">
              {summary.checkoutStarted}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-black">
                Customer List
              </h2>
              <p className="text-sm text-gray-500">
                Every generated link is treated as one tracked customer/contact.
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
                placeholder="Search customers..."
                className="w-full rounded-xl bg-white py-2.5 pl-9 pr-3 text-sm text-black outline-none ring-1 ring-gray-100 transition placeholder:text-gray-400 focus:ring-black/10"
              />
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Short Code</th>
                    <th className="px-4 py-3 font-medium">Clicks</th>
                    <th className="px-4 py-3 font-medium">Journey</th>
                    <th className="px-4 py-3 font-medium">First Click</th>
                    <th className="px-4 py-3 font-medium">Last Click</th>
                    <th className="px-4 py-3 font-medium">Converted</th>
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Revenue</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-10 text-center text-sm text-gray-500"
                      >
                        No customers found.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((item) => (
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

                        <td className="px-4 py-4 font-mono text-xs text-black">
                          {item.shortCode}
                        </td>

                        <td className="px-4 py-4">
                          <div className="inline-flex items-center gap-2 text-gray-600">
                            <MousePointerClick size={15} />
                            <span className="font-medium text-black">
                              {item.clickCount}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-400">
                            {item.uniqueClickCount} unique
                          </p>
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
                          {formatDateTime(item.lastClickedAt)}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              item.converted
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {item.converted ? "Converted" : "Not converted"}
                          </span>
                        </td>

                        <td className="px-4 py-4 font-medium text-black">
                          {item.orderNumber}
                        </td>

                        <td className="px-4 py-4 font-semibold text-black">
                          {formatMoney(item.revenue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-400">
            Targeted customers are generated tracking links. Clicked customers
            have clickCount greater than 0.
          </p>
        </div>
      </div>
    </div>
  );
}