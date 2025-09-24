import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

const BackgroundCurves = () => {
  const { width } = useWindowDimensions();

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Top-right curved gradient */}
      <Svg
        width={width}
        height={width * 0.4}
        viewBox={`0 0 ${width} ${width * 0.4}`}
        style={styles.topCurve}
      >
        <Defs>
          <LinearGradient id="topGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#f65c5c" stopOpacity="1" />
            <Stop offset="100%" stopColor="#DC2626" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Path
          d={`M0,0 C${width / 2},${width * 0.25} ${width},0 ${width},${width *
            0.25} L${width},0 L0,0 Z`}
          fill="url(#topGradient)"
        />
      </Svg>

      {/* Bottom-left curved gradient */}
      <Svg
        width={width}
        height={width * 0.35}
        viewBox={`0 0 ${width} ${width * 0.35}`}
        style={styles.bottomCurve}
      >
        <Defs>
          <LinearGradient id="bottomGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#DC2626" stopOpacity="1" />
            <Stop offset="100%" stopColor="#f24637" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Path
          d={`M0,${width * 0.35} C${width / 2},${width *
            0.15} ${width},${width * 0.3} ${width},${width * 0.1} L${width},${width *
            0.35} L0,${width * 0.35} Z`}
          fill="url(#bottomGradient)"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  topCurve: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  bottomCurve: {
    position: 'absolute',
    bottom: -10,
    left: 0,
  },
});

export default BackgroundCurves;
