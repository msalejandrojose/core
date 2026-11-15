import type { MealType } from '../entities/meal-entry.entity';

/**
 * Lo típico de cada momento del día en España, agrupado en secciones con su
 * dibujo (clave de las ilustraciones de la app). Al abrir «Añadir alimento» se
 * ven las secciones como botones y, al tocar una, sus platos. Los nombres son
 * los del catálogo global (ver `seeds/brio-foods.data.ts` y `seed-brio.ts`).
 */
export interface FoodSection {
  code: string;
  label: string;
  icon: string;
  foods: readonly string[];
}

const CAFE: FoodSection = {
  code: 'cafe',
  label: 'Café y bebidas',
  icon: 'coffee',
  foods: [
    'Café con leche',
    'Café solo',
    'Café cortado',
    'Cacao soluble con leche',
    'Chocolate a la taza',
    'Zumo de naranja natural',
    'Leche semidesnatada',
  ],
};
const BOLLERIA: FoodSection = {
  code: 'bolleria',
  label: 'Bollería y dulces',
  icon: 'croissant',
  foods: [
    'Croissant',
    'Napolitana de chocolate',
    'Magdalena',
    'Bizcocho casero',
    'Galletas María',
    'Churros',
    'Porras',
    'Barrita de cereales',
  ],
};
const BOCATAS: FoodSection = {
  code: 'bocatas',
  label: 'Bocatas y sándwiches',
  icon: 'sandwich',
  foods: [
    'Bocadillo de jamón serrano',
    'Bocadillo de tortilla de patatas',
    'Bocadillo de lomo',
    'Bocadillo de atún',
    'Bocadillo de queso',
    'Bocadillo de pavo',
    'Bocadillo de calamares',
    'Bocadillo de chorizo',
    'Sándwich mixto',
    'Sándwich vegetal',
    'Empanadilla de atún',
  ],
};
const FRUTA: FoodSection = {
  code: 'fruta',
  label: 'Fruta',
  icon: 'apple',
  foods: ['Plátano', 'Manzana', 'Naranja', 'Kiwi', 'Fresas', 'Aguacate'],
};
const LACTEOS: FoodSection = {
  code: 'lacteos',
  label: 'Yogur y lácteos',
  icon: 'yogurt',
  foods: [
    'Yogur natural',
    'Yogur griego natural',
    'Yogur desnatado',
    'Queso fresco batido 0 %',
    'Leche semidesnatada',
  ],
};
const HUEVOS: FoodSection = {
  code: 'huevos',
  label: 'Huevos y tortilla',
  icon: 'omelette',
  foods: [
    'Tortilla de patatas',
    'Tortilla francesa',
    'Huevos revueltos',
    'Huevos fritos',
    'Huevo entero',
  ],
};
const ENSALADAS: FoodSection = {
  code: 'verdura',
  label: 'Ensaladas y verdura',
  icon: 'salad',
  foods: [
    'Ensalada mixta',
    'Ensalada de pasta',
    'Pisto',
    'Judías verdes rehogadas',
    'Gazpacho',
    'Salmorejo',
  ],
};
const CARNE: FoodSection = {
  code: 'carne',
  label: 'Carne',
  icon: 'steak',
  foods: [
    'Pechuga de pollo a la plancha',
    'Filete de ternera a la plancha',
    'Lomo de cerdo a la plancha',
    'Pollo asado',
    'Filete de pollo empanado',
    'Albóndigas en salsa',
    'Hamburguesa de ternera',
  ],
};
const PESCADO: FoodSection = {
  code: 'pescado',
  label: 'Pescado',
  icon: 'salmon',
  foods: [
    'Merluza a la plancha',
    'Salmón a la plancha',
    'Calamares a la romana',
    'Atún al natural',
  ],
};
const POSTRE: FoodSection = {
  code: 'postre',
  label: 'Postre',
  icon: 'flan',
  foods: [
    'Yogur natural',
    'Flan',
    'Natillas',
    'Arroz con leche',
    'Manzana',
    'Naranja',
    'Chocolate negro 70 %',
  ],
};
const BEBIDA: FoodSection = {
  code: 'bebida',
  label: 'Bebida',
  icon: 'drink',
  foods: [
    'Cerveza',
    'Vino tinto',
    'Refresco de cola',
    'Zumo de naranja natural',
  ],
};

export const MEAL_SECTIONS: Record<MealType, readonly FoodSection[]> = {
  BREAKFAST: [
    CAFE,
    {
      code: 'tostadas',
      label: 'Tostadas',
      icon: 'toast',
      foods: [
        'Tostada con tomate y aceite',
        'Tostada con tomate y jamón serrano',
        'Tostada con mantequilla y mermelada',
        'Tostada con aguacate',
        'Tostada con aceite',
        'Pan de trigo',
      ],
    },
    BOLLERIA,
    BOCATAS,
    {
      code: 'cereales',
      label: 'Cereales y avena',
      icon: 'oats',
      foods: [
        'Cereales de desayuno',
        'Muesli',
        'Gachas de avena con leche',
        'Avena en copos',
      ],
    },
    LACTEOS,
    FRUTA,
    HUEVOS,
  ],
  SNACK: [
    BOCATAS,
    CAFE,
    FRUTA,
    LACTEOS,
    BOLLERIA,
    {
      code: 'frutos-secos',
      label: 'Frutos secos',
      icon: 'nuts',
      foods: ['Nueces', 'Almendras crudas'],
    },
    {
      code: 'picoteo',
      label: 'Picoteo',
      icon: 'chorizo',
      foods: [
        'Jamón serrano',
        'Queso manchego curado',
        'Aceitunas',
        'Patatas fritas de bolsa',
        'Chocolate negro 70 %',
      ],
    },
  ],
  LUNCH: [
    {
      code: 'legumbres',
      label: 'Legumbres y guisos',
      icon: 'lentils',
      foods: [
        'Lentejas estofadas con chorizo',
        'Garbanzos con espinacas',
        'Cocido madrileño',
        'Fabada asturiana',
        'Lentejas cocidas',
      ],
    },
    {
      code: 'arroz-pasta',
      label: 'Arroz y pasta',
      icon: 'rice',
      foods: [
        'Paella mixta',
        'Arroz a la cubana',
        'Arroz blanco cocido',
        'Macarrones con tomate',
        'Espaguetis a la boloñesa',
        'Lasaña de carne',
      ],
    },
    ENSALADAS,
    CARNE,
    PESCADO,
    HUEVOS,
    {
      code: 'guarnicion',
      label: 'Patatas y pan',
      icon: 'potato',
      foods: [
        'Patatas fritas caseras',
        'Puré de patatas',
        'Patata cocida',
        'Pan de trigo',
      ],
    },
    POSTRE,
    BEBIDA,
  ],
  DINNER: [
    {
      code: 'cremas',
      label: 'Cremas y sopas',
      icon: 'soup',
      foods: ['Crema de verduras', 'Sopa de fideos', 'Gazpacho', 'Salmorejo'],
    },
    ENSALADAS,
    HUEVOS,
    PESCADO,
    CARNE,
    {
      code: 'rapida',
      label: 'Cena rápida',
      icon: 'burger',
      foods: [
        'Sándwich mixto',
        'Sándwich vegetal',
        'Pizza margarita',
        'Hamburguesa completa',
        'Croquetas de jamón',
        'Empanada gallega de atún',
      ],
    },
    POSTRE,
    BEBIDA,
  ],
};
