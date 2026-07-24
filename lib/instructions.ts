// Registry of activation guides. One entry per platform — drives the
// /instructions index and the "Инструкции по активации" list in the profile.
// Add a new guide here + its component + /instructions/<slug>/page.tsx.
export const ACTIVATION_GUIDES = [
  {
    slug: "playstation",
    title: "Активация PlayStation",
    desc: "Как активировать код пополнения PlayStation на консоли и через сайт.",
  },
  {
    slug: "xbox",
    title: "Активация Xbox",
    desc: "Как активировать код Xbox Gift Card и ответы на частые вопросы.",
  },
  {
    slug: "nintendo",
    title: "Активация Nintendo",
    desc: "Как активировать код Nintendo eShop на консоли Switch и через сайт.",
  },
  {
    slug: "apple",
    title: "Активация App Store",
    desc: "Как активировать код App Store (iTunes) на iPhone, iPad и Mac.",
  },
] as const;

export type ActivationGuideSlug = (typeof ACTIVATION_GUIDES)[number]["slug"];
