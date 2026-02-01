"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import useAdminFootwearStore from "@/store/adminFootwearStore"
import MediaPickerModal from "@/components/media/MediaPickerModal"

export default function AddFootwearPage() {

  const router = useRouter()
  const addProduct = useAdminFootwearStore((state) => state.addProduct)

  const [openMedia, setOpenMedia] = useState(false)

  const [form, setForm] = useState({
    name: "",
    price: "",
  })

  const [image, setImage] = useState(null) // will store media object

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!form.name || !form.price || !image) return

    addProduct({
      id: Date.now(),
      name: form.name,
      price: Number(form.price),

      // 👉 store only recommended fields
      image: {
        url: image.url,
        publicId: image.publicId,
      },
    })

    router.push("/footwear")
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4] flex items-center justify-center p-6">

      <div className="bg-white w-full max-w-lg rounded-2xl p-8 shadow-sm">

        <h1 className="text-2xl font-semibold mb-6 text-black">
          Add New Footwear
        </h1>

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
              className="flex-1 bg-black text-white py-3 rounded-xl hover:bg-gray-800 transition"
            >
              Add Product
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-[#eaeaea] text-black py-3 rounded-xl hover:bg-[#dcdcdc] transition"
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
