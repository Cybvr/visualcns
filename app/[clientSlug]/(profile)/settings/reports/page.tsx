import { CompanySettingsLayout } from "@/components/company/company-settings-layout"
import { CompanySection } from "@/components/company/sections/company-section"

export default function CompanyReportsPage() {
  return (
    <CompanySettingsLayout wide>
      <div className="min-w-0">
        <CompanySection section="pulse" />
      </div>
    </CompanySettingsLayout>
  )
}
