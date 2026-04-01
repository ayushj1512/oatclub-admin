"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  RefreshCcw,
  Instagram,
  Facebook,
  Youtube,
  MessageCircle,
  Globe,
  Users,
  FileText,
} from "lucide-react";

import { useInfluencerProgramStore } from "@/store/influencerProgramStore";

const emptyPlatform = {
  url: "",
  followers: "",
  avgViews: "",
  engagementRate: "",
};

const initialForm = {
  fullName: "",
  email: "",
  mobile: "",
  city: "",
  state: "",
  collaborationType: "barter",
  status: "new",
  source: "",
  niche: "",
  notes: "",
  socials: {
    instagram: { ...emptyPlatform },
    facebook: { ...emptyPlatform },
    snapchat: { ...emptyPlatform },
    youtube: { ...emptyPlatform },
    other: { ...emptyPlatform },
  },
};

const statusOptions = [
  "new",
  "contacted",
  "interested",
  "active",
  "rejected",
  "inactive",
];

const collaborationOptions = ["barter", "paid", "affiliate", "gifting"];

const safeNum = (value) => {
  if (value === "" || value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const inputClass =
  "w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-black";
const labelClass = "mb-2 block text-sm font-medium text-neutral-700";

function SectionCard({ title, icon: Icon, children, subtitle = "" }) {
  return (
    <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
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
      {children}
    </section>
  );
}

function SocialBlock({
  title,
  icon: Icon,
  value,
  onChange,
  placeholder = "https://",
}) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-xl bg-white p-2">
          <Icon className="h-4 w-4 text-neutral-700" />
        </div>
        <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className={labelClass}>{title} URL</label>
          <input
            type="text"
            value={value.url}
            onChange={(e) => onChange("url", e.target.value)}
            placeholder={placeholder}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Followers</label>
          <input
            type="number"
            min="0"
            value={value.followers}
            onChange={(e) => onChange("followers", e.target.value)}
            placeholder="0"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Avg Views</label>
          <input
            type="number"
            min="0"
            value={value.avgViews}
            onChange={(e) => onChange("avgViews", e.target.value)}
            placeholder="0"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Engagement Rate (%)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={value.engagementRate}
            onChange={(e) => onChange("engagementRate", e.target.value)}
            placeholder="0"
            className={inputClass}
          />
        </div>
      </div>
    </div>
  );
}

