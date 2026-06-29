import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Toaster, toast } from "sonner";
import {
  Check, Plus, Home, CalendarDays, RefreshCw, Clock,
  ChevronRight, ArrowLeft, X, Bell, Moon, HelpCircle, LogOut,
  Pencil, Link2, UtensilsCrossed, Droplets, Sofa, BedDouble,
  UserRound, Heart, Leaf, Monitor, Trash2, Copy, Share2,
  ChevronLeft, Sparkles, Tv, BookOpen, Shirt, Coffee, Wind,
  ShoppingBasket, Baby, Dumbbell,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: string; title: string; room: string; duration: string;
  done: boolean; doneBy?: string; doneAt?: string; claimed?: string; planned?: boolean;
  interval?: number; // days between recurrences
}
interface RoutineTask { id: string; title: string; done: boolean }
interface Routine {
  id: string; name: string; trigger: string; tasks: RoutineTask[];
  doneInWindow: number; windowSize: number; windowLabel: string; hint: string;
}
interface Room {
  id: string; name: string; type: string;
  iconKey: string; color: string;
  hint: string; owner?: string; taskIds: string[];
}
type Tab = "vandaag" | "huis" | "routines" | "samen";

// ─── Icon palet ───────────────────────────────────────────────────────────────

interface IconOption { key: string; icon: React.ReactNode; iconLg: React.ReactNode; color: string; label: string; defaultName: string }

const ICONS: IconOption[] = [
  { key:"utensils",  icon:<UtensilsCrossed size={18}/>, iconLg:<UtensilsCrossed size={40}/>, color:"#B8924A", label:"Keuken",      defaultName:"Keuken"       },
  { key:"droplets",  icon:<Droplets size={18}/>,        iconLg:<Droplets size={40}/>,        color:"#5A8FA8", label:"Badkamer",    defaultName:"Badkamer"     },
  { key:"sofa",      icon:<Sofa size={18}/>,            iconLg:<Sofa size={40}/>,            color:"#8B6EA8", label:"Woonkamer",   defaultName:"Woonkamer"    },
  { key:"bed",       icon:<BedDouble size={18}/>,       iconLg:<BedDouble size={40}/>,       color:"#496E46", label:"Slaapkamer",  defaultName:"Slaapkamer"   },
  { key:"monitor",   icon:<Monitor size={18}/>,         iconLg:<Monitor size={40}/>,         color:"#7A6448", label:"Kantoor",     defaultName:"Kantoor"      },
  { key:"leaf",      icon:<Leaf size={18}/>,            iconLg:<Leaf size={40}/>,            color:"#4E7A40", label:"Tuin",        defaultName:"Tuin"         },
  { key:"home",      icon:<Home size={18}/>,            iconLg:<Home size={40}/>,            color:"#7A7068", label:"Hal",         defaultName:"Hal"          },
  { key:"tv",        icon:<Tv size={18}/>,              iconLg:<Tv size={40}/>,              color:"#5A6A7A", label:"TV-kamer",    defaultName:"TV-kamer"     },
  { key:"book",      icon:<BookOpen size={18}/>,        iconLg:<BookOpen size={40}/>,        color:"#7A5A48", label:"Studeerkamer",defaultName:"Studeerkamer" },
  { key:"shirt",     icon:<Shirt size={18}/>,           iconLg:<Shirt size={40}/>,           color:"#8A6878", label:"Wasruimte",   defaultName:"Wasruimte"    },
  { key:"coffee",    icon:<Coffee size={18}/>,          iconLg:<Coffee size={40}/>,          color:"#9A7A5A", label:"Eetkamer",    defaultName:"Eetkamer"     },
  { key:"wind",      icon:<Wind size={18}/>,            iconLg:<Wind size={40}/>,            color:"#6A8A88", label:"Balkon",      defaultName:"Balkon"       },
  { key:"basket",    icon:<ShoppingBasket size={18}/>,  iconLg:<ShoppingBasket size={40}/>,  color:"#8A7A4A", label:"Berging",     defaultName:"Berging"      },
  { key:"dumbbell",  icon:<Dumbbell size={18}/>,        iconLg:<Dumbbell size={40}/>,        color:"#6A7A5A", label:"Fitnessruimte",defaultName:"Fitnessruimte"},
  { key:"baby",      icon:<Baby size={18}/>,            iconLg:<Baby size={40}/>,            color:"#B88A8A", label:"Kinderkamer", defaultName:"Kinderkamer"  },
  { key:"sparkles",  icon:<Sparkles size={18}/>,        iconLg:<Sparkles size={40}/>,        color:"#9A8A6A", label:"Overig",      defaultName:"Overig"       },
];

const ICON_BY_KEY = Object.fromEntries(ICONS.map(i => [i.key, i]));

