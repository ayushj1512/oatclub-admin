"use client";

import { Truck } from "lucide-react";

export default function BlueDartPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-10 text-center max-w-lg w-full">
        
        <div className="flex justify-center mb-6">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-lg">
            <Truck size={36} />
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-gray-900">
          Blue Dart Shipping Hub
        </h1>

        <p className="text-gray-600 mt-3 leading-relaxed">
          We’re preparing a powerful shipping workspace for Blue Dart.
          Soon you’ll be able to create shipments, generate labels,
          track packages, sync deliveries, and manage reverse pickups —
          all from one place.
        </p>

        <div className="mt-6 inline-flex items-center px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-medium border border-blue-100">
          🚀 Coming ASAP
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Feature under development — stay tuned.
        </p>
      </div>
    </div>
  );
}