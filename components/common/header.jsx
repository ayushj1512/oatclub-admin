"use client";

import { Menu, LogOut, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import useLoginStore from "../../store/useLoginStore";

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
    <header className="flex items-center justify-between bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-40 shadow-sm">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition"
        >
          <Menu size={22} />
        </button>

        {/* Clickable Header Text */}
        <h1
          onClick={() => router.push("/")}
          className="text-xl font-semibold text-blue-600 tracking-wide cursor-pointer hover:text-blue-700 transition"
        >
          Miray Fashion Admin
        </h1>
      </div>

      {/* Profile Icon + Dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="p-2 rounded-full hover:bg-gray-100 transition border border-gray-300"
        >
          <User size={22} className="text-gray-700" />
        </button>

        {/* Dropdown Menu */}
        {open && (
          <div className="absolute right-0 mt-2 w-40 bg-white shadow-md rounded-lg border border-gray-200 py-2 animate-fadeIn">
            <button
              onClick={() => {
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
