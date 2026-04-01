"use client";

import Link from "next/link";
import {
  Plus,
  Search,
  Users,
  BarChart3,
  ArrowRight,
  LayoutDashboard,
} from "lucide-react";

const cardClass =
  "rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md";

const quickLinks = [
  {
    title: "Add Influencer",
    description: "Create a new influencer collaboration entry.",
    href: "/infleuncer-collaboration/add",
    icon: Plus,
  },
  {
    title: "All Influencers",
    description: "View and manage all influencer records.",
    href: "/infleuncer-collaboration/all",
    icon: Users,
  },
  {
    title: "Search Influencer",
    description: "Search by code, name, or mobile number.",
    href: "/infleuncer-collaboration/search",
    icon: Search,
  },
  {
    title: "Analytics",
    description: "Check reach, status, and collaboration insights.",
    href: "/infleuncer-collaboration/analytics",
    icon: BarChart3,
  },
];

export default function InfluencerCollaborationProgramPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="px-4 py-5 md:px-6 lg:px-8">
        <div className="mb-5 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-neutral-100 p-3">
              <LayoutDashboard className="h-6 w-6 text-neutral-700" />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                Influencer Collaboration Program
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                Simple admin dashboard to manage influencer collaborations.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Module
            </p>
            <p className="mt-2 text-lg font-semibold text-neutral-900">
              Influencer Program
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Actions
            </p>
            <p className="mt-2 text-lg font-semibold text-neutral-900">
              Add • Search • View
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Tracking
            </p>
            <p className="mt-2 text-lg font-semibold text-neutral-900">
              Status • Reach • Type
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Admin
            </p>
            <p className="mt-2 text-lg font-semibold text-neutral-900">
              Internal Dashboard
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link key={item.title} href={item.href} className={cardClass}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="rounded-2xl bg-neutral-100 p-3">
                    <Icon className="h-5 w-5 text-neutral-700" />
                  </div>

                  <ArrowRight className="h-5 w-5 text-neutral-400" />
                </div>

                <h2 className="text-lg font-semibold text-neutral-900">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  {item.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}