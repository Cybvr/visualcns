import type { Metadata } from "next"

import { LegalPage, type LegalSection } from "@/components/legal-page"

export const metadata: Metadata = {
  title: "Cookie Policy | VisualCNS",
  description: "How VisualCNS uses cookies and similar technologies across its websites and services.",
}

const sections: LegalSection[] = [
  {
    id: "what-cookies-are",
    title: "What cookies are",
    content: (
      <p>
        Cookies are small text files stored on your device by a website. Similar technologies, such as browser
        storage, can remember settings or support a session. This policy explains the technologies VisualCNS uses on
        its websites and VisualHQ services.
      </p>
    ),
  },
  {
    id: "essential-technologies",
    title: "Essential technologies",
    content: (
      <>
        <p>
          We use limited technologies that are necessary for core functionality, security, or a setting you have
          requested. For example, the VisualHQ dashboard may use a cookie named <strong>sidebar_state</strong> to
          remember whether the navigation sidebar is expanded or collapsed. This cookie lasts for up to seven days
          and does not identify you or track you across unrelated websites.
        </p>
        <p>
          Disabling essential cookies or browser storage may affect parts of the dashboard or other services that rely
          on saved preferences.
        </p>
      </>
    ),
  },
  {
    id: "analytics-and-third-parties",
    title: "Analytics and third-party services",
    content: (
      <>
        <p>
          We use privacy-conscious analytics to understand how people use the website and improve its performance.
          The website may also connect to service providers such as Vercel, Google Firebase, and Cal.com to deliver
          hosting, authentication, storage, analytics, or scheduling features. These providers may use their own
          technologies under their own privacy policies.
        </p>
        <p>
          We do not currently use cookies on the marketing website for targeted advertising. If that changes, we will
          update this policy and provide any choices required by applicable law.
        </p>
      </>
    ),
  },
  {
    id: "your-choices",
    title: "Your choices",
    content: (
      <p>
        Most browsers let you view, block, or delete cookies through their privacy settings. You can also clear
        browser storage from your device settings. Because essential technologies support functionality, blocking
        them may prevent some features from working correctly.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    content: (
      <p>
        We may update this Cookie Policy when our services, providers, or legal obligations change. We will publish
        the revised policy here and update the date above.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact us",
    content: (
      <p>
        Questions about cookies or similar technologies can be sent to{" "}
        <a href="mailto:info@visualcns.com">info@visualcns.com</a>.
      </p>
    ),
  },
]

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      summary="This policy explains the limited cookies and similar technologies VisualCNS uses to keep its services working and understand site usage."
      lastUpdated="September 15, 2026"
      sections={sections}
    />
  )
}
