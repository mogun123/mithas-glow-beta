import type { Mode } from '../MirrorScreen';

// Define missing types locally to avoid import issues
export interface Look {
  name: string;
  desc: string;
  icon: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  ar: boolean;
  image: string;
  bundle: boolean;
  seller: string;
  delivery: string;
}

export type ShopCategory = string;

export const LOOKS_DATA: Record<Mode, Look[]> = {
  'Office/College': [
    { name: "Everyday Subtle Glam", desc: "AI Suggestion: Natural look suitable for daily wear.", icon: "briefcase" },
    { name: "Casual Work Look", desc: "AI Suggestion: Ideal for meetings and workplace confidence.", icon: "glasses" },
    { name: "Quick Daytime Style", desc: "AI Suggestion: A fast, easy-to-apply style.", icon: "coffee" }
  ],
  'Party Glam': [
    { name: "Sunset Glow", desc: "AI Suggestion: Warm, radiant look perfect for evening events.", icon: "sun-medium" },
    { name: "Smoky Eye Drama", desc: "AI Suggestion: Bright look perfect for evening parties.", icon: "sparkles" },
    { name: "Electric Blue Liner", desc: "AI Suggestion: Bold liner and minimalist lip for a modern party.", icon: "zap" },
    { name: "Cocktail Dress Overlay", desc: "AI Suggestion: Trendy look matching modern outfits.", icon: "cup-soda" }
  ],
  'Bridal Full Set': [
    { name: "Traditional Bride Look", desc: "AI Suggestion: Best for your skin tone and features.", icon: "heart-handshake" },
    { name: "Christian Bride Look", desc: "AI Suggestion: Fresh style with light makeup.", icon: "church" },
    { name: "Muslim Bride Look", desc: "AI Suggestion: Royal and sophisticated appearance.", icon: "moon" }
  ],
  'Professional Work': [
    { name: "Business Formal Look", desc: "AI Suggestion: Minimalist makeup for a polished appearance.", icon: "building" },
    { name: "Power Suit Style", desc: "AI Suggestion: Sharp hairstyle and formal wear overlay.", icon: "zap" }
  ],
  'Reception': [
    { name: "Elegant Evening Look", desc: "AI Suggestion: Sophisticated style perfect for reception events.", icon: "sparkles" },
    { name: "Subtle Glamour", desc: "AI Suggestion: Refined look for evening celebrations.", icon: "star" }
  ],
  'Casual': [
    { name: "Natural Everyday", desc: "AI Suggestion: Simple and fresh for casual outings.", icon: "sun" },
    { name: "Weekend Vibes", desc: "AI Suggestion: Relaxed style for leisure time.", icon: "coffee" }
  ],
  };

export interface DIYStep {
  title: string;
  detail: string;
}

export const DIY_INSTRUCTIONS: Record<'en' | 'ta', DIYStep[]> = {
  'en': [
    { title: "Prep the Skin", detail: "Cleanse your face thoroughly, apply a hydrating serum, and finish with a smooth primer. This creates a perfect canvas." },
    { title: "Foundation & Contour", detail: "Apply foundation matching your analyzed skin tone. Use a liquid contour to define your cheekbones and jawline." },
    { title: "Eye & Lip Focus", detail: "Apply a light eyeshadow base, followed by a thin wing of eyeliner. Finish with a hydrating lip color." }
  ],
  'ta': [
    { title: "சருமத்தை தயார் செய்தல்", detail: "முகத்தை நன்கு சுத்தம் செய்து, ஹைட்ரேட்டிங் சீரம் தடவி, ஒரு மென்மையான ப்ரைமருடன் முடிக்கவும். இது ஒரு சரியான தளத்தை உருவாக்குகிறது." },
    { title: "அடித்தளம் மற்றும் வரையறை", detail: "உங்கள் தோல் நிறத்துடன் பொருந்தும் அடித்தளத்தை பயன்படுத்துங்கள். உங்கள் கன்ன எலும்புகள் மற்றும் தாடைக்கோட்டை வரையறுக்க திரவ வரையறையைப் பயன்படுத்துங்கள்." },
    { title: "கண் மற்றும் உதடு கவனம்", detail: "ஒரு மெல்லிய கண்ணிமை அடித்தளத்தை தடவி, அதைத் தொடர்ந்து மெல்லிய இறக்கை வடிவத்தில் ஐலைனர் பூசவும். ஹைட்ரேட்டிங் உதட்டுச்சாயம் கொண்டு முடிக்கவும்." }
  ]
};

