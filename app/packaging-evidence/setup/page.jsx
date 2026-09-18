"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Check,
  CircleAlert,
  FolderOpen,
  HardDrive,
  Loader2,
  Monitor,
  Play,
  RefreshCcw,
  Save,
  Server,
  Square,
  Video,
  Wifi,
  WifiOff,
} from "lucide-react";

const HELPER_URL = (
  process.env.NEXT_PUBLIC_EVIDENCE_HELPER_URL ||
  "http://127.0.0.1:4782"
).replace(/\/$/, "");

const DEFAULT_CONFIG = {
  stationName: "",
  computerName: "",
  packerName: "",
  storageRoot: "",
  cameraId: "",
  quality: "720p",
  framesPerSecond: 30,
  hasAudio: false,
  autoStart: true,
};

const requestHelper = async (
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
      `Local helper request failed (${response.status})`,
    );
  }

  return payload;
};

const Field = ({
  label,
  helper,
  children,
}) => (
  <label className="block">
    <span className="text-sm font-medium text-zinc-800">
      {label}
    </span>

    {helper ? (
      <span className="ml-2 text-xs text-zinc-400">
        {helper}
      </span>
    ) : null}

    <div className="mt-2">{children}</div>
  </label>
);

const StatusBadge = ({
  success,
  children,
}) => (
  <span
    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${success
        ? "bg-emerald-50 text-emerald-700"
        : "bg-red-50 text-red-700"
      }`}
  >
    <span
      className={`h-2 w-2 rounded-full ${success ? "bg-emerald-500" : "bg-red-500"
        }`}
    />

    {children}
  </span>
);

export default function EvidenceStationSetupPage() {
  const router = useRouter();
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [cameras, setCameras] = useState([]);

  const [helperConnected, setHelperConnected] =
    useState(false);
  const [checkingHelper, setCheckingHelper] =
    useState(true);

  const [loadingConfig, setLoadingConfig] =
    useState(false);
  const [choosingDirectory, setChoosingDirectory] =
    useState(false);
  const [testingStorage, setTestingStorage] =
    useState(false);
  const [testingCamera, setTestingCamera] =
    useState(false);
  const [saving, setSaving] = useState(false);

  const [cameraActive, setCameraActive] =
    useState(false);
  const [storagePassed, setStoragePassed] =
    useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const updateConfig = (field, value) => {
    setConfig((current) => ({
      ...current,
      [field]: value,
    }));

    if (field === "storageRoot") {
      setStoragePassed(false);
    }

    setMessage("");
    setError("");
  };

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks()?.forEach((track) => {
      track.stop();
    });

    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setTestingCamera(false);
  }, []);

  const loadCameras = useCallback(async () => {
    try {
      const devices =
        await navigator.mediaDevices.enumerateDevices();

      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput",
      );

      setCameras(videoDevices);

      setConfig((current) => ({
        ...current,
        cameraId:
          current.cameraId ||
          videoDevices[0]?.deviceId ||
          "",
      }));

      return videoDevices;
    } catch (cameraError) {
      setError(
        cameraError?.message ||
        "Unable to detect cameras.",
      );

      return [];
    }
  }, []);

  const loadHelperConfig = useCallback(async () => {
    setLoadingConfig(true);

    try {
      const response = await requestHelper("/api/config");
      const helperConfig =
        response?.data || response?.config || {};

      setConfig((current) => ({
        ...current,
        ...helperConfig,
      }));

      setHelperConnected(true);
    } catch (helperError) {
      setHelperConnected(false);

      const cachedConfig = window.localStorage.getItem(
        "oatclubEvidenceStation",
      );

      if (cachedConfig) {
        try {
          setConfig((current) => ({
            ...current,
            ...JSON.parse(cachedConfig),
          }));
        } catch {
          // Ignore invalid cached configuration.
        }
      }
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  const checkHelper = useCallback(async () => {
    setCheckingHelper(true);
    setError("");

    try {
      await requestHelper("/api/health");

      setHelperConnected(true);
      await loadHelperConfig();
    } catch {
      setHelperConnected(false);

      setError(
        "OATCLUB Evidence Helper is not running on this PC.",
      );
    } finally {
      setCheckingHelper(false);
    }
  }, [loadHelperConfig]);

  useEffect(() => {
    checkHelper();
    loadCameras();

    return () => {
      stopCamera();
    };
  }, [checkHelper, loadCameras, stopCamera]);

  const requestCameraPermission = async () => {
    setTestingCamera(true);
    setError("");
    setMessage("");

    stopCamera();

    try {
      const temporaryStream =
        await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

      temporaryStream
        .getTracks()
        .forEach((track) => track.stop());

      const videoDevices = await loadCameras();

      if (!videoDevices.length) {
        throw new Error(
          "No webcam was detected on this computer.",
        );
      }

      setMessage(
        `${videoDevices.length} camera device(s) detected.`,
      );
    } catch (cameraError) {
      setError(
        cameraError?.message ||
        "Camera permission was denied.",
      );
    } finally {
      setTestingCamera(false);
    }
  };

  const startCameraTest = async () => {
    setTestingCamera(true);
    setError("");
    setMessage("");

    stopCamera();

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: config.cameraId
              ? { exact: config.cameraId }
              : undefined,

            width:
              config.quality === "1080p"
                ? { ideal: 1920 }
                : { ideal: 1280 },

            height:
              config.quality === "1080p"
                ? { ideal: 1080 }
                : { ideal: 720 },

            frameRate: {
              ideal:
                Number(config.framesPerSecond) || 30,
            },
          },

          audio: Boolean(config.hasAudio),
        });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      setMessage("Camera preview started successfully.");
    } catch (cameraError) {
      setError(
        cameraError?.message ||
        "Unable to start selected camera.",
      );
    } finally {
      setTestingCamera(false);
    }
  };

  const chooseDirectory = async () => {
    if (!helperConnected) {
      setError(
        "Start the local Evidence Helper before selecting a folder.",
      );
      return;
    }

    setChoosingDirectory(true);
    setError("");
    setMessage("");

    try {
      const response = await requestHelper(
        "/api/choose-directory",
        {
          method: "POST",
        },
      );

      const selectedPath =
        response?.data?.storageRoot ||
        response?.storageRoot ||
        response?.path ||
        "";

      if (selectedPath) {
        updateConfig("storageRoot", selectedPath);

        setMessage(
          "Evidence storage directory selected.",
        );
      }
    } catch (directoryError) {
      setError(
        directoryError?.message ||
        "Unable to select storage directory.",
      );
    } finally {
      setChoosingDirectory(false);
    }
  };

  const testStorage = async () => {
    if (!config.storageRoot.trim()) {
      setError("Select a storage directory first.");
      return;
    }

    if (!helperConnected) {
      setError(
        "Local Evidence Helper is not connected.",
      );
      return;
    }

    setTestingStorage(true);
    setStoragePassed(false);
    setError("");
    setMessage("");

    try {
      const response = await requestHelper(
        "/test-storage",
        {
          method: "POST",
          body: JSON.stringify({
            storageRoot: config.storageRoot,
          }),
        },
      );

      setStoragePassed(true);

      const freeSpace =
        response?.data?.freeSpaceFormatted ||
        response?.freeSpaceFormatted;

      setMessage(
        freeSpace
          ? `Folder is writable. Available space: ${freeSpace}.`
          : "Folder is writable and ready.",
      );
    } catch (storageError) {
      setStoragePassed(false);

      setError(
        storageError?.message ||
        "Directory write test failed.",
      );
    } finally {
      setTestingStorage(false);
    }
  };

  const openFolder = async () => {
    if (!helperConnected) {
      setError(
        "Local Evidence Helper is not connected.",
      );
      return;
    }

    try {
      await requestHelper("/open-folder", {
        method: "POST",
        body: JSON.stringify({
          storageRoot: config.storageRoot,
        }),
      });
    } catch (folderError) {
      setError(
        folderError?.message ||
        "Unable to open evidence folder.",
      );
    }
  };

  const validate = () => {
    if (!config.stationName.trim()) {
      return "Station name is required.";
    }

    if (!config.computerName.trim()) {
      return "Computer name is required.";
    }

    if (!config.storageRoot.trim()) {
      return "Storage directory is required.";
    }

    if (!config.cameraId) {
      return "Select a webcam.";
    }

    if (!helperConnected) {
      return "Local Evidence Helper is not connected.";
    }

    return "";
  };

  const saveConfiguration = async () => {
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        ...config,
        stationName: config.stationName.trim(),
        computerName: config.computerName.trim(),
        packerName: config.packerName.trim(),
        storageRoot: config.storageRoot.trim(),
        framesPerSecond:
          Number(config.framesPerSecond) || 30,
      };

      await requestHelper("/api/config", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      window.localStorage.setItem(
        "oatclubEvidenceStation",
        JSON.stringify(payload),
      );

      setConfig(payload);
      setMessage(
        "Station configuration saved successfully.",
      );
    } catch (saveError) {
      setError(
        saveError?.message ||
        "Unable to save station configuration.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px]">
        {/* HEADER */}

        <header className="flex flex-col gap-5 rounded-[30px] bg-white px-5 py-6 shadow-[0_18px_55px_rgba(9,9,11,0.04)] sm:px-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() =>
                router.push("/packaging-evidence")
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200"
            >
              <ArrowLeft size={18} />
            </button>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Packaging Evidence
              </p>

              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
                Station Setup
              </h1>

              <p className="mt-1 text-sm text-zinc-500">
                Configure this packing computer, webcam and
                local evidence directory.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {checkingHelper ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-600">
                <Loader2
                  size={14}
                  className="animate-spin"
                />
                Checking helper
              </span>
            ) : (
              <StatusBadge success={helperConnected}>
                {helperConnected ? (
                  <Wifi size={14} />
                ) : (
                  <WifiOff size={14} />
                )}

                {helperConnected
                  ? "Helper connected"
                  : "Helper offline"}
              </StatusBadge>
            )}

            <button
              type="button"
              onClick={checkHelper}
              disabled={checkingHelper}
              className="inline-flex items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200 disabled:opacity-50"
            >
              <RefreshCcw
                size={15}
                className={
                  checkingHelper ? "animate-spin" : ""
                }
              />

              Recheck
            </button>
          </div>
        </header>

        {/* ALERTS */}

        {error ? (
          <div className="mt-4 flex gap-3 rounded-2xl bg-red-50 px-4 py-3 text-red-700">
            <CircleAlert
              size={18}
              className="mt-0.5 shrink-0"
            />

            <p className="text-sm">{error}</p>
          </div>
        ) : null}

        {message ? (
          <div className="mt-4 flex gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-700">
            <Check
              size={18}
              className="mt-0.5 shrink-0"
            />

            <p className="text-sm">{message}</p>
          </div>
        ) : null}

        <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          {/* CONFIGURATION */}

          <section className="rounded-[30px] bg-white p-5 shadow-[0_16px_45px_rgba(9,9,11,0.04)] sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                <Monitor size={19} />
              </div>

              <div>
                <h2 className="font-semibold text-zinc-950">
                  Computer identity
                </h2>

                <p className="text-xs text-zinc-500">
                  Identifies where each video is stored.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <Field
                label="Station name"
                helper="Shown in evidence records"
              >
                <input
                  value={config.stationName}
                  onChange={(event) =>
                    updateConfig(
                      "stationName",
                      event.target.value,
                    )
                  }
                  placeholder="OATCLUB-PACK-01"
                  className="w-full rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-950 outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-zinc-300"
                />
              </Field>

              <Field
                label="Computer name"
                helper="Windows device name"
              >
                <input
                  value={config.computerName}
                  onChange={(event) =>
                    updateConfig(
                      "computerName",
                      event.target.value,
                    )
                  }
                  placeholder="WAREHOUSE-PC-01"
                  className="w-full rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-950 outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-zinc-300"
                />
              </Field>

              <Field
                label="Default packer name"
                helper="Can be changed later"
              >
                <input
                  value={config.packerName}
                  onChange={(event) =>
                    updateConfig(
                      "packerName",
                      event.target.value,
                    )
                  }
                  placeholder="Ayush"
                  className="w-full rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-950 outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-zinc-300"
                />
              </Field>
            </div>

            <div className="my-7 h-px bg-zinc-100" />

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <HardDrive size={19} />
              </div>

              <div>
                <h2 className="font-semibold text-zinc-950">
                  Evidence directory
                </h2>

                <p className="text-xs text-zinc-500">
                  Order folders will be created here.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <Field label="Local storage folder">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={config.storageRoot}
                    onChange={(event) =>
                      updateConfig(
                        "storageRoot",
                        event.target.value,
                      )
                    }
                    placeholder="D:\oatclub-evidence"
                    className="min-w-0 flex-1 rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-950 outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-zinc-300"
                  />

                  <button
                    type="button"
                    onClick={chooseDirectory}
                    disabled={
                      choosingDirectory ||
                      !helperConnected
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {choosingDirectory ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <FolderOpen size={16} />
                    )}

                    Browse
                  </button>
                </div>
              </Field>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={testStorage}
                  disabled={
                    testingStorage ||
                    !helperConnected
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-40"
                >
                  {testingStorage ? (
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                  ) : (
                    <HardDrive size={14} />
                  )}

                  Test write access
                </button>

                <button
                  type="button"
                  onClick={openFolder}
                  disabled={
                    !helperConnected ||
                    !config.storageRoot
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700 disabled:opacity-40"
                >
                  <FolderOpen size={14} />
                  Open folder
                </button>

                {storagePassed ? (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                    <Check size={14} />
                    Directory ready
                  </span>
                ) : null}
              </div>
            </div>
          </section>

          {/* CAMERA */}

          <section className="rounded-[30px] bg-white p-5 shadow-[0_16px_45px_rgba(9,9,11,0.04)] sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                  <Video size={19} />
                </div>

                <div>
                  <h2 className="font-semibold text-zinc-950">
                    Webcam configuration
                  </h2>

                  <p className="text-xs text-zinc-500">
                    Recommended: 720p at 30 FPS.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={requestCameraPermission}
                disabled={testingCamera}
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700 disabled:opacity-40"
              >
                <RefreshCcw size={14} />
                Detect cameras
              </button>
            </div>

            <div className="relative mt-5 aspect-video overflow-hidden rounded-3xl bg-zinc-950">
              <video
                ref={videoRef}
                muted
                autoPlay
                playsInline
                className={`h-full w-full object-cover ${cameraActive
                    ? "opacity-100"
                    : "opacity-0"
                  }`}
              />

              {!cameraActive ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-white">
                    <Camera size={27} />
                  </div>

                  <p className="mt-4 text-sm font-medium text-white">
                    Camera preview is off
                  </p>

                  <p className="mt-1 text-xs text-white/50">
                    Select a camera and start the test.
                  </p>
                </div>
              ) : (
                <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                  Camera test
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Camera">
                <select
                  value={config.cameraId}
                  onChange={(event) =>
                    updateConfig(
                      "cameraId",
                      event.target.value,
                    )
                  }
                  className="w-full rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-950 outline-none"
                >
                  <option value="">
                    Select camera
                  </option>

                  {cameras.map((camera, index) => (
                    <option
                      key={camera.deviceId}
                      value={camera.deviceId}
                    >
                      {camera.label ||
                        `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Video quality">
                <select
                  value={config.quality}
                  onChange={(event) =>
                    updateConfig(
                      "quality",
                      event.target.value,
                    )
                  }
                  className="w-full rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-950 outline-none"
                >
                  <option value="720p">
                    720p — Recommended
                  </option>

                  <option value="1080p">
                    1080p — Larger files
                  </option>
                </select>
              </Field>

              <Field label="Frames per second">
                <select
                  value={config.framesPerSecond}
                  onChange={(event) =>
                    updateConfig(
                      "framesPerSecond",
                      Number(event.target.value),
                    )
                  }
                  className="w-full rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-950 outline-none"
                >
                  <option value={24}>24 FPS</option>
                  <option value={30}>
                    30 FPS — Recommended
                  </option>
                </select>
              </Field>

              <Field label="Audio recording">
                <button
                  type="button"
                  onClick={() =>
                    updateConfig(
                      "hasAudio",
                      !config.hasAudio,
                    )
                  }
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium ${config.hasAudio
                      ? "bg-zinc-950 text-white"
                      : "bg-zinc-50 text-zinc-700"
                    }`}
                >
                  <span>
                    {config.hasAudio
                      ? "Audio enabled"
                      : "Audio disabled"}
                  </span>

                  <span
                    className={`relative h-6 w-11 rounded-full ${config.hasAudio
                        ? "bg-emerald-500"
                        : "bg-zinc-300"
                      }`}
                  >
                    <span
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${config.hasAudio
                          ? "left-6"
                          : "left-1"
                        }`}
                    />
                  </span>
                </button>
              </Field>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {!cameraActive ? (
                <button
                  type="button"
                  onClick={startCameraTest}
                  disabled={
                    testingCamera || !config.cameraId
                  }
                  className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {testingCamera ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <Play size={16} />
                  )}

                  Test camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                >
                  <Square size={15} />
                  Stop test
                </button>
              )}
            </div>

            <div className="my-6 h-px bg-zinc-100" />

            <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-zinc-50 px-4 py-4">
              <div>
                <p className="text-sm font-medium text-zinc-800">
                  Start helper with Windows
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Keeps local video saving available.
                </p>
              </div>

              <input
                type="checkbox"
                checked={config.autoStart}
                onChange={(event) =>
                  updateConfig(
                    "autoStart",
                    event.target.checked,
                  )
                }
                className="h-5 w-5 accent-zinc-950"
              />
            </label>
          </section>
        </div>

        {/* SAVE BAR */}

        <section className="sticky bottom-4 mt-5 flex flex-col gap-3 rounded-[24px] bg-zinc-950 px-5 py-4 text-white shadow-[0_24px_70px_rgba(9,9,11,0.25)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Server
              size={20}
              className="text-white/60"
            />

            <div>
              <p className="text-sm font-medium">
                Save this computer configuration
              </p>

              <p className="text-xs text-white/50">
                Settings remain local to this packing PC.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={saveConfiguration}
            disabled={saving || !helperConnected}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? (
              <Loader2
                size={17}
                className="animate-spin"
              />
            ) : (
              <Save size={17} />
            )}

            Save Station
          </button>
        </section>
      </div>
    </main>
  );
}
