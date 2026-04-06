"use client";

import { useEffect, useMemo } from "react";
import {
  Truck,
  MapPin,
  RefreshCw,
  CircleCheckBig,
  CircleAlert,
  BadgeIndianRupee,
  Clock3,
  PackageCheck,
} from "lucide-react";
import { useShiprocketStore } from "@/store/ShipRocketStore";

const PICKUP_PINCODE = "110019";

export default function OrderServiceabilityCard({ order }) {
  const {
    checkServiceability,
    serviceabilityLoading,
    serviceabilityResult,
    serviceabilityError,
    clearServiceabilityError,
  } = useShiprocketStore();

  const deliveryPincode = useMemo(
    () => String(order?.shippingAddressSnapshot?.pincode || "").trim(),
    [order?.shippingAddressSnapshot?.pincode]
  );

  const totalWeight = useMemo(() => {
    const items = Array.isArray(order?.items) ? order.items : [];

    const weight =
      items.reduce((sum, it) => {
        const itemWeight =
          Number(it?.variant?.weight) ||
          Number(it?.productSnapshot?.weight) ||
          0.5;

        const qty = Number(it?.quantity || 1);
        return sum + itemWeight * qty;
      }, 0) || 0.5;

    return Number(weight.toFixed(2));
  }, [order?.items]);

  const isCod = useMemo(
    () => String(order?.paymentMethod || "").toLowerCase() === "cod",
    [order?.paymentMethod]
  );

  const couriers = useMemo(() => {
    const list = Array.isArray(serviceabilityResult?.couriers)
      ? serviceabilityResult.couriers
      : [];

    return [...list].sort(
      (a, b) => Number(a?.freight_charge || 0) - Number(b?.freight_charge || 0)
    );
  }, [serviceabilityResult]);

  const isServiceable = couriers.length > 0;
  const bestCourier = couriers[0] || null;

  const runCheck = async () => {
    if (deliveryPincode.length !== 6) return;

    try {
      clearServiceabilityError();
      await checkServiceability({
        pickupPincode: PICKUP_PINCODE,
        deliveryPincode,
        weight: totalWeight,
        cod: isCod,
      });
    } catch (err) {
      console.error("Shiprocket serviceability failed:", err);
    }
  };

  useEffect(() => {
    runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryPincode, totalWeight, isCod]);

  return (
    <div className="rounded-[28px] bg-white p-5 sm:p-6 shadow-sm ring-1 ring-black/5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-2xl bg-black/5 p-2.5">
              <Truck className="h-4 w-4 text-black" />
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-semibold text-black">
                Shiprocket Serviceability
              </h2>
              <p className="text-sm text-black/55">
                Auto check with full courier price list
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={runCheck}
          disabled={serviceabilityLoading || deliveryPincode.length !== 6}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${serviceabilityLoading ? "animate-spin" : ""}`}
          />
          {serviceabilityLoading ? "Checking..." : "Refresh"}
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-[#f6f6f7] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
            Pickup Pincode
          </p>
          <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-black">
            <MapPin className="h-4 w-4 text-black/50" />
            {PICKUP_PINCODE}
          </div>
        </div>

        <div className="rounded-2xl bg-[#f6f6f7] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
            Delivery Pincode
          </p>
          <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-black">
            <MapPin className="h-4 w-4 text-black/50" />
            {deliveryPincode || "N/A"}
          </div>
        </div>

        <div className="rounded-2xl bg-[#f6f6f7] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
            Shipment Meta
          </p>
          <div className="mt-2 space-y-1 text-sm text-black/70">
            <p>
              Weight:{" "}
              <span className="font-semibold text-black">{totalWeight} kg</span>
            </p>
            <p>
              Mode:{" "}
              <span className="font-semibold text-black">
                {isCod ? "COD" : "Prepaid"}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        {deliveryPincode.length !== 6 ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            Shipping pincode missing or invalid.
          </div>
        ) : serviceabilityError ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {serviceabilityError}
          </div>
        ) : serviceabilityResult ? (
          <div
            className={`rounded-2xl px-4 py-3 ${
              isServiceable
                ? "border border-green-100 bg-green-50"
                : "border border-red-100 bg-red-50"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              {isServiceable ? (
                <CircleCheckBig className="h-5 w-5 text-green-600" />
              ) : (
                <CircleAlert className="h-5 w-5 text-red-600" />
              )}

              <p
                className={`text-sm font-semibold ${
                  isServiceable ? "text-green-700" : "text-red-700"
                }`}
              >
                {isServiceable
                  ? "Yes, serviceable on Shiprocket"
                  : "Not serviceable on Shiprocket"}
              </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  isServiceable
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                Couriers: {couriers.length}
              </span>

              {bestCourier?.freight_charge != null && (
                <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-black/70">
                  Cheapest: ₹{bestCourier.freight_charge}
                </span>
              )}

              {bestCourier?.etd && (
                <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-black/70">
                  ETA: {bestCourier.etd}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#f6f6f7] px-4 py-3 text-sm text-black/55">
            Checking serviceability...
          </div>
        )}
      </div>

      {couriers.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-black">
              Available Couriers & Prices
            </h3>
            <p className="text-xs text-black/45">
              Sorted by lowest freight first
            </p>
          </div>

          <div className="grid gap-3">
            {couriers.map((courier, idx) => {
              const isBest =
                bestCourier?.courier_company_id === courier?.courier_company_id;

              return (
                <div
                  key={`${courier?.courier_company_id || courier?.courier_name || idx}`}
                  className={`rounded-2xl p-4 ring-1 ${
                    isBest
                      ? "bg-black text-white ring-black"
                      : "bg-[#fafafa] text-black ring-black/5"
                  }`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className={`rounded-xl p-2.5 ${
                          isBest ? "bg-white/10" : "bg-black/5"
                        }`}
                      >
                        <Truck
                          className={`h-4 w-4 ${isBest ? "text-white" : "text-black"}`}
                        />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">
                            {courier?.courier_name || "Courier"}
                          </p>

                          {isBest && (
                            <span className="rounded-full bg-white/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                              Best Price
                            </span>
                          )}
                        </div>

                        <p
                          className={`mt-1 text-xs ${
                            isBest ? "text-white/70" : "text-black/50"
                          }`}
                        >
                          Company ID: {courier?.courier_company_id || "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:flex md:flex-wrap md:justify-end">
                      <div
                        className={`rounded-xl px-3 py-2 ${
                          isBest ? "bg-white/10" : "bg-black/[0.04]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <BadgeIndianRupee className="h-3.5 w-3.5" />
                          <span className="text-[11px] font-medium opacity-70">
                            Freight
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold">
                          ₹{courier?.freight_charge || 0}
                        </p>
                      </div>

                      <div
                        className={`rounded-xl px-3 py-2 ${
                          isBest ? "bg-white/10" : "bg-black/[0.04]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <PackageCheck className="h-3.5 w-3.5" />
                          <span className="text-[11px] font-medium opacity-70">
                            COD
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold">
                          ₹{courier?.cod_charges || 0}
                        </p>
                      </div>

                      <div
                        className={`rounded-xl px-3 py-2 ${
                          isBest ? "bg-white/10" : "bg-black/[0.04]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-3.5 w-3.5" />
                          <span className="text-[11px] font-medium opacity-70">
                            ETA
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold">
                          {courier?.etd || "N/A"}
                        </p>
                      </div>

                      <div
                        className={`rounded-xl px-3 py-2 ${
                          isBest ? "bg-white/10" : "bg-black/[0.04]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Truck className="h-3.5 w-3.5" />
                          <span className="text-[11px] font-medium opacity-70">
                            Rating
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold">
                          {courier?.rating || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}