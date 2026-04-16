const getSmartPages = (page, pages) => {
  const current = Number(page || 1);
  const total = Number(pages || 1);

  if (total <= 9) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const out = new Set([
    1,
    2,
    3,
    current - 1,
    current,
    current + 1,
    total - 2,
    total - 1,
    total,
  ]);

  const nums = Array.from(out)
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);

  const result = [];
  for (let i = 0; i < nums.length; i++) {
    const n = nums[i];
    const prev = nums[i - 1];

    if (i > 0 && n - prev > 1) {
      result.push("...");
    }

    result.push(n);
  }

  return result;
};

export default function ProductionPagination({
  page,
  pages,
  total,
  limit,
  hasMore,
  jumpPage,
  setJumpPage,
  onPrev,
  onNext,
  onJump,
  onLimitChange,
}) {
  const smartPages = getSmartPages(page, pages);

  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="text-xs text-gray-500">
          Page <span className="font-semibold text-gray-900">{page}</span> of{" "}
          <span className="font-semibold text-gray-900">{pages}</span> • {total} orders
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Per page</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(e.target.value)}
            className="rounded-xl bg-gray-50 px-3 py-2 text-xs ring-1 ring-black/5"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={onPrev}
          disabled={page <= 1}
          className="rounded-xl bg-white px-3 py-2 text-xs ring-1 ring-black/10 disabled:opacity-50"
        >
          Prev
        </button>

        {smartPages.map((item, idx) =>
          item === "..." ? (
            <span
              key={`dots-${idx}`}
              className="px-2 text-xs text-gray-400"
            >
              ...
            </span>
          ) : (
            <button
              key={item}
              onClick={() => {
                setJumpPage(String(item));
                onJump?.(item);
              }}
              className={`rounded-xl px-3 py-2 text-xs ring-1 ${
                item === page
                  ? "bg-black text-white ring-black"
                  : "bg-white text-gray-700 ring-black/10"
              }`}
            >
              {item}
            </button>
          )
        )}

        <button
          onClick={onNext}
          disabled={!hasMore}
          className="rounded-xl bg-black px-3 py-2 text-xs text-white disabled:opacity-50"
        >
          Next
        </button>

        <div className="ml-0 flex items-center gap-2 md:ml-auto">
          <input
            value={jumpPage}
            onChange={(e) => setJumpPage(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="Page"
            className="w-20 rounded-xl bg-gray-50 px-3 py-2 text-xs ring-1 ring-black/5"
          />
          <button
            onClick={() => onJump?.()}
            className="rounded-xl bg-white px-3 py-2 text-xs ring-1 ring-black/10"
          >
            Jump
          </button>
        </div>
      </div>
    </div>
  );
}