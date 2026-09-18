"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Camera,
  CircleAlert,
  Clock3,
  FolderOpen,
  HardDrive,
  Loader2,
  MonitorCog,
  PackageCheck,
  RefreshCcw,
  RotateCcw,
  Video,
} from "lucide-react";

import { usePackagingEvidenceStore } from "@/store/packagingEvidenceStore";

const formatBytes = (value = 0) => {
  const bytes = Number(value) || 0;

  if (!bytes) return "0 MB";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  const size = bytes / 1024 ** unitIndex;

  return `${size.toFixed(unitIndex >= 3 ? 2 : 1)} ${units[unitIndex]}`;
};

const formatDuration = (value = 0) => {
  const seconds = Math.max(0, Number(value) || 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
};

const StatCard = ({
  label,
  value,
  helper,
  icon: Icon,
  iconClassName = "bg-zinc-950 text-white",
}) => (
  <article className="rounded-3xl bg-white p-5 shadow-[0_16px_45px_rgba(9,9,11,0.04)]">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">
          {label}
        </p>

        <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
          {value}
        </p>

        <p className="mt-1 text-xs text-zinc-500">
          {helper}
        </p>
      </div>

      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClassName}`}
      >
        <Icon size={19} />
      </div>
    </div>
  </article>
);

const ActionCard = ({
  title,
  description,
  buttonLabel,
  icon: Icon,
  onClick,
  featured = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`group w-full rounded-3xl p-5 text-left shadow-[0_16px_45px_rgba(9,9,11,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(9,9,11,0.08)] ${featured
        ? "bg-zinc-950 text-white"
        : "bg-white text-zinc-950"
      }`}
  >
    <div className="flex items-start justify-between gap-5">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${featured
            ? "bg-white/10 text-white"
            : "bg-zinc-100 text-zinc-950"
          }`}
      >
        <Icon size={21} />
      </div>

      <ArrowRight
        size={18}
        className={`transition group-hover:translate-x-1 ${featured ? "text-white/60" : "text-zinc-400"
          }`}
      />
    </div>

    <h2 className="mt-6 text-lg font-semibold">
      {title}
    </h2>

    <p
      className={`mt-2 max-w-sm text-sm leading-6 ${featured ? "text-white/60" : "text-zinc-500"
        }`}
    >
      {description}
    </p>

    <div
      className={`mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] ${featured ? "text-white" : "text-zinc-700"
        }`}
    >
      {buttonLabel}
      <ArrowRight size={14} />
    </div>
  </button>
);

