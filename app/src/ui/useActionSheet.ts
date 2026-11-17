import { useState } from 'react';

export type SheetAction = {
  label: string;
  isDestructive?: boolean;
  onPress: () => void;
};

export type SheetContent = {
  title?: string;
  message?: string;
  actions: SheetAction[];
};

// El contenido se queda al cerrar para que no desaparezca mientras la hoja se desvanece.
export type ActionSheetState = {
  content: SheetContent | null;
  isOpen: boolean;
};

type ActionSheetControls = {
  sheet: ActionSheetState;
  openSheet: (content: SheetContent) => void;
  closeSheet: () => void;
};

// Estado de una hoja de acciones (ui/ActionSheet.tsx): qué muestra y si está abierta.
export function useActionSheet(): ActionSheetControls {
  const [sheet, setSheet] = useState<ActionSheetState>({ content: null, isOpen: false });

  function openSheet(content: SheetContent): void {
    setSheet({ content, isOpen: true });
  }

  function closeSheet(): void {
    setSheet((current) => ({ ...current, isOpen: false }));
  }

  return { sheet, openSheet, closeSheet };
}
