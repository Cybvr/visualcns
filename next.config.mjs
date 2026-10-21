const firebaseProject = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID

/** A separate output directory lets demo-emulator verification run beside dev. */
const nextConfig = {
  devIndicators: false,
  distDir: process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "true" ? ".next-portal-test" : ".next",
  // Firebase's sign-in handler served from our own domain, so Google sign-in by
  // redirect (the installed phone app) keeps its session. Used once
  // NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is set to this site's domain.
  async rewrites() {
    if (!firebaseProject) return []
    return [{ source: "/__/auth/:path*", destination: `https://${firebaseProject}.firebaseapp.com/__/auth/:path*` }]
  },
}
export default nextConfig
