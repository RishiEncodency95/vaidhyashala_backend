import { PageContentDefinition, list, required, section, text } from "../pageContent.types";

/**
 * About Us — website "/about" (vds_frontend/src/app/about, components/about/*).
 * Defaults are the website's current content; image paths are in the website's /public.
 */
export const aboutUsPage: PageContentDefinition = {
  key: "about-us",
  title: "About Us",
  path: "/about",

  sections: {
    hero: section({
      breadcrumbHomeLabel: text(60),
      breadcrumbHomeHref: text(300),
      breadcrumbCurrentLabel: text(80),
      titleLine1: text(120),
      titleHighlight: text(120),
      subtitle: text(400),
      image: text(1000),
      imageAlt: text(300),
    }),
    holisticCare: section({
      eyebrow: text(120),
      heading: text(200),
      paragraph1: text(1500),
      paragraph2: text(1500),
      // The website currently shows the three pillars as one illustration
      image: text(1000),
      imageAlt: text(300),
      items: list({ iconImage: text(1000), title: required(120, "Every pillar needs a title."), description: text(400) }, 6),
    }),
    approach: section({
      eyebrow: text(120),
      headingLine1: text(120),
      headingLine2: text(120),
      description: text(600),
      image: text(1000),
      imageAlt: text(300),
      items: list({ number: text(20), title: required(120, "Every step needs a title."), description: text(400) }, 10),
    }),
    services: section({
      eyebrow: text(120),
      heading: text(200),
      description: text(500),
      items: list(
        {
          image: text(1000),
          title: required(120, "Every service needs a title."),
          description: text(500),
          imageAlt: text(300),
          link: text(300),
        },
        12,
      ),
    }),
    team: section({
      eyebrow: text(120),
      headingLine1: text(120),
      headingLine2: text(120),
      description: text(1000),
      image: text(1000),
      imageAlt: text(300),
      imageNote: text(120),
    }),
    atmosphere: section({
      eyebrow: text(120),
      heading: text(200),
      description: text(500),
      items: list({ image: text(1000), imageAlt: required(300, "Every photo needs alt text.") }, 12),
    }),
    cta: section({
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
      breadcrumbHomeLabel: "Home",
      breadcrumbHomeHref: "/home",
      breadcrumbCurrentLabel: "About Us",
      titleLine1: "Rooted in Ayurveda.",
      titleHighlight: "Dedicated to your care.",
      subtitle: "Get to know Vaidhyashala and our approach to personalised Ayurvedic care.",
      image: "/about/i1.webp",
      imageAlt: "Vaidhyashala Clinic - Rooted in Ayurveda. Dedicated to your care.",
    },
    holisticCare: {
      isActive: true,
      eyebrow: "About Vaidhyashala",
      heading: "Holistic care for a healthier, more balanced life.",
      paragraph1:
        "Vaidhyashala is an Ayurvedic clinic and Panchakarma centre dedicated to thoughtful, personalised care. We combine classical Ayurvedic wisdom with individualised consultations, Panchakarma therapies, yoga and lifestyle guidance to support your unique health journey.",
      paragraph2:
        "Our approach focuses on understanding your concerns, identifying the root causes and creating a care plan that is practical, sustainable and aligned with your lifestyle.",
      image: "/about/i7.webp",
      imageAlt: "Listen with care, Plan for the individual, Guide at every step",
      items: [
        {
          iconImage: "",
          title: "Listen with care",
          description: "We take time to understand your health concerns, lifestyle and personal goals.",
        },
        {
          iconImage: "",
          title: "Plan for the individual",
          description: "We create personalised treatment plans that suit your unique needs.",
        },
        {
          iconImage: "",
          title: "Guide at every step",
          description: "We provide ongoing support and guidance to help you stay on track.",
        },
      ],
    },
    approach: {
      isActive: true,
      eyebrow: "Our Approach",
      headingLine1: "Our approach to",
      headingLine2: "your well-being.",
      description:
        "We combine consultation, Panchakarma therapies, yoga and lifestyle guidance to support your overall well-being in a way that is personalised, practical and sustainable.",
      image: "/about/i2.webp",
      imageAlt: "Ayurvedic doctor in consultation with patient",
      items: [
        {
          number: "01",
          title: "Consultation & assessment",
          description: "A detailed discussion of your health concerns, lifestyle and medical history.",
        },
        {
          number: "02",
          title: "Personalised care planning",
          description: "A treatment plan tailored to your individual condition, constitution and lifestyle.",
        },
        {
          number: "03",
          title: "Follow-up & guidance",
          description: "Ongoing support to track your progress and make adjustments as needed.",
        },
      ],
    },
    services: {
      isActive: true,
      eyebrow: "Our Services",
      heading: "A complete approach to your health journey.",
      description: "Explore our core services, designed to work together for your overall well-being.",
      items: [
        {
          image: "/about/i3.webp",
          title: "Ayurvedic Consultation",
          description: "A detailed discussion of your health concerns, lifestyle and medical history to understand your individual needs.",
          imageAlt: "Ayurvedic Doctor Consultation",
          link: "",
        },
        {
          image: "/a1.webp",
          title: "Panchakarma Therapies",
          description: "Personalised Panchakarma therapies planned as per your health condition and suitability.",
          imageAlt: "Panchakarma Shirodhara Therapy",
          link: "/panchakarma",
        },
        {
          image: "/a3.webp",
          title: "Yoga & Lifestyle Care",
          description: "Guidance with yoga, meditation and daily routines to support long-term well-being.",
          imageAlt: "Yoga and Meditation Practice",
          link: "",
        },
        {
          image: "/a5.webp",
          title: "Medicines & Products",
          description: "Authentic Ayurvedic formulations and wellness products to support your treatment and daily health.",
          imageAlt: "Authentic Ayurvedic Medicines and Products",
          link: "/products",
        },
      ],
    },
    team: {
      isActive: true,
      eyebrow: "The People Behind Your Care",
      headingLine1: "A dedicated team,",
      headingLine2: "by your side.",
      description:
        "Our team of Ayurvedic doctors, Panchakarma therapists and yoga & care professionals work together to provide integrated and compassionate care. We take time to understand your needs and support you at every step of your health journey.",
      image: "/about/i4.webp",
      imageAlt: "The Vaidhyashala Clinical Team of Ayurvedic Doctors and Practitioners",
      imageNote: "Illustrative imagery",
    },
    atmosphere: {
      isActive: true,
      eyebrow: "A Calm Space for Thoughtful Care",
      heading: "Our clinic atmosphere.",
      description: "A warm, peaceful and welcoming environment designed to support your healing journey.",
      items: [
        { image: "/about/i8.webp", imageAlt: "Vaidhyashala Clinic Reception and Lounge" },
        { image: "/about/i5.webp", imageAlt: "Vaidhyashala Panchakarma Therapy Suite" },
        { image: "/about/i6.webp", imageAlt: "Vaidhyashala Consultation Lounge" },
      ],
    },
    cta: {
      isActive: true,
      heading: "Have a question about your care?",
      subtitle: "Our team is here to help you choose the right next step.",
      buttonLabel: "Book a Consultation",
      buttonLink: "/#consultation",
      backgroundImage: "/a7_cropped.webp",
      backgroundImageAlt: "Have a question about your care background",
    },
  },

  seoDefaults: {
    metaTitle: "About Us | Vaidhyashala Ayurvedic Clinic & Panchakarma Centre",
    metaDescription:
      "Get to know Vaidhyashala: an Ayurvedic clinic and Panchakarma centre combining classical Ayurvedic wisdom with personalised consultations, therapies and lifestyle guidance.",
    metaKeywords: "About Vaidhyashala, Ayurvedic clinic, Panchakarma centre, Ayurvedic doctors, holistic care",
    canonicalUrl: "/about",
    ogTitle: "About Vaidhyashala — Rooted in Ayurveda. Dedicated to your care.",
    ogDescription: "Get to know Vaidhyashala and our approach to personalised Ayurvedic care.",
    ogImage: "/about/i1.webp",
    h1Tag: "Rooted in Ayurveda. Dedicated to your care.",
    breadcrumbName: "About Us",
    robotsIndex: true,
    robotsFollow: true,
    schemaMarkup: "",
  },
};
