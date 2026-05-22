"use client";

import { useEffect } from "react";
import ReviewsManagePage from "../manage/page";
import { useAdminReviewStore } from "@/store/adminReviewStore";

export default function PendingReviewsPage() {
  const { setQuery } = useAdminReviewStore();

  useEffect(() => {
    setQuery({ status: "pending", page: 1 });
  }, [setQuery]);

  return <ReviewsManagePage />;
}