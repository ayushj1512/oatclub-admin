"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TIMEZONE = "Asia/Kolkata";

const QUOTES = [
  "Small progress every day beats big plans someday.",
  "Discipline turns goals into results.",
  "Win the day. Repeat.",
  "Action creates clarity.",
];

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
  const [quote, setQuote] = useState(QUOTES[0]);
  const lastIndex = useRef(-1);

  const pickQuote = () => {
    let i = Math.floor(Math.random() * QUOTES.length);
    if (i === lastIndex.current) i = (i + 1) % QUOTES.length;
    lastIndex.current = i;
    setQuote(QUOTES[i]);
  };

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    pickQuote();
    const timer = setInterval(pickQuote, 10000);
    return () => clearInterval(timer);
  }, []);

  const { hour, minute, second, dayPeriod, day, fullDate, greeting } =
    useMemo(() => formatParts(now), [now]);

  return (
    <section className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="mx-auto w-full max-w-sm rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-gray-50/70 p-4"
      >
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-600">
            <Clock3 size={13} />
            <span>IST</span>
          </div>

          <button
            type="button"
            onClick={pickQuote}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
          >
            <RefreshCw size={13} />
          </button>
        </div>

        <div className="mt-4 flex items-end justify-center gap-1 text-[30px] font-semibold leading-none tracking-tight text-gray-950 sm:text-[32px]">
          <span>{hour}</span>
          <span className="text-blue-600">:</span>
          <span>{minute}</span>
          <span className="text-blue-600">:</span>

          <span className="relative inline-flex w-[2ch] justify-center text-blue-600">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={second}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
              >
                {second}
              </motion.span>
            </AnimatePresence>
          </span>

          <span className="ml-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-600">
            {dayPeriod}
          </span>
        </div>

        <div className="mt-2 text-center">
          <p className="text-[12px] font-medium text-gray-700">
            Good {greeting}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-500">
            {day}, {fullDate}
          </p>
        </div>

        <div className="mt-4 border-t border-gray-200/80 pt-3">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={quote}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="text-center text-[11px] leading-relaxed text-gray-500"
            >
              “{quote}”
            </motion.p>
          </AnimatePresence>
        </div>
      </motion.div>
    </section>
  );
}