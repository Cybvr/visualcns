export interface Capability {
  slug: string
  title: string
  description: string
  image?: string
  imageAlt?: string
  /** Long-form copy for the service detail page, one string per paragraph. */
  body?: string[]
  /** Service areas typically included in an engagement. */
  includes?: string[]
}

export const capabilities: Capability[] = [
  {
    slug: "brand-design",
    title: "Brand Design",
    description: "Codifying who and what your brand can be across every interaction to drive growth and delivery at scale.",
    image: "/services/brand-design.png",
    imageAlt: "Brand system in a website launch",
    body: [
      "A brand is what people see, read and feel every time they deal with you. We start by working out what yours stands for and who it is for, then turn that into a growth strategy the rest of the work can follow. From there we build the identity: the name, logo, type, colour and voice.",
      "Brands drift when the rules live in one designer's head. We write them down as a brand system, with an architecture that shows how your products and sub-brands fit together, so a new hire or an agency partner can make something on brand without asking. Where it helps, we build AI tools trained on those rules, so your team can draft on-brand copy and visuals when they need them.",
    ],
    includes: [
      "Growth strategy",
      "Brand identity",
      "Brand foundation",
      "Brand systems",
      "Brand architecture",
      "Brand AI tools",
    ],
  },
  {
    slug: "product-experience-design",
    title: "Product & Experience Design",
    description: "Reimagining how people interact with your brand through digital products and experiences that drive business and human impact.",
    image: "/services/product-experience-design.png",
    imageAlt: "Product team reviewing an early build",
    body: [
      "We design and build the digital products your customers use, starting with the vision: what problem the product solves, who it is for, and how you will know it is working. We prototype early and put it in front of real users before anyone writes production code, because changing a sketch is cheaper than changing a release.",
      "Our team covers web platforms, mobile apps and commerce, and we add AI to a product where it does a real job for the user. Every build comes with a design system, so the next feature looks and works like the last one and your own team can keep going after launch.",
    ],
    includes: [
      "Solutions design and consulting",
      "AI product strategy and development",
      "Product strategy and vision",
      "Commerce design",
      "Experience design and development",
      "Web and platform solutions",
      "Design systems",
      "Mobile product development",
    ],
  },
  {
    slug: "campaign-content-design",
    title: "Campaign & Content Design",
    description: "Creating connections and cultural relevance through storytelling that integrates technology, media, and design.",
    image: "/services/campaign-content-design.png",
    imageAlt: "Campaign creative and content system",
    body: [
      "Good campaigns start with what your audience already cares about. We plan the story across the channels they use, then design a campaign system of templates, rules and assets that lets one idea stretch from a billboard to a short social clip without falling apart.",
      "We produce the content as well, in-house and with creators and influencers who suit the brand. Once the campaign is live we watch the results, run our own research where the numbers raise questions, and change the creative while it is still running instead of waiting for the wrap-up report.",
    ],
    includes: [
      "Omnichannel marketing strategy",
      "Social and influencer activation",
      "Campaign design systems",
      "Global content production",
      "Integrated campaigns and platform development",
      "Custom research and creative optimization",
    ],
  },
  {
    slug: "crm-relationship-design",
    title: "CRM & Relationship Design",
    description: "Transforming one-time buyers into lifelong advocates with meaningful customer experiences that build trust, loyalty, and growth.",
    image: "/services/crm-relationship-design.png",
    imageAlt: "Connected customer relationship systems",
    body: [
      "Winning a customer is the expensive part, so it pays to keep them. We map the journey your customers actually take, group them by what they do rather than what a sign-up form says, and decide what each group should hear from you and when.",
      "Then we set up your CRM to do it, with lifecycle emails and messages, loyalty programmes, and offers that change with how each person behaves. We design the messages as one system so they all sound like the same brand, and we give your team the reports to see which programmes are paying off.",
    ],
    includes: [
      "CRM strategy and execution",
      "Customer journey mapping",
      "Customer segmentation and insights",
      "Customer engagement programs",
      "Loyalty strategy and programs",
      "Personalization",
      "Design systems for CRM",
      "Lifecycle marketing",
    ],
  },
  {
    slug: "visualcns-ventures",
    title: "VisualCNS Ventures",
    description: "Advancing innovation through access to emerging solutions, capabilities, and new product opportunities.",
    image: "/services/visualcns-ventures.png",
    imageAlt: "Team exploring a new product opportunity",
    body: [
      "Ventures is how we help companies try new things without betting the business on them. We look for emerging technology and product ideas that fit your market, then test the promising ones as small pilots with a clear goal and a fixed budget.",
      "When a pilot works, we keep building it with you in an innovation studio, and some ideas grow into products we incubate together. We also run innovation exchanges, where your team meets founders and specialists working on the problems you care about.",
    ],
    includes: [
      "Venture consulting",
      "Innovation exchanges",
      "Emerging technology scouting",
      "Pilot development",
      "Innovation studios",
      "Product incubation",
    ],
  },
  {
    slug: "ai-design",
    title: "AI Design",
    description: "Using AI to improve existing work and design new brand experiences that were not possible before.",
    image: "/services/ai-design.png",
    imageAlt: "AI tooling built around a team's workflow",
    body: [
      "A lot of AI projects end with a chatbot nobody uses. We start with your work instead: where your team loses hours, where customers wait, and where a model could do a job better than a form or a spreadsheet. Your AI strategy then rests on real tasks, not on the latest demo.",
      "Then we design and build the tools. That might be an AI application for your customers, a content studio that turns out on-brand copy and images for your marketing team, or brand AI tools that keep everything you generate in your voice. We put as much care into the screens and the limits as into the model, because people only trust AI they can understand and correct.",
    ],
    includes: [
      "AI application design",
      "AI content studio",
      "Brand AI tools",
      "AI strategy and consulting",
    ],
  },
  {
    slug: "commerce-design",
    title: "Commerce Design",
    description: "Designing digital commerce experiences that meet high technology expectations without losing brand storytelling or customer relationships.",
    image: "/marketing/website-launch.jpg",
    imageAlt: "Digital commerce experience at launch",
    body: [
      "Online shoppers expect search to find the right thing, checkout to be quick and the order to arrive when you said it would. We design product pages, carts, payments and accounts that work as well on a phone as on a laptop.",
      "Speed alone does not bring people back, though. We keep your brand's story in the shopping experience, in how products are shown and in the emails that follow a purchase, so buyers remember who they bought from and return.",
    ],
  },
]

export function getCapabilities(): Capability[] {
  return capabilities
}

export function getCapabilityBySlug(slug: string): Capability | undefined {
  return capabilities.find((capability) => capability.slug === slug)
}
