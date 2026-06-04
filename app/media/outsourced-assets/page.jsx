"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ImageOff, ExternalLink } from "lucide-react";
import { useAdminProductStore } from "@/store/adminProductStore";

export default function OutsourcedAssetsPage() {
  const { fetchProductMedia } = useAdminProductStore();

  const [media, setMedia] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loading, setLoading] = useState(false);

  const loaderRef = useRef(null);

  const loadMedia = async (nextPage = 1) => {
    if (loading || !hasNextPage) return;

    setLoading(true);

    const data = await fetchProductMedia({
      page: nextPage,
      limit: 60,
      source: "outsourced",
      type: "image",
    });

    setMedia((prev) => {
      const map = new Map();
      [...prev, ...(data.media || [])].forEach((item) => {
        if (item?.url) map.set(item.url, item);
      });
      return Array.from(map.values());
    });

    setPage(data.page || nextPage);
    setHasNextPage(!!data.hasNextPage);
    setLoading(false);
  };

  useEffect(() => {
    loadMedia(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaderRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !loading) {
          loadMedia(page + 1);
        }
      },
      { rootMargin: "400px" }
    );

    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [page, hasNextPage, loading]);

  return (
    <main className="min-h-screen bg-white px-4 py-5 text-black md:px-8">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
            Outsourced Assets
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            All external product pictures in one place.
          </p>
        </div>

        <div className="text-sm text-neutral-500">{media.length} loaded</div>
      </div>

      {!loading && media.length === 0 ? (
        <div className="flex min-h-[45vh] flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 text-center">
          <ImageOff className="mb-3 h-8 w-8 text-neutral-400" />
          <p className="text-sm font-medium">No outsourced images found</p>
          <p className="mt-1 text-xs text-neutral-500">
            External product image URLs will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
          {media.map((item) => (
            <AssetCard key={item.url} item={item} />
          ))}
        </div>
      )}

      <div ref={loaderRef} className="flex h-24 items-center justify-center">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
        ) : hasNextPage ? (
          <span className="text-xs text-neutral-400">Scroll to load more</span>
        ) : media.length ? (
          <span className="text-xs text-neutral-400">All images loaded</span>
        ) : null}
      </div>
    </main>
  );
}

function AssetCard({ item }) {
  const product = item?.product || {};

  return (
    <div className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100">
        <img
          src={item.url}
          alt={product.title || "Product asset"}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />

        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="absolute right-2 top-2 rounded-full bg-white/90 p-2 opacity-0 shadow-sm transition group-hover:opacity-100"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="space-y-1 p-3">
        <p className="line-clamp-1 text-sm font-medium">
          {product.title || "Untitled product"}
        </p>

        <div className="flex items-center justify-between gap-2 text-xs text-neutral-500">
          <span>{product.productCode || "No code"}</span>
          <span className="capitalize">{item.role}</span>
        </div>
      </div>
    </div>
  );
}