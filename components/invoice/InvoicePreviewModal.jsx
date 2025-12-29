import { useInvoiceStore } from "@/store/invoice.store";
import InvoiceTemplate from "./InvoiceTemplate";
import PackingSlipTemplate from "./PackingSlipTemplate";

export default function InvoicePreviewModal() {
  const { isOpen, type, invoiceData, closeInvoice } = useInvoiceStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center">
      <div className="bg-white w-[900px] max-h-[90vh] overflow-auto p-4">
        <div className="flex justify-between mb-3">
          <h3 className="font-semibold">
            {type === "invoice" ? "Invoice Preview" : "Packing Slip Preview"}
          </h3>
          <button onClick={closeInvoice}>✕</button>
        </div>

        {type === "invoice" ? (
          <InvoiceTemplate data={invoiceData} />
        ) : (
          <PackingSlipTemplate data={invoiceData} />
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-black text-white"
          >
            Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}
