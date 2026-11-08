import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { EditionAccentTitle } from "@/components/ui/EditionAccent";
import { ContentImage } from "@/components/no-ai/ContentImage";
import GoogleAuthDialog from "@/lib/components/auth/GoogleAuthDialog";
import { cn } from "@/lib/utils";
import type { Edition } from "@/rules/route-helpers";
import type { GameSessionListItem } from "@/server/db/game-sessions";
import { GameRoomsArt } from "./GameRoomsArt";
import { FocusNewRoomFormButton, GameSessionsHome } from "./GameSessionsHome";

type Shot = { file: string; width: number; height: number; alt: string };

const SHOTS = {
  room: { file: "hero-room", width: 1600, height: 769, alt: "Кімната майстра: мапа склепу з токенами, трекер бою й журнал кидків" },
  phone: { file: "hero-phone", width: 540, height: 812, alt: "Та сама кімната на телефоні гравця" },
  fogGm: { file: "fog-gm", width: 1000, height: 611, alt: "Мапа очима майстра: уся зала видна, закриті зони лише притінені" },
  fogPlayer: { file: "fog-player", width: 1000, height: 611, alt: "Мапа очима гравця: видно тільки відкриту частину зали" },
  cast: { file: "cast-area", width: 1100, height: 533, alt: "Вогнекуля наведена на мапі, поруч список цілей у зоні вибуху" },
  wand: { file: "cast-wand", width: 612, height: 243, alt: "Магічна паличка на картці заклинання Вогнекуля" },
  enemyAction: { file: "enemy-action", width: 1100, height: 145, alt: "Рядок дії у статблоці з кнопками кидка атаки й шкоди" },
  enemyJournal: { file: "enemy-journal", width: 780, height: 742, alt: "Журнал: Вогнекуля з ряткидком і шкодою для кожної цілі окремо" },
  enemyRoll: { file: "enemy-roll", width: 700, height: 796, alt: "Картка кидка атаки ворога з результатом «Промах»" },
  initiative: { file: "initiative", width: 544, height: 791, alt: "Трекер бою: порядок ініціативи зі станами учасників" },
  homebrew: { file: "homebrew-check", width: 900, height: 458, alt: "Блок «Що кидатиметься в кімнаті» у формі власної істоти" },
} satisfies Record<string, Shot>;

const SHOT_FRAME = "h-auto w-full rounded-2xl border border-white/10 shadow-2xl shadow-black/50";
const FEATURE_TITLE = "font-rpg-display text-3xl leading-tight text-slate-50 lg:text-4xl";
const FEATURE_TEXT = "max-w-prose text-base leading-relaxed text-slate-300 lg:text-lg";
const LANDING_RHYTHM = "space-y-20 lg:space-y-32";
const CTA_SIZE = "h-12 w-full px-8 text-base sm:w-auto";

export function GameRoomsContent({ sessions, edition }: { sessions: GameSessionListItem[] | null; edition: Edition }) {
  if (sessions === null) return <GuestLanding edition={edition} />;
  if (sessions.some((session) => !session.isArchived)) return <RoomsAboveFeatures sessions={sessions} />;
  return <FirstRoomLanding sessions={sessions} edition={edition} />;
}

function GuestLanding({ edition }: { edition: Edition }) {
  const signIn = <GoogleAuthDialog analyticsTrigger="game" trigger={<Button type="button" size="lg" className={CTA_SIZE}>Увійти й створити кімнату</Button>} />;
  return (
    <div className={LANDING_RHYTHM}>
      <RoomsHero edition={edition} action={signIn} />
      <RoomsFeatures />
      <section aria-labelledby="game-rooms-sign-in" className="mx-auto max-w-xl space-y-5 text-center">
        <h2 id="game-rooms-sign-in" className={FEATURE_TITLE}>Зберіть партію за одним посиланням</h2>
        <p className="text-base text-slate-300">Увійдіть, щоб створити кімнату для своєї партії або приєднатися за запрошенням.</p>
        {signIn}
      </section>
    </div>
  );
}

