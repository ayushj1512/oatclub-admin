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
    <section className="w-full rounded-2xl border border-[#800020]/10 bg-white px-4 py-4 shadow-sm">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="mx-auto w-full max-w-sm rounded-2xl border border-[#800020]/10 bg-gradient-to-b from-white via-white to-[#fff7f8] p-4 shadow-[0_16px_40px_rgba(128,0,32,0.06)]"
      >
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#800020]/8 px-2.5 py-1 text-[11px] font-medium text-[#800020]">
            <Clock3 size={13} />
            <span>IST</span>
          </div>

          <button
            type="button"
            onClick={pickQuote}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#800020]/10 bg-white text-gray-500 transition-all hover:border-[#800020]/20 hover:bg-[#800020]/5 hover:text-[#800020]"
            aria-label="Refresh quote"
          >
            <RefreshCw size={13} />
          </button>
        </div>

        <div className="mt-4 flex items-end justify-center gap-1 text-[30px] font-semibold leading-none tracking-tight text-gray-950 sm:text-[32px]">
          <span>{hour}</span>
          <span className="text-[#800020]">:</span>
          <span>{minute}</span>
          <span className="text-[#800020]">:</span>

          <span className="relative inline-flex w-[2ch] justify-center text-[#800020]">
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

          <span className="ml-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#800020]">
            {dayPeriod}
          </span>
        </div>

        <div className="mt-2 text-center">
          <p className="text-[12px] font-medium text-gray-800">
            Good {greeting}
          </p>
          <p className="mt-0.5 text-[11px] text-gray-500">
            {day}, {fullDate}
          </p>
        </div>

        <div className="mt-4 border-t border-[#800020]/10 pt-3">
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