// Legacy lookup for type-based rooms (backwards compat)
const TYPE_TO_ICON: Record<string,string> = {
  keuken:"utensils", badkamer:"droplets", woonkamer:"sofa",
  slaapkamer:"bed",  kantoor:"monitor",   tuin:"leaf", overig:"sparkles",
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const INITIAL_ROOMS: Room[] = [
  { id:"keuken",    name:"Keuken",    type:"keuken",    iconKey:"utensils", color:"#B8924A", hint:"Waarschijnlijk weer toe aan een beurt", taskIds:["t1","t5","t10"] },
  { id:"badkamer",  name:"Badkamer",  type:"badkamer",  iconKey:"droplets", color:"#5A8FA8", hint:"Nog even goed", owner:"Bram",           taskIds:["t3","t6","t8"] },
  { id:"woonkamer", name:"Woonkamer", type:"woonkamer", iconKey:"sofa",     color:"#8B6EA8", hint:"Waarschijnlijk weer toe",               taskIds:["t2","t4","t7"] },
  { id:"slaapkamer",name:"Slaapkamer",type:"slaapkamer",iconKey:"bed",      color:"#496E46", hint:"Nog even goed",                         taskIds:["t9"] },
];
const INITIAL_TASKS: Task[] = [
  { id:"t1", title:"Afwas doen",          room:"Keuken",    duration:"10 min", done:false, planned:true },
  { id:"t2", title:"Stofzuigen",          room:"Woonkamer", duration:"20 min", done:false, planned:true },
  { id:"t3", title:"Wasmachine aanzetten",room:"Badkamer",  duration:"5 min",  done:true,  doneBy:"Sanne", doneAt:"08:42", planned:true },
  { id:"t4", title:"Planten water geven", room:"Woonkamer", duration:"5 min",  done:false, planned:true },
  { id:"t5", title:"Aanrecht afnemen",    room:"Keuken",    duration:"5 min",  done:false },
  { id:"t6", title:"Toilet schoonmaken",  room:"Badkamer",  duration:"10 min", done:false },
  { id:"t7", title:"Stof afnemen",        room:"Woonkamer", duration:"15 min", done:false },
  { id:"t8", title:"Spiegel schoonmaken", room:"Badkamer",  duration:"5 min",  done:false },
  { id:"t9", title:"Bed verschonen",      room:"Slaapkamer",duration:"15 min", done:false },
  { id:"t10",title:"Vloer dweilen",       room:"Keuken",    duration:"15 min", done:false },
];
const INITIAL_ROUTINES: Routine[] = [
  { id:"ro1", name:"Ochtendroutine", trigger:"'s ochtends",
    tasks:[{id:"rt1",title:"Bed opmaken",done:true},{id:"rt2",title:"Planten water geven",done:false},{id:"rt3",title:"Keuken resetten",done:false}],
    doneInWindow:11, windowSize:14, windowLabel:"ochtenden", hint:"Zit lekker in je ritme" },
  { id:"ro2", name:"Avondroutine", trigger:"'s avonds",
    tasks:[{id:"rt4",title:"Afwas doen",done:false},{id:"rt5",title:"Aanrecht afnemen",done:false},{id:"rt6",title:"Vuilniszak checken",done:false}],
    doneInWindow:8, windowSize:14, windowLabel:"avonden", hint:"Gaat goed" },
  { id:"ro3", name:"Weekend schoonmaak", trigger:"Weekeinde",
    tasks:[{id:"rt7",title:"Stofzuigen",done:false},{id:"rt8",title:"Dweilen",done:false},{id:"rt9",title:"Badkamer grondig",done:false},{id:"rt10",title:"Was doen",done:false}],
    doneInWindow:5, windowSize:8, windowLabel:"weekenden", hint:"Glipt er de laatste tijd een beetje uit" },
];
const TRIGGER_OPTIONS = [
  {id:"ochtend",label:"'s Ochtends"},{id:"middag",label:"'s Middags"},
  {id:"avond",label:"'s Avonds"},{id:"weekend",label:"Weekeinde"},
  {id:"dagelijks",label:"Dagelijks"},{id:"wekelijks",label:"Wekelijks"},
];

// ─── Motion helpers ───────────────────────────────────────────────────────────

const pageIn   = { opacity:0, y:10 };
const pageTx   = { duration:0.22, ease:[0.25,0.46,0.45,0.94] as number[] };
const spring   = { type:"spring" as const, stiffness:380, damping:34 };
const stagger  = { animate:{ transition:{ staggerChildren:0.06, delayChildren:0.04 } } };
const fadeUp   = {
  initial:{ opacity:0, y:12 },
  animate:{ opacity:1, y:0, transition:{ type:"spring" as const, stiffness:400, damping:34 } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_NL = ["Zondag","Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag"];
const MON_NL = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];

function getGreeting() {
  const h = new Date().getHours();
  const d = new Date();
  const date = `${DAY_NL[d.getDay()]}, ${d.getDate()} ${MON_NL[d.getMonth()]}`;
  if (h>=6  && h<12) return { text:"Goedemorgen", sub:"Rustig aan, stap voor stap.", gradient:"linear-gradient(160deg,#F7EDD0 0%,#ECE6D5 55%,#E5DED1 100%)", date };
  if (h>=12 && h<17) return { text:"Goedemiddag", sub:"Een taak per keer.",           gradient:"linear-gradient(160deg,#D5E8CE 0%,#E5EAD8 55%,#E4DDD0 100%)", date };
  if (h>=17 && h<21) return { text:"Goedenavond", sub:"Fijn dat je er bent.",          gradient:"linear-gradient(160deg,#F2DDCA 0%,#EBE0D0 55%,#E4DDD0 100%)", date };
  return                     { text:"Goedenacht",  sub:"Stil in huis.",                gradient:"linear-gradient(160deg,#D0D8EC 0%,#DDD8E4 55%,#E4DDD0 100%)", date };
}
function nowStr() { return new Date().toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"}); }
function uid()    { return `${Date.now()}-${Math.random().toString(36).slice(2,6)}`; }

const SAGE      = "#496E46";

function intervalLabel(days: number): string {
  if (days === 1)  return "Dagelijks";
  if (days === 2)  return "Om de dag";
  if (days === 7)  return "Wekelijks";
  if (days === 14) return "Elke 2 weken";
  if (days === 30) return "Maandelijks";
  return `Elke ${days} dagen`;
}
const SHADOW    = "0 2px 20px rgba(80,65,45,0.07),0 1px 4px rgba(80,65,45,0.05)";
const SHADOW_LG = "0 6px 32px rgba(80,65,45,0.1),0 2px 8px rgba(80,65,45,0.07)";

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab]    = useState<Tab>("vandaag");
  const [tasks, setTasks]            = useState<Task[]>(INITIAL_TASKS);
  const [routines, setRoutines]      = useState<Routine[]>(INITIAL_ROUTINES);
  const [rooms, setRooms]            = useState<Room[]>(INITIAL_ROOMS);
  const [selectedRoom, setSelectedRoom] = useState<string|null>(null);
  const [showAdd,        setShowAdd]        = useState(false);
  const [showNewRoutine,   setShowNewRoutine]   = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string|null>(null);
  const [showNewRoom,    setShowNewRoom]    = useState(false);
  const [editingRoomId,  setEditingRoomId]  = useState<string|null>(null);
  const [showHousehold,  setShowHousehold]  = useState(false);
  const [showProfiel,    setShowProfiel]    = useState(false);
  const [newTaskName,    setNewTaskName]    = useState("");
  const greeting = getGreeting();

  const toggleTask = useCallback((id:string) => {
    setTasks(prev => prev.map(t => {
      if (t.id!==id) return t;
      const nowDone = !t.done;
      if (nowDone) toast.success(`${t.title} gedaan`,{description:"Zichtbaar voor Sanne."});
      else toast(`${t.title} terug op de lijst`);
      return {...t,done:nowDone,doneBy:nowDone?"Jij":undefined,doneAt:nowDone?nowStr():undefined};
    }));
  }, []);

  const toggleRoutineTask = useCallback((rId:string,tId:string) => {
    setRoutines(prev => prev.map(r => {
      if (r.id!==rId) return r;
      const updated = r.tasks.map(t=>t.id===tId?{...t,done:!t.done}:t);
      const task = r.tasks.find(t=>t.id===tId);
      if (task&&!task.done) {
        if (updated.every(t=>t.done)) toast.success(`${r.name} afgerond`,{description:r.hint});
        else toast(`${task.title} gedaan`);
      } else if (task) toast(`${task.title} terug`);
      return {...r,tasks:updated};
    }));
  }, []);

  const claimTask = useCallback((id:string) => {
    setTasks(prev => prev.map(t => {
      if (t.id!==id) return t;
      const nowClaimed = !t.claimed;
      if (nowClaimed) toast(`Jij pakt "${t.title}"`,{description:"Sanne ziet dat jij dit doet."});
      else toast(`"${t.title}" vrijgegeven`);
      return {...t,claimed:nowClaimed?"Jij":undefined};
    }));
  }, []);

  const addTask = useCallback((room?: string, interval?: number) => {
    if (!newTaskName.trim()) return;
    const desc = [
      room ? `in ${room}` : "gedeelde pool",
      interval ? `· ${intervalLabel(interval)}` : "",
    ].filter(Boolean).join(" ");
    setTasks(prev=>[...prev,{id:uid(),title:newTaskName.trim(),room:room??"Overig",duration:"—",done:false,interval}]);
    toast.success(`"${newTaskName.trim()}" toegevoegd`,{description:desc});
    setNewTaskName(""); setShowAdd(false);
  }, [newTaskName]);

  const addRoutine    = useCallback((r:Routine)                     => { setRoutines(p=>[...p,r]);                               toast.success(`"${r.name}" aangemaakt`); },[]);
  const updateRoutine = useCallback((id:string, patch:Partial<Routine>) => { setRoutines(p=>p.map(r=>r.id===id?{...r,...patch}:r)); toast("Routine bijgewerkt"); },[]);
  const deleteRoutine = useCallback((id:string)                     => { setRoutines(p=>p.filter(r=>r.id!==id));                  setEditingRoutineId(null); toast("Routine verwijderd"); },[]);
  const addRoom    = useCallback((r:Room)    => { setRooms(p=>[...p,r]);    toast.success(`"${r.name}" toegevoegd`); },[]);
  const updateRoom = useCallback((id:string,patch:Partial<Room>) => { setRooms(p=>p.map(r=>r.id===id?{...r,...patch}:r)); toast("Kamer bijgewerkt"); },[]);
  const deleteRoom = useCallback((id:string) => { setRooms(p=>p.filter(r=>r.id!==id)); setSelectedRoom(null); toast("Kamer verwijderd"); },[]);

  const plannedOpen    = tasks.filter(t=>t.planned&&!t.done);
  const plannedDone    = tasks.filter(t=>t.planned&&t.done);
  const completedToday = tasks.filter(t=>t.done);
  const sanneActivity  = tasks.filter(t=>t.done&&t.doneBy==="Sanne");
  const nav = (t:Tab) => { setSelectedRoom(null); setActiveTab(t); };

  return (
    <div className="relative w-full h-screen flex flex-col bg-background overflow-hidden">
      {/* Warm ambient light */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage:"radial-gradient(ellipse 70% 50% at 15% 10%,rgba(255,235,170,0.06) 0%,transparent 60%),radial-gradient(ellipse 60% 40% at 85% 90%,rgba(170,210,155,0.05) 0%,transparent 60%)",
      }}/>

      <Toaster position="top-center" toastOptions={{style:{
        background:"var(--card)",color:"var(--foreground)",
        border:"1px solid var(--border)",borderRadius:"0.875rem",
        fontSize:"0.875rem",fontFamily:"'Plus Jakarta Sans',sans-serif",
        boxShadow:SHADOW_LG,
      }}}/>

      {/* Nav fade — masks content as it scrolls under the nav */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-30" style={{
        height:"6rem",
        background:"linear-gradient(to top,rgba(233,226,213,0.96) 0%,rgba(233,226,213,0.6) 45%,transparent 100%)",
      }}/>

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-24 relative z-10">
        <AnimatePresence mode="wait" initial={false}>
          {activeTab==="vandaag" && (
            <motion.div key="vandaag" initial={pageIn} animate={{opacity:1,y:0,transition:pageTx}} exit={{opacity:0,y:-6}}>
              <VandaagView greeting={greeting} plannedOpen={plannedOpen} plannedDone={plannedDone}
                sanneActivity={sanneActivity} routines={routines}
                onToggleTask={toggleTask} onToggleRoutineTask={toggleRoutineTask}
                onOpenProfiel={()=>setShowProfiel(true)}/>
            </motion.div>
          )}
          {activeTab==="huis" && (
            <motion.div key="huis" initial={pageIn} animate={{opacity:1,y:0,transition:pageTx}} exit={{opacity:0,y:-6}}>
              <HuisView tasks={tasks} rooms={rooms} selectedRoom={selectedRoom}
                onSelectRoom={setSelectedRoom} onClaimTask={claimTask} onToggleTask={toggleTask}
                onNewRoom={()=>setShowNewRoom(true)} onEditRoom={id=>setEditingRoomId(id)}/>
            </motion.div>
          )}
          {activeTab==="routines" && (
            <motion.div key="routines" initial={pageIn} animate={{opacity:1,y:0,transition:pageTx}} exit={{opacity:0,y:-6}}>
              <RoutinesView routines={routines} onToggleTask={toggleRoutineTask} onNewRoutine={()=>setShowNewRoutine(true)} onEditRoutine={id=>setEditingRoutineId(id)}/>
            </motion.div>
          )}
          {activeTab==="samen" && (
            <motion.div key="samen" initial={pageIn} animate={{opacity:1,y:0,transition:pageTx}} exit={{opacity:0,y:-6}}>
              <SamenView completedToday={completedToday} onOpenHousehold={()=>setShowHousehold(true)}/>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav activeTab={activeTab} onTabChange={nav} showAdd={showAdd} onAdd={()=>setShowAdd(s=>!s)}/>

      <AnimatePresence>
        {showAdd        && <AddTaskSheet    key="add"   value={newTaskName} onChange={setNewTaskName} onAdd={(room,interval)=>addTask(room,interval)} onClose={()=>{setShowAdd(false);setNewTaskName("");}}/>}
        {showNewRoutine    && <NewRoutineSheet  key="nr"   rooms={rooms} onSave={addRoutine} onClose={()=>setShowNewRoutine(false)}/>}
        {editingRoutineId  && <EditRoutineSheet key="er"   routine={routines.find(r=>r.id===editingRoutineId)!}
            onSave={p=>{updateRoutine(editingRoutineId,p);setEditingRoutineId(null);}}
            onDelete={()=>deleteRoutine(editingRoutineId)}
            onClose={()=>setEditingRoutineId(null)}/>}
        {showNewRoom    && <NewRoomSheet    key="room"  onSave={addRoom}  onClose={()=>setShowNewRoom(false)}/>}
        {editingRoomId  && <EditRoomSheet   key="edit"  room={rooms.find(r=>r.id===editingRoomId)!}
            onSave={p=>{updateRoom(editingRoomId,p);setEditingRoomId(null);}}
            onDelete={()=>{deleteRoom(editingRoomId);setEditingRoomId(null);}}
            onClose={()=>setEditingRoomId(null)}/>}
        {showHousehold  && <HouseholdSheet  key="hs"   onClose={()=>setShowHousehold(false)}/>}
        {showProfiel    && <ProfielSheet    key="prof"  onOpenHousehold={()=>{setShowProfiel(false);setTimeout(()=>setShowHousehold(true),160);}} onClose={()=>setShowProfiel(false)}/>}
      </AnimatePresence>
    </div>
  );
}

// ─── Vandaag ──────────────────────────────────────────────────────────────────

function VandaagView({greeting,plannedOpen,plannedDone,sanneActivity,routines,onToggleTask,onToggleRoutineTask,onOpenProfiel}:{
  greeting:{text:string;sub:string;gradient:string;date:string};
  plannedOpen:Task[];plannedDone:Task[];sanneActivity:Task[];routines:Routine[];
  onToggleTask:(id:string)=>void;onToggleRoutineTask:(rId:string,tId:string)=>void;onOpenProfiel:()=>void;
}) {
  const allPlanned = [...plannedDone,...plannedOpen];
  const doneCount  = plannedDone.length;
  const total      = allPlanned.length;

  return (
    <div>
      {/* Time-aware gradient header with dot texture */}
      <div className="relative overflow-hidden" style={{background:greeting.gradient}}>
        <div className="absolute inset-0 opacity-[0.32]" style={{
          backgroundImage:"radial-gradient(circle,rgba(73,110,70,0.13) 1.5px,transparent 1.5px)",
          backgroundSize:"22px 22px",
        }}/>
        <div className="relative z-10 px-5 pt-14 pb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground mb-2 tracking-wide">{greeting.date}</p>
              <h1 className="text-[2.15rem] leading-[1.08] text-foreground font-medium" style={{fontFamily:"Lora,Georgia,serif"}}>
                {greeting.text}
              </h1>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{greeting.sub}</p>
            </div>
            <div className="flex flex-col items-center gap-2.5 flex-shrink-0 pt-1">
              {total>0 && (
                <motion.div initial={{scale:0.7,opacity:0}} animate={{scale:1,opacity:1}} transition={{...spring,delay:0.18}}>
                  <RingProgress value={doneCount/total} size={46} stroke={3.5}/>
                </motion.div>
              )}
              <motion.button onClick={onOpenProfiel} whileTap={{scale:0.88}}
                className="w-9 h-9 rounded-full bg-primary flex items-center justify-center"
                style={{boxShadow:`0 3px 14px rgba(73,110,70,0.32)`}}>
                <span className="text-sm font-semibold text-white" style={{fontFamily:"Lora,Georgia,serif"}}>B</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pt-7 pb-8 space-y-8">
        <AnimatePresence>
          {sanneActivity.length>0 && (
            <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={spring}>
              <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5" style={{background:"rgba(184,207,175,0.22)",border:"1px solid rgba(184,207,175,0.4)"}}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-sm font-bold" style={{background:"rgba(184,207,175,0.5)",color:SAGE}}>S</div>
                <div className="space-y-0.5">
                  {sanneActivity.map(t=>(
                    <p key={t.id} className="text-sm text-foreground leading-snug">
                      <span className="font-semibold">Sanne</span> heeft {t.title.toLowerCase()} gedaan
                      {t.doneAt&&<span className="text-muted-foreground"> · {t.doneAt}</span>}
                    </p>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <section>
          <Kop>Mijn dag</Kop>
          {allPlanned.length===0
            ? <Leeg icon="🌿" text="Niets op de planning. Geniet ervan."/>
            : <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-2.5">
                {allPlanned.map(task=>(
                  <motion.div key={task.id} variants={fadeUp}>
                    <TaakRij task={task} onToggle={()=>onToggleTask(task.id)}/>
                  </motion.div>
                ))}
              </motion.div>
          }
        </section>

        <section>
          <Kop>Routines van vandaag</Kop>
          <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3">
            {routines.slice(0,2).map(r=>(
              <motion.div key={r.id} variants={fadeUp}>
                <RoutineKaartCompact routine={r} onToggleTask={onToggleRoutineTask}/>
              </motion.div>
            ))}
          </motion.div>
        </section>
      </div>
    </div>
  );
}

// ─── Huis ─────────────────────────────────────────────────────────────────────

function HuisView({tasks,rooms,selectedRoom,onSelectRoom,onClaimTask,onToggleTask,onNewRoom,onEditRoom}:{
  tasks:Task[];rooms:Room[];selectedRoom:string|null;
  onSelectRoom:(id:string|null)=>void;onClaimTask:(id:string)=>void;onToggleTask:(id:string)=>void;
  onNewRoom:()=>void;onEditRoom:(id:string)=>void;
}) {
  const room = rooms.find(r=>r.id===selectedRoom);

  if (room) {
    const ic  = roomIcon(room);
    const c   = room.color || ic.color;
    const roomTasks = tasks.filter(t=>t.room===room.name);
    const open = roomTasks.filter(t=>!t.done);
    const done = roomTasks.filter(t=>t.done);
    return (
      <motion.div initial={{opacity:0,x:24}} animate={{opacity:1,x:0}} transition={spring}>
        {/* Icon-based header — no photo */}
        <div className="relative h-52 overflow-hidden flex items-center justify-center"
          style={{background:`linear-gradient(145deg,${c}1C 0%,${c}38 100%)`}}>
          {/* Large watermark icon */}
          <div style={{color:c,opacity:0.14,transform:"rotate(-6deg) scale(1)"}}>
            {ic.iconLg}
          </div>
          {/* Buttons */}
          <div className="absolute top-12 left-4 right-4 flex items-center justify-between">
            <motion.button whileTap={{scale:0.9}} onClick={()=>onSelectRoom(null)}
              aria-label="Terug naar kamers"
              className="w-9 h-9 rounded-full flex items-center justify-center bg-card/80 backdrop-blur-md shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.5)]">
              <ArrowLeft size={16} className="text-foreground" aria-hidden="true"/>
            </motion.button>
            <motion.button whileTap={{scale:0.9}} onClick={()=>onEditRoom(room.id)}
              aria-label={`${room.name} bewerken`}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-card/80 backdrop-blur-md shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.5)]">
              <Pencil size={14} className="text-foreground" aria-hidden="true"/>
            </motion.button>
          </div>
          {/* Name + owner */}
          <div className="absolute bottom-5 left-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{background:c+"28",color:c}}>{ic.icon}</div>
              <h2 className="text-[1.65rem] font-medium text-foreground leading-tight" style={{fontFamily:"Lora,Georgia,serif"}}>{room.name}</h2>
            </div>
            {room.owner&&<p className="text-muted-foreground text-xs mt-0.5 ml-[2.625rem]">Meestal {room.owner}</p>}
          </div>
        </div>

        <div className="mx-5 mt-4 px-4 py-3 rounded-2xl" style={{background:"rgba(184,207,175,0.2)",border:"1px solid rgba(184,207,175,0.36)"}}>
          <p className="text-sm leading-snug" style={{color:SAGE,fontFamily:"Lora,Georgia,serif",fontStyle:"italic"}}>{room.hint}</p>
        </div>

        <div className="px-5 pt-4 pb-8 space-y-2.5">
          {open.length===0&&done.length===0
            ? <Leeg icon="✓" text="Hier is alles bij. Niks te doen."/>
            : <>
                <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-2.5">
                  {open.map(t=><motion.div key={t.id} variants={fadeUp}><TaakRij task={t} onToggle={()=>onToggleTask(t.id)} showClaim onClaim={()=>onClaimTask(t.id)}/></motion.div>)}
                </motion.div>
                {done.map(t=><TaakRij key={t.id} task={t} onToggle={()=>onToggleTask(t.id)}/>)}
              </>
          }
        </div>
      </motion.div>
    );
  }

  return (
    <div className="px-5 pt-14 pb-8">
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.3}} className="mb-8">
        <h1 className="text-[2rem] font-medium text-foreground leading-tight" style={{fontFamily:"Lora,Georgia,serif"}}>Huis</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Wat staat er te doen?</p>
      </motion.div>
      <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-2.5">
        {rooms.map(room=>(
          <motion.div key={room.id} variants={fadeUp}>
            <KamerKaart room={room} openCount={tasks.filter(t=>t.room===room.name&&!t.done).length} onClick={()=>onSelectRoom(room.id)}/>
          </motion.div>
        ))}
        <motion.div variants={fadeUp}>
          <motion.button onClick={onNewRoom} whileTap={{scale:0.985}}
            className="w-full flex items-center gap-4 bg-card rounded-2xl px-4 py-3.5 border-2 border-dashed"
            style={{borderColor:"rgba(90,75,55,0.16)",color:"var(--muted-foreground)"}}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 bg-secondary">
              <Plus size={20} strokeWidth={1.75}/>
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-muted-foreground">Kamer toevoegen</p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5" style={{fontStyle:"italic"}}>Geef elke ruimte een plek</p>
            </div>
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ─── Routines ─────────────────────────────────────────────────────────────────

function RoutinesView({routines,onToggleTask,onNewRoutine,onEditRoutine}:{
  routines:Routine[];onToggleTask:(rId:string,tId:string)=>void;onNewRoutine:()=>void;onEditRoutine:(id:string)=>void;
}) {
  return (
    <div className="px-5 pt-14 pb-8">
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.3}} className="mb-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[2rem] font-medium text-foreground leading-tight" style={{fontFamily:"Lora,Georgia,serif"}}>Routines</h1>
            <p className="text-sm text-muted-foreground mt-1.5">Terugkerende structuur.</p>
          </div>
          <motion.button onClick={onNewRoutine} whileTap={{scale:0.9}}
            aria-label="Nieuwe routine aanmaken"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold mb-0.5"
            style={{background:"rgba(73,110,70,0.1)",color:SAGE}}>
            <Plus size={14} strokeWidth={2.5} aria-hidden="true"/> Nieuw
          </motion.button>
        </div>
      </motion.div>
      {routines.length===0
        ? <Leeg icon="🔄" text="Nog geen routines. Maak je eerste aan."/>
        : <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3.5">
            {routines.map(r=>(
              <motion.div key={r.id} variants={fadeUp}>
                <RoutineKaart routine={r} onToggleTask={onToggleTask} onEdit={()=>onEditRoutine(r.id)}/>
              </motion.div>
            ))}
          </motion.div>
      }
    </div>
  );
}

// ─── Samen ────────────────────────────────────────────────────────────────────

function SamenView({completedToday,onOpenHousehold}:{completedToday:Task[];onOpenHousehold:()=>void}) {
  return (
    <div className="px-5 pt-14 pb-8">
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.3}} className="mb-8">
        <h1 className="text-[2rem] font-medium text-foreground leading-tight" style={{fontFamily:"Lora,Georgia,serif"}}>Samen</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Wat is er vandaag gedaan?</p>
      </motion.div>

      {completedToday.length===0
        ? <Leeg icon="🤍" text="Nog niks gedaan vandaag. De dag is jong."/>
        : <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-1.5 mb-8">
            {completedToday.map((task,i)=>(
              <motion.div key={task.id} variants={fadeUp} className="flex gap-3 items-stretch">
                <div className="flex flex-col items-center pt-2 flex-shrink-0">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{background:task.doneBy==="Sanne"?"rgba(184,207,175,0.45)":"rgba(73,110,70,0.12)"}}>
                    <Check size={13} strokeWidth={2.5} style={{color:SAGE}}/>
                  </div>
                  {i<completedToday.length-1&&<div className="w-px flex-1 bg-border mt-1.5"/>}
                </div>
                <div className="flex-1 pb-3">
                  <div className="bg-card rounded-2xl px-4 py-3.5 border border-border/60" style={{boxShadow:SHADOW}}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground leading-snug">{task.title}</p>
                      <span className="text-xs font-semibold flex-shrink-0" style={{color:SAGE}}>{task.doneBy||"Jij"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{task.room}{task.doneAt&&` · ${task.doneAt}`}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
      }

      <motion.button whileTap={{backgroundColor:"rgba(0,0,0,0.02)"}} onClick={onOpenHousehold}
        className="w-full flex items-center gap-3.5 bg-card rounded-2xl px-4 py-4 border border-border/60 transition-colors"
        style={{boxShadow:SHADOW}}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:"rgba(73,110,70,0.1)"}}><Link2 size={16} style={{color:SAGE}}/></div>
        <span className="flex-1 text-sm font-semibold text-foreground text-left">Huishouden beheren</span>
        <ChevronRight size={15} className="text-muted-foreground"/>
      </motion.button>
    </div>
  );
}

// ─── TaakRij ──────────────────────────────────────────────────────────────────

function TaakRij({task,onToggle,showClaim=false,onClaim}:{task:Task;onToggle:()=>void;showClaim?:boolean;onClaim?:()=>void}) {
  return (
    <motion.div layout
      animate={{opacity:task.done?0.48:1}}
      transition={{duration:0.28}}
      className="flex items-center gap-3.5 bg-card rounded-2xl px-4 py-[0.9rem] border border-border/50"
      style={{
        boxShadow:SHADOW,
        borderLeft:!task.done&&!task.claimed?`2.5px solid rgba(73,110,70,0.18)`:"2.5px solid transparent",
      }}>
      <Checkbox checked={task.done} onToggle={onToggle} label={task.done ? `${task.title} als niet gedaan markeren` : `${task.title} afvinken`}/>
      <div className="flex-1 min-w-0">
        <motion.p animate={{color:task.done?"var(--muted-foreground)":"var(--foreground)"}}
          className={`text-[0.9375rem] font-medium leading-snug ${task.done?"line-through":""}`}>{task.title}</motion.p>
        <div className="flex items-center gap-1.5 mt-[0.3rem] flex-wrap">
          <span className="text-xs text-muted-foreground">{task.room}</span>
          {task.duration!=="—" && <span className="text-xs text-muted-foreground opacity-50">· {task.duration}</span>}
          {task.interval && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{background:"rgba(73,110,70,0.09)",color:SAGE}}>
              <RefreshCw size={8} aria-hidden="true"/> {intervalLabel(task.interval)}
            </span>
          )}
          {task.claimed&&!task.done && <span className="text-xs font-semibold ml-0.5" style={{color:SAGE}}>{task.claimed} pakt dit</span>}
        </div>
      </div>
      {showClaim&&!task.done&&!task.claimed&&onClaim&&(
        <motion.button whileTap={{scale:0.9}} onClick={onClaim}
          className="text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0 leading-none"
          style={{background:"rgba(73,110,70,0.09)",color:SAGE}}>Ik pak dit</motion.button>
      )}
    </motion.div>
  );
}

