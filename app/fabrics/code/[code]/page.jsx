"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import useFabricStore from "@/store/fabricStore";

export default function FabricCodeRedirectPage() {
  const params = useParams();
  const router = useRouter();

  const { fetchFabricByCode } = useFabricStore();

  useEffect(() => {
    const load = async () => {
      const code = params?.code;
      if (!code) return;

      const res = await fetchFabricByCode(code);
      const fabric = res?.data;

      if (fabric?._id) {
        router.replace(`/fabrics/${fabric._id}`);
      }
    };

    load();
  }, [params?.code]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6 text-neutral-600">
      Opening fabric detail...
    </div>
  );
}