export default function PackagingEvidenceDashboard() {
  const router = useRouter();

  const {
    stats,
    loadingStats,
    error,
    fetchStats,
    clearMessages,
  } = usePackagingEvidenceStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const summary = stats?.summary || {};

  const stationCount = useMemo(
    () => stats?.stations?.length || 0,
    [stats?.stations],
  );

  const refresh = async () => {
    clearMessages();
    await fetchStats();
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        {/* HEADER */}

        <header className="rounded-[32px] bg-white px-5 py-6 shadow-[0_18px_60px_rgba(9,9,11,0.04)] sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-zinc-950 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                  OATCLUB Operations
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Backend connected
                </span>
              </div>

              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
                Packaging Evidence
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                Record forward packing and RTO opening videos,
                track their local storage location and preserve
                proof against courier theft or parcel disputes.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={refresh}
                disabled={loadingStats}
                className="inline-flex items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingStats ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <RefreshCcw size={16} />
                )}

                Refresh
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/packaging-evidence/setup",
                  )
                }
                className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                <MonitorCog size={16} />
                Station Setup
              </button>
            </div>
          </div>
        </header>

        {/* ERROR */}

        {error ? (
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <CircleAlert
              size={18}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-medium">
                Unable to load evidence dashboard
              </p>

              <p className="mt-0.5 text-xs text-red-600">
                {error}
              </p>
            </div>
          </div>
        ) : null}

        {/* STATS */}

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Evidence"
            value={summary.total || 0}
            helper="All recorded evidence"
            icon={Video}
          />

          <StatCard
            label="Forward Videos"
            value={summary.forward || 0}
            helper="Warehouse to customer"
            icon={PackageCheck}
            iconClassName="bg-emerald-100 text-emerald-700"
          />

          <StatCard
            label="RTO Videos"
            value={summary.rto || 0}
            helper="Returned parcel opening"
            icon={RotateCcw}
            iconClassName="bg-amber-100 text-amber-700"
          />

          <StatCard
            label="Local Stations"
            value={stationCount}
            helper={formatBytes(
              summary.totalSizeBytes || 0,
            )}
            icon={HardDrive}
            iconClassName="bg-blue-100 text-blue-700"
          />
        </section>

        {/* PRIMARY ACTIONS */}

        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          <ActionCard
            featured
            title="Record Forward Packing"
            description="Load an order, verify its products and record the complete packing and sealing process."
            buttonLabel="Start forward recording"
            icon={Camera}
            onClick={() =>
              router.push(
                "/packaging-evidence/record?type=forward",
              )
            }
          />

          <ActionCard
            title="Record RTO Opening"
            description="Record the parcel label, external condition, seal and every returned product while opening it."
            buttonLabel="Start RTO recording"
            icon={RotateCcw}
            onClick={() =>
              router.push(
                "/packaging-evidence/record?type=rto",
              )
            }
          />
        </section>

        {/* SECONDARY ACTIONS */}

        <section className="mt-5 grid gap-4 lg:grid-cols-3">
          <ActionCard
            title="Evidence Directory"
            description="Search evidence by order, AWB, recording type, station and status."
            buttonLabel="Browse evidence"
            icon={FolderOpen}
            onClick={() =>
              router.push(
                "/packaging-evidence/directory",
              )
            }
          />

          <ActionCard
            title="Station Setup"
            description="Configure this computer, select its storage directory and test the webcam."
            buttonLabel="Configure this PC"
            icon={MonitorCog}
            onClick={() =>
              router.push(
                "/packaging-evidence/setup",
              )
            }
          />

          <article className="rounded-3xl bg-white p-5 shadow-[0_16px_45px_rgba(9,9,11,0.04)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Clock3 size={21} />
            </div>

            <h2 className="mt-6 text-lg font-semibold text-zinc-950">
              Recording Summary
            </h2>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3">
                <span className="text-sm text-zinc-500">
                  Total recorded time
                </span>

                <span className="text-sm font-semibold text-zinc-950">
                  {formatDuration(
                    summary.totalDurationSeconds || 0,
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3">
                <span className="text-sm text-zinc-500">
                  Evidence storage
                </span>

                <span className="text-sm font-semibold text-zinc-950">
                  {formatBytes(
                    summary.totalSizeBytes || 0,
                  )}
                </span>
              </div>
            </div>
          </article>
        </section>

        {/* REGISTERED STATIONS */}

        <section className="mt-5 rounded-[30px] bg-white p-5 shadow-[0_16px_45px_rgba(9,9,11,0.04)] sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">
                Recording Stations
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Computers that have registered evidence
                recordings.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/packaging-evidence/setup",
                )
              }
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700"
            >
              <MonitorCog size={16} />
              Configure this computer
            </button>
          </div>

          {loadingStats ? (
            <div className="flex min-h-32 items-center justify-center">
              <Loader2
                size={24}
                className="animate-spin text-zinc-400"
              />
            </div>
          ) : stats?.stations?.length ? (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {stats.stations.map((station) => (
                <div
                  key={station.stationName}
                  className="rounded-2xl bg-zinc-50 px-4 py-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-zinc-700 shadow-sm">
                      <HardDrive size={17} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-950">
                        {station.stationName ||
                          "Unknown station"}
                      </p>

                      <p className="mt-0.5 text-xs text-zinc-500">
                        {station.total || 0} recordings
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-zinc-400">
                    Last recording:{" "}
                    {station.lastRecordingAt
                      ? new Date(
                        station.lastRecordingAt,
                      ).toLocaleString("en-IN")
                      : "Never"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-zinc-50 px-5 py-8 text-center">
              <HardDrive
                size={26}
                className="mx-auto text-zinc-300"
              />

              <p className="mt-3 text-sm font-medium text-zinc-700">
                No recording stations found
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Configure a station and save the first
                evidence video.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
