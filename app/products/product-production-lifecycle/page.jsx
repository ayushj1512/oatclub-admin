"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  HelpCircle,
  KeyRound,
  Loader2,
  PackageSearch,
  RefreshCcw,
  Search,
  Workflow,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";

import {
  PRODUCT_LIFECYCLE_STAGES,
  useAdminProductStore,
} from "@/store/adminProductStore";

const APPROVAL_PASSCODE = "0001";

const STAGE_LABELS = {
  pattern_in_making: "Pattern Making",
  sampling: "Sampling",
  sample_approval: "Approval",
  pattern_grading: "Grading",
  cutting: "Cutting",
  stitching: "Stitching",
  finishing: "Finishing",
  completed: "Completed",
};

const GUIDE_STAGES = [
  ["Pattern Making", "Initial product pattern is prepared."],
  ["Sampling", "The first physical sample is created."],
  ["Approval", "The sample is reviewed and approved with passcode."],
  ["Grading", "The approved pattern is graded across sizes."],
  ["Cutting", "Fabric is cut using the graded pattern."],
  ["Stitching", "Cut pieces are stitched into the garment."],
  ["Finishing", "Final ironing, thread cutting and QC are completed."],
  ["Completed", "The first-style production lifecycle is finished."],
];

const formatDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStageEntry = (lifecycle, stage) =>
  lifecycle?.stages?.find((item) => item?.stage === stage);

const getNextStage = (stage) => {
  const index = PRODUCT_LIFECYCLE_STAGES.indexOf(stage);

  return index >= 0
    ? PRODUCT_LIFECYCLE_STAGES[index + 1] || null
    : null;
};

const getProgress = (stage) => {
  const index = PRODUCT_LIFECYCLE_STAGES.indexOf(stage);

  if (index < 0) return 0;

  return Math.round(
    ((index + 1) / PRODUCT_LIFECYCLE_STAGES.length) * 100,
  );
};

