"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  ExternalLink,
  Link2,
  MousePointerClick,
  Settings,
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

const getRate = (part, total) => {
  const p = Number(part || 0);
  const t = Number(total || 0);
  if (!t) return 0;
  return Number(((p / t) * 100).toFixed(1));
};

export default function CampaignDetailsPage() {
  const params = useParams();
  const campaignSlug = params?.campaignSlug;

  const {
    selectedCampaign,
    stats,
    isDetailsLoading,
    error,
    fetchCampaignDetails,
  } = useAdminMarketingCampaignStore();

  useEffect(() => {
    if (campaignSlug) fetchCampaignDetails(campaignSlug);
  }, [campaignSlug, fetchCampaignDetails]);

  const campaignKey = selectedCampaign?.slug || campaignSlug;
  const links = selectedCampaign?.links || [];

  const journeySummary = useMemo(() => {
    return links.reduce(
      (acc, link) => {
        (link?.journey || []).forEach((item) => {
          if (item.event === "landing") acc.landing += 1;
          if (item.event === "product_view") acc.productView += 1;
          if (item.event === "collection_view") acc.collectionView += 1;
          if (item.event === "add_to_cart") acc.addToCart += 1;
          if (item.event === "checkout_started") acc.checkoutStarted += 1;
          if (item.event === "order_created") acc.orderCreated += 1;
        });
        return acc;
      },
      {
        landing: 0,
        productView: 0,
        collectionView: 0,
        addToCart: 0,
        checkoutStarted: 0,
        orderCreated: 0,
      }
    );
  }, [links]);

  const totalLinks =
    stats?.totalLinks || selectedCampaign?.totalLinks || links.length || 0;
  const uniqueClicks =
    stats?.uniqueClicks || selectedCampaign?.uniqueClicks || 0;
  const totalClicks = stats?.totalClicks || selectedCampaign?.totalClicks || 0;
  const totalOrders = stats?.totalOrders || selectedCampaign?.totalOrders || 0;
  const totalRevenue =
    stats?.totalRevenue || selectedCampaign?.totalRevenue || 0;

  const cards = [
    {
      title: "Revenue",
      value: formatMoney(totalRevenue),
      desc: "Attributed campaign revenue",
      icon: TrendingUp,
    },
    {
      title: "Orders",
      value: totalOrders,
      desc: `${getRate(totalOrders, uniqueClicks)}% conversion rate`,
      icon: ShoppingBag,
    },
    {
      title: "Unique Clicks",
      value: uniqueClicks,
      desc: `${totalClicks} total clicks`,
      icon: MousePointerClick,
    },
    {
      title: "Tracking Links",
      value: totalLinks,
      desc: `${getRate(uniqueClicks, totalLinks)}% link CTR`,
      icon: Link2,
    },
  ];

  if (isDetailsLoading) {
    return (
      <div className="min-h-screen bg-white p-6 text-sm text-gray-500">
        Loading campaign...
      </div>
    );
  }

  if (error || !selectedCampaign) {
    return (
      <div className="min-h-screen bg-white p-6">
        <p className="text-sm text-red-500">{error || "Campaign not found"}</p>
        <Link
          href="/marketing/campaigns"
          className="mt-4 inline-flex text-sm font-medium text-black"
        >
          Back to campaigns
        </Link>
      </div>
    );
  }

  const quickLinks = [
    {
      title: "Tracking Links",
      desc: "Create and manage campaign tracking links.",
      href: `/marketing/campaigns/${campaignKey}/links`,
      icon: Link2,
    },
    {
      title: "Clicks",
      desc: "View click logs, devices and referrers.",
      href: `/marketing/campaigns/${campaignKey}/clicks`,
      icon: MousePointerClick,
    },
    {
      title: "Conversions",
      desc: "Orders and revenue from this campaign.",
      href: `/marketing/campaigns/${campaignKey}/conversions`,
      icon: ShoppingBag,
    },
    {
      title: "Customers",
      desc: "Customers who clicked or converted.",
      href: `/marketing/campaigns/${campaignKey}/customers`,
      icon: Users,
    },
    {
      title: "Settings",
      desc: "Update campaign status and details.",
      href: `/marketing/campaigns/${campaignKey}/settings`,
      icon: Settings,
    },
  ];

  const funnelItems = [
    { label: "Landing", value: journeySummary.landing },
    { label: "Product Views", value: journeySummary.productView },
    { label: "Collection Views", value: journeySummary.collectionView },
    { label: "Add to Cart", value: journeySummary.addToCart },
    { label: "Checkout Started", value: journeySummary.checkoutStarted },
    { label: "Orders Created", value: journeySummary.orderCreated },
  ];

  return (
    <div className="min-h-screen bg-white px-4 py-5 md:px-6 lg:px-8">
      <div className="flex flex-col gap-5">
        <div className="rounded-3xl bg-gray-50 p-5 shadow-sm ring-1 ring-gray-100">
          <Link
            href="/marketing/campaigns"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-black"
          >
            <ArrowLeft size={16} />
            Back to campaigns
          </Link>

          <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-gray-400">
                Campaign Dashboard
              </p>

              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-black md:text-3xl">
                {selectedCampaign.name}
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                {selectedCampaign.description ||
                  "Track links, clicks, customer journey, orders and revenue."}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium capitalize text-gray-700 ring-1 ring-gray-100">
                  {selectedCampaign.status || "draft"}
                </span>

                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-500 ring-1 ring-gray-100">
                  Created {formatDate(selectedCampaign.createdAt)}
                </span>

                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-500 ring-1 ring-gray-100">
                  {campaignKey}
                </span>
              </div>
            </div>

            <Link
              href={`/marketing/campaigns/${campaignKey}/links`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              <Link2 size={16} />
              Manage Links
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.title}
                className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-500">{card.title}</p>
                    <p className="mt-2 text-2xl font-semibold text-black">
                      {card.value}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">{card.desc}</p>
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
                  Journey Funnel
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Customer events tracked from campaign links.
                </p>
              </div>

              <Activity size={18} className="text-gray-400" />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {funnelItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
                >
                  <p className="text-sm text-gray-500">{item.label}</p>
                  <p className="mt-2 text-xl font-semibold text-black">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100 md:p-5">
            <div className="flex items-center gap-2">
              <BarChart3 size={17} />
              <h2 className="text-base font-semibold text-black">
                Performance Ratios
              </h2>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <p className="text-sm text-gray-500">Link CTR</p>
                <p className="mt-2 text-2xl font-semibold text-black">
                  {stats?.ctr ?? getRate(uniqueClicks, totalLinks)}%
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <p className="text-sm text-gray-500">Conversion Rate</p>
                <p className="mt-2 text-2xl font-semibold text-black">
                  {stats?.conversionRate ?? getRate(totalOrders, uniqueClicks)}%
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <p className="text-sm text-gray-500">Revenue / Click</p>
                <p className="mt-2 text-2xl font-semibold text-black">
                  {formatMoney(stats?.revenuePerClick || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {quickLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.title}
                href={item.href}
                className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black shadow-sm ring-1 ring-gray-100">
                  <Icon size={18} />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-black">
                  {item.title}
                </h3>

                <p className="mt-1 text-sm leading-5 text-gray-500">
                  {item.desc}
                </p>

                <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-gray-500">
                  Open
                  <ExternalLink size={12} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}