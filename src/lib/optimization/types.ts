import type { z } from "zod";
import type { articleSchema, bindingSchema, blockSchema, buildRecipeSchema, corpusSchema,
  documentSchema, entitySchema, ratingSchema, rulesetSchema, sourceRefSchema, sourceRevisionSchema,
  translationSchema, contentReferenceSchema } from "./schema";

export type OptimizationRuleset = z.infer<typeof rulesetSchema>;
export type EntityRef = z.infer<typeof entitySchema>;
export type AnalysisArticle = z.infer<typeof articleSchema>;
export type SourceRevision = z.infer<typeof sourceRevisionSchema>;
export type TranslationRevision = z.infer<typeof translationSchema>;
export type AnalysisRating = z.infer<typeof ratingSchema>;
export type EntityBinding = z.infer<typeof bindingSchema>;
export type ContentBlock = z.infer<typeof blockSchema>;
export type InlineNode = Extract<ContentBlock, { type: "paragraph" }>["content"][number];
export type SourceRef = z.infer<typeof sourceRefSchema>;
export type BuildRecipe = z.infer<typeof buildRecipeSchema>;
export type BuildProgressionStep = BuildRecipe["progression"][number];
export type LevelDecisions = NonNullable<BuildProgressionStep["decisions"]>;
export type ArticleDocument = z.infer<typeof documentSchema>;
export type ContentReference = z.infer<typeof contentReferenceSchema>;
export type Corpus = z.infer<typeof corpusSchema>;

export type ArticleSummary = Pick<AnalysisArticle, "articleId" | "slug" | "ruleset" | "titleUk" | "titleEn" | "topics"> & {
  translationRevisionId: string; sourceRevisionId: string; stale: boolean; href: string;
  sections: { sectionId: string; heading: string }[];
};
export type BindingPreview = EntityBinding & {
  translationRevisionId: string; href: string;
  ratings: Pick<AnalysisRating, "ratingId" | "score" | "sourceColor" | "context">[];
};
export type SectionSearchEntry = {
  articleId: string; sectionId: string; ruleset: OptimizationRuleset;
  title: string; text: string; href: string;
};
export type OptimizationIndices = {
  articles: ArticleSummary[]; bindings: BindingPreview[]; search: SectionSearchEntry[];
};
