'use client';

import React from 'react';
import { useCharacterStore } from '@/store/character-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  SelectSubclassStep, 
  SelectFeatOrASIStep, 
  AddHPStep, 
  ChooseOptionalFeatureStep,
  LevelUpStep,
  LevelUpChoice
} from '@/types/character-flow';
import { translateValue } from '@/lib/components/characterCreator/infoUtils';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INDIVIDUAL STEP RENDERERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 1️⃣ SELECT_SUBCLASS Renderer
 */
const SubclassSelectionGrid: React.FC<{ step: SelectSubclassStep }> = ({ step }) => {
  const addChoice = useCharacterStore((s) => s.addChoice);
  const choices = useCharacterStore((s) => s.choices);

  const selectedId = (choices.find((c) => c.stepType === 'SELECT_SUBCLASS') as LevelUpChoice)?.subclassId;

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">
          {translateValue(step.className)} — Обери Підклас
        </h3>
        <p className="text-sm text-muted-foreground">
          На {step.level}-му рівні ви обираєте архетип, що визначає ваш шлях.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {step.options.map((subclass) => (
          <Card 
            key={subclass.id}
            className={`cursor-pointer transition-all border-2 ${
              selectedId === subclass.id ? 'border-primary bg-primary/5' : 'border-transparent hover:border-primary/50'
            }`}
            onClick={() => addChoice({ stepType: 'SELECT_SUBCLASS', subclassId: subclass.id })}
          >
            <CardHeader>
              <CardTitle>{translateValue(subclass.name)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{subclass.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

/**
 * 2️⃣ SELECT_FEAT_OR_ASI Renderer
 */
const FeatAsiTabs: React.FC<{ step: SelectFeatOrASIStep }> = () => {
    const addChoice = useCharacterStore((s) => s.addChoice);
    // Simplified for brevity
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Покращення Характеристик або Риса</h3>
            <Tabs defaultValue="asi">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="asi">Характеристики (+2)</TabsTrigger>
                    <TabsTrigger value="feat">Риса (Feat)</TabsTrigger>
                </TabsList>
                <TabsContent value="asi" className="p-4 border rounded-md">
                    <p className="text-sm text-muted-foreground mb-4">
                        Оберіть одну характеристику для +2 або дві для +1.
                    </p>
                    {/* ASI Logic would go here */}
                    <Button onClick={() => addChoice({ stepType: 'SELECT_FEAT_OR_ASI', type: 'ASI', stats: { STR: 2 } })}>
                        Додати +2 до Сили (Тест)
                    </Button>
                </TabsContent>
                <TabsContent value="feat" className="p-4 border rounded-md">
                    <p>Список рис поки недоступний.</p>
                </TabsContent>
            </Tabs>
        </div>
    );
};

/**
 * 3️⃣ ADD_HP Renderer
 */
const HpRoller: React.FC<{ step: AddHPStep }> = ({ step }) => {
    const addChoice = useCharacterStore((s) => s.addChoice);
    const choices = useCharacterStore((s) => s.choices);
    const choice = choices.find(c => c.stepType === 'ADD_HP') as LevelUpChoice;

    const fixedHp = Math.floor(step.hitDie / 2) + 1;

    return (
        <div className="space-y-6 max-w-md mx-auto">
            <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Здоров&apos;я (HP)</h3>
                <p className="text-muted-foreground">
                    Кістка Хітів: d{step.hitDie}
                </p>
            </div>

            <RadioGroup 
                defaultValue="fixed" 
                onValueChange={(val) => {
                    const value = val === 'fixed' ? fixedHp : Math.floor(Math.random() * step.hitDie) + 1; // Mock roll
                    addChoice({ stepType: 'ADD_HP', value, method: val as 'fixed' | 'roll' });
                }}
            >
                <div className="flex items-center space-x-2 border p-4 rounded-lg cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="fixed" id="fixed" />
                    <Label htmlFor="fixed" className="flex-1 cursor-pointer">
                        <span className="font-bold block">Фіксоване значення: {fixedHp}</span>
                        <span className="text-xs text-muted-foreground">Надійний вибір</span>
                    </Label>
                </div>
                <div className="flex items-center space-x-2 border p-4 rounded-lg cursor-pointer hover:bg-accent">
                    <RadioGroupItem value="roll" id="roll" />
                    <Label htmlFor="roll" className="flex-1 cursor-pointer">
                        <span className="font-bold block">Кинути кубик (d{step.hitDie})</span>
                        <span className="text-xs text-muted-foreground">Ризиковано!</span>
                    </Label>
                </div>
            </RadioGroup>
            
            {choice && (
                <div className="text-center p-4 bg-primary/10 rounded-lg animate-in fade-in">
                    <span className="text-2xl font-bold text-primary">+{choice.value} HP</span>
                </div>
            )}
        </div>
    );
};

/**
 * 4️⃣ CHOOSE_OPTIONAL_FEATURE Renderer (Fighting Styles etc)
 */
const OptionalFeatureGrid: React.FC<{ step: ChooseOptionalFeatureStep }> = ({ step }) => {
    const addChoice = useCharacterStore((s) => s.addChoice);
    const choices = useCharacterStore((s) => s.choices);
    const selectedId = (choices.find((c) => c.stepType === 'CHOOSE_OPTIONAL_FEATURE' && c.featureId === step.featureId) as LevelUpChoice)?.selectedOptionId;

    return (
        <div className="space-y-4">
             <div className="mb-6">
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
            <ScrollArea className="h-[400px] pr-4">
                <div className="grid grid-cols-1 gap-3">
                    {step.options.map((opt) => (
                        <Card 
                            key={opt.id}
                            className={`cursor-pointer transition-all ${selectedId === opt.id ? 'border-primary bg-primary/5' : ''}`}
                            onClick={() => addChoice({ stepType: 'CHOOSE_OPTIONAL_FEATURE', featureId: step.featureId, selectedOptionId: opt.id })}
                        >
                            <CardHeader className="p-4">
                                <CardTitle className="text-base">{opt.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <p className="text-sm text-muted-foreground">{opt.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN RENDERER SWITCH
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const StepRenderer: React.FC<{ step: LevelUpStep }> = ({ step }) => {
  switch (step.type) {
    case 'SELECT_SUBCLASS':
      return <SubclassSelectionGrid step={step} />;
    
    case 'SELECT_FEAT_OR_ASI':
      return <FeatAsiTabs step={step} />;

    case 'ADD_HP':
      return <HpRoller step={step} />;
      
    case 'CHOOSE_OPTIONAL_FEATURE':
        return <OptionalFeatureGrid step={step} />;

    default:
      return (
        <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
          Невідомий тип кроку: {(step as LevelUpStep).type}
        </div>
      );
  }
};
