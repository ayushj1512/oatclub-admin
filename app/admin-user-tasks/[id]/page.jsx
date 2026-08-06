"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CirclePlay,
  Clock3,
  Download,
  Edit3,
  ExternalLink,
  File,
  FileCheck2,
  ImageIcon,
  LoaderCircle,
  MessageSquare,
  Paperclip,
  RefreshCcw,
  RotateCcw,
  Send,
  Tag,
  Trash2,
  UserRound,
  Video,
  X,
  XCircle,
  Zap,
} from "lucide-react";

import useAdminUserTaskStore from "@/store/adminUserTaskStore";

const STATUS_STYLES = {
  assigned: {
    label: "Assigned",
    className: "border-blue-200 bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
  },
  in_progress: {
    label: "In Progress",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  submitted: {
    label: "Submitted",
    className: "border-violet-200 bg-violet-50 text-violet-700",
    dot: "bg-violet-500",
  },
  rework: {
    label: "Rework",
    className: "border-orange-200 bg-orange-50 text-orange-700",
    dot: "bg-orange-500",
  },
  closed: {
    label: "Closed",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  cancelled: {
    label: "Cancelled",
    className: "border-red-200 bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
};

const PRIORITY_STYLES = {
  low: "border-slate-200 bg-slate-50 text-slate-600",
  medium: "border-cyan-200 bg-cyan-50 text-cyan-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  urgent: "border-red-200 bg-red-50 text-red-700",
};

const ACTIVITY_LABELS = {
  task_created: "Task created",
  task_updated: "Task updated",
  task_started: "Task started",
  task_submitted: "Task submitted",
  feedback_added: "Comment added",
  rework_requested: "Rework requested",
  task_closed: "Task closed",
  task_cancelled: "Task cancelled",
  deadline_updated: "Deadline updated",
  assignee_changed: "Assignee changed",
  media_added: "Media added",
};

const cn = (...classes) => classes.filter(Boolean).join(" ");

const getUserName = (user) => {
  return (
    user?.fullName ||
    user?.username ||
    user?.name ||
    user?.email ||
    "Unknown admin"
  );
};

const getUserInitials = (user) => {
  return getUserName(user)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
};

const getStoredAdmin = () => {
  if (typeof window === "undefined") return null;

  const keys = [
    "adminUser",
    "admin",
    "user",
    "adminData",
    "currentAdmin",
  ];

  for (const key of keys) {
    try {
      const value = localStorage.getItem(key);

      if (!value) continue;

      const parsed = JSON.parse(value);

      if (parsed?.admin) return parsed.admin;
      if (parsed?.user) return parsed.user;

      return parsed;
    } catch {
      // Ignore malformed localStorage values.
    }
  }

  return null;
};

const formatDate = (value) => {
  if (!value) return "Not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatDateTime = (value) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

function StatusBadge({ status }) {
  const config =
    STATUS_STYLES[status] || STATUS_STYLES.assigned;

  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-black",
        config.className,
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", config.dot)}
      />

      {config.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11px] font-black capitalize",
        PRIORITY_STYLES[priority] ||
        PRIORITY_STYLES.medium,
      )}
    >
      {priority === "urgent" && (
        <Zap className="h-3 w-3" />
      )}

      {priority || "medium"}
    </span>
  );
}

function UserAvatar({ user, size = "md" }) {
  const sizeClass =
    size === "sm"
      ? "h-8 w-8"
      : size === "lg"
        ? "h-11 w-11"
        : "h-9 w-9";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100",
        sizeClass,
      )}
    >
      {user?.profileImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.profileImage}
          alt={getUserName(user)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-[10px] font-black text-gray-600">
          {getUserInitials(user)}
        </span>
      )}
    </div>
  );
}

function UserCard({ label, user }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
      <p className="text-[9px] font-black uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <div className="mt-2 flex items-center gap-2.5">
        <UserAvatar user={user} />

        <div className="min-w-0">
          <p className="truncate text-xs font-black text-gray-900">
            {getUserName(user)}
          </p>

          <p className="truncate text-[10px] text-gray-400">
            {user?.email || user?.role || "Admin user"}
          </p>
        </div>
      </div>
    </div>
  );
}

