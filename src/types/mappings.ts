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

export type JsonFileMetadata = {
  osm_data_date: string;
  total_street_names: number;
  etymology_tagged: number;
  generated_at: string;
  cache_dates: Record<string, string>;
};

export interface JsonFileRoot<V> {
  _metadata: JsonFileMetadata;
  [key: string]: V | JsonFileMetadata;
}

export type MappingsJsonRoot = JsonFileRoot<MethodData>;

export type DataMetadata = Omit<JsonFileMetadata, "generated_at"> & {
  mappings_generated_at: string;
  evaluation_generated_at: string;
};

export type MapViewMetadata = Pick<JsonFileMetadata, "osm_data_date" | "cache_dates">;