// ─── KamerKaart ───────────────────────────────────────────────────────────────

function roomIcon(room: Room) {
  return ICON_BY_KEY[room.iconKey] ?? ICON_BY_KEY[TYPE_TO_ICON[room.type]] ?? ICONS[ICONS.length-1];
}

function KamerKaart({room,openCount,onClick}:{room:Room;openCount:number;onClick:()=>void}) {
  const ic = roomIcon(room);
  const c  = room.color || ic.color;

  return (
    <motion.button
      onClick={onClick}
      whileTap={{scale:0.983}}
      transition={{type:"spring",stiffness:400,damping:30}}
      aria-label={openCount > 0 ? `${room.name}, ${openCount} ${openCount===1?"taak":"taken"} open` : `${room.name}, alles gedaan`}
      className="w-full flex items-center gap-4 bg-card text-left rounded-2xl px-4 py-3.5 border border-border/50 overflow-hidden relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.5)]"
      style={{boxShadow:SHADOW}}>

      {/* Coloured left accent bar */}
      <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
        style={{background:`linear-gradient(to bottom,${c},${c}55)`}}/>

      {/* Icon block with inner glow */}
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 relative overflow-hidden"
        style={{background:`linear-gradient(145deg,${c}1A,${c}2E)`}}>
        <div className="absolute inset-0 rounded-2xl"
          style={{background:`radial-gradient(circle at 35% 30%,${c}30 0%,transparent 68%)`}}/>
        <div className="relative" style={{color:c, transform:"scale(1.1)"}}>{ic.icon}</div>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground leading-snug"
          style={{fontFamily:"Lora,Georgia,serif",fontSize:"0.9375rem"}}>{room.name}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug truncate"
          style={{fontStyle:"italic"}}>{room.hint}</p>
        {room.owner && (
          <p className="text-[10px] mt-1 leading-none" style={{color:c,opacity:0.7}}>
            Meestal {room.owner}
          </p>
        )}
      </div>

      {/* Status — task count or all-done */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {openCount > 0 ? (
          <div className="flex flex-col items-center min-w-[1.75rem]">
            <span className="text-xl font-bold leading-none tabular-nums" style={{color:c}}>{openCount}</span>
            <span className="text-[9px] text-muted-foreground leading-none mt-0.5 font-medium">
              {openCount === 1 ? "taak" : "taken"}
            </span>
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{background:`${c}14`}}>
            <Check size={11} strokeWidth={2.5} style={{color:c,opacity:0.65}}/>
          </div>
        )}
        <ChevronRight size={15} className="text-muted-foreground/40"/>
      </div>
    </motion.button>
  );
}

