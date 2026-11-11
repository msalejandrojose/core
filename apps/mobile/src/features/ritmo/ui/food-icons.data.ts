/** Datos de las ilustraciones de alimentos (ver food-icons.tsx). */

type Path = [d: string, fill: string, stroke: string];

interface FoodIllustration {
  bg: string;
  paths: Path[];
}

export const FOOD_ICONS = {
  egg: { bg: '#FFF4D6', paths: [['M20 7c6.5 0 11.5 8 11.5 15 0 6.5-5 11-11.5 11S8.5 28.5 8.5 22C8.5 15 13.5 7 20 7z', '#FFFFFF', '#E8D9B0'], ['M15 22.5a5 5 0 1 0 10 0a5 5 0 1 0-10 0z', '#FFC21A', 'none']] },
  omelette: { bg: '#FFF4D6', paths: [['M6 22c0-7 6-12 14-12s14 5 14 12z', '#F7C948', 'none'], ['M6 22h28a14 6 0 0 1-28 0z', '#E8A93A', 'none'], ['M14 16a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0zM22 14a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z', '#5BAE4A', 'none']] },
  salad: { bg: '#E8F8EC', paths: [['M10 19c0-5 4-8 9-8-1 5-4 8-9 8z', '#34C759', 'none'], ['M18 19c1-6 6-9 12-8-1 5-6 8-12 8z', '#5BAE4A', 'none'], ['M15 15a3 3 0 1 0 6 0a3 3 0 1 0-6 0z', '#FF3B30', 'none'], ['M6 19h28a14 13 0 0 1-28 0z', '#FFFFFF', '#BFE3CA']] },
  salmon: { bg: '#FFEDE6', paths: [['M7 23c5-9 18-11 26-6-3 8-16 12-26 6z', '#FF8A65', 'none'], ['M14 17l2.5 8M19.5 15.5l2.5 9M25 15.5l2 8', 'none', '#FFFFFF']] },
  rice: { bg: '#EAF2FD', paths: [['M9 20c0-6 5-9 11-9s11 3 11 9z', '#FFFFFF', '#D5E1EE'], ['M6 20h28a14 12 0 0 1-28 0z', '#4B83C4', 'none']] },
  oats: { bg: '#F5EBDD', paths: [['M9 20c0-6 5-9 11-9s11 3 11 9z', '#E8D3A8', 'none'], ['M14 15a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0zM21 13a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z', '#FFD23F', 'none'], ['M6 20h28a14 12 0 0 1-28 0z', '#C68A4E', 'none']] },
  chicken: { bg: '#FFF1E0', paths: [['M18 24L9 31', 'none', '#C9B79C'], ['M6 32a2 2 0 1 0 4 0a2 2 0 1 0-4 0z', '#C9B79C', 'none'], ['M23 7a10 10 0 0 1 7 16l-9 3-3-9a10 10 0 0 1 5-10z', '#D9913F', 'none'], ['M25 11a5 5 0 0 1 3 6', 'none', '#F2C27A']] },
  bread: { bg: '#FFF1E0', paths: [['M9 18a7 7 0 0 1 7-8h8a7 7 0 0 1 7 8v12a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2z', '#D9913F', 'none'], ['M12.5 18.5a4 4 0 0 1 4-5h7a4 4 0 0 1 4 5V29h-15z', '#F8D9A8', 'none']] },
  yogurt: { bg: '#EAF2FD', paths: [['M11 15h18l-2 16a2 2 0 0 1-2 2H15a2 2 0 0 1-2-2z', '#FFFFFF', '#C7D3E0'], ['M9 11h22v4H9z', '#7AA7FF', 'none'], ['M16 22a2 2 0 1 0 4 0a2 2 0 1 0-4 0zM21 25a2 2 0 1 0 4 0a2 2 0 1 0-4 0z', '#C4123B', 'none']] },
  apple: { bg: '#FFE9E7', paths: [['M20 13c-6-3-12 1-12 8s5 12 9 11c2 0 2-1 3-1s1 1 3 1c4 1 9-4 9-11s-6-11-12-8z', '#FF3B30', 'none'], ['M20 13c0-3 2-6 6-6 0 3-2 6-6 6z', '#34C759', 'none']] },
  banana: { bg: '#FFF8D6', paths: [['M8 13c2 13 15 19 25 13-10 1-18-4-21-14z', '#FFD23F', '#E3B21C'], ['M8 13l-1-3', 'none', '#8A6D1E']] },
  avocado: { bg: '#EEF6E3', paths: [['M20 6c5 0 9 9 9 16a9 9 0 0 1-18 0c0-7 4-16 9-16z', '#4E8B3A', 'none'], ['M20 10c3 0 6 7 6 12a6 6 0 0 1-12 0c0-5 3-12 6-12z', '#C9E58F', 'none'], ['M17 24a3 3 0 1 0 6 0a3 3 0 1 0-6 0z', '#8B5A2B', 'none']] },
  coffee: { bg: '#F5EBDD', paths: [['M27 17h2a3.5 3.5 0 0 1 0 7h-2', 'none', '#8B5A2B'], ['M9 14h18v10a7 7 0 0 1-7 7h-4a7 7 0 0 1-7-7z', '#FFFFFF', '#D9C6AE'], ['M11 16h14v3H11z', '#8B5A2B', 'none']] },
  nuts: { bg: '#F5EBDD', paths: [['M10 20c0-4 3-6 5-6s5 2 5 6-3 6-5 6-5-2-5-6z', '#C68A4E', 'none'], ['M20 17c0-4 3-6 5-6s5 2 5 6-3 6-5 6-5-2-5-6z', '#B07038', 'none'], ['M17 27c0-3 2-5 5-5s5 2 5 5-2 5-5 5-5-2-5-5z', '#D9A066', 'none']] },
  pasta: { bg: '#FFEDE6', paths: [['M10 20c2-5 4 0 6-4s4 0 6-4 4 0 6-2', 'none', '#F2C14E'], ['M13 18a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0zM21 16a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0z', '#FF3B30', 'none'], ['M6 20h28a14 12 0 0 1-28 0z', '#FFFFFF', '#E5D5CC']] },
  milk: { bg: '#EAF2FD', paths: [['M13 8h14l-2 24a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2z', '#FFFFFF', '#BCCADB'], ['M13.7 15h12.6', 'none', '#BCCADB']] },
  lentils: { bg: '#F5EBDD', paths: [['M11 18a3 2 0 1 0 6 0a3 2 0 1 0-6 0zM19 15a3 2 0 1 0 6 0a3 2 0 1 0-6 0zM22 21a3 2 0 1 0 6 0a3 2 0 1 0-6 0zM14 24a3 2 0 1 0 6 0a3 2 0 1 0-6 0z', '#A0703C', 'none']] },
  stew: { bg: '#F5EBDD', paths: [['M9 20c0-5 5-8 11-8s11 3 11 8z', '#A0703C', 'none'], ['M15 16a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0zM23 15a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z', '#FF9500', 'none'], ['M6 20h28a14 12 0 0 1-28 0z', '#FFFFFF', '#E0D2C0']] },
  curry: { bg: '#FFF8D6', paths: [['M9 20c0-6 5-9 11-9s11 3 11 9z', '#F2C14E', 'none'], ['M14 15a2 2 0 1 0 4 0a2 2 0 1 0-4 0zM22 14a2 2 0 1 0 4 0a2 2 0 1 0-4 0z', '#D9913F', 'none'], ['M6 20h28a14 12 0 0 1-28 0z', '#4B83C4', 'none']] },
  chorizo: { bg: '#FFE9E7', paths: [['M9 22c0-6 6-10 12-10h2a6 6 0 0 1 0 12h-8c-3 0-6-1-6-2z', '#C4123B', 'none'], ['M15 18a1 1 0 1 0 2 0a1 1 0 1 0-2 0zM21 20a1 1 0 1 0 2 0a1 1 0 1 0-2 0z', '#F7C1C9', 'none']] },
  potato: { bg: '#F5EBDD', paths: [['M10 21c0-6 5-10 11-10s10 4 10 9-4 10-11 10-10-4-10-9z', '#C9965A', 'none'], ['M16 18a1 1 0 1 0 2 0a1 1 0 1 0-2 0zM23 23a1 1 0 1 0 2 0a1 1 0 1 0-2 0z', '#8B5A2B', 'none']] },
  carrot: { bg: '#FFF1E0', paths: [['M28 12c-4 2-14 12-16 18 6-2 16-12 18-16z', '#FF9500', 'none'], ['M28 12l4-5M28 12l5-1M28 12l1-6', 'none', '#34C759']] },
  onion: { bg: '#F3EAF5', paths: [['M20 9c3 4 9 7 9 14a9 9 0 0 1-18 0c0-7 6-10 9-14z', '#B05FA8', 'none'], ['M20 14v14', 'none', '#E3C3E0']] },
  oil: { bg: '#F4F7D9', paths: [['M17 6h6v5l3 4v16a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V15l3-4z', '#C9D84B', 'none'], ['M17 6h6v3h-6z', '#4E8B3A', 'none']] },
  plate: { bg: '#F2F2F7', paths: [['M6 20h28a14 12 0 0 1-28 0z', '#FFFFFF', '#D1D1D6'], ['M12 17a8 4 0 0 1 16 0z', '#E5E5EA', 'none']] },
} satisfies Record<string, FoodIllustration>;

