/** Production pipeline from the BookLeaf knowledge base, in order. */
export const PRODUCTION_STAGES = [
  "Manuscript Received",
  "Editing",
  "Cover Design",
  "Typesetting",
  "Proofreading",
  "ISBN Assignment",
  "Printing",
  "Distribution Setup",
  "Published & Live",
] as const;

export const PUBLISHED_STATUS = "Published & Live";

export type ProductionInfo = {
  isPublished: boolean;
  /** Current stage name, e.g. "Cover Design". */
  stage: string;
  /** 1-based position of the stage in the pipeline, null if the status is not recognised. */
  stageIndex: number | null;
  totalStages: number;
};

/** Parses dataset statuses like "In Production - Cover Design" or "Published & Live". */
export function getProductionInfo(status: string): ProductionInfo {
  const isPublished = status.trim() === PUBLISHED_STATUS;
  const stage = isPublished
    ? PUBLISHED_STATUS
    : status.replace(/^In Production\s*-\s*/i, "").trim();
  const index = PRODUCTION_STAGES.findIndex((s) => s.toLowerCase() === stage.toLowerCase());

  return {
    isPublished,
    stage,
    stageIndex: index === -1 ? null : index + 1,
    totalStages: PRODUCTION_STAGES.length,
  };
}
