import { getApiUrl } from "../api.js";
import { PROJECT200_MUSCLE_BY_ID, normalizeProject200MuscleSelections, project200MuscleIdsFor } from "./exercise-muscles.js";
import { PROJECT200_MUSCLE_MAPS } from "./exercise-muscle-maps.js";
import { calculateProject200ExerciseMuscleGains, project200CurrentMuscleProgress, project200DecayedMusclePoints } from "./exercise-muscle-progress.js?v=20260910-overload-v1";
import { exerciseCatalogSearchScore, sortExerciseCatalog } from "./exercise-catalog-search.js?v=20260911-v1";

const TOKEN_KEY = "turma_do_printy_token";
const PROFILE_KEY = "project_200_profile_v1";
const fatLossExercises = [
  ["walk","Caminhar","gps","Ao ar livre","Mantenha postura alta, passos naturais e ritmo que permita respirar com controle."],
  ["bike","Bicicleta","minutes","Bicicleta comum","Ajuste o banco, pedale de forma contínua e evite travar os joelhos."],
  ["treadmill","Esteira","minutes","Esteira","Comece devagar, olhe para frente e aumente a velocidade apenas quando estiver estável."],
  ["run","Corrida","minutes","Natural","Pouse o pé abaixo do corpo e mantenha passos curtos e leves."],
  ["elliptical","Elíptico","minutes","Elíptico","Apoie todo o pé, segure as alças sem tensão e mantenha movimento contínuo."],
  ["rowing","Remo ergométrico","minutes","Máquina de remo","Empurre com as pernas, incline pouco o tronco e só depois puxe com os braços."],
  ["stair","Escada ergométrica","minutes","Máquina de escada","Apoie o pé inteiro e evite sustentar o peso nos braços."],
  ["rope","Pular corda","minutes","Corda","Faça saltos baixos, gire a corda pelos punhos e pouse suavemente."],
  ["swim","Natação","minutes","Piscina","Alongue a braçada, solte o ar dentro da água e mantenha ritmo confortável."],
  ["dance","Dança aeróbica","minutes","Natural","Mantenha o corpo solto e siga movimentos contínuos no seu ritmo."],
  ["hike","Trilha","minutes","Natural","Use calçado firme, encurte o passo nas subidas e observe o terreno."],
  ["jumping-jack","Polichinelo","minutes","Natural","Abra pernas e braços juntos e pouse com joelhos levemente flexionados."],
  ["mountain-climber","Escalador","minutes","Natural","Mãos sob os ombros, abdômen firme e joelhos alternando à frente."],
  ["burpee","Burpee","minutes","Natural","Agache, leve os pés para trás, volte e levante sem perder o controle da lombar."],
  ["high-knees","Corrida com joelhos altos","minutes","Natural","Corra parado elevando os joelhos e aterrisse na parte da frente do pé."],
  ["shadow-boxing","Boxe sombra","minutes","Natural","Guarda alta, golpes controlados e pés sempre em movimento."],
  ["skating","Patinação","minutes","Patins","Flexione os joelhos, mantenha o centro de equilíbrio baixo e deslize lateralmente."],
  ["water-aerobics","Hidroginástica","minutes","Piscina","Use a resistência da água com movimentos amplos e controlados."],
  ["spinning","Spinning","minutes","Bicicleta de spinning","Ajuste banco e guidão, mantenha cadência estável e resistência segura."],
  ["battle-rope","Corda naval","minutes","Corda naval","Base firme, abdômen ativo e ondas alternadas produzidas pelos braços." ]
].map(([id,name,tracking,equipment,cue]) => ({ id,name,tracking,equipment,cue,category:"aerobic" }));

const strengthExercises = [
  ["squat","Agachamento livre","Natural","Pés na largura dos ombros; quadril para trás e joelhos acompanhando os pés."],
  ["leg-press","Leg press","Máquina leg press","Pés firmes; desça sem tirar o quadril do banco e empurre sem travar os joelhos."],
  ["leg-extension","Cadeira extensora","Máquina extensora","Alinhe o joelho ao eixo, estenda as pernas e desça controlando."],
  ["leg-curl","Mesa flexora","Máquina flexora","Mantenha o quadril apoiado, flexione os joelhos e retorne devagar."],
  ["calf-raise","Elevação de panturrilha","Máquina ou degrau","Eleve os calcanhares ao máximo e desça com controle."],
  ["hip-thrust","Elevação pélvica","Banco e barra","Apoie as costas no banco e eleve o quadril contraindo os glúteos."],
  ["romanian-deadlift","Stiff","Barra ou halteres","Quadril para trás, coluna neutra e peso perto das pernas."],
  ["deadlift","Levantamento terra","Barra","Barra perto das canelas, peito aberto e subida empurrando o chão."],
  ["bench-press","Supino reto com barra","Banco e barra","Escápulas apoiadas, barra ao meio do peito e pés firmes."],
  ["dumbbell-press","Supino com halteres","Banco e halteres","Desça os halteres ao lado do peito e empurre mantendo os punhos firmes."],
  ["push-up","Flexão de braços","Natural","Corpo alinhado, mãos sob os ombros e peito descendo junto."],
  ["incline-bench","Supino inclinado","Banco inclinado e pesos","Mantenha o peito alto e empurre os pesos acima da parte superior do peito."],
  ["pec-deck","Voador peitoral","Máquina peck deck","Cotovelos apoiados, una os braços à frente e volte sem soltar o peso."],
  ["crossover","Crossover","Polias","Incline pouco o tronco e aproxime as mãos à frente do peito."],
  ["lat-pulldown","Puxada frontal","Máquina de puxada","Puxe a barra ao alto do peito sem jogar o tronco para trás."],
  ["pull-up","Barra fixa","Barra fixa","Comece pendurado, puxe o peito em direção à barra e desça controlando."],
  ["seated-row","Remada baixa","Máquina ou cabo","Peito aberto, puxe ao abdômen e aproxime as escápulas."],
  ["one-arm-row","Remada unilateral","Banco e halter","Apoie uma mão, coluna neutra e puxe o halter ao quadril."],
  ["barbell-row","Remada curvada","Barra","Incline o tronco com coluna neutra e puxe a barra ao abdômen."],
  ["overhead-press","Desenvolvimento de ombros","Halteres ou máquina","Abdômen firme e pesos subindo sem arquear a lombar."],
  ["lateral-raise","Elevação lateral","Halteres","Cotovelos levemente flexionados e braços subindo até a linha dos ombros."],
  ["front-raise","Elevação frontal","Halteres","Eleve os pesos à frente até os ombros sem balançar o tronco."],
  ["reverse-fly","Crucifixo inverso","Halteres ou máquina","Abra os braços para trás e aproxime as escápulas."],
  ["shrug","Encolhimento de ombros","Barra ou halteres","Eleve os ombros verticalmente e desça sem girá-los."],
  ["barbell-curl","Rosca direta","Barra","Cotovelos ao lado do corpo e barra subindo sem embalo."],
  ["dumbbell-curl","Rosca alternada","Halteres","Alterne os braços mantendo cotovelo parado e punho firme."],
  ["hammer-curl","Rosca martelo","Halteres","Palmas voltadas uma para a outra e cotovelos fixos."],
  ["triceps-pushdown","Tríceps na polia","Polia","Cotovelos junto ao corpo e mãos descendo até estender os braços."],
  ["overhead-triceps","Tríceps francês","Halter","Cotovelos apontados à frente e peso descendo atrás da cabeça."],
  ["bench-dip","Mergulho no banco","Banco","Mãos no banco, quadril próximo e cotovelos dobrando para trás."],
  ["crunch","Abdominal curto","Natural","Lombar apoiada e ombros subindo pela contração do abdômen."],
  ["leg-raise","Elevação de pernas","Natural ou barra","Mantenha o abdômen firme e eleve as pernas sem embalo."],
  ["russian-twist","Abdominal russo","Natural ou peso","Tronco inclinado, abdômen firme e rotação controlada dos ombros."],
  ["glute-bridge","Ponte de glúteos","Natural","Pés no chão, eleve o quadril e contraia os glúteos no topo."],
  ["bulgarian-squat","Agachamento búlgaro","Banco e halteres opcionais","Pé traseiro no banco e joelho da frente acompanhando o pé."],
  ["lunge","Avanço","Natural ou halteres","Dê um passo, desça os dois joelhos e empurre o chão para voltar."],
  ["hack-squat","Agachamento hack","Máquina hack","Costas apoiadas, desça com controle e empurre pela planta dos pés."],
  ["smith-squat","Agachamento Smith","Máquina Smith","Posicione os pés à frente e desça mantendo costas apoiadas na trajetória."],
  ["adductor","Cadeira adutora","Máquina adutora","Feche as pernas contra a resistência e retorne lentamente."],
  ["abductor","Cadeira abdutora","Máquina abdutora","Abra os joelhos contra a resistência sem inclinar o tronco." ]
].map(([id,name,equipment,cue]) => ({ id,name,equipment,cue,tracking:"series",category:"strength" }));

const calisthenicsExercises = [
  ["cal-bodyweight-squat","Agachamento com peso corporal","Pés na largura dos ombros, quadril para trás e peito aberto durante toda a descida."],
  ["cal-sumo-squat","Agachamento sumô","Abra bem os pés, aponte os joelhos para fora e desça mantendo a coluna neutra."],
  ["cal-jump-squat","Agachamento com salto","Desça com controle, salte verticalmente e aterrisse suavemente com joelhos flexionados."],
  ["cal-pistol-squat","Agachamento pistol","Estenda uma perna à frente, desça na outra e mantenha o tronco firme sem perder o equilíbrio."],
  ["cal-shrimp-squat","Agachamento camarão","Dobre uma perna atrás do corpo e agache na perna de apoio com movimento lento."],
  ["cal-forward-lunge","Afundo alternado","Dê um passo à frente, desça os dois joelhos e retorne empurrando o chão."],
  ["cal-reverse-lunge","Afundo reverso","Leve um pé para trás, desça com controle e volte usando a força da perna da frente."],
  ["cal-side-lunge","Afundo lateral","Dê um passo amplo para o lado, leve o quadril para trás e mantenha a outra perna estendida."],
  ["cal-curtsy-lunge","Afundo cruzado","Cruze uma perna atrás da outra e desça mantendo o joelho da frente alinhado."],
  ["cal-cossack-squat","Agachamento cossaco","Transfira o peso para um lado, flexione uma perna e mantenha a outra estendida."],
  ["cal-single-calf","Panturrilha unilateral","Apoie todo o peso em um pé, eleve o calcanhar e desça lentamente."],
  ["cal-single-glute-bridge","Ponte unilateral","Mantenha um pé no chão, estenda a outra perna e eleve o quadril sem girar."],
  ["cal-frog-pump","Frog pump","Una as plantas dos pés, abra os joelhos e eleve o quadril contraindo os glúteos."],
  ["cal-donkey-kick","Coice de glúteo","Em quatro apoios, empurre um pé para cima sem arquear a lombar."],
  ["cal-fire-hydrant","Abdução em quatro apoios","Eleve um joelho para o lado mantendo quadril e tronco estáveis."],
  ["cal-push-up","Flexão tradicional","Corpo alinhado, mãos sob os ombros e peito descendo junto até perto do chão."],
  ["cal-knee-push-up","Flexão com joelhos","Apoie os joelhos, mantenha quadril e ombros alinhados e flexione os cotovelos."],
  ["cal-diamond-push-up","Flexão diamante","Aproxime as mãos abaixo do peito e mantenha os cotovelos próximos do corpo."],
  ["cal-wide-push-up","Flexão aberta","Posicione as mãos além dos ombros e desça o peito de forma controlada."],
  ["cal-archer-push-up","Flexão arqueiro","Desça em direção a uma mão enquanto o braço oposto permanece estendido."],
  ["cal-pike-push-up","Flexão pike","Eleve o quadril e leve o topo da cabeça em direção ao chão entre as mãos."],
  ["cal-hindu-push-up","Flexão hindu","Passe o peito próximo ao chão em um arco contínuo e retorne elevando o quadril."],
  ["cal-pseudo-planche","Flexão pseudo-planche","Gire levemente as mãos, incline os ombros à frente e desça com o corpo rígido."],
  ["cal-triceps-push-up","Flexão de tríceps","Mantenha mãos próximas e cotovelos apontados para trás durante o movimento."],
  ["cal-shoulder-tap","Prancha com toque no ombro","Em prancha alta, toque o ombro oposto sem deixar o quadril balançar."],
  ["cal-plank-up-down","Prancha sobe e desce","Alterne entre antebraços e mãos mantendo abdômen e quadril firmes."],
  ["cal-plank-jack","Prancha com abertura de pernas","Em prancha alta, abra e feche os pés sem elevar o quadril."],
  ["cal-cross-climber","Escalador cruzado","Leve cada joelho em direção ao cotovelo oposto mantendo os ombros sobre as mãos."],
  ["cal-bicycle-crunch","Abdominal bicicleta","Alterne cotovelo e joelho opostos sem puxar a cabeça com as mãos."],
  ["cal-reverse-crunch","Abdominal reverso","Traga os joelhos ao peito e retire suavemente o quadril do chão."],
  ["cal-v-up","Abdominal canivete","Eleve pernas e tronco ao mesmo tempo tentando aproximar mãos e pés."],
  ["cal-hollow-rock","Balanço hollow body","Pressione a lombar no chão e balance o corpo mantendo braços e pernas elevados."],
  ["cal-flutter-kick","Tesoura de pernas","Mantenha a lombar apoiada e alterne pequenos movimentos das pernas estendidas."],
  ["cal-heel-touch","Toque nos calcanhares","Com ombros elevados, incline o tronco alternadamente para tocar cada calcanhar."],
  ["cal-superman","Superman","De bruços, eleve braços e pernas sem forçar o pescoço ou comprimir a lombar."],
  ["cal-bird-dog","Bird dog","Em quatro apoios, estenda braço e perna opostos sem girar o quadril."],
  ["cal-dead-bug","Dead bug","Mantenha a lombar apoiada e estenda braço e perna opostos lentamente."],
  ["cal-inchworm","Caminhada das mãos","Incline o tronco, caminhe com as mãos até a prancha e retorne aos pés."],
  ["cal-bear-crawl","Caminhada do urso","Mantenha joelhos perto do chão e avance com mão e pé opostos."],
  ["cal-crab-walk","Caminhada do caranguejo","Com quadril elevado e barriga para cima, avance alternando mãos e pés."]
].map(([id,name,cue]) => ({ id,name,cue,equipment:"Nenhum equipamento",tracking:"series",category:"calisthenics" }));

const EXERCISE_CATEGORIES = [
  { id:"strength", label:"Musculação" },
  { id:"aerobic", label:"Aeróbico" },
  { id:"calisthenics", label:"Calistenia" },
  { id:"all", label:"Todos" }
];
const EXERCISES = [...strengthExercises, ...fatLossExercises, ...calisthenicsExercises];

function heuristicExerciseMuscles(exercise){
  const id=String(exercise?.id||"");
  const groups=[
    [/^(walk|treadmill|run|elliptical|stair|rope|swim|dance|hike|jumping-jack|high-knees|shadow-boxing|skating|water-aerobics|spinning|bike)$/, ["Cardio","Pernas"]],
    [/^(rowing|battle-rope)$/, ["Cardio","Costas","Braços"]],
    [/^(mountain-climber|burpee)$/, ["Cardio","Core","Pernas"]],
    [/(leg-extension)/, ["Quadríceps"]],
    [/(leg-curl)/, ["Posteriores da coxa","Panturrilhas"]],
    [/(calf)/, ["Panturrilhas"]],
    [/(hip-thrust|glute-bridge|frog-pump|donkey-kick)/, ["Glúteos","Posteriores da coxa","Core"]],
    [/(romanian-deadlift|deadlift)/, ["Posteriores da coxa","Glúteos","Lombar"]],
    [/(squat|leg-press|hack-squat|smith-squat|lunge|cossack|shrimp|pistol)/, ["Quadríceps","Glúteos","Posteriores da coxa"]],
    [/(adductor)/, ["Adutores"]],
    [/(abductor|fire-hydrant)/, ["Glúteo médio","Abdutores"]],
    [/(bench-press|dumbbell-press|incline-bench|pec-deck|crossover|push-up|bench-dip)/, ["Peitoral","Tríceps","Deltoides"]],
    [/(lat-pulldown|pull-up)/, ["Dorsais","Bíceps","Trapézio"]],
    [/(row)/, ["Dorsais","Bíceps","Trapézio"]],
    [/(overhead-press|pike-push-up|hindu-push-up)/, ["Deltoides","Tríceps","Core"]],
    [/(lateral-raise|front-raise)/, ["Deltoides"]],
    [/(reverse-fly|shrug)/, ["Trapézio","Deltoide posterior"]],
    [/(curl)/, ["Bíceps","Braquial","Antebraços"]],
    [/(triceps)/, ["Tríceps","Peitoral","Deltoides"]],
    [/(crunch|v-up|hollow|flutter|heel-touch|dead-bug|bicycle)/, ["Abdômen","Oblíquos","Core"]],
    [/(leg-raise)/, ["Abdômen","Flexores do quadril"]],
    [/(russian-twist|cross-climber)/, ["Oblíquos","Abdômen","Core"]],
    [/(shoulder-tap|plank)/, ["Core","Deltoides","Tríceps"]],
    [/(superman|bird-dog)/, ["Lombar","Glúteos","Core"]],
    [/(inchworm|bear-crawl|crab-walk)/, ["Core","Ombros","Pernas"]]
  ];
  return (groups.find(([pattern])=>pattern.test(id))?.[1]||[exercise?.tracking==="series"?"Corpo inteiro":"Cardio"]).slice(0,3);
}

