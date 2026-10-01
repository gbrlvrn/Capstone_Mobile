import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";

/**
 * SmoothModalCard
 *
 * Wraps modal dialog content with a physics-based spring pop-up animation:
 * - Scale: 0.91 -> 1.0 (spring with organic dampening)
 * - TranslateY: 22 -> 0 (soft upward float)
 * - Opacity: 0 -> 1 (responsive fade-in)
 * Uses native driver for 60/120fps silky smooth performance.
 */
export default function SmoothModalCard({ visible, children, style }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.spring(anim, {
        toValue: 1,
        tension: 115,
        friction: 7.5,
        useNativeDriver: true,
      }).start();
    } else {
      anim.setValue(0);
    }
  }, [visible, anim]);

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.91, 1],
  });

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [22, 0],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.85, 1],
  });

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ scale }, { translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
