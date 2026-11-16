export type CommunityRule = {
  // lo que se acepta en la bienvenida
  title: string;
  // la explicación que se lee en Reglas
  detail: string;
};

// Las reglas viven aquí para que la bienvenida y la pantalla de Reglas digan lo mismo.
export const COMMUNITY_RULES: CommunityRule[] = [
  {
    title: 'Ideas sí, personas no. No ataques a nadie.',
    detail: 'Critica lo que alguien dijo, no a quien lo dijo. Nada de insultos, burlas ni amenazas.',
  },
  {
    title: 'Nada de spam ni datos privados de otros.',
    detail:
      'No publiques nombres, fotos, teléfonos ni nada que identifique a otra persona. Tampoco anuncios ni lo mismo una y otra vez.',
  },
  {
    title: 'Si algo cruza la línea, repórtalo. Se revisa.',
    detail:
      'Toca los tres puntos de la publicación o respuesta y elige Reportar. Moderación lo revisa: si rompe las reglas, lo oculta y quien lo escribió recibe una advertencia.',
  },
];