const byId = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g,(character)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]);
const modal = byId("wellnessModal");
const elements = {
  title:byId("wellnessTitle"), headerIcon:byId("wellnessHeaderIcon"), calories:byId("wellnessCaloriesToday"), quality:byId("wellnessQualityToday"),
  qualityFill:byId("wellnessQualityFill"), mealCount:byId("wellnessMealCount"), lunaMessage:byId("wellnessLunaMessage"), foodForm:byId("wellnessFoodForm"),
  foodInput:byId("wellnessFoodInput"), timeQuestion:byId("wellnessTimeQuestion"), foodTime:byId("wellnessFoodTime"), foodSend:byId("wellnessFoodSend"),
  nutritionStatus:byId("wellnessNutritionStatus"), mealList:byId("wellnessMealList"), exerciseGrid:byId("wellnessExerciseGrid"), exerciseCategoryName:byId("wellnessExerciseCategoryName"), workoutHistory:byId("wellnessWorkoutHistory"), exerciseDailyCard:byId("wellnessExerciseDailyProgress"), exerciseDailyPlay:byId("wellnessExerciseDailyPlay"), exerciseDailyPercent:byId("wellnessExerciseDailyPercent"), exerciseDailyProgressFill:byId("wellnessExerciseDailyProgressFill"), dailyPlanLayer:byId("wellnessDailyPlanLayer"), dailyPlanList:byId("wellnessDailyPlanList"), dailyPlanStatus:byId("wellnessDailyPlanStatus"),
  muscleProgressMapTrack:byId("wellnessMuscleProgressMapTrack"), muscleProgressMapDots:byId("wellnessMuscleProgressMapDots"), muscleProgressSummary:byId("wellnessMuscleProgressSummary"),
  catalogLayer:byId("wellnessCatalogLayer"), catalogGrid:byId("wellnessCatalogGrid"), openCatalog:byId("wellnessOpenCatalog"), catalogSearch:byId("wellnessCatalogSearch"), catalogSearchClear:byId("wellnessCatalogSearchClear"), catalogFilterToggle:byId("wellnessCatalogFilterToggle"), catalogFilterCount:byId("wellnessCatalogFilterCount"), catalogFilterPanel:byId("wellnessCatalogFilterPanel"), catalogDifficultyFilter:byId("wellnessCatalogDifficultyFilter"), catalogMuscleOpen:byId("wellnessCatalogMuscleOpen"), catalogMuscleName:byId("wellnessCatalogMuscleName"), catalogFilterClear:byId("wellnessCatalogFilterClear"), catalogSort:byId("wellnessCatalogSort"), catalogResults:byId("wellnessCatalogResults"), catalogMuscleLayer:byId("wellnessCatalogMuscleLayer"), catalogMuscleTitle:byId("wellnessCatalogMuscleTitle"), catalogMuscleTrack:byId("wellnessCatalogMuscleTrack"), catalogMuscleDots:byId("wellnessCatalogMuscleDots"), catalogMuscleClear:byId("wellnessCatalogMuscleClear"),
  catalogAddLayer:byId("wellnessCatalogAddLayer"), catalogAddName:byId("wellnessCatalogAddName"), catalogAddFrame:byId("wellnessCatalogAddFrame"), catalogAddImage:byId("wellnessCatalogAddImage"), catalogAddVideo:byId("wellnessCatalogAddVideo"), catalogAddConfirm:byId("wellnessCatalogAddConfirm"), catalogAddStatus:byId("wellnessCatalogAddStatus"),
  activeWorkout:byId("wellnessActiveWorkout"), activeWorkoutImage:byId("wellnessActiveWorkoutImage"), activeWorkoutVideo:byId("wellnessActiveWorkoutVideo"), workoutName:byId("wellnessWorkoutName"), workoutCounter:byId("wellnessWorkoutCounter"), workoutDetail:byId("wellnessWorkoutDetail"),
  detail:byId("wellnessExerciseDetail"), detailCategory:byId("wellnessExerciseCategory"), detailName:byId("wellnessExerciseName"), detailFrame:byId("wellnessExerciseDetailFrame"), detailImage:byId("wellnessExerciseDetailImage"), detailVideo:byId("wellnessExerciseDetailVideo"), detailVideoInput:byId("wellnessExerciseVideoInput"), detailMediaLoaderText:byId("wellnessExerciseMediaLoaderText"),
  muscleMapSection:byId("wellnessExerciseMuscleMapSection"), muscleMapTrack:byId("wellnessExerciseMuscleMapTrack"), muscleMapDots:byId("wellnessExerciseMuscleMapDots"), muscleExercisesLayer:byId("wellnessMuscleExercisesLayer"), muscleExercisesName:byId("wellnessMuscleExercisesName"), muscleExercisesList:byId("wellnessMuscleExercisesList"),
  infoLayer:byId("wellnessExerciseInfoLayer"), infoCategory:byId("wellnessExerciseInfoCategory"), infoName:byId("wellnessExerciseInfoName"), infoAliases:byId("wellnessExerciseInfoAliases"), infoEquipment:byId("wellnessExerciseInfoEquipment"),
  infoMuscles:byId("wellnessExerciseInfoMuscles"), adminLayer:byId("wellnessExerciseAdminLayer"), adminProgress:byId("wellnessExerciseAdminProgress"), adminProgressFill:byId("wellnessExerciseAdminProgressFill"), adminProgressCount:byId("wellnessExerciseAdminProgressCount"), adminFill:byId("wellnessExerciseAdminFill"), adminNames:byId("wellnessExerciseAdminNames"), adminCreate:byId("wellnessExerciseAdminCreate"), adminStatus:byId("wellnessExerciseAdminStatus"),
  detailInstructions:byId("wellnessExerciseInstructions"), detailStart:byId("wellnessExerciseStart"), detailGoal:byId("wellnessExerciseGoal"), detailDelete:byId("wellnessExerciseDelete"), detailProgress:byId("wellnessExerciseProgress"), detailTotalPoints:byId("wellnessExerciseTotalPoints"), detailGoalProgress:byId("wellnessExerciseGoalProgress"),
  detailGenerate:byId("wellnessExerciseGenerate"), detailGenerateStatus:byId("wellnessExerciseGenerateStatus"),
  goalLayer:byId("wellnessGoalLayer"), goalForm:byId("wellnessGoalForm"), goalTitle:byId("wellnessGoalTitle"), goalHelp:byId("wellnessGoalHelp"),
  seriesGoalFields:byId("wellnessSeriesGoalFields"), minutesGoalFields:byId("wellnessMinutesGoalFields"), distanceGoalFields:byId("wellnessDistanceGoalFields"),
  targetSeries:byId("wellnessTargetSeries"), targetReps:byId("wellnessTargetReps"), targetMinutes:byId("wellnessTargetMinutes"), targetDistanceKm:byId("wellnessTargetDistanceKm"),
  exerciseWeekdays:byId("wellnessExerciseWeekdays"), goalStart:byId("wellnessGoalStart"), workoutLayer:byId("wellnessWorkoutLayer"), phaseLabel:byId("wellnessPhaseLabel"), phaseName:byId("wellnessPhaseExerciseName"),
  phaseUnit:byId("wellnessPhaseUnit"), phaseProgress:byId("wellnessWorkoutProgressRing"), workoutImage:byId("wellnessWorkoutExerciseImage"), workoutVideo:byId("wellnessWorkoutExerciseVideo"), workoutRest:byId("wellnessWorkoutRest"), workoutRestTime:byId("wellnessWorkoutRestTime"), workoutRestAdd:byId("wellnessWorkoutRestAdd"), workoutRestRemove:byId("wellnessWorkoutRestRemove"), workoutSeriesStatus:byId("wellnessWorkoutSeriesStatus"), workoutSeriesCount:byId("wellnessWorkoutSeriesCount"), workoutPrimary:byId("wellnessWorkoutPrimary"),
  workoutFinish:byId("wellnessWorkoutFinish"), workoutAdvance:byId("wellnessWorkoutAdvance"), workoutClose:byId("wellnessWorkoutClose"), workoutPreviousExercise:byId("wellnessWorkoutPreviousExercise"), workoutNextExercise:byId("wellnessWorkoutNextExercise"), workoutNextName:byId("wellnessWorkoutNextName"), workoutPlayerSlot:byId("wellnessWorkoutPlayerSlot"), repsLayer:byId("wellnessRepsLayer"), repsForm:byId("wellnessRepsForm"), repsInput:byId("wellnessRepsInput"),
  repsQuestion:byId("wellnessRepsQuestion"), askAgainOff:byId("wellnessAskAgainOff"), finishLayer:byId("wellnessFinishLayer"), finishForm:byId("wellnessFinishForm"),
  finishQuestion:byId("wellnessFinishQuestion"), discardWorkout:byId("wellnessDiscardWorkout"), completeLayer:byId("wellnessWorkoutCompleteLayer"), completeName:byId("wellnessWorkoutCompleteName"), completePortrait:byId("wellnessWorkoutCompletePortrait"), completeImage:byId("wellnessWorkoutCompleteImage"), completeVideo:byId("wellnessWorkoutCompleteVideo"), completeProgressFill:byId("wellnessWorkoutCompleteProgressFill"), completeProgressText:byId("wellnessWorkoutCompleteProgressText"), completeMap:byId("wellnessWorkoutCompleteMap"), completeDots:byId("wellnessWorkoutCompleteDots"), weightCard:byId("wellnessWeightCard"),
  weightCurrent:byId("wellnessWeightCurrent"), bmiSummary:byId("wellnessBmiSummary"), bmiMarker:byId("wellnessBmiMarker"), weightLayer:byId("wellnessWeightLayer"),
  weightModalCurrent:byId("wellnessWeightModalCurrent"), bmiValue:byId("wellnessBmiValue"), bmiModalMarker:byId("wellnessBmiModalMarker"), weightForm:byId("wellnessWeightForm"),
  heightInput:byId("wellnessHeightInput"), weightInput:byId("wellnessWeightInput"), weightHistory:byId("wellnessWeightHistory")
  ,mealConfigLayer:byId("wellnessMealConfigLayer"), mealConfigList:byId("wellnessMealConfigList"), mealConfigStatus:byId("wellnessMealConfigStatus"), mealAddLayer:byId("wellnessMealAddLayer"), mealAddTitle:byId("wellnessMealAddTitle"), mealAddStatus:byId("wellnessMealAddStatus"), foodMic:byId("wellnessFoodMic")
};
const phaseLayers = [elements.dailyPlanLayer,elements.catalogLayer,elements.catalogMuscleLayer,elements.catalogAddLayer,elements.detail,elements.muscleExercisesLayer,elements.infoLayer,elements.adminLayer,elements.goalLayer,elements.workoutLayer,elements.repsLayer,elements.finishLayer,elements.completeLayer,elements.weightLayer,elements.mealConfigLayer,elements.mealAddLayer].filter(Boolean);
const EXERCISE_IMAGE_PHASES = ["start","finish","muscle"];
const state = { tab:"nutrition", filter:"strength", catalogQuery:"", catalogType:"", catalogDifficulty:0, catalogMuscleId:"", catalogSort:"popular", catalogSearchTimer:null, dashboard:null, isAdmin:false, selectedExercise:null, selectedMuscleId:"", muscleReturnView:"detail", detailMode:"selected", goalEditMode:false, goalWeekDays:[1,2,3,4,5,6], workout:null, workoutNavigationWorkoutId:"", workoutNavigationExerciseId:"", steps:0, lastStepAt:0, motionListening:false, saveTimer:null, ticker:null, exerciseImageTimer:null, detailImageTimer:null, detailMuscleTimer:null, exerciseMuscleTimer:null, muscleProgressTimer:null, muscleCarouselTimer:null, muscleCarouselTouchedAt:0, provisionalMuscleProgress:new Map(), deletedWorkoutIds:new Set(), completionRunId:0, exerciseImagePhase:"start", detailImagePhase:"start", muscleNameIndex:0, pendingMeal:"", selectedMealSlot:"", gpsWatchId:null, gpsProvider:"", gpsLastPoint:null, gpsDistanceMeters:0, gpsAccuracy:null, gpsStatus:"GPS aguardando localização", gpsPlugin:null, seriesRepsDraft:null, seriesSaveChain:Promise.resolve(), seriesRestUntil:0, seriesRestWorkoutId:"", seriesRestTimer:null, seriesRestDelayTimer:null, seriesRestRevealTimer:null, seriesRestPending:false, dailyReorderTimer:null, dailyReorderActive:false, dailyReorderPointerId:null, dailyReorderItem:null, dailyReorderStartX:0, dailyReorderStartY:0, adminImageHoldTimer:null, adminImageHoldTriggered:false, adminImageHoldX:0, adminImageHoldY:0, adminVideoHoldTimer:null, adminVideoHoldTriggered:false, suppressExerciseImageClick:false, generatingExerciseId:"", uploadingExerciseVideoId:"", generatingDefinitions:false, voiceRecorder:null, voiceStream:null, voiceTarget:null };
const WORKOUT_SERIES_REST_MS=60000;
const WORKOUT_SERIES_REST_DELAY_MS=1200;
const runningMiniPlayer=byId("runningMiniPlayer"),runningMiniPlayerHomeParent=runningMiniPlayer?.parentNode||null,runningMiniPlayerHomeNext=runningMiniPlayer?.nextSibling||null;
function profileName(){ return String(window.localStorage.getItem(PROFILE_KEY)||document.body.dataset.profile||"Usuario").trim()||"Usuario"; }
async function apiRequest(path,options={}){
  const headers={...(options.headers||{})};
  const token=String(window.localStorage.getItem(TOKEN_KEY)||"").trim();
  if(token)headers.Authorization=`Bearer ${token}`;
  const {offlineQueue,offlineResponse,offlineInvalidates,forceNetwork,cacheMaxAgeMs,...fetchOptions}=options;
  const offlineOptions={...options,headers,offlineQueue,offlineResponse,offlineInvalidates,forceNetwork,cacheMaxAgeMs};
  const execute=async()=>{
    const response=await fetch(getApiUrl(path),{...fetchOptions,headers});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok){ const error=new Error(payload?.error||"Nao foi possivel concluir."); error.httpResponse=true; error.status=response.status; throw error; }
    return payload;
  };
  return window.Project200Offline?.request?window.Project200Offline.request(path,offlineOptions,execute):execute();
}
const OFFLINE_WORKOUTS_KEY="project200.wellness.offline-workouts.v1";
let offlineWorkoutSyncPromise=null;
let adminAccessPromise=null;
function dashboardPath(){ return `/api/200/wellness?profile=${encodeURIComponent(profileName())}`; }
function offlineWorkoutsKey(){ const token=String(localStorage.getItem(TOKEN_KEY)||"anonymous"); let hash=2166136261; for(let index=0;index<token.length;index+=1){hash^=token.charCodeAt(index);hash=Math.imul(hash,16777619);} return `${OFFLINE_WORKOUTS_KEY}.${(hash>>>0).toString(36)}.${profileName().toLowerCase()}`; }
function readOfflineWorkouts(){ try{ const value=JSON.parse(localStorage.getItem(offlineWorkoutsKey())||"[]"); return Array.isArray(value)?value:[]; }catch{return [];} }
function writeOfflineWorkouts(items){ try{ localStorage.setItem(offlineWorkoutsKey(),JSON.stringify(items)); }catch{} }
function isOfflineWorkout(workout=state.workout){ return String(workout?.id||"").startsWith("offline-"); }
function cacheDashboard(){ if(!state.dashboard)return; window.Project200Offline?.put?.(dashboardPath(),{dashboard:state.dashboard,isAdmin:state.isAdmin}); }
function applyAdminAccess(value){
  if(typeof value!=="boolean")return;
  const changed=state.isAdmin!==value; state.isAdmin=value;
  if(changed&&!elements.detail?.hidden&&state.selectedExercise)openExerciseDetail(state.selectedExercise,state.detailMode);
}
async function refreshAdminAccess(){
  if(adminAccessPromise)return adminAccessPromise;
  adminAccessPromise=(async()=>{ try{ const payload=await apiRequest("/api/auth/me?app=project200",{cache:"no-store",forceNetwork:true}); applyAdminAccess(Boolean(payload?.user?.isAdmin)); }catch{} })().finally(()=>{ adminAccessPromise=null; });
  return adminAccessPromise;
}
function persistOfflineWorkout(workout,extra={}){
  const items=readOfflineWorkouts(), id=String(workout?.id||"");
  const index=items.findIndex((item)=>String(item?.localId||"")===id);
  const previous=index>=0?items[index]:{};
  const next={...previous,...extra,localId:id,workout:{...workout,series:Array.isArray(workout?.series)?workout.series:[]},updatedAt:Date.now()};
  if(index>=0)items[index]=next; else items.push(next);
  writeOfflineWorkouts(items);
  return next;
}
function removeOfflineWorkout(localId){ writeOfflineWorkouts(readOfflineWorkouts().filter((item)=>String(item?.localId||"")!==String(localId||""))); }
function createOfflineWorkout(exercise,goals){
  const id=`offline-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return {id,profileName:profileName(),exerciseId:exercise.id,exerciseName:exercise.name,category:exercise.category,trackingType:exercise.tracking,equipment:exercise.equipment,targetSeries:goals.targetSeries,targetReps:goals.targetReps,targetMinutes:goals.targetMinutes,targetDistanceMeters:goals.targetDistanceMeters,steps:0,distanceMeters:0,durationMinutes:0,seriesCount:0,totalReps:0,series:[],startedAt:new Date().toISOString(),offline:true};
}
function activateOfflineWorkout(workout,startPayload){
  state.dashboard=state.dashboard||{};
  state.dashboard.activeWorkout=workout;
  state.workout=workout;
  state.seriesRepsDraft=null;
  state.steps=Number(workout.steps||0);
  state.gpsDistanceMeters=Number(workout.distanceMeters||0);
  persistOfflineWorkout(workout,{startPayload,finished:false,syncedSeriesCount:0});
  cacheDashboard();
  window.dispatchEvent(new CustomEvent("project200:offline-queued",{detail:{path:"/api/200/exercises/start"}}));
}
async function syncOfflineWorkouts(){
  if(navigator.onLine===false)return;
  if(offlineWorkoutSyncPromise)return offlineWorkoutSyncPromise;
  const run=async()=>{
    const items=readOfflineWorkouts();
    for(const original of items){
      let item={...original};
      try{
        let serverWorkout=null;
        if(!item.serverId){
          const started=await apiRequest("/api/200/exercises/start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(item.startPayload||{}),forceNetwork:true});
          serverWorkout=started.workout;
          item.serverId=String(serverWorkout?.id||"");
          if(!item.serverId)throw new Error("Treino offline sem identificador no servidor.");
          persistOfflineWorkout(item.workout,item);
        }
        const series=Array.isArray(item.workout?.series)?item.workout.series:[];
        for(let index=Number(item.syncedSeriesCount||0);index<series.length;index+=1){
          const result=await apiRequest(`/api/200/exercises/${encodeURIComponent(item.serverId)}/series`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({seriesNumber:Number(series[index]?.seriesNumber||index+1),repetitions:Number(series[index]?.repetitions||0),targetRepetitions:Number(item.workout?.targetReps||0)}),forceNetwork:true});
          serverWorkout=result.workout||serverWorkout;
          item.syncedSeriesCount=index+1;
          persistOfflineWorkout(item.workout,item);
        }
        if(item.workout?.trackingType!=="series"){
          const result=await apiRequest(`/api/200/exercises/${encodeURIComponent(item.serverId)}/progress`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({steps:Number(item.workout?.steps||0),distanceMeters:Number(item.workout?.distanceMeters||0),durationMinutes:Number(item.workout?.durationMinutes||0)}),forceNetwork:true});
          serverWorkout=result.workout||serverWorkout;
        }
        if(item.finished){
          await apiRequest(`/api/200/exercises/${encodeURIComponent(item.serverId)}/finish`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(item.finishPayload||{}),forceNetwork:true});
        }else if(String(state.workout?.id||"")===String(item.localId||"")){
          state.workout=serverWorkout||{...item.workout,id:item.serverId,offline:false};
          state.dashboard={...(state.dashboard||{}),activeWorkout:state.workout};
        }
        removeOfflineWorkout(item.localId);
        window.Project200Offline?.invalidate?.(["/api/200/wellness"]);
      }catch{ break; }
    }
    if(!readOfflineWorkouts().length){ await loadDashboard(); }
  };
  const pending=window.Project200Offline?.activity?window.Project200Offline.activity(run):run();
  offlineWorkoutSyncPromise=Promise.resolve(pending).finally(()=>{offlineWorkoutSyncPromise=null;});
  return offlineWorkoutSyncPromise;
}
function pauseHiddenExerciseVideos(){ document.querySelectorAll("video[data-exercise-video]").forEach((video)=>{ if(video.closest("[hidden]")){ video.pause(); video.closest(".is-playing")?.classList.remove("is-playing"); } }); }
function mountWorkoutPlayer(){if(!runningMiniPlayer||!elements.workoutPlayerSlot)return;elements.workoutPlayerSlot.appendChild(runningMiniPlayer);runningMiniPlayer.classList.add("is-in-wellness-workout");}
function restoreWorkoutPlayer(){if(!runningMiniPlayer||!runningMiniPlayerHomeParent)return;if(runningMiniPlayer.parentNode===runningMiniPlayerHomeParent){runningMiniPlayer.classList.remove("is-in-wellness-workout");return;}if(runningMiniPlayerHomeNext?.parentNode===runningMiniPlayerHomeParent)runningMiniPlayerHomeParent.insertBefore(runningMiniPlayer,runningMiniPlayerHomeNext);else runningMiniPlayerHomeParent.appendChild(runningMiniPlayer);runningMiniPlayer.classList.remove("is-in-wellness-workout");}
function showLayer(layer){ phaseLayers.forEach((item)=>{ item.hidden=item!==layer; });if(layer===elements.workoutLayer)mountWorkoutPlayer();else restoreWorkoutPlayer();pauseHiddenExerciseVideos(); if(layer!==elements.detail){if(state.detailImageTimer)window.clearInterval(state.detailImageTimer);if(state.detailMuscleTimer)window.clearInterval(state.detailMuscleTimer);state.detailImageTimer=null;state.detailMuscleTimer=null;} }
function stopWellnessVoice(){
  if(state.voiceRecorder&&state.voiceRecorder.state!=="inactive")state.voiceRecorder.stop();
}
function hideLayers(){ stopWellnessVoice(); if(state.dailyReorderTimer)window.clearTimeout(state.dailyReorderTimer);state.dailyReorderTimer=null;state.dailyReorderActive=false;state.dailyReorderItem=null;phaseLayers.forEach((item)=>{ item.hidden=true; });restoreWorkoutPlayer();pauseHiddenExerciseVideos(); if(state.detailImageTimer)window.clearInterval(state.detailImageTimer);if(state.detailMuscleTimer)window.clearInterval(state.detailMuscleTimer); state.detailImageTimer=null;state.detailMuscleTimer=null; }
function setTab(tab){ state.tab=tab==="exercises"?"exercises":"nutrition";if(modal)modal.dataset.wellnessTab=state.tab; document.querySelectorAll("[data-wellness-tab]").forEach((button)=>button.classList.toggle("active",button.dataset.wellnessTab===state.tab)); document.querySelectorAll("[data-wellness-pane]").forEach((pane)=>pane.classList.toggle("active",pane.dataset.wellnessPane===state.tab)); const exercising=state.tab==="exercises"; elements.title.textContent=exercising?"Exercícios":"Nutrição"; elements.headerIcon.src=exercising?"/200/apps/exercicios.png":"/200/apps/nutricao.png"; }
function openWellness(tab){ setTab(tab); modal?.setAttribute("aria-label",state.tab==="nutrition"?"Nutrição":"Exercícios"); modal?.classList.add("active"); modal?.setAttribute("aria-hidden","false"); document.body.classList.add("modal-open"); hideLayers(); startExerciseImageTicker(); if(state.tab==="exercises")warmExerciseProgressSound(); renderExerciseGrid(); void refreshAdminAccess(); void loadDashboard(); }
function closeWellness(){ hideLayers(); modal?.classList.remove("active"); modal?.setAttribute("aria-hidden","true"); if(!document.querySelector(".workspace-modal.active"))document.body.classList.remove("modal-open"); }

function exerciseInstructions(exercise){ if(exercise.category==="calisthenics")return ["Escolha um espaço firme e livre ao seu redor.",exercise.cue,"Use apenas o peso do corpo, controle cada repetição e pare se sentir dor aguda."]; if(exercise.tracking==="series")return [`Prepare ${exercise.equipment.toLowerCase()} com uma carga confortável.`,exercise.cue,"Mantenha o movimento controlado e pare se sentir dor aguda."]; if(exercise.tracking==="gps")return ["Ative a localização precisa e leve o celular com você.",exercise.cue,"Metros, quilômetros, cronômetro e velocidade média serão registrados automaticamente pelo GPS."]; return [`Prepare ${exercise.equipment.toLowerCase()} e comece leve.`,exercise.cue,"Ao finalizar, informe a distância percorrida em metros."]; }
function currentExerciseCategory(){ return EXERCISE_CATEGORIES.find((item)=>item.id===state.filter)||EXERCISE_CATEGORIES[0]; }
function exerciseLibrary(){ return Array.isArray(state.dashboard?.exerciseLibrary)?state.dashboard.exerciseLibrary:[]; }
function libraryItem(exerciseId){ return exerciseLibrary().find((item)=>item.exerciseId===exerciseId)||null; }
function exerciseScheduledToday(item,date=new Date()){
  const schedule=item?.scheduleConfig; if(!schedule||typeof schedule!=="object")return true;
  if(schedule.frequency==="none")return false;
  const dateKey=exerciseGoalDateKey(date),startsOn=String(schedule.startsOn||"").slice(0,10); if(startsOn&&startsOn>dateKey)return false;
  const weekDays=[...new Set((Array.isArray(schedule.weekDays)?schedule.weekDays:[]).map(Number).filter((day)=>Number.isInteger(day)&&day>=0&&day<=6))];
  return !weekDays.length||weekDays.includes(date.getDay());
}
function todayExerciseLibrary(){ return exerciseLibrary().filter((item)=>exerciseScheduledToday(item)); }
function currentHomeExerciseLibrary(){ const category=currentExerciseCategory();return exerciseLibrary().filter((item)=>category.id==="all"||(item.category===category.id&&exerciseScheduledToday(item))); }
function workoutSequenceExercises(workout=state.workout){
  const library=exerciseLibrary(),home=currentHomeExerciseLibrary(),daily=library.filter((item)=>exerciseScheduledToday(item)),currentId=String(workout?.exerciseId||""),ordered=home.some((item)=>String(item.exerciseId||"")===currentId)?home:daily.some((item)=>String(item.exerciseId||"")===currentId)?daily:library;
  return ordered.map(exerciseFromLibrary).filter(Boolean);
}
function nextWorkoutExercise(workout=state.workout){
  const ordered=workoutSequenceExercises(workout);if(ordered.length<2)return null;const currentIndex=ordered.findIndex((item)=>String(item.id||"")===String(workout?.exerciseId||""));return ordered[(currentIndex<0?0:currentIndex+1)%ordered.length]||null;
}
function workoutNavigationOptions(workout=state.workout){
  const currentId=String(workout?.exerciseId||"");return workoutSequenceExercises(workout).filter((item)=>String(item.id||"")!==currentId);
}
function selectedWorkoutNavigationExercise(workout=state.workout){
  const options=workoutNavigationOptions(workout),selectedId=String(state.workoutNavigationExerciseId||"");return options.find((item)=>String(item.id||"")===selectedId)||nextWorkoutExercise(workout)||options[0]||null;
}
function renderWorkoutNavigation(workout=state.workout){
  const workoutId=String(workout?.id||""),options=workoutNavigationOptions(workout);if(state.workoutNavigationWorkoutId!==workoutId){state.workoutNavigationWorkoutId=workoutId;state.workoutNavigationExerciseId=String(nextWorkoutExercise(workout)?.id||options[0]?.id||"");}const selected=selectedWorkoutNavigationExercise(workout);state.workoutNavigationExerciseId=String(selected?.id||"");if(elements.workoutNextName)elements.workoutNextName.textContent=selected?.name||"Fim da sequência";const canBrowse=options.length>1;if(elements.workoutPreviousExercise)elements.workoutPreviousExercise.disabled=!canBrowse;if(elements.workoutNextExercise)elements.workoutNextExercise.disabled=!canBrowse;if(elements.workoutAdvance){elements.workoutAdvance.disabled=!selected;elements.workoutAdvance.setAttribute("aria-label",selected?`Pular para ${selected.name}`:"Nenhum próximo exercício");}return selected;
}
function moveWorkoutNavigation(direction){
  const options=workoutNavigationOptions();if(options.length<2)return;const selected=selectedWorkoutNavigationExercise(),currentIndex=Math.max(0,options.findIndex((item)=>String(item.id||"")===String(selected?.id||""))),nextIndex=(currentIndex+(Number(direction)<0?-1:1)+options.length)%options.length;state.workoutNavigationExerciseId=String(options[nextIndex]?.id||"");renderWorkoutNavigation();
}
function exerciseAssets(){ return Array.isArray(state.dashboard?.exerciseAssets)?state.dashboard.exerciseAssets:[]; }
function exerciseAsset(exerciseId){ return exerciseAssets().find((item)=>String(item?.exerciseId||"")===String(exerciseId||""))||null; }
function exerciseDefinitions(){ return Array.isArray(state.dashboard?.exerciseDefinitions)?state.dashboard.exerciseDefinitions:[]; }
function exerciseDefinition(exerciseId){ return exerciseDefinitions().find((item)=>String(item?.exerciseId||"")===String(exerciseId||""))||null; }
function isMuscleLoadDefined(value){ return value!==null&&value!==undefined&&value!==""&&Number.isFinite(Number(value))&&Number(value)>=.25; }
function exerciseMuscleLoads(exercise){
  const source=Array.isArray(exercise?.muscleLoads)?exercise.muscleLoads:exerciseDefinition(exercise?.id)?.muscles;
  const loads=normalizeProject200MuscleSelections(source).filter((item)=>isMuscleLoadDefined(item.load));
  return loads.length?loads:normalizeProject200MuscleSelections(heuristicExerciseMuscles(exercise).map((name)=>({name,load:null})));
}
function exerciseMuscles(exercise){ return exerciseMuscleLoads(exercise).map((item)=>item.name); }
function exerciseCatalog(){
  const catalog=new Map(EXERCISES.map((exercise)=>[exercise.id,{...exercise}]));
  exerciseDefinitions().forEach((definition)=>{
    const id=String(definition?.exerciseId||""); if(!id)return;
    const current=catalog.get(id)||{};
    catalog.set(id,{...current,id,name:definition.exerciseName||current.name||"Exercício",alternativeNames:Array.isArray(definition.alternativeNames)?definition.alternativeNames:[],names:Array.isArray(definition.names)?definition.names:[],difficulty:Number(definition.difficulty||0),popularity:Number(definition.popularity||0),category:definition.category||current.category||"strength",tracking:definition.trackingType||current.tracking||"series",equipment:definition.equipment||current.equipment||"Sem equipamento",cue:definition.cue||current.cue||"Faça o movimento com controle e respeite seus limites.",muscleLoads:Array.isArray(definition.muscles)?definition.muscles:[]});
  });
  return [...catalog.values()];
}
function exerciseFromLibrary(item){ const source=exerciseCatalog().find((exercise)=>exercise.id===item?.exerciseId); return source?{...source,library:item}:{id:item?.exerciseId,name:item?.exerciseName||"Exercício",tracking:item?.trackingType||"minutes",equipment:item?.equipment||"Sem equipamento",cue:"Siga o plano aprovado com movimentos controlados e respeite seus limites.",category:item?.category||"strength",library:item}; }
function exerciseImageSources(exercise){ const asset=exerciseAsset(exercise?.id); const fallback="/200/apps/exercicios.png",start=String(asset?.startImageUrl||fallback),finish=String(asset?.finishImageUrl||asset?.startImageUrl||fallback); return {start,finish,muscle:String(asset?.muscleImageUrl||finish),video:String(asset?.videoUrl||""),poster:String(asset?.videoPosterUrl||asset?.startImageUrl||fallback)}; }
function exerciseImageForPhase(images,phase=state.exerciseImagePhase){ return String(images?.[phase]||images?.start||"/200/apps/exercicios.png"); }
function exerciseImageMarkup(exercise,className="wellness-exercise-image"){
  const images=exerciseImageSources(exercise),label=`Movimento de ${exercise?.name||"exercício"}`;
  if(images.video)return `<span class="${className} wellness-exercise-video-shell has-video" data-exercise-video-shell><video class="wellness-exercise-video" data-exercise-video src="${escapeHtml(images.video)}" poster="${escapeHtml(images.poster)}" muted loop playsinline preload="metadata" aria-label="${escapeHtml(label)}"></video><i class="wellness-exercise-video-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 7 8 5-8 5V7Z"/></svg></i></span>`;
  return `<img class="${className}" data-exercise-image data-exercise-image-id="${escapeHtml(exercise?.id||"")}" data-start-src="${escapeHtml(images.start)}" data-finish-src="${escapeHtml(images.finish)}" data-muscle-src="${escapeHtml(images.muscle)}" src="${escapeHtml(exerciseImageForPhase(images))}" alt="${escapeHtml(label)}" />`;
}
function playFixedExerciseVideo(shell,{restart=false}={}){const video=shell?.querySelector?.("video[data-exercise-video]");if(!video||shell.dataset.userPaused==="true")return false;video.muted=true;if(restart)video.currentTime=0;void video.play().then(()=>shell.classList.add("is-playing")).catch(()=>{});return true;}
function toggleExerciseVideo(shell){ const video=shell?.querySelector?.("video[data-exercise-video]"); if(!video)return false; if(video.paused){delete shell.dataset.userPaused;document.querySelectorAll("video[data-exercise-video]").forEach((item)=>{ if(item===video)return;item.pause();try{item.currentTime=0;}catch{}item.closest(".is-playing")?.classList.remove("is-playing"); });playFixedExerciseVideo(shell); }else{ video.pause();shell.dataset.userPaused="true"; shell.classList.remove("is-playing"); } return true; }
function configureFixedExerciseMedia(shell,image,video,exercise,{movementOnly=false}={}){
  if(!shell||!image||!video)return;
  const media=exerciseImageSources(exercise),hasVideo=Boolean(media.video),signature=[exercise?.id||"",media.video,media.poster,media.start,media.finish,media.muscle,movementOnly?"movement":"cycle"].join("|");
  if(shell.dataset.mediaSignature===signature)return;
  shell.dataset.mediaSignature=signature;delete shell.dataset.userPaused; shell.classList.toggle("has-video",hasVideo); shell.dataset.exerciseId=String(exercise?.id||"");
  if(hasVideo){ image.hidden=true; image.removeAttribute("data-exercise-image"); video.hidden=false; video.dataset.exerciseVideo=""; if(video.getAttribute("src")!==media.video){video.pause();shell.classList.remove("is-playing");video.setAttribute("src",media.video);} video.setAttribute("poster",media.poster); video.setAttribute("aria-label",`Vídeo de ${exercise?.name||"exercício"}`); return; }
  video.pause(); video.hidden=true; video.removeAttribute("data-exercise-video"); video.removeAttribute("src"); shell.classList.remove("is-playing"); image.hidden=false; image.dataset.exerciseImageId=String(exercise?.id||""); image.dataset.startSrc=media.start; image.dataset.finishSrc=media.finish; image.dataset.muscleSrc=media.muscle; if(!movementOnly)image.dataset.exerciseImage=""; else image.removeAttribute("data-exercise-image"); image.src=movementOnly?exerciseImageForPhase(media,state.detailImagePhase):exerciseImageForPhase(media); image.alt=`Movimento de ${exercise?.name||"exercício"}`;
}
function refreshExerciseImages(){ document.querySelectorAll("[data-exercise-image]").forEach((image)=>{ const source=image.dataset[`${state.exerciseImagePhase}Src`]||image.dataset.startSrc; if(source&&image.getAttribute("src")!==source)image.setAttribute("src",source); }); }
function muscleLoadLevel(load){const value=Number(load);if(!Number.isFinite(value)||value<.25)return 0;if(value>=.81)return 4;if(value>=.6)return 3;if(value>=.4)return 2;return 1;}
function muscleLoadIndicatorMarkup(item){const name=String(item?.name||"Corpo inteiro"),level=muscleLoadLevel(item?.load),bars=Array.from({length:level},()=>"<u></u>").join("");return `<b title="${escapeHtml(name)}">${escapeHtml(name)}</b>${level?`<i class="wellness-muscle-signal wellness-muscle-signal-${level}" role="img" aria-label="Intensidade ${level} de 4">${bars}</i>`:""}`;}
function exerciseMuscleMarkup(exercise){ const muscles=exerciseMuscleLoads(exercise),item=muscles[state.muscleNameIndex%Math.max(1,muscles.length)]; return `<small class="wellness-exercise-muscle-label" data-exercise-muscles="${escapeHtml(JSON.stringify(muscles))}">${muscleLoadIndicatorMarkup(item)}</small>`; }
function refreshExerciseMuscleLabels(){ document.querySelectorAll("[data-exercise-muscles]").forEach((label)=>{ try{ const muscles=JSON.parse(label.dataset.exerciseMuscles||"[]"); if(Array.isArray(muscles)&&muscles.length)label.innerHTML=muscleLoadIndicatorMarkup(muscles[state.muscleNameIndex%muscles.length]); }catch{} }); }
function advanceMuscleProgressCarousel(){ const track=elements.muscleProgressMapTrack;if(!track||document.hidden||!modal?.classList.contains("active")||state.tab!=="exercises"||phaseLayers.some((layer)=>!layer.hidden)||Date.now()-state.muscleCarouselTouchedAt<2000)return; const bounds=track.getBoundingClientRect();if(bounds.bottom<=0||bounds.top>=window.innerHeight)return; const width=Math.max(1,track.clientWidth),current=Math.max(0,Math.min(PROJECT200_MUSCLE_MAPS.length-1,Math.round(track.scrollLeft/width))),next=(current+1)%PROJECT200_MUSCLE_MAPS.length; track.scrollTo({left:next*width,behavior:"smooth"}); }
function startExerciseImageTicker(){ if(!state.exerciseImageTimer)state.exerciseImageTimer=window.setInterval(()=>{ if(document.hidden||!modal?.classList.contains("active"))return; const index=EXERCISE_IMAGE_PHASES.indexOf(state.exerciseImagePhase); state.exerciseImagePhase=EXERCISE_IMAGE_PHASES[(index+1)%EXERCISE_IMAGE_PHASES.length]; refreshExerciseImages(); },1500); if(!state.exerciseMuscleTimer)state.exerciseMuscleTimer=window.setInterval(()=>{ if(document.hidden||!modal?.classList.contains("active"))return; state.muscleNameIndex+=1; refreshExerciseMuscleLabels(); },1000); if(!state.muscleProgressTimer)state.muscleProgressTimer=window.setInterval(()=>{ if(document.hidden||!modal?.classList.contains("active")||state.tab!=="exercises")return; refreshMuscleProgressMap(); },25000); if(!state.muscleCarouselTimer)state.muscleCarouselTimer=window.setInterval(advanceMuscleProgressCarousel,2000); }
function startDetailMovementTicker(){ if(state.detailImageTimer)window.clearInterval(state.detailImageTimer); state.detailImageTimer=null; state.detailImagePhase="start"; const images=exerciseImageSources(state.selectedExercise); if(images.video&&!elements.detailVideo?.hidden){elements.detailVideo.muted=true;void elements.detailVideo.play().then(()=>elements.detailFrame?.classList.add("is-playing")).catch(()=>{});return;} if(!elements.detailImage)return; elements.detailImage.src=images.start; state.detailImageTimer=window.setInterval(()=>{ if(document.hidden||elements.detail?.hidden||exerciseImageSources(state.selectedExercise).video)return; state.detailImagePhase=state.detailImagePhase==="start"?"finish":"start"; const current=exerciseImageSources(state.selectedExercise); elements.detailImage.src=exerciseImageForPhase(current,state.detailImagePhase); },1000); }
function exerciseTodayValue(item){
  if(!item)return 0;
  if(item.trackingType==="series")return Math.max(0,Number(item.todayTotalReps||0));
  if(item.trackingType==="gps")return Math.max(0,Number(item.todayDistanceMeters||0));
  return Math.max(0,Number(item.todayDurationMinutes||0));
}
function formatExerciseTotal(item,value=exerciseTodayValue(item)){
  if(item?.trackingType==="series")return `${Math.round(value)} movimentos totais`;
  if(item?.trackingType==="gps")return `${(value/1000).toFixed(1)} km totais`;
  const rounded=Math.round(value*10)/10; return `${rounded.toLocaleString("pt-BR",{maximumFractionDigits:1})} minutos totais`;
}
function exerciseProgress(item){ const value=exerciseTodayValue(item), goal=Math.max(1,Number(item?.dailyGoal||1)), percent=Math.max(0,Math.round((value/goal)*100)); return {value,goal,percent,width:Math.min(100,percent)}; }
function dailyExerciseProgress(){ const items=todayExerciseLibrary(); if(!items.length)return 0; return Math.round(items.reduce((sum,item)=>sum+Math.min(100,exerciseProgress(item).percent),0)/items.length); }
function renderDailyExerciseProgress(){ const items=todayExerciseLibrary(),percent=Math.max(0,Math.min(100,dailyExerciseProgress())); if(elements.exerciseDailyCard)elements.exerciseDailyCard.hidden=!items.length; if(elements.exerciseDailyPercent)elements.exerciseDailyPercent.textContent=`${percent}%`; if(elements.exerciseDailyProgressFill)elements.exerciseDailyProgressFill.style.width=`${percent}%`; }
function muscleMapDisplayTitle(map,index){ const title=String(map?.title||"").toLowerCase(); if(title.includes("perna")||index===1)return "Pernas"; if(title.includes("costa")||title.includes("poster")||index===2)return "Costas"; return "Frente"; }
function muscleMapHeadingMarkup(map,index){ return `<header class="wellness-muscle-map-heading"><strong>${escapeHtml(muscleMapDisplayTitle(map,index))}</strong><small>Toque no músculo para treinar</small></header>`; }
function currentMuscleProgress(){
  const now=Date.now(),totals=new Map();
  (Array.isArray(state.dashboard?.muscleProgress)?state.dashboard.muscleProgress:[]).forEach((entry)=>{ const item=project200CurrentMuscleProgress(entry,now); if(item.muscleId)totals.set(item.muscleId,Number(item.points||0)); });
  state.provisionalMuscleProgress.forEach((entry,muscleId)=>{ const item=project200CurrentMuscleProgress({...entry,muscleId},now); totals.set(muscleId,Number(totals.get(muscleId)||0)+Number(item.points||0)); });
  return [...totals.entries()]
    .map(([muscleId,points])=>project200CurrentMuscleProgress({muscleId,points,measuredAt:new Date(now).toISOString()},now))
    .sort((left,right)=>right.points-left.points);
}
function applyLocalMuscleSeriesProgress(workout,repetitions){
  if(workout?.trackingType!=="series")return;
  const exercise=exerciseCatalog().find((item)=>item.id===workout.exerciseId)||exerciseFromLibrary(libraryItem(workout.exerciseId)||{}),now=new Date().toISOString();
  const gains=calculateProject200ExerciseMuscleGains([{repetitions}],exerciseMuscleLoads(exercise)); if(!gains.length)return;
  gains.forEach((item)=>{ const previous=project200CurrentMuscleProgress({...state.provisionalMuscleProgress.get(item.muscleId),muscleId}); state.provisionalMuscleProgress.set(item.muscleId,{points:Number(previous.points||0)+Number(item.points||0),updatedAt:now,measuredAt:now}); });
  refreshMuscleProgressMap();
}
function rebuildProvisionalMuscleProgress(workout){ state.provisionalMuscleProgress.clear(); if(workout?.trackingType!=="series")return; (Array.isArray(workout.series)?workout.series:[]).forEach((item)=>applyLocalMuscleSeriesProgress(workout,item?.repetitions)); }
function formatMusclePoints(points){ return Number(points||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}); }
function formatMusclePercent(percent){ return Number(percent||0).toLocaleString("pt-BR",{minimumFractionDigits:Number.isInteger(Number(percent||0))?0:1,maximumFractionDigits:1}); }
function muscleOverloadGradientMarkup(id){ return `<linearGradient id="${escapeHtml(id)}" x1="-1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ef4444"></stop><stop offset=".5" stop-color="#f97316"></stop><stop offset="1" stop-color="#ef4444"></stop><animate attributeName="x1" values="-1;1;-1" dur="4.2s" repeatCount="indefinite"></animate><animate attributeName="x2" values="0;2;0" dur="4.2s" repeatCount="indefinite"></animate></linearGradient>`; }
function refreshMuscleProgressMap(){
  if(!elements.muscleProgressMapTrack)return;
  const progress=currentMuscleProgress(),byMuscle=new Map(progress.map((item)=>[item.muscleId,item]));
  elements.muscleProgressMapTrack.querySelectorAll("[data-current-muscle-id]").forEach((region)=>{
    const muscleId=region.dataset.currentMuscleId,item=byMuscle.get(muscleId),muscle=PROJECT200_MUSCLE_BY_ID[muscleId],points=Number(item?.points||0),percent=Number(item?.percent||0),opacity=points?Math.min(1,.42+(Math.min(percent,110)/110)*.58):.42,gradientId=region.closest("svg")?.dataset.overloadGradient||"";
    region.classList.toggle("is-trained",points>0); region.classList.toggle("is-overload",points>0&&percent>=110); region.style.setProperty("--muscle-color",item?.color||"rgb(148 163 184)"); if(percent>=110&&gradientId)region.style.setProperty("--muscle-fill",`url(#${gradientId})`);else region.style.removeProperty("--muscle-fill"); region.style.setProperty("--muscle-opacity",String(opacity)); region.setAttribute("aria-label",`${muscle?.name||muscleId} · ${formatMusclePoints(points)} pontos · ${formatMusclePercent(percent)}% · ${item?.stage||"Irrelevante"}`);
  });
  const strongest=progress[0],muscle=PROJECT200_MUSCLE_BY_ID[strongest?.muscleId];
  if(elements.muscleProgressSummary)elements.muscleProgressSummary.textContent=strongest&&strongest.points>0?`${muscle?.name||"Maior carga"} · ${formatMusclePoints(strongest.points)} pts · ${formatMusclePercent(strongest.percent)}% · ${strongest.stage}`:"Todos os músculos · 0%";
}
function renderMuscleProgressMap(){
  if(!elements.muscleProgressMapTrack)return;
  elements.muscleProgressMapTrack.innerHTML=PROJECT200_MUSCLE_MAPS.map((map,index)=>{ const gradientId=`wellness-current-overload-${index}`; return `<section class="wellness-muscle-map-slide" data-muscle-progress-map-slide="${index}" aria-label="${escapeHtml(muscleMapDisplayTitle(map,index))}">${muscleMapHeadingMarkup(map,index)}<svg viewBox="${escapeHtml(map.viewBox)}" role="img" aria-label="${escapeHtml(muscleMapDisplayTitle(map,index))}" data-overload-gradient="${gradientId}"><defs>${muscleOverloadGradientMarkup(gradientId)}</defs><path class="wellness-muscle-map-skin" d="${escapeHtml(map.skinPath)}"></path>${map.regions.map((region)=>`<path class="wellness-muscle-map-region wellness-muscle-progress-region" data-muscle-id="${escapeHtml(region.muscleId)}" data-current-muscle-id="${escapeHtml(region.muscleId)}" role="button" tabindex="0" d="${escapeHtml(region.path)}"></path>`).join("")}</svg></section>`; }).join("");
  if(elements.muscleProgressMapDots)elements.muscleProgressMapDots.innerHTML=PROJECT200_MUSCLE_MAPS.map((map,index)=>`<i class="${index===0?"is-active":""}" aria-label="${escapeHtml(map.title)}"></i>`).join("");
  refreshMuscleProgressMap();
}
function hasExerciseGoal(item){ if(!item)return false; if(item.trackingType==="series")return Number(item.targetSeries||0)>0&&Number(item.targetReps||0)>0; if(item.trackingType==="gps")return Number(item.targetDistanceMeters||0)>0; return Number(item.targetMinutes||0)>0; }
function setExerciseCategory(categoryId){ state.filter=EXERCISE_CATEGORIES.some((item)=>item.id===categoryId)?categoryId:EXERCISE_CATEGORIES[0].id; renderExerciseGrid(); if(!elements.catalogLayer?.hidden)renderCatalog(); }
function cycleExerciseCategory(direction){ const currentIndex=Math.max(0,EXERCISE_CATEGORIES.findIndex((item)=>item.id===state.filter)); const nextIndex=(currentIndex+direction+EXERCISE_CATEGORIES.length)%EXERCISE_CATEGORIES.length; setExerciseCategory(EXERCISE_CATEGORIES[nextIndex].id); }
function renderExerciseGrid(){
  const category=currentExerciseCategory();
  renderDailyExerciseProgress();
  renderMuscleProgressMap();
  if(elements.exerciseCategoryName)elements.exerciseCategoryName.textContent=category.label;
  const visible=currentHomeExerciseLibrary().map(exerciseFromLibrary).filter(Boolean);
  if(!visible.length){ const hasOffDayExercises=category.id!=="all"&&exerciseLibrary().some((item)=>item.category===category.id); elements.exerciseGrid.innerHTML=hasOffDayExercises?'<button class="wellness-exercise-empty" type="button" data-show-all-exercises><strong>Nenhum exercício desta seção para hoje</strong><span>Ele continua disponível em Todos.</span></button>':'<button class="wellness-exercise-empty" type="button" data-open-catalog><strong>Adicione seu primeiro exercício</strong><span>Escolha no acervo sem poluir sua tela inicial.</span></button>'; return; }
  elements.exerciseGrid.innerHTML=visible.map((exercise)=>{ const progress=exerciseProgress(libraryItem(exercise.id)); return `<article class="wellness-exercise-item" data-exercise-video-drop-id="${escapeHtml(exercise.id)}"><button class="wellness-exercise-open" type="button" data-exercise-id="${escapeHtml(exercise.id)}">${exerciseImageMarkup(exercise)}<span class="wellness-exercise-copy"><strong title="${escapeHtml(exercise.name)}">${escapeHtml(exercise.name)}</strong>${exerciseMuscleMarkup(exercise)}<span class="wellness-exercise-list-progress" role="progressbar" aria-label="${progress.percent}% concluído hoje" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.percent}"><i style="width:${progress.width}%"></i></span></span></button><button class="wellness-exercise-play" type="button" data-exercise-play-id="${escapeHtml(exercise.id)}" aria-label="Iniciar ${escapeHtml(exercise.name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7 8 5-8 5V7Z"/></svg></button></article>`; }).join("");
  refreshExerciseImages();
}
function renderDailyPlan(){
  if(!elements.dailyPlanList)return;
  const items=todayExerciseLibrary();
  elements.dailyPlanList.innerHTML=items.length?items.map((item)=>{const exercise=exerciseFromLibrary(item),progress=exerciseProgress(item);return `<article class="wellness-daily-plan-item" data-daily-plan-item data-exercise-id="${escapeHtml(item.exerciseId)}">${exerciseImageMarkup(exercise,"wellness-exercise-image")}<span class="wellness-daily-plan-copy"><strong>${escapeHtml(exercise.name)}</strong><small>${progress.percent}% de hoje</small><span class="wellness-exercise-list-progress"><i style="width:${progress.width}%"></i></span></span><button class="wellness-daily-plan-handle" type="button" data-daily-reorder-handle aria-label="Segure e arraste para trocar a posição de ${escapeHtml(exercise.name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7h8M8 12h8M8 17h8"/><path d="m5 7 1-1 1 1M5 17l1 1 1-1"/></svg></button></article>`;}).join(""):'<div class="wellness-meal-empty">Nenhum exercício programado para hoje.</div>';
  if(elements.dailyPlanStatus)elements.dailyPlanStatus.textContent="";
  refreshExerciseImages();
}
function openDailyPlan(){ if(!todayExerciseLibrary().length)return;renderDailyPlan();showLayer(elements.dailyPlanLayer); }
function startFirstDailyExercise(){
  const exercise=exerciseFromLibrary(todayExerciseLibrary()[0]);if(!exercise)return;
  if(state.workout){renderWorkout();showLayer(elements.workoutLayer);playFixedExerciseVideo(elements.phaseProgress);return;}
  state.selectedExercise=exercise;state.detailMode="selected";startSelectedExercise();
}
function animateDailyPlanReorder(before){
  [...elements.dailyPlanList.querySelectorAll("[data-daily-plan-item]")].forEach((item)=>{const previous=before.get(item),next=item.getBoundingClientRect();if(!previous)return;const deltaY=previous.top-next.top;if(!deltaY)return;item.animate([{transform:`translateY(${deltaY}px)`},{transform:"translateY(0)"}],{duration:220,easing:"cubic-bezier(.2,.8,.2,1)"});});
}
function beginDailyPlanReorder(event){
  const handle=event.target.closest("[data-daily-reorder-handle]"),item=handle?.closest("[data-daily-plan-item]");if(!handle||!item)return;
  event.preventDefault();handle.setPointerCapture?.(event.pointerId);state.dailyReorderPointerId=event.pointerId;state.dailyReorderItem=item;state.dailyReorderStartX=event.clientX;state.dailyReorderStartY=event.clientY;
  if(state.dailyReorderTimer)window.clearTimeout(state.dailyReorderTimer);
  state.dailyReorderTimer=window.setTimeout(()=>{state.dailyReorderTimer=null;if(state.dailyReorderItem!==item)return;state.dailyReorderActive=true;item.classList.add("is-dragging");handle.setPointerCapture?.(event.pointerId);navigator.vibrate?.(20);},500);
}
function moveDailyPlanReorder(event){
  if(event.pointerId!==state.dailyReorderPointerId)return;
  if(!state.dailyReorderActive){if(Math.hypot(event.clientX-state.dailyReorderStartX,event.clientY-state.dailyReorderStartY)>12){window.clearTimeout(state.dailyReorderTimer);state.dailyReorderTimer=null;state.dailyReorderItem=null;}return;}
  event.preventDefault();const dragging=state.dailyReorderItem,target=document.elementFromPoint(event.clientX,event.clientY)?.closest("[data-daily-plan-item]");if(!dragging||!target||target===dragging||target.parentNode!==elements.dailyPlanList)return;
  const before=new Map([...elements.dailyPlanList.querySelectorAll("[data-daily-plan-item]")].map((item)=>[item,item.getBoundingClientRect()])),targetRect=target.getBoundingClientRect();elements.dailyPlanList.insertBefore(dragging,event.clientY<targetRect.top+(targetRect.height/2)?target:target.nextSibling);animateDailyPlanReorder(before);
}
function localDailyPlanOrder(orderedDailyIds){
  const byIdMap=new Map(exerciseLibrary().map((item)=>[String(item.exerciseId),item])),queue=orderedDailyIds.map((id)=>byIdMap.get(String(id))).filter(Boolean),next=[...exerciseLibrary()];let index=0;
  return next.map((item)=>exerciseScheduledToday(item)?(queue[index++]||item):item);
}
async function saveDailyPlanOrder(){
  const orderedDailyIds=[...elements.dailyPlanList.querySelectorAll("[data-daily-plan-item]")].map((item)=>String(item.dataset.exerciseId||"")),previous=exerciseLibrary(),ordered=localDailyPlanOrder(orderedDailyIds),exerciseIds=ordered.map((item)=>item.exerciseId);
  state.dashboard={...(state.dashboard||{}),exerciseLibrary:ordered};cacheDashboard();renderExerciseGrid();
  if(elements.dailyPlanStatus)elements.dailyPlanStatus.textContent="Ordem salva.";
  try{const payload=await apiRequest("/api/200/exercises/library/order",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({profile:profileName(),exerciseIds}),offlineInvalidates:["/api/200/wellness"]});state.dashboard=payload.dashboard||state.dashboard;cacheDashboard();renderExerciseGrid();renderDailyPlan();}
  catch(error){state.dashboard={...(state.dashboard||{}),exerciseLibrary:previous};cacheDashboard();renderExerciseGrid();renderDailyPlan();if(elements.dailyPlanStatus)elements.dailyPlanStatus.textContent=error instanceof Error?error.message:"Não foi possível salvar a ordem.";}
}
function endDailyPlanReorder(event){
  if(event.pointerId!==undefined&&state.dailyReorderPointerId!==null&&event.pointerId!==state.dailyReorderPointerId)return;
  if(state.dailyReorderTimer)window.clearTimeout(state.dailyReorderTimer);state.dailyReorderTimer=null;const active=state.dailyReorderActive,item=state.dailyReorderItem;if(item)item.classList.remove("is-dragging");state.dailyReorderActive=false;state.dailyReorderItem=null;state.dailyReorderPointerId=null;if(active)void saveDailyPlanOrder();
}
function refreshExerciseProgress(){ refreshExerciseImages(); renderDailyExerciseProgress(); }
function exerciseRating(value){return Math.max(1,Math.min(5,Math.round(Number(value)||1)));}
function exerciseDifficultyMarkup(exercise){const difficulty=exerciseRating(exercise?.difficulty),labels=["","Iniciante","Básico","Intermediário","Difícil","Avançado"],label=`${labels[difficulty]} · dificuldade ${difficulty} de 5`;return `<span class="wellness-catalog-difficulty" role="img" aria-label="${label}" title="${label}">${Array.from({length:5},(_,index)=>`<i class="${index<difficulty?"is-active":""}">★</i>`).join("")}</span>`;}
function catalogExerciseHasMuscle(exercise,muscleId){return !muscleId||exerciseMuscleLoads(exercise).some((muscle)=>muscle.muscleId===muscleId);}
function catalogActiveFilterCount(){return Number(Boolean(state.catalogType))+Number(Boolean(state.catalogDifficulty))+Number(Boolean(state.catalogMuscleId));}
function updateCatalogFilterUi(){
  if(elements.catalogSearch&&elements.catalogSearch.value!==state.catalogQuery)elements.catalogSearch.value=state.catalogQuery;
  if(elements.catalogSearchClear)elements.catalogSearchClear.hidden=!state.catalogQuery;
  if(elements.catalogSort&&elements.catalogSort.value!==state.catalogSort)elements.catalogSort.value=state.catalogSort;
  const count=catalogActiveFilterCount();
  elements.catalogFilterToggle?.classList.toggle("is-active",count>0);
  if(elements.catalogFilterCount){elements.catalogFilterCount.hidden=!count;elements.catalogFilterCount.textContent=String(count);}
  elements.catalogFilterPanel?.querySelectorAll("[data-catalog-type]").forEach((button)=>{const active=button.dataset.catalogType===state.catalogType;button.classList.toggle("is-active",active);button.setAttribute("aria-pressed",String(active));});
  elements.catalogDifficultyFilter?.querySelectorAll("[data-catalog-difficulty]").forEach((button)=>{const value=Number(button.dataset.catalogDifficulty),active=state.catalogDifficulty>0&&value<=state.catalogDifficulty;button.classList.toggle("is-active",active);button.setAttribute("aria-pressed",String(value===state.catalogDifficulty));});
  if(elements.catalogMuscleName)elements.catalogMuscleName.textContent=PROJECT200_MUSCLE_BY_ID[state.catalogMuscleId]?.name||"Todos";
}
function renderCatalogMusclePicker(){
  if(!elements.catalogMuscleTrack)return;
  elements.catalogMuscleTitle.textContent=PROJECT200_MUSCLE_BY_ID[state.catalogMuscleId]?.name||"Todos os músculos";
  elements.catalogMuscleTrack.innerHTML=PROJECT200_MUSCLE_MAPS.map((map,index)=>`<section class="wellness-muscle-map-slide" data-catalog-muscle-slide="${index}" aria-label="${escapeHtml(muscleMapDisplayTitle(map,index))}">${muscleMapHeadingMarkup(map,index)}<svg viewBox="${escapeHtml(map.viewBox)}" role="img" aria-label="${escapeHtml(muscleMapDisplayTitle(map,index))}"><path class="wellness-muscle-map-skin" d="${escapeHtml(map.skinPath)}"></path>${map.regions.map((region)=>{const muscle=PROJECT200_MUSCLE_BY_ID[region.muscleId],selected=region.muscleId===state.catalogMuscleId;return `<path class="wellness-muscle-map-region wellness-catalog-muscle-region${selected?" is-selected":""}" data-catalog-muscle-id="${escapeHtml(region.muscleId)}" role="button" tabindex="0" aria-label="Filtrar por ${escapeHtml(muscle?.name||region.muscleId)}" d="${escapeHtml(region.path)}"></path>`;}).join("")}</svg></section>`).join("");
  elements.catalogMuscleDots.innerHTML=PROJECT200_MUSCLE_MAPS.map((map,index)=>`<i class="${index===0?"is-active":""}" aria-label="${escapeHtml(map.title)}"></i>`).join("");
}
function openCatalogMusclePicker(){renderCatalogMusclePicker();showLayer(elements.catalogMuscleLayer);}
function chooseCatalogMuscle(muscleId=""){state.catalogMuscleId=PROJECT200_MUSCLE_BY_ID[muscleId]?muscleId:"";showLayer(elements.catalogLayer);renderCatalog();}
function clearCatalogFilters(){state.catalogType="";state.catalogDifficulty=0;state.catalogMuscleId="";renderCatalog();}
function scheduleCatalogRender(){if(state.catalogSearchTimer)window.clearTimeout(state.catalogSearchTimer);state.catalogSearchTimer=window.setTimeout(()=>{state.catalogSearchTimer=null;renderCatalog();},90);}
function renderCatalog(){
  const selectedIds=new Set(exerciseLibrary().map((item)=>item.exerciseId)),query=state.catalogQuery.trim(),resolvedMuscleIds=query?project200MuscleIdsFor(query):[];
  const matches=exerciseCatalog().map((exercise)=>{const searchable={...exercise,muscleLoads:exerciseMuscleLoads(exercise)};return {...searchable,_searchScore:exerciseCatalogSearchScore(searchable,query,{resolvedMuscleIds})};}).filter((exercise)=>exercise._searchScore>=(query ? .75 : 0)&&(!state.catalogType||exercise.category===state.catalogType)&&(!state.catalogDifficulty||exerciseRating(exercise.difficulty)<=state.catalogDifficulty)&&catalogExerciseHasMuscle(exercise,state.catalogMuscleId));
  const visible=sortExerciseCatalog(matches,state.catalogSort);if(query)visible.sort((left,right)=>right._searchScore-left._searchScore);
  updateCatalogFilterUi();
  if(elements.catalogResults)elements.catalogResults.textContent=`${visible.length} ${visible.length===1?"resultado":"resultados"}${query?" · melhores coincidências primeiro":""}`;
  elements.catalogGrid.innerHTML=visible.length?visible.map((exercise)=>{const added=selectedIds.has(exercise.id);return `<article class="wellness-catalog-item${added?" is-added":""}" data-catalog-exercise-id="${escapeHtml(exercise.id)}" data-exercise-video-drop-id="${escapeHtml(exercise.id)}" role="button" tabindex="0"><span class="wellness-catalog-media-wrap">${exerciseImageMarkup(exercise,"wellness-catalog-image")}${added?'<i class="wellness-catalog-added-check" aria-label="Adicionado ao seu plano"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></i>':""}</span><strong title="${escapeHtml(exercise.name)}">${escapeHtml(exercise.name)}</strong>${exerciseMuscleMarkup(exercise)}${exerciseDifficultyMarkup(exercise)}<span class="wellness-catalog-card-actions">${added?'<i class="wellness-catalog-action-spacer"></i>':`<button type="button" data-catalog-add-id="${escapeHtml(exercise.id)}" aria-label="Adicionar ${escapeHtml(exercise.name)} ao plano"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>`}<button class="wellness-catalog-play" type="button" data-catalog-play-id="${escapeHtml(exercise.id)}" aria-label="Iniciar ${escapeHtml(exercise.name)} agora"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z"/></svg></button></span></article>`;}).join(""):`<div class="wellness-catalog-empty"><strong>Nenhum exercício encontrado</strong><span>Tente outro nome, músculo ou ajuste os filtros.</span></div>`;
  refreshExerciseImages();
}
function openCatalog(){ renderCatalog(); showLayer(elements.catalogLayer); }
function updateExerciseProgressDetail(){
  const item=libraryItem(state.selectedExercise?.id);
  elements.detailProgress.hidden=!item||state.detailMode!=="selected";
  if(!item||state.detailMode!=="selected")return;
  const muscleIds=new Set(exerciseMuscleLoads(state.selectedExercise).map((muscle)=>muscle.muscleId)),lifetime=(Array.isArray(state.dashboard?.muscleLifetime)?state.dashboard.muscleLifetime:[]).filter((entry)=>muscleIds.has(entry.muscleId)).reduce((sum,entry)=>sum+Number(entry.points||0),0),totalPoints=completionDisplayPoints(lifetime);
  elements.detailTotalPoints.textContent=`${totalPoints.toLocaleString("pt-BR")} pontos totais`;
  if(item.trackingType==="series"&&Number(item.targetSeries||0)>0&&Number(item.targetReps||0)>0)elements.detailGoalProgress.textContent=`${Number(item.targetSeries)} séries de ${Number(item.targetReps)}`;
  else if(item.trackingType==="minutes"&&Number(item.targetMinutes||0)>0)elements.detailGoalProgress.textContent=`Meta de ${Number(item.targetMinutes).toLocaleString("pt-BR")} minutos`;
  else if(item.trackingType==="gps"&&Number(item.targetDistanceMeters||0)>0)elements.detailGoalProgress.textContent=`Meta de ${formatDistance(Number(item.targetDistanceMeters))}`;
  else elements.detailGoalProgress.textContent="Defina uma meta";
  elements.detailProgress.setAttribute("aria-label",`${totalPoints} pontos totais neste grupo muscular`);
}
function renderExerciseMuscleMaps(exercise){
  if(!elements.muscleMapTrack)return;
  const loads=new Map(exerciseMuscleLoads(exercise).map((item)=>[item.muscleId,item.load]));
  const activeMaps=PROJECT200_MUSCLE_MAPS.filter((map)=>map.regions.some((region)=>isMuscleLoadDefined(loads.get(region.muscleId))));
  elements.muscleMapSection.hidden=!activeMaps.length;
  elements.muscleMapTrack.innerHTML=activeMaps.map((map,index)=>`<section class="wellness-muscle-map-slide" data-muscle-map-slide="${index}" aria-label="${escapeHtml(muscleMapDisplayTitle(map,PROJECT200_MUSCLE_MAPS.indexOf(map)))}">${muscleMapHeadingMarkup(map,PROJECT200_MUSCLE_MAPS.indexOf(map))}<svg viewBox="${escapeHtml(map.viewBox)}" role="img" aria-label="${escapeHtml(muscleMapDisplayTitle(map,PROJECT200_MUSCLE_MAPS.indexOf(map)))}"><path class="wellness-muscle-map-skin" d="${escapeHtml(map.skinPath)}"></path>${map.regions.map((region)=>{ const load=loads.get(region.muscleId),active=isMuscleLoadDefined(load),muscle=PROJECT200_MUSCLE_BY_ID[region.muscleId]; return `<path class="wellness-muscle-map-region${active?" is-active":""}" data-muscle-id="${escapeHtml(region.muscleId)}" role="button" tabindex="0" aria-label="${escapeHtml(muscle?.name||region.muscleId)}${active?` · ${Math.round(Number(load)*100)}%`:""}" style="--muscle-opacity:${active?Number(load):.12}" d="${escapeHtml(region.path)}"></path>`; }).join("")}</svg></section>`).join("");
  elements.muscleMapDots.innerHTML=activeMaps.map((map,index)=>`<i class="${index===0?"is-active":""}" aria-label="${escapeHtml(map.title)}"></i>`).join("");
  elements.muscleMapTrack.scrollLeft=0;
  if(state.detailMuscleTimer)window.clearInterval(state.detailMuscleTimer);state.detailMuscleTimer=null;
  if(activeMaps.length>1)state.detailMuscleTimer=window.setInterval(()=>{if(document.hidden||elements.detail?.hidden)return;const slides=elements.muscleMapTrack.children.length,width=Math.max(1,elements.muscleMapTrack.clientWidth),current=Math.max(0,Math.min(slides-1,Math.round(elements.muscleMapTrack.scrollLeft/width))),next=(current+1)%slides;elements.muscleMapTrack.scrollTo({left:next*width,behavior:"smooth"});},1200);
}
function renderMuscleExercises(muscleId,returnView="detail"){
  const muscle=PROJECT200_MUSCLE_BY_ID[muscleId]; if(!muscle)return;
  state.selectedMuscleId=muscleId; state.muscleReturnView=returnView; elements.muscleExercisesName.textContent=muscle.name;
  const matches=exerciseCatalog().flatMap((exercise)=>{ const match=exerciseMuscleLoads(exercise).find((item)=>item.muscleId===muscleId); return match?[{exercise,load:match.load}]:[]; }).sort((left,right)=>{ const loadOrder=(Number(right.load)||0)-(Number(left.load)||0); return loadOrder||left.exercise.name.localeCompare(right.exercise.name,"pt-BR"); });
  elements.muscleExercisesList.innerHTML=matches.length?matches.map(({exercise,load})=>`<button type="button" data-muscle-exercise-id="${escapeHtml(exercise.id)}">${exerciseImageMarkup(exercise,"wellness-muscle-exercise-image")}<span><strong>${escapeHtml(exercise.name)}</strong><small>${escapeHtml(EXERCISE_CATEGORIES.find((item)=>item.id===exercise.category)?.label||"Exercício")}</small></span><b>${isMuscleLoadDefined(load)?`${Math.round(Number(load)*100)}%`:"A definir"}</b></button>`).join(""):'<p class="wellness-muscle-exercises-empty">Nenhum exercício definido para este músculo ainda.</p>';
  showLayer(elements.muscleExercisesLayer); refreshExerciseImages();
}
function openExerciseDetail(exercise,mode="selected"){
  if(state.workout&&mode==="selected"){ showLayer(elements.workoutLayer); renderWorkout(); return; }
  state.selectedExercise=exercise; state.detailMode=mode;
  elements.detailCategory.textContent=EXERCISE_CATEGORIES.find((item)=>item.id===exercise.category)?.label||"Exercício";
  elements.detailName.textContent=exercise.name;
  configureFixedExerciseMedia(elements.detailFrame,elements.detailImage,elements.detailVideo,exercise,{movementOnly:true});
  const isGenerating=state.generatingExerciseId===exercise.id||state.uploadingExerciseVideoId===exercise.id; elements.detailFrame?.classList.toggle("is-generating",isGenerating);
  if(elements.detailGenerate){ elements.detailGenerate.hidden=!state.isAdmin; elements.detailGenerate.disabled=isGenerating; }
  if(elements.detailMediaLoaderText)elements.detailMediaLoaderText.textContent=state.uploadingExerciseVideoId===exercise.id?"Otimizando vídeo...":"Criando imagens...";
  if(elements.detailGenerateStatus&&!isGenerating)elements.detailGenerateStatus.textContent=state.isAdmin?(exerciseImageSources(exercise).video?"Vídeo ativo · segure a mídia por 2 segundos para substituir.":"Segure a mídia por 2 segundos para enviar um vídeo."):"";
  const item=libraryItem(exercise.id),hasGoal=hasExerciseGoal(item),startLabel=mode==="catalog"?"Iniciar exercício":!hasGoal?"Definir nova meta":exercise.tracking==="series"?"Iniciar série":exercise.tracking==="gps"?"Iniciar caminhada":"Iniciar exercício"; elements.detailStart.setAttribute("aria-label",startLabel);elements.detailStart.title=startLabel; if(elements.detailGoal)elements.detailGoal.hidden=mode!=="selected"||!hasGoal; if(elements.detailDelete)elements.detailDelete.hidden=mode!=="selected"||!item;
  updateExerciseProgressDetail(); renderExerciseMuscleMaps(exercise); showLayer(elements.detail);startDetailMovementTicker(); elements.detail?.querySelector(".wellness-phase-screen")?.scrollTo({top:0});
}
function openExerciseInfo(){ const exercise=state.selectedExercise;if(!exercise)return; elements.infoCategory.textContent=EXERCISE_CATEGORIES.find((item)=>item.id===exercise.category)?.label||"INFORMAÇÕES"; elements.infoName.textContent=exercise.name; const aliases=Array.isArray(exercise.alternativeNames)?exercise.alternativeNames:[];if(elements.infoAliases){elements.infoAliases.hidden=!aliases.length;const value=elements.infoAliases.querySelector("strong");if(value)value.textContent=aliases.join(" · ");} elements.infoEquipment.textContent=exercise.category==="calisthenics"?"Sem equipamento":exercise.equipment||"Sem equipamento"; const loads=exerciseMuscleLoads(exercise); if(elements.infoMuscles)elements.infoMuscles.innerHTML=`<header><span>Carga muscular relativa</span><small>0,25 mínimo · 1,00 principal</small></header>${loads.map((item)=>`<div><strong>${escapeHtml(item.name)}</strong><span>${formatMuscleLoad(item.load)||"A definir"}</span><i><b style="width:${isMuscleLoadDefined(item.load)?Math.round(Number(item.load)*100):0}%"></b></i></div>`).join("")}`; elements.detailInstructions.innerHTML=""; exerciseInstructions(exercise).forEach((instruction)=>{ const li=document.createElement("li"); li.textContent=instruction; elements.detailInstructions.appendChild(li); }); showLayer(elements.infoLayer); }

