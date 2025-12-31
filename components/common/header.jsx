"use client";

import { Menu, LogOut, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
    <header className="relative flex items-center justify-between bg-white border-b border-gray-200 px-4 md:px-6 py-3 sticky top-0 z-40 shadow-sm">
  
  {/* Left Section (Menu) */}
  <div className="flex items-center gap-3">
    <button
      onClick={toggleSidebar}
      className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition"
    >
      <Menu size={22} />
    </button>
  </div>

  {/* ✅ CENTER LOGO + TITLE */}
  <button
    onClick={() => router.push("/")}
    className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2"
  >
    <Image
      src="https://res.cloudinary.com/djtva6hec/image/upload/v1767196261/miray/media/rwhqczcfjnmnvoytyrmh.png"
      alt="Logo"
      width={110}
      height={42}
      priority
      className="object-contain block"
    />

    {/* Hide on very small screens */}
    <span className="hidden sm:block text-sm md:text-base font-semibold text-gray-900 leading-none">
      Admin Portal
    </span>
  </button>

  {/* Right Section (Profile) */}
  <div className="relative" ref={menuRef}>
    <button
      onClick={() => setOpen((prev) => !prev)}
      className="p-2 rounded-full hover:bg-gray-100 transition border border-gray-200"
    >
      <User size={22} className="text-gray-700" />
    </button>

    {open && (
      <div className="absolute right-0 mt-2 w-44 bg-white shadow-md rounded-xl border border-gray-200 py-2 animate-fadeIn">
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
