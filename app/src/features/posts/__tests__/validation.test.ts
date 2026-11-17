import { countCharacters, isPostDraftValid } from '../validation';

describe('countCharacters', () => {
  test('no cuenta espacios de las orillas', () => {
    expect(countCharacters('  hola  ')).toBe(4);
  });

  test('un emoji cuenta como un carácter, igual que en Postgres', () => {
    expect(countCharacters('😀😀')).toBe(2);
  });
});

describe('isPostDraftValid', () => {
  test('título de 3 a 120 y texto de 1 a 2000', () => {
    expect(isPostDraftValid({ title: 'Hola', content: 'a' })).toBe(true);
    expect(isPostDraftValid({ title: 'a'.repeat(120), content: 'a'.repeat(2000) })).toBe(true);
  });

  test('título muy corto o muy largo', () => {
    expect(isPostDraftValid({ title: 'Ho', content: 'texto' })).toBe(false);
    expect(isPostDraftValid({ title: 'a'.repeat(121), content: 'texto' })).toBe(false);
  });

  test('texto vacío, solo espacios o muy largo', () => {
    expect(isPostDraftValid({ title: 'Hola', content: '' })).toBe(false);
    expect(isPostDraftValid({ title: 'Hola', content: '   ' })).toBe(false);
    expect(isPostDraftValid({ title: 'Hola', content: 'a'.repeat(2001) })).toBe(false);
  });
});
