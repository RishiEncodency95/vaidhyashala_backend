import { PageContentDefinition, list, required, section, text } from "../pageContent.types";

/**
 * Treatments — website "/treatments" (vds_frontend/src/app/treatments, components/treatments/*).
 * Defaults are the website's content. The closing CTA is the treatments one from the design
 * (components/treatments/TreatmentsCTA); the six concerns are the design's names, which the
 * website currently shows as one illustration.
 */
export const treatmentsPage: PageContentDefinition = {
  key: "treatments",
  title: "Treatments",
  path: "/treatments",

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
    highlights: section({
      items: list({ label: required(80, "Every highlight needs its text."), link: text(300) }, 12),
    }),
    careServices: section({
      eyebrow: text(120),
      heading: text(200),
      description: text(500),
      linkLabel: text(60),
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
    healthConcerns: section({
      eyebrow: text(120),
      heading: text(200),
      description: text(500),
      image: text(1000),
      imageAlt: text(300),
      items: list({ label: required(80, "Every concern needs a name."), iconImage: text(1000), link: text(300) }, 20),
    }),
    approach: section({
      eyebrow: text(120),
      headingLine1: text(120),
      headingLine2: text(120),
      headingHighlight: text(60),
      description: text(500),
      image: text(1000),
      imageAlt: text(300),
      items: list({ number: text(20), title: required(120, "Every step needs a title."), description: text(400) }, 10),
    }),
    preparation: section({
      eyebrow: text(120),
      heading: text(200),
      description: text(500),
      items: list({ iconImage: text(1000), title: required(120, "Every tip needs a title."), description: text(400) }, 10),
    }),
    faq: section({
      eyebrow: text(120),
      heading: text(200),
      description: text(500),
      items: list(
        { question: required(300, "Every FAQ needs a question."), answer: required(3000, "Every FAQ needs an answer.") },
        40,
      ),
    }),
    cta: section({
      eyebrow: text(120),
      heading: text(200),
      subtitle: text(400),
      buttonLabel: text(60),
      buttonLink: text(300),
      decorativeImage: text(1000),
      decorativeImageAlt: text(300),
    }),
  },

  defaults: {
    hero: {
      isActive: true,
      eyebrow: "Ayurvedic Treatments",
      titleLine1: "Care tailored",
      titleHighlight: "to your needs.",
      description:
        "Explore consultation-led Ayurvedic care, traditional therapies and lifestyle guidance. Your doctor will recommend a plan after assessment.",
      buttonLabel: "Book a Consultation",
      buttonLink: "/#consultation",
      image: "/treatment/r1.webp",
      imageAlt: "Ayurvedic Treatments Consultation - Care tailored to your needs",
    },
    highlights: {
      isActive: true,
      items: [
        { label: "Consultation", link: "" },
        { label: "Panchakarma", link: "" },
        { label: "Yoga & Lifestyle", link: "" },
        { label: "Medicines", link: "" },
      ],
    },
    careServices: {
      isActive: true,
      eyebrow: "Our Treatments",
      heading: "Explore our care services.",
      description:
        "A combination of consultation, traditional therapies, lifestyle guidance and authentic Ayurvedic products, designed to support your unique health journey.",
      linkLabel: "Explore care",
      items: [
        {
          image: "/about/i3.webp",
          number: "01 /",
          title: "Ayurvedic Consultation",
          description: "A detailed discussion of your health concerns, lifestyle and medical history to understand your individual needs.",
          imageAlt: "Ayurvedic Doctor Consultation",
          link: "/#consultation",
        },
        {
          image: "/a1.webp",
          number: "02 /",
          title: "Panchakarma Therapies",
          description: "Personalised Panchakarma therapies planned as per your health condition and suitability.",
          imageAlt: "Panchakarma Shirodhara Therapy",
          link: "/panchakarma",
        },
        {
          image: "/a3.webp",
          number: "03 /",
          title: "Yoga & Lifestyle Care",
          description: "Guidance with yoga, meditation and daily routines to support long-term well-being.",
          imageAlt: "Yoga and Meditation Practice",
          link: "/#yoga",
        },
        {
          image: "/a5.webp",
          number: "04 /",
          title: "Ayurvedic Medicines",
          description: "Authentic Ayurvedic formulations and wellness products to support your treatment and daily health.",
          imageAlt: "Authentic Ayurvedic Medicines and Products",
          link: "/products",
        },
      ],
    },
    healthConcerns: {
      isActive: true,
      eyebrow: "Explore by Health Concern",
      heading: "Start with your health concern.",
      description: "Discuss your concerns with our doctor to understand suitable care options.",
      image: "/treatment/t1.webp",
      imageAlt: "Explore our approach to common health concerns with Ayurvedic care and lifestyle guidance",
      items: [
        { label: "Digestive Health", iconImage: "", link: "" },
        { label: "Joint & Mobility", iconImage: "", link: "" },
        { label: "Skin & Hair", iconImage: "", link: "" },
        { label: "Women's Health", iconImage: "", link: "" },
        { label: "Respiratory Concerns", iconImage: "", link: "" },
        { label: "Stress & Sleep", iconImage: "", link: "" },
      ],
    },
    approach: {
      isActive: true,
      eyebrow: "Our Approach",
      headingLine1: "A plan begins with",
      headingLine2: "understanding",
      headingHighlight: "you.",
      description:
        "We combine classical Ayurvedic wisdom with individualised care, supported by experienced doctors, therapies and ongoing guidance.",
      image: "/a1.webp",
      imageAlt: "Traditional Ayurvedic Therapy and Consultation Approach",
      items: [
        { number: "01", title: "Consultation & assessment", description: "Discuss your health concerns and lifestyle." },
        { number: "02", title: "Personalised care plan", description: "A treatment plan suited to your condition and needs." },
        { number: "03", title: "Follow-up & guidance", description: "Ongoing support to track your progress." },
      ],
    },
    preparation: {
      isActive: true,
      eyebrow: "For Your First Consultation",
      heading: "Prepare a few details.",
      description: "Having this information helps our doctor understand your health better.",
      items: [
        { iconImage: "", title: "Bring medical reports", description: "Previous test reports and relevant medical documents." },
        { iconImage: "", title: "List current medicines", description: "Share the medicines you are currently taking." },
        {
          iconImage: "",
          title: "Share your health history",
          description: "Tell us about your health concerns, lifestyle and daily routine.",
        },
      ],
    },
    faq: {
      isActive: true,
      eyebrow: "FAQs",
      heading: "Before you choose a treatment.",
      description: "Find quick answers to common questions about our treatments and care approach.",
      items: [
        { question: "Do I need a consultation first?", answer: "Yes. An assessment helps your doctor advise appropriate care." },
        {
          question: "How is my care plan decided?",
          answer:
            "Your doctor considers your health history, constitution (Prakriti), and lifestyle before tailoring your care program.",
        },
        {
          question: "Can I continue my current medicines?",
          answer:
            "In most cases, yes. Our physicians review your existing prescriptions to ensure safe and compatible integration.",
        },
      ],
    },
    cta: {
      isActive: true,
      eyebrow: "Still have questions?",
      heading: "Not sure where to begin?",
      subtitle: "Start with a consultation.",
      buttonLabel: "Book a Consultation",
      buttonLink: "/#consultation",
      decorativeImage: "/cont.webp",
      decorativeImageAlt: "Decorative botanical illustration",
    },
  },

  seoDefaults: {
    metaTitle: "Ayurvedic Treatments | Vaidhyashala Ayurvedic Clinic & Panchakarma Centre",
    metaDescription:
      "Explore consultation-led Ayurvedic care at Vaidhyashala: doctor consultations, Panchakarma therapies, yoga and lifestyle guidance and Ayurvedic medicines.",
    metaKeywords: "Ayurvedic treatments, Panchakarma therapies, Ayurvedic consultation, Ayurvedic medicines, yoga, Vaidhyashala",
    canonicalUrl: "/treatments",
    ogTitle: "Ayurvedic Treatments — Care tailored to your needs",
    ogDescription: "Consultation-led Ayurvedic care, traditional therapies and lifestyle guidance at Vaidhyashala.",
    ogImage: "/treatment/r1.webp",
    h1Tag: "Care tailored to your needs.",
    breadcrumbName: "Treatments",
    robotsIndex: true,
    robotsFollow: true,
    schemaMarkup: "",
  },
};
