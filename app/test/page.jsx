"use client";

import { useState } from "react";
import Image from "next/image";
import MediaPickerModal from "@/components/media/MediaPickerModal";

export default function TestMediaPage() {
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState(null);

  return (
    <div className="p-8">
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 bg-black text-white rounded"
      >
        Open Media Picker
      </button>

      {image && (
        <div className="mt-4 w-48">
          <Image
            src={image.url}
            alt=""
            width={200}
            height={200}
            className="rounded"
          />
        </div>
      )}

      <MediaPickerModal
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(media) => setImage(media)}
      />
    </div>
  );
}
