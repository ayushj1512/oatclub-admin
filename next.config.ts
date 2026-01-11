/** @type {import('next').NextConfig} */
module.exports = {
  images: {
    remotePatterns: [
      // ✅ WordPress images (ALL paths) - .com
      {
        protocol: "https",
        hostname: "mirayfashions.com",
        pathname: "/**",
      },

      // ✅ WordPress images (ALL paths) - www .com (optional but recommended)
      {
        protocol: "https",
        hostname: "www.mirayfashions.com",
        pathname: "/**",
      },

      // ✅ WordPress images (ALL paths) - .in ✅ FIXED
      {
        protocol: "https",
        hostname: "mirayfashions.in",
        pathname: "/**",
      },

      // ✅ WordPress images (ALL paths) - www .in (optional but recommended)
      {
        protocol: "https",
        hostname: "www.mirayfashions.in",
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
