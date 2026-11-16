export type PrivacyNote = {
  title: string;
  body: string;
};

// Solo cosas que son verdad hoy. Si cambia lo que guarda la app, este texto cambia en el mismo PR.
export const PRIVACY_NOTES: PrivacyNote[] = [
  {
    title: 'Sin correo ni contraseña',
    body: 'No te pedimos correo, teléfono ni contraseña. Tu sesión es anónima y se guarda solo en este teléfono.',
  },
  {
    title: 'Lo que se guarda',
    body: 'Tu alias, tu color, lo que publicas y respondes, y los reportes que envías.',
  },
  {
    title: 'Lo que editas o eliminas',
    body: 'Las versiones anteriores de lo que editas se pueden ver en «editado». Lo que eliminas sale del foro, pero el texto se guarda para moderación.',
  },
  {
    title: 'Tus reportes',
    body: 'Son anónimos. Nadie en la app puede leerlos, ni tú. Solo moderación.',
  },
  {
    title: 'Si borras la app',
    body: 'Pierdes tu alias y no se puede recuperar. Lo que escribiste se queda, pero ya no podrás editarlo ni eliminarlo.',
  },
];
