"use client";

import { Construction, Sparkles } from "lucide-react";

export default function DesignLabPage() {
  return (
    <div className="min-h-screen bg-[#f5f5f5] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[80vh] max-w-4xl items-center justify-center">
        <div className="w-full rounded-[32px] border border-gray-200 bg-white p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-black text-white shadow-sm">
            <Construction className="h-9 w-9" />
          </div>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600">
            <Sparkles className="h-3.5 w-3.5" />
            Design Lab
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Dashboard is not working yet
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-500 sm:text-base">
            This section is under development right now. Design Lab dashboard
            will be available soon with tailor management, design workflow, job
            assignments, and more.
          </p>

          <div className="mt-8 inline-flex items-center rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white">
            Coming Soon
          </div>
        </div>
      </div>
    </div>
  );
}