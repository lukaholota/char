"use client";

import { RuleTermAnchor } from "@/components/ui/RuleTermAnchor";
import { SpellAnchor } from "@/components/ui/SpellAnchor";
import { splitIntoLinkSegments, type PreviewSegment } from "@/lib/logic/preview-link-segments";

export function LinkedPreview({ markup, className }: { markup: string; className?: string }) {
  const segments = splitIntoLinkSegments(markup);
  if (segments.length === 0) return null;

  return <p className={className}>{segments.map((segment, index) => <PreviewSegmentView key={index} segment={segment} />)}</p>;
}

function PreviewSegmentView({ segment }: { segment: PreviewSegment }) {
  if (segment.spellLink) return <SpellAnchor spellLink={segment.spellLink}>{segment.text}</SpellAnchor>;
  if (segment.termLink) {
    return (
      <RuleTermAnchor href={segment.href ?? ""} termLink={segment.termLink}>
        {segment.text}
      </RuleTermAnchor>
    );
  }
  return <span>{segment.text}</span>;
}
