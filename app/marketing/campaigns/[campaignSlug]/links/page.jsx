"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Link2,
  MousePointerClick,
  Plus,
  Search,
  ShoppingBag,
  User,
} from "lucide-react";
import { useAdminMarketingCampaignStore } from "@/store/adminMarketingCampaignStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const API_ORIGIN = API_URL.endsWith("/api")
  ? API_URL.replace(/\/api$/, "")
  : API_URL;

const DEFAULT_DESTINATION_URL = "https://www.oatclub.com/";

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

const formatMoney = (value = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const normalizeUrl = (value = "") => {
  const clean = String(value || "").trim();

  if (!clean) return DEFAULT_DESTINATION_URL;

  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    return clean;
  }

  if (clean.startsWith("/")) {
    return `${DEFAULT_DESTINATION_URL.replace(/\/$/, "")}${clean}`;
  }

  return `https://${clean}`;
};

const getJourneyCount = (link, event) => {
  return (link?.journey || []).filter((item) => item?.event === event).length;
};

export default function CampaignLinksPage() {
  const params = useParams();
  const campaignSlug = params?.campaignSlug;

  const {
    selectedCampaign,
    isDetailsLoading,
    isCreatingLink,
    error,
    successMessage,
    fetchCampaignDetails,
    createTrackingLink,
    clearMessages,
  } = useAdminMarketingCampaignStore();

  const [search, setSearch] = useState("");
  const [copiedCode, setCopiedCode] = useState("");
  const [form, setForm] = useState({
    destinationUrl: DEFAULT_DESTINATION_URL,
    name: "",
    phone: "",
    customerId: "",
  });

  useEffect(() => {
    if (campaignSlug) fetchCampaignDetails(campaignSlug);
  }, [campaignSlug, fetchCampaignDetails]);

  const links = selectedCampaign?.links || [];

  const summary = useMemo(() => {
    return links.reduce(
      (acc, link) => {
        acc.totalLinks += 1;
        acc.clicked += Number(link?.uniqueClickCount || 0) > 0 ? 1 : 0;
        acc.converted += link?.converted ? 1 : 0;
        acc.revenue += Number(link?.revenue || 0);
        acc.totalClicks += Number(link?.clickCount || 0);
        acc.addToCart += getJourneyCount(link, "add_to_cart");
        acc.checkout += getJourneyCount(link, "checkout_started");
        return acc;
      },
      {
        totalLinks: 0,
        clicked: 0,
        converted: 0,
        revenue: 0,
        totalClicks: 0,
        addToCart: 0,
        checkout: 0,
      }
    );
  }, [links]);

  const filteredLinks = useMemo(() => {
    const q = search.toLowerCase().trim();

    if (!q) return links;

    return links.filter((link) => {
      return (
        link?.name?.toLowerCase().includes(q) ||
        link?.phone?.toLowerCase().includes(q) ||
        link?.shortCode?.toLowerCase().includes(q) ||
        link?.destinationUrl?.toLowerCase().includes(q) ||
        link?.orderNumber?.toLowerCase().includes(q)
      );
    });
  }, [links, search]);

  const updateForm = (key, value) => {
    clearMessages();
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCreateLink = async (e) => {
    e.preventDefault();

    if (!selectedCampaign?._id) return;

    const destinationUrl = normalizeUrl(form.destinationUrl);

    await createTrackingLink(selectedCampaign._id, {
      destinationUrl,
      name: form.name.trim(),
      phone: form.phone.trim(),
      customerId: form.customerId.trim(),
    });

    setForm({
      destinationUrl: DEFAULT_DESTINATION_URL,
      name: "",
      phone: "",
      customerId: "",
    });
  };

  const getTrackingUrl = (shortCode) => {
    return `${API_ORIGIN}/api/marketing-campaigns/t/${shortCode}`;
  };

  const copyLink = async (shortCode) => {
    const url = getTrackingUrl(shortCode);
    await navigator.clipboard.writeText(url);

    setCopiedCode(shortCode);
    setTimeout(() => setCopiedCode(""), 1200);
  };

  if (isDetailsLoading) {
    return (
      <div className="min-h-screen bg-white p-6 text-sm text-gray-500">
        Loading links...
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

          <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-gray-400">
                Campaign Links
              </p>

              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-black md:text-3xl">
                Tracking Links
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                Create links for product pages, collections, offers or any
                storefront URL. Copy these links into WhatsApp, SMS, email or
                manual outreach.
              </p>
            </div>

            <Link
              href={`/marketing/campaigns/${campaignSlug}/clicks`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-black shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-50"
            >
              <MousePointerClick size={16} />
              View Clicks
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm text-gray-500">Total Links</p>
            <p className="mt-2 text-2xl font-semibold text-black">
              {summary.totalLinks}
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm text-gray-500">Clicked Links</p>
            <p className="mt-2 text-2xl font-semibold text-black">
              {summary.clicked}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {summary.totalClicks} total clicks
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm text-gray-500">Converted</p>
            <p className="mt-2 text-2xl font-semibold text-black">
              {summary.converted}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {summary.checkout} checkout starts
            </p>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm text-gray-500">Revenue</p>
            <p className="mt-2 text-2xl font-semibold text-black">
              {formatMoney(summary.revenue)}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {summary.addToCart} add to carts
            </p>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <form
            onSubmit={handleCreateLink}
            className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100 md:p-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black shadow-sm ring-1 ring-gray-100">
                <Plus size={18} />
              </div>

              <div>
                <h2 className="text-base font-semibold text-black">
                  Create Tracking Link
                </h2>
                <p className="text-sm text-gray-500">
                  Destination URL can be full URL or relative storefront path.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Destination URL
                </label>
                <input
                  value={form.destinationUrl}
                  onChange={(e) =>
                    updateForm("destinationUrl", e.target.value)
                  }
                  placeholder="https://www.oatclub.com/products/..."
                  className="mt-2 w-full rounded-xl bg-white px-3 py-2.5 text-sm text-black outline-none ring-1 ring-gray-100 transition placeholder:text-gray-400 focus:ring-black/10"
                />

                <p className="mt-2 text-xs text-gray-400">
                  You can paste full URL or use path like{" "}
                  <span className="font-medium text-gray-600">
                    /collections/budget-bees
                  </span>
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Customer Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  placeholder="Customer name"
                  className="mt-2 w-full rounded-xl bg-white px-3 py-2.5 text-sm text-black outline-none ring-1 ring-gray-100 transition placeholder:text-gray-400 focus:ring-black/10"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => updateForm("phone", e.target.value)}
                  placeholder="9876543210"
                  className="mt-2 w-full rounded-xl bg-white px-3 py-2.5 text-sm text-black outline-none ring-1 ring-gray-100 transition placeholder:text-gray-400 focus:ring-black/10"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Customer ID optional
                </label>
                <input
                  value={form.customerId}
                  onChange={(e) => updateForm("customerId", e.target.value)}
                  placeholder="MongoDB customer id"
                  className="mt-2 w-full rounded-xl bg-white px-3 py-2.5 text-sm text-black outline-none ring-1 ring-gray-100 transition placeholder:text-gray-400 focus:ring-black/10"
                />
              </div>

              {(error || successMessage) && (
                <div
                  className={`rounded-xl px-3 py-2.5 text-sm ${
                    error
                      ? "bg-red-50 text-red-600"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {error || successMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isCreatingLink || !form.destinationUrl.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                <Link2 size={16} />
                {isCreatingLink ? "Creating..." : "Create Link"}
              </button>
            </div>
          </form>

          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100 md:p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-black">
                  Generated Links
                </h2>
                <p className="text-sm text-gray-500">
                  Copy campaign links and use them wherever needed.
                </p>
              </div>

              <div className="relative w-full md:max-w-xs">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search links..."
                  className="w-full rounded-xl bg-white py-2.5 pl-9 pr-3 text-sm text-black outline-none ring-1 ring-gray-100 transition placeholder:text-gray-400 focus:ring-black/10"
                />
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] text-left">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Destination</th>
                      <th className="px-4 py-3 font-medium">Clicks</th>
                      <th className="px-4 py-3 font-medium">Journey</th>
                      <th className="px-4 py-3 font-medium">Converted</th>
                      <th className="px-4 py-3 font-medium">Revenue</th>
                      <th className="px-4 py-3 font-medium">Last Click</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {filteredLinks.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-10 text-center text-sm text-gray-500"
                        >
                          No tracking links found.
                        </td>
                      </tr>
                    ) : (
                      filteredLinks.map((link) => {
                        const trackingUrl = getTrackingUrl(link.shortCode);
                        const productViews = getJourneyCount(
                          link,
                          "product_view"
                        );
                        const addToCarts = getJourneyCount(
                          link,
                          "add_to_cart"
                        );
                        const checkoutStarts = getJourneyCount(
                          link,
                          "checkout_started"
                        );

                        return (
                          <tr
                            key={link._id || link.shortCode}
                            className="text-sm transition hover:bg-gray-50/70"
                          >
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 text-gray-600 ring-1 ring-gray-100">
                                  <User size={15} />
                                </div>

                                <div>
                                  <p className="font-medium text-black">
                                    {link.name || "Guest"}
                                  </p>
                                  <p className="mt-1 text-xs text-gray-400">
                                    {link.phone || "No phone"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <p className="font-mono text-xs text-black">
                                {link.shortCode}
                              </p>
                              <p className="mt-1 max-w-[280px] truncate text-xs text-gray-400">
                                {link.destinationUrl}
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              <div className="inline-flex items-center gap-2 text-gray-700">
                                <MousePointerClick size={15} />
                                <span className="font-medium text-black">
                                  {link.clickCount || 0}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-gray-400">
                                {link.uniqueClickCount || 0} unique
                              </p>
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-1.5">
                                <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">
                                  PV {productViews}
                                </span>
                                <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">
                                  ATC {addToCarts}
                                </span>
                                <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600">
                                  CO {checkoutStarts}
                                </span>
                              </div>
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                                  link.converted
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {link.converted ? (
                                  <ShoppingBag size={13} />
                                ) : null}
                                {link.converted ? "Yes" : "No"}
                              </span>
                              {link.orderNumber ? (
                                <p className="mt-1 text-xs text-gray-400">
                                  {link.orderNumber}
                                </p>
                              ) : null}
                            </td>

                            <td className="px-4 py-4 font-medium text-black">
                              {formatMoney(link.revenue)}
                            </td>

                            <td className="px-4 py-4 text-gray-500">
                              {formatDateTime(link.lastClickedAt)}
                            </td>

                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => copyLink(link.shortCode)}
                                  className="inline-flex items-center gap-1 rounded-xl bg-gray-50 px-3 py-2 text-xs font-medium text-black ring-1 ring-gray-100 transition hover:bg-gray-100"
                                >
                                  {copiedCode === link.shortCode ? (
                                    <Check size={14} />
                                  ) : (
                                    <Copy size={14} />
                                  )}
                                  {copiedCode === link.shortCode
                                    ? "Copied"
                                    : "Copy"}
                                </button>

                                <a
                                  href={trackingUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded-xl bg-gray-50 px-3 py-2 text-xs font-medium text-black ring-1 ring-gray-100 transition hover:bg-gray-100"
                                >
                                  <ExternalLink size={14} />
                                  Open
                                </a>
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
          </div>
        </div>
      </div>
    </div>
  );
}