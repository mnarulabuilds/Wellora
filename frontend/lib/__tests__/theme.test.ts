import { defaultMealSlot, getTimeGreeting } from '@/constants/theme';

describe('theme helpers', () => {
  it.each([
    [7, 'breakfast'],
    [13, 'lunch'],
    [17, 'snack'],
    [20, 'dinner'],
    [2, 'snack'],
  ])('suggests a meal slot at %p:00', (hour, slot) => {
    expect(defaultMealSlot(new Date(2026, 0, 1, hour))).toBe(slot);
  });

  it('greets by time of day', () => {
    expect(getTimeGreeting()).toMatch(/Good (Morning|Afternoon|Evening)/);
  });
});
