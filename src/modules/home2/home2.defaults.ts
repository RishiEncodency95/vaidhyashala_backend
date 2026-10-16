/**
 * Home 2 (website "/home") content as it ships on the website today
 * (vds_frontend/src/components/home/* and the shared ConsultationCTA). Used by the seed
 * script and when a section has never been saved. Image paths are relative to the
 * website's /public folder. Header and footer are managed elsewhere.
 */

export const HOME2_PAGE_KEY = "home2";

export const HOME2_SECTION_KEYS = [
  "hero",
  "highlights",
  "carePillars",
  "approach",
  "concerns",
  "products",
  "appointment",
  "faq",
  "cta",
] as const;
export type Home2SectionKey = (typeof HOME2_SECTION_KEYS)[number];

export const defaultHome2Sections = {
  hero: {
    isActive: true,
    eyebrow: "Rooted in Ayurveda. Focused on you.",
    titleLine1: "Your care.",
    titleLine2: "Our Ayurvedic",
    titleHighlight: "approach.",
    subtitle: "Doctor consultations, Panchakarma therapies and Ayurvedic medicines, with care tailored to you.",
    primaryButtonLabel: "Book a Consultation",
    primaryButtonLink: "/#consultation",
    secondaryButtonLabel: "Explore Therapies",
    secondaryButtonLink: "/treatments",
    image: "/home/h1.webp",
    imageAlt: "Vaidhyashala Clinic Reception and Lounge - Your care. Our Ayurvedic approach.",
  },
  highlights: {
    isActive: true,
    items: [
      { label: "Ayurvedic doctor consultation" },
      { label: "Panchakarma therapies" },
      { label: "Individual treatment plans" },
      { label: "Ayurvedic medicines & products" },
    ],
  },
  carePillars: {
    isActive: true,
    eyebrow: "Care at Vaidhyashala",
    heading: "Care that begins with understanding you.",
    description:
      "A thoughtful combination of consultation, therapies, lifestyle guidance and authentic Ayurvedic products, designed to support your unique health journey.",
    linkLabel: "Learn more",
    items: [
      {
        number: "01 /",
        title: "Ayurvedic Consultation",
        description:
          "A detailed discussion of your health concerns, lifestyle and medical history to understand your individual needs.",
        image: "/a2.webp",
        imageAlt: "Ayurvedic doctor consulting patient in clinic",
        link: "/#consultation",
      },
      {
        number: "02 /",
        title: "Panchakarma Therapies",
        description: "Personalised Panchakarma therapies planned as per your health condition and suitability.",
        image: "/a1.webp",
        imageAlt: "Traditional Panchakarma Shirodhara therapy",
        link: "/panchakarma",
      },
      {
        number: "03 /",
        title: "Yoga & Lifestyle Care",
        description: "Guidance with yoga, meditation and daily routines to support long-term well-being.",
        image: "/a3.webp",
        imageAlt: "Calm yoga and meditation guidance",
        link: "/#yoga",
      },
      {
        number: "04 /",
        title: "Medicines & Products",
        description: "Authentic Ayurvedic formulations and wellness products to support your treatment and daily health.",
        image: "/a5.webp",
        imageAlt: "Authentic Ayurvedic herbal formulations and oils",
        link: "/products",
      },
    ],
  },
  approach: {
    isActive: true,
    eyebrow: "Our Approach",
    headingLine1: "Traditional therapies.",
    headingHighlight: "Personal attention.",
    description:
      "We combine classical Ayurvedic wisdom with individualised care, supported by experienced doctors, therapies and ongoing guidance.",
    image: "/a1.webp",
    imageAlt: "Traditional Ayurvedic Shirodhara Therapy and Treatment",
    items: [
      { number: "01", title: "Consultation & assessment", description: "Discuss your health concerns and lifestyle." },
      { number: "02", title: "Individual care plan", description: "A personalised treatment plan suited to you." },
      { number: "03", title: "Follow-up & guidance", description: "Ongoing support to track your progress." },
    ],
  },
  concerns: {
    isActive: true,
    eyebrow: "Explore Care by Concern",
    heading: "Find support for what matters to you.",
    description: "Explore our approach to common health concerns with Ayurvedic care and lifestyle guidance.",
    // The website currently shows these concerns as one illustration
    image: "/treatment/t1.webp",
    imageAlt: "Explore our approach to common health concerns with Ayurvedic care and lifestyle guidance",
    items: [
      { label: "Digestive Health", iconImage: "", link: "/treatments" },
      { label: "Joint & Mobility", iconImage: "", link: "/treatments" },
      { label: "Skin & Hair", iconImage: "", link: "/treatments" },
      { label: "Women's Health", iconImage: "", link: "/treatments" },
      { label: "Respiratory Concerns", iconImage: "", link: "/treatments" },
      { label: "Stress & Sleep", iconImage: "", link: "/treatments" },
    ],
  },
  products: {
    isActive: true,
    eyebrow: "Authentic Ayurvedic Products",
    headingLine1: "Ayurveda beyond",
    headingLine2: "your consultation.",
    description: "A range of authentic Ayurvedic medicines, therapy oils and wellness products to support your health journey.",
    buttonLabel: "Explore Products",
    buttonLink: "/products",
    image: "/home/i2.webp",
    imageAlt: "Authentic Ayurvedic medicines, therapy oils and wellness formulations",
  },
  appointment: {
    isActive: true,
    eyebrow: "Appointment",
    heading: "Plan your first visit.",
    description:
      "Choose a service, pick a date and let us know if you'd prefer to visit the clinic or consult online. We'll get back to you to confirm your appointment.",
    serviceLabel: "Service",
    servicePlaceholder: "Select a service",
    dateLabel: "Preferred date",
    typeLabel: "Consultation type",
    clinicLabel: "Clinic visit",
    onlineLabel: "Online consultation",
    buttonLabel: "Request Appointment",
    successMessage: "Thank you! Your appointment request has been received. Our team will contact you shortly.",
    items: [
      { label: "Ayurvedic Consultation", value: "consultation" },
      { label: "Panchakarma Therapy", value: "panchakarma" },
      { label: "Yoga & Lifestyle Session", value: "yoga" },
      { label: "Follow-up Consultation", value: "followup" },
    ],
  },
  faq: {
    isActive: true,
    eyebrow: "FAQs",
    heading: "Before your consultation.",
    description: "Find quick answers to common questions about our consultations, therapies and products.",
    items: [
      {
        question: "Do I need a consultation before starting treatment?",
        answer:
          "Yes, an initial doctor consultation is essential. It enables our physicians to assess your unique constitution (Prakriti), current imbalances (Vikriti), lifestyle, and medical history to create an effective and safe treatment plan.",
      },
      {
        question: "Are the treatments suitable for all age groups?",
        answer:
          "Yes, Ayurvedic therapies and wellness guidance are individually tailored. Treatments for seniors, adults, and younger individuals are carefully adjusted in intensity, duration, and formulation according to individual suitability.",
      },
      {
        question: "How long does a typical treatment plan take?",
        answer:
          "Treatment plans vary based on individual health objectives. Single rejuvenation or stress-relief therapies can be experienced in one session, while structured therapeutic programs and Panchakarma typically span 7, 14, or 21 days.",
      },
      {
        question: "Can I take Ayurvedic medicines along with my current medication?",
        answer:
          "In most cases, yes. Our Ayurvedic doctors carefully review your existing prescriptions and treatments to ensure full compatibility and prevent any herb-drug interactions.",
      },
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
};

export const defaultHome2Seo = {
  metaTitle: "Vaidhyashala | Ayurvedic Clinic & Panchakarma Centre",
  metaDescription:
    "Doctor consultations, Panchakarma therapies, yoga and authentic Ayurvedic medicines at Vaidhyashala, with care tailored to you.",
  metaKeywords: "Vaidhyashala, Ayurvedic clinic, Panchakarma centre, Ayurvedic doctor, Ayurvedic medicines, yoga",
  canonicalUrl: "/home",
  canonicalTag: "",
  openGraphTags: "",
  ogTitle: "Vaidhyashala — Your care. Our Ayurvedic approach.",
  ogDescription: "Doctor consultations, Panchakarma therapies and Ayurvedic medicines, with care tailored to you.",
  ogImage: "/home/h1.webp",
  h1Tag: "Your care. Our Ayurvedic approach.",
  breadcrumbName: "Home",
  robotsIndex: true,
  robotsFollow: true,
  schemaMarkup: "",
};
