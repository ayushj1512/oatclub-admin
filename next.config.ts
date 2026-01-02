/** @type {import('next').NextConfig} */
module.exports = {
  images: {
    remotePatterns: [
      // ✅ WordPress images (ALL paths)
      {
        protocol: "https",
        hostname: "mirayfashions.com",
        pathname: "/**",
      },

      // ✅ Cloudinary (Media Library)
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },

      // ✅ Pinterest (if used in categories)
      {
        protocol: "https",
        hostname: "i.pinimg.com",
        pathname: "/**",
      },

      // ✅ Flaticon CDN (if you ever use icons/video previews)
      {
        protocol: "https",
        hostname: "cdn-icons-mp4.flaticon.com",
        pathname: "/**",
      },
    ],

    // ✅ optional performance improvements
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },
};
