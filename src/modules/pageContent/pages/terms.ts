import { z } from "zod";
import { PageContentDefinition, list, required, section, text } from "../pageContent.types";

/**
 * Terms of Use — website "/terms" (vds_frontend/src/app/terms, components/terms/*).
 * Terms sections are the website's text. The three summary cards and the "Before submitting
 * a request" banner are illustrations on the website, so their texts come from the design.
 * Bullets are stored one per line.
 */
export const termsPage: PageContentDefinition = {
  key: "terms",
  title: "Terms of Use",
  path: "/terms",

  sections: {
    hero: section({
      breadcrumbHomeLabel: text(60),
      breadcrumbHomeHref: text(300),
      breadcrumbCurrentLabel: text(80),
      title: text(120),
      subtitle: text(300),
      statusBadge: text(60),
      effectiveDate: text(120),
      iconImage: text(1000),
      image: text(1000),
      imageAlt: text(300),
    }),
    summaryCards: section({
      // The website currently shows the three cards as one illustration
      image: text(1000),
      imageAlt: text(300),
      items: list({ iconImage: text(1000), title: required(120, "Every card needs a title."), description: text(400) }, 6),
    }),
    policySections: section({
      contentsLabel: text(60),
      toBeConfirmedLabel: text(60),
      contactEmail: text(200),
      contactPhone: text(60),
      items: list(
        {
          number: text(10),
          title: required(150, "Every policy section needs a title."),
          anchorId: text(80),
          bullets: text(5000),
          note: text(1000),
          toBeConfirmed: z.boolean(),
          showContactRow: z.boolean(),
        },
        30,
      ),
    }),
    beforeSubmitting: section({
      heading: text(200),
      description: text(400),
      image: text(1000),
      imageAlt: text(300),
      items: list({ number: text(10), title: required(150, "Every tip needs a title."), description: text(400) }, 8),
    }),
    relatedLinks: section({
      label: text(60),
      items: list({ label: required(80, "Every link needs a label."), link: required(300, "Every link needs a URL.") }, 10),
    }),
  },

  defaults: {
    hero: {
      isActive: true,
      breadcrumbHomeLabel: "Home",
      breadcrumbHomeHref: "/home",
      breadcrumbCurrentLabel: "Terms of Use",
      title: "Terms of Use",
      subtitle: "Guidelines for using the website and requesting clinic assistance.",
      statusBadge: "Draft for review",
      effectiveDate: "Effective date: To be confirmed",
      iconImage: "",
      image: "/panchakarma/p1.webp",
      imageAlt: "Vaidhyashala Terms of Use - Ayurvedic Clinic & Panchakarma Centre",
    },
    summaryCards: {
      isActive: true,
      image: "/privicy/03_website_appointment_product_cards.webp",
      imageAlt: "Website information, Appointment requests, Product catalogue",
      items: [
        { iconImage: "", title: "Website information", description: "General clinic and service information." },
        { iconImage: "", title: "Appointment requests", description: "Subject to clinic confirmation." },
        { iconImage: "", title: "Product catalogue", description: "Information and enquiry only." },
      ],
    },
    policySections: {
      isActive: true,
      contentsLabel: "Contents",
      toBeConfirmedLabel: "To be confirmed",
      contactEmail: "[Confirmed clinic email]",
      contactPhone: "[Confirmed clinic phone]",
      items: [
        {
          number: "01",
          title: "Scope & operator",
          anchorId: "scope-operator",
          bullets:
            "These terms apply to your use of the Vaidhyashala website, including information, appointment and enquiry forms, and product information.\nThis website is operated by Namo Gange Wellness Pvt. Ltd.\nFinal operator contact details, including exact services and workflows, are to be confirmed.",
          note: "",
          toBeConfirmed: true,
          showContactRow: false,
        },
        {
          number: "02",
          title: "Website information",
          anchorId: "website-information",
          bullets:
            "Information about our Ayurveda services, treatments, Panchakarma therapies and products is provided for general information.\nSuitability for any treatment or product is assessed during a consultation with our qualified practitioners.\nFinal content, service details and availability on this website are confirmed by the clinic.",
          note: "",
          toBeConfirmed: false,
          showContactRow: false,
        },
        {
          number: "03",
          title: "Consultations & care",
          anchorId: "consultations-care",
          bullets:
            "Website content does not replace an individual assessment or consultation with our practitioners.\nOur recommendations depend on your medical history, current condition and individual needs.\nPlease continue any prescribed care unless your treating doctor advises otherwise.",
          note: "",
          toBeConfirmed: false,
          showContactRow: false,
        },
        {
          number: "04",
          title: "Appointment requests",
          anchorId: "appointment-requests",
          bullets:
            "Submitting an appointment form on this website is a request, not a confirmed booking.\nDate, time, doctor and service availability are subject to clinic confirmation.\nOur clinic team will contact you to coordinate and confirm your appointment.",
          note: "",
          toBeConfirmed: false,
          showContactRow: false,
        },
        {
          number: "05",
          title: "Changes & cancellations",
          anchorId: "changes-cancellations",
          bullets:
            "Please contact the clinic if you need to change or cancel an appointment request.\nRescheduling is subject to doctor and clinic availability.\nAny fees or cancellation terms, if applicable, will be confirmed and communicated separately by the clinic.",
          note: "",
          toBeConfirmed: true,
          showContactRow: false,
        },
        {
          number: "06",
          title: "Product catalogue",
          anchorId: "product-catalogue",
          bullets:
            "Product information on this website is for general information and enquiries only.\nThere is no online checkout or payment on this website.\nPack sizes, formulations and product availability are confirmed by the clinic during your enquiry.",
          note: "",
          toBeConfirmed: false,
          showContactRow: false,
        },
        {
          number: "07",
          title: "Enquiries & user details",
          anchorId: "enquiries-user-details",
          bullets:
            "Please provide accurate and up-to-date contact information, including your name, mobile number and email address.\nShare only details relevant to your enquiry or appointment.\nDo not submit another person's details without their appropriate permission.",
          note: "",
          toBeConfirmed: false,
          showContactRow: false,
        },
        {
          number: "08",
          title: "Responsible website use",
          anchorId: "responsible-website-use",
          bullets:
            "Do not submit spam, false or misleading enquiries.\nDo not attempt unauthorised access to the website, systems or data.\nRespect the website content and other users.",
          note: "",
          toBeConfirmed: false,
          showContactRow: false,
        },
        {
          number: "09",
          title: "External services & updates",
          anchorId: "external-services-updates",
          bullets:
            "This website may include links to external services (e.g. maps, analytics or embedded tools) which may have their own terms.\nService availability and website information may change from time to time.\nThe final version of these terms will include an effective date.",
          note: "",
          toBeConfirmed: false,
          showContactRow: false,
        },
        {
          number: "10",
          title: "Contact & questions",
          anchorId: "contact-questions",
          bullets:
            "For questions about these terms or your use of the website, please contact:",
          note: "Final contact details and operational policies are to be confirmed by the clinic.",
          toBeConfirmed: false,
          showContactRow: true,
        },
      ],
    },
    beforeSubmitting: {
      isActive: true,
      heading: "Before submitting a request",
      description: "A few things to keep in mind when using our website forms.",
      image: "/privicy/01_before_submitting_request.webp",
      imageAlt: "Before submitting a request - A few things to keep in mind when using our website forms",
      items: [
        { number: "1", title: "Check your details", description: "Make sure your name, mobile and email are correct." },
        { number: "2", title: "Review your preferences", description: "Share the details relevant to your enquiry." },
        { number: "3", title: "Wait for clinic confirmation", description: "Our team will contact you to confirm your request." },
      ],
    },
    relatedLinks: {
      isActive: true,
      label: "Related Links",
      items: [{ label: "Privacy Policy", link: "/privacy" }],
    },
  },

  seoDefaults: {
    metaTitle: "Terms of Use | The Vaidhyashala",
    metaDescription:
      "Guidelines for using the website and requesting clinic assistance. Read our draft terms of use for Vaidhyashala website, consultations, therapies and product information.",
    metaKeywords: "Vaidhyashala terms of use, website terms, Ayurvedic clinic",
    canonicalUrl: "/terms",
    ogTitle: "Terms of Use — Vaidhyashala",
    ogDescription: "Guidelines for using the website and requesting clinic assistance.",
    ogImage: "/panchakarma/p1.webp",
    h1Tag: "Terms of Use",
    breadcrumbName: "Terms of Use",
    robotsIndex: true,
    robotsFollow: true,
    schemaMarkup: "",
  },
};
