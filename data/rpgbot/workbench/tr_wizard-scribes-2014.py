import refs

TITLE = 'Орден писарів — гайд підкласу Чарівника (2014)'
TOPICS = 'Чарівник, Орден писарів, писар, підклас, приклад збірки'

HEADINGS = {'section-features': 'Уміння Ордену писарів',
 'section-every-damage-type-at-every-level': 'Усі типи шкоди на кожному рівні',
 'section-order-of-scribes-ability-scores': 'Характеристики Ордену писарів',
 'section-order-of-scribes-races': 'Раси Ордену писарів',
 'section-order-of-scribes-feats': 'Риси Ордену писарів',
 'section-example-build-rpgbot-selfinsert': 'Приклад збірки — самовставка '
                                            'RPGbot',
 'section-abilities': 'Характеристики'}

FRAGMENTS = {'block-section-introduction-1': 'Якщо ви хочете зібрати кожне заклинання '
                                 'Чарівника, яке будь-коли видавали (як-от я), '
                                 'Орден писарів — чудовий вибір. Він дає '
                                 'кілька унікальних можливостей для '
                                 'розвʼязання багатьох проблем, що зазвичай '
                                 'трапляються в пригодах, але не '
                                 'зосереджується на якійсь одній вузькій '
                                 'ділянці чарівництва. Радше Орден писарів — '
                                 'це такий собі універсальний підклас '
                                 'Чарівника, що підкреслює, доповнює й оспівує '
                                 'одні з найкращих речей у чарівництві (як-от '
                                 'збирання всіх заклинань).',
 'block-section-introduction-2': 'Орден писарів має унікальну механіку '
                                 'балансу: що більше заклинань ви знаєте, то '
                                 'ви потужніші. Звісно, ритуали працюють для '
                                 'будь-якого чарівника, а доступ до більшої '
                                 'кількості заклинань робить вас здатнішим '
                                 'пристосовуватися до проблем. Але Орден '
                                 'писарів іде далі. Надзвичайно велика '
                                 'кількість заклинань у вашій книзі заклинань '
                                 'дозволяє змінювати тип шкоди заклинань, а на '
                                 'високих рівнях — скасовувати шкоду, '
                                 'тимчасово закриваючи доступ до заклинань у '
                                 'книзі. Через ці унікальні механіки ви '
                                 'залежите від того, щоб вивчити якомога '
                                 'більше заклинань. Готуйтеся витрачати золото '
                                 'й час на вписування заклинань до книги за '
                                 'кожної нагоди.',
 'block-section-introduction-3': 'На жаль, ця унікальна можливість має свій '
                                 'ризик. До 20-го рівня Чарівник вивчає '
                                 'загалом лише 44 заклинання, якщо ви не '
                                 'можете додавати до книги заклинань '
                                 'додаткові. Залежно від гри, у якій ви '
                                 'граєте, ви можете так і не отримати способів '
                                 'додати до книги більше заклинань (книги '
                                 'заклинань інших чарівників, сувої заклинань '
                                 'тощо). У кампаніях, що відбуваються в диких '
                                 'землях чи в мегапідземеллі, Орден писарів — '
                                 'ризикований вибір. В іграх, дія яких '
                                 'відбувається в містах із бібліотеками чи '
                                 'школами чарівників, легкий доступ до книг '
                                 'заклинань зробить Орден писарів ефективним, '
                                 'надійним, різнобічним і веселим. Якщо ви не '
                                 'знаєте природи кампанії, поцікавтеся в '
                                 'Майстра, перш ніж зобовʼязуватися. Зрештою '
                                 'ви отримаєте доступ до таких речей, як '
                                 'телепортація, і зможете шукати джерела нових '
                                 'заклинань, але, мабуть, не хочете терпіти '
                                 'повну відсутність варіантів до того моменту.',
 'block-section-introduction-4': 'Загалом Орден писарів — це справжній '
                                 '«чарівник для чарівників». Якщо ви любите '
                                 'Чарівника й вам зручно з механіками, що '
                                 'роблять його чудовим, Орден писарів — '
                                 'чудовий вибір. Але якщо ви шукаєте легкий '
                                 'шлях до потужного персонажа, що працює в '
                                 'будь-якій кампанії, Орден писарів — не те, '
                                 'що вам потрібно.',
 'block-section-every-damage-type-at-every-level-1': '«Пробуджена книга '
                                                     'заклять»{{Awakened '
                                                     'Spellbook}} дозволяє нам '
                                                     'змінювати типи шкоди '
                                                     'наших заклинань із '
                                                     'рівнями. Зазвичай нам '
                                                     'цілком вистачає кількох '
                                                     'типів шкоди, як-от '
                                                     'психічна й силова, але '
                                                     'можливість завдавати '
                                                     'будь-який тип шкоди '
                                                     'спокушає. Якщо ми хочемо '
                                                     'мати кожен тип шкоди на '
                                                     'кожному рівні заклинань, '
                                                     'нам доведеться зібрати '
                                                     'довгий список заклинань, '
                                                     'щоб покрити їх усі.',
 'block-section-every-damage-type-at-every-level-2': 'Зверніть увагу: тип '
                                                     'шкоди має лише '
                                                     '«зʼявлятися» в '
                                                     'заклинанні; заклинанню '
                                                     'не обовʼязково вміти '
                                                     'завдавати саме такої '
                                                     'шкоди. Тож підходять і '
                                                     'заклинання, що дають '
                                                     'опір до типу шкоди, і '
                                                     'ті, що можуть завдати '
                                                     'шкоди самому заклиначеві '
                                                     '(наприклад, коли ви '
                                                     'телепортуєтеся в стіну й '
                                                     'отримуєте силову шкоду). '
                                                     'Здається дивним, що це '
                                                     'зроблено навмисно, але '
                                                     'WotC могли б написати '
                                                     '«замініть його тип шкоди '
                                                     'на тип, який може '
                                                     'завдати інше заклинання '
                                                     'у вашій книзі '
                                                     'заклинань», тож, схоже, '
                                                     'це таки навмисно.',
 'block-section-every-damage-type-at-every-level-3': 'У наведеній нижче '
                                                     'таблиці використано лише '
                                                     'заклинання зі списку '
                                                     'заклинань Чарівника. '
                                                     '«Пробуджена книга '
                                                     'заклять»{{Awakened '
                                                     'Spellbook}} зважає лише '
                                                     'на те, що є у вашій '
                                                     'книзі заклинань, а '
                                                     'мультикласування, риси й '
                                                     'расові риси не додають '
                                                     'заклинань до книги. '
                                                     'Таблиця також не '
                                                     'враховує {{мітки '
                                                     'дракона|dragonmarks}}, '
                                                     'які таки дозволяють '
                                                     'додавати до книги кілька '
                                                     'незвичних заклинань. '
                                                     'Заклинання '
                                                     'дунамантії{{Dunamancy}} '
                                                     'теж не включено, бо я не '
                                                     'можу припускати, що вони '
                                                     'доступні у вашій грі.',
 'block-section-every-damage-type-at-every-level-4/header/1': '1-й',
 'block-section-every-damage-type-at-every-level-4/header/2': '2-й',
 'block-section-every-damage-type-at-every-level-4/header/3': '3-й',
 'block-section-every-damage-type-at-every-level-4/header/4': '4-й',
 'block-section-every-damage-type-at-every-level-4/header/5': '5-й',
 'block-section-every-damage-type-at-every-level-4/header/6': '6-й',
 'block-section-every-damage-type-at-every-level-4/header/7': '7-й',
 'block-section-every-damage-type-at-every-level-4/header/8': '8-й',
 'block-section-every-damage-type-at-every-level-4/header/9': '9-й',
 'block-section-every-damage-type-at-every-level-5': 'Як бачите, є кілька '
                                                     'прогалин, але в нас '
                                                     'достатньо варіантів, щоб '
                                                     'опір до шкоди чи '
                                                     'імунітет ніколи не були '
                                                     'проблемою. Майже ніщо в '
                                                     'грі не має опору до '
                                                     'магічної дроблячої '
                                                     'шкоди, а вона охоплює '
                                                     'всі рівні заклинань, '
                                                     'крім 8-го. На 8-му рівні '
                                                     'заклинань можна взяти '
                                                     'психічну або променеву '
                                                     'шкоду.',
 'block-section-order-of-scribes-ability-scores-1': 'Орден писарів — '
                                                    'найчарівницькіший із '
                                                    'чарівників, тож наші '
                                                    'потреби в характеристиках '
                                                    'такі самі, як в інших '
                                                    'чарівників. Дивіться наш '
                                                    '[[1|довідник Чарівника]].',
 'block-section-order-of-scribes-races-1': 'Орден писарів керується двома '
                                           'речами: потребою вписувати '
                                           'заклинання до книги та потребою '
                                           'вижити, роблячи це. Вроджене '
                                           'чаротворство все одно корисне, але '
                                           'не додає заклинань до вашої книги, '
                                           'тож якщо ви все ж оберете расу на '
                                           'кшталт Дроу{{Drow}} чи '
                                           'Феї{{Fairy}}, памʼятайте, що ці '
                                           'заклинання не враховуються для '
                                           '«Пробудженої книги '
                                           'заклять»{{Awakened Spellbook}}.',
 'block-section-order-of-scribes-races-2': 'Окрім цих міркувань, расові '
                                           'потреби Ордену писарів такі самі, '
                                           'як в інших чарівників. Дивіться '
                                           'наш [[1|розбір рас Чарівника]].',
 'block-section-order-of-scribes-feats-1': 'Орден писарів не має жодної '
                                           'унікальної взаємодії з рисами, тож '
                                           'порад із нашого [[1|довідника '
                                           'Чарівника]] має вистачити.',
 'block-section-multiclassing-1': 'Мультикласування в інші класи заклинателів '
                                  'не дозволяє додавати їхні заклинання до '
                                  'вашої книги заклинань, тож використати їх '
                                  'для зміни типу шкоди за допомогою '
                                  '«Пробудженої книги заклять»{{Awakened '
                                  'Spellbook}} не вийде. Проте '
                                  'мультикласування все одно може бути дуже '
                                  'корисним. Дивіться [[1|довідник '
                                  'Чарівника]].',
 'block-section-example-build-rpgbot-selfinsert-1': 'Це абсолютно егоїстично, '
                                                    'але воєнокований чарівник '
                                                    'Ордену писарів — '
                                                    'настільки RPGbot, '
                                                    'наскільки це взагалі '
                                                    'можливо, тож поїхали. '
                                                    'Чарівники — мій улюблений '
                                                    'клас, а Орден писарів — '
                                                    'найчарівницькіший '
                                                    'чарівник, що будь-коли '
                                                    'чарівничив, і ми '
                                                    'чарівничатимемо від усієї '
                                                    'душі. Ми кидатимемо '
                                                    'дроблячі вогнекулі '
                                                    '[Fireball] і стрілятимемо '
                                                    'ланцюговою блискавкою '
                                                    '[Chain Lightning], що '
                                                    'завдає силової шкоди. Ми '
                                                    'розноситимемо зіткнення '
                                                    'одним заклинанням із '
                                                    'відстані в сотні футів, '
                                                    'обминаючи кілька рогів. '
                                                    'Ми скасовуватимемо '
                                                    'стільки шкоди, що цілком '
                                                    'могли б бути танком '
                                                    'групи.',
 'block-section-abilities-1': 'Використаємо розподіл характеристик, '
                              'запропонований у довіднику Чарівника. Ми '
                              'навмисно лишаємо Інтелект і Статуру на непарних '
                              'значеннях, щоб наші модифікатори зростали, коли '
                              'ми візьмемо гібридні риси на 4-му й 12-му '
                              'рівнях.',
 'block-section-abilities-2/header/1': '**Базове значення**',
 'block-section-abilities-2/header/2': '**Підвищене значення**',
 'block-section-abilities-2/row/0/0': 'Сила',
 'block-section-abilities-2/row/1/0': 'Спритність',
 'block-section-abilities-2/row/2/0': 'Статура',
 'block-section-abilities-2/row/3/0': 'Інтелект',
 'block-section-abilities-2/row/4/0': 'Мудрість',
 'block-section-abilities-2/row/5/0': 'Харизма',
 'block-section-race-1': 'Воєнокований{{Warforged}} із налаштованим '
                         'походженням{{Custom Origin}}. Він додає нашому '
                         'чарівнику багато живучості, але не допомагає нам '
                         'активно робити чарівницькі речі, тож у цьому ми '
                         'покладаємося на себе. Ми скористаємося правилами '
                         'налаштованого походження, щоб перенести +2 на '
                         'Інтелект і вкласти +1 у Статуру.',
 'block-section-background-1': 'Замкнений учений{{Cloistered Scholar}} із '
                               '«Путівника по Узбережжю Мечів»{{Sword Coast '
                               'Adventurer’s Guide}} працює чудово, але '
                               'Послушник{{Acolyte}} теж підійде. Якщо хочете '
                               'чогось вишуканішого, можна обміняти мови на '
                               'якісь інструменти, але для цієї збірки це '
                               'насправді не має значення.',
 'block-section-skills-and-tools-1': 'Від раси, класу й передісторії ми '
                                     'отримуємо загалом 5 навичок. Оберемо '
                                     'Магію, Історію, Розслідування, Природу й '
                                     'Релігію, тобто кожну навичку на основі '
                                     'Інтелекту. Ми також отримуємо один '
                                     'інструмент, тож оберіть щось круте, '
                                     'як-от каліграфічний набір{{calligraphy '
                                     'tools}} чи щось таке.',
 'block-section-skills-and-tools-2': 'Якщо хочете більше навичок, вивчіть '
                                     'Позичене знання [Borrowed Knowledge].',
 'block-section-feats-1': 'На 4-му рівні ми візьмемо гібридну рису. '
                          '«Телекінетик»{{Telekinetic}}, «Доторк феї»{{Fey '
                          'Touched}} і «Доторк тіні»{{Shadow Touched}} — усе '
                          'добрі варіанти. «Експерт у навичках»{{Skill '
                          'Expert}} теж варіант, але дивний вибір.',
 'block-section-levels-1/header/0': '**Рівень**',
 'block-section-levels-1/header/1': '**Риси та уміння**',
 'block-section-levels-1/header/2': '**Примітки й тактика**',
 'block-section-every-damage-type-at-every-level-4/row/0/0': 'Кислотна',
 'block-section-every-damage-type-at-every-level-4/row/0/1': 'Кольорова кулька',
 'block-section-every-damage-type-at-every-level-4/row/0/2': 'Подих Дракона',
 'block-section-every-damage-type-at-every-level-4/row/0/3': 'Охоронний символ',
 'block-section-every-damage-type-at-every-level-4/row/0/4': 'Прокляття стихій',
 'block-section-every-damage-type-at-every-level-4/row/0/6': 'Платиновий щит '
                                                             'Фізбана',
 'block-section-every-damage-type-at-every-level-4/row/0/7': 'Веселкові бризки',
 'block-section-every-damage-type-at-every-level-4/row/0/8': 'Ілюзорний дракон',
 'block-section-every-damage-type-at-every-level-4/row/0/9': 'Веселкова стіна',
 'block-section-every-damage-type-at-every-level-4/row/1/0': 'Дробляча',
 'block-section-every-damage-type-at-every-level-4/row/1/1': 'Катапульта',
 'block-section-every-damage-type-at-every-level-4/row/1/2': 'Зміна вигляду',
 'block-section-every-damage-type-at-every-level-4/row/1/3': 'Виверження землі',
 'block-section-every-damage-type-at-every-level-4/row/1/4': 'Камʼяна шкіра',
 'block-section-every-damage-type-at-every-level-4/row/1/5': 'Оживлення '
                                                             'предметів',
 'block-section-every-damage-type-at-every-level-4/row/1/6': 'Вбрання вітру',
 'block-section-every-damage-type-at-every-level-4/row/1/7': 'Вихор',
 'block-section-every-damage-type-at-every-level-4/row/1/9': 'Рій метеорів',
 'block-section-every-damage-type-at-every-level-4/row/2/0': 'Холодна',
 'block-section-every-damage-type-at-every-level-4/row/2/1': 'Кольорова кулька',
 'block-section-every-damage-type-at-every-level-4/row/2/2': 'Подих Дракона',
 'block-section-every-damage-type-at-every-level-4/row/2/3': 'Охоронний символ',
 'block-section-every-damage-type-at-every-level-4/row/2/4': 'Прокляття стихій',
 'block-section-every-damage-type-at-every-level-4/row/2/5': 'Конус холоду',
 'block-section-every-damage-type-at-every-level-4/row/2/6': 'Платиновий щит '
                                                             'Фізбана',
 'block-section-every-damage-type-at-every-level-4/row/2/7': 'Веселкові бризки',
 'block-section-every-damage-type-at-every-level-4/row/2/8': 'Ілюзорний дракон',
 'block-section-every-damage-type-at-every-level-4/row/2/9': 'Веселкова стіна',
 'block-section-every-damage-type-at-every-level-4/row/3/0': 'Вогняна',
 'block-section-every-damage-type-at-every-level-4/row/3/1': 'Кольорова кулька',
 'block-section-every-damage-type-at-every-level-4/row/3/2': 'Подих Дракона',
 'block-section-every-damage-type-at-every-level-4/row/3/3': 'Охоронний символ',
 'block-section-every-damage-type-at-every-level-4/row/3/4': 'Прокляття стихій',
 'block-section-every-damage-type-at-every-level-4/row/3/5': 'Спопеління',
 'block-section-every-damage-type-at-every-level-4/row/3/6': 'Платиновий щит '
                                                             'Фізбана',
 'block-section-every-damage-type-at-every-level-4/row/3/7': 'Веселкові бризки',
 'block-section-every-damage-type-at-every-level-4/row/3/8': 'Ілюзорний дракон',
 'block-section-every-damage-type-at-every-level-4/row/3/9': 'Веселкова стіна',
 'block-section-every-damage-type-at-every-level-4/row/4/0': 'Силова',
 'block-section-every-damage-type-at-every-level-4/row/4/1': 'Магічний дротик',
 'block-section-every-damage-type-at-every-level-4/row/4/2': 'Кінетичний скік',
 'block-section-every-damage-type-at-every-level-4/row/4/4': 'Двері між '
                                                             'вимірами',
 'block-section-every-damage-type-at-every-level-4/row/4/5': 'Длань Бігбі',
 'block-section-every-damage-type-at-every-level-4/row/4/6': 'Розщеплення',
 'block-section-every-damage-type-at-every-level-4/row/4/7': 'Меч '
                                                             'Морденкайнена',
 'block-section-every-damage-type-at-every-level-4/row/4/9': 'Клинок '
                                                             'катастрофи',
 'block-section-every-damage-type-at-every-level-4/row/5/0': 'Блискавична',
 'block-section-every-damage-type-at-every-level-4/row/5/1': 'Кольорова кулька',
 'block-section-every-damage-type-at-every-level-4/row/5/2': 'Подих Дракона',
 'block-section-every-damage-type-at-every-level-4/row/5/3': 'Охоронний символ',
 'block-section-every-damage-type-at-every-level-4/row/5/4': 'Прокляття стихій',
 'block-section-every-damage-type-at-every-level-4/row/5/6': 'Платиновий щит '
                                                             'Фізбана',
 'block-section-every-damage-type-at-every-level-4/row/5/7': 'Веселкові бризки',
 'block-section-every-damage-type-at-every-level-4/row/5/8': 'Ілюзорний дракон',
 'block-section-every-damage-type-at-every-level-4/row/5/9': 'Веселкова стіна',
 'block-section-every-damage-type-at-every-level-4/row/6/0': 'Некротична',
 'block-section-every-damage-type-at-every-level-4/row/6/2': 'Вʼянення і '
                                                             'цвітіння',
 'block-section-every-damage-type-at-every-level-4/row/6/3': 'Духовна '
                                                             'плащаниця',
 'block-section-every-damage-type-at-every-level-4/row/6/4': 'Усихання',
 'block-section-every-damage-type-at-every-level-4/row/6/5': 'Потік негативної '
                                                             'енергії',
 'block-section-every-damage-type-at-every-level-4/row/6/6': 'Коло смерті',
 'block-section-every-damage-type-at-every-level-4/row/6/7': 'Палець смерті',
 'block-section-every-damage-type-at-every-level-4/row/6/8': 'Ілюзорний дракон',
 'block-section-every-damage-type-at-every-level-4/row/6/9': 'Бажання',
 'block-section-every-damage-type-at-every-level-4/row/7/0': 'Колюча',
 'block-section-every-damage-type-at-every-level-4/row/7/1': 'Крижаний кинджал',
 'block-section-every-damage-type-at-every-level-4/row/7/2': 'Зміна вигляду',
 'block-section-every-damage-type-at-every-level-4/row/7/4': 'Камʼяна шкіра',
 'block-section-every-damage-type-at-every-level-4/row/7/5': 'Оживлення '
                                                             'предметів',
 'block-section-every-damage-type-at-every-level-4/row/8/0': 'Отруйна',
 'block-section-every-damage-type-at-every-level-4/row/8/1': 'Кольорова кулька',
 'block-section-every-damage-type-at-every-level-4/row/8/2': 'Подих Дракона',
 'block-section-every-damage-type-at-every-level-4/row/8/5': 'Вбивча хмара',
 'block-section-every-damage-type-at-every-level-4/row/8/6': 'Платиновий щит '
                                                             'Фізбана',
 'block-section-every-damage-type-at-every-level-4/row/8/7': 'Веселкові бризки',
 'block-section-every-damage-type-at-every-level-4/row/8/8': 'Ілюзорний дракон',
 'block-section-every-damage-type-at-every-level-4/row/8/9': 'Веселкова стіна',
 'block-section-every-damage-type-at-every-level-4/row/9/0': 'Психічна',
 'block-section-every-damage-type-at-every-level-4/row/9/2': 'Уявна сила',
 'block-section-every-damage-type-at-every-level-4/row/9/3': 'Фортеця '
                                                             'інтелекту',
 'block-section-every-damage-type-at-every-level-4/row/9/4': 'Фантомний вбивця',
 'block-section-every-damage-type-at-every-level-4/row/9/5': 'Синаптичний '
                                                             'розряд',
 'block-section-every-damage-type-at-every-level-4/row/9/6': 'Ментальна '
                                                             'вʼязниця',
 'block-section-every-damage-type-at-every-level-4/row/9/8': 'Нестерпна '
                                                             'темрява',
 'block-section-every-damage-type-at-every-level-4/row/9/9': 'Психічний крик',
 'block-section-every-damage-type-at-every-level-4/row/10/0': 'Променева',
 'block-section-every-damage-type-at-every-level-4/row/10/3': 'Духовна '
                                                              'плащаниця',
 'block-section-every-damage-type-at-every-level-4/row/10/4': 'Нудотне сяйво',
 'block-section-every-damage-type-at-every-level-4/row/10/5': 'Стіна світла',
 'block-section-every-damage-type-at-every-level-4/row/10/6': 'Сонячний '
                                                              'промінь',
 'block-section-every-damage-type-at-every-level-4/row/10/7': 'Корона зірок',
 'block-section-every-damage-type-at-every-level-4/row/10/8': 'Сонячний спалах',
 'block-section-every-damage-type-at-every-level-4/row/11/0': 'Рубляча',
 'block-section-every-damage-type-at-every-level-4/row/11/2': 'Зміна вигляду',
 'block-section-every-damage-type-at-every-level-4/row/11/4': 'Камʼяна шкіра',
 'block-section-every-damage-type-at-every-level-4/row/11/5': 'Оживлення '
                                                              'предметів',
 'block-section-every-damage-type-at-every-level-4/row/11/6': 'Вбрання каменю',
 'block-section-every-damage-type-at-every-level-4/row/12/0': 'Громова',
 'block-section-every-damage-type-at-every-level-4/row/12/1': 'Кольорова '
                                                              'кулька',
 'block-section-every-damage-type-at-every-level-4/row/12/2': 'Друзки',
 'block-section-every-damage-type-at-every-level-4/row/12/3': 'Охоронний '
                                                              'символ',
 'block-section-every-damage-type-at-every-level-4/row/12/4': 'Прокляття '
                                                              'стихій',
 'block-section-levels-1/row/0/1': 'Магічне відновлення\n'
                                   'Чаротворство\n'
                                   'Замовляння:\n'
                                   '– Вогняний заряд\n'
                                   '– Розщеплення Розуму\n'
                                   '– Штукарство\n'
                                   'Заклинання 1-го рівня:\n'
                                   '– Кольорова кулька\n'
                                   '– Розуміння мов (Р)\n'
                                   '– Пошук фамільяра (Р)\n'
                                   '– Обладунок мага\n'
                                   '– Магічний дротик\n'
                                   '– Сон',
 'block-section-levels-1/row/1/1': 'Арканна традиція: Орден писарів\n'
                                   'Чарописне перо\n'
                                   'Пробуджена книга заклять\n'
                                   'Нові заклинання:\n'
                                   '– Поглинання стихій\n'
                                   '– Щит',
 'block-section-levels-1/row/2/1': 'Нові заклинання:\n'
                                   '– Земляна хватка Максиміліана\n'
                                   '– Уявна сила',
 'block-section-levels-1/row/3/1': 'Риса: Телекінетик (Інтелект 17 → 18)\n'
                                   'Нове відоме замовляння:\n'
                                   '– Мала ілюзія\n'
                                   'Нові заклинання:\n'
                                   '– Невидимість\n'
                                   '– Павутиння',
 'block-section-levels-1/row/4/1': 'Нові заклинання:\n'
                                   '– Виверження землі\n'
                                   '– Вогнекуля',
 'block-section-levels-1/row/5/1': 'Утілений розум\n'
                                   'Нові заклинання:\n'
                                   '– Достаток ворогів\n'
                                   '– Виклик немертвого',
 'block-section-levels-1/row/6/1': 'Нові заклинання:\n'
                                   '– Вигнання\n'
                                   '– Перевтілення',
 'block-section-levels-1/row/7/1': 'Покращення Характеристик (Інтелект 18 → '
                                   '20)\n'
                                   'Нові заклинання:\n'
                                   '– Чорні щупальця Еварда\n'
                                   '– Стіна вогню',
 'block-section-levels-1/row/8/1': 'Нові заклинання:\n'
                                   '– Виклик духу дракона\n'
                                   '– Синаптичний розряд',
 'block-section-levels-1/row/9/1': 'Майстер-переписувач\n'
                                   'Нове відоме замовляння:\n'
                                   '– Формування води\n'
                                   'Нові заклинання:\n'
                                   '– Телекінез\n'
                                   '– Стіна енергії',
 'block-section-levels-1/row/10/1': 'Нові заклинання:\n'
                                    '– Обачливість\n'
                                    '– Проклятуще око',
 'block-section-levels-1/row/11/1': 'Риса: Стійкий (Статура) (Статура 15 → '
                                    '16)\n'
                                    'Нові заклинання:\n'
                                    '– Ланцюгова блискавка\n'
                                    '– Розщеплення',
 'block-section-levels-1/row/12/1': 'Нові заклинання:\n'
                                    '– Корона зірок\n'
                                    '– Обернена гравітація',
 'block-section-levels-1/row/13/1': 'Єдиний зі Словом\n'
                                    'Нові заклинання:\n'
                                    '– Силова кліть\n'
                                    '– Телепорт',
 'block-section-levels-1/row/14/1': 'Нові заклинання:\n'
                                    '– Ілюзорний дракон\n'
                                    '– Клон',
 'block-section-levels-1/row/15/1': 'Покращення Характеристик / риса: '
                                    'будь-яка\n'
                                    'Нові заклинання:\n'
                                    '– Лабіринт\n'
                                    '– Симулякр',
 'block-section-levels-1/row/16/1': 'Нові заклинання:\n'
                                    '– Рій метеорів\n'
                                    '– [[1|Бажання]]',
 'block-section-levels-1/row/17/1': 'Майстерність заклинань:\n'
                                    '– Сріблясті шпильки\n'
                                    '– Павутиння\n'
                                    'Нові заклинання:\n'
                                    '– Психічний крик\n'
                                    '– [[1|Істинне перевтілення]]',
 'block-section-levels-1/row/18/1': 'Покращення Характеристик / риса: '
                                    'будь-яка\n'
                                    'Нові заклинання:\n'
                                    '– будь-яке\n'
                                    '– будь-яке',
 'block-section-levels-1/row/19/1': 'Підписні заклинання:\n'
                                    '– Вогнекуля\n'
                                    '– Мови\n'
                                    'Нові заклинання:\n'
                                    '– будь-яке\n'
                                    '– будь-яке',
 'block-section-levels-1/row/0/2': 'Для стартового спорядження візьміть '
                                   'кинджал, мішечок із компонентами або '
                                   'чаротворчий фокус, будь-який набір і книгу '
                                   'заклинань. Розщеплення Розуму [Mind '
                                   'Sliver] і Вогняний заряд [Fire Bolt] — '
                                   'наші головні наступальні варіанти. '
                                   'Вогняний заряд [Fire Bolt] — проти ворогів '
                                   'зі слабким КБ, а Розщеплення Розуму [Mind '
                                   'Sliver] — проти всіх решти. '
                                   '[[1|Штукарство]] дає нам трохи надійної '
                                   'утиліти. Його можна замінити на '
                                   '[[2|Магічну руку]] чи [[3|Формування '
                                   'води]], але, на мою думку, вони здаються '
                                   'трохи менш чарівницькими, а ми хочемо бути '
                                   'найчарівницькішим чарівником, що будь-коли '
                                   'чарівничив. У нас лише 2 слоти заклинань, '
                                   'а нам не можна померти, тож один із них '
                                   'віддано під Обладунок мага [Mage Armor]. '
                                   '«Магічне відновлення»{{Arcane Recovery}} '
                                   'повертає нам один слот за Короткий '
                                   'відпочинок, тож насправді їх 3, але це все '
                                   'одно небагато. Бережіть ці слоти на '
                                   'випадок, коли матимете великий вплив, '
                                   'як-от приспання купи слабких ворогів одним '
                                   'заклинанням. На цьому рівні ми беремо два '
                                   'ритуали, які одразу дадуть трохи користі. '
                                   'Заведіть сову-фамільяра (найкращого й '
                                   'найчарівницькішого фамільяра) і нехай вона '
                                   'літає навколо та виконує Допомогу для '
                                   'вашої групи. Також можна використати її, '
                                   'щоб допомогти собі перед накладанням '
                                   'Кольорової кульки [Chromatic Orb], і це '
                                   'переважить DPR Магічного дротика [Magic '
                                   'missile].',
 'block-section-levels-1/row/1/2': '«Чарописне перо»{{Wizardly Quill}} — це, '
                                   'по суті, безкоштовний вандалізм як класове '
                                   'уміння. Малюйте каракулі на всьому. '
                                   '«Пробуджена книга заклять»{{Awakened '
                                   'Spellbook}} — це те, з чого починається '
                                   'цікаве. Щоб користуватися перевагами цих '
                                   'умінь, потрібно тримати книгу заклинань у '
                                   'руках. Якщо магічні предмети можливі, '
                                   'пошукайте «Чаротворчий гримуар»{{Arcane '
                                   'Grimoire}} і зробіть його своєю '
                                   '«Пробудженою книгою заклять» (так, це '
                                   'дозволено). «Пробуджена книга заклять» '
                                   'дозволяє змінювати типи шкоди, а це '
                                   'означає, що настав час збирати заклинання, '
                                   'які завдають додаткових типів шкоди. '
                                   'Дивіться таблицю вище в розділі «Усі типи '
                                   'шкоди на кожному рівні». Також варто '
                                   'почати збирати ритуали. Буквально будь-яке '
                                   'заклинання, яке можна накласти як ритуал, '
                                   'має опинитися у вашій книзі заклинань, '
                                   'щойно ви зможете його отримати, не '
                                   'урізаючи бойових заклинань. На цьому рівні '
                                   'ми беремо два захисні заклинання. У нас '
                                   'досі дуже мало слотів заклинань, але '
                                   'витратити один слот, щоб не померти, — '
                                   'чудова інвестиція, і ці заклинання '
                                   'залишаться основними захисними варіантами '
                                   'впродовж усієї вашої карʼєри.',
 'block-section-levels-1/row/2/2': 'Використовуйте Земляну хватку Максиміліана '
                                   "[Maximilian's Earthen Grasp] проти фізично "
                                   'слабких, але розумово сильних ворогів, а '
                                   'Уявна сила [Phantasmal Force] — проти '
                                   'фізично сильних, але розумово слабких. За '
                                   'можливості вдарте істоту Розщепленням '
                                   'Розуму [Mind Sliver] на ході перед тим, як '
                                   'застосуєте будь-яке з цих заклинань, щоб '
                                   'початковий ряткидок, імовірно, був '
                                   'провалений. На жаль, це означає, що наразі '
                                   'ми добре готові лише до одиночних ворогів. '
                                   'Витратьте золото, щоб вивчити додаткові '
                                   'заклинання, і вивчіть Павутиння [Web] '
                                   'якнайраніше, якщо можете. Памʼятайте, що '
                                   'тип шкоди в них теж можна змінити. Зміна '
                                   'шкоди Уявної сили [Phantasmal Force] на '
                                   'дроблячу іноді корисна.',
 'block-section-levels-1/row/3/2': 'Так, ми рекомендуємо '
                                   '«Телекінетика»{{Telekinetic}} в ще одній '
                                   'збірці. Він дає нам +1 до Інтелекту, '
                                   'Магічну руку [Mage Hand] *і* круте '
                                   'переміщення бонусною дією. Ця збірка '
                                   'досить мало витрачає бонусну дію, тож '
                                   '«Телекінетика» легко вписати в більшість '
                                   'ходів. Це справді добра риса, і це один із '
                                   'найлегших виборів риси для Чарівника. '
                                   '[[1|«Доторк феї»]]{{Fey Touched}} чи '
                                   '[[2|«Доторк тіні»]]{{Shadow Touched}} теж '
                                   'підійшли б на цьому місці. Додавши Малу '
                                   'ілюзію [Minor Illusion] до наших '
                                   'замовлянь, ми отримуємо ще один '
                                   'утилітарний варіант. Технічно його можна '
                                   'навіть використовувати в бою. Спробуйте '
                                   'створити довкола себе кубічний ящик зі '
                                   'стороною 5 футів, щоб розірвати лінію '
                                   'видимості. Серед заклинань із рівнями ми '
                                   'беремо Невидимість [Invisibility] як '
                                   'утилітарний і підсилювальний варіант, а '
                                   'Павутиння [Web] — як варіант контролю '
                                   'натовпу по області. Павутиння [Web] — '
                                   'нещадно ефективний контроль натовпу на '
                                   'будь-якому рівні, і працює на всіх, окрім '
                                   'істот, що літають надто далеко від зручної '
                                   'стіни, стелі тощо.',
 'block-section-levels-1/row/4/2': 'Беремо Вогнекулю [Fireball], бо це '
                                   'найкраща шкода по області. Беремо '
                                   'Виверження землі [Erupting Earth], щоб '
                                   'зробити шкоду дроблячою. Заклинання '
                                   'Виверження землі [Erupting Earth] готувати '
                                   'не потрібно.',
 'block-section-levels-1/row/5/2': '«Утілений розум»{{Manifest Mind}} — '
                                   'справді чудовий. Він може розвідувати, має '
                                   'Темний зір, може телепатично передавати '
                                   'вам побачене й почуте, а ще він '
                                   'безтілесний, тож його не можна пошкодити '
                                   '(хіба що розвіяти). Принаймні можна '
                                   'пустити його в кімнату для відволікання, '
                                   'бо він видимий і світиться. Імовірніше, ви '
                                   'відправите його кудись на відстань і '
                                   'накладете заклинання, використавши '
                                   '«Утілений розум» як точку початку, що '
                                   'дозволить, наприклад, скинути Чорні '
                                   "щупальця Еварда [Evard's Black Tentacles] "
                                   'у замкнений простір за кілька кімнат від '
                                   'вас. Робити це можна лише кілька разів на '
                                   'день, але, чесно кажучи, якщо цього запасу '
                                   'не досить, щоб зробити величезну різницю, '
                                   'ви недостатньо творчо мислите. Правила '
                                   'руху «Утіленого розуму» *надзвичайно* '
                                   'поблажливі. Ви можете рухати розум куди '
                                   'завгодно, де бачите ви чи розум, у межах '
                                   'дальності 300 футів, тож він може облітати '
                                   'кути, пролазити крізь вузькі простори й '
                                   'загалом пролітати будь-де, де його не '
                                   'блокує твердий предмет. Розміри розуму не '
                                   'вказано, окрім того, що він «крихітний», '
                                   'тож, можливо, його вдасться просунути під '
                                   'двері чи крізь замкові шпарини. Достаток '
                                   'ворогів [Enemies Abound] — чудовий вибір у '
                                   'зіткненнях з одним великим і купою дрібних '
                                   'ворогів. Цільтеся у великого й нехай він '
                                   'розправляється з дрібними за вас. Звісно, '
                                   'Достаток ворогів [Enemies Abound] конкурує '
                                   'за місце з Уявна сила [Phantasmal Force]. '
                                   'Виклик немертвого [Summon Undead] стає '
                                   'основним вибором у бою. Щоразу, коли ви не '
                                   'підтримуєте Концентрацію на Земляній '
                                   "хватці Максиміліана [Maximilian's Earthen "
                                   'Grasp] чи Уявній силі [Phantasmal Force], '
                                   'вам, імовірно, варто підтримувати '
                                   'Концентрацію на Виклику немертвого [Summon '
                                   'Undead]. За можливості обовʼязково '
                                   'візьміть Контрчари [Counterspell], '
                                   'Розвіювання магії [Dispel Magic], '
                                   'Оживлений образ [Major Image] і Леомундову '
                                   "крихітну хатинку [Leomund's Tiny Hut]. "
                                   'Памʼятайте збирати ритуали де лише можете.',
 'block-section-levels-1/row/6/2': 'Вигнання [Banishment] — це '
                                   '«пройди-ряткидок-або-страждай»{{save-or-suck}} '
                                   'на ряткидку Харизми, а Перевтілення '
                                   '[Polymorph] може [[1|перетворити вас на '
                                   'тиранозавра]]. Будь-яке з них може '
                                   'кардинально змінити результат бою.',
 'block-section-levels-1/row/7/2': 'Ми доводимо Інтелект до максимуму на цьому '
                                   'рівні, і це приємно. Стіна вогню [Wall of '
                                   'Fire] — чудовий контроль області, і ми '
                                   'можемо змінити тип шкоди на дроблячу '
                                   "завдяки Чорним щупальцям Еварда [Evard's "
                                   'Black Tentacles], які теж є чудовим '
                                   'контролем області. Технічно ми могли б '
                                   'зробити так, щоб Чорні щупальця Еварда '
                                   "[Evard's Black Tentacles] завдавали "
                                   'вогняної шкоди, але… навіщо? Хіба що ви '
                                   'бʼєтеся з рослинами, єті чи кимось таким.',
 'block-section-levels-1/row/8/2': 'Виклик духу дракона [Summon Draconic '
                                   'Spirit] — це порівну скакун, утиліта (він '
                                   'може знаходити невидимих ворогів) і ручна '
                                   'зброя подиху. Він також може викликати '
                                   'купу типів шкоди, які ми можемо '
                                   'використати для Синаптичного розряду '
                                   '[Synaptic Static] чи для накладання '
                                   'Вогнекулі [Fireball] вищим слотом. '
                                   'Синаптичний розряд [Synaptic Static] — це '
                                   'Вогнекуля [Fireball] з величезним '
                                   'математичним послабленням. Навіть проти '
                                   'великих одиночних ворогів накласти його на '
                                   'першому ході може звести нанівець '
                                   'зіткнення з усім, що покладається на кидки '
                                   'атаки.',
 'block-section-levels-1/row/9/2': '«Майстер-переписувач»{{Master Scrivener}} '
                                   '— це фактично одне додаткове заклинання '
                                   '2-го рівня. Його накладають як заклинання '
                                   '3-го рівня, але на цьому рівні це не '
                                   'велика зміна. Заклинання не потрібно мати '
                                   'підготовленим, тож це добре для заклинань '
                                   'із довгою тривалістю, які ви точно '
                                   'накладете, але не накладатимете більше '
                                   'одного разу. Темний зір [Darkvision] — '
                                   'хороший приклад, хоч і не виграє від '
                                   'вищого рівня заклинання. Формуванням води '
                                   '[Shape Water] можна дуже зловживати, якщо '
                                   'довкола достатньо води. Поєднайте його з '
                                   'Телекінезом [Telekinesis], і можна скинути '
                                   'на істот блок льоду вагою 1000 фунтів. '
                                   'Або, імовірніше, ви просто використаєте '
                                   'Телекінез [Telekinesis], щоб підняти '
                                   'ворога. Щоб опиратися, потрібна '
                                   '*перевірка* Сили (не ряткидок), тож навіть '
                                   'сильним ворогам буде важко опиратися. Якщо '
                                   'ворогів кілька, можна підняти одного в '
                                   'повітря й скинути на іншого, роблячи обох '
                                   'Поваленими. Інакше можна просто тримати '
                                   'одного ворога в повітрі, поки ваша група '
                                   'нашаровує на нього шкоду. Стан Скований — '
                                   'це не зовсім Паралізований, але близько до '
                                   'нього. Стіна енергії [Wall of Force] '
                                   'саджає половину зіткнення в тайм-аут, поки '
                                   'ви з групою розбираєтеся з другою '
                                   'половиною.',
 'block-section-levels-1/row/10/2': '[[1|Обачливість — одне з моїх улюблених '
                                    'заклинань]] [Contingency]. Воно обмежене '
                                    'лише вашим вибором заклинань і вашою '
                                    'творчістю (і правилами самого заклинання, '
                                    'але це не суть). Якщо бракує ідей, '
                                    'спробуйте щось просте, як-от «коли я '
                                    'кидаю Ініціативу, накласти Більшу '
                                    'невидимість [Greater Invisibility]».',
 'block-section-levels-1/row/11/2': 'Так, я *б* із задоволенням змусив '
                                    'Ланцюгову блискавку [Chain Lightning] '
                                    'завдавати силової шкоди.',
 'block-section-levels-1/row/12/2': 'Корона зірок [Crown of Stars] триває '
                                    'годину, а частинки світла випускаються '
                                    'бонусною дією, тож її має бути нескладно '
                                    'вписати в більшість ходів. Шкода також '
                                    'променева, тож вам не доведеться багато '
                                    'перейматися опорами. На жаль, '
                                    'незрозуміло, як це взаємодіє з «Утіленим '
                                    'розумом»{{Manifest Mind}}. «Точкою '
                                    'початку» заклинання може бути розум, але '
                                    'воно націлене на себе, тож, можливо, '
                                    'просто не матиме ефекту. А може, розум '
                                    'стає ціллю, і ваша літаюча книга отримує '
                                    'корону зірок. А може, зірки обертаються '
                                    'навколо вас, але ви можете випускати їх '
                                    'із книги. Імовірно, правильний перший '
                                    'варіант, але певності немає. Якщо вам не '
                                    'подобається Корона зірок [Crown of '
                                    'Stars], розгляньте Вогнекулю відкладеної '
                                    'дії [Delayed Blast Fireball]. Разом з '
                                    '«Утіленим розумом» можна відправити розум '
                                    'до ворогів, зробити так, щоб вогнекуля '
                                    'виходила з розуму, а потім ганяти розум '
                                    'як відволікання, поки вогнекуля '
                                    'заряджається. Це не набагато краще, ніж '
                                    'просто накласти Вогнекулю [Fireball] '
                                    'вищим слотом, але кращого приводу '
                                    'використати Вогнекулю відкладеної дії '
                                    '[Delayed Blast Fireball] я не придумаю. '
                                    'Обернена гравітація [Reverse Gravity] — '
                                    'це весело, бо навіть на цьому рівні '
                                    'багато істот просто нічого не можуть із '
                                    'нею вдіяти. Жодного ряткидка, жодних '
                                    'дальніх атак, нічого. Звісно, вони можуть '
                                    'пройти ряткидок, щоб учепитися за щось, '
                                    'якщо поруч є щось відповідне, але вони '
                                    'все одно застрягають там, а якщо '
                                    'відпустять — злетять у повітря. Відправте '
                                    'свій «Утілений розум» у кімнату, '
                                    'обверніть гравітацію, щоб її мешканці '
                                    'опинилися на стелі, потім підведіть групу '
                                    'до краю області й хвилину розстрілюйте '
                                    'їх, як рибу в бочці, перш ніж скинути '
                                    'тих, хто вижив, на землю, завдавши шкоди '
                                    'від падіння,',
 'block-section-levels-1/row/13/2': '«Єдиний зі Словом»{{One with the Word}} — '
                                    '*дивний*. Реакцією ви скасовуєте шкоду, '
                                    'завдану вам. Забудьте Щит [Shield] чи '
                                    'Поглинання стихій [Absorb Elements]: '
                                    '«Єдиний зі Словом» кращий із величезним '
                                    'відривом. Складність у відстежуванні '
                                    'заклинань, якими ви сплатили цю ціну. '
                                    'Знадобиться електронна таблиця, і ні, я '
                                    'кажу це не заради драматизму. Таблиця '
                                    'справді тут допомагає, бо вам доведеться '
                                    'відстежувати випадкові перезарядки '
                                    'потенційно сотень заклинань. Так, сотень, '
                                    'бо ви вкладали кожну останню монету у '
                                    'вивчення більшої кількості заклинань саме '
                                    'для цього. І стежте, скільки заклинань ви '
                                    'використали, щоб живити «Єдиного зі '
                                    'Словом». Якщо ви скористалися ним і не '
                                    'можете сплатити ціну, ви одразу '
                                    'опускаєтеся до 0 ХП. 3к6 у середньому дає '
                                    '10,5, тож розраховуйте витрачати '
                                    'заклинань на 11 рівнів щоразу, коли '
                                    'використовуєте «Єдиного зі Словом». У '
                                    'списку заклинань Чарівника сотні '
                                    'заклинань із рівнями, і збирати їх слід, '
                                    'як дракон збирає скарби. І підтримуйте '
                                    'свою таблицю в актуальному стані. Ніхто '
                                    'інший цього за вас не зробить, а якщо вам '
                                    'доведеться перебудовувати таблицю щоразу, '
                                    'коли ви отримуєте шкоду, ваш Майстер убʼє '
                                    'вашого персонажа з вредності. Силова '
                                    'кліть [Forcecage] — це як Стіна енергії '
                                    '[Wall of Force] у вигляді півкулі, тільки '
                                    'більша, триває вшестеро довше й, що '
                                    'вирішально, не вимагає Концентрації. '
                                    'Накладіть заклинання, що завдає триваючої '
                                    'шкоди по області, як-от Чорні щупальця '
                                    "Еварда [Evard's Black Tentacles], а "
                                    'наступного ходу накладіть Силову кліть '
                                    '[Forcecage], перш ніж ваші жертви вийдуть '
                                    'за радіус дії заклинання шкоди. Телепорт '
                                    '[Teleport] приємний, бо тепер можна '
                                    'телепортуватися до улюбленої бібліотеки '
                                    'по нові заклинання. Скільки заклинань вам '
                                    'потрібно? Дурне питання. *Усі.* '
                                    'Памʼятайте: «Єдиний зі Словом» зважає на '
                                    'те, скільки всього у вашій книзі '
                                    'заклинань.',
 'block-section-levels-1/row/14/2': 'Ілюзорний дракон [Illusory Dragon] дає '
                                    'вам доступ до кількох типів шкоди на '
                                    'цьому рівні, а ще це й саме по собі '
                                    'напрочуд добре заклинання. Уявіть його як '
                                    'бойовий виклик на коротку тривалість. '
                                    'Клон [Clone] робить нас безсмертними. '
                                    'Ємність дорога, тож купу їх, імовірно, не '
                                    'захочеться, але один клон, захований '
                                    'десь, — чудова ідея. Як клонувати '
                                    'воєнокованого? Не ставте це під сумнів.',
 'block-section-levels-1/row/15/2': 'На цьому рівні в нас багато гнучкості '
                                    'щодо нашого Покращення Характеристик. '
                                    'Можна підвищити Статуру, щоб мати більше '
                                    'ХП і кращі ряткидки Статури, але у вас є '
                                    '«Єдиний зі Словом»{{One with the Word}}, '
                                    'щоб повністю скасовувати шкоду, а '
                                    'ряткидками Статури ми вже володіємо, тож '
                                    'там усе добре. Гібридні риси тут теж мало '
                                    'що дають. Симулякр [Simulacrum] — '
                                    'проблемно добрий. Звісно, симулякр не '
                                    'може відновлювати слоти заклинань чи '
                                    'здобувати рівні, але якщо у вашій групі є '
                                    'бійці, їм, імовірно, байдуже до слотів '
                                    'заклинань. Зробіть симулякрів усієї '
                                    'групи. Нехай вони вартують, поки ви '
                                    'спите. Нехай накладають ритуали. Нехай '
                                    'виконують ваші доручення. Ціль навіть не '
                                    'мусить бути згодною. Захопіть місцеву '
                                    'знать і замініть її симулякрами. До цього '
                                    'рівня [[1|вартість накладання в 1500 зм '
                                    'дуже доступна]]. Або можна почекати ще '
                                    'один рівень і використати Бажання [Wish], '
                                    'щоб накласти Симулякр [Simulacrum] '
                                    'безкоштовно однією дією. Розгляньте '
                                    '[[2|«Містичного адепта»]]{{Eldritch '
                                    'Adept}} чи [[3|«Адепта '
                                    'метамагії»]]{{Metamagic Adept}}.',
 'block-section-levels-1/row/16/2': 'Дещо безглузде про Рій метеорів [Meteor '
                                    'Swarm]: оскільки він завдає і вогняної, і '
                                    'дроблячої шкоди, ви можете змінити типи '
                                    'шкоди на вогняну або на дроблячу. Це '
                                    'стосується й Рою метеорів [Meteor Swarm], '
                                    'тож ви можете використати Рій метеорів '
                                    '[Meteor Swarm], щоб змінити тип шкоди Рою '
                                    'метеорів [Meteor Swarm] на повністю '
                                    'вогняну або повністю дроблячу. Беріть '
                                    'повністю дроблячу. Я не знаю, як Бажання '
                                    '[Wish] взаємодіє зі здатністю '
                                    '«Пробудженої книги заклять»{{Awakened '
                                    'Spellbook}} змінювати типи шкоди. Воно '
                                    'або дає вам кожен тип шкоди, або нічого '
                                    'не робить. Як Майстер, я б ухвалив, що '
                                    'воно нічого не робить. Бажання [Wish] і '
                                    'так достатньо потужне саме по собі. Цей '
                                    'рівень також відкриває нам заклинання '
                                    '9-го рівня, а це означає, що весь наш '
                                    'список заклинань лежить на столі і для '
                                    'накладання, і для живлення «Єдиного зі '
                                    'Словом». Оберіть 6 заклинань 9-го рівня, '
                                    'які вам геть байдужі, і плануйте вивчити '
                                    'їх на 18-му, 19-му й 20-му рівнях. Потім '
                                    'витратьте купу золота, щоб вписати все '
                                    'інше до книги заклинань. Одне заклинання '
                                    '9-го рівня майже саме по собі досить, щоб '
                                    'живити одне використання «Єдиного зі '
                                    'Словом», тож додавання їх купи різко '
                                    'збільшує, як часто ви можете ним '
                                    'користуватися.',
 'block-section-levels-1/row/17/2': 'Зазвичай я рекомендую Поглинання стихій '
                                    '[Absorb Elements] або Щит [Shield] для '
                                    '«Майстерності заклинань»{{Spell '
                                    'Mastery}}, але для цього є «Єдиний зі '
                                    'Словом», тож раптом у нас лишається цей '
                                    'надпотужний ресурс. [[1|Сріблясті '
                                    'шпильки]] — це приблизно максимум '
                                    'клопоту, який ми можемо створити '
                                    'безмежним заклинанням 1-го рівня, але '
                                    'вони конкурують з «Єдиним зі Словом» за '
                                    'нашу Реакцію, а ще ваш Майстер вас '
                                    "зненавидить. Огидний сміх Таші [Tasha's "
                                    'Hideous Laughter] — пристойний запасний '
                                    'варіант. Павутиння [Web] — це просто '
                                    'добрий контроль області, а з тривалістю 1 '
                                    'година ним можна часто блокувати вузькі '
                                    'проходи на кшталт дверей, поки ви берете '
                                    'короткий відпочинок, читаєте книгу чи '
                                    'щось таке. Я дуже довго недооцінював '
                                    'Психічний крик [Psychic Scream], і це '
                                    'була помилка. Ряткидки Інтелекту зазвичай '
                                    'дуже низькі навіть на високих рівнях, а '
                                    'приголомшення з необмеженою тривалістю '
                                    'легко може виграти цілі зіткнення одним '
                                    'заклинанням. Також можна змінити тип '
                                    'шкоди на дроблячу й кричати на людей '
                                    'камінням.',
 'block-section-levels-1/row/18/2': 'Чесно кажучи, я не знаю, що робити з цим '
                                    'рівнем. Ми вже настільки шалено й '
                                    'недосяжно потужні, що робити особливо '
                                    'нічого. Може, взяти «Бойового '
                                    'заклинателя»{{War Caster}} чи щось таке?',
 'block-section-levels-1/row/19/2': '«Підписні заклинання»{{Signature Spells}} '
                                    'усе ще розчаровують як завершальне '
                                    'уміння. Два додаткові заклинання 3-го '
                                    'рівня підготовлені, і кожне можна '
                                    'накласти раз на день безкоштовно. '
                                    'Візьмемо Вогнекулю [Fireball], бо це все '
                                    'ще добра шкода по області, і Мови '
                                    '[Tongues], щоб не було мовного барʼєра, '
                                    'коли ми спамитимемо Огидний сміх Таші '
                                    "[Tasha's Hideous Laughter]."}

FRAGMENTS = refs.expand_all(FRAGMENTS)
