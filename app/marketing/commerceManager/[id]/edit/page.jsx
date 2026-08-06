"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import CommerceFeedForm from "@/components/marketing/commerceManager/CommerceFeedForm";
import { useAdminCommerceManagerStore } from "@/store/adminCommerceManagerStore";

export default function EditCommerceFeedPage({ params }) {
  const router = useRouter();
  const { id } = use(params);

  const currentFeed = useAdminCommerceManagerStore(
    (state) => state.currentFeed,
  );

  const loading = useAdminCommerceManagerStore(
    (state) => state.loading,
  );

  const saving = useAdminCommerceManagerStore(
    (state) => state.saving,
  );

  const actionLoading = useAdminCommerceManagerStore(
    (state) => state.actionLoading,
  );

  const fetchFeed = useAdminCommerceManagerStore(
    (state) => state.fetchFeed,
  );

  const updateFeed = useAdminCommerceManagerStore(
    (state) => state.updateFeed,
  );

  const deleteFeed = useAdminCommerceManagerStore(
    (state) => state.deleteFeed,
  );

  const refreshXmlFeed = useAdminCommerceManagerStore(
    (state) => state.refreshXmlFeed,
  );

  useEffect(() => {
    if (id) {
      fetchFeed(id);
    }
  }, [id, fetchFeed]);

  const handleUpdate = async (payload) => {
    const result = await updateFeed(id, payload);

    if (!result?.success) {
      return result;
    }

    toast.success("Commerce feed updated successfully");

    router.push("/marketing/commerceManager");
    router.refresh();

    return result;
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Delete this commerce feed? Its XML link will stop working immediately.",
    );

    if (!confirmed) return;

    const result = await deleteFeed(id);

    if (!result?.success) {
      return;
    }

    router.push("/marketing/commerceManager");
    router.refresh();
  };

  const handleRefreshXml = async () => {
    const result = await refreshXmlFeed(id);

    if (result?.success) {
      await fetchFeed(id);
    }
  };

  if (loading && !currentFeed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f6f6] text-sm text-zinc-500">
        Loading commerce feed...
      </div>
    );
  }

  if (!loading && !currentFeed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f6f6f6] px-4 text-center">
        <h1 className="text-xl font-bold text-black">
          Commerce feed not found
        </h1>

        <button
          type="button"
          onClick={() => router.push("/marketing/commerceManager")}
          className="rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white"
        >
          Back to feeds
        </button>
      </div>
    );
  }

  return (
    <CommerceFeedForm
      key={currentFeed?._id}
      mode="edit"
      initialData={currentFeed}
      loading={saving || actionLoading}
      onSubmit={handleUpdate}
      onDelete={handleDelete}
      onRefreshXml={handleRefreshXml}
    />
  );
}
