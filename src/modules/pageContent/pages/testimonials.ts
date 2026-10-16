import { z } from "zod";
import { PageContentDefinition, list, required, section, text } from "../pageContent.types";

const count = z.coerce.number().int().min(1).max(60);
const optionValue = required(120, "Every option needs a value.");

/**
 * Patient Testimonials — website "/testimonials" (and "/patient-testimonials"), components/testimonials/*.
 * These are the page's own texts. The testimonial cards live in modules/testimonials
 * (/api/cms/testimonials, /api/website/testimonials) and the "Share your experience" form
 * posts to /api/website/testimonials/feedback. "Feedback impact" and "Video stories" are
 * illustrations on the website, so their texts come from the design.
 */
export const testimonialsPage: PageContentDefinition = {
  key: "testimonials",
  title: "Patient Testimonials",
  path: "/testimonials",

  sections: {
    hero: section({
      breadcrumbHomeLabel: text(60),
      breadcrumbHomeHref: text(300),
      breadcrumbCurrentLabel: text(80),
      titleLine1: text(120),
      titleLine2: text(120),
      subtitle: text(400),
      image: text(1000),
      imageAlt: text(300),
      previewNote: text(300),
    }),
    featured: section({
      heading: text(200),
      sideNote: text(400),
      sampleLabel: text(40),
      decorativeImage: text(1000),
    }),
    categoryFilter: section({
      allLabel: text(60),
      // Filter pills; a testimonial's category is one of these values
      items: list({ label: required(80, "Every category needs a name."), value: optionValue }, 20),
    }),
    grid: section({
      heading: text(200),
      description: text(400),
      loadMoreLabel: text(60),
      initialCount: count,
      loadMoreStep: count,
      emptyMessage: text(200),
    }),
    videoStories: section({
      headingLine1: text(120),
      headingLine2: text(120),
      description: text(400),
      // The website currently shows this panel as one illustration
      image: text(1000),
      imageAlt: text(300),
      items: list(
        {
          thumbnail: text(1000),
          title: required(120, "Every video needs a title."),
          videoUrl: text(1000),
          isSample: z.boolean(),
        },
        20,
      ),
    }),
    feedbackImpact: section({
      heading: text(200),
      image: text(1000),
      imageAlt: text(300),
      items: list({ iconImage: text(1000), title: required(120, "Every point needs a title."), description: text(300) }, 8),
    }),
    feedbackForm: section({
      heading: text(200),
      description: text(1000),
      nameLabel: text(60),
      namePlaceholder: text(80),
      mobileLabel: text(80),
      mobilePlaceholder: text(80),
      emailLabel: text(60),
      emailPlaceholder: text(80),
      serviceLabel: text(60),
      servicePlaceholder: text(80),
      experienceLabel: text(80),
      experiencePlaceholder: text(80),
      // "Overall experience" options, one per line
      experienceOptions: text(500),
      feedbackLabel: text(60),
      feedbackPlaceholder: text(160),
      uploadLabel: text(80),
      uploadHint: text(120),
      publicationNote: text(200),
      consentLabel: text(300),
      buttonLabel: text(60),
      successTitle: text(120),
      successMessage: text(400),
      decorativeImage: text(1000),
      // "Service used" dropdown options
      items: list({ label: required(120, "Every service needs a name."), value: optionValue }, 20).refine(
        (items) => items.length > 0,
        "Add at least one service",
      ),
    }),
    faq: section({
      headingLine1: text(120),
      headingLine2: text(120),
      description: text(400),
      items: list(
        { question: required(300, "Every FAQ needs a question."), answer: required(3000, "Every FAQ needs an answer.") },
        40,
      ),
    }),
    cta: section({
      heading: text(200),
      subtitle: text(400),
      buttonLabel: text(60),
      buttonLink: text(300),
      decorativeImage: text(1000),
    }),
  },

  defaults: {
    hero: {
      isActive: true,
      breadcrumbHomeLabel: "Home",
      breadcrumbHomeHref: "/home",
      breadcrumbCurrentLabel: "Patient Testimonials",
      titleLine1: "Experiences that",
      titleLine2: "help us care better.",
      subtitle: "Feedback on consultation, communication and the clinic experience.",
      image: "/testimonial/clinic-reception-hero.webp",
      imageAlt: "Vaidhyashala Clinic Reception",
      previewNote: "Design preview — names, portraits, reviews and video previews are illustrative.",
    },
    featured: {
      isActive: true,
      heading: "Care begins with being heard.",
      sideNote: "Every conversation helps us understand your needs better and deliver more personalised, compassionate care.",
      sampleLabel: "Sample",
      decorativeImage: "/cont.webp",
    },
    categoryFilter: {
      isActive: true,
      allLabel: "All",
      items: [
        { label: "Consultation", value: "Consultation" },
        { label: "Panchakarma", value: "Panchakarma" },
        { label: "Yoga & Lifestyle", value: "Yoga & Lifestyle" },
        { label: "Products", value: "Products" },
      ],
    },
    grid: {
      isActive: true,
      heading: "Explore patient experiences",
      description: "Feedback on consultation, communication and the clinic experience.",
      loadMoreLabel: "Load More Experiences",
      initialCount: 6,
      loadMoreStep: 3,
      emptyMessage: "No experiences in this category yet.",
    },
    videoStories: {
      isActive: true,
      headingLine1: "Patient stories,",
      headingLine2: "in their own words.",
      description: "A space for consented patient video feedback.",
      image: "/testimonial/te2.webp",
      imageAlt: "Patient stories, in their own words - A space for consented patient video feedback",
      items: [
        { thumbnail: "", title: "Consultation experience", videoUrl: "", isSample: true },
        { thumbnail: "", title: "Therapy experience", videoUrl: "", isSample: true },
      ],
    },
    feedbackImpact: {
      isActive: true,
      heading: "What your feedback helps us improve",
      image: "/testimonial/te1.webp",
      imageAlt: "What your feedback helps us improve: Care & communication, Clinic comfort, Coordination & follow-up",
      items: [
        { iconImage: "", title: "Care & communication", description: "Helps us be more responsive, clear and supportive." },
        { iconImage: "", title: "Clinic comfort", description: "Guides us in maintaining a welcoming and comfortable space." },
        { iconImage: "", title: "Coordination & follow-up", description: "Helps us streamline appointments and share information better." },
      ],
    },
    feedbackForm: {
      isActive: true,
      heading: "Share your experience.",
      description:
        "Your feedback helps us understand what we are doing well and where we can serve you better. You can share your suggestions about consultations, therapies, products, clinic experience or anything else related to your journey with us.",
      nameLabel: "Full name *",
      namePlaceholder: "Enter your full name",
      mobileLabel: "Mobile number (private, optional)",
      mobilePlaceholder: "Enter your mobile number",
      emailLabel: "Email (optional)",
      emailPlaceholder: "Enter your email address",
      serviceLabel: "Service used *",
      servicePlaceholder: "Select a service",
      experienceLabel: "Overall experience (optional)",
      experiencePlaceholder: "Select an option",
      experienceOptions: "Excellent\nVery Good\nGood\nFair",
      feedbackLabel: "Your feedback *",
      feedbackPlaceholder: "Share your experience with us...",
      uploadLabel: "Add a photo or video (optional)",
      uploadHint: "JPG, PNG or MP4. Max 50 MB.",
      publicationNote: "Publication requires separate consent and review.",
      consentLabel: "I consent to publication of my feedback and display name. (optional)",
      buttonLabel: "Submit Feedback",
      successTitle: "Thank you for sharing your experience.",
      successMessage: "Your feedback has been received and helps us continuously enhance our care.",
      decorativeImage: "/leaf.webp",
      items: [
        { label: "Doctor Consultation", value: "Consultation" },
        { label: "Panchakarma Therapy", value: "Panchakarma" },
        { label: "Yoga & Lifestyle Care", value: "Yoga" },
        { label: "Ayurvedic Products", value: "Products" },
        { label: "General Clinic Experience", value: "General" },
      ],
    },
    faq: {
      isActive: true,
      headingLine1: "Frequently",
      headingLine2: "asked questions",
      description: "Find answers to common questions about patient testimonials.",
      items: [
        { question: "Will my contact details be published?", answer: "No. Your contact details are not displayed in a public testimonial." },
        {
          question: "Can I share feedback without agreeing to publication?",
          answer: "Yes, you can share feedback privately for our internal quality review without agreeing to public display on the website.",
        },
        {
          question: "How are testimonials selected for display?",
          answer:
            "Testimonials are selected to provide balanced and genuine reflections of patient care across different therapies and consultations, always with explicit consent.",
        },
      ],
    },
    cta: {
      isActive: true,
      heading: "Ready to discuss your care?",
      subtitle: "We are here to listen and guide you on your wellness journey.",
      buttonLabel: "Book a Consultation",
      buttonLink: "/#consultation",
      decorativeImage: "/cont.webp",
    },
  },

  seoDefaults: {
    metaTitle: "Patient Testimonials | Vaidhyashala Ayurvedic Clinic & Panchakarma Centre",
    metaDescription:
      "Patient experiences of consultations, Panchakarma therapies, yoga guidance and products at Vaidhyashala, and a place to share your own feedback.",
    metaKeywords: "Vaidhyashala testimonials, patient reviews, Ayurvedic clinic feedback, Panchakarma experience",
    canonicalUrl: "/testimonials",
    ogTitle: "Patient Testimonials — Vaidhyashala",
    ogDescription: "Experiences that help us care better.",
    ogImage: "/testimonial/clinic-reception-hero.webp",
    h1Tag: "Experiences that help us care better.",
    breadcrumbName: "Patient Testimonials",
    robotsIndex: true,
    robotsFollow: true,
    schemaMarkup: "",
  },
};
