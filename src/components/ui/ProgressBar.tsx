import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { colors } from '@/constants/colors';

export interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

// Thin onboarding progress bar. The filled portion animates whenever the
// current step changes. Used across all 6 onboarding steps.
// See docs/denhunt-design-system.md.
function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const fillWidth = useRef(new Animated.Value(0)).current;

  const progress = totalSteps > 0 ? Math.min(currentStep / totalSteps, 1) : 0;

  useEffect(() => {
    Animated.timing(fillWidth, {
      toValue: trackWidth * progress,
      duration: 300,
      useNativeDriver: false, // animating layout width
    }).start();
  }, [fillWidth, progress, trackWidth]);

  function handleLayout(e: LayoutChangeEvent) {
    setTrackWidth(e.nativeEvent.layout.width);
  }

  return (
    <View style={styles.track} onLayout={handleLayout}>
      <Animated.View style={[styles.fill, { width: fillWidth }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.gray100,
    overflow: 'hidden',
  },
  fill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.blue600,
  },
});

export default ProgressBar;
