"use client";

import { Menu, LogOut, User, UserCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import useLoginStore from "../../store/useLoginStore";

const OATCLUB_LOGO_URL =
  "https://res.cloudinary.com/dpsvrt4sd/image/upload/v1780338447/qavpt44lsxsy3wrvuwi8.png";

export default function Header({ toggleSidebar }) {
  const router = useRouter();
  const logout = useLoginStore((state) => state.logout);
  const [open, setOpen] = useState(false);

  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="relative flex items-center justify-between bg-oat-bg border-b border-oat-latte-light px-4 md:px-6 py-4 sticky top-0 z-40 shadow-[0_12px_40px_rgba(9,9,11,0.07)]">
      {/* Left Section (Menu) */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-2xl hover:bg-oat-latte-soft transition text-oat-deep-umber"
        >
          <Menu size={22} />
        </button>
      </div>

      <button
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

      {/* Right Section (Profile dropdown) */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="p-2 rounded-full hover:bg-gray-100 transition border border-gray-200"
        >
          <User size={22} className="text-gray-700" />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-48 bg-white shadow-md rounded-xl border border-gray-200 py-2 animate-fadeIn">
            
            {/* ✅ Profile Option */}
            <button
              onClick={() => {
                setOpen(false);
                router.push("/profile");
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full transition"
            >
              <UserCircle size={18} />
              Profile
            </button>

            {/* Divider */}
            <div className="my-1 border-t border-gray-100" />

            {/* ✅ Logout */}
            <button
              onClick={() => {
                setOpen(false);
                logout();
                router.push("/login");
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 w-full transition"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
