"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Download,
  FileClock,
  IndianRupee,
  Package,
  Tags,
} from "lucide-react";
import * as XLSX from "xlsx";

import FabricThresholdSetter from "@/components/fabric/FabricThresholdSetter";
import useFabricLogStore from "@/store/fabricLogStore";
import useFabricPriceLogStore from "@/store/fabricPriceLogStore";
import useFabricStore from "@/store/fabricStore";

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const money = (value) =>
  `₹${Number(value || 0).toFixed(2)}`;

export default function FabricDetailPage() {
  const { id } = useParams();

  const {
    selectedFabric,
    loading,
    fetchFabricById,
    clearSelectedFabric,
  } = useFabricStore();

  const { fabricLogs, fetchFabricLogsByCode } =
    useFabricLogStore();

  const {
    latestPrice,
    priceHistory,
    fetchLatestPriceByFabric,
    fetchPriceHistory,
  } = useFabricPriceLogStore();

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      const res = await fetchFabricById(id);
      const fabric = res?.data;

      if (fabric?.code) {
        await fetchFabricLogsByCode(fabric.code, {
          page: 1,
          limit: 10,
        });
      }

      await Promise.all([
        fetchLatestPriceByFabric(id),
        fetchPriceHistory(id, {
          page: 1,
          limit: 10,
        }),
      ]);
    };

    loadData();

    return () => clearSelectedFabric();
  }, [id]);

  const handleExportDetail = () => {
    if (!selectedFabric) return;

    const workbook = XLSX.utils.book_new();

    const detailRows = [
      {
        Code: selectedFabric.code,
        Name: selectedFabric.name,
        Category: selectedFabric.category,
        Unit: selectedFabric.unit,
        Stock: selectedFabric.currentStock,
        "Low Stock Threshold":
          selectedFabric.lowStockThreshold ?? 20,
        "Is Low Stock": selectedFabric.isLowStock
          ? "Yes"
          : "No",
        Status: selectedFabric.status,
        Movement: selectedFabric.movementStatus,
        GSM: selectedFabric.gsm || "",
        Width: selectedFabric.width || "",
        Notes: selectedFabric.notes || "",
        "Latest Price": latestPrice?.newPrice || "",
        "Product Codes":
          selectedFabric.associatedProductCodes?.join(", ") ||
          "",
        "Created At": formatDate(
          selectedFabric.createdAt
        ),
      },
    ];

    const stockRows = fabricLogs.map((item) => ({
      Date: formatDate(item.logDate),
      Action: item.action,
      Type: item.type,
      Quantity: item.quantity,
      Previous: item.previousStock,
      New: item.newStock,
      Note: item.note || item.description || "",
      By: item.createdBy,
    }));

    const priceRows = priceHistory.map((item) => ({
      Date: formatDate(item.effectiveFrom),
      OldPrice: item.oldPrice,
      NewPrice: item.newPrice,
      ChangeAmount: item.changeAmount,
      ChangePercent: item.changePercent,
      Reason: item.reason,
      Note: item.note,
      By: item.createdBy,
    }));

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(detailRows),
      "Fabric Detail"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(stockRows),
      "Stock Logs"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(priceRows),
      "Price Logs"
    );

    XLSX.writeFile(
      workbook,
      `${selectedFabric.code}-fabric-detail.xlsx`
    );
  };

  if (loading && !selectedFabric) {
    return (
      <PageMessage message="Loading fabric..." />
    );
  }

  if (!selectedFabric) {
    return (
      <div className="min-h-screen bg-neutral-50 p-6">
        <Link
          href="/fabrics"
          className="inline-flex items-center gap-2 text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Back to fabrics
        </Link>

        <p className="mt-4 text-sm text-neutral-500">
          Fabric not found.
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 p-4 text-neutral-950 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <PageHeader
          fabric={selectedFabric}
          onExport={handleExportDetail}
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            icon={Package}
            title="Current Stock"
            value={`${selectedFabric.currentStock || 0} ${
              selectedFabric.unit
            }`}
          />

          <Stat
            icon={IndianRupee}
            title="Latest Price"
            value={
              latestPrice
                ? money(latestPrice.newPrice)
                : "-"
            }
          />

          <Stat
            icon={Tags}
            title="Products"
            value={
              selectedFabric.associatedProductsCount || 0
            }
          />

          <Stat
            icon={FileClock}
            title="Movement"
            value={selectedFabric.movementStatus || "-"}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
          <FabricDetailsCard fabric={selectedFabric} />

          <div className="space-y-5">
            <FabricThresholdSetter
              fabric={selectedFabric}
            />

            <ProductCodesCard
              codes={
                selectedFabric.associatedProductCodes || []
              }
            />

            <TableCard title="Recent Stock Logs">
              <StockLogsTable logs={fabricLogs} />
            </TableCard>

            <TableCard title="Recent Price Logs">
              <PriceLogsTable rows={priceHistory} />
            </TableCard>
          </div>
        </div>
      </div>
    </main>
  );
}

function PageHeader({ fabric, onExport }) {
  return (
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
      <div>
        <Link
          href="/fabrics"
          className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-950"
        >
          <ArrowLeft size={16} />
          Back to fabrics
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {fabric.name}
        </h1>

        <p className="mt-1 text-sm text-neutral-500">
          {fabric.code} · {fabric.category}
        </p>
      </div>

      <button
        type="button"
        onClick={onExport}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-100"
      >
        <Download size={16} />
        Export Detail
      </button>
    </div>
  );
}

