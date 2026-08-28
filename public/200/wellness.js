import { getApiUrl } from "../api.js";

const TOKEN_KEY = "turma_do_printy_token";
const PROFILE_KEY = "project_200_profile_v1";
const fatLossExercises = [
  ["walk","Caminhar","steps","Ao ar livre ou esteira","Mantenha postura alta, passos naturais e ritmo que permita respirar com controle."],
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
  { id:"calisthenics", label:"Calistenia" }
];
const EXERCISES = [...strengthExercises, ...fatLossExercises, ...calisthenicsExercises];

const byId = (id) => document.getElementById(id);
const modal = byId("wellnessModal");
const elements = {
  title:byId("wellnessTitle"), headerIcon:byId("wellnessHeaderIcon"), calories:byId("wellnessCaloriesToday"), quality:byId("wellnessQualityToday"),
  qualityFill:byId("wellnessQualityFill"), mealCount:byId("wellnessMealCount"), lunaMessage:byId("wellnessLunaMessage"), foodForm:byId("wellnessFoodForm"),
  foodInput:byId("wellnessFoodInput"), timeQuestion:byId("wellnessTimeQuestion"), foodTime:byId("wellnessFoodTime"), foodSend:byId("wellnessFoodSend"),
  nutritionStatus:byId("wellnessNutritionStatus"), mealList:byId("wellnessMealList"), exerciseGrid:byId("wellnessExerciseGrid"), exerciseCategoryName:byId("wellnessExerciseCategoryName"), workoutHistory:byId("wellnessWorkoutHistory"),
  activeWorkout:byId("wellnessActiveWorkout"), workoutName:byId("wellnessWorkoutName"), workoutCounter:byId("wellnessWorkoutCounter"), workoutDetail:byId("wellnessWorkoutDetail"),
  detail:byId("wellnessExerciseDetail"), detailCategory:byId("wellnessExerciseCategory"), detailName:byId("wellnessExerciseName"), detailEquipment:byId("wellnessExerciseEquipment"),
  detailInstructions:byId("wellnessExerciseInstructions"), detailStart:byId("wellnessExerciseStart"), goalLayer:byId("wellnessGoalLayer"), goalForm:byId("wellnessGoalForm"), goalTitle:byId("wellnessGoalTitle"),
  seriesGoalFields:byId("wellnessSeriesGoalFields"), minutesGoalFields:byId("wellnessMinutesGoalFields"), targetSeries:byId("wellnessTargetSeries"), targetReps:byId("wellnessTargetReps"),
  targetMinutes:byId("wellnessTargetMinutes"), workoutLayer:byId("wellnessWorkoutLayer"), phaseLabel:byId("wellnessPhaseLabel"), phaseName:byId("wellnessPhaseExerciseName"),
  phaseNumber:byId("wellnessPhaseNumber"), phaseUnit:byId("wellnessPhaseUnit"), phaseProgress:byId("wellnessPhaseProgressFill"), workoutPrimary:byId("wellnessWorkoutPrimary"),
  workoutFinish:byId("wellnessWorkoutFinish"), repsLayer:byId("wellnessRepsLayer"), repsForm:byId("wellnessRepsForm"), repsInput:byId("wellnessRepsInput"),
  repsQuestion:byId("wellnessRepsQuestion"), askAgainOff:byId("wellnessAskAgainOff"), finishLayer:byId("wellnessFinishLayer"), finishForm:byId("wellnessFinishForm"),
  finishQuestion:byId("wellnessFinishQuestion"), distanceField:byId("wellnessDistanceField"), distanceInput:byId("wellnessDistanceInput"), weightCard:byId("wellnessWeightCard"),
  weightCurrent:byId("wellnessWeightCurrent"), bmiSummary:byId("wellnessBmiSummary"), bmiMarker:byId("wellnessBmiMarker"), weightLayer:byId("wellnessWeightLayer"),
  weightModalCurrent:byId("wellnessWeightModalCurrent"), bmiValue:byId("wellnessBmiValue"), bmiModalMarker:byId("wellnessBmiModalMarker"), weightForm:byId("wellnessWeightForm"),
  heightInput:byId("wellnessHeightInput"), weightInput:byId("wellnessWeightInput"), weightHistory:byId("wellnessWeightHistory")
};
const phaseLayers = [elements.detail,elements.goalLayer,elements.workoutLayer,elements.repsLayer,elements.finishLayer,elements.weightLayer].filter(Boolean);
const state = { tab:"nutrition", filter:"strength", dashboard:null, selectedExercise:null, workout:null, steps:0, lastStepAt:0, motionListening:false, saveTimer:null, ticker:null, pendingMeal:"" };

