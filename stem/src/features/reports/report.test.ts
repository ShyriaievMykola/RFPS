import { buildReport } from './report';

describe('buildReport', () => {
  const tariffs = { day: 4, night: 2 };
  const meta = { month: new Date(2026, 9, 1), apartmentId: 12, residentName: 'Марія Петренко' };
  const points = [
    { ts: new Date(2026, 9, 1).toISOString(), day: 6, night: 2 },
    { ts: new Date(2026, 9, 2).toISOString(), day: 5, night: 3 },
  ];

  it('рахує рядки та підсумок', () => {
    const report = buildReport(points, tariffs, meta);
    expect(report.rows).toHaveLength(2);
    expect(report.rows[0]).toMatchObject({ total: 8, cost: 28 });
    expect(report.totals).toEqual({ day: 11, night: 5, total: 16, cost: 54 });
  });

  it('підсумок дорівнює сумі рядків', () => {
    const report = buildReport(points, tariffs, meta);
    const cost = report.rows.reduce((sum, row) => sum + row.cost, 0);
    expect(report.totals.cost).toBeCloseTo(cost);
  });

  it('порожній місяць дає нульовий підсумок', () => {
    expect(buildReport([], tariffs, meta).totals).toEqual({ day: 0, night: 0, total: 0, cost: 0 });
  });
});
