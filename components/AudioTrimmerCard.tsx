import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  LayoutChangeEvent,
  PanResponder,
  Animated,
} from 'react-native';
import { Music, Play, Square, Minus, Plus } from 'lucide-react-native';
import { useUserStore } from '@/store/useUserStore';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { AppFonts } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

interface AudioTrimmerCardProps {
  isPlayingAudio: boolean;
  countdownRemaining: number | null;
  onPlayPreview: (startOffset?: number, duration?: number) => void;
  onStopPreview?: () => void;
  onPickAudio: () => void;
  onSliderDragStart?: () => void;
  onSliderDragEnd?: () => void;
}

const WAVEFORM_BARS = [
  0.25, 0.45, 0.7, 0.9, 0.6, 0.8, 1.0, 0.75, 0.5, 0.85, 0.95, 0.65, 0.4, 0.7,
  0.85, 1.0, 0.9, 0.55, 0.75, 0.8, 0.6, 0.45, 0.65, 0.85, 0.7, 0.5, 0.35, 0.2,
];
const PRECOMPUTED_BAR_HEIGHTS = WAVEFORM_BARS.map((f) => Math.round(4 + f * 12));
const TOTAL_BARS = WAVEFORM_BARS.length;

interface SmoothSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  activeColor: string;
  inactiveColor: string;
  thumbBorderColor: string;
  thumbBgColor: string;
  onStartDrag?: () => void;
  onEndDrag?: () => void;
  onChange: (value: number) => void;
  onComplete: (value: number) => void;
}

const THUMB_SIZE = 18;
const THUMB_RADIUS = THUMB_SIZE / 2;

