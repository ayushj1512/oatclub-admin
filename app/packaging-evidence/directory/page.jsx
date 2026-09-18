"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  FileVideo,
  FolderOpen,
  HardDrive,
  Loader2,
  Monitor,
  Play,
  RefreshCcw,
  RotateCcw,
  Search,
  Video,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

import { usePackagingEvidenceStore } from "@/store/packagingEvidenceStore";

const HELPER_URL = (
  process.env.NEXT_PUBLIC_EVIDENCE_HELPER_URL ||
  "http://127.0.0.1:4782"
).replace(/\/$/, "");

const formatBytes = (value = 0) => {
  const bytes = Number(value) || 0;

  if (!bytes) return "0 MB";

  const units = ["B", "KB", "MB", "GB", "TB"];

  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  return `${(bytes / 1024 ** index).toFixed(
    index >= 3 ? 2 : 1,
  )} ${units[index]}`;
};

const formatDuration = (value = 0) => {
  const totalSeconds = Math.max(
    0,
    Number(value) || 0,
  );

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    seconds,
  ).padStart(2, "0")}`;
};

const normalizePath = (value = "") =>
  String(value || "")
    .trim()
    .replace(/\//g, "\\")
    .toLowerCase();

const readHelperJson = async (
  path,
  options = {},
) => {
  const response = await fetch(`${HELPER_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload?.message ||
      `Evidence Helper error (${response.status})`,
    );
  }

  return payload;
};

