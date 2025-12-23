"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

/* 🎨 Metric Colors */
const COLORS = {
  Views: "#2563eb",       // blue
  "Cart Adds": "#f97316", // orange
  Wishlist: "#ec4899",   // pink
  Purchases: "#16a34a",  // green
};

export default function ProductMetricsGraph({ data }) {
  /**
   * data example:
   * [
   *  { name: "Views", value: 1200 },
   *  { name: "Cart Adds", value: 430 },
   *  { name: "Wishlist", value: 210 },
   *  { name: "Purchases", value: 95 }
   * ]
   */

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-1">
        Engagement Overview
      </h3>
      <p className="text-xs text-gray-500 mb-4">
        Total interaction volume by event type
      </p>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              axisLine={false}
            />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              contentStyle={{
                backgroundColor: "#fff",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                fontSize: 12,
              }}
            />

            <Bar
              dataKey="value"
              radius={[10, 10, 0, 0]}
              maxBarSize={70}
            >
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={COLORS[entry.name] || "#94a3b8"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