const SmoothSlider = React.memo(function SmoothSlider({
  value,
  min,
  max,
  step = 1,
  activeColor,
  inactiveColor,
  thumbBorderColor,
  thumbBgColor,
  onStartDrag,
  onEndDrag,
  onChange,
  onComplete,
}: SmoothSliderProps) {
  const [trackWidth, setTrackWidth] = useState(200);
  const trackWidthRef = useRef(200);
  const trackLeftRef = useRef(0);
  const isDraggingRef = useRef(false);
  const lastValRef = useRef(value);
  const throttleTimerRef = useRef<any>(null);

  const usableWidth = Math.max(1, trackWidth - THUMB_SIZE);
  const initialPos = Math.max(0, Math.min(1, (value - min) / (max - min))) * usableWidth;
  const animPos = useRef(new Animated.Value(initialPos)).current;

  // Sync animPos when external value changes and not actively dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      const pos = Math.max(0, Math.min(1, (value - min) / (max - min))) * usableWidth;
      animPos.setValue(pos);
      lastValRef.current = value;
    }
  }, [value, min, max, usableWidth, animPos]);

  const propsRef = useRef({ min, max, step, onStartDrag, onEndDrag, onChange, onComplete });
  useEffect(() => {
    propsRef.current = { min, max, step, onStartDrag, onEndDrag, onChange, onComplete };
  });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_evt, gs) => {
          return Math.abs(gs.dx) > 2 || Math.abs(gs.vx) > 0.05;
        },
        onMoveShouldSetPanResponderCapture: (_evt, gs) => {
          return Math.abs(gs.dx) > 2 || Math.abs(gs.vx) > 0.05;
        },
        onPanResponderTerminationRequest: () => false,

        onPanResponderGrant: (evt) => {
          isDraggingRef.current = true;
          propsRef.current.onStartDrag?.();

          const pageX = evt.nativeEvent.pageX;
          const locX = evt.nativeEvent.locationX;
          trackLeftRef.current = pageX - locX;

          const width = trackWidthRef.current || 200;
          const effWidth = Math.max(1, width - THUMB_SIZE);
          const relX = pageX - trackLeftRef.current - THUMB_RADIUS;
          const clampedX = Math.max(0, Math.min(effWidth, relX));
          animPos.setValue(clampedX);

          const ratio = clampedX / effWidth;
          const { min: mMin, max: mMax, step: mStep } = propsRef.current;
          const raw = mMin + ratio * (mMax - mMin);
          const stepped = Math.round((raw - mMin) / mStep) * mStep + mMin;
          const finalVal = Math.max(mMin, Math.min(mMax, stepped));

          lastValRef.current = finalVal;
          propsRef.current.onChange(finalVal);
        },

        onPanResponderMove: (evt) => {
          if (!isDraggingRef.current) return;
          const pageX = evt.nativeEvent.pageX;
          const width = trackWidthRef.current || 200;
          const effWidth = Math.max(1, width - THUMB_SIZE);
          const relX = pageX - trackLeftRef.current - THUMB_RADIUS;
          const clampedX = Math.max(0, Math.min(effWidth, relX));

          // 0 React re-renders, instantaneous GPU composite!
          animPos.setValue(clampedX);

          const ratio = clampedX / effWidth;
          const { min: mMin, max: mMax, step: mStep } = propsRef.current;
          const raw = mMin + ratio * (mMax - mMin);
          const stepped = Math.round((raw - mMin) / mStep) * mStep + mMin;
          const finalVal = Math.max(mMin, Math.min(mMax, stepped));

          if (finalVal !== lastValRef.current) {
            lastValRef.current = finalVal;
            // Throttle parent text update so JS bridge thread stays completely free
            if (!throttleTimerRef.current) {
              throttleTimerRef.current = setTimeout(() => {
                throttleTimerRef.current = null;
                propsRef.current.onChange(lastValRef.current);
              }, 60);
            }
          }
        },

        onPanResponderRelease: (evt) => {
          if (throttleTimerRef.current) {
            clearTimeout(throttleTimerRef.current);
            throttleTimerRef.current = null;
          }
          isDraggingRef.current = false;
          propsRef.current.onEndDrag?.();

          const pageX = evt.nativeEvent.pageX;
          const width = trackWidthRef.current || 200;
          const effWidth = Math.max(1, width - THUMB_SIZE);
          const relX = pageX - trackLeftRef.current - THUMB_RADIUS;
          const clampedX = Math.max(0, Math.min(effWidth, relX));
          const ratio = clampedX / effWidth;
          const { min: mMin, max: mMax, step: mStep } = propsRef.current;
          const raw = mMin + ratio * (mMax - mMin);
          const stepped = Math.round((raw - mMin) / mStep) * mStep + mMin;
          const finalVal = Math.max(mMin, Math.min(mMax, stepped));

          // Snap to exact stepped position smoothly
          const snappedX = ((finalVal - mMin) / (mMax - mMin)) * effWidth;
          animPos.setValue(snappedX);

          lastValRef.current = finalVal;
          propsRef.current.onChange(finalVal);
          propsRef.current.onComplete(finalVal);
        },

        onPanResponderTerminate: () => {
          if (throttleTimerRef.current) {
            clearTimeout(throttleTimerRef.current);
            throttleTimerRef.current = null;
          }
          isDraggingRef.current = false;
          propsRef.current.onEndDrag?.();
        },
      }),
    [animPos]
  );

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) {
      setTrackWidth(w);
      trackWidthRef.current = w;
      const pos = Math.max(0, Math.min(1, (value - min) / (max - min))) * Math.max(1, w - THUMB_SIZE);
      animPos.setValue(pos);
    }
  };

  return (
    <View
      style={styles.smoothSliderTouchable}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      <View style={styles.smoothSliderTrackContainer} pointerEvents="none">
        <View
          style={[
            styles.smoothSliderTrackBase,
            {
              marginHorizontal: THUMB_RADIUS,
              backgroundColor: inactiveColor,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.smoothSliderTrackFill,
              {
                width: animPos,
                backgroundColor: activeColor,
              },
            ]}
          />
        </View>

        <Animated.View
          style={[
            styles.smoothSliderThumb,
            {
              transform: [{ translateX: animPos }],
              borderColor: thumbBorderColor,
              backgroundColor: thumbBgColor,
            },
          ]}
        />
      </View>
    </View>
  );
});

