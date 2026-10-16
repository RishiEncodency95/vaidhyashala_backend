/**
 * Home 1 (website "/" — The Vaidhyashala Health Journal) content as it ships on the website
 * today (vds_frontend/src/components/HeroJournal, SearchFilter, FeaturedArticle, ArticleGrid,
 * ConsultationCTA and src/data/articles.ts). Used by the seed script and as the fallback when
 * a section has never been saved. Image paths are relative to the website's /public folder.
 */

export const HOME1_PAGE_KEY = "home1";

export const HOME1_SECTION_KEYS = ["hero", "searchFilter", "featured", "articlesSection", "cta"] as const;
export type Home1SectionKey = (typeof HOME1_SECTION_KEYS)[number];

export const defaultHome1Sections = {
  hero: {
    isActive: true,
    breadcrumbHomeLabel: "Home",
    breadcrumbHomeHref: "/home",
    breadcrumbCurrentLabel: "Health Journal",
    titleLine1: "The Vaidhyashala",
    titleLine2: "Health Journal",
    titleAccent: ".",
    subtitle: "Explore Ayurveda, therapies and thoughtful everyday routines.",
    backgroundImage: "/hero.webp",
    backgroundImageAlt: "The Vaidhyashala Health Journal - Ayurveda herbs, brass mortar, pestle, and journal",
  },
  searchFilter: {
    isActive: true,
    searchPlaceholder: "Search articles...",
    allCategoryLabel: "All",
    noResultsMessage: "No articles found matching your criteria.",
  },
  featured: {
    isActive: true,
    eyebrow: "Featured Article",
    buttonLabel: "Read Article",
    decorativeImage: "/cont.webp",
    decorativeImageAlt: "Decorative leaves illustration",
  },
  articlesSection: {
    isActive: true,
    eyebrow: "Explore the Journal",
    heading: "Articles for a more conscious, balanced life.",
    notice: "Illustrative article previews — editorial content to be finalised.",
    readMoreLabel: "Read Article",
    loadMoreLabel: "Load More Articles",
    initialCount: 6,
    loadMoreStep: 3,
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

export const defaultHome1Seo = {
  metaTitle: "The Vaidhyashala Health Journal | Ayurvedic Clinic & Panchakarma Centre",
  metaDescription:
    "Explore Ayurveda, Panchakarma therapies, yoga and thoughtful everyday routines with articles and clinic guidance from Vaidhyashala.",
  metaKeywords: "Vaidhyashala, Ayurveda, Panchakarma, Ayurvedic clinic, health journal, yoga, lifestyle",
  canonicalUrl: "/",
  ogTitle: "The Vaidhyashala Health Journal",
  ogDescription: "Explore Ayurveda, therapies and thoughtful everyday routines.",
  ogImage: "/hero.webp",
  robotsIndex: true,
  robotsFollow: true,
  schemaMarkup: "",
};

export const defaultHome1Categories = [
  { name: "Ayurveda", slug: "ayurveda", order: 1 },
  { name: "Panchakarma", slug: "panchakarma", order: 2 },
  { name: "Yoga & Lifestyle", slug: "yoga-lifestyle", order: 3 },
  { name: "Clinic Guidance", slug: "clinic-guidance", order: 4 },
];

/** `category` is the category slug */
export const defaultHome1Articles = [
  {
    title: "Your first Ayurvedic consultation: what to prepare",
    slug: "your-first-ayurvedic-consultation-what-to-prepare",
    excerpt:
      "A helpful guide to making the most of your first visit, including what to bring, how to prepare your list of current medicines, relevant reports and the questions you may wish to discuss with your doctor.",
    category: "clinic-guidance",
    image: "/h2.webp",
    imageAlt: "Ayurvedic doctor in consultation with a patient in a serene clinic room",
    isFeatured: true,
    order: 0,
  },
  {
    title: "Understanding Panchakarma",
    slug: "understanding-panchakarma",
    excerpt:
      "An introduction to Panchakarma therapies, what to expect and how they are planned to suit your individual needs.",
    category: "panchakarma",
    image: "/a1.webp",
    imageAlt: "Ayurvedic practitioner administering soothing Shirodhara oil therapy",
    isFeatured: false,
    order: 1,
  },
  {
    title: "What to ask before planning a therapy",
    slug: "what-to-ask-before-planning-a-therapy",
    excerpt:
      "Key questions to help you have a meaningful discussion with your doctor and make informed choices about your treatment plan.",
    category: "clinic-guidance",
    image: "/a2.webp",
    imageAlt: "Patient having a detailed treatment planning discussion with the doctor",
    isFeatured: false,
    order: 2,
  },
  {
    title: "Yoga practices and individual suitability",
    slug: "yoga-practices-and-individual-suitability",
    excerpt:
      "An overview of common yoga practices and how to choose routines that align with your lifestyle, needs and comfort level.",
    category: "yoga-lifestyle",
    image: "/a3.webp",
    imageAlt: "Woman practicing seated yoga and mindfulness meditation in a peaceful room",
    isFeatured: false,
    order: 3,
  },
  {
    title: "Building a thoughtful daily routine",
    slug: "building-a-thoughtful-daily-routine",
    excerpt:
      "Simple guidance on everyday routines, dietary awareness and lifestyle habits to support your overall well-being.",
    category: "yoga-lifestyle",
    image: "/a4.webp",
    imageAlt: "Nutritious Ayurvedic herbal meal, traditional brass cup, and medicinal herbs",
    isFeatured: false,
    order: 4,
  },
  {
    title: "Reading Ayurvedic product labels",
    slug: "reading-ayurvedic-product-labels",
    excerpt:
      "Understand how to read Ayurvedic formulations, common ingredients and what to look for when choosing products for your needs.",
    category: "ayurveda",
    image: "/a5.webp",
    imageAlt: "Bottles of Ayurvedic herbal oils and botanical formulations with labels",
    isFeatured: false,
    order: 5,
  },
  {
    title: "Preparing for your clinic visit",
    slug: "preparing-for-your-clinic-visit",
    excerpt:
      "A simple checklist to help you feel prepared and comfortable for your upcoming consultation or therapy session.",
    category: "clinic-guidance",
    image: "/a6.webp",
    imageAlt: "Serene Ayurvedic clinic therapy bed prepared with traditional brass singing bowls",
    isFeatured: false,
    order: 6,
  },
];
