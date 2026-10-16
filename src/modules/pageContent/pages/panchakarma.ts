import { PageContentDefinition, list, required, section, text } from "../pageContent.types";

/**
 * Panchakarma — website "/panchakarma" (vds_frontend/src/app/panchakarma, components/panchakarma/*).
 * Defaults are the website's content. The website shows the three Understanding steps and the
 * five classical procedures as single illustrations, so their texts come from the design.
 * The "Request a Consultation" form posts to /api/website/pages/panchakarma/consultation-requests.
 */
export const panchakarmaPage: PageContentDefinition = {
  key: "panchakarma",
  title: "Panchakarma",
  path: "/panchakarma",

  sections: {
    hero: section({
      breadcrumbHomeLabel: text(60),
      breadcrumbHomeHref: text(300),
      breadcrumbCurrentLabel: text(80),
      titleLine1: text(120),
      titleHighlight: text(120),
      description: text(500),
      buttonLabel: text(60),
      buttonLink: text(300),
      image: text(1000),
      imageAlt: text(300),
    }),
    understanding: section({
      heading: text(200),
      description: text(800),
      // The website currently shows the three steps as one illustration
      image: text(1000),
      imageAlt: text(300),
      items: list(
        {
          image: text(1000),
          number: text(20),
          title: required(120, "Every step needs a title."),
          description: text(300),
          iconImage: text(1000),
          imageAlt: text(300),
        },
        10,
      ),
    }),
    classicalProcedures: section({
      heading: text(200),
      note: text(500),
      image: text(1000),
      imageAlt: text(300),
      items: list({ iconImage: text(1000), title: required(120, "Every procedure needs a name."), description: text(300) }, 10),
    }),
    supportingTherapies: section({
      heading: text(200),
      description: text(500),
      linkLabel: text(60),
      note: text(300),
      items: list(
        {
          image: text(1000),
          title: required(120, "Every therapy needs a name."),
          description: text(300),
          imageAlt: text(300),
          link: text(300),
        },
        30,
      ),
    }),
    therapyPlan: section({
      headingLine1: text(120),
      headingLine2: text(120),
      description: text(500),
      image: text(1000),
      imageAlt: text(300),
      items: list({ label: required(120, "Every point needs its text.") }, 12),
    }),
    requestForm: section({
      heading: text(200),
      description: text(400),
      nameLabel: text(60),
      namePlaceholder: text(80),
      mobileLabel: text(60),
      mobilePlaceholder: text(80),
      therapyLabel: text(60),
      therapyPlaceholder: text(80),
      dateLabel: text(60),
      buttonLabel: text(60),
      successTitle: text(120),
      successMessage: text(400),
      // Options of the "Therapy of interest" dropdown
      items: list(
        {
          label: required(120, "Every therapy option needs a name."),
          value: required(120, "Every therapy option needs a value."),
        },
        40,
      ).refine((items) => items.length > 0, "Add at least one therapy option"),
    }),
    faq: section({
      heading: text(200),
      description: text(500),
      items: list(
        { question: required(300, "Every FAQ needs a question."), answer: required(3000, "Every FAQ needs an answer.") },
        40,
      ),
    }),
    cta: section({
      headingLine1: text(120),
      headingLine2: text(120),
      description: text(400),
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
      breadcrumbCurrentLabel: "Panchakarma",
      titleLine1: "Traditional therapies.",
      titleHighlight: "Personalised care.",
      description: "Explore Panchakarma and supporting Ayurvedic therapies, guided by a doctor's assessment.",
      buttonLabel: "Discuss Your Therapy Plan",
      buttonLink: "#consultation",
      image: "/panchakarma/i1.webp",
      imageAlt: "Traditional therapies. Personalised care. - Panchakarma at Vaidhyashala",
    },
    understanding: {
      isActive: true,
      heading: "Understanding Panchakarma",
      description:
        "Panchakarma refers to a group of classical Ayurvedic procedures. A doctor assesses whether any procedure is suitable for you; every patient does not need every procedure.",
      image: "/panchakarma/i2.webp",
      imageAlt: "Understanding Panchakarma: 01 Preparation, 02 Selected procedures, 03 Aftercare",
      items: [
        { image: "", number: "01", title: "Preparation", description: "Consultation and preparatory care.", iconImage: "", imageAlt: "" },
        { image: "", number: "02", title: "Selected procedures", description: "As advised by the doctor.", iconImage: "", imageAlt: "" },
        { image: "", number: "03", title: "Aftercare", description: "Diet, routine and follow-up guidance.", iconImage: "", imageAlt: "" },
      ],
    },
    classicalProcedures: {
      isActive: true,
      heading: "The five classical procedures",
      note: "These are specialised procedures requiring clinical assessment and qualified supervision. Availability must be confirmed with the clinic.",
      image: "/panchakarma/i3.webp",
      imageAlt: "The five classical procedures: Vamana, Virechana, Basti, Nasya, Raktamokshana",
      items: [
        { iconImage: "", title: "Vamana", description: "Therapeutic emesis." },
        { iconImage: "", title: "Virechana", description: "Therapeutic purgation." },
        { iconImage: "", title: "Basti", description: "Medicated enema procedures." },
        { iconImage: "", title: "Nasya", description: "Nasal administration of prescribed preparations." },
        { iconImage: "", title: "Raktamokshana", description: "Bloodletting in selected clinical settings." },
      ],
    },
    supportingTherapies: {
      isActive: true,
      heading: "Explore supporting Ayurvedic therapies",
      description:
        "A range of traditional therapies that may be suggested as part of your individual care plan, based on the doctor's assessment.",
      linkLabel: "Ask about suitability",
      note: "Therapy selection and availability are confirmed during consultation.",
      items: [
        { image: "/panchakarma/01_Abhyanga_Oil_Massage.webp", title: "Abhyanga", description: "Ayurvedic oil massage.", imageAlt: "Abhyanga - Ayurvedic whole body oil massage", link: "#consultation" },
        { image: "/panchakarma/02_Shirodhara.webp", title: "Shirodhara", description: "Steady flow of liquid over the forehead.", imageAlt: "Shirodhara - Steady flow of herbal oil over forehead", link: "#consultation" },
        { image: "/panchakarma/03_Swedana_Steam_Therapy.webp", title: "Swedana", description: "Guided fomentation therapy.", imageAlt: "Swedana - Herbal steam box fomentation therapy", link: "#consultation" },
        { image: "/panchakarma/04_Pizhichil_Warm_Oil_Therapy.webp", title: "Pizhichil", description: "Warm oil application with massage.", imageAlt: "Pizhichil - Medicated oil bath and synchronized massage", link: "#consultation" },
        { image: "/panchakarma/05_Udvartana_Herbal_Powder_Massage.webp", title: "Udvartana", description: "Herbal powder massage.", imageAlt: "Udvartana - Herbal powder lymphatic scrub massage", link: "#consultation" },
        { image: "/panchakarma/06_Patra_Pinda_Sweda.webp", title: "Patra Pinda Sweda", description: "Herbal leaf bolus fomentation.", imageAlt: "Patra Pinda Sweda - Medicinal leaf bolus massage", link: "#consultation" },
        { image: "/panchakarma/07_Shashtika_Shali_Pinda_Sweda.webp", title: "Shashtika Shali Pinda Sweda", description: "Prepared rice bolus fomentation.", imageAlt: "Shashtika Shali Pinda Sweda - Cooked medicinal rice bolus massage", link: "#consultation" },
        { image: "/panchakarma/08_Kati_Basti.webp", title: "Kati Basti", description: "Localised oil application around lower back.", imageAlt: "Kati Basti - Herbal oil reservoir for lower back support", link: "#consultation" },
        { image: "/panchakarma/09_Shiro_Abhyanga_Head_Massage.webp", title: "Shiro Abhyanga", description: "Ayurvedic head massage.", imageAlt: "Shiro Abhyanga - Therapeutic Ayurvedic head and scalp massage", link: "#consultation" },
      ],
    },
    therapyPlan: {
      isActive: true,
      headingLine1: "Your therapy plan starts",
      headingLine2: "with a conversation.",
      description: "We take time to understand your health concerns and create a plan that is suitable for you.",
      image: "/panchakarma/p2.webp",
      imageAlt: "Ayurvedic doctor in consultation discussing therapy plan",
      items: [
        { label: "Health and medical history" },
        { label: "Individual suitability" },
        { label: "Therapy schedule and preparation" },
        { label: "Aftercare and review" },
      ],
    },
    requestForm: {
      isActive: true,
      heading: "Request a Consultation",
      description: "Share a few details and we'll get back to you to discuss your therapy plan.",
      nameLabel: "Name",
      namePlaceholder: "Your name",
      mobileLabel: "Mobile Number",
      mobilePlaceholder: "Your mobile number",
      therapyLabel: "Therapy of interest",
      therapyPlaceholder: "Select a therapy",
      dateLabel: "Preferred date",
      buttonLabel: "Request a Consultation",
      successTitle: "Thank you for your request!",
      successMessage: "Our clinical coordinator will get back to you shortly to discuss your therapy plan.",
      items: [
        { label: "Ayurvedic Consultation", value: "Consultation" },
        { label: "Shirodhara", value: "Shirodhara" },
        { label: "Abhyanga", value: "Abhyanga" },
        { label: "Swedana", value: "Swedana" },
        { label: "Pizhichil", value: "Pizhichil" },
        { label: "Udvartana", value: "Udvartana" },
        { label: "Patra Pinda Sweda", value: "Patra Pinda Sweda" },
        { label: "Shashtika Shali Pinda Sweda", value: "Shashtika Shali Pinda Sweda" },
        { label: "Kati Basti", value: "Kati Basti" },
        { label: "Shiro Abhyanga", value: "Shiro Abhyanga" },
        { label: "Full Panchakarma Program", value: "Full Panchakarma Program" },
      ],
    },
    faq: {
      isActive: true,
      heading: "FAQs",
      description: "Find quick answers to common questions about Panchakarma and therapies.",
      items: [
        {
          question: "How is my therapy selected?",
          answer: "The doctor reviews your health concerns and medical history before recommending suitable care.",
        },
        {
          question: "Will I need all five procedures?",
          answer:
            "No. Every patient does not require all five procedures. Your Ayurvedic doctor evaluates your specific condition, constitution, and health status to recommend only the therapies that are safe and suitable for you.",
        },
        {
          question: "How long will my therapy plan take?",
          answer:
            "Therapy duration varies based on the recommended treatments. Individual sessions typically take 45 to 60 minutes, while comprehensive Panchakarma packages generally range between 7 to 21 days.",
        },
      ],
    },
    cta: {
      isActive: true,
      headingLine1: "Let us plan your care",
      headingLine2: "thoughtfully.",
      description: "Begin with a consultation and explore therapies that are suitable for you, with expert guidance.",
      buttonLabel: "Book a Consultation",
      buttonLink: "#consultation",
      backgroundImage: "/panchakarma/p1.webp",
      backgroundImageAlt: "Let us plan your care thoughtfully background",
    },
  },

  seoDefaults: {
    metaTitle: "Panchakarma Therapies | Vaidhyashala Ayurvedic Clinic & Panchakarma Centre",
    metaDescription:
      "Explore Panchakarma and supporting Ayurvedic therapies at Vaidhyashala, from Abhyanga and Shirodhara to the five classical procedures, guided by a doctor's assessment.",
    metaKeywords: "Panchakarma, Ayurvedic therapies, Abhyanga, Shirodhara, Vamana, Virechana, Basti, Nasya, Vaidhyashala",
    canonicalUrl: "/panchakarma",
    ogTitle: "Panchakarma — Traditional therapies. Personalised care.",
    ogDescription: "Panchakarma and supporting Ayurvedic therapies, guided by a doctor's assessment.",
    ogImage: "/panchakarma/i1.webp",
    h1Tag: "Traditional therapies. Personalised care.",
    breadcrumbName: "Panchakarma",
    robotsIndex: true,
    robotsFollow: true,
    schemaMarkup: "",
  },
};
