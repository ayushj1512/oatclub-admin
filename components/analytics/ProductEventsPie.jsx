"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const COLORS = [
  "#2563eb", // views
  "#f97316", // cart
  "#ec4899", // wishlist
  "#16a34a", // purchases
];

export default function ProductEventsPie({ data }) {
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
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Event Distribution
      </h3>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={4}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>

            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 space-y-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[i] }}
              />
              <span className="text-gray-700">{d.name}</span>
            </div>
            <span className="font-semibold text-gray-900">
              {d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
