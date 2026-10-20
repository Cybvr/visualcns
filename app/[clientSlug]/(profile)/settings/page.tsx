import { AboutSection } from "@/components/company/sections/about-section"
import { CompanySettingsLayout } from "@/components/company/company-settings-layout"

export default function CompanySettingsPage() {
  return (
    <CompanySettingsLayout>
      <AboutSection singleColumn formStyle />
    </CompanySettingsLayout>
  )
}
