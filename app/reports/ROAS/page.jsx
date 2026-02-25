// app/reports/ROAS/page.jsx
"use client";

import React from "react";
import ROASreport from "@/components/marketing/ROASreport";

export default function Page() {
  return (
    <div className="min-h-screen w-full bg-gray-50/60">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <ROASreport />
      </div>
    </div>
  );
}