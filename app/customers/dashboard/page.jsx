"use client";

import { useEffect, useState } from "react";
import { Users, Mail, CheckCircle, Bell } from "lucide-react";

export default function CustomersPage() {
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [stats, setStats] = useState({
    totalSubscribers: 0,
    verifiedSubscribers: 0,
    activeSubscribers: 0,
    totalCustomers: 0, // for future API integration
    loading: true,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch(`${API}/api/newsletters/subscribers`);
        const data = await res.json();

        if (Array.isArray(data)) {
          const total = data.length;
          const verified = data.filter((s) => s.isVerified).length;
          const active = data.filter((s) => s.isActive).length;

          setStats({
            totalSubscribers: total,
            verifiedSubscribers: verified,
            activeSubscribers: active,
            totalCustomers: 0, // you can update this later
            loading: false,
          });
        }
      } catch (error) {
        console.error("Dashboard Stats Fetch Error:", error);
        setStats((p) => ({ ...p, loading: false }));
      }
    }

    loadStats();
  }, [API]);

  if (stats.loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Customers</h1>
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-6 w-full max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-blue-700">Customers Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Total Customers */}
        <div className="bg-white p-5 rounded-xl shadow hover:shadow-lg transition border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Customers</p>
              <h2 className="text-2xl font-bold mt-1">{stats.totalCustomers}</h2>
            </div>
            <Users className="w-10 h-10 text-blue-600 opacity-80" />
          </div>
        </div>

        {/* Total Newsletter Subscribers */}
        <div className="bg-white p-5 rounded-xl shadow hover:shadow-lg transition border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Newsletter Subscribers</p>
              <h2 className="text-2xl font-bold mt-1">{stats.totalSubscribers}</h2>
            </div>
            <Mail className="w-10 h-10 text-blue-600 opacity-80" />
          </div>
        </div>

        {/* Verified Subscribers */}
        <div className="bg-white p-5 rounded-xl shadow hover:shadow-lg transition border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Verified Subscribers</p>
              <h2 className="text-2xl font-bold mt-1">{stats.verifiedSubscribers}</h2>
            </div>
            <CheckCircle className="w-10 h-10 text-green-600 opacity-80" />
          </div>
        </div>

        {/* Active Subscribers */}
        <div className="bg-white p-5 rounded-xl shadow hover:shadow-lg transition border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Active Subscribers</p>
              <h2 className="text-2xl font-bold mt-1">{stats.activeSubscribers}</h2>
            </div>
            <Bell className="w-10 h-10 text-yellow-600 opacity-80" />
          </div>
        </div>

      </div>
    </div>
  );
}
