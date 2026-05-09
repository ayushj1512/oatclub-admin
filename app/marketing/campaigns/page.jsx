"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  ExternalLink,
  Link2,
  MousePointerClick,
  Plus,
  Search,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";
import { useAdminMarketingCampaignStore } from "@/store/adminMarketingCampaignStore";

const formatMoney = (value = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const slugify = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const getCampaignKey = (campaign) =>
  campaign?.slug || slugify(campaign?.name || "");

const getRate = (part, total) => {
  const p = Number(part || 0);
  const t = Number(total || 0);
  if (!t) return 0;
  return Number(((p / t) * 100).toFixed(1));
};

export default function MarketingCampaignsPage() {
  const { campaigns, isLoading, error, fetchCampaigns } =
    useAdminMarketingCampaignStore();

  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const summary = useMemo(() => {
    return campaigns.reduce(
      (acc, item) => {
        const links = Number(item.totalLinks || item.links?.length || 0);
        const clicks = Number(item.uniqueClicks || 0);
        const totalClicks = Number(item.totalClicks || 0);
        const orders = Number(item.totalOrders || 0);
        const revenue = Number(item.totalRevenue || 0);

        acc.campaigns += 1;
        acc.links += links;
        acc.clicks += clicks;
        acc.totalClicks += totalClicks;
        acc.orders += orders;
        acc.revenue += revenue;

        return acc;
      },
      {
        campaigns: 0,
        links: 0,
        clicks: 0,
        totalClicks: 0,
        orders: 0,
        revenue: 0,
      }
    );
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    const q = search.toLowerCase().trim();

    if (!q) return campaigns;

    return campaigns.filter((campaign) => {
      return (
        campaign?.name?.toLowerCase().includes(q) ||
        campaign?.description?.toLowerCase().includes(q) ||
        campaign?.status?.toLowerCase().includes(q)
      );
    });
  }, [campaigns, search]);

  const cards = [
    {
      title: "Campaigns",
      value: summary.campaigns,
      desc: "Total marketing campaigns",
      icon: BarChart3,
      href: "/marketing/campaigns",
    },
    {
      title: "Tracking Links",
      value: summary.links,
      desc: "Generated campaign links",
      icon: Link2,
      href: "/marketing/campaigns/create",
    },
    {
      title: "Unique Clicks",
      value: summary.clicks,
      desc: `${summary.totalClicks} total clicks`,
      icon: MousePointerClick,
      href: "#campaigns-table",
    },
    {
      title: "Orders",
      value: summary.orders,
      desc: formatMoney(summary.revenue),
      icon: ShoppingBag,
      href: "#campaigns-table",
    },
  ];

  const quickLinks = [
    {
      label: "Create Campaign",
      href: "/marketing/campaigns/create",
      icon: Plus,
    },
    {
      label: "Reports",
      href: "/reports",
      icon: Activity,
    },
  ];

  return (
    <div className="min-h-screen bg-white px-4 py-5 md:px-6 lg:px-8">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 rounded-3xl bg-gray-50 p-5 shadow-sm ring-1 ring-gray-100 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-gray-400">
              Marketing Dashboard
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-black md:text-3xl">
              Campaigns
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
              Create tracking links, monitor clicks, follow customer journey and
              connect campaign revenue with orders.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {quickLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    item.href.includes("create")
                      ? "inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                      : "inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-black shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-50"
                  }
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.title}
                href={card.href}
                className="group rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-500">{card.title}</p>
                    <p className="mt-2 text-2xl font-semibold text-black">
                      {card.value}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">{card.desc}</p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black shadow-sm ring-1 ring-gray-100 transition group-hover:bg-black group-hover:text-white">
                    <Icon size={18} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center gap-2 text-sm font-medium text-black">
              <TrendingUp size={16} />
              Overall Conversion
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-black">
              {getRate(summary.orders, summary.clicks)}%
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Orders from unique campaign clicks
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center gap-2 text-sm font-medium text-black">
              <MousePointerClick size={16} />
              Link CTR
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-black">
              {getRate(summary.clicks, summary.links)}%
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Unique clicks against generated links
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center gap-2 text-sm font-medium text-black">
              <ArrowUpRight size={16} />
              Revenue
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-black">
              {formatMoney(summary.revenue)}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Campaign attributed revenue
            </p>
          </div>
        </div>

        <div
          id="campaigns-table"
          className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-black">
                All Campaigns
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Open campaign dashboard to view links, clicks, customers and
                conversions.
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
                placeholder="Search campaign..."
                className="w-full rounded-xl bg-white py-2.5 pl-9 pr-3 text-sm text-black outline-none ring-1 ring-gray-100 transition placeholder:text-gray-400 focus:ring-black/10"
              />
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Campaign</th>
                    <th className="px-4 py-3 font-medium">Links</th>
                    <th className="px-4 py-3 font-medium">Clicks</th>
                    <th className="px-4 py-3 font-medium">Orders</th>
                    <th className="px-4 py-3 font-medium">Revenue</th>
                    <th className="px-4 py-3 font-medium">Conv.</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-12 text-center text-sm text-gray-500"
                      >
                        Loading campaigns...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-12 text-center text-sm text-red-500"
                      >
                        {error}
                      </td>
                    </tr>
                  ) : filteredCampaigns.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-12 text-center text-sm text-gray-500"
                      >
                        No campaigns found.
                      </td>
                    </tr>
                  ) : (
                    filteredCampaigns.map((campaign) => {
                      const campaignKey = getCampaignKey(campaign);
                      const links = Number(
                        campaign.totalLinks || campaign.links?.length || 0
                      );
                      const clicks = Number(campaign.uniqueClicks || 0);
                      const orders = Number(campaign.totalOrders || 0);

                      return (
                        <tr
                          key={campaign._id}
                          className="text-sm transition hover:bg-gray-50/70"
                        >
                          <td className="px-4 py-4">
                            <div>
                              <p className="font-medium text-black">
                                {campaign.name}
                              </p>
                              <p className="mt-1 line-clamp-1 text-xs text-gray-400">
                                {campaign.description ||
                                  "Campaign tracking dashboard"}
                              </p>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-gray-600">{links}</td>

                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-black">
                                {clicks}
                              </span>
                              <span className="text-xs text-gray-400">
                                {campaign.totalClicks || 0} total
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-4 text-gray-600">
                            {orders}
                          </td>

                          <td className="px-4 py-4 font-medium text-black">
                            {formatMoney(campaign.totalRevenue)}
                          </td>

                          <td className="px-4 py-4 text-gray-600">
                            {getRate(orders, clicks)}%
                          </td>

                          <td className="px-4 py-4">
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-700">
                              {campaign.status || "draft"}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-gray-500">
                            {formatDate(campaign.createdAt)}
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/marketing/campaigns/${campaignKey}`}
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-black transition hover:bg-gray-100"
                              >
                                Dashboard
                                <ChevronRight size={14} />
                              </Link>

                              <Link
                                href={`/marketing/campaigns/${campaignKey}/links`}
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100 hover:text-black"
                              >
                                Links
                                <ExternalLink size={13} />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <Link
              href="/marketing/campaigns/create"
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-50"
            >
              <Plus size={17} />
              <p className="mt-3 text-sm font-medium text-black">
                Create new campaign
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Generate fresh campaign with tracking links.
              </p>
            </Link>

            <Link
              href="/reports"
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-50"
            >
              <BarChart3 size={17} />
              <p className="mt-3 text-sm font-medium text-black">
                Marketing reports
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Compare campaign performance with sales.
              </p>
            </Link>

            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <Users size={17} />
              <p className="mt-3 text-sm font-medium text-black">
                Customer journey
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Open any campaign to inspect per-link journey.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <Activity size={17} />
              <p className="mt-3 text-sm font-medium text-black">
                Funnel tracking
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Landing, product view, cart, checkout and order.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}