/**
 * Returns the ECharts map registration key for the given region and detail level.
 * Used to register and look up GeoJSON maps via `echarts.registerMap` / `echarts.getMap`.
 */
export function getMapKey(
  region: string,
  detail?: string,
  prefecture?: string
): string {
  if (region === 'world') {
    return 'world';
  }
  if (detail === 'municipality') {
    return `${region}-municipality-${prefecture}`;
  }
  if (detail === 'prefecture') {
    return `${region}-prefecture`;
  }
  return region;
}

export function getGeoJsonPath(
  region: string,
  detail?: string,
  prefecture?: string
): string {
  if (region === 'world') return '/geojson/world-countries.geojson';
  if (detail === 'municipality' && prefecture)
    return `/geojson/japan-municipalities/${prefecture}.geojson`;
  return '/geojson/japan-prefectures.geojson';
}

/**
 * Normalizes data names to match GeoJSON feature names.
 * Handles designated city wards where users might write the full city and ward name
 * (e.g., Kawasaki City Kawasaki Ward) but GeoJSON uses just the ward name (e.g., Kawasaki Ward).
 */
export function normalizeMapDataNames(
  data: { name: string; value: number }[],
  featureNames: ReadonlySet<string>
): { name: string; value: number }[] {
  if (featureNames.size === 0) return data;

  // All names already match — skip normalization
  if (data.every((d) => featureNames.has(d.name))) return data;

  // Matches designated-city ward names written with the city prefix.
  // e.g. "Kawasaki-shi Kawasaki-ku" pattern in kanji: city+ward → captures ward only.
  // GeoJSON features use only the ward/town name, so we strip the city prefix.
  const DESIGNATED_CITY_WARD_RE = /^.+[市](.+[区町村])$/;

  return data.map((d) => {
    if (featureNames.has(d.name)) return d;
    const match = d.name.match(DESIGNATED_CITY_WARD_RE);
    if (match && featureNames.has(match[1])) {
      return { ...d, name: match[1] };
    }
    return d;
  });
}
