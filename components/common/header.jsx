"use client";

import { Menu, LogOut, User, UserCircle } from "lucide-react";
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
          src="https://www.mirayfashions.com/_next/image?url=https%3A%2F%2Fres.cloudinary.com%2Fdjtva6hec%2Fimage%2Fupload%2Fv1764916639%2Fmiray%2Fmedia%2Fk0yvgu5m0ij1husm3ugh.png&w=256&q=75"
          alt="Logo"
          width={110}
          height={42}
          priority
          style={{ width: "110px", height: "auto" }} // ✅ keep ratio
        />

        
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
