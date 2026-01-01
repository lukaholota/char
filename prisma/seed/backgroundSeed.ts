import { PrismaClient, BackgroundCategory, ToolCategory, Skills, Source, Prisma } from "@prisma/client";

export const seedBackground = async (prisma: PrismaClient) => {
    console.log('Seeding backgrounds...')

    const backgrounds: Prisma.BackgroundCreateInput[] = [
        {
            name: BackgroundCategory.ACOLYTE,
            skillProficiencies: [Skills.INSIGHT, Skills.RELIGION],
            languagesToChooseCount: 2,
            items: [
                { name: 'Священний символ', quantity: 1 },
                { name: 'Молитовник або молитовне колесо', quantity: 1 },
                { name: 'Палички ладану', quantity: 5 },
                { name: 'Ритуальний одяг', quantity: 1 },
                { name: 'Звичайний одяг', quantity: 1 },
                { name: 'зм', quantity: 15 }            ],
            specialAbilityName: 'Притулок Вірних',
            description: 'Як послідовник віри, ти командуєш повагою тих, хто розділяє твою віру, і можеш проводити релігійні церемонії свого божества. Ти та твої супутники можете очікувати безкоштовного лікування та догляду в храмі, святилищі чи іншому закладі твоєї віри, хоча ти повинен надати будь-які матеріальні компоненти, необхідні для заклинань. Ті, хто розділяє твою релігію, підтримуватимуть тебе (але тільки тебе) на скромному рівні життя.\n\nТи також можеш мати зв\'язки з конкретним храмом, присвяченим обраному божеству або пантеону, і маєш там помешкання. Це може бути храм, де ти служив раніше, якщо залишився з ним у добрих стосунках, або храм, де ти знайшов новий дім. Перебуваючи поблизу свого храму, ти можеш звернутися до жерців за допомогою, за умови, що допомога, про яку ти просиш, не є небезпечною і ти залишаєшся в хороших стосунках зі своїм храмом.'
        },
        {
            name: BackgroundCategory.CHARLATAN,
            skillProficiencies: [Skills.DECEPTION, Skills.SLEIGHT_OF_HAND],
            toolProficiencies: [ToolCategory.DISGUISE_KIT, ToolCategory.FORGERY_KIT],
            items: [
                { name: 'Гарний одяг', quantity: 1 },
                { name: 'Набір для маскування', quantity: 1 },
                {
                    name: 'Інструменти шахрая (флакони, підроблені кості, марковані карти, фальшива печатка)',
                    quantity: 1
                },
                { name: 'зм', quantity: 15 }            ],
            specialAbilityName: 'Фальшива Особистість',
            description: 'Ти створив собі другу особистість, яка включає документи, встановлені знайомства та маскування, що дозволяє тобі прийняти цю персону. Крім того, ти можеш підробити документи, включаючи офіційні папери та особисті листи, якщо бачив приклад документа або почерку, який намагаєшся скопіювати.'
        },
        {
            name: BackgroundCategory.CRIMINAL,
            skillProficiencies: [Skills.DECEPTION, Skills.STEALTH],
            toolProficiencies: [ToolCategory.GAMING_SET, ToolCategory.THIEVES_TOOLS],
            items: [
                { name: 'Ломик', quantity: 1 },
                { name: 'Темний звичайний одяг з капюшоном', quantity: 1 },
                { name: 'зм', quantity: 15 }            ],
            specialAbilityName: 'Злочинний Контакт',
            description: 'У тебе є надійний і довірений контакт, який діє як зв\'язковий у мережі інших злочинців. Ти знаєш, як отримувати і передавати повідомлення навіть на великі відстані; конкретно, ти знаєш місцеві канали передачі повідомлень у і з таких місць, а також знаєш інших, хто може передати твоє повідомлення в те місце, де воно потрібне.'
        },
        {
            name: BackgroundCategory.SPY,
            skillProficiencies: [Skills.DECEPTION, Skills.STEALTH],
            toolProficiencies: [ToolCategory.GAMING_SET, ToolCategory.THIEVES_TOOLS],
            items: [
                { name: 'Ломик', quantity: 1 },
                { name: 'Темний звичайний одяг з капюшоном', quantity: 1 },
                { name: 'зм', quantity: 15 }            ],
            specialAbilityName: 'Злочинний Контакт',
            description: 'У тебе є надійний і довірений контакт, який діє як зв\'язковий у мережі інших злочинців та інформаторів. Ти знаєш, як отримувати і передавати повідомлення навіть на великі відстані; конкретно, ти знаєш місцеві канали передачі повідомлень у і з таких місць, а також знаєш інших, хто може передати твоє повідомлення в те місце, де воно потрібне.'
        },
        {
            name: BackgroundCategory.ENTERTAINER,
            skillProficiencies: [Skills.ACROBATICS, Skills.PERFORMANCE],
            toolProficiencies: [ToolCategory.DISGUISE_KIT, ToolCategory.MUSICAL_INSTRUMENT],
            items: [
                { name: 'Музичний інструмент (на вибір)', quantity: 1 },
                { name: 'Подарунок від шанувальника (любовний лист, локон волосся або якась дрібничка)', quantity: 1 },
                { name: 'Костюм', quantity: 1 },
                { name: 'зм', quantity: 15 }            ],
            specialAbilityName: 'За Популярним Запитом',
            description: 'Ти завжди можеш знайти місце для виступу, зазвичай у таверні або корчмі, але можливо і в цирку, театрі чи навіть у дворі знатного роду. У такому місці ти отримуєш безкоштовне житло та їжу скромного або комфортного рівня (залежно від якості закладу), якщо виступаєш щовечора. Крім того, твої виступи роблять тебе якоюсь місцевою фігурою. Коли незнайомці впізнають тебе в місті, де ти виступав, вони зазвичай добре до тебе ставляться.'
        },
        {
            name: BackgroundCategory.GLADIATOR,
            skillProficiencies: [Skills.ACROBATICS, Skills.PERFORMANCE],
            toolProficiencies: [ToolCategory.DISGUISE_KIT, ToolCategory.MUSICAL_INSTRUMENT],
            items: [
                { name: 'Музичний інструмент (на вибір)', quantity: 1 },
                { name: 'Подарунок від шанувальника', quantity: 1 },
                { name: 'Незвичайна зброя (тризубець або сітка)', quantity: 1 },
                { name: 'Костюм', quantity: 1 },
                { name: 'зм', quantity: 15 }            ],
            specialAbilityName: 'За Популярним Запитом',
            description: 'Ти можеш знайти місце для виступу на аренах, у бійцівських ямах або інших місцях змагань. У такому місці ти отримуєш безкоштовне житло та їжу скромного або комфортного рівня (залежно від якості закладу). Крім того, твої виступи роблять тебе якоюсь місцевою фігурою. Коли незнайомці впізнають тебе в місті, де ти виступав, вони зазвичай добре до тебе ставляться.'
        },
        {
            name: BackgroundCategory.FOLK_HERO,
            skillProficiencies: [Skills.ANIMAL_HANDLING, Skills.SURVIVAL],
            toolProficiencies: [ToolCategory.ARTISAN_TOOLS, ToolCategory.VEHICLES_LAND],
            items: [
                { name: 'Ремісничі інструменти (на вибір)', quantity: 1 },
                { name: 'Лопата', quantity: 1 },
                { name: 'Залізний казан', quantity: 1 },
                { name: 'Звичайний одяг', quantity: 1 },
                { name: 'зм', quantity: 10 }            ],
            specialAbilityName: 'Сільська Гостинність',
            description: 'Оскільки ти походиш із звичайних людей, з легкістю вливаєшся серед них. Ти можеш знайти місце, де можна сховатися, відпочити або одужати серед простолюдинів, якщо не показував себе небезпечним для них. Вони захистять тебе від закону або будь-кого іншого, хто шукає тебе, хоча не ризикуватимуть своїм життям заради тебе.'
        },
        {
            name: BackgroundCategory.GUILD_ARTISAN,
            skillProficiencies: [Skills.INSIGHT, Skills.PERSUASION],
            toolProficiencies: [ToolCategory.ARTISAN_TOOLS],
            languagesToChooseCount: 1,
            items: [
                { name: 'Ремісничі інструменти (на вибір)', quantity: 1 },
                { name: 'Лист-рекомендація від гільдії', quantity: 1 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'зм', quantity: 15 }            ],
            specialAbilityName: 'Членство в Гільдії',
            description: 'Як встановлений і шанований член гільдії, ти можеш розраховувати на певні привілеї, які надає членство. Твої побратими по гільдії забезпечать тебе житлом та їжею, якщо необхідно, і оплатять твоє поховання, якщо такий час настане. У деяких містах гільдхол пропонує центральне місце для зустрічей з іншими членами твоєї професії, що може бути хорошим місцем для зустрічі з потенційними покровителями, союзниками або найманцями.'
        },
        {
            name: BackgroundCategory.GUILD_MERCHANT,
            skillProficiencies: [Skills.INSIGHT, Skills.PERSUASION],
            toolProficiencies: [ToolCategory.NAVIGATORS_TOOLS],
            languagesToChooseCount: 1,
            items: [
                { name: 'Навігаційні інструменти', quantity: 1 },
                { name: 'Лист-рекомендація від гільдії', quantity: 1 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'Мул і віз (опціонально)', quantity: 1 },
                { name: 'зм', quantity: 15 }            ],
            specialAbilityName: 'Членство в Гільдії',
            description: 'Як встановлений і шанований член гільдії, ти можеш розраховувати на певні привілеї, які надає членство. Твої побратими по гільдії забезпечать тебе житлом та їжею, якщо необхідно, і оплатять твоє поховання, якщо такий час настане. У деяких містах гільдхол пропонує центральне місце для зустрічей з іншими членами твоєї професії, що може бути хорошим місцем для зустрічі з потенційними покровителями, союзниками або найманцями. Гільдії також часто володіють значною економічною та політичною владою.'
        },
        {
            name: BackgroundCategory.HERMIT,
            skillProficiencies: [Skills.MEDICINE, Skills.RELIGION],
            toolProficiencies: [ToolCategory.HERBALISM_KIT],
            languagesToChooseCount: 1,
            items: [
                { name: 'Футляр для свитків з нотатками', quantity: 1 },
                { name: 'Зимова ковдра', quantity: 1 },
                { name: 'Звичайний одяг', quantity: 1 },
                { name: 'Набір травника', quantity: 1 },
                { name: 'зм', quantity: 5 }
            ],
            specialAbilityName: 'Відкриття',
            description: 'Тиха усамітненість твого тривалого усамітнення дала тобі доступ до унікального і могутнього відкриття. Точна природа цього одкровення залежить від природи твого усамітнення. Це може бути велика істина про космос, божество, могутніх істот інших планів або сили природи. Це може бути місце, яке ніхто інший ніколи не бачив. Ти міг відкрити факт, який давно забутий, або викопати якийсь реліквар минулого, який може переписати історію.'
        },
        {
            name: BackgroundCategory.NOBLE,
            skillProficiencies: [Skills.HISTORY, Skills.PERSUASION],
            toolProficiencies: [ToolCategory.GAMING_SET],
            languagesToChooseCount: 1,
            items: [
                { name: 'Гарний одяг', quantity: 1 },
                { name: 'Перстень-печатка', quantity: 1 },
                { name: 'Свиток з родоводом', quantity: 1 },
                { name: 'зм', quantity: 25 }
            ],
            specialAbilityName: 'Позиція Привілею',
            description: 'Завдяки своєму знатному походженню люди схильні думати найкраще про тебе. Ти вітаєшся у вищому суспільстві, і люди припускають, що ти маєш право бути де завгодно. Простолюдини докладають всіх зусиль, щоб угодити тобі і уникнути твоєї невдоволеності, а інші люди з високим походженням розглядають тебе як члена тієї ж соціальної сфери. Ти можеш отримати аудієнцію з місцевим дворянином, якщо потрібно.'
        },
        {
            name: BackgroundCategory.KNIGHT,
            skillProficiencies: [Skills.HISTORY, Skills.PERSUASION],
            toolProficiencies: [ToolCategory.GAMING_SET],
            languagesToChooseCount: 1,
            items: [
                { name: 'Гарний одяг', quantity: 1 },
                { name: 'Перстень-печатка', quantity: 1 },
                { name: 'Свиток з родоводом', quantity: 1 },
                { name: 'Банер або герб', quantity: 1 },
                { name: 'зм', quantity: 25 }
            ],
            specialAbilityName: 'Почет',
            description: 'Як лицар, ти зберігаєш позицію привілею, але також маєш почет - слугу або оруженосця, який супроводжує тебе. Твій почет може бути простолюдином, який веде твоє життя в таборі і піклується про твою зброю та обладунки. Або ж це може бути оруженосець, який прагне стати лицарем. У будь-якому випадку, твій почет є лояльним помічником, який виконує прості завдання, які є частиною твоєї щоденної рутини.'
        },
        {
            name: BackgroundCategory.OUTLANDER,
            skillProficiencies: [Skills.ATHLETICS, Skills.SURVIVAL],
            toolProficiencies: [ToolCategory.MUSICAL_INSTRUMENT],
            languagesToChooseCount: 1,
            items: [
                { name: 'Посох', quantity: 1 },
                { name: 'Мисливська пастка', quantity: 1 },
                { name: 'Трофей від убитої тварини', quantity: 1 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'зм', quantity: 10 }            ],
            specialAbilityName: 'Мандрівник',
            description: 'У тебе чудова пам\'ять на карти та географію, і ти завжди можеш згадати загальну схему місцевості, поселень та інших особливостей навколо тебе. Крім того, ти можеш знайти їжу та прісну воду для себе та до п\'яти інших людей щодня, за умови, що земля пропонує ягоди, невелику дичину, воду тощо.'
        },
        {
            name: BackgroundCategory.SAGE,
            skillProficiencies: [Skills.ARCANA, Skills.HISTORY],
            languagesToChooseCount: 2,
            items: [
                { name: 'Пляшечка чорнила', quantity: 1 },
                { name: 'Перо', quantity: 1 },
                { name: 'Маленький ніж', quantity: 1 },
                { name: 'Лист від мертвого колеги з питанням, на яке ти ще не відповів', quantity: 1 },
                { name: 'Звичайний одяг', quantity: 1 },
                { name: 'зм', quantity: 10 }            ],
            specialAbilityName: 'Дослідник',
            description: 'Коли ти намагаєшся дізнатися або згадати частину знань, якщо ти не знаєш цієї інформації, ти часто знаєш, де і від кого ти можеш отримати її. Зазвичай ця інформація надходить з бібліотеки, скрипторіуму, університету або від іншого вченого або особи, яка володіє знаннями. Твій DM може вирішити, що знання, які ти шукаєш, приховані в майже недоступному місці, або що їх просто неможливо знайти.'
        },
        {
            name: BackgroundCategory.SAILOR,
            skillProficiencies: [Skills.ATHLETICS, Skills.PERCEPTION],
            toolProficiencies: [ToolCategory.NAVIGATORS_TOOLS, ToolCategory.VEHICLES_WATER],
            items: [
                { name: 'Шпилька для канатів (дубинка)', quantity: 1 },
                { name: 'Шовкова мотузка (50 футів)', quantity: 1 },
                { name: 'Талісман на удачу', quantity: 1 },
                { name: 'Звичайний одяг', quantity: 1 },
                { name: 'зм', quantity: 10 }            ],
            specialAbilityName: 'Прохід на Кораблі',
            description: 'Коли потрібно, ти можеш забезпечити безкоштовний прохід на вітрильному судні для себе та своїх супутників-пригодників. Ти можеш плисти на кораблі, на якому служив, або на іншому кораблі, з яким маєш хороші стосунки. Оскільки ти просиш про послугу, ти не можеш бути впевнений у розкладі або маршруті, який відповідатиме твоїм потребам. У обмін на твій безкоштовний прохід від тебе та твоїх супутників очікується, що ви допомагатимете екіпажу під час рейсу.'
        },
        {
            name: BackgroundCategory.PIRATE,
            skillProficiencies: [Skills.ATHLETICS, Skills.PERCEPTION],
            toolProficiencies: [ToolCategory.NAVIGATORS_TOOLS, ToolCategory.VEHICLES_WATER],
            items: [
                { name: 'Шпилька для канатів (дубинка)', quantity: 1 },
                { name: 'Шовкова мотузка (50 футів)', quantity: 1 },
                { name: 'Талісман на удачу', quantity: 1 },
                { name: 'Звичайний одяг', quantity: 1 },
                { name: 'зм', quantity: 10 }            ],
            specialAbilityName: 'Поганий Авторитет',
            description: 'Більшість людей боїться тебе завдяки твоїй репутації та виглядові. Коли ти перебуваєш у цивілізованому поселенні, ти можеш уникнути покарання за дрібні злочини, такі як відмова платити за їжу в таверні або вибиття дверей у місцевому магазині, оскільки більшість людей не буде повідомляти про твою діяльність владі.'
        },
        {
            name: BackgroundCategory.SOLDIER,
            skillProficiencies: [Skills.ATHLETICS, Skills.INTIMIDATION],
            toolProficiencies: [ToolCategory.GAMING_SET, ToolCategory.VEHICLES_LAND],
            items: [
                { name: 'Знак рангу', quantity: 1 },
                { name: 'Трофей від переможеного ворога', quantity: 1 },
                { name: 'Набір для гри в кості або гральні карти', quantity: 1 },
                { name: 'Звичайний одяг', quantity: 1 },
                { name: 'зм', quantity: 10 }            ],
            specialAbilityName: 'Військовий Ранг',
            description: 'У тебе є військовий ранг з часів твоєї служби у війську. Солдати, лояльні до твоєї колишньої армії, все ще визнають твій авторитет та вплив і поважатимуть тебе, якщо вони мають вищий ранг. Ти можеш використовувати свій вплив, щоб тимчасово командувати солдатами, лояльними до твоєї колишньої армії, або взяти на себе простий військовий транспорт та обладнання для тимчасового використання.'
        },
        {
            name: BackgroundCategory.URCHIN,
            skillProficiencies: [Skills.SLEIGHT_OF_HAND, Skills.STEALTH],
            toolProficiencies: [ToolCategory.DISGUISE_KIT, ToolCategory.THIEVES_TOOLS],
            items: [
                { name: 'Маленький ніж', quantity: 1 },
                { name: 'Карта міста, де виріс', quantity: 1 },
                { name: 'Домашня миша (буквально)', quantity: 1 },
                { name: 'Значок на пам\'ять від батьків', quantity: 1 },
                { name: 'Звичайний одяг', quantity: 1 },
                { name: 'зм', quantity: 10 }],
            specialAbilityName: 'Міські Таємниці',
            description: 'Ти знаєш секретні патерни та потік міст і можеш знайти проходи через міський лабіринт, які інші пропустили б. Коли ти не у бою, ти (і супутники, яких ти ведеш) можете подорожувати між будь-якими двома локаціями в місті вдвічі швидше, ніж твоя швидкість зазвичай дозволяє.'
        },
        {
            name: BackgroundCategory.ANTHROPOLOGIST,
            source: Source.XGTE,
            skillProficiencies: [Skills.INSIGHT, Skills.RELIGION],
            languagesToChooseCount: 2,
            items: [
                { name: 'Шкіряний журнал', quantity: 1 },
                { name: 'Пляшечка чорнила', quantity: 1 },
                { name: 'Перо', quantity: 1 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'Трінкет з далекої землі', quantity: 1 },
                { name: 'зм', quantity: 10 }
            ],
            specialAbilityName: 'Знання Культур',
            description: 'Ти можеш спілкуватися з гуманоїдами, навіть якщо не знаєш їхньої мови, використовуючи жести та базові звуки. Крім того, ти можеш визначити загальні соціальні звичаї та традиції культури після спостереження за ними протягом доби.'
        },
        {
            name: BackgroundCategory.ARCHAEOLOGIST,
            source: Source.XGTE,
            skillProficiencies: [Skills.HISTORY, Skills.SURVIVAL],
            toolProficiencies: [ToolCategory.CARTOGRAPHERS_TOOLS, ToolCategory.NAVIGATORS_TOOLS], // ВИПРАВЛЕНО: або Navigator's
            languagesToChooseCount: 1,
            items: [
                { name: 'Дерев\'яний футляр з картою руїн', quantity: 1 },
                { name: 'Ручний ліхтар', quantity: 1 },
                { name: 'Кірка', quantity: 1 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'Лопата', quantity: 1 },
                { name: 'Намет на дві особи', quantity: 1 },
                { name: 'Трінкет з розкопок', quantity: 1 },
                { name: 'зм', quantity: 25 }],
            specialAbilityName: 'Історичні Знання',
            description: 'Коли ти потрапляєш до руїн або підземель, ти можеш правильно визначити їхній приблизний вік та мету. Крім того, ти зазвичай можеш визначити монетарну вартість предметів мистецтва або інших археологічних знахідок.'
        },
        {
            name: BackgroundCategory.CITY_WATCH,
            source: Source.SCAG,
            skillProficiencies: [Skills.ATHLETICS, Skills.INSIGHT],
            languagesToChooseCount: 2,
            items: [
                { name: 'Уніформа міської варти', quantity: 1 },
                { name: 'Ріг', quantity: 1 },
                { name: 'Наручники', quantity: 1 },
                { name: 'зм', quantity: 10 }],
            specialAbilityName: 'Очі Спостерігача',
            description: 'Твій досвід у правоохоронних органах та контакти в міській варті роблять тебе далеко більш обізнаним про міські вулиці. Ти знаєш основні особи у місцевій владі і можеш легко отримати доступ до місць злочинів або закритих зон міста.'
        },
        {
            name: BackgroundCategory.CLAN_CRAFTER,
            source: Source.SCAG,
            skillProficiencies: [Skills.HISTORY, Skills.INSIGHT],
            toolProficiencies: [ToolCategory.ARTISAN_TOOLS],
            languagesToChooseCount: 1,
            items: [
                { name: 'Ремісничі інструменти (на вибір)', quantity: 1 },
                { name: 'Наконечник від зламаного кинджала клану', quantity: 1 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'зм', quantity: 5 },
                { name: 'Гема вартістю 10 зм', quantity: 1 }
            ],
            specialAbilityName: 'Повага Клану',
            description: 'Як член дварфського або гномського клану, ти маєш повагу серед тих, хто поважає традиції ремесла. Ти можеш знайти притулок серед членів свого клану або інших ремісників, які поважають твоє майстерність. Члени твого клану надають тобі житло та їжу, якщо необхідно.'
        },
        {
            name: BackgroundCategory.CLOISTERED_SCHOLAR,
            source: Source.SCAG,
            skillProficiencies: [Skills.HISTORY, Skills.RELIGION],
            languagesToChooseCount: 2,
            items: [
                { name: 'Звичайний одяг вченого', quantity: 1 },
                { name: 'Пляшечка чорнила', quantity: 1 },
                { name: 'Перо', quantity: 1 },
                { name: 'Маленький ніж', quantity: 1 },
                { name: 'Лист від колеги з питанням', quantity: 1 },
                { name: 'Звичайний одяг', quantity: 1 }, // ДОДАНО
                { name: 'зм', quantity: 10 }],
            specialAbilityName: 'Доступ до Бібліотеки',
            description: 'Хоча інші мусять шукати доступ до більшості бібліотек та скрипторіумів, ти маєш вільний доступ до установи, де ти навчався. У тебе є хороші стосунки з іншими вченими, і ти можеш отримати допомогу та доступ до закритих секцій бібліотек для проведення своїх досліджень.'
        },
        {
            name: BackgroundCategory.COURTIER,
            source: Source.SCAG,
            skillProficiencies: [Skills.INSIGHT, Skills.PERSUASION],
            languagesToChooseCount: 2,
            items: [
                { name: 'Гарний одяг', quantity: 1 },
                { name: 'зм', quantity: 5 }],
            specialAbilityName: 'Придворний Етикет',
            description: 'Твоє знання того, як працюють бюрократії та королівські двори, дозволяє тобі орієнтуватися в найскладніших соціальних ситуаціях. Ти знаєш, як отримати аудієнцію з місцевим дворянином, розумієш протокол та етикет. Твоє знання придворних інтриг дає тобі перевагу в політичних ситуаціях.'
        },
        {
            name: BackgroundCategory.FACTION_AGENT,
            source: Source.SCAG,
            skillProficiencies: [Skills.INSIGHT, Skills.PERSUASION],
            languagesToChooseCount: 2,
            items: [
                { name: 'Значок або емблема фракції', quantity: 1 },
                { name: 'Копія священного тексту або кодексу', quantity: 1 },
                { name: 'Звичайний одяг', quantity: 1 },
                { name: 'зм', quantity: 15 }],
            specialAbilityName: 'Безпечний Притулок',
            description: 'Як агент твоєї фракції, ти маєш доступ до таємної мережі підтримки та операторів. Ти знаєш набір секретних знаків та паролів, які можеш використовувати для ідентифікації таких оперативників. Ти можеш отримати житло та допомогу від членів твоєї фракції, які допоможуть тобі у виконанні твоєї місії.'
        },
        {
            name: BackgroundCategory.FAR_TRAVELER,
            source: Source.SCAG,
            skillProficiencies: [Skills.INSIGHT, Skills.PERCEPTION],
            toolProficiencies: [ToolCategory.MUSICAL_INSTRUMENT], // ВИПРАВЛЕНО: тільки один!
            languagesToChooseCount: 1,
            items: [
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'Музичний інструмент або ігровий набір', quantity: 1 },
                { name: 'Погано намальована карта рідної землі', quantity: 1 },
                { name: 'Маленький шматок ювелірних виробів (10 зм)', quantity: 1 },
                { name: 'зм', quantity: 5 }],
            specialAbilityName: 'Екзотична Привабливість',
            description: 'Твоя акцентна мова, манери та зовнішній вигляд виразно ідентифікують тебе як чужинця. Цікаві до чужих земель люди зацікавлені вислухати історії твоєї батьківщини. Ти можеш використовувати цю увагу для отримання доступу до людей та місць, які інакше були б закриті для тебе. Твоя екзотична природа робить тебе запам\'ятовуваним.'
        },
        {
            name: BackgroundCategory.INHERITOR,
            source: Source.SCAG,
            skillProficiencies: [Skills.SURVIVAL, Skills.RELIGION],
            toolProficiencies: [ToolCategory.GAMING_SET], // ВИПРАВЛЕНО: тільки один!
            languagesToChooseCount: 1,
            items: [
                { name: 'Спадщина (на вибір)', quantity: 1 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'Ігровий набір або музичний інструмент', quantity: 1 },
                { name: 'зм', quantity: 15 }],
            specialAbilityName: 'Спадщина',
            description: 'Ти успадкував важливий предмет, документ або секрет від свого минулого. Це може бути артефакт, карта, книга або щось інше, що має особливе значення для тебе та можливо для інших. Твоя спадщина може привернути увагу тих, хто шукає її, або відкрити двері, які інакше були б закриті.'
        },
        {
            name: BackgroundCategory.INVESTIGATOR,
            source: Source.SCAG,
            skillProficiencies: [Skills.INSIGHT, Skills.INVESTIGATION],
            languagesToChooseCount: 2,
            items: [
                { name: 'Уніформа', quantity: 1 },
                { name: 'Ріг', quantity: 1 },
                { name: 'Наручники', quantity: 1 },
                { name: 'зм', quantity: 10 }],
            specialAbilityName: 'Очі Спостерігача',
            description: 'Твій досвід у правоохоронних органах та контакти в міській варті роблять тебе далеко більш обізнаним про міські вулиці. Ти знаєш основні особи у місцевій владі і можеш легко отримати доступ до місць злочинів або закритих зон міста. Твої розслідувальні навички допомагають тобі швидко знаходити підказки та свідків.'
        },
        {
            name: BackgroundCategory.KNIGHT_OF_THE_ORDER,
            source: Source.SCAG,
            skillProficiencies: [Skills.ATHLETICS, Skills.PERSUASION],
            toolProficiencies: [ToolCategory.GAMING_SET], // ВИПРАВЛЕНО: тільки один!
            languagesToChooseCount: 1,
            items: [
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'Перстень-печатка ордену', quantity: 1 },
                { name: 'Банер або інший символ ордену', quantity: 1 },
                { name: 'зм', quantity: 10 }],
            specialAbilityName: 'Лицарський Орден',
            description: 'Ти отримуєш житло та підтримку від людей, які лояльні до твого ордену. Це може включати лицарів, послідовників, священиків або навіть простолюдинів, які підтримують твою справу. Ти також можеш розраховувати на допомогу від твого ордену в часи потреби, і твій статус члена ордену відкриває тобі двері в певних колах.'
        },
        {
            name: BackgroundCategory.MERCENARY_VETERAN,
            source: Source.SCAG,
            skillProficiencies: [Skills.ATHLETICS, Skills.PERSUASION],
            toolProficiencies: [ToolCategory.GAMING_SET, ToolCategory.VEHICLES_LAND],
            items: [
                { name: 'Уніформа найманця', quantity: 1 },
                { name: 'Інсигнія компанії', quantity: 1 },
                { name: 'Набір для гри в кості або гральні карти', quantity: 1 },
                { name: 'зм', quantity: 10 }
            ],
            specialAbilityName: 'Найманська Репутація',
            description: 'Ти маєш контакти в найманській спільноті, і знаєш, де знайти роботу. Ти також можеш отримати інформацію про роботодавців, союзників та ворогів через мережу найманців, з якими працював. Твоя репутація як досвідченого найманця передує тобі.'
        },
        {
            name: BackgroundCategory.URBAN_BOUNTY_HUNTER,
            source: Source.SCAG,
            skillProficiencies: [Skills.DECEPTION, Skills.INSIGHT],
            toolProficiencies: [ToolCategory.GAMING_SET, ToolCategory.MUSICAL_INSTRUMENT, ToolCategory.THIEVES_TOOLS], // ВИПРАВЛЕНО: закрито масив, має вибір 2 з цих трьох
            items: [
                { name: 'Відповідний одяг', quantity: 1 },
                { name: 'зм', quantity: 20 }
            ],
            specialAbilityName: 'Вушка на Землі',
            description: 'Ти звик до спілкування з інформаторами та контактами в кримінальному світі. Ти знаєш, як отримати інформацію про місцеперебування людей, чутки та секрети міста через свої контакти. Твоє знання міських вулиць та підземного світу дає тобі перевагу при пошуку цілей.'
        },
        {
            name: BackgroundCategory.UTHGARDT_TRIBE_MEMBER,
            source: Source.SCAG,
            skillProficiencies: [Skills.ATHLETICS, Skills.SURVIVAL],
            toolProficiencies: [ToolCategory.ARTISAN_TOOLS, ToolCategory.MUSICAL_INSTRUMENT], // ВИПРАВЛЕНО: має вибір одного
            languagesToChooseCount: 1,
            items: [
                { name: 'Мисливська пастка', quantity: 1 },
                { name: 'Тотем або татуювання племені', quantity: 1 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'зм', quantity: 10 }
            ],
            specialAbilityName: 'Спадок Племені',
            description: 'Члени твого племені Утгардта надають тобі притулок та допомогу, навіть якщо ризикують. Ти також маєш знання про території племен, їхні традиції та можеш орієнтуватися в їхній ієрархії. Інші племена Утгардта можуть визнати тебе як брата або сестру, залежно від стосунків між племенами.'
        },
        {
            name: BackgroundCategory.WATERDHAVIAN_NOBLE,
            source: Source.SCAG,
            skillProficiencies: [Skills.HISTORY, Skills.PERSUASION],
            toolProficiencies: [ToolCategory.GAMING_SET, ToolCategory.MUSICAL_INSTRUMENT], // ВИПРАВЛЕНО: має вибір одного
            languagesToChooseCount: 1,
            items: [
                { name: 'Гарний одяг', quantity: 1 },
                { name: 'Перстень-печатка', quantity: 1 },
                { name: 'Свиток з родоводом', quantity: 1 },
                { name: 'зм', quantity: 20 }
            ],
            specialAbilityName: 'Знайомство в Глибоких Водах',
            description: 'Ти знаєш багато впливових людей у Глибоких Водах і можеш отримати доступ до вищого суспільства міста. Люди схильні думати найкраще про тебе завдяки твоєму знатному походженню. Твої зв\'язки з могутніми родинами Глибоких Вод відкривають тобі багато дверей.'
        },
        {
            name: BackgroundCategory.FISHER,
            source: Source.SCAG,
            skillProficiencies: [Skills.HISTORY, Skills.SURVIVAL],
            toolProficiencies: [ToolCategory.FISHING_TACKLE], // ДОДАНО!
            items: [
                { name: 'Риболовна снасть', quantity: 1 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'зм', quantity: 10 }
            ],
            specialAbilityName: 'Збір Моря',
            description: 'Ти маєш глибоке розуміння рибальства, морських традицій та знаєш, де знайти найкращі місця для лову. Рибалки та мешканці узбережжя сприймають тебе як одного з них і охоче діляться інформацією про море, погоду та морські небезпеки.'
        },
        {
            name: BackgroundCategory.SHIPWRIGHT,
            source: Source.SCAG,
            skillProficiencies: [Skills.HISTORY, Skills.PERCEPTION],
            toolProficiencies: [ToolCategory.ARTISAN_TOOLS, ToolCategory.VEHICLES_WATER],
            items: [
                { name: 'Теслярські інструменти', quantity: 1 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'зм', quantity: 10 }
            ],
            specialAbilityName: 'Я Знаю Корабель',
            description: 'Коли ти на борту корабля, ти можеш швидко оцінити його стан, якість та можливі слабкості. Ти також маєш контакти серед суднобудівників та можеш отримати доступ до верфей для ремонту або будівництва суден.'
        },
        {
            name: BackgroundCategory.SMUGGLER,
            source: Source.SCAG,
            skillProficiencies: [Skills.ATHLETICS, Skills.DECEPTION],
            toolProficiencies: [ToolCategory.VEHICLES_WATER],
            items: [
                { name: 'Дубинка', quantity: 1 },
                { name: 'Звичайний одяг', quantity: 1 },
                { name: 'зм', quantity: 15 }
            ],
            specialAbilityName: 'У Тобі на Дні',
            description: 'У тебе є знання про секретні маршрути, приховані сховища та способи уникнути митників. Коли ти на знайомій території, ти можеш знайти шляхи для контрабанди товарів або людей, а також знаєш, де приховати речі від чужих очей.'
        },
        {
            name: BackgroundCategory.MARINE,
            source: Source.SCAG,
            skillProficiencies: [Skills.ATHLETICS, Skills.SURVIVAL],
            toolProficiencies: [ToolCategory.VEHICLES_LAND, ToolCategory.VEHICLES_WATER],
            items: [
                { name: 'Кинджал', quantity: 1 },
                { name: 'Знак рангу', quantity: 1 },
                { name: 'Набір кісток або гральні карти', quantity: 1 },
                { name: 'Звичайний одяг', quantity: 1 },
                { name: 'зм', quantity: 10 }
            ],
            specialAbilityName: 'Стійкість',
            description: 'Твоє військове тренування на морі дало тобі здатність витримувати важкі умови. Ти можеш діяти ефективно навіть у суворих умовах і знаєш, як виживати на борту корабля під час тривалих походів та морських битв.'
        },
        {
            name: BackgroundCategory.AZORIUS_FUNCTIONARY,
            source: Source.GGTR,
            skillProficiencies: [Skills.INSIGHT, Skills.INTIMIDATION],
            languagesToChooseCount: 2,
            items: [
                { name: 'Інсигнія Азоріусу', quantity: 1 },
                { name: 'Сувій з текстом закону', quantity: 1 },
                { name: 'Пляшечка синього чорнила', quantity: 1 },
                { name: 'Перо', quantity: 1 },
                { name: 'Гарний одяг', quantity: 1 },
                { name: 'зм', quantity: 10 }
            ],
            specialAbilityName: 'Юридичний Авторитет',
            description: 'Як член Сенату Азоріус, ти маєш владу застосовувати закони та можеш викликати варту для допомоги в законних справах. Люди схильні підкорятися твоєму авторитету, коли ти посилаєшся на закон. Твоє знання юридичних процедур дає тобі перевагу в судових справах.'
        },
        {
            name: BackgroundCategory.BOROS_LEGIONNAIRE,
            source: Source.GGTR,
            skillProficiencies: [Skills.ATHLETICS, Skills.INTIMIDATION],
            toolProficiencies: [ToolCategory.GAMING_SET, ToolCategory.VEHICLES_LAND],
            languagesToChooseCount: 1,
            items: [
                { name: 'Інсигнія Боросу', quantity: 1 },
                { name: 'Трофей від переможеного ворога', quantity: 1 },
                { name: 'Набір для гри', quantity: 1 },
                { name: 'Звичайний одяг', quantity: 1 },
                { name: 'зм', quantity: 10 }
            ],
            specialAbilityName: 'Легіонерська Підтримка',
            description: 'Ти можеш розраховувати на допомогу інших членів Легіону Борос. Вони надають тобі їжу, житло та підтримку в бою, якщо це не суперечить їхньому обов\'язку. Твоя відданість справедливості та порядку визнається іншими легіонерами.'
        },
        {
            name: BackgroundCategory.DIMIR_OPERATIVE,
            source: Source.GGTR,
            skillProficiencies: [Skills.DECEPTION, Skills.STEALTH],
            toolProficiencies: [ToolCategory.DISGUISE_KIT],
            languagesToChooseCount: 1,
            items: [
                { name: 'Три комплекти одягу для різних особистостей', quantity: 3 },
                { name: 'Набір для маскування', quantity: 1 },
                { name: 'Інсигнія Діміру', quantity: 1 },
                { name: 'зм', quantity: 10 }
            ],
            specialAbilityName: 'Таємні Контакти',
            description: 'У тебе є доступ до мережі шпигунів та інформаторів Дімір. Ти можеш передавати та отримувати секретні повідомлення через цю мережу і отримувати розвідувальну інформацію. Твоя здатність зникати в тіні та оперувати непомітно високо цінується.'
        },
        {
            name: BackgroundCategory.GOLGARI_AGENT,
            source: Source.GGTR,
            skillProficiencies: [Skills.NATURE, Skills.SURVIVAL],
            toolProficiencies: [ToolCategory.POISONERS_KIT],
            languagesToChooseCount: 1,
            items: [
                { name: 'Інсигнія Голгарі', quantity: 1 },
                { name: 'Набір труїв', quantity: 1 },
                { name: 'Домашній крихітний жучок', quantity: 1 },
                { name: 'Звичайний одяг', quantity: 1 },
                { name: 'зм', quantity: 10 }
            ],
            specialAbilityName: 'Мережа Підземелля',
            description: 'Ти знаєш шляхи через підземні тунелі Голгарі і можеш орієнтуватися в них. Члени Рою Голгарі надають тобі притулок та базову підтримку. Твоє розуміння циклів життя та смерті дає тобі унікальну перспективу.'
        },
        {
            name: BackgroundCategory.GRUUL_ANARCH,
            source: Source.GGTR,
            skillProficiencies: [Skills.ANIMAL_HANDLING, Skills.ATHLETICS],
            toolProficiencies: [ToolCategory.HERBALISM_KIT],
            languagesToChooseCount: 1,
            items: [
                { name: 'Інсигнія Груулу', quantity: 1 },
                { name: 'Набір травника', quantity: 1 },
                { name: 'Мисливська пастка', quantity: 1 },
                { name: 'Трофей від тварини', quantity: 1 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'зм', quantity: 10 }
            ],
            specialAbilityName: 'Дика Свобода',
            description: 'Ти можеш знайти прихисток серед кланів Груул у диких зонах міста. Вони визнають тебе як одного з них і не перешкоджатимуть твоєму проходу через їхню територію. Твоє презирство до цивілізації та законів резонує з філософією кланів.'
        },
        {
            name: BackgroundCategory.IZZET_ENGINEER,
            source: Source.GGTR,
            skillProficiencies: [Skills.ARCANA, Skills.INVESTIGATION],
            toolProficiencies: [ToolCategory.ARTISAN_TOOLS],
            languagesToChooseCount: 1,
            items: [
                { name: 'Інсигнія Іззету', quantity: 1 },
                { name: 'Один ремісничий інструмент', quantity: 1 },
                { name: 'Обгоріла книга записів', quantity: 1 },
                { name: 'Звичайний одяг', quantity: 1 },
                { name: 'зм', quantity: 10 }
            ],
            specialAbilityName: 'Дивовижні Винаходи',
            description: 'Ти маєш доступ до лабораторій Іззет та можеш використовувати їхнє обладнання для своїх експериментів. Інші члени гільдії можуть надати тобі технічну допомогу або запчастини. Твоя схильність до експериментів та інновацій високо цінується.'
        },
        {
            name: BackgroundCategory.ORZHOV_REPRESENTATIVE,
            source: Source.GGTR,
            skillProficiencies: [Skills.INTIMIDATION, Skills.RELIGION],
            toolProficiencies: [ToolCategory.JEWELERS_TOOLS], // ДОДАНО!
            languagesToChooseCount: 1,
            items: [
                { name: 'Інсигнія Оржова', quantity: 1 },
                { name: 'Ваги ювеліра', quantity: 1 },
                { name: 'Гарний одяг', quantity: 1 },
                { name: 'зм', quantity: 10 }
            ],
            specialAbilityName: 'Зобов\'язання Оржова',
            description: 'Ти можеш використовувати свої зв\'язки з Синдикатом Оржов для отримання позик, юридичної підтримки або тиску на боржників. Твоя влада ґрунтується на боргових зобов\'язаннях та релігійному авторитеті. Багато людей боргують Синдикату, і ти можеш використовувати це.'
        },
        {
            name: BackgroundCategory.RAKDOS_CULTIST,
            source: Source.GGTR,
            skillProficiencies: [Skills.ACROBATICS, Skills.PERFORMANCE],
            toolProficiencies: [ToolCategory.MUSICAL_INSTRUMENT],
            languagesToChooseCount: 1,
            items: [
                { name: 'Інсигнія Ракдоса', quantity: 1 },
                { name: 'Музичний інструмент', quantity: 1 },
                { name: 'Костюм', quantity: 1 },
                { name: 'зм', quantity: 10 }
            ],
            specialAbilityName: 'Культ Розваг',
            description: 'Ти можеш виступати в культових закладах Ракдос, отримуючи їжу та житло. Інші члени культу визнають тебе і можуть надати підтримку, якщо це обіцяє бути розважальним. Твоя любов до хаосу та видовищ робить тебе популярним серед культистів.'
        },
        {
            name: BackgroundCategory.SELESNYA_INITIATE,
            source: Source.GGTR,
            skillProficiencies: [Skills.NATURE, Skills.PERSUASION],
            toolProficiencies: [ToolCategory.HERBALISM_KIT], // ВИПРАВЛЕНО: було ARTISAN_TOOLS
            items: [
                { name: 'Інсигнія Селесніі', quantity: 1 },
                { name: 'Набір травника', quantity: 1 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'зм', quantity: 5 }
            ],
            specialAbilityName: 'Конклав Єдності',
            description: 'Ти маєш доступ до спільнот Конклаву Селесніі, де можеш отримати їжу, житло та підтримку від членів громади. Вони розглядають тебе як частину великої сім\'ї. Твоя віра в єдність та гармонію резонує з філософією Конклаву.'
        },
        {
            name: BackgroundCategory.SIMIC_SCIENTIST,
            source: Source.GGTR,
            skillProficiencies: [Skills.ARCANA, Skills.MEDICINE],
            toolProficiencies: [ToolCategory.HERBALISM_KIT],
            languagesToChooseCount: 2,
            items: [
                { name: 'Інсигнія Сіміку', quantity: 1 },
                { name: 'Набір травника', quantity: 1 },
                { name: 'Книга нотаток', quantity: 1 },
                { name: 'Пляшечка чорнила', quantity: 1 },
                { name: 'Перо', quantity: 1 },
                { name: 'Звичайний одяг', quantity: 1 },
                { name: 'зм', quantity: 10 }
            ],
            specialAbilityName: 'Біомантія',
            description: 'Ти маєш доступ до лабораторій Сіміка та можеш проводити експерименти з біологічною адаптацією. Інші вчені Сіміка можуть надати тобі зразки, інформацію або обладнання. Твоє розуміння еволюції та адаптації дає тобі унікальні можливості.'
        },
        {
            name: BackgroundCategory.GRINNER,
            source: Source.EGTW,
            skillProficiencies: [Skills.DECEPTION, Skills.PERFORMANCE],
            toolProficiencies: [ToolCategory.DISGUISE_KIT, ToolCategory.MUSICAL_INSTRUMENT], // ВИПРАВЛЕНО
            items: [
                { name: 'Набір для маскування', quantity: 1 },
                { name: 'Музичний інструмент', quantity: 1 },
                { name: 'Сигнет з емблемою Golden Grin', quantity: 1 },
                { name: 'Звичайний одяг', quantity: 1 },
                { name: 'зм', quantity: 15 }
            ],
            specialAbilityName: 'Золота Усмішка',
            description: 'Як член Golden Grin, ти маєш доступ до мережі артистів-шпигунів та контактів. Ти можеш передавати секретні повідомлення через виступи та отримувати розвідку від інших Гріннерів. Твоя здатність поєднувати розваги та шпигунство високо цінується.'
        },
        {
            name: BackgroundCategory.VOLSTRUCKER_AGENT,
            source: Source.EGTW,
            skillProficiencies: [Skills.DECEPTION, Skills.STEALTH],
            toolProficiencies: [ToolCategory.POISONERS_KIT],
            languagesToChooseCount: 1,
            items: [
                { name: 'Звичайний одяг', quantity: 1 },
                { name: 'Чорний плащ з капюшоном', quantity: 1 },
                { name: 'Набір для отруєння', quantity: 1 },
                { name: 'зм', quantity: 10 }
            ],
            specialAbilityName: 'Тіньовий Агент',
            description: 'Як агент Фольструкерів, ти навчений методам убивства та шпигунства. Ти маєш контакти в Імперії Дуендальяна та можеш отримати доступ до ресурсів для виконання місій. Твоє тренування робить тебе ідеальним інструментом для темних справ.'
        },
        {
            name: BackgroundCategory.ATHLETE,
            source: Source.MOOT,
            skillProficiencies: [Skills.ACROBATICS, Skills.ATHLETICS],
            toolProficiencies: [ToolCategory.VEHICLES_LAND],
            languagesToChooseCount: 1,
            items: [
                { name: 'Бронзовий диск або шкіряний м’яч', quantity: 1 },
                { name: 'Подарунок від шанувальника', quantity: 1 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'зм', quantity: 10 }
            ],
            specialAbilityName: 'Слава Чемпіона',
            description: 'Завдяки своїм спортивним досягненням ти відомий у своєму регіоні. Люди визнають тебе і часто хочуть почути історії про твої перемоги. Ти можеш використовувати свою славу для отримання аудієнції або привілеїв у місцях, де спорт цінується.'
        },
        {
            name: BackgroundCategory.LOREHOLD_STUDENT,
            source: Source.SACOC,
            skillProficiencies: [Skills.HISTORY, Skills.RELIGION],
            toolProficiencies: [ToolCategory.ARTISAN_TOOLS],
            languagesToChooseCount: 1,
            items: [
                { name: 'Пляшечка чорнила', quantity: 1 },
                { name: 'Перо', quantity: 1 },
                { name: 'Молоток', quantity: 1 },
                { name: 'Книга історії', quantity: 1 },
                { name: 'Шкільна форма', quantity: 1 },
                { name: 'зм', quantity: 15 }
            ],
            specialAbilityName: 'Історичні Знання',
            description: 'Як студент Лорхолда, ти маєш доступ до архівів коледжу та можеш досліджувати історичні записи. Інші історики та археологи визнають твою освіту. Твоє розуміння минулого дає тобі унікальний погляд на сучасні події.'
        },
        {
            name: BackgroundCategory.PRISMARI_STUDENT,
            source: Source.SACOC,
            skillProficiencies: [Skills.ACROBATICS, Skills.PERFORMANCE],
            toolProficiencies: [ToolCategory.ARTISAN_TOOLS, ToolCategory.MUSICAL_INSTRUMENT], // ВИПРАВЛЕНО
            languagesToChooseCount: 1,
            items: [
                { name: 'Пляшечка чорнила', quantity: 1 },
                { name: 'Перо', quantity: 1 },
                { name: 'Один артефакт мистецтва', quantity: 1 },
                { name: 'Шкільна форма', quantity: 1 },
                { name: 'зм', quantity: 10 }
            ],
            specialAbilityName: 'Артистична Експресія',
            description: 'Твоя освіта в Прізмарі дала тобі розуміння мистецтва та магії. Ти можеш виступати в коледжі та маєш доступ до студій та творчих просторів. Твоя здатність поєднувати магію та мистецтво створює вражаючі результати.'
        },
        {
            name: BackgroundCategory.QUANDRIX_STUDENT,
            source: Source.SACOC,
            skillProficiencies: [Skills.ARCANA, Skills.NATURE],
            toolProficiencies: [ToolCategory.ARTISAN_TOOLS],
            languagesToChooseCount: 1,
            items: [
                { name: 'Пляшечка чорнила', quantity: 1 },
                { name: 'Перо', quantity: 1 },
                { name: 'Рахівниця', quantity: 1 },
                { name: 'Книга аркан теорії', quantity: 1 },
                { name: 'Шкільна форма', quantity: 1 },
                { name: 'зм', quantity: 15 }
            ],
            specialAbilityName: 'Математична Точність',
            description: 'Твоє навчання в Квандриксі дало тобі глибоке розуміння математики та природних законів. Ти маєш доступ до наукових лабораторій та бібліотек коледжу. Твоє розуміння патернів та чисел дає тобі перевагу в аналітичних задачах.'
        },
        {
            name: BackgroundCategory.SILVERQUILL_STUDENT,
            source: Source.SACOC,
            skillProficiencies: [Skills.INTIMIDATION, Skills.PERSUASION],
            languagesToChooseCount: 2,
            items: [
                { name: 'Пляшечка чорнила', quantity: 1 },
                { name: 'Перо', quantity: 1 },
                { name: 'Книга поезії', quantity: 1 },
                { name: 'Том історії', quantity: 1 },
                { name: 'Шкільна форма', quantity: 1 },
                { name: 'зм', quantity: 15 }
            ],
            specialAbilityName: 'Риторична Майстерність',
            description: 'Як студент Срібного Пера, ти навчений мистецтву переконання та красномовства. Твої слова мають вагу, і ти маєш доступ до літературних ресурсів коледжу. Твоя здатність формулювати аргументи та впливати на інших високо цінується.'
        },
        {
            name: BackgroundCategory.WITHERBLOOM_STUDENT,
            source: Source.SACOC,
            skillProficiencies: [Skills.NATURE, Skills.SURVIVAL],
            toolProficiencies: [ToolCategory.HERBALISM_KIT],
            languagesToChooseCount: 1,
            items: [
                { name: 'Пляшечка чорнила', quantity: 1 },
                { name: 'Перо', quantity: 1 },
                { name: 'Набір травника', quantity: 1 },
                { name: 'Залізний казан', quantity: 1 },
                { name: 'Шкільна форма', quantity: 1 },
                { name: 'зм', quantity: 15 }
            ],
            specialAbilityName: 'Знання Життя та Смерті',
            description: 'Твоє навчання в Візерблум дало тобі розуміння життєвої сили та некромантії. Ти маєш доступ до ботанічних садів, алхімічних лабораторій та гербаріїв. Твоє розуміння балансу між життям та смертю дає тобі унікальні можливості.'
        },
        {
            name: BackgroundCategory.ASTRAL_DRIFTER,
            source: Source.SPELLJAMMER, // Потрібно додати правильний source
            skillProficiencies: [Skills.INSIGHT, Skills.RELIGION],
            languagesToChooseCount: 2,
            items: [
                { name: 'Щоденник', quantity: 1 },
                { name: 'Пляшечка чорнила', quantity: 1 },
                { name: 'Перо', quantity: 1 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'зм', quantity: 10 }
            ],
            specialAbilityName: 'Божественне Прозріння',
            description: 'Твої подорожі астральним планом дали тобі унікальний погляд на мультивсесвіт. Час від часу ти отримуєш прозріння або видіння, які можуть вказати шлях або попередити про небезпеку. Твій досвід у астральній площині змінив твоє сприйняття реальності.'
        },
        {
            name: BackgroundCategory.FACELESS,
            source: Source.BGDIA, // Baldur's Gate: Descent into Avernus
            skillProficiencies: [Skills.DECEPTION, Skills.INTIMIDATION],
            toolProficiencies: [ToolCategory.DISGUISE_KIT],
            languagesToChooseCount: 1,
            items: [
                { name: 'Набір для маскування', quantity: 1 },
                { name: 'Костюм або друга персона', quantity: 1 },
                { name: 'Звичайний одяг', quantity: 1 },
                { name: 'зм', quantity: 10 }
            ],
            specialAbilityName: 'Подвійна Особистість',
            description: 'Ти створив персону, яка приховує твою справжню ідентичність. У тебе є костюм та маскування, які дозволяють тобі приховувати свою справжню особу. Люди не можуть з\'єднати твої дві ідентичності, якщо ти не розкриваєш себе. Ця подвійність дає тобі свободу діяти.'
        },
        {
            name: BackgroundCategory.FAILED_MERCHANT,
            source: Source.AI, // Acquisitions Incorporated
            skillProficiencies: [Skills.INVESTIGATION, Skills.PERSUASION],
            toolProficiencies: [ToolCategory.ARTISAN_TOOLS],
            languagesToChooseCount: 1,
            items: [
                { name: 'Ремісничі інструменти', quantity: 1 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'зм', quantity: 10 }
            ],
            specialAbilityName: 'Підприємницька Інтуїція',
            description: 'Попри свої невдачі, ти навчився розпізнавати хороші ділові можливості та підозрілі угоди. Ти можеш оцінити приблизну вартість товарів та знаєш основи комерції. Твій досвід невдач навчив тебе уникати типових пасток бізнесу.'
        },
        {
            name: BackgroundCategory.FEYLOST,
            source: Source.WBTW, // Wild Beyond the Witchlight
            skillProficiencies: [Skills.DECEPTION, Skills.SURVIVAL],
            toolProficiencies: [ToolCategory.MUSICAL_INSTRUMENT],
            languagesToChooseCount: 1,
            items: [
                { name: 'Музичний інструмент', quantity: 1 },
                { name: 'Три трінкети', quantity: 3 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'зм', quantity: 8 }
            ],
            specialAbilityName: 'Вилучена Пам\'ять',
            description: 'Твій час у Фейвайлді залишив тебе зі зв\'язком з цим планом. Фейські істоти визнають, що ти був у їхньому світі, і можуть ставитися до тебе по-різному - деякі з цікавістю, інші з підозрою. Твій досвід у Фейвайлді змінив тебе незворотно.'
        },
        {
            name: BackgroundCategory.GAMBLER,
            source: Source.AI,
            skillProficiencies: [Skills.DECEPTION, Skills.INSIGHT],
            toolProficiencies: [ToolCategory.GAMING_SET],
            items: [
                { name: 'Набір для азартних ігор', quantity: 1 },
                { name: 'Талісман на удачу', quantity: 1 },
                { name: 'Гарний одяг', quantity: 1 },
                { name: 'зм', quantity: 15 }
            ],
            specialAbilityName: 'Ніколи не Програєш',
            description: 'У тебе є талант читати людей та розуміти шанси. Ти знаєш, як знайти азартні ігри в будь-якому місті та маєш контакти серед інших гравців. Коли ти програєш, ти зазвичай знаєш, як вибратися з неприємностей, використовуючи свою кмітливість.'
        },
        {
            name: BackgroundCategory.HAUNTED_ONE,
            source: Source.COS, // Curse of Strahd
            skillProficiencies: [Skills.ARCANA, Skills.INVESTIGATION],
            languagesToChooseCount: 2,
            items: [
                { name: 'Сундук', quantity: 1 },
                { name: 'Лом', quantity: 1 },
                { name: 'Молоток', quantity: 1 },
                { name: 'Дерев’яні кілки', quantity: 3 },
                { name: 'Святе символічне зображення', quantity: 1 },
                { name: 'Фляга святої води', quantity: 1 },
                { name: 'Набір кайданів', quantity: 1 },
                { name: 'Сталева дзеркальце', quantity: 1 },
                { name: 'Фляга олії', quantity: 1 },
                { name: 'Набір для розпалювання вогню', quantity: 1 },
                { name: 'Факели', quantity: 3 },
                { name: 'Трінкет особливого значення', quantity: 1 },
                { name: 'Звичайний одяг', quantity: 1 },
                { name: 'sp', quantity: 1 }
            ],
            specialAbilityName: 'Серце Темряви',
            description: 'Ті, хто дивляться в твої очі, можуть бачити, що ти зіткнувся з жахами поза розумінням більшості. Хоча простолюдини можуть тебе боятися, ті, хто борються з надприродним злом, розпізнають у тобі споріднену душу. Твій досвід залишив незмивні шрами на твоїй психіці.'
        },
        {
            name: BackgroundCategory.PLAINTIFF,
            source: Source.AI,
            skillProficiencies: [Skills.MEDICINE, Skills.PERSUASION],
            toolProficiencies: [], // Немає tool proficiencies
            languagesToChooseCount: 1,
            items: [
                { name: 'Гарний одяг', quantity: 1 },
                { name: 'зм', quantity: 20 }
            ],
            specialAbilityName: 'Право на Компенсацію',
            description: 'Ти маєш законну справу проти когось або чогось. Ти знаєш основи права та можеш орієнтуватися в юридичних системах. Адвокати та судді схильні вислухати твою справу. Твоя наполегливість у пошуках справедливості визначає твої дії.'
        },
        {
            name: BackgroundCategory.RIVAL_INTERN,
            source: Source.AI,
            skillProficiencies: [Skills.HISTORY, Skills.INVESTIGATION],
            toolProficiencies: [ToolCategory.ARTISAN_TOOLS],
            languagesToChooseCount: 1,
            items: [
                { name: 'Набір інструментів', quantity: 1 },
                { name: 'Гарний одяг', quantity: 1 },
                { name: 'зм', quantity: 10 }
            ],
            specialAbilityName: 'Корпоративна Хитрість',
            description: 'Твій досвід роботи в корпорації дав тобі розуміння бюрократії та внутрішньої політики організацій. Ти знаєш, як орієнтуватися в корпоративних структурах та отримувати інформацію через офіційні та неофіційні канали.'
        },
        {
            name: BackgroundCategory.WILDSPACER,
            source: Source.SPELLJAMMER, // Spelljammer
            skillProficiencies: [Skills.ATHLETICS, Skills.SURVIVAL],
            toolProficiencies: [ToolCategory.NAVIGATORS_TOOLS, ToolCategory.VEHICLES_WATER], // ВИПРАВЛЕНО
            items: [
                { name: 'Шпилька для канатів (дубинка)', quantity: 1 },
                { name: 'Навігаційні інструменти', quantity: 1 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'зм', quantity: 10 }
            ],
            specialAbilityName: 'Космічний Мандрівник',
            description: 'Твої подорожі дикоюпростором дали тобі знання про різні світи та космічні явища. Інші космічні мандрівники визнають тебе як досвідченого подорожнього та можуть поділитися інформацією. Твій досвід у космосі змінив твоє розуміння реальності.'
        },
        {
            name: BackgroundCategory.WITCHLIGHT_HAND,
            source: Source.WBTW,
            skillProficiencies: [Skills.PERFORMANCE, Skills.SLEIGHT_OF_HAND],
            toolProficiencies: [ToolCategory.DISGUISE_KIT, ToolCategory.MUSICAL_INSTRUMENT], // ВИПРАВЛЕНО
            languagesToChooseCount: 1,
            items: [
                { name: 'Набір для маскування або музичний інструмент', quantity: 1 },
                { name: 'Фестивальна сувенірна маска', quantity: 1 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'зм', quantity: 8 }
            ],
            specialAbilityName: 'Відчуття Карнавалу',
            description: 'Твій час у карнавалі Відьомського Світла дав тобі особливе відчуття магії та дива. Ти можеш розпізнати ілюзії та фейську магію легше за інших, і фейські істоти можуть реагувати на тебе інакше через твій зв\'язок з карнавалом.'
        },
        {
            name: BackgroundCategory.KNIGHT_OF_SOLAMNIA,
            source: Source.DRAGONLANCE,
            skillProficiencies: [Skills.ATHLETICS, Skills.SURVIVAL],
            toolProficiencies: [ToolCategory.MUSICAL_INSTRUMENT],
            languagesToChooseCount: 1,
            items: [
                { name: 'Інсигнія рангу', quantity: 1 },
                { name: 'Набір дорожнього одягу', quantity: 1 },
                { name: 'зм', quantity: 10 }
            ],
            specialAbilityName: 'Лицарський Кодекс',
            description: 'Як лицар Соламнії, ти зв\'язаний клятвою честі та маєш повагу серед тих, хто знає про лицарів. Інші лицарі та ті, хто поважає закон, надають тобі допомогу та підтримку. Твоя відданість честі та справедливості визначає твої дії.'
        },
        {
            name: BackgroundCategory.MAGE_OF_HIGH_SORCERY,
            source: Source.DRAGONLANCE,
            skillProficiencies: [Skills.ARCANA, Skills.HISTORY],
            languagesToChooseCount: 2,
            items: [
                { name: 'Пляшечка чорнила', quantity: 1 },
                { name: 'Перо', quantity: 1 },
                { name: 'Звичайна роба', quantity: 1 },
                { name: 'зм', quantity: 10 }
            ],
            specialAbilityName: 'Високе Чаклунство',
            description: 'Твоє навчання в Ордені Високого Чаклунства дало тобі глибоке розуміння магії. Ти маєш доступ до бібліотек та ресурсів ордену, а інші чарівники визнають твою освіту. Твоє розуміння архіканних мистецтв виділяє тебе серед звичайних чарівників.'
        },
        {
            name: BackgroundCategory.HOUSE_AGENT,
            source: Source.EBERRON,
            skillProficiencies: [Skills.INVESTIGATION, Skills.PERSUASION],
            toolProficiencies: [ToolCategory.ARTISAN_TOOLS],
            languagesToChooseCount: 1, // ДОДАНО!
            items: [
                { name: 'Набір ремісничих інструментів', quantity: 1 },
                { name: 'Ідентифікаційні папери Дому', quantity: 1 },
                { name: 'Гарний одяг', quantity: 1 },
                { name: 'зм', quantity: 20 }
            ],
            specialAbilityName: 'Влада Дому',
            description: 'Як агент драконічого дому, ти маєш доступ до ресурсів та контактів свого дому. Ти можеш використовувати вплив дому для отримання інформації, послуг або підтримки в справах, що стосуються інтересів дому. Твоє драконяче тавро відкриває багато дверей.'
        },
        {
            name: BackgroundCategory.ARTISAN_2024,
            source: Source.PHB_2024,
            skillProficiencies: [Skills.INVESTIGATION, Skills.PERSUASION],
            toolProficiencies: [ToolCategory.ARTISAN_TOOLS],
            items: [
                { name: 'Ремісничі інструменти (на вибір)', quantity: 1 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'зм', quantity: 32 }
            ],
            specialAbilityName: 'Майстерність Ремісника',
            description: 'Твоя репутація як майстрового ремісника відома в твоєму регіоні. Ти можеш отримати аудієнцію з місцевими ремісниками, купцями та знатними особами, які цінують якісну роботу. Ти також можеш працювати, щоб заробляти на скромне життя в будь-якому місті.'
        },
        {
            name: BackgroundCategory.CHARLATAN_2024,
            source: Source.PHB_2024,
            skillProficiencies: [Skills.DECEPTION, Skills.SLEIGHT_OF_HAND],
            toolProficiencies: [ToolCategory.FORGERY_KIT],
            items: [
                { name: 'Набір для підробки', quantity: 1 },
                { name: 'Гарний одяг', quantity: 1 },
                { name: 'зм', quantity: 15 }
            ],
            specialAbilityName: 'Фальшива Особистість',
            description: 'Ти маєш фальшиву особистість, включаючи документацію, встановлені знайомства та маскування. Ти можеш підробляти документи та прийняти цю персону, коли потрібно. Твоя здатність обманювати та маніпулювати дає тобі перевагу в соціальних ситуаціях.'
        },
        {
            name: BackgroundCategory.CRIMINAL_2024,
            source: Source.PHB_2024,
            skillProficiencies: [Skills.SLEIGHT_OF_HAND, Skills.STEALTH],
            toolProficiencies: [ToolCategory.THIEVES_TOOLS],
            items: [
                { name: 'Ломик', quantity: 1 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'зм', quantity: 16 }
            ],
            specialAbilityName: 'Злочинні Контакти',
            description: 'У тебе є мережа контактів у кримінальному світі. Ти знаєш, як отримувати інформацію, передавати повідомлення та знаходити безпечні будинки в містах, які ти відвідуєш. Твої зв\'язки з підземним світом дають тобі доступ до ресурсів поза законом.'
        },
        {
            name: BackgroundCategory.ENTERTAINER_2024,
            source: Source.PHB_2024,
            skillProficiencies: [Skills.ACROBATICS, Skills.PERFORMANCE],
            toolProficiencies: [ToolCategory.MUSICAL_INSTRUMENT],
            items: [
                { name: 'Музичний інструмент (на вибір)', quantity: 1 },
                { name: 'Костюм', quantity: 2 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'зм', quantity: 11 }
            ],
            specialAbilityName: 'За Популярним Запитом',
            description: 'Ти можеш знайти місце для виступу в тавернах, ярмарках або театрах. Твої виступи забезпечують тобі житло та їжу, а також роблять тебе відомим серед місцевих. Твій талант розважати людей відкриває багато можливостей.'
        },
        {
            name: BackgroundCategory.FARMER_2024,
            source: Source.PHB_2024,
            skillProficiencies: [Skills.ANIMAL_HANDLING, Skills.NATURE],
            toolProficiencies: [ToolCategory.ARTISAN_TOOLS],
            items: [
                { name: 'Серп', quantity: 1 },
                { name: 'Теслярські інструменти', quantity: 1 },
                { name: 'Набір цілителя', quantity: 10 },
                { name: 'Залізний казан', quantity: 1 },
                { name: 'Лопата', quantity: 1 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'зм', quantity: 30 }
            ],
            specialAbilityName: 'Сільський Інстинкт',
            description: 'Твоє життя на фермі навчило тебе читати погоду, розуміти цикли врожаю та знайти їжу в дикій природі. Сільські жителі визнають тебе як одного з них та охоче надають допомогу. Твоє розуміння землі та природи дає тобі унікальні навички виживання.'
        },
        {
            name: BackgroundCategory.GUARD_2024,
            source: Source.PHB_2024,
            skillProficiencies: [Skills.ATHLETICS, Skills.PERCEPTION],
            toolProficiencies: [ToolCategory.GAMING_SET],
            items: [
                { name: 'Спис', quantity: 1 },
                { name: 'Легкий арбалет', quantity: 1 },
                { name: 'Болти', quantity: 20 },
                { name: 'Набір для гри', quantity: 1 },
                { name: 'Ліхтар з капюшоном', quantity: 1 },
                { name: 'Наручники', quantity: 1 },
                { name: 'Сагайдак', quantity: 1 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'зм', quantity: 12 }
            ],
            specialAbilityName: 'Око Варти',
            description: 'Твій досвід у варті дав тобі знання про забезпечення безпеки та правоохоронну діяльність. Інші гвардійці можуть визнати тебе та надати інформацію або допомогу. Твоє розуміння кримінального світу та правопорядку дає тобі перевагу в розслідуваннях.'
        },
        {
            name: BackgroundCategory.GUIDE_2024,
            source: Source.PHB_2024,
            skillProficiencies: [Skills.STEALTH, Skills.SURVIVAL],
            toolProficiencies: [ToolCategory.NAVIGATORS_TOOLS],
            items: [
                { name: 'Короткий лук', quantity: 1 },
                { name: 'Стріли', quantity: 20 },
                { name: 'Картографічні інструменти', quantity: 1 },
                { name: 'Спальний мішок', quantity: 1 },
                { name: 'Сагайдак', quantity: 1 },
                { name: 'Намет', quantity: 1 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'зм', quantity: 3 }
            ],
            specialAbilityName: 'Надійний Провідник',
            description: 'Твій досвід ведення мандрівників дає тобі здатність орієнтуватися в дикій місцевості та знаходити безпечні маршрути. Ти також знаєш, де знайти притулок та ресурси. Мандрівники довіряють твоїм навичкам та знанням територій.'
        },
        {
            name: BackgroundCategory.HERMIT_2024,
            source: Source.PHB_2024,
            skillProficiencies: [Skills.MEDICINE, Skills.RELIGION],
            toolProficiencies: [ToolCategory.HERBALISM_KIT],
            items: [
                { name: 'Посох', quantity: 1 },
                { name: 'Набір травника', quantity: 1 },
                { name: 'Спальний мішок', quantity: 1 },
                { name: 'Книга (філософія)', quantity: 1 },
                { name: 'Лампа', quantity: 1 },
                { name: 'Олія', quantity: 3 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'зм', quantity: 16 }
            ],
            specialAbilityName: 'Відкриття',
            description: 'Твоє усамітнення призвело до важливого відкриття або прозріння - велика істина, забуте знання або таємне місце. Це відкриття може впливати на твої пригоди та визначати твої цілі. Твоє розуміння глибоких таємниць виділяє тебе.'
        },
        {
            name: BackgroundCategory.MERCHANT_2024,
            source: Source.PHB_2024,
            skillProficiencies: [Skills.ANIMAL_HANDLING, Skills.PERSUASION],
            toolProficiencies: [ToolCategory.NAVIGATORS_TOOLS],
            items: [
                { name: 'Навігаційні інструменти', quantity: 1 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'зм', quantity: 22 }
            ],
            specialAbilityName: 'Торговельні Маршрути',
            description: 'Ти знаєш основні торгові маршрути та маєш контакти серед купців. Ти можеш отримати інформацію про ціни на товари, попит та пропозицію в різних регіонах. Твоє розуміння комерції дає тобі перевагу в торгових справах.'
        },
        {
            name: BackgroundCategory.NOBLE_2024,
            source: Source.PHB_2024,
            skillProficiencies: [Skills.HISTORY, Skills.PERSUASION],
            toolProficiencies: [ToolCategory.GAMING_SET],
            items: [
                { name: 'Набір для гри', quantity: 1 },
                { name: 'Гарний одяг', quantity: 1 },
                { name: 'Парфуми', quantity: 1 },
                { name: 'зм', quantity: 29 }
            ],
            specialAbilityName: 'Позиція Привілею',
            description: 'Завдяки знатному походженню ти маєш доступ до вищого суспільства. Люди схильні думати найкраще про тебе, і ти можеш отримати аудієнції з місцевими лідерами. Твій статус відкриває двері, закриті для простолюдинів.'
        },
        {
            name: BackgroundCategory.SAGE_2024,
            source: Source.PHB_2024,
            skillProficiencies: [Skills.ARCANA, Skills.HISTORY],
            toolProficiencies: [ToolCategory.ARTISAN_TOOLS],
            items: [
                { name: 'Каліграфічний набір', quantity: 1 },
                { name: 'Книга (історія)', quantity: 1 },
                { name: 'Пергамент', quantity: 8 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'зм', quantity: 8 }
            ],
            specialAbilityName: 'Дослідник',
            description: 'Коли ти не знаєш інформації, ти знаєш, де її знайти - бібліотеки, вчені, архіви. Ти маєш доступ до академічних ресурсів та контактів серед інтелектуалів. Твоя жага знань та дослідницькі навички виділяють тебе.'
        },
        {
            name: BackgroundCategory.SAILOR_2024,
            source: Source.PHB_2024,
            skillProficiencies: [Skills.ATHLETICS, Skills.PERCEPTION],
            toolProficiencies: [ToolCategory.NAVIGATORS_TOOLS],
            items: [
                { name: 'Дубинка', quantity: 1 },
                { name: 'Навігаційні інструменти', quantity: 1 },
                { name: 'Конопляна мотузка (50 футів)', quantity: 1 },
                { name: 'Талісман удачі', quantity: 1 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'зм', quantity: 14 }
            ],
            specialAbilityName: 'Прохід на Кораблі',
            description: 'Ти можеш забезпечити безкоштовний прохід на кораблі для себе та супутників, допомагаючи екіпажу. Твоє знання моря та кораблів дає тобі перевагу в морських ситуаціях. Моряки визнають тебе як одного з них.'
        },
        {
            name: BackgroundCategory.SCRIBE_2024,
            source: Source.PHB_2024,
            skillProficiencies: [Skills.INVESTIGATION, Skills.PERCEPTION],
            toolProficiencies: [ToolCategory.ARTISAN_TOOLS],
            items: [
                { name: 'Каліграфічний набір', quantity: 1 },
                { name: 'Гарний одяг', quantity: 1 },
                { name: 'зм', quantity: 23 }
            ],
            specialAbilityName: 'Писарські Навички',
            description: 'Твої навички письма та ведення записів роблять тебе цінним для організацій, які потребують документації. Ти можеш знайти роботу як писар у більшості цивілізованих місць. Твоє розуміння бюрократії та документообігу дає тобі перевагу.'
        },
        {
            name: BackgroundCategory.SOLDIER_2024,
            source: Source.PHB_2024,
            skillProficiencies: [Skills.ATHLETICS, Skills.INTIMIDATION],
            toolProficiencies: [ToolCategory.GAMING_SET],
            items: [
                { name: 'Спис', quantity: 1 },
                { name: 'Короткий лук', quantity: 1 },
                { name: 'Стріли', quantity: 20 },
                { name: 'Набір для гри', quantity: 1 },
                { name: 'Ліхтар з капюшоном', quantity: 1 },
                { name: 'Сагайдак', quantity: 1 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'зм', quantity: 14 }
            ],
            specialAbilityName: 'Військовий Ранг',
            description: 'Твій військовий ранг та досвід визнаються іншими солдатами. Ти можеш використовувати свій авторитет для отримання допомоги від військових підрозділів, лояльних до твоєї колишньої армії. Твоє тренування та дисципліна виділяють тебе.'
        },
        {
            name: BackgroundCategory.WAYFARER_2024,
            source: Source.PHB_2024,
            skillProficiencies: [Skills.INSIGHT, Skills.STEALTH],
            toolProficiencies: [ToolCategory.THIEVES_TOOLS],
            items: [
                { name: 'Інструменти злодія', quantity: 1 },
                { name: 'Карта регіону', quantity: 1 },
                { name: 'Спальний мішок', quantity: 1 },
                { name: 'Дорожній одяг', quantity: 1 },
                { name: 'зм', quantity: 16 }
            ],
            specialAbilityName: 'Мандрівник',
            description: 'Твій досвід подорожей дав тобі знання про дороги, шляхи та безпечні місця відпочинку. Ти можеш знайти безкоштовне житло серед мандрівників та знаєш, як уникнути небезпек на дорозі. Інші мандрівники визнають тебе як досвідченого подорожнього.'
        },
        {
            name: BackgroundCategory.CUSTOM,
            skillProficiencies: {
                choiceCount: 2,
                choices: ['ANY']
            },
            items: [],
            specialAbilityName: 'Налаштована Здібність',
            description: 'Попрацюй зі своїм DM, щоб створити унікальну здібність, яка відповідає твоїй передісторії та концепції персонажа. Ця здібність повинна бути збалансованою та відповідати твоїй історії.'
        }
    ];

    // Збереження в БД через upsert
    for (const background of backgrounds) {
        await prisma.background.upsert({
            where: { name: background.name },
            update: background,
            create: background
        })
    }

    console.log(`✅ Додано ${backgrounds.length} бекграундів! 🎉`)
}
