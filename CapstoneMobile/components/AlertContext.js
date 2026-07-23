import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Platform,
} from "react-native";
import { useTheme } from "./ThemeContext";

const AlertContext = createContext({ showAlert: () => {} });

export const useAlert = () => useContext(AlertContext);

export function AlertProvider({ children }) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState({
    title: "",
    message: "",
    buttons: [],
  });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const C = colors;

  const showAlert = useCallback((title, message, buttons) => {
    // If no buttons are provided, default to an "OK" button
    const defaultButtons = [{ text: "OK", onPress: () => {} }];
    const finalButtons = buttons && buttons.length > 0 ? buttons : defaultButtons;
    
    setConfig({ title, message, buttons: finalButtons });
    setVisible(true);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const handleClose = useCallback((onPress) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      if (onPress) onPress();
    });
  }, [fadeAnim, scaleAnim]);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal
        visible={visible}
        transparent={true}
        animationType="none"
        onRequestClose={() => handleClose()}
      >
        <View style={styles.overlay}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
          
          <Animated.View 
            style={[
              styles.card, 
              { 
                backgroundColor: colors.cardBg || "#FFFFFF",
                borderColor: colors.cardBorder || C.cardBorder,
                opacity: fadeAnim, 
                transform: [{ scale: scaleAnim }] 
              }
            ]}
          >
            {config.title ? (
              <Text style={[styles.title, { color: colors.textDark || C.textDark }]}>
                {config.title}
              </Text>
            ) : null}

            {config.message ? (
              <Text style={[styles.message, { color: colors.textMuted || C.textMuted }]}>
                {config.message}
              </Text>
            ) : null}

            <View style={[styles.buttonContainer, { borderTopColor: colors.cardBorder || C.cardBorder }]}>
              {config.buttons.map((btn, index) => {
                const isDestructive = btn.style === "destructive" || btn.text?.toLowerCase() === "delete" || btn.text?.toLowerCase() === "deactivate";
                const isCancel = btn.style === "cancel" || btn.text?.toLowerCase() === "cancel";
                
                // Color logic
                let textColor = colors.textDark || C.textDark;
                if (isDestructive) textColor = C.red;
                else if (!isCancel) textColor = C.blue;

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      { borderLeftColor: colors.cardBorder || C.cardBorder },
                      index > 0 && styles.buttonBorder
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleClose(btn.onPress)}
                  >
                    <Text 
                      style={[
                        styles.buttonText, 
                        { color: textColor },
                        (!isCancel || config.buttons.length === 1) && { fontWeight: "700" } // Main action is bold
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  card: {
    width: "80%",
    maxWidth: 340,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    paddingTop: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  buttonContainer: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonBorder: {
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
