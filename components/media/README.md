🧠 MEDIA SYSTEM – AI AGENT HANDOFF README

Purpose:
This document explains the Media Library system in a way that any AI agent or developer can immediately understand, use, and extend it without breaking anything.

🧩 WHAT THIS SYSTEM IS

This is a centralized Media Library for the admin panel.

It provides:

One common modal

One upload system

One media selector

Reusable everywhere (products, blogs, banners, CMS, etc.)

🚫 No feature should implement its own upload logic
✅ Always use this media system

📁 FILE LOCATIONS (IMPORTANT)
components/media/
├─ MediaPickerModal.jsx   ← ENTRY POINT (use this everywhere)
├─ MediaUploadTab.jsx     ← Upload logic (drag, drop, paste, preview)
├─ MediaGalleryTab.jsx    ← Fetch + select existing media
├─ MediaGrid.jsx          ← UI grid renderer (safe & defensive)
└─ README.md              ← This file

🧠 CORE CONCEPT (READ THIS FIRST)

RULE:
Any feature that needs an image/video must open MediaPickerModal.

The modal handles:

Uploading new media

Selecting existing media

Returning selected media to parent component

The parent never uploads directly.

🧩 ENTRY POINT (MOST IMPORTANT FILE)
MediaPickerModal.jsx

This is the only component that should be imported directly by pages or forms.

import MediaPickerModal from "@/components/media/MediaPickerModal";


Everything else is internal.

⚙️ PROPS CONTRACT (DO NOT BREAK)
MediaPickerModal({
  open: boolean,          // controls modal visibility
  onClose: () => void,    // closes modal
  onSelect: (media) => {},// returns selected media
  multiple?: boolean,     // single or multi select
  folder?: string         // cloudinary folder
})

📦 RETURNED MEDIA OBJECT SHAPE

When user selects media, onSelect receives:

Single select
{
  _id: string,
  url: string,
  publicId: string,
  resourceType: "image" | "video",
  format: string,
  width: number,
  height: number,
  folder: string,
  originalName: string,
  createdAt: Date
}

Multi select
Array<MediaObject>


👉 Recommended:
Store only:

url

publicId

🧪 HOW TO USE (COPY-PASTE SAFE)
✅ Single Image (Product Thumbnail, Blog Cover)
const [open, setOpen] = useState(false);
const [image, setImage] = useState(null);

<button onClick={() => setOpen(true)}>Select Image</button>

<MediaPickerModal
  open={open}
  onClose={() => setOpen(false)}
  folder="miray/products"
  onSelect={(media) => setImage(media)}
/>

✅ Multiple Images (Gallery)
const [gallery, setGallery] = useState([]);

<MediaPickerModal
  open={open}
  onClose={() => setOpen(false)}
  multiple
  folder="miray/products/gallery"
  onSelect={(mediaList) => setGallery(mediaList)}
/>

📤 UPLOAD SYSTEM (INTERNAL – DO NOT DUPLICATE)
MediaUploadTab.jsx provides:

Drag & Drop upload

Paste (Ctrl+V) screenshots

Click to select files

Preview before upload

Remove before upload

Image + Video support

🚫 Do NOT create another uploader elsewhere
✅ Always rely on this tab

🖼️ MEDIA SELECTION FLOW (HOW IT WORKS)

Parent opens MediaPickerModal

User:

uploads new media OR

selects existing media

Modal returns selected media

Parent stores media reference

Modal closes

🧠 DATA FLOW (IMPORTANT FOR AI)
UI → MediaPickerModal
   → MediaUploadTab (optional)
   → MediaGalleryTab
   → MediaGrid
   → adminMediaStore (Zustand)
   → Backend API
   → Cloudinary

🔌 DEPENDENCIES (DO NOT REMOVE)
Frontend

Zustand → useAdminMediaStore

react-hot-toast → notifications

next/image → rendering media

Backend APIs
GET    /api/media
POST   /api/media/upload
DELETE /api/media/:id

⚠️ REQUIRED NEXT.JS CONFIG

Cloudinary must be allowed:

// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};


🚨 Restart server after changes.