function profileName(){ return String(window.localStorage.getItem(PROFILE_KEY)||document.body.dataset.profile||"Usuario").trim()||"Usuario"; }
async function apiRequest(path,options={}){ const headers={...(options.headers||{})}; const token=String(window.localStorage.getItem(TOKEN_KEY)||"").trim(); if(token)headers.Authorization=`Bearer ${token}`; const response=await fetch(getApiUrl(path),{...options,headers}); const payload=await response.json().catch(()=>({})); if(!response.ok)throw new Error(payload?.error||"Nao foi possivel concluir."); return payload; }
function showLayer(layer){ phaseLayers.forEach((item)=>{ item.hidden=item!==layer; }); }
function hideLayers(){ phaseLayers.forEach((item)=>{ item.hidden=true; }); }
function setTab(tab){ state.tab=tab==="exercises"?"exercises":"nutrition"; document.querySelectorAll("[data-wellness-tab]").forEach((button)=>button.classList.toggle("active",button.dataset.wellnessTab===state.tab)); document.querySelectorAll("[data-wellness-pane]").forEach((pane)=>pane.classList.toggle("active",pane.dataset.wellnessPane===state.tab)); const exercising=state.tab==="exercises"; elements.title.textContent=exercising?"Exercícios":"Nutrição"; elements.headerIcon.src=exercising?"/200/apps/exercicios.png":"/200/apps/nutricao.png"; }
function openWellness(tab){ setTab(tab); modal?.classList.add("active"); modal?.setAttribute("aria-hidden","false"); document.body.classList.add("modal-open"); hideLayers(); void loadDashboard(); }
function closeWellness(){ hideLayers(); modal?.classList.remove("active"); modal?.setAttribute("aria-hidden","true"); if(!document.querySelector(".workspace-modal.active"))document.body.classList.remove("modal-open"); }

function exerciseInstructions(exercise){ if(exercise.category==="calisthenics")return ["Escolha um espaço firme e livre ao seu redor.",exercise.cue,"Use apenas o peso do corpo, controle cada repetição e pare se sentir dor aguda."]; if(exercise.tracking==="series")return [`Prepare ${exercise.equipment.toLowerCase()} com uma carga confortável.`,exercise.cue,"Mantenha o movimento controlado e pare se sentir dor aguda."]; if(exercise.tracking==="steps")return ["Leve o celular com você para acompanhar os passos.",exercise.cue,"Ao finalizar, informe a distância total em metros."]; return [`Prepare ${exercise.equipment.toLowerCase()} e comece leve.`,exercise.cue,"Ao finalizar, informe a distância percorrida em metros."]; }
function currentExerciseCategory(){ return EXERCISE_CATEGORIES.find((item)=>item.id===state.filter)||EXERCISE_CATEGORIES[0]; }
function setExerciseCategory(categoryId){ state.filter=EXERCISE_CATEGORIES.some((item)=>item.id===categoryId)?categoryId:EXERCISE_CATEGORIES[0].id; renderExerciseGrid(); }
function cycleExerciseCategory(direction){ const currentIndex=Math.max(0,EXERCISE_CATEGORIES.findIndex((item)=>item.id===state.filter)); const nextIndex=(currentIndex+direction+EXERCISE_CATEGORIES.length)%EXERCISE_CATEGORIES.length; setExerciseCategory(EXERCISE_CATEGORIES[nextIndex].id); }
function renderExerciseGrid(){ const category=currentExerciseCategory(); const visible=EXERCISES.filter((item)=>item.category===category.id); if(elements.exerciseCategoryName)elements.exerciseCategoryName.textContent=category.label; elements.exerciseGrid.innerHTML=visible.map((exercise,index)=>{ const type=exercise.tracking==="series"?"Séries e movimentos":exercise.tracking==="steps"?"Passos e metros":"Minutos e metros"; return `<button class="wellness-exercise-item" type="button" data-exercise-id="${exercise.id}"><span class="wellness-exercise-number">${String(index+1).padStart(2,"0")}</span><span class="wellness-exercise-copy"><strong>${exercise.name}</strong><small>${exercise.equipment} · ${type}</small></span><span class="wellness-exercise-chevron">›</span></button>`; }).join(""); }
function openExerciseDetail(exercise){ if(state.workout){ showLayer(elements.workoutLayer); renderWorkout(); return; } state.selectedExercise=exercise; elements.detailCategory.textContent=EXERCISE_CATEGORIES.find((item)=>item.id===exercise.category)?.label||"Exercício"; elements.detailName.textContent=exercise.name; elements.detailEquipment.textContent=exercise.category==="calisthenics"?"Sem equipamento":`Equipamento: ${exercise.equipment}`; elements.detailInstructions.innerHTML=""; exerciseInstructions(exercise).forEach((text)=>{ const li=document.createElement("li"); li.textContent=text; elements.detailInstructions.appendChild(li); }); elements.detailStart.textContent=exercise.tracking==="series"?"Iniciar série":"Iniciar exercício"; showLayer(elements.detail); }
function openGoal(){ const isSeries=state.selectedExercise?.tracking==="series"; elements.goalTitle.textContent=isSeries?"Defina séries e movimentos":"Quantos minutos?"; elements.seriesGoalFields.hidden=!isSeries; elements.minutesGoalFields.hidden=isSeries; showLayer(elements.goalLayer); }

