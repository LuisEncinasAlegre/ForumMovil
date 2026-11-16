import { render, screen, userEvent } from '@testing-library/react-native';

import { CommentRow } from '../CommentRow';
import type { ThreadComment } from '../types';

const comment: ThreadComment = {
  id: 3,
  post_id: 7,
  content: 'Siguen, a las 4.',
  created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  edited_at: null,
  author: { id: 'usuario-1', display_name: 'farol-veloz', color: null, restriction: null },
};

describe('CommentRow', () => {
  test('muestra alias, hora y texto', async () => {
    await render(
      <CommentRow comment={comment} isMine={false} isByPostAuthor={false} onOpenMenu={jest.fn()} onOpenEdits={jest.fn()} />,
    );

    expect(screen.getByText('farol-veloz')).toBeOnTheScreen();
    expect(screen.getByText('hace 2 min')).toBeOnTheScreen();
    expect(screen.getByText('Siguen, a las 4.')).toBeOnTheScreen();
    expect(screen.queryByText('autor')).toBeNull();
  });

  test('quien abrió el hilo lleva la marca "autor"', async () => {
    await render(<CommentRow comment={comment} isMine={false} isByPostAuthor onOpenMenu={jest.fn()} onOpenEdits={jest.fn()} />);

    expect(screen.getByText('autor')).toBeOnTheScreen();
  });

  test('las mías tienen menú, y se abre', async () => {
    const onOpenMenu = jest.fn();
    const user = userEvent.setup();
    await render(<CommentRow comment={comment} isMine isByPostAuthor={false} onOpenMenu={onOpenMenu} onOpenEdits={jest.fn()} />);

    await user.press(screen.getByRole('button', { name: 'Opciones de tu respuesta' }));
    expect(onOpenMenu).toHaveBeenCalledWith(comment);
  });

  test('las de otros también tienen menú (para reportar)', async () => {
    const onOpenMenu = jest.fn();
    const user = userEvent.setup();
    await render(
      <CommentRow comment={comment} isMine={false} isByPostAuthor={false} onOpenMenu={onOpenMenu} onOpenEdits={jest.fn()} />,
    );

    expect(screen.queryByRole('button', { name: 'Opciones de tu respuesta' })).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Opciones de la respuesta' }));
    expect(onOpenMenu).toHaveBeenCalledWith(comment);
  });

  test('editada: "editado" abre las versiones', async () => {
    const onOpenEdits = jest.fn();
    const user = userEvent.setup();
    const edited = { ...comment, edited_at: new Date().toISOString() };
    await render(
      <CommentRow comment={edited} isMine={false} isByPostAuthor={false} onOpenMenu={jest.fn()} onOpenEdits={onOpenEdits} />,
    );

    await user.press(screen.getByRole('button', { name: 'Ver versiones anteriores de la respuesta' }));
    expect(onOpenEdits).toHaveBeenCalledWith(edited);
  });

  test('la que se está enviando dice "enviando…" y no tiene menú', async () => {
    await render(
      <CommentRow comment={comment} isMine isByPostAuthor={false} isPending onOpenMenu={jest.fn()} onOpenEdits={jest.fn()} />,
    );

    expect(screen.getByText('enviando…')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Opciones de tu respuesta' })).toBeNull();
  });
});
