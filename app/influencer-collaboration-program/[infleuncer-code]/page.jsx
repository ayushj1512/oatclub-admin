"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Tag,
  BadgeInfo,
  FileText,
  Globe,
  Users,
  Pencil,
  RefreshCcw,
} from "lucide-react";

import { useInfluencerProgramStore } from "@/store/influencerProgramStore";

const cardClass =
  "rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm";
const thClass =
  "w-[220px] border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm font-semibold text-neutral-700";
const tdClass =
  "border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900";
const socialThClass =
  "border-b border-neutral-200 bg-neutral-50 px-4 py-3 text-left text-sm font-semibold text-neutral-700";

const safe = (v) => (v == null || v === "" ? "-" : String(v));

const formatNumber = (v) => {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n.toLocaleString("en-IN") : "0";
};

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="rounded-2xl bg-neutral-100 p-2">
        <Icon className="h-5 w-5 text-neutral-700" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

function InfoTable({ rows = [] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th className={thClass}>{row.label}</th>
                <td className={tdClass}>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function InfluencerCodePage() {
  const params = useParams();
  const router = useRouter();

  const influencerCode = decodeURIComponent(
    params?.["infleuncer-code"] || ""
  );

  const {
    influencer,
    loading,
    fetchInfluencerByCode,
    clearInfluencer,
  } = useInfluencerProgramStore();

  useEffect(() => {
    if (!influencerCode) return;

    fetchInfluencerByCode(influencerCode);

    return () => clearInfluencer();
  }, [influencerCode, fetchInfluencerByCode, clearInfluencer]);

  const socialRows = useMemo(() => {
    const s = influencer?.socials || {};

    return [
      {
        platform: "Instagram",
        url: s.instagram?.url || "",
        followers: s.instagram?.followers || 0,
        avgViews: s.instagram?.avgViews || 0,
        engagementRate: s.instagram?.engagementRate || 0,
      },
      {
        platform: "Facebook",
        url: s.facebook?.url || "",
        followers: s.facebook?.followers || 0,
        avgViews: s.facebook?.avgViews || 0,
        engagementRate: s.facebook?.engagementRate || 0,
      },
      {
        platform: "Snapchat",
        url: s.snapchat?.url || "",
        followers: s.snapchat?.followers || 0,
        avgViews: s.snapchat?.avgViews || 0,
        engagementRate: s.snapchat?.engagementRate || 0,
      },
      {
        platform: "YouTube",
        url: s.youtube?.url || "",
        followers: s.youtube?.followers || 0,
        avgViews: s.youtube?.avgViews || 0,
        engagementRate: s.youtube?.engagementRate || 0,
      },
      {
        platform: "Other",
        url: s.other?.url || "",
        followers: s.other?.followers || 0,
        avgViews: s.other?.avgViews || 0,
        engagementRate: s.other?.engagementRate || 0,
      },
    ];
  }, [influencer]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 px-4 py-6 md:px-6 lg:px-8">
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <RefreshCcw className="mx-auto mb-3 h-6 w-6 animate-spin text-neutral-500" />
          <p className="text-sm text-neutral-600">Loading influencer details...</p>
        </div>
      </div>
    );
  }

  if (!loading && !influencer) {
    return (
      <div className="min-h-screen bg-neutral-50 px-4 py-6 md:px-6 lg:px-8">
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-neutral-900">
            Influencer not found
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            No influencer found for code: {safe(influencerCode)}
          </p>

          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => router.push("/infleuncer-collaboration")}
              className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </button>
          </div>
        </div>
      </div>
    );
  }

  const basicRows = [
    { label: "Code", value: safe(influencer?.code) },
    { label: "Full Name", value: safe(influencer?.fullName) },
    { label: "Email", value: safe(influencer?.email) },
    { label: "Mobile", value: safe(influencer?.mobile) },
    { label: "City", value: safe(influencer?.city) },
    { label: "State", value: safe(influencer?.state) },
  ];

  const businessRows = [
    {
      label: "Collaboration Type",
      value: (
        <span className="inline-flex rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold capitalize text-neutral-800">
          {safe(influencer?.collaborationType)}
        </span>
      ),
    },
    {
      label: "Status",
      value: (
        <span className="inline-flex rounded-full bg-black px-3 py-1 text-xs font-semibold capitalize text-white">
          {safe(influencer?.status)}
        </span>
      ),
    },
    { label: "Niche", value: safe(influencer?.niche) },
    { label: "Source", value: safe(influencer?.source) },
    {
      label: "Total Reach",
      value: formatNumber(influencer?.totalReach || 0),
    },
    {
      label: "Created At",
      value: influencer?.createdAt
        ? new Date(influencer.createdAt).toLocaleString("en-IN")
        : "-",
    },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="px-4 py-5 md:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.push("/infleuncer-collaboration")}
              className="mb-3 inline-flex items-center gap-2 rounded-2xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 transition hover:bg-neutral-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Influencer Details
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Complete profile view for code{" "}
              <span className="font-semibold text-neutral-800">
                {safe(influencer?.code)}
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Code
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">
                {safe(influencer?.code)}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Total Reach
              </p>
              <p className="mt-1 text-lg font-semibold text-neutral-900">
                {formatNumber(influencer?.totalReach || 0)}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Status
              </p>
              <p className="mt-1 text-lg font-semibold capitalize text-neutral-900">
                {safe(influencer?.status)}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-3">
          <Link
            href={`/infleuncer-collaboration/edit/${influencer?.code}`}
            className="inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>

          <Link
            href="/infleuncer-collaboration/add"
            className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700"
          >
            <User className="h-4 w-4" />
            Add New
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5">
          <section className={cardClass}>
            <SectionHeader
              icon={User}
              title="Basic Details"
              subtitle="Main influencer identity and contact details"
            />
            <InfoTable rows={basicRows} />
          </section>

          <section className={cardClass}>
            <SectionHeader
              icon={BadgeInfo}
              title="Business Details"
              subtitle="Collaboration and program details"
            />
            <InfoTable rows={businessRows} />
          </section>

          <section className={cardClass}>
            <SectionHeader
              icon={Globe}
              title="Social Profiles"
              subtitle="Platform wise links and performance data"
            />

            <div className="overflow-hidden rounded-2xl border border-neutral-200">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={socialThClass}>Platform</th>
                      <th className={socialThClass}>URL</th>
                      <th className={socialThClass}>Followers</th>
                      <th className={socialThClass}>Avg Views</th>
                      <th className={socialThClass}>Engagement %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {socialRows.map((row) => (
                      <tr key={row.platform}>
                        <td className={tdClass}>{row.platform}</td>
                        <td className={tdClass}>
                          {row.url ? (
                            <a
                              href={row.url}
                              target="_blank"
                              rel="noreferrer"
                              className="break-all text-sm font-medium text-blue-600 underline"
                            >
                              {row.url}
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className={tdClass}>{formatNumber(row.followers)}</td>
                        <td className={tdClass}>{formatNumber(row.avgViews)}</td>
                        <td className={tdClass}>
                          {Number(row.engagementRate || 0)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <SectionHeader
              icon={FileText}
              title="Notes"
              subtitle="Internal notes or collaboration remarks"
            />

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-800">
              {safe(influencer?.notes)}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}