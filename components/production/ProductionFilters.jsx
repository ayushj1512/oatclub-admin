import {
  DATE_PRESETS,
  PACKABILITY_TABS,
  STATUS_OPTIONS,
} from "./productionUtils";

export default function ProductionFilters({
  datePreset,
  useCustomRange,
  setUseCustomRange,
  rangeFrom,
  rangeTo,
  setRangeFrom,
  setRangeTo,
  applyPreset,
  applyCustomRange,
  searchInput,
  setSearchInput,
  onSearchSubmit,
  currentPackability,
  onPackabilityChange,
  fulfillmentStatus,
  onStatusChange,
  total,
  loadingQueue,
}) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {DATE_PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => applyPreset(p.key)}
            className={`whitespace-nowrap rounded-full px-3 py-2 text-xs shadow-sm transition ${
              !useCustomRange && datePreset === p.key
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {p.label}
          </button>
        ))}

        <button
          onClick={() => setUseCustomRange((v) => !v)}
          className={`whitespace-nowrap rounded-full px-3 py-2 text-xs shadow-sm transition ${
            useCustomRange
              ? "bg-black text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Custom Range
        </button>
      </div>

      {useCustomRange ? (
        <div className="flex flex-col gap-2 md:flex-row">
          <div className="flex items-center gap-2">
            <span className="w-10 text-xs text-gray-500">From</span>
            <input
              type="date"
              value={rangeFrom}
              onChange={(e) => setRangeFrom(e.target.value)}
              className="rounded-xl bg-gray-50 px-3 py-2 text-xs ring-1 ring-black/5"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="w-10 text-xs text-gray-500">To</span>
            <input
              type="date"
              value={rangeTo}
              onChange={(e) => setRangeTo(e.target.value)}
              className="rounded-xl bg-gray-50 px-3 py-2 text-xs ring-1 ring-black/5"
            />
          </div>

          <button
            onClick={applyCustomRange}
            className="rounded-xl bg-black px-3 py-2 text-xs text-white hover:opacity-90 md:ml-auto"
          >
            Apply
          </button>
        </div>
      ) : null}

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {PACKABILITY_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onPackabilityChange(tab.value)}
            className={`whitespace-nowrap rounded-full px-3 py-2 text-xs shadow-sm transition ${
              currentPackability === tab.value
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Status</span>
          <select
            value={fulfillmentStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="rounded-xl bg-gray-50 px-3 py-2 text-xs ring-1 ring-black/5"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={onSearchSubmit} className="flex flex-1 gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search order, customer, phone, product..."
            className="w-full rounded-xl bg-gray-50 px-3 py-2 text-xs ring-1 ring-black/5"
          />
          <button
            type="submit"
            className="rounded-xl bg-black px-3 py-2 text-xs text-white hover:opacity-90"
          >
            Search
          </button>
        </form>

        <div className="text-right text-xs text-gray-500 md:w-[140px]">
          {loadingQueue ? "Loading..." : `${total} total`}
        </div>
      </div>
    </div>
  );
}