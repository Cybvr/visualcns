import type React from "react"
import type { Metadata, Viewport } from "next"

import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ServiceWorkerRegister } from "@/components/service-worker-register"
import { Toaster } from "sonner"

import { EB_Garamond, Geist_Mono, Inter, Poppins } from "next/font/google"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })
const ebGaramond = EB_Garamond({ subsets: ["latin"], variable: "--font-eb-garamond" })
const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["500", "600", "700"],
})

const FAVICON_URL = "/visualhqlogo.svg"
const SHARED_LOGO_URL = "/visualhqlogo.svg"

export const metadata: Metadata = {
  metadataBase: new URL("https://visualcns.com"),
  title: "VisualCNS - Software Systems for Modern Businesses",
  description:
    "VisualCNS builds software systems, product businesses, and AI-enabled tools from Lagos for modern teams.",
  keywords: ["software development", "AI", "VisualHQ", "VisualCNS", "Lagos", "Nigeria", "product company"],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "VisualCNS - Software Systems for Modern Businesses",
    description:
      "VisualCNS builds software systems, product businesses, and AI-enabled tools from Lagos for modern teams.",
    url: "https://visualcns.com",
    siteName: "VisualCNS",
    type: "website",
    images: [{ url: SHARED_LOGO_URL, width: 500, height: 500, alt: "VisualHQ" }],
  },
  twitter: {
    card: "summary",
    title: "VisualCNS - Software Systems for Modern Businesses",
    description:
      "VisualCNS builds software systems, product businesses, and AI-enabled tools from Lagos for modern teams.",
    images: [SHARED_LOGO_URL],
  },
  applicationName: "VisualCNS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VisualCNS",
  },
  // --- FAVICON USING EXTERNAL URL ---
  icons: {
    icon: FAVICON_URL,
    apple: "/apple-icon.png",
  },
  // ----------------------------------
}

export const viewport: Viewport = {
  themeColor: "#110e2c",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} ${ebGaramond.variable} ${poppins.variable}`}
    >
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          {children}
          {/* Sonner defaults to an absurd z-index (999999999) that floats above every
              sheet and dialog (z-50). Capped below them so an open modal always wins. */}
          <Toaster richColors position="top-right" style={{ zIndex: 45 }} />
        </ThemeProvider>
        <ServiceWorkerRegister />
        <Analytics />
      </body>
    </html>
  )
}
