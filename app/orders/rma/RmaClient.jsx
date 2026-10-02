// app/orders/rma/RmaClient.jsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCheck,
  Download,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";
import axios from "axios";

import { useRmaStore } from "@/store/useRmaStore";
import RmaRow from "@/components/orders/RmaRow";
import { useShiprocketStore } from "@/store/ShipRocketStore";
import { useDelhiveryStore } from "@/store/delhiveryStore";
import RmaRefundModal from "@/components/orders/RmaRefundModal";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:9000";

const RETURN_WAREHOUSE_PINCODE = "110044";

const str = (v) => (v == null ? "" : String(v));
const norm = (v) => str(v).trim().toLowerCase();
const pick = (...values) => values.find((v) => str(v).trim()) || "";
const safeArray = (value) =>
  Array.isArray(value) ? value : [];

const parseDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const formatDate = (value) => {
  const date = parseDate(value);
  return date ? date.toLocaleDateString("en-IN") : "-";
};

const endOfDay = (value) => {
  const date = parseDate(value);
  if (!date) return null;
  date.setHours(23, 59, 59, 999);
  return date;
};

const statusBadge = (status) => {
  const value = norm(status);

  if (value === "requested")
    return "bg-purple-50 text-purple-700 ring-purple-100";

  if (value === "approved")
    return "bg-green-50 text-green-700 ring-green-100";

  if (value === "rejected")
    return "bg-red-50 text-red-700 ring-red-100";

  return "bg-gray-100 text-gray-700 ring-gray-200";
};

const typeBadge = (type) => {
  const value = norm(type);

  if (value === "exchange")
    return "bg-amber-50 text-amber-800 ring-amber-100";

  if (value === "return")
    return "bg-sky-50 text-sky-700 ring-sky-100";

  return "bg-gray-100 text-gray-700 ring-gray-200";
};

const fulfilledBadge = (fulfilled) =>
  fulfilled
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : "bg-orange-50 text-orange-700 ring-orange-200";

