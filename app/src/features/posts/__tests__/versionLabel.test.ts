import { formatVersionLabel } from '../versionLabel';

const now = new Date('2026-11-15T12:00:00Z');

describe('formatVersionLabel', () => {
  test('según cuándo se escribió', () => {
    expect(formatVersionLabel('2026-11-15T11:59:30Z', now)).toBe('Versión de hace un momento');
    expect(formatVersionLabel('2026-11-15T10:00:00Z', now)).toBe('Versión de hace 2 h');
    expect(formatVersionLabel('2026-11-14T10:00:00Z', now)).toBe('Versión de ayer');
    expect(formatVersionLabel('2026-11-02T12:00:00Z', now)).toBe('Versión del 2 nov');
  });
});
