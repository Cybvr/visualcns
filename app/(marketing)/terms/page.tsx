import type { Metadata } from "next"

import { LegalPage, type LegalSection } from "@/components/legal-page"

export const metadata: Metadata = {
  title: "Terms of Service | VisualCNS",
  description: "The terms that govern access to VisualCNS websites, products, and services.",
}

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement to these terms",
    content: (
      <>
        <p>
          These Terms of Service govern your access to and use of VisualCNS websites, the VisualHQ client dashboard,
          and any related online services we make available. By accessing or using them, you agree to these terms.
        </p>
        <p>
          If you use our services on behalf of a company or other organisation, you confirm that you have authority
          to bind that organisation to these terms.
        </p>
      </>
    ),
  },
  {
    id: "services",
    title: "Our services",
    content: (
      <>
        <p>
          VisualCNS provides strategy, design, software development, content, marketing, support, and related
          professional services. Information on this website describes our general capabilities and is not a binding
          offer or guarantee of any particular result.
        </p>
        <p>
          Paid client work is governed by the proposal, statement of work, order form, or other written agreement
          accepted by VisualCNS and the client. If that agreement conflicts with these terms, the client agreement
          controls for that work.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Accounts and access",
    content: (
      <>
        <p>
          You must provide accurate account information and keep your login credentials secure. You are responsible
          for activity carried out through your account unless you promptly tell us that it has been compromised.
        </p>
        <p>
          We may restrict or suspend access when reasonably necessary to protect users, secure our systems, comply
          with law, or address a breach of these terms.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    content: (
      <>
        <p>You may not use our websites or services to:</p>
        <ul>
          <li>break the law, infringe another person’s rights, or facilitate fraud or abuse;</li>
          <li>upload malicious code or attempt to disrupt, bypass, probe, or gain unauthorised access to our systems;</li>
          <li>misrepresent your identity or your authority to act for another person or organisation;</li>
          <li>scrape, copy, or exploit the services in a way that materially burdens our infrastructure; or</li>
          <li>use content or access obtained through the services for unlawful or harmful purposes.</li>
        </ul>
      </>
    ),
  },
  {
    id: "content-and-rights",
    title: "Content and intellectual property",
    content: (
      <>
        <p>
          VisualCNS and its licensors own the website, software, branding, and content we provide, except for material
          clearly identified as belonging to someone else. These terms do not transfer ownership of that material to
          you.
        </p>
        <p>
          You retain ownership of files, information, and other content you provide. You give us permission to host,
          process, copy, and display that content only as reasonably needed to provide, secure, and support the
          services. Ownership of deliverables created for a client is governed by the applicable client agreement.
        </p>
      </>
    ),
  },
  {
    id: "third-parties",
    title: "Third-party services",
    content: (
      <p>
        Our services may integrate with or link to third-party services. Those services are operated under their own
        terms and privacy practices. We are not responsible for third-party products or content that we do not
        control.
      </p>
    ),
  },
  {
    id: "communications",
    title: "Information and emails",
    content: (
      <>
        <p>
          We collect information you provide when you create an account, complete a form, contact us, or use visitor
          sign-in. This may include your name, email address, company, phone number, and visit details. Our{" "}
          <a href="/privacy">Privacy Policy</a> explains how we use and share that information.
        </p>
        <p>
          We may email you about your account, visitor sign-ins, enquiries, and services you request. We may also send
          updates and offers where permitted. You can unsubscribe from marketing emails using the link in the message
          or by contacting us; account, security, and service emails may still be sent.
        </p>
      </>
    ),
  },
  {
    id: "availability",
    title: "Availability and warranties",
    content: (
      <p>
        We work to keep our online services secure and available, but they may occasionally be interrupted, changed,
        or withdrawn. To the extent permitted by law, online services are provided on an “as available” basis without
        warranties that they will always be uninterrupted, error-free, or suitable for every purpose.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Liability",
    content: (
      <>
        <p>
          To the extent permitted by law, VisualCNS is not liable for indirect, incidental, special, or consequential
          losses arising from use of the online services. Nothing in these terms excludes or limits liability that
          cannot lawfully be excluded or limited.
        </p>
        <p>
          Any liability connected with paid professional services is governed by the applicable client agreement.
        </p>
      </>
    ),
  },
  {
    id: "governing-law",
    title: "Governing law",
    content: (
      <p>
        These terms are governed by the laws of the Federal Republic of Nigeria. Courts with jurisdiction in Lagos,
        Nigeria will have jurisdiction over disputes relating to these terms, unless applicable law requires
        otherwise.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    content: (
      <p>
        We may update these terms as our services or legal obligations change. We will post the revised terms here
        and update the date above. If a change materially affects your rights, we will provide additional notice when
        reasonably required.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact us",
    content: (
      <p>
        Questions about these terms can be sent to{" "}
        <a href="mailto:info@visualcns.com">info@visualcns.com</a> or by post to 5 Ado Ibrahim Street, Sabo, Yaba,
        Lagos, Nigeria.
      </p>
    ),
  },
]

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      summary="These terms explain the rules for using VisualCNS websites, accounts, products, and online services."
      lastUpdated="September 28, 2026"
      sections={sections}
    />
  )
}
