'use client';

import React, { useState, useEffect } from 'react';
// import { useCharacterStore } from '@/store/character-store';
import { LevelUpWizard } from './LevelUpWizard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface LevelUpWizardMulticlassProps {
  persId: number;
  currentLevel: number; // Total level
}

export const LevelUpWizardMulticlass: React.FC<LevelUpWizardMulticlassProps> = ({
  persId,
  currentLevel,
}) => {
  // const [multiclassInfo, setMulticlassInfo] = useState<any>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch multiclass info on mount
  useEffect(() => {
      // Mock fetch - replace with actual server action call
      // const info = await getMulticlassInfo(persId);
      // setMulticlassInfo(info);
      setLoading(false);
      
      // For now, auto-select the only class if single class
      // if (info.classes.length === 1) setSelectedClassId(info.classes[0].classId);
  }, [persId]);

  if (loading) {
      return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;
  }

  // If class is selected, show the standard wizard for that class
  if (selectedClassId) {
      // We need to know the CURRENT level of that specific class to ask for the NEXT level features
      // const classInfo = multiclassInfo.classes.find(c => c.classId === selectedClassId);
      // return <LevelUpWizard persId={persId} currentLevel={classInfo.classLevel} classId={selectedClassId} />;
      
      // For now, just pass through to the standard wizard which assumes single class logic for now
      return <LevelUpWizard persId={persId} currentLevel={currentLevel} />;
  }

  return (
    <Card className="max-w-2xl mx-auto mt-10">
      <CardHeader>
        <CardTitle>Оберіть клас для підвищення рівня</CardTitle>
        <CardDescription>
            Ваш персонаж має кілька класів. Який з них ви хочете покращити?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
          {/* Mock Class Selection UI */}
          <Button className="w-full justify-start text-lg h-auto p-4" onClick={() => setSelectedClassId(1)}>
              <div className="text-left">
                  <div className="font-bold">Боєць (Fighter)</div>
                  <div className="text-sm opacity-70">Поточний рівень: 3 ➝ 4</div>
              </div>
          </Button>
           <Button variant="outline" className="w-full justify-start text-lg h-auto p-4" disabled>
              <div className="text-left">
                  <div className="font-bold">Додати новий клас (Multiclass)</div>
                  <div className="text-sm opacity-70">Вимоги не виконані (INT &lt; 13)</div>
              </div>
          </Button>
      </CardContent>
    </Card>
  );
};
