"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import CommerceFeedForm from "@/components/marketing/commerceManager/CommerceFeedForm";
import { useAdminCommerceManagerStore } from "@/store/adminCommerceManagerStore";

export default function CreateCommerceFeedPage() {
  const router = useRouter();

  const createFeed = useAdminCommerceManagerStore(
    (state) => state.createFeed,
  );

  const saving = useAdminCommerceManagerStore(
    (state) => state.saving,
  );

  const handleCreateFeed = async (payload) => {
    const result = await createFeed(payload);

    if (!result?.success) {
      return result;
    }

    toast.success("Commerce feed created successfully");

    router.push("/marketing/commerceManager");
    router.refresh();

    return result;
  };

  return (
    <CommerceFeedForm
      mode="create"
      loading={saving}
      onSubmit={handleCreateFeed}
    />
  );
}
