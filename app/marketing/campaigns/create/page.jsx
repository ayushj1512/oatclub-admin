"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Link2,
  Save,
  Sparkles,
} from "lucide-react";
import { useAdminMarketingCampaignStore } from "@/store/adminMarketingCampaignStore";

const slugify = (value = "") =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export default function CreateMarketingCampaignPage() {
  const router = useRouter();

  const { createCampaign, isCreating, error, successMessage, clearMessages } =
    useAdminMarketingCampaignStore();

  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "draft",
  });

  const campaignSlug = useMemo(() => slugify(form.name), [form.name]);

  const updateForm = (key, value) => {
    clearMessages();
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) return;

    const data = await createCampaign({
      name: form.name.trim(),
      description: form.description.trim(),
      status: form.status || "draft",
    });

    const created = data?.campaign;
    const campaignKey = created?._id || created?.slug || campaignSlug;

    if (campaignKey) {
      router.push(`/marketing/campaigns/${campaignKey}`);
    } else {
      router.push("/marketing/campaigns");
    }
  };

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

          <p className="mt-5 text-xs font-medium uppercase tracking-[0.22em] text-gray-400">
            Marketing Campaign
          </p>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-black md:text-3xl">
            Create Campaign
          </h1>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
            Create a campaign container first. After creation, generate tracking
            links for product pages, collections, offers or any storefront URL.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-5 xl:grid-cols-[1fr_420px]"
        >
          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100 md:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black shadow-sm ring-1 ring-gray-100">
                <BarChart3 size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-black">
                  Campaign Details
                </h2>
                <p className="text-sm text-gray-500">
                  Basic information for tracking links, clicks, journey and
                  revenue.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Campaign Name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  placeholder="Example: Budget Bees May Campaign"
                  className="mt-2 w-full rounded-xl bg-white px-3 py-2.5 text-sm text-black outline-none ring-1 ring-gray-100 transition placeholder:text-gray-400 focus:ring-black/10"
                />
                <p className="mt-2 text-xs text-gray-400">
                  Preview slug:{" "}
                  <span className="font-medium text-gray-600">
                    {campaignSlug || "campaign-name"}
                  </span>
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  rows={5}
                  placeholder="Example: Tracking campaign for Budget Bees collection traffic, cart journey and conversions."
                  className="mt-2 w-full resize-none rounded-xl bg-white px-3 py-2.5 text-sm leading-6 text-black outline-none ring-1 ring-gray-100 transition placeholder:text-gray-400 focus:ring-black/10"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => updateForm("status", e.target.value)}
                  className="mt-2 w-full rounded-xl bg-white px-3 py-2.5 text-sm text-black outline-none ring-1 ring-gray-100 transition focus:ring-black/10"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
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

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  disabled={isCreating || !form.name.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <Save size={16} />
                  {isCreating ? "Creating..." : "Create Campaign"}
                </button>

                <Link
                  href="/marketing/campaigns"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-100 transition hover:bg-gray-50"
                >
                  Cancel
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100 md:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black shadow-sm ring-1 ring-gray-100">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-black">
                  What happens next?
                </h2>
                <p className="text-sm text-gray-500">
                  Simple tracking flow for storefront campaigns.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {[
                {
                  title: "1. Create campaign",
                  desc: "Campaign works like a folder for all tracking links.",
                  icon: CheckCircle2,
                },
                {
                  title: "2. Generate links",
                  desc: "Create links for collection, product, sale or custom URL.",
                  icon: Link2,
                },
                {
                  title: "3. Track journey",
                  desc: "Landing, product view, add to cart, checkout and order are tracked.",
                  icon: BarChart3,
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 text-black ring-1 ring-gray-100">
                        <Icon size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-black">
                          {item.title}
                        </p>
                        <p className="mt-1 text-sm leading-5 text-gray-500">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl bg-white p-4 text-sm text-gray-500 shadow-sm ring-1 ring-gray-100">
              <p className="font-medium text-black">Frontend URL note</p>
              <p className="mt-1 leading-6">
                Destination URL link create page par set hoga. Backend fallback
                sirf tab chalega jab destination URL missing ya invalid ho.
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}