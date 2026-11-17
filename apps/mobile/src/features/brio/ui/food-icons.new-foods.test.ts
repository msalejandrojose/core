import { describe, expect, it } from 'vitest';
import { iconForFood } from './food-icons.data';

/** Platos añadidos al catálogo el 16/11/2026: ninguno debe salir con el plato genérico. */
const NEW_FOODS = [
  "Batido de proteínas con agua",
  "Batido de proteínas con leche",
  "Batido de proteínas con plátano y leche",
  "Bebida de proteínas (lista para tomar)",
  "Proteína whey en polvo",
  "Barrita de proteínas",
  "Yogur proteico",
  "Natillas proteicas",
  "Bebida isotónica",
  "Pera",
  "Mandarina",
  "Uvas",
  "Melocotón",
  "Nectarina",
  "Paraguayo",
  "Albaricoques",
  "Ciruelas",
  "Cerezas",
  "Sandía",
  "Melón",
  "Piña",
  "Mango",
  "Arándanos",
  "Frambuesas",
  "Granada",
  "Higos",
  "Caqui",
  "Naranja",
  "Kiwi",
  "Fresas",
  "Salmón al horno con patatas y cebolla",
  "Merluza al horno con patatas",
  "Dorada al horno con patatas",
  "Tostada de atún con tomate",
  "Tostada con tomate y queso fresco",
  "Tostada con pavo y queso",
  "Tostada con huevo y aguacate",
  "Tostada con salmón ahumado y queso crema",
  "Tostada con crema de cacahuete y plátano",
  "Tostada con queso fresco y miel",
  "Tostada integral con aceite",
  "Tortitas (pancakes)",
  "Ensaimada",
  "Palmera de chocolate",
  "Tortilla de claras",
  "Bocadillo de pollo",
  "Bocadillo de tortilla francesa",
  "Bocadillo de salmón ahumado",
  "Asado de pollo",
  "Pollo al horno con patatas",
  "Pollo al curry",
  "Pollo al ajillo",
  "Solomillo de cerdo a la plancha",
  "Costillas de cerdo al horno",
  "Entrecot a la plancha",
  "Pavo a la plancha",
  "Cordero asado",
  "Salmón al horno",
  "Dorada al horno",
  "Lubina al horno",
  "Bacalao con tomate",
  "Gambas a la plancha",
  "Sardinas a la plancha",
  "Atún a la plancha",
  "Pulpo a la gallega",
  "Boquerones fritos",
  "Arroz con pollo",
  "Arroz negro",
  "Fideuá",
  "Espaguetis a la carbonara",
  "Pasta con atún y tomate",
  "Risotto de setas",
  "Poke bowl de salmón",
  "Alubias blancas con verduras",
  "Ensalada de garbanzos",
  "Ensalada César con pollo",
  "Ensalada de quinoa",
  "Parrillada de verduras",
  "Champiñones salteados",
  "Espárragos verdes a la plancha",
  "Brócoli al vapor",
  "Wrap de pollo",
  "Quesadilla de pollo y queso",
  "Revuelto de setas",
  "Macedonia de frutas",
  "Helado de vainilla"
];

describe('iconos de los platos nuevos', () => {
  it.each(NEW_FOODS)('%s tiene dibujo propio', (name) => {
    expect(iconForFood(name)).not.toBe('plate');
  });

  it('la pasta manda sobre lo que lleva y la tostada sobre su relleno', () => {
    expect(iconForFood('Pasta con atún y tomate')).toBe('pasta');
    expect(iconForFood('Tostada de atún con tomate')).toBe('toast');
    expect(iconForFood('Arroz con pollo')).toBe('rice');
    expect(iconForFood('Gambas a la plancha')).toBe('salmon');
    expect(iconForFood('Zumo de naranja natural')).toBe('drink');
    expect(iconForFood('Tostada con crema de cacahuete y plátano')).toBe('toast');
    expect(iconForFood('Espárragos verdes a la plancha')).toBe('salad');
  });
});
