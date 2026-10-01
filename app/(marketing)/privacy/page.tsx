import type { Metadata } from "next"

import { LegalPage, type LegalSection } from "@/components/legal-page"

export const metadata: Metadata = {
  title: "Privacy Policy | VisualCNS",
  description: "How VisualCNS collects, uses, stores, and protects personal information.",
}

const sections: LegalSection[] = [
  {
    id: "scope",
    title: "Scope",
    content: (
      <p>
        This Privacy Policy explains how VisualCNS collects, uses, shares, and protects personal information when you
        visit our websites, contact us, use the VisualHQ dashboard, or receive services from us. VisualCNS is the data
        controller for the processing described here unless a client agreement states otherwise.
      </p>
    ),
  },
  {
    id: "information-we-collect",
    title: "Information we collect",
    content: (
      <>
        <p>Depending on how you use our services, we may collect:</p>
        <ul>
          <li>
            <strong>Account information:</strong> your name, email address, profile image, authentication identifier,
            and login information.
          </li>
          <li>
            <strong>Client and project information:</strong> project details, tasks, messages, approvals, files, and
            other content you or your organisation provides through the dashboard or during an engagement.
          </li>
          <li>
            <strong>Contact and scheduling information:</strong> information submitted by email, forms, or when you
            book a meeting.
          </li>
          <li>
            <strong>Visitor information:</strong> the visitor’s name, company, phone number or email address if given,
            the person they are visiting, the purpose of the visit, and sign-in and sign-out times.
          </li>
          <li>
            <strong>Technical and usage information:</strong> browser and device details, IP address, pages visited,
            referral information, and events needed to operate, secure, and understand use of the services.
          </li>
          <li>
            <strong>Communications preferences:</strong> whether you have subscribed to updates and whether you have
            unsubscribed.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-use-information",
    title: "How we use information",
    content: (
      <>
        <p>We use personal information to:</p>
        <ul>
          <li>create and manage accounts and authenticate users;</li>
          <li>deliver projects, support clients, and provide requested products or services;</li>
          <li>respond to enquiries, schedule meetings, and send service communications;</li>
          <li>send updates and marketing communications where permitted, with an option to unsubscribe;</li>
          <li>maintain security, prevent abuse, diagnose problems, and improve our services; and</li>
          <li>comply with legal obligations and enforce our agreements.</li>
        </ul>
        <p>
          We process information where it is needed to perform a contract, respond to your request, comply with law,
          pursue a legitimate business interest that does not override your rights, or where you have given consent.
        </p>
      </>
    ),
  },
  {
    id: "service-providers",
    title: "Service providers and sharing",
    content: (
      <>
        <p>
          We do not sell personal information. We share information only when needed to operate our services, follow
          your instructions, complete a business transaction, protect rights and safety, or comply with law.
        </p>
        <p>Providers currently used by the website and dashboard include:</p>
        <ul>
          <li>
            <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noreferrer">
              Google Firebase
            </a>{" "}
            for authentication, database, and file storage services;
          </li>
          <li>
            <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">
              Vercel
            </a>{" "}
            for website delivery and analytics; and
          </li>
          <li>
            <a href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noreferrer">
              Meta
            </a>{" "}
            for measuring website visits and sign-ups that result from our ads.
          </li>
          <li>
            <a href="https://cal.com/privacy" target="_blank" rel="noreferrer">
              Cal.com
            </a>{" "}
            when you schedule a meeting.
          </li>
          <li>Resend to send account, visitor, and other service emails.</li>
        </ul>
        <p>
          We may also share information with professional advisers, contractors working under confidentiality
          obligations, regulators, courts, or law-enforcement authorities where legally required.
        </p>
      </>
    ),
  },
  {
    id: "ai-and-web-research",
    title: "AI and web research",
    content: (
      <>
        <p>
          We use third-party AI and research tools to provide features and carry out service work. These include OpenAI
          for AI-powered responses and analysis and Firecrawl for web research. We may also use Anthropic’s Claude in
          our service work. Depending on the feature or work requested, information you provide and relevant website
          content may be sent to these providers for processing.
        </p>
        <p>
          Please do not submit sensitive personal information to an AI feature unless it is needed for your request.
          Each provider may process information under its own privacy terms.
        </p>
      </>
    ),
  },
  {
    id: "international-transfers",
    title: "International transfers",
    content: (
      <p>
        Some providers process information outside Nigeria. Where personal information is transferred internationally,
        we use appropriate contractual, organisational, and technical safeguards required by applicable law. Firebase
        Authentication is operated from data centres in the United States, while other Firebase services may use
        Google infrastructure in multiple locations.
      </p>
    ),
  },
  {
    id: "retention",
    title: "How long we keep information",
    content: (
      <p>
        We retain personal information only for as long as reasonably necessary for the purpose for which it was
        collected, including while an account or client engagement remains active, and afterward where needed for
        security, recordkeeping, dispute resolution, or legal compliance. Retention periods vary by the type of data
        and our contractual and legal obligations.
      </p>
    ),
  },
  {
    id: "security",
    title: "Security",
    content: (
      <p>
        We use reasonable technical and organisational measures designed to protect personal information against
        unauthorised access, loss, misuse, or alteration. No online service is completely secure, so you should also
        protect your account credentials and contact us promptly if you suspect unauthorised access.
      </p>
    ),
  },
  {
    id: "your-rights",
    title: "Your privacy rights",
    content: (
      <>
        <p>
          Depending on applicable law and the circumstances, you may have rights to request access to, correction of,
          deletion of, restriction of, or portability of your personal information; to object to certain processing;
          and to withdraw consent. Withdrawing consent does not affect processing already carried out lawfully.
        </p>
        <p>
          To make a request, email <a href="mailto:info@visualcns.com">info@visualcns.com</a>. We may need to verify
          your identity before completing a request. You may also lodge a complaint with the{" "}
          <a href="https://ndpc.gov.ng" target="_blank" rel="noreferrer">
            Nigeria Data Protection Commission
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "marketing",
    title: "Marketing communications",
    content: (
      <p>
        If you agree to receive periodic emails, we may send product news, company updates, and relevant offers. You
        can unsubscribe through the link in any marketing email or by contacting us. We may still send essential
        messages about your account, security, or active services.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children’s privacy",
    content: (
      <p>
        Our websites and business services are not directed to children under 18, and we do not knowingly collect
        personal information from children through them. If you believe a child has provided personal information,
        contact us so we can review and address it.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    content: (
      <p>
        We may update this policy as our services, providers, or legal obligations change. We will publish the revised
        policy here and update the date above. We will provide additional notice when a material change requires it.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact us",
    content: (
      <p>
        Privacy questions and requests can be sent to{" "}
        <a href="mailto:info@visualcns.com">info@visualcns.com</a> or by post to 5 Ado Ibrahim Street, Sabo, Yaba,
        Lagos, Nigeria.
      </p>
    ),
  },
]

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      summary="This policy explains what information VisualCNS handles, why we use it, and the choices available to you."
      lastUpdated="September 28, 2026"
      sections={sections}
    />
  )
}
