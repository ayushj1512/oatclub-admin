"use client";

import {
  CheckSquare2,
  LogOut,
  Menu,
  User,
  UserCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import useLoginStore from "../../store/useLoginStore";
import useAdminUserTaskStore from "../../store/adminUserTaskStore";

const OATCLUB_LOGO_URL =
  "https://res.cloudinary.com/dpsvrt4sd/image/upload/v1780338447/qavpt44lsxsy3wrvuwi8.png";

export default function Header({ toggleSidebar }) {
  const router = useRouter();

  const logout = useLoginStore((state) => state.logout);

  const summary = useAdminUserTaskStore((state) => state.summary);
  const unreadNotificationCount = useAdminUserTaskStore(
    (state) => state.unreadNotificationCount,
  );
  const fetchSummary = useAdminUserTaskStore(
    (state) => state.fetchSummary,
  );
  const fetchNotifications = useAdminUserTaskStore(
    (state) => state.fetchNotifications,
  );

  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const loadTaskData = () => {
      fetchSummary().catch(() => { });

      fetchNotifications({
        page: 1,
        limit: 10,
        unreadOnly: true,
      }).catch(() => { });
    };

    loadTaskData();

    const interval = setInterval(loadTaskData, 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchSummary, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, []);

  const pendingTaskCount = useMemo(() => {
    const assignedToMe = Number(
      summary?.assignedToMeCount || 0,
    );

    const submittedForReview = Number(
      summary?.submittedForReviewCount || 0,
    );

    return assignedToMe + submittedForReview;
  }, [
    summary?.assignedToMeCount,
    summary?.submittedForReviewCount,
  ]);

  const actionCount = Math.max(
    pendingTaskCount,
    Number(unreadNotificationCount || 0),
  );

  const formattedActionCount =
    actionCount > 99 ? "99+" : actionCount;

  const handleNavigate = (path) => {
    setOpen(false);
    router.push(path);
  };

  const handleLogout = () => {
    setOpen(false);
    logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-oat-latte-light bg-oat-bg px-4 py-4 shadow-[0_12px_40px_rgba(9,9,11,0.07)] md:px-6">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Open sidebar"
          className="rounded-2xl p-2 text-oat-deep-umber transition hover:bg-oat-latte-soft lg:hidden"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Logo */}
      <button
        type="button"
        onClick={() => router.push("/")}
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
      >
        <img
          src={OATCLUB_LOGO_URL}
          alt="OATCLUB"
          className="h-8 w-auto object-contain sm:h-9"
        />

        <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-oat-deep-umber-85">
          own all trends.
        </span>
      </button>

      {/* Profile */}
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((previous) => !previous)}
          aria-label="Open profile menu"
          className="relative rounded-full border border-gray-200 p-2 transition hover:bg-gray-100"
        >
          <User size={22} className="text-gray-700" />

          {actionCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white">
              {formattedActionCount}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-[0_12px_35px_rgba(15,23,42,0.16)]">
            {/* Profile */}
            <button
              type="button"
              onClick={() => handleNavigate("/profile")}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 transition hover:bg-gray-50"
            >
              <UserCircle size={18} />

              <span className="flex-1 text-left">
                Profile
              </span>
            </button>

            {/* Tasks */}
            <button
              type="button"
              onClick={() =>
                handleNavigate("/admin-user-tasks")
              }
              className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-700 transition hover:bg-gray-50"
            >
              <CheckSquare2 size={18} />

              <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                <div className="min-w-0 text-left">
                  <p className="font-medium">Tasks</p>

          
                </div>

                {actionCount > 0 && (
                  <span className="flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">
                    {formattedActionCount}
                  </span>
                )}
              </div>
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-700 transition hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={18} />

              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
