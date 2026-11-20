import { describe, expect, it } from 'vitest';
import { recordChoices, recordUnits } from '@/lib/record-catalog';
describe('Record selection rules', () => {
  it('limits crops to plants rather than animal names', () => {
    expect(recordChoices('crops', 'crops')).toContain('Maize');
    expect(recordChoices('crops', 'crops')).not.toContain('Goats');
  });
  it('limits poultry animal choices to birds', () => {
    expect(recordChoices('animals', 'poultry')).toContain('Chickens');
    expect(recordChoices('animals', 'poultry')).not.toContain('Cattle');
  });
  it('uses the selected animal as the count unit', () => {
    expect(recordUnits('animals', 'Goats', 'livestock')[0]).toBe('goats');
  });
  it('allows counting plants', () => {
    expect(recordUnits('crops', 'Maize', 'crops')[0]).toBe('plants');
  });
});