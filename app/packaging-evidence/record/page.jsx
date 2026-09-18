"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Check,
  CircleAlert,
  FolderOpen,
  Loader2,
  Package,
  Pause,
  Play,
  RefreshCcw,
  RotateCcw,
  Save,
  Search,
  Square,
  Trash2,
  Video,
  Wifi,
  WifiOff,
} from "lucide-react";

import { usePackagingEvidenceStore } from "@/store/packagingEvidenceStore";

const HELPER_URL = (
  process.env.NEXT_PUBLIC_EVIDENCE_HELPER_URL ||
  "http://127.0.0.1:4782"
).replace(/\/$/, "");

const formatTime = (seconds = 0) => {
  const value = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(value / 60);
  const remainingSeconds = value % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds,
  ).padStart(2, "0")}`;
};

const getSupportedMimeType = () => {
  const types = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];

  return (
    types.find((type) =>
      MediaRecorder.isTypeSupported(type),
    ) || ""
  );
};

const generateSha256 = async (blob) => {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    buffer,
  );

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const readHelperJson = async (
  path,
  options = {},
) => {
  const response = await fetch(`${HELPER_URL}${path}`, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload?.message ||
      `Evidence Helper error (${response.status})`,
    );
  }

  return payload;
};

const StatusBadge = ({
  connected,
  children,
}) => (
  <span
    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${connected
      ? "bg-emerald-50 text-emerald-700"
      : "bg-red-50 text-red-700"
      }`}
  >
    {connected ? (
      <Wifi size={13} />
    ) : (
      <WifiOff size={13} />
    )}

    {children}
  </span>
);

