"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  MessageSquareText,
  Settings,
} from "lucide-react";
import { useAdminMarketingCampaignStore } from "@/store/adminMarketingCampaignStore";

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

export default function CampaignSettingsPage() {
  const { campaignSlug } = useParams();

  const {
    selectedCampaign,
    isDetailsLoading,
    error,
    fetchCampaignDetailsBySlug,
  } = useAdminMarketingCampaignStore();

  useEffect(() => {
    if (campaignSlug) fetchCampaignDetailsBySlug(campaignSlug);
  }, [campaignSlug, fetchCampaignDetailsBySlug]);

  if (isDetailsLoading) {
    return (
      <div className="min-h-screen bg-white p-6 text-sm text-gray-500">
        Loading settings...
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
        <div>
          <Link
            href={`/marketing/campaigns/${campaignSlug}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-black"
          >
            <ArrowLeft size={16} />
            Back to campaign
          </Link>

          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400">
              Campaign Settings
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-black md:text-3xl">
              Settings
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              View campaign setup, template and provider details.
            </p>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100 md:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black shadow-sm ring-1 ring-gray-100">
                <Settings size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-black">
                  Campaign Info
                </h2>
                <p className="text-sm text-gray-500">
                  Basic readonly details for this campaign.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <Info label="Campaign Name" value={selectedCampaign?.name} />
              <Info label="Slug" value={selectedCampaign?.slug || campaignSlug} />
              <Info label="Channel" value={selectedCampaign?.channel} />
              <Info label="Provider" value={selectedCampaign?.provider} />
              <Info label="Status" value={selectedCampaign?.status} />
              <Info
                label="Created At"
                value={formatDateTime(selectedCampaign?.createdAt)}
              />
              <Info
                label="Updated At"
                value={formatDateTime(selectedCampaign?.updatedAt)}
              />
              <Info
                label="Campaign ID"
                value={selectedCampaign?._id}
                mono
              />
            </div>
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100 md:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black shadow-sm ring-1 ring-gray-100">
                <BadgeCheck size={18} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-black">
                  Setup Health
                </h2>
                <p className="text-sm text-gray-500">
                  Quick checks before sending campaign.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <CheckItem
                label="Campaign name added"
                ok={Boolean(selectedCampaign?.name)}
              />
              <CheckItem
                label="Message template added"
                ok={Boolean(selectedCampaign?.messageTemplate)}
              />
              <CheckItem
                label="Provider selected"
                ok={Boolean(selectedCampaign?.provider)}
              />
              <CheckItem
                label="Tracking links generated"
                ok={(selectedCampaign?.links || []).length > 0}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-gray-50 p-4 shadow-sm ring-1 ring-gray-100 md:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black shadow-sm ring-1 ring-gray-100">
              <MessageSquareText size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-black">
                Message Template
              </h2>
              <p className="text-sm text-gray-500">
                Current WhatsApp template for this campaign.
              </p>
            </div>
          </div>

          <div className="mt-5 whitespace-pre-wrap rounded-2xl bg-white p-4 text-sm leading-6 text-gray-700 shadow-sm ring-1 ring-gray-100">
            {selectedCampaign?.messageTemplate || "No template added."}
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-400">
            <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-gray-100">
              {"{{name}}"}
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-gray-100">
              {"{{trackingLink}}"}
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 ring-1 ring-gray-100">
              {"{{phone}}"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, mono = false }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p
        className={`mt-2 break-words text-sm font-medium text-black ${
          mono ? "font-mono" : ""
        }`}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function CheckItem({ label, ok }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
          ok ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
        }`}
      >
        {ok ? "Ready" : "Pending"}
      </span>
    </div>
  );
}