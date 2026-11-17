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
    body: 'Tu alias, tu color, lo que publicas y respondes, los reportes que envías y los avisos de moderación que recibes.',
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
    title: 'Moderación',
    body: 'Personas del equipo revisan a mano lo que se reporta y lo que marcan las revisiones automáticas (palabras de una lista, enlaces o el mismo texto repetido). Ven el texto y tu alias, nunca un correo o teléfono: no los tenemos.',
  },
  {
    title: 'Identificador del teléfono',
    body: 'Guardamos un identificador de este teléfono que da el sistema (no es tu número). Sirve para que una suspensión o un baneo alcance también a las cuentas nuevas que crees aquí. Solo lo ve moderación.',
  },
  {
    title: 'Si borras la app',
    body: 'Pierdes tu alias y no se puede recuperar. Lo que escribiste se queda, pero ya no podrás editarlo ni eliminarlo.',
  },
];
