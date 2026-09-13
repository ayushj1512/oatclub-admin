// app/ndr/shiprocket/page.jsx

"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";

import {
  useShiprocketStore,
} from "@/store/ShipRocketStore";

const getValue = (
  item,
  ...keys
) => {
  for (const key of keys) {
    if (
      item?.[key] !== undefined &&
      item?.[key] !== null
    ) {
      return item[key];
    }
  }

  return "";
};

export default function ShiprocketNdrPage() {
  const {
    ndrList,
    ndrLoading,
    ndrError,
    ndrResult,
    fetchNdrList,
    reattemptNdr,
    clearNdrError,
    clearNdrResult,
  } = useShiprocketStore();

  const [search, setSearch] =
    useState("");

  const [form, setForm] =
    useState({
      awb: "",
      address1: "",
      address2: "",
      phone: "",
      deferredDate: "",
    });

  useEffect(() => {
    fetchNdrList().catch(() => { });
  }, [fetchNdrList]);

  const update = (
    key,
    value,
  ) => {
    clearNdrError();
    clearNdrResult();

    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const shipments = useMemo(
    () =>
      Array.isArray(ndrList)
        ? ndrList
        : [],
    [ndrList],
  );

  const filtered = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) return shipments;

    return shipments.filter(
      (item) =>
        [
          getValue(
            item,
            "awb",
            "awb_code",
          ),
          getValue(
            item,
            "order_id",
            "order_number",
          ),
          getValue(
            item,
            "customer_name",
            "customer",
          ),
          getValue(
            item,
            "ndr_reason",
            "reason",
          ),
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(query),
        ),
    );
  }, [search, shipments]);

  const selectShipment = (
    item,
  ) => {
    const awb = String(
      getValue(
        item,
        "awb",
        "awb_code",
      ),
    ).trim();

    setForm({
      awb,
      address1: "",
      address2: "",
      phone: "",
      deferredDate: "",
    });

    clearNdrError();
    clearNdrResult();

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleSubmit = async (
    event,
  ) => {
    event.preventDefault();

    await reattemptNdr(
      form.awb,
      {
        address1:
          form.address1.trim(),
        address2:
          form.address2.trim(),
        phone: form.phone.trim(),
        deferredDate:
          form.deferredDate,
      },
    );

    await fetchNdrList();
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
              OATCLUB NDR
            </p>

            <h1 className="mt-1 text-2xl font-semibold text-zinc-950">
              Shiprocket NDR
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              View open NDR shipments and submit delivery reattempts.
            </p>
          </div>

          <button
            type="button"
            disabled={ndrLoading}
            onClick={() =>
              fetchNdrList().catch(
                () => { },
              )
            }
            className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:border-zinc-400 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={
                ndrLoading
                  ? "animate-spin"
                  : ""
              }
            />
            Refresh
          </button>
        </div>

        <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
          <form
            onSubmit={handleSubmit}
            className="h-fit space-y-4 rounded-2xl border border-zinc-200 bg-white p-5"
          >
            <div>
              <h2 className="font-semibold text-zinc-950">
                Reattempt Delivery
              </h2>

              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Only enter the details that need to be updated.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600">
                Shiprocket AWB
              </label>

              <input
                required
                value={form.awb}
                onChange={(event) =>
                  update(
                    "awb",
                    event.target.value,
                  )
                }
                placeholder="Enter AWB number"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600">
                Address line 1
              </label>

              <input
                value={form.address1}
                onChange={(event) =>
                  update(
                    "address1",
                    event.target.value,
                  )
                }
                placeholder="House, street or area"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600">
                Address line 2
              </label>

              <input
                value={form.address2}
                onChange={(event) =>
                  update(
                    "address2",
                    event.target.value,
                  )
                }
                placeholder="Landmark"
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-500"
              />
            </div>

            <div className="gridners grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">
                  Phone
                </label>

                <input
                  value={form.phone}
                  onChange={(event) =>
                    update(
                      "phone",
                      event.target.value,
                    )
                  }
                  placeholder="10-digit number"
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">
                  Delivery date
                </label>

                <input
                  type="date"
                  min={
                    new Date()
                      .toISOString()
                      .split("T")[0]
                  }
                  value={
                    form.deferredDate
                  }
                  onChange={(event) =>
                    update(
                      "deferredDate",
                      event.target.value,
                    )
                  }
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            {ndrError && (
              <div className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">
                {ndrError}
              </div>
            )}

            {ndrResult && (
              <div className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
                <CheckCircle2
                  size={17}
                  className="mt-0.5 shrink-0"
                />

                <span>
                  Reattempt submitted successfully.
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={
                ndrLoading ||
                !form.awb.trim()
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {ndrLoading ? (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <RotateCcw
                  size={17}
                />
              )}

              {ndrLoading
                ? "Submitting..."
                : "Submit Reattempt"}
            </button>
          </form>

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-zinc-950">
                  Open Shiprocket NDRs
                </h2>

                <p className="mt-0.5 text-xs text-zinc-500">
                  {filtered.length} shipment(s)
                </p>
              </div>

              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Search order, AWB or reason"
                  className="w-full rounded-xl border border-zinc-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-zinc-400 sm:w-72"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">
                      Order
                    </th>
                    <th className="px-4 py-3">
                      AWB
                    </th>
                    <th className="px-4 py-3">
                      Customer
                    </th>
                    <th className="px-4 py-3">
                      NDR reason
                    </th>
                    <th className="px-4 py-3 text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-100">
                  {ndrLoading &&
                    !shipments.length ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-16 text-center text-zinc-500"
                      >
                        <Loader2
                          size={22}
                          className="mx-auto mb-2 animate-spin"
                        />
                        Loading NDR shipments...
                      </td>
                    </tr>
                  ) : filtered.length ? (
                    filtered.map(
                      (
                        item,
                        index,
                      ) => {
                        const awb =
                          getValue(
                            item,
                            "awb",
                            "awb_code",
                          );

                        return (
                          <tr
                            key={
                              awb ||
                              index
                            }
                            className="hover:bg-zinc-50"
                          >
                            <td className="px-4 py-4 font-medium text-zinc-900">
                              {getValue(
                                item,
                                "order_id",
                                "order_number",
                              ) || "—"}
                            </td>

                            <td className="px-4 py-4 text-zinc-600">
                              {awb ||
                                "—"}
                            </td>

                            <td className="px-4 py-4 text-zinc-600">
                              {getValue(
                                item,
                                "customer_name",
                                "customer",
                                "buyer_name",
                              ) || "—"}
                            </td>

                            <td className="max-w-64 px-4 py-4 text-zinc-600">
                              {getValue(
                                item,
                                "ndr_reason",
                                "reason",
                                "activity",
                              ) || "—"}
                            </td>

                            <td className="px-4 py-4 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  selectShipment(
                                    item,
                                  )
                                }
                                className="rounded-lg bg-zinc-950 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800"
                              >
                                Resolve
                              </button>
                            </td>
                          </tr>
                        );
                      },
                    )
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-16 text-center"
                      >
                        <CheckCircle2
                          size={28}
                          className="mx-auto text-emerald-500"
                        />

                        <p className="mt-3 font-medium text-zinc-800">
                          No open NDR shipments
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          Shiprocket NDR shipments will appear here.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
