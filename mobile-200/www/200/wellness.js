import { getApiUrl } from "../api.js";

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
  nutritionStatus:byId("wellnessNutritionStatus"), mealList:byId("wellnessMealList"), exerciseGrid:byId("wellnessExerciseGrid"), exerciseCategoryName:byId("wellnessExerciseCategoryName"), workoutHistory:byId("wellnessWorkoutHistory"), exerciseDailyPercent:byId("wellnessExerciseDailyPercent"), exerciseDailyProgressFill:byId("wellnessExerciseDailyProgressFill"),
  catalogLayer:byId("wellnessCatalogLayer"), catalogGrid:byId("wellnessCatalogGrid"), catalogTitle:byId("wellnessCatalogTitle"), openCatalog:byId("wellnessOpenCatalog"),
  activeWorkout:byId("wellnessActiveWorkout"), activeWorkoutImage:byId("wellnessActiveWorkoutImage"), activeWorkoutVideo:byId("wellnessActiveWorkoutVideo"), workoutName:byId("wellnessWorkoutName"), workoutCounter:byId("wellnessWorkoutCounter"), workoutDetail:byId("wellnessWorkoutDetail"),
  detail:byId("wellnessExerciseDetail"), detailCategory:byId("wellnessExerciseCategory"), detailName:byId("wellnessExerciseName"), detailFrame:byId("wellnessExerciseDetailFrame"), detailImage:byId("wellnessExerciseDetailImage"), detailVideo:byId("wellnessExerciseDetailVideo"), detailVideoInput:byId("wellnessExerciseVideoInput"), detailMediaLoaderText:byId("wellnessExerciseMediaLoaderText"),
  infoLayer:byId("wellnessExerciseInfoLayer"), infoCategory:byId("wellnessExerciseInfoCategory"), infoName:byId("wellnessExerciseInfoName"), infoEquipment:byId("wellnessExerciseInfoEquipment"),
  infoMuscles:byId("wellnessExerciseInfoMuscles"), adminLayer:byId("wellnessExerciseAdminLayer"), adminProgress:byId("wellnessExerciseAdminProgress"), adminProgressFill:byId("wellnessExerciseAdminProgressFill"), adminProgressCount:byId("wellnessExerciseAdminProgressCount"), adminFill:byId("wellnessExerciseAdminFill"), adminNames:byId("wellnessExerciseAdminNames"), adminCreate:byId("wellnessExerciseAdminCreate"), adminStatus:byId("wellnessExerciseAdminStatus"),
  detailInstructions:byId("wellnessExerciseInstructions"), detailStart:byId("wellnessExerciseStart"), detailGoal:byId("wellnessExerciseGoal"), detailDelete:byId("wellnessExerciseDelete"), detailProgress:byId("wellnessExerciseProgress"), detailProgressText:byId("wellnessExerciseProgressText"),
  detailGenerate:byId("wellnessExerciseGenerate"), detailGenerateStatus:byId("wellnessExerciseGenerateStatus"),
  detailProgressFill:byId("wellnessExerciseProgressFill"), detailTotal:byId("wellnessExerciseTotal"), goalLayer:byId("wellnessGoalLayer"), goalForm:byId("wellnessGoalForm"), goalTitle:byId("wellnessGoalTitle"), goalHelp:byId("wellnessGoalHelp"),
  seriesGoalFields:byId("wellnessSeriesGoalFields"), minutesGoalFields:byId("wellnessMinutesGoalFields"), distanceGoalFields:byId("wellnessDistanceGoalFields"),
  targetSeries:byId("wellnessTargetSeries"), targetReps:byId("wellnessTargetReps"), targetMinutes:byId("wellnessTargetMinutes"), targetDistanceKm:byId("wellnessTargetDistanceKm"),
  exerciseWeekdays:byId("wellnessExerciseWeekdays"), goalStart:byId("wellnessGoalStart"), workoutLayer:byId("wellnessWorkoutLayer"), phaseLabel:byId("wellnessPhaseLabel"), phaseName:byId("wellnessPhaseExerciseName"),
  phaseNumber:byId("wellnessPhaseNumber"), phaseNumberStepper:byId("wellnessWorkoutNumberStepper"), phaseRepsDecrease:byId("wellnessWorkoutRepsDecrease"), phaseRepsIncrease:byId("wellnessWorkoutRepsIncrease"), phaseUnit:byId("wellnessPhaseUnit"), phaseProgress:byId("wellnessWorkoutProgressRing"), workoutImage:byId("wellnessWorkoutExerciseImage"), workoutVideo:byId("wellnessWorkoutExerciseVideo"), workoutSeriesStatus:byId("wellnessWorkoutSeriesStatus"), workoutSeriesCount:byId("wellnessWorkoutSeriesCount"), workoutPrimary:byId("wellnessWorkoutPrimary"), workoutPrimaryLabel:byId("wellnessWorkoutPrimaryLabel"),
  workoutFinish:byId("wellnessWorkoutFinish"), repsLayer:byId("wellnessRepsLayer"), repsForm:byId("wellnessRepsForm"), repsInput:byId("wellnessRepsInput"),
  repsQuestion:byId("wellnessRepsQuestion"), askAgainOff:byId("wellnessAskAgainOff"), finishLayer:byId("wellnessFinishLayer"), finishForm:byId("wellnessFinishForm"),
  finishQuestion:byId("wellnessFinishQuestion"), discardWorkout:byId("wellnessDiscardWorkout"), distanceField:byId("wellnessDistanceField"), distanceInput:byId("wellnessDistanceInput"), weightCard:byId("wellnessWeightCard"),
  weightCurrent:byId("wellnessWeightCurrent"), bmiSummary:byId("wellnessBmiSummary"), bmiMarker:byId("wellnessBmiMarker"), weightLayer:byId("wellnessWeightLayer"),
  weightModalCurrent:byId("wellnessWeightModalCurrent"), bmiValue:byId("wellnessBmiValue"), bmiModalMarker:byId("wellnessBmiModalMarker"), weightForm:byId("wellnessWeightForm"),
  heightInput:byId("wellnessHeightInput"), weightInput:byId("wellnessWeightInput"), weightHistory:byId("wellnessWeightHistory")
  ,mealConfigLayer:byId("wellnessMealConfigLayer"), mealConfigList:byId("wellnessMealConfigList"), mealConfigStatus:byId("wellnessMealConfigStatus"), mealAddLayer:byId("wellnessMealAddLayer"), mealAddTitle:byId("wellnessMealAddTitle"), mealAddStatus:byId("wellnessMealAddStatus"), foodMic:byId("wellnessFoodMic")
};
const phaseLayers = [elements.catalogLayer,elements.detail,elements.infoLayer,elements.adminLayer,elements.goalLayer,elements.workoutLayer,elements.repsLayer,elements.finishLayer,elements.weightLayer,elements.mealConfigLayer,elements.mealAddLayer].filter(Boolean);
const EXERCISE_IMAGE_PHASES = ["start","finish","muscle"];
const state = { tab:"nutrition", filter:"strength", dashboard:null, isAdmin:false, selectedExercise:null, detailMode:"selected", goalEditMode:false, goalWeekDays:[1,2,3,4,5,6], workout:null, steps:0, lastStepAt:0, motionListening:false, saveTimer:null, ticker:null, exerciseImageTimer:null, detailImageTimer:null, exerciseMuscleTimer:null, exerciseImagePhase:"start", detailImagePhase:"start", muscleNameIndex:0, pendingMeal:"", selectedMealSlot:"", gpsWatchId:null, gpsProvider:"", gpsLastPoint:null, gpsDistanceMeters:0, gpsAccuracy:null, gpsStatus:"GPS aguardando localização", gpsPlugin:null, seriesRepsDraft:null, seriesSaveChain:Promise.resolve(), adminImageHoldTimer:null, adminImageHoldTriggered:false, adminImageHoldX:0, adminImageHoldY:0, adminVideoHoldTimer:null, adminVideoHoldTriggered:false, suppressExerciseImageClick:false, generatingExerciseId:"", uploadingExerciseVideoId:"", generatingDefinitions:false, voiceRecorder:null, voiceStream:null, voiceTarget:null };
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
          const result=await apiRequest(`/api/200/exercises/${encodeURIComponent(item.serverId)}/series`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({repetitions:Number(series[index]?.repetitions||0),targetRepetitions:Number(item.workout?.targetReps||0)}),forceNetwork:true});
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
function showLayer(layer){ phaseLayers.forEach((item)=>{ item.hidden=item!==layer; }); pauseHiddenExerciseVideos(); if(layer!==elements.detail&&state.detailImageTimer){window.clearInterval(state.detailImageTimer);state.detailImageTimer=null;} }
function stopWellnessVoice(){
  if(state.voiceRecorder&&state.voiceRecorder.state!=="inactive")state.voiceRecorder.stop();
}
function hideLayers(){ stopWellnessVoice(); phaseLayers.forEach((item)=>{ item.hidden=true; }); pauseHiddenExerciseVideos(); if(state.detailImageTimer)window.clearInterval(state.detailImageTimer); state.detailImageTimer=null; }
function setTab(tab){ state.tab=tab==="exercises"?"exercises":"nutrition"; document.querySelectorAll("[data-wellness-tab]").forEach((button)=>button.classList.toggle("active",button.dataset.wellnessTab===state.tab)); document.querySelectorAll("[data-wellness-pane]").forEach((pane)=>pane.classList.toggle("active",pane.dataset.wellnessPane===state.tab)); const exercising=state.tab==="exercises"; elements.title.textContent=exercising?"Exercícios":"Nutrição"; elements.headerIcon.src=exercising?"/200/apps/exercicios.png":"/200/apps/nutricao.png"; }
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
function exerciseAssets(){ return Array.isArray(state.dashboard?.exerciseAssets)?state.dashboard.exerciseAssets:[]; }
function exerciseAsset(exerciseId){ return exerciseAssets().find((item)=>String(item?.exerciseId||"")===String(exerciseId||""))||null; }
function exerciseDefinitions(){ return Array.isArray(state.dashboard?.exerciseDefinitions)?state.dashboard.exerciseDefinitions:[]; }
function exerciseDefinition(exerciseId){ return exerciseDefinitions().find((item)=>String(item?.exerciseId||"")===String(exerciseId||""))||null; }
function exerciseMuscleLoads(exercise){
  const source=Array.isArray(exercise?.muscleLoads)?exercise.muscleLoads:exerciseDefinition(exercise?.id)?.muscles;
  const loads=(Array.isArray(source)?source:[]).flatMap((item)=>{ const name=String(item?.name||"").trim(),load=Number(item?.load); return name&&Number.isFinite(load)?[{name,load:Math.max(.25,Math.min(1,Math.round(load*20)/20))}]:[]; }).slice(0,3);
  return loads.length?loads:heuristicExerciseMuscles(exercise).map((name)=>({name,load:null}));
}
function exerciseMuscles(exercise){ return exerciseMuscleLoads(exercise).map((item)=>item.name); }
function exerciseCatalog(){
  const catalog=new Map(EXERCISES.map((exercise)=>[exercise.id,{...exercise}]));
  exerciseDefinitions().forEach((definition)=>{
    const id=String(definition?.exerciseId||""); if(!id)return;
    const current=catalog.get(id)||{};
    catalog.set(id,{...current,id,name:definition.exerciseName||current.name||"Exercício",category:definition.category||current.category||"strength",tracking:definition.trackingType||current.tracking||"series",equipment:definition.equipment||current.equipment||"Sem equipamento",cue:definition.cue||current.cue||"Faça o movimento com controle e respeite seus limites.",muscleLoads:Array.isArray(definition.muscles)?definition.muscles:[]});
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
function toggleExerciseVideo(shell){ const video=shell?.querySelector?.("video[data-exercise-video]"); if(!video)return false; if(video.paused){ document.querySelectorAll("video[data-exercise-video]").forEach((item)=>{ if(item!==video){item.pause();item.closest(".is-playing")?.classList.remove("is-playing");} }); void video.play().then(()=>shell.classList.add("is-playing")).catch(()=>{}); }else{ video.pause(); shell.classList.remove("is-playing"); } return true; }
function configureFixedExerciseMedia(shell,image,video,exercise,{movementOnly=false}={}){
  if(!shell||!image||!video)return;
  const media=exerciseImageSources(exercise),hasVideo=Boolean(media.video); shell.classList.toggle("has-video",hasVideo); shell.dataset.exerciseId=String(exercise?.id||"");
  if(hasVideo){ image.hidden=true; image.removeAttribute("data-exercise-image"); video.hidden=false; video.dataset.exerciseVideo=""; if(video.getAttribute("src")!==media.video){video.pause();shell.classList.remove("is-playing");video.setAttribute("src",media.video);} video.setAttribute("poster",media.poster); video.setAttribute("aria-label",`Vídeo de ${exercise?.name||"exercício"}`); return; }
  video.pause(); video.hidden=true; video.removeAttribute("data-exercise-video"); video.removeAttribute("src"); shell.classList.remove("is-playing"); image.hidden=false; image.dataset.exerciseImageId=String(exercise?.id||""); image.dataset.startSrc=media.start; image.dataset.finishSrc=media.finish; image.dataset.muscleSrc=media.muscle; if(!movementOnly)image.dataset.exerciseImage=""; else image.removeAttribute("data-exercise-image"); image.src=movementOnly?exerciseImageForPhase(media,state.detailImagePhase):exerciseImageForPhase(media); image.alt=`Movimento de ${exercise?.name||"exercício"}`;
}
function refreshExerciseImages(){ document.querySelectorAll("[data-exercise-image]").forEach((image)=>{ const source=image.dataset[`${state.exerciseImagePhase}Src`]||image.dataset.startSrc; if(source&&image.getAttribute("src")!==source)image.setAttribute("src",source); }); }
function formatMuscleLoad(load){ return Number.isFinite(Number(load))?Number(load).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}):""; }
function muscleLoadLabel(item){ const value=formatMuscleLoad(item?.load); return [item?.name,value].filter(Boolean).join(" · "); }
function exerciseMuscleMarkup(exercise){ const muscles=exerciseMuscleLoads(exercise); return `<small data-exercise-muscles="${escapeHtml(JSON.stringify(muscles))}">${escapeHtml(muscleLoadLabel(muscles[state.muscleNameIndex%muscles.length])||"Corpo inteiro")}</small>`; }
function refreshExerciseMuscleLabels(){ document.querySelectorAll("[data-exercise-muscles]").forEach((label)=>{ try{ const muscles=JSON.parse(label.dataset.exerciseMuscles||"[]"); if(Array.isArray(muscles)&&muscles.length)label.textContent=muscleLoadLabel(muscles[state.muscleNameIndex%muscles.length]); }catch{} }); }
function startExerciseImageTicker(){ if(!state.exerciseImageTimer)state.exerciseImageTimer=window.setInterval(()=>{ if(document.hidden||!modal?.classList.contains("active"))return; const index=EXERCISE_IMAGE_PHASES.indexOf(state.exerciseImagePhase); state.exerciseImagePhase=EXERCISE_IMAGE_PHASES[(index+1)%EXERCISE_IMAGE_PHASES.length]; refreshExerciseImages(); },1500); if(!state.exerciseMuscleTimer)state.exerciseMuscleTimer=window.setInterval(()=>{ if(document.hidden||!modal?.classList.contains("active"))return; state.muscleNameIndex+=1; refreshExerciseMuscleLabels(); },1000); }
function startDetailMovementTicker(){ if(state.detailImageTimer)window.clearInterval(state.detailImageTimer); state.detailImageTimer=null; state.detailImagePhase="start"; const images=exerciseImageSources(state.selectedExercise); if(images.video||!elements.detailImage)return; elements.detailImage.src=images.start; state.detailImageTimer=window.setInterval(()=>{ if(document.hidden||elements.detail?.hidden||exerciseImageSources(state.selectedExercise).video)return; state.detailImagePhase=state.detailImagePhase==="start"?"finish":"start"; const current=exerciseImageSources(state.selectedExercise); elements.detailImage.src=exerciseImageForPhase(current,state.detailImagePhase); },1000); }
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
function renderDailyExerciseProgress(){ const percent=Math.max(0,Math.min(100,dailyExerciseProgress())); if(elements.exerciseDailyPercent)elements.exerciseDailyPercent.textContent=`${percent}%`; if(elements.exerciseDailyProgressFill)elements.exerciseDailyProgressFill.style.width=`${percent}%`; }
function hasExerciseGoal(item){ if(!item)return false; if(item.trackingType==="series")return Number(item.targetSeries||0)>0&&Number(item.targetReps||0)>0; if(item.trackingType==="gps")return Number(item.targetDistanceMeters||0)>0; return Number(item.targetMinutes||0)>0; }
function setExerciseCategory(categoryId){ state.filter=EXERCISE_CATEGORIES.some((item)=>item.id===categoryId)?categoryId:EXERCISE_CATEGORIES[0].id; renderExerciseGrid(); if(!elements.catalogLayer?.hidden)renderCatalog(); }
function cycleExerciseCategory(direction){ const currentIndex=Math.max(0,EXERCISE_CATEGORIES.findIndex((item)=>item.id===state.filter)); const nextIndex=(currentIndex+direction+EXERCISE_CATEGORIES.length)%EXERCISE_CATEGORIES.length; setExerciseCategory(EXERCISE_CATEGORIES[nextIndex].id); }
function renderExerciseGrid(){
  const category=currentExerciseCategory();
  renderDailyExerciseProgress();
  if(elements.exerciseCategoryName)elements.exerciseCategoryName.textContent=category.label;
  const visible=exerciseLibrary().filter((item)=>category.id==="all"||(item.category===category.id&&exerciseScheduledToday(item))).map(exerciseFromLibrary).filter(Boolean);
  if(!visible.length){ const hasOffDayExercises=category.id!=="all"&&exerciseLibrary().some((item)=>item.category===category.id); elements.exerciseGrid.innerHTML=hasOffDayExercises?'<button class="wellness-exercise-empty" type="button" data-show-all-exercises><strong>Nenhum exercício desta seção para hoje</strong><span>Ele continua disponível em Todos.</span></button>':'<button class="wellness-exercise-empty" type="button" data-open-catalog><strong>Adicione seu primeiro exercício</strong><span>Escolha no acervo sem poluir sua tela inicial.</span></button>'; return; }
  elements.exerciseGrid.innerHTML=visible.map((exercise)=>{ const progress=exerciseProgress(libraryItem(exercise.id)); return `<article class="wellness-exercise-item"><button class="wellness-exercise-open" type="button" data-exercise-id="${escapeHtml(exercise.id)}">${exerciseImageMarkup(exercise)}<span class="wellness-exercise-copy"><strong title="${escapeHtml(exercise.name)}">${escapeHtml(exercise.name)}</strong>${exerciseMuscleMarkup(exercise)}</span></button><button class="wellness-exercise-play" type="button" data-exercise-play-id="${escapeHtml(exercise.id)}" aria-label="Iniciar ${escapeHtml(exercise.name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7 8 5-8 5V7Z"/></svg></button><span class="wellness-exercise-list-progress" role="progressbar" aria-label="${progress.percent}% concluído hoje" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.percent}"><i style="width:${progress.width}%"></i></span></article>`; }).join("");
  refreshExerciseImages();
}
function refreshExerciseProgress(){ refreshExerciseImages(); renderDailyExerciseProgress(); }
function renderCatalog(){
  const category=currentExerciseCategory(), selectedIds=new Set(exerciseLibrary().map((item)=>item.exerciseId));
  const visible=exerciseCatalog().filter((item)=>(category.id==="all"||item.category===category.id)&&!selectedIds.has(item.id));
  elements.catalogTitle.textContent=category.label;
  elements.catalogGrid.innerHTML=visible.length?visible.map((exercise)=>`<button class="wellness-catalog-item" type="button" data-catalog-exercise-id="${escapeHtml(exercise.id)}">${exerciseImageMarkup(exercise,"wellness-catalog-image")}<strong title="${escapeHtml(exercise.name)}">${escapeHtml(exercise.name)}</strong>${exerciseMuscleMarkup(exercise)}<span>Conhecer e adicionar ›</span></button>`).join(""):'<div class="wellness-catalog-empty">Você já adicionou todos os exercícios desta categoria.</div>';
  refreshExerciseImages();
}
function openCatalog(){ renderCatalog(); showLayer(elements.catalogLayer); }
function updateExerciseProgressDetail(){
  const item=libraryItem(state.selectedExercise?.id);
  elements.detailProgress.hidden=!item||state.detailMode!=="selected";
  if(!item||state.detailMode!=="selected")return;
  const progress=exerciseProgress(item); elements.detailProgressText.textContent=`${progress.percent}% completo hoje`; elements.detailProgressFill.style.width=`${progress.width}%`; elements.detailTotal.textContent=formatExerciseTotal(item,progress.value);
}
function openExerciseDetail(exercise,mode="selected"){
  if(state.workout&&mode==="selected"){ showLayer(elements.workoutLayer); renderWorkout(); return; }
  state.selectedExercise=exercise; state.detailMode=mode;
  elements.detailCategory.textContent=EXERCISE_CATEGORIES.find((item)=>item.id===exercise.category)?.label||"Exercício";
  elements.detailName.textContent=exercise.name;
  configureFixedExerciseMedia(elements.detailFrame,elements.detailImage,elements.detailVideo,exercise,{movementOnly:true}); startDetailMovementTicker();
  const isGenerating=state.generatingExerciseId===exercise.id||state.uploadingExerciseVideoId===exercise.id; elements.detailFrame?.classList.toggle("is-generating",isGenerating);
  if(elements.detailGenerate){ elements.detailGenerate.hidden=!state.isAdmin; elements.detailGenerate.disabled=isGenerating; }
  if(elements.detailMediaLoaderText)elements.detailMediaLoaderText.textContent=state.uploadingExerciseVideoId===exercise.id?"Otimizando vídeo...":"Criando imagens...";
  if(elements.detailGenerateStatus&&!isGenerating)elements.detailGenerateStatus.textContent=state.isAdmin?(exerciseImageSources(exercise).video?"Vídeo ativo · segure a mídia por 2 segundos para substituir.":"Segure a mídia por 2 segundos para enviar um vídeo."):"";
  const item=libraryItem(exercise.id),hasGoal=hasExerciseGoal(item); elements.detailStart.textContent=mode==="catalog"?"Adicionar exercício":!hasGoal?"Definir nova meta":exercise.tracking==="series"?"Iniciar série":exercise.tracking==="gps"?"Iniciar caminhada":"Iniciar exercício"; if(elements.detailGoal)elements.detailGoal.hidden=mode!=="selected"||!hasGoal; if(elements.detailDelete)elements.detailDelete.hidden=mode!=="selected"||!item;
  updateExerciseProgressDetail(); showLayer(elements.detail);
}
function openExerciseInfo(){ const exercise=state.selectedExercise;if(!exercise)return; elements.infoCategory.textContent=EXERCISE_CATEGORIES.find((item)=>item.id===exercise.category)?.label||"INFORMAÇÕES"; elements.infoName.textContent=exercise.name; elements.infoEquipment.textContent=exercise.category==="calisthenics"?"Sem equipamento":exercise.equipment||"Sem equipamento"; const loads=exerciseMuscleLoads(exercise); if(elements.infoMuscles)elements.infoMuscles.innerHTML=`<header><span>Carga muscular relativa</span><small>0,25 mínimo · 1,00 principal</small></header>${loads.map((item)=>`<div><strong>${escapeHtml(item.name)}</strong><span>${formatMuscleLoad(item.load)||"A definir"}</span><i><b style="width:${Number.isFinite(Number(item.load))?Math.round(Number(item.load)*100):0}%"></b></i></div>`).join("")}`; elements.detailInstructions.innerHTML=""; exerciseInstructions(exercise).forEach((instruction)=>{ const li=document.createElement("li"); li.textContent=instruction; elements.detailInstructions.appendChild(li); }); showLayer(elements.infoLayer); }

function validExerciseDefinition(exercise){ return exerciseMuscleLoads(exercise).some((item)=>Number.isFinite(Number(item.load))); }
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
  const busy=state.generatingDefinitions; if(elements.adminFill){elements.adminFill.disabled=busy||defined>=total;elements.adminFill.textContent=defined>=total?"Todos os exercícios estão definidos":busy?"Luna trabalhando...":"Preencher exercícios pendentes";} if(elements.adminCreate)elements.adminCreate.disabled=busy;
}
async function requestExerciseDefinitionBatch(mode,exercises){
  const payload=await apiRequest("/api/admin/200/exercises/definitions/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode,exercises}),forceNetwork:true});
  mergeExerciseDefinitions(payload?.definitions); return Array.isArray(payload?.definitions)?payload.definitions:[];
}
async function fillMissingExerciseDefinitions(){
  if(state.generatingDefinitions)return; const pending=exerciseCatalog().filter((exercise)=>!validExerciseDefinition(exercise));
  if(!pending.length){ elements.adminStatus.textContent="Todos os exercícios já têm carga muscular definida."; renderExerciseAdmin(); return; }
  state.generatingDefinitions=true; renderExerciseAdmin(); let completed=0;
  try{ for(let index=0;index<pending.length;index+=10){ const batch=pending.slice(index,index+10).map((exercise)=>({exerciseId:exercise.id,exerciseName:exercise.name,category:exercise.category,trackingType:exercise.tracking,equipment:exercise.equipment,cue:exercise.cue})); elements.adminStatus.textContent=`Luna definindo ${Math.min(index+batch.length,pending.length)} de ${pending.length} pendentes...`; const saved=await requestExerciseDefinitionBatch("missing",batch); if(!saved.length)throw new Error("A Luna não devolveu definições para este lote."); completed+=saved.length; renderExerciseAdmin(); } elements.adminStatus.textContent=`Pronto: ${completed} exercícios preenchidos pela Luna.`; }
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
async function uploadSelectedExerciseVideo(file){
  const exercise=state.selectedExercise;if(!state.isAdmin||!exercise||!file||state.uploadingExerciseVideoId)return;
  state.uploadingExerciseVideoId=exercise.id; elements.detailFrame?.classList.add("is-generating"); if(elements.detailMediaLoaderText)elements.detailMediaLoaderText.textContent="Verificando vídeo..."; elements.detailGenerateStatus.textContent="Preparando vídeo...";
  try{
    if(file.size>80*1024*1024)throw new Error("Escolha um vídeo de até 80 MB.");
    const duration=await readExerciseVideoDuration(file); if(duration>15.05)throw new Error("Escolha um vídeo de no máximo 15 segundos.");
    if(elements.detailMediaLoaderText)elements.detailMediaLoaderText.textContent="Otimizando 600×600..."; elements.detailGenerateStatus.textContent="Otimizando e enviando para o R2...";
    const payload=await apiRequest(`/api/admin/200/exercises/${encodeURIComponent(exercise.id)}/video?exerciseName=${encodeURIComponent(exercise.name)}`,{method:"POST",headers:{"Content-Type":file.type||"application/octet-stream"},body:file,forceNetwork:true});
    const assets=exerciseAssets().filter((item)=>String(item?.exerciseId||"")!==exercise.id); assets.push(payload.asset); state.dashboard={...(state.dashboard||{}),exerciseAssets:assets}; cacheDashboard(); renderExerciseGrid(); if(!elements.catalogLayer?.hidden)renderCatalog(); state.uploadingExerciseVideoId=""; openExerciseDetail(exercise,state.detailMode); elements.detailGenerateStatus.textContent="Vídeo 600×600 salvo. Toque para reproduzir em loop.";
  }catch(error){ elements.detailGenerateStatus.textContent=error instanceof Error?error.message:"Não foi possível salvar o vídeo."; }
  finally{ state.uploadingExerciseVideoId=""; elements.detailFrame?.classList.remove("is-generating"); if(elements.detailVideoInput)elements.detailVideoInput.value=""; }
}
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
function averageSpeedKmh(){ const elapsed=elapsedSeconds(state.workout); return elapsed>0?(currentGpsDistance()/1000)/(elapsed/3600):0; }
function formatAverageSpeed(){ return `${averageSpeedKmh().toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1})} km/h`; }
function haversineMeters(a,b){ const radians=(value)=>value*Math.PI/180, earth=6371000, lat=radians(b.latitude-a.latitude), lon=radians(b.longitude-a.longitude), x=Math.sin(lat/2)**2+Math.cos(radians(a.latitude))*Math.cos(radians(b.latitude))*Math.sin(lon/2)**2; return earth*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)); }
function renderWorkoutHistory(){ if(!elements.workoutHistory)return; const workouts=Array.isArray(state.dashboard?.recentWorkouts)?state.dashboard.recentWorkouts:[]; elements.workoutHistory.innerHTML=""; if(!workouts.length){ elements.workoutHistory.innerHTML="<div class=\"wellness-meal-empty\">Nenhum treino concluído.</div>"; return; } workouts.forEach((workout)=>{ const row=document.createElement("div"); row.className="wellness-workout-history-entry"; const result=workout.trackingType==="series"?`${Number(workout.seriesCount||0)} séries · ${Number(workout.totalReps||0)} movimentos`:workout.trackingType==="gps"?`${formatDistance(Number(workout.distanceMeters||0))} · ${Math.round(Number(workout.durationMinutes||0))} min`:`${Math.round(Number(workout.durationMinutes||0))} minutos`; row.innerHTML=`<div><strong></strong><small>${result}</small></div><time>${new Date(workout.completedAt||workout.startedAt).toLocaleDateString("pt-BR")}</time>`; row.querySelector("strong").textContent=workout.exerciseName||"Treino"; elements.workoutHistory.appendChild(row); }); }
function setWorkoutProgress(value){
  if(!elements.phaseProgress||!state.workout)return;
  const progress=Math.max(0,Math.min(100,Number(value||0))),workoutId=String(state.workout.id||""),sameWorkout=elements.phaseProgress.dataset.workoutId===workoutId,previous=Number(elements.phaseProgress.dataset.progress||0);
  elements.phaseProgress.style.setProperty("--progress",String(progress)); elements.phaseProgress.dataset.progress=String(progress); elements.phaseProgress.dataset.workoutId=workoutId; elements.phaseProgress.setAttribute("aria-label",`${Math.round(progress)}% da meta concluída`);
  if(!sameWorkout||progress<=previous+.01||(state.workout.trackingType!=="series"&&progress-previous<1))return;
  playWorkoutProgressFlash();
}
function renderWorkout(){
  const workout=state.workout; elements.activeWorkout.hidden=!workout; if(!workout){ elements.activeWorkoutVideo?.pause(); elements.workoutVideo?.pause(); return; }
  const isSeries=workout.trackingType==="series", isGps=workout.trackingType==="gps",exercise=exerciseCatalog().find((item)=>item.id===workout.exerciseId)||exerciseFromLibrary(libraryItem(workout.exerciseId)||{});
  elements.phaseNumber.classList.toggle("wellness-phase-distance",isGps); elements.phaseNumberStepper.classList.toggle("is-series",isSeries); elements.workoutFinish.classList.toggle("is-series",isSeries); elements.phaseRepsDecrease.hidden=!isSeries; elements.phaseRepsIncrease.hidden=!isSeries; elements.workoutSeriesStatus.hidden=!isSeries;
  elements.workoutName.textContent=workout.exerciseName||"Treino"; elements.workoutCounter.textContent=isSeries?`${Number(workout.seriesCount||0)}/${Number(workout.targetSeries||0)} séries`:isGps?formatDistance(currentGpsDistance()):formatTimer(elapsedSeconds(workout));
  elements.workoutDetail.textContent=isGps?`${formatTimer(elapsedSeconds(workout))} · média ${formatAverageSpeed()}`:"Meta e progresso salvos no seu perfil"; elements.phaseName.textContent=workout.exerciseName||"Treino";
  configureFixedExerciseMedia(elements.activeWorkoutImage?.closest("[data-fixed-exercise-video-shell]"),elements.activeWorkoutImage,elements.activeWorkoutVideo,exercise);
  configureFixedExerciseMedia(elements.phaseProgress,elements.workoutImage,elements.workoutVideo,exercise);
  if(isSeries){ const done=Number(workout.seriesCount||0), target=Math.max(1,Number(workout.targetSeries||1)), reps=currentSeriesReps(); elements.phaseLabel.textContent=done>=target?"Meta concluída · série extra":`Série ${done+1} de ${target}`; elements.workoutSeriesCount.textContent=`${done}/${target}`; elements.phaseNumber.textContent=String(reps); elements.phaseUnit.textContent=`${reps} movimentos na próxima série`; elements.workoutPrimaryLabel.textContent=`Adicionar ${reps}`; setWorkoutProgress((done/target)*100); return; }
  const elapsed=elapsedSeconds(workout); elements.phaseNumber.textContent=isGps?formatDistance(currentGpsDistance()):formatTimer(elapsed);
  if(isGps){ const targetMeters=Math.max(100,Number(workout.targetDistanceMeters||100)); elements.phaseLabel.textContent=`Meta de ${formatDistance(targetMeters)}`; elements.phaseUnit.textContent=`${formatDistance(currentGpsDistance())} · ${formatTimer(elapsed)} · média ${formatAverageSpeed()} · ${state.gpsStatus}`; elements.workoutPrimaryLabel.textContent="Salvar GPS"; setWorkoutProgress((currentGpsDistance()/targetMeters)*100); }
  else{ const targetSeconds=Math.max(60,Number(workout.targetMinutes||1)*60); elements.phaseLabel.textContent=`Meta de ${Math.round(Number(workout.targetMinutes||0))} minutos`; elements.phaseUnit.textContent=`${formatTimer(elapsed)} de atividade`; elements.workoutPrimaryLabel.textContent="Salvar progresso"; setWorkoutProgress((elapsed/targetSeconds)*100); }
}
function applyDashboardPayload(payload){
  state.dashboard=payload?.dashboard||{}; applyAdminAccess(payload?.isAdmin);
  const local=readOfflineWorkouts().find((item)=>!item.finished)?.workout||null;
  state.workout=local||state.dashboard.activeWorkout||null; if(local)state.dashboard.activeWorkout=local;
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
  try{ if(navigator.onLine===false){ activateOfflineWorkout(createOfflineWorkout(exercise,startPayload),startPayload); }else{ try{ const payload=await apiRequest("/api/200/exercises/start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(startPayload)}); state.dashboard=payload.dashboard||state.dashboard; state.workout=payload.workout; }catch(error){ if(error?.httpResponse)throw error; activateOfflineWorkout(createOfflineWorkout(exercise,startPayload),startPayload); } } state.seriesRepsDraft=null; state.steps=Number(state.workout?.steps||0); state.gpsDistanceMeters=Number(state.workout?.distanceMeters||0); if(exercise.tracking==="steps")await startStepCounter(true); if(exercise.tracking==="gps")await startGpsTracking(true); renderExerciseGrid(); renderWorkout(); showLayer(elements.workoutLayer); }
  catch(error){ const message=error instanceof Error?error.message:"Nao foi possivel iniciar."; if(directStart){ openExerciseDetail(exercise,"selected"); elements.detailGenerateStatus.textContent=message; }else elements.goalForm.querySelector("p").textContent=message; } finally{ submit.disabled=false; }
}
async function saveWorkoutProgress(){ if(!state.workout||state.workout.trackingType==="series")return; const progress={steps:state.steps,distanceMeters:state.workout.trackingType==="gps"?currentGpsDistance():Number(state.workout.distanceMeters||0),durationMinutes:elapsedSeconds(state.workout)/60}; if(isOfflineWorkout()){ state.workout={...state.workout,...progress}; state.dashboard={...(state.dashboard||{}),activeWorkout:state.workout}; persistOfflineWorkout(state.workout); cacheDashboard(); return; } const payload=await apiRequest(`/api/200/exercises/${encodeURIComponent(state.workout.id)}/progress`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(progress)}); state.workout=payload.workout||state.workout; if(state.workout.trackingType==="gps")state.gpsDistanceMeters=Math.max(state.gpsDistanceMeters,Number(state.workout.distanceMeters||0)); }
function seriesSummary(workout){ const series=Array.isArray(workout?.series)?workout.series:[]; const reps=series.map((item)=>Number(item.repetitions||0)); if(!reps.length)return "este treino sem séries"; const homogeneous=reps.every((value)=>value===reps[0]); if(reps.length===1)return `${reps[0]} movimentos`; if(homogeneous)return `${reps.length} séries de ${reps[0]} movimentos`; const tail=reps.length>1?`${reps.slice(0,-1).join(", ")} e ${reps.at(-1)}`:String(reps[0]); return `${reps.length} séries de ${tail} movimentos`; }
function currentSeriesReps(){ const target=Math.max(1,Math.trunc(Number(state.workout?.targetReps||1)||1)); return Math.max(1,Math.min(10000,Math.trunc(Number(state.seriesRepsDraft??target)||target))); }
function changeWorkoutSeriesReps(direction){ if(state.workout?.trackingType!=="series")return; state.seriesRepsDraft=Math.max(1,Math.min(10000,currentSeriesReps()+direction)); renderWorkout(); }
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
  if(!playExerciseProgressSound.pool)playExerciseProgressSound.pool=Array.from({length:2},()=>{ const audio=new Audio("/200/sfx/exercise-success.mp3?v=20260908"); audio.preload="auto"; audio.volume=.62; return audio; });
  return playExerciseProgressSound.pool;
}
function warmExerciseProgressSound(){ try{ exerciseProgressSoundPool().forEach((audio)=>{ if(audio.readyState===0)audio.load(); }); }catch{} }
function playExerciseProgressSound(){ try{ const pool=exerciseProgressSoundPool(),index=Number(playExerciseProgressSound.index||0)%pool.length,audio=pool[index]; playExerciseProgressSound.index=index+1; audio.currentTime=0; void audio.play().catch(()=>{}); }catch{} }
function applySeriesLocally(repetitions){ const workout=state.workout;if(!workout)return null; const reps=Math.max(1,Number(repetitions||0)); const series=[...(workout.series||[]),{id:`pending-series-${Date.now()}-${Math.random().toString(36).slice(2)}`,seriesNumber:Number(workout.seriesCount||0)+1,repetitions:reps,targetRepetitions:Number(workout.targetReps||0),createdAt:new Date().toISOString()}]; state.workout={...workout,series,seriesCount:series.length,totalReps:Number(workout.totalReps||0)+reps}; state.dashboard={...(state.dashboard||{}),activeWorkout:state.workout}; state.seriesRepsDraft=null; cacheDashboard(); renderWorkout(); showLayer(elements.workoutLayer); playExerciseProgressSound(); return state.workout; }
function addSeries(repetitions){ const workoutBefore=state.workout;if(!workoutBefore)return Promise.resolve(); const localWorkout=applySeriesLocally(repetitions); if(isOfflineWorkout(localWorkout)){ persistOfflineWorkout(localWorkout); return Promise.resolve(localWorkout); } const sessionId=String(localWorkout.id||""); const targetRepetitions=Number(localWorkout.targetReps||0); state.seriesSaveChain=state.seriesSaveChain.catch(()=>{}).then(()=>apiRequest(`/api/200/exercises/${encodeURIComponent(sessionId)}/series`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({repetitions,targetRepetitions}),skipGlobalLoading:true,offlineQueue:true,offlineResponse:{workout:localWorkout},offlineInvalidates:["/api/200/wellness"]})).then((payload)=>{ if(String(state.workout?.id||"")!==sessionId)return payload; const serverWorkout=payload?.workout; if(serverWorkout&&Number(serverWorkout.seriesCount||0)>=Number(state.workout?.seriesCount||0)){ state.workout=serverWorkout; state.dashboard={...(state.dashboard||{}),activeWorkout:serverWorkout}; cacheDashboard(); renderWorkout(); } return payload; }).catch((error)=>{ elements.phaseUnit.textContent=`Progresso local salvo · sincronização pendente (${error instanceof Error?error.message:"sem conexão"})`; }); return state.seriesSaveChain; }
function applyCompletedWorkoutToLibrary(workout){
  state.dashboard={...(state.dashboard||{}),exerciseLibrary:exerciseLibrary().map((item)=>{
    if(item.exerciseId!==workout.exerciseId)return item;
    if(workout.trackingType==="series")return {...item,todayTotalReps:Number(item.todayTotalReps||0)+Number(workout.totalReps||0)};
    if(workout.trackingType==="gps")return {...item,todayDistanceMeters:Number(item.todayDistanceMeters||0)+Number(workout.distanceMeters||0),todayDurationMinutes:Number(item.todayDurationMinutes||0)+Number(workout.durationMinutes||0)};
    return {...item,todayDurationMinutes:Number(item.todayDurationMinutes||0)+Number(workout.durationMinutes||0)};
  })};
}
async function handleWorkoutPrimary(){ if(!state.workout)return; if(state.workout.trackingType!=="series"){ await saveWorkoutProgress(); renderWorkout(); return; } void addSeries(currentSeriesReps()); }
async function saveSeries(event){ event.preventDefault(); if(!state.workout)return; const reps=Math.max(1,Math.trunc(Number(elements.repsInput.value||0)||0)); const submit=elements.repsForm.querySelector("button[type=submit]"); submit.disabled=true; try{ if(elements.askAgainOff.checked){ const currentHeight=state.dashboard?.wellness?.preferences?.heightCm||null; await apiRequest("/api/200/wellness/preferences",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({profile:profileName(),heightCm:currentHeight,askagain1:"no"})}); state.dashboard.wellness.preferences.askagain1="no"; } await addSeries(reps); }catch(error){ elements.repsQuestion.textContent=error instanceof Error?error.message:"Nao foi possivel guardar."; }finally{ submit.disabled=false; } }
function openFinish(){ if(!state.workout)return; const isSeries=state.workout.trackingType==="series", isGps=state.workout.trackingType==="gps"; elements.distanceField.hidden=isSeries||isGps; elements.discardWorkout.textContent=isGps?"Excluir caminhada sem contabilizar":"Excluir treino sem contabilizar"; if(isSeries){ elements.finishQuestion.textContent=`Deseja adicionar ${seriesSummary(state.workout)}?`; }else if(isGps){ elements.finishQuestion.textContent=`Deseja adicionar caminhada de ${formatDistance(currentGpsDistance())}?`; }else{ const meters=Math.max(0,Math.trunc(Number(elements.distanceInput.value||state.workout.distanceMeters||0))); elements.distanceInput.value=meters?String(meters):""; elements.finishQuestion.textContent=`Deseja adicionar ${String(state.workout.exerciseName||"atividade").toLowerCase()} de ${meters||"X"} metros?`; } showLayer(elements.finishLayer); }
async function finishWorkout(event){ event.preventDefault(); if(!state.workout)return; const submit=elements.finishForm.querySelector("button[type=submit]"); submit.disabled=true; try{ await saveWorkoutProgress(); if(state.workout?.trackingType==="series")await state.seriesSaveChain.catch(()=>{}); const workout=state.workout; if(!workout)return; const distanceMeters=workout.trackingType==="gps"?currentGpsDistance():workout.trackingType==="series"?0:Math.max(0,Math.trunc(Number(elements.distanceInput.value||0)||0)); if(isOfflineWorkout(workout)){ const completed={...workout,steps:state.steps,distanceMeters,completedAt:new Date().toISOString(),status:"completed"}; persistOfflineWorkout(completed,{finished:true,finishPayload:{steps:state.steps,distanceMeters}}); applyCompletedWorkoutToLibrary(completed); state.dashboard={...(state.dashboard||{}),activeWorkout:null,recentWorkouts:[completed,...(state.dashboard?.recentWorkouts||[])]}; cacheDashboard(); }else{ await apiRequest(`/api/200/exercises/${encodeURIComponent(workout.id)}/finish`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({steps:state.steps,distanceMeters}),offlineInvalidates:["/api/200/wellness"]}); } await stopGpsTracking(); stopStepCounter(); state.workout=null; state.steps=0; state.gpsDistanceMeters=0; state.dashboard={...(state.dashboard||{}),activeWorkout:null}; cacheDashboard(); hideLayers(); if(navigator.onLine!==false)await loadDashboard({showCached:false}); else{renderExerciseGrid();renderWorkoutHistory();renderWorkout();window.dispatchEvent(new CustomEvent("project200:exercise-mission-updated"));} }catch(error){ elements.finishQuestion.textContent=error instanceof Error?error.message:"Nao foi possivel encerrar."; }finally{ submit.disabled=false; } }
async function discardWorkout(){ if(!state.workout)return; elements.discardWorkout.disabled=true; try{ if(isOfflineWorkout())removeOfflineWorkout(state.workout.id); else await apiRequest(`/api/200/exercises/${encodeURIComponent(state.workout.id)}`,{method:"DELETE"}); await stopGpsTracking(); stopStepCounter(); state.workout=null; state.steps=0; state.gpsDistanceMeters=0; state.gpsLastPoint=null; state.dashboard={...(state.dashboard||{}),activeWorkout:null}; cacheDashboard(); hideLayers(); if(navigator.onLine!==false)await loadDashboard(); }catch(error){ elements.finishQuestion.textContent=error instanceof Error?error.message:"Nao foi possivel excluir."; }finally{ elements.discardWorkout.disabled=false; } }
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
elements.openCatalog?.addEventListener("click",openCatalog);
elements.exerciseGrid?.addEventListener("click",(event)=>{ if(consumeAdminExerciseImageClick(event))return; const videoShell=event.target.closest("[data-exercise-video-shell]"); if(videoShell){event.preventDefault();event.stopPropagation();toggleExerciseVideo(videoShell);return;} const play=event.target.closest("[data-exercise-play-id]"); if(play){ const exercise=exerciseCatalog().find((item)=>item.id===play.dataset.exercisePlayId); if(!exercise)return; if(state.workout){ renderWorkout(); showLayer(elements.workoutLayer); return; } state.selectedExercise=exercise; state.detailMode="selected"; startSelectedExercise(); return; } const target=event.target.closest("[data-exercise-id],[data-open-catalog],[data-show-all-exercises]"); if(!target)return; if(target.hasAttribute("data-open-catalog")){ openCatalog(); return; } if(target.hasAttribute("data-show-all-exercises")){ setExerciseCategory("all"); return; } const exercise=exerciseCatalog().find((item)=>item.id===target.dataset.exerciseId); if(exercise)openExerciseDetail(exercise,"selected"); });
elements.catalogGrid?.addEventListener("click",(event)=>{ if(consumeAdminExerciseImageClick(event))return; const videoShell=event.target.closest("[data-exercise-video-shell]"); if(videoShell){event.preventDefault();event.stopPropagation();toggleExerciseVideo(videoShell);return;} const exercise=exerciseCatalog().find((item)=>item.id===event.target.closest("[data-catalog-exercise-id]")?.dataset.catalogExerciseId); if(exercise)openExerciseDetail(exercise,"catalog"); });
byId("wellnessCatalogClose")?.addEventListener("click",hideLayers);
byId("wellnessExerciseDetailClose")?.addEventListener("click",()=>{ if(state.detailMode==="catalog")openCatalog(); else hideLayers(); });
byId("wellnessExerciseInfoOpen")?.addEventListener("click",openExerciseInfo);
byId("wellnessExerciseInfoClose")?.addEventListener("click",()=>openExerciseDetail(state.selectedExercise,state.detailMode));
byId("wellnessExerciseAdminClose")?.addEventListener("click",hideLayers);
elements.adminFill?.addEventListener("click",()=>void fillMissingExerciseDefinitions());
elements.adminCreate?.addEventListener("click",()=>void createExercisesWithLuna());
elements.detailStart?.addEventListener("click",()=>{ if(state.detailMode==="catalog")void addSelectedExercise(); else startSelectedExercise(); });
elements.detailGoal?.addEventListener("click",()=>openGoal({editing:true}));
elements.detailDelete?.addEventListener("click",()=>void deleteSelectedExercise());
elements.detailGenerate?.addEventListener("click",()=>void generateSelectedExerciseImages());
[elements.exerciseGrid,elements.catalogGrid].filter(Boolean).forEach((surface)=>{
  surface.addEventListener("pointerdown",beginAdminExerciseImageHold,{passive:true});
  surface.addEventListener("pointermove",moveAdminExerciseImageHold,{passive:true});
  surface.addEventListener("pointerup",endAdminExerciseImageHold,{passive:true});
  surface.addEventListener("pointercancel",endAdminExerciseImageHold,{passive:true});
  surface.addEventListener("pointerleave",endAdminExerciseImageHold,{passive:true});
});
elements.detailFrame?.addEventListener("pointerdown",beginAdminExerciseVideoHold);
elements.detailFrame?.addEventListener("pointermove",moveAdminExerciseVideoHold,{passive:true});
elements.detailFrame?.addEventListener("pointerup",()=>endAdminExerciseVideoHold(true),{passive:true});
elements.detailFrame?.addEventListener("pointercancel",()=>endAdminExerciseVideoHold(false),{passive:true});
elements.detailFrame?.addEventListener("pointerleave",()=>endAdminExerciseVideoHold(false),{passive:true});
elements.detailFrame?.addEventListener("contextmenu",(event)=>{if(state.isAdmin)event.preventDefault();});
elements.detailFrame?.addEventListener("click",(event)=>{ if(consumeAdminExerciseImageClick(event))return; toggleExerciseVideo(elements.detailFrame); });
elements.detailVideoInput?.addEventListener("change",()=>{ const file=elements.detailVideoInput.files?.[0]; if(file)void uploadSelectedExerciseVideo(file); });
elements.phaseProgress?.addEventListener("click",()=>toggleExerciseVideo(elements.phaseProgress));
elements.activeWorkoutImage?.closest("[data-fixed-exercise-video-shell]")?.addEventListener("click",(event)=>{event.stopPropagation();toggleExerciseVideo(event.currentTarget);});
byId("wellnessGoalClose")?.addEventListener("click",()=>openExerciseDetail(state.selectedExercise,state.detailMode));
elements.goalForm?.addEventListener("click",(event)=>{ const weekday=event.target.closest("[data-exercise-weekday]"); if(weekday){ toggleExerciseGoalWeekday(weekday.dataset.exerciseWeekday); return; } const adjust=event.target.closest("[data-goal-adjust]"); if(adjust)adjustExerciseGoalValue(adjust.dataset.goalAdjust,adjust.dataset.direction); });
elements.goalForm?.addEventListener("submit",submitExerciseGoal);
byId("wellnessWorkoutResume")?.addEventListener("click",()=>{ renderWorkout(); showLayer(elements.workoutLayer); });
byId("wellnessWorkoutBack")?.addEventListener("click",hideLayers);
elements.workoutPrimary?.addEventListener("click",()=>void handleWorkoutPrimary());
elements.phaseRepsDecrease?.addEventListener("click",()=>changeWorkoutSeriesReps(-1));
elements.phaseRepsIncrease?.addEventListener("click",()=>changeWorkoutSeriesReps(1));
elements.workoutFinish?.addEventListener("click",openFinish);
elements.repsForm?.addEventListener("submit",saveSeries);
byId("wellnessRepsDecrease")?.addEventListener("click",()=>changeRepsAmount(-1));
byId("wellnessRepsIncrease")?.addEventListener("click",()=>changeRepsAmount(1));
byId("wellnessRepsCancel")?.addEventListener("click",()=>showLayer(elements.workoutLayer));
byId("wellnessRepsBack")?.addEventListener("click",()=>showLayer(elements.workoutLayer));
elements.finishForm?.addEventListener("submit",finishWorkout);
byId("wellnessFinishCancel")?.addEventListener("click",()=>showLayer(elements.workoutLayer));
byId("wellnessFinishBack")?.addEventListener("click",()=>showLayer(elements.workoutLayer));
elements.discardWorkout?.addEventListener("click",()=>void discardWorkout());
elements.distanceInput?.addEventListener("input",()=>{ if(state.workout)elements.finishQuestion.textContent=`Deseja adicionar ${String(state.workout.exerciseName||"atividade").toLowerCase()} de ${Math.max(0,Math.trunc(Number(elements.distanceInput.value||0)||0))} metros?`; });
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
  state.ticker=window.setInterval(()=>{
    if(document.hidden||!modal?.classList.contains("active")||!state.workout)return;
    renderWorkout();
    refreshExerciseProgress();
    if(!elements.detail?.hidden&&state.detailMode==="selected")updateExerciseProgressDetail();
  },2000);
window.addEventListener("pagehide",()=>{ if(state.workout)void saveWorkoutProgress().catch(()=>{}); });
window.addEventListener("online",()=>void syncOfflineWorkouts());
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible"&&navigator.onLine!==false)void syncOfflineWorkouts(); });
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
