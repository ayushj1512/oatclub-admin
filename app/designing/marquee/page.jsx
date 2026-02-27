// app/designing/marquee/page.jsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  Plus,
  Save,
  Trash2,
  GripVertical,
  RefreshCcw,
  Image as ImageIcon,
  ExternalLink,
  EyeOff,
  Search,
  X,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import MediaPickerModal from "@/components/media/MediaPickerModal";
import ProductPicker from "@/components/common/ProductPicker";

import { useMarqueeAdminStore } from "@/store/marqueeAdminStore";
import { useAdminProductStore } from "@/store/adminProductStore"; // ✅ adjust if different

/* ---------------- helpers ---------------- */
const safe = (v) => (v == null ? "" : String(v));
const pad6 = (x) => {
  const s = safe(x).trim();
  if (!s) return "";
  if (/^\d+$/.test(s)) return s.padStart(6, "0");
  return s;
};
const mediaUrl = (m) => safe(m?.url || m?.secure_url || m?.src).trim();

/* ---------------- tiny UI atoms (LIGHT UI) ---------------- */
function Card({ children, className = "" }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}
function Divider() {
  return <div className="h-px bg-slate-200" />;
}
function Pill({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
      {children}
    </span>
  );
}
function Btn({ children, onClick, disabled, variant = "secondary", title, className = "" }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition border";
  const styles = {
    primary:
      "border-slate-900 bg-slate-900 text-white hover:bg-slate-800 hover:border-slate-800",
    secondary: "border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
    subtle: "border-transparent bg-slate-100 text-slate-800 hover:bg-slate-200",
    danger: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  };
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles[variant]} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {children}
    </button>
  );
}
function IconBtn({ children, onClick, disabled, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center h-10 w-10 rounded-lg border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 transition ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {children}
    </button>
  );
}

