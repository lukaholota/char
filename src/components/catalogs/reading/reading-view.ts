export type ReadingView<TSection extends string> = {
  section: TSection;
  featureKey: string | null;
  focusRequest: number;
  missing: "branch" | "feature" | null;
};

export type ReadingActions<TSection extends string> = {
  onSectionChange: (section: TSection) => void;
  onOpenBranch: (branchKey: string, opener: HTMLButtonElement) => void;
  onDismissMissing: () => void;
  onOpenFeature?: (featureKey: string) => void;
};
