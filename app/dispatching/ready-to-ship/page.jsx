"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ReceiptIndianRupee,
  Loader2,
  PackageCheck,
  RefreshCcw,
  Search,
  Truck,
  X,
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

  const checkShiprocketServiceability =
    useShiprocketStore((state) => state.checkServiceability);

  const bookShiprocketShipment =
    useShiprocketStore((state) => state.bookShipment);

  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [rates, setRates] = useState({});
  const [selectedShiprocketCourier, setSelectedShiprocketCourier] = useState({});
  const [checkingRates, setCheckingRates] = useState({});
  const [booking, setBooking] = useState({});
  const [bulkBookingProvider, setBulkBookingProvider] = useState("");
  const [message, setMessage] = useState(null);

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
        provider: providerFilter || undefined,
        page: 1,
        limit: 200,
      });
    } catch (requestError) {
      showMessage(
        "error",
        requestError?.message || "Unable to load packed orders.",
      );
    }
  }, [
    fetchPackedOrdersForShipping,
    providerFilter,
    search,
    showMessage,
  ]);

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

  const selectedShiprocketEligibleCount =
    selectedOrders.filter((order) => {
      const orderId = String(order._id);
      const orderRates = rates[orderId];

      return (
        Array.isArray(orderRates?.shiprocket) &&
        orderRates.shiprocket.length > 0 &&
        Boolean(selectedShiprocketCourier[orderId])
      );
    }).length;

  const selectedDelhiveryEligibleCount =
    selectedOrders.filter((order) => {
      const option =
        rates[String(order._id)]?.delhivery;

      return (
        option?.serviceable === true &&
        option?.pricingAvailable === true &&
        Number(option?.rate || 0) > 0
      );
    }).length;

  const allSelected =
    orders.length > 0 && selectedIds.length === orders.length;

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : orders.map((order) => String(order._id)));
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

      // Assign only after successful booking
      await assignCourierToOrder(orderId, provider);

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
      <div className="mx-auto max-w-[1600px]">
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
              Selected
            </p>
            <p className="mt-2 text-2xl font-bold text-zinc-950">
              {selectedIds.length}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Shiprocket
            </p>
            <p className="mt-2 text-2xl font-bold text-blue-700">
              {
                orders.filter(
                  (order) =>
                    getProvider(order) === PROVIDERS.SHIPROCKET,
                ).length
              }
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Delhivery
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">
              {
                orders.filter(
                  (order) =>
                    getProvider(order) === PROVIDERS.DELHIVERY,
                ).length
              }
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
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
                  value={providerFilter}
                  onChange={(event) =>
                    setProviderFilter(event.target.value)
                  }
                  className="h-10 min-w-44 appearance-none rounded-lg border border-zinc-200 bg-white pl-3 pr-9 text-sm font-medium text-zinc-700 outline-none focus:border-zinc-400"
                >
                  <option value="">All couriers</option>
                  <option value="unassigned">Unassigned</option>
                  <option value="shiprocket">Shiprocket</option>
                  <option value="delhivery">Delhivery</option>
                </select>

                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={checkSelectedRates}
                disabled={!selectedIds.length}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ReceiptIndianRupee className="h-4 w-4" />
                Check Prices
              </button>

              <button
                type="button"
                onClick={() => bulkBook(PROVIDERS.SHIPROCKET)}
                disabled={
                  selectedShiprocketEligibleCount === 0 ||
                  Boolean(bulkBookingProvider)
                }
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {bulkBookingProvider === PROVIDERS.SHIPROCKET ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PackageCheck className="h-4 w-4" />
                )}
                Book with Shiprocket
                {selectedIds.length
                  ? ` (${selectedShiprocketEligibleCount})`
                  : ""}
              </button>

              <button
                type="button"
                onClick={() => bulkBook(PROVIDERS.DELHIVERY)}
                disabled={
                  selectedDelhiveryEligibleCount === 0 ||
                  Boolean(bulkBookingProvider)
                }
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {bulkBookingProvider === PROVIDERS.DELHIVERY ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Truck className="h-4 w-4" />
                )}
                Book with Delhivery
                {selectedIds.length
                  ? ` (${selectedDelhiveryEligibleCount})`
                  : ""}
              </button>
            </div>
          </div>

          {error ? (
            <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-[1450px] w-full border-collapse">
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
                    "Shiprocket Options",
                    "Delhivery Price",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-zinc-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading && !orders.length ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-20 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-zinc-400" />
                      <p className="mt-3 text-sm text-zinc-500">
                        Loading packed orders...
                      </p>
                    </td>
                  </tr>
                ) : null}

                {!loading && !orders.length ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-20 text-center">
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

                {orders.map((order) => {
                  const orderId = String(order._id);
                  const provider = getProvider(order);
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
                        <StatusBadge provider={provider} />
                      </td>

                      {/* Shiprocket options */}
                      <td className="px-4 py-4">
                        {ratesChecking ? (
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Checking...
                          </div>
                        ) : shiprocketAvailable ? (
                          <div className="min-w-60">
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
                                className="h-9 w-full appearance-none rounded-lg border border-zinc-200 bg-white pl-3 pr-8 text-xs font-semibold text-zinc-700 outline-none focus:border-blue-400"
                              >
                                {shiprocketOptions.map((option) => (
                                  <option key={option.id} value={option.id}>
                                    {option.name} ·{" "}
                                    {money(
                                      Number(option.rate || 0) +
                                      Number(option.codCharges || 0),
                                    )}
                                  </option>
                                ))}
                              </select>

                              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                            </div>

                            {selectedCourier ? (
                              <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                                <span className="text-zinc-500">
                                  {selectedCourier.estimatedDays
                                    ? `${selectedCourier.estimatedDays} days`
                                    : "ETA unavailable"}
                                </span>

                                <span className="font-bold text-blue-700">
                                  {money(
                                    Number(selectedCourier.rate || 0) +
                                    Number(selectedCourier.codCharges || 0),
                                  )}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="min-w-44">
                            <p className="text-xs font-semibold text-red-600">
                              No courier available
                            </p>

                            <button
                              type="button"
                              onClick={() => checkRatesForOrder(order)}
                              className="mt-1 text-xs font-semibold text-blue-700 hover:underline"
                            >
                              Retry check
                            </button>
                          </div>
                        )}

                        {orderRates.shiprocketError ? (
                          <p className="mt-1 max-w-52 text-xs text-red-600">
                            {orderRates.shiprocketError}
                          </p>
                        ) : null}
                      </td>

                      {/* Delhivery direct */}
                      <td className="px-4 py-4">
                        {ratesChecking ? (
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Checking...
                          </div>
                        ) : delhiveryAvailable ? (
                          <div className="min-w-40">
                            <p className="text-xs font-semibold text-zinc-700">
                              {delhiveryOption.name}
                            </p>

                            <p className="mt-1 font-bold text-emerald-700">
                              {money(
                                Number(delhiveryOption.rate || 0) +
                                Number(delhiveryOption.codCharges || 0),
                              )}
                            </p>

                            <p className="mt-1 text-xs font-medium text-emerald-600">
                              Serviceable
                            </p>

                            {delhiveryOption.estimatedDays ? (
                              <p className="mt-1 text-xs text-zinc-500">
                                {delhiveryOption.estimatedDays} days
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <div className="min-w-44">
                            <p className="text-xs font-semibold text-red-600">
                              Not serviceable
                            </p>

                            <p className="mt-1 max-w-48 text-xs text-zinc-500">
                              {delhiveryOption?.unavailableReason ||
                                orderRates.delhiveryError ||
                                "Delhivery unavailable for this order."}
                            </p>

                            <button
                              type="button"
                              onClick={() => checkRatesForOrder(order)}
                              className="mt-1 text-xs font-semibold text-emerald-700 hover:underline"
                            >
                              Retry check
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex min-w-40 flex-col gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              bookOrder(
                                order,
                                PROVIDERS.SHIPROCKET,
                              )
                            }
                            disabled={
                              ratesChecking ||
                              !shiprocketAvailable ||
                              shiprocketBooking ||
                              delhiveryBooking ||
                              Boolean(bulkBookingProvider)
                            }
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {shiprocketBooking ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <PackageCheck className="h-3.5 w-3.5" />
                            )}
                            Shiprocket
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              bookOrder(
                                order,
                                PROVIDERS.DELHIVERY,
                              )
                            }
                            disabled={
                              ratesChecking ||
                              !delhiveryAvailable ||
                              shiprocketBooking ||
                              delhiveryBooking ||
                              Boolean(bulkBookingProvider)
                            }
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-zinc-950 px-3 text-xs font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {delhiveryBooking ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Truck className="h-3.5 w-3.5" />
                            )}
                            {!ratesChecking && !delhiveryAvailable
                              ? "Unavailable"
                              : "Delhivery"}
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
              Showing {orders.length} of{" "}
              {shippingOrdersMeta?.totalCount ?? orders.length} packed orders
            </span>

            <span>
              {selectedIds.length} order
              {selectedIds.length === 1 ? "" : "s"} selected
            </span>
          </footer>
        </section>
      </div>
    </main>
  );
}
