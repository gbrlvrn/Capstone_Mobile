import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

/**
 * Circular progress indicator for loan repayment.
 *
 * Props:
 *   size       – diameter (default 56)
 *   strokeWidth – ring thickness (default 5)
 *   progress   – 0 to 1 (e.g. 0.65 = 65% repaid)
 *   color      – progress arc color (default #0D1F45)
 *   trackColor – background arc color
 */
export default function LoanProgressCircle({
  size = 56,
  strokeWidth = 5,
  progress = 0,
  color = "#0D1F45",
  trackColor = "#E8ECF0",
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const strokeDashoffset = circumference * (1 - clampedProgress);
  const pct = Math.round(clampedProgress * 100);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.labelBox}>
        <Text style={[styles.pctText, { color, fontSize: size < 50 ? 10 : 12 }]}>{pct}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  labelBox: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  pctText: {
    fontWeight: "700",
  },
});
