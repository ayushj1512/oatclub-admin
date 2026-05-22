"use client";

import { useEffect } from "react";
import ReviewsManagePage from "../manage/page";
import { useAdminReviewStore } from "@/store/adminReviewStore";

export default function RejectedReviewsPage() {
  const { setQuery } = useAdminReviewStore();

  useEffect(() => {
    setQuery({ status: "rejected", page: 1 });
  }, [setQuery]);

  return <ReviewsManagePage />;
}