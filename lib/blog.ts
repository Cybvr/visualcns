// A section of an original, VisualCNS-authored blog post. Curated posts omit
// `body` and link out to the source; our own pieces carry the full text here.
export interface BlogSection {
  heading?: string
  paragraphs: string[]
  // Bullet points shown after the paragraphs.
  list?: string[]
}

export interface BlogPost {
  slug: string
  title: string
  excerpt: string
  categories: string[]
  source: string
  author: string
  date: string
  readTime?: string
  url: string
  image?: string
  imageAlt?: string
  imageCredit?: string
  imagePosition?: string
  // When present, the detail page renders this in full instead of linking out.
  body?: BlogSection[]
}

export const blogPosts: BlogPost[] = [
  {
    slug: "why-most-businesses-still-look-invisible-online",
    title: "Why Most Businesses Still Look Invisible Online (And How to Fix It Fast)",
    excerpt:
      "Most businesses think they have an online presence because they have a website, an Instagram account, and a Google listing. Then they wonder why customers still can’t find them.",
    categories: ["Digital marketing"],
    source: "VisualCNS",
    author: "VisualCNS Editorial",
    date: "November 21, 2026",
    readTime: "2 min read",
    url: "/blog/why-most-businesses-still-look-invisible-online",
    image: "/blog/why-most-businesses-still-look-invisible-online.webp",
    imageAlt: "Ngai the capybara looking at a faded map pin through a magnifying glass",
    body: [
      {
        paragraphs: [
          "The problem is rarely that they have zero presence. It’s that the presence they have is incomplete, inconsistent, or quietly broken.",
          "Missing opening hours. An outdated phone number. A Google Business Profile that hasn’t been touched in months. Social accounts that post once every three weeks. A website that loads slowly on mobile. These small gaps add up. When someone searches for what you offer, Google and AI tools look for clear, consistent signals. Incomplete ones get pushed down.",
          "The fix is not complicated, but it has to be systematic.",
        ],
      },
      {
        paragraphs: [
          "Start by checking the basics:",
        ],
        list: [
          "Is your Google Business Profile complete and accurate?",
          "Do your website, social profiles, and Google listing all show the same name, address, and phone number?",
          "Are you responding to reviews?",
          "Is your website fast and mobile-friendly?",
        ],
      },
      {
        paragraphs: [
          "Most businesses can surface the biggest issues in under ten minutes if they know where to look. The ones that treat this as ongoing maintenance, rather than a one-time task, stay visible. The ones that set it and forget it slowly disappear from search results and maps.",
          "Visibility is not about being everywhere. It’s about being clear, consistent, and present where customers actually look.",
        ],
      },
    ],
  },
  {
    slug: "the-quiet-power-of-answering-every-review",
    title: "The Quiet Power of Answering Every Review",
    excerpt:
      "Most businesses treat reviews as a score to protect. The smart ones treat them as a conversation.",
    categories: ["Digital marketing"],
    source: "VisualCNS",
    author: "VisualCNS Editorial",
    date: "November 21, 2026",
    readTime: "2 min read",
    url: "/blog/the-quiet-power-of-answering-every-review",
    image: "/blog/the-quiet-power-of-answering-every-review.webp",
    imageAlt: "A five-star review bubble with a green reply tick",
    body: [
      {
        paragraphs: [
          "Replying to every review, good and bad, does three things at once. It shows future customers that a real person is paying attention. It improves how Google and other platforms view your listing. And it turns a passive rating into an active signal of care.",
          "The data is consistent: people notice when businesses reply. A thoughtful response to a negative review often softens the damage. A short thank-you on a positive one reinforces the good experience. Silence, on the other hand, reads as indifference.",
          "The barrier is usually time. A busy owner cannot sit down every day and craft replies. That is why many now use tools that draft responses in their brand voice, so the owner only has to review and send.",
          "You do not need perfect replies. You need consistent ones. A short, genuine response is better than none. Over time, that habit becomes one of the quietest competitive advantages a local business can have.",
        ],
      },
    ],
  },
  {
    slug: "your-google-business-profile-is-working-for-or-against-you",
    title: "Your Google Business Profile Is Either Working For You or Against You",
    excerpt:
      "Your Google Business Profile is not a listing. It is the front door of your business online.",
    categories: ["Digital marketing"],
    source: "VisualCNS",
    author: "VisualCNS Editorial",
    date: "November 21, 2026",
    readTime: "2 min read",
    url: "/blog/your-google-business-profile-is-working-for-or-against-you",
    image: "/blog/your-google-business-profile-is-working-for-or-against-you.webp",
    imageAlt: "A small shopfront with an open door and a map pin above it",
    body: [
      {
        paragraphs: [
          "When someone searches for a product or service near them, Google decides which businesses to show based on relevance, distance, and prominence. Your profile is the main source of those signals. An incomplete or neglected profile quietly works against you.",
          "The highest-impact items are still the basics:",
        ],
        list: [
          "Correct primary category",
          "Accurate address and service area",
          "Up-to-date opening hours",
          "Recent photos",
          "A steady flow of reviews with replies",
        ],
      },
      {
        paragraphs: [
          "Many businesses set the profile up once and never return to it. Categories stay too broad. Hours go out of date. Photos become old. Reviews pile up unanswered. Each of these small failures reduces visibility.",
          "The businesses that treat the profile as a living asset (updating it, responding, adding posts, keeping information current) see the difference in map rankings and direct enquiries. The ones that ignore it slowly lose ground to competitors who simply stay consistent.",
          "If you have not looked at your Google Business Profile in the last 30 days, that is the first place to start.",
        ],
      },
    ],
  },
  {
    slug: "stop-letting-social-media-steal-your-week",
    title: "Stop Letting Social Media Steal Your Week",
    excerpt:
      "Social media is useful. It is also one of the easiest ways for a small team to lose hours every week.",
    categories: ["Social media marketing"],
    source: "VisualCNS",
    author: "VisualCNS Editorial",
    date: "November 21, 2026",
    readTime: "2 min read",
    url: "/blog/stop-letting-social-media-steal-your-week",
    image: "/blog/stop-letting-social-media-steal-your-week.webp",
    imageAlt: "Ngai the capybara relaxing with a cup of tea beside a desk calendar",
    body: [
      {
        paragraphs: [
          "The pattern is familiar: open the apps, scroll, try to think of something to post, write a caption, second-guess it, post it, then check for engagement. Multiply that across platforms and the time disappears.",
          "The businesses that stay consistent without burning out usually do two things. They decide in advance what kinds of posts they will make (product, customer stories, tips, behind-the-scenes). And they batch the work instead of doing it daily.",
          "AI tools have made the second part easier. You can generate a week or two of draft posts in a short session, edit them to sound like you, and schedule them. The daily pressure drops. You still stay visible, but you are no longer reacting every morning.",
          "Consistency beats volume. A business that posts three solid times a week for months will outperform one that posts daily for two weeks and then goes quiet. The goal is not to be on social media all the time. The goal is to show up regularly without letting it run your schedule.",
        ],
      },
    ],
  },
  {
    slug: "what-a-proper-online-presence-score-shows-you",
    title: "What Happens When You Finally Get a Proper Online Presence Score",
    excerpt:
      "Most business owners have a vague sense of how they look online. Very few have a clear, prioritised list of what is actually holding them back.",
    categories: ["Digital marketing"],
    source: "VisualCNS",
    author: "VisualCNS Editorial",
    date: "November 21, 2026",
    readTime: "2 min read",
    url: "/blog/what-a-proper-online-presence-score-shows-you",
    image: "/blog/what-a-proper-online-presence-score-shows-you.webp",
    imageAlt: "A score gauge with the needle pointing to green",
    body: [
      {
        paragraphs: [
          "An online presence score changes that. Instead of guessing, you get a concrete assessment across the places that matter: search visibility, Google Business Profile health, website performance, social activity, and review patterns. More importantly, you get a short list of what to fix first.",
          "The value is not the number itself. It is the clarity. Suddenly the work becomes sequential instead of overwhelming. Fix the missing hours. Reply to the unanswered reviews. Improve the slow mobile page. Update the outdated photos. Each fix is small. The cumulative effect is not.",
          "Businesses that run this kind of check regularly tend to stay ahead of problems. The ones that never measure often only notice the gaps when enquiries slow down or a competitor starts appearing higher in search.",
          "You cannot improve what you do not measure. A clear score and a short action list remove the guesswork.",
        ],
      },
    ],
  },
  {
    slug: "from-idea-to-live-website-without-a-designer",
    title: "From Idea to Live Website Without Hiring a Designer",
    excerpt:
      "A lot of good businesses stay invisible longer than they should because the website feels like a big, expensive project.",
    categories: ["Digital marketing"],
    source: "VisualCNS",
    author: "VisualCNS Editorial",
    date: "November 21, 2026",
    readTime: "2 min read",
    url: "/blog/from-idea-to-live-website-without-a-designer",
    image: "/blog/from-idea-to-live-website-without-a-designer.webp",
    imageAlt: "Ngai the capybara holding a laptop showing a simple web page",
    body: [
      {
        paragraphs: [
          "It does not have to be. The current generation of tools lets you describe what the business does in plain language and get a working site in return. You can then edit it the same way, by saying what you want changed instead of learning design software.",
          "This does not replace thoughtful design for complex brands. It does remove the barrier for businesses that simply need a clean, credible online home quickly. Pages, basic copy, contact details, and structure can be generated and refined without a long agency process.",
          "The practical advantage is speed. A founder can go from idea to a live, professional-looking site in hours rather than weeks. That matters when you need to start collecting enquiries, testing messaging, or simply looking established.",
          "The website is no longer the bottleneck it used to be. The only remaining question is whether you treat it as a living part of the business or as a one-time task you never revisit.",
        ],
      },
    ],
  },
  {
    slug: "a-brand-is-more-than-a-logo",
    title: "A brand is more than a logo",
    excerpt:
      "A logo helps people recognise a business. It does not explain what the business believes, how it behaves, or why someone should trust it. That work comes from a clear brand system.",
    categories: ["Brand design"],
    source: "VisualCNS",
    author: "VisualCNS Editorial",
    date: "August 30, 2026",
    readTime: "5 min read",
    url: "/blog/a-brand-is-more-than-a-logo",
    image: "/services/brand-design.png",
    imageAlt: "Black woman sketching brand ideas at a desk",
    body: [
      {
        heading: "Start with the decision",
        paragraphs: [
          "A useful brand system begins with a choice. Who are you trying to reach, what do you want them to understand, and what should they feel confident doing next? Those questions give the visual work somewhere to go.",
          "Without that clarity, a brand can look polished and still feel interchangeable. The colours, type, images, and language need to point in the same direction.",
        ],
      },
      {
        heading: "Make it easy to use",
        paragraphs: [
          "The best brand guidelines are practical. They help a team make a landing page, write a social post, present a proposal, or brief a new designer without starting from zero each time.",
          "That means showing the system in real situations, not only collecting swatches and logo rules in a document nobody opens.",
        ],
      },
    ],
  },
  {
    slug: "good-product-design-removes-small-moments-of-doubt",
    title: "Good product design removes small moments of doubt",
    excerpt:
      "People notice product friction in small ways: a button that does not say what it does, a form that asks for too much, or a screen that leaves them wondering what happens next.",
    categories: ["Product and experience design"],
    source: "VisualCNS",
    author: "VisualCNS Editorial",
    date: "August 28, 2026",
    readTime: "6 min read",
    url: "/blog/good-product-design-removes-small-moments-of-doubt",
    image: "/services/product-experience-design.png",
    imageAlt: "Black man reviewing wireframes on a laptop",
    body: [
      {
        heading: "Clarity is part of the experience",
        paragraphs: [
          "A product does not need to explain every detail at once. It does need to make the next useful action obvious. Clear labels, sensible defaults, and feedback after an action do more for trust than extra decoration.",
          "This is why product design starts with the work a person is trying to finish. The interface should support that work instead of making people learn the interface first.",
        ],
      },
      {
        heading: "Test the parts people skip",
        paragraphs: [
          "Teams often test the happy path and miss the moments around it. What happens when someone changes their mind, enters an unusual value, loses connection, or returns a week later?",
          "Those edges are where confidence is won. A good experience gives people a clear way forward when the first attempt does not go to plan.",
        ],
      },
    ],
  },
  {
    slug: "campaigns-need-somewhere-to-go",
    title: "Campaigns need somewhere to go",
    excerpt:
      "A strong campaign can earn attention and still underperform if the landing page, follow-up, or next step does not carry the idea forward.",
    categories: ["Campaign and content design"],
    source: "VisualCNS",
    author: "VisualCNS Editorial",
    date: "August 26, 2026",
    readTime: "5 min read",
    url: "/blog/campaigns-need-somewhere-to-go",
    image: "/services/campaign-content-design.png",
    imageAlt: "Black woman reviewing campaign layouts",
    body: [
      {
        heading: "The idea has to survive the handoff",
        paragraphs: [
          "A campaign rarely lives in one format. The thought needs to make sense in a short video, a social post, a landing page, and the message someone receives after they respond.",
          "That does not mean every asset should look identical. It means the audience should recognise the same point of view wherever they meet it.",
        ],
      },
      {
        heading: "Plan the next step early",
        paragraphs: [
          "Before a campaign goes live, decide what attention is meant to become. Is the next step a conversation, a sign-up, a visit, or a useful piece of information?",
          "When that answer is clear, creative and conversion work stop competing with each other. They become parts of the same experience.",
        ],
      },
    ],
  },
  {
    slug: "customer-relationships-live-in-the-handoffs",
    title: "Customer relationships live in the handoffs",
    excerpt:
      "Customers experience a business through the spaces between teams. A missed reply, repeated question, or broken promise can undo the care shown everywhere else.",
    categories: ["CRM and relationship design"],
    source: "VisualCNS",
    author: "VisualCNS Editorial",
    date: "August 24, 2026",
    readTime: "5 min read",
    url: "/blog/customer-relationships-live-in-the-handoffs",
    image: "/services/crm-relationship-design.png",
    imageAlt: "Two Black colleagues discussing a customer workflow",
    body: [
      {
        heading: "Map what the customer actually sees",
        paragraphs: [
          "A CRM is more than a place to store names. It is the record that helps a team remember what was promised, what has happened, and what needs attention next.",
          "Start by following a real customer journey from first contact to follow-up. The gaps usually become visible quickly, especially where one person or system hands work to another.",
        ],
      },
      {
        heading: "Keep the human part visible",
        paragraphs: [
          "Automation is useful when it removes waiting and repetition. It becomes frustrating when a person cannot reach someone, correct an error, or get an answer that fits their situation.",
          "The goal is a smoother relationship, not a louder sequence of messages. Every automated step should make the next human decision easier.",
        ],
      },
    ],
  },
  {
    slug: "not-every-good-idea-needs-to-become-a-company",
    title: "Not every good idea needs to become a company",
    excerpt:
      "An early idea needs a useful test before it needs a name, a pitch deck, or a full product. Small experiments can reveal whether the problem is real and worth pursuing.",
    categories: ["VisualCNS Ventures"],
    source: "VisualCNS",
    author: "VisualCNS Editorial",
    date: "August 22, 2026",
    readTime: "4 min read",
    url: "/blog/not-every-good-idea-needs-to-become-a-company",
    image: "/services/visualcns-ventures.png",
    imageAlt: "Black man looking out from a loft window",
    body: [
      {
        heading: "Find the smallest honest test",
        paragraphs: [
          "The first question is not whether an idea sounds exciting. It is whether someone has the problem, recognises it, and will change their behaviour to solve it.",
          "A conversation, prototype, or manual version of the service can teach you more than a long planning cycle. The test should be small enough to run and clear enough to learn from.",
        ],
      },
      {
        heading: "Keep the option open",
        paragraphs: [
          "A test does not need to prove the whole future. It only needs to show what deserves another step and what should be left alone for now.",
          "That discipline protects good ideas from being buried under premature complexity. It also leaves room to change the shape of the opportunity as you learn.",
        ],
      },
    ],
  },
  {
    slug: "ai-works-best-when-the-workflow-is-clear",
    title: "AI works best when the workflow is clear",
    excerpt:
      "Adding AI to a messy process usually creates a faster version of the same mess. The better starting point is to understand the work, the decisions, and the places where people lose time.",
    categories: ["AI design"],
    source: "VisualCNS",
    author: "VisualCNS Editorial",
    date: "August 20, 2026",
    readTime: "6 min read",
    url: "/blog/ai-works-best-when-the-workflow-is-clear",
    image: "/services/ai-design.png",
    imageAlt: "Black woman working with an AI interface on a laptop",
    body: [
      {
        heading: "Start with the work, not the tool",
        paragraphs: [
          "A useful AI feature begins with a job that already exists. Where does someone gather information, compare options, write a first draft, or repeat the same update across tools?",
          "Once that path is visible, it becomes easier to decide where AI can help and where a person should remain in control.",
        ],
      },
      {
        heading: "Design for review",
        paragraphs: [
          "People need to know what the system did, what it used, and what they can change. Review is not a failure of automation. It is part of making the result useful and trustworthy.",
          "The strongest AI experiences make the work lighter without hiding the important decisions behind a black box.",
        ],
      },
    ],
  },
  {
    slug: "effective-ways-to-boost-your-visibility-with-influencers",
    title: "How to Work with Influencers Without Wasting Your Budget",
    excerpt:
      "Influencer work is less about finding the biggest audience and more about finding a creator whose audience already cares about the problem your brand solves.",
    categories: ["Influencer marketing"],
    source: "VisualCNS",
    author: "VisualCNS",
    date: "August 26, 2026",
    readTime: "5 min read",
    url: "/blog/effective-ways-to-boost-your-visibility-with-influencers",
    image: "/blog/effective-ways-to-boost-your-visibility-with-influencers.png",
    imageAlt: "Black influencer filming an unboxing in a sunlit apartment",
    body: [
      {
        heading: "Choose the right kind of attention",
        paragraphs: [
          "Follower count is a quick way to compare creators, but it says little about whether the partnership will make sense. Start with the audience. What do they come to this person for, and does that overlap with the question your brand can answer?",
          "A smaller creator with a clear point of view can be a better fit than a large account whose audience expects something else. Relevance gives the work a chance to feel like a recommendation instead of an interruption.",
        ],
      },
      {
        heading: "Give the creator a real brief",
        paragraphs: [
          "The brief should explain the job, the audience, the useful proof, and the action you want people to take. It should also leave room for the creator to use their own language and format.",
          "People follow creators for their judgment and personality. A script that removes both usually produces an ad that feels out of place. Clear boundaries help the creator make the idea their own without losing the point.",
        ],
      },
      {
        heading: "Plan the handoff",
        paragraphs: [
          "Attention has to lead somewhere. Make sure the landing page, offer, sign-up flow, or sales conversation picks up the same idea the creator introduced.",
          "Then look past views. Track the actions that matter to the campaign, read the comments for objections, and use what you learn to improve the next brief.",
        ],
      },
    ],
  },
  {
    slug: "types-of-media-buying",
    title: "Media Buying Explained: Where Should Your Ads Run?",
    excerpt:
      "Media buying is the work of choosing and purchasing the places where people will meet your campaign. The right mix depends on the audience, the message, and the action that comes next.",
    categories: ["Media buying"],
    source: "VisualCNS",
    author: "VisualCNS",
    date: "August 25, 2026",
    readTime: "6 min read",
    url: "/blog/types-of-media-buying",
    image: "/blog/types-of-media-buying.png",
    imageAlt: "Digital billboard and campaign placements above a busy Lagos street",
    body: [
      {
        heading: "Start with the audience",
        paragraphs: [
          "Media buying starts before a placement is chosen. Ask where the audience already spends time, what they are doing there, and how much attention the message needs.",
          "A short offer may work in a fast, repeated format. A more involved decision may need a place where people have time to read, compare, or ask questions.",
        ],
      },
      {
        heading: "Know what each channel can do",
        paragraphs: [
          "Television and radio can build broad familiarity. Outdoor can put a simple message into a specific place. Digital placements can be adjusted as people respond and can lead directly to a next step.",
          "These channels are not interchangeable. Treat each one as part of a job, then connect the jobs so the campaign feels like one experience wherever it appears.",
        ],
      },
      {
        heading: "Buy for the outcome",
        paragraphs: [
          "A low price does not make a placement efficient if it reaches the wrong people. Compare opportunities by the audience you can reach, the quality of the attention, and the action the placement supports.",
          "Keep a record of what was bought and what happened after it ran. That history gives the next campaign a better starting point than guesswork.",
        ],
      },
    ],
  },
  {
    slug: "traditional-vs-digital-media-buying-the-best-fit-for-your-brand",
    title: "Traditional or Digital Ads: Which Fits Your Brand?",
    excerpt:
      "Traditional and digital media solve different parts of the same problem. The better choice depends on the audience you need, the story you are telling, and how quickly you need to learn.",
    categories: ["Media buying"],
    source: "VisualCNS",
    author: "VisualCNS",
    date: "August 20, 2026",
    readTime: "7 min read",
    url: "/blog/traditional-vs-digital-media-buying-the-best-fit-for-your-brand",
    image: "/blog/traditional-vs-digital-media-buying.png",
    imageAlt: "Newspaper and smartphone showing the same fictional campaign",
    body: [
      {
        heading: "The choice follows the job",
        paragraphs: [
          "If the job is to make a brand familiar across a place or a broad audience, television, radio, print, and outdoor can provide useful reach. They put the message into shared public spaces and routines.",
          "If the job is to test a message, reach a defined group, or move someone straight to a page, digital can offer more control. The channel should follow the job rather than a preference for one format.",
        ],
      },
      {
        heading: "Use the strengths together",
        paragraphs: [
          "A campaign does not have to choose one side. A broad placement can create recognition, while digital content gives interested people a way to learn more or take action.",
          "The connection needs to be deliberate. Carry the same promise, visual cue, or phrase across the campaign so people know they have found the right next step.",
        ],
      },
      {
        heading: "Leave room to learn",
        paragraphs: [
          "Digital reporting can show which messages and audiences are responding. Traditional media still needs a plan for learning through response codes, search behaviour, direct enquiries, or changes in demand.",
          "Good planning makes room for both kinds of evidence. The goal is a clearer decision about the next spend, not a report full of numbers that nobody uses.",
        ],
      },
    ],
  },
  {
    slug: "media-buying-strategies-to-maximise-advertising-roi",
    title: "How to Get More from Your Ad Budget",
    excerpt:
      "A bigger media budget cannot fix an unclear audience, a weak offer, or a broken next step. Better returns start with a campaign that gives every placement a clear job.",
    categories: ["Media buying"],
    source: "VisualCNS",
    author: "VisualCNS",
    date: "August 18, 2026",
    readTime: "7 min read",
    url: "/blog/media-buying-strategies-to-maximise-advertising-roi",
    image: "/blog/media-buying-strategies-to-maximise-advertising-roi.png",
    imageAlt: "Media strategist reviewing campaign dashboards at a cluttered desk",
    body: [
      {
        heading: "Make the objective specific",
        paragraphs: [
          "A campaign cannot be judged well if every placement is expected to do everything. Decide whether the priority is familiarity, qualified enquiries, visits, sales, or another concrete action.",
          "The objective shapes the audience, the creative, the channel mix, and the way results are read. It also makes it easier to stop spending on work that is busy but not useful.",
        ],
      },
      {
        heading: "Spend where the message can work",
        paragraphs: [
          "Cheap inventory is expensive when the audience is wrong or the placement gives the message no chance to land. Look at context, attention, frequency, and the quality of the next step together.",
          "Keep the number of moving parts manageable. A smaller set of placements with a clear role is easier to learn from than a wide spread of activity that nobody can explain.",
        ],
      },
      {
        heading: "Read results as decisions",
        paragraphs: [
          "A report should tell the team what to keep, what to change, and what to stop. Compare the response from different audiences and messages, then connect that response to the business outcome that matters.",
          "Use the findings to improve the next round before the memory of the campaign disappears. That is how a budget gets more useful over time.",
        ],
      },
    ],
  },
  {
    slug: "media-planning-and-media-buying-understanding-the-key-differences",
    title: "Media Planning vs Media Buying: What's the Difference?",
    excerpt:
      "Media planning decides who the campaign needs to reach and how the work should fit together. Media buying turns that plan into real placements, dates, and spend.",
    categories: ["Campaign and content design", "Media buying"],
    source: "VisualCNS",
    author: "VisualCNS",
    date: "August 17, 2026",
    readTime: "6 min read",
    url: "/blog/media-planning-and-media-buying-understanding-the-key-differences",
    image: "/blog/media-planning-and-media-buying.png",
    imageAlt: "Two colleagues planning media placements around a table",
    body: [
      {
        heading: "Planning asks the bigger questions",
        paragraphs: [
          "A media plan sets the direction. It describes the audience, the campaign objective, the role of each channel, the timing, and the evidence the team will use to judge the work.",
          "It also forces useful choices. A campaign with limited attention and money needs to know which audience matters most and which message deserves the strongest support.",
        ],
      },
      {
        heading: "Buying makes the plan real",
        paragraphs: [
          "Buying covers the practical work of finding inventory, negotiating placements, booking dates, managing delivery, and checking that the campaign appears as agreed.",
          "Good buying brings information back to the plan. Availability, pricing, audience quality, and early response may show that a channel or placement needs to change.",
        ],
      },
      {
        heading: "Keep both teams close",
        paragraphs: [
          "Planning without careful buying can produce a smart strategy that never reaches the right people. Buying without planning can produce activity with no clear reason behind it.",
          "The best work keeps the two conversations connected from the first brief through the final report. Strategy guides the spend, and the spend teaches the strategy.",
        ],
      },
    ],
  },
  {
    slug: "why-your-brands-social-media-isnt-working",
    title: "Why Your Social Media Isn't Working",
    excerpt:
      "Posting more often will not fix a social channel that has no clear audience, point of view, or reason for people to return. Start with the job the channel needs to do.",
    categories: ["Digital marketing", "Social media marketing"],
    source: "VisualCNS",
    author: "VisualCNS",
    date: "August 10, 2026",
    readTime: "8 min read",
    url: "/blog/why-your-brands-social-media-isnt-working",
    image: "/blog/why-your-brands-social-media-isnt-working.png",
    imageAlt: "Black founder checking her phone in a small product boutique",
    body: [
      {
        heading: "Give the channel a job",
        paragraphs: [
          "A social feed can help a brand explain its offer, answer questions, show how it works, build familiarity, or support a campaign. It does not need to do all of these things in every post.",
          "Choose the job that matters most right now. A clearer purpose makes decisions about topics, formats, and calls to action much easier.",
        ],
      },
      {
        heading: "Make the content recognisable",
        paragraphs: [
          "People should be able to tell what a brand cares about from more than its logo. Use a consistent point of view, a useful level of detail, and a voice that sounds like the people behind the business.",
          "The feed also needs enough variety to stay useful. Teach something, answer a real question, show the work, and give people a reason to continue the conversation.",
        ],
      },
      {
        heading: "Listen before you optimise",
        paragraphs: [
          "Reach and likes can show whether a post travelled, but they do not always explain why it mattered. Read replies, saves, direct messages, and the questions people ask before deciding what to make next.",
          "A healthy channel gets clearer as the team learns. Review a small set of posts together, keep what helped the audience, and drop the habits that only create noise.",
        ],
      },
    ],
  },
  // News — formerly the standalone /news section, now a blog category.
  {
    slug: "africa-agentic-ai-role",
    title: "Africa's part in agentic AI: the continent isn't just a market, it's a builder",
    excerpt:
      "Agentic AI — software that reasons, plans, and acts on its own — is reshaping how products get built. Africa's young, mobile-first, multilingual talent base gives the continent a distinct role in that shift: not only as a place agents are deployed, but as a place they are designed, trained, and governed.",
    categories: ["News"],
    source: "VisualCNS",
    author: "VisualCNS Editorial",
    date: "August 12, 2026",
    url: "/blog/africa-agentic-ai-role",
    image: "/blog/africa-agentic-ai-role.jpg",
    imageAlt: "Three young engineers watching an AI agent run on a monitor in a Lagos office",
    imageCredit: "VisualCNS",
    body: [
      {
        paragraphs: [
          "For most of the last decade, Africa's story in artificial intelligence was told in the language of adoption: which markets would take up the tools built elsewhere, how fast, and at what price. Agentic AI changes the frame. When software can reason through a goal, break it into steps, call other tools, and act with limited supervision, the interesting question stops being who uses the agent and becomes who designs, trains, and governs it. On that question, the continent has more to offer than it is usually credited for.",
          "The shift is real and it is fast. Agents now draft code, reconcile invoices, triage support queues, and run multi-step research that once needed a team. What they still lack is judgment about context — the local language a customer actually speaks, the payment rail that actually clears, the regulatory line that actually matters. That context is exactly where African builders have an edge that no amount of compute buys.",
        ],
      },
      {
        heading: "A demographic and mobile-first advantage",
        paragraphs: [
          "Africa is the youngest continent on earth, with a median age under twenty and the fastest-growing pool of working-age people anywhere. That is not just a consumer statistic; it is a supply of engineers, annotators, product thinkers, and operators entering the field at the precise moment agentic systems need human oversight to be safe and useful.",
          "It is also a market that skipped the desktop era. Products here were born mobile, born low-bandwidth, and born around money that moves through a phone. Builders who cut their teeth making software work under those constraints tend to design agents that are frugal, resilient, and honest about failure — qualities that matter far beyond Lagos or Nairobi.",
        ],
      },
      {
        heading: "Language, data, and the problem of context",
        paragraphs: [
          "There are more than two thousand languages spoken across Africa, and the overwhelming majority are underserved by today's models. That gap is often described as a weakness. It is better understood as an unclaimed frontier. The teams that assemble high-quality datasets, evaluation benchmarks, and fine-tuned agents for Yoruba, Swahili, Amharic, Hausa, or Zulu are not doing charity work — they are building the moats that make an agent genuinely useful to hundreds of millions of people.",
          "Ownership of that data is the strategic question. An agent trained on African context, hosted on infrastructure the continent controls, serving users in their own language, is a fundamentally different asset from one rented wholesale from abroad. The choice between the two is being made right now, in procurement decisions and open-source contributions that rarely make headlines.",
        ],
      },
      {
        heading: "The real constraints",
        paragraphs: [
          "None of this is inevitable. Compute remains scarce and expensive; reliable power and connectivity are uneven; capital for deep-tech is thinner than in other regions; and a genuine risk exists that the continent is positioned only as a source of cheap data labeling rather than as an owner of the systems that data trains. Agentic AI can widen inequality as easily as it narrows it.",
          "The path through those constraints is not to wait for perfect infrastructure. It is to build narrow, high-value agents for concrete local problems — logistics, agriculture, health triage, financial inclusion, public services — and to keep the data, the evaluation, and the governance close to home. Depth in a domain beats breadth on a leaderboard.",
        ],
      },
      {
        heading: "Building from here",
        paragraphs: [
          "This is the bet we are making at VisualCNS. We build software systems and AI tools from Lagos, and we run product businesses of our own — which means we deploy agents against our own problems before we ship them for anyone else. That posture keeps us honest about what these systems can and cannot do, and it keeps the context where it belongs: with the people who understand the ground.",
          "Africa's part in agentic AI will not be handed to it. But the ingredients — young talent, mobile-native instincts, untapped linguistic depth, and hard problems worth solving — are already here. The work is to build, own, and govern, rather than to wait and adopt.",
        ],
      },
    ],
  },
  {
    slug: "firms-donate-animal-farm-lagos-students",
    title: "AcademyPress and Ekenua&Co donate 1,500 copies of Animal Farm to Lagos students",
    excerpt:
      "Academy Press Plc and Ekenua & Co. Limited distributed 1,500 copies of George Orwell’s Animal Farm to students at three Lagos secondary schools, launching the Million Classics Programme to promote reading and critical thinking.",
    categories: ["News"],
    source: "The Guardian Nigeria",
    author: "Isaac Chibuife",
    date: "July 11, 2026",
    url: "https://guardian.ng/news/firms-donate-1500-copies-of-animal-farm-to-lagos-students/",
    image: "/news/animal-farm-lagos-students.jpg",
    imageAlt: "Secondary school students walking together on a school campus",
    imageCredit: "The Guardian Nigeria",
  },
  {
    slug: "honeywell-flour-fy-2026-profit-dividend",
    title: "Honeywell Flour’s FY 2026 profit hits N21.9 billion, declares 20 kobo dividend",
    excerpt:
      "Honeywell Flour Mills reported a 3.29% rise in full-year profit before tax to N21.896 billion, supported by lower cost of sales and stronger net finance income. The directors recommended a N1.59 billion dividend, equal to 20 kobo per share.",
    categories: ["News"],
    source: "Nairametrics",
    author: "Idika Aja",
    date: "May 31, 2026",
    url: "https://nairametrics.com/2026/05/31/honeywell-flours-fy-2026-profit-hits-n21-9-billion-declares-20-kobo-dividend/",
    image: "/news/honeywell-flour-mills.jpg",
    imageAlt: "Honeywell Flour Mills industrial facility in Lagos",
    imageCredit: "Honeywell Group via Nairametrics",
  },
  {
    slug: "new-platform-to-link-digital-discovery-with-real-events-launched",
    title: "New platform to link digital discovery with real events launched",
    excerpt:
      "Funseekas.com, a new social events ecosystem, has launched to transform how Africans discover and experience live events. The platform creates community-driven connections that extend beyond ticket purchase.",
    categories: ["News"],
    source: "The Guardian Nigeria",
    author: "Ogunnoiki",
    date: "June 21, 2025",
    url: "https://guardian.ng/news/nigeria/metro/new-platform-to-link-digital-discovery-with-real-events-launched/",
    image: "/news/funseekas-launch.jpg",
    imageAlt: "Jide Ogunnoiki at the launch of Funseekas",
    imageCredit: "The Guardian Nigeria",
  },
  {
    slug: "2026-msp-salary-guide",
    title: "Bowman Williams benchmarks 2026 MSP salaries across 3,500 interviews and 3,000 roles filled",
    excerpt:
      "Salary data benchmarked from over 3,500 interviews with MSP professionals and 3,000 MSP jobs filled.",
    categories: ["News"],
    source: "Bowman Williams",
    author: "John Davenjay",
    date: "February 2026",
    url: "https://bowmanwilliams.com/msp-salary-guide/",
    image: "/news/msp-salary-guide.jpg",
    imageAlt: "Cover artwork for the 2026 MSP Salary Guide",
    imageCredit: "Bowman Williams",
  },
  {
    slug: "afrindependent-publications",
    title: "Afrindependent Institute publishes research advancing African economic sovereignty",
    excerpt:
      "Original research, essays, and frameworks advancing African intellectual and economic sovereignty through Africonomics.",
    categories: ["News"],
    source: "Afrindependent Institute",
    author: "Manuel Tacanho",
    date: "2026",
    url: "https://www.afrindependent.org/publications?filter=latest_pub",
    image: "/news/afrindependent-publications.jpg",
    imageAlt: "Open books arranged around a reader",
    imageCredit: "Afrindependent Institute",
  },
  {
    slug: "shantanu-agarwal-mati-carbon",
    title: "Time: The World’s Most Influential Rising Stars—Shantanu Agarwal",
    excerpt:
      "The entrepreneur turning crushed rock into climate action — and a lifeline for smallholder farmers",
    categories: ["News"],
    source: "TIME",
    author: "Wendy Schmidt",
    date: "September 30, 2025",
    url: "https://time.com/collections/time100-next-2025/7318851/shantanu-agarwal/",
    image: "/news/shantanu-agarwal.jpg",
    imageAlt: "Shantanu Agarwal on stage at the TIME100 event",
    imageCredit: "Jemal Countess/Getty Images for TIME",
    imagePosition: "center 24%",
  },
  {
    slug: "bezos-earth-fund-earthshot-prize-48-climate-solutions",
    title: "Bezos Earth Fund to accelerate 48 transformative climate and nature solutions in collaboration with The Earthshot Prize",
    excerpt:
      "A $4.8 million partnership will scale breakthrough innovations tackling climate change and nature loss across the globe, backing 16 solutions a year for three years sourced from The Earthshot Prize's global pool of nominations.",
    categories: ["News"],
    source: "Bezos Earth Fund",
    author: "Press Release",
    date: "February 4, 2026",
    url: "https://www.bezosearthfund.org/news-and-insights/bezos-earth-fund-to-accelerate-48-transformative-climate-and-nature-solutions-in-collaboration-with-the-earthshot-prize",
    image: "/news/earthshot-climate-solutions.jpg",
    imageAlt: "Rolling green hills in north-west England",
    imageCredit: "Shutterstock via Bezos Earth Fund",
  },
]

export function getBlogPosts(): BlogPost[] {
  return [...blogPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
}

export function getBlogPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug)
}

export function getBlogCategories(): string[] {
  return [...new Set(blogPosts.flatMap((post) => post.categories))].sort()
}
