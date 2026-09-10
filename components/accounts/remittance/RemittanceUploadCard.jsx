"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export default function RemittanceUploadCard({
  sources = [],
  sourcesLoading,
  importResult,
  loading,
  busy,
  error,
  onLoadSources,
  onUpload,
  onManual,
  onClearResult,
}) {
  const inputRef = useRef(null);

  const [source, setSource] =
    useState("delhivery");

  const [file, setFile] =
    useState(null);

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    onLoadSources?.();
  }, [onLoadSources]);

  /*
   * Razorpay has a separate page.
   */
  const visibleSources = useMemo(
    () =>
      sources.filter(
        (item) =>
          item.value !== "razorpay"
      ),
    [sources]
  );

  const selectedSource =
    visibleSources.find(
      (item) =>
        item.value === source
    );

  const accept = useMemo(() => {
    const formats =
      selectedSource?.acceptedFormats;

    return Array.isArray(formats)
      ? formats.join(",")
      : "";
  }, [selectedSource]);

  const resetFile = () => {
    setFile(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleSourceChange = (
    event
  ) => {
    const value =
      event.target.value;

    setSource(value);
    setMessage("");
    resetFile();
    onClearResult?.();

    if (value === "manual") {
      onManual?.();
    }
  };

  const handleSubmit = async () => {
    if (
      source === "manual"
    ) {
      onManual?.();
      return;
    }

    if (!file) {
      setMessage(
        "Please select a report file."
      );
      return;
    }

    try {
      setMessage("");

      await onUpload(
        source,
        file
      );

      setMessage(
        "Report processed successfully."
      );

      resetFile();
    } catch (uploadError) {
      setMessage(
        uploadError?.response?.data
          ?.message ||
        uploadError?.message ||
        "Upload failed."
      );
    }
  };

  const stats =
    importResult?.stats;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">
          Add Remittance
        </h2>

        <p className="mt-1 text-xs leading-5 text-zinc-500">
          Select manual entry or upload the original courier report.
        </p>
      </div>

      <div className="mt-4">
        <label className="mb-1.5 block text-xs font-medium text-zinc-700">
          Remittance source
        </label>

        <select
          value={source}
          onChange={
            handleSourceChange
          }
          disabled={
            loading ||
            busy ||
            sourcesLoading
          }
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400 disabled:opacity-50"
        >
          {visibleSources.map(
            (item) => (
              <option
                key={item.value}
                value={item.value}
                disabled={
                  item.enabled ===
                  false
                }
              >
                {item.label}
              </option>
            )
          )}
        </select>
      </div>

      {source === "manual" ? (
        <button
          type="button"
          onClick={onManual}
          disabled={
            loading || busy
          }
          className="mt-4 w-full rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Open Manual Entry
        </button>
      ) : (
        <>
          <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4">
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              disabled={
                loading || busy
              }
              onChange={(event) => {
                setFile(
                  event.target
                    .files?.[0] ||
                  null
                );

                setMessage("");
                onClearResult?.();
              }}
              className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded-xl file:border-0 file:bg-black file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
            />

            {file ? (
              <p className="mt-3 break-all text-xs text-zinc-500">
                Selected:{" "}
                {file.name}
              </p>
            ) : null}

            <p className="mt-2 text-xs text-zinc-500">
              Accepted:{" "}
              {accept || "Report file"}
            </p>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              loading ||
              busy ||
              !file
            }
            className="mt-3 w-full rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading
              ? "Processing Report..."
              : `Upload ${selectedSource?.label ||
              "Report"
              }`}
          </button>
        </>
      )}

      {message ? (
        <p className="mt-3 text-xs text-zinc-600">
          {message}
        </p>
      ) : null}

      {error && !message ? (
        <p className="mt-3 text-xs text-red-600">
          {error}
        </p>
      ) : null}

      {stats ? (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-xs font-semibold text-zinc-900">
            Import Result
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <ResultItem
              label="Processed"
              value={
                stats.processedRows ||
                0
              }
            />

            <ResultItem
              label="Remitted"
              value={
                stats.fullyRemitted ||
                0
              }
            />

            <ResultItem
              label="Review"
              value={
                stats.needsReview ||
                0
              }
            />

            <ResultItem
              label="Duplicates"
              value={
                stats.duplicates ||
                0
              }
            />

            <ResultItem
              label="Unmapped"
              value={
                stats.unmapped || 0
              }
            />

            <ResultItem
              label="Failed"
              value={
                stats.failedRows ||
                0
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ResultItem({
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-2.5">
      <p className="text-zinc-500">
        {label}
      </p>

      <p className="mt-1 font-semibold text-zinc-900">
        {value}
      </p>
    </div>
  );
}
