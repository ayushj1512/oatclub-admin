"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Search,
  X,
} from "lucide-react";

const safe = (v) => String(v ?? "").trim();

export default function FabricSelectDropdown({
  fabrics = [],
  value = "",
  onChange,
  placeholder = "Select fabric",
  disabled = false,
}) {
  const ref = useRef(null);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = useMemo(
    () =>
      fabrics.find(
        (fabric) =>
          String(fabric?._id) === String(value),
      ) || null,
    [fabrics, value],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return fabrics;

    return fabrics.filter((fabric) => {
      const name = safe(fabric?.name).toLowerCase();
      const code = safe(fabric?.code).toLowerCase();
      const category = safe(fabric?.category).toLowerCase();

      return (
        name.includes(q) ||
        code.includes(q) ||
        category.includes(q)
      );
    });
  }, [fabrics, search]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (
        ref.current &&
        !ref.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutside,
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handleOutside,
      );
  }, []);

  const selectFabric = (fabric) => {
    onChange?.(fabric);
    setOpen(false);
    setSearch("");
  };

  return (
    <div
      ref={ref}
      className="relative min-w-[280px]"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-full items-center gap-3 rounded-lg border border-zinc-200 bg-white px-2 text-left transition hover:border-zinc-300 disabled:opacity-50"
      >
        {selected ? (
          <>
            <img
              src={
                selected.imageLink ||
                "/placeholder.png"
              }
              alt={selected.name || ""}
              className="h-8 w-8 shrink-0 rounded-md border border-zinc-200 object-cover"
            />

            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-zinc-900">
                {selected.name}
              </div>

              <div className="font-mono text-[10px] text-zinc-500">
                {selected.code}
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange?.(null);
              }}
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            >
              <X size={13} />
            </button>
          </>
        ) : (
          <>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-100 text-zinc-400">
              <Search size={14} />
            </div>

            <span className="flex-1 text-sm text-zinc-400">
              {placeholder}
            </span>
          </>
        )}

        <ChevronDown
          size={15}
          className="shrink-0 text-zinc-400"
        />
      </button>

      {open && (
        <div className="absolute left-0 top-[52px] z-50 w-[380px] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
          <div className="border-b border-zinc-100 p-2">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />

              <input
                autoFocus
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search fabric name or code..."
                className="h-10 w-full rounded-lg border border-zinc-200 pl-9 pr-3 text-sm outline-none focus:border-zinc-400"
              />
            </div>
          </div>

          <div className="max-h-[320px] overflow-y-auto p-1">
            {!filtered.length ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-400">
                No fabric found
              </div>
            ) : (
              filtered.map((fabric) => {
                const active =
                  String(value) ===
                  String(fabric._id);

                return (
                  <button
                    key={fabric._id}
                    type="button"
                    onClick={() =>
                      selectFabric(fabric)
                    }
                    className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left ${active
                        ? "bg-zinc-100"
                        : "hover:bg-zinc-50"
                      }`}
                  >
                    <img
                      src={
                        fabric.imageLink ||
                        "/placeholder.png"
                      }
                      alt={fabric.name || ""}
                      className="h-11 w-11 shrink-0 rounded-lg border border-zinc-200 object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-zinc-900">
                          {fabric.name}
                        </span>

                        {active && (
                          <Check
                            size={14}
                            className="text-zinc-900"
                          />
                        )}
                      </div>

                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-500">
                        <span className="font-mono font-semibold">
                          {fabric.code}
                        </span>

                        <span>•</span>

                        <span>
                          {fabric.category || "—"}
                        </span>
                      </div>

                      <div className="mt-1 text-[10px] text-zinc-400">
                        Stock:{" "}
                        {Number(
                          fabric.currentStock || 0,
                        )}{" "}
                        {fabric.unit || ""}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
