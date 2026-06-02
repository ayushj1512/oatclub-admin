"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import Header from "./header";
import Footer from "./footer";
import Sidebar from "./sidebar";
import useLoginStore from "../../store/useLoginStore";
import LoginScreen from "../login/LoginScreen";

// Sidebar visible only on these routes
const sidebarRoutes = ["/", "/dashboard", "/orders", "/inventory", "/customers"];

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isLoggedIn = useLoginStore((state) => state.isLoggedIn);

  const hasSidebar = sidebarRoutes.some((route) => pathname.startsWith(route));
  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  // 🔐 Block everything until logged in
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-oat-bg px-4">
        <LoginScreen />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-oat-bg">
      {/* Sidebar (visible only on defined routes) */}
      {hasSidebar && <Sidebar isOpen={sidebarOpen} />}

      {/* Right Section (Header + Main + Footer) */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <Header toggleSidebar={toggleSidebar} />

        <main className="flex-1 overflow-y-auto bg-oat-bg p-6">
          {children}
        </main>

        <Footer />
      </div>
    </div>
  );
}
