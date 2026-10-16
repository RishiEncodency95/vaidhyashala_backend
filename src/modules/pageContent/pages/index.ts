import { PageContentDefinition } from "../pageContent.types";
import { aboutUsPage } from "./aboutUs";
import { aboutStoryPage } from "./aboutStory";
import { treatmentsPage } from "./treatments";
import { panchakarmaPage } from "./panchakarma";
import { productsPage } from "./products";
import { contactPage } from "./contact";
import { privacyPage } from "./privacy";
import { termsPage } from "./terms";
import { testimonialsPage } from "./testimonials";

/** Every page managed through /api/cms/pages/:pageKey — add new pages here */
export const PAGE_DEFINITIONS: PageContentDefinition[] = [aboutUsPage, aboutStoryPage, treatmentsPage, panchakarmaPage, productsPage, contactPage, privacyPage, termsPage, testimonialsPage];

export const getPageDefinition = (key: string) => PAGE_DEFINITIONS.find((p) => p.key === key);

// The admin editor stores a section's own label and switch under these keys
const RESERVED_FIELDS = ["key", "name", "enabled", "slides", "_id"];
for (const def of PAGE_DEFINITIONS) {
  for (const [sectionKey, schema] of Object.entries(def.sections)) {
    const clash = Object.keys(schema.shape).find((field) => RESERVED_FIELDS.includes(field));
    if (clash) throw new Error(`Page "${def.key}", section "${sectionKey}": field "${clash}" is reserved, rename it`);
  }
}
