export default function ProductionHeader({
  onRefresh,
  onExport,
  exporting,
  canExport,
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Production</h1>
        <p className="text-xs text-gray-500">Fast • Paginated • Easy to manage</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={onRefresh}
          className="rounded-xl bg-white px-3 py-2 text-xs text-gray-800 shadow-sm hover:shadow"
        >
          Refresh
        </button>

        <button
          onClick={onExport}
          disabled={exporting || !canExport}
          className="rounded-xl bg-black px-3 py-2 text-xs text-white hover:opacity-90 disabled:opacity-50"
        >
          {exporting ? "Exporting..." : "Export Excel"}
        </button>
      </div>
    </div>
  );
}