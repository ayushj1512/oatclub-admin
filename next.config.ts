import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      /* ==============================
         ✅ MIRAY WORDPRESS DOMAINS
      ============================== */

      {
        protocol: "https",
        hostname: "mirayfashions.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.mirayfashions.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "mirayfashions.in",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.mirayfashions.in",
        pathname: "/**",
      },

      /* ==============================
         ✅ GOOGLE AVATARS
      ============================== */
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },

      /* ==============================
         ✅ CLOUDINARY
      ============================== */
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },

      /* ==============================
         ✅ PINTEREST
      ============================== */
      {
        protocol: "https",
        hostname: "i.pinimg.com",
        pathname: "/**",
      },

      /* ==============================
         ✅ AMAZON CDN
      ============================== */
      {
        protocol: "https",
        hostname: "m.media-amazon.com",
        pathname: "/**",
      },

      /* ==============================
         ✅ UNSPLASH
      ============================== */
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },

      /* ==============================
         ✅ GRAVATAR / WP CDN
      ============================== */
      {
        protocol: "https",
        hostname: "secure.gravatar.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i0.wp.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i1.wp.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i2.wp.com",
        pathname: "/**",
      },

      /* ==============================
         ✅ KW CDN
      ============================== */
      {
        protocol: "https",
        hostname: "img.kwcdn.com",
        pathname: "/**",
      },

      /* ==============================
         ✅ LT WEBSTATIC
      ============================== */
      {
        protocol: "https",
        hostname: "img.ltwebstatic.com",
        pathname: "/**",
      },

      /* ==============================
         ✅ SHOP CIDER
      ============================== */
      {
        protocol: "https",
        hostname: "img1.shopcider.com",
        pathname: "/**",
      },

      /* ==============================
         ✅ PRINCESS POLLY
      ============================== */
      {
        protocol: "https",
        hostname: "us.princesspolly.com",
        pathname: "/**",
      },

      /* ==============================
         ✅ STREET STYLE STORE
      ============================== */
      {
        protocol: "https",
        hostname: "cdn.streetstylestore.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.streetstylestore.com",
        pathname: "/**",
      },

      /* ==============================
         ✅ CLOUDFRONT
      ============================== */
      {
        protocol: "https",
        hostname: "d1flfk77wl2xk4.cloudfront.net",
        pathname: "/**",
      },

      /* ==============================
         ✅ FLATICON
      ============================== */
      {
        protocol: "https",
        hostname: "cdn-icons-mp4.flaticon.com",
        pathname: "/**",
      },
    ],

    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },

  async redirects() {
    return [
      {
        source: "/category/all-clothing",
        destination: "/all-clothing",
        permanent: true,
      },
      {
        source: "/category/new-arrivals",
        destination: "/new-arrivals",
        permanent: true,
      },
      {
        source: "/category/best-sellers",
        destination: "/bestseller",
        permanent: true,
      },
      {
        source: "/category/party-wear",
        destination: "/collection/party-protocol",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;