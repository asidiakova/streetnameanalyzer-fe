"use client";

const GLOSSARY: { term: string; definition: string }[] = [
  {
    term: "Segment",
    definition:
      "A single geometric line feature (row) from the OpenStreetMap planet_osm_line table. A real-world street is typically split into many segments between intersections.",
  },
  {
    term: "Street",
    definition:
      "A distinct physical street occurrence in a specific location. The same name in different cities counts as separate streets.",
  },
  {
    term: "Variant",
    definition:
      'A unique name spelling found in the dataset. For example, "Štúrova", "Ľ. Štúra", and "Ľudovíta Štúra" are three variants that may refer to the same real-world person.',
  },
  {
    term: "Group",
    definition:
      "A set of name variants that a normalization method considers to be the same street. Each group has a representative (canonical) name.",
  },
  {
    term: "Representative",
    definition:
      "The canonical name chosen to represent a normalized group — typically the most common or longest variant.",
  },
  {
    term: "Normalization method",
    definition:
      "An algorithm or AI model used to decide which street name spellings belong together. Examples include suffix stripping, Levenshtein distance, n-gram similarity, and LLM-based approaches.",
  },
  {
    term: "Entity",
    definition:
      "A real-world person, place, or concept from Wikidata that a street is named after. For example, Ľudovít Štúr is the entity behind streets named \"Štúrova\", \"Ľ. Štúra\", etc.",
  },
  {
    term: "Grouping rate",
    definition:
      "The percentage of known Wikidata entities whose name variants were correctly placed into a single group by the normalization method. Higher is better.",
  },
  {
    term: "Collision",
    definition:
      "When a normalization method incorrectly merges names of different real-world entities into one group — for example, grouping two different people with similar street names together.",
  },
  {
    term: "Collision rate",
    definition:
      "The percentage of groups that contain names belonging to more than one real-world entity. Lower is better.",
  },
  {
    term: "Problem entity",
    definition:
      "A Wikidata entity whose street name variants were fragmented across multiple groups instead of being unified into one.",
  },
  {
    term: "Problem entity score",
    definition:
      "A value between 0 and 1 measuring how well an entity's name variants were grouped. A score of 1 means all variants ended up in one group; lower scores indicate worse fragmentation.",
  },
];

export function AboutPageClient({ osmDataDate }: { osmDataDate: string }) {
  return (
    <div className="h-full overflow-y-auto bg-zinc-50 px-6 py-8">
      <div className="mx-auto max-w-3xl space-y-10">
        <section>
          <h1 className="text-2xl font-bold text-zinc-900">
            Street Name Analyzer
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-700">
            Street Name Analyzer is an academic project for processing and analyzing
            street data from OpenStreetMap. It fetches street names for a
            selected region, calculates the lengths of individual
            segments, and normalizes the names using various algorithms
            and artificial intelligence methods. The results are
            presented through interactive statistics, map visualization,
            and a searchable dictionary of normalized names.
          </p>
        </section>


        <section>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-zinc-500">OSM data date</dt>
            <dd className="font-medium text-zinc-900">
              {osmDataDate}
            </dd>
          </dl>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-800">
            How it works
          </h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-700">
            <li>
              <strong>Data extraction</strong> — Street segments are
              fetched from an OpenStreetMap database for the selected
              region.
            </li>
            <li>
              <strong>Length calculation</strong> — The geometric length
              of each segment is computed and aggregated per street
              name.
            </li>
            <li>
              <strong>Normalization</strong> — Multiple methods (suffix
              stripping, Levenshtein distance, n-gram similarity, and
              LLM-based approaches) group name variants into normalized
              groups.
            </li>
            <li>
              <strong>Evaluation</strong> — Each method is evaluated
              against a Wikidata-based ground truth to measure grouping
              rate, collision rate, and problem entities.
            </li>
            <li>
              <strong>Visualization</strong> — Results are displayed on
              the Map, Statistics, and Dictionary pages of this
              application.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-zinc-800">
            Glossary
          </h2>
          <p className="mt-2 text-xs text-zinc-500">
            Key terms used throughout the application.
          </p>
          <dl className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {GLOSSARY.map(({ term, definition }) => (
              <div key={term} className="px-4 py-3">
                <dt className="text-sm font-medium text-zinc-900">
                  {term}
                </dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-zinc-600">
                  {definition}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
