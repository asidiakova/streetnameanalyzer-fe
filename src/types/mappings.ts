export type NormalizedGroup = {
  representative: string;
  total_length: number;
  segment_count: number;
  street_count: number;
  variants: string[];
};

export type MethodData = {
  mapping: Record<string, string>;
  groups: Record<string, NormalizedGroup>;
};

export type Mappings = Record<string, MethodData>;

export type DataMetadata = {
  osm_data_date: string;
  total_street_names: number;
  etymology_tagged: number;
  generated_at: string;
  /** Per-method LLM cache date (ISO date string), keyed by method id */
  cache_dates: Record<string, string>;
};
