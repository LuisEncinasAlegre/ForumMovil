import { useEffect, useRef, useState } from 'react';

import { getColorErrorMessage } from '@/features/session/colorErrorMessage';
import type { Profile } from '@/features/session/types';
import { useUpdateMyColor } from '@/features/session/useUpdateMyColor';

import { makeSealReadable } from './customColor';
import { isPresetColor } from './identityColors';
import { getSealColor } from './sealColor';

// El color propio cambia muchas veces mientras arrastras: guardamos cuando te detienes.
export const CUSTOM_COLOR_SAVE_DELAY_MS = 500;

type PendingSave = {
  timer: ReturnType<typeof setTimeout>;
  color: string;
};

export type ColorChoice = {
  // el color que se ve ahora (lo que estás eligiendo o el guardado); null sin perfil
  displayColor: string | null;
  isCustomOpen: boolean;
  isCustomSelected: boolean;
  openCustom: () => void;
  choosePreset: (hex: string) => void;
  chooseCustom: (hex: string) => void;
  errorMessage: string | null;
};

// Lógica del selector de color de Perfil. Sin botón de guardar: el color cambia al tocarlo.
export function useColorChoice(profile: Profile | null | undefined): ColorChoice {
  const updateColor = useUpdateMyColor();
  const [draftColor, setDraftColor] = useState<string | null>(null);
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const pendingSave = useRef<PendingSave | null>(null);
  const saveColor = useRef(updateColor.mutate);

  useEffect(() => {
    saveColor.current = updateColor.mutate;
  });

  // si sales de Perfil antes de que pase la espera, guardamos de una vez
  useEffect(() => {
    return () => {
      if (pendingSave.current) {
        clearTimeout(pendingSave.current.timer);
        saveColor.current(pendingSave.current.color);
      }
    };
  }, []);

  const savedColor = profile ? getSealColor(profile) : null;
  const displayColor = draftColor ?? savedColor;
  const isCustomSelected = isCustomOpen || (displayColor !== null && !isPresetColor(displayColor));

  function cancelPendingSave(): void {
    if (pendingSave.current) {
      clearTimeout(pendingSave.current.timer);
      pendingSave.current = null;
    }
  }

  function saveNow(color: string): void {
    updateColor.mutate(color, {
      // ya está en caché (o se regresó al anterior si falló); el borrador sobra
      onSettled: () => setDraftColor((current) => (current === color ? null : current)),
    });
  }

  function choosePreset(hex: string): void {
    cancelPendingSave();
    setDraftColor(null);
    setIsCustomOpen(false);
    if (hex === savedColor) {
      return;
    }
    saveNow(hex);
  }

  function chooseCustom(hex: string): void {
    // si queda muy oscuro lo aclaramos sin avisar, para que se lean las iniciales
    const readableColor = makeSealReadable(hex);
    setDraftColor(readableColor);
    cancelPendingSave();
    const timer = setTimeout(() => {
      pendingSave.current = null;
      saveNow(readableColor);
    }, CUSTOM_COLOR_SAVE_DELAY_MS);
    pendingSave.current = { timer, color: readableColor };
  }

  return {
    displayColor,
    isCustomOpen,
    isCustomSelected,
    openCustom: () => setIsCustomOpen(true),
    choosePreset,
    chooseCustom,
    errorMessage: updateColor.isError ? getColorErrorMessage(updateColor.error) : null,
  };
}
