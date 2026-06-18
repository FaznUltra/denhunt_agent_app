import { useEffect, useRef } from 'react';
import { Animated, type DimensionValue, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

export interface SkeletonProps {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
}

// Pulsing placeholder block for loading states.
// See docs/denhunt-design-system.md.
export default function Skeleton({ width, height, borderRadius = 8 }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.block, { width, height, borderRadius, opacity }]}
    />
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.gray200 },
});
