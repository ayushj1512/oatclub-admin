"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  FileText,
  LoaderCircle,
  Save,
  Tag,
  UserRound,
  X,
  Zap,
} from "lucide-react";

import useAdminUserTaskStore from "@/store/adminUserTaskStore";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const PRIORITIES = [
  {
    value: "low",
    label: "Low",
    description: "Can be completed when convenient",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
  {
    value: "medium",
    label: "Medium",
    description: "Normal business priority",
    className: "border-cyan-200 bg-cyan-50 text-cyan-700",
  },
  {
    value: "high",
    label: "High",
    description: "Should be completed soon",
    className: "border-orange-200 bg-orange-50 text-orange-700",
  },
  {
    value: "urgent",
    label: "Urgent",
    description: "Requires immediate attention",
    className: "border-red-200 bg-red-50 text-red-700",
  },
];

const cn = (...classes) => classes.filter(Boolean).join(" ");

const getToken = () => {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    ""
  );
};

const getAdminName = (admin) => {
  return (
    admin?.fullName ||
    admin?.username ||
    admin?.name ||
    admin?.email ||
    "Unknown admin"
  );
};

const getInitials = (admin) => {
  return getAdminName(admin)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
};

const normalizeAdmins = (data) => {
  const possibleLists = [
    data?.adminUsers,
    data?.admins,
    data?.users,
    data?.data,
    data?.results,
  ];

  return (
    possibleLists.find((item) => Array.isArray(item)) || []
  ).filter((admin) => admin?._id && admin?.isActive !== false);
};

const toDateTimeLocal = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );

  return localDate.toISOString().slice(0, 16);
};

function FieldLabel({ children, required = false, optional = false }) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      <label className="text-[11px] font-black uppercase tracking-[0.06em] text-gray-600">
        {children}
      </label>

      {required && <span className="text-red-500">*</span>}

      {optional && (
        <span className="text-[10px] font-medium normal-case tracking-normal text-gray-400">
          Optional
        </span>
      )}
    </div>
  );
}

function FieldError({ message }) {
  if (!message) return null;

  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-[11px] font-semibold text-red-600">
      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

function TagInput({ tags, onChange }) {
  const [input, setInput] = useState("");

  const addTag = useCallback(() => {
    const normalized = input
      .trim()
      .toLowerCase()
      .replace(/^#/, "")
      .replace(/\s+/g, "-");

    if (!normalized) return;

    if (!tags.includes(normalized) && tags.length < 30) {
      onChange([...tags, normalized]);
    }

    setInput("");
  }, [input, onChange, tags]);

  return (
    <div>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-gray-200 bg-white p-2 focus-within:border-gray-950 focus-within:ring-2 focus-within:ring-gray-950/10">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex h-7 items-center gap-1 rounded-lg bg-gray-100 pl-2.5 pr-1.5 text-[11px] font-bold text-gray-700"
          >
            #{tag}

            <button
              type="button"
              onClick={() =>
                onChange(tags.filter((currentTag) => currentTag !== tag))
              }
              className="flex h-4 w-4 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-700"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}

        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              addTag();
            }

            if (event.key === "Backspace" && !input && tags.length) {
              onChange(tags.slice(0, -1));
            }
          }}
          onBlur={addTag}
          placeholder={
            tags.length ? "Add another tag" : "production, accounts, dispatch"
          }
          className="h-7 min-w-36 flex-1 bg-transparent px-1 text-xs outline-none placeholder:text-gray-400"
        />
      </div>

      <p className="mt-1.5 text-[10px] text-gray-400">
        Press Enter or comma to add a tag.
      </p>
    </div>
  );
}

