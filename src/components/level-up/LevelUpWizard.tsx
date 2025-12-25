'use client';

import React, { useEffect } from 'react';
import { useCharacterStore } from '@/store/character-store';
import { StepRenderer } from './StepRenderer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface LevelUpWizardProps {
  persId: number;
  currentLevel: number;
}

export const LevelUpWizard: React.FC<LevelUpWizardProps> = ({
  persId,
  currentLevel,
}) => {
  const {
    phase,
    steps,
    error,
    initiateLevelUp,
    nextStep,
    prevStep,
    submitLevelUp,
    isSubmitting,
  } = useCharacterStore();

  const currentStepIndex = useCharacterStore((s) => s.currentStepIndex);
  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  // Start the wizard when component mounts
  useEffect(() => {
    initiateLevelUp(persId, currentLevel);
  }, [persId, currentLevel, initiateLevelUp]);

  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Аналізуємо структуру класу...</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Помилка</AlertTitle>
        <AlertDescription>{error || 'Щось пішло не так.'}</AlertDescription>
      </Alert>
    );
  }

  if (phase === 'complete') {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 text-center animate-in zoom-in">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold">Рівень Підвищено!</h2>
        <p className="text-muted-foreground">Всі зміни успішно застосовані.</p>
        <Button onClick={() => window.location.reload()}>Повернутися до Листа</Button>
      </div>
    );
  }

  if (!currentStep) return null;

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg border-t-4 border-t-primary">
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle>Level Up: Рівень {currentLevel + 1}</CardTitle>
            <span className="text-sm text-muted-foreground">
                Крок {currentStepIndex + 1} з {steps.length}
            </span>
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-secondary h-2 rounded-full mt-2 overflow-hidden">
            <div 
                className="bg-primary h-full transition-all duration-500 ease-out"
                style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            />
        </div>
      </CardHeader>
      
      <CardContent className="min-h-[400px] p-6">
        <StepRenderer step={currentStep} />
      </CardContent>

      <CardFooter className="flex justify-between bg-secondary/20 p-6">
        <Button 
            variant="outline" 
            onClick={prevStep} 
            disabled={currentStepIndex === 0 || isSubmitting}
        >
          Назад
        </Button>
        
        {isLastStep ? (
          <Button onClick={submitLevelUp} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Завершити та Зберегти
          </Button>
        ) : (
          <Button onClick={nextStep}>
            Далі
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
