import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.18.161.62"],
  experimental: {
    useTypeScriptCli: false,
  },
};

export default nextConfig;
