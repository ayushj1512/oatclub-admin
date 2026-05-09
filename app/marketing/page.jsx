"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import {
  BarChart3,
  ChevronRight,
  Megaphone,
  MousePointerClick,
  Plus,
  Send,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { useAdminMarketingCampaignStore } from "@/store/adminMarketingCampaignStore";

const formatMoney = (value = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const slugify = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export default function MarketingOverviewPage() {
  const { campaigns, isLoading, error, fetchCampaigns } =
    useAdminMarketingCampaignStore();

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const summary = useMemo(() => {
    return campaigns.reduce(
      (acc, item) => {
        acc.sent += Number(item.totalSent || 0);
        acc.clicks += Number(item.uniqueClicks || 0);
        acc.orders += Number(item.totalOrders || 0);
        acc.revenue += Number(item.totalRevenue || 0);
        return acc;
      },
      { sent: 0, clicks: 0, orders: 0, revenue: 0 }
    );
  }, [campaigns]);

  const cards = [
    {
      title: "Campaigns",
      value: campaigns.length,
      icon: Megaphone,
    },
    {
      title: "Messages Sent",
      value: summary.sent,
      icon: Send,
    },
    {
      title: "Unique Clicks",
      value: summary.clicks,
      icon: MousePointerClick,
    },
    {
      title: "Revenue",
      value: formatMoney(summary.revenue),
      icon: TrendingUp,
    },
  ];

  const recentCampaigns = campaigns.slice(0, 5);

  return (
    <div className="min-h-screen bg-white px-4 py-5 md:px-6 lg:px-8">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400">
              Admin Marketing
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-black md:text-3xl">
              Marketing Overview
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Track campaigns, clicks, conversions and revenue.
            </p>
          </div>

          <Link
            href="/marketing/campaigns/create"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            <Plus size={16} />
            Create Campaign
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-500">{card.title}</p>
                    <p className="mt-2 text-2xl font-semibold text-black">
                      {card.value}
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black shadow-sm ring-1 ring-gray-100">
                    <Icon size={18} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-black">
                  Recent Campaigns
                </h2>
                <p className="text-sm text-gray-500">
                  Latest WhatsApp marketing campaigns.
                </p>
              </div>

              <Link
                href="/marketing/campaigns"
                className="inline-flex items-center gap-1 text-sm font-medium text-black hover:text-gray-600"
              >
                View all
                <ChevronRight size={15} />
              </Link>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
              {isLoading ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  Loading campaigns...
                </div>
              ) : error ? (
                <div className="p-8 text-center text-sm text-red-500">
                  {error}
                </div>
              ) : recentCampaigns.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  No campaigns created yet.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentCampaigns.map((campaign) => {
                    const slug = campaign.slug || slugify(campaign.name);

                    return (
                      <Link
                        key={campaign._id}
                        href={`/marketing/campaigns/${slug}`}
                        className="flex items-center justify-between gap-3 p-4 transition hover:bg-gray-50"
                      >
                        <div>
                          <p className="font-medium text-black">
                            {campaign.name}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            {campaign.channel || "whatsapp"} ·{" "}
                            {campaign.provider || "fast2sms"} ·{" "}
                            {campaign.status || "draft"}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-semibold text-black">
                            {formatMoney(campaign.totalRevenue)}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            {campaign.uniqueClicks || 0} clicks
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100 md:p-5">
            <h2 className="text-base font-semibold text-black">
              Campaign Quick Actions
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage your marketing campaign setup.
            </p>

            <div className="mt-4 grid gap-3">
              <QuickAction
                href="/marketing/campaigns"
                icon={BarChart3}
                title="All Campaigns"
                desc="View campaign list and performance."
              />

              <QuickAction
                href="/marketing/campaigns/create"
                icon={Plus}
                title="Create Campaign"
                desc="Setup a new WhatsApp campaign."
              />

              <QuickAction
                href="/marketing/ROAS"
                icon={TrendingUp}
                title="ROAS"
                desc="View marketing revenue performance."
              />

              <QuickAction
                href="/marketing/marketingSpend"
                icon={ShoppingBag}
                title="Marketing Spend"
                desc="Manage campaign spend data."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ href, icon: Icon, title, desc }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-50"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-black ring-1 ring-gray-100">
          <Icon size={18} />
        </div>

        <div>
          <p className="text-sm font-semibold text-black">{title}</p>
          <p className="mt-1 text-xs text-gray-500">{desc}</p>
        </div>
      </div>

      <ChevronRight size={16} className="text-gray-400" />
    </Link>
  );
}