export default function ProductProductionLifecyclePage() {
  const {
    products,
    page,
    pages,
    total,
    error,

    lifecycleLoading,
    lifecycleActionLoading,
    lifecycleActionProductId,
    lifecycleActionType,

    fetchLifecycleProducts,
    advanceLifecycle,
    completeLifecycle,
  } = useAdminProductStore();

  const [filters, setFilters] = useState({
    search: "",
    stage: "all",
  });

  const [notes, setNotes] = useState({});

  const [approvalModal, setApprovalModal] = useState({
    open: false,
    product: null,
  });

  const [completeModal, setCompleteModal] = useState({
    open: false,
    product: null,
  });

  const [guideOpen, setGuideOpen] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState("");

  const pagination = {
    page: Number(page || 1),
    pages: Number(pages || 1),
    total: Number(total || 0),
    hasNextPage: Number(page || 1) < Number(pages || 1),
    hasPrevPage: Number(page || 1) > 1,
  };

  const loadProducts = async (options = {}) => {
    await fetchLifecycleProducts({
      page: options.page ?? pagination.page,
      limit: 20,
      search: options.search ?? filters.search,
      stage: options.stage ?? filters.stage,
    });
  };

  useEffect(() => {
    loadProducts({
      page: 1,
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts({
        page: 1,
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [filters.search, filters.stage]);

  const completedCount = useMemo(
    () =>
      products.filter(
        (product) =>
          product?.manufacturingLifecycle?.currentStage === "completed",
      ).length,
    [products],
  );

  const handleAdvance = async (product) => {
    const stage =
      product?.manufacturingLifecycle?.currentStage ||
      "pattern_in_making";

    if (stage === "sample_approval") {
      setPasscode("");
      setPasscodeError("");

      setApprovalModal({
        open: true,
        product,
      });

      return;
    }

    await submitAdvance(product);
  };

  const submitAdvance = async (product, approvalPasscode = "") => {
    if (!product?._id) return false;

    const result = await advanceLifecycle(product._id, {
      note: notes[product._id] || "",
      ...(approvalPasscode
        ? {
            passcode: approvalPasscode,
          }
        : {}),
    });

    if (!result?.success) {
      toast.error(result?.message || "Failed to update lifecycle");
      return false;
    }

    setNotes((state) => ({
      ...state,
      [product._id]: "",
    }));

    return true;
  };

  const confirmApproval = async () => {
    if (passcode !== APPROVAL_PASSCODE) {
      setPasscodeError("Incorrect approval passcode");
      return;
    }

    const success = await submitAdvance(
      approvalModal.product,
      passcode,
    );

    if (!success) return;

    setApprovalModal({
      open: false,
      product: null,
    });

    setPasscode("");
    setPasscodeError("");
  };

  const confirmComplete = async () => {
    const product = completeModal.product;

    if (!product?._id) return;

    const result = await completeLifecycle(product._id, {
      note:
        notes[product._id] ||
        "Remaining lifecycle stages were not applicable",
    });

    if (!result?.success) {
      toast.error(result?.message || "Failed to complete lifecycle");
      return;
    }

    setNotes((state) => ({
      ...state,
      [product._id]: "",
    }));

    setCompleteModal({
      open: false,
      product: null,
    });
  };

  return (
    <main className="min-h-screen bg-[#f4f4f5] px-4 py-4 text-zinc-950 sm:px-6 sm:py-5">
      <div className="space-y-4">
        <header className="rounded-3xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white">
                <Workflow className="h-4 w-4" />
              </div>

              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  Product Production Lifecycle
                </h1>

                <p className="mt-0.5 text-sm text-zinc-500">
                  Track first-style production from pattern to finishing.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200"
              >
                <HelpCircle className="h-4 w-4" />
                How It Works
              </button>

              <button
                type="button"
                disabled={lifecycleLoading}
                onClick={() => loadProducts()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50"
              >
                <RefreshCcw
                  className={`h-4 w-4 ${
                    lifecycleLoading ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <Stat label="Total Products" value={pagination.total} />

            <Stat
              label="Active"
              value={Math.max(pagination.total - completedCount, 0)}
            />

            <Stat label="Completed" value={completedCount} />
          </div>
        </header>

        <section className="grid gap-2 rounded-2xl bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] md:grid-cols-[1fr_210px_auto]">
          <label className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

            <input
              value={filters.search}
              onChange={(event) =>
                setFilters((state) => ({
                  ...state,
                  search: event.target.value,
                }))
              }
              placeholder="Search product name or code"
              className="h-10 w-full rounded-xl bg-zinc-100 pl-10 pr-3 text-sm outline-none transition placeholder:text-zinc-400 focus:bg-zinc-50 focus:ring-2 focus:ring-zinc-200"
            />
          </label>

          <select
            value={filters.stage}
            onChange={(event) =>
              setFilters((state) => ({
                ...state,
                stage: event.target.value,
              }))
            }
            className="h-10 rounded-xl bg-zinc-100 px-3 text-sm outline-none transition focus:bg-zinc-50 focus:ring-2 focus:ring-zinc-200"
          >
            <option value="all">All stages</option>

            {PRODUCT_LIFECYCLE_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {STAGE_LABELS[stage]}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              const nextFilters = {
                search: "",
                stage: "all",
              };

              setFilters(nextFilters);

              loadProducts({
                page: 1,
                ...nextFilters,
              });
            }}
            className="h-10 rounded-xl bg-zinc-100 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200"
          >
            Clear
          </button>
        </section>

        {error && (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {lifecycleLoading ? (
          <div className="flex min-h-72 items-center justify-center rounded-3xl bg-white">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-3xl bg-white text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100">
              <PackageSearch className="h-5 w-5 text-zinc-500" />
            </div>

            <p className="mt-3 text-sm font-semibold">
              No products found
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Try changing the current filters.
            </p>
          </div>
        ) : (
          <section className="space-y-3">
            {products.map((product) => (
              <LifecycleCard
                key={product._id}
                product={product}
                note={notes[product._id] || ""}
                onNoteChange={(value) =>
                  setNotes((state) => ({
                    ...state,
                    [product._id]: value,
                  }))
                }
                onAdvance={() => handleAdvance(product)}
                onComplete={() =>
                  setCompleteModal({
                    open: true,
                    product,
                  })
                }
                advancing={
                  lifecycleActionLoading &&
                  lifecycleActionType === "advance" &&
                  String(lifecycleActionProductId) === String(product._id)
                }
                completing={
                  lifecycleActionLoading &&
                  lifecycleActionType === "complete" &&
                  String(lifecycleActionProductId) === String(product._id)
                }
              />
            ))}
          </section>
        )}

        {pagination.pages > 1 && (
          <footer className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
            <p className="text-xs text-zinc-500">
              Page {pagination.page} of {pagination.pages}
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={!pagination.hasPrevPage || lifecycleLoading}
                onClick={() =>
                  loadProducts({
                    page: pagination.page - 1,
                  })
                }
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-zinc-100 px-3 text-xs font-medium text-zinc-700 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>

              <button
                type="button"
                disabled={!pagination.hasNextPage || lifecycleLoading}
                onClick={() =>
                  loadProducts({
                    page: pagination.page + 1,
                  })
                }
                className="inline-flex h-8 items-center gap-1 rounded-lg bg-zinc-100 px-3 text-xs font-medium text-zinc-700 disabled:opacity-40"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </footer>
        )}
      </div>

      {approvalModal.open && (
        <Modal
          title="Sample Approval"
          description="Enter approval passcode to continue."
          icon={KeyRound}
          onClose={() =>
            setApprovalModal({
              open: false,
              product: null,
            })
          }
        >
          <input
            autoFocus
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={passcode}
            onChange={(event) => {
              setPasscode(event.target.value.replace(/\D/g, ""));
              setPasscodeError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                confirmApproval();
              }
            }}
            placeholder="••••"
            className="h-11 w-full rounded-xl bg-zinc-100 px-4 text-center text-base tracking-[0.5em] outline-none focus:ring-2 focus:ring-zinc-200"
          />

          {passcodeError && (
            <p className="mt-2 text-center text-xs text-red-600">
              {passcodeError}
            </p>
          )}

          <button
            type="button"
            disabled={
              passcode.length !== 4 ||
              lifecycleActionLoading
            }
            onClick={confirmApproval}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 text-sm font-medium text-white disabled:opacity-50"
          >
            {lifecycleActionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}

            Approve Sample
          </button>
        </Modal>
      )}

      {completeModal.open && (
        <Modal
          title="Complete Lifecycle"
          description="All remaining stages will be marked completed."
          icon={Check}
          onClose={() =>
            setCompleteModal({
              open: false,
              product: null,
            })
          }
        >
          <div className="rounded-xl bg-zinc-100 p-3">
            <p className="text-sm font-medium">
              {completeModal.product?.title}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Use this only when remaining stages were not applicable.
            </p>
          </div>

          <button
            type="button"
            disabled={lifecycleActionLoading}
            onClick={confirmComplete}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 text-sm font-medium text-white disabled:opacity-50"
          >
            {lifecycleActionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}

            Mark All Fulfilled
          </button>
        </Modal>
      )}

      {guideOpen && (
        <Modal
          title="Product Lifecycle Guide"
          description="Follow each stage in sequence."
          icon={Workflow}
          onClose={() => setGuideOpen(false)}
          wide
        >
          <div className="rounded-xl bg-zinc-100 p-3 text-xs leading-5 text-zinc-600">
            Use <strong>Move to Next Stage</strong> for the normal
            process. Use <strong>Mark All Fulfilled</strong> only when
            some stages are not applicable.
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {GUIDE_STAGES.map(([title, description], index) => (
              <div
                key={title}
                className="flex items-start gap-3 rounded-xl bg-zinc-50 p-3"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-[10px] font-medium text-white">
                  {index + 1}
                </div>

                <div>
                  <p className="text-sm font-medium">
                    {title}
                  </p>

                  <p className="mt-0.5 text-xs leading-5 text-zinc-500">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </main>
  );
}

function LifecycleCard({
  product,
  note,
  onNoteChange,
  onAdvance,
  onComplete,
  advancing,
  completing,
}) {
  const lifecycle = product?.manufacturingLifecycle || {};

  const currentStage =
    lifecycle.currentStage || "pattern_in_making";

  const currentIndex =
    PRODUCT_LIFECYCLE_STAGES.indexOf(currentStage);

  const nextStage = getNextStage(currentStage);
  const progress = getProgress(currentStage);
  const isCompleted = currentStage === "completed";

  const image =
    product?.thumbnail ||
    product?.images?.[0] ||
    "";

  return (
    <article className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-start gap-3">
        <div className="h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
          {image ? (
            <img
              src={image}
              alt={product?.title || "Product"}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <PackageSearch className="h-4 w-4 text-zinc-400" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold">
                {product?.title || "Untitled Product"}
              </h2>

              <p className="mt-0.5 text-xs text-zinc-500">
                #{product?.productCode || "—"}
              </p>
            </div>

            <span className="rounded-full bg-zinc-950 px-2.5 py-1 text-[10px] font-medium text-white">
              {STAGE_LABELS[currentStage]}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-zinc-950"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>

            <span className="text-[10px] text-zinc-500">
              {progress}%
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto pb-1">
        <div className="flex min-w-[720px]">
          {PRODUCT_LIFECYCLE_STAGES.map((stage, index) => {
            const completed =
              index < currentIndex || isCompleted;

            const active =
              stage === currentStage && !isCompleted;

            const entry = getStageEntry(
              lifecycle,
              stage,
            );

            return (
              <div
                key={stage}
                className="flex flex-1 items-start"
              >
                <div className="min-w-0 flex-1 text-center">
                  <div className="flex items-center">
                    {index > 0 && (
                      <div
                        className={`h-0.5 flex-1 ${
                          completed
                            ? "bg-zinc-950"
                            : "bg-zinc-200"
                        }`}
                      />
                    )}

                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] ${
                        completed
                          ? "bg-zinc-950 text-white"
                          : active
                            ? "bg-zinc-200 text-zinc-950"
                            : "bg-zinc-100 text-zinc-400"
                      }`}
                    >
                      {completed ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : active ? (
                        <Clock3 className="h-3.5 w-3.5" />
                      ) : (
                        index + 1
                      )}
                    </div>

                    {index <
                      PRODUCT_LIFECYCLE_STAGES.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 ${
                          completed
                            ? "bg-zinc-950"
                            : "bg-zinc-200"
                        }`}
                      />
                    )}
                  </div>

                  <p className="mt-1.5 truncate px-1 text-[10px] font-medium text-zinc-600">
                    {STAGE_LABELS[stage]}
                  </p>

                  <p className="mt-0.5 text-[9px] text-zinc-400">
                    {formatDate(
                      entry?.completedAt ||
                        entry?.startedAt,
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!isCompleted ? (
        <div className="mt-4 grid gap-2 lg:grid-cols-[1fr_auto_auto]">
          <input
            value={note}
            onChange={(event) =>
              onNoteChange(event.target.value)
            }
            placeholder="Optional production note"
            className="h-10 rounded-xl bg-zinc-100 px-3 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
          />

          <button
            type="button"
            disabled={advancing || completing}
            onClick={onAdvance}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-xs font-medium text-white disabled:opacity-50"
          >
            {advancing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : currentStage === "sample_approval" ? (
              <KeyRound className="h-4 w-4" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}

            {currentStage === "sample_approval"
              ? "Approve"
              : `Move to ${STAGE_LABELS[nextStage]}`}
          </button>

          <button
            type="button"
            disabled={advancing || completing}
            onClick={onComplete}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 text-xs font-medium text-zinc-700 hover:bg-zinc-200 disabled:opacity-50"
          >
            {completing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}

            Mark All Fulfilled
          </button>
        </div>
      ) : (
        <div className="mt-4 flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-50 text-xs font-medium text-emerald-700">
          <Check className="h-4 w-4" />
          Lifecycle completed
        </div>
      )}
    </article>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl bg-zinc-100 px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
        {label}
      </p>

      <p className="mt-1 text-2xl font-semibold tracking-tight">
        {Number(value || 0)}
      </p>
    </div>
  );
}

function Modal({
  title,
  description,
  icon: Icon,
  onClose,
  children,
  wide = false,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl ${
          wide ? "max-w-2xl" : "max-w-sm"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white">
            <Icon className="h-5 w-5" />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h2 className="mt-4 font-semibold">
          {title}
        </h2>

        <p className="mt-1 text-sm text-zinc-500">
          {description}
        </p>

        <div className="mt-4">
          {children}
        </div>
      </div>
    </div>
  );
}