export default function AddInfluencerCollaborationPage() {
  const router = useRouter();
  const { createInfluencer, submitting } = useInfluencerProgramStore();

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});

  const totalReach = useMemo(() => {
    const s = form.socials;
    return (
      safeNum(s.instagram.followers) +
      safeNum(s.facebook.followers) +
      safeNum(s.snapchat.followers) +
      safeNum(s.youtube.followers) +
      safeNum(s.other.followers)
    );
  }, [form.socials]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const setSocialField = (platform, key, value) => {
    setForm((prev) => ({
      ...prev,
      socials: {
        ...prev.socials,
        [platform]: {
          ...prev.socials[platform],
          [key]: value,
        },
      },
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setErrors({});
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.fullName.trim()) nextErrors.fullName = "Full name is required";
    if (!form.mobile.trim()) nextErrors.mobile = "Mobile is required";

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = "Enter a valid email";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = () => ({
    fullName: form.fullName.trim(),
    email: form.email.trim(),
    mobile: form.mobile.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    collaborationType: form.collaborationType,
    status: form.status,
    source: form.source.trim(),
    niche: form.niche.trim(),
    notes: form.notes.trim(),
    socials: {
      instagram: {
        url: form.socials.instagram.url.trim(),
        followers: safeNum(form.socials.instagram.followers),
        avgViews: safeNum(form.socials.instagram.avgViews),
        engagementRate: safeNum(form.socials.instagram.engagementRate),
      },
      facebook: {
        url: form.socials.facebook.url.trim(),
        followers: safeNum(form.socials.facebook.followers),
        avgViews: safeNum(form.socials.facebook.avgViews),
        engagementRate: safeNum(form.socials.facebook.engagementRate),
      },
      snapchat: {
        url: form.socials.snapchat.url.trim(),
        followers: safeNum(form.socials.snapchat.followers),
        avgViews: safeNum(form.socials.snapchat.avgViews),
        engagementRate: safeNum(form.socials.snapchat.engagementRate),
      },
      youtube: {
        url: form.socials.youtube.url.trim(),
        followers: safeNum(form.socials.youtube.followers),
        avgViews: safeNum(form.socials.youtube.avgViews),
        engagementRate: safeNum(form.socials.youtube.engagementRate),
      },
      other: {
        url: form.socials.other.url.trim(),
        followers: safeNum(form.socials.other.followers),
        avgViews: safeNum(form.socials.other.avgViews),
        engagementRate: safeNum(form.socials.other.engagementRate),
      },
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const result = await createInfluencer(buildPayload());

    if (result?.ok) {
      router.push("/infleuncer-collaboration");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="px-4 py-5 md:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.back()}
              className="mb-3 inline-flex items-center gap-2 rounded-2xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 transition hover:bg-neutral-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Add Influencer Collaboration
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Add a new influencer profile for your admin collaboration workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Total Reach
              </p>
              <p className="mt-1 text-xl font-semibold text-neutral-900">
                {totalReach.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Status
              </p>
              <p className="mt-1 text-xl font-semibold capitalize text-neutral-900">
                {form.status}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <SectionCard
            title="Basic Details"
            icon={Users}
            subtitle="Main influencer information"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className={labelClass}>Full Name *</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setField("fullName", e.target.value)}
                  placeholder="Enter full name"
                  className={inputClass}
                />
                {errors.fullName ? (
                  <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>
                ) : null}
              </div>

              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="Enter email"
                  className={inputClass}
                />
                {errors.email ? (
                  <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                ) : null}
              </div>

              <div>
                <label className={labelClass}>Mobile *</label>
                <input
                  type="text"
                  value={form.mobile}
                  onChange={(e) => setField("mobile", e.target.value)}
                  placeholder="Enter mobile"
                  className={inputClass}
                />
                {errors.mobile ? (
                  <p className="mt-1 text-xs text-red-500">{errors.mobile}</p>
                ) : null}
              </div>

              <div>
                <label className={labelClass}>City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  placeholder="Enter city"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>State</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setField("state", e.target.value)}
                  placeholder="Enter state"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Niche</label>
                <input
                  type="text"
                  value={form.niche}
                  onChange={(e) => setField("niche", e.target.value)}
                  placeholder="Fashion / Lifestyle / Denim"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Collaboration Type</label>
                <select
                  value={form.collaborationType}
                  onChange={(e) =>
                    setField("collaborationType", e.target.value)
                  }
                  className={inputClass}
                >
                  {collaborationOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value)}
                  className={inputClass}
                >
                  {statusOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Source</label>
                <input
                  type="text"
                  value={form.source}
                  onChange={(e) => setField("source", e.target.value)}
                  placeholder="Instagram DM / Referral / Form"
                  className={inputClass}
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Social Profiles"
            icon={Globe}
            subtitle="Links and audience data platform wise"
          >
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SocialBlock
                title="Instagram"
                icon={Instagram}
                value={form.socials.instagram}
                onChange={(key, value) =>
                  setSocialField("instagram", key, value)
                }
                placeholder="https://instagram.com/username"
              />

              <SocialBlock
                title="Facebook"
                icon={Facebook}
                value={form.socials.facebook}
                onChange={(key, value) => setSocialField("facebook", key, value)}
                placeholder="https://facebook.com/username"
              />

              <SocialBlock
                title="Snapchat"
                icon={MessageCircle}
                value={form.socials.snapchat}
                onChange={(key, value) => setSocialField("snapchat", key, value)}
                placeholder="https://snapchat.com/add/username"
              />

              <SocialBlock
                title="YouTube"
                icon={Youtube}
                value={form.socials.youtube}
                onChange={(key, value) => setSocialField("youtube", key, value)}
                placeholder="https://youtube.com/@channel"
              />

              <div className="xl:col-span-2">
                <SocialBlock
                  title="Other"
                  icon={Globe}
                  value={form.socials.other}
                  onChange={(key, value) => setSocialField("other", key, value)}
                  placeholder="Any other social/profile link"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Notes"
            icon={FileText}
            subtitle="Anything important about this collaboration"
          >
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className={labelClass}>Notes</label>
                <textarea
                  rows={5}
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  placeholder="Add campaign notes, negotiation points, preferences, response details, etc."
                  className={`${inputClass} resize-y`}
                />
              </div>
            </div>
          </SectionCard>

          <div className="sticky bottom-4 z-10">
            <div className="flex flex-col gap-3 rounded-3xl border border-neutral-200 bg-white p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-neutral-500">
                Review details before saving. Code will auto generate from backend.
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Reset
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {submitting ? "Saving..." : "Save Influencer"}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}