export default function RmaClient() {
  const [expanded, setExpanded] = useState(null);
  const [selected, setSelected] = useState([]);

  const [orderSearch, setOrderSearch] = useState("");
  const [mobileSearch, setMobileSearch] = useState("");
  const [fulfilledFilter, setFulfilledFilter] = useState("all");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortDir, setSortDir] = useState("desc");
  const [updating, setUpdating] = useState([]);
  const [approving, setApproving] = useState([]);

  const syncShiprocketReversePickup =
    useShiprocketStore((s) => s.syncReversePickup);

  const checkShiprocketServiceability =
    useShiprocketStore((s) => s.checkServiceability);

  const createShiprocketReversePickup =
    useShiprocketStore((s) => s.createReversePickup);

  const checkDelhiveryServiceability =
    useDelhiveryStore((s) => s.checkServiceability);

  const createDelhiveryReversePickup =
    useDelhiveryStore((s) => s.createReversePickup);

  const syncDelhiveryReversePickup =
    useDelhiveryStore((s) => s.syncReversePickup);

  const [pickupRma, setPickupRma] = useState(null);
  const [pickupProvider, setPickupProvider] = useState("");
  const [checkingPickup, setCheckingPickup] = useState(false);
  const [bookingPickup, setBookingPickup] = useState(false);

  const [pickupAvailability, setPickupAvailability] =
    useState({
      shiprocket: {
        available: false,
        error: "",
      },
      delhivery: {
        available: false,
        error: "",
      },
    });

  const [syncingReverse, setSyncingReverse] = useState([]);
  const [bulkSyncingReverse, setBulkSyncingReverse] = useState(false);

  const [creditAmount, setCreditAmount] = useState({});
  const [creditNote, setCreditNote] = useState({});
  const [creditLoading, setCreditLoading] = useState([]);
  const [refundRma, setRefundRma] = useState(null);

  const {
    rmas,
    loading,
    error,
    fetchAllRmas,
    fetchRmaByNumber,
    approveRma,
    updateRma,
    patchRmaLocal,
  } = useRmaStore();

  useEffect(() => {
    fetchAllRmas();
  }, [fetchAllRmas]);

  const statusOptions = useMemo(
    () => [
      "all",
      ...new Set(
        (rmas || [])
          .map((rma) => norm(rma?.status))
          .filter(Boolean)
      ),
    ],
    [rmas]
  );

  const typeOptions = useMemo(
    () => [
      "all",
      ...new Set(
        (rmas || [])
          .map((rma) => norm(rma?.type))
          .filter(Boolean)
      ),
    ],
    [rmas]
  );

  const filteredRmas = useMemo(() => {
    const orderQ = norm(orderSearch);
    const mobileQ = norm(mobileSearch);

    const from = parseDate(fromDate);
    const to = endOfDay(toDate);

    return [...(rmas || [])]
      .filter((rma) => {
        const address = rma?.shippingAddressSnapshot || {};
        const customer = rma?.customer || {};

        if (
          orderQ &&
          !norm(rma?.orderNumber).includes(orderQ) &&
          !norm(rma?.rmaNumber).includes(orderQ)
        ) {
          return false;
        }

        const mobile = pick(
          address?.phone,
          customer?.phone
        );

        if (
          mobileQ &&
          !norm(mobile).includes(mobileQ)
        ) {
          return false;
        }

        if (
          fulfilledFilter === "fulfilled" &&
          rma?.isFulfilled !== true
        ) {
          return false;
        }

        if (
          fulfilledFilter === "pending" &&
          rma?.isFulfilled === true
        ) {
          return false;
        }

        if (
          statusFilter !== "all" &&
          norm(rma?.status) !== norm(statusFilter)
        ) {
          return false;
        }

        if (
          typeFilter !== "all" &&
          norm(rma?.type) !== norm(typeFilter)
        ) {
          return false;
        }




        const createdAt = parseDate(rma?.createdAt);

        if ((from || to) && !createdAt) return false;
        if (from && createdAt < from) return false;
        if (to && createdAt > to) return false;

        return true;
      })
      .sort((a, b) => {
        const aTime = parseDate(a?.createdAt)?.getTime() || 0;
        const bTime = parseDate(b?.createdAt)?.getTime() || 0;

        return sortDir === "asc"
          ? aTime - bTime
          : bTime - aTime;
      });
  }, [
    rmas,
    orderSearch,
    mobileSearch,
    fulfilledFilter,
    fromDate,
    toDate,
    statusFilter,
    typeFilter,
    sortDir,
  ]);

  const getKey = useCallback(
    (rma) =>
      `${rma?.orderId || ""}:${rma?.rmaNumber || ""}`,
    []
  );

  const expandedRma = useMemo(() => {
    if (!expanded) return null;

    return (
      filteredRmas.find(
        (rma) => getKey(rma) === expanded
      ) || null
    );
  }, [expanded, filteredRmas, getKey]);


  const qcMedia = useMemo(() => {
    const media = safeArray(expandedRma?.media);

    const types = ["front", "back", "tag"];

    return types
      .map((type, index) => {
        const matched = media.find(
          (m) => norm(m?.evidenceType) === type
        );

        const fallback = matched || media[index];

        return fallback
          ? {
            ...fallback,
            evidenceType:
              fallback.evidenceType || type,
          }
          : null;
      })
      .filter(Boolean);
  }, [expandedRma]);


  const toggleExpand = useCallback(
    (key, rma = null) => {
      if (rma?.isFulfilled === true) return;

      setExpanded((current) =>
        current === key ? null : key
      );
    },
    []
  );

  const toggleSelected = (rma) => {
    if (rma?.isFulfilled === true) return;

    const key = getKey(rma);

    setSelected((current) =>
      current.includes(key)
        ? current.filter((x) => x !== key)
        : [...current, key]
    );
  };

  const selectableRmas = useMemo(
    () =>
      filteredRmas.filter(
        (rma) => rma?.isFulfilled !== true
      ),
    [filteredRmas]
  );

  const allVisibleSelected =
    selectableRmas.length > 0 &&
    selectableRmas.every((rma) =>
      selected.includes(getKey(rma))
    );

  const toggleSelectAll = () => {
    const visibleKeys = selectableRmas.map(getKey);

    if (allVisibleSelected) {
      setSelected((current) =>
        current.filter(
          (key) => !visibleKeys.includes(key)
        )
      );
    } else {
      setSelected((current) => [
        ...new Set([
          ...current,
          ...visibleKeys,
        ]),
      ]);
    }
  };

  const getCustomerPincode = (rma) =>
    String(
      rma?.shippingAddressSnapshot?.pincode ||
      rma?.customer?.pincode ||
      "",
    ).trim();

  const hasDelhiveryPickup = (result) =>
    result?.pickupAvailable === true &&
    result?.embargoed !== true;

  const getShiprocketCouriers = (result) =>
    result?.couriers ||
    result?.data?.couriers ||
    result?.data?.data?.couriers ||
    result?.data?.data
      ?.available_courier_companies ||
    result?.data
      ?.available_courier_companies ||
    result?.available_courier_companies ||
    [];

  const hasShiprocketCourier = (result) =>
    result?.success !== false &&
    getShiprocketCouriers(result).length > 0;

  const openPickupModal = async (rma) => {
    const customerPincode =
      getCustomerPincode(rma);

    if (!/^\d{6}$/.test(customerPincode)) {
      return alert(
        "A valid 6-digit customer pincode is required.",
      );
    }

    setPickupRma(rma);
    setPickupProvider("");
    setCheckingPickup(true);

    setPickupAvailability({
      shiprocket: {
        available: false,
        error: "",
      },
      delhivery: {
        available: false,
        error: "",
      },
    });

    try {
      const [
        shiprocketResult,
        delhiveryResult,
      ] = await Promise.allSettled([
        checkShiprocketServiceability({
          pickupPincode: customerPincode,
          deliveryPincode:
            RETURN_WAREHOUSE_PINCODE,
          weight: 0.5,
          cod: false,
        }),

        checkDelhiveryServiceability(
          customerPincode,
        ),
      ]);

      console.log(
        "Shiprocket serviceability:",
        shiprocketResult,
      );

      console.log(
        "Delhivery serviceability:",
        delhiveryResult,
      );

      const shiprocketAvailable =
        shiprocketResult.status ===
        "fulfilled" &&
        hasShiprocketCourier(
          shiprocketResult.value,
        );

      const delhiveryAvailable =
        delhiveryResult.status ===
        "fulfilled" &&
        hasDelhiveryPickup(
          delhiveryResult.value,
        );

      const shiprocketError =
        shiprocketResult.status === "rejected"
          ? shiprocketResult.reason?.message ||
          "Shiprocket serviceability check failed."
          : shiprocketAvailable
            ? ""
            : "Reverse pickup is unavailable.";

      const delhiveryError =
        delhiveryResult.status === "rejected"
          ? delhiveryResult.reason?.message ||
          "Delhivery serviceability check failed."
          : delhiveryAvailable
            ? ""
            : delhiveryResult.value
              ?.unavailableReason ||
            "Reverse pickup is unavailable.";

      setPickupAvailability({
        shiprocket: {
          available: shiprocketAvailable,
          error: shiprocketError,
        },
        delhivery: {
          available: delhiveryAvailable,
          error: delhiveryError,
        },
      });

      if (
        shiprocketAvailable &&
        !delhiveryAvailable
      ) {
        setPickupProvider("shiprocket");
      } else if (
        delhiveryAvailable &&
        !shiprocketAvailable
      ) {
        setPickupProvider("delhivery");
      }
    } finally {
      setCheckingPickup(false);
    }
  };

  const bookReturnPickup = async () => {
    if (!pickupRma || !pickupProvider) {
      return alert(
        "Please select a courier provider.",
      );    }

    try {
      setBookingPickup(true);

      const bookingFunction =
        pickupProvider === "shiprocket"
          ? createShiprocketReversePickup
          : createDelhiveryReversePickup;

      const data = await bookingFunction(
        pickupRma.orderId,
        pickupRma.rmaNumber,
      );

      patchRmaLocal(
        pickupRma.orderId,
        pickupRma.rmaNumber,
        data?.rma || data?.updatedRma || {
          reverseShipment: data?.reverseShipment,
        }
      );
      setPickupRma(null);
      setPickupProvider("");

      alert(
        data?.message ||
        `${pickupProvider} return pickup booked successfully.`,
      );
    } catch (error) {
      alert(
        error?.message ||
        "Return pickup booking failed.",
      );
    } finally {
      setBookingPickup(false);
    }
  };

  const handleApproveRma = async (rma) => {
    const key = getKey(rma);

    if (!rma?.orderId || !rma?.rmaNumber) {
      return alert("Order ID or RMA number missing");
    }

    if (rma?.isFulfilled === true) {
      return alert("This RMA is already fulfilled");
    }

    if (rma?.isApproved === true) {
      return alert("RMA is already approved");
    }

    const isExceptionRma =
      rma?.allowException === true;

    if (
      norm(rma?.type) === "return" &&
      !isExceptionRma
    ) {
      const media =
        safeArray(rma?.media);

      if (
        media.filter((item) =>
          str(item?.url).trim()
        ).length < 3
      ) {
        return alert(
          "Front, Back and Tag images are required before approving this return."
        );
      }
    }

    try {
      setApproving((current) => [
        ...current,
        key,
      ]);

      const data = await approveRma(
        rma.orderId,
        rma.rmaNumber
      );


      if (
        norm(rma?.type) === "exchange" &&
        data?.exchangeOrderError
      ) {
        alert(
          `RMA approved, but exchange order failed: ${data.exchangeOrderError}`,
        );
      } else {
        alert(
          norm(rma?.type) === "exchange"
            ? "Exchange approved and replacement order created."
            : "Return approved successfully.",
        );
      }

      await openPickupModal({
        ...rma,
        isApproved: true,
        status: "approved",
      });
    } catch (error) {
      alert(
        error?.message ||
        "Failed to approve RMA"
      );
    } finally {
      setApproving((current) =>
        current.filter((x) => x !== key)
      );
    }
  };

  const updateFulfilled = async (rma, isFulfilled) => {
    const key = getKey(rma);

    if (rma?.isFulfilled === true) return;

    if (rma?.isApproved !== true) {
      return alert("Approve RMA before marking it fulfilled");
    }

    try {
      setUpdating((current) => [...current, key]);

      await updateRma(rma.orderId, rma.rmaNumber, {
        isFulfilled,
      });
    } catch (error) {
      alert(error?.message || "Failed to update RMA");
    } finally {
      setUpdating((current) => current.filter((x) => x !== key));
    }
  };

  const handleReverseSync = async (rma) => {
    const key = getKey(rma);

    if (rma?.isFulfilled === true) return;

    if (rma?.isApproved !== true) {
      return alert("Approve RMA before syncing reverse pickup");
    }

    if (!rma?.orderId || !rma?.rmaNumber) {
      return alert("Order ID or RMA number missing");
    }

    try {
      setSyncingReverse((s) => [...s, key]);

      const provider = norm(
        rma?.reverseShipment?.provider,
      );

      const syncFunction =
        provider === "delhivery"
          ? syncDelhiveryReversePickup
          : syncShiprocketReversePickup;

      const data = await syncFunction(
        rma.orderId,
        rma.rmaNumber,
      );


      patchRmaLocal(
        rma.orderId,
        rma.rmaNumber,
        data?.rma || data?.updatedRma || {
          reverseShipment: data?.reverseShipment,
        }
      );
      alert(
        data?.message ||
        "Reverse shipment synced"
      );
    } catch (err) {
      alert(
        err?.message ||
        "Reverse shipment sync failed"
      );
    } finally {
      setSyncingReverse((s) =>
        s.filter((x) => x !== key)
      );
    }
  };

  const bulkSyncReversePickups = async () => {
    if (bulkSyncingReverse) return;

    const targets = filteredRmas.filter(
      (rma) =>
        rma?.isApproved === true &&
        rma?.isFulfilled !== true &&
        Boolean(
          rma?.reverseShipment?.shipmentId ||
          rma?.reverseShipment?.orderId ||
          rma?.reverseShipment?.awb
        )
    );

    if (!targets.length) {
      return alert("No reverse shipments are available to sync.");
    }

    let synced = 0;
    let pickupCompleted = 0;
    let received = 0;
    let failed = 0;

    try {
      setBulkSyncingReverse(true);

      setSyncingReverse((current) => [
        ...new Set([...current, ...targets.map(getKey)]),
      ]);

      for (const rma of targets) {
        const key = getKey(rma);

        try {
          const provider = norm(rma?.reverseShipment?.provider);

          const syncFunction =
            provider === "delhivery"
              ? syncDelhiveryReversePickup
              : provider === "shiprocket"
                ? syncShiprocketReversePickup
                : null;

          if (!syncFunction) {
            throw new Error(
              `Unsupported reverse courier: ${provider || "missing"}`
            );
          }

          const response = await syncFunction(
            rma.orderId,
            rma.rmaNumber
          );

          // Supports store payloads, API envelopes and Axios responses.
          if (
            response?.success === false ||
            response?.data?.success === false
          ) {
            throw new Error(
              response?.message ||
              response?.data?.message ||
              "Reverse shipment sync failed."
            );
          }

          const data =
            response?.data?.data ??
            response?.data ??
            response;

          if (!data || data.success === false) {
            throw new Error(
              data?.message || "Empty or unsuccessful sync response."
            );
          }

          const updatedRma = data.rma || data.updatedRma;
          const reverseShipment =
            updatedRma?.reverseShipment || data.reverseShipment;

          if (!updatedRma && !reverseShipment) {
            throw new Error("Sync response is missing shipment data.");
          }

          const shipmentStatus = norm(
            reverseShipment?.status || data.status
          );

          const confirmsPickup = [
            "picked",
            "in_transit",
            "received",
          ].includes(shipmentStatus);

          const isPickupCompleted =
            updatedRma?.returnPickupCompleted === true ||
            data.returnPickupCompleted === true ||
            data.pickupCompleted === true ||
            reverseShipment?.pickupCompleted === true ||
            rma.returnPickupCompleted === true ||
            confirmsPickup;

          const patch = {
            ...(updatedRma || {}),
            returnPickupCompleted: isPickupCompleted,
          };

          if (reverseShipment) {
            patch.reverseShipment = {
              ...(rma.reverseShipment || {}),
              ...reverseShipment,
            };
          }

          if (
            !updatedRma?.status &&
            [
              "pickup_scheduled",
              "picked",
              "in_transit",
              "received",
            ].includes(shipmentStatus)
          ) {
            patch.status = shipmentStatus;
          }

          patchRmaLocal(rma.orderId, rma.rmaNumber, patch);

          synced += 1;

          if (isPickupCompleted) pickupCompleted += 1;
          if (shipmentStatus === "received") received += 1;
        } catch (error) {
          failed += 1;

          console.error(
            `Reverse pickup sync failed for ${rma?.rmaNumber}:`,
            error
          );
        } finally {
          // Stop this row's spinner as soon as its sync finishes.
          setSyncingReverse((current) =>
            current.filter((value) => value !== key)
          );
        }
      }

      alert(
        `Reverse shipment sync completed.\n` +
        `Synced: ${synced}\n` +
        `Pickup completed: ${pickupCompleted}\n` +
        `Received: ${received}\n` +
        `Failed: ${failed}`
      );
    } finally {
      setBulkSyncingReverse(false);

      const targetKeys = new Set(targets.map(getKey));

      setSyncingReverse((current) =>
        current.filter((key) => !targetKeys.has(key))
      );
    }
  };


  const addRefundCredit = async (rma) => {
    const key = getKey(rma);

    const amount =
      Number(creditAmount[key]) ||
      Number(rma?.refundEligibleAmount || 0);

    const note = String(
      creditNote[key] || ""
    ).trim();

    if (!rma?.customer?._id) {
      return alert("Customer missing");
    }

    if (!amount || amount <= 0) {
      return alert("Enter valid amount");
    }

    if (!note) {
      return alert("Credit note is required");
    }

    try {
      setCreditLoading((s) => [...s, key]);

      const { data } = await axios.post(
        `${API_BASE}/api/customers/${rma.customer._id}/credits/add`,
        {
          amount,
          type: "refund",

          reason: note,
          notes: `RMA ${rma.rmaNumber}`,

          orderId: rma.orderId,
          orderNumber: rma.orderNumber,

          addedBy: "admin",
        },
        {
          withCredentials: true,
        }
      );

      alert(
        data?.message ||
        "Customer credit added"
      );

      setCreditAmount((s) => ({
        ...s,
        [key]: "",
      }));

      setCreditNote((s) => ({
        ...s,
        [key]: "",
      }));

      patchRmaLocal(rma.orderId, rma.rmaNumber, {
        customer: {
          credits: {
            balance:
              data?.customer?.credits?.balance ??
              Number(rma?.customer?.credits?.balance || 0) + Number(amount),
          },
        },
      });
    } catch (err) {
      alert(
        err?.response?.data?.message ||
        err?.message ||
        "Failed to add credit"
      );
    } finally {
      setCreditLoading((s) =>
        s.filter((x) => x !== key)
      );
    }
  };

  const bulkMarkFulfilled = async () => {
    const targets = filteredRmas.filter(
      (rma) =>
        selected.includes(getKey(rma)) &&
        rma?.isApproved === true &&
        rma?.isFulfilled !== true
    );

    if (!targets.length) return;

    try {
      const keys = targets.map(getKey);

      setUpdating((current) => [
        ...new Set([...current, ...keys]),
      ]);

      await Promise.all(
        targets.map((rma) =>
          updateRma(rma.orderId, rma.rmaNumber, {
            isFulfilled: true,
          })
        )
      );

      setSelected([]);
    } catch (error) {
      console.error(
        "Bulk fulfilled update failed:",
        error
      );

      alert(
        error?.response?.data?.message ||
        "Bulk update failed"
      );
    } finally {
      setUpdating([]);
    }
  };

  const downloadExcel = () => {
    if (!filteredRmas.length) {
      alert("No RMA requests to export.");
      return;
    }

    const getSizeFromAttributes = (attributes = []) =>
      pick(
        ...safeArray(attributes)
          .filter((attr) => norm(attr?.key) === "size")
          .map((attr) => attr?.value)
      );

    const escapeHtml = (value) =>
      str(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

    const formatDateTime = (value) => {
      const date = parseDate(value);

      return date
        ? date.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })
        : "";
    };

    const rows = filteredRmas.flatMap((rma) => {
      const address = rma?.shippingAddressSnapshot || {};
      const customer = rma?.customer || {};
      const reverse = rma?.reverseShipment || {};

      const orderItems = safeArray(rma?.orderItems);
      const rmaItems = safeArray(rma?.items);

      const newSize =
        norm(rma?.type) === "exchange"
          ? getSizeFromAttributes(rma?.exchangeTo?.attributes)
          : "";

      const provider = pick(reverse?.provider);

      const courierName = pick(
        reverse?.courierName,
        reverse?.courier_name,
        reverse?.courier?.name,
        typeof reverse?.courier === "string" ? reverse.courier : "",
        norm(provider) === "delhivery" ? "Delhivery" : ""
      );

      const awb = pick(
        reverse?.awb,
        reverse?.awbCode,
        reverse?.awb_code,
        reverse?.waybill
      );

      const shipmentId = pick(
        reverse?.shipmentId,
        reverse?.shipment_id
      );

      const courierOrderId = pick(
        reverse?.orderId,
        reverse?.order_id
      );

      const courierStatus = pick(
        reverse?.currentStatus,
        reverse?.current_status,
        reverse?.shipmentStatus,
        reverse?.shipment_status,
        reverse?.status
      );

      const trackingUrl = pick(
        reverse?.trackingUrl,
        reverse?.tracking_url
      );

      const hasBooking = Boolean(
        awb || shipmentId || courierOrderId
      );

      const baseRow = {
        "Order Number": str(rma?.orderNumber),
        "RMA Number": str(rma?.rmaNumber),
        Type: rma?.type || "",
        "RMA Status": rma?.status || "",
        Approved: rma?.isApproved ? "Yes" : "No",
        Fulfilled: rma?.isFulfilled ? "Yes" : "No",

        // RMA closure is separate from courier delivery status.
        "RMA Closure": rma?.isFulfilled === true
          ? "Closed"
          : "Pending",

        "Reverse Booking": hasBooking
          ? "Booking reference available"
          : "No booking reference",

        "Courier Provider": provider,
        "Courier Name": courierName,
        "Reverse AWB / Waybill": str(awb),
        "Reverse Shipment ID": str(shipmentId),
        "Courier Order ID": str(courierOrderId),
        "Courier Status": courierStatus || "Not available",
        "Courier Status Code": str(
          pick(reverse?.statusCode, reverse?.status_code)
        ),
        "Tracking URL": trackingUrl,

        "Pickup Date": formatDateTime(
          pick(
            reverse?.pickupScheduledAt,
            reverse?.pickupDate,
            reverse?.pickup_date
          )
        ),

        "Picked Up At": formatDateTime(
          pick(reverse?.pickedUpAt, reverse?.pickupCompletedAt)
        ),

        "Delivered At": formatDateTime(reverse?.deliveredAt),

        "Courier Last Synced": formatDateTime(
          pick(reverse?.lastSyncedAt, reverse?.syncedAt)
        ),

        "Reverse Shipment Updated": formatDateTime(
          reverse?.updatedAt
        ),

        Customer: pick(address?.fullName, customer?.name),
        Mobile: str(pick(address?.phone, customer?.phone)),
        Email: pick(address?.email, customer?.email),
        Reason: rma?.reason || "",
        Note: rma?.customerNote || "",

        Amount:
          rma?.finalPayable ??
          rma?.totalAmount ??
          0,

        "Payment Method": rma?.paymentMethod || "",
        "Payment Status": rma?.paymentStatus || "",
        "Fulfillment Status": rma?.fulfillmentStatus || "",
        City: address?.city || "",
        State: address?.state || "",
        Pincode: str(address?.pincode),
        "RMA Created": formatDate(rma?.createdAt),
        "Order Date": formatDate(rma?.orderDate),
      };

      if (!rmaItems.length) {
        return [
          {
            ...baseRow,
            "Product Code": "",
            "Previous Size / Size": "",
            "New Size": newSize,
            Qty: "",
          },
        ];
      }

      return rmaItems.map((item) => {
        const matchedOrderItem =
          orderItems.find(
            (orderItem) =>
              item?.orderLineId != null &&
              str(orderItem?.lineId) === str(item.orderLineId)
          ) ||
          orderItems[item?.orderItemIndex] ||
          null;

        const previousSize = pick(
          item?.selectedSize,
          matchedOrderItem?.selectedSize,
          matchedOrderItem?.size,
          getSizeFromAttributes(
            matchedOrderItem?.variant?.attributes
          ),
          getSizeFromAttributes(matchedOrderItem?.attributes)
        );

        const productCode = pick(
          item?.productCode,
          matchedOrderItem?.productSnapshot?.productCode,
          matchedOrderItem?.productCode,
          matchedOrderItem?.code
        );

        return {
          ...baseRow,
          "Product Code": str(productCode),
          "Previous Size / Size": previousSize,
          "New Size":
            norm(rma?.type) === "exchange" ? newSize : "",
          Qty: item?.quantity ?? 1,
        };
      });
    });

    const headers = Object.keys(rows[0]);

    // Keep leading zeros and long courier IDs intact in Excel.
    const textColumns = new Set([
      "Order Number",
      "RMA Number",
      "Reverse AWB / Waybill",
      "Reverse Shipment ID",
      "Courier Order ID",
      "Courier Status Code",
      "Mobile",
      "Pincode",
      "Product Code",
    ]);

    const html = `
      <html xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
          <meta charset="UTF-8" />
        </head>
        <body>
          <table border="1">
            <thead>
              <tr>
                ${headers
        .map(
          (header) =>
            `<th style="background:#eeeeee;font-weight:bold;">${escapeHtml(header)}</th>`
        )
        .join("")}
              </tr>
            </thead>
            <tbody>
              ${rows
        .map(
          (row) => `
                    <tr>
                      ${headers
              .map((header) => {
                const style = textColumns.has(header)
                  ? ` style='mso-number-format:"\\@";'`
                  : "";

                return `<td${style}>${escapeHtml(
                  row[header]
                )}</td>`;
              })
              .join("")}
                    </tr>
                  `
        )
        .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob(["\uFEFF", html], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `rma-courier-details-${new Date()
      .toISOString()
      .slice(0, 10)}.xls`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const clearFilters = () => {
    setOrderSearch("");
    setMobileSearch("");
    setFulfilledFilter("all");
    setFromDate("");
    setToDate("");
    setStatusFilter("all");
    setTypeFilter("all");
    setSortDir("desc");
  };

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            RMA Requests
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage return and exchange requests.
          </p>
        </div>



        <div className="flex flex-wrap gap-2">
          {selected.length > 0 && (
            <button
              onClick={bulkMarkFulfilled}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <CheckCheck size={16} />
              Mark Fulfilled ({selected.length})
            </button>
          )}

          <button
            onClick={bulkSyncReversePickups}
            disabled={bulkSyncingReverse}
            className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {bulkSyncingReverse ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RotateCcw size={16} />
            )}

            {bulkSyncingReverse
              ? "Syncing Reverse..."
              : "Sync All Reverse"}
          </button>

          <button
            onClick={downloadExcel}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download size={16} />
            Excel
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <div className="xl:col-span-2">
            <label className="text-xs text-gray-500">
              Order / RMA Number
            </label>

            <input
              value={orderSearch}
              onChange={(e) =>
                setOrderSearch(e.target.value)
              }
              placeholder="000205 / RMA-..."
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">
              Mobile
            </label>

            <input
              value={mobileSearch}
              onChange={(e) =>
                setMobileSearch(e.target.value)
              }
              placeholder="9876543210"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">
              Fulfilled
            </label>

            <select
              value={fulfilledFilter}
              onChange={(e) =>
                setFulfilledFilter(e.target.value)
              }
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="pending">
                Pending
              </option>
              <option value="fulfilled">
                Fulfilled
              </option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">
              From
            </label>

            <input
              type="date"
              value={fromDate}
              onChange={(e) =>
                setFromDate(e.target.value)
              }
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">
              To
            </label>

            <input
              type="date"
              value={toDate}
              onChange={(e) =>
                setToDate(e.target.value)
              }
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">
              RMA Status
            </label>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm capitalize"
            >
              {statusOptions.map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">
              Type
            </label>

            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value)
              }
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm capitalize"
            >
              {typeOptions.map((type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type}
                </option>
              ))}
            </select>
          </div>

        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {filteredRmas.length} requests
          </p>

          <button
            onClick={clearFilters}
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-gray-500">
          Loading RMA requests...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {str(error)}
        </div>
      )}

      {!loading &&
        filteredRmas.length > 0 && (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="w-10 p-4">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAll}
                      />
                    </th>

                    <th className="w-10 p-4" />

                    <th className="p-4 text-left">
                      Order #
                    </th>

                    <th className="p-4 text-left">
                      RMA #
                    </th>

                    <th className="p-4 text-left">
                      Type
                    </th>

                    <th className="p-4 text-left">
                      Status
                    </th>

                    <th className="p-4 text-left">
                      Fulfilled
                    </th>
                    <th className="p-4 text-left">Pickup</th>

                    <th className="p-4 text-left">
                      Reverse Shipment
                    </th>

                    <th className="p-4 text-left">Refund Eligible</th>
                    <th className="p-4 text-left">Refunded</th>


                    <th className="p-4 text-left">
                      Customer
                    </th>

                    <th className="p-4 text-left">
                      Mobile
                    </th>

                    <th className="p-4 text-left">
                      Created
                    </th>

                    <th className="p-4 text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredRmas.map((rma, index) => {
                    const rowKey =
                      getKey(rma) || `${index}`;

                    return (
                      <RmaRow
                        key={rowKey}
                        rma={rma}
                        rowKey={rowKey}
                        openPickupModal={openPickupModal}
                        locked={rma?.isFulfilled === true}
                        isApproved={rma?.isApproved === true}

                        approving={approving}
                        approveRma={handleApproveRma}

                        isOpen={
                          rma?.isFulfilled === true
                            ? false
                            : expanded === rowKey
                        }
                        selected={selected}
                        toggleSelected={toggleSelected}
                        toggleExpand={toggleExpand}

                        updating={updating}

                        syncingReverse={syncingReverse}
                        syncReversePickup={handleReverseSync}

                        updateFulfilled={updateFulfilled}

                        openRefundModal={setRefundRma}

                        fetchAllRmas={() =>
                          fetchRmaByNumber(rma.orderId, rma.rmaNumber)
                        }
                        creditAmount={creditAmount}
                        setCreditAmount={setCreditAmount}

                        creditNote={creditNote}
                        setCreditNote={setCreditNote}

                        creditLoading={creditLoading}
                        addRefundCredit={addRefundCredit}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {pickupRma && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Book Return Pickup
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Customer pincode:{" "}
                  {getCustomerPincode(pickupRma)}
                </p>
              </div>

              <button
                type="button"
                disabled={bookingPickup}
                onClick={() => setPickupRma(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {checkingPickup ? (
              <div className="flex items-center gap-2 py-8 text-sm text-gray-600">
                <Loader2
                  size={18}
                  className="animate-spin"
                />
                Checking both couriers...
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {[
                  {
                    key: "shiprocket",
                    label: "Shiprocket",
                  },
                  {
                    key: "delhivery",
                    label: "Delhivery",
                  },
                ].map(({ key, label }) => {
                  const status =
                    pickupAvailability[key];

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!status.available}
                      onClick={() =>
                        setPickupProvider(key)
                      }
                      className={`flex w-full items-center justify-between rounded-xl border p-4 text-left ${pickupProvider === key
                          ? "border-black bg-gray-50"
                          : "border-gray-200"
                        } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <span className="font-medium">
                        {label}
                      </span>

                      <span
                        className={`text-xs font-medium ${status.available
                            ? "text-emerald-600"
                            : "text-red-500"
                          }`}
                      >
                        {status.available
                          ? "Available"
                          : status.error ||
                          "Unavailable"}
                      </span>
                    </button>
                  );
                })}

                {!pickupAvailability.shiprocket
                  .available &&
                  !pickupAvailability.delhivery
                    .available && (
                    <p className="text-sm text-red-600">
                      Return pickup is currently unavailable through both courier partners.
                    </p>
                  )}

                <button
                  type="button"
                  disabled={
                    !pickupProvider ||
                    bookingPickup
                  }
                  onClick={bookReturnPickup}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
                >
                  {bookingPickup && (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {bookingPickup
                    ? "Booking..."
                    : "Confirm Return Pickup"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <RmaRefundModal
        rma={refundRma}
        open={Boolean(refundRma && refundRma?.isFulfilled !== true)}
        onClose={() => setRefundRma(null)}
        onSuccess={async () => {
          setRefundRma(null);

          if (refundRma?.orderId && refundRma?.rmaNumber) {
            await fetchRmaByNumber(
              refundRma.orderId,
              refundRma.rmaNumber
            );
          }
        }}
      />
    </div>
  );
}
