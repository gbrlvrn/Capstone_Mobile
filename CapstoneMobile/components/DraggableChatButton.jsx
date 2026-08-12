import React, { useRef } from "react";
import {
  Animated,
  PanResponder,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// Responsive scale factor
const W_RATIO = Math.min(SCREEN_W / 375, 1.3);
const s = (v) => Math.round(v * W_RATIO);

const BTN_SIZE = s(52);

const ICONS = {
  chat: require("../assets/icons/chat.png"),
};

function DraggableChatButton({ onPress }) {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lastOffset = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: lastOffset.current.x,
          y: lastOffset.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();

        // Clamp within screen bounds
        const newX = Math.min(
          Math.max(lastOffset.current.x + gestureState.dx, -(SCREEN_W - BTN_SIZE - s(20))),
          0
        );
        const newY = Math.min(
          Math.max(lastOffset.current.y + gestureState.dy, -(SCREEN_H - BTN_SIZE - s(200))),
          0
        );

        lastOffset.current = { x: newX, y: newY };
        pan.setValue({ x: newX, y: newY });

        // If barely moved, treat as a tap
        if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) {
          onPress?.();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: pan.getTranslateTransform(),
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={styles.btn}
        activeOpacity={0.7}
        onPress={onPress}
        accessibilityLabel="Open AI chatbot assistant"
        accessibilityRole="button"
      >
        <Image
          source={ICONS.chat}
          style={styles.icon}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default React.memo(DraggableChatButton);

// Bottom offset accounts for FloatingNavBar height (~60) + spacing
const CHAT_BTN_BOTTOM = Platform.select({
  ios: SCREEN_H >= 812 ? s(100) : s(90),
  android: s(96),
  default: s(96),
});

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: CHAT_BTN_BOTTOM,
    right: s(18),
    zIndex: 100,
  },
  btn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    backgroundColor: "#0D1F45",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0D1F45",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  icon: {
    width: s(26),
    height: s(26),
    tintColor: "#FFFFFF",
  },
});
