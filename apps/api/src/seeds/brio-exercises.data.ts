// Catálogo global de ejercicios de fuerza de Brío, con cuánto trabaja cada
// uno cada músculo: 1.0 principal, 0.5 secundario, 0.25 indirecto. Son los
// valores de partida; se guardan en `brio_exercise_muscle` y se pueden
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

export type Measure = 'REPS' | 'DISTANCE' | 'TIME' | 'CALORIES';

export interface SeedExercise {
  code: string;
  name: string;
  compound?: boolean;
  bodyweight?: boolean;
  /** Cómo se mide; por defecto, repeticiones. */
  measure?: Measure;
  /** Principales (1.0). */
  p: Muscle[];
  /** Secundarios (0.5). */
  s?: Muscle[];
  /** Indirectos (0.25). */
  i?: Muscle[];
  /** Qué es y qué trabaja, para la ficha del ejercicio. */
  description?: string;
  /** Técnica paso a paso, frases cortas en orden. */
  steps?: string[];
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
    name: 'Press inclinado',
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
    name: 'Press con mancuernas',
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
    name: 'Pájaros',
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
    name: 'Encogimientos',
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
    name: 'Sentadilla',
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
    measure: 'TIME',
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
    name: 'Hiperextensiones',
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
  // Ampliación: máquinas, poleas y variantes habituales. Los códigos siguen
  // los títulos de Hevy ("Incline Bench Press (Dumbbell)" →
  // dumbbell_incline_bench_press) para que se enlacen solos al enviar rutinas.
  {
    code: 'dumbbell_incline_bench_press',
    name: 'Press inclinado con mancuernas',
    compound: true,
    p: ['CHEST'],
    s: ['FRONT_DELT', 'TRICEPS'],
    description:
      'En un banco inclinado unos 30°, bajas dos mancuernas hasta los lados del pecho y las empujas hacia arriba. Trabaja sobre todo la parte alta del pecho y el hombro delantero.',
    steps: [
      'Siéntate en el banco inclinado con una mancuerna sobre cada muslo y túmbate subiéndolas al pecho.',
      'Empieza con los brazos estirados sobre los hombros y las escápulas juntas.',
      'Baja las mancuernas hasta la altura del pecho, con los codos algo por debajo de los hombros.',
      'Empuja hacia arriba acercándolas un poco al final, sin chocarlas.',
    ],
  },
  {
    code: 'decline_bench_press',
    name: 'Press declinado',
    compound: true,
    p: ['CHEST'],
    s: ['TRICEPS'],
    i: ['FRONT_DELT'],
    description:
      'Tumbado en un banco declinado, con la cabeza más baja que la cadera, bajas la barra a la parte baja del pecho y la empujas. Carga más la parte inferior del pecho.',
    steps: [
      'Engancha bien los pies en los rodillos y túmbate con los ojos bajo la barra.',
      'Agarra la barra algo más abierto que los hombros y sácala con los brazos estirados.',
      'Bájala controlada hasta la parte baja del pecho.',
      'Empuja hasta estirar los brazos; pide ayuda para sacarla y dejarla en el soporte.',
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
    name: 'Press inclinado en máquina',
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
    name: 'Contractor de pecho (pec deck)',
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
    code: 'cable_crossover',
    name: 'Cruces en polea',
    p: ['CHEST'],
    i: ['FRONT_DELT'],
    description:
      'De pie entre dos poleas altas, juntas los brazos delante del cuerpo en un arco amplio. Aislamiento de pecho con tensión constante.',
    steps: [
      'Coge un agarre en cada mano, da un paso adelante e inclina un poco el tronco.',
      'Abre los brazos con los codos ligeramente doblados y fijos.',
      'Junta las manos delante de la cadera en un arco, apretando el pecho.',
      'Vuelve despacio hasta notar el estiramiento, sin dejar que las poleas tiren de ti.',
    ],
  },
  {
    code: 'low_cable_fly',
    name: 'Cruces en polea baja',
    p: ['CHEST'],
    s: ['FRONT_DELT'],
    description:
      'Con las poleas abajo, subes las manos en arco hasta juntarlas a la altura de los hombros. Trabaja la parte alta del pecho.',
    steps: [
      'Ponte en medio con un agarre en cada mano y las palmas mirando adelante.',
      'Con los codos un poco doblados, sube las manos hacia arriba y hacia dentro.',
      'Júntalas delante de la cara o del pecho alto, apretando.',
      'Baja controlado hasta tener los brazos abiertos a los lados de la cadera.',
    ],
  },
  {
    code: 'dumbbell_incline_fly',
    name: 'Aperturas inclinadas con mancuernas',
    p: ['CHEST'],
    s: ['FRONT_DELT'],
    description:
      'En un banco inclinado, abres y cierras los brazos con una mancuerna en cada mano. Aislamiento de la parte alta del pecho.',
    steps: [
      'Túmbate en el banco inclinado con las mancuernas arriba y las palmas enfrentadas.',
      'Dobla un poco los codos y déjalos así todo el recorrido.',
      'Abre los brazos en arco hasta notar el estiramiento del pecho.',
      'Ciérralos por el mismo camino hasta juntar las mancuernas sobre el pecho.',
    ],
  },
  {
    code: 'dumbbell_pullover',
    name: 'Pullover con mancuerna',
    p: ['CHEST', 'LATS'],
    s: ['TRICEPS'],
    description:
      'Tumbado en un banco, llevas una mancuerna desde encima del pecho hasta detrás de la cabeza y vuelves. Estira y trabaja pecho y dorsal.',
    steps: [
      'Túmbate en el banco con la mancuerna sujeta con las dos manos sobre el pecho.',
      'Con los codos un poco doblados, bájala en arco por detrás de la cabeza.',
      'Para cuando notes el estiramiento, sin arquear la espalda.',
      'Vuelve a subirla por el mismo arco hasta encima del pecho.',
    ],
  },
  {
    code: 'incline_push_up',
    name: 'Flexiones inclinadas',
    compound: true,
    bodyweight: true,
    p: ['CHEST'],
    s: ['TRICEPS', 'FRONT_DELT'],
    description:
      'Flexiones con las manos apoyadas en un banco o un cajón. Más fáciles que en el suelo: buenas para empezar o para sumar repeticiones.',
    steps: [
      'Apoya las manos en el borde del banco, algo más abiertas que los hombros.',
      'Echa los pies atrás hasta formar una línea recta de la cabeza a los talones.',
      'Baja el pecho hacia el banco con los codos a unos 45° del cuerpo.',
      'Empuja hasta estirar los brazos sin hundir la cadera.',
    ],
  },
  {
    code: 'decline_push_up',
    name: 'Flexiones declinadas',
    compound: true,
    bodyweight: true,
    p: ['CHEST'],
    s: ['FRONT_DELT', 'TRICEPS'],
    i: ['ABS'],
    description:
      'Flexiones con los pies en alto, sobre un banco o un cajón. Más difíciles y con más trabajo de hombro y pecho alto.',
    steps: [
      'Apoya los pies en el banco y las manos en el suelo bajo los hombros.',
      'Aprieta abdomen y glúteos para mantener el cuerpo recto.',
      'Baja la cara y el pecho hacia el suelo, controlado.',
      'Empuja hasta estirar los brazos sin doblar la cadera.',
    ],
  },
  {
    code: 'smith_machine_bench_press',
    name: 'Press de banca en multipower',
    compound: true,
    p: ['CHEST'],
    s: ['TRICEPS', 'FRONT_DELT'],
    description:
      'Press de banca en la máquina multipower, con la barra guiada por raíles. Más estable que con barra libre y fácil de hacer sin ayudante.',
    steps: [
      'Coloca el banco para que la barra baje sobre la parte baja del pecho.',
      'Agarra la barra algo más abierto que los hombros y desbloquéala girando las muñecas.',
      'Bájala controlada hasta rozar el pecho.',
      'Empuja hasta estirar los brazos y vuelve a bloquearla al acabar.',
    ],
  },
  {
    code: 'dumbbell_arnold_press',
    name: 'Press Arnold',
    compound: true,
    p: ['FRONT_DELT'],
    s: ['SIDE_DELT', 'TRICEPS'],
    description:
      'Press de hombro con mancuernas en el que giras las palmas mientras subes: empiezan mirándote y acaban mirando adelante. Trabaja todo el hombro.',
    steps: [
      'Siéntate con la espalda apoyada y las mancuernas delante de la cara, palmas hacia ti.',
      'Empieza a subir abriendo los codos y girando las palmas hacia fuera.',
      'Acaba con los brazos estirados sobre la cabeza y las palmas al frente.',
      'Baja deshaciendo el giro hasta la posición de inicio.',
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
    code: 'push_press',
    name: 'Push press',
    compound: true,
    p: ['FRONT_DELT'],
    s: ['TRICEPS', 'SIDE_DELT'],
    i: ['QUADS', 'GLUTES'],
    description:
      'Press militar de pie ayudado por un pequeño impulso de piernas. Permite mover más peso y trabaja hombros, tríceps y potencia.',
    steps: [
      'Coloca la barra sobre los hombros delanteros con los codos un poco adelantados.',
      'Dobla ligeramente las rodillas con el tronco recto.',
      'Estira las piernas de golpe y aprovecha el impulso para empujar la barra arriba.',
      'Bloquea con los brazos estirados sobre la cabeza y bájala controlada a los hombros.',
    ],
  },
  {
    code: 'dumbbell_front_raise',
    name: 'Elevaciones frontales',
    p: ['FRONT_DELT'],
    i: ['SIDE_DELT'],
    description:
      'De pie, subes las mancuernas por delante con los brazos casi estirados hasta la altura de los hombros. Aislamiento del hombro delantero.',
    steps: [
      'Ponte de pie con una mancuerna en cada mano delante de los muslos.',
      'Con los codos apenas doblados, sube los brazos por delante.',
      'Para a la altura de los hombros, sin balancear el cuerpo.',
      'Baja despacio hasta los muslos.',
    ],
  },
  {
    code: 'cable_lateral_raise',
    name: 'Elevaciones laterales en polea',
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
    code: 'barbell_upright_row',
    name: 'Remo al mentón',
    compound: true,
    p: ['SIDE_DELT', 'TRAPS'],
    s: ['FRONT_DELT', 'BICEPS'],
    description:
      'De pie, subes una barra pegada al cuerpo hasta el pecho con los codos por delante. Trabaja hombro lateral y trapecio.',
    steps: [
      'Agarra la barra con las manos a la anchura de los hombros, delante de los muslos.',
      'Sube la barra pegada al cuerpo llevando los codos hacia arriba y afuera.',
      'Para cuando los codos lleguen a la altura de los hombros, sin pasarte.',
      'Baja controlado hasta estirar los brazos.',
    ],
  },
  {
    code: 'machine_reverse_fly',
    name: 'Pájaros en máquina',
    p: ['REAR_DELT'],
    s: ['TRAPS'],
    description:
      'Sentado en la máquina de aperturas mirando al respaldo, abres los brazos hacia atrás. Trabaja la parte trasera del hombro.',
    steps: [
      'Ajusta el asiento para que los agarres queden a la altura de los hombros.',
      'Agarra con los brazos estirados delante y el pecho apoyado.',
      'Abre los brazos hacia atrás en arco, juntando un poco las escápulas.',
      'Vuelve despacio sin dejar que las placas choquen.',
    ],
  },
  {
    code: 'cable_rear_delt_fly',
    name: 'Pájaros en polea',
    p: ['REAR_DELT'],
    s: ['TRAPS'],
    description:
      'Con dos poleas a la altura de los hombros, cruzas los cables y abres los brazos hacia atrás. Trabaja la parte trasera del hombro.',
    steps: [
      'Coge el cable izquierdo con la mano derecha y el derecho con la izquierda, cruzados delante.',
      'Con los brazos casi estirados, ábrelos hacia los lados y atrás.',
      'Para cuando las manos queden en línea con los hombros.',
      'Vuelve controlado hasta cruzar otra vez los cables.',
    ],
  },
  {
    code: 'dumbbell_shrug',
    name: 'Encogimientos con mancuernas',
    p: ['TRAPS'],
    i: ['FOREARMS'],
    description:
      'De pie con una mancuerna en cada mano, subes los hombros hacia las orejas. Aislamiento del trapecio.',
    steps: [
      'Ponte de pie con las mancuernas a los lados y los brazos estirados.',
      'Sube los hombros en línea recta hacia las orejas, sin doblar los codos.',
      'Aguanta un instante arriba apretando.',
      'Baja despacio hasta notar el estiramiento.',
    ],
  },
  {
    code: 'chin_up',
    name: 'Dominadas supinas',
    compound: true,
    bodyweight: true,
    p: ['LATS', 'BICEPS'],
    s: ['REAR_DELT'],
    i: ['FOREARMS'],
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
    code: 'close_grip_lat_pulldown',
    name: 'Jalón agarre estrecho',
    compound: true,
    p: ['LATS'],
    s: ['BICEPS'],
    i: ['REAR_DELT'],
    description:
      'Jalón al pecho con el agarre estrecho (triángulo o manos juntas). Trabaja el dorsal con más recorrido y algo más de bíceps.',
    steps: [
      'Siéntate con los muslos bajo los rodillos y agarra el triángulo con las palmas enfrentadas.',
      'Inclina un poco el tronco hacia atrás con el pecho alto.',
      'Tira hasta llevar el agarre a la parte alta del pecho, con los codos pegados.',
      'Sube controlado hasta estirar los brazos.',
    ],
  },
  {
    code: 'straight_arm_lat_pulldown',
    name: 'Pullover en polea alta',
    p: ['LATS'],
    i: ['TRICEPS'],
    description:
      'De pie frente a la polea alta, bajas la barra hasta los muslos con los brazos estirados. Aísla el dorsal sin meter bíceps.',
    steps: [
      'Agarra la barra a la anchura de los hombros y da un paso atrás.',
      'Inclina un poco el tronco con los brazos estirados por delante.',
      'Baja la barra en arco hasta los muslos, sin doblar los codos.',
      'Sube despacio hasta la altura de la cabeza.',
    ],
  },
  {
    code: 't_bar_row',
    name: 'Remo en T',
    compound: true,
    p: ['LATS', 'TRAPS'],
    s: ['REAR_DELT', 'BICEPS'],
    i: ['LOWER_BACK'],
    description:
      'Inclinado sobre una barra anclada por un extremo, la subes hacia el pecho con un agarre en V. Remo pesado para el grosor de la espalda.',
    steps: [
      'Ponte a horcajadas sobre la barra, dobla un poco las rodillas e inclina el tronco con la espalda recta.',
      'Agarra el asa con los brazos estirados.',
      'Tira hacia el pecho llevando los codos atrás y juntando las escápulas.',
      'Baja controlado hasta estirar los brazos sin redondear la espalda.',
    ],
  },
  {
    code: 'pendlay_row',
    name: 'Remo Pendlay',
    compound: true,
    p: ['LATS', 'TRAPS'],
    s: ['REAR_DELT', 'BICEPS'],
    i: ['LOWER_BACK'],
    description:
      'Remo con barra que sale del suelo en cada repetición, con el tronco casi paralelo al suelo. Explosivo y muy de espalda alta.',
    steps: [
      'Con la barra en el suelo, inclínate con la espalda recta casi paralela al suelo.',
      'Agarra la barra algo más abierto que los hombros.',
      'Tira con fuerza hasta tocar la parte baja del pecho.',
      'Déjala en el suelo de forma controlada y vuelve a empezar desde parado.',
    ],
  },
  {
    code: 'machine_seated_row',
    name: 'Remo en máquina',
    compound: true,
    p: ['LATS', 'TRAPS'],
    s: ['BICEPS', 'REAR_DELT'],
    description:
      'Remo sentado en máquina con apoyo de pecho. Trabaja la espalda media sin cargar la zona lumbar.',
    steps: [
      'Ajusta el asiento para que los agarres queden a la altura del pecho.',
      'Apoya el pecho y agarra con los brazos estirados.',
      'Tira llevando los codos atrás y juntando las escápulas.',
      'Vuelve despacio hasta estirar los brazos.',
    ],
  },
  {
    code: 'single_arm_cable_row',
    name: 'Remo a una mano en polea',
    compound: true,
    p: ['LATS'],
    s: ['BICEPS', 'REAR_DELT'],
    description:
      'Remo con un solo brazo en polea baja o media. Permite más recorrido y corrige diferencias entre lados.',
    steps: [
      'Coge el agarre con una mano y apoya la otra en la cadera o en la máquina.',
      'Empieza con el brazo estirado y el hombro un poco adelantado.',
      'Tira llevando el codo atrás, pegado al cuerpo, sin girar el tronco.',
      'Vuelve controlado hasta estirar el brazo.',
    ],
  },
  {
    code: 'chest_supported_dumbbell_row',
    name: 'Remo con apoyo en banco inclinado',
    compound: true,
    p: ['LATS', 'TRAPS'],
    s: ['REAR_DELT', 'BICEPS'],
    description:
      'Tumbado boca abajo en un banco inclinado, subes dos mancuernas hacia las costillas. Remo sin poder hacer trampa con el cuerpo.',
    steps: [
      'Pon el banco inclinado unos 30° y túmbate boca abajo con el pecho apoyado.',
      'Deja colgar las mancuernas con los brazos estirados.',
      'Tira de ellas hacia las costillas llevando los codos atrás.',
      'Baja despacio hasta estirar los brazos.',
    ],
  },
  {
    code: 'inverted_row',
    name: 'Remo invertido',
    compound: true,
    bodyweight: true,
    p: ['LATS', 'TRAPS'],
    s: ['BICEPS', 'REAR_DELT'],
    description:
      'Colgado bajo una barra baja con el cuerpo recto, subes el pecho hasta la barra. Remo con el peso del cuerpo.',
    steps: [
      'Ponte bajo una barra a la altura de la cadera y agárrala algo más abierto que los hombros.',
      'Estira las piernas y deja el cuerpo recto, apoyado en los talones.',
      'Tira hasta que el pecho toque la barra, juntando las escápulas.',
      'Baja controlado hasta estirar los brazos.',
    ],
  },
  {
    code: 'rack_pull',
    name: 'Rack pull',
    compound: true,
    p: ['LOWER_BACK', 'TRAPS'],
    s: ['GLUTES', 'HAMSTRINGS'],
    i: ['FOREARMS'],
    description:
      'Peso muerto parcial desde unos soportes a la altura de las rodillas. Permite cargar mucho y trabaja espalda alta, trapecio y glúteos.',
    steps: [
      'Coloca la barra en los soportes, justo por debajo o por encima de las rodillas.',
      'Agárrala con la espalda recta, el pecho alto y la cadera atrás.',
      'Empuja la cadera adelante hasta quedar de pie, con la barra pegada a los muslos.',
      'Vuelve a dejarla en los soportes de forma controlada.',
    ],
  },
  {
    code: 'good_morning',
    name: 'Buenos días',
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
    code: 'ez_bar_curl',
    name: 'Curl con barra Z',
    p: ['BICEPS'],
    s: ['FOREARMS'],
    description:
      'Curl de bíceps con la barra Z, que tiene curvas para que las muñecas no sufran. Es el curl con barra más cómodo.',
    steps: [
      'Agarra la barra Z por las curvas con las palmas hacia arriba.',
      'Con los codos pegados al cuerpo, sube la barra doblando los brazos.',
      'Aprieta arriba sin echar los codos adelante.',
      'Baja despacio hasta estirar los brazos.',
    ],
  },
  {
    code: 'preacher_curl',
    name: 'Curl predicador',
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
    code: 'concentration_curl',
    name: 'Curl concentrado',
    p: ['BICEPS'],
    description:
      'Sentado, con el codo apoyado en el interior del muslo, subes una mancuerna. Aísla el bíceps sin ninguna ayuda del cuerpo.',
    steps: [
      'Siéntate en un banco con las piernas abiertas y la mancuerna en una mano.',
      'Apoya el codo en la cara interna del muslo con el brazo estirado.',
      'Sube la mancuerna hacia el hombro sin mover el codo.',
      'Baja controlado hasta estirar el brazo.',
    ],
  },
  {
    code: 'cable_curl',
    name: 'Curl en polea',
    p: ['BICEPS'],
    i: ['FOREARMS'],
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
    code: 'spider_curl',
    name: 'Curl araña',
    p: ['BICEPS'],
    description:
      'Tumbado boca abajo en un banco inclinado, haces el curl con los brazos colgando. Trabaja el bíceps contraído sin balanceo.',
    steps: [
      'Túmbate boca abajo en el banco inclinado con el pecho apoyado arriba.',
      'Deja colgar los brazos rectos hacia el suelo con las mancuernas o la barra.',
      'Sube doblando los codos, que se quedan quietos y apuntando al suelo.',
      'Baja despacio hasta estirar los brazos.',
    ],
  },
  {
    code: 'machine_bicep_curl',
    name: 'Curl de bíceps en máquina',
    p: ['BICEPS'],
    description:
      'Curl de bíceps en máquina, con los brazos apoyados en un atril. Recorrido guiado y tensión constante.',
    steps: [
      'Ajusta el asiento para que los codos queden apoyados y alineados con el eje de la máquina.',
      'Agarra con las palmas hacia arriba y los brazos casi estirados.',
      'Sube doblando los codos hasta arriba.',
      'Baja despacio sin llegar a soltar la tensión.',
    ],
  },
  {
    code: 'reverse_curl',
    name: 'Curl invertido',
    p: ['FOREARMS', 'BICEPS'],
    description:
      'Curl con barra agarrando con las palmas hacia abajo. Trabaja el braquial y los antebrazos además del bíceps.',
    steps: [
      'Agarra la barra con las palmas hacia abajo, a la anchura de los hombros.',
      'Con los codos pegados al cuerpo, sube la barra doblando los brazos.',
      'Mantén las muñecas rectas todo el recorrido.',
      'Baja despacio hasta estirar los brazos.',
    ],
  },
  {
    code: 'close_grip_bench_press',
    name: 'Press de banca agarre estrecho',
    compound: true,
    p: ['TRICEPS', 'CHEST'],
    s: ['FRONT_DELT'],
    description:
      'Press de banca con las manos a la anchura de los hombros o algo menos. Desplaza el trabajo hacia el tríceps.',
    steps: [
      'Túmbate en el banco y agarra la barra con las manos a la anchura de los hombros.',
      'Sácala con los brazos estirados sobre el pecho.',
      'Bájala a la parte baja del pecho con los codos pegados al cuerpo.',
      'Empuja hasta estirar los brazos.',
    ],
  },
  {
    code: 'cable_overhead_triceps_extension',
    name: 'Extensión de tríceps sobre la cabeza en polea',
    p: ['TRICEPS'],
    description:
      'De espaldas a la polea, estiras los brazos por encima de la cabeza con una cuerda. Trabaja sobre todo la cabeza larga del tríceps.',
    steps: [
      'Coge la cuerda, date la vuelta y da un paso adelante con los brazos doblados detrás de la cabeza.',
      'Inclina un poco el tronco con los codos apuntando al frente.',
      'Estira los brazos hacia delante y arriba sin mover los codos.',
      'Vuelve despacio hasta notar el estiramiento del tríceps.',
    ],
  },
  {
    code: 'dumbbell_overhead_triceps_extension',
    name: 'Extensión de tríceps con mancuerna',
    p: ['TRICEPS'],
    description:
      'Con una mancuerna sujeta con las dos manos sobre la cabeza, la bajas por detrás doblando los codos y la vuelves a subir. Estira y trabaja el tríceps.',
    steps: [
      'Siéntate o ponte de pie y sujeta la mancuerna con las dos manos sobre la cabeza.',
      'Con los codos cerca de la cabeza, bájala por detrás doblando los brazos.',
      'Para cuando notes el estiramiento, sin abrir los codos.',
      'Súbela estirando los brazos.',
    ],
  },
  {
    code: 'dumbbell_triceps_kickback',
    name: 'Patada de tríceps',
    p: ['TRICEPS'],
    description:
      'Inclinado hacia delante, estiras el brazo hacia atrás con una mancuerna. Aislamiento del tríceps.',
    steps: [
      'Apoya una mano y una rodilla en el banco con la espalda recta.',
      'Sube el codo del otro brazo hasta pegarlo al costado, con el brazo doblado.',
      'Estira el brazo hacia atrás sin mover el codo.',
      'Vuelve despacio a doblarlo.',
    ],
  },
  {
    code: 'bench_dip',
    name: 'Fondos en banco',
    compound: true,
    bodyweight: true,
    p: ['TRICEPS'],
    s: ['CHEST', 'FRONT_DELT'],
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
    code: 'machine_triceps_extension',
    name: 'Extensión de tríceps en máquina',
    p: ['TRICEPS'],
    description:
      'Extensión de tríceps en máquina, sentado con los codos apoyados. Aislamiento guiado y fácil de cargar.',
    steps: [
      'Ajusta el asiento para que los codos queden alineados con el eje de la máquina.',
      'Agarra con los brazos doblados.',
      'Estira los brazos empujando hacia abajo o adelante.',
      'Vuelve controlado sin soltar la tensión.',
    ],
  },
  {
    code: 'diamond_push_up',
    name: 'Flexiones diamante',
    compound: true,
    bodyweight: true,
    p: ['TRICEPS'],
    s: ['CHEST', 'FRONT_DELT'],
    description:
      'Flexiones con las manos juntas formando un rombo con pulgares e índices. Cargan mucho más el tríceps.',
    steps: [
      'Pon las manos juntas bajo el pecho, tocándose los pulgares y los índices.',
      'Estira el cuerpo en línea recta sobre las puntas de los pies.',
      'Baja el pecho hacia las manos con los codos pegados al cuerpo.',
      'Empuja hasta estirar los brazos.',
    ],
  },
  {
    code: 'hack_squat',
    name: 'Sentadilla hack',
    compound: true,
    p: ['QUADS'],
    s: ['GLUTES'],
    description:
      'Sentadilla en máquina hack, con la espalda apoyada en un respaldo inclinado. Carga mucho el cuádriceps sin cargar la espalda.',
    steps: [
      'Apoya la espalda y los hombros bajo las almohadillas, con los pies a la anchura de la cadera.',
      'Desbloquea la máquina y baja doblando las rodillas.',
      'Baja hasta que los muslos queden paralelos a la plataforma o algo más.',
      'Sube empujando con todo el pie sin bloquear las rodillas.',
    ],
  },
  {
    code: 'goblet_squat',
    name: 'Sentadilla goblet',
    compound: true,
    p: ['QUADS', 'GLUTES'],
    i: ['ABS'],
    description:
      'Sentadilla sujetando una mancuerna o kettlebell delante del pecho. Fácil de aprender y muy buena para la técnica.',
    steps: [
      'Sujeta la pesa pegada al pecho con las dos manos y los codos hacia abajo.',
      'Separa los pies algo más que la cadera con las puntas un poco abiertas.',
      'Baja entre las piernas con el pecho alto, como para sentarte.',
      'Sube empujando el suelo hasta quedar de pie.',
    ],
  },
  {
    code: 'smith_machine_squat',
    name: 'Sentadilla en multipower',
    compound: true,
    p: ['QUADS', 'GLUTES'],
    s: ['HAMSTRINGS'],
    description:
      'Sentadilla en la máquina multipower, con la barra guiada. Más estable que con barra libre y fácil de hacer sola.',
    steps: [
      'Ponte bajo la barra con ella sobre los trapecios y los pies un poco adelantados.',
      'Desbloquéala girando las muñecas.',
      'Baja doblando cadera y rodillas hasta que los muslos queden paralelos al suelo.',
      'Sube empujando con todo el pie y vuelve a bloquear la barra al acabar.',
    ],
  },
  {
    code: 'pendulum_squat',
    name: 'Sentadilla péndulo',
    compound: true,
    p: ['QUADS'],
    s: ['GLUTES'],
    description:
      'Sentadilla en la máquina péndulo, que baja en arco con la espalda apoyada. Mucho trabajo de cuádriceps con poca carga en la espalda.',
    steps: [
      'Colócate con la espalda en el respaldo y los hombros bajo las almohadillas.',
      'Pon los pies en la plataforma a la anchura de la cadera.',
      'Baja todo lo que puedas manteniendo los talones apoyados.',
      'Sube empujando con todo el pie.',
    ],
  },
  {
    code: 'bodyweight_squat',
    name: 'Sentadilla sin peso',
    compound: true,
    bodyweight: true,
    p: ['QUADS', 'GLUTES'],
    description:
      'Sentadilla sin peso. Para calentar, aprender la técnica o hacer muchas repeticiones.',
    steps: [
      'Ponte de pie con los pies a la anchura de los hombros y los brazos delante.',
      'Lleva la cadera atrás y dobla las rodillas como para sentarte.',
      'Baja hasta que los muslos queden paralelos al suelo con el pecho alto.',
      'Sube empujando el suelo hasta quedar de pie.',
    ],
  },
  {
    code: 'walking_lunge',
    name: 'Zancadas caminando',
    compound: true,
    p: ['QUADS', 'GLUTES'],
    s: ['HAMSTRINGS'],
    description:
      'Zancadas encadenadas avanzando: das un paso largo, bajas y sigues con la otra pierna. Trabaja cuádriceps, glúteos y equilibrio.',
    steps: [
      'Ponte de pie, con mancuernas a los lados si quieres más carga.',
      'Da un paso largo adelante y baja hasta que la rodilla de atrás casi toque el suelo.',
      'Empuja con la pierna de delante y trae la de atrás directamente al siguiente paso.',
      'Sigue avanzando alternando piernas con el tronco recto.',
    ],
  },
  {
    code: 'reverse_lunge',
    name: 'Zancada atrás',
    compound: true,
    p: ['QUADS', 'GLUTES'],
    s: ['HAMSTRINGS'],
    description:
      'Zancada dando el paso hacia atrás. Más fácil para las rodillas que la zancada adelante y muy de glúteo.',
    steps: [
      'Ponte de pie con los pies juntos.',
      'Da un paso largo atrás y baja hasta que la rodilla de atrás casi toque el suelo.',
      'Mantén el peso en el talón de la pierna de delante.',
      'Empuja con ella para volver a juntar los pies.',
    ],
  },
  {
    code: 'step_up',
    name: 'Subidas al cajón',
    compound: true,
    p: ['QUADS', 'GLUTES'],
    s: ['HAMSTRINGS'],
    description:
      'Subes a un cajón o banco con una pierna y bajas. Trabaja cuádriceps y glúteos de cada pierna por separado.',
    steps: [
      'Ponte frente al cajón y apoya un pie entero encima.',
      'Empuja con esa pierna hasta quedar de pie sobre el cajón, sin impulsarte con la de abajo.',
      'Baja controlado con la misma pierna.',
      'Haz todas las repeticiones y cambia de lado.',
    ],
  },
  {
    code: 'sumo_deadlift',
    name: 'Peso muerto sumo',
    compound: true,
    p: ['GLUTES', 'QUADS'],
    s: ['HAMSTRINGS', 'LOWER_BACK'],
    i: ['TRAPS', 'FOREARMS'],
    description:
      'Peso muerto con los pies muy separados y las manos por dentro de las piernas. El tronco va más vertical y trabaja más glúteos y aductores.',
    steps: [
      'Separa mucho los pies con las puntas abiertas y la barra sobre la mitad del pie.',
      'Agarra la barra por dentro de las rodillas con los brazos estirados.',
      'Con el pecho alto, empuja el suelo abriendo las rodillas hasta quedar de pie.',
      'Baja la barra pegada al cuerpo llevando la cadera atrás.',
    ],
  },
  {
    code: 'trap_bar_deadlift',
    name: 'Peso muerto con barra hexagonal',
    compound: true,
    p: ['QUADS', 'GLUTES'],
    s: ['HAMSTRINGS', 'LOWER_BACK'],
    i: ['TRAPS', 'FOREARMS'],
    description:
      'Peso muerto con la barra hexagonal, metido dentro de ella. Más fácil de aprender y menos exigente para la espalda que con barra recta.',
    steps: [
      'Métete dentro de la barra con los pies a la anchura de la cadera.',
      'Baja la cadera y agarra las asas con la espalda recta.',
      'Empuja el suelo con las piernas hasta quedar de pie.',
      'Baja controlado doblando cadera y rodillas.',
    ],
  },
  {
    code: 'single_leg_romanian_deadlift',
    name: 'Peso muerto rumano a una pierna',
    compound: true,
    p: ['HAMSTRINGS', 'GLUTES'],
    s: ['LOWER_BACK'],
    description:
      'Peso muerto rumano sobre una sola pierna: inclinas el tronco mientras la otra pierna sube atrás. Trabaja isquios, glúteos y equilibrio.',
    steps: [
      'De pie sobre una pierna, con una mancuerna en la mano contraria.',
      'Inclina el tronco adelante mientras la otra pierna sube estirada hacia atrás.',
      'Baja hasta notar el estiramiento del isquio, con la espalda recta y la cadera nivelada.',
      'Vuelve arriba apretando el glúteo de la pierna de apoyo.',
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
    code: 'nordic_hamstring_curl',
    name: 'Curl nórdico',
    bodyweight: true,
    p: ['HAMSTRINGS'],
    i: ['GLUTES'],
    description:
      'De rodillas con los tobillos sujetos, te dejas caer hacia delante frenando con los isquios. Uno de los ejercicios más duros para la parte de atrás del muslo.',
    steps: [
      'Arrodíllate con los tobillos sujetos bajo un rodillo o por un compañero.',
      'Con el cuerpo recto de las rodillas a la cabeza, empieza a inclinarte hacia delante.',
      'Frena la caída con los isquios todo lo que puedas.',
      'Apóyate con las manos al llegar abajo y empuja un poco para volver a subir.',
    ],
  },
  {
    code: 'glute_bridge',
    name: 'Puente de glúteo',
    bodyweight: true,
    p: ['GLUTES'],
    s: ['HAMSTRINGS'],
    description:
      'Tumbado boca arriba con las rodillas dobladas, subes la cadera apretando los glúteos. Versión en el suelo del hip thrust.',
    steps: [
      'Túmbate boca arriba con las rodillas dobladas y los pies apoyados cerca del glúteo.',
      'Empuja con los talones y sube la cadera.',
      'Para cuando el cuerpo forme una línea de las rodillas a los hombros y aprieta los glúteos.',
      'Baja despacio sin llegar a apoyar del todo.',
    ],
  },
  {
    code: 'machine_hip_abduction',
    name: 'Abductores en máquina',
    p: ['GLUTES'],
    description:
      'Sentado en la máquina, abres las piernas contra las almohadillas. Trabaja el glúteo medio, la parte de fuera de la cadera.',
    steps: [
      'Siéntate con la espalda apoyada y las almohadillas por fuera de las rodillas.',
      'Abre las piernas hacia fuera de forma controlada.',
      'Aguanta un instante en la apertura máxima.',
      'Vuelve despacio sin dejar que las placas choquen.',
    ],
  },
  {
    code: 'machine_hip_adduction',
    name: 'Aductores en máquina',
    p: ['QUADS'],
    i: ['GLUTES'],
    description:
      'Sentado en la máquina, cierras las piernas contra las almohadillas. Trabaja los aductores, la cara interna del muslo.',
    steps: [
      'Siéntate con la espalda apoyada y las almohadillas por dentro de las rodillas.',
      'Junta las piernas de forma controlada.',
      'Aprieta un instante al cerrar.',
      'Ábrelas despacio hasta notar el estiramiento.',
    ],
  },
  {
    code: 'cable_glute_kickback',
    name: 'Patada de glúteo en polea',
    p: ['GLUTES'],
    s: ['HAMSTRINGS'],
    description:
      'Con una tobillera en la polea baja, llevas la pierna estirada hacia atrás. Aislamiento del glúteo.',
    steps: [
      'Ponte la tobillera, mira a la polea y agárrate a la máquina.',
      'Inclina un poco el tronco con la pierna de apoyo algo doblada.',
      'Lleva la otra pierna hacia atrás apretando el glúteo, sin arquear la espalda.',
      'Vuelve despacio y cambia de lado al acabar.',
    ],
  },
  {
    code: 'cable_pull_through',
    name: 'Pull through en polea',
    compound: true,
    p: ['GLUTES', 'HAMSTRINGS'],
    s: ['LOWER_BACK'],
    description:
      'De espaldas a la polea baja, con la cuerda entre las piernas, estiras la cadera hacia delante. Bisagra de cadera para glúteos e isquios.',
    steps: [
      'Ponte de espaldas a la polea con la cuerda pasada entre las piernas.',
      'Da un par de pasos adelante y lleva la cadera atrás con la espalda recta.',
      'Empuja la cadera adelante hasta quedar de pie, apretando los glúteos.',
      'Vuelve a llevar la cadera atrás de forma controlada.',
    ],
  },
  {
    code: 'seated_calf_raise',
    name: 'Gemelo sentado',
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
    code: 'leg_press_calf_raise',
    name: 'Gemelo en prensa',
    p: ['CALVES'],
    description:
      'En la prensa, empujas la plataforma solo con la punta de los pies. Trabaja los gemelos con mucha carga.',
    steps: [
      'Siéntate en la prensa con la punta de los pies en el borde bajo de la plataforma.',
      'Estira las piernas sin bloquear las rodillas.',
      'Empuja con la punta de los pies todo lo que puedas.',
      'Baja los talones despacio hasta notar el estiramiento.',
    ],
  },
  {
    code: 'kettlebell_swing',
    name: 'Swing con kettlebell',
    compound: true,
    p: ['GLUTES', 'HAMSTRINGS'],
    s: ['LOWER_BACK'],
    i: ['ABS', 'FRONT_DELT'],
    description:
      'Balanceas una kettlebell entre las piernas y la subes hasta el pecho con un golpe de cadera. Trabaja glúteos, isquios y la condición física.',
    steps: [
      'Con los pies algo más abiertos que la cadera, agarra la kettlebell con las dos manos.',
      'Llévala entre las piernas doblando la cadera, con la espalda recta.',
      'Estira la cadera de golpe para que la kettlebell suba hasta la altura del pecho.',
      'Deja que caiga y vuelve a llevarla entre las piernas para la siguiente.',
    ],
  },
  {
    code: 'side_plank',
    measure: 'TIME',
    name: 'Plancha lateral',
    bodyweight: true,
    p: ['ABS'],
    i: ['GLUTES'],
    description:
      'Apoyado de lado sobre un antebrazo, aguantas el cuerpo recto y en el aire. Trabaja los oblicuos y la estabilidad de la cadera.',
    steps: [
      'Túmbate de lado con el codo justo debajo del hombro y las piernas estiradas una sobre otra.',
      'Sube la cadera hasta que el cuerpo forme una línea recta de la cabeza a los pies.',
      'Aguanta sin dejar caer la cadera, respirando con normalidad.',
      'Baja con control y repite del otro lado.',
    ],
  },
  {
    code: 'cable_crunch',
    name: 'Crunch en polea',
    p: ['ABS'],
    description:
      'De rodillas frente a la polea alta, flexionas el tronco hacia el suelo tirando de una cuerda. Abdominales con carga.',
    steps: [
      'Arrodíllate frente a la polea con la cuerda sujeta a los lados de la cabeza.',
      'Con la cadera quieta, encoge el tronco llevando los codos hacia los muslos.',
      'Aprieta el abdomen al final del recorrido.',
      'Vuelve despacio hasta estirar el tronco.',
    ],
  },
  {
    code: 'russian_twist',
    name: 'Giros rusos',
    bodyweight: true,
    p: ['ABS'],
    description:
      'Sentado con el tronco inclinado hacia atrás, giras a un lado y otro. Trabaja los oblicuos.',
    steps: [
      'Siéntate con las rodillas dobladas y echa el tronco atrás con la espalda recta.',
      'Junta las manos o sujeta un peso delante del pecho.',
      'Gira el tronco para llevar las manos a un lado de la cadera.',
      'Gira al otro lado sin mover las piernas.',
    ],
  },
  {
    code: 'ab_wheel',
    name: 'Rueda abdominal',
    bodyweight: true,
    p: ['ABS'],
    s: ['LATS'],
    i: ['LOWER_BACK'],
    description:
      'De rodillas, haces rodar una rueda hacia delante estirando el cuerpo y vuelves. Muy exigente para el abdomen.',
    steps: [
      'Arrodíllate con la rueda en el suelo delante de las rodillas.',
      'Aprieta abdomen y glúteos y rueda hacia delante estirando el cuerpo.',
      'Llega hasta donde puedas sin hundir la zona lumbar.',
      'Vuelve tirando con el abdomen hasta las rodillas.',
    ],
  },
  {
    code: 'hanging_knee_raise',
    name: 'Elevación de rodillas colgado',
    bodyweight: true,
    p: ['ABS'],
    i: ['FOREARMS'],
    description:
      'Colgado de una barra, subes las rodillas hacia el pecho. Versión más fácil de la elevación de piernas.',
    steps: [
      'Cuélgate de la barra con los brazos estirados y el cuerpo quieto.',
      'Sube las rodillas hacia el pecho redondeando un poco la cadera.',
      'Aguanta un instante arriba.',
      'Baja despacio sin balancearte.',
    ],
  },
  {
    code: 'sit_up',
    name: 'Abdominales completos',
    bodyweight: true,
    p: ['ABS'],
    description:
      'Abdominales completos: desde tumbado subes el tronco hasta quedar sentado. Trabaja abdomen y flexores de la cadera.',
    steps: [
      'Túmbate boca arriba con las rodillas dobladas y los pies apoyados.',
      'Cruza los brazos sobre el pecho o pon las manos junto a la cabeza sin tirar del cuello.',
      'Sube el tronco hasta quedar sentado.',
      'Baja despacio vértebra a vértebra.',
    ],
  },
  {
    code: 'bicycle_crunch',
    name: 'Crunch bicicleta',
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
    code: 'dead_bug',
    name: 'Dead bug',
    bodyweight: true,
    p: ['ABS'],
    description:
      'Boca arriba con brazos y piernas en alto, estiras a la vez un brazo y la pierna contraria sin despegar la espalda. Estabilidad del abdomen.',
    steps: [
      'Túmbate boca arriba con los brazos hacia el techo y las rodillas dobladas a 90°.',
      'Pega la zona lumbar al suelo.',
      'Estira a la vez un brazo hacia atrás y la pierna contraria hacia delante.',
      'Vuelve al centro y repite con el otro lado.',
    ],
  },
  {
    code: 'mountain_climber',
    name: 'Escaladores',
    bodyweight: true,
    p: ['ABS'],
    s: ['QUADS', 'FRONT_DELT'],
    description:
      'En posición de flexión, llevas las rodillas al pecho alternando rápido. Abdomen y condición física.',
    steps: [
      'Ponte en posición de flexión con los brazos estirados bajo los hombros.',
      'Lleva una rodilla hacia el pecho.',
      'Cámbiala por la otra con un pequeño salto, como si corrieras.',
      'Mantén la cadera baja y los hombros sobre las manos.',
    ],
  },
  {
    code: 'pallof_press',
    name: 'Press Pallof',
    p: ['ABS'],
    description:
      'De lado a una polea, empujas el agarre al frente sin dejar que te gire. Ejercicio antirrotación para el abdomen.',
    steps: [
      'Ponte de lado a la polea a la altura del pecho y sujeta el agarre con las dos manos.',
      'Separa un poco los pies y aprieta el abdomen.',
      'Estira los brazos al frente sin dejar que el tronco gire hacia la polea.',
      'Aguanta un momento y vuelve a llevar las manos al pecho.',
    ],
  },
  {
    code: 'farmers_walk',
    measure: 'DISTANCE',
    name: 'Paseo del granjero',
    compound: true,
    p: ['FOREARMS', 'TRAPS'],
    s: ['ABS', 'GLUTES'],
    description:
      'Caminas una distancia con una pesa pesada en cada mano. Trabaja agarre, trapecio y abdomen; también es una prueba de HYROX.',
    steps: [
      'Coge una pesa en cada mano agachándote con la espalda recta.',
      'Ponte de pie con los hombros atrás y el pecho alto.',
      'Camina con pasos cortos y firmes sin dejar que las pesas te balanceen.',
      'Al acabar, déjalas en el suelo doblando las rodillas.',
    ],
  },
  {
    code: 'barbell_thruster',
    name: 'Thruster',
    compound: true,
    p: ['QUADS', 'FRONT_DELT'],
    s: ['GLUTES', 'TRICEPS'],
    description:
      'Sentadilla frontal seguida de press sobre la cabeza en un solo movimiento. Ejercicio de cuerpo completo muy exigente.',
    steps: [
      'Coloca la barra sobre los hombros delanteros con los codos altos.',
      'Baja en sentadilla frontal con el pecho alto.',
      'Sube con fuerza y aprovecha el impulso para empujar la barra sobre la cabeza.',
      'Bájala a los hombros y enlaza con la siguiente sentadilla.',
    ],
  },
  {
    code: 'burpee',
    name: 'Burpees',
    compound: true,
    bodyweight: true,
    p: ['QUADS', 'CHEST'],
    s: ['FRONT_DELT', 'TRICEPS'],
    i: ['ABS'],
    description:
      'Bajas al suelo, haces una flexión, vuelves a ponerte de pie y saltas. Ejercicio de cuerpo completo y de condición física.',
    steps: [
      'De pie, agáchate y apoya las manos en el suelo.',
      'Echa los pies atrás de un salto y baja el pecho al suelo.',
      'Sube, trae los pies hacia las manos de un salto.',
      'Ponte de pie y salta con los brazos arriba.',
    ],
  },
  {
    code: 'box_jump',
    name: 'Saltos al cajón',
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
    code: 'barbell_power_clean',
    name: 'Cargada de potencia',
    compound: true,
    p: ['GLUTES', 'HAMSTRINGS', 'TRAPS'],
    s: ['QUADS', 'LOWER_BACK'],
    i: ['FOREARMS'],
    description:
      'Subes la barra del suelo a los hombros de un tirón explosivo. Movimiento olímpico de potencia para todo el cuerpo.',
    steps: [
      'Con la barra sobre la mitad del pie, agárrala algo más abierto que los hombros con la espalda recta.',
      'Despégala del suelo empujando con las piernas, pegada al cuerpo.',
      'Al pasar las rodillas, estira la cadera de golpe y encoge los hombros.',
      'Mete los codos rápido por debajo y recibe la barra sobre los hombros con las rodillas un poco dobladas.',
    ],
  },
  // HYROX y cardio de gimnasio: van por distancia, tiempo o calorías.
  {
    code: 'running',
    name: 'Carrera',
    measure: 'DISTANCE',
    compound: true,
    bodyweight: true,
    p: ['QUADS', 'CALVES'],
    s: ['HAMSTRINGS', 'GLUTES'],
    description:
      'Correr, en la calle o en cinta. Se apunta por distancia o por tiempo.',
    steps: [
      'Empieza a un ritmo suave unos minutos para calentar.',
      'Corre con el tronco erguido, los hombros relajados y pasos cortos y rápidos.',
      'Apoya el pie bajo el cuerpo, no muy por delante.',
      'Acaba bajando el ritmo y camina un poco antes de parar.',
    ],
  },
  {
    code: 'ski_erg',
    name: 'SkiErg',
    measure: 'DISTANCE',
    compound: true,
    bodyweight: true,
    p: ['LATS', 'TRICEPS'],
    s: ['ABS', 'FRONT_DELT'],
    i: ['GLUTES'],
    description:
      'Máquina que imita la doble pulsación del esquí de fondo: tiras de dos asas hacia abajo. Trabaja espalda, brazos y abdomen, y mucha condición física.',
    steps: [
      'De pie frente a la máquina, agarra las asas con los brazos estirados arriba.',
      'Tira hacia abajo doblando un poco la cadera y las rodillas.',
      'Termina con las manos junto a los muslos.',
      'Vuelve a subir los brazos y estírate para la siguiente.',
    ],
  },
  {
    code: 'rowing_machine',
    name: 'Remo ergómetro',
    measure: 'DISTANCE',
    compound: true,
    bodyweight: true,
    p: ['LATS', 'QUADS'],
    s: ['HAMSTRINGS', 'GLUTES', 'BICEPS'],
    description:
      'Remo ergómetro: empujas con las piernas y tiras con los brazos hacia el abdomen. Cardio que trabaja casi todo el cuerpo.',
    steps: [
      'Sujeta los pies con las cintas y agarra el asa con los brazos estirados.',
      'Empuja primero con las piernas, luego echa un poco el tronco atrás.',
      'Termina tirando del asa hacia la parte baja del pecho.',
      'Vuelve en orden inverso: brazos, tronco y piernas.',
    ],
  },
  {
    code: 'bike_erg',
    name: 'BikeErg',
    measure: 'DISTANCE',
    compound: true,
    bodyweight: true,
    p: ['QUADS'],
    s: ['GLUTES', 'CALVES'],
    description:
      'Bicicleta ergómetro de resistencia por aire. Cardio para las piernas que se mide por distancia, tiempo o calorías.',
    steps: [
      'Ajusta el sillín para que la rodilla quede casi estirada abajo.',
      'Empieza a pedalear suave para calentar.',
      'Mantén el tronco quieto y empuja con toda la pierna.',
      'Sube la cadencia o la resistencia según el entreno.',
    ],
  },
  {
    code: 'assault_bike',
    name: 'Assault bike',
    measure: 'CALORIES',
    compound: true,
    bodyweight: true,
    p: ['QUADS'],
    s: ['GLUTES', 'FRONT_DELT'],
    i: ['LATS'],
    description:
      'Bicicleta de aire con brazos móviles: empujas y tiras con los brazos mientras pedaleas. Cardio de cuerpo completo muy intenso.',
    steps: [
      'Ajusta el sillín y agarra los brazos de la bici.',
      'Pedalea a la vez que empujas y tiras de los brazos.',
      'Mantén el tronco erguido y estable.',
      'Cuanto más fuerte vas, más resistencia hace: regula con tu esfuerzo.',
    ],
  },
  {
    code: 'sled_push',
    name: 'Empuje de trineo',
    measure: 'DISTANCE',
    compound: true,
    p: ['QUADS', 'GLUTES'],
    s: ['CALVES', 'FRONT_DELT'],
    i: ['ABS', 'TRICEPS'],
    description:
      'Empujas un trineo con peso a lo largo de una distancia. Piernas y condición física; es una de las pruebas de HYROX.',
    steps: [
      'Agarra los postes del trineo con los brazos estirados o doblados.',
      'Inclina el cuerpo hacia delante con la espalda recta.',
      'Empuja con pasos cortos y potentes, apoyando la punta de los pies.',
      'Mantén el ritmo constante hasta el final de la distancia.',
    ],
  },
  {
    code: 'sled_pull',
    name: 'Arrastre de trineo',
    measure: 'DISTANCE',
    compound: true,
    p: ['HAMSTRINGS', 'LATS'],
    s: ['BICEPS', 'GLUTES', 'FOREARMS'],
    description:
      'Arrastras un trineo con peso tirando de una cuerda o un arnés. Espalda, piernas y agarre; también es una prueba de HYROX.',
    steps: [
      'Coge la cuerda con las dos manos, con el trineo delante.',
      'Ponte de pie con las piernas algo dobladas y la espalda recta.',
      'Tira de la cuerda mano tras mano mientras retrocedes con pasos cortos.',
      'Sigue hasta llevar el trineo a la línea final.',
    ],
  },
  {
    code: 'burpee_broad_jump',
    name: 'Burpee con salto largo',
    measure: 'DISTANCE',
    compound: true,
    bodyweight: true,
    p: ['QUADS', 'GLUTES'],
    s: ['CHEST', 'TRICEPS'],
    i: ['ABS'],
    description:
      'Burpee seguido de un salto largo hacia delante, avanzando por una distancia. Prueba de HYROX muy exigente.',
    steps: [
      'Baja al suelo, echa los pies atrás y apoya el pecho.',
      'Sube y trae los pies hacia las manos.',
      'Salta hacia delante con los dos pies todo lo lejos que puedas.',
      'Aterriza flexionando las rodillas y enlaza con el siguiente burpee.',
    ],
  },
  {
    code: 'sandbag_lunges',
    name: 'Zancadas con saco',
    measure: 'DISTANCE',
    compound: true,
    p: ['QUADS', 'GLUTES'],
    s: ['HAMSTRINGS', 'ABS'],
    description:
      'Zancadas caminando con un saco de arena sobre los hombros. Piernas y estabilidad; prueba de HYROX.',
    steps: [
      'Coloca el saco sobre los hombros por detrás del cuello.',
      'Da un paso largo adelante y baja hasta que la rodilla de atrás toque o casi toque el suelo.',
      'Empuja con la pierna de delante y avanza con la otra.',
      'Mantén el tronco recto todo el recorrido.',
    ],
  },
  {
    code: 'wall_ball',
    name: 'Wall balls',
    compound: true,
    p: ['QUADS', 'FRONT_DELT'],
    s: ['GLUTES', 'TRICEPS'],
    description:
      'Sentadilla con un balón medicinal y lanzamiento a una diana en la pared. Piernas, hombros y condición física.',
    steps: [
      'Ponte frente a la pared sujetando el balón a la altura del pecho.',
      'Baja en sentadilla con el pecho alto.',
      'Sube con fuerza y lanza el balón a la diana.',
      'Recógelo y enlaza con la siguiente sentadilla.',
    ],
  },
  {
    code: 'jump_rope',
    name: 'Comba',
    measure: 'TIME',
    bodyweight: true,
    p: ['CALVES'],
    i: ['QUADS'],
    description:
      'Saltar a la comba. Cardio, coordinación y gemelos; se apunta por tiempo.',
    steps: [
      'Sujeta la comba con los codos pegados al cuerpo.',
      'Gira la cuerda con las muñecas, no con los brazos.',
      'Salta lo justo para que pase la cuerda, sobre la punta de los pies.',
      'Mantén un ritmo constante y respira.',
    ],
  },
  {
    code: 'treadmill_incline_walk',
    name: 'Caminar en cinta inclinada',
    measure: 'TIME',
    compound: true,
    bodyweight: true,
    p: ['GLUTES', 'CALVES'],
    s: ['HAMSTRINGS'],
    description:
      'Caminar en la cinta con mucha inclinación. Cardio de baja intensidad que trabaja glúteos y gemelos.',
    steps: [
      'Pon la cinta a paso de caminar y sube la inclinación poco a poco.',
      'Camina erguido, sin agarrarte a las barras.',
      'Apoya todo el pie en cada paso.',
      'Ajusta velocidad e inclinación para mantener un esfuerzo moderado.',
    ],
  },
  // ── Ampliación (TASK-430): máquinas, variantes y core ─────────────────────
  {
    code: 'smith_incline_bench_press',
    name: 'Press inclinado en máquina Smith',
    compound: true,
    p: ['CHEST'],
    s: ['FRONT_DELT', 'TRICEPS'],
    description:
      'El press inclinado con la barra guiada por los raíles de la máquina Smith. Al no tener que equilibrar la barra, puedes centrarte en empujar con la parte alta del pecho.',
    steps: [
      'Coloca un banco inclinado a 30–45° bajo la barra, de modo que baje a la parte alta del pecho.',
      'Desbloquea la barra girándola con los brazos estirados.',
      'Bájala controlada hasta rozar el pecho, justo bajo las clavículas.',
      'Empuja hasta estirar los brazos y vuelve a bloquearla al terminar.',
    ],
  },
  {
    code: 'smith_decline_bench_press',
    name: 'Press declinado en máquina Smith',
    compound: true,
    p: ['CHEST'],
    s: ['TRICEPS', 'FRONT_DELT'],
    description:
      'Press con el banco declinado y la barra guiada. Carga sobre todo la parte baja del pecho, con un recorrido algo más corto que el press plano.',
    steps: [
      'Engancha los pies en el banco declinado y túmbate bajo la barra.',
      'Desbloquea la barra con los brazos estirados encima del pecho.',
      'Bájala hasta la parte baja del pecho con los codos a unos 45°.',
      'Empuja hasta estirar los brazos sin rebotar abajo.',
    ],
  },
  {
    code: 'cable_front_raise',
    name: 'Elevación frontal en polea',
    p: ['FRONT_DELT'],
    i: ['SIDE_DELT', 'CHEST'],
    description:
      'Subes el brazo estirado por delante del cuerpo tirando de una polea baja. La polea mantiene la tensión en todo el recorrido, también abajo.',
    steps: [
      'Ponte de espaldas a la polea baja con el agarre en la mano y el brazo estirado.',
      'Sube el brazo por delante, con el codo apenas flexionado, hasta la altura de los ojos.',
      'Para un instante arriba sin echar el cuerpo hacia atrás.',
      'Baja despacio hasta el muslo.',
    ],
  },
  {
    code: 'rope_pushdown',
    name: 'Extensión de tríceps con cuerda',
    p: ['TRICEPS'],
    description:
      'Empujas hacia abajo una cuerda en la polea alta estirando los codos. Al separar las puntas de la cuerda abajo, el tríceps termina más contraído que con la barra.',
    steps: [
      'Agarra la cuerda en la polea alta con los codos pegados al cuerpo.',
      'Empuja hacia abajo hasta estirar los brazos, sin mover los codos.',
      'Abajo, separa las puntas de la cuerda hacia los lados.',
      'Sube controlado hasta que los antebrazos queden por encima de la horizontal.',
    ],
  },
  {
    code: 'overhead_triceps_extension',
    name: 'Extensión de tríceps sobre la cabeza con barra Z',
    p: ['TRICEPS'],
    description:
      'Con una barra Z encima de la cabeza, la bajas por detrás doblando solo los codos y la vuelves a subir. Estira el tríceps más que los ejercicios con los brazos abajo.',
    steps: [
      'De pie o sentado, sube la barra Z encima de la cabeza con los brazos estirados.',
      'Baja la barra por detrás de la cabeza doblando solo los codos.',
      'Mantén los codos apuntando al frente y cerca de la cabeza.',
      'Estira los brazos hasta arriba sin arquear la espalda.',
    ],
  },
  {
    code: 'seated_dip_machine',
    name: 'Fondos en máquina',
    compound: true,
    p: ['TRICEPS'],
    s: ['CHEST', 'FRONT_DELT'],
    description:
      'Sentado en la máquina, empujas las asas hacia abajo hasta estirar los brazos. El gesto de los fondos con el peso que elijas y sin tener que sostener el cuerpo.',
    steps: [
      'Siéntate con la espalda apoyada y agarra las asas a los lados.',
      'Empuja hacia abajo hasta estirar los brazos.',
      'Mantén los codos cerca del cuerpo, apuntando hacia atrás.',
      'Sube controlado hasta que los codos queden a 90°.',
    ],
  },
  {
    code: 'assisted_dip',
    name: 'Fondos asistidos',
    compound: true,
    p: ['CHEST', 'TRICEPS'],
    s: ['FRONT_DELT'],
    description:
      'Fondos en paralelas con una plataforma que te empuja hacia arriba y te quita parte del peso. Sirven para aprender los fondos o hacer más repeticiones.',
    steps: [
      'Elige la ayuda en la máquina y apoya las rodillas en la plataforma.',
      'Sujétate en las paralelas con los brazos estirados.',
      'Baja doblando los codos hasta que queden a 90°, con el pecho algo inclinado.',
      'Empuja hasta estirar los brazos sin bloquear los codos de golpe.',
    ],
  },
  {
    code: 'iso_lateral_row',
    name: 'Remo en máquina iso-lateral',
    compound: true,
    p: ['LATS'],
    s: ['TRAPS', 'REAR_DELT', 'BICEPS'],
    description:
      'Remo en una máquina con un brazo de palanca para cada lado, apoyando el pecho en el respaldo. Cada brazo tira por su cuenta, así no compensa el más fuerte.',
    steps: [
      'Ajusta el asiento para que las asas queden a la altura del pecho y apoya el pecho en el respaldo.',
      'Tira de las asas llevando los codos hacia atrás, pegados al cuerpo.',
      'Junta las escápulas al final del recorrido.',
      'Estira los brazos despacio hasta notar la espalda estirada.',
    ],
  },
  {
    code: 'assisted_chin_up',
    name: 'Dominadas supinas asistidas',
    compound: true,
    p: ['LATS', 'BICEPS'],
    s: ['TRAPS', 'REAR_DELT'],
    description:
      'Dominadas con las palmas hacia ti y una plataforma que te ayuda a subir. El agarre supino mete más bíceps que la dominada normal.',
    steps: [
      'Elige la ayuda y apoya las rodillas en la plataforma.',
      'Agarra la barra con las palmas hacia ti, a la anchura de los hombros.',
      'Sube hasta pasar la barbilla por encima de la barra, llevando los codos hacia abajo.',
      'Baja del todo hasta estirar los brazos.',
    ],
  },
  {
    code: 'decline_crunch',
    name: 'Encogimiento declinado',
    bodyweight: true,
    p: ['ABS'],
    description:
      'Encogimiento abdominal en un banco declinado, con los pies enganchados. La inclinación hace el ejercicio más duro que en el suelo.',
    steps: [
      'Engancha los pies en el banco declinado y túmbate con las manos en el pecho.',
      'Sube el tronco enrollando la espalda, vértebra a vértebra.',
      'Para cuando los hombros estén bien despegados del banco.',
      'Baja despacio sin dejar caer la espalda.',
    ],
  },
  {
    code: 'scissor_kicks',
    name: 'Tijeras',
    bodyweight: true,
    p: ['ABS'],
    i: ['QUADS'],
    description:
      'Tumbado boca arriba, subes y bajas las piernas estiradas alternándolas, como unas tijeras. Trabaja la parte baja del abdomen y la estabilidad del tronco.',
    steps: [
      'Túmbate boca arriba con las manos bajo los glúteos.',
      'Levanta las piernas estiradas unos centímetros del suelo.',
      'Sube una pierna y baja la otra, alternando sin tocar el suelo.',
      'Mantén la zona lumbar pegada al suelo todo el rato.',
    ],
  },
  {
    code: 'dumbbell_romanian_deadlift',
    name: 'Peso muerto rumano con mancuernas',
    compound: true,
    p: ['HAMSTRINGS', 'GLUTES'],
    s: ['LOWER_BACK'],
    i: ['FOREARMS'],
    description:
      'Bajas dos mancuernas por delante de las piernas echando la cadera atrás, con las rodillas apenas flexionadas. Estira y fortalece isquios y glúteos.',
    steps: [
      'De pie, con una mancuerna en cada mano delante de los muslos.',
      'Echa la cadera atrás y baja las mancuernas rozando las piernas, con la espalda recta.',
      'Para al notar el estiramiento detrás de los muslos, más o menos a media tibia.',
      'Sube empujando la cadera hacia delante y aprieta los glúteos.',
    ],
  },
  {
    code: 'dumbbell_lunge',
    name: 'Zancada con mancuernas',
    compound: true,
    p: ['QUADS', 'GLUTES'],
    s: ['HAMSTRINGS'],
    i: ['FOREARMS'],
    description:
      'La zancada con una mancuerna en cada mano. Trabaja cada pierna por separado y mejora el equilibrio.',
    steps: [
      'De pie con una mancuerna en cada mano a los lados.',
      'Da un paso largo al frente y baja hasta que la rodilla de atrás casi toque el suelo.',
      'La rodilla de delante va en la línea del pie, sin pasar mucho la punta.',
      'Empuja con la pierna de delante para volver y cambia de pierna.',
    ],
  },
  {
    code: 'cable_hammer_curl',
    name: 'Curl martillo con cuerda en polea',
    p: ['BICEPS'],
    s: ['FOREARMS'],
    description:
      'Curl en la polea baja con la cuerda y las palmas mirándose. Además del bíceps, carga el braquial y el antebrazo.',
    steps: [
      'De frente a la polea baja, agarra la cuerda con las palmas enfrentadas.',
      'Sube las manos doblando los codos, pegados al cuerpo.',
      'Arriba, aprieta un instante sin adelantar los codos.',
      'Baja despacio hasta estirar los brazos.',
    ],
  },
  {
    code: 'dumbbell_skull_crusher',
    name: 'Press francés con mancuernas',
    p: ['TRICEPS'],
    description:
      'Tumbado en el banco, bajas dos mancuernas hacia los lados de la cabeza doblando solo los codos. Cada brazo trabaja por su cuenta y las muñecas van más cómodas que con barra.',
    steps: [
      'Túmbate con una mancuerna en cada mano y los brazos estirados sobre el pecho.',
      'Baja las mancuernas hacia los lados de la cabeza doblando solo los codos.',
      'Mantén los codos apuntando al techo, sin abrirlos.',
      'Estira los brazos hasta arriba.',
    ],
  },
  {
    code: 'single_leg_press',
    name: 'Prensa a una pierna',
    compound: true,
    p: ['QUADS', 'GLUTES'],
    s: ['HAMSTRINGS'],
    description:
      'La prensa de piernas empujando con una sola pierna. Corrige diferencias de fuerza entre piernas sin cargar la espalda.',
    steps: [
      'Siéntate en la prensa y apoya un pie en el centro de la plataforma.',
      'Quita los seguros y baja la plataforma doblando la rodilla hacia el pecho.',
      'Para antes de que la zona lumbar se despegue del respaldo.',
      'Empuja con todo el pie hasta casi estirar la pierna y cambia de lado.',
    ],
  },
  {
    code: 'weighted_pull_up',
    name: 'Dominadas lastradas',
    compound: true,
    p: ['LATS'],
    s: ['BICEPS', 'TRAPS', 'REAR_DELT'],
    i: ['FOREARMS'],
    description:
      'Dominadas con peso extra colgado de un cinturón o entre los pies. Para seguir ganando fuerza cuando ya haces bastantes con tu peso.',
    steps: [
      'Cuélgate el disco o la mancuerna del cinturón y agarra la barra algo más abierto que los hombros.',
      'Sube llevando los codos hacia abajo y atrás hasta pasar la barbilla.',
      'Evita balancearte: el peso extra lo hace más fácil de perder.',
      'Baja controlado hasta estirar los brazos.',
    ],
  },
  {
    code: 'weighted_dip',
    name: 'Fondos lastrados',
    compound: true,
    p: ['CHEST', 'TRICEPS'],
    s: ['FRONT_DELT'],
    description:
      'Fondos en paralelas con peso extra colgado del cinturón. Uno de los mejores ejercicios de empuje para pecho y tríceps.',
    steps: [
      'Cuélgate el peso del cinturón y súbete a las paralelas con los brazos estirados.',
      'Baja doblando los codos hasta que queden a 90°, con el pecho algo inclinado.',
      'No bajes más de lo que tus hombros aguanten cómodos.',
      'Empuja hasta estirar los brazos.',
    ],
  },
  {
    code: 'neutral_grip_lat_pulldown',
    name: 'Jalón al pecho con agarre neutro',
    compound: true,
    p: ['LATS'],
    s: ['BICEPS', 'TRAPS'],
    description:
      'Jalón en polea alta con un agarre de palmas enfrentadas. Suele ser cómodo para los hombros y deja tirar con fuerza.',
    steps: [
      'Siéntate con los muslos bajo los rodillos y agarra el triángulo o el agarre neutro.',
      'Tira hacia la parte alta del pecho llevando los codos hacia abajo.',
      'Inclínate un poco hacia atrás, sin balancearte.',
      'Sube despacio hasta estirar los brazos del todo.',
    ],
  },
  {
    code: 'reverse_grip_lat_pulldown',
    name: 'Jalón al pecho supino',
    compound: true,
    p: ['LATS', 'BICEPS'],
    s: ['TRAPS'],
    description:
      'Jalón con las palmas hacia ti y las manos a la anchura de los hombros. Como la dominada supina, mete más bíceps.',
    steps: [
      'Agarra la barra con las palmas hacia ti, a la anchura de los hombros.',
      'Tira hacia el pecho llevando los codos hacia abajo y pegados.',
      'Junta las escápulas abajo.',
      'Sube controlado hasta estirar los brazos.',
    ],
  },
  {
    code: 'wide_grip_cable_row',
    name: 'Remo en polea con agarre abierto',
    compound: true,
    p: ['LATS', 'TRAPS'],
    s: ['REAR_DELT', 'BICEPS'],
    description:
      'Remo sentado en polea con una barra ancha. Al abrir los codos, trabaja más la parte alta de la espalda y el hombro posterior.',
    steps: [
      'Siéntate con los pies apoyados y agarra la barra ancha con los brazos estirados.',
      'Tira hacia la parte baja del pecho abriendo los codos.',
      'Junta las escápulas sin echar el tronco hacia atrás.',
      'Estira los brazos despacio.',
    ],
  },
  {
    code: 'machine_hip_thrust',
    name: 'Hip thrust en máquina',
    compound: true,
    p: ['GLUTES'],
    s: ['HAMSTRINGS'],
    description:
      'El hip thrust en una máquina con la almohadilla sobre la cadera. Más fácil de colocar que con barra y con el mismo trabajo de glúteo.',
    steps: [
      'Apoya la parte alta de la espalda en el respaldo y la almohadilla sobre la cadera.',
      'Empuja con los talones y sube la cadera hasta alinear rodillas, cadera y hombros.',
      'Aprieta los glúteos arriba un segundo.',
      'Baja la cadera controlada sin llegar a apoyar.',
    ],
  },
  {
    code: 'cable_pullover',
    name: 'Pullover en polea',
    p: ['LATS'],
    i: ['TRICEPS', 'ABS'],
    description:
      'De pie frente a la polea alta, bajas una barra o cuerda con los brazos casi estirados hasta los muslos. Aísla el dorsal sin que trabaje el bíceps.',
    steps: [
      'Agarra la barra de la polea alta con los brazos estirados e inclínate un poco hacia delante.',
      'Baja la barra en arco hasta los muslos sin doblar los codos.',
      'Aprieta la espalda abajo.',
      'Sube despacio hasta notar el dorsal estirado.',
    ],
  },
  {
    code: 'sumo_squat',
    name: 'Sentadilla sumo con mancuerna',
    compound: true,
    p: ['QUADS', 'GLUTES'],
    s: ['HAMSTRINGS'],
    description:
      'Sentadilla con las piernas muy abiertas y las puntas hacia fuera, sujetando una mancuerna entre las piernas. Carga más los aductores y el glúteo.',
    steps: [
      'Abre los pies bastante más que los hombros, con las puntas hacia fuera.',
      'Sujeta una mancuerna con las dos manos colgando entre las piernas.',
      'Baja con el tronco erguido, llevando las rodillas en la dirección de los pies.',
      'Sube empujando el suelo y aprieta los glúteos.',
    ],
  },
  {
    code: 'lying_leg_raise',
    name: 'Elevación de piernas tumbado',
    bodyweight: true,
    p: ['ABS'],
    description:
      'Tumbado boca arriba, subes las piernas estiradas hasta la vertical y las bajas sin tocar el suelo. Trabaja la parte baja del abdomen.',
    steps: [
      'Túmbate boca arriba con las manos a los lados o bajo los glúteos.',
      'Sube las piernas juntas y estiradas hasta la vertical.',
      'Bájalas despacio hasta casi tocar el suelo.',
      'Mantén la zona lumbar pegada al suelo.',
    ],
  },
  {
    code: 'hollow_hold',
    measure: 'TIME',
    name: 'Hollow hold',
    bodyweight: true,
    p: ['ABS'],
    description:
      'Tumbado boca arriba, aguantas brazos y piernas estirados y despegados del suelo con la zona lumbar pegada. Un ejercicio isométrico de core muy usado en gimnasia.',
    steps: [
      'Túmbate boca arriba y pega la zona lumbar al suelo.',
      'Despega hombros y piernas, con los brazos estirados hacia atrás.',
      'Aguanta la postura en forma de plátano sin que la espalda se arquee.',
      'Si cuesta, dobla las rodillas o lleva los brazos al frente.',
    ],
  },
  {
    code: 'superman',
    name: 'Superman',
    bodyweight: true,
    p: ['LOWER_BACK'],
    s: ['GLUTES'],
    description:
      'Tumbado boca abajo, levantas a la vez brazos y piernas del suelo. Fortalece la zona lumbar y los glúteos sin material.',
    steps: [
      'Túmbate boca abajo con los brazos estirados por delante.',
      'Levanta a la vez brazos, pecho y piernas unos centímetros.',
      'Mira al suelo para no forzar el cuello.',
      'Aguanta un segundo y baja despacio.',
    ],
  },
  {
    code: 'cable_woodchop',
    name: 'Leñador en polea',
    p: ['ABS'],
    i: ['FRONT_DELT'],
    description:
      'Giras el tronco tirando en diagonal de una polea, de arriba abajo o al revés. Trabaja los oblicuos y la rotación del tronco.',
    steps: [
      'Ponte de lado a la polea alta y agarra el asa con las dos manos.',
      'Tira en diagonal hacia la rodilla contraria girando el tronco.',
      'Pivota el pie de atrás y mantén los brazos casi estirados.',
      'Vuelve despacio y, al terminar, cambia de lado.',
    ],
  },
  {
    code: 'machine_crunch',
    name: 'Crunch en máquina',
    p: ['ABS'],
    description:
      'Encogimiento abdominal sentado en una máquina con el peso que elijas. Permite progresar en el abdomen como en cualquier otro músculo.',
    steps: [
      'Siéntate y coloca los rodillos o las asas sobre el pecho.',
      'Enrolla el tronco hacia delante llevando el pecho a la cadera.',
      'Aprieta el abdomen abajo sin tirar con los brazos.',
      'Vuelve despacio sin dejar que el peso choque.',
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
  hybrid: 'STRENGTH',
  football_7: 'OTHER_CARDIO',
  futsal: 'OTHER_CARDIO',
  handball: 'OTHER_CARDIO',
  volleyball: 'OTHER_CARDIO',
  beach_volleyball: 'OTHER_CARDIO',
  rugby: 'OTHER_CARDIO',
  hockey: 'OTHER_CARDIO',
  water_polo: 'OTHER_CARDIO',
  tennis: 'OTHER_CARDIO',
  tennis_doubles: 'OTHER_CARDIO',
  squash: 'OTHER_CARDIO',
  badminton: 'OTHER_CARDIO',
  table_tennis: 'OTHER_CARDIO',
  fronton: 'OTHER_CARDIO',
  boxing: 'OTHER_CARDIO',
  martial_arts: 'OTHER_CARDIO',
  crossfit: 'STRENGTH',
  spinning: 'CYCLE',
  pilates: 'OTHER',
  functional: 'OTHER_CARDIO',
  trail_running: 'RUN',
  mountain_biking: 'CYCLE',
  skiing: 'OTHER_CARDIO',
  cross_country_skiing: 'OTHER_CARDIO',
  snowboard: 'OTHER_CARDIO',
  surf: 'OTHER',
  kayak: 'OTHER_CARDIO',
  skating: 'OTHER_CARDIO',
  golf: 'OTHER',
  horse_riding: 'OTHER',
};
