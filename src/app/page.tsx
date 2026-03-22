import mappingsImport from "@/mappings.json";
import evaluationImport from "@/evaluation.json";
import type {
  JsonFileMetadata,
  MapViewMetadata,
  Mappings,
  MappingsJsonRoot,
} from "@/types/mappings";
import type { Evaluation, EvaluationJsonRoot } from "@/types/evaluation";
import { HomeClient } from "./home-client";

const mappingsDocument = mappingsImport as MappingsJsonRoot;
const evaluationDocument = evaluationImport as EvaluationJsonRoot;

export default function Home() {
  const { _metadata: mappingsMeta, ...mappingsRest } = mappingsDocument;
  const { _metadata: evaluationMeta, ...evaluationRest } = evaluationDocument;
  const mappings = mappingsRest as Mappings;
  const evaluation = evaluationRest as Evaluation;

  const mapMetadata: MapViewMetadata = {
    osm_data_date: mappingsMeta.osm_data_date,
    cache_dates: mappingsMeta.cache_dates,
    generated_at: mappingsMeta.generated_at,
  };

  const evaluationMetadata: JsonFileMetadata = evaluationMeta;

  return (
    <HomeClient
      mappings={mappings}
      evaluation={evaluation}
      mapMetadata={mapMetadata}
      evaluationMetadata={evaluationMetadata}
    />
  );
}
