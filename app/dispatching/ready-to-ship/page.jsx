"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Download,
  FileText,
  ReceiptIndianRupee,
  Loader2,
  PackageCheck,
  RefreshCcw,
  Search,
  Truck,
  X,
  CalendarClock,
  Radar,

} from "lucide-react";

import { useOrderStore } from "@/store/orderStore";
import useDelhiveryStore from "@/store/delhiveryStore";
import { useShiprocketStore } from "@/store/ShipRocketStore";

const API = (process.env.NEXT_PUBLIC_API_URL || "").trim();

const SHIPROCKET_PICKUP_PINCODE = String(
  process.env.NEXT_PUBLIC_SHIPROCKET_PICKUP_PINCODE || "110044",
)
  .replace(/\D/g, "")
  .slice(0, 6);

const PROVIDERS = {
  UNASSIGNED: "unassigned",
  SHIPROCKET: "shiprocket",
  DELHIVERY: "delhivery",
};

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getCustomerName = (order) =>
  order?.shippingAddressSnapshot?.fullName ||
  order?.customerId?.name ||
  "Customer";

const getLocation = (order) => {
  const address = order?.shippingAddressSnapshot || {};

  return [address.city, address.state, address.pincode]
    .filter(Boolean)
    .join(", ");
};

const getProvider = (order) =>
  String(order?.shipment?.provider || "unassigned")
    .trim()
    .toLowerCase();

const getShipmentAwb = (order) =>
  String(
    order?.shipment?.awb ||
    order?.courierSummary?.awb ||
    order?.shipment?.delhivery?.waybill ||
    order?.shipment?.delhivery?.awb ||
    order?.shipment?.shiprocket?.awb ||
    "",
  ).trim();

const getCourierName = (order) => {
  const provider = getProvider(order);

  return String(
    order?.shipment?.courierName ||
    (provider === PROVIDERS.DELHIVERY
      ? order?.shipment?.delhivery?.courierName
      : "") ||
    (provider === PROVIDERS.SHIPROCKET
      ? order?.shipment?.shiprocket?.courierName
      : "") ||
    "",
  ).trim();
};

const formatProviderName = (provider) => {
  if (provider === PROVIDERS.SHIPROCKET) return "Shiprocket";
  if (provider === PROVIDERS.DELHIVERY) return "Delhivery";
  return "Unassigned";
};

const getShiprocketOptions = (data) => {
  const candidates =
    data?.couriers ||
    data?.availableCourierCompanies ||
    data?.data?.available_courier_companies ||
    data?.data?.availableCourierCompanies ||
    data?.data?.couriers ||
    data?.options ||
    [];

  if (!Array.isArray(candidates)) return [];

  return candidates
    .map((courier) => ({
      id:
        courier?.courier_company_id ??
        courier?.courierCompanyId ??
        courier?.courier_id ??
        courier?.id,

      name:
        courier?.courier_name ||
        courier?.courierName ||
        courier?.name ||
        "Shiprocket Courier",

      rate: Number(
        courier?.rate ??
        courier?.freight_charge ??
        courier?.freightCharge ??
        courier?.shipping_charge ??
        courier?.shippingCharge ??
        0,
      ),

      codCharges: Number(
        courier?.cod_charges ??
        courier?.codCharges ??
        courier?.cod_charge ??
        0,
      ),

      estimatedDays:
        courier?.estimated_delivery_days ||
        courier?.estimatedDays ||
        courier?.etd ||
        courier?.estimated_delivery ||
        "",

      rating: Number(
        courier?.rating ?? courier?.courier_rating ?? courier?.courierRating ?? 0,
      ),

      raw: courier,
    }))
    .filter((courier) => courier.id != null)
    .sort((a, b) => a.rate + a.codCharges - (b.rate + b.codCharges));
};

const getDelhiveryOption = (data) => {
  const source = data?.option || data?.data || data || {};

  const rate =
    source?.rate != null
      ? Number(source.rate)
      : null;

  const codCharges =
    source?.codCharges != null
      ? Number(source.codCharges)
      : 0;

  return {
    id: "delhivery-direct",

    name:
      source?.courierName ||
      source?.courier_name ||
      "Delhivery Direct",

    rate,
    codCharges,

    estimatedDays:
      source?.estimatedDays ||
      source?.estimated_days ||
      source?.tat ||
      source?.deliveryDays ||
      "",

    serviceable: source?.serviceable === true,

    pricingAvailable:
      source?.pricingAvailable === true &&
      Number(rate || 0) > 0,

    unavailableReason:
      source?.unavailableReason ||
      "Delhivery is unavailable for this order.",

    raw: source,
  };
};

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.message || `Request failed with status ${response.status}`,
    );
  }

  return data;
}

const findLabelUrl = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    const url = value.trim();

    if (!/^https?:\/\//i.test(url)) {
      return "";
    }

    const looksLikeLabel =
      /\.pdf($|\?)/i.test(url) ||
      /label/i.test(url) ||
      /waybill/i.test(url);

    return looksLikeLabel ? url : "";
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const url = findLabelUrl(item);

      if (url) {
        return url;
      }
    }

    return "";
  }

  if (typeof value === "object") {
    const preferredKeys = [
      "pdf_download_link",
      "pdfDownloadLink",
      "pdf_url",
      "pdfUrl",
      "download_url",
      "downloadUrl",
      "label_url",
      "labelUrl",
      "label",
      "labels",
      "waybill_url",
      "waybillUrl",
    ];

    for (const key of preferredKeys) {
      if (value[key] == null) {
        continue;
      }

      const url = findLabelUrl(value[key]);

      if (url) {
        return url;
      }
    }

    // Search nested objects but ignore random image/logo keys
    for (const [key, item] of Object.entries(value)) {
      if (
        /logo|image|icon|banner|static/i.test(key)
      ) {
        continue;
      }

      const url = findLabelUrl(item);

      if (url) {
        return url;
      }
    }
  }

  return "";
};

