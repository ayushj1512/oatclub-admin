"use client";

import { useMemo } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  History,
  IndianRupee,
  TrendingDown,
} from "lucide-react";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

export default function ProductPriceHistory({
  priceLogs = [],
  currentPrice = 0,
}) {
  const data = useMemo(() => {
    const logs = Array.isArray(priceLogs)
      ? [...priceLogs]
        .filter(
          (log) =>
            Number.isFinite(
              Number(log?.oldPrice),
            ) &&
            Number.isFinite(
              Number(log?.newPrice),
            ),
        )
        .sort(
          (a, b) =>
            new Date(a?.changedAt || 0) -
            new Date(b?.changedAt || 0),
        )
      : [];

    if (!logs.length) {
      return {
        logs: [],
        points: [],
        latest: null,
        totalDrops: 0,
        biggestDrop: 0,
      };
    }

    const firstLog = logs[0];

    const points = [
      {
        price: Number(firstLog.oldPrice),
        date: firstLog.changedAt,
      },

      ...logs.map((log) => ({
        price: Number(log.newPrice),
        date: log.changedAt,
      })),
    ];

    const drops = logs.filter(
      (log) =>
        Number(log.oldPrice) >
        Number(log.newPrice),
    );

    return {
      logs,
      points,

      latest:
        logs[logs.length - 1] || null,

      totalDrops: drops.length,

      biggestDrop: drops.reduce(
        (largest, log) =>
          Math.max(
            largest,
            Number(log.oldPrice) -
            Number(log.newPrice),
          ),
        0,
      ),
    };
  }, [priceLogs]);

  if (!data.logs.length) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-gray-100">
            <History
              size={18}
              className="text-gray-500"
            />
          </div>

          <div>
            <h2 className="font-semibold text-gray-900">
              Price history
            </h2>

            <p className="text-xs text-gray-500">
              No price changes recorded yet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const latestDrop =
    Number(data.latest?.oldPrice) >
    Number(data.latest?.newPrice);

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900">
            Price history
          </h2>

          <p className="mt-0.5 text-xs text-gray-500">
            Complete product price movement
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-900">
          <IndianRupee size={14} />
          {money(currentPrice)}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard
          label="Current price"
          value={`₹${money(currentPrice)}`}
        />

        <SummaryCard
          label="Total changes"
          value={data.logs.length}
        />

        <SummaryCard
          label="Price drops"
          value={data.totalDrops}
        />

        <SummaryCard
          label="Biggest drop"
          value={`₹${money(data.biggestDrop)}`}
          green
        />
      </div>

      {/* Graph */}
      <PriceGraph
        points={data.points}
      />

      {/* Latest movement */}
      <div
        className={`flex items-center justify-between gap-3 rounded-xl p-3 ${latestDrop
            ? "bg-emerald-50"
            : "bg-amber-50"
          }`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`grid size-9 place-items-center rounded-lg ${latestDrop
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
              }`}
          >
            {latestDrop ? (
              <ArrowDownRight size={18} />
            ) : (
              <ArrowUpRight size={18} />
            )}
          </div>

          <div>
            <p className="text-xs text-gray-500">
              Latest change
            </p>

            <p className="text-sm font-semibold text-gray-900">
              ₹{money(data.latest.oldPrice)}
              {" → "}
              ₹{money(data.latest.newPrice)}
            </p>
          </div>
        </div>

        <p
          className={`text-sm font-bold ${latestDrop
              ? "text-emerald-700"
              : "text-amber-700"
            }`}
        >
          {latestDrop ? "−" : "+"}₹
          {money(
            Math.abs(
              Number(data.latest.oldPrice) -
              Number(data.latest.newPrice),
            ),
          )}
        </p>
      </div>

      {/* Logs */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <History size={16} />

          <h3 className="text-sm font-semibold text-gray-900">
            Change logs
          </h3>
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {[...data.logs]
            .reverse()
            .map((log, index) => {
              const dropped =
                Number(log.oldPrice) >
                Number(log.newPrice);

              const difference = Math.abs(
                Number(log.oldPrice) -
                Number(log.newPrice),
              );

              return (
                <div
                  key={
                    log._id ||
                    `${log.changedAt}-${index}`
                  }
                  className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`grid size-9 shrink-0 place-items-center rounded-lg ${dropped
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                        }`}
                    >
                      {dropped ? (
                        <TrendingDown size={17} />
                      ) : (
                        <ArrowUpRight size={17} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        ₹{money(log.oldPrice)}
                        {" → "}
                        ₹{money(log.newPrice)}
                      </p>

                      <p className="truncate text-[11px] text-gray-500">
                        {formatDate(log.changedAt)}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${dropped
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                      }`}
                  >
                    {dropped ? "−" : "+"}₹
                    {money(difference)}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  green = false,
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p
        className={`mt-1 text-lg font-bold ${green
            ? "text-emerald-700"
            : "text-gray-900"
          }`}
      >
        {value}
      </p>
    </div>
  );
}

function PriceGraph({ points = [] }) {
  if (points.length < 2) return null;

  const width = 700;
  const height = 230;
  const paddingX = 42;
  const paddingY = 30;

  const prices = points.map(
    (point) => Number(point.price),
  );

  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);
  const difference =
    maximum - minimum || 1;

  const coordinates = points.map(
    (point, index) => {
      const x =
        paddingX +
        (index /
          Math.max(
            points.length - 1,
            1,
          )) *
        (width - paddingX * 2);

      const y =
        height -
        paddingY -
        ((Number(point.price) -
          minimum) /
          difference) *
        (height - paddingY * 2);

      return {
        ...point,
        x,
        y,
      };
    },
  );

  const line = coordinates
    .map(
      (point) =>
        `${point.x},${point.y}`,
    )
    .join(" ");

  const area = [
    `${coordinates[0].x},${height - paddingY}`,
    ...coordinates.map(
      (point) =>
        `${point.x},${point.y}`,
    ),
    `${coordinates[
      coordinates.length - 1
    ].x},${height - paddingY}`,
  ].join(" ");

  return (
    <div className="rounded-xl bg-gray-950 p-3 md:p-4">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">
            Price trend
          </p>

          <p className="text-[11px] text-gray-400">
            Oldest to latest
          </p>
        </div>

        <div className="text-right">
          <p className="text-[11px] text-gray-400">
            Range
          </p>

          <p className="text-xs font-semibold text-white">
            ₹{money(minimum)} – ₹
            {money(maximum)}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-56 min-w-[560px] w-full"
          role="img"
          aria-label="Product price history graph"
        >
          <defs>
            <linearGradient
              id="price-area"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#34d399"
                stopOpacity="0.32"
              />

              <stop
                offset="100%"
                stopColor="#34d399"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>

          {[0, 1, 2, 3].map(
            (row) => {
              const y =
                paddingY +
                (row / 3) *
                (height -
                  paddingY * 2);

              return (
                <line
                  key={row}
                  x1={paddingX}
                  y1={y}
                  x2={
                    width - paddingX
                  }
                  y2={y}
                  stroke="#374151"
                  strokeWidth="1"
                  strokeDasharray="5 6"
                />
              );
            },
          )}

          <polygon
            points={area}
            fill="url(#price-area)"
          />

          <polyline
            points={line}
            fill="none"
            stroke="#34d399"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {coordinates.map(
            (point, index) => (
              <g key={index}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="6"
                  fill="#111827"
                  stroke="#34d399"
                  strokeWidth="3"
                />

                <text
                  x={point.x}
                  y={point.y - 13}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="600"
                >
                  ₹{money(point.price)}
                </text>
              </g>
            ),
          )}
        </svg>
      </div>
    </div>
  );
}
