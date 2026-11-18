// Catálogo global de ejercicios de fuerza de Ritmo, con cuánto trabaja cada
// uno cada músculo: 1.0 principal, 0.5 secundario, 0.25 indirecto. Son los
// valores de partida; se guardan en `ritmo_exercise_muscle` y se pueden
// ajustar por ejercicio sin tocar código.

export type Muscle =
  | 'CHEST'
  | 'LATS'
  | 'TRAPS'
  | 'FRONT_DELT'
  | 'SIDE_DELT'
  | 'REAR_DELT'
  | 'BICEPS'
  | 'TRICEPS'
  | 'FOREARMS'
  | 'QUADS'
  | 'HAMSTRINGS'
  | 'GLUTES'
  | 'CALVES'
  | 'ABS'
  | 'LOWER_BACK';

export interface SeedExercise {
  code: string;
  name: string;
  compound?: boolean;
  bodyweight?: boolean;
  /** Principales (1.0). */
  p: Muscle[];
  /** Secundarios (0.5). */
  s?: Muscle[];
  /** Indirectos (0.25). */
  i?: Muscle[];
  /** Qué es y qué trabaja, para la ficha del ejercicio. */
  description: string;
  /** Técnica paso a paso, en orden. */
  steps: string[];
}

export const EXERCISES: readonly SeedExercise[] = [
  // Empuje
  {
    code: 'bench_press',
    name: 'Press de banca',
    compound: true,
    p: ['CHEST'],
    s: ['TRICEPS', 'FRONT_DELT'],
    description:
      'Tumbado en un banco plano, bajas una barra hasta el pecho y la empujas hacia arriba. El ejercicio básico de pecho; también trabaja tríceps y la parte delantera del hombro.',
    steps: [
      'Túmbate con los ojos bajo la barra y los pies firmes en el suelo.',
      'Agarra la barra algo más abierto que los hombros y junta las escápulas.',
      'Bájala controlada hasta la parte baja del pecho, con los codos a unos 45° del cuerpo.',
      'Empuja hasta estirar los brazos sin despegar la espalda ni los glúteos del banco.',
    ],
  },
  {
    code: 'incline_bench_press',
    name: 'Press inclinado con barra',
    compound: true,
    p: ['CHEST'],
    s: ['FRONT_DELT', 'TRICEPS'],
    description:
      'Press de banca con el respaldo inclinado (30–45°). Carga más la parte alta del pecho y el hombro delantero que el press plano.',
    steps: [
      'Inclina el banco entre 30 y 45° y siéntate con la espalda bien apoyada.',
      'Saca la barra con los brazos estirados encima de los hombros.',
      'Bájala hasta la parte alta del pecho, justo bajo las clavículas.',
      'Empuja hacia arriba y un poco hacia atrás hasta estirar los brazos.',
    ],
  },
  {
    code: 'dumbbell_bench_press',
    name: 'Press de banca con mancuernas',
    compound: true,
    p: ['CHEST'],
    s: ['TRICEPS', 'FRONT_DELT'],
    description:
      'El press de banca con una mancuerna en cada mano. Permite más recorrido que la barra y obliga a cada brazo a trabajar por su cuenta.',
    steps: [
      'Túmbate en el banco con una mancuerna en cada mano a la altura del pecho.',
      'Empújalas hacia arriba hasta que casi se toquen, con los brazos estirados.',
      'Bájalas abriendo los codos a unos 45° hasta notar el estiramiento del pecho.',
      'Vuelve a subir sin chocar las mancuernas arriba.',
    ],
  },
  {
    code: 'chest_fly',
    name: 'Aperturas de pecho',
    p: ['CHEST'],
    i: ['FRONT_DELT'],
    description:
      'Abres y cierras los brazos en arco con los codos casi estirados, con mancuernas, máquina o poleas. Aísla el pecho sin que intervenga el tríceps.',
    steps: [
      'Empieza con los brazos estirados delante del pecho y los codos un poco flexionados.',
      'Abre los brazos en arco hasta notar el estiramiento del pecho.',
      'Mantén el mismo ángulo de codo durante todo el recorrido.',
      'Cierra apretando el pecho como si abrazaras un árbol.',
    ],
  },
  {
    code: 'push_up',
    name: 'Flexiones',
    compound: true,
    bodyweight: true,
    p: ['CHEST'],
    s: ['TRICEPS', 'FRONT_DELT'],
    i: ['ABS'],
    description:
      'Con las manos y las puntas de los pies en el suelo, bajas el cuerpo recto hasta casi tocar el suelo y vuelves a subir. Pecho, tríceps y abdomen sin material.',
    steps: [
      'Apoya las manos algo más abiertas que los hombros y estira el cuerpo en una línea.',
      'Aprieta abdomen y glúteos para que la cadera no se hunda.',
      'Baja doblando los codos hacia atrás hasta que el pecho casi toque el suelo.',
      'Empuja el suelo hasta estirar los brazos.',
    ],
  },
  {
    code: 'dip',
    name: 'Fondos en paralelas',
    compound: true,
    bodyweight: true,
    p: ['CHEST', 'TRICEPS'],
    s: ['FRONT_DELT'],
    description:
      'Suspendido entre dos barras paralelas, bajas el cuerpo doblando los codos y vuelves a subir. Inclinarte hacia delante carga más el pecho; ir recto, el tríceps.',
    steps: [
      'Sujétate en las paralelas con los brazos estirados y los hombros lejos de las orejas.',
      'Inclina un poco el torso hacia delante y cruza los pies si te ayuda.',
      'Baja doblando los codos hasta que el brazo quede paralelo al suelo.',
      'Empuja hasta estirar los brazos de nuevo.',
    ],
  },
  {
    code: 'overhead_press',
    name: 'Press militar',
    compound: true,
    p: ['FRONT_DELT'],
    s: ['SIDE_DELT', 'TRICEPS'],
    i: ['TRAPS', 'ABS'],
    description:
      'De pie, empujas una barra desde los hombros hasta encima de la cabeza. El básico de hombro, que además exige un tronco firme.',
    steps: [
      'Coloca la barra sobre la parte alta del pecho con las manos a la anchura de los hombros.',
      'Aprieta glúteos y abdomen para no arquear la espalda.',
      'Empuja la barra en vertical, apartando la cabeza un poco hacia atrás al pasar.',
      'Termina con los brazos estirados y la barra sobre la coronilla; baja controlado.',
    ],
  },
  {
    code: 'dumbbell_shoulder_press',
    name: 'Press de hombro con mancuernas',
    compound: true,
    p: ['FRONT_DELT'],
    s: ['SIDE_DELT', 'TRICEPS'],
    description:
      'Sentado o de pie, empujas dos mancuernas desde los hombros hasta encima de la cabeza. Como el press militar, pero con más libertad para cada brazo.',
    steps: [
      'Siéntate con la espalda apoyada y las mancuernas a la altura de las orejas.',
      'Empújalas hacia arriba hasta estirar los brazos, sin chocarlas.',
      'Baja controlado hasta que los codos queden algo por debajo de los hombros.',
    ],
  },
  {
    code: 'lateral_raise',
    name: 'Elevaciones laterales',
    p: ['SIDE_DELT'],
    i: ['TRAPS'],
    description:
      'De pie, subes los brazos hacia los lados hasta la altura de los hombros. Aísla la parte lateral del hombro, la que da anchura.',
    steps: [
      'De pie, con una mancuerna en cada mano a los lados del cuerpo.',
      'Con los codos un poco flexionados, sube los brazos hacia los lados.',
      'Para cuando las manos lleguen a la altura de los hombros.',
      'Baja despacio, sin balancear el cuerpo.',
    ],
  },
  {
    code: 'triceps_pushdown',
    name: 'Extensión de tríceps en polea',
    p: ['TRICEPS'],
    description:
      'De pie frente a una polea alta, empujas la barra o la cuerda hacia abajo estirando los codos. Aísla el tríceps.',
    steps: [
      'Agarra la barra o la cuerda con los codos pegados a los costados.',
      'Estira los codos empujando hacia abajo hasta tener los brazos rectos.',
      'Sube controlado hasta que el antebrazo pase de la horizontal.',
      'Los codos no se mueven: solo trabaja el antebrazo.',
    ],
  },
  {
    code: 'skull_crusher',
    name: 'Press francés',
    p: ['TRICEPS'],
    description:
      'Tumbado, bajas una barra (o mancuernas) hacia la frente doblando solo los codos y la vuelves a subir. Trabaja mucho la cabeza larga del tríceps.',
    steps: [
      'Túmbate en un banco con la barra sobre el pecho y los brazos estirados.',
      'Lleva los brazos un poco hacia atrás, hacia la cabeza.',
      'Dobla los codos para bajar la barra hasta la frente o por detrás de ella.',
      'Estira los codos sin mover los brazos.',
    ],
  },
  // Tirón
  {
    code: 'pull_up',
    name: 'Dominadas',
    compound: true,
    bodyweight: true,
    p: ['LATS'],
    s: ['BICEPS', 'REAR_DELT'],
    i: ['FOREARMS', 'TRAPS'],
    description:
      'Colgado de una barra, subes el cuerpo hasta pasar la barbilla por encima. El ejercicio rey de espalda con el peso del cuerpo.',
    steps: [
      'Cuélgate con las manos algo más abiertas que los hombros y los brazos estirados.',
      'Baja los hombros y junta las escápulas antes de tirar.',
      'Tira llevando los codos hacia las costillas hasta pasar la barbilla de la barra.',
      'Baja controlado hasta estirar los brazos del todo.',
    ],
  },
  {
    code: 'lat_pulldown',
    name: 'Jalón al pecho',
    compound: true,
    p: ['LATS'],
    s: ['BICEPS'],
    i: ['REAR_DELT', 'FOREARMS'],
    description:
      'Sentado en la máquina, tiras de una barra desde arriba hasta la parte alta del pecho. El mismo gesto que la dominada, pero con el peso que elijas.',
    steps: [
      'Siéntate con los muslos bajo los rodillos y agarra la barra abierta.',
      'Inclina el torso un poco hacia atrás y saca pecho.',
      'Tira de la barra hasta la parte alta del pecho llevando los codos hacia abajo.',
      'Sube controlado hasta estirar los brazos.',
    ],
  },
  {
    code: 'barbell_row',
    name: 'Remo con barra',
    compound: true,
    p: ['LATS'],
    s: ['TRAPS', 'REAR_DELT', 'BICEPS'],
    i: ['LOWER_BACK', 'FOREARMS'],
    description:
      'Inclinado hacia delante con la espalda recta, tiras de una barra hacia el abdomen. Trabaja toda la espalda y obliga a la zona lumbar a sostener la postura.',
    steps: [
      'De pie con la barra en las manos, flexiona un poco las rodillas.',
      'Inclina el torso hacia delante, entre 45° y casi horizontal, con la espalda recta.',
      'Tira de la barra hacia el ombligo llevando los codos hacia atrás.',
      'Baja controlado sin perder la postura de la espalda.',
    ],
  },
  {
    code: 'dumbbell_row',
    name: 'Remo con mancuerna',
    compound: true,
    p: ['LATS'],
    s: ['TRAPS', 'REAR_DELT', 'BICEPS'],
    i: ['FOREARMS'],
    description:
      'Con una mano y una rodilla apoyadas en el banco, tiras de una mancuerna hacia la cadera. Remo a un brazo que protege la espalda.',
    steps: [
      'Apoya una mano y la misma rodilla en un banco, con la espalda paralela al suelo.',
      'Con el otro brazo estirado, sujeta la mancuerna colgando.',
      'Tira de ella hacia la cadera llevando el codo pegado al cuerpo.',
      'Baja despacio hasta estirar el brazo.',
    ],
  },
  {
    code: 'seated_cable_row',
    name: 'Remo en polea baja',
    compound: true,
    p: ['LATS'],
    s: ['TRAPS', 'REAR_DELT', 'BICEPS'],
    description:
      'Sentado frente a una polea baja, tiras del agarre hacia el abdomen manteniendo el torso quieto. Espalda media y dorsales con tensión constante.',
    steps: [
      'Siéntate con los pies apoyados y las rodillas un poco flexionadas.',
      'Agarra el maneral con los brazos estirados y la espalda recta.',
      'Tira hacia el abdomen juntando las escápulas, sin echarte hacia atrás.',
      'Deja volver el peso estirando los brazos, sin encorvar la espalda.',
    ],
  },
  {
    code: 'face_pull',
    name: 'Face pull',
    p: ['REAR_DELT'],
    s: ['TRAPS'],
    description:
      'Tiras de una cuerda en polea alta hacia la cara, abriendo los codos. Trabaja la parte de atrás del hombro y ayuda a mantener los hombros sanos.',
    steps: [
      'Coloca la polea a la altura de la cara y agarra la cuerda con las palmas hacia abajo.',
      'Da un paso atrás hasta tener los brazos estirados y tensión en el cable.',
      'Tira de la cuerda hacia la frente separando las manos y abriendo los codos.',
      'Vuelve despacio a estirar los brazos.',
    ],
  },
  {
    code: 'reverse_fly',
    name: 'Pájaros (aperturas posteriores)',
    p: ['REAR_DELT'],
    i: ['TRAPS'],
    description:
      'Inclinado hacia delante, abres los brazos hacia los lados como si fueran alas. Aísla la parte de atrás del hombro.',
    steps: [
      'Inclina el torso hacia delante con la espalda recta y una mancuerna en cada mano.',
      'Deja los brazos colgando con los codos un poco flexionados.',
      'Ábrelos hacia los lados hasta la altura de los hombros.',
      'Baja despacio sin balancear el cuerpo.',
    ],
  },
  {
    code: 'shrug',
    name: 'Encogimientos de hombros',
    p: ['TRAPS'],
    i: ['FOREARMS'],
    description:
      'De pie con peso en las manos, subes los hombros hacia las orejas y los bajas. Aísla el trapecio superior.',
    steps: [
      'De pie, con la barra o las mancuernas colgando delante o a los lados.',
      'Sube los hombros en vertical hacia las orejas, sin doblar los codos.',
      'Aguanta un segundo arriba.',
      'Baja despacio hasta estirar bien el trapecio.',
    ],
  },
  {
    code: 'barbell_curl',
    name: 'Curl con barra',
    p: ['BICEPS'],
    s: ['FOREARMS'],
    description:
      'De pie, subes una barra doblando los codos, sin mover los brazos. El básico de bíceps.',
    steps: [
      'De pie, con la barra cogida por debajo y los brazos estirados.',
      'Pega los codos a los costados.',
      'Dobla los codos para subir la barra hasta los hombros.',
      'Baja despacio hasta estirar los brazos, sin balancear el cuerpo.',
    ],
  },
  {
    code: 'dumbbell_curl',
    name: 'Curl con mancuernas',
    p: ['BICEPS'],
    s: ['FOREARMS'],
    description:
      'Como el curl con barra, pero con una mancuerna en cada mano. Puedes girar la muñeca al subir para apretar más el bíceps.',
    steps: [
      'De pie, con una mancuerna en cada mano y las palmas mirando hacia delante.',
      'Con los codos pegados al cuerpo, dobla los codos para subir las mancuernas.',
      'Aprieta el bíceps arriba.',
      'Baja despacio hasta estirar los brazos.',
    ],
  },
  {
    code: 'hammer_curl',
    name: 'Curl martillo',
    p: ['BICEPS', 'FOREARMS'],
    description:
      'Curl con las palmas mirándose, como si sujetaras un martillo. Trabaja el bíceps y, sobre todo, el braquial y el antebrazo.',
    steps: [
      'De pie, con una mancuerna en cada mano y las palmas mirando hacia el cuerpo.',
      'Sube las mancuernas doblando los codos, sin girar la muñeca.',
      'Baja despacio hasta estirar los brazos.',
    ],
  },
  {
    code: 'wrist_curl',
    name: 'Curl de muñeca',
    p: ['FOREARMS'],
    description:
      'Con el antebrazo apoyado, subes y bajas el peso moviendo solo la muñeca. Fortalece el antebrazo y el agarre.',
    steps: [
      'Sentado, apoya los antebrazos en los muslos o en un banco con las muñecas por fuera.',
      'Deja caer la barra o la mancuerna doblando la muñeca hacia abajo.',
      'Súbela doblando la muñeca hacia arriba, sin mover el antebrazo.',
    ],
  },
  // Pierna
  {
    code: 'back_squat',
    name: 'Sentadilla con barra',
    compound: true,
    p: ['QUADS', 'GLUTES'],
    s: ['HAMSTRINGS', 'LOWER_BACK'],
    i: ['ABS', 'CALVES'],
    description:
      'Con una barra sobre la espalda, bajas doblando cadera y rodillas como para sentarte y vuelves a subir. El ejercicio básico de pierna.',
    steps: [
      'Apoya la barra sobre los trapecios y separa los pies a la anchura de los hombros.',
      'Coge aire, aprieta el abdomen y empieza a bajar llevando la cadera atrás.',
      'Baja hasta que los muslos queden paralelos al suelo o algo más, con las rodillas siguiendo la punta de los pies.',
      'Sube empujando el suelo con todo el pie, con la espalda recta.',
    ],
  },
  {
    code: 'front_squat',
    name: 'Sentadilla frontal',
    compound: true,
    p: ['QUADS'],
    s: ['GLUTES'],
    i: ['ABS', 'LOWER_BACK'],
    description:
      'Sentadilla con la barra delante, apoyada sobre los hombros. El torso va más vertical y el cuádriceps trabaja más.',
    steps: [
      'Apoya la barra sobre la parte delantera de los hombros con los codos altos.',
      'Separa los pies a la anchura de los hombros.',
      'Baja con el torso lo más vertical posible, sin dejar caer los codos.',
      'Sube empujando el suelo hasta estirar las piernas.',
    ],
  },
  {
    code: 'leg_press',
    name: 'Prensa de piernas',
    compound: true,
    p: ['QUADS'],
    s: ['GLUTES'],
    i: ['HAMSTRINGS'],
    description:
      'Sentado en la máquina, empujas una plataforma con los pies. Mucho trabajo de pierna con la espalda apoyada.',
    steps: [
      'Siéntate con la espalda bien apoyada y los pies a la anchura de los hombros en la plataforma.',
      'Quita los seguros y baja la plataforma doblando las rodillas hacia el pecho.',
      'Para antes de que la zona lumbar se despegue del respaldo.',
      'Empuja hasta casi estirar las piernas, sin bloquear las rodillas.',
    ],
  },
  {
    code: 'lunge',
    name: 'Zancadas',
    compound: true,
    p: ['QUADS', 'GLUTES'],
    s: ['HAMSTRINGS'],
    i: ['CALVES'],
    description:
      'Das un paso largo y bajas hasta que la rodilla de atrás casi toca el suelo. Trabaja cada pierna por separado y mejora el equilibrio.',
    steps: [
      'De pie, con el peso en las manos o sin él, da un paso largo hacia delante.',
      'Baja en vertical hasta que las dos rodillas formen unos 90°.',
      'La rodilla de atrás queda a un palmo del suelo.',
      'Empuja con el pie de delante para volver a la posición inicial.',
    ],
  },
  {
    code: 'bulgarian_split_squat',
    name: 'Sentadilla búlgara',
    compound: true,
    p: ['QUADS', 'GLUTES'],
    s: ['HAMSTRINGS'],
    description:
      'Zancada estática con el pie de atrás apoyado en un banco. Una de las mejores para pierna y glúteo a una pierna.',
    steps: [
      'De espaldas a un banco, apoya en él el empeine del pie de atrás.',
      'Adelanta el otro pie lo suficiente para que la rodilla no pase mucho de la punta.',
      'Baja en vertical hasta que el muslo de delante quede paralelo al suelo.',
      'Sube empujando con el pie de delante.',
    ],
  },
  {
    code: 'leg_extension',
    name: 'Extensión de cuádriceps',
    p: ['QUADS'],
    description:
      'Sentado en la máquina, estiras las rodillas levantando el rodillo con los tobillos. Aísla el cuádriceps.',
    steps: [
      'Siéntate con la espalda apoyada y el rodillo sobre los tobillos.',
      'Ajusta la máquina para que la rodilla quede alineada con el eje.',
      'Estira las piernas hasta tenerlas rectas y aprieta un segundo.',
      'Baja despacio sin dejar que el peso golpee.',
    ],
  },
  {
    code: 'deadlift',
    name: 'Peso muerto',
    compound: true,
    p: ['HAMSTRINGS', 'GLUTES', 'LOWER_BACK'],
    s: ['TRAPS', 'QUADS', 'FOREARMS'],
    i: ['LATS'],
    description:
      'Levantas una barra del suelo hasta quedar de pie, con la espalda recta. Trabaja toda la cadena posterior: isquios, glúteos y espalda.',
    steps: [
      'Ponte con la barra sobre la mitad del pie y agárrala justo por fuera de las piernas.',
      'Baja la cadera, saca pecho y pon la espalda recta.',
      'Empuja el suelo con las piernas y lleva la cadera hacia delante, con la barra pegada al cuerpo.',
      'Termina de pie, sin echarte hacia atrás, y baja la barra por el mismo camino.',
    ],
  },
  {
    code: 'romanian_deadlift',
    name: 'Peso muerto rumano',
    compound: true,
    p: ['HAMSTRINGS'],
    s: ['GLUTES', 'LOWER_BACK'],
    i: ['FOREARMS'],
    description:
      'Desde de pie, bajas la barra llevando la cadera atrás con las piernas casi estiradas. Estira y fortalece los isquiotibiales.',
    steps: [
      'De pie con la barra en las manos y las rodillas un poco flexionadas.',
      'Lleva la cadera hacia atrás y deja que la barra baje pegada a las piernas.',
      'Baja hasta notar el estiramiento de los isquios, más o menos por debajo de las rodillas.',
      'Sube llevando la cadera hacia delante, con la espalda recta todo el rato.',
    ],
  },
  {
    code: 'good_morning',
    name: 'Good morning con barra',
    compound: true,
    p: ['HAMSTRINGS', 'LOWER_BACK'],
    s: ['GLUTES'],
    description:
      'Con la barra sobre la espalda, inclinas el torso hacia delante llevando la cadera atrás, como en una reverencia, y vuelves a subir. Trabaja isquios y zona lumbar. En algunos gimnasios lo llaman «buenos días».',
    steps: [
      'Apoya la barra sobre los trapecios como en la sentadilla, con los pies a la anchura de la cadera.',
      'Flexiona un poco las rodillas y mantenlas así todo el ejercicio.',
      'Lleva la cadera hacia atrás e inclina el torso con la espalda recta hasta casi la horizontal.',
      'Sube llevando la cadera hacia delante hasta quedar de pie.',
    ],
  },
  {
    code: 'leg_curl',
    name: 'Curl femoral',
    p: ['HAMSTRINGS'],
    description:
      'En la máquina, tumbado o sentado, doblas las rodillas llevando el rodillo hacia los glúteos. Aísla los isquiotibiales.',
    steps: [
      'Colócate en la máquina con el rodillo justo por encima de los talones.',
      'Dobla las rodillas llevando los talones hacia los glúteos.',
      'Aprieta un segundo con las rodillas dobladas.',
      'Estira las piernas despacio, sin dejar caer el peso.',
    ],
  },
  {
    code: 'hip_thrust',
    name: 'Hip thrust',
    compound: true,
    p: ['GLUTES'],
    s: ['HAMSTRINGS'],
    i: ['QUADS'],
    description:
      'Con la espalda alta apoyada en un banco y una barra sobre la cadera, subes la cadera hasta alinear el cuerpo. El ejercicio que más carga el glúteo.',
    steps: [
      'Siéntate en el suelo con la parte alta de la espalda contra un banco y la barra sobre la cadera.',
      'Apoya los pies en el suelo, a la anchura de la cadera, con las rodillas dobladas.',
      'Sube la cadera apretando los glúteos hasta que el tronco quede paralelo al suelo.',
      'Baja controlado sin tocar el suelo con los glúteos.',
    ],
  },
  {
    code: 'calf_raise',
    name: 'Elevación de gemelos',
    p: ['CALVES'],
    description:
      'De pie, subes sobre las puntas de los pies y bajas despacio. Trabaja los gemelos.',
    steps: [
      'Ponte con las puntas de los pies sobre un escalón o la plataforma de la máquina.',
      'Deja bajar los talones hasta notar el estiramiento.',
      'Sube todo lo que puedas sobre las puntas y aguanta un segundo.',
      'Baja despacio.',
    ],
  },
  // Core
  {
    code: 'plank',
    name: 'Plancha',
    bodyweight: true,
    p: ['ABS'],
    i: ['LOWER_BACK'],
    description:
      'Apoyado en los antebrazos y las puntas de los pies, mantienes el cuerpo recto sin moverte. Ejercicio isométrico de abdomen.',
    steps: [
      'Apoya los antebrazos en el suelo con los codos bajo los hombros.',
      'Estira las piernas y apóyate en las puntas de los pies.',
      'Aprieta abdomen y glúteos para que el cuerpo forme una línea recta.',
      'Aguanta respirando con normalidad, sin hundir ni subir la cadera.',
    ],
  },
  {
    code: 'crunch',
    name: 'Crunch abdominal',
    bodyweight: true,
    p: ['ABS'],
    description:
      'Tumbado boca arriba con las rodillas dobladas, despegas los hombros del suelo encogiendo el abdomen.',
    steps: [
      'Túmbate boca arriba con las rodillas dobladas y los pies en el suelo.',
      'Pon las manos en el pecho o junto a las sienes, sin tirar del cuello.',
      'Encoge el abdomen para despegar los hombros del suelo.',
      'Baja despacio sin apoyar del todo la cabeza.',
    ],
  },
  {
    code: 'hanging_leg_raise',
    name: 'Elevación de piernas colgado',
    bodyweight: true,
    p: ['ABS'],
    i: ['FOREARMS'],
    description:
      'Colgado de una barra, subes las piernas hasta la horizontal o más. Trabaja el abdomen, sobre todo la parte baja.',
    steps: [
      'Cuélgate de la barra con los brazos estirados y el cuerpo quieto.',
      'Sube las piernas juntas, rectas o con las rodillas dobladas, hasta la altura de la cadera.',
      'Inclina un poco la pelvis hacia arriba al final.',
      'Baja despacio sin balancearte.',
    ],
  },
  {
    code: 'back_extension',
    name: 'Hiperextensiones lumbares',
    bodyweight: true,
    p: ['LOWER_BACK'],
    s: ['GLUTES', 'HAMSTRINGS'],
    description:
      'En el banco de hiperextensiones, bajas el torso doblando la cadera y lo subes hasta alinearlo con las piernas. Fortalece zona lumbar y glúteos.',
    steps: [
      'Colócate en el banco con la cadera justo por encima del apoyo y los tobillos sujetos.',
      'Cruza los brazos sobre el pecho.',
      'Baja el torso doblando la cadera, con la espalda recta.',
      'Sube hasta que el cuerpo quede en línea recta, sin arquear de más.',
    ],
  },
  // ── Máquinas, poleas y variantes (los del export de Hevy) ────────────────
  {
    code: 'smith_bench_press',
    name: 'Press de banca en máquina Smith',
    compound: true,
    p: ['CHEST'],
    s: ['TRICEPS', 'FRONT_DELT'],
    description:
      'Press de banca con la barra guiada por los raíles de la máquina Smith (multipower). Más estable que la barra libre, así que puedes centrarte en empujar.',
    steps: [
      'Coloca el banco para que la barra baje a la parte baja del pecho.',
      'Agarra la barra algo más abierto que los hombros y desbloquéala girando las muñecas.',
      'Bájala controlada hasta rozar el pecho, con los codos a unos 45° del cuerpo.',
      'Empuja hasta estirar los brazos y vuelve a bloquearla al terminar.',
    ],
  },
  {
    code: 'smith_incline_bench_press',
    name: 'Press inclinado en máquina Smith',
    compound: true,
    p: ['CHEST'],
    s: ['FRONT_DELT', 'TRICEPS'],
    description:
      'Press inclinado con la barra guiada de la máquina Smith. Carga la parte alta del pecho con un recorrido estable.',
    steps: [
      'Inclina el banco entre 30 y 45° y colócalo para que la barra baje a la parte alta del pecho.',
      'Desbloquea la barra con los brazos estirados.',
      'Bájala hasta justo debajo de las clavículas.',
      'Empuja hasta estirar los brazos.',
    ],
  },
  {
    code: 'smith_decline_bench_press',
    name: 'Press declinado en máquina Smith',
    compound: true,
    p: ['CHEST'],
    s: ['TRICEPS'],
    i: ['FRONT_DELT'],
    description:
      'Press en banco declinado (la cabeza más baja que la cadera) con barra guiada. Carga más la parte baja del pecho y menos el hombro.',
    steps: [
      'Túmbate en el banco declinado con las piernas sujetas.',
      'Desbloquea la barra con los brazos estirados sobre el pecho.',
      'Bájala hasta la parte baja del pecho.',
      'Empuja hasta estirar los brazos.',
    ],
  },
  {
    code: 'smith_squat',
    name: 'Sentadilla en máquina Smith',
    compound: true,
    p: ['QUADS', 'GLUTES'],
    s: ['HAMSTRINGS'],
    i: ['ABS'],
    description:
      'Sentadilla con la barra guiada de la máquina Smith. Al no tener que equilibrar la barra, puedes adelantar un poco los pies y cargar más el cuádriceps.',
    steps: [
      'Apoya la barra sobre los trapecios y adelanta un poco los pies.',
      'Desbloquea la barra y baja doblando cadera y rodillas.',
      'Baja hasta que los muslos queden paralelos al suelo.',
      'Sube empujando el suelo con todo el pie.',
    ],
  },
  {
    code: 'machine_chest_press',
    name: 'Press de pecho en máquina',
    compound: true,
    p: ['CHEST'],
    s: ['TRICEPS', 'FRONT_DELT'],
    description:
      'Sentado, empujas los agarres de la máquina hacia delante. Las iso-laterales mueven cada brazo por separado. Una forma segura de cargar pecho.',
    steps: [
      'Ajusta el asiento para que los agarres queden a la altura del pecho.',
      'Apoya bien la espalda y junta las escápulas.',
      'Empuja hacia delante hasta casi estirar los brazos.',
      'Vuelve despacio hasta notar el estiramiento del pecho.',
    ],
  },
  {
    code: 'machine_incline_chest_press',
    name: 'Press de pecho inclinado en máquina',
    compound: true,
    p: ['CHEST'],
    s: ['FRONT_DELT', 'TRICEPS'],
    description:
      'Como el press de pecho en máquina, pero empujando hacia arriba y adelante. Carga más la parte alta del pecho.',
    steps: [
      'Ajusta el asiento para que los agarres queden a la altura de la parte alta del pecho.',
      'Con la espalda apoyada, empuja hacia arriba y adelante.',
      'Para antes de bloquear los codos.',
      'Vuelve despacio.',
    ],
  },
  {
    code: 'pec_deck',
    name: 'Mariposa (contractora de pecho)',
    p: ['CHEST'],
    i: ['FRONT_DELT'],
    description:
      'Sentado en la máquina, juntas los brazos delante del pecho describiendo un arco. Aísla el pecho; también se llama pec deck.',
    steps: [
      'Ajusta el asiento para que los agarres queden a la altura del pecho.',
      'Con los codos un poco flexionados, junta los brazos delante del pecho.',
      'Aprieta el pecho un segundo con las manos juntas.',
      'Abre despacio hasta notar el estiramiento, sin pasarte.',
    ],
  },
  {
    code: 'cable_lateral_raise',
    name: 'Elevación lateral en polea a una mano',
    p: ['SIDE_DELT'],
    i: ['TRAPS'],
    description:
      'Elevación lateral con la polea baja, un brazo cada vez. El cable mantiene la tensión también abajo, donde la mancuerna apenas pesa.',
    steps: [
      'Ponte de lado a la polea baja y agarra el maneral con la mano más lejana.',
      'Con el codo un poco flexionado, sube el brazo hacia el lado.',
      'Para a la altura del hombro.',
      'Baja despacio, sin inclinar el cuerpo.',
    ],
  },
  {
    code: 'machine_lateral_raise',
    name: 'Elevaciones laterales en máquina',
    p: ['SIDE_DELT'],
    description:
      'Sentado en la máquina, subes los brazos hacia los lados empujando las almohadillas con los codos. Aísla el hombro lateral sin balanceo.',
    steps: [
      'Ajusta el asiento para que los hombros queden alineados con el eje de la máquina.',
      'Apoya los codos o antebrazos en las almohadillas.',
      'Sube los brazos hacia los lados hasta la altura de los hombros.',
      'Baja despacio.',
    ],
  },
  {
    code: 'cable_front_raise',
    name: 'Elevación frontal en polea',
    p: ['FRONT_DELT'],
    i: ['SIDE_DELT'],
    description:
      'De espaldas a la polea baja, subes el brazo estirado hacia delante hasta la altura de los hombros. Trabaja la parte delantera del hombro.',
    steps: [
      'Agarra el maneral de la polea baja y da un paso adelante.',
      'Con el brazo casi estirado, súbelo hacia delante.',
      'Para cuando la mano llegue a la altura del hombro.',
      'Baja despacio sin balancear el cuerpo.',
    ],
  },
  {
    code: 'machine_shoulder_press',
    name: 'Press de hombro en máquina',
    compound: true,
    p: ['FRONT_DELT'],
    s: ['SIDE_DELT', 'TRICEPS'],
    description:
      'Sentado en la máquina, empujas los agarres desde los hombros hacia arriba. El press de hombro con el recorrido guiado.',
    steps: [
      'Ajusta el asiento para que los agarres queden a la altura de los hombros.',
      'Con la espalda apoyada, empuja hacia arriba.',
      'Para antes de bloquear los codos.',
      'Baja despacio hasta la altura de las orejas.',
    ],
  },
  {
    code: 'rope_pushdown',
    name: 'Extensión de tríceps con cuerda',
    p: ['TRICEPS'],
    description:
      'Extensión de tríceps en polea alta con cuerda: al final separas los extremos de la cuerda, lo que aprieta más el tríceps.',
    steps: [
      'Agarra la cuerda con los codos pegados a los costados.',
      'Estira los codos empujando hacia abajo.',
      'Al final, separa los extremos de la cuerda hacia los lados.',
      'Sube controlado sin mover los codos.',
    ],
  },
  {
    code: 'overhead_triceps_extension',
    name: 'Extensión de tríceps por encima de la cabeza en polea',
    p: ['TRICEPS'],
    description:
      'De espaldas a la polea, con la cuerda detrás de la cabeza, estiras los codos hacia arriba y adelante. Estira y trabaja mucho la cabeza larga del tríceps.',
    steps: [
      'De espaldas a la polea, agarra la cuerda por encima de la cabeza y da un paso adelante.',
      'Inclina un poco el torso con los codos apuntando hacia delante.',
      'Estira los codos hasta tener los brazos rectos.',
      'Vuelve despacio hasta notar el estiramiento.',
    ],
  },
  {
    code: 'seated_dip_machine',
    name: 'Fondos en máquina (sentado)',
    compound: true,
    p: ['TRICEPS'],
    s: ['CHEST'],
    i: ['FRONT_DELT'],
    description:
      'Sentado en la máquina, empujas los agarres hacia abajo estirando los codos. El gesto de los fondos, con el peso que elijas.',
    steps: [
      'Siéntate con la espalda apoyada y agarra los manerales a los lados.',
      'Empuja hacia abajo hasta estirar los brazos.',
      'Sube despacio hasta que los codos formen unos 90°.',
    ],
  },
  {
    code: 'bench_dip',
    name: 'Fondos en banco',
    compound: true,
    bodyweight: true,
    p: ['TRICEPS'],
    s: ['FRONT_DELT'],
    i: ['CHEST'],
    description:
      'Con las manos apoyadas en un banco detrás de ti, bajas y subes el cuerpo doblando los codos. Tríceps sin material.',
    steps: [
      'Apoya las manos en el borde de un banco, detrás de ti, con los dedos hacia delante.',
      'Adelanta los pies y aleja la cadera del banco.',
      'Baja doblando los codos hacia atrás hasta unos 90°.',
      'Empuja hasta estirar los brazos.',
    ],
  },
  {
    code: 'assisted_dip',
    name: 'Fondos asistidos',
    compound: true,
    p: ['CHEST', 'TRICEPS'],
    s: ['FRONT_DELT'],
    description:
      'Fondos en la máquina de asistencia: un contrapeso te ayuda a subir. El peso que apuntas es la ayuda, así que cuanto menos, más fuerte.',
    steps: [
      'Elige la ayuda y apoya las rodillas en la plataforma.',
      'Sujétate en las paralelas con los brazos estirados.',
      'Baja doblando los codos hasta que el brazo quede paralelo al suelo.',
      'Empuja hasta estirar los brazos.',
    ],
  },
  {
    code: 'iso_lateral_row',
    name: 'Remo iso-lateral en máquina',
    compound: true,
    p: ['LATS'],
    s: ['TRAPS', 'REAR_DELT', 'BICEPS'],
    description:
      'Sentado con el pecho apoyado, tiras de los agarres hacia ti; cada brazo va por separado. Espalda media y dorsales sin cargar la zona lumbar.',
    steps: [
      'Ajusta el asiento para que los agarres queden a la altura del pecho y apoya el pecho en la almohadilla.',
      'Agarra los manerales con los brazos estirados.',
      'Tira llevando los codos hacia atrás y junta las escápulas.',
      'Vuelve despacio hasta estirar los brazos.',
    ],
  },
  {
    code: 'chin_up',
    name: 'Dominadas supinas (chin-up)',
    compound: true,
    bodyweight: true,
    p: ['LATS'],
    s: ['BICEPS'],
    i: ['REAR_DELT', 'FOREARMS'],
    description:
      'Dominadas con las palmas hacia ti y las manos a la anchura de los hombros. Trabajan más el bíceps que las dominadas normales.',
    steps: [
      'Cuélgate con las palmas mirándote y las manos a la anchura de los hombros.',
      'Baja los hombros antes de tirar.',
      'Sube hasta pasar la barbilla por encima de la barra.',
      'Baja controlado hasta estirar los brazos.',
    ],
  },
  {
    code: 'assisted_pull_up',
    name: 'Dominadas asistidas',
    compound: true,
    p: ['LATS'],
    s: ['BICEPS', 'REAR_DELT'],
    description:
      'Dominadas en la máquina de asistencia: un contrapeso te ayuda a subir. El peso que apuntas es la ayuda, así que cuanto menos, más fuerte.',
    steps: [
      'Elige la ayuda y apoya las rodillas en la plataforma.',
      'Agarra la barra algo más abierto que los hombros.',
      'Tira llevando los codos hacia las costillas hasta pasar la barbilla de la barra.',
      'Baja controlado hasta estirar los brazos.',
    ],
  },
  {
    code: 'assisted_chin_up',
    name: 'Dominadas supinas asistidas',
    compound: true,
    p: ['LATS'],
    s: ['BICEPS'],
    description:
      'Dominadas supinas (palmas hacia ti) en la máquina de asistencia. El peso que apuntas es la ayuda, así que cuanto menos, más fuerte.',
    steps: [
      'Elige la ayuda y apoya las rodillas en la plataforma.',
      'Agarra la barra con las palmas mirándote, a la anchura de los hombros.',
      'Sube hasta pasar la barbilla de la barra.',
      'Baja controlado.',
    ],
  },
  {
    code: 'rear_delt_machine',
    name: 'Aperturas posteriores en máquina',
    p: ['REAR_DELT'],
    i: ['TRAPS'],
    description:
      'Sentado de cara al respaldo de la máquina de mariposa, abres los brazos hacia atrás. Aísla la parte de atrás del hombro.',
    steps: [
      'Siéntate mirando al respaldo, con el pecho apoyado.',
      'Agarra los manerales con los brazos estirados delante, a la altura de los hombros.',
      'Abre los brazos hacia atrás hasta que queden en línea con los hombros.',
      'Vuelve despacio.',
    ],
  },
  {
    code: 'incline_dumbbell_curl',
    name: 'Curl inclinado con mancuernas',
    p: ['BICEPS'],
    i: ['FOREARMS'],
    description:
      'Sentado en un banco inclinado con los brazos colgando por detrás del cuerpo, haces curl. El bíceps trabaja más estirado.',
    steps: [
      'Inclina el banco a unos 45–60° y siéntate con la espalda apoyada.',
      'Deja los brazos colgando estirados, por detrás del tronco.',
      'Dobla los codos para subir las mancuernas sin adelantar los codos.',
      'Baja despacio hasta estirar los brazos del todo.',
    ],
  },
  {
    code: 'cable_curl',
    name: 'Curl de bíceps en polea',
    p: ['BICEPS'],
    s: ['FOREARMS'],
    description:
      'Curl con la polea baja, con barra o cuerda. El cable mantiene la tensión durante todo el recorrido.',
    steps: [
      'Ponte frente a la polea baja con la barra o la cuerda en las manos.',
      'Con los codos pegados al cuerpo, dobla los codos para subir.',
      'Aprieta el bíceps arriba.',
      'Baja despacio hasta estirar los brazos.',
    ],
  },
  {
    code: 'preacher_curl',
    name: 'Curl predicador (banco Scott)',
    p: ['BICEPS'],
    i: ['FOREARMS'],
    description:
      'Con los brazos apoyados en el atril inclinado, haces curl con barra, mancuerna o máquina. Al no poder balancearte, el bíceps trabaja solo.',
    steps: [
      'Siéntate y apoya la parte de atrás de los brazos en el atril.',
      'Empieza con los brazos casi estirados.',
      'Dobla los codos para subir el peso sin despegar los brazos.',
      'Baja despacio, sin bloquear los codos abajo.',
    ],
  },
  {
    code: 'seated_leg_curl',
    name: 'Curl femoral sentado',
    p: ['HAMSTRINGS'],
    description:
      'Sentado en la máquina, llevas el rodillo hacia abajo y atrás doblando las rodillas. Trabaja los isquios en posición estirada.',
    steps: [
      'Siéntate con el rodillo justo por encima de los talones y la almohadilla sobre los muslos.',
      'Dobla las rodillas llevando los talones hacia debajo del asiento.',
      'Aprieta un segundo.',
      'Vuelve despacio hasta estirar las piernas.',
    ],
  },
  {
    code: 'seated_calf_raise',
    name: 'Elevación de gemelos sentado',
    p: ['CALVES'],
    description:
      'Sentado con las rodillas dobladas y peso sobre los muslos, subes los talones. Con la rodilla doblada trabaja sobre todo el sóleo.',
    steps: [
      'Siéntate con las puntas de los pies en la plataforma y la almohadilla sobre los muslos.',
      'Deja bajar los talones hasta notar el estiramiento.',
      'Sube los talones todo lo que puedas y aguanta un segundo.',
      'Baja despacio.',
    ],
  },
  {
    code: 'hip_abduction',
    name: 'Abducción de cadera en máquina',
    p: ['GLUTES'],
    description:
      'Sentado en la máquina, separas las piernas empujando las almohadillas hacia fuera. Trabaja el glúteo medio, el de los lados de la cadera.',
    steps: [
      'Siéntate con la espalda apoyada y las almohadillas por fuera de las rodillas.',
      'Separa las piernas todo lo que puedas.',
      'Aguanta un segundo abiertas.',
      'Junta despacio, sin dejar que el peso golpee.',
    ],
  },
  {
    code: 'hip_adduction',
    name: 'Aducción de cadera en máquina',
    p: [],
    description:
      'Sentado en la máquina, juntas las piernas apretando las almohadillas hacia dentro. Trabaja los aductores (cara interna del muslo), que Brío no cuenta en el análisis de músculos.',
    steps: [
      'Siéntate con la espalda apoyada y las almohadillas por dentro de las rodillas.',
      'Junta las piernas apretando hacia dentro.',
      'Aguanta un segundo juntas.',
      'Abre despacio hasta notar el estiramiento.',
    ],
  },
  {
    code: 'box_jump',
    name: 'Salto al cajón',
    compound: true,
    bodyweight: true,
    p: ['QUADS', 'GLUTES'],
    s: ['CALVES'],
    description:
      'Saltas con los dos pies desde el suelo hasta encima de un cajón. Trabaja la potencia de piernas.',
    steps: [
      'Ponte a un paso del cajón con los pies a la anchura de la cadera.',
      'Flexiona un poco cadera y rodillas y lleva los brazos atrás.',
      'Salta impulsando los brazos y cae suave encima del cajón, con las rodillas flexionadas.',
      'Estírate arriba y baja andando, sin saltar hacia atrás.',
    ],
  },
  {
    code: 'decline_crunch',
    name: 'Crunch en banco declinado',
    bodyweight: true,
    p: ['ABS'],
    description:
      'Crunch en un banco inclinado con los pies sujetos y la cabeza más baja. Más difícil que en el suelo; puedes añadir peso en el pecho.',
    steps: [
      'Siéntate en el banco con los pies sujetos bajo los rodillos.',
      'Baja el torso hasta casi tumbarte.',
      'Encoge el abdomen para subir los hombros hacia las rodillas.',
      'Baja despacio sin apoyarte del todo.',
    ],
  },
  {
    code: 'bicycle_crunch',
    name: 'Abdominales bicicleta',
    bodyweight: true,
    p: ['ABS'],
    description:
      'Tumbado con las piernas en el aire, acercas el codo a la rodilla contraria mientras estiras la otra pierna, alternando como si pedalearas.',
    steps: [
      'Túmbate boca arriba con las manos junto a la cabeza y las piernas levantadas.',
      'Despega los hombros del suelo.',
      'Acerca una rodilla al pecho mientras estiras la otra pierna.',
      'Alterna sin parar, girando un poco el tronco hacia la rodilla que sube.',
    ],
  },
  {
    code: 'scissor_kicks',
    name: 'Tijeras abdominales',
    bodyweight: true,
    p: ['ABS'],
    description:
      'Tumbado boca arriba con las piernas estiradas y algo levantadas, subes y bajas una y otra alternando, como unas tijeras.',
    steps: [
      'Túmbate boca arriba con las manos bajo los glúteos.',
      'Levanta las piernas estiradas un palmo del suelo.',
      'Sube una pierna y baja la otra, alternando.',
      'Mantén la zona lumbar pegada al suelo todo el rato.',
    ],
  },
];

/** Disciplina de cada tipo de actividad del catálogo (por `code`). */
export const ACTIVITY_KINDS: Record<string, string> = {
  walking: 'WALK',
  running: 'RUN',
  cycling: 'CYCLE',
  swimming: 'SWIM',
  strength: 'STRENGTH',
  hiit: 'OTHER_CARDIO',
  football: 'OTHER_CARDIO',
  padel: 'OTHER_CARDIO',
  basketball: 'OTHER_CARDIO',
  yoga: 'OTHER',
  hiking: 'HIKE',
  rowing: 'OTHER_CARDIO',
  elliptical: 'ELLIPTICAL',
  dancing: 'OTHER_CARDIO',
  climbing: 'OTHER',
};
