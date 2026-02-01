"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAdminFootwearStore } from "@/store/adminFootwearStore"
import MediaPickerModal from "@/components/media/MediaPickerModal"

export default function AddFootwearPage() {
  const router = useRouter()

  const saving = useAdminFootwearStore((state) => state.saving)
  const error = useAdminFootwearStore((state) => state.error)
  const clearError = useAdminFootwearStore((state) => state.clearError)
  const createItem = useAdminFootwearStore((state) => state.create)

  const [openMedia, setOpenMedia] = useState(false)

  const [form, setForm] = useState({
    name: "",
    price: "",
  })

  const [image, setImage] = useState(null) // stores media object

  const handleChange = (e) => {
    if (error) clearError()
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (error) clearError()

    if (!form.name || !form.price || !image) return

    const payload = {
      name: form.name.trim(),
      price: Number(form.price),
      image: {
        url: image.url,
        publicId: image.publicId,
      },
    }

    const created = await createItem(payload)
    if (created) {
      router.push("/footwear/all")
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-lg rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-semibold mb-6 text-black">
          Add New Footwear
        </h1>

        {error ? (
          <div className="bg-[#fff2f2] border border-[#ffd6d6] text-red-700 rounded-xl px-4 py-3 mb-5 flex items-center justify-between gap-3">
            <p className="text-sm">{error}</p>
            <button
              type="button"
              onClick={clearError}
              className="text-xs bg-black text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Product Name */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Product Name
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter product name"
              className="w-full bg-[#f2f2f2] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black transition"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Price (₹)
            </label>
            <input
              type="number"
              name="price"
              value={form.price}
              onChange={handleChange}
              placeholder="Enter price"
              className="w-full bg-[#f2f2f2] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-black transition"
            />
          </div>

          {/* Image Selector */}
          <div>
            <label className="block text-sm text-gray-600 mb-2">
              Product Image
            </label>

            {image ? (
              <div className="relative bg-[#f2f2f2] rounded-xl p-3 flex items-center gap-3">
                <img
                  src={image.url}
                  alt="Selected"
                  className="w-20 h-20 object-cover rounded-lg"
                />

                <div className="flex-1 text-sm text-gray-600 truncate">
                  Image Selected
                </div>

                <button
                  type="button"
                  onClick={() => setOpenMedia(true)}
                  className="text-sm px-3 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setOpenMedia(true)}
                className="w-full bg-[#f2f2f2] py-4 rounded-xl text-gray-600 hover:bg-[#e6e6e6] transition"
              >
                Select Image
              </button>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-black text-white py-3 rounded-xl hover:bg-gray-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Adding..." : "Add Product"}
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              disabled={saving}
              className="flex-1 bg-[#eaeaea] text-black py-3 rounded-xl hover:bg-[#dcdcdc] transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* ================= MEDIA PICKER MODAL ================= */}
      <MediaPickerModal
        open={openMedia}
        onClose={() => setOpenMedia(false)}
        folder="miray/products"
        onSelect={(media) => {
          setImage(media)
          setOpenMedia(false)
        }}
      />
    </div>
  )
}
