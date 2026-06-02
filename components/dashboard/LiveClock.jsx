"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const TIMEZONE = "Asia/Kolkata";

function formatParts(date) {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const hour = parts.find((p) => p.type === "hour")?.value || "00";
  const minute = parts.find((p) => p.type === "minute")?.value || "00";
  const second = parts.find((p) => p.type === "second")?.value || "00";
  const dayPeriod = parts.find((p) => p.type === "dayPeriod")?.value || "";

  const day = new Intl.DateTimeFormat("en-IN", {
    timeZone: TIMEZONE,
    weekday: "short",
  }).format(date);

  const fullDate = new Intl.DateTimeFormat("en-IN", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "short",
  }).format(date);

  const hour24 = Number(
    new Intl.DateTimeFormat("en-IN", {
      timeZone: TIMEZONE,
      hour: "2-digit",
      hour12: false,
    }).format(date)
  );

  const greeting =
    hour24 < 12 ? "Morning" : hour24 < 17 ? "Afternoon" : "Evening";

  return { hour, minute, second, dayPeriod, day, fullDate, greeting };
}

export default function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { hour, minute, second, dayPeriod, day, fullDate, greeting } =
    useMemo(() => formatParts(now), [now]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="flex items-center gap-3  bg-white px-4 py-3 ]"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center bg-zinc-50 text-zinc-700">
        <Clock3 size={17} />
      </span>

      <div className="min-w-0">
        <div className="flex items-end gap-1.5 font-semibold leading-none tracking-tight text-zinc-950">
          <span className="text-[26px]">{hour}</span>
          <span className="pb-0.5 text-zinc-400">:</span>
          <span className="text-[26px]">{minute}</span>
          <span className="pb-0.5 text-zinc-400">:</span>
          <span className="relative inline-flex w-[2ch] justify-center text-[22px] text-zinc-500">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={second}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                {second}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className="pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {dayPeriod}
          </span>
        </div>

        <p className="mt-1 text-[11px] font-medium text-zinc-500">
          Good {greeting} / {day}, {fullDate} / IST
        </p>
      </div>
    </motion.div>
  );
}
