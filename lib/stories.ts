export interface Story {
  id: string;
  videoUrl: string;
  handle: string;
  followers: number;
  thumbnailUrl: string;
  avatarUrl: string;
}

export const stories: Story[] = [
  {
    id: "1",
    videoUrl: "https://videos.pexels.com/video-files/3163534/3163534-uhd_1440_2560_30fps.mp4",
    handle: "@Funseekas",
    followers: 245000,
    thumbnailUrl:
      "https://images.pexels.com/photos/1287460/pexels-photo-1287460.jpeg?auto=compress&cs=tinysrgb&w=600&h=900",
    avatarUrl:
      "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100",
  },
  {
    id: "2",
    videoUrl: "https://videos.pexels.com/video-files/2022395/2022395-uhd_1440_2732_30fps.mp4",
    handle: "@DanneInstitute",
    followers: 892000,
    thumbnailUrl:
      "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600&h=900",
    avatarUrl: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100&h=100",
  },
  {
    id: "3",
    videoUrl: "https://videos.pexels.com/video-files/3373124/3373124-uhd_1440_2732_30fps.mp4",
    handle: "@SchoolOfMedia",
    followers: 1200000,
    thumbnailUrl:
      "https://images.pexels.com/photos/3225517/pexels-photo-3225517.jpeg?auto=compress&cs=tinysrgb&w=600&h=900",
    avatarUrl:
      "https://images.pexels.com/photos/1674752/pexels-photo-1674752.jpeg?auto=compress&cs=tinysrgb&w=100&h=100",
  },
  {
    id: "4",
    videoUrl: "https://videos.pexels.com/video-files/4057698/4057698-uhd_1440_2560_25fps.mp4",
    handle: "@KOStyle",
    followers: 567000,
    thumbnailUrl:
      "https://images.pexels.com/photos/416809/pexels-photo-416809.jpeg?auto=compress&cs=tinysrgb&w=600&h=900",
    avatarUrl:
      "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100",
  },
];

export interface CustomerStory {
  id: string;
  brandName: string;
  logoUrl: string;
  quote: string;
  personName: string;
  personRole: string;
  avatarUrl: string;
}

/** Demo content for the public customer-story card layout. Replace with approved customer details before publishing. */
export const customerStories: CustomerStory[] = [
  {
    id: "pasive",
    brandName: "Pasive",
    logoUrl: "/images/brands/pasive.png",
    quote: "Working with VisualCNS gave us a clearer way to turn a complex idea into a product people could understand and use.",
    personName: "Amina Okafor",
    personRole: "Growth Lead, Pasive",
    avatarUrl: "/team/jide-pinheiro-bw.png",
  },
  {
    id: "juju",
    brandName: "Juju",
    logoUrl: "/images/brands/juju.png",
    quote: "The team brought strategy, design, and delivery into one conversation. We always knew what the next decision was.",
    personName: "Daniel Eze",
    personRole: "Product Director, Juju",
    avatarUrl: "/team/jide-pinheiro-bw.png",
  },
  {
    id: "waddi",
    brandName: "Waddi",
    logoUrl: "/images/brands/waddi.png",
    quote: "VisualCNS helped us move from scattered plans to a focused digital experience that felt ready for the people we serve.",
    personName: "Tolu Adeyemi",
    personRole: "Founder, Waddi",
    avatarUrl: "/team/jide-pinheiro-bw.png",
  },
];
