import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating dev badge sits exactly on top of the sidebar footer (theme
  // toggle and sign-out), which makes those unclickable while developing.
  devIndicators: false,
};

export default nextConfig;
