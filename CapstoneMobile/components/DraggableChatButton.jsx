import React, { useRef } from "react";
import {
  Animated,
  PanResponder,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const BTN_SIZE = 52;

const ICONS = {
  chat: require("../assets/icons/chat.png"),
};

export default function DraggableChatButton({ onPress }) {
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
          Math.max(lastOffset.current.x + gestureState.dx, -(SCREEN_W - BTN_SIZE - 20)),
          0
        );
        const newY = Math.min(
          Math.max(lastOffset.current.y + gestureState.dy, -(SCREEN_H - BTN_SIZE - 200)),
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

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100,
    right: 20,
    zIndex: 10,
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
    width: 26,
    height: 26,
    tintColor: "#FFFFFF",
  },
});
