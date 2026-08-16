import React, { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const VIEWBOX_WIDTH = 1000;

export type TornVariant = 'ripped' | 'fine' | 'ticket' | 'flame';

/**
 * Torn paper edge as sharp triangular teeth.
 */
function sawtoothPath(
  seed: number,
  height: number,
  teeth: number,
  jitter: number
): string {
  let state = ((seed * 9301 + 49297) % 233280) || 1;
  const random = () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };

  const step = VIEWBOX_WIDTH / teeth;
  let d = `M0,${height} L0,${(height * (0.55 + random() * 0.35)).toFixed(2)}`;

  for (let i = 0; i < teeth; i += 1) {
    const peakX = i * step + step * (0.35 + random() * 0.3);
    const peakY = height * (0.02 + random() * jitter);
    const valleyX = Math.min((i + 1) * step, VIEWBOX_WIDTH);
    const valleyY = height * (1 - jitter * 0.6 + random() * jitter * 0.6);

    d += ` L${peakX.toFixed(2)},${peakY.toFixed(2)}`;
    d += ` L${valleyX.toFixed(2)},${valleyY.toFixed(2)}`;
  }

  return `${d} L${VIEWBOX_WIDTH},${height} Z`;
}

/**
 * Ticket stub torn along a perforation line.
 */
function ticketTearPath(
  seed: number,
  height: number,
  holes: number,
  jitter: number
): string {
  let state = ((seed * 9301 + 49297) % 233280) || 1;
  const random = () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };

  const step = VIEWBOX_WIDTH / holes;
  const radius = step * 0.2;
  let d = `M0,${height} L0,0`;

  let currentX = 0;

  for (let i = 0; i < holes; i += 1) {
    const cx = i * step + step / 2;
    const startHoleX = cx - radius;
    const endHoleX = cx + radius;
    
    const segmentWidth = startHoleX - currentX;
    const teethInSegment = 4;
    const toothStep = segmentWidth / teethInSegment;
    
    for (let j = 0; j < teethInSegment; j++) {
       const toothX = currentX + j * toothStep + toothStep * (0.3 + random() * 0.4);
       const toothY = height * (random() * jitter * 0.7); 
       d += ` L${toothX.toFixed(2)},${toothY.toFixed(2)}`;
    }
    
    d += ` L${startHoleX.toFixed(2)},0`;
    d += ` A${radius.toFixed(2)} ${radius.toFixed(2)} 0 0 0 ${endHoleX.toFixed(2)} 0`;
    
    currentX = endHoleX;
  }
  
  const endSegmentWidth = VIEWBOX_WIDTH - currentX;
  const teethInEnd = 4;
  const toothStep = endSegmentWidth / teethInEnd;
  for (let j = 0; j < teethInEnd; j++) {
     const toothX = currentX + j * toothStep + toothStep * (0.3 + random() * 0.4);
     const toothY = height * (random() * jitter * 0.7);
     d += ` L${toothX.toFixed(2)},${toothY.toFixed(2)}`;
  }

  d += ` L${VIEWBOX_WIDTH},0 L${VIEWBOX_WIDTH},${height} Z`;
  return d;
}

/**
 * Hell flame effect with organic, sweeping curved licking flames.
 */
function flamePath(
  seed: number,
  height: number,
  flames: number,
  jitter: number
): string {
  let state = ((seed * 9301 + 49297) % 233280) || 1;
  const random = () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };

  const step = VIEWBOX_WIDTH / flames;
  let d = `M0,${height}`;
  
  let currentX = 0;
  let currentY = height * (0.6 + random() * 0.4);
  d += ` L0,${currentY.toFixed(2)}`;

  for (let i = 0; i < flames; i += 1) {
    const tipX = currentX + step * (0.2 + random() * 0.6); // Random sweeping left/right
    const tipY = height * (random() * jitter * 0.3); // High peaks for flames

    // Upward curve: Concave sweep hugging the left side
    // To make it whip around dynamically, we randomize the control point
    const curveIntensityUp = 0.5 + random() * 0.4; // 0.5 to 0.9
    const cp1x = currentX + (tipX - currentX) * (1 - curveIntensityUp);
    const cp1y = currentY - (currentY - tipY) * curveIntensityUp;
    d += ` Q${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${tipX.toFixed(2)},${tipY.toFixed(2)}`;

    // Next valley
    const nextX = (i + 1) * step;
    const nextY = height * (0.6 + random() * 0.4);

    // Downward curve: Concave sweep hugging the right side
    const curveIntensityDown = 0.5 + random() * 0.4; // 0.5 to 0.9
    const cp2x = tipX + (nextX - tipX) * curveIntensityDown;
    const cp2y = nextY - (nextY - tipY) * curveIntensityDown;
    d += ` Q${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${nextX.toFixed(2)},${nextY.toFixed(2)}`;
    
    currentX = nextX;
    currentY = nextY;
  }
  
  d += ` L${VIEWBOX_WIDTH},${height} Z`;
  return d;
}

export interface TornEdgeProps {
  fill: string;
  height?: number;
  seed?: number;
  flip?: boolean;
  variant?: TornVariant;
  teeth?: number;
  jitter?: number;
  style?: StyleProp<ViewStyle>;
}

const PRESETS: Record<TornVariant, { teeth: number; jitter: number; height: number }> = {
  ripped: { teeth: 22, jitter: 0.38, height: 18 },
  fine: { teeth: 46, jitter: 0.22, height: 10 },
  ticket: { teeth: 16, jitter: 0.5, height: 22 },
  flame: { teeth: 14, jitter: 0.8, height: 28 }, // 'teeth' acts as number of flames here
};

export function TornEdge({
  fill,
  height,
  seed = 7,
  flip = false,
  variant = 'ripped',
  teeth,
  jitter,
  style,
}: TornEdgeProps) {
  const preset = PRESETS[variant];
  const h = height ?? preset.height;
  const toothCount = teeth ?? preset.teeth;
  const depth = jitter ?? preset.jitter;

  const d = useMemo(() => {
    if (variant === 'ticket') return ticketTearPath(seed, h, toothCount, depth);
    if (variant === 'flame') return flamePath(seed, h, toothCount, depth);
    return sawtoothPath(seed, h, toothCount, depth);
  }, [variant, seed, h, toothCount, depth]);

  return (
    <Svg
      width="100%"
      height={h}
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${h}`}
      preserveAspectRatio="none"
      style={[flip ? { transform: [{ scaleY: -1 }] } : null, style]}
      pointerEvents="none"
    >
      <Path d={d} fill={fill} />
    </Svg>
  );
}

export default TornEdge;
