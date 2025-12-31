"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, RefreshCcw } from "lucide-react";
import { ControlledInfoDialog, InfoSectionTitle } from "@/lib/components/characterCreator/EntityInfoDialog";
import { FormattedDescription } from "@/components/ui/FormattedDescription";
import { checkPrerequisite } from "@/lib/logic/prerequisiteUtils";
import { PrerequisiteConfirmationDialog } from "@/lib/components/ui/PrerequisiteConfirmationDialog";
import clsx from "clsx";

interface Props {
  title: string;
  groupName: string;
  currentChoices: any[];
  availableOptions: any[];
  classLevel: number;
  pact?: string;
  onSelectionChange: (replacement: { oldId: number; newId: number } | null) => void;
  formId: string;
}

const stripMarkdownPreview = (value: string) => {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
};

export default function ChoiceReplacementForm({
  title,
  groupName,
  currentChoices,
  availableOptions,
  classLevel,
  pact,
  onSelectionChange,
}: Props) {
  const [selectedOldId, setSelectedOldId] = useState<number | null>(null);
  const [selectedNewId, setSelectedNewId] = useState<number | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoTitle, setInfoTitle] = useState("");
  const [infoContent, setInfoContent] = useState<any[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingNewId, setPendingNewId] = useState<number | null>(null);
  const [prereqReason, setPrereqReason] = useState<string | undefined>(undefined);

  // Filter available options to only include those in the same group
  const groupedAvailable = useMemo(() => {
    return availableOptions.filter(opt => opt.choiceOption.groupName === groupName);
  }, [availableOptions, groupName]);

  // Identify which options are actually available based on prerequisites
  const processedOptions = useMemo(() => {
    const existingIds = new Set(currentChoices.map(c => c.choiceOptionId));
    
    return groupedAvailable.map(opt => {
      const prereqResult = checkPrerequisite(opt.choiceOption.prerequisites, {
        classLevel,
        pact: pact, // Use the pact from props
        existingChoiceOptionIds: Array.from(existingIds)
      });
      
      return {
        ...opt,
        ...prereqResult, // met: boolean, reason?: string
        isAlreadyKnown: existingIds.has(opt.choiceOptionId)
      };
    }).sort((a, b) => {
      if (a.met !== b.met) return a.met ? -1 : 1;
      if (a.isAlreadyKnown !== b.isAlreadyKnown) return a.isAlreadyKnown ? 1 : -1;
      return (a.choiceOption.optionName || "").localeCompare(b.choiceOption.optionName || "");
    });
  }, [groupedAvailable, currentChoices, classLevel, pact]);

  useEffect(() => {
    if (selectedOldId && selectedNewId) {
      onSelectionChange({ oldId: selectedOldId, newId: selectedNewId });
    } else {
      onSelectionChange(null);
    }
  }, [selectedOldId, selectedNewId, onSelectionChange]);

  const openInfo = (label: string, features: any[]) => {
    setInfoTitle(label);
    setInfoContent(features.map(f => f.feature).filter(Boolean));
    setInfoOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h2 className="font-rpg-display text-3xl font-semibold uppercase tracking-widest text-slate-200">{title}</h2>
        <p className="text-sm text-slate-400">Оберіть одне поточне вміння для заміни та нове вміння.</p>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-xs uppercase tracking-widest text-indigo-400 mb-3 ml-1">Що замінити?</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {currentChoices.map((choice) => (
              <Card
                key={choice.choiceOptionId}
                className={clsx(
                  "glass-card cursor-pointer transition-all",
                  selectedOldId === choice.choiceOptionId ? "glass-active border-indigo-500/50" : "opacity-80 hover:opacity-100"
                )}
                onClick={() => setSelectedOldId(prev => prev === choice.choiceOptionId ? null : choice.choiceOptionId)}
              >
                <CardContent className="p-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">{choice.optionName}</span>
                  {selectedOldId === choice.choiceOptionId && <RefreshCcw className="w-4 h-4 text-indigo-400 animate-spin-slow" />}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-widest text-emerald-400 mb-3 ml-1">На що замінити?</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {processedOptions.map((opt) => {
              const optionId = opt.choiceOptionId;
              const isKnown = opt.isAlreadyKnown;
              const isMet = opt.met;
              const label = opt.choiceOption.optionName || opt.choiceOption.optionNameEng;
              
              const previewText = opt.choiceOption.features?.[0]?.feature?.shortDescription || "";

              return (
                <Card
                  key={optionId}
                  className={clsx(
                    "glass-card transition-all relative overflow-hidden",
                    !isMet && "border-rose-500/30 opacity-70",
                    isKnown && "opacity-50 grayscale cursor-not-allowed",
                    isMet && !isKnown && "cursor-pointer hover:border-emerald-500/30",
                    selectedNewId === optionId && "glass-active border-emerald-500/50"
                  )}
                  onClick={() => {
                    if (isKnown) return; // Can't select already known
                    
                    // If already selected, deselect
                    if (selectedNewId === optionId) {
                      setSelectedNewId(null);
                      return;
                    }
                    
                    // If prerequisites not met, show dialog
                    if (!isMet) {
                      setPrereqReason(opt.reason);
                      setPendingNewId(optionId);
                      setConfirmOpen(true);
                      return;
                    }
                    
                    // Otherwise just select
                    setSelectedNewId(optionId);
                  }}
                >
                  <CardContent className="p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className={clsx("text-sm font-semibold truncate", !isMet ? "text-rose-200" : "text-white")}>
                        {label}
                      </p>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 rounded-full text-slate-400 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          openInfo(label, opt.choiceOption.features || []);
                        }}
                      >
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </div>

                    {!isMet && (opt.reasons?.length || opt.reason) && (
                      <div className="text-[10px] text-rose-400 font-medium bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 space-y-0.5">
                        {opt.reasons ? (
                          opt.reasons.map((r: string, i: number) => (
                            <div key={i}>{r}</div>
                          ))
                        ) : (
                          <div>{opt.reason}</div>
                        )}
                      </div>
                    )}

                    {isKnown && (
                      <p className="text-[10px] text-slate-400 font-medium italic">Вже відомо</p>
                    )}

                    {previewText && (
                      <p className="text-xs text-slate-400 line-clamp-1 italic">
                        {stripMarkdownPreview(previewText)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      <ControlledInfoDialog
        open={infoOpen}
        onOpenChange={setInfoOpen}
        title={infoTitle}
      >
        <div className="space-y-4">
          {infoContent.map((feat: any) => (
            <div key={feat.featureId} className="space-y-2">
              <InfoSectionTitle>{feat.name}</InfoSectionTitle>
              <FormattedDescription content={feat.description} className="text-slate-300 text-sm" />
            </div>
          ))}
          {!infoContent.length && <p className="text-slate-400 italic">Опис відсутній</p>}
        </div>
      </ControlledInfoDialog>
      
      <PrerequisiteConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        reason={prereqReason}
        onConfirm={() => {
          if (pendingNewId) {
            setSelectedNewId(pendingNewId);
            setPendingNewId(null);
          }
        }}
      />
    </div>
  );
}
