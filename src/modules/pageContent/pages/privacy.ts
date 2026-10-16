import { z } from "zod";
import { PageContentDefinition, list, required, section, text } from "../pageContent.types";

/**
 * Privacy Policy — website "/privacy" (vds_frontend/src/app/privacy, components/privacy/*).
 * Policy sections are the website's text. The three summary cards and the "Before sharing
 * information" banner are illustrations on the website, so their texts come from the design.
 * Bullets are stored one per line.
 */
export const privacyPage: PageContentDefinition = {
  key: "privacy",
  title: "Privacy Policy",
  path: "/privacy",

  sections: {
    hero: section({
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
      items: list({ iconImage: text(1000), title: required(120, "Every card needs a title."), bullets: text(1500) }, 6),
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
    beforeSharing: section({
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
      title: "Privacy Policy",
      subtitle: "How information shared through this website is handled.",
      statusBadge: "Draft for review",
      effectiveDate: "Effective date: To be confirmed",
      iconImage: "",
      image: "/panchakarma/p1.webp",
      imageAlt: "Vaidhyashala Privacy Policy - Ayurvedic Clinic & Panchakarma Centre",
    },
    summaryCards: {
      isActive: true,
      image: "/privicy/04_information_sharing_choices_cards.webp",
      imageAlt: "Information you share, Why it is requested, Your choices",
      items: [
        { iconImage: "", title: "Information you share", bullets: "Name, contact details\nEnquiry preferences\nMessages you submit" },
        { iconImage: "", title: "Why it is requested", bullets: "To respond to enquiries\nTo coordinate appointments\nTo provide product information" },
        {
          iconImage: "",
          title: "Your choices",
          bullets: "Optional fields may be left blank\nRequest correction or deletion\nYour information is shared only as described in this policy",
        },
      ],
    },
    policySections: {
      isActive: true,
      contentsLabel: "Contents",
      toBeConfirmedLabel: "To be confirmed",
      contactEmail: "[Confirmed privacy email]",
      contactPhone: "[Confirmed clinic phone]",
      items: [
        {
          number: "01",
          title: "Scope & responsibility",
          anchorId: "scope-responsibility",
          bullets:
            "This policy applies to information shared through the Vaidhyashala website, including appointment and enquiry forms.\nThis website is operated by Namo Gange Wellness Pvt. Ltd.\nFinal operational details, including exact services and workflows, are to be confirmed.",
          note: "",
          toBeConfirmed: true,
          showContactRow: false,
        },
        {
          number: "02",
          title: "Information you provide",
          anchorId: "information-you-provide",
          bullets:
            "Name, mobile number (optional) and email address (optional).\nPreferred service, visit date and type of consultation.\nProduct selection and any other information or messages you submit through the website forms.",
          note: "",
          toBeConfirmed: false,
          showContactRow: false,
        },
        {
          number: "03",
          title: "Sensitive health information",
          anchorId: "sensitive-health-information",
          bullets:
            "Share only details needed for your enquiry or appointment request.\nAvoid uploading medical reports or sensitive health information through general enquiry forms.\nClinical records or detailed health information, if required, will be shared through a separate process to be confirmed.",
          note: "",
          toBeConfirmed: false,
          showContactRow: false,
        },
        {
          number: "04",
          title: "Purpose of use",
          anchorId: "purpose-of-use",
          bullets:
            "To respond to your enquiries.\nTo coordinate requested consultations and appointments.\nTo provide information about products, services and availability.",
          note: "These are the intended uses, subject to final workflow confirmation.",
          toBeConfirmed: true,
          showContactRow: false,
        },
        {
          number: "05",
          title: "Cookies & website tools",
          anchorId: "cookies-website-tools",
          bullets:
            "The website may use cookies and third-party tools (e.g. analytics or embedded services) to understand website usage and improve functionality.\nCookie preferences and details will depend on the specific tools used and will be documented in the final version.\nNo claim is made that any specific trackers are currently installed.",
          note: "",
          toBeConfirmed: true,
          showContactRow: false,
        },
        {
          number: "06",
          title: "Access & sharing",
          anchorId: "access-sharing",
          bullets:
            "Access to information will be limited to authorised staff, and any service providers involved in website operations, to be confirmed.\nExternal services such as WhatsApp or map providers (if used) may have their own privacy policies.\nFinal sharing arrangements, including categories of service providers, will be documented in the final version.",
          note: "",
          toBeConfirmed: true,
          showContactRow: false,
        },
        {
          number: "07",
          title: "Storage, security & retention",
          anchorId: "storage-security-retention",
          bullets:
            "Website hosting location, storage systems and access controls are to be confirmed.\nRetention periods for different types of information will be defined in the final version.\nWhile we aim to use reasonable security measures, no specific security guarantees are made at this stage.",
          note: "",
          toBeConfirmed: true,
          showContactRow: false,
        },
        {
          number: "08",
          title: "Choices & privacy requests",
          anchorId: "choices-privacy-requests",
          bullets:
            "Optional fields may be left blank.\nYou can request correction or deletion of your information, where applicable.\nThe contact process and response arrangements for privacy requests will be finalised and included in the final version.",
          note: "",
          toBeConfirmed: false,
          showContactRow: false,
        },
        {
          number: "09",
          title: "Children & updates",
          anchorId: "children-updates",
          bullets:
            "If an enquiry involves a child, guardian requirements and consent processes will be confirmed.\nMaterial updates to this policy will be dated and explained in the final version.",
          note: "",
          toBeConfirmed: false,
          showContactRow: false,
        },
        {
          number: "10",
          title: "Contact & questions",
          anchorId: "contact-questions",
          bullets: "For privacy-related questions or requests, please contact:",
          note: "Response arrangements and expected timelines will be provided in the final version.",
          toBeConfirmed: false,
          showContactRow: true,
        },
      ],
    },
    beforeSharing: {
      isActive: true,
      heading: "Before sharing information",
      description: "A few things to keep in mind when using our website forms.",
      image: "/privicy/02_before_sharing_information.webp",
      imageAlt: "Before sharing information - A few things to keep in mind when using our website forms",
      items: [
        { number: "1", title: "Check your contact details", description: "Make sure your name, mobile and email are correct." },
        { number: "2", title: "Share only relevant information", description: "Provide only the details needed for your enquiry or appointment." },
        { number: "3", title: "Read the final published policy", description: "This draft will be updated with full details once confirmed." },
      ],
    },
    relatedLinks: {
      isActive: true,
      label: "Related Links",
      items: [{ label: "Terms of Use", link: "/terms" }],
    },
  },

  seoDefaults: {
    metaTitle: "Privacy Policy | The Vaidhyashala",
    metaDescription:
      "How information shared through the Vaidhyashala website is handled. Read our draft privacy policy for appointments, enquiries, and healthcare services.",
    metaKeywords: "Vaidhyashala privacy policy, data privacy, Ayurvedic clinic",
    canonicalUrl: "/privacy",
    ogTitle: "Privacy Policy — Vaidhyashala",
    ogDescription: "How information shared through this website is handled.",
    ogImage: "/panchakarma/p1.webp",
    h1Tag: "Privacy Policy",
    breadcrumbName: "Privacy Policy",
    robotsIndex: true,
    robotsFollow: true,
    schemaMarkup: "",
  },
};
