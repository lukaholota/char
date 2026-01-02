"use client";

import { PersWithRelations } from "@/lib/actions/pers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { raceTranslations, classTranslations, subclassTranslations, subraceTranslations, backgroundTranslations, featTranslations } from "@/lib/refs/translation";
import { useState, useTransition } from "react";
import { InfoDialog, InfoGrid, InfoPill, InfoSectionTitle } from "@/lib/components/characterCreator/EntityInfoDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { FeatureDisplayType, RestType } from "@prisma/client";
import { spendFeatureUse, restoreFeatureUse } from "@/lib/actions/feature-uses";
import { toast } from "sonner";
import { Minus, Plus, Info } from "lucide-react";
import { getProficiencyBonus } from "@/lib/logic/utils";

const stripMarkdownPreview = (value: string) => {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/<a\s+[^>]*>(.*?)<\/a>/gi, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
};

interface FeatureItem {
  featureId: number;
  name: string;
  description: string;
  shortDescription?: string | null;
  displayType: FeatureDisplayType[];
  limitedUsesPer: RestType | null;
  usesCount: number | null;
  usesRemaining: number | null;
  source: string;
}

export default function FeaturesPage({ pers }: { pers: PersWithRelations }) {
  const [selectedFeature, setSelectedFeature] = useState<{ name: string; description: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  
  const raceName = raceTranslations[pers.race.name as keyof typeof raceTranslations] || pers.race.name;
  const className = classTranslations[pers.class.name as keyof typeof classTranslations] || pers.class.name;
  const subclassName = pers.subclass ? (subclassTranslations[pers.subclass.name as keyof typeof subclassTranslations] || pers.subclass.name) : null;
  const subraceName = pers.subrace ? (subraceTranslations[pers.subrace.name as keyof typeof subraceTranslations] || pers.subrace.name) : null;
  const backgroundName = backgroundTranslations[pers.background.name as keyof typeof backgroundTranslations] || pers.background.name;

  // Collect all features from various sources
  const featureMap = new Map<number, FeatureItem>();

  // Helper to add/update feature in map
  const addFeature = (f: any, source: string, pf?: any) => {
    if (!f) return;
    const existing = featureMap.get(f.featureId);
    
    // If we have a PersFeature (pf), it takes priority for usesRemaining
    const usesRemaining = pf ? pf.usesRemaining : (existing?.usesRemaining ?? null);
    
    // Calculate max uses if it depends on proficiency
    let maxUses = f.usesCount;
    if (f.usesCountDependsOnProficiencyBonus) {
        maxUses = getProficiencyBonus(pers.level);
    }

    featureMap.set(f.featureId, {
      featureId: f.featureId,
      name: f.name,
      description: f.description,
      shortDescription: f.shortDescription,
      displayType: f.displayType || [],
      limitedUsesPer: f.limitedUsesPer,
      usesCount: maxUses,
      usesRemaining: usesRemaining,
      source: existing ? `${existing.source}, ${source}` : source
    });
  };

  // Base Class Features
  pers.class.features.forEach(cf => addFeature(cf.feature, 'class'));
  
  // Subclass Features
  if (pers.subclass) {
    pers.subclass.features.forEach(sf => addFeature(sf.feature, 'subclass'));
  }

  // Race Traits
  pers.race.traits.forEach(rt => addFeature(rt.feature, 'race'));
  
  // Subrace Traits
  if (pers.subrace) {
    pers.subrace.traits.forEach(st => addFeature(st.feature, 'subrace'));
  }

  // Pers Features (includes choices and manually added)
  pers.features.forEach(pf => addFeature(pf.feature, 'feature', pf));

  // Feats
  pers.feats.forEach(pf => {
    // A feat itself might not be into featureMap if it doesn't have a linked Feature entity in the same way,
    // but the model shows Feat has grantsByFeat relation.
    // For now, let's keep the existing logic for feats as they are usually passive names.
  });

  const allFeatures = Array.from(featureMap.values());

  // Filter and group
  const classResources = allFeatures.filter(f => f.displayType.includes(FeatureDisplayType.CLASS_RESOURCE));
  const otherFeatures = allFeatures.filter(f => !f.displayType.includes(FeatureDisplayType.CLASS_RESOURCE) && !f.displayType.includes(FeatureDisplayType.HIDDEN));

  const handleSpend = (featureId: number) => {
    startTransition(async () => {
      const res = await spendFeatureUse({ persId: pers.persId, featureId });
      if (res.success) {
        // revalidatePath handles UI update
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleRestore = (featureId: number) => {
    startTransition(async () => {
      const res = await restoreFeatureUse({ persId: pers.persId, featureId });
      if (res.success) {
          // revalidatePath handles UI update
      } else {
          toast.error(res.error);
      }
    });
  };

  return (
    <div className="h-full flex flex-col space-y-4 pb-10">
      {/* Entity Grid - 2 columns */}
      <div className="grid grid-cols-2 gap-2">
        <EntityCard 
          title={className} 
          subtitle={subclassName || undefined}
          type="class"
          entity={pers.class}
          subEntity={pers.subclass}
          persLevel={pers.level}
        />
        <EntityCard 
          title={raceName} 
          subtitle={subraceName || undefined}
          type="race"
          entity={pers.race}
          subEntity={pers.subrace}
          persLevel={pers.level}
        />
        <div className="col-span-2">
            <EntityCard 
                title={backgroundName}
                type="background"
                entity={pers.background}
                persLevel={pers.level}
            />
        </div>
      </div>

      {/* Class Resources Section */}
      {classResources.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider px-1">Ресурси класу</h3>
          <div className="grid grid-cols-1 gap-2">
            {classResources.map(feature => (
              <ResourceCard 
                key={feature.featureId} 
                feature={feature} 
                onSpend={() => handleSpend(feature.featureId)}
                onRestore={() => handleRestore(feature.featureId)}
                onInfo={() => setSelectedFeature(feature)}
                isPending={isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Features List */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider px-1">Вміння та Риси</h3>
        <div className="space-y-2">
          {otherFeatures.sort((a, b) => a.name.localeCompare(b.name)).map((feature) => (
            <FeatureCard 
              key={feature.featureId} 
              feature={feature} 
              onSpend={() => handleSpend(feature.featureId)}
              onRestore={() => handleRestore(feature.featureId)}
              onClick={() => setSelectedFeature(feature)}
              isPending={isPending}
            />
          ))}
          
          {/* Add feats that aren't in featureMap */}
          {pers.feats.map(pf => (
            <button
              key={pf.persFeatId}
              onClick={() => setSelectedFeature({ 
                name: featTranslations[pf.feat.name as keyof typeof featTranslations] || pf.feat.name, 
                description: pf.feat.description 
              })}
              className="w-full text-left px-4 py-3 rounded-xl border border-amber-400/20 bg-amber-900/10 hover:bg-amber-800/20 hover:border-amber-400/40 transition group"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-amber-100">{featTranslations[pf.feat.name as keyof typeof featTranslations] || pf.feat.name}</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded uppercase font-bold tracking-tighter">Риса</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Feature Detail Modal */}
      <Dialog open={!!selectedFeature} onOpenChange={() => setSelectedFeature(null)}>
        <DialogContent className="max-w-2xl border border-purple-400/30 bg-purple-950/95 backdrop-blur text-purple-50">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-purple-100">{selectedFeature?.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {selectedFeature?.description ? (
              <FormattedDescription
                content={selectedFeature.description}
                className="text-sm text-purple-200"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResourceCard({ feature, onSpend, onRestore, onInfo, isPending }: { 
    feature: FeatureItem, 
    onSpend: () => void, 
    onRestore: () => void,
    onInfo: () => void,
    isPending: boolean
}) {
    const hasTracker = feature.limitedUsesPer && feature.usesCount !== null;

    return (
        <Card className="bg-purple-900/20 border-purple-500/30 backdrop-blur-sm overflow-hidden border-l-4 border-l-purple-500">
            <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <div className="font-bold text-purple-50 truncate">{feature.name}</div>
                        <button onClick={onInfo} className="p-1 rounded-full hover:bg-white/10 text-purple-400 transition">
                            <Info className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    {feature.shortDescription && (
                        <div className="text-[11px] text-purple-300/80 truncate">
                            {stripMarkdownPreview(feature.shortDescription)}
                        </div>
                    )}
                </div>

                {hasTracker && (
                    <div className="flex items-center gap-2 bg-black/20 rounded-lg p-1 border border-white/5">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded-md hover:bg-white/10 text-purple-300" 
                            onClick={onSpend}
                            disabled={isPending || (feature.usesRemaining ?? 0) <= 0}
                        >
                            <Minus className="w-4 h-4" />
                        </Button>
                        <div className="px-2 text-center min-w-[3rem]">
                            <div className="text-xs font-bold text-white leading-none">
                                {feature.usesRemaining ?? feature.usesCount} / {feature.usesCount}
                            </div>
                            <div className="text-[8px] uppercase font-bold text-purple-400 mt-0.5">uses</div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded-md hover:bg-white/10 text-purple-300" 
                            onClick={onRestore}
                            disabled={isPending || (feature.usesRemaining ?? 0) >= (feature.usesCount ?? 0)}
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function FeatureCard({ feature, onSpend, onRestore, onClick, isPending }: { 
    feature: FeatureItem, 
    onSpend: () => void, 
    onRestore: () => void,
    onClick: () => void,
    isPending: boolean
}) {
  const hasTracker = feature.limitedUsesPer && feature.usesCount !== null;
  const isClass = feature.source.includes('class') || feature.source.includes('subclass');

  return (
    <div 
      className={`p-4 rounded-xl border transition group animate-in fade-in slide-in-from-bottom-2 ${
        isClass 
          ? 'bg-purple-900/10 border-purple-500/20 hover:border-purple-500/40' 
          : 'bg-slate-900/30 border-white/10 hover:border-white/20'
      }`}
    >
        <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-100 group-hover:text-purple-200 transition">{feature.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-tight ${
                        isClass ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                    }`}>
                        {isClass ? 'Клас' : 'Раса'}
                    </span>
                </div>
                {feature.shortDescription ? (
                    <div className="text-xs text-slate-400 line-clamp-2">
                        {stripMarkdownPreview(feature.shortDescription)}
                    </div>
                ) : (
                    <div className="text-[10px] italic text-slate-500">Натисніть для деталей...</div>
                )}
            </div>

            {hasTracker && (
                <div className="flex flex-col items-center gap-1.5 bg-black/30 rounded-xl p-1.5 border border-white/5 shrink-0">
                    <div className="flex items-center gap-1">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 rounded-lg hover:bg-white/10 text-white" 
                            onClick={(e) => { e.stopPropagation(); onSpend(); }}
                            disabled={isPending || (feature.usesRemaining ?? 0) <= 0}
                        >
                            <Minus className="w-3 h-3" />
                        </Button>
                        <div className="px-1 text-center min-w-[2.5rem]">
                            <span className="text-xs font-black text-white">
                                {feature.usesRemaining ?? feature.usesCount} / {feature.usesCount}
                            </span>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 rounded-lg hover:bg-white/10 text-white" 
                            onClick={(e) => { e.stopPropagation(); onRestore(); }}
                            disabled={isPending || (feature.usesRemaining ?? 0) >= (feature.usesCount ?? 0)}
                        >
                            <Plus className="w-3 h-3" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
}

interface EntityCardProps {
  title: string;
  subtitle?: string;
  type: 'class' | 'race' | 'background';
  entity: any;
  subEntity?: any;
  persLevel: number;
}

function EntityCard({ title, subtitle, type, entity, subEntity, persLevel }: EntityCardProps) {
  return (
    <Card className="relative bg-white/5 border-white/10 backdrop-blur hover:bg-white/10 hover:border-purple-500/30 transition cursor-pointer group overflow-hidden">
      <CardContent className="p-3">
        <div className="font-bold text-sm text-purple-100">{title}</div>
        {subtitle && <div className="text-[10px] text-purple-400 uppercase font-bold mt-0.5">{subtitle}</div>}
      </CardContent>
      
      {/* Info Dialog */}
      {type === 'class' && (
        <InfoDialog title={title} subtitle={subtitle} triggerLabel={`Інформація про ${title}`}>
          <InfoGrid>
            <InfoPill label="Кістка хітів" value={`d${entity.hitDie}`} />
            <InfoPill label="Підклас з рівня" value={`Рівень ${entity.subclassLevel}`} />
          </InfoGrid>
          
          {entity.features && entity.features.length > 0 && (
            <>
              <InfoSectionTitle>Вміння класу</InfoSectionTitle>
              <div className="space-y-2">
                {entity.features.filter((f: any) => !f.feature.displayType.includes(FeatureDisplayType.HIDDEN)).map((f: any, idx: number) => {
                  const isUnlocked = f.level <= persLevel;
                  return (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg border ${
                        isUnlocked 
                          ? 'border-green-500/50 bg-green-900/20' 
                          : 'border-slate-800/50 bg-slate-900/30 opacity-60'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm">{f.feature.name}</span>
                        <span className="text-xs text-slate-400">Рівень {f.level}</span>
                      </div>
                      <FormattedDescription content={String(f.feature.description || "")} className="text-xs text-slate-300" />
                    </div>
                  );
                })}
              </div>
            </>
          )}
          
          {subEntity && subEntity.features && (
            <>
              <InfoSectionTitle>Вміння підкласу</InfoSectionTitle>
              <div className="space-y-2">
                {subEntity.features.filter((f: any) => !f.feature.displayType.includes(FeatureDisplayType.HIDDEN)).map((f: any, idx: number) => {
                  const isUnlocked = f.level <= persLevel;
                  return (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg border ${
                        isUnlocked 
                          ? 'border-blue-500/50 bg-blue-900/20' 
                          : 'border-slate-800/50 bg-slate-900/30 opacity-60'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm">{f.feature.name}</span>
                        <span className="text-xs text-slate-400">Рівень {f.level}</span>
                      </div>
                      <FormattedDescription content={String(f.feature.description || "")} className="text-xs text-slate-300" />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </InfoDialog>
      )}
      
      {type === 'race' && (
        <InfoDialog title={title} subtitle={subtitle} triggerLabel={`Інформація про ${title}`}>
          {entity.traits && entity.traits.length > 0 && (
            <>
              <InfoSectionTitle>Расові особливості</InfoSectionTitle>
              <div className="space-y-2">
                {entity.traits.filter((t: any) => !t.feature.displayType.includes(FeatureDisplayType.HIDDEN)).map((t: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-800/50 bg-slate-900/30">
                    <span className="font-semibold text-sm block mb-1">{t.feature.name}</span>
                    <FormattedDescription content={String(t.feature.description || "")} className="text-xs text-slate-300" />
                  </div>
                ))}
              </div>
            </>
          )}
          
          {subEntity && subEntity.traits && (
            <>
              <InfoSectionTitle>Особливості підраси</InfoSectionTitle>
              <div className="space-y-2">
                {subEntity.traits.filter((t: any) => !t.feature.displayType.includes(FeatureDisplayType.HIDDEN)).map((t: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-800/50 bg-slate-900/30">
                    <span className="font-semibold text-sm block mb-1">{t.feature.name}</span>
                    <FormattedDescription content={String(t.feature.description || "")} className="text-xs text-slate-300" />
                  </div>
                ))}
              </div>
            </>
          )}
        </InfoDialog>
      )}
      
      {type === 'background' && (
        <InfoDialog title={title} triggerLabel={`Інформація про ${title}`}>
          {entity.description && (
            <FormattedDescription content={String(entity.description)} className="text-sm text-slate-300" />
          )}
        </InfoDialog>
      )}
    </Card>
  );
}