/* ---------------- page ---------------- */
export default function MarqueeAdminPage() {
  const {
    items,
    loading,
    saving,
    deletingId,
    error,
    fetchPublic,
    createItem,
    updateItem,
    deleteItem,
    clearError,
  } = useMarqueeAdminStore();

  // local list for reorder/search
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");

  // Create form state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedMedia, setPickedMedia] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [productCode, setProductCode] = useState("");
  const [alt, setAlt] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Replace image
  const [editMediaForId, setEditMediaForId] = useState(null);

  // DnD refs
  const dragIdRef = useRef(null);

  // sync local list
  useEffect(() => {
    setList(Array.isArray(items) ? items : []);
  }, [items]);

  // initial fetch
  useEffect(() => {
    fetchPublic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve productCode from selected product id using product store
  const prodStore = useAdminProductStore();
  useEffect(() => {
    if (!selectedProductId) return setProductCode("");

    const all = Array.isArray(prodStore?.products) ? prodStore.products : [];
    const found = all.find((p) => safe(p?._id) === safe(selectedProductId));
    const code =
      safe(found?.productCode) ||
      safe(found?.sku) ||
      safe(found?.styleCode) ||
      safe(found?.patternNumber) ||
      safe(found?.code);

    setProductCode(pad6(code));
  }, [selectedProductId, prodStore?.products]);

  const hasOrderChanges = useMemo(() => {
    const a = (Array.isArray(items) ? items : []).map((x) => safe(x?._id));
    const b = (Array.isArray(list) ? list : []).map((x) => safe(x?._id));
    if (a.length !== b.length) return true;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return true;
    return false;
  }, [items, list]);

  const filtered = useMemo(() => {
    const query = safe(q).trim().toLowerCase();
    if (!query) return list || [];
    return (list || []).filter((it) => {
      const code = safe(it?.productCode).toLowerCase();
      const altText = safe(it?.alt).toLowerCase();
      return code.includes(query) || altText.includes(query);
    });
  }, [list, q]);

  const createImage = mediaUrl(pickedMedia);
  const createCode = pad6(productCode);

  const onRefresh = async () => {
    clearError?.();
    await fetchPublic();
  };

  const resetForm = () => {
    setPickedMedia(null);
    setSelectedProductId(null);
    setProductCode("");
    setAlt("");
    setIsActive(true);
  };

  const onCreate = async () => {
    if (!createImage) return toast.error("Select image from Media Library");
    if (!createCode) return toast.error("Select product (code missing)");

    const res = await createItem({
      imageUrl: createImage,
      productCode: createCode,
      alt,
      isActive,
      sortOrder: 0,
    });

    if (res?.ok) {
      toast.success("Added");
      resetForm();
    } else {
      toast.error(res?.message || "Failed");
    }
  };

  const onDelete = async (id) => {
    const yes = confirm("Delete this marquee item?");
    if (!yes) return;
    const res = await deleteItem(id);
    if (res?.ok) toast.success("Deleted");
    else toast.error(res?.message || "Failed");
  };

  const onReplaceImage = async (id, media) => {
    const url = mediaUrl(media);
    if (!url) return toast.error("Invalid media");
    const res = await updateItem(id, { imageUrl: url });
    if (res?.ok) toast.success("Image updated");
    else toast.error(res?.message || "Failed");
  };

  const onUpdateAlt = async (id, nextAlt) => {
    const res = await updateItem(id, { alt: safe(nextAlt) });
    if (!res?.ok) toast.error(res?.message || "Failed");
    else toast.success("Saved");
  };

  const onDeactivate = async (id) => {
    const res = await updateItem(id, { isActive: false });
    if (res?.ok) toast.success("Deactivated");
    else toast.error(res?.message || "Failed");
  };

  /* ---------------- Drag & Drop Reorder ---------------- */
  const onDragStart = (id) => {
    dragIdRef.current = safe(id);
  };

  const onDropOn = (dropId) => {
    const dragId = safe(dragIdRef.current);
    const targetId = safe(dropId);
    dragIdRef.current = null;
    if (!dragId || !targetId || dragId === targetId) return;

    // IMPORTANT: reorder inside FULL list, not filtered, so save order is correct
    setList((prev) => {
      const arr = Array.isArray(prev) ? [...prev] : [];
      const from = arr.findIndex((x) => safe(x?._id) === dragId);
      const to = arr.findIndex((x) => safe(x?._id) === targetId);
      if (from < 0 || to < 0) return prev;

      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr;
    });
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  // optional arrows (still useful)
  const moveRow = (id, dir) => {
    setList((prev) => {
      const arr = Array.isArray(prev) ? [...prev] : [];
      const i = arr.findIndex((x) => safe(x?._id) === safe(id));
      if (i < 0) return prev;
      const j = dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= arr.length) return prev;
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
      return arr;
    });
  };

  const saveOrder = async () => {
    if (!list?.length) return;

    for (let i = 0; i < list.length; i++) {
      const id = safe(list[i]?._id);
      const sortOrder = i + 1;
      const res = await updateItem(id, { sortOrder });
      if (!res?.ok) {
        toast.error(`Order save failed at #${sortOrder}`);
        return;
      }
    }
    toast.success("Order saved");
    await fetchPublic();
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-slate-900">Marquee</h1>
          <p className="mt-1 text-sm text-slate-600">Add items, drag to reorder, then save order.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Pill>{(items?.length || 0).toString()} active</Pill>
            {hasOrderChanges ? <Pill>unsaved order</Pill> : <Pill>order saved</Pill>}
          </div>

          {!!error ? (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Btn onClick={onRefresh} disabled={loading} variant="secondary" title="Refresh">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Btn>
          <Btn
            onClick={saveOrder}
            disabled={!hasOrderChanges || saving || !list?.length}
            variant="primary"
            title="Save order"
          >
            <Save className="h-4 w-4" />
            Save Order
          </Btn>
        </div>
      </div>

      {/* Add form */}
      <Card>
        <div className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Add new item</div>
            <div className="text-xs text-slate-600 mt-1">Image from Media Library • Product from Product Picker</div>
          </div>

          <div className="flex items-center gap-2">
            <Btn onClick={resetForm} disabled={saving} variant="subtle" title="Clear">
              <X className="h-4 w-4" />
              Clear
            </Btn>
            <Btn
              onClick={onCreate}
              disabled={saving || !createImage || !createCode}
              variant="primary"
              title="Add item"
            >
              <Plus className="h-4 w-4" />
              Add
            </Btn>
          </div>
        </div>

        <Divider />

        <div className="p-4 space-y-4">
          {/* Image */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium text-slate-700">Image</div>
              <Btn onClick={() => setPickerOpen(true)} variant="secondary" title="Select image">
                <ImageIcon className="h-4 w-4" />
                Select
              </Btn>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              {createImage ? (
                <div className="relative w-full h-[180px]">
                  <Image
                    src={createImage}
                    alt={safe(pickedMedia?.originalName) || "Marquee image"}
                    fill
                    className="object-contain"
                    sizes="100vw"
                  />
                </div>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-sm text-slate-500">
                  No image selected
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Pill>{createImage ? "image selected" : "no image"}</Pill>
              <Pill>{createCode ? `code: ${createCode}` : "code: missing"}</Pill>
            </div>
          </div>

          {/* Product */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-700">Product</div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <ProductPicker
                title="Select product"
                multiple={false}
                required
                value={selectedProductId}
                onChange={(next) => setSelectedProductId(next)}
              />
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <div className="text-xs font-medium text-slate-700 mb-1">Alt (optional)</div>
              <input
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="e.g., New drop"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-slate-800">
                <input type="checkbox" checked={!!isActive} onChange={(e) => setIsActive(e.target.checked)} />
                Active
              </label>
            </div>
          </div>

          <div className="text-[12px] text-slate-500">
            Note: this page currently shows <b>active</b> items only (public list). Deactivate removes it after refresh.
          </div>
        </div>
      </Card>

      {/* List */}
      <Card>
        <div className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Items</div>
            <div className="text-xs text-slate-600 mt-1">
              Drag a row to reorder (drop on another row). Images are contained (no crop).
            </div>
          </div>

          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search code / alt..."
              className="w-[360px] rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        <Divider />

        {loading ? (
          <div className="p-6 text-sm text-slate-600">Loading marquee items…</div>
        ) : !filtered?.length ? (
          <div className="p-6 text-sm text-slate-600">No items found.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filtered.map((it, idx) => {
              const id = safe(it?._id);
              const img = safe(it?.imageUrl);
              const href = safe(it?.href);
              const code = pad6(it?.productCode) || "NO CODE";

              return (
                <div
                  key={id}
                  className="p-4 space-y-3 cursor-grab active:cursor-grabbing"
                  draggable
                  onDragStart={() => onDragStart(id)}
                  onDragOver={onDragOver}
                  onDrop={() => onDropOn(id)}
                >
                  {/* Top row */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill>#{idx + 1}</Pill>
                        <Pill>{code}</Pill>
                        {safe(it?.alt) ? <Pill>{safe(it?.alt).slice(0, 40)}</Pill> : <Pill>no alt</Pill>}
                      </div>
                      <div className="mt-2 text-xs text-slate-600">
                        Drag anywhere on this row to move it.
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
                        <GripVertical className="h-4 w-4 text-slate-600" />
                      </div>

                      <IconBtn onClick={() => moveRow(id, "up")} disabled={saving || idx === 0} title="Move up">
                        <ArrowUp className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn
                        onClick={() => moveRow(id, "down")}
                        disabled={saving || idx === filtered.length - 1}
                        title="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </IconBtn>

                      <IconBtn onClick={() => onDeactivate(id)} disabled={saving} title="Deactivate">
                        <EyeOff className="h-4 w-4" />
                      </IconBtn>

                      <IconBtn onClick={() => onDelete(id)} disabled={deletingId === id} title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </IconBtn>
                    </div>
                  </div>

                  {/* Image + side actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-7 rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="relative w-full h-[200px]">
                        {img ? (
                          <Image
                            src={img}
                            alt={safe(it?.alt) || code}
                            fill
                            className="object-contain"
                            sizes="100vw"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
                            No image
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="sm:col-span-5 space-y-2">
                      <Btn
                        onClick={() => setEditMediaForId(id)}
                        variant="secondary"
                        title="Replace image"
                        className="w-full"
                      >
                        <ImageIcon className="h-4 w-4" />
                        Replace Image
                      </Btn>

                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 transition"
                          title="Open product"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open Product
                        </a>
                      ) : (
                        <div className="text-xs text-slate-500">No product link</div>
                      )}

                      <div>
                        <div className="text-xs font-medium text-slate-700 mb-1">Alt</div>
                        <input
                          defaultValue={safe(it?.alt)}
                          onBlur={(e) => {
                            const next = safe(e.target.value);
                            if (next !== safe(it?.alt)) onUpdateAlt(id, next);
                          }}
                          placeholder="Alt text"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                        />
                        <div className="mt-1 text-[12px] text-slate-500">Edit then click outside to save.</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="text-[12px] text-slate-500">
        Tip: use wide images (recommended 16:6). Product click uses <b>/products/[productCode]</b>.
      </div>

      {/* Media picker (create) */}
      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        folder="miray/marquee"
        onSelect={(m) => {
          setPickedMedia(m);
          setPickerOpen(false);
        }}
      />

      {/* Media picker (replace) */}
      <MediaPickerModal
        open={!!editMediaForId}
        onClose={() => setEditMediaForId(null)}
        folder="miray/marquee"
        onSelect={(m) => {
          const id = editMediaForId;
          setEditMediaForId(null);
          if (id) onReplaceImage(id, m);
        }}
      />
    </div>
  );
}