export type FoodIconKey = keyof typeof FOOD_ICONS;

/** Palabras del nombre → dibujo. El orden importa: lo más específico arriba. */
const KEYWORDS: [RegExp, FoodIconKey][] = [
  [/tortilla/i, 'omelette'],
  [/huevo/i, 'egg'],
  [/ensalada|lechuga/i, 'salad'],
  [/salm[oó]n|at[uú]n|merluza|pescado/i, 'salmon'],
  [/lentej|garbanz|alubia/i, 'lentils'],
  [/curry/i, 'curry'],
  [/guiso|cocido|estofado/i, 'stew'],
  [/arroz|paella/i, 'rice'],
  [/avena|cereal|muesli/i, 'oats'],
  [/pollo|pavo|carne|ternera/i, 'chicken'],
  [/pan\b|tostada|bocadillo|s[aá]ndwich/i, 'bread'],
  [/yogur|k[eé]fir/i, 'yogurt'],
  [/manzana|pera/i, 'apple'],
  [/pl[aá]tano|banana/i, 'banana'],
  [/aguacate/i, 'avocado'],
  [/caf[eé]|t[eé]\b/i, 'coffee'],
  [/nuez|nueces|almendra|cacahuete|fruto seco/i, 'nuts'],
  [/pasta|macarr|espagu|fideo/i, 'pasta'],
  [/leche/i, 'milk'],
  [/chorizo|salchich|embutido/i, 'chorizo'],
  [/patata/i, 'potato'],
  [/zanahoria/i, 'carrot'],
  [/cebolla/i, 'onion'],
  [/aceite/i, 'oil'],
];

export function iconForFood(name: string): FoodIconKey {
  return KEYWORDS.find(([rx]) => rx.test(name))?.[1] ?? 'plate';
}