// ─── RoutineKaartCompact ──────────────────────────────────────────────────────

function RoutineKaartCompact({routine,onToggleTask}:{routine:Routine;onToggleTask:(rId:string,tId:string)=>void}) {
  const done  = routine.tasks.filter(t=>t.done).length;
  const total = routine.tasks.length;
  return (
    <div className="bg-card rounded-2xl px-4 py-4 border border-border/60" style={{boxShadow:SHADOW}}>
      <div className="flex items-center gap-3.5 mb-3.5">
        <RingProgress value={done/total} size={40} stroke={3}/>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{routine.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5" style={{fontStyle:"italic",fontFamily:"Lora,Georgia,serif"}}>{routine.trigger}</p>
        </div>
        <span className="text-xs tabular-nums font-medium text-muted-foreground">{done}/{total}</span>
      </div>
      <div className="space-y-2.5">
        {routine.tasks.map(t=>(
          <motion.button key={t.id} whileTap={{scale:0.97}} onClick={()=>onToggleTask(routine.id,t.id)} className="flex items-center gap-2.5 w-full">
            <div className="w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all duration-200"
              style={{background:t.done?SAGE:"transparent",borderColor:t.done?SAGE:"rgba(107,98,90,0.32)"}}>
              {t.done&&<Check size={8} strokeWidth={3.5} className="text-white"/>}
            </div>
            <span className={`text-xs leading-snug text-left flex-1 ${t.done?"line-through text-muted-foreground":"text-foreground"}`}>{t.title}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ─── RoutineKaart ─────────────────────────────────────────────────────────────

function RoutineKaart({routine,onToggleTask,onEdit}:{routine:Routine;onToggleTask:(rId:string,tId:string)=>void;onEdit:()=>void}) {
  const [open,setOpen] = useState(false);
  const done  = routine.tasks.filter(t=>t.done).length;
  const total = routine.tasks.length;
  return (
    <div className="bg-card rounded-3xl border border-border/60 overflow-hidden" style={{boxShadow:SHADOW}}>
      <motion.button
        whileTap={{backgroundColor:"rgba(0,0,0,0.02)"}}
        onClick={()=>setOpen(!open)}
        aria-expanded={open}
        aria-label={`${routine.name} ${open?"inklappen":"uitklappen"}`}
        className="w-full flex items-center gap-4 text-left transition-colors px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[rgba(73,110,70,0.4)]"
        style={{paddingTop:"1.1rem",paddingBottom:"1.1rem"}}>
        <RingProgress value={done/total} size={50} stroke={4}/>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-foreground">{routine.name}</p>
            {done===total&&done>0&&(
              <motion.span initial={{scale:0}} animate={{scale:1}} transition={{type:"spring",stiffness:500,damping:26}}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{background:"rgba(73,110,70,0.1)",color:SAGE}}>Klaar</motion.span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{routine.trigger}</p>
          <p className="text-xs mt-1 leading-snug" style={{color:"var(--muted-foreground)",fontStyle:"italic",fontFamily:"Lora,Georgia,serif"}}>
            {routine.doneInWindow} van {routine.windowSize} {routine.windowLabel} — {routine.hint.toLowerCase()}
          </p>
        </div>
        <motion.div animate={{rotate:open?90:0}} transition={{type:"spring",stiffness:400,damping:30}}>
          <ChevronRight size={16} className="text-muted-foreground flex-shrink-0"/>
        </motion.div>
      </motion.button>
      <AnimatePresence initial={false}>
        {open&&(
          <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{type:"spring",stiffness:360,damping:34}} className="overflow-hidden">
            <div className="px-5 pb-4 pt-2 border-t border-border/40 space-y-3.5">
              {routine.tasks.map(t=>(
                <motion.div key={t.id} whileTap={{scale:0.97}} onClick={()=>onToggleTask(routine.id,t.id)} className="flex items-center gap-3 cursor-pointer">
                  <Checkbox checked={t.done} onToggle={()=>onToggleTask(routine.id,t.id)} size="md" label={t.title}/>
                  <span className={`text-sm text-left flex-1 ${t.done?"line-through text-muted-foreground":"text-foreground"}`}>{t.title}</span>
                </motion.div>
              ))}
              {/* Edit action */}
              <div className="pt-1 border-t border-border/30">
                <motion.button
                  onClick={onEdit}
                  whileTap={{scale:0.96}}
                  aria-label={`${routine.name} bewerken`}
                  className="flex items-center gap-2 text-xs font-medium py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.5)] rounded-lg px-1"
                  style={{color:"var(--muted-foreground)"}}>
                  <Pencil size={12} aria-hidden="true"/>
                  Routine bewerken
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── BottomNav ────────────────────────────────────────────────────────────────

function BottomNav({activeTab,onTabChange,showAdd,onAdd}:{activeTab:Tab;onTabChange:(t:Tab)=>void;showAdd:boolean;onAdd:()=>void}) {
  const left  = [{id:"vandaag" as Tab,label:"Vandaag",icon:(a:boolean)=><CalendarDays size={20} strokeWidth={a?2.4:1.7}/>},{id:"huis" as Tab,label:"Huis",icon:(a:boolean)=><Home size={20} strokeWidth={a?2.4:1.7}/>}];
  const right = [{id:"routines" as Tab,label:"Routines",icon:(a:boolean)=><RefreshCw size={19} strokeWidth={a?2.4:1.7}/>},{id:"samen" as Tab,label:"Samen",icon:(a:boolean)=><Heart size={19} strokeWidth={a?2.4:1.7} fill={a?"currentColor":"none"}/>}];

  const NavTab = ({tab}:{tab:typeof left[0]}) => {
    const active = activeTab===tab.id;
    return (
      <motion.button
        onClick={()=>onTabChange(tab.id)}
        role="tab"
        aria-selected={active}
        aria-label={tab.label}
        aria-current={active ? "page" : undefined}
        whileTap={{scale:0.82}}
        className="relative flex-1 flex flex-col items-center justify-center gap-1 h-full z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0"
        style={{"--tw-ring-color":"rgba(73,110,70,0.5)"} as React.CSSProperties}
      >
        {active && (
          <motion.div layoutId="nav-pill"
            className="absolute inset-x-1.5 top-2 bottom-2 rounded-xl"
            style={{background:"rgba(73,110,70,0.09)"}}
            transition={{type:"spring",stiffness:420,damping:36}}
          />
        )}
        <motion.div
          animate={{color:active?SAGE:"#85786C",y:active?-1:0}}
          transition={{type:"spring",stiffness:400,damping:30}}
          className="relative z-10"
        >
          {tab.icon(active)}
        </motion.div>
        <motion.span
          animate={{color:active?SAGE:"#85786C",fontWeight:active?600:500}}
          className="text-[10px] leading-none relative z-10"
        >
          {tab.label}
        </motion.span>
      </motion.button>
    );
  };

  return (
    <nav
      aria-label="Hoofdnavigatie"
      className="absolute bottom-0 left-0 right-0 z-40"
      style={{
        background:"rgba(254,252,247,0.94)",
        backdropFilter:"blur(24px) saturate(200%)",
        borderTop:"1px solid rgba(90,75,55,0.09)",
      }}>
      <div className="flex items-center h-[4.25rem]" role="tablist">
        {left.map(t=><NavTab key={t.id} tab={t}/>)}
        <div className="relative flex items-center justify-center w-20 flex-shrink-0" style={{marginTop:"-1.75rem"}}>
          {/* Idle pulse ring — only visible when sheet is closed */}
          <AnimatePresence>
            {!showAdd && (
              <motion.div
                key="pulse"
                className="absolute rounded-full pointer-events-none"
                style={{width:"3.625rem",height:"3.625rem",border:`2px solid ${SAGE}`}}
                initial={{scale:1,opacity:0}}
                animate={{scale:1.55,opacity:0}}
                transition={{duration:2.4,repeat:Infinity,ease:"easeOut",delay:0.8}}
              />
            )}
          </AnimatePresence>
          <motion.button onClick={onAdd}
            animate={{rotate:showAdd?45:0,backgroundColor:showAdd?"#B04535":SAGE}}
            whileTap={{scale:0.87}} whileHover={{scale:1.06}}
            transition={{type:"spring",stiffness:420,damping:26}}
            className="relative rounded-full flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[rgba(73,110,70,0.6)]"
            style={{width:"3.625rem",height:"3.625rem",boxShadow:`0 6px 28px rgba(73,110,70,0.42),0 2px 8px rgba(0,0,0,0.1),0 0 0 3.5px rgba(254,252,247,0.96)`}}
            aria-label="Toevoegen">
            <Plus size={24} className="text-white" strokeWidth={2.2}/>
          </motion.button>
        </div>
        {right.map(t=><NavTab key={t.id} tab={t}/>)}
      </div>
    </nav>
  );
}

// ─── Sheet wrapper ────────────────────────────────────────────────────────────

function Sheet({onClose,children,tall=false,labelId="sheet-title"}:{onClose:()=>void;children:React.ReactNode;tall?:boolean;labelId?:string}) {
  return (
    <>
      <motion.div
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.22}}
        className="absolute inset-0 z-40"
        style={{background:"rgba(22,18,12,0.32)",backdropFilter:"blur(6px)"}}
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}}
        transition={{type:"spring",stiffness:440,damping:42}}
        className={`absolute bottom-0 left-0 right-0 z-50 rounded-t-[2rem] px-5 pt-5 ${tall?"pb-8 max-h-[90vh] overflow-y-auto":"pb-10"} scrollbar-hide`}
        style={{background:"var(--card)",boxShadow:`0 -16px 56px rgba(80,65,45,0.14),0 -2px 10px rgba(80,65,45,0.06)`}}
        onClick={e=>e.stopPropagation()}>
        <div className="flex justify-center mb-6" aria-hidden="true">
          <div className="w-14 h-[5px] rounded-full" style={{background:"var(--muted)"}}/>
        </div>
        {children}
      </motion.div>
    </>
  );
}
function SheetHeader({title,onClose,id="sheet-title"}:{title:string;onClose:()=>void;id?:string}) {
  return (
    <div className="flex items-center justify-between mb-7">
      <h3 id={id} className="text-xl font-medium text-foreground" style={{fontFamily:"Lora,Georgia,serif"}}>{title}</h3>
      <motion.button
        whileTap={{scale:0.88}} onClick={onClose}
        aria-label="Sluiten"
        className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.5)]">
        <X size={15} className="text-muted-foreground" aria-hidden="true"/>
      </motion.button>
    </div>
  );
}

// ─── AddTaskSheet ─────────────────────────────────────────────────────────────

function AddTaskSheet({value,onChange,onAdd,onClose}:{value:string;onChange:(v:string)=>void;onAdd:(room?:string,interval?:number)=>void;onClose:()=>void}) {
  const [selectedRoom,     setSelectedRoom]     = useState<string|null>(null);
  const [herhalenAan,      setHerhalenAan]      = useState(false);
  const [intervalDagen,    setIntervalDagen]    = useState(7);

  const rooms = [
    { name:"Keuken",     icon:<UtensilsCrossed size={15} aria-hidden="true"/>, iconKey:"utensils"  },
    { name:"Badkamer",   icon:<Droplets        size={15} aria-hidden="true"/>, iconKey:"droplets"  },
    { name:"Woonkamer",  icon:<Sofa            size={15} aria-hidden="true"/>, iconKey:"sofa"      },
    { name:"Slaapkamer", icon:<BedDouble       size={15} aria-hidden="true"/>, iconKey:"bed"       },
  ];

  function handleAdd() { onAdd(selectedRoom??undefined, herhalenAan?intervalDagen:undefined); }

  return (
    <Sheet onClose={onClose}>
      <SheetHeader title="Taak toevoegen" onClose={onClose}/>
      <VeldInput autoFocus value={value} onChange={onChange} onEnter={onAdd} placeholder="Wat moet er gebeuren?"/>
      <p className="text-xs text-muted-foreground mt-3 mb-4 leading-relaxed">De taak komt in de gedeelde pool. Kies optioneel een kamer.</p>

      <div className="grid grid-cols-2 gap-2 mb-6">
        {rooms.map(r => {
          const active   = selectedRoom === r.name;
          const ic       = ICON_BY_KEY[r.iconKey];
          const color    = ic?.color ?? SAGE;
          return (
            <motion.button
              key={r.name}
              onClick={() => setSelectedRoom(active ? null : r.name)}
              whileTap={{ scale: 0.94 }}
              aria-pressed={active}
              aria-label={active ? `${r.name} deselecteren` : `${r.name} selecteren`}
              initial={{ backgroundColor:"var(--secondary)", borderColor:"rgba(0,0,0,0)" }}
              animate={{
                backgroundColor: active ? color + "18" : "var(--secondary)",
                borderColor:     active ? color + "60" : "rgba(0,0,0,0)",
              }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl border-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.5)]"
            >
              <motion.div
                animate={{ color: active ? color : "var(--muted-foreground)" }}
                transition={{ duration: 0.15 }}
                className="flex-shrink-0"
              >
                {r.icon}
              </motion.div>
              <motion.span
                animate={{
                  color:      active ? "var(--foreground)" : "var(--muted-foreground)",
                  fontWeight: active ? 600 : 500,
                }}
                transition={{ duration: 0.15 }}
                className="text-sm"
              >
                {r.name}
              </motion.span>
              {active && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="ml-auto flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: color }}
                >
                  <Check size={9} strokeWidth={3} className="text-white" aria-hidden="true"/>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Herhalen */}
      <div className="mb-6">
        <div className="flex items-center justify-between py-3.5 px-4 rounded-2xl" style={{background:"var(--secondary)"}}>
          <div className="flex items-center gap-2.5">
            <RefreshCw size={16} style={{color:herhalenAan?SAGE:"var(--muted-foreground)"}} aria-hidden="true"/>
            <span className="text-sm font-medium text-foreground">Herhalen</span>
            {herhalenAan && (
              <motion.span initial={{opacity:0,x:-4}} animate={{opacity:1,x:0}} className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{background:"rgba(73,110,70,0.12)",color:SAGE}}>
                {intervalLabel(intervalDagen)}
              </motion.span>
            )}
          </div>
          <Toggle checked={herhalenAan} onChange={setHerhalenAan} label="Taak herhalen"/>
        </div>

        <AnimatePresence initial={false}>
          {herhalenAan && (
            <motion.div
              initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}}
              exit={{height:0,opacity:0}} transition={{type:"spring",stiffness:360,damping:34}}
              className="overflow-hidden">
              <IntervalKiezer value={intervalDagen} onChange={setIntervalDagen}/>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <DubbelKnop onCancel={onClose} onConfirm={handleAdd} label="Toevoegen" disabled={!value.trim()}/>
    </Sheet>
  );
}

// ─── IntervalKiezer ───────────────────────────────────────────────────────────

const INTERVAL_PRESETS = [
  { days:1,  label:"Dagelijks"  },
  { days:2,  label:"Om de dag"  },
  { days:3,  label:"3 dagen"    },
  { days:7,  label:"Wekelijks"  },
  { days:14, label:"2 weken"    },
  { days:30, label:"Maandelijks"},
];

function IntervalKiezer({value,onChange}:{value:number;onChange:(v:number)=>void}) {
  const clamp = (n:number) => Math.min(365, Math.max(1, n));

  return (
    <div className="pt-3 px-1 space-y-4">
      {/* Stepper */}
      <div className="flex items-center justify-between gap-4 bg-card rounded-2xl px-5 py-4 border border-border/50"
        style={{boxShadow:SHADOW}}>
        <div className="text-left">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Interval</p>
          <p className="text-sm text-foreground font-semibold mt-0.5" style={{fontFamily:"Lora,Georgia,serif",fontStyle:"italic"}}>
            {intervalLabel(value)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <motion.button whileTap={{scale:0.88}}
            onClick={()=>onChange(clamp(value-1))}
            disabled={value<=1}
            aria-label="Minder dagen"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-light disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.5)]"
            style={{background:"var(--secondary)",color:"var(--foreground)"}}>
            −
          </motion.button>
          <div className="w-12 text-center">
            <motion.span
              key={value}
              initial={{scale:1.3,opacity:0}} animate={{scale:1,opacity:1}}
              transition={{type:"spring",stiffness:500,damping:28}}
              className="text-xl font-bold tabular-nums" style={{color:SAGE,display:"block"}}>
              {value}
            </motion.span>
            <span className="text-[10px] text-muted-foreground leading-none">{value===1?"dag":"dagen"}</span>
          </div>
          <motion.button whileTap={{scale:0.88}}
            onClick={()=>onChange(clamp(value+1))}
            disabled={value>=365}
            aria-label="Meer dagen"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-light disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.5)]"
            style={{background:"var(--secondary)",color:"var(--foreground)"}}>
            +
          </motion.button>
        </div>
      </div>

      {/* Preset chips */}
      <div className="grid grid-cols-3 gap-2">
        {INTERVAL_PRESETS.map(p=>{
          const active = value===p.days;
          return (
            <motion.button key={p.days}
              onClick={()=>onChange(p.days)}
              whileTap={{scale:0.94}}
              aria-pressed={active}
              initial={{backgroundColor:"var(--secondary)",borderColor:"rgba(0,0,0,0)"}}
              animate={{
                backgroundColor: active?"rgba(73,110,70,0.12)":"var(--secondary)",
                borderColor:     active?"rgba(73,110,70,0.45)":"rgba(0,0,0,0)",
              }}
              transition={{duration:0.14}}
              className="py-2.5 rounded-2xl border-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.5)]">
              <span className="text-xs font-semibold block" style={{color:active?SAGE:"var(--foreground)"}}>
                {p.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─── NewRoutineSheet ──────────────────────────────────────────────────────────

function NewRoutineSheet({rooms,onSave,onClose}:{rooms:Room[];onSave:(r:Routine)=>void;onClose:()=>void}) {
  const [step,setStep]       = useState(0);
  const [name,setName]       = useState("");
  const [trigger,setTrigger] = useState("");
  const [input,setInput]     = useState("");
  const [tasks,setTasks]     = useState<RoutineTask[]>([]);
  const [saved,setSaved]     = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  function addTask()  { if(!input.trim()) return; setTasks(p=>[...p,{id:uid(),title:input.trim(),done:false}]); setInput(""); ref.current?.focus(); }
  function save()     {
    const tLabel=TRIGGER_OPTIONS.find(t=>t.id===trigger)?.label??trigger;
    const wl=["ochtend","middag","avond"].includes(trigger)?trigger+"en":trigger==="weekend"?"weekenden":"keren";
    onSave({id:uid(),name:name.trim(),trigger:tLabel,tasks,doneInWindow:0,windowSize:14,windowLabel:wl,hint:"Pas begonnen"});
    setSaved(true); setTimeout(onClose,1500);
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center gap-1.5 justify-center mb-7">
        {[0,1].map(i=>(
          <motion.div key={i} animate={{width:step===i?"28px":"8px",backgroundColor:step>=i?SAGE:"var(--muted)"}} transition={spring} className="h-2 rounded-full"/>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {saved ? (
          <motion.div key="done" initial={{opacity:0,scale:0.85}} animate={{opacity:1,scale:1}} transition={spring}
            className="flex flex-col items-center gap-4 py-10">
            <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:"spring",stiffness:500,damping:26,delay:0.1}}
              className="w-16 h-16 rounded-full flex items-center justify-center" style={{background:SAGE,boxShadow:`0 6px 24px rgba(73,110,70,0.38)`}}>
              <Check size={28} strokeWidth={2.5} className="text-white"/>
            </motion.div>
            <p className="text-lg font-medium text-center" style={{fontFamily:"Lora,Georgia,serif"}}>"{name}" aangemaakt</p>
            <p className="text-sm text-muted-foreground text-center">Je vindt de routine terug in het overzicht.</p>
          </motion.div>
        ) : step===0 ? (
          <motion.div key="s0" initial={{opacity:0,x:16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-16}} transition={{duration:0.18}}>
            <SheetHeader title="Naam & moment" onClose={onClose}/>
            <VeldInput autoFocus value={name} onChange={setName} placeholder="Bijv. Ochtendroutine"/>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 mt-6">Wanneer</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {TRIGGER_OPTIONS.map(opt=>(
                <motion.button key={opt.id} whileTap={{scale:0.93}} onClick={()=>setTrigger(opt.id)}
                  animate={{backgroundColor:trigger===opt.id?SAGE:"var(--secondary)",color:trigger===opt.id?"#fff":"var(--muted-foreground)"}}
                  transition={{duration:0.14}} className="px-4 py-2 rounded-full text-sm font-medium">{opt.label}</motion.button>
              ))}
            </div>
            <DubbelKnop onCancel={onClose} onConfirm={()=>setStep(1)} label="Volgende" disabled={!name.trim()||!trigger}/>
          </motion.div>
        ) : (
          <motion.div key="s1" initial={{opacity:0,x:16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-16}} transition={{duration:0.18}}>
            <div className="flex items-center gap-2 mb-7">
              <motion.button whileTap={{scale:0.9}} onClick={()=>setStep(0)} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"><ChevronLeft size={16} className="text-muted-foreground"/></motion.button>
              <h3 className="text-xl font-medium text-foreground" style={{fontFamily:"Lora,Georgia,serif"}}>Taken toevoegen</h3>
            </div>
            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto scrollbar-hide">
              <AnimatePresence>
                {tasks.map(t=>(
                  <motion.div key={t.id} initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0,height:0}} transition={spring}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{background:"var(--secondary)"}}>
                    <Check size={12} strokeWidth={3} style={{color:SAGE,flexShrink:0}}/>
                    <span className="flex-1 text-sm text-foreground">{t.title}</span>
                    <motion.button whileTap={{scale:0.85}} onClick={()=>setTasks(p=>p.filter(x=>x.id!==t.id))} className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0"><X size={9} className="text-muted-foreground"/></motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="flex gap-2 mb-7">
              <input ref={ref} type="text" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()}
                placeholder="Taak omschrijving…"
                className="flex-1 rounded-2xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none text-sm"
                style={{background:"var(--secondary)",boxShadow:input?`0 0 0 2px rgba(73,110,70,0.26)`:"none"}}/>
              <motion.button whileTap={{scale:0.88}} onClick={addTask} disabled={!input.trim()}
                className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 disabled:opacity-40" style={{background:SAGE}}>
                <Plus size={17} className="text-white"/>
              </motion.button>
            </div>
            <DubbelKnop onCancel={onClose} onConfirm={save} label="Opslaan" disabled={tasks.length===0}/>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}

// ─── EditRoutineSheet ─────────────────────────────────────────────────────────

function EditRoutineSheet({routine,onSave,onDelete,onClose}:{
  routine:Routine;
  onSave:(patch:Partial<Routine>)=>void;
  onDelete:()=>void;
  onClose:()=>void;
}) {
  const [name,setName]       = useState(routine.name);
  const [trigger,setTrigger] = useState(
    TRIGGER_OPTIONS.find(o=>o.label===routine.trigger)?.id ?? "ochtend"
  );
  const [tasks,setTasks]     = useState<RoutineTask[]>(routine.tasks.map(t=>({...t})));
  const [input,setInput]     = useState("");
  const [confirm,setConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addTask() {
    if (!input.trim()) return;
    setTasks(p=>[...p,{id:uid(),title:input.trim(),done:false}]);
    setInput(""); inputRef.current?.focus();
  }

  function save() {
    if (!name.trim()) return;
    const tLabel = TRIGGER_OPTIONS.find(t=>t.id===trigger)?.label ?? routine.trigger;
    const wl = ["ochtend","middag","avond"].includes(trigger)?trigger+"en":trigger==="weekend"?"weekenden":"keren";
    onSave({name:name.trim(), trigger:tLabel, tasks, windowLabel:wl});
    onClose();
  }

  return (
    <Sheet onClose={onClose} tall>
      <SheetHeader title="Routine bewerken" onClose={onClose}/>

      {/* Naam */}
      <Kop>Naam</Kop>
      <VeldInput autoFocus value={name} onChange={setName} placeholder="Naam van de routine" ariaLabel="Naam van de routine"/>

      {/* Moment */}
      <Kop><span className="mt-5 block">Wanneer</span></Kop>
      <div className="flex flex-wrap gap-2 mb-6">
        {TRIGGER_OPTIONS.map(opt=>(
          <motion.button key={opt.id} whileTap={{scale:0.93}} onClick={()=>setTrigger(opt.id)}
            aria-pressed={trigger===opt.id}
            initial={{backgroundColor:"var(--secondary)",color:"var(--muted-foreground)"}}
            animate={{
              backgroundColor: trigger===opt.id ? SAGE : "var(--secondary)",
              color:           trigger===opt.id ? "#ffffff" : "var(--muted-foreground)",
            }}
            transition={{duration:0.14}}
            className="px-4 py-2 rounded-full text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.5)]">
            {opt.label}
          </motion.button>
        ))}
      </div>

      {/* Taken */}
      <Kop>Taken</Kop>
      <div className="space-y-2 mb-3 max-h-44 overflow-y-auto scrollbar-hide">
        <AnimatePresence>
          {tasks.map(t=>(
            <motion.div key={t.id}
              initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0,height:0}}
              transition={spring}
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{background:"var(--secondary)"}}>
              <Check size={12} strokeWidth={3} style={{color:SAGE,flexShrink:0}} aria-hidden="true"/>
              <span className="flex-1 text-sm text-foreground">{t.title}</span>
              <motion.button whileTap={{scale:0.85}} onClick={()=>setTasks(p=>p.filter(x=>x.id!==t.id))}
                aria-label={`${t.title} verwijderen`}
                className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.5)]">
                <X size={10} className="text-muted-foreground" aria-hidden="true"/>
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Taak toevoegen */}
      <div className="flex gap-2 mb-7">
        <input ref={inputRef} type="text" value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&addTask()}
          placeholder="Taak toevoegen…"
          aria-label="Nieuwe taak omschrijving"
          className="flex-1 rounded-2xl px-4 py-3 text-foreground placeholder:text-muted-foreground/70 outline-none text-sm focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.28)]"
          style={{background:"var(--secondary)",boxShadow:input?`0 0 0 2px rgba(73,110,70,0.26)`:"none"}}/>
        <motion.button whileTap={{scale:0.88}} onClick={addTask} disabled={!input.trim()}
          aria-label="Taak toevoegen"
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.5)]"
          style={{background:SAGE}}>
          <Plus size={17} className="text-white" aria-hidden="true"/>
        </motion.button>
      </div>

      {/* Opslaan / Annuleren */}
      <div className="mb-4">
        <DubbelKnop onCancel={onClose} onConfirm={save} label="Opslaan" disabled={!name.trim()||tasks.length===0}/>
      </div>

      {/* Verwijderen */}
      <AnimatePresence>
        {!confirm
          ? <motion.button key="del" whileTap={{scale:0.96}} onClick={()=>setConfirm(true)}
              aria-label={`${routine.name} verwijderen`}
              className="w-full py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50"
              style={{color:"var(--destructive)"}}>
              <Trash2 size={14} aria-hidden="true"/> Routine verwijderen
            </motion.button>
          : <motion.div key="conf" initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} className="flex gap-3">
              <motion.button whileTap={{scale:0.96}} onClick={()=>setConfirm(false)}
                className="flex-1 py-3 rounded-2xl border border-border text-foreground text-sm font-medium">
                Toch niet
              </motion.button>
              <motion.button whileTap={{scale:0.96}} onClick={onDelete}
                className="flex-1 py-3 rounded-2xl text-white text-sm font-semibold"
                style={{background:"var(--destructive)"}}>
                Ja, verwijder
              </motion.button>
            </motion.div>
        }
      </AnimatePresence>
    </Sheet>
  );
}

// ─── NewRoomSheet ─────────────────────────────────────────────────────────────

function NewRoomSheet({onSave,onClose}:{onSave:(r:Room)=>void;onClose:()=>void}) {
  const [iconKey,setIconKey] = useState("");
  const [name,setName]       = useState("");
  const [owner,setOwner]     = useState("");

  const selectedIcon = ICON_BY_KEY[iconKey];

  useEffect(() => {
    if (iconKey && !name) setName(selectedIcon?.defaultName ?? "");
  }, [iconKey]);

  function save() {
    if (!iconKey || !name.trim()) return;
    onSave({
      id:uid(), name:name.trim(), type:iconKey,
      iconKey, color:selectedIcon?.color ?? SAGE,
      hint:"Nog even goed", owner:owner.trim()||undefined, taskIds:[],
    });
    onClose();
  }

  return (
    <Sheet onClose={onClose} tall>
      <SheetHeader title="Kamer toevoegen" onClose={onClose}/>

      {/* Preview */}
      <AnimatePresence>
        {iconKey && (
          <motion.div
            initial={{opacity:0,scale:0.92,y:-6}} animate={{opacity:1,scale:1,y:0}}
            exit={{opacity:0,scale:0.92}} transition={spring}
            className="flex items-center gap-3.5 rounded-2xl px-4 py-3.5 mb-6"
            style={{background:`${selectedIcon!.color}14`,border:`1.5px solid ${selectedIcon!.color}30`}}>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{background:`${selectedIcon!.color}22`,color:selectedIcon!.color}}>
              {selectedIcon!.icon}
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">{name || selectedIcon!.defaultName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedIcon!.label}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Icon picker */}
      <Kop>Kies een icoon</Kop>
      <div className="grid grid-cols-4 gap-2 mb-6">
        {ICONS.map(ic => (
          <motion.button key={ic.key} whileTap={{scale:0.9}} onClick={()=>setIconKey(ic.key)}
            initial={{ backgroundColor:"var(--secondary)", borderColor:"rgba(0,0,0,0)", scale:1 }}
            animate={{
              backgroundColor: iconKey===ic.key ? ic.color+"22" : "var(--secondary)",
              borderColor:     iconKey===ic.key ? ic.color+"70" : "rgba(0,0,0,0)",
              scale:           iconKey===ic.key ? 1.04 : 1,
            }}
            transition={{duration:0.14}}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2">
            <div style={{color:iconKey===ic.key?ic.color:"var(--muted-foreground)"}}>{ic.icon}</div>
            <span className="text-[9px] font-medium text-muted-foreground text-center leading-tight">{ic.label}</span>
          </motion.button>
        ))}
      </div>

      <Kop>Naam</Kop>
      <VeldInput value={name} onChange={setName} placeholder="Naam van de kamer"/>

      <Kop><span className="normal-case">Voorkeur eigenaar <span style={{fontStyle:"normal",opacity:0.7}}>(optioneel)</span></span></Kop>
      <VeldInput value={owner} onChange={setOwner} placeholder="Bijv. Bram of Sanne"/>

      <div className="mt-7">
        <DubbelKnop onCancel={onClose} onConfirm={save} label="Toevoegen" disabled={!iconKey||!name.trim()}/>
      </div>
    </Sheet>
  );
}

// ─── EditRoomSheet ────────────────────────────────────────────────────────────

function EditRoomSheet({room,onSave,onDelete,onClose}:{room:Room;onSave:(p:Partial<Room>)=>void;onDelete:()=>void;onClose:()=>void}) {
  const [iconKey,setIconKey] = useState(room.iconKey);
  const [name,setName]       = useState(room.name);
  const [owner,setOwner]     = useState(room.owner??"");
  const [hint,setHint]       = useState(room.hint);
  const [confirm,setConfirm] = useState(false);
  const ic = ICON_BY_KEY[iconKey] ?? ICONS[ICONS.length-1];

  return (
    <Sheet onClose={onClose} tall>
      <SheetHeader title={`${room.name} bewerken`} onClose={onClose}/>

      <Kop>Icoon</Kop>
      <div className="grid grid-cols-4 gap-2 mb-6">
        {ICONS.map(opt=>(
          <motion.button key={opt.key} whileTap={{scale:0.9}} onClick={()=>setIconKey(opt.key)}
            animate={{
              backgroundColor: iconKey===opt.key?opt.color+"22":"var(--secondary)",
              borderColor:     iconKey===opt.key?opt.color+"70":"rgba(0,0,0,0)",
              scale:           iconKey===opt.key?1.04:1,
            }}
            transition={{duration:0.14}}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2">
            <div style={{color:iconKey===opt.key?opt.color:"var(--muted-foreground)"}}>{opt.icon}</div>
            <span className="text-[9px] font-medium text-muted-foreground text-center leading-tight">{opt.label}</span>
          </motion.button>
        ))}
      </div>

      {[["Naam",name,setName,"Naam van de kamer"],["Voorkeur eigenaar",owner,setOwner,"Bijv. Bram"],["Interval-hint",hint,setHint,"Bijv. Waarschijnlijk weer toe"]].map(([label,val,setter,ph]) => (
        <div key={label as string} className="mb-4">
          <Kop>{label as string}</Kop>
          <VeldInput value={val as string} onChange={setter as (v:string)=>void} placeholder={ph as string}/>
        </div>
      ))}

      <div className="mt-6 mb-4">
        <DubbelKnop onCancel={onClose}
          onConfirm={()=>onSave({iconKey,color:ic.color,name:name.trim(),owner:owner.trim()||undefined,hint:hint.trim()})}
          label="Opslaan" disabled={!name.trim()}/>
      </div>
      <AnimatePresence>
        {!confirm
          ? <motion.button key="del" whileTap={{scale:0.96}} onClick={()=>setConfirm(true)} className="w-full py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2" style={{color:"var(--destructive)"}}><Trash2 size={14}/> Kamer verwijderen</motion.button>
          : <motion.div key="conf" initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} className="flex gap-3">
              <motion.button whileTap={{scale:0.96}} onClick={()=>setConfirm(false)} className="flex-1 py-3 rounded-2xl border border-border text-foreground text-sm font-medium">Toch niet</motion.button>
              <motion.button whileTap={{scale:0.96}} onClick={onDelete} className="flex-1 py-3 rounded-2xl text-white text-sm font-semibold" style={{background:"var(--destructive)"}}>Ja, verwijder</motion.button>
            </motion.div>
        }
      </AnimatePresence>
    </Sheet>
  );
}

// ─── HouseholdSheet ───────────────────────────────────────────────────────────

function HouseholdSheet({onClose}:{onClose:()=>void}) {
  const [naam,setNaam]    = useState("Thuis");
  const [editing,setEdit] = useState(false);
  const [code,setCode]    = useState<string|null>(null);
  const [copied,setCopied]= useState(false);
  function genCode() { setCode(`CURA-${Math.random().toString(36).slice(2,6).toUpperCase()}`); }
  function copy()    { if(code){navigator.clipboard?.writeText(code).catch(()=>{}); setCopied(true); toast("Code gekopieerd!"); setTimeout(()=>setCopied(false),2000);} }
  return (
    <Sheet onClose={onClose} tall>
      <SheetHeader title="Huishouden" onClose={onClose}/>
      <Kop>Naam</Kop>
      <div className="flex gap-2 mb-7">
        <input value={naam} onChange={e=>setNaam(e.target.value)} disabled={!editing}
          className="flex-1 rounded-2xl px-4 py-3.5 text-foreground outline-none text-sm transition-all"
          style={{background:editing?"var(--secondary)":"var(--muted)",boxShadow:editing?`0 0 0 2px rgba(73,110,70,0.26)`:"none"}}/>
        <motion.button whileTap={{scale:0.9}} onClick={()=>{if(editing)toast("Naam opgeslagen");setEdit(!editing);}}
          aria-label={editing?"Naam opslaan":"Naam bewerken"}
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.5)]"
          style={{background:editing?SAGE:"var(--secondary)"}}>
          {editing?<Check size={15} className="text-white" aria-hidden="true"/>:<Pencil size={13} className="text-muted-foreground" aria-hidden="true"/>}
        </motion.button>
      </div>
      <Kop>Leden</Kop>
      <div className="rounded-2xl overflow-hidden mb-7" style={{background:"var(--secondary)"}}>
        {[{name:"Bram",role:"Jij",bg:"rgba(73,110,70,0.18)",color:SAGE,L:"B"},{name:"Sanne",role:"Huisgenoot",bg:"rgba(184,207,175,0.45)",color:SAGE,L:"S"}].map((m,i,arr)=>(
          <div key={m.name}>
            <div className="px-4 py-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm" style={{background:m.bg,color:m.color}}>{m.L}</div>
              <div className="flex-1"><p className="text-sm font-semibold text-foreground">{m.name}</p><p className="text-xs text-muted-foreground">{m.role}</p></div>
              {i!==0&&<motion.button whileTap={{scale:0.9}} onClick={()=>toast(`${m.name} verwijderen — binnenkort`)} className="text-xs text-muted-foreground/70 px-2.5 py-1 rounded-full border border-border">Verwijder</motion.button>}
            </div>
            {i<arr.length-1&&<div className="h-px mx-4" style={{background:"var(--border)"}}/>}
          </div>
        ))}
      </div>
      <Kop>Uitnodigen</Kop>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">Genereer een code en deel hem via WhatsApp. De uitgenodigde tikt op accepteren.</p>
      {!code
        ? <motion.button whileTap={{scale:0.97}} onClick={genCode}
            className="w-full py-4 rounded-2xl text-white text-sm font-semibold flex items-center justify-center gap-2"
            style={{background:`linear-gradient(135deg,#5A8457 0%,${SAGE} 100%)`,boxShadow:`0 5px 18px rgba(73,110,70,0.3)`}}>
            <Sparkles size={15}/> Uitnodigingscode genereren
          </motion.button>
        : <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={spring}
            className="rounded-2xl p-5 space-y-4" style={{background:"rgba(73,110,70,0.07)",border:`1px solid rgba(73,110,70,0.17)`}}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Uitnodigingscode</p>
                <p className="text-2xl font-bold tracking-[0.15em]" style={{fontFamily:"monospace",color:SAGE}}>{code}</p>
              </div>
              <motion.button whileTap={{scale:0.88}} onClick={copy}
                aria-label={copied?"Code gekopieerd":"Code kopiëren"}
                aria-live="polite"
                animate={{backgroundColor:copied?SAGE:"rgba(73,110,70,0.12)"}}
                className="w-10 h-10 rounded-2xl flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.5)]">
                {copied?<Check size={15} className="text-white" aria-hidden="true"/>:<Copy size={15} style={{color:SAGE}} aria-hidden="true"/>}
              </motion.button>
            </div>
            <div className="flex gap-2">
              <motion.button whileTap={{scale:0.95}} onClick={copy} className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5" style={{background:"rgba(73,110,70,0.1)",color:SAGE}}><Copy size={12}/> Kopieer</motion.button>
              <motion.button whileTap={{scale:0.95}} onClick={()=>toast("Gedeeld via WhatsApp (demo)")} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-1.5" style={{background:"#25D366"}}><Share2 size={12}/> WhatsApp</motion.button>
            </div>
            <motion.button whileTap={{scale:0.95}} onClick={genCode} className="w-full text-xs text-center text-muted-foreground">Nieuwe code genereren</motion.button>
          </motion.div>
      }
    </Sheet>
  );
}

// ─── ProfielSheet ─────────────────────────────────────────────────────────────

function ProfielSheet({onOpenHousehold,onClose}:{onOpenHousehold:()=>void;onClose:()=>void}) {
  const [notif,setNotif]   = useState(true);
  const [donker,setDonker] = useState(false);
  return (
    <Sheet onClose={onClose} tall>
      <div className="flex items-center gap-4 mb-7">
        <div className="w-16 h-16 rounded-[1.1rem] flex items-center justify-center flex-shrink-0"
          style={{background:`linear-gradient(135deg,#6B9968,${SAGE})`,boxShadow:`0 6px 20px rgba(73,110,70,0.28)`}}>
          <span className="text-2xl font-medium text-white" style={{fontFamily:"Lora,Georgia,serif"}}>B</span>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-medium text-foreground leading-tight" style={{fontFamily:"Lora,Georgia,serif"}}>Bram</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Thuis · 3 weken actief</p>
        </div>
        <motion.button whileTap={{scale:0.9}} onClick={()=>toast("Profiel bewerken — binnenkort")}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
          <Pencil size={13} className="text-muted-foreground"/>
        </motion.button>
      </div>

      <div className="rounded-2xl px-5 py-4 mb-7" style={{background:"rgba(184,207,175,0.2)",border:"1px solid rgba(184,207,175,0.36)"}}>
        <p className="text-sm leading-relaxed text-foreground/70" style={{fontFamily:"Lora,Georgia,serif",fontStyle:"italic"}}>
          "Je bent er al drie weken mee bezig — rustig en gestaag."
        </p>
      </div>

      <Kop>Huishouden</Kop>
      <motion.button whileTap={{backgroundColor:"rgba(0,0,0,0.02)"}} onClick={onOpenHousehold}
        className="w-full flex items-center gap-3.5 bg-secondary rounded-2xl px-4 py-3.5 mb-7 transition-colors">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:"rgba(73,110,70,0.12)"}}><Home size={16} style={{color:SAGE}}/></div>
        <div className="flex-1 text-left"><p className="text-sm font-semibold text-foreground">Thuis</p><p className="text-xs text-muted-foreground">Jij & Sanne · 2 leden</p></div>
        <ChevronRight size={15} className="text-muted-foreground"/>
      </motion.button>

      <Kop>Instellingen</Kop>
      <div className="bg-secondary rounded-2xl overflow-hidden mb-7">
        <InstRij icon={<Bell size={15}/>}     label="Meldingen"     right={<Toggle checked={notif}  label="Meldingen"     onChange={v=>{setNotif(v); toast(v?"Meldingen aan":"Meldingen uit");}}/>}/>
        <div className="h-px mx-4 bg-border"/>
        <InstRij icon={<Moon size={15}/>}     label="Donkere modus" right={<Toggle checked={donker} label="Donkere modus" onChange={v=>{setDonker(v);toast(v?"Donker aan":"Donker uit");}}/>}/>
        <div className="h-px mx-4 bg-border"/>
        <InstRij icon={<UserRound size={15}/>} label="Account"      right={<ChevronRight size={14} className="text-muted-foreground"/>} onClick={()=>toast("Account — binnenkort")}/>
      </div>

      <Kop>Meer</Kop>
      <div className="bg-secondary rounded-2xl overflow-hidden">
        <InstRij icon={<HelpCircle size={15}/>} label="Help & feedback" right={<ChevronRight size={14} className="text-muted-foreground"/>} onClick={()=>toast("Help — binnenkort")}/>
        <div className="h-px mx-4 bg-border"/>
        <InstRij icon={<LogOut size={15} style={{color:"var(--destructive)"}}/>}
          label={<span style={{color:"var(--destructive)"}}>Uitloggen</span>} right={null}
          onClick={()=>toast("Uitloggen?",{description:"Je kunt altijd terugkomen.",action:{label:"Uitloggen",onClick:()=>toast("Tot de volgende keer.")}})}/>
      </div>
      <p className="text-center text-xs text-muted-foreground mt-7">Cura · versie 0.1</p>
    </Sheet>
  );
}

