export default function ProductionBulkBar({
  checked,
  packableCount,
  selectedCount,
  bulkPacking,
  onToggleAll,
  onClear,
  onBulkMarkPacked,
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-gray-50 p-3 ring-1 ring-black/5 md:flex-row md:items-center">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggleAll(e.target.checked)}
          className="h-4 w-4 accent-black"
        />
        <span className="text-xs text-gray-700">Select all packable from current page</span>
        <span className="text-[11px] text-gray-500">• {packableCount} packable</span>
      </div>

      <div className="flex items-center gap-2 md:ml-auto">
        <div className="text-xs text-gray-600">
          Selected: <span className="font-semibold">{selectedCount}</span>
        </div>

        <button
          onClick={onClear}
          disabled={!selectedCount}
          className="rounded-xl bg-white px-3 py-2 text-xs ring-1 ring-black/10 disabled:opacity-50"
        >
          Clear
        </button>

        <button
          onClick={onBulkMarkPacked}
          disabled={!selectedCount || bulkPacking}
          className="rounded-xl bg-black px-3 py-2 text-xs text-white hover:opacity-90 disabled:opacity-50"
        >
          {bulkPacking ? "Packing..." : "Mark Selected Packed"}
        </button>
      </div>
    </div>
  );
}