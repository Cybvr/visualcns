/** A separate output directory lets demo-emulator verification run beside dev. */
const nextConfig = {
  devIndicators: false,
  distDir: process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "true" ? ".next-portal-test" : ".next",
  async redirects() {
    return [
      { source: "/dashboard/clients", destination: "/dashboard/companies", permanent: true },
      { source: "/dashboard/clients/:path*", destination: "/dashboard/companies/:path*", permanent: true },
      // Services became Pricing; old links still land in the right place.
      { source: "/services", destination: "/pricing", permanent: true },
      { source: "/:clientSlug/services", destination: "/:clientSlug/pricing", permanent: true },
    ]
  },
}
export default nextConfig