// ─── Gedeelde micro-componenten ───────────────────────────────────────────────

function Checkbox({checked,onToggle,size="lg",label}:{checked:boolean;onToggle:()=>void;size?:"md"|"lg";label?:string}) {
  const dim = size==="lg"?"w-7 h-7":"w-6 h-6";
  return (
    <motion.button
      onClick={onToggle}
      role="checkbox"
      aria-checked={checked}
      aria-label={label ?? (checked ? "Taak afgevinkt" : "Taak afvinken")}
      whileTap={{scale:0.7}}
      transition={{type:"spring",stiffness:500,damping:25}}
      className={`${dim} relative flex-shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.5)] focus-visible:ring-offset-1`}>
      <motion.div
        initial={{backgroundColor:"rgba(0,0,0,0)",borderColor:"rgba(107,98,90,0.28)"}}
        animate={{backgroundColor:checked?SAGE:"rgba(0,0,0,0)",borderColor:checked?SAGE:"rgba(107,98,90,0.28)"}}
        transition={{type:"spring",stiffness:320,damping:24}}
        className="absolute inset-0 rounded-full border-2" aria-hidden="true"/>
      <AnimatePresence>
        {checked&&(
          <motion.div initial={{scale:0,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0,opacity:0}} transition={{type:"spring",stiffness:600,damping:22,delay:0.04}} className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <Check size={size==="lg"?12:10} strokeWidth={3.5} className="text-white"/>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function RingProgress({value,size=44,stroke=3}:{value:number;size?:number;stroke?:number}) {
  const r    = (size-stroke*2)/2;
  const circ = 2*Math.PI*r;
  const v    = Math.min(1,Math.max(0,value));
  // warm amber when nearly done, sage otherwise
  const col  = v>=1?"#C4A45A":v>0.7?"#7DA87A":SAGE;
  return (
    null
  );
}

function Leeg({icon,text}:{icon:string;text:string}) {
  return (
    <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:0.32,ease:[0.25,0.46,0.45,0.94]}}
      className="flex flex-col items-center gap-4 py-14 px-8 text-center rounded-2xl bg-card border border-border/50"
      style={{boxShadow:SHADOW}}>
      <span className="text-4xl select-none">{icon}</span>
      <p className="text-[0.875rem] text-muted-foreground leading-relaxed max-w-[200px]"
        style={{fontFamily:"Lora,Georgia,serif",fontStyle:"italic",lineHeight:1.65}}>{text}</p>
    </motion.div>
  );
}

/* Section heading — Lora italic, warm muted, sentence case */
function Kop({children}:{children:React.ReactNode}) {
  return <p className="text-[0.8125rem] text-muted-foreground mb-3.5 ml-1" style={{fontFamily:"Lora,Georgia,serif",fontStyle:"italic",letterSpacing:"0.01em"}}>{children}</p>;
}

function VeldInput({value,onChange,placeholder,autoFocus,onEnter,ariaLabel}:{value:string;onChange:(v:string)=>void;placeholder:string;autoFocus?:boolean;onEnter?:()=>void;ariaLabel?:string}) {
  return (
    <input
      autoFocus={autoFocus}
      type="text"
      value={value}
      onChange={e=>onChange(e.target.value)}
      onKeyDown={e=>e.key==="Enter"&&onEnter?.()}
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      className="w-full rounded-2xl px-4 py-[1rem] text-foreground placeholder:text-muted-foreground/70 outline-none text-[0.9375rem] transition-all focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.28)]"
      style={{
        background:"var(--secondary)",
        boxShadow:value?`0 0 0 2px rgba(73,110,70,0.28),0 2px 12px rgba(73,110,70,0.06)`:"none",
        transition:"box-shadow 0.18s ease",
      }}/>
  );
}

function DubbelKnop({onCancel,onConfirm,label,disabled=false}:{onCancel:()=>void;onConfirm:()=>void;label:string;disabled?:boolean}) {
  return (
    <div className="flex gap-3">
      <motion.button whileTap={{scale:0.96}} onClick={onCancel} className="flex-1 py-3.5 rounded-2xl border border-border text-foreground text-sm font-medium">Annuleren</motion.button>
      <motion.button whileTap={{scale:0.96}} onClick={onConfirm} disabled={disabled}
        className="flex-1 py-3.5 rounded-2xl text-white text-sm font-semibold disabled:opacity-35 transition-opacity"
        style={{background:`linear-gradient(135deg,#5A8457 0%,${SAGE} 100%)`,boxShadow:disabled?"none":`0 4px 16px rgba(73,110,70,0.28)`}}>{label}</motion.button>
    </div>
  );
}

function Toggle({checked,onChange,label}:{checked:boolean;onChange:(v:boolean)=>void;label?:string}) {
  return (
    <motion.button
      onClick={()=>onChange(!checked)}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      whileTap={{scale:0.9}}
      animate={{backgroundColor:checked?SAGE:"var(--muted)"}}
      transition={{duration:0.18}}
      className="relative w-11 h-6 rounded-full flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(73,110,70,0.5)] focus-visible:ring-offset-1">
      <motion.div animate={{x:checked?22:3}} transition={{type:"spring",stiffness:500,damping:30}} className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm" aria-hidden="true"/>
    </motion.button>
  );
}

function InstRij({icon,label,right,onClick}:{icon:React.ReactNode;label:React.ReactNode;right:React.ReactNode;onClick?:()=>void}) {
  const inner=(
    <div className="px-4 py-3.5 flex items-center gap-3">
      <div className="w-7 h-7 flex items-center justify-center flex-shrink-0 text-muted-foreground" aria-hidden="true">{icon}</div>
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      {right}
    </div>
  );
  return onClick
    ? <motion.button whileTap={{backgroundColor:"rgba(0,0,0,0.03)"}} onClick={onClick} className="w-full text-left">{inner}</motion.button>
    : <div>{inner}</div>;
}
