"use client";

import {
  MousePointerClick,
  Radio,
  BadgeCheck,
} from "lucide-react";

import {
  FaFacebookF,
  FaInstagram,
  FaGoogle,
  FaYoutube,
  FaSnapchatGhost,
  FaWhatsapp,
  FaGlobe,
  FaBullhorn,
} from "react-icons/fa";

import {
  HiOutlineSparkles,
  HiOutlineHashtag,
  HiOutlineLink,
} from "react-icons/hi";

import { getOrderAttributionLabel } from "@/store/orderStore";

const sourceMeta = {
  facebook: {
    label: "Facebook",
    emoji: "📘",
    icon: FaFacebookF,
    cls: "bg-blue-50 text-blue-700 ring-blue-100",
  },

  instagram: {
    label: "Instagram",
    emoji: "📸",
    icon: FaInstagram,
    cls: "bg-pink-50 text-pink-700 ring-pink-100",
  },

  google: {
    label: "Google",
    emoji: "🔎",
    icon: FaGoogle,
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },

  youtube: {
    label: "YouTube",
    emoji: "▶️",
    icon: FaYoutube,
    cls: "bg-red-50 text-red-700 ring-red-100",
  },

  snapchat: {
    label: "Snapchat",
    emoji: "👻",
    icon: FaSnapchatGhost,
    cls: "bg-yellow-50 text-yellow-800 ring-yellow-100",
  },

  whatsapp: {
    label: "WhatsApp",
    emoji: "💬",
    icon: FaWhatsapp,
    cls: "bg-green-50 text-green-700 ring-green-100",
  },

  marketing: {
    label: "Miray Campaign",
    emoji: "📣",
    icon: FaBullhorn,
    cls: "bg-purple-50 text-purple-700 ring-purple-100",
  },

  direct: {
    label: "Direct",
    emoji: "🌐",
    icon: FaGlobe,
    cls: "bg-gray-50 text-gray-700 ring-gray-100",
  },
};

const clean = (v) => String(v || "").trim();

const pretty = (v) =>
  clean(v)
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const shortUrl = (url = "") => {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`;
  } catch {
    return clean(url);
  }
};

const InfoRow = ({ icon: Icon, label, value }) => {
  if (!clean(value)) return null;

  return (
    <div className="flex items-start gap-3 rounded-2xl bg-gray-50/80 px-4 py-3 transition hover:bg-gray-100/70">
      <div className="mt-0.5 rounded-xl bg-white p-2 text-gray-500 shadow-sm ring-1 ring-gray-100">
        <Icon size={15} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          {label}
        </p>

        <p className="mt-0.5 break-words text-sm font-semibold text-gray-900">
          {value}
        </p>
      </div>
    </div>
  );
};

export default function OrderSourceAttributionCard({ order }) {
  const attr = order?.attribution || {};
  const label = getOrderAttributionLabel(order);

  const sourceKey = clean(label.source).toLowerCase() || "direct";

  const meta = sourceMeta[sourceKey] || {
    label: pretty(sourceKey || "Unknown"),
    emoji: "✨",
    icon: Radio,
    cls: "bg-gray-50 text-gray-700 ring-gray-100",
  };

  const SourceIcon = meta.icon;

  const clickId =
    attr?.clickIds?.fbclid ||
    attr?.clickIds?.gclid ||
    attr?.clickIds?.msclkid ||
    attr?.clickIds?.ttclid ||
    attr?.clickIds?.scClickId ||
    "";

  const hasAttribution =
    attr?.source ||
    attr?.medium ||
    attr?.campaign ||
    attr?.campaignId ||
    attr?.marketingLinkId ||
    attr?.shortCode ||
    clickId;

  if (!hasAttribution) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-white/90 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-gray-50 p-3 text-gray-600 ring-1 ring-gray-100">
            <FaGlobe size={20} />
          </div>

          <div>
            <h2 className="text-base font-semibold text-gray-900">
              🌐 Order Source
            </h2>

            <p className="text-sm text-gray-500">
              No attribution captured for this order.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white/90 shadow-sm">
      <div className="relative p-5">
        <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-black/[0.03]" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl text-xl ring-1 ${meta.cls}`}
            >
              <SourceIcon size={22} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Order Source
              </p>

              <h2 className="mt-1 text-xl font-bold tracking-tight text-gray-950">
                {meta.emoji} {meta.label}
              </h2>

              <p className="mt-0.5 text-sm text-gray-500">
                {pretty(label.medium)}{" "}
                {label.campaign ? `• ${label.campaign}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white">
              <BadgeCheck size={13} />
              Captured
            </span>

            {label.shortCode && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700">
                <HiOutlineHashtag size={13} />
                {label.shortCode}
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <InfoRow
            icon={FaBullhorn}
            label="Campaign"
            value={label.campaign}
          />

          <InfoRow
            icon={Radio}
            label="Medium"
            value={pretty(label.medium)}
          />

          <InfoRow
            icon={HiOutlineLink}
            label="Marketing Link"
            value={label.marketingLinkId}
          />

          <InfoRow
            icon={HiOutlineHashtag}
            label="Short Code"
            value={label.shortCode}
          />

          <InfoRow
            icon={MousePointerClick}
            label="Click ID"
            value={clickId}
          />

          <InfoRow
            icon={FaGlobe}
            label="Landing URL"
            value={shortUrl(attr.landingUrl)}
          />
        </div>

        {(attr.visitorId || attr.sessionId) && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <InfoRow
              icon={HiOutlineSparkles}
              label="Visitor ID"
              value={attr.visitorId}
            />

            <InfoRow
              icon={Radio}
              label="Session ID"
              value={attr.sessionId}
            />
          </div>
        )}
      </div>
    </div>
  );
}