function FabricDetailsCard({ fabric }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold">
        Fabric Details
      </h2>

      <div className="mt-4 space-y-3 text-sm">
        <Info label="Code" value={fabric.code} />
        <Info label="Name" value={fabric.name} />
        <Info
          label="Category"
          value={fabric.category}
        />
        <Info label="Unit" value={fabric.unit} />
        <Info label="GSM" value={fabric.gsm || "-"} />
        <Info
          label="Width"
          value={fabric.width || "-"}
        />
        <Info
          label="Status"
          value={fabric.status || "-"}
        />
        <Info
          label="Last Stock Update"
          value={formatDate(
            fabric.lastStockUpdatedAt
          )}
        />
        <Info
          label="Created"
          value={formatDate(fabric.createdAt)}
        />
      </div>

      {fabric.imageLink ? (
        <div className="mt-5 overflow-hidden rounded-2xl bg-neutral-100">
          <img
            src={fabric.imageLink}
            alt={fabric.name}
            className="h-56 w-full object-cover"
          />
        </div>
      ) : null}

      {fabric.notes ? (
        <div className="mt-5 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">
          {fabric.notes}
        </div>
      ) : null}
    </section>
  );
}

function ProductCodesCard({ codes }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold">
        Associated Product Codes
      </h2>

      <div className="mt-4 flex flex-wrap gap-2">
        {codes.length ? (
          codes.map((code) => (
            <span
              key={code}
              className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium"
            >
              {code}
            </span>
          ))
        ) : (
          <p className="text-sm text-neutral-500">
            No product codes mapped.
          </p>
        )}
      </div>
    </section>
  );
}

function StockLogsTable({ logs }) {
  return (
    <table className="w-full min-w-[760px] text-left text-sm">
      <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
        <tr>
          <th className="px-4 py-3">Date</th>
          <th className="px-4 py-3">Type</th>
          <th className="px-4 py-3">Qty</th>
          <th className="px-4 py-3">Previous</th>
          <th className="px-4 py-3">New</th>
          <th className="px-4 py-3">Note</th>
        </tr>
      </thead>

      <tbody className="divide-y divide-neutral-100">
        {logs.length ? (
          logs.map((log) => (
            <tr key={log._id}>
              <td className="px-4 py-3 text-neutral-500">
                {formatDate(log.logDate)}
              </td>
              <td className="px-4 py-3">
                {log.type || "-"}
              </td>
              <td className="px-4 py-3">
                {log.quantity ?? 0}
              </td>
              <td className="px-4 py-3">
                {log.previousStock ?? 0}
              </td>
              <td className="px-4 py-3 font-semibold">
                {log.newStock ?? 0}
              </td>
              <td className="px-4 py-3 text-neutral-500">
                {log.note ||
                  log.description ||
                  "-"}
              </td>
            </tr>
          ))
        ) : (
          <EmptyRow
            colSpan={6}
            message="No stock logs found."
          />
        )}
      </tbody>
    </table>
  );
}

function PriceLogsTable({ rows }) {
  return (
    <table className="w-full min-w-[760px] text-left text-sm">
      <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
        <tr>
          <th className="px-4 py-3">Date</th>
          <th className="px-4 py-3">Old</th>
          <th className="px-4 py-3">New</th>
          <th className="px-4 py-3">Change</th>
          <th className="px-4 py-3">Reason</th>
        </tr>
      </thead>

      <tbody className="divide-y divide-neutral-100">
        {rows.length ? (
          rows.map((item) => (
            <tr key={item._id}>
              <td className="px-4 py-3 text-neutral-500">
                {formatDate(item.effectiveFrom)}
              </td>
              <td className="px-4 py-3">
                {money(item.oldPrice)}
              </td>
              <td className="px-4 py-3 font-semibold">
                {money(item.newPrice)}
              </td>
              <td className="px-4 py-3">
                {money(item.changeAmount)} (
                {Number(
                  item.changePercent || 0
                ).toFixed(2)}
                %)
              </td>
              <td className="px-4 py-3 text-neutral-500">
                {item.reason || item.note || "-"}
              </td>
            </tr>
          ))
        ) : (
          <EmptyRow
            colSpan={5}
            message="No price logs found."
          />
        )}
      </tbody>
    </table>
  );
}

function Stat({ icon: Icon, title, value }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-neutral-500">
          {title}
        </p>

        <Icon
          size={17}
          className="text-neutral-400"
        />
      </div>

      <p className="mt-3 truncate text-xl font-semibold capitalize">
        {value}
      </p>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-neutral-100 pb-2">
      <span className="text-neutral-500">
        {label}
      </span>

      <span className="text-right font-medium capitalize">
        {value}
      </span>
    </div>
  );
}

function TableCard({ title, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="border-b border-neutral-200 p-4">
        <h2 className="text-sm font-semibold">
          {title}
        </h2>
      </div>

      <div className="overflow-x-auto">
        {children}
      </div>
    </section>
  );
}

function EmptyRow({ colSpan, message }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-8 text-center text-neutral-500"
      >
        {message}
      </td>
    </tr>
  );
}

function PageMessage({ message }) {
  return (
    <div className="min-h-screen bg-neutral-50 p-6 text-sm text-neutral-500">
      {message}
    </div>
  );
}