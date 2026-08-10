// serviceCatalog.ts
// Production-ready static beauty/service catalog.
// UI/reference data only.
// Does NOT read/write Supabase.
//
// Compatible with:
//   SERVICE_CATALOG
//   ALL_SERVICES
//   searchServiceCatalog()
//   getCategoryLabel()
//
// Design goals:
// - Stable IDs
// - No accidental duplicate entries
// - Fast search
// - Better search relevance
// - Aliases / keywords
// - Category-aware search
// - Featured/popular services
// - Type-safe helpers
// - Easy future expansion

export interface ServiceCatalogEntry {
  id: string;
  name: string;
  categoryId: string;
  categoryLabel: string;
  emoji: string;

  /**
   * Alternative words customers may type.
   * Example:
   * "hair cut" -> Haircut
   */
  aliases?: string[];

  /**
   * Search keywords.
   */
  keywords?: string[];

  /**
   * Helps surface commonly requested services.
   */
  popular?: boolean;

  /**
   * Optional featured service.
   */
  featured?: boolean;
}

export interface ServiceCategory {
  id: string;
  label: string;
  shortLabel: string;
  emoji: string;
  description: string;
  services: string[];
}

/* -------------------------------------------------------------------------- */
/* CATEGORY DEFINITIONS                                                       */
/* -------------------------------------------------------------------------- */

