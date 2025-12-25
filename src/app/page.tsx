import { getUserPerses } from "@/lib/actions/pers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";

export default async function Page() {
  const perses = await getUserPerses();

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Мої Персонажі</h1>
        <Link href="/pers">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Створити
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {perses.map((pers) => (
          <Link href={`/pers/${pers.persId}`} key={pers.persId} className="block hover:no-underline">
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>{pers.name}</CardTitle>
                <CardDescription>{translateValue(pers.race.name)} {translateValue(pers.class.name)} {pers.level}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>HP: {pers.currentHp}/{pers.maxHp}</span>
                  <span>Передісторія: {translateValue(pers.background.name)}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        
        {perses.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
                У вас ще немає персонажів. Створіть першого!
            </div>
        )}
      </div>
    </div>
  );
}
