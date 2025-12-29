"use client";

export default function CollectionMultiSelect({
  value = [],
  collections = [],
  onChange,
}) {
  const toggle = (id) => {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
    } else {
      onChange([...value, id]);
    }
  };

  if (!collections.length) {
    return (
      <p className="text-sm text-gray-500">
        No collections available
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {collections.map((c) => (
        <label
          key={c._id}
          className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50"
        >
          <input
            type="checkbox"
            checked={value.includes(c._id)}
            onChange={() => toggle(c._id)}
            className="accent-black"
          />
          <div>
            <p className="text-sm font-medium">{c.name}</p>
            {c.type && (
              <p className="text-xs text-gray-500 capitalize">
                {c.type} collection
              </p>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}