export const SERVICE_CATALOG: ServiceCategory[] = [
  {
    id: 'hair',
    label: 'Hair Services',
    shortLabel: 'Hair',
    emoji: '💇',
    description: 'Cuts, styling, treatments and hair care.',
    services: [
      'Haircut',
      'Hair Trim',
      'Layer Cut',
      'Bob Cut',
      'Feather Cut',
      'Step Cut',
      'U Cut',
      'V Cut',
      'Kids Haircut',
      'Blow Dry',
      'Hair Straightening',
      'Hair Curling',
      'Hair Styling',
      'Bridal Hairstyling',
      'Party Hairstyling',
      'Hair Setting',
      'Hair Extensions',
      'Hair Spa',
      'Deep Conditioning',
      'Scalp Detox',
      'Anti-Dandruff Treatment',
      'Hair Fall Treatment',
      'Keratin Treatment',
      'Hair Smoothening',
      'Hair Botox',
      'Hair Rebonding',
      'Perming',
    ],
  },

  {
    id: 'hair_color',
    label: 'Hair Coloring',
    shortLabel: 'Color',
    emoji: '🎨',
    description: 'Professional hair coloring and highlights.',
    services: [
      'Root Touch-Up',
      'Global Hair Color',
      'Highlights',
      'Lowlights',
      'Balayage',
      'Ombre',
      'Fashion Color',
      'Grey Coverage',
      'Color Correction',
    ],
  },

  {
    id: 'skin_facial',
    label: 'Skin & Facial',
    shortLabel: 'Facial',
    emoji: '✨',
    description: 'Facials, cleanup and skin care services.',
    services: [
      'Basic Cleanup',
      'Deep Cleanup',
      'De-Tan Treatment',
      'Fruit Facial',
      'Gold Facial',
      'Diamond Facial',
      'Pearl Facial',
      'Anti-Aging Facial',
      'Acne / Pimple Facial',
      'Hydrating Facial',
      'Brightening Facial',
      'Korean Facial',
      'Oxygen Facial',
      'Hydrafacial',
      'Skin Polishing',
      'Microdermabrasion',
      'Chemical Peel',
      'Face Massage',
      'Face Mask',
      'Sheet Mask',
      'Under-Eye Care',
      'Lip Care',
      'Neck Care',
    ],
  },

  {
    id: 'threading',
    label: 'Threading',
    shortLabel: 'Threading',
    emoji: '🧵',
    description: 'Face and eyebrow threading services.',
    services: [
      'Eyebrow Threading',
      'Upper Lip',
      'Lower Lip',
      'Chin',
      'Forehead',
      'Side Locks',
      'Full Face Threading',
      'Eyebrow Shaping',
    ],
  },

  {
    id: 'waxing',
    label: 'Waxing & Hair Removal',
    shortLabel: 'Waxing',
    emoji: '🪒',
    description: 'Waxing and body hair removal services.',
    services: [
      'Upper Lip Wax',
      'Face Wax',
      'Full Arms',
      'Half Arms',
      'Full Legs',
      'Half Legs',
      'Underarms',
      'Back Wax',
      'Chest Wax',
      'Stomach Wax',
      'Full Body Wax',
      'Bikini Wax',
      'Brazilian Wax',
      'Nose Wax',
      'Ear Wax',
      'Rica Wax',
      'Sugar Wax',
    ],
  },

  {
    id: 'nails',
    label: 'Nail Services',
    shortLabel: 'Nails',
    emoji: '💅',
    description: 'Manicure, pedicure, extensions and nail art.',
    services: [
      'Classic Manicure',
      'Spa Manicure',
      'Gel Manicure',
      'Classic Pedicure',
      'Spa Pedicure',
      'Gel Pedicure',
      'Nail Extensions',
      'Gel Extensions',
      'Acrylic Extensions',
      'Gel Polish',
      'Nail Art',
      'French Tips',
      'Chrome Nails',
      'Ombre Nails',
      'Nail Repair',
      'Nail Extension Refill',
      'Nail Removal',
      'Cuticle Care',
      'Paraffin Hand Spa',
      'Paraffin Foot Spa',
    ],
  },

  {
    id: 'brows_lashes',
    label: 'Brows & Lashes',
    shortLabel: 'Brows & Lashes',
    emoji: '👁️',
    description: 'Eyebrow and eyelash enhancement services.',
    services: [
      'Brow Shaping',
      'Brow Tint',
      'Brow Lamination',
      'Lash Tint',
      'Lash Lift',
      'Classic Lash Extensions',
      'Volume Lash Extensions',
      'Hybrid Lash Extensions',
      'Lash Removal',
      'False Eyelash Application',
    ],
  },

  {
    id: 'spa_body',
    label: 'Spa & Body Care',
    shortLabel: 'Spa',
    emoji: '💆',
    description: 'Relaxation, massage and body care services.',
    services: [
      'Head Massage',
      'Neck & Shoulder Massage',
      'Back Massage',
      'Foot Massage',
      'Full Body Massage',
      'Swedish Massage',
      'Aromatherapy Massage',
      'Foot Reflexology',
      'Hot Oil Massage',
      'Body Scrub',
      'Body Polish',
      'Body Wrap',
      'Steam Therapy',
      'Hand Spa',
      'Foot Spa',
    ],
  },

  {
    id: 'makeup',
    label: 'Makeup Services',
    shortLabel: 'Makeup',
    emoji: '💄',
    description: 'Party, bridal, HD and professional makeup.',
    services: [
      'Basic Makeup',
      'Party Makeup',
      'HD Makeup',
      'Airbrush Makeup',
      'Engagement Makeup',
      'Reception Makeup',
      'Bridal Makeup',
      'Groom Makeup',
      'Eye Makeup',
      'Lip Makeup',
      'Makeup Touch-Up',
      'Makeup Trial',
      'Photoshoot Makeup',
    ],
  },

  {
    id: 'bridal',
    label: 'Bridal Services',
    shortLabel: 'Bridal',
    emoji: '👰',
    description: 'Complete bridal beauty and preparation services.',
    services: [
      'Bridal Makeup',
      'Bridal Hairstyling',
      'Saree Draping',
      'Dupatta Draping',
      'Bridal Mehendi',
      'Pre-Bridal Package',
      'Bridal Skin Preparation',
      'Bridal Hair Spa',
      'Bridal Facial',
      'Bridal Waxing',
      'Bridal Manicure',
      'Bridal Pedicure',
      'Complete Bridal Package',
    ],
  },

  {
    id: 'mehendi',
    label: 'Mehendi',
    shortLabel: 'Mehendi',
    emoji: '🌿',
    description: 'Traditional, Arabic and bridal mehendi.',
    services: [
      'Bridal Mehendi',
      'Arabic Mehendi',
      'Traditional Mehendi',
      'Minimal Mehendi',
      'Engagement Mehendi',
      'Kids Mehendi',
      'Hand Mehendi',
      'Feet Mehendi',
      'Custom Mehendi Design',
    ],
  },

  {
    id: 'mens_grooming',
    label: "Men's Grooming",
    shortLabel: "Men's",
    emoji: '👨',
    description: "Men's haircut, beard, facial and grooming.",
    services: [
      "Men's Haircut",
      'Beard Trim',
      'Beard Styling',
      'Beard Shaping',
      'Beard Coloring',
      "Men's Hair Coloring",
      "Men's Hair Spa",
      "Men's Facial",
      "Men's Cleanup",
      "Men's De-Tan",
      "Men's Waxing",
      "Men's Manicure",
      "Men's Pedicure",
      'Head Massage',
      'Groom Makeup',
      'Groom Package',
    ],
  },

  {
    id: 'advanced_skin',
    label: 'Advanced Beauty & Skin',
    shortLabel: 'Advanced Skin',
    emoji: '🧴',
    description: 'Targeted skin concerns and advanced beauty care.',
    services: [
      'Acne Care',
      'Pigmentation Care',
      'De-Tan Treatment',
      'Skin Brightening',
      'Skin Hydration',
      'Anti-Aging Care',
      'Pore Care',
      'Blackhead Removal',
      'Whitehead Removal',
      'Under-Eye Treatment',
      'Lip Pigmentation Care',
      'Neck De-Tan',
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* NORMALIZATION                                                               */
/* -------------------------------------------------------------------------- */

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* -------------------------------------------------------------------------- */
/* STABLE ID                                                                   */
/* -------------------------------------------------------------------------- */

function createServiceId(categoryId: string, serviceName: string): string {
  return `${categoryId}:${normalize(serviceName)
    .replace(/\s+/g, '-')
    .replace(/^-|-$/g, '')}`;
}

/* -------------------------------------------------------------------------- */
/* SEARCH ALIASES                                                              */
/* -------------------------------------------------------------------------- */

const SERVICE_ALIASES: Record<string, string[]> = {
  Haircut: ['hair cut', 'hair cut for women', 'salon haircut'],
  'Hair Trim': ['trim', 'hair trim'],
  'Layer Cut': ['layer haircut', 'layers'],
  'Blow Dry': ['blowdry', 'blow dry hair'],

  'Hair Straightening': ['straightening', 'hair straight'],
  'Hair Curling': ['curling', 'hair curls'],
  'Hair Spa': ['hair spa treatment'],
  'Keratin Treatment': ['keratin'],
  'Hair Smoothening': ['smoothening', 'hair smoothing'],

  'Root Touch-Up': ['root touch up', 'roots'],
  'Global Hair Color': ['global color', 'hair colour'],
  Highlights: ['hair highlights'],
  Balayage: ['balayage hair'],

  'Basic Cleanup': ['cleanup', 'clean up'],
  'Deep Cleanup': ['deep clean up'],
  'De-Tan Treatment': ['detan', 'de tan', 'tan removal'],
  Hydrafacial: ['hydra facial', 'hydra-facial'],
  'Chemical Peel': ['peel'],

  'Eyebrow Threading': ['eyebrow', 'brow threading', 'eye brow'],
  'Upper Lip': ['lip threading', 'upper lip threading'],

  'Full Body Wax': ['full body waxing', 'body wax'],
  'Underarms': ['underarm', 'under arms'],

  'Classic Manicure': ['manicure'],
  'Classic Pedicure': ['pedicure'],
  'Nail Extensions': ['nail extension'],
  'Nail Art': ['nail design'],

  'Brow Shaping': ['eyebrow shaping', 'brow'],
  'Lash Lift': ['eyelash lift'],
  'Lash Tint': ['eyelash tint'],

  'Head Massage': ['head massage', 'scalp massage'],
  'Full Body Massage': ['body massage', 'full body massage'],

  'Basic Makeup': ['make up', 'basic make up'],
  'Party Makeup': ['party make up'],
  'HD Makeup': ['hd make up', 'hd bridal makeup'],
  'Airbrush Makeup': ['air brush makeup'],
  'Bridal Makeup': ['bridal make up', 'bride makeup'],
  'Groom Makeup': ['groom make up', 'men makeup'],

  'Bridal Hairstyling': ['bridal hair', 'bridal hairstyle'],
  'Saree Draping': ['saree drape', 'sari draping'],
  'Complete Bridal Package': ['bridal package', 'full bridal package'],

  'Bridal Mehendi': ['bridal mehndi', 'bridal henna'],
  'Arabic Mehendi': ['arabic mehndi', 'arabic henna'],
  'Traditional Mehendi': ['mehndi', 'henna'],

  "Men's Haircut": ['mens haircut', "men's haircut", 'gents haircut'],
  'Beard Trim': ['beard trimming'],
  'Beard Styling': ['beard style'],
  'Beard Shaping': ['beard shape'],
  "Men's Facial": ['men facial', 'mens facial'],
};

/* -------------------------------------------------------------------------- */
/* POPULAR SERVICES                                                            */
/* -------------------------------------------------------------------------- */

const POPULAR_SERVICES = new Set([
  'Haircut',
  'Hair Trim',
  'Hair Spa',
  'Keratin Treatment',
  'Global Hair Color',
  'Highlights',
  'Basic Cleanup',
  'De-Tan Treatment',
  'Hydrafacial',
  'Eyebrow Threading',
  'Full Face Threading',
  'Full Body Wax',
  'Classic Manicure',
  'Gel Manicure',
  'Classic Pedicure',
  'Nail Art',
  'Lash Lift',
  'Head Massage',
  'Full Body Massage',
  'Party Makeup',
  'HD Makeup',
  'Airbrush Makeup',
  'Bridal Makeup',
  'Engagement Makeup',
  'Bridal Hairstyling',
  'Saree Draping',
  'Bridal Mehendi',
  'Arabic Mehendi',
  "Men's Haircut",
  'Beard Trim',
  'Beard Styling',
  "Men's Facial",
]);

/* -------------------------------------------------------------------------- */
/* FEATURED SERVICES                                                           */
/* -------------------------------------------------------------------------- */

const FEATURED_SERVICES = new Set([
  'HD Makeup',
  'Airbrush Makeup',
  'Bridal Makeup',
  'Hydrafacial',
  'Balayage',
  'Keratin Treatment',
  'Hair Botox',
  'Gel Extensions',
  'Classic Lash Extensions',
  'Brow Lamination',
  'Complete Bridal Package',
]);

/* -------------------------------------------------------------------------- */
/* BUILD FLAT CATALOG                                                          */
/* -------------------------------------------------------------------------- */

function buildCatalog(): ServiceCatalogEntry[] {
  const result: ServiceCatalogEntry[] = [];
  const seen = new Set<string>();

  for (const category of SERVICE_CATALOG) {
    for (const name of category.services) {
      const normalizedName = normalize(name);

      // Prevent accidental duplicate services inside the same category.
      const uniqueKey = `${category.id}:${normalizedName}`;

      if (seen.has(uniqueKey)) {
        continue;
      }

      seen.add(uniqueKey);

      result.push({
        id: createServiceId(category.id, name),
        name,
        categoryId: category.id,
        categoryLabel: category.label,
        emoji: category.emoji,
        aliases: SERVICE_ALIASES[name] || [],
        keywords: [
          normalizedName,
          category.label,
          category.shortLabel,
        ],
        popular: POPULAR_SERVICES.has(name),
        featured: FEATURED_SERVICES.has(name),
      });
    }
  }

  return result;
}

export const ALL_SERVICES: ServiceCatalogEntry[] = buildCatalog();

/* -------------------------------------------------------------------------- */
/* INDEXES                                                                      */
/* -------------------------------------------------------------------------- */

const SERVICE_BY_ID = new Map(
  ALL_SERVICES.map((service) => [service.id, service])
);

const CATEGORY_BY_ID = new Map(
  SERVICE_CATALOG.map((category) => [category.id, category])
);

/* -------------------------------------------------------------------------- */
/* SEARCH SCORE                                                                */
/* -------------------------------------------------------------------------- */

function scoreService(
  service: ServiceCatalogEntry,
  query: string
): number {
  const q = normalize(query);

  if (!q) return 0;

  const name = normalize(service.name);
  const aliases = (service.aliases || []).map(normalize);
  const keywords = (service.keywords || []).map(normalize);

  let score = 0;

  // Exact service name.
  if (name === q) {
    score += 1000;
  }

  // Exact alias.
  if (aliases.includes(q)) {
    score += 900;
  }

  // Name starts with query.
  if (name.startsWith(q)) {
    score += 700;
  }

  // Alias starts with query.
  if (aliases.some((alias) => alias.startsWith(q))) {
    score += 600;
  }

  // Name contains query.
  if (name.includes(q)) {
    score += 500;
  }

  // Alias contains query.
  if (aliases.some((alias) => alias.includes(q))) {
    score += 400;
  }

  // Keyword/category match.
  if (keywords.some((keyword) => keyword.includes(q))) {
    score += 200;
  }

  // Popular services get a small boost.
  if (service.popular) {
    score += 25;
  }

  // Featured services get another small boost.
  if (service.featured) {
    score += 15;
  }

  return score;
}

/* -------------------------------------------------------------------------- */
/* SEARCH                                                                      */
/* -------------------------------------------------------------------------- */

export function searchServiceCatalog(
  query: string,
  limit = 8,
  categoryId?: string
): ServiceCatalogEntry[] {
  const q = query.trim();

  if (!q) {
    return [];
  }

  const safeLimit = Math.max(1, Math.min(limit, 50));

  const candidates = categoryId
    ? ALL_SERVICES.filter((service) => service.categoryId === categoryId)
    : ALL_SERVICES;

  return candidates
    .map((service) => ({
      service,
      score: scoreService(service, q),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.service.name.localeCompare(b.service.name);
    })
    .slice(0, safeLimit)
    .map((item) => item.service);
}

/* -------------------------------------------------------------------------- */
/* CATEGORY HELPERS                                                            */
/* -------------------------------------------------------------------------- */

export function getCategoryLabel(categoryId: string): string {
  return CATEGORY_BY_ID.get(categoryId)?.label || categoryId;
}

export function getCategoryShortLabel(categoryId: string): string {
  return CATEGORY_BY_ID.get(categoryId)?.shortLabel || categoryId;
}

export function getCategoryEmoji(categoryId: string): string {
  return CATEGORY_BY_ID.get(categoryId)?.emoji || '✨';
}

export function getCategoryDescription(categoryId: string): string {
  return CATEGORY_BY_ID.get(categoryId)?.description || '';
}

export function getCategoryById(
  categoryId: string
): ServiceCategory | undefined {
  return CATEGORY_BY_ID.get(categoryId);
}

/* -------------------------------------------------------------------------- */
/* SERVICE HELPERS                                                             */
/* -------------------------------------------------------------------------- */

export function getServiceById(
  serviceId: string
): ServiceCatalogEntry | undefined {
  return SERVICE_BY_ID.get(serviceId);
}

export function getServicesByCategory(
  categoryId: string
): ServiceCatalogEntry[] {
  return ALL_SERVICES.filter(
    (service) => service.categoryId === categoryId
  );
}

export function getPopularServices(
  limit = 20
): ServiceCatalogEntry[] {
  return ALL_SERVICES
    .filter((service) => service.popular)
    .slice(0, Math.max(1, limit));
}

export function getFeaturedServices(
  limit = 20
): ServiceCatalogEntry[] {
  return ALL_SERVICES
    .filter((service) => service.featured)
    .slice(0, Math.max(1, limit));
}

/* -------------------------------------------------------------------------- */
/* VALIDATION                                                                  */
/* -------------------------------------------------------------------------- */

export function isValidCategoryId(categoryId: string): boolean {
  return CATEGORY_BY_ID.has(categoryId);
}

export function isCatalogService(
  serviceName: string,
  categoryId?: string
): boolean {
  const normalizedName = normalize(serviceName);

  return ALL_SERVICES.some((service) => {
    if (categoryId && service.categoryId !== categoryId) {
      return false;
    }

    return normalize(service.name) === normalizedName;
  });
}

/* -------------------------------------------------------------------------- */
/* CATEGORY OPTIONS FOR UI                                                     */
/* -------------------------------------------------------------------------- */

export interface ServiceCategoryOption {
  id: string;
  label: string;
  shortLabel: string;
  emoji: string;
  description: string;
  serviceCount: number;
}

export const SERVICE_CATEGORY_OPTIONS: ServiceCategoryOption[] =
  SERVICE_CATALOG.map((category) => ({
    id: category.id,
    label: category.label,
    shortLabel: category.shortLabel,
    emoji: category.emoji,
    description: category.description,
    serviceCount: category.services.length,
  }));

/* -------------------------------------------------------------------------- */
/* POPULAR CATEGORY SERVICES                                                   */
/* -------------------------------------------------------------------------- */

export function getPopularServicesByCategory(
  categoryId: string,
  limit = 10
): ServiceCatalogEntry[] {
  return ALL_SERVICES
    .filter(
      (service) =>
        service.categoryId === categoryId &&
        service.popular
    )
    .slice(0, Math.max(1, limit));
}

/* -------------------------------------------------------------------------- */
/* DEFAULT / EMPTY SEARCH                                                      */
/* -------------------------------------------------------------------------- */

export function getRecommendedServices(
  categoryId?: string,
  limit = 8
): ServiceCatalogEntry[] {
  const source = categoryId
    ? ALL_SERVICES.filter(
        (service) => service.categoryId === categoryId
      )
    : ALL_SERVICES;

  return source
    .slice()
    .sort((a, b) => {
      if (Boolean(b.featured) !== Boolean(a.featured)) {
        return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
      }

      if (Boolean(b.popular) !== Boolean(a.popular)) {
        return Number(Boolean(b.popular)) - Number(Boolean(a.popular));
      }

      return a.name.localeCompare(b.name);
    })
    .slice(0, Math.max(1, limit));
}

/* -------------------------------------------------------------------------- */
/* CATALOG STATS                                                               */
/* -------------------------------------------------------------------------- */

export const SERVICE_CATALOG_STATS = {
  categories: SERVICE_CATALOG.length,
  services: ALL_SERVICES.length,
  popularServices: ALL_SERVICES.filter((s) => s.popular).length,
  featuredServices: ALL_SERVICES.filter((s) => s.featured).length,
};
