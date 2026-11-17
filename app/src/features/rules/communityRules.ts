export type CommunityRule = {
  // lo que se acepta en la bienvenida
  title: string;
  // la explicación que se lee en Reglas
  detail: string;
};

// Las reglas viven aquí para que la bienvenida y la pantalla de Reglas digan lo mismo.
export const COMMUNITY_RULES: CommunityRule[] = [
  {
    title: 'No se permiten ataques personales, amenazas ni burlas hacia otras personas.',
    detail: 'Puedes criticar lo que alguien escribió, no a quien lo escribió.',
  },
  {
    title: 'Nada de spam ni datos privados tuyos o de otras personas.',
    detail: 'Nombres, fotos, teléfonos o direcciones no. Tampoco anuncios ni el mismo mensaje repetido.',
  },
  {
    title: 'Reporta cualquier mensaje que rompa las reglas.',
    detail:
      'Toca los tres puntos de la publicación o respuesta y elige Reportar. Si moderación confirma que rompe las reglas, lo oculta y quien lo escribió recibe una advertencia.',
  },
];
