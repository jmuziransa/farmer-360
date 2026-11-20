export type RecordCategory = 'crops' | 'animals' | 'custom';
export const crops = ['Maize', 'Beans', 'Coffee', 'Bananas', 'Tomatoes', 'Cassava', 'Sweet potatoes', 'Rice', 'Groundnuts', 'Sorghum', 'Millet', 'Cabbage', 'Onions', 'Irish potatoes', 'Sunflower', 'Tea', 'Sugarcane', 'Pineapples', 'Mangoes', 'Avocados'];
const animals = [
  { name: 'Cattle', unit: 'cattle' }, { name: 'Goats', unit: 'goats' },
  { name: 'Sheep', unit: 'sheep' }, { name: 'Pigs', unit: 'pigs' },
  { name: 'Rabbits', unit: 'rabbits' }, { name: 'Chickens', unit: 'chickens' },
  { name: 'Ducks', unit: 'ducks' }, { name: 'Turkeys', unit: 'turkeys' },
  { name: 'Geese', unit: 'geese' }, { name: 'Guinea fowl', unit: 'guinea fowl' },
];
export function defaultCategory(module: string): RecordCategory {
  return module === 'crops' ? 'crops' : ['livestock', 'poultry'].includes(module) ? 'animals' : 'custom';
}
export function recordChoices(category: RecordCategory, module: string): string[] {
  if (category === 'crops') return crops;
  if (category === 'animals') return animals.filter(a => module !== 'poultry' || ['Chickens', 'Ducks', 'Turkeys', 'Geese', 'Guinea fowl'].includes(a.name)).map(a => a.name);
  return [];
}
export function recordUnits(category: RecordCategory, name: string, module: string): string[] {
  if (category === 'crops') return ['plants', 'seedlings', 'kg', 'bags', 'bunches', 'acres', 'hectares'];
  if (category === 'animals') return [animals.find(a => a.name === name)?.unit ?? 'animals', 'kg'];
  return [...new Set([...(module === 'milk' ? ['litres'] : module === 'eggs' ? ['eggs', 'trays'] : []), 'items', 'kg', 'bags', 'litres', 'acres', 'plants', 'animals'])];
}