"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  CircleUserRound,
  Clock3,
  FileText,
  ImageIcon,
  Link2,
  LoaderCircle,
  Paperclip,
  Plus,
  Save,
  Sparkles,
  Tag,
  Trash2,
  UserRound,
  X,
  Zap,
} from "lucide-react";

import useAdminUserTaskStore from "@/store/adminUserTaskStore";
import MediaPickerModal from "@/components/media/MediaPickerModal";
import { useAdminUsersVerifyStore } from "@/store/adminUsersStore";

/* ============================================================
   CONFIG
============================================================ */
const PRIORITIES = [
  {
    value: "low",
    label: "Low",
    description: "Can be completed when convenient",
    className:
      "border-slate-200 bg-slate-50 text-slate-700",
  },
  {
    value: "medium",
    label: "Medium",
    description: "Normal business priority",
    className:
      "border-cyan-200 bg-cyan-50 text-cyan-700",
  },
  {
    value: "high",
    label: "High",
    description: "Should be handled soon",
    className:
      "border-orange-200 bg-orange-50 text-orange-700",
  },
  {
    value: "urgent",
    label: "Urgent",
    description: "Requires immediate attention",
    className:
      "border-red-200 bg-red-50 text-red-700",
  },
];

const RESOURCE_TYPES = [
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "raw", label: "Raw File" },
  { value: "file", label: "File" },
  { value: "other", label: "Other" },
];

const INITIAL_FORM = {
  heading: "",
  brief: "",
  assignedTo: "",
  priority: "medium",
  deadline: "",
  tags: [],
  media: [],
};

/* ============================================================
   HELPERS
============================================================ */

const cn = (...classes) => classes.filter(Boolean).join(" ");



const getAdminName = (admin) => {
  if (!admin) return "Unknown admin";

  return (
    admin.fullName ||
    admin.username ||
    admin.name ||
    admin.email ||
    "Unknown admin"
  );
};

const getAdminInitials = (admin) => {
  return getAdminName(admin)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item.charAt(0).toUpperCase())
    .join("");
};

const getMinimumDeadline = () => {
  const now = new Date();

  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

  return now.toISOString().slice(0, 16);
};



