export default function ProductionMetricCard({
  title,
  value,
  loading,
  active,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl bg-white p-3 text-left shadow-sm transition hover:shadow ${
        active ? "ring-2 ring-black/80" : "ring-1 ring-black/5"
      }`}
    >
      <div className="text-[11px] text-gray-500">{title}</div>
      <div className="mt-1 text-lg font-semibold text-gray-900">
        {loading ? "—" : Number(value || 0)}
      </div>
    </button>
  );
}