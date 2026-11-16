import { categoryLabel, noticeTitle, warningLine } from '../noticeText';
import type { ModerationNotice } from '../types';

const notice: ModerationNotice = {
  id: 1,
  post_id: 7,
  comment_id: null,
  category: 'acoso',
  message: 'Aquí no se ataca a nadie.',
  excerpt: '¿Alguien más cree que el de la fila es un idiota?',
  counts_as_warning: true,
  created_at: '2026-11-16T00:00:00Z',
};

describe('noticeTitle', () => {
  test('dice si fue una publicación o una respuesta', () => {
    expect(noticeTitle(notice)).toBe('Ocultamos tu publicación');
    expect(noticeTitle({ ...notice, post_id: null, comment_id: 30 })).toBe('Ocultamos tu respuesta');
  });
});

describe('categoryLabel', () => {
  test('cada categoría tiene su nombre', () => {
    expect(categoryLabel('spam')).toBe('Spam');
    expect(categoryLabel('acoso')).toBe('Acoso');
    expect(categoryLabel('inapropiado')).toBe('Contenido inapropiado');
    expect(categoryLabel('otro')).toBe('Otro');
  });
});

describe('warningLine', () => {
  test('cuenta las advertencias activas', () => {
    expect(warningLine(notice, 1)).toBe('Es tu primera advertencia.');
    expect(warningLine(notice, 3)).toBe('Llevas 3 advertencias.');
  });

  test('el ocultado automático por reportes no lleva número', () => {
    expect(warningLine({ ...notice, counts_as_warning: false }, 2)).toBeNull();
  });

  test('sin el conteo todavía, no inventa un número', () => {
    expect(warningLine(notice, null)).toBeNull();
    expect(warningLine(notice, 0)).toBeNull();
  });
});
