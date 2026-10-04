"use client"
import { useEffect } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Clock, Mail, MapPin } from "lucide-react";
import Cal, { getCalApi } from "@calcom/embed-react";

export default function ContactPage() {
  useEffect(() => {
    (async function () {
      const cal = await getCalApi({ "namespace": "30min" });
      cal("ui", { "hideEventTypeDetails": false, "layout": "month_view" });
    })();
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <section className="pt-32 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-muted-foreground mb-4">Contact</p>
            <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-tight md:text-6xl">
              Let&apos;s start a <span className="text-accent">project</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Have a project in mind? We'd love to hear from you. Book a call below or reach out directly via email.
            </p>
          </div>
        </div>
      </section>
      <section className="px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            <div className="lg:col-span-2">
              <Cal
                namespace="30min"
                calLink="pinheirojide/30min"
                style={{ width: "100%", height: "100%", overflow: "scroll" }}
                config={{ "layout": "month_view" }}
              />
            </div>
            <div>
              <div className="bg-secondary p-8 rounded-lg mb-8">
                <h3 className="font-semibold text-lg mb-4">Prefer email?</h3>
                <a href="mailto:hello@visualcns.com" className="flex items-center gap-3 text-foreground hover:underline">
                  <Mail className="w-5 h-5" />
                  hello@visualcns.com
                </a>
              </div>
              <div className="bg-secondary p-8 rounded-lg mb-8">
                <h3 className="font-semibold text-lg mb-4">Location</h3>
                <div className="space-y-4 text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <address className="not-italic">
                      <span className="block font-medium text-foreground">Nigeria</span>
                      <span className="block">Plot 1 Block, Marwa Bus Stop</span>
                      <span className="block">128 Remi Olowude St, Lekki Phase I</span>
                      <span className="block">Lekki 105102, Lagos, Nigeria</span>
                    </address>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <address className="not-italic">
                      <span className="block font-medium text-foreground">United States</span>
                      <span className="block">30 N Gould St Ste R</span>
                      <span className="block">Sheridan, WY 82801</span>
                      <span className="block">USA</span>
                    </address>
                  </div>
                </div>
              </div>
              <div className="bg-secondary p-8 rounded-lg mb-8">
                <h3 className="font-semibold text-lg mb-4">Office hours</h3>
                <div className="flex items-start gap-3 text-muted-foreground">
                  <Clock className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Monday to Friday, 9am to 5pm</span>
                </div>
              </div>
              <div className="p-8 border border-border rounded-lg">
                <h3 className="font-semibold text-lg mb-2">What happens next?</h3>
                <ol className="space-y-3 text-muted-foreground text-sm">
                  <li className="flex gap-3">
                    <span className="font-semibold text-foreground">1.</span>
                    Book a convenient time slot
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-foreground">2.</span>
                    We'll discuss your project goals
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-foreground">3.</span>
                    Receive a tailored proposal within 48 hours
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}
