// Feature Flag の型を定義
export type FeatureFlags = {
  // Model Feature Flags
  text?: boolean;
  doc?: boolean;
  image?: boolean;
  video?: boolean;
  image_gen?: boolean;
  video_gen?: boolean;
  embedding?: boolean;
  reranking?: boolean;
  // Additional Flags
  light?: boolean;
};
