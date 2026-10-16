import { PageContentDefinition, list, required, section, text } from "../pageContent.types";

/**
 * About Story — "Our Story" page. The website has no such page yet, so the defaults are the
 * approved design's text; images reuse existing website photos until real ones are uploaded
 * (the chairman's photo and Namo Gange logo are left empty for that reason).
 */
export const aboutStoryPage: PageContentDefinition = {
  key: "about-story",
  title: "About Story",
  path: "/about/our-story",

  sections: {
    hero: section({
      eyebrow: text(120),
      titleLine1: text(120),
      titleHighlight: text(120),
      description: text(500),
      buttonLabel: text(60),
      buttonLink: text(300),
      image: text(1000),
      imageAlt: text(300),
    }),
    about: section({
      eyebrow: text(120),
      headingLine1: text(120),
      headingHighlight: text(120),
      paragraph1: text(1500),
      paragraph2: text(1500),
      quote: text(300),
    }),
    foundingOrganisation: section({
      eyebrow: text(120),
      heading: text(200),
      organisationName: text(150),
      description: text(600),
      logo: text(1000),
      logoAlt: text(300),
      websiteUrl: text(300),
    }),
    chairmanMessage: section({
      eyebrow: text(120),
      heading: text(200),
      quote: text(600),
      message: text(2000),
      chairmanName: text(120),
      designation: text(200),
      photo: text(1000),
      photoAlt: text(300),
    }),
    missionVisionValues: section({
      eyebrow: text(120),
      heading: text(200),
      items: list({ iconImage: text(1000), title: required(120, "Every card needs a title."), description: text(600) }, 6),
    }),
    services: section({
      eyebrow: text(120),
      heading: text(200),
      linkLabel: text(60),
      linkUrl: text(300),
      items: list(
        {
          image: text(1000),
          number: text(20),
          title: required(120, "Every service needs a title."),
          description: text(500),
          imageAlt: text(300),
          link: text(300),
        },
        12,
      ),
    }),
    process: section({
      eyebrow: text(120),
      heading: text(200),
      items: list({ number: text(20), title: required(120, "Every step needs a title."), description: text(400) }, 10),
    }),
    clinic: section({
      eyebrow: text(120),
      heading: text(200),
      imageNote: text(120),
      items: list({ image: text(1000), imageAlt: required(300, "Every photo needs alt text.") }, 12),
    }),
    cta: section({
      eyebrow: text(120),
      heading: text(200),
      subtitle: text(400),
      buttonLabel: text(60),
      buttonLink: text(300),
      backgroundImage: text(1000),
      backgroundImageAlt: text(300),
    }),
  },

  defaults: {
    hero: {
      isActive: true,
      eyebrow: "Our Story",
      titleLine1: "A tradition of care.",
      titleHighlight: "A vision for tomorrow.",
      description:
        "Vaidhyashala is an Ayurvedic clinic and Panchakarma centre, bringing together traditional wisdom and personalised care for modern lives.",
      buttonLabel: "Book a Consultation",
      buttonLink: "/#consultation",
      image: "/about/i1.webp",
      imageAlt: "Vaidhyashala clinic reception — a tradition of care, a vision for tomorrow",
    },
    about: {
      isActive: true,
      eyebrow: "About Vaidhyashala",
      headingLine1: "Personalised Ayurvedic care,",
      headingHighlight: "centred on you.",
      paragraph1:
        "At Vaidhyashala, we offer doctor consultations, traditional Panchakarma therapies, yoga and lifestyle guidance, and Ayurvedic medicines, all designed around your unique health concerns and goals.",
      paragraph2:
        "Our approach combines the time-tested principles of Ayurveda with individualised care, supporting you in understanding your health, making informed choices, and building a more balanced life naturally.",
      quote: "Understanding the person. Personalising the care.",
    },
    foundingOrganisation: {
      isActive: true,
      eyebrow: "Our Founding Organisation",
      heading: "The organisation behind our vision.",
      organisationName: "Namo Gange Wellness Pvt. Ltd.",
      description:
        "The founding organisation behind Vaidhyashala, bringing its focus on health and wellness to personalised Ayurvedic care.",
      logo: "",
      logoAlt: "Namo Gange Wellness Pvt. Ltd. logo",
      websiteUrl: "",
    },
    chairmanMessage: {
      isActive: true,
      eyebrow: "Chairman's Message",
      heading: "A message from our Chairman.",
      quote:
        "Our vision for Vaidhyashala is to bring the wisdom of Ayurveda into a thoughtful, personal and well-organised care experience.",
      message:
        "We believe every individual deserves to be heard and guided with clarity. Through consultations, traditional therapies and lifestyle guidance, we aim to build a clinic where care, trust and respect remain at the centre.",
      chairmanName: "Vijay Sharma",
      designation: "Chairman — Namo Gange Wellness Pvt. Ltd.",
      photo: "",
      photoAlt: "Vijay Sharma, Chairman, Namo Gange Wellness Pvt. Ltd.",
    },
    missionVisionValues: {
      isActive: true,
      eyebrow: "Our Mission, Vision & Values",
      heading: "Guided by purpose. Grounded in care.",
      items: [
        {
          iconImage: "",
          title: "Our mission",
          description:
            "To make authentic Ayurvedic care accessible and meaningful, supporting individuals in their journey towards better health and a balanced life.",
        },
        {
          iconImage: "",
          title: "Our vision",
          description:
            "To be a trusted centre for Ayurvedic care, known for thoughtful, individualised approaches that support long-term well-being.",
        },
        {
          iconImage: "",
          title: "Our values",
          description:
            "Integrity, personalised care, clear communication and respect for traditional wisdom, in a calm and supportive environment.",
        },
      ],
    },
    services: {
      isActive: true,
      eyebrow: "Our Services",
      heading: "Care that begins with understanding you.",
      linkLabel: "Explore all therapies",
      linkUrl: "/treatments",
      items: [
        {
          image: "/a2.webp",
          number: "01 /",
          title: "Ayurvedic Consultation",
          description: "A detailed discussion of your health concerns, lifestyle and medical history to understand your individual needs.",
          imageAlt: "Ayurvedic doctor consulting patient in clinic",
          link: "/#consultation",
        },
        {
          image: "/a1.webp",
          number: "02 /",
          title: "Panchakarma Therapies",
          description: "Personalised Panchakarma therapies planned as per your health condition and suitability.",
          imageAlt: "Traditional Panchakarma Shirodhara therapy",
          link: "/panchakarma",
        },
        {
          image: "/a3.webp",
          number: "03 /",
          title: "Yoga & Lifestyle Care",
          description: "Guidance with yoga, meditation and daily routines to support long-term well-being.",
          imageAlt: "Calm yoga and meditation guidance",
          link: "",
        },
        {
          image: "/a5.webp",
          number: "04 /",
          title: "Medicines & Products",
          description: "Authentic Ayurvedic formulations and wellness products to support your treatment and daily health.",
          imageAlt: "Authentic Ayurvedic herbal formulations and oils",
          link: "/products",
        },
      ],
    },
    process: {
      isActive: true,
      eyebrow: "A Simple and Supportive Process",
      heading: "Your care, thoughtfully planned.",
      items: [
        { number: "01", title: "Listen & assess", description: "We understand your health concerns, lifestyle and goals." },
        {
          number: "02",
          title: "Personalised plan",
          description: "A tailored care plan with therapies, lifestyle guidance and, where suitable, Ayurvedic medicines.",
        },
        {
          number: "03",
          title: "Therapy & guidance",
          description: "Traditional therapies and ongoing support, guided by our experienced team.",
        },
        { number: "04", title: "Follow-up", description: "We stay connected to monitor your progress and adjust your plan as needed." },
      ],
    },
    clinic: {
      isActive: true,
      eyebrow: "Our Clinic",
      heading: "A space for healing, naturally.",
      imageNote: "Illustrative clinic imagery",
      items: [
        { image: "/about/i8.webp", imageAlt: "Vaidhyashala Clinic Reception and Lounge" },
        { image: "/about/i5.webp", imageAlt: "Vaidhyashala Panchakarma Therapy Suite" },
        { image: "/about/i6.webp", imageAlt: "Vaidhyashala Consultation Lounge" },
      ],
    },
    cta: {
      isActive: true,
      eyebrow: "Your Next Step",
      heading: "Let us understand your care needs.",
      subtitle: "Book a consultation and take the first step towards personalised Ayurvedic care.",
      buttonLabel: "Book a Consultation",
      buttonLink: "/#consultation",
      backgroundImage: "/a7_cropped.webp",
      backgroundImageAlt: "Leaves background",
    },
  },

  seoDefaults: {
    metaTitle: "Our Story | Vaidhyashala Ayurvedic Clinic & Panchakarma Centre",
    metaDescription:
      "A tradition of care, a vision for tomorrow: the story of Vaidhyashala, its founding organisation Namo Gange Wellness, our mission, vision and values.",
    metaKeywords: "Vaidhyashala story, Namo Gange Wellness, Ayurvedic clinic, mission vision values, Panchakarma centre",
    canonicalUrl: "/about/our-story",
    ogTitle: "Our Story — Vaidhyashala",
    ogDescription: "A tradition of care. A vision for tomorrow.",
    ogImage: "/about/i1.webp",
    h1Tag: "A tradition of care. A vision for tomorrow.",
    breadcrumbName: "Our Story",
    robotsIndex: true,
    robotsFollow: true,
    schemaMarkup: "",
  },
};