function MediaCard({ media }) {
  const isImage = media?.resourceType === "image";
  const isVideo = media?.resourceType === "video";

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="relative h-36 bg-gray-100">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.url}
            alt={media.fileName || "Task media"}
            className="h-full w-full object-cover"
          />
        ) : isVideo ? (
          <video
            src={media.url}
            controls
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center">
            <File className="h-7 w-7 text-gray-400" />

            <p className="mt-2 text-[10px] font-bold uppercase text-gray-500">
              {media.resourceType || "File"}
            </p>
          </div>
        )}

        <a
          href={media.url}
          target="_blank"
          rel="noreferrer"
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-gray-700 shadow-sm hover:bg-white"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="p-3">
        <p className="truncate text-[11px] font-bold text-gray-800">
          {media.fileName || "Task attachment"}
        </p>

        <p className="mt-0.5 truncate text-[9px] text-gray-400">
          {media.mimeType || media.resourceType || "Attachment"}
        </p>
      </div>
    </div>
  );
}

function Modal({
  open,
  title,
  description,
  children,
  confirmLabel,
  confirmTone = "dark",
  loading,
  disabled,
  onClose,
  onConfirm,
}) {
  if (!open) return null;

  const confirmClass =
    confirmTone === "red"
      ? "bg-red-600 hover:bg-red-700"
      : confirmTone === "orange"
        ? "bg-orange-600 hover:bg-orange-700"
        : "bg-gray-950 hover:bg-black";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-3 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0"
      />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-base font-black text-gray-950">
              {title}
            </h2>

            {description && (
              <p className="mt-1 text-xs leading-5 text-gray-500">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-4 sm:p-5">
          {children}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-9 rounded-lg border border-gray-200 bg-white px-4 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || disabled}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50",
              confirmClass,
            )}
          >
            {loading && (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            )}

            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[#f5f6f8] p-3 sm:p-4 lg:p-5">
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-2xl bg-white" />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">
            <div className="h-72 animate-pulse rounded-2xl bg-white" />
            <div className="h-80 animate-pulse rounded-2xl bg-white" />
          </div>

          <div className="h-96 animate-pulse rounded-2xl bg-white" />
        </div>
      </div>
    </div>
  );
}

