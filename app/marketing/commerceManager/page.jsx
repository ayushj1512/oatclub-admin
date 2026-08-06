"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  Copy,
  ExternalLink,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import { useAdminCommerceManagerStore } from "@/store/adminCommerceManagerStore";

const XML_BASE =
  "https://studio.oatclub.in/api/commerce-manager/xml";

export default function CommerceManagerPage() {
  const {
    feeds,
    loading,
    fetchFeeds,
    deleteFeed,
    refreshXmlFeed,
  } = useAdminCommerceManagerStore();

  useEffect(() => {
    fetchFeeds();
  }, [fetchFeeds]);

  const copyLink = async (slug) => {
    await navigator.clipboard.writeText(
      `${XML_BASE}/${slug}`,
    );

    toast.success("XML link copied");
  };

  const removeFeed = async (feed) => {
    if (
      !window.confirm(
        `Delete "${feed.name}"?`,
      )
    ) {
      return;
    }

    await deleteFeed(feed._id);

    fetchFeeds();
  };

  const refreshFeed = async (feed) => {
    await refreshXmlFeed(feed._id);

    fetchFeeds();
  };

  return (
    <div className="min-h-screen bg-[#f7f7f7] p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Header */}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">
              Commerce Manager Feeds
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              Create XML feeds for
              different Meta campaigns.
            </p>
          </div>

          <Link
            href="/marketing/commerceManager/create"
            className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus size={18} />
            Create Feed
          </Link>
        </div>

        {/* Table */}

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-zinc-100">
              <tr className="text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">
                  Feed
                </th>

                <th className="px-4 py-3">
                  Products
                </th>

                <th className="px-4 py-3">
                  Status
                </th>

                <th className="px-4 py-3">
                  XML
                </th>

                <th className="px-4 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {!loading &&
                feeds.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="py-20 text-center text-zinc-500"
                  >
                    No feeds found.
                  </td>
                </tr>
              ) : null}

              {feeds.map((feed) => {
                const xml =
                  `${XML_BASE}/${feed.slug}`;

                return (
                  <tr
                    key={feed._id}
                    className="border-t border-zinc-100 hover:bg-zinc-50"
                  >
                    <td className="px-4 py-4">
                      <div className="font-semibold">
                        {feed.name}
                      </div>

                      <div className="mt-1 text-xs text-zinc-500">
                        {feed.slug}
                      </div>

                      {feed.isDefault && (
                        <span className="mt-2 inline-flex rounded-full bg-black px-2 py-1 text-[10px] font-bold uppercase text-white">
                          Default
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <span className="font-semibold">
                        {
                          feed.selectedProductCodesCount
                        }
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      {feed.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                          <CheckCircle2
                            size={14}
                          />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                          <XCircle
                            size={14}
                          />
                          Disabled
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <div className="max-w-xs truncate text-xs text-zinc-500">
                        {xml}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() =>
                            copyLink(
                              feed.slug,
                            )
                          }
                          className="rounded-lg border p-2 hover:bg-zinc-100"
                          title="Copy XML"
                        >
                          <Copy size={16} />
                        </button>

                        <a
                          href={xml}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border p-2 hover:bg-zinc-100"
                        >
                          <ExternalLink
                            size={16}
                          />
                        </a>

                        <button
                          onClick={() =>
                            refreshFeed(
                              feed,
                            )
                          }
                          className="rounded-lg border p-2 hover:bg-zinc-100"
                        >
                          <RefreshCw
                            size={16}
                          />
                        </button>

                        <Link
                          href={`/marketing/commerceManager/${feed._id}/edit`}
                          className="rounded-lg border p-2 hover:bg-zinc-100"
                        >
                          <Pencil
                            size={16}
                          />
                        </Link>

                        {!feed.isDefault && (
                          <button
                            onClick={() =>
                              removeFeed(
                                feed,
                              )
                            }
                            className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                          >
                            <Trash2
                              size={16}
                            />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
