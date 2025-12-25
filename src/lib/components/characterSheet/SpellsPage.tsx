"use client";

import { PersWithRelations } from "@/lib/actions/pers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/lib/components/ui/badge";
import { spellSchoolTranslations } from "@/lib/refs/translation";

export default function SpellsPage({ pers }: { pers: PersWithRelations }) {
  const spellsByLevel = pers.spells.reduce((acc, ps) => {
    const level = ps.level;
    if (!acc[level]) acc[level] = [];
    acc[level].push(ps);
    return acc;
  }, {} as Record<number, typeof pers.spells>);

  const levels = Object.keys(spellsByLevel).map(Number).sort((a, b) => a - b);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
            <CardTitle>Заклинання</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="bg-secondary/20 p-2 rounded">
                    <div className="text-xs text-muted-foreground">Складність</div>
                    <div className="font-bold text-lg">--</div>
                </div>
                <div className="bg-secondary/20 p-2 rounded">
                    <div className="text-xs text-muted-foreground">Атака</div>
                    <div className="font-bold text-lg">--</div>
                </div>
                <div className="bg-secondary/20 p-2 rounded">
                    <div className="text-xs text-muted-foreground">Характеристика</div>
                    <div className="font-bold text-lg">--</div>
                </div>
            </div>
        </CardContent>
      </Card>

      {levels.map(level => (
        <Card key={level}>
            <CardHeader className="pb-2 py-3 bg-secondary/10">
                <CardTitle className="text-base flex justify-between items-center">
                    <span>{level === 0 ? "Замовляння" : `Рівень ${level}`}</span>
                    {level > 0 && (
                        <Badge variant="outline">
                            Комірки: --
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {spellsByLevel[level].map((spell, i) => (
                    <div key={spell.spellId} className={`p-3 ${i !== spellsByLevel[level].length - 1 ? 'border-b' : ''}`}>
                        <div className="font-medium">{spell.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                            {spellSchoolTranslations[spell.school as keyof typeof spellSchoolTranslations] || spell.school} • {spell.castingTime} • {spell.range}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
      ))}
      
      {levels.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
            Заклинання не відомі
        </div>
      )}
    </div>
  );
}
