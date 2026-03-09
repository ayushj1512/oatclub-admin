"use client";

import React from "react";
import OverallSalesAnalytics from "@/components/accounts/OverallSalesAnalytics";

const currentMonthKey = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

export default function AccountsPage() {
  return (
    <div className="min-h-screen bg-white text-black">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Accounts</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Overview of sales analytics for the selected month.
          </p>
        </div>

        <OverallSalesAnalytics
          month={currentMonthKey()}
          search=""
          title="Overall Sales Analytics"
          subtitle="Overall matched delivered-order data for the current month"
        />
      </div>
    </div>
  );
}