export const translations: Record<string, Record<string, string>> = {
  en: {
    neural_scan: 'Neural Body Scan',
    lipstick_mode: 'Lipstick AR Mode',
    add_to_cart: 'Add to Cart',
    inject_to_bag: 'Inject to Bag',
    try_on: 'Try On (VTO)',
    feel_material: 'Feel Material',
    buy_the_look: 'Buy the Look',
    ar_mode: 'AR Simulation Mode',
    location_enabled: 'Location enabled — showing nearby shops',
    available_nearby: 'Available Nearby',
    view_store: 'View Store',
  },
  ta: {
    neural_scan: 'நியூரல் உடல் சரிபார்ப்பு',
    lipstick_mode: 'மெழுகு அடையாளம்',
    add_to_cart: 'சேக்குக்கு சேர்',
    try_on: 'மறுபரிசீலனை (VTO)'
  },
  es: {
    neural_scan: 'Escaneo Neural del Cuerpo',
    add_to_cart: 'Añadir al carrito',
    try_on: 'Probar (VTO)'
  }
};

export function t(key: string, locale = 'en') {
  return translations[locale]?.[key] || translations['en'][key] || key;
}

export default t;
