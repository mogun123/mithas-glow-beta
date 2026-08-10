// serviceCatalog.ts
// Static reference catalog used ONLY to power the "pick a service name" UI.
// This never touches the database directly — selecting an entry just
// pre-fills serviceForm.title / serviceForm.category, which the artist can
// still edit before saving to artist_services via Supabase (real data only).

export interface ServiceCatalogEntry {
  name: string;
  categoryId: string;
}

export interface ServiceCategory {
  id: string;
  label: string;
  emoji: string;
  services: string[];
}

export const SERVICE_CATALOG: ServiceCategory[] = [
  {
    id: 'hair',
    label: 'Hair services',
    emoji: '💇',
    services: [
      'Haircut', 'Hair Trim', 'Layer Cut', 'Bob Cut', 'Feather Cut', 'Step Cut',
      'U Cut', 'V Cut', 'Kids Haircut', 'Blow Dry', 'Hair Straightening',
      'Hair Curling', 'Hair Styling', 'Bridal Hairstyling', 'Party Hairstyling',
      'Hair Setting', 'Hair Extensions', 'Hair Spa', 'Deep Conditioning',
      'Scalp Detox', 'Anti-Dandruff Treatment', 'Hair Fall Treatment',
      'Keratin Treatment', 'Hair Smoothening', 'Hair Botox', 'Hair Rebonding', 'Perming',
    ],
  },
  {
    id: 'hair_color',
    label: 'Hair coloring',
    emoji: '🎨',
    services: [
      'Root Touch-Up', 'Global Hair Color', 'Highlights', 'Lowlights', 'Balayage',
      'Ombre', 'Fashion Color', 'Grey Coverage', 'Color Correction',
    ],
  },
  {
    id: 'skin_facial',
    label: 'Skin & facial',
    emoji: '✨',
    services: [
      'Basic Cleanup', 'Deep Cleanup', 'De-Tan Treatment', 'Fruit Facial',
      'Gold Facial', 'Diamond Facial', 'Pearl Facial', 'Anti-Aging Facial',
      'Acne / Pimple Facial', 'Hydrating Facial', 'Brightening Facial',
      'Korean Facial', 'Oxygen Facial', 'Hydrafacial', 'Skin Polishing',
      'Microdermabrasion', 'Chemical Peel', 'Face Massage', 'Face Mask',
      'Sheet Mask', 'Under-Eye Care', 'Lip Care', 'Neck Care',
    ],
  },
  {
    id: 'threading',
    label: 'Threading',
    emoji: '🧵',
    services: [
      'Eyebrow Threading', 'Upper Lip', 'Lower Lip', 'Chin', 'Forehead',
      'Side Locks', 'Full Face Threading', 'Eyebrow Shaping',
    ],
  },
  {
    id: 'waxing',
    label: 'Waxing & hair removal',
    emoji: '🪒',
    services: [
      'Upper Lip Wax', 'Face Wax', 'Full Arms', 'Half Arms', 'Full Legs',
      'Half Legs', 'Underarms', 'Back Wax', 'Chest Wax', 'Stomach Wax',
      'Full Body Wax', 'Bikini Wax', 'Brazilian Wax', 'Nose Wax', 'Ear Wax',
      'Rica Wax', 'Sugar Wax',
    ],
  },
  {
    id: 'nails',
    label: 'Nail services',
    emoji: '💅',
    services: [
      'Classic Manicure', 'Spa Manicure', 'Gel Manicure', 'Classic Pedicure',
      'Spa Pedicure', 'Gel Pedicure', 'Nail Extensions', 'Gel Extensions',
      'Acrylic Extensions', 'Gel Polish', 'Nail Art', 'French Tips',
      'Chrome Nails', 'Ombre Nails', 'Nail Repair', 'Nail Extension Refill',
      'Nail Removal', 'Cuticle Care', 'Paraffin Hand Spa', 'Paraffin Foot Spa',
    ],
  },
  {
    id: 'brows_lashes',
    label: 'Brows & lashes',
    emoji: '👁️',
    services: [
      'Brow Shaping', 'Brow Tint', 'Brow Lamination', 'Lash Tint', 'Lash Lift',
      'Classic Lash Extensions', 'Volume Lash Extensions', 'Hybrid Lash Extensions',
      'Lash Removal', 'False Eyelash Application',
    ],
  },
  {
    id: 'spa_body',
    label: 'Spa & body care',
    emoji: '💆',
    services: [
      'Head Massage', 'Neck & Shoulder Massage', 'Back Massage', 'Foot Massage',
      'Full Body Massage', 'Swedish Massage', 'Aromatherapy Massage',
      'Foot Reflexology', 'Hot Oil Massage', 'Body Scrub', 'Body Polish',
      'Body Wrap', 'Steam Therapy', 'Hand Spa', 'Foot Spa',
    ],
  },
  {
    id: 'makeup',
    label: 'Makeup services',
    emoji: '💄',
    services: [
      'Basic Makeup', 'Party Makeup', 'HD Makeup', 'Airbrush Makeup',
      'Engagement Makeup', 'Reception Makeup', 'Bridal Makeup', 'Groom Makeup',
      'Eye Makeup', 'Lip Makeup', 'Makeup Touch-Up', 'Makeup Trial',
      'Photoshoot Makeup',
    ],
  },
  {
    id: 'bridal',
    label: 'Bridal services',
    emoji: '👰',
    services: [
      'Bridal Makeup', 'Bridal Hairstyling', 'Saree Draping', 'Dupatta Draping',
      'Bridal Mehendi', 'Pre-Bridal Package', 'Bridal Skin Preparation',
      'Bridal Hair Spa', 'Bridal Facial', 'Bridal Waxing', 'Bridal Manicure',
      'Bridal Pedicure', 'Complete Bridal Package',
    ],
  },
  {
    id: 'mehendi',
    label: 'Mehendi',
    emoji: '🌿',
    services: [
      'Bridal Mehendi', 'Arabic Mehendi', 'Traditional Mehendi', 'Minimal Mehendi',
      'Engagement Mehendi', 'Kids Mehendi', 'Hand Mehendi', 'Feet Mehendi',
      'Custom Mehendi Design',
    ],
  },
  {
    id: 'mens_grooming',
    label: "Men's grooming",
    emoji: '👨',
    services: [
      "Men's Haircut", 'Beard Trim', 'Beard Styling', 'Beard Shaping',
      'Beard Coloring', "Men's Hair Coloring", "Men's Hair Spa", "Men's Facial",
      "Men's Cleanup", "Men's De-Tan", "Men's Waxing", "Men's Manicure",
      "Men's Pedicure", 'Head Massage', 'Groom Makeup', 'Groom Package',
    ],
  },
  {
    id: 'advanced_skin',
    label: 'Advanced beauty / skin',
    emoji: '🧴',
    services: [
      'Acne Care', 'Pigmentation Care', 'De-Tan Treatment', 'Skin Brightening',
      'Skin Hydration', 'Anti-Aging Care', 'Pore Care', 'Blackhead Removal',
      'Whitehead Removal', 'Under-Eye Treatment', 'Lip Pigmentation Care',
      'Neck De-Tan',
    ],
  },
];

// Flat lookup used for search-as-you-type across all categories at once.
export const ALL_SERVICES: ServiceCatalogEntry[] = SERVICE_CATALOG.flatMap((cat) =>
  cat.services.map((name) => ({ name, categoryId: cat.id }))
);

export function searchServiceCatalog(query: string, limit = 8): ServiceCatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ALL_SERVICES.filter((entry) => entry.name.toLowerCase().includes(q)).slice(0, limit);
}

export function getCategoryLabel(categoryId: string): string {
  return SERVICE_CATALOG.find((c) => c.id === categoryId)?.label || categoryId;
}