function AdminSelector({
  admins,
  value,
  onChange,
  loading,
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedAdmin = useMemo(
    () =>
      admins.find((admin) => String(admin._id) === String(value)) ||
      null,
    [admins, value],
  );

  const filteredAdmins = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return admins;

    return admins.filter((admin) =>
      [
        admin.fullName,
        admin.username,
        admin.email,
        admin.role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [admins, search]);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 text-left transition hover:border-gray-300 focus:border-gray-950 focus:ring-2 focus:ring-gray-950/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-70"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100">
            {selectedAdmin?.profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedAdmin.profileImage}
                alt={getAdminName(selectedAdmin)}
                className="h-full w-full object-cover"
              />
            ) : loading ? (
              <LoaderCircle className="h-4 w-4 animate-spin text-gray-500" />
            ) : selectedAdmin ? (
              <span className="text-[11px] font-black text-gray-600">
                {getInitials(selectedAdmin)}
              </span>
            ) : (
              <UserRound className="h-4 w-4 text-gray-500" />
            )}
          </div>

          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-gray-900">
              {loading
                ? "Loading admins..."
                : selectedAdmin
                  ? getAdminName(selectedAdmin)
                  : "Select admin user"}
            </p>

            <p className="truncate text-[10px] text-gray-400">
              {selectedAdmin?.email || selectedAdmin?.role || "Assignee"}
            </p>
          </div>
        </div>

        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
      </button>

      {open && !disabled && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />

          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="border-b border-gray-100 p-2.5">
              <input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search admin user..."
                className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs outline-none focus:border-gray-950 focus:bg-white"
              />
            </div>

            <div className="max-h-64 overflow-y-auto p-1.5">
              {filteredAdmins.map((admin) => {
                const selected =
                  String(admin._id) === String(value);

                return (
                  <button
                    key={admin._id}
                    type="button"
                    onClick={() => {
                      onChange(admin._id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition",
                      selected
                        ? "bg-gray-950 text-white"
                        : "hover:bg-gray-100",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold">
                        {getAdminName(admin)}
                      </p>

                      <p
                        className={cn(
                          "truncate text-[10px]",
                          selected ? "text-white/60" : "text-gray-400",
                        )}
                      >
                        {admin.email || admin.role}
                      </p>
                    </div>

                    {selected && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[#f5f6f8] p-3 sm:p-4 lg:p-5">
      <div className="space-y-4">
        <div className="h-20 animate-pulse rounded-2xl bg-white" />
        <div className="h-80 animate-pulse rounded-2xl bg-white" />
        <div className="h-64 animate-pulse rounded-2xl bg-white" />
      </div>
    </div>
  );
}

export default function EditAdminUserTaskPage() {
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
    updateTask,
    reassignTask,
    clearError,
  } = useAdminUserTaskStore();

  const [form, setForm] = useState({
    heading: "",
    brief: "",
    priority: "medium",
    deadline: "",
    assignedTo: "",
    tags: [],
  });

  const [admins, setAdmins] = useState([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminsError, setAdminsError] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [initialized, setInitialized] = useState(false);

  const fetchAdmins = useCallback(async () => {
    try {
      setAdminsLoading(true);
      setAdminsError("");

      const token = getToken();

      const response = await fetch(
        `${API_URL}/admin-users?limit=100&isActive=true`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token
              ? {
                Authorization: `Bearer ${token}`,
              }
              : {}),
          },
          cache: "no-store",
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to load admin users",
        );
      }

      setAdmins(normalizeAdmins(data));
    } catch (fetchError) {
      setAdminsError(fetchError.message);
    } finally {
      setAdminsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!taskId) return;

    clearError();

    Promise.allSettled([
      fetchTaskById(taskId),
      fetchAdmins(),
    ]);
  }, [clearError, fetchAdmins, fetchTaskById, taskId]);

  useEffect(() => {
    if (!selectedTask || initialized) return;

    setForm({
      heading: selectedTask.heading || "",
      brief: selectedTask.brief || "",
      priority: selectedTask.priority || "medium",
      deadline: toDateTimeLocal(selectedTask.deadline),
      assignedTo:
        selectedTask.assignedTo?._id ||
        selectedTask.assignedTo ||
        "",
      tags: Array.isArray(selectedTask.tags)
        ? selectedTask.tags
        : [],
    });

    setInitialized(true);
  }, [initialized, selectedTask]);

  const updateField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setFormErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[key];
      return nextErrors;
    });
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.heading.trim()) {
      nextErrors.heading = "Task heading is required";
    }

    if (!form.brief.trim()) {
      nextErrors.brief = "Task brief is required";
    }

    if (!form.assignedTo) {
      nextErrors.assignedTo = "Assignee is required";
    }

    if (form.deadline) {
      const parsedDeadline = new Date(form.deadline);

      if (Number.isNaN(parsedDeadline.getTime())) {
        nextErrors.deadline = "Enter a valid deadline";
      }
    }

    setFormErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) return;

    try {
      clearError();
      setSubmitError("");

      const originalAssignee =
        selectedTask?.assignedTo?._id ||
        selectedTask?.assignedTo ||
        "";

      const assigneeChanged =
        String(originalAssignee) !== String(form.assignedTo);

      await updateTask(taskId, {
        heading: form.heading.trim(),
        brief: form.brief.trim(),
        priority: form.priority,
        deadline: form.deadline
          ? new Date(form.deadline).toISOString()
          : null,
        tags: form.tags,
      });

      if (assigneeChanged) {
        await reassignTask(taskId, form.assignedTo);
      }

      router.push(`/admin-user-tasks/${taskId}`);
    } catch (submitRequestError) {
      setSubmitError(
        submitRequestError?.message || "Unable to update task",
      );
    }
  };

  if (taskLoading && !selectedTask) {
    return <PageSkeleton />;
  }

  if (!taskLoading && !selectedTask) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f6f8] p-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500" />

          <h1 className="mt-3 text-lg font-black text-gray-950">
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

  const locked = ["closed", "cancelled"].includes(
    selectedTask?.status,
  );

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-gray-950">
      <form
        onSubmit={handleSubmit}
        className="w-full space-y-4 p-3 sm:p-4 lg:p-5"
      >
        <section className="sticky top-0 z-20 rounded-2xl border border-gray-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  router.push(`/admin-user-tasks/${taskId}`)
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <div className="min-w-0">
                <h1 className="truncate text-lg font-black sm:text-xl">
                  Edit Task
                </h1>

                <p className="truncate text-[11px] text-gray-500">
                  {selectedTask?.taskNumber}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  router.push(`/admin-user-tasks/${taskId}`)
                }
                className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-xs font-bold text-gray-700 sm:flex-none"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={actionLoading || locked}
                className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              >
                {actionLoading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}

                Save Changes
              </button>
            </div>
          </div>
        </section>

        {(submitError || actionError || adminsError) && (
          <section className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />

            <p className="text-xs font-semibold text-red-700">
              {submitError || actionError || adminsError}
            </p>
          </section>
        )}

        {locked && (
          <section className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

            <p className="text-xs font-semibold text-amber-800">
              Closed or cancelled tasks cannot be edited.
            </p>
          </section>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="space-y-4">
            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-start gap-3 border-b border-gray-100 px-4 py-4 sm:px-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-950 text-white">
                  <FileText className="h-4 w-4" />
                </div>

                <div>
                  <h2 className="text-sm font-black">
                    Task Information
                  </h2>

                  <p className="text-[11px] text-gray-500">
                    Update the heading and work instructions.
                  </p>
                </div>
              </div>

              <div className="space-y-5 p-4 sm:p-5">
                <div>
                  <div className="flex items-center justify-between">
                    <FieldLabel required>Heading</FieldLabel>

                    <span className="text-[10px] text-gray-400">
                      {form.heading.length}/250
                    </span>
                  </div>

                  <input
                    value={form.heading}
                    disabled={locked}
                    maxLength={250}
                    onChange={(event) =>
                      updateField("heading", event.target.value)
                    }
                    className={cn(
                      "h-11 w-full rounded-xl border bg-white px-3.5 text-sm font-semibold outline-none disabled:bg-gray-50",
                      formErrors.heading
                        ? "border-red-300"
                        : "border-gray-200 focus:border-gray-950 focus:ring-2 focus:ring-gray-950/10",
                    )}
                  />

                  <FieldError message={formErrors.heading} />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <FieldLabel required>Brief</FieldLabel>

                    <span className="text-[10px] text-gray-400">
                      {form.brief.length.toLocaleString("en-IN")}
                      /10,000
                    </span>
                  </div>

                  <textarea
                    value={form.brief}
                    disabled={locked}
                    rows={13}
                    maxLength={10000}
                    onChange={(event) =>
                      updateField("brief", event.target.value)
                    }
                    className={cn(
                      "w-full resize-y rounded-xl border bg-white px-3.5 py-3 text-sm leading-6 outline-none disabled:bg-gray-50",
                      formErrors.brief
                        ? "border-red-300"
                        : "border-gray-200 focus:border-gray-950 focus:ring-2 focus:ring-gray-950/10",
                    )}
                  />

                  <FieldError message={formErrors.brief} />
                </div>
              </div>
            </section>

            <section className="overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-start gap-3 border-b border-gray-100 px-4 py-4 sm:px-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-950 text-white">
                  <UserRound className="h-4 w-4" />
                </div>

                <div>
                  <h2 className="text-sm font-black">Assignment</h2>

                  <p className="text-[11px] text-gray-500">
                    Change the assignee, priority or deadline.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 p-4 sm:grid-cols-2 sm:p-5">
                <div className="sm:col-span-2">
                  <FieldLabel required>Assigned To</FieldLabel>

                  <AdminSelector
                    admins={admins}
                    value={form.assignedTo}
                    loading={adminsLoading}
                    disabled={locked}
                    onChange={(value) =>
                      updateField("assignedTo", value)
                    }
                  />

                  <FieldError message={formErrors.assignedTo} />
                </div>

                <div>
                  <FieldLabel required>Priority</FieldLabel>

                  <div className="grid grid-cols-2 gap-2">
                    {PRIORITIES.map((priority) => {
                      const selected =
                        priority.value === form.priority;

                      return (
                        <button
                          key={priority.value}
                          type="button"
                          disabled={locked}
                          onClick={() =>
                            updateField("priority", priority.value)
                          }
                          className={cn(
                            "min-h-20 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                            selected
                              ? `${priority.className} ring-2 ring-current/10`
                              : "border-gray-200 bg-white hover:bg-gray-50",
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black">
                              {priority.label}
                            </span>

                            {priority.value === "urgent" ? (
                              <Zap className="h-3.5 w-3.5" />
                            ) : selected ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : null}
                          </div>

                          <p className="mt-1.5 text-[9px] leading-4 opacity-70">
                            {priority.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <FieldLabel optional>Deadline</FieldLabel>

                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                    <input
                      type="datetime-local"
                      value={form.deadline}
                      disabled={locked}
                      onChange={(event) =>
                        updateField("deadline", event.target.value)
                      }
                      className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-xs font-semibold outline-none focus:border-gray-950 focus:ring-2 focus:ring-gray-950/10 disabled:bg-gray-50"
                    />
                  </div>

                  <FieldError message={formErrors.deadline} />
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-start gap-3 border-b border-gray-100 px-4 py-4 sm:px-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-950 text-white">
                  <Tag className="h-4 w-4" />
                </div>

                <div>
                  <h2 className="text-sm font-black">Tags</h2>

                  <p className="text-[11px] text-gray-500">
                    Update searchable labels for this task.
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <TagInput
                  tags={form.tags}
                  onChange={(tags) => updateField("tags", tags)}
                />
              </div>
            </section>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-wide text-gray-500">
                Current Task
              </h2>

              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-[9px] font-bold uppercase text-gray-400">
                    Task Number
                  </p>

                  <p className="mt-1 font-mono text-xs font-bold text-gray-800">
                    {selectedTask?.taskNumber}
                  </p>
                </div>

                <div>
                  <p className="text-[9px] font-bold uppercase text-gray-400">
                    Current Status
                  </p>

                  <p className="mt-1 text-xs font-bold capitalize text-gray-800">
                    {selectedTask?.status?.replaceAll("_", " ")}
                  </p>
                </div>

                <div>
                  <p className="text-[9px] font-bold uppercase text-gray-400">
                    Rework Count
                  </p>

                  <p className="mt-1 text-xs font-bold text-gray-800">
                    {selectedTask?.reworkCount || 0}
                  </p>
                </div>
              </div>
            </section>

            <button
              type="submit"
              disabled={actionLoading || locked}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gray-950 text-xs font-bold text-white disabled:opacity-50"
            >
              {actionLoading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              Save Changes
            </button>
          </aside>
        </div>
      </form>
    </div>
  );
}