const WaveformDisplay = React.memo(
  function WaveformDisplay({
    startOffset,
    duration,
    activeColor,
    inactiveColor,
  }: {
    startOffset: number;
    duration: number;
    activeColor: string;
    inactiveColor: string;
  }) {
    const totalSec = 60;
    const endOffset = startOffset + duration;
    return (
      <View style={styles.waveformContainer}>
        {PRECOMPUTED_BAR_HEIGHTS.map((barHeight, idx) => {
          const barSec = (idx / (TOTAL_BARS - 1)) * totalSec;
          const isActive = barSec >= startOffset && barSec <= endOffset;
          return (
            <View
              key={idx}
              style={[
                styles.waveformBar,
                {
                  height: barHeight,
                  backgroundColor: isActive ? activeColor : inactiveColor,
                  opacity: isActive ? 1 : 0.35,
                },
              ]}
            />
          );
        })}
      </View>
    );
  },
  (prev, next) =>
    prev.startOffset === next.startOffset &&
    prev.duration === next.duration &&
    prev.activeColor === next.activeColor &&
    prev.inactiveColor === next.inactiveColor
);

function AudioTrimmerCard({
  isPlayingAudio,
  countdownRemaining,
  onPlayPreview,
  onStopPreview,
  onPickAudio,
  onSliderDragStart,
  onSliderDragEnd,
}: AudioTrimmerCardProps) {
  const colors = useThemeColors();
  const { t } = useTranslation();

  const customAudioName = useUserStore((s) => s.customAudioName);
  const hapticsEnabled = useUserStore((s) => s.hapticsEnabled);

  // Initialize from store once — decoupled from reactive store updates
  const storeOffset = useUserStore((s) => s.customAudioStartOffset);
  const storeDur = useUserStore((s) => s.customAudioDuration);

  // Initialize from store once — sync when external store changes
  const [localStartOffset, setLocalStartOffset] = useState(() => storeOffset || 0);
  const [localDuration, setLocalDuration] = useState(() => storeDur || 5);

  useEffect(() => {
    setLocalStartOffset(storeOffset || 0);
  }, [storeOffset]);

  useEffect(() => {
    setLocalDuration(storeDur || 5);
  }, [storeDur]);

  const offsetRef = useRef(localStartOffset);
  offsetRef.current = localStartOffset;
  const durRef = useRef(localDuration);
  durRef.current = localDuration;

  const isPlayingAudioRef = useRef(isPlayingAudio);
  isPlayingAudioRef.current = isPlayingAudio;

  const storeCommitTimeoutRef = useRef<any>(null);

  // Debounced store persistence — prevents AsyncStorage bridge lock while user is actively adjusting
  const commitToStore = useCallback((offset: number, dur: number) => {
    if (storeCommitTimeoutRef.current) {
      clearTimeout(storeCommitTimeoutRef.current);
    }
    storeCommitTimeoutRef.current = setTimeout(() => {
      storeCommitTimeoutRef.current = null;
      useUserStore.getState().setCustomAudioStartOffset(offset);
      useUserStore.getState().setCustomAudioDuration(dur);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (storeCommitTimeoutRef.current) {
        clearTimeout(storeCommitTimeoutRef.current);
      }
    };
  }, []);

  const triggerHaptic = useCallback((style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (hapticsEnabled) {
      Haptics.impactAsync(style).catch(() => {});
    }
  }, [hapticsEnabled]);

  const formatTimeMMSS = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Called whenever user starts dragging a slider or taps +/-:
  const handleAdjustmentStart = useCallback(() => {
    onSliderDragStart?.();
    if (storeCommitTimeoutRef.current) {
      clearTimeout(storeCommitTimeoutRef.current);
      storeCommitTimeoutRef.current = null;
    }
    if (isPlayingAudioRef.current && onStopPreview) {
      onStopPreview();
    }
  }, [onSliderDragStart, onStopPreview]);

  const handleAdjustmentEnd = useCallback(() => {
    onSliderDragEnd?.();
  }, [onSliderDragEnd]);

  // Stable handlers for SmoothSlider
  const handleOffsetChange = useCallback((val: number) => {
    setLocalStartOffset(val);
  }, []);

  const handleOffsetComplete = useCallback((val: number) => {
    setLocalStartOffset(val);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    commitToStore(val, durRef.current);
  }, [commitToStore, triggerHaptic]);

  const handleDurationChange = useCallback((val: number) => {
    setLocalDuration(val);
  }, []);

  const handleDurationComplete = useCallback((val: number) => {
    setLocalDuration(val);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    commitToStore(offsetRef.current, val);
  }, [commitToStore, triggerHaptic]);

  const handleTogglePreview = () => {
    if (isPlayingAudio) {
      if (onStopPreview) {
        onStopPreview();
      }
    } else {
      onPlayPreview(localStartOffset, localDuration);
    }
  };

  return (
    <View style={[styles.customAudioWrapper, { borderColor: colors.borderSubtle }]}>
      {/* File & Range Bar */}
      <View style={[styles.compactTopRow, { backgroundColor: colors.surfaceHighlight }]}>
        <View style={styles.fileNameContainer}>
          <Music size={13} color={colors.primaryAction} />
          <Text
            style={[styles.customAudioName, { color: colors.textPrimary }]}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {customAudioName || 'Custom Audio'}
          </Text>
        </View>

        <View style={styles.topRowActions}>
          <View style={[styles.rangeBadge, { backgroundColor: colors.cardSurface }]}>
            <Text style={[styles.rangeBadgeText, { color: colors.primaryAction }]}>
              {formatTimeMMSS(localStartOffset)} - {formatTimeMMSS(localStartOffset + localDuration)} ({localDuration}s)
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.changeFileChip, { backgroundColor: colors.cardSurface }]}
            onPress={onPickAudio}
            activeOpacity={0.7}
          >
            <Text style={[styles.changeFileChipText, { color: colors.primaryAction }]}>
              {t('change_file') || 'Ganti'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Slim Waveform Bar Track */}
      <WaveformDisplay
        startOffset={localStartOffset}
        duration={localDuration}
        activeColor={colors.accentLime}
        inactiveColor={colors.surfaceHighlight}
      />

      {/* Scrubber 1: Mulai Dari (0s - 60s) */}
      <View style={styles.sliderControlBlock}>
        <View style={styles.sliderLabelRow}>
          <Text style={[styles.sliderTitle, { color: colors.textSecondary }]}>
            {t('start_time') || 'Mulai Dari'}
          </Text>
          <Text style={[styles.sliderValueText, { color: colors.primaryAction }]}>
            {formatTimeMMSS(localStartOffset)}
          </Text>
        </View>
        <View style={styles.sliderRowWithBtns}>
          <TouchableOpacity
            style={[styles.adjustBtn, { backgroundColor: colors.surfaceHighlight }]}
            onPress={() => {
              triggerHaptic();
              handleAdjustmentStart();
              const next = Math.max(0, localStartOffset - 1);
              setLocalStartOffset(next);
              commitToStore(next, durRef.current);
            }}
            activeOpacity={0.7}
          >
            <Minus size={12} color={colors.textPrimary} />
          </TouchableOpacity>

          <SmoothSlider
            value={localStartOffset}
            min={0}
            max={60}
            step={1}
            activeColor={colors.primaryAction}
            inactiveColor={colors.surfaceHighlight}
            thumbBorderColor={colors.primaryAction}
            thumbBgColor={colors.cardSurface}
            onStartDrag={handleAdjustmentStart}
            onEndDrag={handleAdjustmentEnd}
            onChange={handleOffsetChange}
            onComplete={handleOffsetComplete}
          />

          <TouchableOpacity
            style={[styles.adjustBtn, { backgroundColor: colors.surfaceHighlight }]}
            onPress={() => {
              triggerHaptic();
              handleAdjustmentStart();
              const next = Math.min(60, localStartOffset + 1);
              setLocalStartOffset(next);
              commitToStore(next, durRef.current);
            }}
            activeOpacity={0.7}
          >
            <Plus size={12} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Scrubber 2: Durasi Alarm (3s - 30s) */}
      <View style={styles.sliderControlBlock}>
        <View style={styles.sliderLabelRow}>
          <Text style={[styles.sliderTitle, { color: colors.textSecondary }]}>
            {t('duration') || 'Durasi Alarm'}
          </Text>
          <Text style={[styles.sliderValueText, { color: colors.accentLime }]}>
            {localDuration} {t('sec_short') || 'dtk'}
          </Text>
        </View>
        <View style={styles.sliderRowWithBtns}>
          <TouchableOpacity
            style={[styles.adjustBtn, { backgroundColor: colors.surfaceHighlight }]}
            onPress={() => {
              triggerHaptic();
              handleAdjustmentStart();
              const next = Math.max(3, localDuration - 1);
              setLocalDuration(next);
              commitToStore(offsetRef.current, next);
            }}
            activeOpacity={0.7}
          >
            <Minus size={12} color={colors.textPrimary} />
          </TouchableOpacity>

          <SmoothSlider
            value={localDuration}
            min={3}
            max={30}
            step={1}
            activeColor={colors.accentLime}
            inactiveColor={colors.surfaceHighlight}
            thumbBorderColor={colors.accentLime}
            thumbBgColor={colors.cardSurface}
            onStartDrag={handleAdjustmentStart}
            onEndDrag={handleAdjustmentEnd}
            onChange={handleDurationChange}
            onComplete={handleDurationComplete}
          />

          <TouchableOpacity
            style={[styles.adjustBtn, { backgroundColor: colors.surfaceHighlight }]}
            onPress={() => {
              triggerHaptic();
              handleAdjustmentStart();
              const next = Math.min(30, localDuration + 1);
              setLocalDuration(next);
              commitToStore(offsetRef.current, next);
            }}
            activeOpacity={0.7}
          >
            <Plus size={12} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Live Preview Button */}
      <TouchableOpacity
        style={[
          styles.previewAudioBtn,
          isPlayingAudio
            ? [styles.previewAudioBtnPlaying, { backgroundColor: colors.danger }]
            : { backgroundColor: colors.primaryAction },
        ]}
        onPress={handleTogglePreview}
        activeOpacity={0.8}
      >
        {isPlayingAudio ? (
          <>
            <Square size={13} color="#fff" fill="#fff" />
            <Text style={styles.previewAudioBtnText}>
              {t('stop_preview') || 'Hentikan'} ({countdownRemaining ?? localDuration}s)
            </Text>
          </>
        ) : (
          <>
            <Play size={13} color="#000000" fill="#000000" />
            <Text style={[styles.previewAudioBtnText, { color: '#000000' }]}>
              {t('preview_audio') || 'Uji Coba Suara'} ({localDuration}s)
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default React.memo(AudioTrimmerCard);

const styles = StyleSheet.create({
  customAudioWrapper: {
    marginTop: 8,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  compactTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 6,
    gap: 6,
  },
  fileNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  customAudioName: {
    fontFamily: AppFonts.semiBold,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  topRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rangeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rangeBadgeText: {
    fontFamily: AppFonts.bold,
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  changeFileChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  changeFileChipText: {
    fontFamily: AppFonts.bold,
    fontSize: 11,
    fontWeight: '700',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 18,
    paddingHorizontal: 2,
    marginBottom: 8,
  },
  waveformBar: {
    width: 3,
    borderRadius: 1.5,
  },
  sliderControlBlock: {
    marginBottom: 8,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  sliderTitle: {
    fontFamily: AppFonts.medium,
    fontSize: 12,
    fontWeight: '500',
  },
  sliderValueText: {
    fontFamily: AppFonts.bold,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sliderRowWithBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adjustBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smoothSliderTouchable: {
    flex: 1,
    height: 30,
    justifyContent: 'center',
  },
  smoothSliderTrackContainer: {
    width: '100%',
    height: 30,
    justifyContent: 'center',
    position: 'relative',
  },
  smoothSliderTrackBase: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  smoothSliderTrackFill: {
    height: 4,
    borderRadius: 2,
  },
  smoothSliderThumb: {
    position: 'absolute',
    top: (30 - THUMB_SIZE) / 2,
    left: 0,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 2.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.25,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  previewAudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 2,
  },
  previewAudioBtnPlaying: {},
  previewAudioBtnText: {
    fontFamily: AppFonts.bold,
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});
