import type { JsonFileRoot } from "@/types/mappings";

export type CollisionEntity = {
  wikidata_id: string;
  label: string;
};

export type Collision = {
  group_id: string;
  entities: CollisionEntity[];
};

export type ProblemEntity = {
  wikidata_id: string;
  entity_label: string;
  score: number;
  total_variants: number;
  dominant_count: number;
  unique_groups: number;
};

export type MethodEvaluation = {
  grouping_rate: number;
  collision_rate: number;
  total_entities: number;
  total_variants: number;
  total_groups: number;
  colliding_groups: number;
  collisions: Collision[];
  problem_entities: ProblemEntity[];
};

export type Evaluation = Record<string, MethodEvaluation>;

export type EvaluationJsonRoot = JsonFileRoot<MethodEvaluation>;