export const PRODUCT_CATALOG: Record<string, Product[]> = {
  'Everyday Subtle Glam': [
    { id: 101, name: 'Natural Finish Foundation', category: 'Makeup', price: 899, ar: true, image: 'droplets', bundle: true, seller: 'Mithas Brand', delivery: '30min Local' },
    { id: 102, name: 'Nude Pink Lipstick', category: 'Makeup', price: 450, ar: true, image: 'heart', bundle: true, seller: 'Local Vendor A', delivery: '15min Quick' },
    { id: 103, name: 'Hydra-Boost Serum', category: 'Skincare', price: 1200, ar: false, image: 'sun', bundle: false, seller: 'Mithas Brand', delivery: '2-Day Shipping' },
    { id: 104, name: 'Sterling Silver Studs', category: 'Accessories', price: 1500, ar: true, image: 'gem', bundle: true, seller: 'Verified Jeweller', delivery: '1hr Local' }
  ],
  'Sunset Glow': [
    { id: 401, name: 'Warm Peach Blush', category: 'Makeup', price: 700, ar: true, image: 'sun-medium', bundle: true, seller: 'Mithas Brand', delivery: '30min Local' },
    { id: 402, name: 'Metallic Orange Lip Gloss', category: 'Makeup', price: 650, ar: true, image: 'heart', bundle: true, seller: 'Local Vendor C', delivery: '15min Quick' }
  ],
  'Smoky Eye Drama': [
    { id: 201, name: 'Smoky Eye Palette', category: 'Makeup', price: 1599, ar: true, image: 'sparkles', bundle: true, seller: 'Mithas Brand', delivery: '30min Local' },
    { id: 202, name: 'Red Wine Matte Lipstick', category: 'Makeup', price: 550, ar: true, image: 'moon', bundle: false, seller: 'Local Vendor B', delivery: '15min Quick' }
  ],
  'Electric Blue Liner': [
    { id: 501, name: 'Vivid Blue Liquid Liner', category: 'Makeup', price: 900, ar: true, image: 'zap', bundle: true, seller: 'Mithas Brand', delivery: '30min Local' },
    { id: 502, name: 'Clear Hydrating Lip Balm', category: 'Makeup', price: 300, ar: true, image: 'droplets', bundle: false, seller: 'Local Vendor D', delivery: '15min Quick' }
  ]
};

export const SKINCARE_PRODUCTS: Product[] = [
  { id: 301, name: 'Hydra-Boost Serum', category: 'Skincare', price: 1200, ar: false, image: 'droplets', bundle: true, seller: 'Skincare Partner', delivery: '2-Day Shipping' },
  { id: 302, name: 'Tone-Balancing Vitamin C Mask', category: 'Skincare', price: 850, ar: false, image: 'sun', bundle: false, seller: 'Mithas Brand', delivery: '30min Local' },
  { id: 303, name: 'Pore Minimizing Primer', category: 'Skincare', price: 950, ar: true, image: 'check-square', bundle: false, seller: 'Sample Brand', delivery: 'N/A' }
];

export const SHOP_CATEGORIES: { name: ShopCategory; icon: string; english: string }[] = [
  { name: 'Recommended', icon: 'zap', english: 'Recommended' },
  { name: 'Makeup', icon: 'droplets', english: 'Makeup' },
  { name: 'Fashion', icon: 'shirt', english: 'Fashion' },
  { name: 'Skincare', icon: 'sun', english: 'Skincare' },
  { name: 'Accessories', icon: 'gem', english: 'Accessories' }
];
