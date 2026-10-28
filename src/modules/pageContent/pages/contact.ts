import { PageContentDefinition, list, required, section, text } from "../pageContent.types";

/**
 * Contact Us — website "/contact" (vds_frontend/src/app/contact, components/contact/*).
 * Defaults are the website's content; the "Plan your visit" panel is one illustration on the
 * website, so its texts come from the design. Phone, WhatsApp, email and address are the
 * website's placeholders until the clinic's real details are entered in the admin.
 * The enquiry form posts to /api/website/pages/contact/enquiries and lands in
 * Contact Us Messages (the existing contact enquiries).
 */
export const contactPage: PageContentDefinition = {
  key: "contact",
  title: "Contact Us",
  path: "/contact",

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
    }),
    contactMethods: section({
      eyebrow: text(120),
      heading: text(200),
      description: text(400),
      items: list(
        {
          iconImage: text(1000),
          title: required(80, "Every contact method needs a title."),
          description: text(300),
          value: text(200),
          buttonLabel: text(60),
          link: text(500),
        },
        8,
      ),
    }),
    enquiryForm: section({
      eyebrow: text(120),
      heading: text(200),
      description: text(400),
      nameLabel: text(60),
      namePlaceholder: text(80),
      mobileLabel: text(60),
      mobilePlaceholder: text(80),
      emailLabel: text(60),
      emailPlaceholder: text(80),
      enquiryAboutLabel: text(60),
      enquiryAboutPlaceholder: text(80),
      messageLabel: text(60),
      messagePlaceholder: text(160),
      consentLabel: text(200),
      buttonLabel: text(60),
      successTitle: text(120),
      successMessage: text(400),
      // Options of the "Enquiry about" dropdown
      items: list(
        {
          label: required(120, "Every enquiry option needs a name."),
          value: required(120, "Every enquiry option needs a value."),
        },
        20,
      ).refine((items) => items.length > 0, "Add at least one enquiry option"),
    }),
    planVisit: section({
      eyebrow: text(120),
      heading: text(200),
      description: text(400),
      note: text(300),
      // The website currently shows this panel as one illustration
      image: text(1000),
      imageAlt: text(300),
      items: list({ iconImage: text(1000), title: required(120, "Every detail needs a title."), description: text(400) }, 8),
    }),
    location: section({
      eyebrow: text(120),
      heading: text(200),
      description: text(400),
      mapEmbedUrl: text(3000),
      mapImage: text(1000),
      mapImageAlt: text(300),
      mapNote: text(200),
      directionsUrl: text(1000),
      clinicImage: text(1000),
      clinicImageAlt: text(300),
      clinicHeading: text(200),
      clinicDescription: text(400),
    }),
    faq: section({
      eyebrow: text(120),
      heading: text(200),
      description: text(400),
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
    }),
  },

  defaults: {
    hero: {
      isActive: true,
      breadcrumbHomeLabel: "Home",
      breadcrumbHomeHref: "/home",
      breadcrumbCurrentLabel: "Contact Us",
      titleLine1: "Let’s begin with",
      titleLine2: "a conversation.",
      subtitle: "Connect with our team for consultations, therapies and product enquiries.",
      image: "/contct/ct.webp",
      imageAlt: "Vaidhyashala Clinic Reception - Let's begin with a conversation",
    },
    contactMethods: {
      isActive: true,
      eyebrow: "Get in Touch",
      heading: "How can we help you?",
      description: "Choose the best way to reach us. Our team is here to support you.",
      items: [
        {
          iconImage: "",
          title: "Phone",
          description: "Speak with our team for consultations, therapies and general enquiries.",
          value: "[Clinic phone]",
          buttonLabel: "Call the Clinic",
          link: "tel:+910000000000",
        },
        {
          iconImage: "",
          title: "WhatsApp",
          description: "Get in touch on WhatsApp for quick assistance.",
          value: "[WhatsApp number]",
          buttonLabel: "Start a Chat",
          link: "https://wa.me/",
        },
        {
          iconImage: "",
          title: "Email",
          description: "Write to us for detailed enquiries about consultations, therapies or products.",
          value: "[Clinic email]",
          buttonLabel: "Email Us",
          link: "mailto:care@vaidhyashala.com",
        },
        {
          iconImage: "",
          title: "Visit the Clinic",
          description: "We welcome you to our clinic for consultations and therapies.",
          value: "[Clinic address]",
          buttonLabel: "Get Directions",
          link: "#location",
        },
      ],
    },
    enquiryForm: {
      isActive: true,
      eyebrow: "Send Us an Enquiry",
      heading: "Send us an enquiry.",
      description: "Share a few details and our team will get back to you.",
      nameLabel: "Full name",
      namePlaceholder: "Your full name",
      mobileLabel: "Mobile number",
      mobilePlaceholder: "Your mobile number",
      emailLabel: "Email (optional)",
      emailPlaceholder: "Your email address",
      enquiryAboutLabel: "Enquiry about",
      enquiryAboutPlaceholder: "Select an option",
      messageLabel: "Your message",
      messagePlaceholder: "How can we help you?",
      consentLabel: "I agree to be contacted about my enquiry.",
      buttonLabel: "Send Enquiry",
      successTitle: "Thank you for your enquiry!",
      successMessage: "Our team has received your message and will get back to you promptly.",
      items: [
        { label: "Doctor Consultation", value: "Consultation" },
        { label: "Panchakarma Therapies", value: "Panchakarma" },
        { label: "Ayurvedic Medicines & Products", value: "Products" },
        { label: "General Enquiry", value: "General" },
      ],
    },
    planVisit: {
      isActive: true,
      eyebrow: "Plan Your Visit",
      heading: "Plan your visit.",
      description: "Here's what you need to know before coming to the clinic.",
      note: "Please contact the clinic before visiting to confirm doctor availability.",
      image: "/contct/c3.webp",
      imageAlt: "Plan your visit - Here's what you need to know before coming to the clinic",
      items: [
        { iconImage: "", title: "Clinic address", description: "[Confirmed clinic address]" },
        { iconImage: "", title: "Clinic timings", description: "Days and consultation hours to be confirmed." },
      ],
    },
    location: {
      isActive: true,
      eyebrow: "Location",
      heading: "Find our clinic.",
      description: "Our clinic is conveniently located for easy access. The map below will show the exact location.",
      mapEmbedUrl: "",
      mapImage: "/contct/c4.webp",
      mapImageAlt: "Vaidhyashala Clinic Location Map",
      mapNote: "Map will show the confirmed clinic location.",
      directionsUrl: "",
      clinicImage: "/contct/c2.webp",
      clinicImageAlt: "A welcoming space for your care at Vaidhyashala",
      clinicHeading: "A welcoming space for your care.",
      clinicDescription: "Experience a calm and healing environment designed to support your Ayurvedic journey.",
    },
    faq: {
      isActive: true,
      eyebrow: "Frequently Asked Questions",
      heading: "Common questions.",
      description: "Find quick answers to help you get in touch with us.",
      items: [
        {
          question: "How can I request an appointment?",
          answer: "Use the appointment form or contact our team. The clinic will confirm your request and available timings.",
        },
        {
          question: "Can I enquire about therapy availability?",
          answer:
            "Yes, you can enquire about specific therapies such as Panchakarma, Shirodhara, or Abhyanga directly through WhatsApp, phone, or our enquiry form.",
        },
        {
          question: "Can I ask about a product?",
          answer:
            "Yes, our team can guide you on authentic Ayurvedic medicines, wellness formulations, dosage recommendations, and availability at our clinic counter.",
        },
      ],
    },
    cta: {
      isActive: true,
      eyebrow: "Get Started",
      heading: "Ready to plan your first visit?",
      subtitle: "Our team is here to answer your questions and help you take the next step.",
      buttonLabel: "Request an Appointment",
      buttonLink: "/#appointment",
      decorativeImage: "/cont.webp",
    },
  },

  seoDefaults: {
    metaTitle: "Contact Us | Vaidhyashala Ayurvedic Clinic & Panchakarma Centre",
    metaDescription:
      "Contact Vaidhyashala for Ayurvedic consultations, Panchakarma therapies and product enquiries. Call, WhatsApp, email or visit our clinic.",
    metaKeywords: "Contact Vaidhyashala, Ayurvedic clinic contact, book consultation, Panchakarma enquiry",
    canonicalUrl: "/contact",
    ogTitle: "Contact Vaidhyashala — Let’s begin with a conversation",
    ogDescription: "Connect with our team for consultations, therapies and product enquiries.",
    ogImage: "/contct/c1.webp",
    h1Tag: "Let’s begin with a conversation.",
    breadcrumbName: "Contact Us",
    robotsIndex: true,
    robotsFollow: true,
    schemaMarkup: "",
  },
};