function PackagingEvidenceRecording() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const cameraVideoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const previewUrlRef = useRef("");

  const sourceStreamRef = useRef(null);
  const recordingStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const animationFrameRef = useRef(null);
  const timerRef = useRef(null);
  const saveInProgressRef = useRef(false);

  const {
    order,
    recordingDetails,
    loadingOrder,
    savingEvidence,
    error: storeError,
    successMessage,
    lookupOrder,
    createEvidence,
    clearCurrentOrder,
    clearMessages,
  } = usePackagingEvidenceStore();

  const initialType =
    searchParams.get("type") === "rto"
      ? "rto"
      : "forward";

  const [evidenceType, setEvidenceType] =
    useState(initialType);

  const [orderNumber, setOrderNumber] = useState("");
  const [rmaNumber, setRmaNumber] = useState("");
  const [manualAwb, setManualAwb] = useState("");

  const [stationConfig, setStationConfig] =
    useState(null);
  const [helperConnected, setHelperConnected] =
    useState(false);
  const [checkingHelper, setCheckingHelper] =
    useState(true);

  const [cameraActive, setCameraActive] =
    useState(false);
  const [cameraLoading, setCameraLoading] =
    useState(false);

  const [recordingStatus, setRecordingStatus] =
    useState("idle");

  const [recordedBlob, setRecordedBlob] =
    useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [durationSeconds, setDurationSeconds] =
    useState(0);
  const [pauseCount, setPauseCount] = useState(0);

  const [savingVideo, setSavingVideo] =
    useState(false);
  const [savedResult, setSavedResult] =
    useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isRecording = recordingStatus === "recording";
  const isPaused = recordingStatus === "paused";
  const isStopped = recordingStatus === "stopped";
  const effectiveAwb = String(
    recordingDetails?.awb ||
    manualAwb ||
    "",
  ).trim();

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();

    timerRef.current = setInterval(() => {
      setDurationSeconds((current) => current + 1);
    }, 1000);
  }, [stopTimer]);

  const stopCanvasDrawing = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    stopCanvasDrawing();

    sourceStreamRef.current
      ?.getTracks()
      ?.forEach((track) => track.stop());

    recordingStreamRef.current
      ?.getTracks()
      ?.forEach((track) => track.stop());

    sourceStreamRef.current = null;
    recordingStreamRef.current = null;

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }

    setCameraActive(false);
  }, [stopCanvasDrawing]);

  const clearRecording = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(
        previewUrlRef.current,
      );

      previewUrlRef.current = "";
    }

    setRecordedBlob(null);
    setPreviewUrl("");
    setDurationSeconds(0);
    setPauseCount(0);
    setRecordingStatus("idle");
    setSavedResult(null);

    chunksRef.current = [];
    mediaRecorderRef.current = null;

    if (previewVideoRef.current) {
      previewVideoRef.current.pause();
      previewVideoRef.current.removeAttribute(
        "src",
      );
      previewVideoRef.current.load();
    }
  }, []);

  const checkHelper = useCallback(async () => {
    setCheckingHelper(true);

    try {
      await readHelperJson("/api/health");

      const configResponse =
        await readHelperJson("/api/config");

      const config =
        configResponse?.data ||
        configResponse?.config ||
        null;

      setStationConfig(config);
      setHelperConnected(true);
    } catch {
      setHelperConnected(false);
      setStationConfig(null);
    } finally {
      setCheckingHelper(false);
    }
  }, []);

  useEffect(() => {
    checkHelper();

    return () => {
      stopTimer();
      stopCamera();

      if (previewUrlRef.current) {
        URL.revokeObjectURL(
          previewUrlRef.current,
        );

        previewUrlRef.current = "";
      }
    };
  }, [
    checkHelper,
    stopCamera,
    stopTimer,
  ]);

  const changeEvidenceType = (type) => {
    if (isRecording || isPaused) {
      setError(
        "Stop the current recording before changing its type.",
      );
      return;
    }

    setEvidenceType(type);

    clearCurrentOrder();
    clearRecording();

    setOrderNumber("");
    setRmaNumber("");
    setManualAwb("");

    setError("");
    setMessage("");
  };

  const handleLookup = async (event) => {
    event?.preventDefault();

    setError("");
    setMessage("");
    setManualAwb("");

    clearMessages();
    clearRecording();

    const result = await lookupOrder({
      orderNumber,
      evidenceType,
      rmaNumber,
    });

    if (result.success) {
      setMessage(
        `Order #${result.data?.order?.orderNumber} loaded successfully.`,
      );
    }
  };

  const startCamera = async () => {
    if (!stationConfig) {
      setError(
        "Configure this computer from Station Setup first.",
      );
      return;
    }

    setCameraLoading(true);
    setError("");
    setMessage("");

    stopCamera();

    try {
      const is1080p =
        stationConfig.quality === "1080p";

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: stationConfig.cameraId
              ? {
                exact: stationConfig.cameraId,
              }
              : undefined,

            width: {
              ideal: is1080p ? 1920 : 1280,
            },

            height: {
              ideal: is1080p ? 1080 : 720,
            },

            frameRate: {
              ideal:
                Number(
                  stationConfig.framesPerSecond,
                ) || 30,
            },
          },

          audio: Boolean(stationConfig.hasAudio),
        });

      sourceStreamRef.current = stream;

      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        await cameraVideoRef.current.play();
      }

      setCameraActive(true);
      setMessage("Camera is ready.");
    } catch (cameraError) {
      setError(
        cameraError?.message ||
        "Unable to access the configured camera.",
      );
    } finally {
      setCameraLoading(false);
    }
  };

  const drawCanvasFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const video = cameraVideoRef.current;

    if (!canvas || !video || video.readyState < 2) {
      animationFrameRef.current =
        requestAnimationFrame(drawCanvasFrame);
      return;
    }

    const context = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    context.drawImage(video, 0, 0, width, height);

    const overlayHeight = Math.max(
      115,
      Math.round(height * 0.17),
    );

    context.fillStyle = "rgba(0, 0, 0, 0.72)";
    context.fillRect(
      0,
      height - overlayHeight,
      width,
      overlayHeight,
    );

    const orderText =
      order?.orderNumber || orderNumber || "NO ORDER";

    const awbText =
      effectiveAwb || "NO AWB";

    const stationText =
      stationConfig?.stationName || "NO STATION";

    const currentTime = new Date().toLocaleString(
      "en-IN",
      {
        dateStyle: "medium",
        timeStyle: "medium",
      },
    );

    context.fillStyle = "#ffffff";
    context.font = `700 ${Math.round(
      height * 0.034,
    )}px Arial`;

    context.fillText(
      `OATCLUB • ${evidenceType === "rto"
        ? "RTO OPENING"
        : "FORWARD PACKING"
      }`,
      28,
      height - overlayHeight + 38,
    );

    context.font = `500 ${Math.round(
      height * 0.026,
    )}px Arial`;

    context.fillText(
      `Order #${orderText}  •  AWB ${awbText}`,
      28,
      height - overlayHeight + 75,
    );

    context.fillStyle = "rgba(255,255,255,0.72)";
    context.font = `400 ${Math.round(
      height * 0.021,
    )}px Arial`;

    context.fillText(
      `${stationText}  •  ${currentTime}`,
      28,
      height - overlayHeight + 104,
    );

    animationFrameRef.current =
      requestAnimationFrame(drawCanvasFrame);
  }, [
    evidenceType,
    order?.orderNumber,
    orderNumber,
    effectiveAwb,    stationConfig?.stationName,
  ]);

  const startRecording = async () => {
    if (!order) {
      setError("Fetch an order before recording.");
      return;
    }
    if (!effectiveAwb) {
      setError(
        "AWB was not found on the order. Please enter AWB manually.",
      );
      return;
    }


    if (!helperConnected || !stationConfig) {
      setError(
        "Local Evidence Helper is not connected or configured.",
      );
      return;
    }

    if (!cameraActive || !sourceStreamRef.current) {
      setError("Start the camera first.");
      return;
    }

    setError("");
    setMessage("");
    setSavedResult(null);
    clearRecording();

    try {
      const videoTrack =
        sourceStreamRef.current.getVideoTracks()[0];

      const settings = videoTrack?.getSettings?.() || {};

      const canvas = canvasRef.current;

      canvas.width =
        Number(settings.width) ||
        (stationConfig.quality === "1080p"
          ? 1920
          : 1280);

      canvas.height =
        Number(settings.height) ||
        (stationConfig.quality === "1080p"
          ? 1080
          : 720);

      stopCanvasDrawing();
      drawCanvasFrame();

      const canvasStream = canvas.captureStream(
        Number(stationConfig.framesPerSecond) || 30,
      );

      sourceStreamRef.current
        .getAudioTracks()
        .forEach((track) => {
          canvasStream.addTrack(track);
        });

      recordingStreamRef.current = canvasStream;
      chunksRef.current = [];

      const mimeType = getSupportedMimeType();

      const recorder = new MediaRecorder(
        canvasStream,
        mimeType
          ? {
            mimeType,
            videoBitsPerSecond:
              stationConfig.quality === "1080p"
                ? 5_000_000
                : 2_500_000,
          }
          : undefined,
      );

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalMimeType =
          recorder.mimeType ||
          mimeType ||
          "video/webm";

        const blob = new Blob(
          chunksRef.current,
          {
            type: finalMimeType,
          },
        );

        stopTimer();
        stopCanvasDrawing();

        if (!blob.size) {
          setError(
            "Recording empty hai. Please record again.",
          );

          setRecordingStatus("idle");
          return;
        }

        if (previewUrlRef.current) {
          URL.revokeObjectURL(
            previewUrlRef.current,
          );
        }

        const url = URL.createObjectURL(blob);

        previewUrlRef.current = url;

        setRecordedBlob(blob);
        setPreviewUrl(url);
        setRecordingStatus("stopped");
      };

      recorder.onerror = (event) => {
        setError(
          event?.error?.message ||
          "Recording failed unexpectedly.",
        );

        stopTimer();
        setRecordingStatus("idle");
      };

      recorder.start(1000);

      setRecordingStatus("recording");
      setDurationSeconds(0);
      setPauseCount(0);

      startTimer();
    } catch (recordingError) {
      setError(
        recordingError?.message ||
        "Unable to start recording.",
      );

      stopTimer();
      stopCanvasDrawing();
      setRecordingStatus("idle");
    }
  };

  const pauseRecording = () => {
    const recorder = mediaRecorderRef.current;

    if (
      !recorder ||
      recorder.state !== "recording"
    ) {
      return;
    }

    recorder.pause();
    stopTimer();

    setPauseCount((current) => current + 1);
    setRecordingStatus("paused");
  };

  const resumeRecording = () => {
    const recorder = mediaRecorderRef.current;

    if (!recorder || recorder.state !== "paused") {
      return;
    }

    recorder.resume();
    startTimer();
    setRecordingStatus("recording");
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;

    if (
      !recorder ||
      !["recording", "paused"].includes(
        recorder.state,
      )
    ) {
      return;
    }

    recorder.stop();
    stopTimer();

    setRecordingStatus("processing");
  };

  const recordAgain = async () => {
    const confirmed = window.confirm(
      "Discard this unsaved recording and record again?",
    );

    if (!confirmed) return;

    clearRecording();
    await startRecording();
  };

  const saveEvidence = async () => {
    // Prevent rapid double-click saving.
    if (saveInProgressRef.current) {
      return;
    }

    if (savedResult) {
      setError(
        "This evidence has already been saved.",
      );
      return;
    }

    if (!recordedBlob) {
      setError(
        "Stop and preview the recording first.",
      );
      return;
    }

    if (durationSeconds < 5) {
      setError(
        "Recording must be at least 5 seconds long.",
      );
      return;
    }

    if (!effectiveAwb) {
      setError(
        "Please enter the AWB number before saving evidence.",
      );
      return;
    }

    if (!helperConnected || !stationConfig) {
      setError(
        "Local Evidence Helper is not connected.",
      );
      return;
    }

    // Ref immediately lock hota hai, isliye
    // fast double-click bhi second request nahi bhejega.
    saveInProgressRef.current = true;

    setSavingVideo(true);
    setError("");
    setMessage("");

    try {
      const sha256 =
        await generateSha256(recordedBlob);

      const safeOrderNumber = String(
        order.orderNumber || "",
      )
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, "");

      const safeAwb = String(
        effectiveAwb || "",
      )
        .trim()
        .toUpperCase()
        .replace(/[^a-zA-Z0-9_-]/g, "");

      const requestedFileName =
        `${safeOrderNumber}-${safeAwb}-${evidenceType}.webm`;

      const formData = new FormData();

      formData.append(
        "video",
        recordedBlob,
        requestedFileName,
      );

      formData.append(
        "orderNumber",
        order.orderNumber,
      );

      formData.append(
        "evidenceType",
        evidenceType,
      );

      formData.append(
        "awb",
        effectiveAwb,
      );
      formData.append(
        "awb",
        effectiveAwb,
      );

      formData.append(
        "rmaNumber",
        rmaNumber || "",
      );

      formData.append(
        "fileName",
        requestedFileName,
      );

      formData.append(
        "durationSeconds",
        String(durationSeconds),
      );

      formData.append(
        "pauseCount",
        String(pauseCount),
      );

      formData.append("sha256", sha256);

      const helperResponse = await fetch(
        `${HELPER_URL}/api/save-video`, {
        method: "POST",
        body: formData,
      },
      );

      const helperPayload = await helperResponse
        .json()
        .catch(() => ({}));

      if (!helperResponse.ok) {
        throw new Error(
          helperPayload?.message ||
          "Local video save failed.",
        );
      }

      const localFile =
        helperPayload?.data || helperPayload;

      const result = await createEvidence({
        orderId: order._id,
        orderNumber: order.orderNumber,
        evidenceType,
        awb: effectiveAwb,
        courierPartner:
          recordingDetails?.courierPartner,
        rmaNumber: rmaNumber || "",

        stationName: stationConfig.stationName,
        computerName:
          stationConfig.computerName,
        packerName: stationConfig.packerName,

        storageRoot:
          localFile.storageRoot ||
          stationConfig.storageRoot,

        orderFolder:
          localFile.orderFolder ||
          recordingDetails?.orderFolder ||
          order.orderNumber,

        fileName:
          localFile.fileName ||
          requestedFileName,

        relativePath:
          localFile.relativePath ||
          `${order.orderNumber}\\${requestedFileName}`,

        mimeType:
          recordedBlob.type || "video/webm",

        fileSizeBytes:
          localFile.fileSizeBytes ||
          recordedBlob.size,

        durationSeconds,
        sha256,

        width:
          canvasRef.current?.width || 1280,

        height:
          canvasRef.current?.height || 720,

        framesPerSecond:
          Number(
            stationConfig.framesPerSecond,
          ) || 30,

        hasAudio:
          Boolean(stationConfig.hasAudio),

        recordedAt: new Date().toISOString(),

        notes:
          pauseCount > 0
            ? `Recording paused ${pauseCount} time(s).`
            : "",
      });

      if (!result.success) {
        throw new Error(
          result.message ||
          "Video saved locally but backend registration failed.",
        );
      }

      setSavedResult({
        ...localFile,
        evidenceId: result.data?._id,
        sha256,
      });

      setMessage(
        "Video saved locally and evidence registered successfully.",
      );
    } catch (saveError) {
      setError(
        saveError?.message ||
        "Unable to save evidence.",
      );
    } finally {
      saveInProgressRef.current = false;
      setSavingVideo(false);
    }
  };

  const startNextOrder = () => {
    clearRecording();
    clearCurrentOrder();
    clearMessages();

    setOrderNumber("");
    setRmaNumber("");
    setManualAwb("");

    setSavedResult(null);
    setError("");
    setMessage("");

    stopCamera();
  };

  const itemCount = (order?.items || []).reduce(
    (total, item) =>
      total + (Number(item.quantity) || 0),
    0,
  );

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 lg:px-8">
      <canvas ref={canvasRef} className="hidden" />

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
                  OATCLUB Packaging Proof
                </p>

                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
                  Record Evidence
                </h1>

                <p className="mt-1 text-sm text-zinc-500">
                  Record products, parcel sealing and
                  AWB label clearly.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {checkingHelper ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-2 text-xs text-zinc-600">
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                  Checking helper
                </span>
              ) : (
                <StatusBadge
                  connected={helperConnected}
                >
                  {helperConnected
                    ? stationConfig?.stationName ||
                    "Helper connected"
                    : "Helper offline"}
                </StatusBadge>
              )}

              <button
                type="button"
                onClick={checkHelper}
                className="inline-flex items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-700"
              >
                <RefreshCcw size={15} />
                Recheck
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/packaging-evidence/setup",
                  )
                }
                className="rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white"
              >
                Station Setup
              </button>
            </div>
          </div>
        </header>

        {/* ALERTS */}

        {(error || storeError) && (
          <div className="mt-4 flex gap-3 rounded-2xl bg-red-50 px-4 py-3 text-red-700">
            <CircleAlert
              size={18}
              className="mt-0.5 shrink-0"
            />

            <p className="text-sm">
              {error || storeError}
            </p>
          </div>
        )}

        {(message || successMessage) && (
          <div className="mt-4 flex gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-700">
            <Check
              size={18}
              className="mt-0.5 shrink-0"
            />

            <p className="text-sm">
              {message || successMessage}
            </p>
          </div>
        )}

        {/* TYPE AND ORDER LOOKUP */}

        <section className="mt-5 rounded-[28px] bg-white p-5 shadow-[0_16px_45px_rgba(9,9,11,0.04)]">
          <div className="grid gap-4 xl:grid-cols-[auto_1fr] xl:items-end">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                Evidence type
              </p>

              <div className="flex rounded-2xl bg-zinc-100 p-1">
                <button
                  type="button"
                  onClick={() =>
                    changeEvidenceType("forward")
                  }
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${evidenceType === "forward"
                    ? "bg-zinc-950 text-white shadow-sm"
                    : "text-zinc-600"
                    }`}
                >
                  <Package size={16} />
                  Forward
                </button>

                <button
                  type="button"
                  onClick={() =>
                    changeEvidenceType("rto")
                  }
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${evidenceType === "rto"
                    ? "bg-zinc-950 text-white shadow-sm"
                    : "text-zinc-600"
                    }`}
                >
                  <RotateCcw size={16} />
                  RTO
                </button>
              </div>
            </div>

            <form
              onSubmit={handleLookup}
              className={`grid gap-3 ${evidenceType === "rto"
                ? "md:grid-cols-[1fr_1fr_auto]"
                : "md:grid-cols-[1fr_auto]"
                }`}
            >
              <input
                value={orderNumber}
                onChange={(event) =>
                  setOrderNumber(
                    event.target.value.toUpperCase(),
                  )
                }
                placeholder="Scan or enter order number"
                disabled={isRecording || isPaused}
                className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm outline-none ring-1 ring-transparent focus:bg-white focus:ring-zinc-300"
              />

              {evidenceType === "rto" && (
                <input
                  value={rmaNumber}
                  onChange={(event) =>
                    setRmaNumber(
                      event.target.value.toUpperCase(),
                    )
                  }
                  placeholder="RMA number (optional)"
                  disabled={isRecording || isPaused}
                  className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm outline-none ring-1 ring-transparent focus:bg-white focus:ring-zinc-300"
                />
              )}

              <button
                type="submit"
                disabled={
                  loadingOrder ||
                  !orderNumber.trim() ||
                  isRecording ||
                  isPaused
                }
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-medium text-white disabled:opacity-40"
              >
                {loadingOrder ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Search size={16} />
                )}

                Fetch Order
              </button>
            </form>
          </div>
        </section>

        {/* MAIN WORKSPACE */}

        <div className="mt-5 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          {/* ORDER DETAILS */}

          <section className="rounded-[30px] bg-white p-5 shadow-[0_16px_45px_rgba(9,9,11,0.04)] sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-950">
                  Order Details
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Confirm every item before sealing.
                </p>
              </div>

              {order && (
                <span className="rounded-full bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white">
                  {itemCount} item(s)
                </span>
              )}
            </div>

            {!order ? (
              <div className="mt-5 flex min-h-[360px] flex-col items-center justify-center rounded-3xl bg-zinc-50 text-center">
                <Package
                  size={32}
                  className="text-zinc-300"
                />

                <p className="mt-3 text-sm font-medium text-zinc-700">
                  No order selected
                </p>

                <p className="mt-1 max-w-xs text-xs leading-5 text-zinc-500">
                  Scan an order barcode or enter the
                  order number above.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                      Order
                    </p>

                    <p className="mt-1 font-semibold text-zinc-950">
                      #{order.orderNumber}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                      Type
                    </p>

                    <p className="mt-1 font-semibold capitalize text-zinc-950">
                      {evidenceType}
                    </p>
                  </div>

                    <div className="rounded-2xl bg-zinc-50 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                        AWB
                      </p>

                      {recordingDetails?.awb ? (
                        <p className="mt-1 break-all text-sm font-semibold text-zinc-950">
                          {recordingDetails.awb}
                        </p>
                      ) : (
                        <input
                          type="text"
                          value={manualAwb}
                          onChange={(event) =>
                            setManualAwb(
                              event.target.value
                                .trimStart()
                                .toUpperCase(),
                            )
                          }
                          disabled={
                            isRecording ||
                            isPaused ||
                            isStopped
                          }
                          placeholder="Enter AWB manually"
                          className="mt-2 w-full rounded-xl bg-white px-3 py-2 text-sm font-semibold text-zinc-950 outline-none ring-1 ring-zinc-200 focus:ring-zinc-400 disabled:opacity-60"
                        />
                      )}
                    </div>

                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                      Courier
                    </p>

                    <p className="mt-1 text-sm font-semibold text-zinc-950">
                      {recordingDetails?.courierPartner ||
                        "Not assigned"}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
                    Items to pack
                  </p>

                  <div className="mt-3 max-h-[470px] space-y-3 overflow-y-auto pr-1">
                    {(order.items || []).map(
                      (item, index) => (
                        <article
                          key={
                            item.lineId ||
                            `${item.productCode}-${index}`
                          }
                          className="flex gap-3 rounded-2xl bg-zinc-50 p-3"
                        >
                          <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-200">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Package
                                  size={20}
                                  className="text-zinc-400"
                                />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-semibold text-zinc-950">
                              {item.title ||
                                "Untitled product"}
                            </p>

                            <p className="mt-1 text-xs text-zinc-500">
                              {item.productCode ||
                                "No product code"}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2">
                              {item.selectedSize && (
                                <span className="rounded-lg bg-white px-2 py-1 text-[11px] font-medium text-zinc-700">
                                  Size:{" "}
                                  {item.selectedSize}
                                </span>
                              )}

                              {item.selectedColor && (
                                <span className="rounded-lg bg-white px-2 py-1 text-[11px] font-medium text-zinc-700">
                                  {item.selectedColor}
                                </span>
                              )}

                              <span className="rounded-lg bg-zinc-950 px-2 py-1 text-[11px] font-semibold text-white">
                                Qty: {item.quantity}
                              </span>
                            </div>
                          </div>
                        </article>
                      ),
                    )}
                  </div>
                </div>
              </>
            )}
          </section>

          {/* CAMERA AND RECORDING */}

          <section className="rounded-[30px] bg-white p-5 shadow-[0_16px_45px_rgba(9,9,11,0.04)] sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-950">
                  Camera Recording
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Order and AWB details are burned into the
                  saved video.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {(isRecording || isPaused) && (
                  <span className="rounded-full bg-red-50 px-3 py-1.5 font-mono text-xs font-semibold text-red-700">
                    {isPaused ? "PAUSED" : "● REC"}{" "}
                    {formatTime(durationSeconds)}
                  </span>
                )}

                {pauseCount > 0 && (
                  <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                    Paused {pauseCount}×
                  </span>
                )}
              </div>
            </div>

            <div className="relative mt-5 aspect-video overflow-hidden rounded-3xl bg-zinc-950">
              {isStopped && previewUrl ? (
                <video
                  key={previewUrl}
                  ref={previewVideoRef}
                  src={previewUrl}
                  controls
                  autoPlay
                  muted
                  playsInline
                  preload="auto"
                  onLoadedMetadata={(event) => {
                    const video = event.currentTarget;

                    video.currentTime = 0;

                    video.play().catch(() => {
                      // Browser autoplay block kare to
                      // user manually Play press kar sakta hai.
                    });
                  }}
                  className="h-full w-full object-contain"
                />
              ) : (
                <video
                  ref={cameraVideoRef}
                  muted
                  autoPlay
                  playsInline
                  className={`h-full w-full object-cover ${cameraActive
                    ? "opacity-100"
                    : "opacity-0"
                    }`}
                />
              )}

              {!cameraActive &&
                !isStopped &&
                !previewUrl && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <Camera
                      size={34}
                      className="text-white/30"
                    />

                    <p className="mt-3 text-sm font-medium text-white">
                      Camera is not active
                    </p>

                    <p className="mt-1 text-xs text-white/50">
                      Fetch an order and start the camera.
                    </p>
                  </div>
                )}

              {cameraActive &&
                !isStopped &&
                order && (
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-black/70 px-4 py-3 text-white">
                    <p className="text-xs font-bold uppercase tracking-[0.14em]">
                      OATCLUB •{" "}
                      {evidenceType === "rto"
                        ? "RTO Opening"
                        : "Forward Packing"}
                    </p>

                    <p className="mt-1 text-xs text-white/80">
                      Order #{order.orderNumber} • AWB{" "}
                    {effectiveAwb || "Not assigned"}
                    </p>

                    <p className="mt-1 text-[10px] text-white/50">
                      {stationConfig?.stationName}
                    </p>
                  </div>
                )}

              {isPaused && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <span className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-bold uppercase tracking-[0.16em] text-black">
                    Recording paused
                  </span>
                </div>
              )}
            </div>

            {/* CAMERA BUTTONS */}

            <div className="mt-5 flex flex-wrap gap-2">
              {!cameraActive &&
                !isStopped &&
                !isRecording &&
                !isPaused && (
                  <button
                    type="button"
                    onClick={startCamera}
                    disabled={
                      cameraLoading ||
                      !order ||
                      !helperConnected
                    }
                    className="inline-flex items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-700 disabled:opacity-40"
                  >
                    {cameraLoading ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <Camera size={16} />
                    )}

                    Start Camera
                  </button>
                )}

              {cameraActive &&
                recordingStatus === "idle" && (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white"
                  >
                    <Video size={17} />
                    Start Recording
                  </button>
                )}

              {isRecording && (
                <>
                  <button
                    type="button"
                    onClick={pauseRecording}
                    className="inline-flex items-center gap-2 rounded-2xl bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-800"
                  >
                    <Pause size={16} />
                    Pause
                  </button>

                  <button
                    type="button"
                    onClick={stopRecording}
                    className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white"
                  >
                    <Square size={15} />
                    Stop Recording
                  </button>
                </>
              )}

              {isPaused && (
                <>
                  <button
                    type="button"
                    onClick={resumeRecording}
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
                  >
                    <Play size={16} />
                    Resume
                  </button>

                  <button
                    type="button"
                    onClick={stopRecording}
                    className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white"
                  >
                    <Square size={15} />
                    Stop Recording
                  </button>
                </>
              )}

              {recordingStatus === "processing" && (
                <span className="inline-flex items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-600">
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                  Preparing preview
                </span>
              )}

              {isStopped && recordedBlob && (
                <>
                  <button
                    type="button"
                    onClick={recordAgain}
                    disabled={savingVideo}
                    className="inline-flex items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-700 disabled:opacity-40"
                  >
                    <RefreshCcw size={16} />
                    Record Again
                  </button>

                  <button
                    type="button"
                    onClick={saveEvidence}
                    disabled={
                      savingVideo ||
                      savingEvidence ||
                      Boolean(savedResult)
                    }
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {savingVideo || savingEvidence ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : savedResult ? (
                      <Check size={16} />
                    ) : (
                      <Save size={16} />
                    )}

                    {savedResult
                      ? "Evidence Saved"
                      : savingVideo || savingEvidence
                        ? "Saving Evidence..."
                        : "Save Evidence"}
                  </button>

                  {!savedResult && (
                    <button
                      type="button"
                      onClick={clearRecording}
                      disabled={savingVideo}
                      className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 disabled:opacity-40"
                    >
                      <Trash2 size={16} />
                      Discard
                    </button>
                  )}
                </>
              )}
            </div>

            {/* RECORDING DETAILS */}

            {recordedBlob && (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                    Duration
                  </p>

                  <p className="mt-1 font-mono text-sm font-semibold text-zinc-950">
                    {formatTime(durationSeconds)}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                    File size
                  </p>

                  <p className="mt-1 text-sm font-semibold text-zinc-950">
                    {(
                      recordedBlob.size /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                    Pauses
                  </p>

                  <p className="mt-1 text-sm font-semibold text-zinc-950">
                    {pauseCount}
                  </p>
                </div>
              </div>
            )}

            {/* SAVE RESULT */}

            {savedResult && (
              <div className="mt-5 rounded-3xl bg-emerald-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                    <Check size={20} />
                  </div>

                  <div>
                    <p className="font-semibold text-emerald-950">
                      Evidence saved successfully
                    </p>

                    <p className="text-xs text-emerald-700">
                      Video verified locally and registered
                      with the backend.
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-white/70 p-4 text-xs text-emerald-950">
                  <p>
                    File:{" "}
                    <strong>
                      {savedResult.fileName}
                    </strong>
                  </p>

                  <p className="mt-1 break-all">
                    Path:{" "}
                    {savedResult.fullPath ||
                      savedResult.relativePath}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await readHelperJson(
                          "/api/open-folder",
                          {
                            method: "POST",
                            headers: {
                              "Content-Type":
                                "application/json",
                            },
                            body: JSON.stringify({
                              orderNumber:
                                order.orderNumber,
                            }),
                          },
                        );
                      } catch (openFolderError) {
                        setError(
                          openFolderError?.message ||
                          "Unable to open evidence folder.",
                        );
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-emerald-800"
                  >
                    <FolderOpen size={14} />
                    Open Folder
                  </button>

                  <button
                    type="button"
                    onClick={startNextOrder}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Next Order
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default function PackagingEvidenceRecordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50">
          <Loader2
            size={28}
            className="animate-spin text-zinc-500"
          />
        </div>
      }
    >
      <PackagingEvidenceRecording />
    </Suspense>
  );
}
