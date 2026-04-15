"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  Loader2,
  Mail,
  Phone,
  Save,
  Star,
  User,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";

import useTailorStore from "@/store/useTailorStore";

const TAILOR_TYPES = [
  "sample_tailor",
  "pattern_master",
  "cutting_master",
  "stitching_tailor",
  "finishing_tailor",
  "alteration_tailor",
  "karigar",
  "embroidery_tailor",
  "all",
];

const STATUS_OPTIONS = ["active", "inactive"];

const labelize = (value = "") =>
  String(value)
    .split("_")
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(" ");

const initialForm = {
  name: "",
  type: "all",
  email: "",
  mobile: "",
  status: "active",
  rating: 0,
  joinedAt: "",
};

export default function AddTailorPage() {
  const router = useRouter();
  const { createTailor, submitting } = useTailorStore();

  const [form, setForm] = useState(initialForm);

  const pageMeta = useMemo(
    () => ({
      title: "Add Tailor",
      subtitle: "Create a new tailor profile for Design Lab.",
    }),
    []
  );

  const handleChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: key === "rating" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Tailor name is required");
      return;
    }

    const res = await createTailor({
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      mobile: form.mobile.trim(),
    });

    if (res?.success) {
      router.push("/design-lab/tailors");
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto ">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/design-lab/tailors"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-black"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Tailors
            </Link>

            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              {pageMeta.title}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{pageMeta.subtitle}</p>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Design Lab
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="bg-gradient-to-br from-black via-gray-900 to-gray-800 px-5 py-6 text-white">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 backdrop-blur">
                <User className="h-8 w-8" />
              </div>

              <h2 className="mt-4 text-xl font-semibold">New Tailor Profile</h2>
              <p className="mt-2 text-sm text-gray-300">
                Add tailor details with a clean, structured profile for easier
                management inside Design Lab.
              </p>
            </div>

            <div className="space-y-3 p-5">
              <InfoRow
                icon={Briefcase}
                label="Role Types"
                value="Sampling, pattern, cutting, stitching and more"
              />
              <InfoRow
                icon={Star}
                label="Rating Ready"
                value="Add rating now or update later anytime"
              />
              <InfoRow
                icon={CalendarDays}
                label="Joined Date"
                value="Track onboarding date from day one"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Tailor Information
                  </h3>
                  <p className="text-sm text-gray-500">
                    Fill the details below to create a new tailor.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tailor Name" icon={User}>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="Enter tailor name"
                    className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-gray-400"
                  />
                </Field>

                <Field label="Tailor Type" icon={Briefcase}>
                  <select
                    value={form.type}
                    onChange={(e) => handleChange("type", e.target.value)}
                    className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-gray-400"
                  >
                    {TAILOR_TYPES.map((item) => (
                      <option key={item} value={item}>
                        {labelize(item)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Email" icon={Mail}>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="Enter email"
                    className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-gray-400"
                  />
                </Field>

                <Field label="Mobile" icon={Phone}>
                  <input
                    type="text"
                    value={form.mobile}
                    onChange={(e) => handleChange("mobile", e.target.value)}
                    placeholder="Enter mobile number"
                    className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-gray-400"
                  />
                </Field>

                <Field label="Status" icon={Sparkles}>
                  <select
                    value={form.status}
                    onChange={(e) => handleChange("status", e.target.value)}
                    className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-gray-400"
                  >
                    {STATUS_OPTIONS.map((item) => (
                      <option key={item} value={item}>
                        {labelize(item)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Rating" icon={Star}>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={form.rating}
                    onChange={(e) => handleChange("rating", e.target.value)}
                    placeholder="0"
                    className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-gray-400"
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Joined At" icon={CalendarDays}>
                    <input
                      type="date"
                      value={form.joinedAt}
                      onChange={(e) => handleChange("joinedAt", e.target.value)}
                      className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-gray-400"
                    />
                  </Field>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-black px-5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Create Tailor
                </button>

                <Link
                  href="/design-lab/tailors"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-gray-700">
        <Icon className="h-4 w-4 text-gray-500" />
        {label}
      </span>
      {children}
    </label>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-[#fafafa] px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-gray-700 shadow-sm">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {label}
        </p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}