const TypeBadge = ({ type }) => {
  const isRto = type === "rto";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${isRto
          ? "bg-amber-50 text-amber-700"
          : "bg-emerald-50 text-emerald-700"
        }`}
    >
      {isRto ? (
        <RotateCcw size={12} />
      ) : (
        <Video size={12} />
      )}

      {isRto ? "RTO" : "Forward"}
    </span>
  );
};

const AvailabilityBadge = ({
  available,
  sameStation,
}) => {
  if (available) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Available locally
      </span>
    );
  }

  if (!sameStation) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
        <Monitor size={12} />
        Another station
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
      <CircleAlert size={12} />
      Missing locally
    </span>
  );
};

const VideoModal = ({
  file,
  evidence,
  onClose,
}) => {
  if (!file) return null;

  const streamUrl =
    file.streamUrl ||
    `${HELPER_URL}/stream/${encodeURIComponent(
      file.id || file.videoId,
    )}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">
              Packaging Evidence
            </p>

            <h2 className="mt-1 truncate font-semibold text-zinc-950">
              Order #{evidence?.orderNumber}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="aspect-video bg-black">
          <video
            src={streamUrl}
            controls
            autoPlay
            playsInline
            className="h-full w-full object-contain"
          />
        </div>

        <div className="grid gap-3 px-5 py-4 sm:grid-cols-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
              File
            </p>

            <p className="mt-1 truncate text-sm font-medium text-zinc-800">
              {file.fileName ||
                evidence?.storage?.fileName}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
              Station
            </p>

            <p className="mt-1 text-sm font-medium text-zinc-800">
              {evidence?.station?.stationName || "—"}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
              Recorded
            </p>

            <p className="mt-1 text-sm font-medium text-zinc-800">
              {evidence?.recordedAt
                ? new Date(
                  evidence.recordedAt,
                ).toLocaleString("en-IN")
                : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function EvidenceDirectoryPage() {
  const router = useRouter();

  const {
    evidenceList,
    pagination,
    filters,
    loadingList,
    error,
    setFilters,
    resetFilters,
    fetchEvidenceList,
    clearMessages,
  } = usePackagingEvidenceStore();

  const [helperConnected, setHelperConnected] =
    useState(false);

  const [checkingLocal, setCheckingLocal] =
    useState(true);

  const [localFiles, setLocalFiles] = useState([]);
  const [stationConfig, setStationConfig] =
    useState(null);

  const [selectedLocalFile, setSelectedLocalFile] =
    useState(null);

  const [selectedEvidence, setSelectedEvidence] =
    useState(null);

  const [localError, setLocalError] = useState("");

  const loadLocalFiles = useCallback(async () => {
    setCheckingLocal(true);
    setLocalError("");

    try {
      await readHelperJson("/api/health");

      const [configResponse, filesResponse] =
        await Promise.all([
          readHelperJson("/api/config"),
          readHelperJson("/apivideos"),
        ]);

      setStationConfig(
        configResponse?.data ||
        configResponse?.config ||
        null,
      );

      setLocalFiles(
        filesResponse?.data ||
        filesResponse?.videos ||
        [],
      );

      setHelperConnected(true);
    } catch (helperError) {
      setHelperConnected(false);
      setLocalFiles([]);
      setStationConfig(null);

      setLocalError(
        "Local helper is offline. Backend records are still available.",
      );
    } finally {
      setCheckingLocal(false);
    }
  }, []);

  useEffect(() => {
    clearMessages();

    fetchEvidenceList({
      page: 1,
      limit: 20,
    });

    loadLocalFiles();
  }, [
    clearMessages,
    fetchEvidenceList,
    loadLocalFiles,
  ]);

  const localFileMap = useMemo(() => {
    const map = new Map();

    localFiles.forEach((file) => {
      const relativePath = normalizePath(
        file.relativePath,
      );

      const fileName = String(
        file.fileName || "",
      ).toLowerCase();

      if (relativePath) {
        map.set(`path:${relativePath}`, file);
      }

      if (fileName) {
        map.set(`file:${fileName}`, file);
      }
    });

    return map;
  }, [localFiles]);

  const findLocalFile = (evidence) => {
    const relativePath = normalizePath(
      evidence?.storage?.relativePath,
    );

    const fileName = String(
      evidence?.storage?.fileName || "",
    ).toLowerCase();

    return (
      localFileMap.get(`path:${relativePath}`) ||
      localFileMap.get(`file:${fileName}`) ||
      null
    );
  };

  const applyFilters = async (event) => {
    event.preventDefault();

    await fetchEvidenceList({
      page: 1,
      filters,
    });
  };

  const clearFilters = async () => {
    resetFilters();

    await fetchEvidenceList({
      page: 1,
      filters: {
        orderNumber: "",
        awb: "",
        evidenceType: "",
        stationName: "",
        status: "",
      },
    });
  };

  const refreshAll = async () => {
    await Promise.all([
      fetchEvidenceList({
        page: pagination.page || 1,
      }),
      loadLocalFiles(),
    ]);
  };

  const changePage = async (page) => {
    if (
      page < 1 ||
      page > pagination.totalPages ||
      page === pagination.page
    ) {
      return;
    }

    await fetchEvidenceList({
      page,
    });
  };

  const openFolder = async (evidence) => {
    try {
      await readHelperJson("/open-folder", {
        method: "POST",
        body: JSON.stringify({
          orderNumber: evidence.orderNumber,
          relativePath:
            evidence.storage?.relativePath,
        }),
      });
    } catch (folderError) {
      setLocalError(
        folderError?.message ||
        "Unable to open evidence folder.",
      );
    }
  };

  const playVideo = (evidence, localFile) => {
    setSelectedEvidence(evidence);
    setSelectedLocalFile(localFile);
  };

  const currentStation =
    stationConfig?.stationName || "";

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        {/* HEADER */}

        <header className="rounded-[30px] bg-white px-5 py-6 shadow-[0_18px_55px_rgba(9,9,11,0.04)] sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/packaging-evidence",
                  )
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700"
              >
                <ArrowLeft size={18} />
              </button>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Packaging Evidence
                </p>

                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
                  Evidence Directory
                </h1>

                <p className="mt-1 text-sm text-zinc-500">
                  Search backend records and play videos
                  available on this computer.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {checkingLocal ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-2 text-xs text-zinc-600">
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                  Scanning local files
                </span>
              ) : (
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${helperConnected
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                    }`}
                >
                  {helperConnected ? (
                    <Wifi size={14} />
                  ) : (
                    <WifiOff size={14} />
                  )}

                  {helperConnected
                    ? currentStation ||
                    "Local helper connected"
                    : "Local helper offline"}
                </span>
              )}

              <button
                type="button"
                onClick={refreshAll}
                disabled={
                  loadingList || checkingLocal
                }
                className="inline-flex items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-700 disabled:opacity-40"
              >
                <RefreshCcw
                  size={15}
                  className={
                    loadingList || checkingLocal
                      ? "animate-spin"
                      : ""
                  }
                />
                Refresh
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/packaging-evidence/record?type=forward",
                  )
                }
                className="rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white"
              >
                Record Evidence
              </button>
            </div>
          </div>
        </header>

        {/* ALERTS */}

        {(error || localError) && (
          <div className="mt-4 flex gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-amber-800">
            <CircleAlert
              size={18}
              className="mt-0.5 shrink-0"
            />

            <p className="text-sm">
              {error || localError}
            </p>
          </div>
        )}

        {/* SUMMARY */}

        <section className="mt-5 grid gap-4 sm:grid-cols-3">
          <article className="rounded-3xl bg-white p-5 shadow-[0_16px_45px_rgba(9,9,11,0.04)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                <FileVideo size={19} />
              </div>

              <div>
                <p className="text-xs text-zinc-500">
                  Backend records
                </p>

                <p className="text-xl font-semibold text-zinc-950">
                  {pagination.total || 0}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-3xl bg-white p-5 shadow-[0_16px_45px_rgba(9,9,11,0.04)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <HardDrive size={19} />
              </div>

              <div>
                <p className="text-xs text-zinc-500">
                  Local files
                </p>

                <p className="text-xl font-semibold text-zinc-950">
                  {localFiles.length}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-3xl bg-white p-5 shadow-[0_16px_45px_rgba(9,9,11,0.04)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Monitor size={19} />
              </div>

              <div className="min-w-0">
                <p className="text-xs text-zinc-500">
                  Current station
                </p>

                <p className="truncate text-sm font-semibold text-zinc-950">
                  {currentStation || "Not connected"}
                </p>
              </div>
            </div>
          </article>
        </section>

        {/* FILTERS */}

        <form
          onSubmit={applyFilters}
          className="mt-5 rounded-[28px] bg-white p-5 shadow-[0_16px_45px_rgba(9,9,11,0.04)]"
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_180px_190px_150px_auto]">
            <input
              value={filters.orderNumber}
              onChange={(event) =>
                setFilters({
                  orderNumber:
                    event.target.value.toUpperCase(),
                })
              }
              placeholder="Order number"
              className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-zinc-300"
            />

            <input
              value={filters.awb}
              onChange={(event) =>
                setFilters({
                  awb: event.target.value,
                })
              }
              placeholder="AWB number"
              className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-zinc-300"
            />

            <select
              value={filters.evidenceType}
              onChange={(event) =>
                setFilters({
                  evidenceType:
                    event.target.value,
                })
              }
              className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm outline-none"
            >
              <option value="">All types</option>
              <option value="forward">
                Forward
              </option>
              <option value="rto">RTO</option>
            </select>

            <input
              value={filters.stationName}
              onChange={(event) =>
                setFilters({
                  stationName:
                    event.target.value,
                })
              }
              placeholder="Station name"
              className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-zinc-300"
            />

            <select
              value={filters.status}
              onChange={(event) =>
                setFilters({
                  status: event.target.value,
                })
              }
              className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm outline-none"
            >
              <option value="">All statuses</option>
              <option value="saved">Saved</option>
              <option value="missing">Missing</option>
              <option value="corrupted">
                Corrupted
              </option>
              <option value="failed">Failed</option>
            </select>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loadingList}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
              >
                {loadingList ? (
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                ) : (
                  <Search size={15} />
                )}

                Search
              </button>

              <button
                type="button"
                onClick={clearFilters}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600"
                title="Clear filters"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </form>

        {/* DIRECTORY TABLE */}

        <section className="mt-5 overflow-hidden rounded-[30px] bg-white shadow-[0_16px_45px_rgba(9,9,11,0.04)]">
          <div className="flex items-center justify-between px-5 py-5 sm:px-6">
            <div>
              <h2 className="font-semibold text-zinc-950">
                Evidence Records
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Showing {evidenceList.length} of{" "}
                {pagination.total || 0} records.
              </p>
            </div>
          </div>

          {loadingList ? (
            <div className="flex min-h-[360px] items-center justify-center">
              <Loader2
                size={28}
                className="animate-spin text-zinc-400"
              />
            </div>
          ) : evidenceList.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="bg-zinc-50 text-left">
                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-zinc-400">
                      Order
                    </th>

                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-zinc-400">
                      Type / AWB
                    </th>

                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-zinc-400">
                      Station
                    </th>

                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-zinc-400">
                      Video
                    </th>

                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-zinc-400">
                      Recorded
                    </th>

                    <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-zinc-400">
                      Availability
                    </th>

                    <th className="px-5 py-3 text-right text-[10px] font-semibold uppercase tracking-[0.13em] text-zinc-400">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {evidenceList.map((evidence) => {
                    const localFile =
                      findLocalFile(evidence);

                    const sameStation =
                      Boolean(currentStation) &&
                      evidence.station
                        ?.stationName ===
                      currentStation;

                    return (
                      <tr
                        key={evidence._id}
                        className="border-t border-zinc-100"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-zinc-950">
                            #{evidence.orderNumber}
                          </p>

                          <p className="mt-1 text-xs text-zinc-400">
                            {evidence.rmaNumber ||
                              "No RMA"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <TypeBadge
                            type={
                              evidence.evidenceType
                            }
                          />

                          <p className="mt-2 max-w-[180px] truncate text-xs text-zinc-500">
                            {evidence.awb || "No AWB"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-zinc-800">
                            {evidence.station
                              ?.stationName || "—"}
                          </p>

                          <p className="mt-1 text-xs text-zinc-400">
                            {evidence.station
                              ?.packerName ||
                              evidence.station
                                ?.computerName ||
                              "—"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="max-w-[230px] truncate text-sm font-medium text-zinc-800">
                            {evidence.storage
                              ?.fileName || "—"}
                          </p>

                          <p className="mt-1 text-xs text-zinc-400">
                            {formatDuration(
                              evidence.storage
                                ?.durationSeconds,
                            )}
                            {" • "}
                            {formatBytes(
                              evidence.storage
                                ?.fileSizeBytes,
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm text-zinc-700">
                            {evidence.recordedAt
                              ? new Date(
                                evidence.recordedAt,
                              ).toLocaleDateString(
                                "en-IN",
                              )
                              : "—"}
                          </p>

                          <p className="mt-1 text-xs text-zinc-400">
                            {evidence.recordedAt
                              ? new Date(
                                evidence.recordedAt,
                              ).toLocaleTimeString(
                                "en-IN",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                              : ""}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <AvailabilityBadge
                            available={Boolean(
                              localFile,
                            )}
                            sameStation={sameStation}
                          />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                playVideo(
                                  evidence,
                                  localFile,
                                )
                              }
                              disabled={!localFile}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-950 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
                            >
                              <Play size={13} />
                              Play
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openFolder(evidence)
                              }
                              disabled={
                                !localFile ||
                                !helperConnected
                              }
                              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <FolderOpen
                                size={13}
                              />
                              Folder
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <FileVideo
                size={32}
                className="text-zinc-300"
              />

              <p className="mt-3 text-sm font-medium text-zinc-700">
                No evidence records found
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Record a video or change the filters.
              </p>
            </div>
          )}

          {/* PAGINATION */}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-4">
              <p className="text-xs text-zinc-500">
                Page {pagination.page} of{" "}
                {pagination.totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    changePage(
                      pagination.page - 1,
                    )
                  }
                  disabled={
                    loadingList ||
                    pagination.page <= 1
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    changePage(
                      pagination.page + 1,
                    )
                  }
                  disabled={
                    loadingList ||
                    pagination.page >=
                    pagination.totalPages
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <VideoModal
        file={selectedLocalFile}
        evidence={selectedEvidence}
        onClose={() => {
          setSelectedLocalFile(null);
          setSelectedEvidence(null);
        }}
      />
    </main>
  );
}
