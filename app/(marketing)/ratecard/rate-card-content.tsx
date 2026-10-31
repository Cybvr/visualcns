"use client"

import { useState } from "react"
import { CircleAlert, Globe, Mail, MapPin } from "lucide-react"
import { Footer } from "@/components/footer"
import {
  customDevelopmentRows,
  formatPrice,
  NGN_PER_USD,
  platformRows,
  retainers,
  workflowPlanRows,
  type Currency,
  type ServiceRow,
  type TierSpec,
  type WorkflowPlan,
} from "@/lib/plans"

const terms = [
  {
    title: "Payment",
    items: [
      "50% deposit to start - non-refundable",
      "Balance due on delivery, before final handover",
      "Late payments accrue 5% per month",
      "Prices exclusive of VAT and third-party costs",
    ],
  },
  {
    title: "Scope & Revisions",
    items: [
      "2 revision rounds included per project",
      "Extra revisions and out-of-scope work billed hourly",
      "Rush delivery +30%",
      "Client-caused delays extend the timeline",
    ],
  },
  {
    title: "Ownership & Delivery",
    items: [
      "Full IP and source transfer on final payment",
      "Hosting, domains and licenses billed separately",
      "14-day post-launch bug-fix warranty",
      "Ongoing upkeep via maintenance retainer",
    ],
  },
]

const rateCardTabs = [
  {
    id: "technology",
    label: "Technology",
    title: "Product, platform, and technical implementation",
    description: "For businesses that need websites, web apps, platforms, or technical implementation.",
  },
  {
    id: "workflows",
    label: "Growth",
    title: "Growth systems for existing tools",
    description: "For businesses that need their existing tools connected into clear growth systems.",
  },
  {
    id: "consulting",
    label: "Consulting",
    title: "Support, improvements, and technical guidance",
    description: "For businesses that need ongoing support, improvements, and technical guidance.",
  },
] as const

type RateCardTab = (typeof rateCardTabs)[number]["id"]