function renderMeals(){ const dashboard=state.dashboard||{}; const today=dashboard.today||{}; elements.calories.textContent=String(Math.round(Number(today.calories||0))); elements.quality.textContent=String(Math.round(Number(today.qualityScore||0))); elements.qualityFill.style.width=`${Math.max(0,Math.min(100,Number(today.qualityScore||0)))}%`; const count=Number(today.mealCount||0); elements.mealCount.textContent=count?`${count} ${count===1?"registro":"registros"} hoje`:"Nenhum alimento registrado"; elements.mealList.innerHTML=""; const meals=Array.isArray(dashboard.meals)?dashboard.meals:[]; if(!meals.length){ const empty=document.createElement("div"); empty.className="wellness-meal-empty"; empty.textContent="Sua tabela de hoje começa quando você contar para Luna o que comeu."; elements.mealList.appendChild(empty); return; } meals.forEach((meal)=>{ const article=document.createElement("article"); article.className="wellness-meal-item"; article.innerHTML=`<div><strong></strong><small></small><time></time></div><div class="wellness-meal-score"><b>${Math.round(Number(meal.calories||0))} kcal</b><span>${Math.round(Number(meal.qualityScore||0))}% qualidade</span></div>`; article.querySelector("strong").textContent=meal.description||"Alimento"; article.querySelector("small").textContent=meal.feedback||"Estimativa registrada por Luna."; article.querySelector("time").textContent=new Date(meal.consumedAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}); elements.mealList.appendChild(article); }); }
function bmiPosition(bmi){ if(!Number.isFinite(bmi))return 50; const points=[[12,4],[18.5,24],[22,50],[24.9,63],[30,86],[45,96]]; for(let i=1;i<points.length;i+=1){ if(bmi<=points[i][0]){ const [a,pa]=points[i-1], [b,pb]=points[i]; return pa+((bmi-a)/(b-a))*(pb-pa); } } return 96; }
function renderWeight(){ const wellness=state.dashboard?.wellness||{}; const current=wellness.currentWeight; const bmi=Number(wellness.bmi); const hasBmi=Number.isFinite(bmi)&&bmi>0; const weight=current?Number(current.weightKg):null; const label=weight?weight.toFixed(weight%1?1:0):"--"; elements.weightCurrent.textContent=label; elements.weightModalCurrent.textContent=label; const summary=hasBmi?`IMC ${bmi.toFixed(1)} · toque para ver histórico`:(weight?"Adicione sua altura para calcular o IMC":"Toque para adicionar peso e altura"); elements.bmiSummary.textContent=summary; elements.bmiValue.textContent=hasBmi?`IMC ${bmi.toFixed(1)}`:"Informe sua altura"; const position=`${bmiPosition(bmi)}%`; elements.bmiMarker.style.left=position; elements.bmiModalMarker.style.left=position; elements.heightInput.value=wellness.preferences?.heightCm||""; elements.weightInput.value=""; elements.weightHistory.innerHTML=""; const history=Array.isArray(wellness.weightHistory)?wellness.weightHistory:[]; if(!history.length){ elements.weightHistory.textContent="Nenhuma pesagem registrada."; return; } history.forEach((entry)=>{ const row=document.createElement("div"); row.className="wellness-weight-history-entry"; row.innerHTML=`<strong>${Number(entry.weightKg).toFixed(1)} kg</strong><span>${new Date(entry.measuredAt).toLocaleDateString("pt-BR")}</span>`; elements.weightHistory.appendChild(row); }); }
function elapsedSeconds(workout=state.workout){ const started=new Date(workout?.startedAt||"").getTime(); return Number.isFinite(started)?Math.max(0,Math.floor((Date.now()-started)/1000)):0; }
function formatTimer(seconds){ const total=Math.max(0,Math.trunc(seconds||0)), hours=Math.floor(total/3600), minutes=Math.floor((total%3600)/60), secs=total%60; return hours?`${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}:${String(secs).padStart(2,"0")}`:`${String(minutes).padStart(2,"0")}:${String(secs).padStart(2,"0")}`; }
function renderWorkoutHistory(){ if(!elements.workoutHistory)return; const workouts=Array.isArray(state.dashboard?.recentWorkouts)?state.dashboard.recentWorkouts:[]; elements.workoutHistory.innerHTML=""; if(!workouts.length){ elements.workoutHistory.innerHTML="<div class=\"wellness-meal-empty\">Nenhum treino concluído.</div>"; return; } workouts.forEach((workout)=>{ const row=document.createElement("div"); row.className="wellness-workout-history-entry"; const result=workout.trackingType==="series"?`${Number(workout.seriesCount||0)} séries · ${Number(workout.totalReps||0)} movimentos`:`${Number(workout.distanceMeters||0)} metros · ${Math.round(Number(workout.durationMinutes||0))} min`; row.innerHTML=`<div><strong></strong><small>${result}</small></div><time>${new Date(workout.completedAt||workout.startedAt).toLocaleDateString("pt-BR")}</time>`; row.querySelector("strong").textContent=workout.exerciseName||"Treino"; elements.workoutHistory.appendChild(row); }); }
function renderWorkout(){ const workout=state.workout; elements.activeWorkout.hidden=!workout; if(!workout)return; const isSeries=workout.trackingType==="series", isSteps=workout.trackingType==="steps"; elements.workoutName.textContent=workout.exerciseName||"Treino"; elements.workoutCounter.textContent=isSeries?`${Number(workout.seriesCount||0)} de ${Number(workout.targetSeries||0)} séries`:isSteps?`${state.steps||Number(workout.steps||0)} passos`:formatTimer(elapsedSeconds(workout)); elements.workoutDetail.textContent="Meta e progresso guardados no seu perfil"; elements.phaseName.textContent=workout.exerciseName||"Treino"; if(isSeries){ const done=Number(workout.seriesCount||0), target=Math.max(1,Number(workout.targetSeries||1)), reps=Math.max(1,Number(workout.targetReps||1)); elements.phaseLabel.textContent=done>=target?"Meta concluída · série extra":`Série ${done+1} de ${target}`; elements.phaseNumber.textContent=String(reps); elements.phaseUnit.textContent="movimentos nesta série"; elements.workoutPrimary.textContent=`Adicionar série de ${reps} movimentos`; elements.phaseProgress.style.width=`${Math.min(100,(done/target)*100)}%`; } else { const elapsed=elapsedSeconds(workout), targetSeconds=Math.max(60,Number(workout.targetMinutes||1)*60); elements.phaseLabel.textContent=`Meta de ${Math.round(Number(workout.targetMinutes||0))} minutos`; elements.phaseNumber.textContent=isSteps?String(state.steps||Number(workout.steps||0)):formatTimer(elapsed); elements.phaseUnit.textContent=isSteps?`${formatTimer(elapsed)} · passos registrados`:"tempo de atividade"; elements.workoutPrimary.textContent="Salvar progresso"; elements.phaseProgress.style.width=`${Math.min(100,(elapsed/targetSeconds)*100)}%`; } }
async function loadDashboard(){ try{ const payload=await apiRequest(`/api/200/wellness?profile=${encodeURIComponent(profileName())}`,{cache:"no-store"}); state.dashboard=payload?.dashboard||{}; state.workout=state.dashboard.activeWorkout||null; state.steps=Number(state.workout?.steps||0); renderMeals(); renderWeight(); renderWorkoutHistory(); renderWorkout(); if(state.workout?.trackingType==="steps")void startStepCounter(false); }catch(error){ elements.nutritionStatus.textContent=error instanceof Error?error.message:"Nao foi possivel carregar."; } }
async function startExercise(event){ event.preventDefault(); const exercise=state.selectedExercise; if(!exercise||state.workout)return; const isSeries=exercise.tracking==="series"; const targetSeries=Math.max(1,Math.trunc(Number(elements.targetSeries.value||0)||0)); const targetReps=Math.max(1,Math.trunc(Number(elements.targetReps.value||0)||0)); const targetMinutes=Math.max(1,Number(elements.targetMinutes.value||0)||0); const submit=elements.goalForm.querySelector("button[type=submit]"); submit.disabled=true; try{ const payload=await apiRequest("/api/200/exercises/start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({profile:profileName(),exerciseId:exercise.id,exerciseName:exercise.name,category:exercise.category,trackingType:exercise.tracking,equipment:exercise.equipment,targetSeries:isSeries?targetSeries:0,targetReps:isSeries?targetReps:0,targetMinutes:isSeries?0:targetMinutes})}); state.workout=payload.workout; state.steps=Number(state.workout?.steps||0); if(exercise.tracking==="steps")await startStepCounter(true); renderWorkout(); showLayer(elements.workoutLayer); }catch(error){ elements.goalForm.querySelector("p").textContent=error instanceof Error?error.message:"Nao foi possivel iniciar."; }finally{ submit.disabled=false; } }
async function saveWorkoutProgress(){ if(!state.workout||state.workout.trackingType==="series")return; const payload=await apiRequest(`/api/200/exercises/${encodeURIComponent(state.workout.id)}/progress`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({steps:state.steps,durationMinutes:elapsedSeconds(state.workout)/60})}); state.workout=payload.workout||state.workout; }
function seriesSummary(workout){ const series=Array.isArray(workout?.series)?workout.series:[]; const reps=series.map((item)=>Number(item.repetitions||0)); if(!reps.length)return "este treino sem séries"; const homogeneous=reps.every((value)=>value===reps[0]); if(reps.length===1)return `${reps[0]} movimentos`; if(homogeneous)return `${reps.length} séries de ${reps[0]} movimentos`; const tail=reps.length>1?`${reps.slice(0,-1).join(", ")} e ${reps.at(-1)}`:String(reps[0]); return `${reps.length} séries de ${tail} movimentos`; }
function openRepsConfirmation(){ const reps=Math.max(1,Number(state.workout?.targetReps||1)); elements.repsInput.value=String(reps); elements.repsQuestion.textContent=`Deseja adicionar ${reps} movimentos?`; elements.askAgainOff.checked=false; showLayer(elements.repsLayer); }
async function addSeries(repetitions){ const payload=await apiRequest(`/api/200/exercises/${encodeURIComponent(state.workout.id)}/series`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({repetitions,targetRepetitions:state.workout.targetReps})}); state.workout=payload.workout||state.workout; renderWorkout(); showLayer(elements.workoutLayer); }
async function handleWorkoutPrimary(){ if(!state.workout)return; if(state.workout.trackingType!=="series"){ await saveWorkoutProgress(); renderWorkout(); return; } const askagain=state.dashboard?.wellness?.preferences?.askagain1||"yes"; const reps=Math.max(1,Number(state.workout.targetReps||1)); if(askagain==="no"){ try{ await addSeries(reps); }catch(error){ elements.phaseUnit.textContent=error.message; } return; } openRepsConfirmation(); }
async function saveSeries(event){ event.preventDefault(); if(!state.workout)return; const reps=Math.max(1,Math.trunc(Number(elements.repsInput.value||0)||0)); const submit=elements.repsForm.querySelector("button[type=submit]"); submit.disabled=true; try{ if(elements.askAgainOff.checked){ const currentHeight=state.dashboard?.wellness?.preferences?.heightCm||null; await apiRequest("/api/200/wellness/preferences",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({profile:profileName(),heightCm:currentHeight,askagain1:"no"})}); state.dashboard.wellness.preferences.askagain1="no"; } await addSeries(reps); }catch(error){ elements.repsQuestion.textContent=error instanceof Error?error.message:"Nao foi possivel guardar."; }finally{ submit.disabled=false; } }
function openFinish(){ if(!state.workout)return; const isSeries=state.workout.trackingType==="series"; elements.distanceField.hidden=isSeries; if(isSeries){ elements.finishQuestion.textContent=`Deseja adicionar ${seriesSummary(state.workout)}?`; }else{ const meters=Math.max(0,Math.trunc(Number(elements.distanceInput.value||state.workout.distanceMeters||0))); elements.distanceInput.value=meters?String(meters):""; elements.finishQuestion.textContent=`Deseja adicionar ${String(state.workout.exerciseName||"atividade").toLowerCase()} de ${meters||"X"} metros?`; } showLayer(elements.finishLayer); }
async function finishWorkout(event){ event.preventDefault(); if(!state.workout)return; const submit=elements.finishForm.querySelector("button[type=submit]"); submit.disabled=true; try{ await saveWorkoutProgress(); const distanceMeters=state.workout.trackingType==="series"?0:Math.max(0,Math.trunc(Number(elements.distanceInput.value||0)||0)); await apiRequest(`/api/200/exercises/${encodeURIComponent(state.workout.id)}/finish`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({steps:state.steps,distanceMeters})}); stopStepCounter(); state.workout=null; state.steps=0; hideLayers(); await loadDashboard(); }catch(error){ elements.finishQuestion.textContent=error instanceof Error?error.message:"Nao foi possivel encerrar."; }finally{ submit.disabled=false; } }
function onDeviceMotion(event){ if(!state.workout||state.workout.trackingType!=="steps")return; const acceleration=event.accelerationIncludingGravity||event.acceleration; if(!acceleration)return; const magnitude=Math.sqrt((acceleration.x||0)**2+(acceleration.y||0)**2+(acceleration.z||0)**2), now=Date.now(); if(magnitude>12.2&&magnitude<24&&now-state.lastStepAt>280){ state.lastStepAt=now; state.steps+=1; renderWorkout(); if(state.steps%10===0)void saveWorkoutProgress().catch(()=>{}); } }
async function startStepCounter(requestPermission){ if(state.motionListening||!window.DeviceMotionEvent)return; try{ if(requestPermission&&typeof DeviceMotionEvent.requestPermission==="function"){ const permission=await DeviceMotionEvent.requestPermission(); if(permission!=="granted"){ elements.phaseUnit.textContent="Permita o sensor de movimento para contar os passos."; return; } } window.addEventListener("devicemotion",onDeviceMotion,{passive:true}); state.motionListening=true; state.saveTimer=window.setInterval(()=>void saveWorkoutProgress().catch(()=>{}),20000); }catch{ elements.phaseUnit.textContent="O contador automático não está disponível neste aparelho."; } }
function stopStepCounter(){ if(state.motionListening)window.removeEventListener("devicemotion",onDeviceMotion); state.motionListening=false; if(state.saveTimer)window.clearInterval(state.saveTimer); state.saveTimer=null; }
async function saveWeight(event){ event.preventDefault(); const heightCm=Number(elements.heightInput.value||0), weightKg=Number(String(elements.weightInput.value||"").replace(",",".")); if(!heightCm&&!weightKg)return; const submit=elements.weightForm.querySelector("button[type=submit]"); submit.disabled=true; try{ const askagain1=state.dashboard?.wellness?.preferences?.askagain1||"yes"; if(heightCm)await apiRequest("/api/200/wellness/preferences",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({profile:profileName(),heightCm,askagain1})}); if(weightKg){ const payload=await apiRequest("/api/200/wellness/weight",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({profile:profileName(),weightKg})}); state.dashboard=payload.dashboard||state.dashboard; }else await loadDashboard(); renderWeight(); }catch(error){ elements.bmiValue.textContent=error instanceof Error?error.message:"Nao foi possivel atualizar."; }finally{ submit.disabled=false; } }
function extractMealTime(text){ const match=String(text||"").toLowerCase().match(/(?:\b(?:as|às)\s*)?([01]?\d|2[0-3])\s*(?:h|:)\s*([0-5]\d)?/i); return match?`${String(Number(match[1])).padStart(2,"0")}:${String(Number(match[2]||0)).padStart(2,"0")}`:""; }
function mealDateAt(time){ if(!/^\d{2}:\d{2}$/.test(time||""))return null; const [hours,minutes]=time.split(":").map(Number),date=new Date(); date.setHours(hours,minutes,0,0); return date.toISOString(); }
async function submitFood(event){ event.preventDefault(); const description=String(state.pendingMeal||elements.foodInput.value||"").trim(); if(description.length<2){ elements.nutritionStatus.textContent="Conte para Luna o que você comeu."; return; } const time=elements.foodTime.value||extractMealTime(description); if(!time){ state.pendingMeal=description; elements.timeQuestion.hidden=false; elements.lunaMessage.textContent="Que horas você comeu isso? Preciso do horário antes de guardar."; elements.foodTime.focus(); return; } elements.foodSend.disabled=true; elements.nutritionStatus.textContent="Luna está estimando calorias e qualidade..."; try{ const payload=await apiRequest("/api/200/nutrition/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({profile:profileName(),description,consumedAt:mealDateAt(time)})}); state.dashboard=payload.dashboard||state.dashboard; elements.lunaMessage.textContent=payload.entry?.feedback||"Registro salvo."; elements.foodInput.value=""; elements.foodTime.value=""; state.pendingMeal=""; elements.timeQuestion.hidden=true; elements.nutritionStatus.textContent="Alimento guardado."; renderMeals(); renderWeight(); }catch(error){ elements.nutritionStatus.textContent=error instanceof Error?error.message:"Nao foi possivel analisar."; }finally{ elements.foodSend.disabled=false; } }

renderExerciseGrid();
byId("appsHomeExercisesButton")?.addEventListener("click",()=>openWellness("exercises"));
byId("appsHomeNutritionButton")?.addEventListener("click",()=>openWellness("nutrition"));
byId("wellnessCloseButton")?.addEventListener("click",closeWellness);
document.querySelectorAll("[data-wellness-tab]").forEach((button)=>button.addEventListener("click",()=>setTab(button.dataset.wellnessTab)));
byId("wellnessExerciseCategoryPrevious")?.addEventListener("click",()=>cycleExerciseCategory(-1));
byId("wellnessExerciseCategoryNext")?.addEventListener("click",()=>cycleExerciseCategory(1));
elements.exerciseGrid?.addEventListener("click",(event)=>{ const exercise=EXERCISES.find((item)=>item.id===event.target.closest("[data-exercise-id]")?.dataset.exerciseId); if(exercise)openExerciseDetail(exercise); });
byId("wellnessExerciseDetailClose")?.addEventListener("click",hideLayers);
elements.detailStart?.addEventListener("click",openGoal);
byId("wellnessGoalClose")?.addEventListener("click",()=>showLayer(elements.detail));
elements.goalForm?.addEventListener("submit",startExercise);
byId("wellnessWorkoutResume")?.addEventListener("click",()=>{ renderWorkout(); showLayer(elements.workoutLayer); });
byId("wellnessWorkoutBack")?.addEventListener("click",hideLayers);
elements.workoutPrimary?.addEventListener("click",()=>void handleWorkoutPrimary());
elements.workoutFinish?.addEventListener("click",openFinish);
elements.repsForm?.addEventListener("submit",saveSeries);
byId("wellnessRepsCancel")?.addEventListener("click",()=>showLayer(elements.workoutLayer));
byId("wellnessRepsBack")?.addEventListener("click",()=>showLayer(elements.workoutLayer));
elements.finishForm?.addEventListener("submit",finishWorkout);
byId("wellnessFinishCancel")?.addEventListener("click",()=>showLayer(elements.workoutLayer));
byId("wellnessFinishBack")?.addEventListener("click",()=>showLayer(elements.workoutLayer));
elements.distanceInput?.addEventListener("input",()=>{ if(state.workout)elements.finishQuestion.textContent=`Deseja adicionar ${String(state.workout.exerciseName||"atividade").toLowerCase()} de ${Math.max(0,Math.trunc(Number(elements.distanceInput.value||0)||0))} metros?`; });
elements.weightCard?.addEventListener("click",()=>{ renderWeight(); showLayer(elements.weightLayer); });
byId("wellnessWeightClose")?.addEventListener("click",hideLayers);
elements.weightForm?.addEventListener("submit",saveWeight);
elements.foodForm?.addEventListener("submit",submitFood);
state.ticker=window.setInterval(()=>{ if(state.workout)renderWorkout(); },1000);
window.addEventListener("pagehide",()=>{ if(state.workout)void saveWorkoutProgress().catch(()=>{}); });
window.project200Wellness={open:openWellness,close:closeWellness,exercises:EXERCISES};
