// oatclub-admin/store/adminUserTaskStore.js

import { create } from "zustand";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const getToken = () => {
  if (typeof window === "undefined") return "";

  return (
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    ""
  );
};

const buildHeaders = (customHeaders = {}) => {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token
      ? {
        Authorization: `Bearer ${token}`,
      }
      : {}),
    ...customHeaders,
  };
};

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      value === false
    ) {
      return;
    }

    if (Array.isArray(value)) {
      if (value.length) {
        searchParams.set(key, value.join(","));
      }

      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();

  return query ? `?${query}` : "";
};

const parseResponse = async (response) => {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data?.message || data?.error || "Something went wrong",
    );

    error.status = response.status;
    error.code = data?.code || "";
    error.data = data;

    throw error;
  }

  return data;
};

const request = async (endpoint, options = {}) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: buildHeaders(options.headers),
    cache: "no-store",
  });

  return parseResponse(response);
};

const initialFilters = {
  search: "",
  status: "",
  priority: "",
  assignedTo: "",
  assignedBy: "",
  scope: "all",
  deadlineFrom: "",
  deadlineTo: "",
  overdue: false,
  isArchived: false,
  sortBy: "createdAt",
  sortOrder: "desc",
  page: 1,
  limit: 20,
};

const initialSummary = {
  status: {
    assigned: 0,
    in_progress: 0,
    submitted: 0,
    rework: 0,
    closed: 0,
    cancelled: 0,
  },

  priority: {
    low: 0,
    medium: 0,
    high: 0,
    urgent: 0,
  },

  overdueCount: 0,
  assignedToMeCount: 0,
  createdByMeCount: 0,
  submittedForReviewCount: 0,
};

const upsertTask = (tasks = [], updatedTask) => {
  if (!updatedTask?._id) return tasks;

  const exists = tasks.some(
    (task) => String(task._id) === String(updatedTask._id),
  );

  if (!exists) {
    return [updatedTask, ...tasks];
  }

  return tasks.map((task) =>
    String(task._id) === String(updatedTask._id)
      ? updatedTask
      : task,
  );
};

const removeTaskById = (tasks = [], taskId) => {
  return tasks.filter(
    (task) => String(task._id) !== String(taskId),
  );
};

