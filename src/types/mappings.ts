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
