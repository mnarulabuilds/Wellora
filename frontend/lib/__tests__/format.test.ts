import {
  clamp,
  cmToInches,
  formatActivityValue,
  formatClock,
  formatDelta,
  formatRelativeDay,
  formatWeight,
  inchesToCm,
  kgToLbs,
  lbsToKg,
  localISODate,
  normaliseTime,
  parsePositive,
} from '../format';

describe('unit conversions', () => {
  it('round-trips kg and lbs', () => {
    expect(kgToLbs(70)).toBe(154.3);
    expect(lbsToKg(154.3)).toBe(70);
  });
  it('round-trips cm and inches', () => {
    expect(cmToInches(180)).toBe(70.9);
    expect(inchesToCm(70.9)).toBe(180.1);
  });
  it('formats weight per unit system', () => {
    expect(formatWeight(70, 'metric')).toBe('70 kg');
    expect(formatWeight(70, 'imperial')).toBe('154.3 lbs');
  });
});

describe('time helpers', () => {
  it('formats 24h clock as 12h', () => {
    expect(formatClock('08:05')).toBe('8:05 AM');
    expect(formatClock('00:30')).toBe('12:30 AM');
    expect(formatClock('12:00')).toBe('12:00 PM');
    expect(formatClock('21:45')).toBe('9:45 PM');
  });

  it.each([
    ['8:30', '08:30'],
    ['0830', '08:30'],
    ['8.30', '08:30'],
    [' 21:05 ', '21:05'],
    ['24:00', null],
    ['7:60', null],
    ['abc', null],
  ])('normaliseTime(%p) -> %p', (input, expected) => {
    expect(normaliseTime(input)).toBe(expected);
  });

  it('uses the local calendar date', () => {
    expect(localISODate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('labels today and yesterday', () => {
    const now = new Date(2026, 4, 10, 12);
    expect(formatRelativeDay('2026-05-10', now)).toBe('Today');
    expect(formatRelativeDay('2026-05-09T08:00:00', now)).toBe('Yesterday');
    expect(formatRelativeDay('2026-05-01', now)).not.toMatch(/Today|Yesterday/);
  });
});

describe('number helpers', () => {
  it('clamps', () => {
    expect(clamp(1.4)).toBe(1);
    expect(clamp(-1)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('formats signed deltas', () => {
    expect(formatDelta(1.26)).toBe('+1.3');
    expect(formatDelta(-2)).toBe('-2');
    expect(formatDelta(0)).toBe('±0');
    expect(formatDelta(null)).toBe('—');
  });

  it('parses positive numbers including comma decimals', () => {
    expect(parsePositive('2,5')).toBe(2.5);
    expect(parsePositive('0')).toBeNull();
    expect(parsePositive('-3')).toBeNull();
    expect(parsePositive('x')).toBeNull();
  });

  it('formats activity values with units', () => {
    expect(formatActivityValue('water', 0.25)).toBe('250 ml');
    expect(formatActivityValue('water', 1.5)).toBe('1.5 L');
    expect(formatActivityValue('meal', 432.6)).toBe('433 kcal');
    expect(formatActivityValue('workout', 30)).toBe('30 min');
  });
});