function validExerciseDefinition(exercise){ const definition=exerciseDefinition(exercise?.id)||exercise;return exerciseMuscleLoads(exercise).some((item)=>isMuscleLoadDefined(item.load))&&Number(definition?.difficulty||0)>=1&&Number(definition?.popularity||0)>=1; }
function mergeExerciseDefinitions(definitions){
  const current=new Map(exerciseDefinitions().map((item)=>[String(item.exerciseId||""),item]));
  (Array.isArray(definitions)?definitions:[]).forEach((item)=>{ if(item?.exerciseId)current.set(String(item.exerciseId),item); });
  state.dashboard={...(state.dashboard||{}),exerciseDefinitions:[...current.values()]};
  cacheDashboard(); renderExerciseGrid(); if(!elements.catalogLayer?.hidden)renderCatalog();
}
function renderExerciseAdmin(){
  const catalog=exerciseCatalog(),defined=catalog.filter(validExerciseDefinition).length,total=catalog.length,percent=total?Math.round((defined/total)*100):0;
  if(elements.adminProgress)elements.adminProgress.textContent=`${percent}%`;
  if(elements.adminProgressFill)elements.adminProgressFill.style.width=`${percent}%`;
  if(elements.adminProgressCount)elements.adminProgressCount.textContent=`${defined} de ${total} exercícios definidos`;
  const busy=state.generatingDefinitions,allDefined=total>0&&defined>=total; if(elements.adminFill){elements.adminFill.disabled=busy||!total;elements.adminFill.textContent=busy?"Luna trabalhando...":allDefined?"Recriar todas as definições":"Preencher exercícios pendentes";} if(elements.adminCreate)elements.adminCreate.disabled=busy;
}
async function requestExerciseDefinitionBatch(mode,exercises){
  const payload=await apiRequest("/api/admin/200/exercises/definitions/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode,exercises}),forceNetwork:true});
  mergeExerciseDefinitions(payload?.definitions); return Array.isArray(payload?.definitions)?payload.definitions:[];
}
async function fillMissingExerciseDefinitions(){
  if(state.generatingDefinitions)return; const catalog=exerciseCatalog(),missing=catalog.filter((exercise)=>!validExerciseDefinition(exercise)),rebuilding=!missing.length,pending=rebuilding?catalog:missing;
  if(!pending.length){ elements.adminStatus.textContent="Nenhum exercício disponível para definir."; renderExerciseAdmin(); return; }
  state.generatingDefinitions=true; renderExerciseAdmin(); let completed=0;
  try{ for(let index=0;index<pending.length;index+=10){ const batch=pending.slice(index,index+10).map((exercise)=>({exerciseId:exercise.id,exerciseName:exercise.name,category:exercise.category,trackingType:exercise.tracking,equipment:exercise.equipment,cue:exercise.cue})); elements.adminStatus.textContent=`Luna ${rebuilding?"recriando":"definindo"} ${Math.min(index+batch.length,pending.length)} de ${pending.length} exercícios...`; const saved=await requestExerciseDefinitionBatch("missing",batch); if(!saved.length)throw new Error("A Luna não devolveu definições para este lote."); completed+=saved.length; renderExerciseAdmin(); } elements.adminStatus.textContent=`Pronto: ${completed} definições ${rebuilding?"recriadas":"preenchidas"} pela Luna.`; }
  catch(error){ elements.adminStatus.textContent=error instanceof Error?error.message:"Não foi possível preencher os exercícios."; }
  finally{ state.generatingDefinitions=false; renderExerciseAdmin(); }
}
async function createExercisesWithLuna(){
  if(state.generatingDefinitions)return; const names=[...new Set(String(elements.adminNames?.value||"").split(/\r?\n|,/).map((name)=>name.trim()).filter(Boolean))].slice(0,30);
  if(!names.length){ elements.adminStatus.textContent="Escreva pelo menos um exercício, um por linha."; return; }
  state.generatingDefinitions=true; renderExerciseAdmin(); let created=0;
  try{ for(let index=0;index<names.length;index+=10){ const batch=names.slice(index,index+10); elements.adminStatus.textContent=`Luna criando ${Math.min(index+batch.length,names.length)} de ${names.length} exercícios...`; const saved=await requestExerciseDefinitionBatch("create",batch); if(!saved.length)throw new Error("A Luna não devolveu exercícios para este lote."); created+=saved.length; renderExerciseAdmin(); } elements.adminNames.value=""; elements.adminStatus.textContent=`Pronto: ${created} exercícios criados e adicionados ao catálogo.`; }
  catch(error){ elements.adminStatus.textContent=error instanceof Error?error.message:"Não foi possível criar os exercícios."; }
  finally{ state.generatingDefinitions=false; renderExerciseAdmin(); }
}
async function openExerciseAdmin(){
  await refreshAdminAccess(); if(!state.isAdmin)return;
  if(!modal?.classList.contains("active"))openWellness("exercises"); else setTab("exercises");
  if(!state.dashboard?.exerciseDefinitions&&navigator.onLine!==false)await loadDashboard({showCached:true});
  renderExerciseAdmin(); showLayer(elements.adminLayer);
}
async function generateSelectedExerciseImages({skipConfirmation=false}={}){
  const exercise=state.selectedExercise; if(!state.isAdmin||!exercise||state.generatingExerciseId)return;
  if(!skipConfirmation&&!window.confirm(`Criar as três imagens para ${exercise.name}?`))return;
  state.generatingExerciseId=exercise.id; elements.detailGenerate.disabled=true; elements.detailFrame?.classList.add("is-generating"); if(elements.detailMediaLoaderText)elements.detailMediaLoaderText.textContent="Criando imagens..."; elements.detailGenerateStatus.textContent="Gerando movimento A, movimento B e mapa muscular...";
  try{
    const payload=await apiRequest(`/api/admin/200/exercises/${encodeURIComponent(exercise.id)}/images`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({exerciseName:exercise.name,category:exercise.category,equipment:exercise.equipment,cue:exercise.cue,muscles:exerciseMuscles(exercise)})});
    const assets=exerciseAssets().filter((item)=>String(item?.exerciseId||"")!==exercise.id); assets.push(payload.asset); state.dashboard={...(state.dashboard||{}),exerciseAssets:assets}; cacheDashboard(); renderExerciseGrid(); if(!elements.catalogLayer?.hidden)renderCatalog(); openExerciseDetail(exercise,state.detailMode); elements.detailGenerateStatus.textContent="Três imagens 400×400 prontas.";
  }catch(error){ elements.detailGenerateStatus.textContent=error instanceof Error?error.message:"Não foi possível gerar as imagens."; }
  finally{ state.generatingExerciseId=""; elements.detailGenerate.disabled=false; elements.detailFrame?.classList.remove("is-generating"); }
}
function readExerciseVideoDuration(file){ return new Promise((resolve,reject)=>{ const video=document.createElement("video"),url=URL.createObjectURL(file),cleanup=()=>{URL.revokeObjectURL(url);video.removeAttribute("src");}; video.preload="metadata"; video.onloadedmetadata=()=>{const duration=Number(video.duration||0);cleanup();Number.isFinite(duration)&&duration>0?resolve(duration):reject(new Error("Não foi possível medir a duração deste vídeo."));}; video.onerror=()=>{cleanup();reject(new Error("Escolha um arquivo de vídeo válido."));}; video.src=url; }); }
async function uploadExerciseVideo(exercise,file,{openDetailAfter=false,dropCard=null}={}){
  if(!state.isAdmin||!exercise||!file||state.uploadingExerciseVideoId)return false;
  const showDetail=String(state.selectedExercise?.id||"")===String(exercise.id)&&!elements.detail?.hidden;
  state.uploadingExerciseVideoId=exercise.id;dropCard?.classList.add("is-video-uploading");dropCard?.classList.remove("is-video-drop-active");if(showDetail)elements.detailFrame?.classList.add("is-generating");if(showDetail&&elements.detailMediaLoaderText)elements.detailMediaLoaderText.textContent="Verificando vídeo...";if(showDetail)elements.detailGenerateStatus.textContent="Preparando vídeo...";
  try{
    if(file.size>80*1024*1024)throw new Error("Escolha um vídeo de até 80 MB.");
    const duration=await readExerciseVideoDuration(file); if(duration>15.05)throw new Error("Escolha um vídeo de no máximo 15 segundos.");
    if(showDetail&&elements.detailMediaLoaderText)elements.detailMediaLoaderText.textContent="Otimizando 600×600...";if(showDetail)elements.detailGenerateStatus.textContent="Otimizando e enviando para o R2...";
    const payload=await apiRequest(`/api/admin/200/exercises/${encodeURIComponent(exercise.id)}/video?exerciseName=${encodeURIComponent(exercise.name)}`,{method:"POST",headers:{"Content-Type":file.type||"application/octet-stream"},body:file,forceNetwork:true});
    const assets=exerciseAssets().filter((item)=>String(item?.exerciseId||"")!==exercise.id);assets.push(payload.asset);state.dashboard={...(state.dashboard||{}),exerciseAssets:assets};cacheDashboard();state.uploadingExerciseVideoId="";renderExerciseGrid();if(!elements.catalogLayer?.hidden)renderCatalog();if(openDetailAfter){openExerciseDetail(exercise,state.detailMode);elements.detailGenerateStatus.textContent="Vídeo 600×600 salvo. Toque para reproduzir em loop.";}return true;
  }catch(error){const message=error instanceof Error?error.message:"Não foi possível salvar o vídeo.";if(showDetail)elements.detailGenerateStatus.textContent=message;else window.alert(message);return false;}
  finally{state.uploadingExerciseVideoId="";dropCard?.classList.remove("is-video-uploading","is-video-drop-active");elements.detailFrame?.classList.remove("is-generating");if(elements.detailVideoInput)elements.detailVideoInput.value="";}
}
async function uploadSelectedExerciseVideo(file){return uploadExerciseVideo(state.selectedExercise,file,{openDetailAfter:true});}
function desktopExerciseVideoDropEnabled(){return state.isAdmin&&window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches&&!state.uploadingExerciseVideoId;}
function exerciseVideoDropCard(event){return event.target?.closest?.("[data-exercise-video-drop-id]")||null;}
function exerciseVideoDragHasFiles(event){return Array.from(event.dataTransfer?.types||[]).includes("Files");}
function beginExerciseVideoDrop(event){const card=exerciseVideoDropCard(event);if(!card||!desktopExerciseVideoDropEnabled()||!exerciseVideoDragHasFiles(event))return;event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect="copy";card.classList.add("is-video-drop-active");}
function leaveExerciseVideoDrop(event){const card=exerciseVideoDropCard(event);if(!card||card.classList.contains("is-video-uploading"))return;if(event.relatedTarget instanceof Node&&card.contains(event.relatedTarget))return;card.classList.remove("is-video-drop-active");}
function clearExerciseVideoDropHighlights(){document.querySelectorAll("[data-exercise-video-drop-id].is-video-drop-active").forEach((card)=>card.classList.remove("is-video-drop-active"));}
async function finishExerciseVideoDrop(event){const card=exerciseVideoDropCard(event);if(!card||!desktopExerciseVideoDropEnabled())return;event.preventDefault();event.stopPropagation();const files=Array.from(event.dataTransfer?.files||[]),file=files.find((item)=>String(item.type||"").startsWith("video/")||/\.(mp4|mov|m4v|webm|avi)$/i.test(item.name||"")),exercise=exerciseCatalog().find((item)=>item.id===card.dataset.exerciseVideoDropId);if(!file||!exercise){card.classList.remove("is-video-drop-active");window.alert("Arraste um arquivo de vídeo válido.");return;}await uploadExerciseVideo(exercise,file,{dropCard:card});}
function clearAdminExerciseImageHold(){ if(state.adminImageHoldTimer)window.clearTimeout(state.adminImageHoldTimer); state.adminImageHoldTimer=null; }
function beginAdminExerciseImageHold(event){
  const image=event.target.closest?.("[data-exercise-image]"); if(!state.isAdmin||!image||state.generatingExerciseId)return;
  const exerciseId=String(image.dataset.exerciseImageId||state.selectedExercise?.id||""); const exercise=exerciseCatalog().find((item)=>item.id===exerciseId); if(!exercise)return;
  clearAdminExerciseImageHold(); state.adminImageHoldTriggered=false; state.adminImageHoldX=Number(event.clientX||0); state.adminImageHoldY=Number(event.clientY||0);
  state.adminImageHoldTimer=window.setTimeout(()=>{
    state.adminImageHoldTimer=null; state.adminImageHoldTriggered=true; state.suppressExerciseImageClick=true;
    window.setTimeout(()=>{ state.suppressExerciseImageClick=false; },900);
    state.selectedExercise=exercise; state.detailMode=image.closest("[data-catalog-exercise-id]")?"catalog":"selected";
    openExerciseDetail(exercise,state.detailMode); void generateSelectedExerciseImages({skipConfirmation:true});
  },500);
}
function endAdminExerciseImageHold(){ clearAdminExerciseImageHold(); if(state.adminImageHoldTriggered)window.setTimeout(()=>{ state.adminImageHoldTriggered=false; },0); }
function moveAdminExerciseImageHold(event){ if(Math.hypot(Number(event.clientX||0)-state.adminImageHoldX,Number(event.clientY||0)-state.adminImageHoldY)>12)clearAdminExerciseImageHold(); }
function consumeAdminExerciseImageClick(event){ if(!state.suppressExerciseImageClick||!event.target.closest?.("[data-exercise-image],[data-fixed-exercise-video-shell]"))return false; state.suppressExerciseImageClick=false; event.preventDefault(); event.stopPropagation(); return true; }
function clearAdminExerciseVideoHold(){ if(state.adminVideoHoldTimer)window.clearTimeout(state.adminVideoHoldTimer); state.adminVideoHoldTimer=null; }
function beginAdminExerciseVideoHold(event){ if(!state.isAdmin||!state.selectedExercise||state.uploadingExerciseVideoId)return; event.stopPropagation(); clearAdminExerciseVideoHold(); state.adminVideoHoldTriggered=false; state.adminImageHoldX=Number(event.clientX||0); state.adminImageHoldY=Number(event.clientY||0); state.adminVideoHoldTimer=window.setTimeout(()=>{ state.adminVideoHoldTimer=null; state.adminVideoHoldTriggered=true; elements.detailGenerateStatus.textContent="Solte para escolher um vídeo de até 15 segundos."; },2000); }
function moveAdminExerciseVideoHold(event){ if(Math.hypot(Number(event.clientX||0)-state.adminImageHoldX,Number(event.clientY||0)-state.adminImageHoldY)>12)clearAdminExerciseVideoHold(); }
function endAdminExerciseVideoHold(openPicker=true){ clearAdminExerciseVideoHold(); if(!state.adminVideoHoldTriggered)return; state.suppressExerciseImageClick=true; if(openPicker)elements.detailVideoInput?.click(); window.setTimeout(()=>{state.adminVideoHoldTriggered=false;state.suppressExerciseImageClick=false;},900); }
async function addSelectedExercise(){
  const exercise=state.selectedExercise; if(!exercise)return;
  state.detailMode="selected"; openGoal({editing:false});
}
function exerciseDefaultTargets(exercise){const isSeries=exercise?.tracking==="series",isGps=exercise?.tracking==="gps";return {targetSeries:isSeries?3:0,targetReps:isSeries?12:0,targetMinutes:!isSeries&&!isGps?30:0,targetDistanceMeters:isGps?3000:0};}
function openCatalogAddConfirmation(exercise){if(!exercise||libraryItem(exercise.id))return;state.selectedExercise=exercise;state.detailMode="catalog";elements.catalogAddName.textContent=exercise.name;elements.catalogAddStatus.textContent="";elements.catalogAddConfirm.disabled=false;configureFixedExerciseMedia(elements.catalogAddFrame,elements.catalogAddImage,elements.catalogAddVideo,exercise,{movementOnly:true});showLayer(elements.catalogAddLayer);playFixedExerciseVideo(elements.catalogAddFrame,{restart:true});}
async function confirmCatalogAddition(){const exercise=state.selectedExercise;if(!exercise||libraryItem(exercise.id)){showLayer(elements.catalogLayer);renderCatalog();return;}elements.catalogAddConfirm.disabled=true;elements.catalogAddStatus.textContent="Adicionando ao seu plano...";try{const payload=await apiRequest("/api/200/exercises/library",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({profile:profileName(),exerciseId:exercise.id,exerciseName:exercise.name,category:exercise.category,trackingType:exercise.tracking,equipment:exercise.equipment,...exerciseDefaultTargets(exercise)}),offlineInvalidates:["/api/200/wellness","/api/200/extra-goals"]});state.dashboard=payload.dashboard||state.dashboard;cacheDashboard();showLayer(elements.catalogLayer);renderCatalog();window.dispatchEvent(new CustomEvent("project200:exercise-mission-updated"));}catch(error){elements.catalogAddStatus.textContent=error instanceof Error?error.message:"Não foi possível adicionar o exercício.";}finally{elements.catalogAddConfirm.disabled=false;}}
function startCatalogExercise(exercise){if(!exercise)return;if(state.workout){renderWorkout();showLayer(elements.workoutLayer);playFixedExerciseVideo(elements.phaseProgress);return;}state.selectedExercise=exercise;state.detailMode="catalog";fillExerciseGoalFields(exercise,null);void startExercise({preventDefault(){},currentTarget:elements.detailStart});}
function fillExerciseGoalFields(exercise,item){
  const isSeries=exercise?.tracking==="series",isGps=exercise?.tracking==="gps";
  if(isSeries){ elements.targetSeries.value=String(item?.targetSeries||3); elements.targetReps.value=String(item?.targetReps||12); }
  else if(isGps)elements.targetDistanceKm.value=String((Number(item?.targetDistanceMeters||3000)/1000).toFixed(1));
  else elements.targetMinutes.value=String(item?.targetMinutes||30);
}
function renderExerciseWeekdays(){ elements.exerciseWeekdays?.querySelectorAll("[data-exercise-weekday]").forEach((button)=>{ const active=state.goalWeekDays.includes(Number(button.dataset.exerciseWeekday)); button.classList.toggle("active",active); button.setAttribute("aria-pressed",String(active)); }); }
function setExerciseGoalWeekdays(item){ const saved=Array.isArray(item?.scheduleConfig?.weekDays)?item.scheduleConfig.weekDays.map(Number).filter((day)=>day>=0&&day<=6):[]; state.goalWeekDays=[...new Set(saved.length?saved:[1,2,3,4,5,6])]; renderExerciseWeekdays(); }
function toggleExerciseGoalWeekday(day){ const value=Number(day); if(!Number.isInteger(value)||value<0||value>6)return; const selected=new Set(state.goalWeekDays); if(selected.has(value)){ if(selected.size===1){ elements.goalHelp.textContent="Mantenha pelo menos um dia selecionado para este treino."; return; } selected.delete(value); }else selected.add(value); state.goalWeekDays=[...selected]; renderExerciseWeekdays(); }
function adjustExerciseGoalValue(field,direction){ const config={series:[elements.targetSeries,1,1,100],reps:[elements.targetReps,1,1,10000],minutes:[elements.targetMinutes,1,1,1440],distance:[elements.targetDistanceKm,.1,.1,10000]}[field]; if(!config)return; const [input,step,minimum,maximum]=config,current=Number(input.value||minimum),next=Math.max(minimum,Math.min(maximum,current+(Number(direction)<0?-step:step))); input.value=step<1?String(Math.round(next*10)/10):String(Math.round(next)); }
function exerciseGoalDateKey(date=new Date()){ return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
function exerciseGoalSchedule(item){ const previous=item?.scheduleConfig&&typeof item.scheduleConfig==="object"?item.scheduleConfig:{}; return {...previous,frequency:"weekly",interval:1,intervalUnit:"week",weekDays:[...state.goalWeekDays].sort((a,b)=>a-b),avoidDays:[],startsOn:String(previous.startsOn||exerciseGoalDateKey()).slice(0,10),endMode:previous.endMode||"never",notification:previous.notification||{mode:"at_time",customAmount:10,customUnit:"minutes"}}; }
async function deleteSelectedExercise(){
  const exercise=state.selectedExercise,item=libraryItem(exercise?.id); if(!exercise||!item)return;
  if(!window.confirm(`Excluir ${exercise.name} dos seus exercícios? Seu histórico de treinos será preservado.`))return;
  elements.detailDelete.disabled=true;
  try{ const payload=await apiRequest(`/api/200/exercises/library/${encodeURIComponent(exercise.id)}?profile=${encodeURIComponent(profileName())}`,{method:"DELETE",offlineInvalidates:["/api/200/wellness","/api/200/extra-goals"]}); state.dashboard=payload.dashboard||state.dashboard; cacheDashboard(); hideLayers(); renderExerciseGrid(); renderWorkoutHistory(); window.dispatchEvent(new CustomEvent("project200:exercise-mission-updated")); }
  catch(error){ elements.detailGenerateStatus.textContent=error instanceof Error?error.message:"Não foi possível excluir o exercício."; }
  finally{ elements.detailDelete.disabled=false; }
}
function openGoal({editing=false}={}){
  const exercise=state.selectedExercise, item=libraryItem(exercise?.id), isSeries=exercise?.tracking==="series", isGps=exercise?.tracking==="gps";
  state.goalEditMode=editing;
  elements.goalTitle.textContent=isSeries?"Defina séries e movimentos":isGps?"Quantos quilômetros deseja percorrer?":"Quantos minutos?";
  elements.goalStart.textContent=editing?"Salvar meta":isSeries?"Iniciar série":isGps?"Iniciar atividade":"Iniciar exercício";
  elements.goalHelp.textContent=editing?"Ajuste a meta e os dias do treino.":"Defina a meta e os dias antes de iniciar. Tudo realizado será consolidado quando você concluir o treino.";
  elements.seriesGoalFields.hidden=!isSeries; elements.minutesGoalFields.hidden=isSeries||isGps; elements.distanceGoalFields.hidden=!isGps;
  fillExerciseGoalFields(exercise,item); setExerciseGoalWeekdays(item);
  showLayer(elements.goalLayer);
}
function startSelectedExercise(){ const exercise=state.selectedExercise,item=libraryItem(exercise?.id); if(!exercise)return; if(!hasExerciseGoal(item)){ openGoal({editing:false}); return; } fillExerciseGoalFields(exercise,item); void startExercise({preventDefault(){},currentTarget:elements.detailStart}); }
function renderNutrientBars(meal){ const nutrients=Array.isArray(meal?.nutrients||meal?.components)?(meal.nutrients||meal.components):[]; return nutrients.map((item,index)=>`<div class="wellness-nutrient"><span><b>${escapeHtml(item.label||item.name||"")}</b><em>${Number(item.value??item.calories??0).toLocaleString("pt-BR",{maximumFractionDigits:1})} ${escapeHtml(item.unit||"")}</em></span><i><u style="width:${Math.max(0,Math.min(100,Number(item.percent||0)))}%;--nutrient-index:${index}"></u></i></div>`).join(""); }
function renderMealConfig(){ if(!elements.mealConfigList)return; const slots=Array.isArray(state.dashboard?.mealSlots)?state.dashboard.mealSlots:[]; elements.mealConfigList.innerHTML=slots.map((slot)=>`<label><input type="checkbox" value="${slot.key}" ${slot.enabled?"checked":""}/><span>${slot.label}</span></label>`).join(""); }
function openMealConfig(){ renderMealConfig(); if(elements.mealConfigStatus)elements.mealConfigStatus.textContent=""; showLayer(elements.mealConfigLayer); }
function openMealAdd(slot){ state.selectedMealSlot=slot.key; if(elements.mealAddTitle)elements.mealAddTitle.textContent=slot.label; if(elements.foodInput)elements.foodInput.value=""; const now=new Date(); if(elements.foodTime)elements.foodTime.value=`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`; if(elements.mealAddStatus)elements.mealAddStatus.textContent=""; showLayer(elements.mealAddLayer); window.setTimeout(()=>elements.foodInput?.focus(),80); }
function renderMeals(){
  const dashboard=state.dashboard||{},today=dashboard.today||{};
  elements.calories.textContent=String(Math.round(Number(today.calories||0)));
  elements.quality.textContent=String(Math.round(Number(today.qualityScore||0)));
  elements.qualityFill.style.width=`${Math.max(0,Math.min(100,Number(today.qualityScore||0)))}%`;
  const complete=Number(today.completedMealSlots||0),total=Number(today.enabledMealSlots||0);
  elements.mealCount.textContent=total?`${complete} de ${total} refeições preenchidas`:"Configure suas refeições";
  elements.mealList.innerHTML="";
  const slots=(Array.isArray(dashboard.mealSlots)?dashboard.mealSlots:[]).filter((slot)=>slot.enabled);
  if(!slots.length){ elements.mealList.innerHTML='<button class="wellness-meal-empty" type="button" data-configure-meals>Ative pelo menos uma refeição para começar.</button>'; return; }
  elements.mealList.innerHTML=slots.map((slot)=>{ const meal=slot.meal; return `<article class="wellness-meal-slot ${meal?"is-filled":"is-empty"}" data-meal-slot="${escapeHtml(slot.key)}"><header><div><span>${meal?"PREENCHIDA":"0% · NÃO INFORMADA"}</span><h3>${escapeHtml(slot.label)}</h3></div><button type="button" data-add-meal="${escapeHtml(slot.key)}">${meal?"Atualizar":"Adicionar refeição"}</button></header>${meal?`<p>${escapeHtml(meal.description)}</p><div class="wellness-meal-score"><b>${Math.round(Number(meal.calories||0))} kcal</b><span>${Math.round(Number(meal.qualityScore||0))}% qualidade</span></div><div class="wellness-nutrients">${renderNutrientBars(meal)}</div>`:'<div class="wellness-meal-zero"><strong>0%</strong><span>Informe esta refeição para gerar a análise.</span></div>'}</article>`; }).join("");
}
function bmiPosition(bmi){ if(!Number.isFinite(bmi))return 50; const points=[[12,4],[18.5,24],[22,50],[24.9,63],[30,86],[45,96]]; for(let i=1;i<points.length;i+=1){ if(bmi<=points[i][0]){ const [a,pa]=points[i-1], [b,pb]=points[i]; return pa+((bmi-a)/(b-a))*(pb-pa); } } return 96; }
function renderWeight(){ const wellness=state.dashboard?.wellness||{}; const current=wellness.currentWeight; const bmi=Number(wellness.bmi); const hasBmi=Number.isFinite(bmi)&&bmi>0; const weight=current?Number(current.weightKg):null; const label=weight?weight.toFixed(weight%1?1:0):"--"; elements.weightCurrent.textContent=label; elements.weightModalCurrent.textContent=label; const summary=hasBmi?`IMC ${bmi.toFixed(1)} · toque para ver histórico`:(weight?"Adicione sua altura para calcular o IMC":"Toque para adicionar peso e altura"); elements.bmiSummary.textContent=summary; elements.bmiValue.textContent=hasBmi?`IMC ${bmi.toFixed(1)}`:"Informe sua altura"; const position=`${bmiPosition(bmi)}%`; elements.bmiMarker.style.left=position; elements.bmiModalMarker.style.left=position; elements.heightInput.value=wellness.preferences?.heightCm||""; elements.weightInput.value=""; elements.weightHistory.innerHTML=""; const history=Array.isArray(wellness.weightHistory)?wellness.weightHistory:[]; if(!history.length){ elements.weightHistory.textContent="Nenhuma pesagem registrada."; return; } history.forEach((entry)=>{ const row=document.createElement("div"); row.className="wellness-weight-history-entry"; row.innerHTML=`<strong>${Number(entry.weightKg).toFixed(1)} kg</strong><span>${new Date(entry.measuredAt).toLocaleDateString("pt-BR")}</span>`; elements.weightHistory.appendChild(row); }); }
function elapsedSeconds(workout=state.workout){ const started=new Date(workout?.startedAt||"").getTime(); return Number.isFinite(started)?Math.max(0,Math.floor((Date.now()-started)/1000)):0; }
function formatTimer(seconds){ const total=Math.max(0,Math.trunc(seconds||0)), hours=Math.floor(total/3600), minutes=Math.floor((total%3600)/60), secs=total%60; return hours?`${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:${String(secs).padStart(2,"0")}`:`${String(minutes).padStart(2,"0")}:${String(secs).padStart(2,"0")}`; }
function currentGpsDistance(){ return Math.max(0,Math.round(Math.max(Number(state.workout?.distanceMeters||0),Number(state.gpsDistanceMeters||0)))); }
function formatDistance(meters){ const value=Math.max(0,Number(meters||0)); return value<1000?`${Math.round(value)} m`:`${(value/1000).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})} km`; }
function relativeWorkoutTime(value,now=Date.now()){
  const timestamp=new Date(value||"").getTime();if(!Number.isFinite(timestamp))return "agora mesmo";
  const elapsed=Math.max(0,Math.floor((now-timestamp)/1000));if(elapsed<60)return "agora mesmo";
  const minutes=Math.floor(elapsed/60);if(minutes<60)return `há ${minutes} ${minutes===1?"minuto":"minutos"}`;
  const hours=Math.floor(minutes/60);if(hours<24)return `há ${hours} ${hours===1?"hora":"horas"}`;
  const days=Math.floor(hours/24),remainingHours=hours%24;
  if(days<30)return `há ${days} ${days===1?"dia":"dias"}${remainingHours?` e ${remainingHours} ${remainingHours===1?"hora":"horas"}`:""}`;
  const months=Math.floor(days/30),remainingDays=days%30;
  if(months<12)return `há ${months} ${months===1?"mês":"meses"}${remainingDays?` e ${remainingDays} ${remainingDays===1?"dia":"dias"}`:""}`;
  const years=Math.floor(months/12),remainingMonths=months%12;
  return `há ${years} ${years===1?"ano":"anos"}${remainingMonths?` e ${remainingMonths} ${remainingMonths===1?"mês":"meses"}`:""}`;
}
function refreshWorkoutRelativeTimes(){ elements.workoutHistory?.querySelectorAll("time[data-workout-time]").forEach((time)=>{time.textContent=relativeWorkoutTime(time.dataset.workoutTime);}); }
function averageSpeedKmh(){ const elapsed=elapsedSeconds(state.workout); return elapsed>0?(currentGpsDistance()/1000)/(elapsed/3600):0; }
function formatAverageSpeed(){ return `${averageSpeedKmh().toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})} km/h`; }
function haversineMeters(a,b){ const radians=(value)=>value*Math.PI/180, earth=6371000, lat=radians(b.latitude-a.latitude), lon=radians(b.longitude-a.longitude), x=Math.sin(lat/2)**2+Math.cos(radians(a.latitude))*Math.cos(radians(b.latitude))*Math.sin(lon/2)**2; return earth*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)); }
function renderWorkoutHistory(){ if(!elements.workoutHistory)return; const workouts=Array.isArray(state.dashboard?.recentWorkouts)?state.dashboard.recentWorkouts:[]; elements.workoutHistory.innerHTML=""; if(!workouts.length){ elements.workoutHistory.innerHTML="<div class=\"wellness-meal-empty\">Nenhum treino concluído.</div>"; return; } workouts.forEach((workout)=>{ const row=document.createElement("div"); row.className="wellness-workout-history-entry"; const result=workout.trackingType==="series"?`${Number(workout.seriesCount||0)} séries · ${Number(workout.totalReps||0)} movimentos`:workout.trackingType==="gps"?`${formatDistance(Number(workout.distanceMeters||0))} · ${Math.round(Number(workout.durationMinutes||0))} min`:`${Math.round(Number(workout.durationMinutes||0))} minutos`,completedAt=workout.completedAt||workout.startedAt||new Date().toISOString(); row.innerHTML=`<div class="wellness-workout-history-copy"><span class="wellness-workout-history-title"><strong></strong><button class="wellness-workout-history-delete" type="button" data-delete-workout-id="${escapeHtml(workout.id)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg></button></span><small>${result}</small></div><time datetime="${escapeHtml(new Date(completedAt).toISOString())}" data-workout-time="${escapeHtml(completedAt)}">${relativeWorkoutTime(completedAt)}</time>`; row.querySelector("strong").textContent=workout.exerciseName||"Treino"; row.querySelector("button").setAttribute("aria-label",`Excluir treino ${workout.exerciseName||"Treino"}`); elements.workoutHistory.appendChild(row); }); }
function withoutDeletedWorkoutHistory(dashboard){if(!dashboard||!state.deletedWorkoutIds.size)return dashboard;return {...dashboard,recentWorkouts:(dashboard.recentWorkouts||[]).filter((item)=>!state.deletedWorkoutIds.has(String(item?.id||"")))};}
function sameLocalDay(left,right=new Date()){const date=new Date(left||"");return Number.isFinite(date.getTime())&&date.getFullYear()===right.getFullYear()&&date.getMonth()===right.getMonth()&&date.getDate()===right.getDate();}
function applyWorkoutRemovalLocally(workout){
  const now=Date.now(),nowIso=new Date(now).toISOString(),dashboard=state.dashboard||{},isToday=sameLocalDay(workout?.completedAt||workout?.startedAt),exerciseLibraryNext=isToday?exerciseLibrary().map((item)=>{if(item.exerciseId!==workout?.exerciseId)return item;if(workout.trackingType==="series")return {...item,todayTotalReps:Math.max(0,Number(item.todayTotalReps||0)-Number(workout.totalReps||0))};if(workout.trackingType==="gps")return {...item,todayDistanceMeters:Math.max(0,Number(item.todayDistanceMeters||0)-Number(workout.distanceMeters||0)),todayDurationMinutes:Math.max(0,Number(item.todayDurationMinutes||0)-Number(workout.durationMinutes||0))};return {...item,todayDurationMinutes:Math.max(0,Number(item.todayDurationMinutes||0)-Number(workout.durationMinutes||0))};}):exerciseLibrary();
  state.dashboard={...dashboard,recentWorkouts:(Array.isArray(dashboard.recentWorkouts)?dashboard.recentWorkouts:[]).filter((item)=>String(item?.id||"")!==String(workout.id)),exerciseLibrary:exerciseLibraryNext};
  cacheDashboard();renderWorkoutHistory();renderExerciseGrid();
  try{
    const exercise=exerciseCatalog().find((item)=>item.id===workout?.exerciseId)||exerciseFromLibrary(libraryItem(workout?.exerciseId)||{}),loads=exerciseMuscleLoads(exercise),completedAt=new Date(workout?.completedAt||workout?.startedAt||now).getTime(),elapsedMinutes=Number.isFinite(completedAt)?Math.max(0,now-completedAt)/60000:0,gains=workout?.trackingType==="series"?calculateProject200ExerciseMuscleGains([{repetitions:Number(workout.totalReps||0)}],loads):[],deductions=new Map(gains.map((gain)=>[gain.muscleId,project200DecayedMusclePoints(gain.points,elapsedMinutes)])),muscleProgress=(Array.isArray(dashboard.muscleProgress)?dashboard.muscleProgress:[]).map((entry)=>{const current=project200CurrentMuscleProgress(entry,now),points=Math.max(0,Number(current.points||0)-Number(deductions.get(current.muscleId)||0));return {muscleId:current.muscleId,points,updatedAt:nowIso,measuredAt:nowIso};}).filter((entry)=>entry.points>0);
    state.dashboard={...state.dashboard,muscleProgress};
  }catch{}
  cacheDashboard();refreshMuscleProgressMap();
}
async function deleteWorkoutHistoryEntry(workout){
  if(!workout||!window.confirm(`Excluir ${workout.exerciseName||"este treino"} do histórico? O progresso deste treino também será removido.`))return;
  const workoutId=String(workout.id||"");if(!workoutId)return;
  if(isOfflineWorkout(workout)){ state.deletedWorkoutIds.add(workoutId);removeOfflineWorkout(workout.id);applyWorkoutRemovalLocally(workout);return; }
  if(navigator.onLine===false){window.alert("Conecte-se à internet para excluir este treino.");return;}
  state.deletedWorkoutIds.add(workoutId);
  const previous=state.dashboard;
  applyWorkoutRemovalLocally(workout);
  try{const payload=await apiRequest(`/api/200/exercises/${encodeURIComponent(workout.id)}/history?profile=${encodeURIComponent(profileName())}`,{method:"DELETE",forceNetwork:true,skipGlobalLoading:true,offlineInvalidates:["/api/200/wellness","/api/200/extra-goals"]});state.dashboard=withoutDeletedWorkoutHistory(payload.dashboard||state.dashboard);cacheDashboard();renderExerciseGrid();renderWorkoutHistory();renderMuscleProgressMap();window.dispatchEvent(new CustomEvent("project200:exercise-mission-updated"));}
  catch(error){state.deletedWorkoutIds.delete(workoutId);state.dashboard=previous;cacheDashboard();renderExerciseGrid();renderWorkoutHistory();window.alert(error instanceof Error?error.message:"Não foi possível excluir o treino.");}
}
function setWorkoutProgress(value){
  if(!elements.phaseProgress||!state.workout)return;
  const progress=Math.max(0,Math.min(100,Number(value||0))),workoutId=String(state.workout.id||""),sameWorkout=elements.phaseProgress.dataset.workoutId===workoutId,previous=Number(elements.phaseProgress.dataset.progress||0);
  elements.phaseProgress.style.setProperty("--progress",String(progress)); elements.phaseProgress.dataset.progress=String(progress); elements.phaseProgress.dataset.workoutId=workoutId; elements.phaseProgress.setAttribute("aria-label",`${Math.round(progress)}% da meta concluída`);
  if(!sameWorkout||progress<=previous+.01||(state.workout.trackingType!=="series"&&progress-previous<1))return;
  playWorkoutProgressFlash();
}
function renderWorkoutSeriesMarkers(done,target){
  if(!elements.workoutSeriesCount)return;
  const total=Math.max(1,Math.min(20,Math.max(Number(done||0),Number(target||1))));
  if(Number(elements.workoutSeriesCount.dataset.total||0)!==total){
    elements.workoutSeriesCount.dataset.total=String(total);
    elements.workoutSeriesCount.innerHTML=Array.from({length:total},(_,index)=>`<img src="/200/apps/exercicios.png" alt="" data-series-marker="${index+1}" />`).join("");
  }
  const apply=()=>elements.workoutSeriesCount.querySelectorAll("[data-series-marker]").forEach((marker,index)=>marker.classList.toggle("is-complete",index<done));
  window.requestAnimationFrame(apply);
  elements.workoutSeriesStatus?.setAttribute("aria-label",`${done} de ${target} séries concluídas`);
}
function stopSeriesRestTimer(){ if(state.seriesRestTimer)window.clearInterval(state.seriesRestTimer);if(state.seriesRestDelayTimer)window.clearTimeout(state.seriesRestDelayTimer);state.seriesRestTimer=null;state.seriesRestDelayTimer=null; }
function clearSeriesRest(){ stopSeriesRestTimer();if(state.seriesRestRevealTimer)window.clearTimeout(state.seriesRestRevealTimer);state.seriesRestRevealTimer=null;state.seriesRestPending=false;state.seriesRestUntil=0;state.seriesRestWorkoutId="";elements.phaseProgress?.classList.remove("is-rest-revealing"); }
function workoutRestRemainingMs(){
  if(!state.workout||state.workout.trackingType!=="series"||String(state.workout.id||"")!==state.seriesRestWorkoutId)return 0;
  return Math.max(0,Number(state.seriesRestUntil||0)-Date.now());
}
function setWorkoutRestAppearance(resting,remainingMs=0){
  elements.phaseProgress?.classList.toggle("is-resting",resting);
  if(elements.workoutRest)elements.workoutRest.hidden=!resting;
  if(elements.workoutPrimary){elements.workoutPrimary.hidden=false;elements.workoutPrimary.disabled=resting||state.seriesRestPending;elements.workoutPrimary.setAttribute("aria-disabled",String(resting||state.seriesRestPending));}
  if(elements.workoutAdvance){const next=selectedWorkoutNavigationExercise();elements.workoutAdvance.hidden=!next;elements.workoutAdvance.disabled=!next;elements.workoutAdvance.setAttribute("aria-label",next?(resting?`Pular descanso e iniciar ${next.name}`:`Pular para ${next.name}`):"Nenhum próximo exercício");}
  if(!resting)return;
  const seconds=Math.max(1,Math.ceil(remainingMs/1000)),progress=Math.max(0,Math.min(100,(remainingMs/WORKOUT_SERIES_REST_MS)*100));
  if(elements.workoutRestTime)elements.workoutRestTime.textContent=`${seconds}s`;
  if(elements.phaseProgress){elements.phaseProgress.style.setProperty("--progress",String(progress));elements.phaseProgress.setAttribute("aria-label",`Descanso: ${seconds} segundos restantes`);}
}
function refreshSeriesRest(){
  const remainingMs=workoutRestRemainingMs();
  if(remainingMs>0){if(!state.seriesRestTimer)state.seriesRestTimer=window.setInterval(refreshSeriesRest,250);setWorkoutRestAppearance(true,remainingMs);return;}
  revealWorkoutAfterRest();
}
function scheduleSeriesRest(workout=state.workout){
  const done=Number(workout?.seriesCount||0),target=Math.max(1,Number(workout?.targetSeries||1));
  if(workout?.trackingType!=="series"||done>=target){clearSeriesRest();return false;}
  clearSeriesRest();state.seriesRestWorkoutId=String(workout.id||"");state.seriesRestPending=true;
  state.seriesRestDelayTimer=window.setTimeout(()=>{state.seriesRestDelayTimer=null;if(!state.workout||String(state.workout.id||"")!==state.seriesRestWorkoutId){clearSeriesRest();return;}state.seriesRestPending=false;state.seriesRestUntil=Date.now()+WORKOUT_SERIES_REST_MS;state.seriesRestTimer=window.setInterval(refreshSeriesRest,250);renderWorkout();},WORKOUT_SERIES_REST_DELAY_MS);return true;
}
function revealWorkoutAfterRest(){
  clearSeriesRest();const ring=elements.phaseProgress;if(ring){ring.classList.add("is-rest-revealing");state.seriesRestRevealTimer=window.setTimeout(()=>{ring.classList.remove("is-rest-revealing");state.seriesRestRevealTimer=null;},760);}renderWorkout();
}
function skipSeriesRest(){ if(!workoutRestRemainingMs())return;revealWorkoutAfterRest(); }
function adjustSeriesRest(seconds){
  const remainingMs=workoutRestRemainingMs();if(!remainingMs)return;const nextMs=remainingMs+(Number(seconds)||0)*1000;if(nextMs<=0){revealWorkoutAfterRest();return;}state.seriesRestUntil=Date.now()+nextMs;refreshSeriesRest();
}
function renderWorkout(){
  const workout=state.workout; elements.activeWorkout.hidden=!workout; if(!workout){ clearSeriesRest();setWorkoutRestAppearance(false);elements.activeWorkoutVideo?.pause(); elements.workoutVideo?.pause();state.workoutNavigationWorkoutId="";state.workoutNavigationExerciseId="";if(elements.workoutNextName)elements.workoutNextName.textContent="—";if(elements.workoutAdvance)elements.workoutAdvance.disabled=true;if(elements.workoutPreviousExercise)elements.workoutPreviousExercise.disabled=true;if(elements.workoutNextExercise)elements.workoutNextExercise.disabled=true; return; }
  if(state.seriesRestWorkoutId&&String(workout.id||"")!==state.seriesRestWorkoutId)clearSeriesRest();
  const isSeries=workout.trackingType==="series", isGps=workout.trackingType==="gps",exercise=exerciseCatalog().find((item)=>item.id===workout.exerciseId)||exerciseFromLibrary(libraryItem(workout.exerciseId)||{});
  renderWorkoutNavigation(workout);
  elements.workoutSeriesStatus.hidden=!isSeries;
  elements.workoutName.textContent=workout.exerciseName||"Treino"; elements.workoutCounter.textContent=isSeries?`${Number(workout.seriesCount||0)}/${Number(workout.targetSeries||0)} séries`:isGps?formatDistance(currentGpsDistance()):formatTimer(elapsedSeconds(workout));
  elements.workoutDetail.textContent=isGps?`${formatTimer(elapsedSeconds(workout))} · média ${formatAverageSpeed()}`:"Meta e progresso salvos no seu perfil"; elements.phaseName.textContent=workout.exerciseName||"Treino";
  configureFixedExerciseMedia(elements.activeWorkoutImage?.closest("[data-fixed-exercise-video-shell]"),elements.activeWorkoutImage,elements.activeWorkoutVideo,exercise);
  configureFixedExerciseMedia(elements.phaseProgress,elements.workoutImage,elements.workoutVideo,exercise);
  if(isSeries){
    const done=Number(workout.seriesCount||0),target=Math.max(1,Number(workout.targetSeries||1)),reps=currentSeriesReps(),remainingMs=workoutRestRemainingMs();
    renderWorkoutSeriesMarkers(done,target);elements.phaseUnit.textContent="";
    if(remainingMs>0){elements.phaseLabel.textContent="Descanso";elements.workoutVideo?.pause();setWorkoutRestAppearance(true,remainingMs);return;}
    if(state.seriesRestUntil)clearSeriesRest();setWorkoutRestAppearance(false);playFixedExerciseVideo(elements.phaseProgress);elements.phaseLabel.textContent=done>=target?"Meta concluída · série extra":`Série ${done+1} de ${target}`;elements.workoutPrimary.setAttribute("aria-label",`Registrar ${reps} movimentos`);setWorkoutProgress((done/target)*100);return;
  }
  if(state.seriesRestUntil)clearSeriesRest();setWorkoutRestAppearance(false);playFixedExerciseVideo(elements.phaseProgress);
  const elapsed=elapsedSeconds(workout);
  if(isGps){ const targetMeters=Math.max(100,Number(workout.targetDistanceMeters||100)); elements.phaseLabel.textContent=`Meta de ${formatDistance(targetMeters)}`; elements.phaseUnit.textContent=`${formatDistance(currentGpsDistance())} · ${formatTimer(elapsed)} · média ${formatAverageSpeed()} · ${state.gpsStatus}`; elements.workoutPrimary.setAttribute("aria-label","Salvar progresso do GPS"); setWorkoutProgress((currentGpsDistance()/targetMeters)*100); }
  else{ const targetSeconds=Math.max(60,Number(workout.targetMinutes||1)*60); elements.phaseLabel.textContent=`Meta de ${Math.round(Number(workout.targetMinutes||0))} minutos`; elements.phaseUnit.textContent=`${formatTimer(elapsed)} de atividade`; elements.workoutPrimary.setAttribute("aria-label","Salvar progresso do exercício"); setWorkoutProgress((elapsed/targetSeconds)*100); }
}
function applyDashboardPayload(payload){
  state.dashboard=withoutDeletedWorkoutHistory(payload?.dashboard||{}); applyAdminAccess(payload?.isAdmin);
  const local=readOfflineWorkouts().find((item)=>!item.finished)?.workout||null;
  state.workout=local||state.dashboard.activeWorkout||null; if(local)state.dashboard.activeWorkout=local;
  if(state.workout)rebuildProvisionalMuscleProgress(state.workout); else if(!readOfflineWorkouts().some((item)=>item.finished))state.provisionalMuscleProgress.clear();
  state.seriesRepsDraft=null; state.steps=Number(state.workout?.steps||0); state.gpsDistanceMeters=Number(state.workout?.distanceMeters||0);
  renderMeals(); renderWeight(); renderExerciseGrid(); renderWorkoutHistory(); renderWorkout();
  if(!elements.catalogLayer?.hidden)renderCatalog();
  if(!elements.detail?.hidden&&state.selectedExercise)openExerciseDetail(state.selectedExercise,state.detailMode);
  if(!elements.adminLayer?.hidden)renderExerciseAdmin();
  if(state.workout?.trackingType==="steps")void startStepCounter(false);
  if(state.workout?.trackingType==="gps")void startGpsTracking(false);
  window.dispatchEvent(new CustomEvent("project200:exercise-mission-updated"));
}
async function loadDashboard({showCached=true}={}){
  const path=dashboardPath();
  if(showCached){ const cached=window.Project200Offline?.peek?.(path); if(cached)applyDashboardPayload(cached); }
  try{ const payload=await apiRequest(path,{cache:"no-store",forceNetwork:navigator.onLine!==false,cacheMaxAgeMs:0}); applyDashboardPayload(payload); return payload; }
  catch(error){ elements.nutritionStatus.textContent=error instanceof Error?error.message:"Nao foi possivel carregar."; return null; }
}
function exerciseGoalValues(exercise=state.selectedExercise){
  const isSeries=exercise?.tracking==="series",isGps=exercise?.tracking==="gps";
  const targetSeries=Math.max(1,Math.trunc(Number(elements.targetSeries.value||0)||0)),targetReps=Math.max(1,Math.trunc(Number(elements.targetReps.value||0)||0));
  const targetMinutes=Math.max(1,Number(elements.targetMinutes.value||0)||0),targetDistanceMeters=Math.max(100,Math.round((Number(String(elements.targetDistanceKm.value||"").replace(",","."))||0)*1000));
  return {targetSeries:isSeries?targetSeries:0,targetReps:isSeries?targetReps:0,targetMinutes:!isSeries&&!isGps?targetMinutes:0,targetDistanceMeters:isGps?targetDistanceMeters:0};
}
async function saveExerciseGoal(scheduleConfig,{startAfterSave=false}={}){
  const exercise=state.selectedExercise;if(!exercise)return;
  const help=elements.goalForm?.querySelector("p"); elements.goalStart.disabled=true; if(help)help.textContent="Salvando meta e dias do treino...";
  try{ const payload=await apiRequest("/api/200/exercises/library",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({profile:profileName(),exerciseId:exercise.id,exerciseName:exercise.name,category:exercise.category,trackingType:exercise.tracking,equipment:exercise.equipment,...exerciseGoalValues(exercise),scheduleConfig})}); state.dashboard=payload.dashboard||state.dashboard; state.goalEditMode=false; renderExerciseGrid(); if(!elements.catalogLayer?.hidden)renderCatalog(); window.dispatchEvent(new CustomEvent("project200:exercise-mission-updated")); if(startAfterSave){ fillExerciseGoalFields(exercise,libraryItem(exercise.id)); await startExercise({preventDefault(){},currentTarget:elements.detailStart}); }else openExerciseDetail(exercise,"selected"); }
  catch(error){ if(help)help.textContent=error instanceof Error?error.message:"Não foi possível alterar a meta."; showLayer(elements.goalLayer); }
  finally{ elements.goalStart.disabled=false; }
}
function submitExerciseGoal(event){
  event.preventDefault(); const exercise=state.selectedExercise,item=libraryItem(exercise?.id); if(!exercise)return;
  if(!state.goalWeekDays.length){ elements.goalHelp.textContent="Selecione pelo menos um dia para este treino."; return; }
  void saveExerciseGoal(exerciseGoalSchedule(item),{startAfterSave:!state.goalEditMode});
}
async function startExercise(event){
  event.preventDefault(); const exercise=state.selectedExercise; if(!exercise||state.workout)return;
  const isSeries=exercise.tracking==="series", isGps=exercise.tracking==="gps";
  const {targetSeries,targetReps,targetMinutes,targetDistanceMeters}=exerciseGoalValues(exercise);
  const directStart=event?.currentTarget===elements.detailStart,submit=directStart?elements.detailStart:elements.goalForm.querySelector("button[type=submit]"); submit.disabled=true;
  const startPayload={profile:profileName(),exerciseId:exercise.id,exerciseName:exercise.name,category:exercise.category,trackingType:exercise.tracking,equipment:exercise.equipment,targetSeries:isSeries?targetSeries:0,targetReps:isSeries?targetReps:0,targetMinutes:!isSeries&&!isGps?targetMinutes:0,targetDistanceMeters:isGps?targetDistanceMeters:0};
  try{ if(navigator.onLine===false){ activateOfflineWorkout(createOfflineWorkout(exercise,startPayload),startPayload); }else{ try{ const payload=await apiRequest("/api/200/exercises/start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(startPayload)}); state.dashboard=payload.dashboard||state.dashboard; state.workout=payload.workout; }catch(error){ if(error?.httpResponse)throw error; activateOfflineWorkout(createOfflineWorkout(exercise,startPayload),startPayload); } } state.seriesSaveChain=Promise.resolve(); rebuildProvisionalMuscleProgress(state.workout); state.seriesRepsDraft=null; state.steps=Number(state.workout?.steps||0); state.gpsDistanceMeters=Number(state.workout?.distanceMeters||0); if(exercise.tracking==="steps")await startStepCounter(true); if(exercise.tracking==="gps")await startGpsTracking(true); renderExerciseGrid(); renderWorkout(); showLayer(elements.workoutLayer);playFixedExerciseVideo(elements.phaseProgress); }
  catch(error){ const message=error instanceof Error?error.message:"Nao foi possivel iniciar."; if(directStart){ openExerciseDetail(exercise,state.detailMode); elements.detailGenerateStatus.textContent=message; }else elements.goalForm.querySelector("p").textContent=message; } finally{ submit.disabled=false; }
}
async function saveWorkoutProgress(){ if(!state.workout||state.workout.trackingType==="series")return; const progress={steps:state.steps,distanceMeters:state.workout.trackingType==="gps"?currentGpsDistance():Number(state.workout.distanceMeters||0),durationMinutes:elapsedSeconds(state.workout)/60}; if(isOfflineWorkout()){ state.workout={...state.workout,...progress}; state.dashboard={...(state.dashboard||{}),activeWorkout:state.workout}; persistOfflineWorkout(state.workout); cacheDashboard(); return; } const payload=await apiRequest(`/api/200/exercises/${encodeURIComponent(state.workout.id)}/progress`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(progress)}); state.workout=payload.workout||state.workout; if(state.workout.trackingType==="gps")state.gpsDistanceMeters=Math.max(state.gpsDistanceMeters,Number(state.workout.distanceMeters||0)); }
function seriesSummary(workout){ const series=Array.isArray(workout?.series)?workout.series:[]; const reps=series.map((item)=>Number(item.repetitions||0)); if(!reps.length)return "este treino sem séries"; const homogeneous=reps.every((value)=>value===reps[0]); if(reps.length===1)return `${reps[0]} movimentos`; if(homogeneous)return `${reps.length} séries de ${reps[0]} movimentos`; const tail=reps.length>1?`${reps.slice(0,-1).join(", ")} e ${reps.at(-1)}`:String(reps[0]); return `${reps.length} séries de ${tail} movimentos`; }
function currentSeriesReps(){ return Math.max(1,Math.min(10000,Math.trunc(Number(state.workout?.targetReps||1)||1))); }
function openRepsConfirmation(){ const reps=currentSeriesReps(); elements.repsInput.value=String(reps); elements.repsQuestion.textContent=`Deseja adicionar ${reps} movimentos?`; elements.askAgainOff.checked=false; showLayer(elements.repsLayer); }
function changeRepsAmount(direction){ const current=Math.max(1,Math.trunc(Number(elements.repsInput.value||1)||1)); const next=Math.max(1,Math.min(10000,current+direction)); elements.repsInput.value=String(next); elements.repsQuestion.textContent=`Deseja adicionar ${next} movimentos?`; }
function playWorkoutProgressFlash(){
  const flash=elements.phaseProgress?.querySelector(".wellness-workout-image-flash"); if(!flash)return;
  if(typeof flash.animate==="function"){
    flash.getAnimations().forEach((animation)=>animation.cancel());
    flash.animate([{opacity:0,transform:"scale(.9)"},{opacity:.92,transform:"scale(1)",offset:.28},{opacity:0,transform:"scale(1.05)"}],{duration:520,easing:"ease-out"});
    return;
  }
  flash.classList.remove("is-active"); window.requestAnimationFrame(()=>flash.classList.add("is-active"));
}
function exerciseProgressSoundPool(){
  if(!playExerciseProgressSound.pool)playExerciseProgressSound.pool=Array.from({length:2},()=>{ const audio=new Audio("/200/sfx/mododesbloqueado.mp3?v=20260910"); audio.preload="auto"; audio.volume=.68; return audio; });
  return playExerciseProgressSound.pool;
}
let exerciseProgressAudioContext=null,exerciseProgressAudioBuffer=null,exerciseProgressAudioLoad=null;
function warmExerciseProgressSound(){
  try{exerciseProgressSoundPool().forEach((audio)=>{if(audio.readyState<2)audio.load();});const AudioContextClass=window.AudioContext||window.webkitAudioContext;if(!AudioContextClass)return Promise.resolve(null);if(!exerciseProgressAudioContext)exerciseProgressAudioContext=new AudioContextClass();const resume=exerciseProgressAudioContext.state==="suspended"?exerciseProgressAudioContext.resume().catch(()=>null):Promise.resolve();if(!exerciseProgressAudioLoad)exerciseProgressAudioLoad=fetch("/200/sfx/mododesbloqueado.mp3?v=20260910",{cache:"force-cache"}).then((response)=>{if(!response.ok)throw new Error("sound-load");return response.arrayBuffer();}).then((buffer)=>exerciseProgressAudioContext.decodeAudioData(buffer)).then((buffer)=>{exerciseProgressAudioBuffer=buffer;return buffer;}).catch(()=>null);return Promise.all([resume,exerciseProgressAudioLoad]).then(()=>exerciseProgressAudioBuffer);}catch{return Promise.resolve(null);}
}
function playExerciseProgressBuffer(){if(!exerciseProgressAudioContext||!exerciseProgressAudioBuffer||exerciseProgressAudioContext.state!=="running")return false;const source=exerciseProgressAudioContext.createBufferSource(),gain=exerciseProgressAudioContext.createGain();source.buffer=exerciseProgressAudioBuffer;gain.gain.value=.68;source.connect(gain);gain.connect(exerciseProgressAudioContext.destination);source.start(0);return true;}
function playExerciseProgressHtmlAudio(){const pool=exerciseProgressSoundPool(),index=Number(playExerciseProgressSound.index||0)%pool.length,audio=pool[index];playExerciseProgressSound.index=index+1;if(audio.readyState<2)return false;audio.currentTime=0;void audio.play().catch(()=>{});return true;}
function playExerciseProgressSound(){
  try{const requestedAt=Date.now(),warm=warmExerciseProgressSound();if(playExerciseProgressBuffer())return;if(exerciseProgressAudioContext)void Promise.resolve(warm).then(()=>{if(Date.now()-requestedAt<900&&!playExerciseProgressBuffer())playExerciseProgressHtmlAudio();});else playExerciseProgressHtmlAudio();}catch{}
}
const WORKOUT_COMPLETION_SOUND_URL="/200/sfx/muscle-gain-complete.wav?v=20260911";
let workoutCompletionAudioBuffer=null,workoutCompletionAudioLoad=null;
function workoutCompletionSoundPool(){
  if(!playWorkoutCompletionSound.pool)playWorkoutCompletionSound.pool=Array.from({length:2},()=>{const audio=new Audio(WORKOUT_COMPLETION_SOUND_URL);audio.preload="auto";audio.volume=.72;return audio;});return playWorkoutCompletionSound.pool;
}
function warmWorkoutCompletionSound(){
  try{workoutCompletionSoundPool().forEach((audio)=>{if(audio.readyState<2)audio.load();});const contextReady=warmExerciseProgressSound();if(!exerciseProgressAudioContext)return Promise.resolve(null);if(!workoutCompletionAudioLoad)workoutCompletionAudioLoad=fetch(WORKOUT_COMPLETION_SOUND_URL,{cache:"force-cache"}).then((response)=>{if(!response.ok)throw new Error("completion-sound-load");return response.arrayBuffer();}).then((buffer)=>exerciseProgressAudioContext.decodeAudioData(buffer)).then((buffer)=>{workoutCompletionAudioBuffer=buffer;return buffer;}).catch(()=>null);return Promise.all([contextReady,workoutCompletionAudioLoad]).then(()=>workoutCompletionAudioBuffer);}catch{return Promise.resolve(null);}
}
function playWorkoutCompletionSound(){
  try{if(exerciseProgressAudioContext&&workoutCompletionAudioBuffer&&exerciseProgressAudioContext.state==="running"){const source=exerciseProgressAudioContext.createBufferSource(),gain=exerciseProgressAudioContext.createGain();source.buffer=workoutCompletionAudioBuffer;gain.gain.value=.72;source.connect(gain);gain.connect(exerciseProgressAudioContext.destination);source.start(0);return;}const pool=workoutCompletionSoundPool(),index=Number(playWorkoutCompletionSound.index||0)%pool.length,audio=pool[index];playWorkoutCompletionSound.index=index+1;audio.currentTime=0;void audio.play().catch(()=>{});}catch{}
}
function applySeriesLocally(repetitions){ const workout=state.workout;if(!workout)return null;playExerciseProgressSound();const reps=Math.max(1,Number(repetitions||0));const series=[...(workout.series||[]),{id:`pending-series-${Date.now()}-${Math.random().toString(36).slice(2)}`,seriesNumber:Number(workout.seriesCount||0)+1,repetitions:reps,targetRepetitions:Number(workout.targetReps||0),createdAt:new Date().toISOString()}];state.workout={...workout,series,seriesCount:series.length,totalReps:Number(workout.totalReps||0)+reps};state.dashboard={...(state.dashboard||{}),activeWorkout:state.workout};state.seriesRepsDraft=null;scheduleSeriesRest(state.workout);renderWorkout();showLayer(elements.workoutLayer);const workoutId=String(state.workout.id||"");window.setTimeout(()=>{if(String(state.workout?.id||"")!==workoutId)return;applyLocalMuscleSeriesProgress(state.workout,reps);cacheDashboard();},0);return state.workout;}
function addSeries(repetitions){ const workoutBefore=state.workout;if(!workoutBefore)return Promise.resolve(); const localWorkout=applySeriesLocally(repetitions); if(isOfflineWorkout(localWorkout)){ persistOfflineWorkout(localWorkout); return Promise.resolve(localWorkout); } const sessionId=String(localWorkout.id||""),localSeries=localWorkout.series?.at(-1)||{}; const targetRepetitions=Number(localWorkout.targetReps||0),seriesNumber=Number(localSeries.seriesNumber||localWorkout.seriesCount||0); state.seriesSaveChain=state.seriesSaveChain.catch(()=>{}).then(()=>apiRequest(`/api/200/exercises/${encodeURIComponent(sessionId)}/series`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({seriesNumber,repetitions,targetRepetitions}),skipGlobalLoading:true,offlineQueue:true,offlineResponse:{workout:localWorkout},offlineInvalidates:["/api/200/wellness"]})).then((payload)=>{ if(String(state.workout?.id||"")!==sessionId)return payload; const serverWorkout=payload?.workout; if(serverWorkout&&Number(serverWorkout.seriesCount||0)>=Number(state.workout?.seriesCount||0)){ state.workout=serverWorkout; state.dashboard={...(state.dashboard||{}),activeWorkout:serverWorkout}; cacheDashboard(); renderWorkout(); refreshMuscleProgressMap(); } return payload; }).catch(()=>{ elements.workoutLayer?.setAttribute("data-sync-pending","true"); }); return state.seriesSaveChain; }
function applyCompletedWorkoutToLibrary(workout){
  state.dashboard={...(state.dashboard||{}),exerciseLibrary:exerciseLibrary().map((item)=>{
    if(item.exerciseId!==workout.exerciseId)return item;
    if(workout.trackingType==="series")return {...item,todayTotalReps:Number(item.todayTotalReps||0)+Number(workout.totalReps||0)};
    if(workout.trackingType==="gps")return {...item,todayDistanceMeters:Number(item.todayDistanceMeters||0)+Number(workout.distanceMeters||0),todayDurationMinutes:Number(item.todayDurationMinutes||0)+Number(workout.durationMinutes||0)};
    return {...item,todayDurationMinutes:Number(item.todayDurationMinutes||0)+Number(workout.durationMinutes||0)};
  })};
}
function applyCompletedWorkoutMuscleProgress(completion){
  const now=new Date().toISOString(),muscleProgress=[...(completion?.progress?.values?.()||[])].filter((item)=>Number(item?.points||0)>0).map((item)=>({muscleId:item.muscleId,points:Number(item.points||0),updatedAt:now,measuredAt:now}));
  const lifetime=new Map((Array.isArray(state.dashboard?.muscleLifetime)?state.dashboard.muscleLifetime:[]).map((item)=>[item.muscleId,Number(item.points||0)]));completion?.gainByMuscle?.forEach?.((points,muscleId)=>lifetime.set(muscleId,Number(lifetime.get(muscleId)||0)+Number(points||0)));
  state.dashboard={...(state.dashboard||{}),muscleProgress,muscleLifetime:[...lifetime].map(([muscleId,points])=>({muscleId,points}))};
}
async function handleWorkoutPrimary(){ if(!state.workout)return; if(state.workout.trackingType!=="series"){ await saveWorkoutProgress(); renderWorkout(); return; } void addSeries(currentSeriesReps()); }
async function saveSeries(event){ event.preventDefault(); if(!state.workout)return; const reps=Math.max(1,Math.trunc(Number(elements.repsInput.value||0)||0)); const submit=elements.repsForm.querySelector("button[type=submit]"); submit.disabled=true; try{ if(elements.askAgainOff.checked){ const currentHeight=state.dashboard?.wellness?.preferences?.heightCm||null; await apiRequest("/api/200/wellness/preferences",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({profile:profileName(),heightCm:currentHeight,askagain1:"no"})}); state.dashboard.wellness.preferences.askagain1="no"; } await addSeries(reps); }catch(error){ elements.repsQuestion.textContent=error instanceof Error?error.message:"Nao foi possivel guardar."; }finally{ submit.disabled=false; } }
function workoutSeriesPayload(workout){ return (Array.isArray(workout?.series)?workout.series:[]).map((item,index)=>({seriesNumber:Number(item?.seriesNumber||index+1),repetitions:Number(item?.repetitions||0),targetRepetitions:Number(item?.targetRepetitions??workout?.targetReps??0)})); }
function isMissingActiveWorkoutError(error){return /(?:treino|s[eé]rie) ativ[oa] n[aã]o encontrad[oa]/i.test(String(error?.message||""));}
async function finishWorkoutOnServer(workout,finishPayload){
  await state.seriesSaveChain.catch(()=>{});
  const finishById=(sessionId)=>apiRequest(`/api/200/exercises/${encodeURIComponent(sessionId)}/finish`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(finishPayload),offlineInvalidates:["/api/200/wellness"],skipGlobalLoading:true});
  try{return await finishById(workout.id);}
  catch(error){
    if(!isMissingActiveWorkoutError(error))throw error;
    const fresh=await apiRequest(dashboardPath(),{cache:"no-store",forceNetwork:true,cacheMaxAgeMs:0,skipGlobalLoading:true});
    const active=fresh?.dashboard?.activeWorkout;
    const sameExercise=active&&String(active.exerciseId||"")===String(workout.exerciseId||"");
    if(!sameExercise||String(active.id||"")===String(workout.id||""))throw error;
    return finishById(active.id);
  }
}
function workoutCompletionSnapshot(workout){
  const exercise=exerciseCatalog().find((item)=>item.id===workout?.exerciseId)||exerciseFromLibrary(libraryItem(workout?.exerciseId)||{}),gains=calculateProject200ExerciseMuscleGains(workoutSeriesPayload(workout),exerciseMuscleLoads(exercise)),progress=new Map(),beforeProgress=new Map(),gainByMuscle=new Map(gains.map((gain)=>[gain.muscleId,Number(gain.points||0)]));
  (Array.isArray(state.dashboard?.muscleProgress)?state.dashboard.muscleProgress:[]).forEach((entry)=>{ const item=project200CurrentMuscleProgress(entry); if(item.muscleId)progress.set(item.muscleId,item); });
  progress.forEach((item,muscleId)=>beforeProgress.set(muscleId,Number(item.points||0)));
  gains.forEach((gain)=>{ const previous=progress.get(gain.muscleId),item=project200CurrentMuscleProgress({muscleId:gain.muscleId,points:Number(previous?.points||0)+Number(gain.points||0),measuredAt:new Date().toISOString()}); progress.set(gain.muscleId,item); });
  const gainIds=new Set(gains.filter((item)=>Number(item.points||0)>0).map((item)=>item.muscleId)),maps=PROJECT200_MUSCLE_MAPS.map((map,index)=>({map,index,gainIds:new Set(map.regions.map((region)=>region.muscleId).filter((muscleId)=>gainIds.has(muscleId)))})).filter((item)=>item.gainIds.size);
  const library=libraryItem(workout?.exerciseId),projectedWorkout={...workout,distanceMeters:workout?.trackingType==="gps"?currentGpsDistance():Number(workout?.distanceMeters||0),durationMinutes:workout?.trackingType==="series"?Number(workout?.durationMinutes||0):Math.max(Number(workout?.durationMinutes||0),elapsedSeconds(workout)/60)},projectedLibrary=library?(workout?.trackingType==="series"?{...library,todayTotalReps:Number(library.todayTotalReps||0)+Number(projectedWorkout.totalReps||0),todaySeriesCount:Number(library.todaySeriesCount||0)+Number(projectedWorkout.seriesCount||workoutSeriesPayload(projectedWorkout).length||0)}:workout?.trackingType==="gps"?{...library,todayDistanceMeters:Number(library.todayDistanceMeters||0)+Number(projectedWorkout.distanceMeters||0),todayDurationMinutes:Number(library.todayDurationMinutes||0)+Number(projectedWorkout.durationMinutes||0)}:{...library,todayDurationMinutes:Number(library.todayDurationMinutes||0)+Number(projectedWorkout.durationMinutes||0)}):null,daily=todayExerciseLibrary(),planned=Boolean(library&&exerciseScheduledToday(library)&&daily.some((item)=>item.exerciseId===library.exerciseId));
  const progressFrom=planned?dailyExerciseProgress():Math.min(200,exerciseProgress(library||{trackingType:workout?.trackingType,dailyGoal:Math.max(1,Number(workout?.targetSeries||0)*Number(workout?.targetReps||0)||Number(workout?.targetDistanceMeters||0)||Number(workout?.targetMinutes||0)||1)}).percent),progressTo=planned?Math.round(daily.reduce((sum,item)=>sum+Math.min(100,exerciseProgress(item.exerciseId===library.exerciseId?projectedLibrary:item).percent),0)/Math.max(1,daily.length)):Math.min(200,exerciseProgress(projectedLibrary||library||{trackingType:workout?.trackingType,dailyGoal:1}).percent);
  const media=exerciseImageSources(exercise); return {name:workout?.exerciseName||exercise?.name||"Exercício",exercise,image:media.poster||media.start,maps,progress,beforeProgress,gainByMuscle,progressFrom,progressTo,progressLabel:planned?"Progresso Total":"Progresso do Exercício",progressMax:planned?100:200};
}
function workoutCompletionMapMarkup(snapshot,mapEntry){
  const {map,index,gainIds}=mapEntry,gradientId=`wellness-complete-overload-${state.completionRunId}-${index}`;
  const muscleIds=[...new Set(map.regions.map((region)=>region.muscleId).filter((muscleId)=>gainIds.has(muscleId)))];
  const gainsMarkup=muscleIds.map((muscleId)=>{const muscle=PROJECT200_MUSCLE_BY_ID[muscleId],from=completionDisplayPoints(snapshot.beforeProgress.get(muscleId)),to=completionDisplayPoints(snapshot.progress.get(muscleId)?.points);return `<div class="wellness-workout-complete-gain" data-completion-muscle-id="${escapeHtml(muscleId)}"><span>${escapeHtml(muscle?.name||muscleId)}</span><strong><em class="wellness-workout-complete-prefix">+</em><b data-muscle-gain-number data-from="${from}" data-to="${to}">${from}</b><em>PTS</em></strong></div>`;}).join("");
  return `<section class="wellness-muscle-map-slide" aria-label="${escapeHtml(map.title)}"><div class="wellness-workout-complete-gains">${gainsMarkup}</div><svg viewBox="${escapeHtml(map.viewBox)}" role="img" aria-label="${escapeHtml(map.title)}"><defs>${muscleOverloadGradientMarkup(gradientId)}</defs><path class="wellness-muscle-map-skin" d="${escapeHtml(map.skinPath)}"></path>${map.regions.map((region)=>{ const gained=gainIds.has(region.muscleId),item=snapshot.progress.get(region.muscleId),percent=Number(item?.percent||0),opacity=Math.min(1,.42+(Math.min(percent,110)/110)*.58),overload=gained&&percent>=110; return `<path class="wellness-muscle-map-region${gained?" is-gained":""}${overload?" is-overload":""}"${gained?` data-completion-muscle-region="${escapeHtml(region.muscleId)}"`:""} d="${escapeHtml(region.path)}"${gained?` style="--muscle-color:${escapeHtml(item?.color||"rgb(148 163 184)")};--muscle-opacity:${opacity};${overload?`--muscle-fill:url(#${gradientId});`:""}"`:""}></path>`; }).join("")}</svg></section>`;
}
function prepareWorkoutCompletion(snapshot){
  const runId=++state.completionRunId; elements.completeName.textContent=snapshot.name;elements.completeName.classList.toggle("is-long",snapshot.name.length>10||snapshot.name.trim().includes(" ")); configureFixedExerciseMedia(elements.completePortrait,elements.completeImage,elements.completeVideo,snapshot.exercise,{movementOnly:true}); elements.completeImage.alt=`${snapshot.name} concluído`; elements.completeProgressFill.style.width=`${Math.min(100,(snapshot.progressFrom/Math.max(1,snapshot.progressMax))*100)}%`;elements.completeProgressFill.dataset.level=String(snapshot.progressFrom);elements.completeProgressText.textContent=`${snapshot.progressLabel} ${snapshot.progressFrom}%`; elements.completeDots.innerHTML=snapshot.maps.map((_,index)=>`<i class="${index===0?"is-active":""}"></i>`).join(""); elements.completeMap.classList.remove("is-revealed"); elements.completeMap.innerHTML=snapshot.maps[0]?workoutCompletionMapMarkup(snapshot,snapshot.maps[0]):""; elements.completeLayer.classList.remove("is-muscle-stage","is-portrait-exiting","is-approved"); elements.completeLayer.classList.add("is-portrait-stage"); showLayer(elements.completeLayer); if(!elements.completeVideo?.hidden){elements.completeVideo.currentTime=0;void elements.completeVideo.play().catch(()=>{});} return runId;
}
function waitForCompletionFrame(){ return new Promise((resolve)=>window.requestAnimationFrame(()=>window.requestAnimationFrame(resolve))); }
function waitForCompletionTime(milliseconds){ return new Promise((resolve)=>window.setTimeout(resolve,milliseconds)); }
function completionDisplayPoints(points){ return Math.max(0,Math.round(Number(points||0)*5)); }
function completionProgressColors(value){const percent=Number(value||0);if(percent>=200)return ["#ef4444","#b91c1c"];if(percent>=150)return ["#f97316","#ea580c"];if(percent>=120)return ["#22c55e","#facc15"];return ["#16a34a","#4ade80"];}
function animateCompletionProgress(snapshot,duration,runId){
  return new Promise((resolve)=>{const started=performance.now(),from=Number(snapshot.progressFrom||0),to=Number(snapshot.progressTo||0),maximum=Math.max(1,Number(snapshot.progressMax||100));const frame=(now)=>{if(state.completionRunId!==runId){resolve();return;}const ratio=Math.min(1,Math.max(0,(now-started)/duration)),eased=1-((1-ratio)**3),value=Math.round(from+((to-from)*eased)),colors=completionProgressColors(value);elements.completeProgressFill.style.width=`${Math.min(100,(value/maximum)*100)}%`;elements.completeProgressFill.style.background=`linear-gradient(90deg,${colors[0]},${colors[1]})`;elements.completeProgressText.textContent=`${snapshot.progressLabel} ${value}%`;if(ratio<1)window.requestAnimationFrame(frame);else resolve();};window.requestAnimationFrame(frame);});
}
function animateCompletionMuscleNumber(counter,duration,runId){
  if(!counter)return Promise.resolve();return new Promise((resolve)=>{const started=performance.now(),from=Number(counter.dataset.from||0),to=Number(counter.dataset.to||from);const frame=(now)=>{if(state.completionRunId!==runId){resolve();return;}const ratio=Math.min(1,Math.max(0,(now-started)/duration)),eased=1-((1-ratio)**3);counter.textContent=String(Math.round(from+((to-from)*eased)));if(ratio<1)window.requestAnimationFrame(frame);else resolve();};window.requestAnimationFrame(frame);});
}
async function animateWorkoutCompletion(snapshot,runId,{autoClose=true}={}){
  await animateCompletionProgress(snapshot,1200,runId);if(state.completionRunId!==runId)return;elements.completeLayer.classList.add("is-approved");playWorkoutCompletionSound();await waitForCompletionTime(200);if(state.completionRunId!==runId)return;elements.completeLayer.classList.add("is-portrait-exiting");await waitForCompletionTime(340);if(state.completionRunId!==runId)return;elements.completeVideo?.pause();elements.completeLayer.classList.remove("is-portrait-stage","is-portrait-exiting");elements.completeLayer.classList.add("is-muscle-stage");
  if(!snapshot.maps.length){ await waitForCompletionTime(600); if(autoClose&&state.completionRunId===runId)hideLayers(); return; }
  for(let index=0;index<snapshot.maps.length;index+=1){
    if(state.completionRunId!==runId)return;
    if(index){ elements.completeMap.classList.remove("is-revealed"); elements.completeMap.innerHTML=workoutCompletionMapMarkup(snapshot,snapshot.maps[index]); }
    [...elements.completeDots.children].forEach((dot,dotIndex)=>dot.classList.toggle("is-active",dotIndex===index));
    await waitForCompletionFrame();if(state.completionRunId!==runId)return;elements.completeMap.classList.add("is-revealed");const gains=[...elements.completeMap.querySelectorAll("[data-completion-muscle-id]")],regions=[...elements.completeMap.querySelectorAll("[data-completion-muscle-region]")];
    for(const gain of gains){if(state.completionRunId!==runId)return;const muscleId=gain.dataset.completionMuscleId,muscleRegions=regions.filter((item)=>item.dataset.completionMuscleRegion===muscleId);gains.forEach((item)=>item.classList.toggle("is-active",item===gain));regions.forEach((region)=>region.classList.toggle("is-current-gain",muscleRegions.includes(region)));muscleRegions.forEach((region)=>region.classList.add("is-revealed-gain"));await waitForCompletionFrame();if(state.completionRunId!==runId)return;await animateCompletionMuscleNumber(gain.querySelector("[data-muscle-gain-number]"),1200,runId);if(state.completionRunId!==runId)return;}
    regions.forEach((region)=>region.classList.remove("is-current-gain"));await waitForCompletionTime(220);
  }
  await waitForCompletionTime(420); if(autoClose&&state.completionRunId===runId)hideLayers();
}
function openCancelWorkout(){if(!state.workout)return;elements.finishQuestion.textContent=`Cancelar ${String(state.workout.exerciseName||"este exercício").toLowerCase()}? O progresso deste treino não será contabilizado.`;showLayer(elements.finishLayer);}
async function startExerciseAfterCompletion(exercise){
  if(!exercise)return false;state.selectedExercise=exercise;state.detailMode="selected";const item=libraryItem(exercise.id);
  if(!hasExerciseGoal(item)){openGoal({editing:false});return false;}
  fillExerciseGoalFields(exercise,item);await startExercise({preventDefault(){},currentTarget:elements.detailStart});return Boolean(state.workout);
}
async function advanceWorkoutImmediately(){
  const nextExercise=selectedWorkoutNavigationExercise();if(!nextExercise)return;
  await finishWorkout({nextExercise});
}
async function finishWorkout({nextExercise=null}={}){
  if(!state.workout)return;
  if(!nextExercise)void warmWorkoutCompletionSound();clearSeriesRest();
  const submit=nextExercise?elements.workoutAdvance:elements.workoutFinish,workout=state.workout,dashboardBefore=state.dashboard,stepsBefore=state.steps,gpsDistanceBefore=state.gpsDistanceMeters,completion=workoutCompletionSnapshot(workout),completionRunId=nextExercise?(state.completionRunId+=1):prepareWorkoutCompletion(completion);submit.disabled=true;
  try{
    const distanceMeters=workout.trackingType==="gps"?currentGpsDistance():Math.max(0,Number(workout.distanceMeters||0)),series=workoutSeriesPayload(workout),completed={...workout,steps:state.steps,distanceMeters,durationMinutes:workout.trackingType==="series"?Number(workout.durationMinutes||0):Math.max(Number(workout.durationMinutes||0),elapsedSeconds(workout)/60),completedAt:new Date().toISOString(),status:"completed"};
    let serverFinish=null;
    if(isOfflineWorkout(workout))persistOfflineWorkout(completed,{finished:true,finishPayload:{steps:state.steps,distanceMeters,series}});
    else serverFinish=finishWorkoutOnServer(workout,{steps:state.steps,distanceMeters,series});
    state.dashboard={...(state.dashboard||{}),activeWorkout:null,recentWorkouts:[completed,...(state.dashboard?.recentWorkouts||[]).filter((item)=>String(item.id)!==String(completed.id))].slice(0,8)};
    applyCompletedWorkoutMuscleProgress(completion);applyCompletedWorkoutToLibrary(completed);
    if(String(state.workout?.id||"")===String(workout.id||""))state.workout=null;state.steps=0;state.gpsDistanceMeters=0;state.provisionalMuscleProgress.clear();cacheDashboard();renderExerciseGrid();renderWorkoutHistory();void stopGpsTracking();stopStepCounter();
    const completionAnimation=nextExercise?Promise.resolve():(renderWorkout(),animateWorkoutCompletion(completion,completionRunId));
    if(nextExercise){elements.phaseLabel.textContent="Iniciando agora";elements.phaseName.textContent=nextExercise.name;elements.phaseUnit.textContent="Preparando o próximo exercício...";showLayer(elements.workoutLayer);}
    if(serverFinish)await serverFinish;
    await completionAnimation;
    if(nextExercise&&state.completionRunId===completionRunId)await startExerciseAfterCompletion(nextExercise);
    if(navigator.onLine!==false)void loadDashboard({showCached:false});else window.dispatchEvent(new CustomEvent("project200:exercise-mission-updated"));
  }catch(error){state.completionRunId+=1;state.dashboard=dashboardBefore;state.workout=workout;state.steps=stepsBefore;state.gpsDistanceMeters=gpsDistanceBefore;rebuildProvisionalMuscleProgress(workout);cacheDashboard();renderExerciseGrid();renderWorkoutHistory();renderWorkout();if(workout.trackingType==="gps")void startGpsTracking(false);if(workout.trackingType==="steps")void startStepCounter(false);showLayer(elements.workoutLayer);window.alert(error instanceof Error?error.message:"Nao foi possivel encerrar.");}
  finally{submit.disabled=false;}
}
async function discardWorkout(){ if(!state.workout)return; elements.discardWorkout.disabled=true; try{ if(isOfflineWorkout())removeOfflineWorkout(state.workout.id); else await apiRequest(`/api/200/exercises/${encodeURIComponent(state.workout.id)}`,{method:"DELETE"}); await stopGpsTracking(); stopStepCounter(); clearSeriesRest();state.workout=null; state.steps=0; state.gpsDistanceMeters=0; state.gpsLastPoint=null; state.provisionalMuscleProgress.clear(); state.dashboard={...(state.dashboard||{}),activeWorkout:null}; cacheDashboard(); hideLayers(); if(navigator.onLine!==false)await loadDashboard(); else{renderExerciseGrid();renderWorkoutHistory();renderWorkout();} }catch(error){ elements.finishQuestion.textContent=error instanceof Error?error.message:"Nao foi possivel excluir."; }finally{ elements.discardWorkout.disabled=false; } }
function handleGpsPosition(position,error){ if(error){ state.gpsStatus="GPS sem sinal"; renderWorkout(); return; } const coords=position?.coords; if(!coords)return; const accuracy=Math.max(0,Number(coords.accuracy||0)), point={latitude:Number(coords.latitude),longitude:Number(coords.longitude),accuracy,timestamp:Number(position.timestamp||Date.now())}; if(!Number.isFinite(point.latitude)||!Number.isFinite(point.longitude))return; if(accuracy>80){ state.gpsAccuracy=accuracy; state.gpsStatus=`Precisão baixa (${Math.round(accuracy)} m)`; renderWorkout(); return; } if(!state.gpsLastPoint){ state.gpsLastPoint=point; state.gpsAccuracy=accuracy; state.gpsStatus="GPS ativo · caminhe alguns metros"; renderWorkout(); return; } const segment=haversineMeters(state.gpsLastPoint,point), seconds=Math.max(.25,(point.timestamp-state.gpsLastPoint.timestamp)/1000), speed=segment/seconds, minimum=Math.max(2,Math.min(10,(state.gpsLastPoint.accuracy+accuracy)/4)); if(segment>=minimum&&segment<=500&&speed<=12){ state.gpsDistanceMeters+=segment; state.gpsLastPoint=point; if(Math.round(state.gpsDistanceMeters)%25<Math.round(segment))void saveWorkoutProgress().catch(()=>{}); }else if(segment>500||speed>12){ state.gpsLastPoint=point; } state.gpsAccuracy=accuracy; state.gpsStatus=`GPS ativo · precisão ${Math.round(accuracy)} m`; renderWorkout(); }
async function startGpsTracking(requestPermission){ if(state.gpsWatchId!==null||state.workout?.trackingType!=="gps")return; state.gpsDistanceMeters=Math.max(state.gpsDistanceMeters,Number(state.workout.distanceMeters||0)); state.gpsStatus="Buscando GPS..."; renderWorkout(); const plugin=state.gpsPlugin||(window.Capacitor?.isNativePlatform?.()&&window.Capacitor?.registerPlugin?window.Capacitor.registerPlugin("Geolocation"):null); state.gpsPlugin=plugin||null; try{ if(plugin){ if(requestPermission){ const permission=await plugin.requestPermissions({permissions:["location"]}); if(permission?.location==="denied"){ state.gpsStatus="Permita a localização precisa para caminhar"; renderWorkout(); return; } } state.gpsProvider="capacitor"; state.gpsWatchId=await plugin.watchPosition({enableHighAccuracy:true,timeout:15000,maximumAge:3000,minimumUpdateInterval:2000,interval:2000},handleGpsPosition); }else if(navigator.geolocation){ state.gpsProvider="browser"; state.gpsWatchId=navigator.geolocation.watchPosition((position)=>handleGpsPosition(position), (error)=>handleGpsPosition(null,error), {enableHighAccuracy:true,timeout:15000,maximumAge:3000}); }else{ throw new Error("GPS indisponível neste aparelho."); } if(state.saveTimer)window.clearInterval(state.saveTimer); state.saveTimer=window.setInterval(()=>void saveWorkoutProgress().catch(()=>{}),20000); }catch(error){ state.gpsWatchId=null; state.gpsStatus=error instanceof Error?error.message:"Não foi possível iniciar o GPS."; renderWorkout(); } }
async function stopGpsTracking(){ const watchId=state.gpsWatchId, provider=state.gpsProvider; state.gpsWatchId=null; state.gpsProvider=""; state.gpsLastPoint=null; if(watchId!==null){ try{ if(provider==="capacitor")await state.gpsPlugin?.clearWatch({id:String(watchId)}); else if(provider==="browser")navigator.geolocation?.clearWatch(watchId); }catch{} } if(state.saveTimer)window.clearInterval(state.saveTimer); state.saveTimer=null; }
function onDeviceMotion(event){ if(!state.workout||state.workout.trackingType!=="steps")return; const acceleration=event.accelerationIncludingGravity||event.acceleration; if(!acceleration)return; const magnitude=Math.sqrt((acceleration.x||0)**2+(acceleration.y||0)**2+(acceleration.z||0)**2), now=Date.now(); if(magnitude>12.2&&magnitude<24&&now-state.lastStepAt>280){ state.lastStepAt=now; state.steps+=1; renderWorkout(); if(state.steps%10===0)void saveWorkoutProgress().catch(()=>{}); } }
async function startStepCounter(requestPermission){ if(state.motionListening||!window.DeviceMotionEvent)return; try{ if(requestPermission&&typeof DeviceMotionEvent.requestPermission==="function"){ const permission=await DeviceMotionEvent.requestPermission(); if(permission!=="granted"){ elements.phaseUnit.textContent="Permita o sensor de movimento para contar os passos."; return; } } window.addEventListener("devicemotion",onDeviceMotion,{passive:true}); state.motionListening=true; state.saveTimer=window.setInterval(()=>void saveWorkoutProgress().catch(()=>{}),20000); }catch{ elements.phaseUnit.textContent="O contador automático não está disponível neste aparelho."; } }
function stopStepCounter(){ if(state.motionListening)window.removeEventListener("devicemotion",onDeviceMotion); state.motionListening=false; if(state.saveTimer)window.clearInterval(state.saveTimer); state.saveTimer=null; }
async function saveWeight(event){ event.preventDefault(); const heightCm=Number(elements.heightInput.value||0), weightKg=Number(String(elements.weightInput.value||"").replace(",",".")); if(!heightCm&&!weightKg)return; const submit=elements.weightForm.querySelector("button[type=submit]"); submit.disabled=true; try{ const askagain1=state.dashboard?.wellness?.preferences?.askagain1||"yes"; if(heightCm)await apiRequest("/api/200/wellness/preferences",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({profile:profileName(),heightCm,askagain1})}); if(weightKg){ const payload=await apiRequest("/api/200/wellness/weight",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({profile:profileName(),weightKg})}); state.dashboard=payload.dashboard||state.dashboard; }else await loadDashboard(); renderWeight(); }catch(error){ elements.bmiValue.textContent=error instanceof Error?error.message:"Nao foi possivel atualizar."; }finally{ submit.disabled=false; } }
function extractMealTime(text){ const match=String(text||"").toLowerCase().match(/(?:\b(?:as|às)\s*)?([01]?\d|2[0-3])\s*(?:h|:)\s*([0-5]\d)?/i); return match?`${String(Number(match[1])).padStart(2,"0")}:${String(Number(match[2]||0)).padStart(2,"0")}`:""; }
function mealDateAt(time){ if(!/^\d{2}:\d{2}$/.test(time||""))return null; const [hours,minutes]=time.split(":").map(Number),date=new Date(); date.setHours(hours,minutes,0,0); return date.toISOString(); }
async function saveMealConfig(){ const selected=[...elements.mealConfigList.querySelectorAll("input:checked")].map((input)=>input.value); if(!selected.length){ elements.mealConfigStatus.textContent="Ative pelo menos uma refeição."; return; } const button=byId("wellnessMealConfigSave"); button.disabled=true; elements.mealConfigStatus.textContent="Salvando..."; try{ const payload=await apiRequest("/api/200/nutrition/meal-slots",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({profile:profileName(),mealSlots:selected})}); state.dashboard=payload.dashboard||state.dashboard; hideLayers(); renderMeals(); }catch(error){ elements.mealConfigStatus.textContent=error instanceof Error?error.message:"Não foi possível salvar."; }finally{ button.disabled=false; } }
function blobToBase64(blob){ return new Promise((resolve,reject)=>{ const reader=new FileReader(); reader.onload=()=>resolve(String(reader.result||"").split(",").pop()||""); reader.onerror=()=>reject(reader.error); reader.readAsDataURL(blob); }); }
function voiceStatus(){ return elements.mealAddStatus; }
async function toggleWellnessVoice(target){
  if(state.voiceRecorder&&state.voiceRecorder.state!=="inactive"){ state.voiceRecorder.stop(); return; }
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true}); state.voiceStream=stream; state.voiceTarget=target; const chunks=[];
    const recorder=new MediaRecorder(stream,{mimeType:"audio/webm"}); state.voiceRecorder=recorder;
    recorder.ondataavailable=(event)=>{ if(event.data?.size)chunks.push(event.data); };
    recorder.onstop=async()=>{ stream.getTracks().forEach((track)=>track.stop()); const status=voiceStatus(); if(status)status.textContent="Transcrevendo com a OpenAI..."; try{ const blob=new Blob(chunks,{type:"audio/webm"}); const audioBase64=await blobToBase64(blob); const payload=await apiRequest("/api/audio/transcribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({audioBase64,mimeType:"audio/webm",fileName:`${target}.webm`})}); const text=String(payload?.text||"").trim(); const input=elements.foodInput; if(input&&text)input.value=[input.value.trim(),text].filter(Boolean).join(" "); if(status)status.textContent=text?"Texto captado. Revise e continue.":"Não ouvi texto suficiente."; }catch(error){ if(status)status.textContent=error instanceof Error?error.message:"Falha ao transcrever."; }finally{ state.voiceRecorder=null; state.voiceStream=null; state.voiceTarget=null; }
    };
    recorder.start(); const status=voiceStatus(); if(status)status.textContent="Ouvindo... toque novamente para parar.";
  }catch(error){ const status=voiceStatus(); if(status)status.textContent=error instanceof Error?error.message:"Falha ao abrir o microfone."; }
}
async function submitFood(event){ event.preventDefault(); const description=String(elements.foodInput.value||"").trim(); const status=elements.mealAddStatus; if(description.length<2){ status.textContent="Conte o que você comeu."; return; } const time=elements.foodTime.value||extractMealTime(description); const consumedAt=mealDateAt(time); if(!consumedAt){ status.textContent="Informe o horário da refeição."; return; } elements.foodSend.disabled=true; status.textContent="A IA está calculando os 8 elementos..."; try{ const payload=await apiRequest("/api/200/nutrition/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({profile:profileName(),description,consumedAt,mealSlot:state.selectedMealSlot})}); state.dashboard=payload.dashboard||state.dashboard; elements.foodInput.value=""; hideLayers(); renderMeals(); elements.nutritionStatus.textContent="Refeição analisada e guardada."; }catch(error){ status.textContent=error instanceof Error?error.message:"Não foi possível calcular."; }finally{ elements.foodSend.disabled=false; } }
renderExerciseGrid();
byId("appsHomeExercisesButton")?.addEventListener("click",()=>openWellness("exercises"));
byId("appsHomeNutritionButton")?.addEventListener("click",()=>openWellness("nutrition"));
byId("wellnessCloseButton")?.addEventListener("click",closeWellness);
document.querySelectorAll("[data-wellness-tab]").forEach((button)=>button.addEventListener("click",()=>setTab(button.dataset.wellnessTab)));
byId("wellnessExerciseCategoryPrevious")?.addEventListener("click",()=>cycleExerciseCategory(-1));
byId("wellnessExerciseCategoryNext")?.addEventListener("click",()=>cycleExerciseCategory(1));
elements.exerciseDailyCard?.addEventListener("click",(event)=>{if(event.target.closest("#wellnessExerciseDailyPlay")){event.preventDefault();event.stopPropagation();startFirstDailyExercise();return;}openDailyPlan();});
elements.exerciseDailyCard?.addEventListener("keydown",(event)=>{if(!["Enter"," "].includes(event.key)||event.target.closest("button"))return;event.preventDefault();openDailyPlan();});
byId("wellnessDailyPlanClose")?.addEventListener("click",hideLayers);
elements.dailyPlanList?.addEventListener("pointerdown",beginDailyPlanReorder);
elements.dailyPlanList?.addEventListener("pointermove",moveDailyPlanReorder);
elements.dailyPlanList?.addEventListener("pointerup",endDailyPlanReorder);
elements.dailyPlanList?.addEventListener("pointercancel",endDailyPlanReorder);
elements.openCatalog?.addEventListener("click",openCatalog);
elements.catalogSearch?.addEventListener("input",()=>{state.catalogQuery=elements.catalogSearch.value;scheduleCatalogRender();if(elements.catalogSearchClear)elements.catalogSearchClear.hidden=!state.catalogQuery;});
elements.catalogSearchClear?.addEventListener("click",()=>{state.catalogQuery="";elements.catalogSearch.value="";renderCatalog();elements.catalogSearch.focus();});
elements.catalogFilterToggle?.addEventListener("click",()=>{const opening=elements.catalogFilterPanel.hidden;elements.catalogFilterPanel.hidden=!opening;elements.catalogFilterToggle.setAttribute("aria-expanded",String(opening));});
elements.catalogFilterPanel?.addEventListener("click",(event)=>{const type=event.target.closest("[data-catalog-type]"),difficulty=event.target.closest("[data-catalog-difficulty]");if(type){state.catalogType=state.catalogType===type.dataset.catalogType?"":type.dataset.catalogType;renderCatalog();return;}if(difficulty){const value=Number(difficulty.dataset.catalogDifficulty);state.catalogDifficulty=state.catalogDifficulty===value?0:value;renderCatalog();}});
elements.catalogMuscleOpen?.addEventListener("click",openCatalogMusclePicker);
elements.catalogFilterClear?.addEventListener("click",clearCatalogFilters);
elements.catalogSort?.addEventListener("change",()=>{state.catalogSort=["easy","hard","popular","az"].includes(elements.catalogSort.value)?elements.catalogSort.value:"popular";renderCatalog();});
byId("wellnessCatalogMuscleClose")?.addEventListener("click",()=>{showLayer(elements.catalogLayer);renderCatalog();});
elements.catalogMuscleClear?.addEventListener("click",()=>chooseCatalogMuscle(""));
elements.catalogMuscleTrack?.addEventListener("click",(event)=>{const region=event.target.closest("[data-catalog-muscle-id]");if(region)chooseCatalogMuscle(region.dataset.catalogMuscleId);});
elements.catalogMuscleTrack?.addEventListener("keydown",(event)=>{if(!["Enter"," "].includes(event.key))return;const region=event.target.closest("[data-catalog-muscle-id]");if(!region)return;event.preventDefault();chooseCatalogMuscle(region.dataset.catalogMuscleId);});
elements.catalogMuscleTrack?.addEventListener("scroll",()=>{const width=Math.max(1,elements.catalogMuscleTrack.clientWidth),index=Math.max(0,Math.min(PROJECT200_MUSCLE_MAPS.length-1,Math.round(elements.catalogMuscleTrack.scrollLeft/width)));[...elements.catalogMuscleDots.children].forEach((dot,dotIndex)=>dot.classList.toggle("is-active",dotIndex===index));},{passive:true});
elements.exerciseGrid?.addEventListener("click",(event)=>{ if(consumeAdminExerciseImageClick(event))return; const videoShell=event.target.closest("[data-exercise-video-shell]"); if(videoShell){event.preventDefault();event.stopPropagation();toggleExerciseVideo(videoShell);return;} const play=event.target.closest("[data-exercise-play-id]"); if(play){ const exercise=exerciseCatalog().find((item)=>item.id===play.dataset.exercisePlayId); if(!exercise)return; if(state.workout){ renderWorkout(); showLayer(elements.workoutLayer); playFixedExerciseVideo(elements.phaseProgress); return; } state.selectedExercise=exercise; state.detailMode="selected"; startSelectedExercise(); return; } const target=event.target.closest("[data-exercise-id],[data-open-catalog],[data-show-all-exercises]"); if(!target)return; if(target.hasAttribute("data-open-catalog")){ openCatalog(); return; } if(target.hasAttribute("data-show-all-exercises")){ setExerciseCategory("all"); return; } const exercise=exerciseCatalog().find((item)=>item.id===target.dataset.exerciseId); if(exercise)openExerciseDetail(exercise,"selected"); });
elements.catalogGrid?.addEventListener("click",(event)=>{
  if(consumeAdminExerciseImageClick(event))return;
  const videoShell=event.target.closest("[data-exercise-video-shell]");
  if(videoShell){event.preventDefault();event.stopPropagation();toggleExerciseVideo(videoShell);return;}
  const add=event.target.closest("[data-catalog-add-id]");
  if(add){event.preventDefault();event.stopPropagation();const exercise=exerciseCatalog().find((item)=>item.id===add.dataset.catalogAddId);if(exercise)openCatalogAddConfirmation(exercise);return;}
  const play=event.target.closest("[data-catalog-play-id]");
  if(play){event.preventDefault();event.stopPropagation();const exercise=exerciseCatalog().find((item)=>item.id===play.dataset.catalogPlayId);if(exercise)startCatalogExercise(exercise);return;}
  const card=event.target.closest("[data-catalog-exercise-id]"),exercise=exerciseCatalog().find((item)=>item.id===card?.dataset.catalogExerciseId);
  if(exercise)openExerciseDetail(exercise,libraryItem(exercise.id)?"selected":"catalog");
});
elements.catalogGrid?.addEventListener("keydown",(event)=>{if(!["Enter"," "].includes(event.key)||event.target.closest("button"))return;const card=event.target.closest("[data-catalog-exercise-id]"),exercise=exerciseCatalog().find((item)=>item.id===card?.dataset.catalogExerciseId);if(!exercise)return;event.preventDefault();openExerciseDetail(exercise,libraryItem(exercise.id)?"selected":"catalog");});
byId("wellnessCatalogClose")?.addEventListener("click",hideLayers);
byId("wellnessCatalogAddClose")?.addEventListener("click",()=>{showLayer(elements.catalogLayer);renderCatalog();});
elements.catalogAddConfirm?.addEventListener("click",()=>void confirmCatalogAddition());
elements.catalogAddFrame?.addEventListener("click",()=>toggleExerciseVideo(elements.catalogAddFrame));
byId("wellnessExerciseDetailClose")?.addEventListener("click",()=>{ if(state.detailMode==="catalog")openCatalog(); else hideLayers(); });
elements.muscleMapTrack?.addEventListener("click",(event)=>{ const region=event.target.closest("[data-muscle-id]"); if(region)renderMuscleExercises(region.dataset.muscleId,"detail"); });
elements.muscleMapTrack?.addEventListener("keydown",(event)=>{ if(!["Enter"," "].includes(event.key))return; const region=event.target.closest("[data-muscle-id]"); if(region){event.preventDefault();renderMuscleExercises(region.dataset.muscleId);} });
elements.muscleMapTrack?.addEventListener("scroll",()=>{ const width=Math.max(1,elements.muscleMapTrack.clientWidth),index=Math.max(0,Math.min(PROJECT200_MUSCLE_MAPS.length-1,Math.round(elements.muscleMapTrack.scrollLeft/width))); [...elements.muscleMapDots.children].forEach((dot,dotIndex)=>dot.classList.toggle("is-active",dotIndex===index)); },{passive:true});
elements.muscleProgressMapTrack?.addEventListener("click",(event)=>{ const region=event.target.closest("[data-muscle-id]"); if(region)renderMuscleExercises(region.dataset.muscleId,"dashboard"); });
elements.muscleProgressMapTrack?.addEventListener("keydown",(event)=>{ if(!["Enter"," "].includes(event.key))return; const region=event.target.closest("[data-muscle-id]"); if(region){event.preventDefault();renderMuscleExercises(region.dataset.muscleId,"dashboard");} });
elements.muscleProgressMapTrack?.addEventListener("pointerdown",()=>{ state.muscleCarouselTouchedAt=Date.now(); },{passive:true});
elements.muscleProgressMapTrack?.addEventListener("wheel",()=>{ state.muscleCarouselTouchedAt=Date.now(); },{passive:true});
elements.muscleProgressMapTrack?.addEventListener("scroll",()=>{ const width=Math.max(1,elements.muscleProgressMapTrack.clientWidth),index=Math.max(0,Math.min(PROJECT200_MUSCLE_MAPS.length-1,Math.round(elements.muscleProgressMapTrack.scrollLeft/width))); [...elements.muscleProgressMapDots.children].forEach((dot,dotIndex)=>dot.classList.toggle("is-active",dotIndex===index)); },{passive:true});
byId("wellnessMuscleExercisesClose")?.addEventListener("click",()=>{ if(state.muscleReturnView==="dashboard")hideLayers(); else openExerciseDetail(state.selectedExercise,state.detailMode); });
elements.muscleExercisesList?.addEventListener("click",(event)=>{ const id=event.target.closest("[data-muscle-exercise-id]")?.dataset.muscleExerciseId,exercise=exerciseCatalog().find((item)=>item.id===id); if(exercise)openExerciseDetail(exercise,libraryItem(exercise.id)?"selected":"catalog"); });
byId("wellnessExerciseInfoOpen")?.addEventListener("click",openExerciseInfo);
byId("wellnessExerciseInfoClose")?.addEventListener("click",()=>openExerciseDetail(state.selectedExercise,state.detailMode));
byId("wellnessExerciseAdminClose")?.addEventListener("click",hideLayers);
elements.adminFill?.addEventListener("click",()=>void fillMissingExerciseDefinitions());
elements.adminCreate?.addEventListener("click",()=>void createExercisesWithLuna());
elements.detailStart?.addEventListener("click",()=>{ if(state.detailMode==="catalog")startCatalogExercise(state.selectedExercise); else startSelectedExercise(); });
elements.detailGoal?.addEventListener("click",()=>openGoal({editing:true}));
elements.detailDelete?.addEventListener("click",()=>void deleteSelectedExercise());
elements.detailGenerate?.addEventListener("click",()=>void generateSelectedExerciseImages());
elements.workoutHistory?.addEventListener("click",(event)=>{const button=event.target.closest("[data-delete-workout-id]");if(!button)return;const workout=(state.dashboard?.recentWorkouts||[]).find((item)=>String(item.id)===String(button.dataset.deleteWorkoutId));if(workout)void deleteWorkoutHistoryEntry(workout);});
[elements.exerciseGrid,elements.catalogGrid].filter(Boolean).forEach((surface)=>{
  surface.addEventListener("dragenter",beginExerciseVideoDrop);
  surface.addEventListener("dragover",beginExerciseVideoDrop);
  surface.addEventListener("dragleave",leaveExerciseVideoDrop);
  surface.addEventListener("drop",(event)=>void finishExerciseVideoDrop(event));
  surface.addEventListener("pointerdown",beginAdminExerciseImageHold,{passive:true});
  surface.addEventListener("pointermove",moveAdminExerciseImageHold,{passive:true});
  surface.addEventListener("pointerup",endAdminExerciseImageHold,{passive:true});
  surface.addEventListener("pointercancel",endAdminExerciseImageHold,{passive:true});
  surface.addEventListener("pointerleave",endAdminExerciseImageHold,{passive:true});
});
document.addEventListener("dragend",clearExerciseVideoDropHighlights);
elements.detailFrame?.addEventListener("pointerdown",beginAdminExerciseVideoHold);
elements.detailFrame?.addEventListener("pointermove",moveAdminExerciseVideoHold,{passive:true});
elements.detailFrame?.addEventListener("pointerup",()=>endAdminExerciseVideoHold(true),{passive:true});
elements.detailFrame?.addEventListener("pointercancel",()=>endAdminExerciseVideoHold(false),{passive:true});
elements.detailFrame?.addEventListener("pointerleave",()=>endAdminExerciseVideoHold(false),{passive:true});
elements.detailFrame?.addEventListener("contextmenu",(event)=>{if(state.isAdmin)event.preventDefault();});
elements.detailFrame?.addEventListener("click",(event)=>{ if(consumeAdminExerciseImageClick(event))return; toggleExerciseVideo(elements.detailFrame); });
elements.detailVideoInput?.addEventListener("change",()=>{ const file=elements.detailVideoInput.files?.[0]; if(file)void uploadSelectedExerciseVideo(file); });
elements.phaseProgress?.addEventListener("click",(event)=>{if(event.target.closest("button")||workoutRestRemainingMs())return;toggleExerciseVideo(elements.phaseProgress);});
byId("wellnessGoalClose")?.addEventListener("click",()=>openExerciseDetail(state.selectedExercise,state.detailMode));
elements.goalForm?.addEventListener("click",(event)=>{ const weekday=event.target.closest("[data-exercise-weekday]"); if(weekday){ toggleExerciseGoalWeekday(weekday.dataset.exerciseWeekday); return; } const adjust=event.target.closest("[data-goal-adjust]"); if(adjust)adjustExerciseGoalValue(adjust.dataset.goalAdjust,adjust.dataset.direction); });
elements.goalForm?.addEventListener("submit",submitExerciseGoal);
elements.activeWorkout?.addEventListener("click",()=>{renderWorkout();showLayer(elements.workoutLayer);playFixedExerciseVideo(elements.phaseProgress);});
elements.activeWorkout?.addEventListener("keydown",(event)=>{if(event.key!=="Enter"&&event.key!==" ")return;event.preventDefault();renderWorkout();showLayer(elements.workoutLayer);playFixedExerciseVideo(elements.phaseProgress);});
elements.workoutPrimary?.addEventListener("click",()=>void handleWorkoutPrimary());
elements.workoutAdvance?.addEventListener("click",()=>void advanceWorkoutImmediately());
elements.workoutPreviousExercise?.addEventListener("click",()=>moveWorkoutNavigation(-1));
elements.workoutNextExercise?.addEventListener("click",()=>moveWorkoutNavigation(1));
elements.workoutClose?.addEventListener("click",openCancelWorkout);
elements.workoutRest?.addEventListener("click",(event)=>{const button=event.target.closest("[data-rest-adjust]");if(button)adjustSeriesRest(button.dataset.restAdjust);});
elements.workoutFinish?.addEventListener("click",()=>void finishWorkout());
elements.repsForm?.addEventListener("submit",saveSeries);
byId("wellnessRepsDecrease")?.addEventListener("click",()=>changeRepsAmount(-1));
byId("wellnessRepsIncrease")?.addEventListener("click",()=>changeRepsAmount(1));
byId("wellnessRepsCancel")?.addEventListener("click",()=>showLayer(elements.workoutLayer));
byId("wellnessRepsBack")?.addEventListener("click",()=>showLayer(elements.workoutLayer));
byId("wellnessFinishCancel")?.addEventListener("click",()=>showLayer(elements.workoutLayer));
byId("wellnessFinishBack")?.addEventListener("click",()=>showLayer(elements.workoutLayer));
byId("wellnessWorkoutCompleteClose")?.addEventListener("click",()=>{ state.completionRunId+=1; hideLayers(); });
elements.discardWorkout?.addEventListener("click",()=>void discardWorkout());
elements.weightCard?.addEventListener("click",()=>{ renderWeight(); showLayer(elements.weightLayer); });
byId("wellnessWeightClose")?.addEventListener("click",hideLayers);
elements.weightForm?.addEventListener("submit",saveWeight);
elements.foodForm?.addEventListener("submit",submitFood);
byId("wellnessConfigureMeals")?.addEventListener("click",openMealConfig);
byId("wellnessMealConfigClose")?.addEventListener("click",hideLayers);
byId("wellnessMealConfigSave")?.addEventListener("click",()=>void saveMealConfig());
byId("wellnessMealAddClose")?.addEventListener("click",hideLayers);
elements.mealList?.addEventListener("click",(event)=>{ if(event.target.closest("[data-configure-meals]")){openMealConfig();return;} const button=event.target.closest("[data-add-meal]"); if(!button)return; const slot=(state.dashboard?.mealSlots||[]).find((item)=>item.key===button.dataset.addMeal); if(slot)openMealAdd(slot); });
elements.foodMic?.addEventListener("click",()=>void toggleWellnessVoice("meal"));
modal?.addEventListener("pointerdown",()=>{if(state.tab==="exercises"){void warmExerciseProgressSound();void warmWorkoutCompletionSound();}},{passive:true});
  state.ticker=window.setInterval(()=>{
    if(document.hidden||!modal?.classList.contains("active"))return;
    refreshWorkoutRelativeTimes();
    if(!state.workout)return;
    renderWorkout();
    refreshExerciseProgress();
    if(!elements.detail?.hidden&&state.detailMode==="selected")updateExerciseProgressDetail();
  },2000);
window.addEventListener("pagehide",()=>{ clearSeriesRest();if(state.workout)void saveWorkoutProgress().catch(()=>{}); });
window.addEventListener("online",()=>void syncOfflineWorkouts());
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState!=="visible")return;if(state.seriesRestUntil)refreshSeriesRest();if(navigator.onLine!==false)void syncOfflineWorkouts(); });
window.addEventListener("project200:offline-data-updated",(event)=>{
  if(String(event?.detail?.path||"")!==dashboardPath())return;
  state.dashboard=event.detail.payload?.dashboard||state.dashboard;
  applyAdminAccess(event.detail.payload?.isAdmin);
  const local=readOfflineWorkouts().find((item)=>!item.finished)?.workout||null;
  state.workout=local||state.dashboard?.activeWorkout||null;
  renderMeals();renderWeight();renderExerciseGrid();renderWorkoutHistory();renderWorkout();
});
window.addEventListener("project200:offline-sync-complete",()=>{ if(modal?.classList.contains("active"))void loadDashboard(); });
if(navigator.onLine!==false&&readOfflineWorkouts().length)window.setTimeout(()=>void syncOfflineWorkouts(),800);
void refreshAdminAccess();
document.addEventListener("keydown",(event)=>{ const target=event.target; const typing=target instanceof HTMLElement&&(target.matches("input,textarea,select")||target.isContentEditable); if(event.key?.toLowerCase()!=="t"||event.ctrlKey||event.metaKey||event.altKey||event.repeat||typing)return; event.preventDefault(); event.stopImmediatePropagation(); void openExerciseAdmin(); },true);
window.project200Wellness={open:openWellness,close:closeWellness,get exercises(){return exerciseCatalog();}};
