import type { NextConfig } from "next";

export default {
  // experimental: {
  //   reactCompiler: true
  // },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/dashboard",
        permanent: true
      }
    ]
  },
} satisfies NextConfig;
