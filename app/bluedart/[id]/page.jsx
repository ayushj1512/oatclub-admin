"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import {
  RefreshCcw,
  Package,
  Hash,
  Truck,
  CreditCard,
  Activity,
} from "lucide-react";

import { useBlueDartStore } from "@/store/bluedartStore";
import BlueDartShipmentBadge from "@/components/bluedart/BlueDartShipmentBadge";

const InfoItem = ({ icon: Icon, label, value, full = false }) => (
  <div
    className={`rounded-2xl bg-[#f7f7f7] px-4 py-4 ${
      full ? "col-span-1 md:col-span-2" : ""
    }`}
  >
    <div className="mb-2 flex items-center gap-2 text-sm text-neutral-500">
      <Icon size={16} className="text-neutral-400" />
      <span>{label}</span>
    </div>
    <div className="text-sm font-medium text-neutral-900 break-words">
      {value || "—"}
    </div>
  </div>
);

export default function BlueDartShipmentDetailPage() {
  const params = useParams();
  const id = params?.id;

  const { shipment, fetchShipmentById, trackShipment } = useBlueDartStore();

  useEffect(() => {
    if (id) fetchShipmentById(id);
  }, [id, fetchShipmentById]);

  if (!shipment) {
    return (
      <main className="min-h-[60vh] bg-[#fcfcfc] px-4 py-6 md:px-6">
        <div className="mx-auto ">
          <div className="rounded-3xl bg-white px-6 py-12 shadow-sm ring-1 ring-black/5">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4f4f5]">
                <Package className="text-neutral-500" size={24} />
              </div>
              <h2 className="text-lg font-semibold text-neutral-900">
                Loading shipment
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Please wait while we fetch the shipment details.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fcfcfc] px-4 py-6 md:px-6">
      <div className="mx-auto space-y-5">
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4f4f5]">
                <Package size={20} className="text-neutral-700" />
              </div>

              <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
                Shipment Detail
              </h1>

              <p className="mt-1 text-sm text-neutral-500">
                Order{" "}
                <span className="font-medium text-neutral-800">
                  {shipment.orderNumber || "—"}
                </span>
              </p>
            </div>

            <button
              onClick={() => trackShipment(id)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 active:scale-[0.99]"
            >
              <RefreshCcw size={16} />
              Track Shipment
            </button>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-neutral-900">
              Shipment Information
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Basic shipment details and tracking information.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InfoItem
              icon={Hash}
              label="Order Number"
              value={shipment.orderNumber}
            />

            <InfoItem
              icon={Truck}
              label="AWB Number"
              value={shipment.awbNumber}
            />

            <InfoItem
              icon={Package}
              label="Service Type"
              value={shipment.serviceType}
            />

            <InfoItem
              icon={CreditCard}
              label="Payment Mode"
              value={shipment.paymentMode}
            />

            <div className="rounded-2xl bg-[#f7f7f7] px-4 py-4 md:col-span-2">
              <div className="mb-2 flex items-center gap-2 text-sm text-neutral-500">
                <Activity size={16} className="text-neutral-400" />
                <span>Status</span>
              </div>

              <div>
                <BlueDartShipmentBadge status={shipment.status} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}