const useAdminUserTaskStore = create((set, get) => ({
  /* ============================================================
     STATE
  ============================================================ */

  tasks: [],
  selectedTask: null,

  summary: initialSummary,

  notifications: [],
  notificationTotal: 0,
  unreadNotificationCount: 0,
  notificationPage: 1,
  notificationLimit: 20,
  notificationTotalPages: 0,

  filters: initialFilters,

  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,

  loading: false,
  taskLoading: false,
  summaryLoading: false,
  notificationLoading: false,
  actionLoading: false,

  error: null,
  actionError: null,
  successMessage: "",

  /* ============================================================
     BASIC SETTERS
  ============================================================ */

  setFilters: (nextFilters = {}) => {
    set((state) => ({
      filters: {
        ...state.filters,
        ...nextFilters,
      },
    }));
  },

  setFilter: (key, value) => {
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
    }));
  },

  resetFilters: () => {
    set({
      filters: {
        ...initialFilters,
      },
      page: 1,
    });
  },

  setSelectedTask: (task) => {
    set({
      selectedTask: task || null,
    });
  },

  clearSelectedTask: () => {
    set({
      selectedTask: null,
    });
  },

  clearError: () => {
    set({
      error: null,
      actionError: null,
    });
  },

  clearSuccessMessage: () => {
    set({
      successMessage: "",
    });
  },

  resetStore: () => {
    set({
      tasks: [],
      selectedTask: null,

      summary: initialSummary,

      notifications: [],
      notificationTotal: 0,
      unreadNotificationCount: 0,
      notificationPage: 1,
      notificationLimit: 20,
      notificationTotalPages: 0,

      filters: initialFilters,

      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,

      loading: false,
      taskLoading: false,
      summaryLoading: false,
      notificationLoading: false,
      actionLoading: false,

      error: null,
      actionError: null,
      successMessage: "",
    });
  },

  /* ============================================================
     GET ALL TASKS
  ============================================================ */

  fetchTasks: async (customParams = {}) => {
    try {
      set({
        loading: true,
        error: null,
      });

      const state = get();

      const params = {
        ...state.filters,
        page: state.filters.page || state.page || 1,
        limit: state.filters.limit || state.limit || 20,
        ...customParams,
      };

      const queryString = buildQueryString(params);

      const data = await request(
        `/api/admin-user-tasks${queryString}`,
      );

      set({
        tasks: data?.tasks || [],
        total: data?.total || 0,
        page: data?.page || 1,
        limit: data?.limit || params.limit || 20,
        totalPages: data?.totalPages || 0,

        filters: {
          ...get().filters,
          page: data?.page || params.page || 1,
          limit: data?.limit || params.limit || 20,
        },

        loading: false,
        error: null,
      });

      return data;
    } catch (error) {
      set({
        loading: false,
        error: error.message,
      });

      throw error;
    }
  },

  refreshTasks: async () => {
    const state = get();

    return state.fetchTasks({
      page: state.page,
      limit: state.limit,
    });
  },

  setPage: async (page) => {
    const safePage = Math.max(1, Number(page) || 1);

    set((state) => ({
      page: safePage,
      filters: {
        ...state.filters,
        page: safePage,
      },
    }));

    return get().fetchTasks({
      page: safePage,
    });
  },

  setLimit: async (limit) => {
    const safeLimit = Math.min(
      100,
      Math.max(1, Number(limit) || 20),
    );

    set((state) => ({
      page: 1,
      limit: safeLimit,

      filters: {
        ...state.filters,
        page: 1,
        limit: safeLimit,
      },
    }));

    return get().fetchTasks({
      page: 1,
      limit: safeLimit,
    });
  },

  /* ============================================================
     GET SINGLE TASK
  ============================================================ */

  fetchTaskById: async (taskId) => {
    if (!taskId) {
      throw new Error("Task id is required");
    }

    try {
      set({
        taskLoading: true,
        error: null,
      });

      const data = await request(
        `/api/admin-user-tasks/${taskId}`,
      );

      const task = data?.task || null;

      set((state) => ({
        selectedTask: task,
        tasks: task
          ? upsertTask(state.tasks, task)
          : state.tasks,
        taskLoading: false,
        error: null,
      }));

      return data;
    } catch (error) {
      set({
        taskLoading: false,
        error: error.message,
      });

      throw error;
    }
  },

  /* ============================================================
     CREATE TASK
  ============================================================ */

  createTask: async (payload = {}) => {
    try {
      set({
        actionLoading: true,
        actionError: null,
        successMessage: "",
      });

      const data = await request("/api/admin-user-tasks", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const createdTask = data?.task || null;

      set((state) => ({
        tasks: createdTask
          ? [createdTask, ...state.tasks]
          : state.tasks,

        selectedTask: createdTask || state.selectedTask,

        total: createdTask
          ? state.total + 1
          : state.total,

        actionLoading: false,
        actionError: null,
        successMessage:
          data?.message || "Task assigned successfully",
      }));

      get().fetchSummary().catch(() => { });

      return data;
    } catch (error) {
      set({
        actionLoading: false,
        actionError: error.message,
      });

      throw error;
    }
  },

  /* ============================================================
     UPDATE TASK
  ============================================================ */

  updateTask: async (taskId, payload = {}) => {
    if (!taskId) {
      throw new Error("Task id is required");
    }

    try {
      set({
        actionLoading: true,
        actionError: null,
        successMessage: "",
      });

      const data = await request(
        `/api/admin-user-tasks/${taskId}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );

      const updatedTask = data?.task || null;

      set((state) => ({
        tasks: updatedTask
          ? upsertTask(state.tasks, updatedTask)
          : state.tasks,

        selectedTask:
          updatedTask &&
            String(state.selectedTask?._id) === String(taskId)
            ? updatedTask
            : state.selectedTask,

        actionLoading: false,
        actionError: null,
        successMessage:
          data?.message || "Task updated successfully",
      }));

      get().fetchSummary().catch(() => { });

      return data;
    } catch (error) {
      set({
        actionLoading: false,
        actionError: error.message,
      });

      throw error;
    }
  },

  /* ============================================================
     REASSIGN TASK
  ============================================================ */

  reassignTask: async (taskId, assignedTo) => {
    return get().performTaskAction({
      taskId,
      endpoint: "reassign",
      method: "PATCH",
      payload: {
        assignedTo,
      },
      fallbackMessage: "Task reassigned successfully",
    });
  },

  /* ============================================================
     START TASK
  ============================================================ */

  startTask: async (taskId) => {
    return get().performTaskAction({
      taskId,
      endpoint: "start",
      method: "PATCH",
      payload: {},
      fallbackMessage: "Task marked as in progress",
    });
  },

  /* ============================================================
     SUBMIT TASK
  ============================================================ */

  submitTask: async (taskId, payload = {}) => {
    return get().performTaskAction({
      taskId,
      endpoint: "submit",
      method: "PATCH",
      payload,
      fallbackMessage: "Task submitted successfully",
    });
  },

  /* ============================================================
     ADD COMMENT / FEEDBACK
  ============================================================ */

  addFeedback: async (taskId, payload = {}) => {
    return get().performTaskAction({
      taskId,
      endpoint: "feedback",
      method: "POST",
      payload,
      fallbackMessage: "Feedback added successfully",
    });
  },

  /* ============================================================
     REQUEST REWORK
  ============================================================ */

  requestRework: async (taskId, payload = {}) => {
    return get().performTaskAction({
      taskId,
      endpoint: "rework",
      method: "PATCH",
      payload,
      fallbackMessage: "Task sent for rework",
    });
  },

  /* ============================================================
     CLOSE TASK
  ============================================================ */

  closeTask: async (taskId, payload = {}) => {
    return get().performTaskAction({
      taskId,
      endpoint: "close",
      method: "PATCH",
      payload,
      fallbackMessage: "Task closed successfully",
    });
  },

  /* ============================================================
     CANCEL TASK
  ============================================================ */

  cancelTask: async (taskId, reason = "") => {
    return get().performTaskAction({
      taskId,
      endpoint: "cancel",
      method: "PATCH",
      payload: {
        reason,
      },
      fallbackMessage: "Task cancelled successfully",
    });
  },

  /* ============================================================
     ARCHIVE / RESTORE TASK
  ============================================================ */

  archiveTask: async (taskId, isArchived = true) => {
    if (!taskId) {
      throw new Error("Task id is required");
    }

    try {
      set({
        actionLoading: true,
        actionError: null,
        successMessage: "",
      });

      const data = await request(
        `/api/admin-user-tasks/${taskId}/archive`,
        {
          method: "PATCH",
          body: JSON.stringify({
            isArchived,
          }),
        },
      );

      set((state) => ({
        tasks:
          isArchived &&
            !state.filters.isArchived
            ? removeTaskById(state.tasks, taskId)
            : state.tasks.map((task) =>
              String(task._id) === String(taskId)
                ? {
                  ...task,
                  isArchived:
                    data?.isArchived ?? isArchived,
                }
                : task,
            ),

        selectedTask:
          String(state.selectedTask?._id) === String(taskId)
            ? {
              ...state.selectedTask,
              isArchived:
                data?.isArchived ?? isArchived,
            }
            : state.selectedTask,

        actionLoading: false,
        actionError: null,
        successMessage:
          data?.message ||
          (isArchived
            ? "Task archived successfully"
            : "Task restored successfully"),
      }));

      get().fetchSummary().catch(() => { });

      return data;
    } catch (error) {
      set({
        actionLoading: false,
        actionError: error.message,
      });

      throw error;
    }
  },

  /* ============================================================
     GENERIC TASK ACTION HANDLER
  ============================================================ */

  performTaskAction: async ({
    taskId,
    endpoint,
    method = "PATCH",
    payload = {},
    fallbackMessage = "Task updated successfully",
  }) => {
    if (!taskId) {
      throw new Error("Task id is required");
    }

    if (!endpoint) {
      throw new Error("Task action endpoint is required");
    }

    try {
      set({
        actionLoading: true,
        actionError: null,
        successMessage: "",
      });

      const data = await request(
        `/api/admin-user-tasks/${taskId}/${endpoint}`,
        {
          method,
          body: JSON.stringify(payload),
        },
      );

      const updatedTask = data?.task || null;

      set((state) => ({
        tasks: updatedTask
          ? upsertTask(state.tasks, updatedTask)
          : state.tasks,

        selectedTask:
          updatedTask &&
            String(state.selectedTask?._id) === String(taskId)
            ? updatedTask
            : state.selectedTask,

        actionLoading: false,
        actionError: null,
        successMessage:
          data?.message || fallbackMessage,
      }));

      get().fetchSummary().catch(() => { });

      return data;
    } catch (error) {
      set({
        actionLoading: false,
        actionError: error.message,
      });

      throw error;
    }
  },

  /* ============================================================
     SUMMARY
  ============================================================ */

  fetchSummary: async () => {
    try {
      set({
        summaryLoading: true,
        error: null,
      });

      const data = await request(
        "/api/admin-user-tasks/summary",
      );

      set({
        summary: {
          ...initialSummary,
          ...(data?.summary || {}),
          status: {
            ...initialSummary.status,
            ...(data?.summary?.status || {}),
          },
          priority: {
            ...initialSummary.priority,
            ...(data?.summary?.priority || {}),
          },
        },

        summaryLoading: false,
        error: null,
      });

      return data;
    } catch (error) {
      set({
        summaryLoading: false,
        error: error.message,
      });

      throw error;
    }
  },

  /* ============================================================
     NOTIFICATIONS
  ============================================================ */

  fetchNotifications: async (params = {}) => {
    try {
      set({
        notificationLoading: true,
        error: null,
      });

      const queryString = buildQueryString({
        page: params.page || 1,
        limit: params.limit || 20,
        unreadOnly: params.unreadOnly || false,
      });

      const data = await request(
        `/api/admin-user-tasks/notifications${queryString}`,
      );

      set({
        notifications: data?.notifications || [],
        notificationTotal: data?.total || 0,
        unreadNotificationCount:
          data?.unreadCount || 0,
        notificationPage: data?.page || 1,
        notificationLimit: data?.limit || 20,
        notificationTotalPages:
          data?.totalPages || 0,

        notificationLoading: false,
        error: null,
      });

      return data;
    } catch (error) {
      set({
        notificationLoading: false,
        error: error.message,
      });

      throw error;
    }
  },

  markNotificationRead: async (
    taskId,
    notificationId,
  ) => {
    if (!taskId || !notificationId) {
      throw new Error(
        "Task id and notification id are required",
      );
    }

    try {
      const data = await request(
        `/api/admin-user-tasks/${taskId}/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          body: JSON.stringify({}),
        },
      );

      set((state) => {
        const wasUnread = state.notifications.some(
          (notification) =>
            String(notification._id) ===
            String(notificationId) &&
            !notification.isRead,
        );

        return {
          notifications: state.notifications.map(
            (notification) =>
              String(notification._id) ===
                String(notificationId)
                ? {
                  ...notification,
                  isRead: true,
                }
                : notification,
          ),

          unreadNotificationCount: wasUnread
            ? Math.max(
              0,
              state.unreadNotificationCount - 1,
            )
            : state.unreadNotificationCount,
        };
      });

      return data;
    } catch (error) {
      set({
        error: error.message,
      });

      throw error;
    }
  },

  markAllNotificationsRead: async () => {
    try {
      set({
        notificationLoading: true,
        error: null,
      });

      const data = await request(
        "/api/admin-user-tasks/notifications/read-all",
        {
          method: "PATCH",
          body: JSON.stringify({}),
        },
      );

      set((state) => ({
        notifications: state.notifications.map(
          (notification) => ({
            ...notification,
            isRead: true,
          }),
        ),

        unreadNotificationCount: 0,
        notificationLoading: false,
        error: null,
        successMessage:
          data?.message ||
          "All notifications marked as read",
      }));

      return data;
    } catch (error) {
      set({
        notificationLoading: false,
        error: error.message,
      });

      throw error;
    }
  },

  /* ============================================================
     DELETE TASK
  ============================================================ */

  deleteTask: async (taskId) => {
    if (!taskId) {
      throw new Error("Task id is required");
    }

    try {
      set({
        actionLoading: true,
        actionError: null,
        successMessage: "",
      });

      const data = await request(
        `/api/admin-user-tasks/${taskId}`,
        {
          method: "DELETE",
        },
      );

      set((state) => ({
        tasks: removeTaskById(
          state.tasks,
          taskId,
        ),

        selectedTask:
          String(state.selectedTask?._id) ===
            String(taskId)
            ? null
            : state.selectedTask,

        total: Math.max(0, state.total - 1),

        actionLoading: false,
        actionError: null,
        successMessage:
          data?.message ||
          "Task permanently deleted",
      }));

      get().fetchSummary().catch(() => { });

      return data;
    } catch (error) {
      set({
        actionLoading: false,
        actionError: error.message,
      });

      throw error;
    }
  },
}));

export default useAdminUserTaskStore;