export default function AdminUserTaskDetailPage() {
  const router = useRouter();
  const params = useParams();

  const taskId = params?.id;

  const {
    selectedTask,
    taskLoading,
    actionLoading,
    error,
    actionError,

    fetchTaskById,
    startTask,
    submitTask,
    addFeedback,
    requestRework,
    closeTask,
    cancelTask,
    archiveTask,
    deleteTask,
    clearError,
  } = useAdminUserTaskStore();

  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [comment, setComment] = useState("");

  const [modal, setModal] = useState(null);
  const [submissionMessage, setSubmissionMessage] =
    useState("");
  const [reworkFeedback, setReworkFeedback] = useState("");
  const [closeFeedback, setCloseFeedback] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    setCurrentAdmin(getStoredAdmin());
  }, []);

  useEffect(() => {
    if (!taskId) return;

    clearError();
    fetchTaskById(taskId).catch(() => { });
  }, [clearError, fetchTaskById, taskId]);

  const refreshTask = useCallback(() => {
    clearError();
    fetchTaskById(taskId).catch(() => { });
  }, [clearError, fetchTaskById, taskId]);

  const assignedById =
    selectedTask?.assignedBy?._id ||
    selectedTask?.assignedBy;

  const assignedToId =
    selectedTask?.assignedTo?._id ||
    selectedTask?.assignedTo;

  const currentAdminId =
    currentAdmin?._id ||
    currentAdmin?.id;

  const isSuperAdmin =
    currentAdmin?.role === "superadmin";

  const isCreator =
    currentAdminId &&
    String(currentAdminId) === String(assignedById);

  const isAssignee =
    currentAdminId &&
    String(currentAdminId) === String(assignedToId);

  const canManage = isCreator || isSuperAdmin;
  const canWork = isAssignee || isSuperAdmin;

  const feedbackList = useMemo(() => {
    return [...(selectedTask?.feedback || [])].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() -
        new Date(b.createdAt).getTime(),
    );
  }, [selectedTask?.feedback]);

  const activityList = useMemo(() => {
    return [...(selectedTask?.activity || [])].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    );
  }, [selectedTask?.activity]);

  const closeModal = () => {
    if (actionLoading) return;

    setModal(null);
    setModalError("");
    setSubmissionMessage("");
    setReworkFeedback("");
    setCloseFeedback("");
    setCancelReason("");
  };

  const performAction = async (callback) => {
    try {
      setModalError("");
      await callback();
      closeModal();
    } catch (requestError) {
      setModalError(
        requestError?.message || "Unable to complete action",
      );
    }
  };

  const handleStart = async () => {
    try {
      await startTask(taskId);
    } catch {
      // Store handles action error.
    }
  };

  const handleComment = async () => {
    const message = comment.trim();

    if (!message) return;

    try {
      await addFeedback(taskId, {
        message,
        media: [],
      });

      setComment("");
    } catch {
      // Store handles action error.
    }
  };

  const handleArchive = async () => {
    try {
      await archiveTask(taskId, !selectedTask.isArchived);
    } catch {
      // Store handles action error.
    }
  };

  const handleDelete = async () => {
    await performAction(async () => {
      await deleteTask(taskId);
      router.push("/admin-user-tasks");
    });
  };

  if (taskLoading && !selectedTask) {
    return <PageSkeleton />;
  }

  if (!taskLoading && !selectedTask) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8] p-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-9 w-9 text-red-500" />

          <h1 className="mt-3 text-lg font-black">
            Task not found
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            {error || "The requested task could not be loaded."}
          </p>

          <button
            type="button"
            onClick={() => router.push("/admin-user-tasks")}
            className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-gray-950 px-4 text-xs font-bold text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to tasks
          </button>
        </div>
      </div>
    );
  }

  const status = selectedTask.status;

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-gray-950">
      <div className="w-full space-y-4 p-3 sm:p-4 lg:p-5">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <button
                type="button"
                onClick={() => router.push("/admin-user-tasks")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-gray-500">
                    {selectedTask.taskNumber}
                  </span>

                  {selectedTask.isOverdue && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[10px] font-black text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      Overdue
                    </span>
                  )}

                  {selectedTask.isArchived && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[10px] font-black text-gray-600">
                      <Archive className="h-3 w-3" />
                      Archived
                    </span>
                  )}
                </div>

                <h1 className="mt-2 text-xl font-black leading-tight tracking-tight sm:text-2xl">
                  {selectedTask.heading}
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge status={status} />

                  <PriorityBadge
                    priority={selectedTask.priority}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={refreshTask}
                disabled={taskLoading}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                <RefreshCcw
                  className={cn(
                    "h-3.5 w-3.5",
                    taskLoading && "animate-spin",
                  )}
                />
                Refresh
              </button>

              {canManage &&
                !["closed", "cancelled"].includes(status) && (
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/admin-user-tasks/${taskId}/edit`,
                      )
                    }
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                )}

              {canWork &&
                ["assigned", "rework"].includes(status) && (
                  <button
                    type="button"
                    onClick={handleStart}
                    disabled={actionLoading}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CirclePlay className="h-3.5 w-3.5" />
                    )}
                    Start Task
                  </button>
                )}

              {canWork &&
                ["assigned", "in_progress", "rework"].includes(
                  status,
                ) && (
                  <button
                    type="button"
                    onClick={() => setModal("submit")}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-violet-600 px-3.5 text-xs font-bold text-white hover:bg-violet-700"
                  >
                    <FileCheck2 className="h-3.5 w-3.5" />
                    Submit
                  </button>
                )}

              {canManage && status === "submitted" && (
                <>
                  <button
                    type="button"
                    onClick={() => setModal("rework")}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 text-xs font-bold text-orange-700 hover:bg-orange-100"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Request Rework
                  </button>

                  <button
                    type="button"
                    onClick={() => setModal("close")}
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3.5 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Close Task
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {(error || actionError) && (
          <section className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 text-red-600" />

              <p className="text-xs font-semibold text-red-700">
                {actionError || error}
              </p>
            </div>

            <button
              type="button"
              onClick={clearError}
              className="text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </section>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_350px]">
          <main className="min-w-0 space-y-4">
            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
                <h2 className="text-sm font-black">
                  Task Brief
                </h2>

                <p className="mt-0.5 text-[11px] text-gray-500">
                  Complete work instructions and requirements.
                </p>
              </div>

              <div className="p-4 sm:p-5">
                <div className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">
                  {selectedTask.brief}
                </div>

                {!!selectedTask.tags?.length && (
                  <div className="mt-5 border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-gray-400" />

                      <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                        Tags
                      </p>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedTask.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-lg bg-gray-100 px-2.5 py-1.5 text-[10px] font-bold text-gray-600"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {!!selectedTask.media?.length && (
              <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-gray-500" />

                    <h2 className="text-sm font-black">
                      Task Attachments
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-5">
                  {selectedTask.media.map((media) => (
                    <MediaCard
                      key={media._id || media.url}
                      media={media}
                    />
                  ))}
                </div>
              </section>
            )}

            {(selectedTask.submissionMessage ||
              selectedTask.submissionMedia?.length > 0) && (
                <section className="overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
                  <div className="border-b border-violet-100 bg-violet-50 px-4 py-4 sm:px-5">
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="h-4 w-4 text-violet-600" />

                      <h2 className="text-sm font-black text-violet-900">
                        Latest Submission
                      </h2>
                    </div>

                    <p className="mt-1 text-[10px] text-violet-600">
                      Submitted on{" "}
                      {formatDateTime(selectedTask.submittedAt)}
                    </p>
                  </div>

                  <div className="p-4 sm:p-5">
                    {selectedTask.submissionMessage && (
                      <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                        {selectedTask.submissionMessage}
                      </p>
                    )}

                    {!!selectedTask.submissionMedia?.length && (
                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {selectedTask.submissionMedia.map(
                          (media) => (
                            <MediaCard
                              key={media._id || media.url}
                              media={media}
                            />
                          ),
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )}

            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-gray-500" />

                  <h2 className="text-sm font-black">
                    Comments & Feedback
                  </h2>

                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-black text-gray-500">
                    {feedbackList.length}
                  </span>
                </div>
              </div>

              <div className="space-y-4 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <UserAvatar user={currentAdmin} />

                  <div className="min-w-0 flex-1">
                    <textarea
                      value={comment}
                      onChange={(event) =>
                        setComment(event.target.value)
                      }
                      rows={3}
                      maxLength={5000}
                      placeholder="Add a comment or update..."
                      className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 text-sm outline-none focus:border-gray-950 focus:bg-white focus:ring-2 focus:ring-gray-950/10"
                    />

                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleComment}
                        disabled={
                          !comment.trim() || actionLoading
                        }
                        className="inline-flex h-9 items-center gap-2 rounded-lg bg-gray-950 px-3.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {actionLoading ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}

                        Add Comment
                      </button>
                    </div>
                  </div>
                </div>

                {feedbackList.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
                    <MessageSquare className="mx-auto h-6 w-6 text-gray-300" />

                    <p className="mt-2 text-xs font-bold text-gray-500">
                      No comments yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 border-t border-gray-100 pt-4">
                    {feedbackList.map((feedback) => (
                      <div
                        key={feedback._id}
                        className={cn(
                          "rounded-xl border p-3.5",
                          feedback.type === "rework"
                            ? "border-orange-200 bg-orange-50"
                            : feedback.type === "submission"
                              ? "border-violet-200 bg-violet-50"
                              : "border-gray-200 bg-white",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <UserAvatar
                            user={feedback.createdBy}
                            size="sm"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xs font-black text-gray-900">
                                {getUserName(
                                  feedback.createdBy,
                                )}
                              </p>

                              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[8px] font-black uppercase text-gray-500">
                                {feedback.type}
                              </span>

                              <span className="text-[9px] text-gray-400">
                                {formatDateTime(
                                  feedback.createdAt,
                                )}
                              </span>
                            </div>

                            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-gray-700">
                              {feedback.message}
                            </p>

                            {!!feedback.media?.length && (
                              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {feedback.media.map((media) => (
                                  <MediaCard
                                    key={
                                      media._id || media.url
                                    }
                                    media={media}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
                <h2 className="text-sm font-black">
                  Activity Timeline
                </h2>

                <p className="mt-0.5 text-[11px] text-gray-500">
                  Complete history of this task.
                </p>
              </div>

              <div className="p-4 sm:p-5">
                {activityList.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    No activity recorded.
                  </p>
                ) : (
                  <div className="space-y-0">
                    {activityList.map((activity, index) => (
                      <div
                        key={activity._id}
                        className="relative flex gap-3 pb-5 last:pb-0"
                      >
                        {index !==
                          activityList.length - 1 && (
                            <div className="absolute left-[15px] top-8 h-[calc(100%-20px)] w-px bg-gray-200" />
                          )}

                        <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white">
                          <Clock3 className="h-3.5 w-3.5 text-gray-500" />
                        </div>

                        <div className="min-w-0 pt-0.5">
                          <p className="text-xs font-black text-gray-800">
                            {ACTIVITY_LABELS[activity.type] ||
                              activity.type}
                          </p>

                          {activity.message && (
                            <p className="mt-1 text-[11px] text-gray-500">
                              {activity.message}
                            </p>
                          )}

                          <p className="mt-1 text-[9px] text-gray-400">
                            {getUserName(activity.actor)} ·{" "}
                            {formatDateTime(activity.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </main>

          <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-wide text-gray-500">
                Assignment
              </h2>

              <div className="mt-3 grid grid-cols-1 gap-2">
                <UserCard
                  label="Assigned To"
                  user={selectedTask.assignedTo}
                />

                <UserCard
                  label="Created By"
                  user={selectedTask.assignedBy}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-wide text-gray-500">
                Task Dates
              </h2>

              <div className="mt-4 space-y-3">
                <DateRow
                  label="Created"
                  value={selectedTask.createdAt}
                />

                <DateRow
                  label="Deadline"
                  value={selectedTask.deadline}
                  danger={selectedTask.isOverdue}
                />

                <DateRow
                  label="Started"
                  value={selectedTask.startedAt}
                />

                <DateRow
                  label="Submitted"
                  value={selectedTask.submittedAt}
                />

                <DateRow
                  label="Closed"
                  value={selectedTask.closedAt}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-wide text-gray-500">
                Task Statistics
              </h2>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <StatCard
                  label="Comments"
                  value={selectedTask.feedback?.length || 0}
                />

                <StatCard
                  label="Activities"
                  value={selectedTask.activity?.length || 0}
                />

                <StatCard
                  label="Reworks"
                  value={selectedTask.reworkCount || 0}
                />

                <StatCard
                  label="Files"
                  value={
                    (selectedTask.media?.length || 0) +
                    (selectedTask.submissionMedia?.length ||
                      0)
                  }
                />
              </div>
            </section>

            {canManage && (
              <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="text-xs font-black uppercase tracking-wide text-gray-500">
                  Management Actions
                </h2>

                <div className="mt-3 space-y-2">
                  {!["closed", "cancelled"].includes(status) && (
                    <button
                      type="button"
                      onClick={() => setModal("cancel")}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 text-xs font-bold text-red-700 hover:bg-red-100"
                    >
                      <XCircle className="h-4 w-4" />
                      Cancel Task
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleArchive}
                    disabled={actionLoading}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {selectedTask.isArchived ? (
                      <ArchiveRestore className="h-4 w-4" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}

                    {selectedTask.isArchived
                      ? "Restore Task"
                      : "Archive Task"}
                  </button>

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => setModal("delete")}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white text-xs font-bold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Permanently
                    </button>
                  )}
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>

      <Modal
        open={modal === "submit"}
        title="Submit Task"
        description="Describe the completed work before sending it for review."
        confirmLabel="Submit for Review"
        loading={actionLoading}
        disabled={!submissionMessage.trim()}
        onClose={closeModal}
        onConfirm={() =>
          performAction(() =>
            submitTask(taskId, {
              message: submissionMessage.trim(),
              media: [],
            }),
          )
        }
      >
        <textarea
          value={submissionMessage}
          onChange={(event) =>
            setSubmissionMessage(event.target.value)
          }
          rows={7}
          maxLength={5000}
          placeholder="Explain what was completed, important results and anything the reviewer should check..."
          className="w-full resize-y rounded-xl border border-gray-200 px-3.5 py-3 text-sm leading-6 outline-none focus:border-gray-950 focus:ring-2 focus:ring-gray-950/10"
        />

        {modalError && (
          <p className="mt-2 text-xs font-semibold text-red-600">
            {modalError}
          </p>
        )}
      </Modal>

      <Modal
        open={modal === "rework"}
        title="Request Rework"
        description="Explain clearly what needs to be corrected or completed."
        confirmLabel="Request Rework"
        confirmTone="orange"
        loading={actionLoading}
        disabled={!reworkFeedback.trim()}
        onClose={closeModal}
        onConfirm={() =>
          performAction(() =>
            requestRework(taskId, {
              feedback: reworkFeedback.trim(),
              media: [],
            }),
          )
        }
      >
        <textarea
          value={reworkFeedback}
          onChange={(event) =>
            setReworkFeedback(event.target.value)
          }
          rows={7}
          maxLength={5000}
          placeholder="Mention the exact changes required..."
          className="w-full resize-y rounded-xl border border-gray-200 px-3.5 py-3 text-sm leading-6 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
        />

        {modalError && (
          <p className="mt-2 text-xs font-semibold text-red-600">
            {modalError}
          </p>
        )}
      </Modal>

      <Modal
        open={modal === "close"}
        title="Close Task"
        description="Approve the submitted work and mark this task as completed."
        confirmLabel="Approve & Close"
        loading={actionLoading}
        onClose={closeModal}
        onConfirm={() =>
          performAction(() =>
            closeTask(taskId, {
              feedback: closeFeedback.trim(),
            }),
          )
        }
      >
        <textarea
          value={closeFeedback}
          onChange={(event) =>
            setCloseFeedback(event.target.value)
          }
          rows={5}
          maxLength={5000}
          placeholder="Optional approval feedback..."
          className="w-full resize-y rounded-xl border border-gray-200 px-3.5 py-3 text-sm leading-6 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />

        {modalError && (
          <p className="mt-2 text-xs font-semibold text-red-600">
            {modalError}
          </p>
        )}
      </Modal>

      <Modal
        open={modal === "cancel"}
        title="Cancel Task"
        description="The task will be marked as cancelled and cannot be worked on further."
        confirmLabel="Cancel Task"
        confirmTone="red"
        loading={actionLoading}
        disabled={!cancelReason.trim()}
        onClose={closeModal}
        onConfirm={() =>
          performAction(() =>
            cancelTask(taskId, cancelReason.trim()),
          )
        }
      >
        <textarea
          value={cancelReason}
          onChange={(event) =>
            setCancelReason(event.target.value)
          }
          rows={5}
          maxLength={2000}
          placeholder="Enter the reason for cancellation..."
          className="w-full resize-y rounded-xl border border-gray-200 px-3.5 py-3 text-sm leading-6 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
        />

        {modalError && (
          <p className="mt-2 text-xs font-semibold text-red-600">
            {modalError}
          </p>
        )}
      </Modal>

      <Modal
        open={modal === "delete"}
        title="Delete Task Permanently"
        description="This action permanently removes the task and cannot be undone."
        confirmLabel="Delete Permanently"
        confirmTone="red"
        loading={actionLoading}
        onClose={closeModal}
        onConfirm={handleDelete}
      >
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-bold text-red-800">
            You are permanently deleting:
          </p>

          <p className="mt-2 text-sm font-black text-red-950">
            {selectedTask.heading}
          </p>

          <p className="mt-1 font-mono text-[10px] text-red-600">
            {selectedTask.taskNumber}
          </p>
        </div>

        {modalError && (
          <p className="mt-2 text-xs font-semibold text-red-600">
            {modalError}
          </p>
        )}
      </Modal>
    </div>
  );
}

function DateRow({ label, value, danger = false }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-[10px] font-bold text-gray-400">
        {label}
      </span>

      <span
        className={cn(
          "text-right text-[10px] font-bold",
          danger ? "text-red-600" : "text-gray-700",
        )}
      >
        {formatDateTime(value)}
      </span>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
      <p className="text-[9px] font-bold uppercase text-gray-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-gray-950">
        {Number(value || 0).toLocaleString("en-IN")}
      </p>
    </div>
  );
}
