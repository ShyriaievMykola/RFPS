import { costOf, isNightHour, nightShare, sumPoints } from './tariff';

describe('тарифні зони', () => {
  it('нічна зона триває з 23:00 до 07:00', () => {
    expect(isNightHour(23)).toBe(true);
    expect(isNightHour(0)).toBe(true);
    expect(isNightHour(6)).toBe(true);
    expect(isNightHour(7)).toBe(false);
    expect(isNightHour(22)).toBe(false);
  });

  it('вартість рахується окремо за кожною зоною', () => {
    expect(costOf({ day: 100, night: 50 }, { day: 4.32, night: 2.16 })).toBeCloseTo(540);
  });

  it('підсумовує точки за зонами', () => {
    const points = [
      { ts: 'a', day: 1, night: 2 },
      { ts: 'b', day: 3, night: 4 },
    ];
    expect(sumPoints(points)).toEqual({ day: 4, night: 6 });
  });

  it('частка нічної зони для порожніх даних дорівнює нулю', () => {
    expect(nightShare({ day: 0, night: 0 })).toBe(0);
    expect(nightShare({ day: 30, night: 10 })).toBeCloseTo(0.25);
  });
});