const downloadUrl = (url, fileName = "delhivery-label.pdf") => {
  if (!url) return false;

  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  document.body.appendChild(link);
  link.click();
  link.remove();

  return true;
};

function StatusBadge({ provider }) {
  const classes = {
    unassigned: "border-zinc-200 bg-zinc-50 text-zinc-600",
    shiprocket: "border-blue-200 bg-blue-50 text-blue-700",
    delhivery: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  const labels = {
    unassigned: "Unassigned",
    shiprocket: "Shiprocket",
    delhivery: "Delhivery",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${classes[provider] || classes.unassigned
        }`}
    >
      {labels[provider] || provider}
    </span>
  );
}

export default function ReadyToShipPage() {
  const {
    shippingOrders,
    shippingOrdersMeta,
    loading,
    error,
    fetchPackedOrdersForShipping,
    assignCourierToOrder,
  } = useOrderStore();

  const checkDelhiveryServiceability =
    useDelhiveryStore((state) => state.checkServiceability);

  const trackDelhiveryShipment =
    useDelhiveryStore(
      (state) => state.trackShipment,
    );

  const syncAllDelhiveryTracking =
    useDelhiveryStore(
      (state) => state.syncAllTracking,
    );

  const createDelhiveryPickup =
    useDelhiveryStore(
      (state) => state.createPickup,
    );

  const checkShiprocketServiceability =
    useShiprocketStore((state) => state.checkServiceability);

  const bookShiprocketShipment =
    useShiprocketStore((state) => state.bookShipment);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [sortOrder, setSortOrder] = useState("oldest");
  const [selectedIds, setSelectedIds] = useState([]);
  const [rates, setRates] = useState({});
  const [selectedShiprocketCourier, setSelectedShiprocketCourier] = useState({});
  const [checkingRates, setCheckingRates] = useState({});
  const [booking, setBooking] = useState({});
  const [bulkBookingProvider, setBulkBookingProvider] = useState("");
  const [message, setMessage] = useState(null);
  const [labelLoading, setLabelLoading] = useState({});
  const [bulkLabelLoading, setBulkLabelLoading] = useState(false);
  const [trackingLoading, setTrackingLoading] =
    useState({});

  const [
    trackingSyncLoading,
    setTrackingSyncLoading,
  ] = useState(false);

  const [pickupOpen, setPickupOpen] =
    useState(false);

  const [pickupLoading, setPickupLoading] =
    useState(false);

  const [pickupForm, setPickupForm] =
    useState({
      pickupDate: "",
      pickupTime: "15:00",
      packageCount: 1,
    });


  const getDelhiveryAwb = (order) =>
    String(
      order?.shipment?.delhivery?.waybill ||
      order?.shipment?.delhivery?.awb ||
      (getProvider(order) === PROVIDERS.DELHIVERY
        ? order?.shipment?.awb
        : "") ||
      "",
    ).trim();

  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });

    window.setTimeout(() => {
      setMessage(null);
    }, 3500);
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      await fetchPackedOrdersForShipping({
        search: search || undefined,
        page: 1,
        limit: 200,
      });
    } catch (requestError) {
      showMessage(
        "error",
        requestError?.message || "Unable to load packed orders.",
      );
    }
  }, [fetchPackedOrdersForShipping, search, showMessage]);

  const downloadDelhiveryLabel = async (order) => {
    const orderId = String(order?._id || "");
    const awb = getDelhiveryAwb(order);

    if (!awb) {
      showMessage(
        "error",
        `Order #${order?.orderNumber} does not have a Delhivery AWB.`,
      );
      return;
    }

    setLabelLoading((current) => ({
      ...current,
      [orderId]: true,
    }));

    try {
      const response = await fetch(
        `${API}/api/delhivery/label/${encodeURIComponent(awb)}?pdf=true`,
        {
          cache: "no-store",
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message ||
          "Unable to generate Delhivery label.",
        );
      }

      const labelUrl =
        data?.data?.labelUrl ||
        data?.labelUrl ||
        "";

      if (!labelUrl) {
        console.log(
          "Delhivery single label response:",
          data,
        );

        throw new Error(
          "Delhivery label URL not found.",
        );
      }

      downloadUrl(
        labelUrl,
        `Delhivery-${order?.orderNumber || awb}.pdf`,
      );

      showMessage(
        "success",
        `Label generated for #${order?.orderNumber}.`,
      );
    } catch (error) {
      showMessage(
        "error",
        error?.message ||
        "Unable to download label.",
      );
    } finally {
      setLabelLoading((current) => ({
        ...current,
        [orderId]: false,
      }));
    }
  };

  const downloadBulkDelhiveryLabels = async () => {
    const waybills = [
      ...new Set(
        selectedOrders
          .map((order) =>
            getDelhiveryAwb(order),
          )
          .filter(Boolean),
      ),
    ];

    if (!waybills.length) {
      showMessage(
        "error",
        "Selected orders do not have Delhivery AWBs.",
      );
      return;
    }

    setBulkLabelLoading(true);

    try {
      const response = await fetch(
        `${API}/api/delhivery/labels/bulk`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            waybills,
          }),
        },
      );

      if (!response.ok) {
        const data =
          await response
            .json()
            .catch(() => ({}));

        throw new Error(
          data?.message ||
          "Unable to generate bulk labels.",
        );
      }

      const blob =
        await response.blob();

      if (!blob.size) {
        throw new Error(
          "Empty label PDF received.",
        );
      }

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;
      link.download =
        `Delhivery-Labels-${waybills.length}.pdf`;

      document.body.appendChild(link);

      link.click();
      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      const generated = Number(
        response.headers.get(
          "X-Labels-Generated",
        ) || waybills.length,
      );

      const failed = Number(
        response.headers.get(
          "X-Labels-Failed",
        ) || 0,
      );

      showMessage(
        failed ? "error" : "success",
        failed
          ? `${generated} labels downloaded, ${failed} failed.`
          : `${generated} Delhivery labels downloaded.`,
      );
    } catch (error) {
      showMessage(
        "error",
        error?.message ||
        "Bulk label download failed.",
      );
    } finally {
      setBulkLabelLoading(false);
    }
  };

  const syncTrackingForOrder = async (
    order,
  ) => {
    const orderId = String(
      order?._id || "",
    );

    const awb = getDelhiveryAwb(order);

    if (!awb) {
      showMessage(
        "error",
        "Delhivery AWB is missing.",
      );
      return;
    }

    setTrackingLoading((current) => ({
      ...current,
      [orderId]: true,
    }));

    try {
      const result =
        await trackDelhiveryShipment(awb);

      const synced =
        result?.sync?.[0];

      showMessage(
        "success",
        synced?.fulfillmentChanged
          ? `Updated to ${String(
            synced.fulfillmentStatus,
          ).replaceAll("_", " ")}.`
          : "Tracking synced successfully.",
      );

      await loadOrders();
    } catch (error) {
      showMessage(
        "error",
        error?.message ||
        "Tracking sync failed.",
      );
    } finally {
      setTrackingLoading(
        (current) => ({
          ...current,
          [orderId]: false,
        }),
      );
    }
  };

  const handleSyncAllTracking =
    async () => {
      setTrackingSyncLoading(true);

      try {
        const result =
          await syncAllDelhiveryTracking();

        showMessage(
          "success",
          `${Number(
            result?.synced || 0,
          )} synced, ${Number(
            result?.changed || 0,
          )} updated, ${Number(
            result?.failed || 0,
          )} failed.`,
        );

        await loadOrders();
      } catch (error) {
        showMessage(
          "error",
          error?.message ||
          "Tracking sync failed.",
        );
      } finally {
        setTrackingSyncLoading(false);
      }
    };

  const scheduleDelhiveryPickup =
    async () => {
      const packageCount = Math.max(
        1,
        Number(
          pickupForm.packageCount || 1,
        ),
      );

      if (!pickupForm.pickupDate) {
        showMessage(
          "error",
          "Select pickup date.",
        );
        return;
      }

      if (!pickupForm.pickupTime) {
        showMessage(
          "error",
          "Select pickup time.",
        );
        return;
      }

      setPickupLoading(true);

      try {
        await createDelhiveryPickup({
          pickupDate:
            pickupForm.pickupDate,
          pickupTime:
            pickupForm.pickupTime,
          packageCount,
        });

        setPickupOpen(false);

        showMessage(
          "success",
          `Pickup scheduled for ${packageCount} packages.`,
        );
      } catch (error) {
        showMessage(
          "error",
          error?.message ||
          "Pickup scheduling failed.",
        );
      } finally {
        setPickupLoading(false);
      }
    };



  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadOrders();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [loadOrders]);

  const orders = useMemo(
    () => (Array.isArray(shippingOrders) ? shippingOrders : []),
    [shippingOrders],
  );

  const getOrderRateState = useCallback(
    (order) => {
      const orderId = String(order?._id || "");
      const orderRates = rates[orderId];

      if (!orderRates) {
        return {
          checked: false,
          shiprocketAvailable: false,
          delhiveryAvailable: false,
          notServiceable: false,
          needsAttention: false,
        };
      }

      const shiprocketAvailable =
        Array.isArray(orderRates?.shiprocket) &&
        orderRates.shiprocket.length > 0;

      const delhiveryOption = orderRates?.delhivery;
      const delhiveryAvailable =
        delhiveryOption?.serviceable === true &&
        delhiveryOption?.pricingAvailable === true &&
        Number(delhiveryOption?.rate || 0) > 0;

      const shiprocketError = String(orderRates?.shiprocketError || "").trim();
      const delhiveryError = String(orderRates?.delhiveryError || "").trim();

      const shiprocketHardError =
        Boolean(shiprocketError) &&
        shiprocketError !== "No Shiprocket courier available.";

      const pricingProblem =
        delhiveryOption?.serviceable === true &&
        delhiveryOption?.pricingAvailable !== true;

      const needsAttention =
        shiprocketHardError || Boolean(delhiveryError) || pricingProblem;

      return {
        checked: true,
        shiprocketAvailable,
        delhiveryAvailable,
        notServiceable:
          !needsAttention && !shiprocketAvailable && !delhiveryAvailable,
        needsAttention,
      };
    },
    [rates],
  );

  const tabCounts = useMemo(() => {
    const counts = {
      all: orders.length,
      unassigned: 0,
      shiprocket: 0,
      delhivery: 0,
      not_serviceable: 0,
      attention: 0,
    };

    orders.forEach((order) => {
      const provider = getProvider(order);
      const rateState = getOrderRateState(order);

      if (provider === PROVIDERS.UNASSIGNED) counts.unassigned += 1;
      if (provider === PROVIDERS.SHIPROCKET) counts.shiprocket += 1;
      if (provider === PROVIDERS.DELHIVERY) counts.delhivery += 1;
      if (rateState.notServiceable) counts.not_serviceable += 1;
      if (rateState.needsAttention) counts.attention += 1;
    });

    return counts;
  }, [orders, getOrderRateState]);

  const visibleOrders = useMemo(() => {
    const filtered = orders.filter((order) => {
      const provider = getProvider(order);
      const rateState = getOrderRateState(order);

      switch (activeTab) {
        case "unassigned":
          return provider === PROVIDERS.UNASSIGNED;
        case "shiprocket":
          return provider === PROVIDERS.SHIPROCKET;
        case "delhivery":
          return provider === PROVIDERS.DELHIVERY;
        case "not_serviceable":
          return rateState.notServiceable;
        case "attention":
          return rateState.needsAttention;
        default:
          return true;
      }
    });

    return [...filtered].sort((a, b) => {
      const aTime = new Date(a?.fulfillmentDates?.packedAt || 0).getTime();
      const bTime = new Date(b?.fulfillmentDates?.packedAt || 0).getTime();

      return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
    });
  }, [orders, activeTab, sortOrder, getOrderRateState]);

  useEffect(() => {
    const availableIds = new Set(orders.map((order) => String(order._id)));

    setSelectedIds((current) =>
      current.filter((id) => availableIds.has(String(id))),
    );
  }, [orders]);

  const selectedOrders = useMemo(() => {
    const selectedSet = new Set(selectedIds.map(String));

    return orders.filter((order) => selectedSet.has(String(order._id)));
  }, [orders, selectedIds]);

  const selectedShiprocketEligibleCount = selectedOrders.filter((order) => {
    const orderId = String(order._id);
    const orderRates = rates[orderId];

    return (
      Array.isArray(orderRates?.shiprocket) &&
      orderRates.shiprocket.length > 0 &&
      Boolean(selectedShiprocketCourier[orderId])
    );
  }).length;

  const selectedDelhiveryEligibleCount = selectedOrders.filter((order) => {
    const option = rates[String(order._id)]?.delhivery;

    return (
      option?.serviceable === true &&
      option?.pricingAvailable === true &&
      Number(option?.rate || 0) > 0
    );
  }).length;

  const selectedDelhiveryLabelCount = selectedOrders.filter(
    (order) => Boolean(getDelhiveryAwb(order)),
  ).length;

  const visibleIds = visibleOrders.map((order) => String(order._id));
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const toggleAll = () => {
    setSelectedIds((current) => {
      if (allSelected) {
        return current.filter((id) => !visibleIds.includes(String(id)));
      }

      return Array.from(new Set([...current, ...visibleIds]));
    });
  };

  const toggleOrder = (orderId) => {
    const id = String(orderId);

    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const checkRatesForOrder = async (order) => {
    const orderId = String(order?._id || "");

    if (!orderId) return;

    const deliveryPincode = String(
      order?.shippingAddressSnapshot?.pincode || "",
    )
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!/^\d{6}$/.test(deliveryPincode)) {
      setRates((current) => ({
        ...current,

        [orderId]: {
          shiprocket: [],

          delhivery: {
            id: "delhivery-direct",
            name: "Delhivery Direct",
            serviceable: false,
            pricingAvailable: false,
            rate: null,
            codCharges: 0,
            unavailableReason: "Valid delivery pincode is missing.",
          },

          shiprocketError: "Valid delivery pincode is missing.",
          delhiveryError: "Valid delivery pincode is missing.",
        },
      }));

      return;
    }

    if (!/^\d{6}$/.test(SHIPROCKET_PICKUP_PINCODE)) {
      setRates((current) => ({
        ...current,

        [orderId]: {
          shiprocket: [],

          delhivery: current?.[orderId]?.delhivery || null,

          shiprocketError:
            "NEXT_PUBLIC_SHIPROCKET_PICKUP_PINCODE is not configured.",
          delhiveryError: "",
        },
      }));

      return;
    }

    setCheckingRates((current) => ({
      ...current,
      [orderId]: true,
    }));

    try {
      const isCod =
        String(order?.paymentMethod || "")
          .trim()
          .toLowerCase() === "cod";

      const calculatedWeight = Math.max(
        0.5,
        Number(order?.shippingSummary?.totalWeight || 0),
      );

      /*
       * Shiprocket:
       * Uses the common tested serviceability endpoint:
       * GET /api/shiprocket/serviceability
       */
      const shiprocketPromise = checkShiprocketServiceability({
        pickupPincode: SHIPROCKET_PICKUP_PINCODE,
        deliveryPincode,
        weight: calculatedWeight,
        cod: isCod,
      });

      /*
       * Delhivery Direct:
       * First check delivery-mode serviceability, then fetch rate.
       */
      const delhiveryPromise = (async () => {
        const serviceability =
          await checkDelhiveryServiceability(deliveryPincode);

        const paymentModeAvailable = isCod
          ? serviceability?.codAvailable === true
          : serviceability?.prepaidAvailable === true;

        const serviceable =
          serviceability?.serviceable === true &&
          paymentModeAvailable;

        if (!serviceable) {
          return {
            option: {
              id: "delhivery-direct",
              name: "Delhivery Direct",

              serviceable: false,
              pricingAvailable: false,

              rate: null,
              codCharges: 0,
              estimatedDays: "",

              codAvailable: Boolean(
                serviceability?.codAvailable,
              ),

              prepaidAvailable: Boolean(
                serviceability?.prepaidAvailable,
              ),

              pickupAvailable: Boolean(
                serviceability?.pickupAvailable,
              ),

              unavailableReason: isCod
                ? "Delhivery COD is not serviceable for this pincode."
                : "Delhivery prepaid delivery is not serviceable for this pincode.",

              raw: serviceability,
            },

            error: "",
          };
        }

        const rateResponse = await request(
          `/api/orders/${orderId}/delhivery/rate`,
        );

        return {
          option: getDelhiveryOption(rateResponse),
          error: "",
        };
      })();

      const [shiprocketResult, delhiveryResult] =
        await Promise.allSettled([
          shiprocketPromise,
          delhiveryPromise,
        ]);

      const shiprocketResponse =
        shiprocketResult.status === "fulfilled"
          ? shiprocketResult.value
          : null;

      const shiprocketOptions =
        shiprocketResult.status === "fulfilled"
          ? getShiprocketOptions(shiprocketResponse)
          : [];

      const shiprocketError =
        shiprocketResult.status === "rejected"
          ? shiprocketResult.reason?.message ||
          "Unable to fetch Shiprocket rates."
          : shiprocketOptions.length === 0
            ? "No Shiprocket courier available."
            : "";

      let delhiveryOption = {
        id: "delhivery-direct",
        name: "Delhivery Direct",
        serviceable: false,
        pricingAvailable: false,
        rate: null,
        codCharges: 0,
        estimatedDays: "",
        unavailableReason:
          "Unable to check Delhivery availability.",
      };

      let delhiveryError = "";

      if (delhiveryResult.status === "fulfilled") {
        delhiveryOption =
          delhiveryResult.value?.option ||
          delhiveryOption;

        delhiveryError =
          delhiveryResult.value?.error || "";
      } else {
        delhiveryError =
          delhiveryResult.reason?.message ||
          "Unable to check Delhivery availability.";

        delhiveryOption = {
          ...delhiveryOption,
          unavailableReason: delhiveryError,
        };
      }

      setRates((current) => ({
        ...current,

        [orderId]: {
          shiprocket: shiprocketOptions,
          delhivery: delhiveryOption,
          shiprocketError,
          delhiveryError,
        },
      }));

      if (
        shiprocketOptions.length > 0 &&
        !selectedShiprocketCourier[orderId]
      ) {
        setSelectedShiprocketCourier((current) => ({
          ...current,
          [orderId]: shiprocketOptions[0].id,
        }));
      }
    } catch (requestError) {
      const message =
        requestError?.message ||
        "Unable to check courier availability.";

      setRates((current) => ({
        ...current,

        [orderId]: {
          shiprocket: [],

          delhivery: {
            id: "delhivery-direct",
            name: "Delhivery Direct",
            serviceable: false,
            pricingAvailable: false,
            rate: null,
            codCharges: 0,
            unavailableReason: message,
          },

          shiprocketError: message,
          delhiveryError: message,
        },
      }));
    } finally {
      setCheckingRates((current) => ({
        ...current,
        [orderId]: false,
      }));
    }
  };

  useEffect(() => {
    if (!orders.length) return;

    const uncheckedOrders = orders.filter((order) => {
      const orderId = String(order._id);

      return (
        rates[orderId] === undefined &&
        checkingRates[orderId] !== true
      );
    });

    if (!uncheckedOrders.length) return;

    Promise.allSettled(
      uncheckedOrders.map((order) =>
        checkRatesForOrder(order),
      ),
    );
  }, [orders, rates, checkingRates]);

  const checkSelectedRates = async () => {
    if (!selectedOrders.length) {
      showMessage("error", "Select at least one order.");
      return;
    }

    for (const order of selectedOrders) {
      await checkRatesForOrder(order);
    }

    showMessage("success", "Courier rates checked.");
  };

  const bookOrder = async (order, provider) => {
    const orderId = String(order?._id || "");

    if (!orderId) {
      throw new Error("Order ID is required.");
    }

    const bookingKey = `${orderId}:${provider}`;

    setBooking((current) => ({
      ...current,
      [bookingKey]: true,
    }));

    try {
      const orderRates = rates[orderId];

      if (!orderRates) {
        throw new Error(
          "Courier availability is still being checked.",
        );
      }

      if (provider === PROVIDERS.SHIPROCKET) {
        const courierId =
          selectedShiprocketCourier[orderId];

        const selectedOption =
          orderRates?.shiprocket?.find(
            (option) =>
              String(option.id) === String(courierId),
          );

        if (!selectedOption) {
          throw new Error(
            "No serviceable Shiprocket courier selected.",
          );
        }

        // Assign first
        await assignCourierToOrder(
          orderId,
          PROVIDERS.SHIPROCKET,
        );

        // Then book
        await bookShiprocketShipment(orderId);
      } else if (provider === PROVIDERS.DELHIVERY) {
        const delhiveryOption =
          orderRates?.delhivery;

        const canBookDelhivery =
          delhiveryOption?.serviceable === true &&
          delhiveryOption?.pricingAvailable === true &&
          Number(delhiveryOption?.rate || 0) > 0;

        if (!canBookDelhivery) {
          throw new Error(
            delhiveryOption?.unavailableReason ||
            "Delhivery is not available for this order.",
          );
        }

        // Assign first
        await assignCourierToOrder(
          orderId,
          PROVIDERS.DELHIVERY,
        );

        // Then book
        await request(
          `/api/orders/${orderId}/delhivery/book`,
          {
            method: "POST",
            body: JSON.stringify({}),
          },
        );
      } else {
        throw new Error("Invalid courier provider.");
      }

      setSelectedIds((current) =>
        current.filter(
          (selectedId) =>
            String(selectedId) !== orderId,
        ),
      );

      await loadOrders();

      return {
        success: true,
        orderId,
        provider,
      };
    } catch (requestError) {
      showMessage(
        "error",
        requestError?.message ||
        `Unable to book order #${order.orderNumber}.`,
      );

      throw requestError;
    } finally {
      setBooking((current) => ({
        ...current,
        [bookingKey]: false,
      }));
    }
  };

  const bulkBook = async (provider) => {
    if (!selectedOrders.length) {
      showMessage("error", "Select at least one order.");
      return;
    }

    const eligibleOrders = selectedOrders.filter(
      (order) => {
        const orderId = String(order._id);
        const orderRates = rates[orderId];

        if (provider === PROVIDERS.SHIPROCKET) {
          return (
            Array.isArray(orderRates?.shiprocket) &&
            orderRates.shiprocket.length > 0 &&
            Boolean(
              selectedShiprocketCourier[orderId],
            )
          );
        }

        if (provider === PROVIDERS.DELHIVERY) {
          return (
            orderRates?.delhivery?.serviceable === true &&
            orderRates?.delhivery?.pricingAvailable === true &&
            Number(
              orderRates?.delhivery?.rate || 0,
            ) > 0
          );
        }

        return false;
      },
    );

    const skippedCount =
      selectedOrders.length - eligibleOrders.length;

    if (!eligibleOrders.length) {
      showMessage(
        "error",
        provider === PROVIDERS.DELHIVERY
          ? "Selected orders are not serviceable by Delhivery."
          : "No Shiprocket courier is available for selected orders.",
      );
      return;
    }

    setBulkBookingProvider(provider);

    let successCount = 0;
    let failedCount = 0;

    try {
      for (const order of eligibleOrders) {
        try {
          await bookOrder(order, provider);
          successCount += 1;
        } catch {
          failedCount += 1;
        }
      }

      showMessage(
        successCount ? "success" : "error",
        `${successCount} booked, ${failedCount} failed${skippedCount
          ? `, ${skippedCount} unavailable skipped`
          : ""
        }.`,
      );
    } finally {
      setBulkBookingProvider("");
      await loadOrders();
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 p-4 sm:p-6 lg:p-8">
      <div className="w-full">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-500">
              <Truck className="h-4 w-4" />
              Dispatching
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
              Ready to Ship
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Assign couriers, compare shipping prices and book packed orders.
            </p>
          </div>

          <button
            type="button"
            onClick={loadOrders}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </header>

        {message ? (
          <div
            className={`mb-4 flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium ${message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
              }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "success" ? (
                <Check className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}

              {message.text}
            </div>

            <button type="button" onClick={() => setMessage(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <section className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Packed orders
            </p>
            <p className="mt-2 text-2xl font-bold text-zinc-950">
              {shippingOrdersMeta?.totalCount ?? orders.length}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Not booked
            </p>
            <p className="mt-2 text-2xl font-bold text-zinc-950">
              {tabCounts.unassigned}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Selected
            </p>
            <p className="mt-2 text-2xl font-bold text-zinc-950">
              {selectedIds.length}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Needs attention
            </p>
            <p className="mt-2 text-2xl font-bold text-red-600">
              {tabCounts.attention}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-4 pt-4">
            <div className="flex gap-1 overflow-x-auto">
              {[
                ["all", "All", tabCounts.all],
                ["unassigned", "Not Booked", tabCounts.unassigned],
                ["shiprocket", "Booked · Shiprocket", tabCounts.shiprocket],
                ["delhivery", "Booked · Delhivery", tabCounts.delhivery],
                ["not_serviceable", "Not Serviceable", tabCounts.not_serviceable],
                ["attention", "Needs Attention", tabCounts.attention],
              ].map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setActiveTab(value);
                    setSelectedIds([]);
                  }}
                  className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition ${activeTab === value
                      ? "border-zinc-950 text-zinc-950"
                      : "border-transparent text-zinc-500 hover:text-zinc-800"
                    }`}
                >
                  {label}
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-xs ${activeTab === value
                        ? "bg-zinc-950 text-white"
                        : "bg-zinc-100 text-zinc-600"
                      }`}
                  >
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <div className="relative max-w-md flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search order, customer, city or pincode"
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-zinc-400"
                />
              </div>

              <div className="relative">
                <select
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  className="h-10 min-w-40 appearance-none rounded-lg border border-zinc-200 bg-white pl-3 pr-9 text-sm font-medium text-zinc-700 outline-none focus:border-zinc-400"
                >
                  <option value="oldest">Oldest Packed</option>
                  <option value="newest">Newest Packed</option>
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Bulk Shiprocket */}
              <button
                type="button"
                onClick={() => bulkBook(PROVIDERS.SHIPROCKET)}
                disabled={
                  !selectedIds.length ||
                  bulkBookingProvider ||
                  selectedShiprocketEligibleCount === 0
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {bulkBookingProvider === PROVIDERS.SHIPROCKET ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Truck className="h-4 w-4" />
                )}

                Book Shiprocket
                {selectedIds.length > 0
                  ? ` (${selectedShiprocketEligibleCount})`
                  : ""}
              </button>

              {/* Bulk Delhivery */}
              <button
                type="button"
                onClick={() => bulkBook(PROVIDERS.DELHIVERY)}
                disabled={
                  !selectedIds.length ||
                  bulkBookingProvider ||
                  selectedDelhiveryEligibleCount === 0
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {bulkBookingProvider === PROVIDERS.DELHIVERY ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PackageCheck className="h-4 w-4" />
                )}

                Book Delhivery
                {selectedIds.length > 0
                  ? ` (${selectedDelhiveryEligibleCount})`
                  : ""}
              </button>

              {/* Refresh */}
              <button
                type="button"
                onClick={loadOrders}
                disabled={loading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>

          {error ? (
            <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-[1450px] w-full table-auto border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="w-12 px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-zinc-300 accent-zinc-950"
                    />
                  </th>

                  {[
                    "Order",
                    "Customer",
                    "Location",
                    "Items",
                    "Order Value",
                    "Payment",
                    "Packed At",
                    "Assigned",
                    "Courier Availability",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500 last:min-w-[210px]"                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading && !orders.length ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-20 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
                      <p className="mt-3 text-sm text-zinc-500">
                        Loading packed orders...
                      </p>
                    </td>
                  </tr>
                ) : null}

                {!loading && !visibleOrders.length ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-20 text-center">
                      <PackageCheck className="mx-auto h-9 w-9 text-zinc-300" />
                      <p className="mt-3 font-semibold text-zinc-700">
                        No packed orders found
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        Packed orders waiting for courier booking will appear
                        here.
                      </p>
                    </td>
                  </tr>
                ) : null}

                {visibleOrders.map((order) => {
                  const orderId = String(order._id);
                  const provider = getProvider(order);
                  const shipmentAwb = getShipmentAwb(order);
                  const courierName = getCourierName(order);
                  const providerName = formatProviderName(provider);
                  const orderRates = rates[orderId] || {};
                  const shiprocketOptions =
                    orderRates.shiprocket || [];
                  const delhiveryOption =
                    orderRates.delhivery || null;

                  const selectedCourierId =
                    selectedShiprocketCourier[orderId];

                  const selectedCourier =
                    shiprocketOptions.find(
                      (option) =>
                        String(option.id) ===
                        String(selectedCourierId),
                    ) || shiprocketOptions[0];

                  const shiprocketBooking =
                    booking[
                    `${orderId}:${PROVIDERS.SHIPROCKET}`
                    ];

                  const delhiveryBooking =
                    booking[
                    `${orderId}:${PROVIDERS.DELHIVERY}`
                    ];

                  const ratesChecking =
                    checkingRates[orderId] === true;

                  const shiprocketAvailable =
                    shiprocketOptions.length > 0 &&
                    Boolean(selectedCourier?.id);

                  const delhiveryAvailable =
                    delhiveryOption?.serviceable === true &&
                    delhiveryOption?.pricingAvailable === true &&
                    Number(delhiveryOption?.rate || 0) > 0;

                  const delhiveryAwb = getDelhiveryAwb(order);

                  const syncingTracking =
                    trackingLoading[orderId] === true;


                  const downloadingLabel =
                    labelLoading[orderId] === true;

                  return (
                    <tr
                      key={orderId}
                      className={`border-b border-zinc-100 align-top transition hover:bg-zinc-50/70 ${selectedIds.includes(orderId)
                        ? "bg-blue-50/30"
                        : ""
                        }`}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(orderId)}
                          onChange={() => toggleOrder(orderId)}
                          className="h-4 w-4 rounded border-zinc-300 accent-zinc-950"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-bold text-zinc-950">
                          #{order.orderNumber}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {order.shippingSummary?.totalQuantity ||
                            order.items?.reduce(
                              (sum, item) =>
                                sum + Number(item.quantity || 0),
                              0,
                            ) ||
                            0}{" "}
                          units
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="max-w-44 truncate font-semibold text-zinc-800">
                          {getCustomerName(order)}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {order.shippingAddressSnapshot?.phone || "—"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="max-w-48 text-sm text-zinc-700">
                          {getLocation(order) || "—"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <div className="max-w-56 space-y-1">
                          {(order.items || []).slice(0, 2).map((item) => (
                            <p
                              key={item.lineId || item.variant?.sku}
                              className="truncate text-xs text-zinc-600"
                            >
                              {item.productSnapshot?.productCode
                                ? `${item.productSnapshot.productCode} · `
                                : ""}
                              {item.productSnapshot?.title}
                              {item.selectedSize
                                ? ` · ${item.selectedSize}`
                                : ""}
                              {` × ${item.quantity}`}
                            </p>
                          ))}

                          {(order.items || []).length > 2 ? (
                            <p className="text-xs font-medium text-zinc-400">
                              +{order.items.length - 2} more
                            </p>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-bold text-zinc-950">
                          {money(order.finalPayable)}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${order.paymentMethod === "cod"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-emerald-50 text-emerald-700"
                            }`}
                        >
                          {String(order.paymentMethod || "").toUpperCase()}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-xs text-zinc-600">
                        {formatDate(
                          order.fulfillmentDates?.packedAt,
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {shipmentAwb ? (
                          <div className="min-w-44">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <StatusBadge provider={provider} />

                              {courierName ? (
                                <span className="text-xs font-semibold text-zinc-700">
                                  {courierName}
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-2">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                                AWB
                              </p>

                              <p
                                className="mt-0.5 max-w-44 truncate font-mono text-xs font-semibold text-zinc-800"
                                title={shipmentAwb}
                              >
                                {shipmentAwb}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <StatusBadge provider={provider} />

                            {provider !== PROVIDERS.UNASSIGNED ? (
                              <p className="mt-1.5 text-xs text-zinc-400">
                                AWB not assigned
                              </p>
                            ) : null}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {ratesChecking ? (
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Checking courier availability...
                          </div>
                        ) : (
                          <div className="min-w-72 space-y-3">
                            <div>
                              <div className="mb-1.5 flex items-center justify-between gap-3">
                                <p className="text-xs font-bold text-blue-700">Shiprocket</p>
                                {shiprocketAvailable && selectedCourier ? (
                                  <span className="text-xs font-bold text-blue-700">
                                    {money(
                                      Number(selectedCourier.rate || 0) +
                                      Number(selectedCourier.codCharges || 0),
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-xs font-semibold text-red-600">
                                    Unavailable
                                  </span>
                                )}
                              </div>

                              {shiprocketAvailable ? (
                                <>
                                  <div className="relative">
                                    <select
                                      value={
                                        selectedCourierId ||
                                        shiprocketOptions[0]?.id ||
                                        ""
                                      }
                                      onChange={(event) =>
                                        setSelectedShiprocketCourier((current) => ({
                                          ...current,
                                          [orderId]: event.target.value,
                                        }))
                                      }
                                      className="h-8 w-full appearance-none rounded-lg border border-zinc-200 bg-white pl-2.5 pr-8 text-xs font-semibold text-zinc-700 outline-none focus:border-blue-400"
                                    >
                                      {shiprocketOptions.map((option) => (
                                        <option key={option.id} value={option.id}>
                                          {option.name} · {money(
                                            Number(option.rate || 0) +
                                            Number(option.codCharges || 0),
                                          )}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                                  </div>
                                  <p className="mt-1 text-xs text-zinc-500">
                                    {selectedCourier?.estimatedDays
                                      ? `${selectedCourier.estimatedDays} days`
                                      : "ETA unavailable"}
                                  </p>
                                </>
                              ) : (
                                <p className="text-xs text-zinc-500">
                                  {orderRates.shiprocketError ||
                                    "No Shiprocket courier available."}
                                </p>
                              )}
                            </div>

                            <div className="border-t border-zinc-100 pt-2.5">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs font-bold text-emerald-700">
                                    Delhivery Direct
                                  </p>
                                  <p className="mt-1 text-xs text-zinc-500">
                                    {delhiveryAvailable
                                      ? delhiveryOption?.estimatedDays
                                        ? `${delhiveryOption.estimatedDays} days`
                                        : "Serviceable"
                                      : delhiveryOption?.unavailableReason ||
                                      orderRates.delhiveryError ||
                                      "Not serviceable"}
                                  </p>
                                </div>

                                <span
                                  className={`text-xs font-bold ${delhiveryAvailable
                                      ? "text-emerald-700"
                                      : "text-red-600"
                                    }`}
                                >
                                  {delhiveryAvailable
                                    ? money(
                                      Number(delhiveryOption.rate || 0) +
                                      Number(delhiveryOption.codCharges || 0),
                                    )
                                    : "Unavailable"}
                                </span>
                              </div>
                            </div>

                            {!shiprocketAvailable && !delhiveryAvailable ? (
                              <button
                                type="button"
                                onClick={() => checkRatesForOrder(order)}
                                className="text-xs font-semibold text-zinc-700 hover:underline"
                              >
                                Retry availability check
                              </button>
                            ) : null}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="grid min-w-48 grid-cols-2 gap-2">
                          {/* Shiprocket */}
                          <button
                            type="button"
                            onClick={() =>
                              bookOrder(order, PROVIDERS.SHIPROCKET)
                            }
                            disabled={
                              ratesChecking ||
                              !shiprocketAvailable ||
                              shiprocketBooking ||
                              delhiveryBooking ||
                              Boolean(bulkBookingProvider)
                            }
                            className="col-span-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500"
                          >
                            {shiprocketBooking ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <PackageCheck className="h-3.5 w-3.5" />
                            )}

                            {shiprocketAvailable
                              ? "Shiprocket"
                              : "Unavailable"}
                          </button>

                          {/* Delhivery */}
                          <button
                            type="button"
                            onClick={() =>
                              bookOrder(order, PROVIDERS.DELHIVERY)
                            }
                            disabled={
                              ratesChecking ||
                              !delhiveryAvailable ||
                              shiprocketBooking ||
                              delhiveryBooking ||
                              Boolean(bulkBookingProvider)
                            }
                            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition disabled:cursor-not-allowed ${delhiveryAvailable
                                ? "bg-zinc-950 text-white hover:bg-zinc-800"
                                : "bg-zinc-200 text-zinc-500"
                              }`}
                          >
                            {delhiveryBooking ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Truck className="h-3.5 w-3.5" />
                            )}

                            {delhiveryAvailable
                              ? "Delhivery"
                              : "Unavailable"}
                          </button>

                          {/* Label */}
                          <button
                            type="button"
                            onClick={downloadBulkDelhiveryLabels}
                            disabled={
                              !selectedDelhiveryLabelCount ||
                              bulkLabelLoading
                            }
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {bulkLabelLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}

                            Download Labels
                            {selectedDelhiveryLabelCount > 0
                              ? ` (${selectedDelhiveryLabelCount})`
                              : ""}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              syncTrackingForOrder(order)
                            }
                            disabled={
                              !delhiveryAwb ||
                              syncingTracking
                            }
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-300"
                          >
                            {syncingTracking ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Radar className="h-3.5 w-3.5" />
                            )}

                            Track
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <footer className="flex flex-col gap-2 border-t border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {visibleOrders.length} of {orders.length} loaded packed orders
            </span>

            <span>
              {selectedIds.length} order
              {selectedIds.length === 1 ? "" : "s"} selected
            </span>
          </footer>
        </section>
      </div>

      {pickupOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-zinc-950">
                  Schedule Delhivery Pickup
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Warehouse-level pickup request
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPickupOpen(false)
                }
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                  Pickup Date
                </label>

                <input
                  type="date"
                  value={
                    pickupForm.pickupDate
                  }
                  onChange={(e) =>
                    setPickupForm(
                      (current) => ({
                        ...current,
                        pickupDate:
                          e.target.value,
                      }),
                    )
                  }
                  className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                  Pickup Time
                </label>

                <input
                  type="time"
                  value={
                    pickupForm.pickupTime
                  }
                  onChange={(e) =>
                    setPickupForm(
                      (current) => ({
                        ...current,
                        pickupTime:
                          e.target.value,
                      }),
                    )
                  }
                  className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-700">
                  Package Count
                </label>

                <input
                  type="number"
                  min="1"
                  value={
                    pickupForm.packageCount
                  }
                  onChange={(e) =>
                    setPickupForm(
                      (current) => ({
                        ...current,
                        packageCount:
                          e.target.value,
                      }),
                    )
                  }
                  className="h-10 w-full rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-400"
                />
              </div>

              <button
                type="button"
                onClick={
                  scheduleDelhiveryPickup
                }
                disabled={pickupLoading}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-50"
              >
                {pickupLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarClock className="h-4 w-4" />
                )}

                Schedule Pickup
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </main>
  );
}
