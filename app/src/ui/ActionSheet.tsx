import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { radius, space } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";

import { Rule } from "./Rule";
import { Text } from "./Text";
import type { ActionSheetState, SheetAction } from "./useActionSheet";

type ActionSheetProps = {
  sheet: ActionSheetState;
  onClose: () => void;
};

// cuánto sube el panel al abrirse, junto con el desvanecido del fondo
const SLIDE_DISTANCE = space.s12;

// Hoja de acciones propia para los menús "⋯" y las confirmaciones (components/sheets.elyx).
// Reemplaza a Alert.alert, que en Android es el diálogo de Material y no sigue el diseño.
export function ActionSheet({ sheet, onClose }: ActionSheetProps) {
  const theme = useTheme();
  const [offset] = useState(() => new Animated.Value(SLIDE_DISTANCE));
  // La acción elegida corre cuando la hoja ya se cerró: en iOS no se puede abrir otra pantalla
  // (Reportar) mientras un Modal todavía se está cerrando.
  const chosenAction = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!sheet.isOpen) {
      return;
    }
    offset.setValue(SLIDE_DISTANCE);
    Animated.timing(offset, {
      toValue: 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [sheet.isOpen, offset]);

  function runChosenAction(): void {
    const action = chosenAction.current;
    chosenAction.current = null;
    action?.();
  }

  function choose(action: SheetAction): void {
    chosenAction.current = action.onPress;
    onClose();
    // Android no tiene onDismiss; ahí abrir otra pantalla mientras se cierra no da problemas
    if (Platform.OS !== "ios") {
      runChosenAction();
    }
  }

  const content = sheet.content;

  return (
    <Modal
      visible={sheet.isOpen}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
      onDismiss={runChosenAction}
    >
      <View style={[styles.backdrop, { backgroundColor: theme.scrim }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.panel,
            {
              backgroundColor: theme.paper,
              transform: [{ translateY: offset }],
            },
          ]}
        >
          {/* abajo queda libre la barra de gestos del teléfono */}
          <SafeAreaView edges={["bottom"]} style={styles.panelContent}>
            {content?.title || content?.message ? (
              <View style={styles.header}>
                {content.title ? (
                  <Text
                    variant="body"
                    weight="semiBold"
                    accessibilityRole="header"
                  >
                    {content.title}
                  </Text>
                ) : null}
                {content.message ? (
                  <Text variant="ui" color="ink2">
                    {content.message}
                  </Text>
                ) : null}
              </View>
            ) : null}
            {content?.actions.map((action) => (
              <View key={action.label}>
                <Rule />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => choose(action)}
                  style={({ pressed }) => [
                    styles.row,
                    pressed ? { backgroundColor: theme.surface } : null,
                  ]}
                >
                  <Text
                    variant="body"
                    weight="medium"
                    color={action.isDestructive ? "accent" : "ink"}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              </View>
            ))}
            <Rule />
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.row,
                pressed ? { backgroundColor: theme.surface } : null,
              ]}
            >
              <Text variant="body" color="ink2">
                Cancelar
              </Text>
            </Pressable>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  panel: {
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    paddingTop: space.s2,
  },
  panelContent: {
    paddingBottom: space.s2,
  },
  header: {
    gap: space.s1,
    paddingHorizontal: space.gutter,
    paddingTop: space.s3,
    paddingBottom: space.s4,
  },
  row: {
    minHeight: space.s12,
    justifyContent: "center",
    paddingHorizontal: space.gutter,
    paddingVertical: space.s3,
  },
});
