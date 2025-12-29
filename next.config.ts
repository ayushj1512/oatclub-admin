/** @type {import('next').NextConfig} */
module.exports = {
  images: {
    remotePatterns: [
      // ✅ Existing WordPress images
      {
        protocol: "https",
        hostname: "mirayfashions.com",
        pathname: "/wp-content/uploads/**",
      },

      // ✅ Cloudinary (Media Library)
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};