function FirstRoomLanding({ sessions, edition }: { sessions: GameSessionListItem[]; edition: Edition }) {
  const createLabel = sessions.length ? "Створити кімнату" : "Створити першу кімнату";
  return (
    <div className={LANDING_RHYTHM}>
      <RoomsHero edition={edition} action={<FocusNewRoomFormButton label={createLabel} className={CTA_SIZE} />} />
      <RoomsFeatures />
      <div className="mx-auto max-w-3xl">
        <GameSessionsHome sessions={sessions} />
      </div>
    </div>
  );
}

function RoomsAboveFeatures({ sessions }: { sessions: GameSessionListItem[] }) {
  return (
    <div className={LANDING_RHYTHM}>
      <div className="mx-auto max-w-3xl">
        <GameSessionsHome sessions={sessions} />
      </div>
      <section aria-labelledby="game-rooms-features" className="space-y-8 border-t border-white/10 pt-12 lg:space-y-14 lg:pt-16">
        <h2 id="game-rooms-features" className="font-rpg-display text-3xl text-slate-50">Що вміють кімнати</h2>
        <RoomsFeatures />
      </section>
    </div>
  );
}

function RoomsHero({ edition, action }: { edition: Edition; action: ReactNode }) {
  return (
    <section aria-labelledby="game-rooms-hero" className="space-y-8 lg:space-y-10">
      <div className="max-w-4xl space-y-5">
        <h2 id="game-rooms-hero" className="font-rpg-display text-5xl leading-[1.05] lg:text-7xl">
          <EditionAccentTitle edition={edition}>Бій, який рахує себе сам</EditionAccentTitle>
        </h2>
        <p className="max-w-2xl text-lg leading-relaxed text-slate-200 lg:text-xl">
          Мапа, туман війни, ініціатива й кидки всієї партії за одним посиланням. Лист персонажа вже тут, тож заклинання летить із нього просто на мапу.
        </p>
        <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-center">
          {action}
          <p className="max-w-md text-sm text-slate-400">
            Гравцям нічого встановлювати не треба: майстер надсилає посилання, і кімната відкривається на телефоні чи компʼютері.
          </p>
        </div>
      </div>
      <GameRoomsArt>
        <div className="relative lg:pb-10">
          <LandingShot shot={SHOTS.room} sizes="1120px" className="hidden lg:block" />
          <LandingShot shot={SHOTS.phone} sizes="(min-width: 1024px) 208px, 300px" priority className="mx-auto max-w-[300px] rounded-[1.75rem] border-white/20 lg:absolute lg:bottom-0 lg:right-8 lg:w-52 lg:max-w-none" />
        </div>
      </GameRoomsArt>
    </section>
  );
}

function RoomsFeatures() {
  return (
    <div className={LANDING_RHYTHM}>
      <FogFeature />
      <FeatureRow
        title="Заклинання летить просто з листа"
        text="Натисніть магічну паличку на картці заклинання й оберіть цілі на мапі: Магічний дротик — по кількох істотах, Благословення — на союзників, Вогнекуля — на область. Комірка витрачається, ряткидки кидаються, шкода рахується."
        visual={
          <div className="relative lg:pb-20">
            <LandingShot shot={SHOTS.cast} sizes="(min-width: 1024px) 544px, 100vw" />
            <LandingShot shot={SHOTS.wand} sizes="306px" className="mt-3 max-w-[306px] lg:absolute lg:bottom-0 lg:left-6 lg:mt-0" />
          </div>
        }
      />
      <EnemyTurnFeature />
      <FeatureRow
        isReversed
        title="Ініціатива розставляється сама"
        text="Почніть бій — і порядок ходів уже готовий. Будь-яке значення можна змінити. Стани й ряткидки від смерті видно просто під токенами."
        visual={<LandingShot shot={SHOTS.initiative} sizes="320px" className="mx-auto max-w-[320px]" />}
      />
      <FeatureRow
        title="Свої чудовиська теж воюють"
        text="Опишіть дії істоти звичайним текстом. Кімната сама знайде атаки, ряткидки, області й шкоду, а знизу покаже, як це зрозуміла, ще до того, як істота вийде на стіл."
        visual={<LandingShot shot={SHOTS.homebrew} sizes="(min-width: 1024px) 544px, 100vw" />}
      />
      <UnfinishedNote />
    </div>
  );
}

