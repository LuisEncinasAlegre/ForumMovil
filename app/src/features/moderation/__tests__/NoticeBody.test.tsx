import { render, screen, userEvent } from '@testing-library/react-native';

import { NoticeBody } from '../NoticeBody';
import type { ModerationNotice } from '../types';

const notice: ModerationNotice = {
  id: 1,
  post_id: 7,
  comment_id: null,
  category: 'acoso',
  message: 'Insultaste a otra persona. Aquí se debate sin atacar.',
  excerpt: '¿Alguien más cree que el de la fila es un idiota?',
  counts_as_warning: true,
  created_at: '2026-11-16T00:00:00Z',
};

describe('NoticeBody', () => {
  test('muestra qué se ocultó, el motivo, el mensaje y cuántas advertencias llevas', async () => {
    await render(
      <NoticeBody notice={notice} warningCount={2} isSaving={false} errorMessage={null} onAcknowledge={jest.fn()} />,
    );

    expect(screen.getByText('Ocultamos tu publicación')).toBeOnTheScreen();
    expect(screen.getByText('¿Alguien más cree que el de la fila es un idiota?')).toBeOnTheScreen();
    expect(screen.getByText('Motivo: Acoso')).toBeOnTheScreen();
    expect(screen.getByText('Insultaste a otra persona. Aquí se debate sin atacar.')).toBeOnTheScreen();
    expect(screen.getByText('Llevas 2 advertencias.')).toBeOnTheScreen();
  });

  test('el ocultado automático no muestra advertencias', async () => {
    await render(
      <NoticeBody
        notice={{ ...notice, counts_as_warning: false }}
        warningCount={2}
        isSaving={false}
        errorMessage={null}
        onAcknowledge={jest.fn()}
      />,
    );

    expect(screen.queryByText('Llevas 2 advertencias.')).toBeNull();
  });

  test('"Entendido" avisa que lo leíste', async () => {
    const onAcknowledge = jest.fn();
    await render(
      <NoticeBody notice={notice} warningCount={1} isSaving={false} errorMessage={null} onAcknowledge={onAcknowledge} />,
    );

    await userEvent.setup().press(screen.getByRole('button', { name: 'Entendido' }));

    expect(onAcknowledge).toHaveBeenCalledTimes(1);
  });

  test('si no se pudo guardar, lo dice', async () => {
    await render(
      <NoticeBody
        notice={notice}
        warningCount={1}
        isSaving={false}
        errorMessage="No pudimos guardar que lo viste."
        onAcknowledge={jest.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('No pudimos guardar que lo viste.');
  });
});
