"use client";

import { useState } from "react";
import { useShiprocketStore } from "@/store/ShipRocketStore";
import { MapPin, Truck, Search, Package } from "lucide-react";

export default function ServiceabilityCheckPage() {
  const {
    checkServiceability,
    serviceabilityLoading,
    serviceabilityResult,
    serviceabilityError,
    clearServiceabilityError,
  } = useShiprocketStore();

  const [pickup, setPickup] = useState("110019"); // ✅ default
  const [delivery, setDelivery] = useState("");
  const [weight, setWeight] = useState(0.5);
  const [cod, setCod] = useState(false);

  const handleCheck = async () => {
    try {
      clearServiceabilityError();

      if (pickup.length !== 6 || delivery.length !== 6) {
        alert("Enter valid 6 digit pincodes");
        return;
      }

      await checkServiceability({
        pickupPincode: pickup,
        deliveryPincode: delivery,
        weight,
        cod,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const couriers = [...(serviceabilityResult?.couriers || [])].sort(
    (a, b) => a.freight_charge - b.freight_charge
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 ">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Serviceability Check
        </h1>
        <p className="text-sm text-black/60 mt-1">
          Check courier availability between pincodes
        </p>
      </div>

      {/* FORM CARD */}
      <div className="rounded-2xl bg-black/[0.02] p-5 space-y-4">
        {/* PINCODES */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-white">
            <MapPin className="w-4 h-4 text-black/50" />
            <input
              type="number"
              placeholder="Pickup"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              className="w-full outline-none text-sm"
            />
          </div>

          <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-white">
            <MapPin className="w-4 h-4 text-black/50" />
            <input
              type="number"
              placeholder="Delivery"
              value={delivery}
              onChange={(e) => setDelivery(e.target.value)}
              className="w-full outline-none text-sm"
            />
          </div>
        </div>

        {/* WEIGHT + COD */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 px-3 py-3 rounded-xl bg-white">
            <Package className="w-4 h-4 text-black/50" />
            <input
              type="number"
              placeholder="Weight (kg)"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full outline-none text-sm"
            />
          </div>

          <label className="flex items-center gap-2 px-3 py-3 rounded-xl bg-white text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={cod}
              onChange={(e) => setCod(e.target.checked)}
            />
            Cash on Delivery
          </label>
        </div>

        {/* BUTTON */}
        <button
          onClick={handleCheck}
          disabled={serviceabilityLoading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-black text-white text-sm font-medium hover:opacity-90 transition"
        >
          <Search className="w-4 h-4" />
          {serviceabilityLoading ? "Checking..." : "Check Serviceability"}
        </button>

        {serviceabilityError && (
          <p className="text-sm text-red-500">{serviceabilityError}</p>
        )}
      </div>

      {/* RESULTS */}
      {serviceabilityResult && (
        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium">
              Available Couriers ({couriers.length})
            </h2>
          </div>

          {couriers.length === 0 ? (
            <p className="text-sm text-black/60">
              No couriers available for this route
            </p>
          ) : (
            couriers.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-white hover:bg-black/[0.02] transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-black/[0.05]">
                    <Truck className="w-4 h-4" />
                  </div>

                  <div>
                    <p className="text-sm font-medium">{c.courier_name}</p>
                    <p className="text-xs text-black/50">
                      ETA: {c.etd || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-medium">
                    ₹{c.freight_charge || 0}
                  </p>
                  <p className="text-xs text-black/50">
                    COD: ₹{c.cod_charges || 0}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}