function FogFeature() {
  return (
    <section className="space-y-8">
      <div className="max-w-3xl space-y-3">
        <h3 className={FEATURE_TITLE}>Майстер бачить усе, гравці — лише те, що ви відкрили</h3>
        <p className={FEATURE_TEXT}>
          Понад 500 готових мап або ваша власна. Сцени готуються наперед і вмикаються одним натиском. Сітка тримає дальність, області й масштаб токенів, вороги й союзники стають на мапу, а туман війни розсіюється там, куди дійшла партія.
        </p>
      </div>
      <GameRoomsArt>
        <div className="grid gap-4 sm:grid-cols-2">
          <CaptionedShot shot={SHOTS.fogGm} caption="Так бачить майстер" />
          <CaptionedShot shot={SHOTS.fogPlayer} caption="Так бачить гравець" />
        </div>
      </GameRoomsArt>
    </section>
  );
}

function EnemyTurnFeature() {
  return (
    <section className="space-y-8">
      <div className="max-w-3xl space-y-3">
        <h3 className={FEATURE_TITLE}>Хід ворога — кілька натисків</h3>
        <p className={FEATURE_TEXT}>
          Статблок, дія, ціль — і кімната кидає атаку чи ряткидок. Імунітети й опір враховані, хіти знімаються, стани накладаються, а помилку можна скасувати в журналі. Гравці бачать імʼя й картинку ворога, але ніколи не його статблок.
        </p>
      </div>
      <GameRoomsArt>
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <LandingShot shot={SHOTS.enemyAction} sizes="(min-width: 1024px) 552px, 100vw" />
            <LandingShot shot={SHOTS.enemyJournal} sizes="(min-width: 1024px) 552px, 100vw" />
          </div>
          <LandingShot shot={SHOTS.enemyRoll} sizes="552px" className="hidden lg:block" />
        </div>
      </GameRoomsArt>
    </section>
  );
}

function FeatureRow({ title, text, visual, isReversed = false }: { title: string; text: string; visual: ReactNode; isReversed?: boolean }) {
  return (
    <section className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
      <div className={cn("space-y-3", isReversed && "lg:order-2")}>
        <h3 className={FEATURE_TITLE}>{title}</h3>
        <p className={FEATURE_TEXT}>{text}</p>
      </div>
      <GameRoomsArt>{visual}</GameRoomsArt>
    </section>
  );
}

function UnfinishedNote() {
  return (
    <section className="max-w-3xl space-y-3 border-l-2 border-white/15 pl-5">
      <h3 className="font-rpg-display text-2xl text-slate-50">Що ще в роботі</h3>
      <ul className="space-y-1.5 text-base leading-relaxed text-slate-300">
        <li>Фамільяри, звірі слідопита й Дика форма.</li>
        <li>Підрахунок переміщення, основних і бонусних дій.</li>
        <li>Реакції: Контрчари й провокована атака.</li>
      </ul>
      <p className="text-sm text-slate-400">Кімнати нові, тож баги трапляються. Напишіть про них через «Повідомити про проблему» в меню.</p>
    </section>
  );
}

function CaptionedShot({ shot, caption }: { shot: Shot; caption: string }) {
  return (
    <figure className="space-y-2">
      <LandingShot shot={shot} sizes="(min-width: 640px) 50vw, 100vw" />
      <figcaption className="text-sm font-semibold text-slate-300">{caption}</figcaption>
    </figure>
  );
}

function LandingShot({ shot, sizes, priority, className }: { shot: Shot; sizes: string; priority?: boolean; className?: string }) {
  return <ContentImage src={`/images/games/${shot.file}.webp`} alt={shot.alt} width={shot.width} height={shot.height} sizes={sizes} priority={priority} className={cn(SHOT_FRAME, className)} />;
}
