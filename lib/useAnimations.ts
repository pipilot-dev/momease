import { useRef, useEffect } from "react";
import { Animated, Easing } from "react-native";
import { animation } from "./theme";

/**
 * Hook for staggered fade-in animations on mount
 * Returns animated values and a function to trigger animations
 */
export function useStaggeredFade(itemsCount: number, startDelay = 0) {
  const anims = Array.from({ length: itemsCount }, () => useRef(new Animated.Value(0)).current);

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: animation.duration.slow,
        delay: startDelay + i * animation.stagger.medium,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    );

    Animated.stagger(animation.stagger.small, animations).start();
  }, []);

  return anims;
}

/**
 * Hook for a single fade-in animation
 */
export function useFadeIn(delay = 0, duration = animation.duration.slow) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return anim;
}

/**
 * Hook for slide-up + fade-in animation
 */
export function useSlideUp(delay = 0, duration = animation.duration.slow) {
  const translateY = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return { translateY, opacity };
}

/**
 * Hook for scale animation on press
 */
export function usePressScale() {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return { scale, handlePressIn, handlePressOut };
}

/**
 * Hook for bounce animation
 */
export function useBounce(delay = 0) {
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.spring(scale, {
        toValue: 1,
        stiffness: 200,
        damping: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return scale;
}