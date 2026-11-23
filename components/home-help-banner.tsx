import { Phone } from "lucide-react"
import { Button } from "@/components/ui/button"

const PHONE_DISPLAY = "+234 905 306 6692"
const PHONE_HREF = "tel:+2349053066692"

/* Help banner: a call-us card with the customer care photo on the right.
   The card takes the photo's grey so the picture blends into it. */
export function HomeHelpBanner() {
  return (
    <section aria-labelledby="home-help" className="py-14 md:py-20">
      <div className="relative grid overflow-hidden rounded-[0.75rem] bg-[#c6c8d2] text-[#0b0a2a] md:grid-cols-2">
        <div className="relative z-10 px-6 pb-4 pt-10 sm:px-10 md:py-16 md:pl-14 md:pr-0">
          <p className="text-sm font-medium tracking-[0.02em] text-[#0b0a2a]/70">VisualCNS Customer Care</p>
          <h2 id="home-help" className="mt-3 text-[clamp(2rem,5vw,3.25rem)] font-medium leading-none tracking-[-0.03em]">
            Got questions?
          </h2>
          <p className="mt-4 max-w-md text-base leading-7 text-[#0b0a2a]/80 md:text-lg md:leading-8">
            Call <a href={PHONE_HREF} className="font-medium text-[#0b0a2a] underline-offset-4 hover:underline">{PHONE_DISPLAY}</a>. Our team will help you,
            whether you&apos;re a customer or not.
          </p>
          <Button asChild size="lg" className="mt-7 rounded-full bg-[#0b0a2a] text-white hover:bg-[#0b0a2a]/90">
            <a href={PHONE_HREF}>
              <Phone className="size-4" aria-hidden="true" />
              Call us
            </a>
          </Button>
        </div>
        <div className="relative h-72 sm:h-80 md:h-auto md:min-h-[26rem]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/home/customer-care.jpg"
            alt="A VisualCNS customer care agent wearing a headset"
            loading="lazy"
            className="absolute inset-0 size-full object-cover object-[50%_15%] [mask-image:linear-gradient(to_right,transparent,black_18%)]"
          />
        </div>
      </div>
    </section>
  )
}
