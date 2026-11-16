import { render, screen } from '@testing-library/react-native';

import { AliasTag } from '../AliasTag';

const author = { id: 'usuario-1', display_name: 'farol-veloz', color: null };

describe('AliasTag', () => {
  test('sin restricción muestra solo el alias', async () => {
    await render(<AliasTag author={{ ...author, restriction: null }} />);

    expect(screen.getByText('farol-veloz')).toBeOnTheScreen();
    expect(screen.queryByText(/suspendido|baneado/)).toBeNull();
  });

  test('marca al autor suspendido o baneado', async () => {
    await render(<AliasTag author={{ ...author, restriction: 'suspended' }} />);
    expect(screen.getByText(' · suspendido')).toBeOnTheScreen();

    await render(<AliasTag author={{ ...author, restriction: 'banned' }} />);
    expect(screen.getByText(' · baneado')).toBeOnTheScreen();
  });
});
