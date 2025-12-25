"use client";

import { PersWithRelations } from "@/lib/actions/pers";
import { Card, CardContent } from "@/components/ui/card";
import { raceTranslations, classTranslations, subclassTranslations, subraceTranslations, backgroundTranslations, featTranslations } from "@/lib/refs/translation";
import { useState } from "react";
import { InfoDialog, InfoGrid, InfoPill, InfoSectionTitle } from "@/lib/components/characterCreator/EntityInfoDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function FeaturesPage({ pers }: { pers: PersWithRelations }) {
  const [selectedFeature, setSelectedFeature] = useState<{ name: string; description: string } | null>(null);
  
  const raceName = raceTranslations[pers.race.name as keyof typeof raceTranslations] || pers.race.name;
  const className = classTranslations[pers.class.name as keyof typeof classTranslations] || pers.class.name;
  const subclassName = pers.subclass ? (subclassTranslations[pers.subclass.name as keyof typeof subclassTranslations] || pers.subclass.name) : null;
  const subraceName = pers.subrace ? (subraceTranslations[pers.subrace.name as keyof typeof subraceTranslations] || pers.subrace.name) : null;
  const backgroundName = backgroundTranslations[pers.background.name as keyof typeof backgroundTranslations] || pers.background.name;

  // Collect all features from various sources
  const allFeatures: { name: string; description: string; source: string }[] = [];
  
  // Features from PersFeature
  pers.features.forEach(pf => {
    allFeatures.push({
      name: pf.feature.name,
      description: pf.feature.description,
      source: 'feature'
    });
  });

  // Features from ClassChoiceOptions and SubclassChoiceOptions (direct many-to-many)
  if (pers.choiceOptions) {
    pers.choiceOptions.forEach(co => {
      allFeatures.push({
        name: co.optionName,
        description: `${co.groupName}: ${co.optionName}`,
        source: 'choice'
      });
    });
  }

  // Features from RaceChoiceOptions (direct many-to-many)
  if (pers.raceChoiceOptions) {
    pers.raceChoiceOptions.forEach(rco => {
      allFeatures.push({
        name: rco.optionName,
        description: rco.description || `${rco.choiceGroupName}: ${rco.optionName}`,
        source: 'race_choice'
      });
    });
  }

  // Features from FeatChoiceOptions
  pers.feats.forEach(pf => {
    pf.choices.forEach(choice => {
      if (choice.choiceOption) {
        allFeatures.push({
          name: choice.choiceOption.optionName,
          description: `${choice.choiceOption.groupName}: ${choice.choiceOption.optionName}`,
          source: 'feat_choice'
        });
      }
    });
  });

  return (
    <div className="h-full flex flex-col space-y-3">
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
        <EntityCard 
          title={backgroundName}
          type="background"
          entity={pers.background}
          persLevel={pers.level}
        />
      </div>

      {/* Features List - Scrollable */}
      <Card className="flex-1 overflow-hidden flex flex-col bg-white/10 border-purple-300/30 backdrop-blur">
        <CardContent className="p-3 overflow-y-auto flex-1 space-y-1">
          {allFeatures.map((feature, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedFeature(feature)}
              className="w-full text-left px-3 py-2 rounded border border-purple-400/30 bg-purple-900/20 hover:bg-purple-800/40 hover:border-purple-400/60 transition text-sm text-purple-100"
            >
              {feature.name}
            </button>
          ))}
          {pers.feats.map(pf => (
            <button
              key={pf.persFeatId}
              onClick={() => setSelectedFeature({ 
                name: featTranslations[pf.feat.name as keyof typeof featTranslations] || pf.feat.name, 
                description: pf.feat.description 
              })}
              className="w-full text-left px-3 py-2 rounded border border-amber-400/40 bg-amber-900/30 hover:bg-amber-800/50 hover:border-amber-400/70 transition text-sm text-amber-50"
            >
              <span className="font-semibold">{featTranslations[pf.feat.name as keyof typeof featTranslations] || pf.feat.name}</span>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Feature Detail Modal */}
      <Dialog open={!!selectedFeature} onOpenChange={() => setSelectedFeature(null)}>
        <DialogContent className="max-w-2xl border border-purple-400/30 bg-purple-950/95 backdrop-blur text-purple-50">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-purple-100">{selectedFeature?.name}</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-purple-200 whitespace-pre-wrap max-h-96 overflow-y-auto">
            {selectedFeature?.description}
          </div>
        </DialogContent>
      </Dialog>
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
    <Card className="relative bg-white/10 border-purple-300/30 backdrop-blur hover:border-purple-400/60 transition cursor-pointer group">
      <CardContent className="p-3">
        <div className="font-bold text-sm text-purple-50">{title}</div>
        {subtitle && <div className="text-xs text-purple-300">{subtitle}</div>}
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
                {entity.features.map((f: any, idx: number) => {
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
                        <span className="font-semibold text-sm">{f.name}</span>
                        <span className="text-xs text-slate-400">Рівень {f.level}</span>
                      </div>
                      <p className="text-xs text-slate-300">{f.description}</p>
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
                {subEntity.features.map((f: any, idx: number) => {
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
                        <span className="font-semibold text-sm">{f.name}</span>
                        <span className="text-xs text-slate-400">Рівень {f.level}</span>
                      </div>
                      <p className="text-xs text-slate-300">{f.description}</p>
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
                {entity.traits.map((t: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-800/50 bg-slate-900/30">
                    <span className="font-semibold text-sm block mb-1">{t.name}</span>
                    <p className="text-xs text-slate-300">{t.description}</p>
                  </div>
                ))}
              </div>
            </>
          )}
          
          {subEntity && subEntity.traits && (
            <>
              <InfoSectionTitle>Особливості підраси</InfoSectionTitle>
              <div className="space-y-2">
                {subEntity.traits.map((t: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-lg border border-slate-800/50 bg-slate-900/30">
                    <span className="font-semibold text-sm block mb-1">{t.name}</span>
                    <p className="text-xs text-slate-300">{t.description}</p>
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
            <div className="text-sm text-slate-300">
              {entity.description}
            </div>
          )}
        </InfoDialog>
      )}
    </Card>
  );
}
