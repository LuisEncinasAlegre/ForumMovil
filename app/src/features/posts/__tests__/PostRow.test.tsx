import { render, screen, userEvent } from '@testing-library/react-native';

import { PostRow } from '../PostRow';
import type { FeedPost } from '../types';

const post: FeedPost = {
  id: 7,
  title: '¿Dónde imprimen barato?',
  content: 'Entrego reporte mañana.',
  created_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  edited_at: null,
  author: { id: 'usuario-1', display_name: 'farol-veloz', color: null },
};

describe('PostRow', () => {
  test('muestra alias, hora de publicación, título y texto', async () => {
    await render(<PostRow post={post} isMine={false} onOpenMenu={jest.fn()} onOpenEdits={jest.fn()} />);

    expect(screen.getByText('farol-veloz')).toBeOnTheScreen();
    expect(screen.getByText('hace 4 min')).toBeOnTheScreen();
    expect(screen.getByText('¿Dónde imprimen barato?')).toBeOnTheScreen();
    expect(screen.getByText('Entrego reporte mañana.')).toBeOnTheScreen();
  });

  test('sin editar y ajena: ni "editado" ni menú', async () => {
    await render(<PostRow post={post} isMine={false} onOpenMenu={jest.fn()} onOpenEdits={jest.fn()} />);

    expect(screen.queryByText('· editado')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Opciones de tu publicación' })).toBeNull();
  });

  test('editada: "editado" abre las versiones', async () => {
    const onOpenEdits = jest.fn();
    const user = userEvent.setup();
    const editedPost = { ...post, edited_at: new Date().toISOString() };
    await render(<PostRow post={editedPost} isMine={false} onOpenMenu={jest.fn()} onOpenEdits={onOpenEdits} />);

    await user.press(screen.getByRole('button', { name: 'Ver versiones anteriores' }));
    expect(onOpenEdits).toHaveBeenCalledWith(editedPost);
  });

  test('mía: el menú ⋯ está y se abre', async () => {
    const onOpenMenu = jest.fn();
    const user = userEvent.setup();
    await render(<PostRow post={post} isMine onOpenMenu={onOpenMenu} onOpenEdits={jest.fn()} />);

    await user.press(screen.getByRole('button', { name: 'Opciones de tu publicación' }));
    expect(onOpenMenu).toHaveBeenCalledWith(post);
  });
});