function RateTable({
  headers,
  rows,
  currency,
}: {
  headers: [string, string, string, string, string]
  rows: ServiceRow[]
  currency: Currency
}) {
  return (
    <div className="rate-table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.service}>
              <td>{row.service}</td>
              <td>{row.scope}</td>
              <td>{formatPrice(row.price, currency)}</td>
              <td>{row.timeline}</td>
              <td>{row.included}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function WorkflowTable({ rows, currency }: { rows: WorkflowPlan[]; currency: Currency }) {
  return (
    <div className="rate-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>Best For</th>
            <th>Price</th>
            <th>Timeline</th>
            <th>What&apos;s Included</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.service}>
              <td>{row.service}</td>
              <td>{row.outcome}</td>
              <td>{formatPrice(row.price, currency)}</td>
              <td>{row.timeline}</td>
              <td>{row.included}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TierSpecItem({ spec }: { spec: TierSpec }) {
  if ("text" in spec) return <>{spec.text}</>

  return (
    <>
      <strong>{spec.strong}</strong>
      {spec.rest ? ` ${spec.rest}` : ""}
    </>
  )
}

export function RateCardContent() {
  const [currency, setCurrency] = useState<Currency>("USD")
  const [activeTab, setActiveTab] = useState<RateCardTab>("technology")
  const currencySymbol = currency === "USD" ? "$" : "₦"
  const activeTabContent = rateCardTabs.find((tab) => tab.id === activeTab) ?? rateCardTabs[0]

  return (
    <>
      <style>{`
        .ratecard-page {
          --blue: var(--accent);
          --text: #111214;
          --muted: #555;
          --rule: #d8dce8;
          --table-border: #d4d8e4;
          --table-head-bg: #f2f4f9;
          background: #eeecea;
          min-height: 100vh;
          padding: 48px 20px 64px;
          color: var(--text);
          font-family: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
        }

        .ratecard-page * {
          box-sizing: border-box;
        }

        .ratecard-page .page {
          max-width: 816px;
          margin: 0 auto;
          background: #fff;
          border-radius: 3px;
          box-shadow: 0 2px 16px rgba(0, 0, 0, 0.09);
          padding: 52px 64px 56px;
        }

        .ratecard-page .header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 28px;
        }

        .ratecard-page .brand-lockup {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
        }

        .ratecard-page .brand-mark {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ratecard-page .brand-logo {
          height: 44px;
          width: auto;
        }

        .ratecard-page .brand-name {
          font-size: 30px;
          font-family: var(--font-poppins), ui-sans-serif, system-ui, sans-serif;
          font-weight: 700;
          letter-spacing: -0.035em;
          color: var(--text);
        }

        .ratecard-page .brand-tagline {
          font-size: 13.5px;
          color: #444;
        }

        .ratecard-page .doc-title {
          font-size: 30px;
          font-weight: 700;
          letter-spacing: -0.3px;
          line-height: 1;
          text-align: right;
        }

        .ratecard-page .header-rule,
        .ratecard-page .section-rule,
        .ratecard-page .footer-rule {
          border: none;
        }

        .ratecard-page .header-rule {
          border-top: 1.5px solid var(--blue);
          margin-bottom: 22px;
          opacity: 0.55;
        }

        .ratecard-page .section-rule,
        .ratecard-page .footer-rule {
          border-top: 1px solid var(--rule);
          margin-bottom: 28px;
        }

        .ratecard-page .currency-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 28px;
        }

        .ratecard-page .tab-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          padding: 6px;
          border: 1px solid var(--table-border);
          border-radius: 10px;
          background: #f3f2f0;
          margin-bottom: 24px;
        }

        .ratecard-page .tab-btn {
          appearance: none;
          border: none;
          border-radius: 7px;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.16em;
          padding: 12px 10px;
          text-align: left;
          text-transform: uppercase;
        }

        .ratecard-page .tab-btn.active {
          background: #fff;
          color: var(--text);
          box-shadow: 0 1px 5px rgba(0, 0, 0, 0.08);
        }

        .ratecard-page .currency-label {
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--muted);
        }

        .ratecard-page .currency-toggle {
          display: inline-flex;
          border: 1px solid var(--table-border);
          border-radius: 999px;
          padding: 3px;
          background: var(--table-head-bg);
        }

        .ratecard-page .currency-btn {
          appearance: none;
          border: none;
          background: transparent;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 999px;
          cursor: pointer;
          color: var(--muted);
        }

        .ratecard-page .currency-btn.active {
          background: var(--blue);
          color: #fff;
        }

        .ratecard-page .fx-note,
        .ratecard-page .disclaimer {
          font-size: 11px;
          font-style: italic;
          color: var(--muted);
        }

        .ratecard-page .rate-table-wrap {
          border: 1px solid var(--table-border);
          border-radius: 8px;
          overflow-x: auto;
          margin-bottom: 32px;
        }

        .ratecard-page table {
          width: 100%;
          border-collapse: collapse;
        }

        .ratecard-page thead tr {
          background: var(--table-head-bg);
        }

        .ratecard-page thead th {
          font-size: 11.5px;
          font-weight: 700;
          text-align: left;
          padding: 13px 14px;
          border-bottom: 1px solid var(--table-border);
          white-space: nowrap;
        }

        .ratecard-page tbody tr {
          border-bottom: 1px solid var(--table-border);
        }

        .ratecard-page tbody tr:last-child {
          border-bottom: none;
        }

        .ratecard-page tbody td {
          padding: 12px 13px;
          font-size: 12px;
          vertical-align: middle;
          border-left: 1px solid var(--table-border);
        }

        .ratecard-page tbody td:first-child,
        .ratecard-page thead th:first-child {
          border-left: none;
        }

        .ratecard-page tbody td:first-child {
          font-weight: 700;
        }

        .ratecard-page tbody td:nth-child(3),
        .ratecard-page tbody td:nth-child(4) {
          text-align: center;
          white-space: nowrap;
        }

        .ratecard-page .scope-note {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          font-size: 12.5px;
          font-style: italic;
          color: #4a4f5a;
          line-height: 1.45;
          margin: -16px 0 32px;
          padding: 13px 16px;
          background: #f6f8fc;
          border: 1px solid var(--rule);
          border-radius: 8px;
        }

        .ratecard-page .scope-note .icon,
        .ratecard-page .footer-icon {
          color: var(--blue);
          flex-shrink: 0;
        }

        .ratecard-page .section {
          margin-bottom: 28px;
        }

        .ratecard-page .lane {
          margin: 34px 0 20px;
        }

        .ratecard-page .lane:first-of-type {
          margin-top: 0;
        }

        .ratecard-page .lane-kicker {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--blue);
          margin-bottom: 8px;
        }

        .ratecard-page .lane-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .ratecard-page .lane-copy {
          color: var(--muted);
          font-size: 13px;
          line-height: 1.5;
          max-width: 560px;
          margin: 0;
        }

        .ratecard-page .section-title {
          font-size: 17px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .ratecard-page .section-accent {
          width: 44px;
          height: 3px;
          background: var(--blue);
          border-radius: 2px;
          margin-bottom: 14px;
        }

        .ratecard-page .tier-grid,
        .ratecard-page .terms-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .ratecard-page .tier-card,
        .ratecard-page .terms-group {
          border: 1px solid var(--table-border);
          border-radius: 8px;
          padding: 18px;
        }

        .ratecard-page .tier-card.featured {
          border-color: var(--blue);
          box-shadow: 0 0 0 1px var(--blue);
        }

        .ratecard-page .tier-flag {
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--blue);
          margin-bottom: 6px;
          min-height: 12px;
        }

        .ratecard-page .tier-name {
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 3px;
        }

        .ratecard-page .tier-price {
          font-size: 19px;
          font-weight: 700;
          color: var(--blue);
          margin-bottom: 14px;
        }

        .ratecard-page .tier-price small {
          font-size: 11px;
          font-weight: 500;
          color: var(--muted);
        }

        .ratecard-page .tier-specs,
        .ratecard-page .terms-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin: 0;
          padding: 0;
        }

        .ratecard-page .tier-specs {
          border-top: 1px solid var(--rule);
          padding-top: 13px;
        }

        .ratecard-page .tier-specs li,
        .ratecard-page .terms-list li {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 11.5px;
          line-height: 1.4;
        }

        .ratecard-page .tier-specs li::before,
        .ratecard-page .terms-list li::before {
          content: "";
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--blue);
          flex-shrink: 0;
          margin-top: 5px;
        }

        .ratecard-page .tech-list {
          font-size: 14px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px 14px;
        }

        .ratecard-page .tech-list span {
          color: var(--text);
        }

        .ratecard-page .terms-group h4 {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--blue);
          margin: 0 0 12px;
        }

        .ratecard-page .disclaimer {
          margin: 32px 0 22px;
          line-height: 1.5;
          color: #8a8f9a;
        }

        .ratecard-page .footer {
          display: flex;
          align-items: center;
          gap: 0;
        }

        .ratecard-page .footer-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13.5px;
          color: var(--text);
          flex: 1;
          justify-content: center;
        }

        .ratecard-page .footer-item:first-child {
          justify-content: flex-start;
        }

        .ratecard-page .footer-item:last-child {
          justify-content: flex-end;
        }

        .ratecard-page .footer-divider {
          width: 1px;
          height: 32px;
          background: var(--rule);
          flex-shrink: 0;
        }

        .ratecard-page .footer-item a {
          color: inherit;
          text-decoration: none;
        }

        .ratecard-page .footer-item a:hover {
          text-decoration: underline;
        }

        @media (max-width: 720px) {
          .ratecard-page {
            padding: 20px 12px 32px;
          }

          .ratecard-page .page {
            padding: 26px 18px 30px;
          }

          .ratecard-page .header,
          .ratecard-page .footer {
            flex-direction: column;
            align-items: flex-start;
          }

          .ratecard-page .doc-title {
            text-align: left;
          }

          .ratecard-page .tier-grid,
          .ratecard-page .terms-grid {
            grid-template-columns: 1fr;
          }

          .ratecard-page .tab-row {
            display: flex;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }

          .ratecard-page .tab-row::-webkit-scrollbar {
            display: none;
          }

          .ratecard-page .tab-btn {
            flex: 0 0 auto;
            min-width: 150px;
          }

          .ratecard-page .footer-divider {
            display: none;
          }

          .ratecard-page .footer-item,
          .ratecard-page .footer-item:first-child,
          .ratecard-page .footer-item:last-child {
            justify-content: flex-start;
          }
        }
      `}</style>

      <div className="min-h-screen bg-background">
        <main className="ratecard-page">
          <div className="page">
            <header className="header">
              <div className="brand-lockup">
                <div className="brand-mark">
                  <img className="brand-logo" src="/visualhqlogo.svg" alt="VisualHQ" />
                  <span className="brand-name">VisualHQ</span>
                </div>
                <p className="brand-tagline">Brand and Technology Solutions</p>
              </div>
              <h2 className="doc-title">Rate Card</h2>
            </header>

            <hr className="header-rule" />

            <div className="currency-row">
              <span className="currency-label">Currency</span>
              <div className="currency-toggle" role="group" aria-label="Currency">
                <button
                  type="button"
                  className={`currency-btn${currency === "USD" ? " active" : ""}`}
                  aria-pressed={currency === "USD"}
                  onClick={() => setCurrency("USD")}
                >
                  $ USD
                </button>
                <button
                  type="button"
                  className={`currency-btn${currency === "NGN" ? " active" : ""}`}
                  aria-pressed={currency === "NGN"}
                  onClick={() => setCurrency("NGN")}
                >
                  ₦ NGN
                </button>
              </div>
              <span className="fx-note">1 USD ≈ ₦{NGN_PER_USD.toLocaleString("en-NG")} - approximate, for reference only</span>
            </div>

            <div className="tab-row" role="tablist" aria-label="Rate card sections">
              {rateCardTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`tab-btn${activeTab === tab.id ? " active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="lane">
              <p className="lane-kicker">{activeTabContent.label}</p>
              <h3 className="lane-title">{activeTabContent.title}</h3>
              <p className="lane-copy">{activeTabContent.description}</p>
            </div>

            {activeTab === "technology" && (
              <>
                <div className="section">
                  <h4 className="section-title">Product Builds</h4>
                  <div className="section-accent" />
                </div>

                <RateTable
                  headers={["Service", "Scope", `Price (${currencySymbol})`, "Timeline", "What's Included"]}
                  rows={customDevelopmentRows}
                  currency={currency}
                />

                <div className="scope-note">
                  <CircleAlert className="icon" size={16} />
                  <span>
                    Prices apply within the scope shown. Marketplaces, streaming platforms, and apps with custom integrations
                    or heavy traffic fall under <strong>Custom Web App</strong> and are quoted after a scoping call.
                  </span>
                </div>

                <hr className="section-rule" />

                <div className="section">
                  <h4 className="section-title">Design</h4>
                  <div className="section-accent" />
                </div>

                <RateTable
                  headers={["Service", "Scope", `Price (${currencySymbol})`, "Timeline", "What's Included"]}
                  rows={platformRows}
                  currency={currency}
                />

                <hr className="section-rule" />

                <div className="section">
                  <h3 className="section-title">Technology Stack</h3>
                  <div className="section-accent" />
                  <div className="tech-list">
                    <span>React</span>
                    <span>Next.js</span>
                    <span>Tailwind CSS</span>
                    <span>Firebase</span>
                    <span>Vercel</span>
                    <span>Webflow</span>
                    <span>Framer</span>
                    <span>WordPress</span>
                  </div>
                </div>
              </>
            )}

            {activeTab === "workflows" && <WorkflowTable rows={workflowPlanRows} currency={currency} />}

            {activeTab === "consulting" && (
              <div className="section">
                <h4 className="section-title">Retainers</h4>
                <div className="section-accent" />
                <div className="tier-grid">
                  {retainers.map((tier) => (
                    <div key={tier.name} className={`tier-card${tier.featured ? " featured" : ""}`}>
                      <span className="tier-flag">{tier.flag || "\u00A0"}</span>
                      <div className="tier-name">{tier.name}</div>
                      <div className="tier-price">
                        {formatPrice({ amount: tier.amount }, currency)}
                        <small> /mo</small>
                      </div>
                      <ul className="tier-specs">
                        {tier.specs.map((spec) => (
                          <li key={"text" in spec ? spec.text : `${spec.strong}-${spec.rest ?? ""}`}>
                            <TierSpecItem spec={spec} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <hr className="section-rule" />

            <div className="section">
              <h3 className="section-title">Terms &amp; Conditions</h3>
              <div className="section-accent" />
              <div className="terms-grid">
                {terms.map((group) => (
                  <div key={group.title} className="terms-group">
                    <h4>{group.title}</h4>
                    <ul className="terms-list">
                      {group.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <p className="disclaimer">
              Prices are indicative and subject to change without prior notice. Final pricing is confirmed at the time of
              quotation and may be adjusted for project scope, exchange-rate movements, third-party costs, or other
              factors beyond VisualHQ's control.
            </p>

            <hr className="footer-rule" />

            <footer className="footer">
              <div className="footer-item">
                <MapPin className="footer-icon" size={18} />
                <span>Lagos and Middletown</span>
              </div>
              <div className="footer-divider" />
              <div className="footer-item">
                <Mail className="footer-icon" size={18} />
                <a href="mailto:hello@visualcns.com">hello@visualcns.com</a>
              </div>
              <div className="footer-divider" />
              <div className="footer-item">
                <Globe className="footer-icon" size={18} />
                <a href="https://visualcns.com" target="_blank" rel="noreferrer">
                  visualcns.com
                </a>
              </div>
            </footer>
          </div>
        </main>
        <Footer />
      </div>
    </>
  )
}
