"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Mail,
  Phone,
  Pencil,
  Save,
  Trash2,
  User,
  Briefcase,
  Star,
  Loader2,
  ShieldCheck,
  Circle,
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

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB");
};

const initialForm = {
  name: "",
  type: "all",
  email: "",
  mobile: "",
  status: "active",
  rating: 0,
  joinedAt: "",
};

export default function TailorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const {
    tailor,
    detailLoading,
    submitting,
    deleting,
    fetchTailorById,
    updateTailor,
    deleteTailor,
    clearTailor,
  } = useTailorStore();

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    if (!id) return;
    fetchTailorById(id);

    return () => clearTailor();
  }, [id, fetchTailorById, clearTailor]);

  useEffect(() => {
    if (!tailor) return;

    setForm({
      name: tailor.name || "",
      type: tailor.type || "all",
      email: tailor.email || "",
      mobile: tailor.mobile || "",
      status: tailor.status || "active",
      rating: tailor.rating ?? 0,
      joinedAt: tailor.joinedAt
        ? new Date(tailor.joinedAt).toISOString().split("T")[0]
        : "",
    });
  }, [tailor]);

  const createdAt = useMemo(() => formatDate(tailor?.createdAt), [tailor?.createdAt]);
  const updatedAt = useMemo(() => formatDate(tailor?.updatedAt), [tailor?.updatedAt]);

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

    const res = await updateTailor(id, {
      ...form,
      name: form.name.trim(),
      email: form.email.trim(),
      mobile: form.mobile.trim(),
    });

    if (res?.success) {
      toast.success("Tailor updated successfully");
    }
  };

  const handleDelete = async () => {
    const ok = window.confirm("Are you sure you want to delete this tailor?");
    if (!ok) return;

    const res = await deleteTailor(id);
    if (res?.success) {
      router.push("/design-lab/tailors");
    }
  };

  if (detailLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto ">
          <div className="mb-6 h-10 w-40 animate-pulse rounded-2xl bg-white" />
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mx-auto mb-4 h-20 w-20 animate-pulse rounded-3xl bg-gray-100" />
              <div className="mx-auto mb-3 h-5 w-40 animate-pulse rounded bg-gray-100" />
              <div className="mx-auto h-4 w-28 animate-pulse rounded bg-gray-100" />
              <div className="mt-6 space-y-3">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-12 animate-pulse rounded-2xl bg-gray-100" />
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-5 h-6 w-44 animate-pulse rounded bg-gray-100" />
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div key={item} className="h-20 animate-pulse rounded-2xl bg-gray-100" />
                ))}
              </div>
              <div className="mt-6 h-12 animate-pulse rounded-2xl bg-gray-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tailor) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
            <User className="h-6 w-6 text-gray-500" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Tailor not found</h1>
          <p className="mt-2 text-sm text-gray-500">
            The tailor you are looking for does not exist or was removed.
          </p>
          <Link
            href="/design-lab/tailors"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tailors
          </Link>
        </div>
      </div>
    );
  }

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
              Tailor Details
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              View and manage tailor profile from Design Lab.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete Tailor
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="bg-gradient-to-br from-black via-gray-900 to-gray-800 px-5 py-6 text-white">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 backdrop-blur">
                <User className="h-8 w-8" />
              </div>

              <h2 className="mt-4 text-xl font-semibold">{tailor.name || "-"}</h2>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium">
                  <Briefcase className="h-3.5 w-3.5" />
                  {labelize(tailor.type)}
                </span>

                <span
                  className={[
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                    tailor.status === "active"
                      ? "bg-emerald-400/15 text-emerald-200"
                      : "bg-gray-300/15 text-gray-200",
                  ].join(" ")}
                >
                  <Circle className="h-2.5 w-2.5 fill-current" />
                  {labelize(tailor.status)}
                </span>
              </div>
            </div>

            <div className="space-y-3 p-5">
              <InfoRow
                icon={Mail}
                label="Email"
                value={tailor.email || "-"}
              />
              <InfoRow
                icon={Phone}
                label="Mobile"
                value={tailor.mobile || "-"}
              />
              <InfoRow
                icon={Star}
                label="Rating"
                value={`${tailor.rating ?? 0} / 5`}
              />
              <InfoRow
                icon={CalendarDays}
                label="Joined"
                value={formatDate(tailor.joinedAt)}
              />
              <InfoRow
                icon={BadgeCheck}
                label="Created"
                value={createdAt}
              />
              <InfoRow
                icon={ShieldCheck}
                label="Updated"
                value={updatedAt}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
                  <Pencil className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Edit Tailor</h3>
                  <p className="text-sm text-gray-500">
                    Update details whenever required.
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

                <Field label="Status" icon={Circle}>
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
                  Save Changes
                </button>

                <Link
                  href="/design-lab/tailors"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to List
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
        <p className="truncate text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}