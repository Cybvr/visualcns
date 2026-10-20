import { CompanySettingsLayout } from "@/components/company/company-settings-layout"
import { CompanySection } from "@/components/company/sections/company-section"

export default function CompanyAnalyticsPage() {
  return (
    <CompanySettingsLayout wide>
      <div className="min-w-0">
        <CompanySection section="analytics" />
      </div>
    </CompanySettingsLayout>
  )
}
