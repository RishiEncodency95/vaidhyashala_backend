import { PageContentDefinition, list, required, section, text } from "../pageContent.types";

/**
 * Careers — website "/careers" (components/careers: CareersHero, ExploreOpportunities,
 * WhyWorkWithUs, LifeAtVaidhyashala, ShareProfileBanner).
 * These are the page's own texts. The job cards come from the open jobs (Careers → Jobs in the
 * admin, /api/careers/jobs), not from this page. Multi-line texts are stored one line per row.
 */
export const careersPage: PageContentDefinition = {
  key: "careers",
  title: "Careers",
  path: "/careers",

  sections: {
    hero: section({
      eyebrow: text(120),
      titleLine1: text(120),
      titleLine2: text(120),
      description: text(400),
      // Wall lettering on the photo, one word per line
      tagline: text(120),
      image: text(1000),
      imageAlt: text(300),
      badgesImage: text(1000),
      badgesImageAlt: text(300),
    }),
    openings: section({
      eyebrow: text(120),
      heading: text(200),
      description: text(400),
      buttonLabel: text(60),
      emptyHeading: text(200),
      emptyDescription: text(400),
      emptyButtonLabel: text(60),
    }),
    whyWork: section({
      eyebrow: text(120),
      headingLine1: text(120),
      headingLine2: text(120),
      description: text(600),
      items: list({ iconImage: text(1000), title: required(120, "Every reason needs a title."), description: text(300) }, 8),
    }),
    life: section({
      eyebrow: text(120),
      heading: text(200),
      description: text(500),
      // Last photo card with the lettering on top, one word per line
      lastImage: text(1000),
      lastImageAlt: text(300),
      lastCaption: text(200),
      items: list({ image: text(1000), imageAlt: required(300, "Every photo needs alt text.") }, 12),
    }),
    shareProfile: section({
      heading: text(200),
      description: text(500),
      buttonLabel: text(60),
    }),
  },

  defaults: {
    hero: {
      isActive: true,
      eyebrow: "Careers at Vaidhyashala",
      titleLine1: "Build a Purposeful",
      titleLine2: "Career in Ayurveda",
      description: "Be a part of a dedicated team committed to authentic Ayurvedic care, holistic healing and healthier lives.",
      tagline: "Ancient\nWisdom\nModern\nWellness",
      image: "/career/he1.webp",
      imageAlt: "Careers at Vaidhyashala",
      badgesImage: "/career/he2.webp",
      badgesImageAlt: "Meaningful Work, Collaborative Team, Growth Opportunities, Real Impact on Lives",
    },
    openings: {
      isActive: true,
      eyebrow: "Current Openings",
      heading: "Explore Opportunities",
      description: "Join our team and contribute to a healthier, happier tomorrow with the wisdom of Ayurveda.",
      buttonLabel: "View Details",
      emptyHeading: "No Open Positions at the Moment",
      emptyDescription:
        "We appreciate your interest in being part of Vaidhyashala. Please check back soon for new opportunities.",
      emptyButtonLabel: "Share Your Profile",
    },
    whyWork: {
      isActive: true,
      eyebrow: "Why Work With Vaidhyashala",
      headingLine1: "A Meaningful Career,",
      headingLine2: "A Healthier Tomorrow",
      description:
        "At Vaidhyashala, you will be part of a compassionate and professional environment that values traditional wisdom, continuous learning and the well-being of both our team and our patients.",
      items: [
        { iconImage: "", title: "Purpose-Driven Work", description: "Contribute to authentic Ayurveda and holistic wellness." },
        { iconImage: "", title: "Supportive Team Environment", description: "Work with experienced doctors and wellness professionals." },
        { iconImage: "", title: "Learning & Growth", description: "Enhance your skills with continuous learning and opportunities." },
        { iconImage: "", title: "Positive Impact", description: "Be a part of a mission that improves lives naturally." },
      ],
    },
    life: {
      isActive: true,
      eyebrow: "Life at Vaidhyashala",
      heading: "Work in a Culture of Care and Learning",
      description:
        "We foster a respectful, balanced and inspiring work environment where traditional knowledge meets modern wellness.",
      lastImage: "/career/06_wellness_interior.webp",
      lastImageAlt: "Healing People Enriching Lives wellness space",
      lastCaption: "Healing\nPeople\nEnriching\nLives",
      items: [
        { image: "/career/02_ayurvedic_herbal_tools.webp", imageAlt: "Authentic Ayurvedic preparation tools and herbs" },
        { image: "/career/03_doctor_patient_consultation.webp", imageAlt: "Ayurvedic doctor consulting with patient" },
        { image: "/career/04_clinic_team_collaboration.webp", imageAlt: "Healthcare professionals collaborating at Vaidhyashala" },
        { image: "/career/09_herbal_oils_and_ingredients.webp", imageAlt: "Traditional Ayurvedic herbal oils, turmeric and bronze vessels" },
      ],
    },
    shareProfile: {
      isActive: true,
      heading: "Don’t See the Right Role?",
      description:
        "We are always open to connecting with passionate and talented professionals. Share your profile with us and we will get in touch when a suitable opportunity arises.",
      buttonLabel: "Share Your Profile",
    },
  },

  seoDefaults: {
    metaTitle: "Careers | Vaidhyashala Ayurvedic Clinic",
    metaDescription:
      "Build a purposeful career in Ayurveda. Be a part of a dedicated team committed to authentic Ayurvedic care, holistic healing and healthier lives at Vaidhyashala.",
    metaKeywords: "Vaidhyashala careers, Ayurveda jobs, Ayurvedic doctor job, Panchakarma therapist job",
    canonicalUrl: "/careers",
    ogTitle: "Careers at Vaidhyashala — Build a Purposeful Career in Ayurveda",
    ogDescription: "Be a part of a dedicated team committed to authentic Ayurvedic care and healthier lives.",
    ogImage: "/career/he1.webp",
    h1Tag: "Build a Purposeful Career in Ayurveda",
    breadcrumbName: "Careers",
    robotsIndex: true,
    robotsFollow: true,
    schemaMarkup: "",
  },
};
