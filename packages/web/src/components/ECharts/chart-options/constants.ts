export const COLORS = [
  '#4e79a7',
  '#f28e2b',
  '#e15759',
  '#76b7b2',
  '#59a14f',
  '#edc948',
  '#b07aa1',
  '#ff9da7',
];

export const DEFAULT_COLOR_STOPS = ['#e0f3f8', '#abd9e9', '#74add1', '#4575b4'];

export const AXIS_GRID = {
  left: 64,
  right: 64,
  top: 36,
  bottom: 40,
  containLabel: true,
} as const;

/** Height in pixels for the ECharts chart container div. */
export const CHART_CONTAINER_HEIGHT = 350;

/** Maximum safe pixel value for ECharts symbolSize. */
export const MAX_SAFE_SYMBOL_SIZE = 1000;

/** Scale factor applied to sqrt of bubble's z-value. */
export const BUBBLE_SIZE_SCALE = 2;

/** Default bubble size (px) when z-value is missing. */
export const BUBBLE_SIZE_DEFAULT = 10;

export const LEGEND_TOP = 24;
export const X_AXIS_NAME_GAP = 30;
export const GRID_TOP_WITH_LEGEND = 56;
export const GRID_BOTTOM_WITH_LABEL = 52;

/**
 * Concentric ring radii for multi-series pie charts (inner → outer).
 * Each tuple is [innerRadius, outerRadius]. 5% gap between rings.
 * Series beyond index 2 reuse the outermost ring.
 */
export const PIE_MULTI_SERIES_RADII: readonly [string, string][] = [
  ['0%', '40%'],
  ['45%', '70%'],
  ['75%', '90%'],
];