const validateMediaUrl = (value) => {
  try {
    const url = new URL(value);

    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
};

/* ============================================================
   SMALL COMPONENTS
============================================================ */

function FieldLabel({
  children,
  required = false,
  optional = false,
}) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      <label className="text-[11px] font-black uppercase tracking-[0.06em] text-gray-600">
        {children}
      </label>

      {required && (
        <span className="text-xs font-bold text-red-500">*</span>
      )}

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

function SectionHeader({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="flex items-start gap-3 border-b border-gray-100 px-4 py-4 sm:px-5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-950 text-white">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0">
        <h2 className="text-sm font-black text-gray-950">
          {title}
        </h2>

        <p className="mt-0.5 text-[11px] leading-5 text-gray-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function AdminAvatar({ admin }) {
  return (
    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
      {admin?.profileImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={admin.profileImage}
          alt={getAdminName(admin)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[11px] font-black text-gray-600">
          {getAdminInitials(admin)}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   ASSIGNEE SELECTOR
============================================================ */

function AssigneeSelector({
  admins,
  value,
  onChange,
  loading,
  error,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedAdmin = useMemo(
    () =>
      admins.find(
        (admin) => String(admin._id) === String(value),
      ) || null,
    [admins, value],
  );

  const filteredAdmins = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return admins;

    return admins.filter((admin) => {
      const searchableText = [
        admin.fullName,
        admin.username,
        admin.email,
        admin.role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [admins, search]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (!loading) {
            setOpen((current) => !current);
          }
        }}
        className={cn(
          "flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 text-left outline-none transition",
          error
            ? "border-red-300 ring-2 ring-red-100"
            : open
              ? "border-gray-950 ring-2 ring-gray-950/10"
              : "border-gray-200 hover:border-gray-300",
          loading && "cursor-wait opacity-70",
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          {loading ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100">
              <LoaderCircle className="h-4 w-4 animate-spin text-gray-500" />
            </div>
          ) : selectedAdmin ? (
            <AdminAvatar admin={selectedAdmin} />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100">
              <UserRound className="h-4 w-4 text-gray-500" />
            </div>
          )}

          <div className="min-w-0">
            <p
              className={cn(
                "truncate text-xs font-bold",
                selectedAdmin
                  ? "text-gray-950"
                  : "text-gray-500",
              )}
            >
              {loading
                ? "Loading admin users..."
                : selectedAdmin
                  ? getAdminName(selectedAdmin)
                  : "Select admin user"}
            </p>

            <p className="truncate text-[10px] text-gray-400">
              {selectedAdmin
                ? selectedAdmin.email ||
                selectedAdmin.role ||
                "Admin user"
                : "Choose who will complete this task"}
            </p>
          </div>
        </div>

        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-gray-400 transition",
            open && "rotate-180",
          )}
        />
      </button>

      {open && !loading && (
        <>
          <button
            type="button"
            aria-label="Close assignee selector"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />

          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
            <div className="border-b border-gray-100 p-2.5">
              <div className="relative">
                <CircleUserRound className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />

                <input
                  autoFocus
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search name, email or role..."
                  className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-xs font-medium outline-none focus:border-gray-950 focus:bg-white focus:ring-2 focus:ring-gray-950/10"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto p-1.5">
              {filteredAdmins.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <UserRound className="mx-auto h-5 w-5 text-gray-300" />

                  <p className="mt-2 text-xs font-bold text-gray-600">
                    No admin users found
                  </p>
                </div>
              ) : (
                filteredAdmins.map((admin) => {
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
                        "flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition",
                        selected
                          ? "bg-gray-950 text-white"
                          : "hover:bg-gray-100",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <AdminAvatar admin={admin} />

                        <div className="min-w-0">
                          <p
                            className={cn(
                              "truncate text-xs font-bold",
                              selected
                                ? "text-white"
                                : "text-gray-950",
                            )}
                          >
                            {getAdminName(admin)}
                          </p>

                          <p
                            className={cn(
                              "truncate text-[10px]",
                              selected
                                ? "text-white/60"
                                : "text-gray-400",
                            )}
                          >
                            {admin.email ||
                              admin.role ||
                              "Admin user"}
                          </p>
                        </div>
                      </div>

                      {selected && (
                        <Check className="h-4 w-4 shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   TAG INPUT
============================================================ */

function TagInput({ tags, onChange }) {
  const [value, setValue] = useState("");

  const addTag = useCallback(() => {
    const normalizedTag = value
      .trim()
      .toLowerCase()
      .replace(/^#/, "")
      .replace(/\s+/g, "-");

    if (!normalizedTag) return;

    if (tags.includes(normalizedTag)) {
      setValue("");
      return;
    }

    if (tags.length >= 30) return;

    onChange([...tags, normalizedTag]);
    setValue("");
  }, [onChange, tags, value]);

  return (
    <div>
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-gray-200 bg-white p-2 transition focus-within:border-gray-950 focus-within:ring-2 focus-within:ring-gray-950/10">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex h-7 items-center gap-1 rounded-lg bg-gray-100 pl-2.5 pr-1.5 text-[11px] font-bold text-gray-700"
          >
            #{tag}

            <button
              type="button"
              onClick={() =>
                onChange(
                  tags.filter(
                    (currentTag) => currentTag !== tag,
                  ),
                )
              }
              className="flex h-4 w-4 items-center justify-center rounded text-gray-400 hover:bg-gray-200 hover:text-gray-700"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}

        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" ||
              event.key === ","
            ) {
              event.preventDefault();
              addTag();
            }

            if (
              event.key === "Backspace" &&
              !value &&
              tags.length
            ) {
              onChange(tags.slice(0, -1));
            }
          }}
          onBlur={addTag}
          placeholder={
            tags.length
              ? "Add another tag"
              : "production, dispatch, urgent-order..."
          }
          className="h-7 min-w-40 flex-1 bg-transparent px-1 text-xs font-medium outline-none placeholder:text-gray-400"
        />
      </div>

      <p className="mt-1.5 text-[10px] text-gray-400">
        Press Enter or comma to add a tag. Maximum 30 tags.
      </p>
    </div>
  );
}

/* ============================================================
   MAIN PAGE
============================================================ */

export default function CreateAdminUserTaskPage() {
  const router = useRouter();

  const {
    createTask,
    actionLoading,
    actionError,
    clearError,
  } = useAdminUserTaskStore();

  const {
    users: admins,
    loading: adminsLoading,
    error: adminsError,
    fetchUsers,
    clearError: clearAdminUsersError,
  } = useAdminUsersVerifyStore();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});



  const [submitError, setSubmitError] = useState("");
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  useEffect(() => {
    clearError();
    clearAdminUsersError();

    fetchUsers({
      limit: 100,
      isActive: true,
    });
  }, [
    clearError,
    clearAdminUsersError,
    fetchUsers,
  ]);

  /* ============================================================
     FORM HELPERS
  ============================================================ */

  const updateField = useCallback((key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setErrors((current) => {
      if (!current[key]) return current;

      const nextErrors = { ...current };
      delete nextErrors[key];

      return nextErrors;
    });

    setSubmitError("");
  }, []);

  const selectedAdmin = useMemo(
    () =>
      admins.find(
        (admin) =>
          String(admin._id) === String(form.assignedTo),
      ) || null,
    [admins, form.assignedTo],
  );

  const selectedPriority = useMemo(
    () =>
      PRIORITIES.find(
        (priority) =>
          priority.value === form.priority,
      ),
    [form.priority],
  );

  const validateForm = useCallback(() => {
    const nextErrors = {};

    if (!form.heading.trim()) {
      nextErrors.heading = "Task heading is required";
    } else if (form.heading.trim().length > 250) {
      nextErrors.heading =
        "Task heading cannot exceed 250 characters";
    }

    if (!form.brief.trim()) {
      nextErrors.brief = "Task brief is required";
    } else if (form.brief.trim().length > 10000) {
      nextErrors.brief =
        "Task brief cannot exceed 10,000 characters";
    }

    if (!form.assignedTo) {
      nextErrors.assignedTo =
        "Select an admin user for this task";
    }

    if (
      !PRIORITIES.some(
        (priority) =>
          priority.value === form.priority,
      )
    ) {
      nextErrors.priority = "Select a valid priority";
    }

    if (form.deadline) {
      const deadline = new Date(form.deadline);

      if (Number.isNaN(deadline.getTime())) {
        nextErrors.deadline = "Enter a valid deadline";
      }
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }, [form]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    clearError();
    setSubmitError("");

    if (!validateForm()) return;

    try {
      const payload = {
        heading: form.heading.trim(),
        brief: form.brief.trim(),
        assignedTo: form.assignedTo,
        priority: form.priority,
        deadline: form.deadline
          ? new Date(form.deadline).toISOString()
          : null,
        tags: form.tags,
        media: form.media,
      };

      const data = await createTask(payload);

      const taskId = data?.task?._id;

      if (taskId) {
        router.push(`/admin-user-tasks/${taskId}`);
        return;
      }

      router.push("/admin-user-tasks");
    } catch (error) {
      setSubmitError(
        error?.message || "Unable to create task",
      );
    }
  };

  const totalCharacters =
    form.heading.length + form.brief.length;

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-gray-950">
      <form
        onSubmit={handleSubmit}
        className="w-full space-y-4 p-3 sm:p-4 lg:p-5"
      >
        {/* ======================================================
            HEADER
        ====================================================== */}

        <section className="sticky top-0 z-20 rounded-2xl border border-gray-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  router.push("/admin-user-tasks")
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950"
                aria-label="Back to tasks"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-lg font-black tracking-tight sm:text-xl">
                    Create New Task
                  </h1>

                  <span className="hidden rounded-full bg-gray-100 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-gray-500 sm:inline-flex">
                    Internal
                  </span>
                </div>

                <p className="mt-0.5 truncate text-[11px] text-gray-500 sm:text-xs">
                  Assign work to another admin user with a
                  clear brief and deadline.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() =>
                  router.push("/admin-user-tasks")
                }
                className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-xs font-bold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 sm:flex-none"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={actionLoading || adminsLoading}
                className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-gray-950 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
              >
                {actionLoading ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}

                {actionLoading
                  ? "Creating..."
                  : "Create Task"}
              </button>
            </div>
          </div>
        </section>

        {/* ======================================================
            ERROR
        ====================================================== */}

        {(submitError || actionError) && (
          <section className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />

              <div className="min-w-0">
                <p className="text-xs font-black text-red-800">
                  Task could not be created
                </p>

                <p className="mt-0.5 break-words text-xs text-red-700">
                  {submitError || actionError}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSubmitError("");
                clearError();
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-red-600 hover:bg-red-100"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </section>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* ====================================================
              MAIN FORM
          ==================================================== */}

          <div className="min-w-0 space-y-4">
            {/* Basic Information */}

            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <SectionHeader
                icon={FileText}
                title="Task Information"
                description="Write a clear heading and detailed instructions for the assigned user."
              />

              <div className="space-y-5 p-4 sm:p-5">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <FieldLabel required>Task Heading</FieldLabel>

                    <span
                      className={cn(
                        "text-[10px] font-semibold",
                        form.heading.length > 250
                          ? "text-red-500"
                          : "text-gray-400",
                      )}
                    >
                      {form.heading.length}/250
                    </span>
                  </div>

                  <input
                    autoFocus
                    value={form.heading}
                    onChange={(event) =>
                      updateField(
                        "heading",
                        event.target.value,
                      )
                    }
                    placeholder="Example: Prepare dispatch report for pending orders"
                    maxLength={270}
                    className={cn(
                      "h-11 w-full rounded-xl border bg-white px-3.5 text-sm font-semibold text-gray-950 outline-none transition placeholder:font-normal placeholder:text-gray-400",
                      errors.heading
                        ? "border-red-300 ring-2 ring-red-100"
                        : "border-gray-200 hover:border-gray-300 focus:border-gray-950 focus:ring-2 focus:ring-gray-950/10",
                    )}
                  />

                  <FieldError message={errors.heading} />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <FieldLabel required>Task Brief</FieldLabel>

                    <span
                      className={cn(
                        "text-[10px] font-semibold",
                        form.brief.length > 10000
                          ? "text-red-500"
                          : "text-gray-400",
                      )}
                    >
                      {form.brief.length.toLocaleString(
                        "en-IN",
                      )}
                      /10,000
                    </span>
                  </div>

                  <textarea
                    value={form.brief}
                    onChange={(event) =>
                      updateField(
                        "brief",
                        event.target.value,
                      )
                    }
                    placeholder={`Describe the work clearly.

Include:
• What needs to be completed
• Required output or format
• Important instructions
• Any related order, product or customer details`}
                    rows={11}
                    maxLength={10200}
                    className={cn(
                      "w-full resize-y rounded-xl border bg-white px-3.5 py-3 text-sm leading-6 text-gray-900 outline-none transition placeholder:text-gray-400",
                      errors.brief
                        ? "border-red-300 ring-2 ring-red-100"
                        : "border-gray-200 hover:border-gray-300 focus:border-gray-950 focus:ring-2 focus:ring-gray-950/10",
                    )}
                  />

                  <FieldError message={errors.brief} />
                </div>
              </div>
            </section>

            {/* Assignment */}

            <section className="overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm">
              <SectionHeader
                icon={UserRound}
                title="Assignment"
                description="Choose the responsible admin user, task priority and deadline."
              />

              <div className="grid grid-cols-1 gap-5 p-4 sm:grid-cols-2 sm:p-5">
                <div className="sm:col-span-2">
                  <FieldLabel required>Assigned To</FieldLabel>

                  <AssigneeSelector
                    admins={admins}
                    value={form.assignedTo}
                    loading={adminsLoading}
                    error={errors.assignedTo}
                    onChange={(value) =>
                      updateField("assignedTo", value)
                    }
                  />

                  <FieldError
                    message={
                      errors.assignedTo || adminsError
                    }
                  />

                  {adminsError && (
                    <button
                      type="button"
                      onClick={() =>
                        fetchUsers({
                          limit: 100,
                          isActive: true,
                        })
                      }
                      className="mt-2 text-[11px] font-bold text-gray-700 underline underline-offset-2 hover:text-gray-950"
                    >
                      Retry loading admin users
                    </button>
                  )}
                </div>

                <div>
                  <FieldLabel required>Priority</FieldLabel>

                  <div className="grid grid-cols-2 gap-2">
                    {PRIORITIES.map((priority) => {
                      const selected =
                        form.priority === priority.value;

                      return (
                        <button
                          key={priority.value}
                          type="button"
                          onClick={() =>
                            updateField(
                              "priority",
                              priority.value,
                            )
                          }
                          className={cn(
                            "relative min-h-20 rounded-xl border p-3 text-left transition",
                            selected
                              ? `${priority.className} ring-2 ring-current/10`
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black">
                              {priority.label}
                            </span>

                            {priority.value === "urgent" ? (
                              <Zap className="h-3.5 w-3.5" />
                            ) : selected ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : null}
                          </div>

                          <p
                            className={cn(
                              "mt-1.5 text-[9px] leading-4",
                              selected
                                ? "text-current/70"
                                : "text-gray-400",
                            )}
                          >
                            {priority.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <FieldError message={errors.priority} />
                </div>

                <div>
                  <FieldLabel optional>Deadline</FieldLabel>

                  <div className="relative">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                    <input
                      type="datetime-local"
                      min={getMinimumDeadline()}
                      value={form.deadline}
                      onChange={(event) =>
                        updateField(
                          "deadline",
                          event.target.value,
                        )
                      }
                      className={cn(
                        "h-11 w-full rounded-xl border bg-white pl-10 pr-3 text-xs font-semibold text-gray-800 outline-none transition",
                        errors.deadline
                          ? "border-red-300 ring-2 ring-red-100"
                          : "border-gray-200 hover:border-gray-300 focus:border-gray-950 focus:ring-2 focus:ring-gray-950/10",
                      )}
                    />
                  </div>

                  <FieldError message={errors.deadline} />

                  <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-gray-400">
                    <Clock3 className="h-3 w-3" />
                    Deadline is optional but recommended.
                  </p>
                </div>
              </div>
            </section>

            {/* Tags */}

            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <SectionHeader
                icon={Tag}
                title="Task Tags"
                description="Add searchable labels for departments, work types, products or priorities."
              />

              <div className="p-4 sm:p-5">
                <FieldLabel optional>Tags</FieldLabel>

                <TagInput
                  tags={form.tags}
                  onChange={(tags) =>
                    updateField("tags", tags)
                  }
                />
              </div>
            </section>

            {/* Media */}

            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <SectionHeader
                icon={ImageIcon}
                title="Task Attachments"
                description="Attach Cloudinary images, videos, files or reference documents."
              />

              <div className="p-4 sm:p-5">
                <FieldLabel optional>Cloudinary Media</FieldLabel>

                <div className="space-y-4">
                  {!!form.media.length && (
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                      {form.media.map((item, index) => (
                        <div
                          key={item.publicId || index}
                          className="group relative overflow-hidden rounded-xl border bg-white"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.url}
                            alt=""
                            className="aspect-square w-full object-cover"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              updateField(
                                "media",
                                form.media.filter((_, i) => i !== index),
                              )
                            }
                            className="absolute right-2 top-2 rounded-lg bg-white/90 p-1 shadow"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setMediaPickerOpen(true)}
                    className="flex h-28 w-full items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-sm font-semibold hover:border-black"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Select Attachments
                  </button>

                  <MediaPickerModal
                    open={mediaPickerOpen}
                    onClose={() => setMediaPickerOpen(false)}
                    multiple
                    folder="oatclub/admin-user-tasks"
                    onSelect={(media) => {
                      updateField("media", media);
                      setMediaPickerOpen(false);
                    }}
                  />
                </div>
              </div>
            </section>
          </div>

          {/* ====================================================
              SIDEBAR
          ==================================================== */}

          <aside className="space-y-4 xl:sticky xl:top-[88px] xl:self-start">
            {/* Preview */}

            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-gray-500" />

                  <h2 className="text-xs font-black uppercase tracking-[0.06em] text-gray-700">
                    Task Preview
                  </h2>
                </div>
              </div>

              <div className="space-y-4 p-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">
                    Heading
                  </p>

                  <p
                    className={cn(
                      "mt-1 text-sm font-black leading-5",
                      form.heading
                        ? "text-gray-950"
                        : "text-gray-300",
                    )}
                  >
                    {form.heading || "Task heading will appear here"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span
                    className={cn(
                      "inline-flex h-7 items-center rounded-full border px-2.5 text-[10px] font-black",
                      selectedPriority?.className,
                    )}
                  >
                    {selectedPriority?.label || "Medium"}
                  </span>

                  <span className="inline-flex h-7 items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 text-[10px] font-black text-blue-700">
                    Assigned
                  </span>
                </div>

                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">
                    Assigned To
                  </p>

                  <div className="mt-2 flex items-center gap-2.5">
                    {selectedAdmin ? (
                      <AdminAvatar admin={selectedAdmin} />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200">
                        <UserRound className="h-4 w-4 text-gray-400" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <p
                        className={cn(
                          "truncate text-xs font-bold",
                          selectedAdmin
                            ? "text-gray-900"
                            : "text-gray-400",
                        )}
                      >
                        {selectedAdmin
                          ? getAdminName(selectedAdmin)
                          : "Not selected"}
                      </p>

                      <p className="truncate text-[9px] text-gray-400">
                        {selectedAdmin?.email ||
                          "Choose an admin user"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">
                      Deadline
                    </p>

                    <p className="mt-1 text-[11px] font-bold text-gray-700">
                      {form.deadline
                        ? new Intl.DateTimeFormat("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(
                          new Date(form.deadline),
                        )
                        : "Not set"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">
                      Attachments
                    </p>

                    <p className="mt-1 text-[11px] font-bold text-gray-700">
                      {form.media.length} file
                      {form.media.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                {form.tags.length > 0 && (
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">
                      Tags
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {form.tags.slice(0, 8).map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-gray-100 px-2 py-1 text-[9px] font-bold text-gray-600"
                        >
                          #{tag}
                        </span>
                      ))}

                      {form.tags.length > 8 && (
                        <span className="rounded bg-gray-100 px-2 py-1 text-[9px] font-bold text-gray-400">
                          +{form.tags.length - 8}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Checklist */}

            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-xs font-black text-gray-950">
                Before creating
              </h2>

              <div className="mt-3 space-y-2.5">
                <ChecklistItem
                  complete={Boolean(form.heading.trim())}
                  label="Task heading added"
                />

                <ChecklistItem
                  complete={Boolean(form.brief.trim())}
                  label="Instructions provided"
                />

                <ChecklistItem
                  complete={Boolean(form.assignedTo)}
                  label="Admin user selected"
                />

                <ChecklistItem
                  complete={Boolean(form.priority)}
                  label="Priority selected"
                />
              </div>

              <div className="mt-4 border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span>Total characters</span>

                  <span className="font-bold text-gray-600">
                    {totalCharacters.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </section>

            {/* Mobile Submit Duplicate */}

            <button
              type="submit"
              disabled={actionLoading || adminsLoading}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60 xl:hidden"
            >
              {actionLoading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {actionLoading
                ? "Creating Task..."
                : "Create Task"}
            </button>
          </aside>
        </div>
      </form>
    </div>
  );
}

/* ============================================================
   CHECKLIST ITEM
============================================================ */

function ChecklistItem({ complete, label }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
          complete
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-gray-200 bg-gray-50 text-transparent",
        )}
      >
        <Check className="h-3 w-3" />
      </div>

      <span
        className={cn(
          "text-[11px] font-semibold",
          complete ? "text-gray-800" : "text-gray-400",
        )}
      >
        {label}
      </span>
    </div>
  );
}
