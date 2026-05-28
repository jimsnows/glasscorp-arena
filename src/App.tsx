// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";

// ── SUPABASE CLIENT ──
const SUPA_URL = "https://febslpxjssjijooiukot.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlYnNscHhqc3NqaWpvb2l1a290Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDg4MzgsImV4cCI6MjA5NTM4NDgzOH0.7dT4kRulXXmkoUkOHls0P7Eq4jna8hZlkEayW-O7PUY";
const SUPA_HEADERS = { "Content-Type":"application/json", "apikey":SUPA_KEY, "Authorization":"Bearer "+SUPA_KEY };

// ── CHARACTER URLS ──
const CHARS = {
  AZRON: "https://febslpxjssjijooiukot.supabase.co/storage/v1/object/public/characters/AZRON.png",
  ARES:  "https://febslpxjssjijooiukot.supabase.co/storage/v1/object/public/characters/ARES.png",
  SPARK: "https://febslpxjssjijooiukot.supabase.co/storage/v1/object/public/characters/SPARK.png",
  DEEP:  "https://febslpxjssjijooiukot.supabase.co/storage/v1/object/public/characters/DEEP.png",
  FLUX:  "https://febslpxjssjijooiukot.supabase.co/storage/v1/object/public/characters/FLUX.png",
  FEATURED_BG:      "https://febslpxjssjijooiukot.supabase.co/storage/v1/object/public/characters/featured-bg.png",
  VAULT_BG:         "https://febslpxjssjijooiukot.supabase.co/storage/v1/object/public/characters/vault-bg.png",
  CRYSTAL_EXOTIC:   "https://febslpxjssjijooiukot.supabase.co/storage/v1/object/public/characters/crystal-exotic.png",
  CRYSTAL_PREMIUM:  "https://febslpxjssjijooiukot.supabase.co/storage/v1/object/public/characters/crystal-premium.png",
  CRYSTAL_TOP:      "https://febslpxjssjijooiukot.supabase.co/storage/v1/object/public/characters/crystal-top.png",
};

async function sbGet(table, query=""){
  const res = await fetch(`${SUPA_URL}/rest/v1/${table}?${query}`, { headers:SUPA_HEADERS });
  if(!res.ok) return [];
  return res.json();
}
async function sbInsert(table, data){
  const res = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
    method:"POST", headers:{...SUPA_HEADERS, "Prefer":"return=representation"},
    body:JSON.stringify(data)
  });
  if(!res.ok){ console.error("sbInsert error", await res.text()); return null; }
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : rows;
}
async function sbUpdate(table, match, data){
  const params = Object.entries(match).map(([k,v])=>`${k}=eq.${v}`).join("&");
  const res = await fetch(`${SUPA_URL}/rest/v1/${table}?${params}`, {
    method:"PATCH", headers:{...SUPA_HEADERS, "Prefer":"return=representation"},
    body:JSON.stringify(data)
  });
  if(!res.ok){ console.error("sbUpdate error", await res.text()); return null; }
  return res.json();
}
async function sbDelete(table, match){
  const params = Object.entries(match).map(([k,v])=>`${k}=eq.${v}`).join("&");
  const res = await fetch(`${SUPA_URL}/rest/v1/${table}?${params}`, {
    method:"DELETE", headers:SUPA_HEADERS
  });
  return res.ok;
}
async function sbUploadImage(file, bucket="strain-media"){
  const ext = file.name.split(".").pop() || "jpg";
  const filename = `strain_${Date.now()}.${ext}`;
  const res = await fetch(`${SUPA_URL}/storage/v1/object/${bucket}/${filename}`, {
    method:"POST",
    headers:{ "apikey":SUPA_KEY, "Authorization":"Bearer "+SUPA_KEY, "Content-Type":file.type, "x-upsert":"true" },
    body: file
  });
  if(!res.ok){ console.error("Upload error", await res.text()); return null; }
  return `${SUPA_URL}/storage/v1/object/public/${bucket}/${filename}`;
}

// ── SUPABASE AUTH FUNCTIONS ──
async function sbSignUp(email, password){
  const res = await fetch(`${SUPA_URL}/auth/v1/signup`, {
    method:"POST",
    headers:{"Content-Type":"application/json","apikey":SUPA_KEY},
    body:JSON.stringify({email,password})
  });
  const data = await res.json();
  if(!res.ok) return {error:data.error_description||data.msg||"Signup failed"};
  return {data};
}
async function sbSignIn(email, password){
  const res = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
    method:"POST",
    headers:{"Content-Type":"application/json","apikey":SUPA_KEY},
    body:JSON.stringify({email,password})
  });
  const data = await res.json();
  if(!res.ok) return {error:data.error_description||data.msg||"Login failed"};
  return {data};
}
async function sbSignOut(token){
  await fetch(`${SUPA_URL}/auth/v1/logout`, {
    method:"POST",
    headers:{"Content-Type":"application/json","apikey":SUPA_KEY,"Authorization":"Bearer "+token}
  });
}
async function sbForgotPassword(email){
  const res = await fetch(`${SUPA_URL}/auth/v1/recover`, {
    method:"POST",
    headers:{"Content-Type":"application/json","apikey":SUPA_KEY},
    body:JSON.stringify({email})
  });
  return res.ok;
}
async function sbGetSession(){
  const token = localStorage.getItem("glasscorp_session");
  if(!token) return null;
  const res = await fetch(`${SUPA_URL}/auth/v1/user`, {
    headers:{"apikey":SUPA_KEY,"Authorization":"Bearer "+token}
  });
  if(!res.ok){ localStorage.removeItem("glasscorp_session"); return null; }
  const data = await res.json();
  return {user:data, token};
}
async function sbGetMemberByAuthId(authId){
  const rows = await sbGet("members", `auth_id=eq.${authId}`);
  return rows&&rows.length>0 ? dbToMember(rows[0]) : null;
}
async function sbCheckPersonameUnique(personame){
  const rows = await sbGet("members", `personame=eq.${encodeURIComponent(personame)}&select=id`);
  return !rows||rows.length===0;
}
async function sbCreateMember(authId, email, personame, avatarUrl=""){
  const id = Date.now();
  const row = {
    id, auth_id:authId, email, personame,
    name:personame, avatar_url:avatarUrl||"",
    phone:"", line_id:"",
    gmc_balance:0, total_spent:0,
    claim_history:JSON.stringify([]),
    auth_provider: email&&!email.endsWith("@glasscorp.gg")?"email":"personame",
    joined_at:new Date().toISOString()
  };
  return sbInsert("members", row);
}
function sbSignInWithGoogle(){
  const redirectTo = encodeURIComponent(window.location.origin);
  window.location.href = `${SUPA_URL}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`;
}
function sbGetTokenFromUrl(){
  const hash = window.location.hash;
  if(!hash) return null;
  const params = new URLSearchParams(hash.replace("#",""));
  const token = params.get("access_token");
  if(token){
    localStorage.setItem("glasscorp_session", token);
    localStorage.setItem("glasscorp_age_ok","1"); // auto-pass age gate for Google users
    window.history.replaceState(null,"",window.location.pathname);
  }
  return token;
}

function dbToStrain(row){
  return {
    id: row.id,
    name: row.name||"",
    type: row.type||"Hybrid",
    sativaRatio: row.sativa_ratio||50,
    thc: row.thc||0,
    cbd: row.cbd||0,
    effects: row.effects||[],
    desc: row.description||"",
    gmcCost: row.gmc_cost||0,
    stock: row.stock||0,
    tier: row.tier||"TOP",
    tag: row.tag||"",
    media: row.image_url||"",
    media2: row.image_url2||"",
    media3: row.image_url3||"",
    promo: row.promo||{active:false,label:"",discount:0},
    active: row.active!==false,
  };
}
function strainToDb(s){
  return {
    name: s.name,
    type: s.type,
    sativa_ratio: s.sativaRatio,
    thc: s.thc,
    cbd: s.cbd,
    effects: s.effects,
    description: s.desc,
    gmc_cost: s.gmcCost,
    stock: s.stock,
    tier: s.tier,
    tag: s.tag||"",
    image_url: s.media||"",
    active: true,
  };
}
function dbToMember(row){
  return {
    id: row.id,
    name: row.name||"",
    phone: row.phone||"",
    lineId: row.line_id||"",
    gmcBalance: row.gmc_balance||0,
    totalSpent: row.total_spent||0,
    claimHistory: row.claim_history||[],
    deliveryAddress: row.delivery_address||"",
    mapsLink: row.maps_link||"",
    riderPhone: row.rider_phone||"",
    countryCode: row.country_code||"+66",
    joinedAt: row.joined_at||new Date().toISOString(),
  };
}

// ── THEMES — dramatically different ──
const T = {
  base: {
    bg:"#0d0a1a", bgCard:"#13102a", bgDeep:"#080612",
    a1:"#00d4ff", a2:"#7b2fff", amber:"#e8a020",
    text:"#e8e0f0", dim:"#7a7090", border:"rgba(123,47,255,0.3)",
    glow1:"#00d4ff", glow2:"#7b2fff", name:"base"
  },
  sativa: {
    bg:"#000d1a", bgCard:"#001428", bgDeep:"#00080f",
    a1:"#00aaff", a2:"#0066cc", amber:"#00ddff",
    text:"#e8f4ff", dim:"#4a7a99", border:"rgba(0,170,255,0.45)",
    glow1:"#00aaff", glow2:"#0055bb", name:"sativa",
    particle:"spark"
  },
  indica: {
    bg:"#0a0005", bgCard:"#150008", bgDeep:"#060002",
    a1:"#cc0022", a2:"#5500aa", amber:"#ff4400",
    text:"#f5e0e0", dim:"#886060", border:"rgba(180,0,30,0.6)",
    glow1:"#cc0022", glow2:"#5500aa", name:"indica",
    particle:"ember"
  },
  hybrid: {
    bg:"#0a0010", bgCard:"#160015", bgDeep:"#060008",
    a1:"#ff1493", a2:"#cc0022", amber:"#e8a020",
    text:"#fff0f8", dim:"#997080", border:"rgba(200,0,100,0.4)",
    glow1:"#ff1493", glow2:"#cc0022", name:"hybrid",
    particle:"both"
  },
  garden: {
    bg:"#020d08", bgCard:"#041510", bgDeep:"#010804",
    a1:"#00ff88", a2:"#00cc55", amber:"#ffd700",
    text:"#e0fff0", dim:"#507060", border:"rgba(0,200,100,0.3)",
    glow1:"#00ff88", glow2:"#00cc55", name:"garden"
  }
};

function getTheme(type){
  if(!type) return T.base;
  const t=type.toLowerCase();
  if(t==="sativa") return T.sativa;
  if(t.includes("sativa")) return T.sativa;
  if(t==="indica") return T.indica;
  if(t.includes("indica")) return T.indica;
  return T.hybrid;
}

function getLabel(r){
  const s=r!=null?r:50;
  if(s>=70) return"Spark";
  if(s>=51) return"Spark Flux";
  if(s===50) return"Flux";
  if(s>=31) return"Deep Flux";
  return"Deep";
}

// ── SINGLE GLOBAL PARTICLES CANVAS (performance fix — one canvas for whole app) ──
function GlobalParticles(){
  const ref=useRef(null);
  const anim=useRef(null);
  const lastFrame=useRef(0);
  useEffect(()=>{
    const c=ref.current; if(!c) return;
    const ctx=c.getContext("2d");
    const isMobile=window.innerWidth<=768;
    // Mobile: 12 particles, no shadowBlur, slower. Desktop: 30 particles, light glow.
    const COUNT=isMobile?12:30;
    const FPS=isMobile?20:30; // throttle frame rate
    const INTERVAL=1000/FPS;
    let W,H;
    function resize(){
      W=c.width=window.innerWidth;
      H=c.height=window.innerHeight;
    }
    resize();
    window.addEventListener("resize",resize);
    const COLS=["#00d4ff","#7b2fff","#00d4ff88","#7b2fff88","#e8a02060"];
    const ps=Array.from({length:COUNT},(_,i)=>({
      x:Math.random()*window.innerWidth,
      y:Math.random()*window.innerHeight,
      vx:(Math.random()-0.5)*0.3,
      vy:-Math.random()*0.25-0.04,
      r:Math.random()*2+0.5,
      op:Math.random(),
      opDir:Math.random()>0.5?1:-1,
      col:COLS[i%COLS.length],
    }));
    function draw(ts){
      anim.current=requestAnimationFrame(draw);
      if(ts-lastFrame.current<INTERVAL) return; // throttle
      lastFrame.current=ts;
      ctx.clearRect(0,0,W,H);
      ps.forEach(p=>{
        p.x+=p.vx; p.y+=p.vy;
        p.op+=p.opDir*0.008;
        if(p.op>=1||p.op<=0) p.opDir*=-1;
        if(p.x<0)p.x=W; if(p.x>W)p.x=0;
        if(p.y<0)p.y=H; if(p.y>H){p.y=H;p.vy=-Math.abs(p.vy);}
        ctx.save();
        ctx.globalAlpha=Math.max(0,Math.min(1,p.op))*0.6;
        if(!isMobile){ctx.shadowBlur=6;ctx.shadowColor=p.col;} // skip shadowBlur on mobile
        ctx.fillStyle=p.col;
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fill();
        ctx.restore();
      });
    }
    anim.current=requestAnimationFrame(draw);
    // Pause when tab not visible — saves CPU and battery ✅
    function onVisibility(){ if(document.hidden){ cancelAnimationFrame(anim.current); } else { anim.current=requestAnimationFrame(draw); } }
    document.addEventListener("visibilitychange",onVisibility);
    return()=>{ cancelAnimationFrame(anim.current); window.removeEventListener("resize",resize); document.removeEventListener("visibilitychange",onVisibility); };
  },[]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0}}/>;
}
// Legacy stub — kept so existing JSX refs compile but renders nothing (global canvas does the work)
function Particles(){return null;}

// ── GLITCH TEXT (Sativa only) ──
// Spark (Sativa) — cyan glitch flicker, only runs when visible
function GlitchText({text,active}){
  const [g,setG]=useState(false);
  const ref=useRef(null);
  const visible=useRef(false);
  useEffect(()=>{
    if(!active) return;
    const obs=new IntersectionObserver(([e])=>{ visible.current=e.isIntersecting; },{threshold:0});
    if(ref.current) obs.observe(ref.current);
    const iv=setInterval(()=>{
      if(!visible.current) return;
      setG(true); setTimeout(()=>setG(false),120);
    },2500+Math.random()*2000);
    return()=>{ clearInterval(iv); obs.disconnect(); };
  },[active]);
  return(
    <span ref={ref} style={{position:"relative",display:"inline-block"}}>
      {text}
      {g&&<>
        <span style={{position:"absolute",top:0,left:3,color:"#00aaff",opacity:0.9,clipPath:"polygon(0 15%,100% 15%,100% 35%,0 35%)"}}>{text}</span>
        <span style={{position:"absolute",top:0,left:-3,color:"#00ffff",opacity:0.9,clipPath:"polygon(0 55%,100% 55%,100% 75%,0 75%)"}}>{text}</span>
      </>}
    </span>
  );
}

// Deep (Indica) — slow crimson pulse, only runs when visible
function PulseText({text,active}){
  const [p,setP]=useState(false);
  const ref=useRef(null);
  const visible=useRef(false);
  useEffect(()=>{
    if(!active) return;
    const obs=new IntersectionObserver(([e])=>{ visible.current=e.isIntersecting; },{threshold:0});
    if(ref.current) obs.observe(ref.current);
    const iv=setInterval(()=>{
      if(!visible.current) return;
      setP(true); setTimeout(()=>setP(false),400);
    },3000+Math.random()*2000);
    return()=>{ clearInterval(iv); obs.disconnect(); };
  },[active]);
  return(
    <span ref={ref} style={{position:"relative",display:"inline-block",
      textShadow:p?"0 0 20px #cc0022, 0 0 40px #cc002280, 0 0 2px #ff4444":"0 0 8px #cc002240",
      transition:"text-shadow 0.3s ease",color:p?"#ff4444":undefined}}>
      {text}
      {p&&<>
        <span style={{position:"absolute",top:0,left:2,color:"#cc0022",opacity:0.6,clipPath:"polygon(0 20%,100% 20%,100% 45%,0 45%)",filter:"blur(1px)"}}>{text}</span>
        <span style={{position:"absolute",top:0,left:-2,color:"#5500aa",opacity:0.5,clipPath:"polygon(0 60%,100% 60%,100% 80%,0 80%)",filter:"blur(0.5px)"}}>{text}</span>
      </>}
    </span>
  );
}

// Flux (Hybrid) — unstable color shift, only runs when visible
function FluxText({text,active}){
  const [f,setF]=useState(0);
  const ref=useRef(null);
  const visible=useRef(false);
  useEffect(()=>{
    if(!active) return;
    const obs=new IntersectionObserver(([e])=>{ visible.current=e.isIntersecting; },{threshold:0});
    if(ref.current) obs.observe(ref.current);
    const iv=setInterval(()=>{
      if(!visible.current) return;
      const r=Math.random();
      if(r<0.4){ setF(1); setTimeout(()=>setF(0),100); }
      else if(r<0.7){ setF(2); setTimeout(()=>setF(0),150); }
      else { setF(1); setTimeout(()=>{ setF(2); setTimeout(()=>setF(0),100); },90); }
    },1800+Math.random()*1500);
    return()=>{ clearInterval(iv); obs.disconnect(); };
  },[active]);
  return(
    <span ref={ref} style={{position:"relative",display:"inline-block"}}>
      {text}
      {f===1&&<>
        <span style={{position:"absolute",top:0,left:3,color:"#00aaff",opacity:0.8,clipPath:"polygon(0 10%,100% 10%,100% 40%,0 40%)"}}>{text}</span>
        <span style={{position:"absolute",top:0,left:-2,color:"#ff1493",opacity:0.6,clipPath:"polygon(0 60%,100% 60%,100% 85%,0 85%)"}}>{text}</span>
      </>}
      {f===2&&<>
        <span style={{position:"absolute",top:0,left:-3,color:"#cc0022",opacity:0.8,clipPath:"polygon(0 15%,100% 15%,100% 45%,0 45%)"}}>{text}</span>
        <span style={{position:"absolute",top:0,left:2,color:"#00ddff",opacity:0.6,clipPath:"polygon(0 55%,100% 55%,100% 80%,0 80%)"}}>{text}</span>
      </>}
    </span>
  );
}

// ── GMC COIN ──
function GMCCoin({size=24,theme}){
  // Pure CSS animation — zero JS, zero React re-renders, 100% GPU ✅
  const uid=useRef("coin"+Math.random().toString(36).slice(2,6)).current;
  // Inline the keyframe as a data URI approach won't work — inject into document head once
  if(typeof document!=="undefined"){
    const styleId="gc-coin-style";
    if(!document.getElementById(styleId)){
      const s=document.createElement("style");
      s.id=styleId;
      s.textContent=`@keyframes gc-coin-spin{0%{transform:scaleX(1)}25%{transform:scaleX(0.3)}50%{transform:scaleX(1)}75%{transform:scaleX(0.3)}100%{transform:scaleX(1)}}`;
      document.head.appendChild(s);
    }
  }
  return(
    <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",
      width:size,height:size,borderRadius:"50%",
      background:`radial-gradient(circle at 35% 35%, ${theme.amber}ff, ${theme.amber}88)`,
      boxShadow:`0 0 ${size/2}px ${theme.amber}80, inset 0 1px 2px rgba(255,255,255,0.4)`,
      fontSize:size*0.45,flexShrink:0,fontWeight:900,color:"rgba(0,0,0,0.7)",
      animation:"gc-coin-spin 2.8s ease-in-out infinite",
      willChange:"transform"}}>
      G
    </span>
  );
}

// ── GLOW BUTTON ──
function GBtn({children,onClick,color,outline,style}){
  const [h,setH]=useState(false);
  return(
    <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{background:outline?"transparent":(h?color+"22":"transparent"),border:`1px solid ${color}`,color:color,padding:"13px 28px",cursor:"pointer",fontSize:11,fontWeight:700,letterSpacing:3,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",boxShadow:h?`0 0 20px ${color}60,0 0 40px ${color}20`:`0 0 8px ${color}20`,transition:"all 0.25s",...style}}>
      {children}
    </button>
  );
}

// ── DATA ──
const STRAINS=[
  {id:1,name:"Pattaya Sunrise",type:"Sativa",sativaRatio:95,thc:24,cbd:0.5,effects:["Euphoric","Creative","Energetic"],desc:"A tropical sativa born for beach days — citrusy, energizing, and utterly euphoric.",gmcCost:450,stock:15,tier:"EXOTIC",tag:"MOST CLAIMED"},
  {id:2,name:"Purple Thai Dream",type:"Indica",sativaRatio:5,thc:28,cbd:0.8,effects:["Relaxed","Sleepy","Happy"],desc:"Deep grape and berry notes melt into full-body relaxation perfect for Pattaya nights.",gmcCost:520,stock:8,tier:"EXOTIC",tag:"LIMITED"},
  {id:3,name:"Mango Kush Thai",type:"Hybrid",sativaRatio:50,thc:21,cbd:1.2,effects:["Uplifted","Focused","Giggly"],desc:"Sweet mango meets earthy kush in this balanced hybrid — best enjoyed at sunset.",gmcCost:390,stock:20,tier:"PREMIUM",tag:"LOCAL BATCH"},
  {id:4,name:"OG Kush",type:"Hybrid",sativaRatio:45,thc:22,cbd:0.3,effects:["Relaxed","Happy","Euphoric"],desc:"A classic hybrid known for strong relaxation and mood-lifting effects.",gmcCost:380,stock:12,tier:"PREMIUM",tag:""},
  {id:5,name:"Blue Dream",type:"Sativa",sativaRatio:80,thc:18,cbd:0.1,effects:["Energetic","Creative","Uplifted"],desc:"Popular sativa delivering balanced full-body relaxation with gentle cerebral invigoration.",gmcCost:420,stock:10,tier:"TOP",tag:""},
  {id:6,name:"Northern Lights",type:"Indica",sativaRatio:10,thc:20,cbd:0.5,effects:["Sleepy","Relaxed","Pain Relief"],desc:"One of the most famous indicas. Deeply relaxing, perfect for nighttime use.",gmcCost:350,stock:18,tier:"TOP",tag:""},
  {id:7,name:"Girl Scout Cookies",type:"Hybrid",sativaRatio:40,thc:25,cbd:0.2,effects:["Happy","Euphoric","Relaxed"],desc:"Potent hybrid with full-body high and cerebral euphoria.",gmcCost:480,stock:5,tier:"EXOTIC",tag:"RARE BATCH"},
  {id:8,name:"Wedding Cake",type:"Hybrid",sativaRatio:60,thc:24,cbd:0.1,effects:["Relaxed","Happy","Euphoric"],desc:"Rich tangy flavors. Relaxing and euphoric effects that calm the body.",gmcCost:500,stock:7,tier:"PREMIUM",tag:""},
];
const TIERS=["EXOTIC","PREMIUM","TOP"];
const TIER_S={"EXOTIC":{color:"#e8a020",glow:"rgba(232,160,32,0.3)",icon:"💎"},"PREMIUM":{color:"#7b2fff",glow:"rgba(123,47,255,0.3)",icon:"🔮"},"TOP":{color:"#00d4ff",glow:"rgba(0,212,255,0.3)",icon:"⚡"}};
const RANKS=[{name:"Seed",min:0,color:"#7a7090",icon:"🌱"},{name:"Sprout",min:500,color:"#00d4ff",icon:"🌿"},{name:"Grower",min:2000,color:"#7b2fff",icon:"🌳"},{name:"Cultivator",min:5000,color:"#e8a020",icon:"⚗️"},{name:"Master",min:10000,color:"#ff1493",icon:"👑"}];
function getRank(s){return[...RANKS].reverse().find(r=>s>=r.min)||RANKS[0];}
const COUNTRY_CODES=[
  {code:"+66",flag:"🇹🇭",name:"Thailand"},
  {code:"+976",flag:"🇲🇳",name:"Mongolia"},
  {code:"+82",flag:"🇰🇷",name:"Korea"},
  {code:"+7",flag:"🇷🇺",name:"Russia"},
  {code:"+1",flag:"🇺🇸",name:"USA"},
  {code:"+44",flag:"🇬🇧",name:"UK"},
  {code:"+61",flag:"🇦🇺",name:"Australia"},
  {code:"+81",flag:"🇯🇵",name:"Japan"},
  {code:"+86",flag:"🇨🇳",name:"China"},
  {code:"+91",flag:"🇮🇳",name:"India"},
  {code:"+49",flag:"🇩🇪",name:"Germany"},
  {code:"+33",flag:"🇫🇷",name:"France"},
  {code:"+971",flag:"🇦🇪",name:"UAE"},
  {code:"+65",flag:"🇸🇬",name:"Singapore"},
  {code:"+60",flag:"🇲🇾",name:"Malaysia"},
];

const L={
  en:{
    home:"Home",shelf:"The Vault",profile:"Persona Card",
    tagline:"The Vault is Open",
    heroDesc:"An exclusive guild for the discerning collector. Redeem GMC through our secure tunnel. Use it in The Vault.",
    visitShelf:"Enter The Vault",redeemGMC:"Redeem GMC",
    theShelf:"The Vault",claimNow:"Claim Batch",
    gmcBalance:"GMC Balance",rank:"Rank",
    loginTitle:"Join The Guild",loginSub:"Create your member profile to redeem GMC and claim from The Vault.",
    yourName:"Your personame",phone:"Phone number",lineId:"LINE ID",
    enterGuild:"Enter The Guild →",skipForNow:"Browse as Guest",
    claimRequest:"Claim Approved",claimDesc:"We will contact you to confirm your batch.",
    backToShelf:"Back to The Vault",claimedItems:"Claimed Batches",
    noHistory:"No batches claimed yet. Enter The Vault.",logout:"Leave Arena",
    adminAccess:"Control Room",enterPin:"Enter Access Code",wrongPin:"Wrong code. Try again.",
    total:"Total GMC",stock:"In Vault",remaining:"bits left",
    filterAll:"All Batches",
    gmcTitle:"What is GMC?",
    gmcDesc:"Glasscorp Member Credit is the exclusive token of our collective. Redeem GMC through our secure tunnel, then use it in The Vault.",
    gardenTitle:"The Vault",
    gardenDesc:"Where all batches live. Browse, select, and claim. Your GMC opens every door.",
    step1:"Redeem",step1d:"Contact us via WhatsApp or LINE",
    step2:"Receive",step2d:"GMC added to your vault",
    step3:"Browse",step3d:"Enter The Vault",
    step4:"Claim",step4d:"We deliver to you",
  },
  th:{
    home:"หน้าแรก",shelf:"The Vault",profile:"บัตรสมาชิก",
    tagline:"The Vault เปิดแล้ว",
    heroDesc:"กิลด์สุดเอกสิทธิ์สำหรับนักสะสม แลก GMC ผ่านช่องทางลับ ใช้ใน The Vault",
    visitShelf:"เข้า The Vault",redeemGMC:"แลก GMC",
    theShelf:"The Vault",claimNow:"รับ Batch",
    gmcBalance:"ยอด GMC",rank:"ยศ",
    loginTitle:"เข้าร่วมกิลด์",loginSub:"สร้างโปรไฟล์เพื่อแลก GMC และรับของจาก The Vault",
    yourName:"Personame ของคุณ",phone:"เบอร์โทร",lineId:"LINE ID",
    enterGuild:"เข้าสู่กิลด์ →",skipForNow:"เข้าชมก่อน",
    claimRequest:"ยืนยันแล้ว",claimDesc:"เราจะติดต่อคุณเพื่อยืนยัน batch",
    backToShelf:"กลับ The Vault",claimedItems:"Batch ที่รับแล้ว",
    noHistory:"ยังไม่มีรายการ",logout:"ออกจากกิลด์",
    adminAccess:"ห้องควบคุม",enterPin:"ใส่รหัส",wrongPin:"รหัสผิด",
    total:"GMC รวม",stock:"คงเหลือ",remaining:"bits เหลือ",
    filterAll:"ทุก Batch",
    gmcTitle:"GMC คืออะไร?",
    gmcDesc:"Glasscorp Member Credit คือโทเค็นสุดพิเศษของกิลด์เรา แลก GMC ผ่านช่องทางลับ แล้วใช้ใน The Vault",
    gardenTitle:"The Vault",
    gardenDesc:"ที่ที่ทุก Batch อาศัยอยู่ เลือก และรับ GMC ของคุณเปิดทุกประตู",
    step1:"แลก",step1d:"ติดต่อผ่าน WhatsApp หรือ LINE",
    step2:"รับ",step2d:"GMC เข้า Vault ของคุณ",
    step3:"เลือก",step3d:"เข้า The Vault",
    step4:"รับของ",step4d:"เราส่งถึงคุณ",
  }
};

// ── BUD PLACEHOLDER SVG ──
function BudPlaceholder({color1,color2,size=220}){
  const uid=useRef("leaf"+Math.random().toString(36).slice(2,8)).current;
  // 7-pointed cannabis fan leaf — classic iconic shape
  // All leaflets radiate from center point (110,145)
  const cx=110, cy=145;
  return(
    <svg width={size} height={size} viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg" style={{display:"block",margin:"0 auto"}}>
      <defs>
        <radialGradient id={uid+"bg"} cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor={color1} stopOpacity="0.14"/>
          <stop offset="100%" stopColor={color2} stopOpacity="0.0"/>
        </radialGradient>
        <linearGradient id={uid+"lf"} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color1} stopOpacity="0.95"/>
          <stop offset="100%" stopColor={color2} stopOpacity="0.55"/>
        </linearGradient>
        <filter id={uid+"glow"} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id={uid+"soft"} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10"/>
        </filter>
      </defs>

      {/* ambient glow blob */}
      <ellipse cx="110" cy="118" rx="62" ry="68" fill={color1} fillOpacity="0.07" filter={`url(#${uid}soft)`}/>

      {/* stem */}
      <path d={`M${cx} ${cy} L${cx} 186`} stroke={color1} strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.6" filter={`url(#${uid}glow)`}/>
      {/* small stem branch left */}
      <path d={`M${cx} 168 Q${cx-10} 162 ${cx-18} 158`} stroke={color1} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.35"/>
      {/* small stem branch right */}
      <path d={`M${cx} 168 Q${cx+10} 162 ${cx+18} 158`} stroke={color1} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.35"/>

      {/* === 7 LEAFLETS === */}
      {/* CENTER top leaflet — tallest */}
      <path d={`M${cx} ${cy} Q${cx-10} 108 ${cx} 50 Q${cx+10} 108 ${cx} ${cy}`}
        fill={`url(#${uid}lf)`} fillOpacity="0.82" filter={`url(#${uid}glow)`}/>
      {/* center leaflet mid-vein */}
      <path d={`M${cx} ${cy} L${cx} 58`} stroke={color2} strokeWidth="0.8" strokeOpacity="0.5" strokeLinecap="round"/>

      {/* LEFT-1 leaflet */}
      <path d={`M${cx} ${cy} Q${cx-28} 108 ${cx-52} 68 Q${cx-22} 105 ${cx} ${cy}`}
        fill={`url(#${uid}lf)`} fillOpacity="0.72" filter={`url(#${uid}glow)`}/>
      <path d={`M${cx} ${cy} L${cx-42} 76`} stroke={color2} strokeWidth="0.7" strokeOpacity="0.4" strokeLinecap="round"/>

      {/* RIGHT-1 leaflet */}
      <path d={`M${cx} ${cy} Q${cx+28} 108 ${cx+52} 68 Q${cx+22} 105 ${cx} ${cy}`}
        fill={`url(#${uid}lf)`} fillOpacity="0.72" filter={`url(#${uid}glow)`}/>
      <path d={`M${cx} ${cy} L${cx+42} 76`} stroke={color2} strokeWidth="0.7" strokeOpacity="0.4" strokeLinecap="round"/>

      {/* LEFT-2 leaflet */}
      <path d={`M${cx} ${cy} Q${cx-46} 118 ${cx-82} 90 Q${cx-38} 116 ${cx} ${cy}`}
        fill={`url(#${uid}lf)`} fillOpacity="0.55" filter={`url(#${uid}glow)`}/>
      <path d={`M${cx} ${cy} L${cx-68} 96`} stroke={color2} strokeWidth="0.6" strokeOpacity="0.35" strokeLinecap="round"/>

      {/* RIGHT-2 leaflet */}
      <path d={`M${cx} ${cy} Q${cx+46} 118 ${cx+82} 90 Q${cx+38} 116 ${cx} ${cy}`}
        fill={`url(#${uid}lf)`} fillOpacity="0.55" filter={`url(#${uid}glow)`}/>
      <path d={`M${cx} ${cy} L${cx+68} 96`} stroke={color2} strokeWidth="0.6" strokeOpacity="0.35" strokeLinecap="round"/>

      {/* LEFT-3 bottom leaflet */}
      <path d={`M${cx} ${cy} Q${cx-55} 138 ${cx-84} 126 Q${cx-46} 136 ${cx} ${cy}`}
        fill={`url(#${uid}lf)`} fillOpacity="0.38"/>
      {/* RIGHT-3 bottom leaflet */}
      <path d={`M${cx} ${cy} Q${cx+55} 138 ${cx+84} 126 Q${cx+46} 136 ${cx} ${cy}`}
        fill={`url(#${uid}lf)`} fillOpacity="0.38"/>

      {/* center hub dot */}
      <circle cx={cx} cy={cy} r="4" fill={color1} fillOpacity="0.9" filter={`url(#${uid}glow)`}/>
      <circle cx={cx} cy={cy} r="2" fill="#ffffff" fillOpacity="0.6"/>

      {/* trichome sparkle dots on leaflets */}
      {[
        [cx,68],[cx-16,82],[cx+16,82],
        [cx-34,94],[cx+34,94],
        [cx-52,104],[cx+52,104],
        [cx-8,72],[cx+8,72],
      ].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={i===0?1.8:1.1}
          fill={i%2===0?color1:"#ffffff"} fillOpacity={i===0?1:0.7}
          style={{filter:`drop-shadow(0 0 ${i===0?4:2.5}px ${color1})`}}/>
      ))}

      {/* outer subtle ring */}
      <circle cx="110" cy="110" r="88" stroke={color1} strokeWidth="0.4" strokeOpacity="0.1" fill="none" strokeDasharray="3 6"/>
    </svg>
  );
}

// ── KI ENERGY ANIMATION — GPU only: transform + opacity, no box-shadow animations ──
function KiEnergy({type,size=60}){
  const isSpark=type==="Sativa"||type==="Sativa Hybrid";
  const isDeep=type==="Indica"||type==="Indica Hybrid";
  const uid=useRef("ki"+Math.random().toString(36).slice(2,8)).current;

  if(isSpark) return(
    <div style={{position:"relative",width:size,height:size,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      <style>{`
        @keyframes spark-ring-${uid}{0%{transform:scale(0.5);opacity:0.9}100%{transform:scale(1.8);opacity:0}}
        @keyframes spark-bolt-${uid}{0%,100%{opacity:0.3;transform:scale(0.8) rotate(0deg)}50%{opacity:1;transform:scale(1.1) rotate(20deg)}}
        @keyframes spark-glow-${uid}{0%,100%{opacity:0.5;transform:scale(0.95)}50%{opacity:1;transform:scale(1.05)}}
      `}</style>
      {/* Expanding rings — transform+opacity only ✅ */}
      {[0,0.4,0.8].map((delay,i)=>(
        <div key={i} style={{position:"absolute",width:"100%",height:"100%",borderRadius:"50%",border:"1px solid #FFD700",animation:`spark-ring-${uid} 1.2s ease-out ${delay}s infinite`,opacity:0}}/>
      ))}
      {/* Glow layer behind core — static, no animation on box-shadow ✅ */}
      <div style={{position:"absolute",width:size*0.55,height:size*0.55,borderRadius:"50%",
        background:"radial-gradient(circle,#FFD70060 0%,#00AAFF30 50%,transparent 80%)",
        animation:`spark-glow-${uid} 0.9s ease-in-out infinite`}}/>
      {/* Core — static background, only scale animates ✅ */}
      <div style={{width:size*0.42,height:size*0.42,borderRadius:"50%",
        background:"radial-gradient(circle,#FFD700 0%,#00AAFF 60%,transparent 100%)",
        position:"relative",zIndex:1}}/>
      {/* Lightning bolts — transform+opacity only ✅ */}
      {[0,60,120,180,240,300].map((deg,i)=>(
        <div key={i} style={{position:"absolute",width:2,height:size*0.3,
          background:`linear-gradient(${deg>180?"to top":"to bottom"},#FFD700,transparent)`,
          transform:`rotate(${deg}deg) translateY(-${size*0.18}px)`,
          transformOrigin:"bottom center",
          animation:`spark-bolt-${uid} ${0.6+i*0.1}s ease-in-out ${i*0.1}s infinite`,opacity:0.7}}/>
      ))}
    </div>
  );

  if(isDeep) return(
    <div style={{position:"relative",width:size,height:size,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      <style>{`
        @keyframes deep-breathe-${uid}{0%{transform:scale(0.5);opacity:0.8}100%{transform:scale(1.8);opacity:0}}
        @keyframes deep-orb-${uid}{0%{transform:rotate(0deg) translateX(${size*0.28}px)}100%{transform:rotate(360deg) translateX(${size*0.28}px)}}
        @keyframes deep-orb2-${uid}{0%{transform:rotate(180deg) translateX(${size*0.28}px)}100%{transform:rotate(540deg) translateX(${size*0.28}px)}}
        @keyframes deep-glow-${uid}{0%,100%{opacity:0.4;transform:scale(0.9)}50%{opacity:0.8;transform:scale(1.1)}}
      `}</style>
      {/* Expanding rings — transform+opacity only ✅ */}
      {[0,0.5,1.0].map((delay,i)=>(
        <div key={i} style={{position:"absolute",width:"100%",height:"100%",borderRadius:"50%",
          border:"1px solid #CC002270",
          animation:`deep-breathe-${uid} 2.2s ease-out ${delay}s infinite`,opacity:0}}/>
      ))}
      {/* Glow layer — opacity+scale only ✅ */}
      <div style={{position:"absolute",width:size*0.6,height:size*0.6,borderRadius:"50%",
        background:"radial-gradient(circle,#CC002250 0%,#5500AA30 55%,transparent 80%)",
        animation:`deep-glow-${uid} 1.8s ease-in-out infinite`}}/>
      {/* Core — static, no box-shadow animation ✅ */}
      <div style={{width:size*0.4,height:size*0.4,borderRadius:"50%",
        background:"radial-gradient(circle,#CC0022 0%,#5500AA 55%,transparent 100%)",
        position:"relative",zIndex:1}}/>
      {/* Orbiting orbs — transform only ✅ (static box-shadow, not animated) */}
      <div style={{position:"absolute",width:6,height:6,borderRadius:"50%",
        background:"#CC0022",boxShadow:"0 0 6px #CC0022",
        animation:`deep-orb-${uid} 2s linear infinite`}}/>
      <div style={{position:"absolute",width:4,height:4,borderRadius:"50%",
        background:"#5500AA",boxShadow:"0 0 4px #5500AA",
        animation:`deep-orb2-${uid} 2s linear infinite`}}/>
    </div>
  );

  // Flux
  return(
    <div style={{position:"relative",width:size,height:size,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      <style>{`
        @keyframes flux-ring-${uid}{0%{transform:scale(0.5) rotate(0deg);opacity:0.8}100%{transform:scale(1.8) rotate(360deg);opacity:0}}
        @keyframes flux-spin-r-${uid}{0%{transform:rotate(0deg)}100%{transform:rotate(-360deg)}}
        @keyframes flux-spin-f-${uid}{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        @keyframes flux-glow-${uid}{0%,100%{opacity:0.5;transform:scale(0.95)}50%{opacity:1;transform:scale(1.05)}}
      `}</style>
      {/* Expanding rings — transform+opacity ✅ */}
      {[0,0.45,0.9].map((delay,i)=>(
        <div key={i} style={{position:"absolute",width:"100%",height:"100%",borderRadius:"50%",
          border:"1px solid #FF149360",
          animation:`flux-ring-${uid} 1.2s ease-out ${delay}s infinite`,opacity:0}}/>
      ))}
      {/* Rotating arcs — transform only ✅ */}
      <div style={{position:"absolute",width:"95%",height:"95%",borderRadius:"50%",
        borderTop:"2px solid #FF149380",borderBottom:"2px solid transparent",
        borderLeft:"2px solid transparent",borderRight:"2px solid #00AAFF80",
        animation:`flux-spin-f-${uid} 2s linear infinite`}}/>
      <div style={{position:"absolute",width:"75%",height:"75%",borderRadius:"50%",
        borderTop:"2px solid #00AAFF60",borderBottom:"2px solid transparent",
        borderLeft:"2px solid transparent",borderRight:"2px solid #FF149360",
        animation:`flux-spin-r-${uid} 1.5s linear infinite`}}/>
      {/* Glow layer — opacity+scale only ✅ */}
      <div style={{position:"absolute",width:size*0.55,height:size*0.55,borderRadius:"50%",
        background:"radial-gradient(circle,#FF149340 0%,#00AAFF30 55%,transparent 80%)",
        animation:`flux-glow-${uid} 1.5s ease-in-out infinite`}}/>
      {/* Core — static, no box-shadow animation ✅ */}
      <div style={{width:size*0.38,height:size*0.38,borderRadius:"50%",
        background:"radial-gradient(circle,#FF1493 0%,#00AAFF 55%,transparent 100%)",
        position:"relative",zIndex:1}}/>
    </div>
  );
}

// ── SPINNING BUD SHOWCASE ──
function SpinningBud({strain,size=200}){
  const [spinning,setSpinning]=useState(true);
  const [frame,setFrame]=useState(0);
  const isSat=strain.type==="Sativa"||strain.type==="Sativa Hybrid";
  const isInd=strain.type==="Indica"||strain.type==="Indica Hybrid";
  const glowColor=isSat?"#FFD700":isInd?"#CC0022":"#FF1493";
  const photos=[strain.media,strain.media2,strain.media3].filter(Boolean);
  const uid=useRef("spin"+Math.random().toString(36).slice(2,7)).current;

  useEffect(()=>{
    if(photos.length<=1) return;
    const iv=setInterval(()=>setFrame(f=>(f+1)%photos.length),1200);
    return()=>clearInterval(iv);
  },[photos.length]);

  return(
    <div style={{position:"relative",width:size,height:size,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}
      onClick={()=>setSpinning(s=>!s)}>
      <style>{`
        @keyframes spin-y-${uid}{0%{transform:rotateY(0deg)}100%{transform:rotateY(360deg)}}
        @keyframes aura-pulse-${uid}{0%,100%{opacity:0.4;transform:scale(0.9)}50%{opacity:0.8;transform:scale(1.05)}}
        @keyframes particle-float-${uid}{0%,100%{transform:translateY(0) rotate(0deg);opacity:0.6}50%{transform:translateY(-8px) rotate(180deg);opacity:1}}
      `}</style>

      {/* Aura glow */}
      <div style={{position:"absolute",width:"90%",height:"90%",borderRadius:"50%",background:`radial-gradient(circle,${glowColor}25 0%,transparent 70%)`,animation:`aura-pulse-${uid} 2s ease-in-out infinite`,pointerEvents:"none"}}/>

      {/* Reflection underneath */}
      <div style={{position:"absolute",bottom:-8,left:"10%",width:"80%",height:12,background:`radial-gradient(ellipse,${glowColor}30 0%,transparent 70%)`,filter:"blur(4px)",pointerEvents:"none"}}/>

      {/* Spinning card */}
      <div style={{
        width:size*0.8,height:size*0.8,
        animation:spinning?`spin-y-${uid} 3s linear infinite`:undefined,
        transformStyle:"preserve-3d",
        position:"relative",
        boxShadow:`0 0 20px ${glowColor}40`,
        border:`1px solid ${glowColor}30`,
      }}>
        {photos.length>0?(
          <img src={photos[frame]} alt={strain.name}
            style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center",display:"block",filter:`drop-shadow(0 0 8px ${glowColor}60)`}}/>
        ):(
          <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:`radial-gradient(circle,${glowColor}15,transparent)`}}>
            <KiEnergy type={strain.type} size={size*0.5}/>
          </div>
        )}
        {/* Scanline overlay */}
        <div style={{position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px)",pointerEvents:"none"}}/>
        {/* Top color bar */}
        <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${glowColor},transparent)`}}/>
      </div>

      {/* Floating particles */}
      {[0,1,2,3].map(i=>(
        <div key={i} style={{
          position:"absolute",
          width:3,height:3,borderRadius:"50%",
          background:glowColor,
          boxShadow:`0 0 4px ${glowColor}`,
          top:`${20+i*18}%`,
          left:i%2===0?`${8+i*5}%`:`${75-i*5}%`,
          animation:`particle-float-${uid} ${1.5+i*0.4}s ease-in-out ${i*0.3}s infinite`,
          pointerEvents:"none"
        }}/>
      ))}

      {/* Frame dots if multiple photos */}
      {photos.length>1&&(
        <div style={{position:"absolute",bottom:-18,display:"flex",gap:4}}>
          {photos.map((_,i)=>(
            <div key={i} style={{width:i===frame?8:4,height:4,borderRadius:2,background:i===frame?glowColor:"rgba(255,255,255,0.2)",transition:"all 0.3s"}}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ── STRAIN CARD — memoized so it only re-renders when strain data actually changes ──
const StrainCard=React.memo(function StrainCard({strain,t,onView,onAddToCart,cartQty,calcDiscount,calcCartItem,discountSettings}){
  const th=getTheme(strain.type);
  const ts=TIER_S[strain.tier]||TIER_S["TOP"];
  const [hov,setHov]=useState(false);
  const isSat=strain.type==="Sativa"||strain.type==="Sativa Hybrid";
  const isInd=strain.type==="Indica"||strain.type==="Indica Hybrid";
  const isHyb=!isSat&&!isInd;
  // Faction operator for this strain type
  const factionChar=isSat?CHARS.SPARK:isInd?CHARS.DEEP:CHARS.FLUX;
  const factionGlow=isSat?"rgba(0,170,255,0.15)":isInd?"rgba(204,0,34,0.15)":"rgba(255,20,147,0.15)";

  // Hybrid gets dramatic split background
  const cardBg=isHyb
    ?`linear-gradient(135deg, ${T.indica.bgCard} 0%, ${T.sativa.bgCard} 100%)`
    :th.bgCard;

  const glowColor=isSat?"#00aaff":isInd?"#cc0022":th.a1;
  const glowColor2=isSat?"#00ddff":isInd?"#5500aa":"#cc0022";

  const glowLine = isSat
    ?`linear-gradient(90deg,#00aaff,#00ddff,#00aaff)`
    :isInd?`linear-gradient(90deg,#cc0022,#5500aa,#cc0022)`
    :`linear-gradient(90deg,#ff1493,#cc0022)`;
  const glowShadow = isSat?`0 0 10px #00aaff`:isInd?`0 0 10px #cc0022`:`0 0 10px #ff1493`;
  const impactColor = isSat?"#00aaff":isInd?"#CC0022":"#FF1493";

  return(
    <>
    <style>{`
      @media(max-width:640px){
        .gc-card-${strain.id}{flex-direction:row!important;min-height:160px;}
        .gc-media-${strain.id}{width:140px!important;min-width:140px!important;height:auto!important;align-self:stretch!important;flex-shrink:0;}
        .gc-body-${strain.id}{padding:10px 12px 10px!important;}
        .gc-name-${strain.id}{font-size:15px!important;margin-bottom:6px!important;min-height:unset!important;line-height:1.1!important;}
        .gc-ratio-${strain.id}{margin-bottom:6px!important;}
        .gc-ratio-${strain.id} .gc-ratio-bar{height:4px!important;}
        .gc-ratio-${strain.id} .gc-ratio-labels{font-size:7px!important;}
        .gc-ki-${strain.id}{padding:6px 8px!important;margin-bottom:6px!important;gap:6px!important;}
        .gc-ki-${strain.id} .gc-thc{font-size:16px!important;}
        .gc-ki-${strain.id} .gc-tier{font-size:9px!important;}
        .gc-effects-${strain.id}{gap:3px!important;margin-bottom:6px!important;}
        .gc-effects-${strain.id} span{font-size:7px!important;padding:2px 5px!important;}
        .gc-bottom-${strain.id}{padding-top:8px!important;}
        .gc-bottom-${strain.id} .gc-gmc{font-size:15px!important;}
        .gc-bottom-${strain.id} .gc-addbtn{padding:4px 8px!important;font-size:8px!important;}
        .gc-bottom-${strain.id} .gc-bits{font-size:7px!important;}
      }
    `}</style>
    <div onClick={()=>onView(strain)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      className={`gc-card-${strain.id}`}
      style={{background:cardBg,border:`1px solid ${hov?th.a1:th.border}`,cursor:"pointer",
        position:"relative",overflow:"hidden",transition:"all 0.3s",
        boxShadow:hov?`0 0 30px ${th.a1}40,0 0 60px ${th.a1}10`:`0 0 10px ${th.border}`,
        display:"flex",flexDirection:"column"}}>

      {/* ── MEDIA ── */}
      <div className={`gc-media-${strain.id}`}
        style={{position:"relative",width:"100%",height:210,overflow:"hidden",
          background:`linear-gradient(180deg,${th.bgDeep} 0%,${th.bgCard} 100%)`,flexShrink:0}}>
        {strain.media?(
          <img src={strain.media} alt={strain.name}
            style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center",
              display:"block",transition:"transform 0.4s",transform:hov?"scale(1.04)":"scale(1)"}}/>
        ):(
          <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
            <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:160,height:160,borderRadius:"50%",background:`radial-gradient(circle,${glowColor}20 0%,transparent 70%)`,pointerEvents:"none"}}/>
            <BudPlaceholder color1={glowColor} color2={glowColor2} size={180}/>
          </div>
        )}
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:40,background:`linear-gradient(transparent,${cardBg})`,pointerEvents:"none"}}/>
        <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:glowLine,opacity:hov?1:0.7,transition:"opacity 0.3s",boxShadow:glowShadow}}/>
        {strain.tag&&<div style={{position:"absolute",top:8,right:8,fontSize:7,letterSpacing:2,color:th.a1,background:`${th.bgDeep}dd`,padding:"2px 6px",textTransform:"uppercase",border:`1px solid ${th.a1}40`,backdropFilter:"blur(4px)"}}>{strain.tag}</div>}
        <div style={{position:"absolute",bottom:6,right:8,fontSize:28,opacity:strain.media?0.12:0.07,userSelect:"none",pointerEvents:"none"}}>{isSat?"⚡":isInd?"🌑":"🌀"}</div>
      </div>

      {/* ── BODY ── */}
      <div className={`gc-body-${strain.id}`}
        style={{padding:"18px 20px 20px",display:"flex",flexDirection:"column",flex:1}}>

        {/* PROMO */}
        {strain.promo?.active&&strain.promo.label&&(
          <div style={{marginBottom:8,display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",
            background:"linear-gradient(90deg,rgba(255,200,0,0.15),rgba(255,160,0,0.08),rgba(255,200,0,0.15))",
            border:"1px solid rgba(255,180,0,0.5)",backgroundSize:"200% 100%",
            animation:"promoShimmer 2s linear infinite",position:"relative",overflow:"hidden"}}>
            <style>{`@keyframes promoShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
            <span style={{fontSize:8,color:"#ffc800",fontWeight:900,letterSpacing:2,textTransform:"uppercase"}}>⚡ {strain.promo.label}</span>
            {strain.promo.discount>0&&<span style={{fontSize:7,color:"#ffaa00"}}>−{strain.promo.discount}%</span>}
          </div>
        )}

        {/* TYPE BADGE */}
        <div style={{display:"inline-flex",alignItems:"center",gap:5,marginBottom:8,padding:"3px 10px",alignSelf:"flex-start",
          background:isSat?`linear-gradient(90deg,#00aaff30,#00ddff20)`:isInd?`linear-gradient(90deg,#cc002230,#5500aa20)`:`linear-gradient(90deg,#ff149320,#cc002220)`,
          border:`1px solid ${isSat?"#00aaff":isInd?"#cc0022":"rgba(255,20,100,0.4)"}`,
          boxShadow:`0 0 8px ${isSat?"#00aaff40":isInd?"#cc002240":"#cc002220"}`}}>
          <span style={{fontSize:9}}>{isSat?"⚡":isInd?"🌑":"🌀"}</span>
          <span style={{fontSize:8,letterSpacing:3,color:isSat?"#00aaff":isInd?"#cc0022":th.a1,textTransform:"uppercase",fontWeight:700,textShadow:`0 0 8px ${isSat?"#00aaff":isInd?"#cc0022":th.a1}`}}>
            {getLabel(strain.sativaRatio)}
          </span>
        </div>

        {/* NAME */}
        <div className={`gc-name-${strain.id}`}
          style={{fontFamily:"'Inter',sans-serif",fontSize:"clamp(20px,2.5vw,26px)",fontWeight:900,
            color:th.text,letterSpacing:"-0.02em",textTransform:"uppercase",lineHeight:0.95,
            marginBottom:16,minHeight:"2em"}}>
          {isSat?<GlitchText text={strain.name} active={true}/>:isInd?<PulseText text={strain.name} active={true}/>:<FluxText text={strain.name} active={true}/>}
        </div>

        {/* RATIO BAR */}
        <div className={`gc-ratio-${strain.id}`} style={{marginBottom:16}}>
          <div className="gc-ratio-bar" style={{height:6,borderRadius:3,overflow:"hidden",background:"rgba(255,255,255,0.06)",position:"relative"}}>
            {isHyb?(
              <>
                <div style={{position:"absolute",left:0,top:0,height:"100%",width:strain.sativaRatio+"%",background:`linear-gradient(90deg,#00aaff,#00aaff88)`,boxShadow:`0 0 8px #00aaff`}}/>
                <div style={{position:"absolute",right:0,top:0,height:"100%",width:(100-strain.sativaRatio)+"%",background:`linear-gradient(90deg,#cc002288,#cc0022)`,boxShadow:`0 0 8px #cc0022`}}/>
              </>
            ):(
              <div style={{width:strain.sativaRatio+"%",height:"100%",background:isSat?`linear-gradient(90deg,#00aaff,#00ddff)`:`linear-gradient(90deg,#cc0022,#5500aa)`,boxShadow:`0 0 8px ${th.a1}`}}/>
            )}
          </div>
          <div className="gc-ratio-labels" style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
            <span style={{fontSize:8,color:isSat?"#00aaff":isInd?"#996060":T.sativa.a1,letterSpacing:1}}>⚡ {strain.sativaRatio}% Spark</span>
            <span style={{fontSize:8,color:isInd?"#cc0022":isSat?"#004466":T.indica.a1,letterSpacing:1}}>🌑 {100-strain.sativaRatio}% Deep</span>
          </div>
        </div>

        {/* KI ENERGY + IMPACT + TIER */}
        <div className={`gc-ki-${strain.id}`}
          style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"8px 10px",
            background:"rgba(0,0,0,0.2)",borderTop:`1px solid ${th.border}`,borderBottom:`1px solid ${th.border}`}}>
          <KiEnergy type={strain.type} size={44}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:7,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:2}}>Impact</div>
            <div className="gc-thc" style={{fontSize:20,fontWeight:900,color:impactColor,fontFamily:"'Inter',sans-serif",textShadow:`0 0 12px ${impactColor}80`,lineHeight:1}}>{strain.thc}%</div>
            <div style={{fontSize:7,letterSpacing:1,color:impactColor+"80",marginTop:2,textTransform:"uppercase"}}>{getLabel(strain.sativaRatio)}</div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontSize:7,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:2}}>Tier</div>
            <div className="gc-tier" style={{fontSize:10,color:ts.color,letterSpacing:1,textShadow:`0 0 8px ${ts.color}`}}>{ts.icon} {strain.tier}</div>
          </div>
        </div>

        {/* EFFECTS */}
        <div className={`gc-effects-${strain.id}`}
          style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:14,flex:1,alignContent:"flex-start"}}>
          {strain.effects.map(e=>(
            <span key={e} style={{fontSize:8,letterSpacing:1,color:th.dim,textTransform:"uppercase",border:`1px solid ${th.border}`,padding:"3px 7px"}}>{e}</span>
          ))}
        </div>

        {/* BOTTOM — GMC + ADD */}
        <div className={`gc-bottom-${strain.id}`}
          style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            paddingTop:12,borderTop:`1px solid ${th.border}`,marginTop:"auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <GMCCoin size={16} theme={{amber:"#e8a020"}}/>
            <div>
              <div className="gc-gmc" style={{fontSize:17,fontWeight:900,color:"#e8a020",fontFamily:"'Inter',sans-serif",textShadow:"0 0 10px rgba(232,160,32,0.6)",lineHeight:1}}>{strain.gmcCost}</div>
              <div style={{fontSize:7,letterSpacing:2,color:th.dim,textTransform:"uppercase"}}>GMC</div>
            </div>
            {calcDiscount&&calcDiscount(strain,cartQty||1)>0&&(
              <div style={{fontSize:7,color:"#00ff88",letterSpacing:1,background:"rgba(0,255,136,0.1)",padding:"2px 4px",border:"1px solid rgba(0,255,136,0.25)"}}>
                -{calcDiscount(strain,cartQty||1)}%
              </div>
            )}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            {onAddToCart&&(
              <button className="gc-addbtn" onClick={e=>{e.stopPropagation();onAddToCart&&onAddToCart();}}
                style={{display:"flex",alignItems:"center",gap:3,padding:"5px 9px",
                  background:cartQty>0?`${th.a1}20`:"transparent",
                  border:`1px solid ${cartQty>0?th.a1:th.border}`,
                  color:cartQty>0?th.a1:th.dim,cursor:"pointer",fontSize:8,fontWeight:700,
                  letterSpacing:1,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",
                  transition:"all 0.15s",boxShadow:cartQty>0?`0 0 8px ${th.a1}30`:"none"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=th.a1;e.currentTarget.style.color=th.a1;}}
                onMouseLeave={e=>{if(!cartQty){e.currentTarget.style.borderColor=th.border;e.currentTarget.style.color=th.dim;}}}>
                {cartQty>0?`◈ ${cartQty}g`:"+ Add"}
              </button>
            )}
            <span className="gc-bits" style={{fontSize:8,letterSpacing:2,color:th.dim,textTransform:"uppercase"}}>{strain.stock} bits</span>
          </div>
        </div>
      </div>
    </div>
    </>
  );
});

// ── THE SHELF ──
function TheShelf({t,user,strains,onView,cart,onAddToCart,calcDiscount,calcCartItem,discountSettings}){
  const th=T.base;
  const [active,setActive]=useState("ALL");
  const [sheetStrain,setSheetStrain]=useState(null);
  const filtered=active==="ALL"?strains:(strains||[]).filter(s=>s.tier===active);

  return(
    <div style={{minHeight:"100vh",background:th.bgDeep,paddingBottom:80,position:"relative",overflow:"hidden"}}>
      <Particles theme={th} count={20}/>
      {/* ARES — Vault guardian, right side */}
      <style>{`
        @keyframes ares-guard{0%,100%{opacity:0.2;transform:translateY(0px)}50%{opacity:0.28;transform:translateY(-10px)}}
        .ares-vault{position:absolute;right:-3%;top:0;height:85vh;width:auto;object-fit:contain;object-position:top right;opacity:0.22;animation:ares-guard 5s ease-in-out infinite;pointer-events:none;user-select:none;filter:drop-shadow(0 0 50px rgba(255,120,0,0.15));z-index:0;}
        @media(max-width:768px){.ares-vault{right:unset;left:50%;transform:translateX(-50%);height:45vh;opacity:0.08;top:5%;}}
      `}</style>
      <img src={CHARS.ARES} alt="" aria-hidden="true" className="ares-vault"/>
      <div style={{position:"relative",zIndex:1,padding:"100px 5vw 40px"}}>
        <div style={{marginBottom:56}}>
          <div style={{fontSize:10,letterSpacing:5,color:th.a1,textTransform:"uppercase",marginBottom:14,textShadow:`0 0 8px ${th.a1}`}}>— The Vault Collection</div>
          <h1 style={{fontFamily:"'Inter',sans-serif",fontSize:"clamp(40px,8vw,96px)",fontWeight:900,letterSpacing:"-0.03em",color:th.text,margin:"0 0 36px",textTransform:"uppercase",lineHeight:0.9}}>
            The<br/><span style={{color:th.a1,textShadow:`0 0 20px ${th.a1}`}}>Vault</span>
          </h1>
          <div style={{display:"flex",gap:2,flexWrap:"wrap"}}>
            {["ALL",...TIERS].map(tier=>{
              const ts=TIER_S[tier];
              const ac=active===tier;
              return(
                <button key={tier} onClick={()=>setActive(tier)} style={{padding:"10px 20px",background:ac?(ts?.color||th.a1)+"18":"transparent",border:`1px solid ${ac?(ts?.color||th.a1):th.border}`,color:ac?(ts?.color||th.a1):th.dim,cursor:"pointer",fontSize:10,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",boxShadow:ac?`0 0 12px ${ts?.color||th.a1}40`:"none",transition:"all 0.2s"}}>
                  {ts?.icon} {tier==="ALL"?t.filterAll:tier}
                </button>
              );
            })}
          </div>
        </div>

        {/* Faction operator appears based on strain type filter — future feature placeholder */}
        {active==="ALL"?TIERS.map(tier=>{
          const ts=TIER_S[tier];
          const items=(strains||[]).filter(s=>s.tier===tier);
          if(!items.length) return null;
          return(
            <div key={tier} style={{marginBottom:60}}>
              <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24,paddingBottom:14,borderBottom:`1px solid ${ts.color}30`}}>
                <span style={{fontSize:22}}>{ts.icon}</span>
                <div>
                  <div style={{fontFamily:"'Inter',sans-serif",fontSize:22,fontWeight:900,color:ts.color,textTransform:"uppercase",letterSpacing:2,textShadow:`0 0 12px ${ts.color}`}}>{tier}</div>
                  <div style={{fontSize:9,letterSpacing:3,color:th.dim,textTransform:"uppercase"}}>{items.length} Active Batches</div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:3}}>
                {items.map(s=><StrainCard key={s.id} strain={s} t={t} onView={onView} onAddToCart={()=>setSheetStrain(s)} cartQty={(cart||[]).find(i=>i.strainId===s.id)?.qty||0} calcDiscount={calcDiscount} calcCartItem={calcCartItem} discountSettings={discountSettings}/>)}
              </div>
            </div>
          );
        }):(
          <div>
            {/* Tier header — same style as ALL view */}
            {active!=="ALL"&&TIER_S[active]&&(
              <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24,paddingBottom:14,borderBottom:`1px solid ${TIER_S[active].color}30`}}>
                <span style={{fontSize:22}}>{TIER_S[active].icon}</span>
                <div>
                  <div style={{fontFamily:"'Inter',sans-serif",fontSize:22,fontWeight:900,color:TIER_S[active].color,textTransform:"uppercase",letterSpacing:2,textShadow:`0 0 12px ${TIER_S[active].color}`}}>{active}</div>
                  <div style={{fontSize:9,letterSpacing:3,color:th.dim,textTransform:"uppercase"}}>{filtered.length} Active Batches</div>
                </div>
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:3}}>
              {filtered.map(s=><StrainCard key={s.id} strain={s} t={t} onView={onView} onAddToCart={()=>setSheetStrain(s)} cartQty={(cart||[]).find(i=>i.strainId===s.id)?.qty||0} calcDiscount={calcDiscount} calcCartItem={calcCartItem} discountSettings={discountSettings}/>)}
            </div>
          </div>
        )}
      </div>
      {/* ── QUICK-ADD SHEET — rendered at shelf level, outside all card click trees ── */}
      {sheetStrain&&(
        <StrainQuickAdd
          strain={sheetStrain}
          existingQty={(cart||[]).find(i=>i.strainId===sheetStrain.id)?.qty||1}
          calcDiscount={calcDiscount}
          calcCartItem={calcCartItem}
          discountSettings={discountSettings}
          onClose={()=>setSheetStrain(null)}
          onConfirm={(id,qty)=>{
            onAddToCart(id,qty,true);
            setSheetStrain(null);
          }}
        />
      )}
    </div>
  );
}

// ── STRAIN DETAIL ──
function StrainDetail({strain,t,user,onBack,onClaim,onLogin,calcDiscount,calcCartItem,discountSettings,onAddToCart,cart}){
  const th=getTheme(strain.type);
  const [qty,setQty]=useState(1);
  const disc=calcDiscount?calcDiscount(strain,qty):0;
  const calc=calcCartItem?calcCartItem(strain,qty):{base:strain.gmcCost*qty,saving:0,total:strain.gmcCost*qty};
  const base=calc.base, saving=calc.saving, total=calc.total;
  const canClaim=user&&(user.gmcBalance||0)>=total;
  const sortedTiers=discountSettings?.enabled&&discountSettings.applyTo?.[strain.tier]&&!strain.promo?.active
    ?[...(discountSettings.tiers||[])].sort((a,b)=>a.minGrams-b.minGrams):[];
  const currentTier=sortedTiers.filter(tr=>qty>=tr.minGrams).pop();
  const nextTier=sortedTiers.find(tr=>tr.minGrams>qty);
  const gramsToNext=nextTier?nextTier.minGrams-qty:0;
  const isSat=strain.type==="Sativa"||strain.type==="Sativa Hybrid";
  const isInd=strain.type==="Indica"||strain.type==="Indica Hybrid";
  const isHyb=!isSat&&!isInd;

  return(
    <div style={{minHeight:"100vh",background:th.bgDeep,position:"relative",paddingBottom:80}}>
      <Particles theme={th} count={60}/>
      {/* massive type glow */}
      <div style={{position:"fixed",top:"30%",left:"50%",transform:"translate(-50%,-50%)",width:"70vw",height:"70vw",borderRadius:"50%",background:`radial-gradient(circle,${th.a1}10 0%,transparent 65%)`,pointerEvents:"none",zIndex:0}}/>
      {isHyb&&<div style={{position:"fixed",top:"60%",right:"0",width:"50vw",height:"50vw",borderRadius:"50%",background:`radial-gradient(circle,${T.indica.a1}08 0%,transparent 65%)`,pointerEvents:"none",zIndex:0}}/>}

      <div style={{position:"relative",zIndex:1,padding:"100px 5vw 40px"}}>
        <button onClick={onBack} style={{background:"transparent",border:"none",color:th.dim,cursor:"pointer",fontSize:10,letterSpacing:3,textTransform:"uppercase",padding:0,fontFamily:"'Inter',sans-serif",marginBottom:40,display:"flex",alignItems:"center",gap:8}}>
          ← {t.backToShelf}
        </button>

        {/* ── HERO MEDIA — full width, tall as possible ── */}
        {strain.media&&(
          <div style={{
            width:"calc(100% + 10vw)",
            marginLeft:"-5vw",
            marginBottom:40,
            position:"relative",
            overflow:"hidden",
          }}>
            <img src={strain.media} alt={strain.name}
              style={{
                width:"100%",
                height:"auto",
                maxHeight:"80vh",
                objectFit:"contain",
                objectPosition:"center",
                display:"block",
              }}/>
            {/* Faction operator — ghost behind photo, right side */}
            <img src={factionChar} alt="" aria-hidden="true" style={{
              position:"absolute",
              right:"-5%",bottom:0,
              height:"95%",width:"auto",
              objectFit:"contain",objectPosition:"bottom right",
              opacity:0.12,
              pointerEvents:"none",
              userSelect:"none",
              filter:`drop-shadow(0 0 30px ${factionGlow})`,
              mixBlendMode:"screen",
            }}/>
            {/* bottom fade */}
            <div style={{position:"absolute",bottom:0,left:0,right:0,height:60,
              background:`linear-gradient(transparent,${th.bgDeep})`,pointerEvents:"none"}}/>
            {/* left/right fade */}
            <div style={{position:"absolute",top:0,left:0,bottom:0,width:40,
              background:`linear-gradient(90deg,${th.bgDeep},transparent)`,pointerEvents:"none"}}/>
            <div style={{position:"absolute",top:0,right:0,bottom:0,width:40,
              background:`linear-gradient(270deg,${th.bgDeep},transparent)`,pointerEvents:"none"}}/>
            {/* top color line */}
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,
              background:isSat?`linear-gradient(90deg,#00aaff,#00ddff,#00aaff)`:isInd?`linear-gradient(90deg,#cc0022,#5500aa,#cc0022)`:`linear-gradient(90deg,#ff1493,#cc0022,#ff1493)`,
              boxShadow:isSat?`0 0 15px #00aaff80`:isInd?`0 0 15px #cc002280`:`0 0 15px #ff149380`}}/>
          </div>
        )}

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,400px),1fr))",gap:"4vw",alignItems:"start"}}>
          <div>
            {/* Type identity — very clear */}
            <div style={{display:"inline-flex",alignItems:"center",gap:10,marginBottom:20,padding:"8px 20px",
              background:isSat?`linear-gradient(90deg,#00aaff30,#00ddff15)`:isInd?`linear-gradient(90deg,#cc002230,#5500aa15)`:`linear-gradient(90deg,#ff149320,#cc002220)`,
              border:`1px solid ${isSat?"#00aaff":isInd?"#cc0022":"rgba(200,0,60,0.5)"}`,
              boxShadow:`0 0 15px ${isSat?"#00aaff40":isInd?"#cc002240":"#cc002220"}`}}>
              <span style={{fontSize:16}}>{isSat?"⚡":isInd?"🌑":"🌀"}</span>
              <span style={{fontSize:11,letterSpacing:3,fontWeight:900,textTransform:"uppercase",color:isSat?"#00aaff":isInd?"#cc0022":th.a1,textShadow:`0 0 10px ${isSat?"#00aaff":isInd?"#cc0022":th.a1}`}}>
                {getLabel(strain.sativaRatio)}
              </span>
              <span style={{fontSize:11,color:th.dim,letterSpacing:1}}>· {TIER_S[strain.tier]?.icon} {strain.tier}</span>
            </div>

            <h1 style={{fontFamily:"'Inter',sans-serif",fontSize:"clamp(40px,7vw,88px)",fontWeight:900,letterSpacing:"-0.03em",color:th.text,margin:"0 0 28px",textTransform:"uppercase",lineHeight:0.9,textShadow:`0 0 40px ${th.a1}20`}}>
              {isSat?<GlitchText text={strain.name} active={true}/>:isInd?<PulseText text={strain.name} active={true}/>:<FluxText text={strain.name} active={true}/>}
            </h1>

            {/* dramatic ratio bar */}
            <div style={{marginBottom:32}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:10,letterSpacing:2,color:isSat?"#00aaff":isHyb?"#ff149388":th.dim,textTransform:"uppercase",textShadow:isSat?`0 0 8px #00aaff`:"none"}}>⚡ Spark {strain.sativaRatio}%</span>
                <span style={{fontSize:10,letterSpacing:2,color:isInd?"#cc0022":isHyb?"#cc002288":th.dim,textTransform:"uppercase",textShadow:isInd?`0 0 8px #cc0022`:"none"}}>🌑 Deep {100-strain.sativaRatio}%</span>
              </div>
              <div style={{height:8,background:"rgba(255,255,255,0.05)",borderRadius:4,overflow:"hidden",position:"relative"}}>
                {isHyb?(
                  <>
                    <div style={{position:"absolute",left:0,top:0,height:"100%",width:strain.sativaRatio+"%",background:"linear-gradient(90deg,#00aaff,#00aaff66)",boxShadow:"0 0 10px #00aaff"}}/>
                    <div style={{position:"absolute",right:0,top:0,height:"100%",width:(100-strain.sativaRatio)+"%",background:"linear-gradient(90deg,#cc002266,#cc0022)",boxShadow:"0 0 10px #cc0022"}}/>
                  </>
                ):(
                  <div style={{width:strain.sativaRatio+"%",height:"100%",background:isSat?"linear-gradient(90deg,#00aaff,#00ddff)":"linear-gradient(90deg,#cc0022,#5500aa)",boxShadow:`0 0 12px ${th.a1}`}}/>
                )}
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:2,marginBottom:28}}>
              <div style={{background:th.bgCard,border:`1px solid ${th.border}`,padding:"18px 14px"}}>
                <div style={{fontSize:9,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:6}}>Impact</div>
                <div style={{fontSize:"clamp(18px,2.5vw,28px)",fontWeight:900,color:isSat?"#FFD700":isInd?"#CC0022":"#FF1493",fontFamily:"'Inter',sans-serif",textShadow:`0 0 10px ${isSat?"#FFD70060":isInd?"#CC002260":"#FF149360"}`}}>{strain.thc}%</div>
              </div>
              <div style={{background:th.bgCard,border:`1px solid ${th.border}`,padding:"8px",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <KiEnergy type={strain.type} size={52}/>
              </div>
              <div style={{background:th.bgCard,border:`1px solid ${th.border}`,padding:"18px 14px"}}>
                <div style={{fontSize:9,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:6}}>GMC</div>
                <div style={{fontSize:"clamp(18px,2.5vw,28px)",fontWeight:900,color:"#e8a020",fontFamily:"'Inter',sans-serif",textShadow:"0 0 10px rgba(232,160,32,0.6)"}}>{strain.gmcCost}</div>
              </div>
            </div>

            <p style={{fontSize:14,color:th.dim,lineHeight:1.8,marginBottom:28}}>{strain.desc}</p>

            <div>
              <div style={{fontSize:9,letterSpacing:3,color:th.a2,textTransform:"uppercase",marginBottom:10,textShadow:`0 0 8px ${th.a2}`}}>Upgrades</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {strain.effects.map(e=>(
                  <span key={e} style={{fontSize:10,letterSpacing:1,color:th.dim,textTransform:"uppercase",border:`1px solid ${th.border}`,padding:"6px 12px"}}>{e}</span>
                ))}
              </div>
            </div>
          </div>

          {/* claim panel */}
          <div style={{background:th.bgCard,border:`1px solid ${th.border}`,padding:"36px 28px",position:"sticky",top:100,boxShadow:`0 0 40px ${th.a1}10`}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:isSat?`linear-gradient(90deg,#00aaff,#00ddff)`:isInd?`linear-gradient(90deg,#cc0022,#5500aa)`:`linear-gradient(90deg,#ff1493,#cc0022)`,boxShadow:`0 0 10px ${th.a1}`}}/>
            <div style={{fontSize:9,letterSpacing:3,color:th.a1,textTransform:"uppercase",marginBottom:24,textShadow:`0 0 8px ${th.a1}`}}>Claim Panel</div>
            <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20,background:"rgba(0,0,0,0.3)",padding:"16px",border:`1px solid ${th.border}`}}>
              <button onClick={()=>setQty(q=>Math.max(1,q-1))} style={{width:36,height:36,background:"transparent",border:`1px solid ${th.border}`,color:th.a1,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
              <div style={{flex:1,textAlign:"center"}}>
                <span style={{fontFamily:"'Inter',sans-serif",fontSize:40,fontWeight:900,color:th.text}}>{qty}</span>
                <span style={{fontSize:13,color:th.dim,marginLeft:4}}>bits</span>
              </div>
              <button onClick={()=>setQty(q=>Math.min(strain.stock,q+1))} style={{width:36,height:36,background:"transparent",border:`1px solid ${th.border}`,color:th.a1,cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:2,marginBottom:20}}>
              <div style={{background:"rgba(0,0,0,0.3)",padding:"14px",border:`1px solid ${th.border}`}}>
                <div style={{fontSize:9,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:6}}>{t.total}</div>
                <div style={{display:"flex",alignItems:"center",gap:6}}><GMCCoin size={18} theme={{amber:"#e8a020"}}/><span style={{fontSize:22,fontWeight:900,color:"#e8a020",fontFamily:"'Inter',sans-serif",textShadow:"0 0 10px #e8a02060"}}>{total.toLocaleString()}</span></div>
              </div>
              <div style={{background:"rgba(0,0,0,0.3)",padding:"14px",border:`1px solid ${th.border}`}}>
                <div style={{fontSize:9,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:6}}>{t.stock}</div>
                <div style={{fontSize:22,fontWeight:900,color:th.dim,fontFamily:"'Inter',sans-serif"}}>{strain.stock} bits</div>
              </div>
            </div>
            {/* Add to Inventory */}
            {onAddToCart&&(
              <button onClick={()=>onAddToCart(strain.id,qty,true)}
                style={{width:"100%",padding:"13px",marginBottom:8,background:"rgba(255,255,255,0.04)",border:`1px solid ${th.border}`,color:th.dim,cursor:"pointer",fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=th.a1;e.currentTarget.style.color=th.a1;e.currentTarget.style.background=`${th.a1}10`;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=th.border;e.currentTarget.style.color=th.dim;e.currentTarget.style.background="rgba(255,255,255,0.04)";}}>
                <span style={{fontSize:14}}>{(cart||[]).find(i=>i.strainId===strain.id)?"◈":"+"}</span>
                {(cart||[]).find(i=>i.strainId===strain.id)?`In Inventory · ${(cart||[]).find(i=>i.strainId===strain.id).qty} bits`:`Add ${qty} bits to Inventory`}
              </button>
            )}
            {user?(
              <>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:14,padding:"10px 12px",background:"rgba(0,0,0,0.3)",border:`1px solid ${th.border}`}}>
                  <span style={{fontSize:10,letterSpacing:2,color:th.dim,textTransform:"uppercase"}}>Your Vault</span>
                  <div style={{display:"flex",alignItems:"center",gap:6}}><GMCCoin size={14} theme={{amber:"#e8a020"}}/><span style={{fontSize:14,fontWeight:900,color:canClaim?th.a1:"#cc2244",fontFamily:"'Inter',sans-serif"}}>{(user.gmcBalance||0).toLocaleString()}</span></div>
                </div>
                <GBtn onClick={()=>canClaim&&onClaim(strain,qty)} color={canClaim?th.a1:"#444"} style={{width:"100%",cursor:canClaim?"pointer":"not-allowed",opacity:canClaim?1:0.4}}>
                  {canClaim?`${t.claimNow} — ${total.toLocaleString()} GMC`:"Insufficient GMC"}
                </GBtn>
                {!canClaim&&<div style={{fontSize:11,color:th.dim,textAlign:"center",marginTop:8}}>Need {(total-(user.gmcBalance||0)).toLocaleString()} more GMC</div>}
              </>
            ):(
              <GBtn onClick={onLogin} color={th.a1} style={{width:"100%"}}>
                🔐 Login to claim from The Vault
              </GBtn>
            )}
            <div style={{fontSize:10,letterSpacing:1,color:th.dim,textAlign:"center",marginTop:14,textTransform:"uppercase"}}>🛵 1-2 Hours · Portal Time · Glasscorp City</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── THE GARDEN SECTION — vibe & experience ──
function GardenSection({t,onRedeem,onShelf,strains}){
  const th=T.base;
  const [tick,setTick]=useState(0);
  const [hoverVault,setHoverVault]=useState(false);
  useEffect(()=>{
    const iv=setInterval(()=>setTick(x=>x+1),2500);
    return()=>clearInterval(iv);
  },[]);
  const allStrains=strains||STRAINS;
  const currentStrain=allStrains.length>0?allStrains[tick%allStrains.length]:null;

  return(
    <section style={{padding:"80px 5vw 100px",position:"relative",overflow:"hidden",
      background:"linear-gradient(180deg,#080612 0%,#06040e 30%,#08050f 70%,#080612 100%)"}}>
      {/* seamless bleed from above */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:100,background:"linear-gradient(180deg,#080612,transparent)",pointerEvents:"none",zIndex:1}}/>
      <style>{`
        @keyframes caveGlow{0%,100%{opacity:0.6}50%{opacity:1}}
        @keyframes runeFlicker{0%,100%{opacity:0.15}50%{opacity:0.4}}
        @keyframes goldPulse{0%,100%{opacity:0.5;transform:scale(1)}50%{opacity:1;transform:scale(1.06)}}
        @keyframes codeFade{0%,100%{opacity:0.5}50%{opacity:1}}
        @keyframes glitch{0%,95%,100%{transform:translate(0)}96%{transform:translate(-2px,1px)}98%{transform:translate(2px,-1px)}}
      `}</style>

      {/* deep cave atmosphere — purple void from center */}
      <div style={{position:"absolute",top:"20%",left:"50%",transform:"translateX(-50%)",width:"90vw",height:"70vw",borderRadius:"50%",background:"radial-gradient(circle,rgba(123,47,255,0.12) 0%,rgba(123,47,255,0.05) 35%,transparent 65%)",pointerEvents:"none"}}/>
      {/* gold torch glows — left and right pillars */}
      <div style={{position:"absolute",top:"15%",left:"3%",width:4,height:"60%",background:"linear-gradient(180deg,transparent,rgba(232,160,32,0.4),rgba(232,160,32,0.15),transparent)",animation:"caveGlow 3s ease-in-out infinite",pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:"15%",right:"3%",width:4,height:"60%",background:"linear-gradient(180deg,transparent,rgba(232,160,32,0.4),rgba(232,160,32,0.15),transparent)",animation:"caveGlow 3s ease-in-out infinite 1.5s",pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:"10%",left:"2%",width:30,height:30,borderRadius:"50%",background:"radial-gradient(circle,rgba(232,160,32,0.5),transparent)",animation:"goldPulse 3s ease-in-out infinite",pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:"10%",right:"2%",width:30,height:30,borderRadius:"50%",background:"radial-gradient(circle,rgba(232,160,32,0.5),transparent)",animation:"goldPulse 3s ease-in-out infinite 1.5s",pointerEvents:"none"}}/>
      {/* cave wall texture — stone-like horizontal lines */}
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(123,47,255,0.018) 1px,transparent 1px)",backgroundSize:"100% 40px",pointerEvents:"none"}}/>
      {/* corner rune marks */}
      {[[true,false,true,false],[true,false,false,true],[false,true,true,false],[false,true,false,true]].map(([bt,bb,bl,br],i)=>(
        <div key={i} style={{position:"absolute",top:i<2?24:"auto",bottom:i>=2?24:"auto",left:i%2===0?24:"auto",right:i%2===1?24:"auto",width:24,height:24,borderTop:bt?"2px solid rgba(232,160,32,0.35)":"none",borderBottom:bb?"2px solid rgba(232,160,32,0.35)":"none",borderLeft:bl?"2px solid rgba(232,160,32,0.35)":"none",borderRight:br?"2px solid rgba(232,160,32,0.35)":"none",animation:"runeFlicker 3s ease-in-out infinite",pointerEvents:"none"}}/>
      ))}

      <div style={{position:"relative",zIndex:2,display:"flex",flexDirection:"column",alignItems:"center"}}>

        {/* TOP label — ancient inscription */}
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
          <div style={{flex:1,height:1,background:"linear-gradient(90deg,transparent,rgba(232,160,32,0.5))"}}/>
          <span style={{fontSize:8,letterSpacing:5,color:"rgba(232,160,32,0.8)",textTransform:"uppercase",textShadow:"0 0 10px rgba(232,160,32,0.4)",whiteSpace:"nowrap"}}>⬡ AZRON'S SACRED VAULT ⬡</span>
          <div style={{flex:1,height:1,background:"linear-gradient(90deg,rgba(232,160,32,0.5),transparent)"}}/>
        </div>

        {/* Title */}
        <div style={{textAlign:"center",marginBottom:48}}>
          <h2 style={{fontFamily:"'Inter',sans-serif",fontSize:"clamp(40px,7vw,88px)",fontWeight:900,letterSpacing:"-0.03em",color:"#e8e0f0",margin:"0",textTransform:"uppercase",lineHeight:0.9,animation:"glitch 8s ease-in-out infinite"}}>The</h2>
          <h2 style={{fontFamily:"'Inter',sans-serif",fontSize:"clamp(40px,7vw,88px)",fontWeight:900,letterSpacing:"-0.03em",color:"#e8a020",margin:"0 0 16px",textTransform:"uppercase",lineHeight:0.9,textShadow:"0 0 30px rgba(232,160,32,0.8),0 0 60px rgba(232,160,32,0.3)"}}>Vault</h2>
          <p style={{fontSize:14,color:"#7a7090",lineHeight:1.8,maxWidth:500,margin:"0 auto"}}>Every batch is rare. Every claim is yours alone. Exotic, premium and top-tier batches — guarded by AZRON, waiting for the worthy.</p>
        </div>

        {/* CAVE ENTRANCE — godly arch replacing the spinning safe */}
        <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:48,width:"min(520px,90vw)"}}>
          {/* cave entrance glow */}
          <div style={{position:"absolute",top:"10%",left:"50%",transform:"translateX(-50%)",width:"70%",height:"70%",borderRadius:"50%",background:"radial-gradient(circle,rgba(232,160,32,0.15) 0%,rgba(123,47,255,0.1) 40%,transparent 70%)",animation:"caveGlow 4s ease-in-out infinite",pointerEvents:"none"}}/>

          <svg viewBox="0 0 520 440" width="min(520px,90vw)" style={{display:"block",filter:"drop-shadow(0 0 30px rgba(123,47,255,0.3))"}}>
            {/* cave floor */}
            <rect x="0" y="380" width="520" height="60" fill="#06040e"/>

            {/* left pillar */}
            <rect x="40" y="80" width="60" height="300" fill="#0a0818" stroke="rgba(232,160,32,0.25)" strokeWidth="1"/>
            {/* left pillar gold vein */}
            <line x1="70" y1="90" x2="70" y2="370" stroke="rgba(232,160,32,0.3)" strokeWidth="1.5" strokeDasharray="8 12"/>
            <rect x="30" y="70" width="80" height="20" fill="#0a0818" stroke="rgba(232,160,32,0.4)" strokeWidth="1"/>
            {/* left torch */}
            <rect x="60" y="55" width="20" height="30" fill="rgba(232,160,32,0.2)" stroke="rgba(232,160,32,0.6)" strokeWidth="1"/>
            <ellipse cx="70" cy="55" rx="12" ry="18" fill="rgba(232,160,32,0.4)" style={{filter:"blur(3px)",animation:"goldPulse 2s ease-in-out infinite"}}/>

            {/* right pillar */}
            <rect x="420" y="80" width="60" height="300" fill="#0a0818" stroke="rgba(232,160,32,0.25)" strokeWidth="1"/>
            {/* right pillar gold vein */}
            <line x1="450" y1="90" x2="450" y2="370" stroke="rgba(232,160,32,0.3)" strokeWidth="1.5" strokeDasharray="8 12"/>
            <rect x="410" y="70" width="80" height="20" fill="#0a0818" stroke="rgba(232,160,32,0.4)" strokeWidth="1"/>
            {/* right torch */}
            <rect x="440" y="55" width="20" height="30" fill="rgba(232,160,32,0.2)" stroke="rgba(232,160,32,0.6)" strokeWidth="1"/>
            <ellipse cx="450" cy="55" rx="12" ry="18" fill="rgba(232,160,32,0.4)" style={{filter:"blur(3px)",animation:"goldPulse 2s ease-in-out infinite 1s"}}/>

            {/* arch top */}
            <path d="M 100 80 Q 260 -20 420 80" fill="none" stroke="rgba(232,160,32,0.5)" strokeWidth="2"/>
            <path d="M 110 80 Q 260 -10 410 80" fill="none" stroke="rgba(123,47,255,0.3)" strokeWidth="1"/>
            {/* arch circuit veins */}
            {[0.25,0.5,0.75].map((t,i)=>{
              const x=100+(420-100)*t;
              const y=80-Math.sin(Math.PI*t)*100;
              return <circle key={i} cx={x} cy={y} r="4" fill="none" stroke="rgba(232,160,32,0.5)" strokeWidth="1.5" style={{animation:`runeFlicker ${2+i*0.5}s ease-in-out infinite ${i*0.7}s`}}/>;
            })}

            {/* cave interior darkness with purple glow */}
            <path d="M 100 80 Q 260 -20 420 80 L 420 380 L 100 380 Z" fill="rgba(6,4,14,0.95)"/>
            <ellipse cx="260" cy="250" rx="140" ry="120" fill="radial-gradient(circle,rgba(123,47,255,0.2),transparent)" style={{filter:"blur(20px)"}}/>

            {/* inner cave glow — purple/gold */}
            <ellipse cx="260" cy="260" rx="100" ry="80" fill="rgba(123,47,255,0.08)" style={{animation:"caveGlow 3s ease-in-out infinite"}}/>
            <ellipse cx="260" cy="300" rx="80" ry="40" fill="rgba(232,160,32,0.06)" style={{animation:"caveGlow 3s ease-in-out infinite 1.5s"}}/>

            {/* ancient rune marks on floor */}
            {[-80,-30,30,80].map((ox,i)=>(
              <g key={i}>
                <line x1={260+ox} y1="355" x2={260+ox} y2="375" stroke="rgba(232,160,32,0.25)" strokeWidth="1"/>
                <line x1={260+ox-6} y1="362" x2={260+ox+6} y2="362" stroke="rgba(232,160,32,0.25)" strokeWidth="1"/>
              </g>
            ))}

            {/* tier treasure chests — floating inside cave */}
            {[
              {x:155,y:280,color:"#e8a020",label:"EXOTIC",delay:"0s"},
              {x:260,y:240,color:"#7b2fff",label:"PREMIUM",delay:"0.8s"},
              {x:365,y:280,color:"#00d4ff",label:"TOP",delay:"1.6s"},
            ].map(({x,y,color,label,delay})=>(
              <g key={label} style={{animation:`treasure-float 3s ease-in-out infinite`,animationDelay:delay}}>
                {/* chest body */}
                <rect x={x-20} y={y} width="40" height="28" fill={`${color}15`} stroke={`${color}60`} strokeWidth="1.5" rx="2"/>
                {/* chest lid */}
                <rect x={x-20} y={y-10} width="40" height="14" fill={`${color}25`} stroke={`${color}80`} strokeWidth="1.5" rx="2"/>
                {/* chest lock */}
                <rect x={x-5} y={y-3} width="10" height="8" fill={`${color}40`} stroke={color} strokeWidth="1" rx="1"/>
                {/* chest glow */}
                <ellipse cx={x} cy={y+28} rx="20" ry="6" fill={`${color}20`} style={{filter:"blur(4px)"}}/>
                {/* label */}
                <text x={x} y={y+48} textAnchor="middle" fill={color} fontSize="7" fontFamily="Inter,sans-serif" letterSpacing="2" opacity="0.8">{label}</text>
              </g>
            ))}

            {/* cave entrance bottom arch shadow */}
            <rect x="100" y="370" width="320" height="20" fill="rgba(0,0,0,0.6)"/>
          </svg>

          {/* Enter cave button — overlaid center of arch */}
          <button
            onClick={onShelf}
            onMouseEnter={()=>setHoverVault(true)}
            onMouseLeave={()=>setHoverVault(false)}
            style={{
              position:"absolute",
              top:"52%",left:"50%",transform:"translate(-50%,-50%)",
              padding:"14px 28px",
              background:hoverVault?"rgba(232,160,32,0.2)":"rgba(232,160,32,0.08)",
              border:`1px solid ${hoverVault?"rgba(232,160,32,0.9)":"rgba(232,160,32,0.4)"}`,
              cursor:"pointer",
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,
              transition:"all 0.3s",
              boxShadow:hoverVault?"0 0 30px rgba(232,160,32,0.4),0 0 60px rgba(232,160,32,0.1)":"0 0 15px rgba(232,160,32,0.1)",
            }}>
            <span style={{fontSize:"clamp(8px,1.5vw,10px)",letterSpacing:3,color:hoverVault?"#e8a020":"rgba(232,160,32,0.7)",textTransform:"uppercase",fontFamily:"'Inter',sans-serif",fontWeight:900,textAlign:"center",lineHeight:1.4}}>
              {hoverVault?"ENTERING...":"ENTER THE VAULT"}
            </span>
          </button>
        </div>

        {/* BOTTOM — stats + active batch + GMC button */}
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:20,width:"100%",maxWidth:600}}>

          {/* Stats row */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:2,width:"100%"}}>
            {[
              ["⬡",allStrains.length+" Batches","Active inside"],
              ["◈","GMC","Required access"],
              ["◉","Members","Verified only"],
            ].map(([ic,n,l])=>(
              <div key={n} style={{background:"rgba(0,212,255,0.04)",border:"1px solid rgba(0,212,255,0.12)",padding:"14px 10px",position:"relative",overflow:"hidden",textAlign:"center"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(0,212,255,0.4),transparent)"}}/>
                <div style={{fontSize:16,color:"#00d4ff",marginBottom:6}}>{ic}</div>
                <div style={{fontFamily:"'Inter',sans-serif",fontSize:16,fontWeight:900,color:"#e8e0f0",lineHeight:1,marginBottom:3}}>{n}</div>
                <div style={{fontSize:8,letterSpacing:2,color:"#7a7090",textTransform:"uppercase"}}>{l}</div>
              </div>
            ))}
          </div>

          {/* Active batch ticker — fixed width, cycles strain names */}
          {currentStrain&&(
            <div style={{padding:"10px 20px",background:"rgba(0,0,0,0.5)",border:"1px solid rgba(0,212,255,0.2)",display:"flex",alignItems:"center",gap:12,width:"100%",boxSizing:"border-box"}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:"#00ff88",boxShadow:"0 0 6px #00ff88",flexShrink:0}}/>
              <span style={{fontSize:9,letterSpacing:3,color:"#7a7090",textTransform:"uppercase",fontFamily:"'Inter',sans-serif",flexShrink:0}}>Active Batch:</span>
              <span style={{fontSize:11,letterSpacing:2,color:"#00d4ff",fontFamily:"'Inter',sans-serif",fontWeight:700,animation:"codeFade 1.5s ease-in-out infinite",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{currentStrain.name}</span>
              <span style={{marginLeft:"auto",fontSize:8,color:"#e8a020",letterSpacing:1,flexShrink:0}}>{currentStrain.tier}</span>
            </div>
          )}

          {/* GMC button — gold loot feel */}
          <button
            onClick={onRedeem}
            style={{
              padding:"16px 40px",
              background:"linear-gradient(90deg,#e8a020,#ffd700,#e8a020)",
              backgroundSize:"200% 100%",
              animation:"goldShimmer 3s linear infinite",
              border:"none",
              color:"#000",
              cursor:"pointer",
              fontSize:12,fontWeight:900,letterSpacing:3,
              textTransform:"uppercase",
              fontFamily:"'Inter',sans-serif",
              boxShadow:"0 0 20px rgba(232,160,32,0.4),0 0 40px rgba(232,160,32,0.15)",
              transition:"transform 0.2s,box-shadow 0.2s",
            }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 0 30px rgba(232,160,32,0.6),0 0 60px rgba(232,160,32,0.25)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 0 20px rgba(232,160,32,0.4),0 0 40px rgba(232,160,32,0.15)";}}>
            💎 Load GMC · Level Up
          </button>

        </div>
      </div>
    </section>
  );
}

// ── HOME ──
function HomePage({t,onShelf,onRedeem,strains,featuredIds,cart,onAddToCart,calcDiscount,calcCartItem,discountSettings,onView}){
  const th=T.base;
  const [sheetStrain,setSheetStrain]=useState(null);
  const allStrains=strains||STRAINS;
  const featuredStrains=featuredIds&&featuredIds.length>0
    ?featuredIds.map(id=>allStrains.find(s=>s.id===id)).filter(Boolean)
    :allStrains.slice(0,3);
  return(
    <div style={{position:"relative",background:"#080612"}}>
      <style>{`
        @keyframes azron-data{0%{transform:translateY(-100vh)}100%{transform:translateY(200vh)}}
        @keyframes azron-data2{0%{transform:translateY(-100vh)}100%{transform:translateY(200vh)}}
        @keyframes azron-torch{0%,100%{opacity:0.6;transform:scale(1)}50%{opacity:1;transform:scale(1.08)}}
        @keyframes azron-rune{0%,100%{opacity:0.2}50%{opacity:0.5}}
        @keyframes cave-glow{0%,100%{opacity:0.7}50%{opacity:1}}
        @keyframes treasure-float{0%,100%{transform:translateY(0px)}50%{transform:translateY(-8px)}}
      `}</style>
      {/* PAGE-WIDE: vertical data streams — AZRON's ancient code flowing */}
      <div style={{position:"fixed",top:0,left:"2vw",width:1,height:"100vh",background:"linear-gradient(transparent 0%,rgba(123,47,255,0.12) 30%,rgba(123,47,255,0.06) 70%,transparent 100%)",animation:"azron-data 12s linear infinite",pointerEvents:"none",zIndex:0}}/>
      <div style={{position:"fixed",top:0,right:"2vw",width:1,height:"100vh",background:"linear-gradient(transparent 0%,rgba(232,160,32,0.08) 40%,rgba(232,160,32,0.04) 70%,transparent 100%)",animation:"azron-data2 18s linear infinite 4s",pointerEvents:"none",zIndex:0}}/>
      {/* PAGE-WIDE: continuous purple atmosphere — runs behind all sections */}
      <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"radial-gradient(ellipse at 75% 20%,rgba(123,47,255,0.06) 0%,transparent 50%)",pointerEvents:"none",zIndex:0}}/>
      {/* HERO */}
      <section style={{minHeight:"100vh",display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:"0 5vw 10vh",position:"relative",overflow:"hidden",backgroundColor:th.bgDeep}}>
        {/* AZRON — cover + right anchored, works all screen sizes */}
        <div style={{position:"absolute",inset:0,
          backgroundImage:`url(https://febslpxjssjijooiukot.supabase.co/storage/v1/object/public/characters/azron-home-bg.png)`,
          backgroundSize:"cover",
          backgroundPosition:"right center",
          backgroundRepeat:"no-repeat",
          pointerEvents:"none"}}/>
        <Particles theme={th} count={60}/>
        {/* dark overlay — same on ALL screens */}
        <div style={{position:"absolute",inset:0,
          background:`linear-gradient(90deg,#080612ee 0%,#080612bb 30%,#08061266 50%,#08061222 65%,transparent 80%)`,
          pointerEvents:"none",zIndex:0}}/>
        {/* extra dark veil — same level desktop and mobile */}
        <div style={{position:"absolute",inset:0,background:"rgba(8,6,18,0.35)",pointerEvents:"none",zIndex:0}}/>
        <div style={{position:"absolute",top:"12vh",left:"5vw",zIndex:2}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:28,height:1,background:th.a1,boxShadow:`0 0 6px ${th.a1}`}}/>
            <span style={{fontSize:9,letterSpacing:4,color:th.a1,textTransform:"uppercase",textShadow:`0 0 6px ${th.a1}`}}>Glasscorp · Member Collective · Est. 2024</span>
          </div>
        </div>
        <div style={{position:"relative",zIndex:2,maxWidth:900}}>
          <div style={{fontSize:10,letterSpacing:5,color:th.a2,textTransform:"uppercase",marginBottom:18,textShadow:`0 0 10px ${th.a2}`}}>Rare batches. Real upgrades.</div>
          <h1 style={{fontFamily:"'Inter',sans-serif",fontSize:"clamp(52px,10vw,130px)",fontWeight:900,lineHeight:0.88,letterSpacing:"-0.03em",color:th.text,margin:"0 0 28px",textTransform:"uppercase"}}>
            Glass<span style={{color:th.a1,textShadow:`0 0 30px ${th.a1},0 0 60px ${th.a1}40`}}>corp</span><br/>
            <span style={{fontSize:"0.55em",color:th.a2,textShadow:`0 0 20px ${th.a2}`}}>Arena</span>
          </h1>
          <p style={{fontSize:15,color:th.dim,maxWidth:460,lineHeight:1.8,marginBottom:36}}>{t.heroDesc}</p>
          <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
            <GBtn onClick={onShelf} color={th.a1}>{t.visitShelf}</GBtn>
            <GBtn onClick={onRedeem} color={th.a2} outline>{t.redeemGMC}</GBtn>
          </div>
          <div style={{display:"flex",gap:44,marginTop:52,paddingTop:28,borderTop:`1px solid ${th.border}`}}>
            {[["80+","Batches Available"],["GMC","Exclusive Token"],["1-2hr","Portal Time"]].map(([n,l])=>(
              <div key={l}>
                <div style={{fontFamily:"'Inter',sans-serif",fontSize:"clamp(22px,4vw,38px)",fontWeight:900,color:th.a1,textShadow:`0 0 15px ${th.a1}`,lineHeight:1}}>{n}</div>
                <div style={{fontSize:9,letterSpacing:3,color:th.dim,textTransform:"uppercase",marginTop:4}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <style>{`@keyframes marqueeAnim{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      </section>

      {/* MARQUEE — AZRON's proclamation */}
      <div style={{overflow:"hidden",background:"linear-gradient(90deg,rgba(123,47,255,0.15),rgba(232,160,32,0.15),rgba(123,47,255,0.15))",borderTop:"1px solid rgba(232,160,32,0.2)",borderBottom:"1px solid rgba(232,160,32,0.2)",padding:"12px 0",position:"relative"}}>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,#080612 0%,transparent 10%,transparent 90%,#080612 100%)",pointerEvents:"none",zIndex:1}}/>
        <div style={{display:"flex",animation:"marqueeAnim 32s linear infinite",whiteSpace:"nowrap"}}>
          {[...Array(4)].map((_,i)=>(
            <span key={i} style={{fontSize:9,fontWeight:700,letterSpacing:4,color:"rgba(232,160,32,0.7)",textTransform:"uppercase",paddingRight:60}}>
              ⬡ AZRON'S VAULT IS OPEN &nbsp;·&nbsp; GMC MEMBERS ONLY &nbsp;·&nbsp; RARE BATCHES INSIDE &nbsp;·&nbsp; GLASSCORP ARENA &nbsp;·&nbsp; ENTER THE REALM &nbsp;·&nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* FEATURED BATCHES — AZRON's outer chamber with real background */}
      <section style={{position:"relative",width:"100%",overflow:"hidden",padding:"140px 5vw 180px",
        background:"#080612"}}>
        {/* REAL background image */}
        <div style={{position:"absolute",inset:0,
          backgroundImage:`url(${CHARS.FEATURED_BG})`,
          backgroundSize:"cover",
          backgroundPosition:"center center",
          backgroundRepeat:"no-repeat",
          opacity:0.9,
          pointerEvents:"none"}}/>
        {/* top bleed from hero */}
        <div style={{position:"absolute",top:0,left:0,width:"100%",height:160,
          background:"linear-gradient(180deg,#080612,transparent)",pointerEvents:"none",zIndex:1}}/>
        {/* bottom bleed into vault */}
        <div style={{position:"absolute",bottom:0,left:0,width:"100%",height:160,
          background:"linear-gradient(180deg,transparent,#06040e)",pointerEvents:"none",zIndex:1}}/>
        {/* center dark overlay so cards stay readable */}
        <div style={{position:"absolute",inset:0,
          background:"linear-gradient(90deg,rgba(8,6,18,0.3) 0%,rgba(8,6,18,0.1) 30%,rgba(8,6,18,0.1) 70%,rgba(8,6,18,0.3) 100%)",
          pointerEvents:"none",zIndex:1}}/>
        {/* CONTENT */}
        <div style={{position:"relative",zIndex:2,maxWidth:1400,margin:"0 auto"}}>
          {/* section header */}
          <div style={{textAlign:"center",marginBottom:80}}>
            <div style={{color:"#e8a020",letterSpacing:"0.4em",fontSize:12,marginBottom:18,opacity:0.75}}>◆ OUTER CHAMBER ◆</div>
            <h2 style={{fontFamily:"'Inter',sans-serif",color:"#f4d28d",fontSize:"clamp(42px,7vw,88px)",lineHeight:1,margin:0,letterSpacing:"0.06em",fontWeight:900,textTransform:"uppercase"}}>
              FEATURED BATCHES
            </h2>
            <p style={{marginTop:20,color:"#b7aacd",letterSpacing:"0.22em",fontSize:13,opacity:0.7}}>HAND SELECTED · SPIRIT APPROVED</p>
          </div>
          {/* card grid */}
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:24}}>
            <GBtn onClick={onShelf} color={th.border} outline>{t.visitShelf} →</GBtn>
          </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:3}}>
          {featuredStrains.map(s=>(
            <StrainCard key={s.id} strain={s} t={t}
              onView={onView||(()=>{})}
              onAddToCart={()=>setSheetStrain(s)}
              cartQty={(cart||[]).find(i=>i.strainId===s.id)?.qty||0}
              calcDiscount={calcDiscount}
              calcCartItem={calcCartItem}
              discountSettings={discountSettings}/>
          ))}
          {sheetStrain&&calcCartItem&&(
            <StrainQuickAdd
              strain={sheetStrain}
              existingQty={(cart||[]).find(i=>i.strainId===sheetStrain.id)?.qty||1}
              calcDiscount={calcDiscount}
              calcCartItem={calcCartItem}
              discountSettings={discountSettings}
              onClose={()=>setSheetStrain(null)}
              onConfirm={(id,qty)=>{ onAddToCart&&onAddToCart(id,qty,true); setSheetStrain(null); }}
            />
          )}
        </div>
        </div>{/* end content */}
        {/* bottom bleed into vault */}
        <div style={{position:"absolute",bottom:0,left:0,width:"100%",height:260,background:"linear-gradient(180deg,rgba(6,4,14,0),#06040e)",pointerEvents:"none",zIndex:2}}/>
      </section>

      {/* THE VAULT — AZRON's sacred cave entrance with real images */}
      <style>{`
        @keyframes floatCrystal{0%,100%{transform:translateY(0px)}50%{transform:translateY(-20px)}}
        @keyframes floatCrystal2{0%,100%{transform:translateY(0px)}50%{transform:translateY(-15px)}}
        @keyframes floatCrystal3{0%,100%{transform:translateY(0px)}50%{transform:translateY(-18px)}}
        @media(max-width:900px){.vault-grid{grid-template-columns:1fr!important;gap:40px!important;}}
      `}</style>
      <section style={{position:"relative",width:"100%",overflow:"hidden",padding:"140px 5vw 160px",background:"#06040e"}}>
        {/* REAL vault background image */}
        <div style={{position:"absolute",inset:0,
          backgroundImage:`url(${CHARS.VAULT_BG})`,
          backgroundSize:"cover",
          backgroundPosition:"center right",
          backgroundRepeat:"no-repeat",
          opacity:0.85,
          pointerEvents:"none"}}/>
        {/* top bleed */}
        <div style={{position:"absolute",top:0,left:0,width:"100%",height:160,background:"linear-gradient(180deg,#06040e,transparent)",pointerEvents:"none",zIndex:1}}/>
        {/* left text area darkener */}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,rgba(6,4,14,0.7) 0%,rgba(6,4,14,0.4) 40%,rgba(6,4,14,0.1) 60%,transparent 80%)",pointerEvents:"none",zIndex:1}}/>
        {/* bottom bleed */}
        <div style={{position:"absolute",bottom:0,left:0,width:"100%",height:160,background:"linear-gradient(180deg,transparent,#080612)",pointerEvents:"none",zIndex:1}}/>

        {/* CONTENT */}
        <div className="vault-grid" style={{position:"relative",zIndex:2,maxWidth:1400,margin:"0 auto",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"clamp(40px,6vw,80px)",alignItems:"center"}}>

          {/* LEFT — title + crystals + button */}
          <div style={{position:"relative",zIndex:2}}>
            <div style={{color:"#e8a020",letterSpacing:"0.35em",fontSize:12,marginBottom:18,opacity:0.7}}>◆ AZRON'S SACRED VAULT ◆</div>
            <h2 style={{fontFamily:"'Inter',sans-serif",color:"#f4d28d",fontSize:"clamp(52px,8vw,120px)",lineHeight:0.95,margin:0,letterSpacing:"0.06em",fontWeight:900,textTransform:"uppercase",textShadow:"0 0 40px rgba(232,160,32,0.15)"}}>
              THE VAULT
            </h2>
            <p style={{marginTop:28,color:"#b7aacd",fontSize:15,lineHeight:1.8,maxWidth:480,opacity:0.82}}>
              Beyond this threshold lies AZRON's hidden treasury — sacred relics suspended inside ancient divine circuitry.
            </p>

            {/* 3 crystals with labels */}
            <div style={{display:"flex",gap:32,marginTop:44,alignItems:"flex-end"}}>
              {[
                {img:CHARS.CRYSTAL_EXOTIC,label:"EXOTIC",color:"#e8a020",delay:"0s",size:90},
                {img:CHARS.CRYSTAL_PREMIUM,label:"PREMIUM",color:"#7b2fff",delay:"1.2s",size:80},
                {img:CHARS.CRYSTAL_TOP,label:"TOP",color:"#00d4ff",delay:"0.6s",size:85},
              ].map(({img,label,color,delay,size})=>(
                <div key={label} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
                  <img src={img} alt={label}
                    style={{width:size,height:"auto",objectFit:"contain",
                      animation:`floatCrystal 6s ease-in-out infinite`,
                      animationDelay:delay,
                      filter:`drop-shadow(0 0 12px ${color}60)`,
                    }}/>
                  <span style={{fontSize:8,letterSpacing:3,color,textTransform:"uppercase",opacity:0.8}}>{label}</span>
                </div>
              ))}
            </div>

            <button onClick={onShelf}
              style={{marginTop:40,padding:"16px 32px",border:"1px solid rgba(232,160,32,0.5)",background:"rgba(6,4,14,0.8)",color:"#f4d28d",letterSpacing:"0.18em",fontSize:12,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontWeight:700,textTransform:"uppercase",transition:"transform 0.3s ease,border-color 0.3s ease"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.03)";e.currentTarget.style.borderColor="rgba(232,160,32,0.9)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.borderColor="rgba(232,160,32,0.5)";}}>
              ◆ ENTER THE VAULT ◆
            </button>
          </div>

          {/* RIGHT — empty, vault bg image fills this side */}
          <div style={{position:"relative",minHeight:"clamp(300px,50vw,600px)"}}/>
        </div>
        {/* bottom bleed into GMC */}
        <div style={{position:"absolute",bottom:0,left:0,width:"100%",height:200,background:"linear-gradient(180deg,transparent,#080612)",pointerEvents:"none",zIndex:2}}/>
      </section>

      {/* GMC INFO — AZRON's deepest treasury chamber */}
      <section style={{padding:"100px 5vw",position:"relative",overflow:"hidden",
        background:"linear-gradient(180deg,#08050f 0%,#080612 50%,#06040e 100%)"}}>
        {/* seamless bleed from cave */}
        <div style={{position:"absolute",top:0,left:0,right:0,height:100,background:"linear-gradient(180deg,#08050f,transparent)",pointerEvents:"none",zIndex:1}}/>
        {/* gold treasury glow — warm amber from center */}
        <div style={{position:"absolute",top:"40%",left:"50%",transform:"translate(-50%,-50%)",width:"70vw",height:"50vw",borderRadius:"50%",background:"radial-gradient(circle,rgba(232,160,32,0.08) 0%,rgba(123,47,255,0.06) 40%,transparent 70%)",pointerEvents:"none"}}/>
        {/* purple depth from corners */}
        <div style={{position:"absolute",top:0,left:0,width:"40vw",height:"40vw",background:"radial-gradient(circle at top left,rgba(123,47,255,0.1) 0%,transparent 60%)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:0,right:0,width:"40vw",height:"40vw",background:"radial-gradient(circle at bottom right,rgba(123,47,255,0.08) 0%,transparent 60%)",pointerEvents:"none"}}/>
        {/* ancient gold vein lines */}
        <div style={{position:"absolute",top:0,left:"5vw",right:"5vw",height:1,background:"linear-gradient(90deg,transparent,rgba(232,160,32,0.4),rgba(123,47,255,0.3),rgba(232,160,32,0.4),transparent)"}}/>
        {/* stone texture */}
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(232,160,32,0.012) 1px,transparent 1px)",backgroundSize:"100% 50px",pointerEvents:"none"}}/>
        <div style={{position:"relative",zIndex:1,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,380px),1fr))",gap:"6vw",alignItems:"center"}}>
          <div>
            <div style={{fontSize:10,letterSpacing:5,color:th.amber,textTransform:"uppercase",marginBottom:14,textShadow:`0 0 8px ${th.amber}`}}>— The Token</div>
            <h2 style={{fontFamily:"'Inter',sans-serif",fontSize:"clamp(32px,5vw,64px)",fontWeight:900,letterSpacing:"-0.02em",color:th.text,margin:"0 0 20px",textTransform:"uppercase",lineHeight:0.9}}>
              {t.gmcTitle}
            </h2>
            <p style={{fontSize:15,color:th.dim,lineHeight:1.8,marginBottom:32,maxWidth:420}}>{t.gmcDesc}</p>

            {/* 4 numbered steps — each a real clickable button */}
            <div style={{display:"flex",flexDirection:"column",gap:2,marginBottom:32}}>
              {[
                {num:"01",label:t.step1,desc:t.step1d,action:onRedeem,icon:"🔑"},
                {num:"02",label:t.step2,desc:t.step2d,action:onRedeem,icon:"💎"},
                {num:"03",label:t.step3,desc:t.step3d,action:onShelf,icon:"🌿"},
                {num:"04",label:t.step4,desc:t.step4d,action:onShelf,icon:"📦"},
              ].map(({num,label,desc,action,icon})=>(
                <button key={num} onClick={action}
                  style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",background:th.bgCard,border:`1px solid ${th.border}`,cursor:"pointer",textAlign:"left",fontFamily:"'Inter',sans-serif",transition:"all 0.2s",width:"100%"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=th.amber;e.currentTarget.style.boxShadow=`0 0 14px ${th.amber}20`;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=th.border;e.currentTarget.style.boxShadow="none";}}>
                  <div style={{fontSize:9,fontWeight:900,color:th.amber,letterSpacing:2,opacity:0.6,flexShrink:0,width:24}}>{num}</div>
                  <div style={{fontSize:18,flexShrink:0}}>{icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,letterSpacing:2,color:th.a1,textTransform:"uppercase",marginBottom:3}}>{label}</div>
                    <div style={{fontSize:12,color:th.dim}}>{desc}</div>
                  </div>
                  <div style={{fontSize:12,color:th.dim,flexShrink:0}}>→</div>
                </button>
              ))}
            </div>

            {/* Contact buttons */}
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button onClick={onRedeem}
                style={{flex:1,padding:"13px 16px",background:"#25d36620",border:"1px solid #25d36660",color:"#25d366",cursor:"pointer",fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.2s"}}
                onMouseEnter={e=>{e.currentTarget.style.background="#25d36635";}}
                onMouseLeave={e=>{e.currentTarget.style.background="#25d36620";}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </button>
              <button onClick={()=>window.open("https://line.me/ti/p/~glasscorp")}
                style={{flex:1,padding:"13px 16px",background:"#06c75520",border:"1px solid #06c75560",color:"#06c755",cursor:"pointer",fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.2s"}}
                onMouseEnter={e=>{e.currentTarget.style.background="#06c75535";}}
                onMouseLeave={e=>{e.currentTarget.style.background="#06c75520";}}>
                💬 LINE
              </button>
            </div>
          </div>

          {/* RIGHT — GMC coin card */}
          <div style={{background:th.bgCard,border:`1px solid ${th.amber}40`,padding:"56px 36px",textAlign:"center",boxShadow:`0 0 40px ${th.amber}10`,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"150%",height:"150%",borderRadius:"50%",background:`radial-gradient(circle,${th.amber}08 0%,transparent 60%)`,pointerEvents:"none"}}/>
            <div style={{position:"relative",zIndex:1}}>
              <GMCCoin size={80} theme={{amber:"#e8a020"}}/>
              <div style={{fontFamily:"'Inter',sans-serif",fontSize:"clamp(48px,8vw,80px)",fontWeight:900,color:"#e8a020",lineHeight:0.9,letterSpacing:"-0.04em",textShadow:"0 0 40px rgba(232,160,32,0.8)",marginTop:20}}>GMC</div>
              <div style={{fontSize:11,letterSpacing:4,color:th.dim,textTransform:"uppercase",marginTop:12}}>Glasscorp Member Credit</div>
              <div style={{width:"100%",height:1,background:`linear-gradient(90deg,transparent,${th.amber},transparent)`,margin:"20px 0"}}/>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {[["1 THB","= 1 GMC"],["1,000 GMC","Minimum load"],["1-2 Hours","Portal delivery"]].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${th.border}`}}>
                    <span style={{fontSize:13,fontWeight:700,color:th.amber,fontFamily:"'Inter',sans-serif"}}>{k}</span>
                    <span style={{fontSize:12,color:th.dim}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RANKS */}
      <section style={{padding:"100px 5vw",background:th.bg}}>
        <div style={{fontSize:10,letterSpacing:5,color:th.a2,textTransform:"uppercase",marginBottom:14,textShadow:`0 0 8px ${th.a2}`}}>— Member Ranks</div>
        <h2 style={{fontFamily:"'Inter',sans-serif",fontSize:"clamp(32px,5vw,64px)",fontWeight:900,letterSpacing:"-0.02em",color:th.text,margin:"0 0 44px",textTransform:"uppercase",lineHeight:0.9}}>
          Climb the<br/><span style={{color:th.a2,textShadow:`0 0 20px ${th.a2}`}}>Guild</span>
        </h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:2}}>
          {RANKS.map((r,i)=>(
            <div key={r.name} style={{background:th.bgCard,border:`1px solid ${r.color}35`,padding:"24px 16px",textAlign:"center",boxShadow:`0 0 15px ${r.color}08`}}>
              <div style={{fontSize:26,marginBottom:10}}>{r.icon}</div>
              <div style={{fontFamily:"'Inter',sans-serif",fontSize:16,fontWeight:900,color:r.color,textTransform:"uppercase",letterSpacing:1,marginBottom:6,textShadow:`0 0 10px ${r.color}`}}>{r.name}</div>
              <div style={{fontSize:9,letterSpacing:2,color:th.dim,textTransform:"uppercase"}}>{r.min.toLocaleString()}+ GMC</div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{background:th.bgDeep,borderTop:`1px solid ${th.border}`,position:"relative",overflow:"hidden"}}>
        <style>{`
          @keyframes glitchFooter{0%,92%,100%{transform:translate(0)}93%{transform:translate(-2px,1px)}96%{transform:translate(2px,-1px)}99%{transform:translate(-1px,0)}}
          @keyframes engineerShimmer{0%,100%{opacity:0.6;text-shadow:0 0 20px #00d4ff30}50%{opacity:1;text-shadow:0 0 30px #00d4ff,0 0 60px #00d4ff30,0 0 80px #7b2fff20}}
        `}</style>

        {/* Top accent */}
        <div style={{height:1,background:`linear-gradient(90deg,transparent,${th.a1}80,${th.a2}80,${th.a1}80,transparent)`}}/>

        {/* TAGLINE — full width hero */}
        <div style={{padding:"28px 5vw 24px",textAlign:"center",position:"relative"}}>
          <div style={{
            fontFamily:"'Inter',sans-serif",
            fontSize:"clamp(22px,4.5vw,52px)",
            fontWeight:900,
            color:th.a1,
            letterSpacing:"0.08em",
            textTransform:"uppercase",
            lineHeight:1,
            animation:"engineerShimmer 3s ease-in-out infinite",
          }}>
            Engineered for Experience
          </div>
        </div>

        {/* Divider */}
        <div style={{height:1,background:`linear-gradient(90deg,transparent,${th.border},transparent)`,margin:"0 5vw"}}/>

        {/* Bottom strip — compact single line */}
        <div style={{padding:"12px 5vw 72px 5vw",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{fontFamily:"'Inter',sans-serif",fontSize:14,fontWeight:900,color:th.a1,textTransform:"uppercase",letterSpacing:"-0.01em",textShadow:`0 0 10px ${th.a1}`,animation:"glitchFooter 8s ease-in-out infinite"}}>Glasscorp</div>
            <div style={{width:1,height:12,background:th.border}}/>
            <span style={{fontSize:9,color:th.dim,letterSpacing:3,textTransform:"uppercase"}}>Glasscorp City · 2026</span>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <span style={{fontSize:9,color:th.dim,letterSpacing:1}}>© Glasscorp Arena</span>
            <span style={{background:"#e8a020",color:"#000",fontWeight:900,fontSize:9,padding:"2px 8px",letterSpacing:2}}>21+</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── PROFILE ──
function ProfilePage({t,user,onLogin,onSkip,onLogout,onShowPin,onShelf,onRedeem,onUpdateProfile,transactions,onAddToCart,strains,onOpenCart,orders}){
  const th=T.base;
  // auth state managed below in auth screens

  // Delivery profile state
  const [editingDelivery,setEditingDelivery]=useState(false);
  const [deliveryAddress,setDeliveryAddress]=useState(user?.deliveryAddress||"");
  const [riderPhone,setRiderPhone]=useState(user?.riderPhone||"");
  const [countryCode,setCountryCode]=useState(user?.countryCode||"+66");
  const [deliveryTime,setDeliveryTime]=useState(user?.deliveryTime||"");
  const [deliverySaved,setDeliverySaved]=useState(false);
  const [mapsLink,setMapsLink]=useState(user?.mapsLink||"");
  const [locating,setLocating]=useState(false);
  const [locateErr,setLocateErr]=useState("");



  function saveDelivery(){
    if(!user) return;
    const updated={...user,deliveryAddress,mapsLink,riderPhone,countryCode,deliveryTime};
    onUpdateProfile(updated);
    setDeliverySaved(true);
    setEditingDelivery(false);
    setTimeout(()=>setDeliverySaved(false),2500);
  }



  // ── AUTH SCREENS ──
  const [authScreen,setAuthScreen]=useState("login"); // login | signup | forgot | personame
  const [authEmail,setAuthEmail]=useState("");
  const [authPassword,setAuthPassword]=useState("");
  const [authConfirm,setAuthConfirm]=useState("");
  const [authPersoname,setAuthPersoname]=useState("");
  const [authLoading,setAuthLoading]=useState(false);
  const [authError,setAuthError]=useState("");
  const [authSuccess,setAuthSuccess]=useState("");
  const [authGoogleUser,setAuthGoogleUser]=useState(null); // temp hold google user while picking personame
  const [personameStatus,setPersonameStatus]=useState(""); // "" | "checking" | "available" | "taken"
  const personameTimer=useRef(null);

  function checkPersoname(val){
    setPersonameStatus("");
    if(personameTimer.current) clearTimeout(personameTimer.current);
    if(!val||val.trim().length<2){ setPersonameStatus(""); return; }
    setPersonameStatus("checking");
    personameTimer.current=setTimeout(async()=>{
      const unique=await sbCheckPersonameUnique(val.trim());
      setPersonameStatus(unique?"available":"taken");
    },600);
  }

  async function handleLogin(){
    if(!authPersoname.trim()||!authPassword.trim()) return;
    setAuthLoading(true); setAuthError(""); setAuthSuccess("");
    // Convert personame to internal email
    const fakeEmail=authPersoname.trim().toLowerCase().replace(/[^a-z0-9]/g,"_")+"@glasscorp.gg";
    const {data,error}=await sbSignIn(fakeEmail,authPassword.trim());
    if(error){ setAuthError("Wrong codename or password. Try again."); setAuthLoading(false); return; }
    const token=data.access_token;
    localStorage.setItem("glasscorp_session",token);
    const authId=data.user?.id;
    const member=await sbGetMemberByAuthId(authId);
    if(member){
      onLogin(member);
    } else {
      setAuthError("Account not found. Please sign up.");
    }
    setAuthLoading(false);
  }

  async function handleSignup(){
    if(!authPassword.trim()||!authPersoname.trim()) return;
    if(authPassword!==authConfirm){ setAuthError("Passwords do not match."); return; }
    if(authPassword.length<6){ setAuthError("Password must be at least 6 characters."); return; }
    if(authPersoname.trim().length<2){ setAuthError("Personame must be at least 2 characters."); return; }
    setAuthLoading(true); setAuthError(""); setAuthSuccess("");
    // Check personame unique
    const unique=await sbCheckPersonameUnique(authPersoname.trim());
    if(!unique){ setAuthError("That Personame is already taken. Choose another."); setAuthLoading(false); return; }
    // Build internal fake email from personame for Supabase Auth
    const fakeEmail=authPersoname.trim().toLowerCase().replace(/[^a-z0-9]/g,"_")+"@glasscorp.gg";
    // Create auth account with fake email
    const {data,error}=await sbSignUp(fakeEmail,authPassword.trim());
    if(error){ setAuthError(error); setAuthLoading(false); return; }
    const authId=data.user?.id||data.id;
    if(!authId){ setAuthError("Signup failed. Please try again."); setAuthLoading(false); return; }
    // Store real email (if provided) in members table for recovery + Google linking
    const realEmail=authEmail.trim()||fakeEmail;
    const saved=await sbCreateMember(authId,realEmail,authPersoname.trim());
    if(saved){
      const token=data.session?.access_token||data.access_token||"";
      if(token) localStorage.setItem("glasscorp_session",token);
      // Auto-login if session returned, otherwise prompt
      if(token){
        onLogin(dbToMember(saved));
      } else {
        setAuthSuccess("Welcome to The Arena! You can now log in with your Personame.");
        setAuthScreen("login");
      }
    } else {
      setAuthError("Signup failed. Please try again.");
    }
    setAuthLoading(false);
  }

  async function handleForgot(){
    if(!authPersoname.trim()) return;
    setAuthLoading(true); setAuthError(""); setAuthSuccess("");
    // Look up member by personame to get their real email
    const rows=await sbGet("members","personame=eq."+encodeURIComponent(authPersoname.trim())+"&select=email");
    if(!rows||rows.length===0){
      setAuthError("Personame not found. Check your codename.");
      setAuthLoading(false); return;
    }
    const email=rows[0].email||"";
    if(!email||email.endsWith("@glasscorp.gg")){
      setAuthError("No recovery email on file. Please contact support.");
      setAuthLoading(false); return;
    }
    const ok=await sbForgotPassword(email);
    setAuthLoading(false);
    if(ok){ setAuthSuccess("Reset link sent to your email!"); }
    else { setAuthError("Failed to send reset email. Try again."); }
  }

  // Check for pending Google user (new Google signup needs personame)
  useEffect(()=>{
    const pending=localStorage.getItem("glasscorp_google_pending");
    if(pending){
      try{
        const gUser=JSON.parse(pending);
        setAuthGoogleUser(gUser);
        setAuthScreen("personame");
        localStorage.removeItem("glasscorp_google_pending");
      }catch(_){}
    }
  },[]);

  async function handlePersonameSubmit(){
    if(!authPersoname.trim()||!authGoogleUser) return;
    setAuthLoading(true); setAuthError("");
    const unique=await sbCheckPersonameUnique(authPersoname.trim());
    if(!unique){ setAuthError("That Personame is taken. Choose another."); setAuthLoading(false); return; }
    const saved=await sbCreateMember(
      authGoogleUser.id, authGoogleUser.email,
      authPersoname.trim(), authGoogleUser.user_metadata?.avatar_url||""
    );
    if(saved){
      onLogin(dbToMember(saved));
    } else {
      setAuthError("Failed to create profile. Please try again.");
    }
    setAuthLoading(false);
  }

  const inputStyle={width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.04)",border:`1px solid ${th.border}`,color:th.text,padding:"14px 16px",fontSize:14,fontFamily:"'Inter',sans-serif",outline:"none",transition:"border 0.2s",marginBottom:12};

  if(!user) return(
    <div style={{minHeight:"100vh",background:th.bgDeep,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 20px 120px",position:"relative",overflow:"hidden"}}>
      <style>{`
        @keyframes accessScan{0%{transform:translateY(-100%)}100%{transform:translateY(200vh)}}
        .gc-input:focus{border-color:#00d4ff!important;outline:none!important;}
        .gc-input::placeholder{color:#7a7090!important;}
        .gc-btn:hover{opacity:0.85!important;}
      `}</style>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(0,212,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.02) 1px,transparent 1px)",backgroundSize:"44px 44px",pointerEvents:"none"}}/>
      <div style={{position:"absolute",left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(0,212,255,0.08),transparent)",animation:"accessScan 10s linear infinite",pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:"30%",left:"50%",transform:"translate(-50%,-50%)",width:"60vw",height:"60vw",borderRadius:"50%",background:"radial-gradient(circle,rgba(123,47,255,0.05) 0%,transparent 65%)",pointerEvents:"none"}}/>

      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:400}}>

        {/* Logo / Brand */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:9,letterSpacing:5,color:th.a1,textTransform:"uppercase",marginBottom:10,textShadow:`0 0 8px ${th.a1}`}}>◆ Glasscorp Arena ◆</div>
          <div style={{fontFamily:"'Inter',sans-serif",fontSize:"clamp(26px,5vw,36px)",fontWeight:900,color:th.text,textTransform:"uppercase",letterSpacing:"-0.02em",lineHeight:0.95,marginBottom:8}}>
            {authScreen==="login"&&<>Enter The<br/><span style={{color:th.a1,textShadow:`0 0 16px ${th.a1}`}}>Arena</span></>}
            {authScreen==="signup"&&<>Join The<br/><span style={{color:th.a2,textShadow:`0 0 16px ${th.a2}`}}>Arena</span></>}
            {authScreen==="forgot"&&<>Reset<br/><span style={{color:th.amber,textShadow:`0 0 16px ${th.amber}`}}>Access</span></>}
            {authScreen==="personame"&&<>Choose Your<br/><span style={{color:th.a1,textShadow:`0 0 16px ${th.a1}`}}>Codename</span></>}
          </div>
          <div style={{fontSize:11,color:th.dim,lineHeight:1.6}}>
            {authScreen==="login"&&"Enter your credentials to access The Vault"}
            {authScreen==="signup"&&"Create your Glasscorp identity"}
            {authScreen==="forgot"&&"We'll send a reset link to your email"}
            {authScreen==="personame"&&"Pick a unique codename for The Arena"}
          </div>
        </div>

        {/* Card */}
        <div style={{background:`${th.bgCard}f0`,border:`1px solid ${th.border}`,padding:"28px",backdropFilter:"blur(20px)",boxShadow:"0 0 60px rgba(123,47,255,0.06)",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:authScreen==="login"?`linear-gradient(90deg,transparent,${th.a1},transparent)`:authScreen==="signup"?`linear-gradient(90deg,transparent,${th.a2},transparent)`:`linear-gradient(90deg,transparent,${th.amber},transparent)`}}/>

          {/* Error / Success */}
          {authError&&<div style={{padding:"10px 14px",background:"rgba(232,80,32,0.1)",border:"1px solid rgba(232,80,32,0.3)",color:"#e85020",fontSize:11,marginBottom:14,letterSpacing:0.5}}>{authError}</div>}
          {authSuccess&&<div style={{padding:"10px 14px",background:"rgba(0,255,136,0.08)",border:"1px solid rgba(0,255,136,0.25)",color:"#00ff88",fontSize:11,marginBottom:14,letterSpacing:0.5}}>{authSuccess}</div>}

          {/* ── LOGIN SCREEN ── */}
          {authScreen==="login"&&(<>
            <div style={{fontSize:8,letterSpacing:3,color:th.dim,textTransform:"uppercase",marginBottom:5}}>Personame</div>
            <input className="gc-input" type="text" placeholder="Your PERSONA name..." value={authPersoname} onChange={e=>{setAuthPersoname(e.target.value);setAuthError("");}} onKeyDown={e=>e.key==="Enter"&&handleLogin()} autoFocus style={{...inputStyle}} onFocus={e=>e.target.style.borderColor=th.a1} onBlur={e=>e.target.style.borderColor=th.border}/>
            <div style={{fontSize:8,letterSpacing:3,color:th.dim,textTransform:"uppercase",marginBottom:5}}>Password</div>
            <input className="gc-input" type="password" placeholder="••••••••" value={authPassword} onChange={e=>{setAuthPassword(e.target.value);setAuthError("");}} onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={{...inputStyle,marginBottom:6}} onFocus={e=>e.target.style.borderColor=th.a1} onBlur={e=>e.target.style.borderColor=th.border}/>
            <div style={{textAlign:"right",marginBottom:20}}>
              <button onClick={()=>{setAuthScreen("forgot");setAuthError("");setAuthSuccess("");}} style={{background:"none",border:"none",color:th.dim,cursor:"pointer",fontSize:10,letterSpacing:1,fontFamily:"'Inter',sans-serif",textDecoration:"underline",opacity:0.7}}>Forgot password?</button>
            </div>
            <button className="gc-btn" onClick={handleLogin} disabled={authLoading||!authPersoname||!authPassword} style={{width:"100%",padding:"15px",background:th.a1,border:"none",color:th.bgDeep,cursor:"pointer",fontSize:11,fontWeight:900,letterSpacing:3,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",marginBottom:10,opacity:authLoading?0.6:1,transition:"opacity 0.2s"}}>
              {authLoading?"CONNECTING...":"◆ Enter The Arena"}
            </button>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{flex:1,height:1,background:th.border}}/>
              <span style={{fontSize:9,color:th.dim,letterSpacing:2,textTransform:"uppercase"}}>or</span>
              <div style={{flex:1,height:1,background:th.border}}/>
            </div>
            <button className="gc-btn" onClick={sbSignInWithGoogle} style={{width:"100%",padding:"13px",background:"rgba(255,255,255,0.05)",border:`1px solid ${th.border}`,color:th.text,cursor:"pointer",fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",marginBottom:18,display:"flex",alignItems:"center",justifyContent:"center",gap:10,transition:"opacity 0.2s"}}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
            <div style={{textAlign:"center",borderTop:`1px solid ${th.border}`,paddingTop:16}}>
              <span style={{fontSize:11,color:th.dim}}>Not a member? </span>
              <button onClick={()=>{setAuthScreen("signup");setAuthError("");setAuthSuccess("");setAuthPersoname("");setAuthPassword("");setAuthConfirm("");}} style={{background:"none",border:"none",color:th.a1,cursor:"pointer",fontSize:11,fontFamily:"'Inter',sans-serif",fontWeight:700,textDecoration:"underline"}}>Sign Up</button>
            </div>
          </>)}

          {/* ── SIGNUP SCREEN ── */}
          {authScreen==="signup"&&(<>
            <div style={{fontSize:8,letterSpacing:3,color:th.dim,textTransform:"uppercase",marginBottom:5}}>Personame</div>
            <input className="gc-input" type="text" placeholder="Pick a unique PERSONA name..." value={authPersoname} onChange={e=>{setAuthPersoname(e.target.value);setAuthError("");checkPersoname(e.target.value);}} autoFocus style={{...inputStyle,marginBottom:4,borderColor:personameStatus==="available"?"#00ff88":personameStatus==="taken"?"#e85020":th.border}} onFocus={e=>e.target.style.borderColor=personameStatus==="available"?"#00ff88":personameStatus==="taken"?"#e85020":th.a2} onBlur={e=>e.target.style.borderColor=personameStatus==="available"?"#00ff88":personameStatus==="taken"?"#e85020":th.border}/>
            {personameStatus==="checking"&&<div style={{fontSize:9,color:th.dim,marginBottom:10,letterSpacing:1}}>⟳ Checking availability...</div>}
            {personameStatus==="available"&&<div style={{fontSize:9,color:"#00ff88",marginBottom:10,letterSpacing:1}}>✓ Available</div>}
            {personameStatus==="taken"&&<div style={{fontSize:9,color:"#e85020",marginBottom:10,letterSpacing:1}}>✗ Already taken — choose another</div>}
            {personameStatus===""&&<div style={{marginBottom:10}}/>}
            <div style={{fontSize:8,letterSpacing:3,color:th.dim,textTransform:"uppercase",marginBottom:5}}>Email <span style={{color:th.dim,fontWeight:400,letterSpacing:1,textTransform:"none",fontSize:9}}>(for recovery + Google login)</span></div>
            <input className="gc-input" type="email" placeholder="your@email.com" value={authEmail} onChange={e=>{setAuthEmail(e.target.value);setAuthError("");}} style={{...inputStyle}} onFocus={e=>e.target.style.borderColor=th.a2} onBlur={e=>e.target.style.borderColor=th.border}/>
            <div style={{fontSize:8,letterSpacing:3,color:th.dim,textTransform:"uppercase",marginBottom:5}}>Password</div>
            <input className="gc-input" type="password" placeholder="Min 6 characters" value={authPassword} onChange={e=>{setAuthPassword(e.target.value);setAuthError("");}} style={{...inputStyle}} onFocus={e=>e.target.style.borderColor=th.a2} onBlur={e=>e.target.style.borderColor=th.border}/>
            <div style={{fontSize:8,letterSpacing:3,color:th.dim,textTransform:"uppercase",marginBottom:5}}>Confirm Password</div>
            <input className="gc-input" type="password" placeholder="Repeat password" value={authConfirm} onChange={e=>{setAuthConfirm(e.target.value);setAuthError("");}} style={{...inputStyle,marginBottom:20}} onFocus={e=>e.target.style.borderColor=th.a2} onBlur={e=>e.target.style.borderColor=th.border}/>
            <button className="gc-btn" onClick={handleSignup} disabled={authLoading||!authEmail||!authPassword||!authPersoname||!authConfirm||personameStatus==="taken"||personameStatus==="checking"} style={{width:"100%",padding:"15px",background:th.a2,border:"none",color:"#fff",cursor:"pointer",fontSize:11,fontWeight:900,letterSpacing:3,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",marginBottom:10,opacity:authLoading||personameStatus==="taken"||personameStatus==="checking"?0.4:1,transition:"opacity 0.2s"}}>
              {authLoading?"CREATING...":"◆ Join The Arena"}
            </button>
            {/* Google */}
            <button className="gc-btn" onClick={sbSignInWithGoogle} style={{width:"100%",padding:"13px",background:"rgba(255,255,255,0.05)",border:`1px solid ${th.border}`,color:th.text,cursor:"pointer",fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",marginBottom:18,display:"flex",alignItems:"center",justifyContent:"center",gap:10,transition:"opacity 0.2s"}}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
            <div style={{textAlign:"center",borderTop:`1px solid ${th.border}`,paddingTop:16,display:"flex",justifyContent:"center",gap:16}}>
              <button onClick={()=>{setAuthScreen("login");setAuthError("");setAuthSuccess("");setAuthPersoname("");setAuthPassword("");setAuthConfirm("");}} style={{background:"none",border:"none",color:th.a1,cursor:"pointer",fontSize:11,fontFamily:"'Inter',sans-serif",fontWeight:700,textDecoration:"underline"}}>← Back to Login</button>
            </div>
          </>)}

          {/* ── FORGOT PASSWORD ── */}
          {authScreen==="forgot"&&(<>
            <div style={{fontSize:11,color:th.dim,marginBottom:14,lineHeight:1.6}}>Enter your Personame and we'll send a reset link to your registered email.</div>
            <div style={{fontSize:8,letterSpacing:3,color:th.dim,textTransform:"uppercase",marginBottom:5}}>Personame</div>
            <input className="gc-input" type="text" placeholder="Your PERSONA name..." value={authPersoname} onChange={e=>{setAuthPersoname(e.target.value);setAuthError("");}} onKeyDown={e=>e.key==="Enter"&&handleForgot()} autoFocus style={{...inputStyle,marginBottom:20}} onFocus={e=>e.target.style.borderColor=th.amber} onBlur={e=>e.target.style.borderColor=th.border}/>
            <button className="gc-btn" onClick={handleForgot} disabled={authLoading||!authPersoname.trim()} style={{width:"100%",padding:"15px",background:th.amber,border:"none",color:th.bgDeep,cursor:"pointer",fontSize:11,fontWeight:900,letterSpacing:3,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",marginBottom:18,opacity:authLoading?0.6:1,transition:"opacity 0.2s"}}>
              {authLoading?"SENDING...":"Send Reset Link"}
            </button>
            <div style={{textAlign:"center",borderTop:`1px solid ${th.border}`,paddingTop:16}}>
              <button onClick={()=>{setAuthScreen("login");setAuthError("");setAuthSuccess("");}} style={{background:"none",border:"none",color:th.a1,cursor:"pointer",fontSize:11,fontFamily:"'Inter',sans-serif",fontWeight:700,textDecoration:"underline"}}>← Back to Login</button>
            </div>
          </>)}

          {/* ── PERSONAME PICKER (Google new users) ── */}
          {authScreen==="personame"&&(<>
            <div style={{fontSize:11,color:th.dim,marginBottom:16,lineHeight:1.6}}>Welcome! You're signing in with Google for the first time. Choose a unique PERSONA name for The Arena.</div>
            <div style={{fontSize:8,letterSpacing:3,color:th.dim,textTransform:"uppercase",marginBottom:5}}>Personame</div>
            <input className="gc-input" type="text" placeholder="Pick a unique PERSONA name..." value={authPersoname} onChange={e=>{setAuthPersoname(e.target.value);setAuthError("");checkPersoname(e.target.value);}} onKeyDown={e=>e.key==="Enter"&&handlePersonameSubmit()} autoFocus style={{...inputStyle,marginBottom:4,borderColor:personameStatus==="available"?"#00ff88":personameStatus==="taken"?"#e85020":th.border}} onFocus={e=>e.target.style.borderColor=personameStatus==="available"?"#00ff88":personameStatus==="taken"?"#e85020":th.a1} onBlur={e=>e.target.style.borderColor=personameStatus==="available"?"#00ff88":personameStatus==="taken"?"#e85020":th.border}/>
            {personameStatus==="checking"&&<div style={{fontSize:9,color:th.dim,marginBottom:12,letterSpacing:1}}>⟳ Checking availability...</div>}
            {personameStatus==="available"&&<div style={{fontSize:9,color:"#00ff88",marginBottom:12,letterSpacing:1}}>✓ Available</div>}
            {personameStatus==="taken"&&<div style={{fontSize:9,color:"#e85020",marginBottom:12,letterSpacing:1}}>✗ Already taken — choose another</div>}
            {personameStatus===""&&<div style={{marginBottom:12}}/>}
            <button className="gc-btn" onClick={handlePersonameSubmit} disabled={authLoading||!authPersoname.trim()||personameStatus==="taken"||personameStatus==="checking"} style={{width:"100%",padding:"15px",background:th.a1,border:"none",color:th.bgDeep,cursor:"pointer",fontSize:11,fontWeight:900,letterSpacing:3,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",opacity:authLoading||personameStatus==="taken"||personameStatus==="checking"?0.4:1,transition:"opacity 0.2s"}}>
              {authLoading?"SAVING...":"◆ Confirm Codename"}
            </button>
          </>)}

        </div>

        {/* Guest */}
        {(authScreen==="login"||authScreen==="signup")&&(
          <button onClick={onSkip} style={{width:"100%",marginTop:10,padding:"12px",background:"transparent",border:"none",color:th.dim,cursor:"pointer",fontSize:10,letterSpacing:3,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",opacity:0.5}}>
            Browse as guest →
          </button>
        )}
      </div>
    </div>
  );

  // ── MEMBER CARD ──
  const rank=getRank(user.totalSpent||0);
  const nextRank=RANKS.find(r=>r.min>(user.totalSpent||0));
  const memberId="GC-"+String(user.id||0).slice(-6).padStart(6,"0");
  const joinDate=user.joinedAt?new Date(user.joinedAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—";

  return(
    <div style={{minHeight:"100vh",background:th.bgDeep,padding:"80px 5vw 100px",position:"relative",overflow:"hidden"}}>
      <style>{`
        @keyframes cardShimmer{0%{background-position:200% center}100%{background-position:-200% center}}
        @keyframes rankGlow{0%,100%{box-shadow:0 0 15px ${rank.color}40}50%{box-shadow:0 0 30px ${rank.color}80,0 0 60px ${rank.color}20}}
      `}</style>

      {/* Background */}
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(0,212,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.02) 1px,transparent 1px)",backgroundSize:"44px 44px",pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:"20%",left:"50%",transform:"translate(-50%,-50%)",width:"70vw",height:"70vw",borderRadius:"50%",background:`radial-gradient(circle,${rank.color}06 0%,transparent 60%)`,pointerEvents:"none",transition:"all 1s"}}/>

      <div style={{position:"relative",zIndex:1,maxWidth:520,margin:"0 auto"}}>

        {/* ── MEMBER ID CARD — horizontal premium card ── */}
        <div style={{
          background:`linear-gradient(135deg,${th.bgCard} 0%,#100d28 50%,${th.bgCard} 100%)`,
          border:`1px solid ${rank.color}50`,
          padding:"32px 28px",
          marginBottom:3,
          position:"relative",
          overflow:"hidden",
          boxShadow:`0 0 60px ${rank.color}15,0 20px 60px rgba(0,0,0,0.5)`,
        }}>
          {/* Top accent bar — rank color gradient */}
          <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,transparent,${rank.color},${th.a1},${rank.color},transparent)`,boxShadow:`0 0 12px ${rank.color}`}}/>

          {/* Holographic shimmer overlay */}
          <div style={{position:"absolute",inset:0,background:"linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.015) 50%,transparent 60%)",backgroundSize:"200% 100%",animation:"cardShimmer 6s linear infinite",pointerEvents:"none"}}/>

          {/* Watermark rank name */}
          <div style={{position:"absolute",bottom:-20,right:-10,fontFamily:"'Inter',sans-serif",fontSize:120,fontWeight:900,color:`${rank.color}04`,textTransform:"uppercase",pointerEvents:"none",letterSpacing:"-0.04em",lineHeight:1}}>{rank.name}</div>

          {/* Corner accents */}
          {[[true,false,true,false],[false,false,false,true],[false,true,true,false],[false,true,false,true]].map(([bt,bb,bl,br],i)=>(
            <div key={i} style={{position:"absolute",top:i<2?12:"auto",bottom:i>=2?12:"auto",left:i%2===0?12:"auto",right:i%2===1?12:"auto",width:14,height:14,borderTop:bt?`1px solid ${rank.color}60`:"none",borderBottom:bb?`1px solid ${rank.color}60`:"none",borderLeft:bl?`1px solid ${rank.color}60`:"none",borderRight:br?`1px solid ${rank.color}60`:"none",pointerEvents:"none"}}/>
          ))}

          {/* Card header row */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28}}>
            <div>
              <div style={{fontSize:8,letterSpacing:4,color:th.dim,textTransform:"uppercase",marginBottom:4}}>Glasscorp Collective</div>
              <div style={{fontSize:9,letterSpacing:3,color:rank.color,textTransform:"uppercase",textShadow:`0 0 8px ${rank.color}`}}>Persona Card</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:8,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:4}}>ID</div>
              <div style={{fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:700,color:th.a1,letterSpacing:2}}>{memberId}</div>
            </div>
          </div>

          {/* Rank badge + name */}
          <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:28}}>
            <div style={{
              width:60,height:60,
              borderRadius:"50%",
              background:`linear-gradient(135deg,${rank.color}25,${rank.color}10)`,
              border:`2px solid ${rank.color}`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:26,
              flexShrink:0,
              animation:"rankGlow 3s ease-in-out infinite",
            }}>{rank.icon}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Inter',sans-serif",fontSize:"clamp(22px,5vw,32px)",fontWeight:900,color:th.text,textTransform:"uppercase",letterSpacing:"-0.02em",lineHeight:0.9,marginBottom:6}}>{user.name}</div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:9,letterSpacing:2,color:rank.color,textTransform:"uppercase",fontWeight:700,textShadow:`0 0 6px ${rank.color}`}}>{rank.name}</span>
                <span style={{width:3,height:3,borderRadius:"50%",background:th.dim,display:"inline-block"}}/>
                <span style={{fontSize:9,color:th.dim,letterSpacing:1,textTransform:"uppercase"}}>{user.contact==="line"?`LINE · ${user.lineId||"—"}`:`WA · ${user.phone||"—"}`}</span>
              </div>
            </div>
          </div>

          {/* GMC Balance — hero number */}
          <div style={{background:"rgba(0,0,0,0.35)",border:`1px solid rgba(232,160,32,0.2)`,padding:"20px 24px",marginBottom:20,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(232,160,32,0.4),transparent)"}}/>
            <div style={{fontSize:8,letterSpacing:3,color:th.dim,textTransform:"uppercase",marginBottom:8}}>GMC Balance</div>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <GMCCoin size={40} theme={{amber:"#e8a020"}}/>
              <div>
                <div style={{fontFamily:"'Inter',sans-serif",fontSize:"clamp(36px,7vw,52px)",fontWeight:900,color:"#e8a020",lineHeight:0.9,textShadow:"0 0 30px rgba(232,160,32,0.6)",letterSpacing:"-0.03em"}}>{(user.gmcBalance||0).toLocaleString()}</div>
                <div style={{fontSize:9,letterSpacing:3,color:th.dim,textTransform:"uppercase",marginTop:4}}>GMC · Glasscorp Credits</div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:2,marginBottom:20}}>
            {[
              ["Total Spent",(user.totalSpent||0).toLocaleString()+" GMC","#e8a020"],
              ["Member Since",joinDate,th.a1],
              ["Status","Active","#00ff88"],
            ].map(([l,v,c])=>(
              <div key={l} style={{background:"rgba(0,0,0,0.25)",padding:"12px 10px",borderTop:`1px solid ${c}20`}}>
                <div style={{fontSize:7,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:5}}>{l}</div>
                <div style={{fontSize:11,fontWeight:700,color:c,fontFamily:"'Inter',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v}</div>
              </div>
            ))}
          </div>

          {/* Rank progress */}
          {nextRank&&(
            <div style={{marginBottom:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontSize:8,letterSpacing:2,color:th.dim,textTransform:"uppercase"}}>Progress to {nextRank.name} {nextRank.icon}</span>
                <span style={{fontSize:9,color:nextRank.color,fontWeight:700,letterSpacing:1}}>{(user.totalSpent||0).toLocaleString()} / {nextRank.min.toLocaleString()}</span>
              </div>
              <div style={{height:4,background:"rgba(255,255,255,0.05)",overflow:"hidden",position:"relative"}}>
                <div style={{width:Math.min(100,((user.totalSpent||0)/nextRank.min)*100)+"%",height:"100%",background:`linear-gradient(90deg,${rank.color},${nextRank.color})`,boxShadow:`0 0 8px ${rank.color}`,transition:"width 0.8s ease"}}/>
              </div>
              <div style={{fontSize:8,color:th.dim,marginTop:4,letterSpacing:1}}>
                {(nextRank.min-(user.totalSpent||0)).toLocaleString()} GMC to next rank
              </div>
            </div>
          )}

          {/* ── DELIVERY PROFILE ── */}
          <div style={{marginBottom:14,border:`1px solid ${editingDelivery?th.a1:th.border}`,transition:"border 0.2s",overflow:"hidden"}}>
            {/* Header — tap to toggle */}
            <button onClick={()=>setEditingDelivery(e=>!e)} style={{width:"100%",padding:"12px 14px",background:"rgba(0,0,0,0.25)",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",fontFamily:"'Inter',sans-serif"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:12}}>📡</span>
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:9,letterSpacing:2,color:editingDelivery?th.a1:th.dim,textTransform:"uppercase",fontWeight:700}}>Portal</div>
                  {!editingDelivery&&user.deliveryAddress&&(
                    <div style={{fontSize:9,color:th.dim,marginTop:2,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.deliveryAddress}</div>
                  )}
                  {!editingDelivery&&!user.deliveryAddress&&(
                    <div style={{fontSize:9,color:"#e8a020",marginTop:2}}>Tap to set up your portal</div>
                  )}
                </div>
              </div>
              <span style={{fontSize:10,color:th.dim,transition:"transform 0.2s",transform:editingDelivery?"rotate(180deg)":"rotate(0deg)"}}>▼</span>
            </button>

            {/* Expanded form */}
            {editingDelivery&&(
              <div style={{padding:"14px",background:"rgba(0,0,0,0.15)",display:"flex",flexDirection:"column",gap:10}}>

                {/* Delivery Address */}
                <div>
                  <div style={{fontSize:8,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:5}}>Portal Address</div>
                  <textarea
                    value={deliveryAddress}
                    onChange={e=>setDeliveryAddress(e.target.value)}
                    placeholder="Building name, floor, room / street / area / landmark..."
                    rows={2}
                    style={{width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.03)",border:`1px solid ${th.border}`,color:th.text,padding:"11px 13px",fontSize:12,outline:"none",fontFamily:"'Inter',sans-serif",resize:"none",lineHeight:1.6}}
                    onFocus={e=>e.target.style.borderColor=th.a1}
                    onBlur={e=>e.target.style.borderColor=th.border}
                  />
                  {/* Google Maps link */}
                  <div style={{fontSize:8,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:5,marginTop:8}}>Google Maps Link</div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <input
                      value={mapsLink}
                      onChange={e=>setMapsLink(e.target.value)}
                      placeholder="Paste your Google Maps link..."
                      style={{flex:1,background:"rgba(255,255,255,0.03)",border:`1px solid ${mapsLink?th.a1:th.border}`,color:th.text,padding:"10px 13px",fontSize:11,outline:"none",fontFamily:"'Inter',sans-serif",transition:"border 0.2s"}}
                      onFocus={e=>e.target.style.borderColor=th.a1}
                      onBlur={e=>e.target.style.borderColor=mapsLink?th.a1:th.border}
                    />
                    {/* Locate me button */}
                    <button
                      onClick={()=>{
                        if(!navigator.geolocation){setLocateErr("Geolocation not supported on this device");return;}
                        setLocating(true);setLocateErr("");
                        navigator.geolocation.getCurrentPosition(
                          pos=>{
                            setMapsLink(`https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`);
                            setLocating(false);
                          },
                          err=>{
                            setLocating(false);
                            setLocateErr("Location access denied. Please allow in browser settings.");
                          },
                          {timeout:10000,enableHighAccuracy:true}
                        );
                      }}
                      title="Use my current location"
                      style={{flexShrink:0,padding:"10px 12px",background:locating?`${th.a1}20`:`${th.a2}15`,border:`1px solid ${locating?th.a1:th.a2}40`,color:locating?th.a1:th.a2,cursor:"pointer",fontSize:13,fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap",transition:"all 0.2s"}}>
                      {locating?"⟳":"🎯"}
                    </button>
                    {mapsLink&&(
                      <button onClick={()=>window.open(mapsLink,"_blank")} style={{flexShrink:0,padding:"10px 12px",background:`${th.a1}15`,border:`1px solid ${th.a1}40`,color:th.a1,cursor:"pointer",fontSize:10,fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap"}}>
                        📍
                      </button>
                    )}
                  </div>
                  {locateErr&&<div style={{fontSize:9,color:"#e85020",marginTop:4,letterSpacing:1}}>{locateErr}</div>}
                  {locating&&<div style={{fontSize:9,color:th.a1,marginTop:4,letterSpacing:1}}>Getting your location...</div>}
                </div>

                {/* Phone for Courier */}
                <div>
                  <div style={{fontSize:8,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:5}}>Phone for Courier</div>
                  <div style={{display:"flex",gap:6}}>
                    <select
                      value={countryCode}
                      onChange={e=>setCountryCode(e.target.value)}
                      style={{flexShrink:0,background:"#13102a",border:`1px solid ${th.border}`,color:th.text,padding:"11px 8px",fontSize:12,outline:"none",fontFamily:"'Inter',sans-serif",cursor:"pointer",maxWidth:110}}>
                      {COUNTRY_CODES.map(c=>(
                        <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={riderPhone}
                      onChange={e=>setRiderPhone(e.target.value)}
                      placeholder="Phone number..."
                      style={{flex:1,background:"rgba(255,255,255,0.03)",border:`1px solid ${th.border}`,color:th.text,padding:"11px 13px",fontSize:13,outline:"none",fontFamily:"'Inter',sans-serif"}}
                      onFocus={e=>e.target.style.borderColor=th.a1}
                      onBlur={e=>e.target.style.borderColor=th.border}
                    />
                  </div>
                  {countryCode&&riderPhone&&(
                    <div style={{fontSize:9,color:th.dim,marginTop:4,letterSpacing:1}}>{countryCode} {riderPhone}</div>
                  )}
                </div>

                {/* Preferred delivery time */}
                <div>
                  <div style={{fontSize:8,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:5}}>Preferred Time</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                    {[
                      {id:"sunrise",label:"Sunrise",sub:"8am · 6pm",icon:"🌅",bg:"linear-gradient(135deg,rgba(255,160,30,0.12),rgba(255,100,0,0.06))",activeBg:"linear-gradient(135deg,rgba(255,160,30,0.25),rgba(255,100,0,0.15))",color:"#e8a020",glow:"rgba(232,160,32,0.4)"},
                      {id:"sunset",label:"Sunset",sub:"6pm · 4am",icon:"🌙",bg:"linear-gradient(135deg,rgba(123,47,255,0.12),rgba(0,212,255,0.06))",activeBg:"linear-gradient(135deg,rgba(123,47,255,0.25),rgba(0,212,255,0.15))",color:"#7b2fff",glow:"rgba(123,47,255,0.4)"},
                    ].map(slot=>{
                      const times=deliveryTime?deliveryTime.split(","):[];
                      const isOn=times.includes(slot.id);
                      return(
                        <button key={slot.id}
                          onClick={()=>{
                            const arr=deliveryTime?deliveryTime.split(",").filter(Boolean):[];
                            const next=arr.includes(slot.id)?arr.filter(x=>x!==slot.id):[...arr,slot.id];
                            setDeliveryTime(next.join(","));
                          }}
                          style={{padding:"16px 10px",background:isOn?slot.activeBg:slot.bg,border:`1px solid ${isOn?slot.color:"rgba(255,255,255,0.08)"}`,cursor:"pointer",fontFamily:"'Inter',sans-serif",transition:"all 0.2s",textAlign:"center",boxShadow:isOn?`0 0 16px ${slot.glow},inset 0 0 20px ${slot.glow.replace("0.4","0.05")}`:"none",position:"relative",overflow:"hidden"}}>
                          {isOn&&<div style={{position:"absolute",top:4,right:6,fontSize:8,color:slot.color,fontWeight:900}}>✓</div>}
                          <div style={{fontSize:26,marginBottom:5}}>{slot.icon}</div>
                          <div style={{fontSize:11,fontWeight:900,letterSpacing:1,textTransform:"uppercase",color:isOn?slot.color:th.text}}>{slot.label}</div>
                          <div style={{fontSize:9,color:isOn?slot.color:th.dim,marginTop:3,letterSpacing:1}}>{slot.sub}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Save button */}
                <button onClick={saveDelivery}
                  style={{padding:"12px",background:`${th.a1}18`,border:`1px solid ${th.a1}`,color:th.a1,cursor:"pointer",fontSize:10,fontWeight:700,letterSpacing:3,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",transition:"all 0.2s"}}
                  onMouseEnter={e=>{e.currentTarget.style.background=`${th.a1}28`;}}
                  onMouseLeave={e=>{e.currentTarget.style.background=`${th.a1}18`;}}>
                  ✓ Save Portal
                </button>
              </div>
            )}

            {/* Saved toast inline */}
            {deliverySaved&&(
              <div style={{padding:"8px 14px",background:"rgba(0,255,136,0.08)",borderTop:"1px solid rgba(0,255,136,0.2)",fontSize:9,color:"#00ff88",letterSpacing:2,textTransform:"uppercase",textAlign:"center"}}>
                ✓ Portal saved
              </div>
            )}
          </div>

          {/* Action buttons — Control Room only for owner */}
          <div style={{display:"grid",gridTemplateColumns:user.name.toLowerCase()==="jimsnows"?"1fr 1fr":"1fr",gap:6}}>
            {user.name.toLowerCase()==="jimsnows"&&(
              <button onClick={onShowPin}
                style={{padding:"13px",background:"rgba(232,160,32,0.1)",border:"1px solid rgba(232,160,32,0.35)",color:"#e8a020",cursor:"pointer",fontSize:9,fontWeight:700,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",transition:"all 0.2s"}}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(232,160,32,0.2)";e.currentTarget.style.boxShadow="0 0 14px rgba(232,160,32,0.3)";}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(232,160,32,0.1)";e.currentTarget.style.boxShadow="none";}}>
                🔐 Control Room
              </button>
            )}
            <button onClick={onLogout}
              style={{padding:"13px",background:"transparent",border:`1px solid ${th.border}`,color:th.dim,cursor:"pointer",fontSize:9,fontWeight:700,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",transition:"all 0.2s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#e85020";e.currentTarget.style.color="#e85020";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=th.border;e.currentTarget.style.color=th.dim;}}>
              Leave Arena
            </button>
          </div>
        </div>

        {/* ── ACTIVE ORDERS ── */}
        {(()=>{
          const myOrders=(orders||[]).filter(o=>o.memberId===user.id&&o.status!=="delivered").slice(0,5);
          if(myOrders.length===0) return null;
          const ORDER_STATUS_MAP={new:{label:"Order Placed",color:"#00d4ff",icon:"🔔"},confirmed:{label:"Confirmed",color:"#7b2fff",icon:"✓"},on_the_way:{label:"On The Way",color:"#e8a020",icon:"🛵"},delivered:{label:"Delivered",color:"#00ff88",icon:"✅"}};
          return(
            <div style={{background:th.bgCard,border:`1px solid ${th.a1}30`,padding:"20px 24px",marginBottom:3}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={{fontSize:8,letterSpacing:3,color:th.a1,textTransform:"uppercase"}}>Active Orders</div>
                <div style={{width:8,height:8,borderRadius:"50%",background:"#00ff88",boxShadow:"0 0 6px #00ff88",animation:"seam 1.5s ease-in-out infinite"}}/>
              </div>
              {myOrders.map(o=>{
                const st=ORDER_STATUS_MAP[o.status]||ORDER_STATUS_MAP.new;
                return(
                  <div key={o.id} style={{padding:"12px",background:"rgba(0,0,0,0.2)",border:`1px solid ${st.color}30`,marginBottom:6,position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${st.color}40,transparent)`}}/>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <div style={{fontSize:9,fontWeight:700,color:st.color,textTransform:"uppercase",letterSpacing:1}}>{st.icon} {st.label}</div>
                      <div style={{fontSize:8,color:th.dim,letterSpacing:0.5}}>{o.id}</div>
                    </div>
                    <div style={{fontSize:10,color:th.text,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.items.map(i=>`${i.strainName} ×${i.qty}`).join(", ")}</div>
                    <div style={{fontSize:9,color:th.dim}}>{o.totalGMC.toLocaleString()} GMC · {new Date(o.createdAt).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ── CLAIMED BATCHES ── */}
        {(()=>{
          const myTx=(transactions||[]).filter(tx=>tx.memberId===user.id&&tx.amount<0).slice(0,50);
          const fmt=d=>{if(!d)return"—";const dt=new Date(d);return dt.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"2-digit"})+" "+dt.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});};
          return(
            <div style={{background:th.bgCard,border:`1px solid ${th.border}`,padding:"20px 24px",marginBottom:3}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={{fontSize:8,letterSpacing:3,color:th.a1,textTransform:"uppercase"}}>{t.claimedItems}</div>
                {myTx.length>0&&<div style={{fontSize:9,color:th.dim,letterSpacing:1}}>{myTx.length} claim{myTx.length!==1?"s":""}</div>}
              </div>
              {myTx.length===0?(
                <div style={{textAlign:"center",padding:"24px 0"}}>
                  <div style={{fontSize:28,marginBottom:8,opacity:0.3}}>◈</div>
                  <div style={{fontSize:11,color:th.dim,letterSpacing:1,textTransform:"uppercase"}}>{t.noHistory}</div>
                  <button onClick={onShelf} style={{marginTop:14,padding:"10px 20px",background:th.a1+"15",border:`1px solid ${th.a1}40`,color:th.a1,cursor:"pointer",fontSize:9,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",transition:"all 0.2s"}}
                    onMouseEnter={e=>{e.currentTarget.style.background=th.a1+"25";}}
                    onMouseLeave={e=>{e.currentTarget.style.background=th.a1+"15";}}>
                    Enter The Vault →
                  </button>
                </div>
              ):(
                <div style={{display:"flex",flexDirection:"column",gap:2}}>
                  {myTx.map(tx=>{
                    const match=tx.note?.match(/Claimed (\d+) bits of (.+)/)||tx.note?.match(/Claimed (.+)/);
                    const bits=parseInt(match?.[1])||1;
                    const strainName=match?.[2]||tx.note||"—";
                    const matchedStrain=(strains||[]).find(s=>s.name.toLowerCase()===strainName.toLowerCase());
                    return(
                      <div key={tx.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",background:"rgba(0,0,0,0.2)",borderLeft:`2px solid ${th.a1}40`}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:11,fontWeight:700,color:th.text,textTransform:"uppercase",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:"-0.01em"}}>{strainName}</div>
                          <div style={{fontSize:9,color:th.dim,marginTop:2,letterSpacing:1}}>{fmt(tx.at)}</div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0,display:"flex",alignItems:"center",gap:10}}>
                          <div>
                            {bits>0&&<div style={{fontSize:10,color:th.dim,marginBottom:2}}>{bits} bits</div>}
                            <div style={{fontSize:11,fontWeight:700,color:"#e8a020"}}>{Math.abs(tx.amount).toLocaleString()} GMC</div>
                          </div>
                          {matchedStrain&&matchedStrain.stock>0&&onAddToCart&&(
                            <button
                              onClick={()=>{onAddToCart(matchedStrain.id,Math.min(bits,matchedStrain.stock),true);onOpenCart&&onOpenCart();}}
                              style={{padding:"4px 8px",background:"transparent",border:`1px solid ${th.border}`,color:th.dim,cursor:"pointer",fontSize:9,letterSpacing:1,fontFamily:"'Inter',sans-serif",transition:"all 0.2s",whiteSpace:"nowrap"}}
                              onMouseEnter={e=>{e.currentTarget.style.borderColor=th.a1;e.currentTarget.style.color=th.a1;e.currentTarget.style.background=`${th.a1}10`;}}
                              onMouseLeave={e=>{e.currentTarget.style.borderColor=th.border;e.currentTarget.style.color=th.dim;e.currentTarget.style.background="transparent";}}>
                              ↺
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── RANK LADDER ── */}
        <div style={{background:th.bgCard,border:`1px solid ${th.border}`,padding:"20px 24px"}}>
          <div style={{fontSize:8,letterSpacing:3,color:th.a2,textTransform:"uppercase",marginBottom:14}}>Arena Ranks</div>
          <div style={{display:"flex",flexDirection:"column",gap:2}}>
            {RANKS.map(r=>{
              const isCurrentRank=rank.name===r.name;
              const isPast=(user.totalSpent||0)>=r.min&&rank.name!==r.name&&RANKS.indexOf(r)<RANKS.indexOf(rank);
              return(
                <div key={r.name} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:isCurrentRank?`${r.color}10`:"rgba(255,255,255,0.015)",border:`1px solid ${isCurrentRank?r.color+"40":th.border}`,transition:"all 0.2s"}}>
                  <span style={{fontSize:18,flexShrink:0}}>{r.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:700,color:isCurrentRank?r.color:th.dim,textTransform:"uppercase",letterSpacing:1}}>{r.name}</div>
                    <div style={{fontSize:8,color:th.dim,letterSpacing:1,marginTop:1}}>{r.min.toLocaleString()}+ GMC</div>
                  </div>
                  {isCurrentRank&&<div style={{fontSize:8,letterSpacing:2,color:r.color,textTransform:"uppercase",background:`${r.color}15`,padding:"3px 8px",border:`1px solid ${r.color}30`,flexShrink:0}}>Current</div>}
                  {(isPast||(user.totalSpent||0)>=r.min)&&!isCurrentRank&&<div style={{fontSize:12,color:"#00ff88",flexShrink:0}}>✓</div>}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── GMC OPERATIONS PANEL ──
function GMCOperationsPanel({members,transactions,onUpdateBalance,theme}){
  const th=theme||T.base;
  const [search,setSearch]=useState("");
  const [selected,setSelected]=useState(null);
  const [gmcAmt,setGmcAmt]=useState(1000);
  const [note,setNote]=useState("");
  const [customAmt,setCustomAmt]=useState(false);
  const [txFilter,setTxFilter]=useState("all");
  const [toast,setToast]=useState("");
  const [sortBy,setSortBy]=useState("joinedAt");

  function showToast(msg){setToast(msg);setTimeout(()=>setToast(""),2800);}

  const filtered=members.filter(m=>{
    const q=search.toLowerCase();
    return !q||(m.name||"").toLowerCase().includes(q)||(m.phone||"").includes(q)||(m.lineId||"").toLowerCase().includes(q);
  }).sort((a,b)=>{
    if(sortBy==="balance") return (b.gmcBalance||0)-(a.gmcBalance||0);
    if(sortBy==="spent") return (b.totalSpent||0)-(a.totalSpent||0);
    if(sortBy==="name") return (a.name||"").localeCompare(b.name||"");
    return new Date(b.joinedAt||0)-new Date(a.joinedAt||0);
  });

  const selectedMember=selected?members.find(m=>m.id===selected):null;
  const memberTx=transactions.filter(tx=>tx.memberId===selected);

  function doTopUp(){
    if(!selectedMember||!gmcAmt) return;
    onUpdateBalance(selected,gmcAmt,note||`Manual top-up +${gmcAmt} GMC`);
    showToast(`✓ +${gmcAmt.toLocaleString()} GMC added to ${selectedMember.name}`);
    setNote("");
  }
  function doDeduct(){
    if(!selectedMember||!gmcAmt) return;
    onUpdateBalance(selected,-gmcAmt,note||`Manual deduction -${gmcAmt} GMC`);
    showToast(`✓ -${gmcAmt.toLocaleString()} GMC deducted from ${selectedMember.name}`);
    setNote("");
  }

  const totalGMCInCirculation=members.reduce((a,m)=>a+(m.gmcBalance||0),0);
  const totalGMCSpent=members.reduce((a,m)=>a+(m.totalSpent||0),0);

  const inputStyle={width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.04)",border:`1px solid ${th.border}`,color:th.text,padding:"10px 13px",fontSize:13,outline:"none",fontFamily:"'Inter',sans-serif",transition:"border 0.2s"};

  function fmt(d){
    if(!d) return "—";
    const dt=new Date(d);
    return dt.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"2-digit"})+" "+dt.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
  }

  return(
    <div style={{position:"relative"}}>
      {toast&&(
        <div style={{position:"fixed",top:80,left:"50%",transform:"translateX(-50%)",background:th.bgCard,border:`1px solid ${th.a1}`,color:th.a1,padding:"12px 28px",fontSize:11,letterSpacing:2,textTransform:"uppercase",zIndex:999,boxShadow:`0 0 24px ${th.a1}30`,fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap"}}>
          {toast}
        </div>
      )}

      {/* Top stats bar */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:3,marginBottom:24}}>
        {[
          ["Total Members",members.length,th.a1,"👥"],
          ["GMC in Circulation",totalGMCInCirculation.toLocaleString(),th.amber,"💎"],
          ["Total GMC Spent",totalGMCSpent.toLocaleString(),th.a2,"📊"],
          ["Transactions",transactions.length,th.dim,"🔄"],
        ].map(([l,v,c,ic])=>(
          <div key={l} style={{background:th.bgCard,border:`1px solid ${c}20`,padding:"16px",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",bottom:-4,right:2,fontSize:28,opacity:0.07}}>{ic}</div>
            <div style={{fontSize:8,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:6}}>{l}</div>
            <div style={{fontFamily:"'Inter',sans-serif",fontSize:22,fontWeight:900,color:c}}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3,alignItems:"start"}}>

        {/* LEFT — Member Registry */}
        <div>
          <div style={{background:th.bgCard,border:`1px solid ${th.border}`,overflow:"hidden"}}>
            {/* Registry header */}
            <div style={{padding:"14px 16px",borderBottom:`1px solid ${th.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
              <div style={{fontSize:9,letterSpacing:3,color:th.a1,textTransform:"uppercase"}}>Member Registry · {filtered.length}</div>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{background:th.bgDeep,border:`1px solid ${th.border}`,color:th.dim,padding:"5px 8px",fontSize:9,letterSpacing:1,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",outline:"none",cursor:"pointer"}}>
                <option value="joinedAt">Recent</option>
                <option value="balance">Balance ↓</option>
                <option value="spent">Spent ↓</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>

            {/* Search */}
            <div style={{padding:"10px 12px",borderBottom:`1px solid ${th.border}`}}>
              <input placeholder="🔍  Search name, phone, LINE ID..." value={search} onChange={e=>setSearch(e.target.value)}
                style={{...inputStyle,padding:"9px 12px",fontSize:12}}
                onFocus={e=>e.target.style.borderColor=th.a1} onBlur={e=>e.target.style.borderColor=th.border}/>
            </div>

            {/* Member list */}
            <div style={{maxHeight:440,overflowY:"auto"}}>
              {filtered.length===0&&(
                <div style={{padding:"40px 20px",textAlign:"center",color:th.dim}}>
                  <div style={{fontSize:28,marginBottom:10}}>👥</div>
                  <div style={{fontSize:11,letterSpacing:2,textTransform:"uppercase"}}>{search?"No results":"No members yet"}</div>
                  <div style={{fontSize:10,color:th.dim,marginTop:6,opacity:0.6}}>Members register via Persona Card tab</div>
                </div>
              )}
              {filtered.map(m=>{
                const rank=getRank(m.totalSpent||0);
                const isSel=selected===m.id;
                const mTxCount=transactions.filter(tx=>tx.memberId===m.id).length;
                return(
                  <div key={m.id} onClick={()=>setSelected(isSel?null:m.id)}
                    style={{padding:"13px 16px",borderBottom:`1px solid ${th.border}`,cursor:"pointer",background:isSel?`${th.amber}10`:"transparent",borderLeft:`3px solid ${isSel?th.amber:"transparent"}`,transition:"all 0.15s",display:"flex",alignItems:"center",gap:12}}
                    onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background="rgba(255,255,255,0.02)";}}
                    onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background="transparent";}}>

                    {/* Rank avatar */}
                    <div style={{width:36,height:36,borderRadius:"50%",background:`${rank.color}18`,border:`2px solid ${rank.color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
                      {rank.icon}
                    </div>

                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                        <span style={{fontSize:12,fontWeight:700,color:isSel?th.amber:th.text,textTransform:"uppercase",letterSpacing:"-0.01em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</span>
                        <span style={{fontSize:7,color:rank.color,letterSpacing:1,textTransform:"uppercase",flexShrink:0}}>{rank.name}</span>
                      </div>
                      <div style={{fontSize:9,color:th.dim,letterSpacing:0.5}}>
                        {m.contact==="line"?`LINE: ${m.lineId||"—"}`:m.phone||"—"}
                        {mTxCount>0&&<span style={{marginLeft:8,color:th.dim,opacity:0.6}}>· {mTxCount} tx</span>}
                      </div>
                    </div>

                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:13,fontWeight:900,color:th.amber}}>{(m.gmcBalance||0).toLocaleString()}</div>
                      <div style={{fontSize:7,color:th.dim,letterSpacing:1,textTransform:"uppercase"}}>GMC</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT — Member Detail + GMC Operations */}
        <div>
          {!selectedMember?(
            <div style={{background:th.bgCard,border:`1px solid ${th.border}`,padding:"56px 20px",textAlign:"center"}}>
              <div style={{fontSize:40,marginBottom:14,opacity:0.4}}>←</div>
              <div style={{fontSize:11,color:th.dim,letterSpacing:2,textTransform:"uppercase",lineHeight:2}}>Select a member<br/><span style={{fontSize:9,opacity:0.6}}>from the registry to manage GMC</span></div>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:3}}>

              {/* Persona Card */}
              <div style={{background:th.bgCard,border:`1px solid ${th.amber}40`,padding:"20px",position:"relative",overflow:"hidden",boxShadow:`0 0 20px ${th.amber}06`}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${th.amber},${th.a1})`}}/>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
                  <div style={{width:48,height:48,borderRadius:"50%",background:`${getRank(selectedMember.totalSpent||0).color}18`,border:`2px solid ${getRank(selectedMember.totalSpent||0).color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:`0 0 15px ${getRank(selectedMember.totalSpent||0).color}40`}}>
                    {getRank(selectedMember.totalSpent||0).icon}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:16,fontWeight:900,color:th.text,textTransform:"uppercase"}}>{selectedMember.name}</div>
                    <div style={{fontSize:9,color:getRank(selectedMember.totalSpent||0).color,letterSpacing:2,textTransform:"uppercase"}}>{getRank(selectedMember.totalSpent||0).name}</div>
                    <div style={{fontSize:9,color:th.dim,marginTop:2}}>{selectedMember.contact==="line"?`LINE: ${selectedMember.lineId}`:selectedMember.phone} · Joined {new Date(selectedMember.joinedAt||Date.now()).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</div>
                  </div>
                  <button onClick={()=>setSelected(null)} style={{background:"transparent",border:`1px solid ${th.border}`,color:th.dim,width:28,height:28,cursor:"pointer",fontSize:12,fontFamily:"'Inter',sans-serif",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                </div>

                {/* Balance row */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:2,marginBottom:selectedMember.deliveryAddress||selectedMember.riderPhone?3:0}}>
                  {[["GMC Balance",(selectedMember.gmcBalance||0).toLocaleString()+" GMC",th.amber],["Total Spent",(selectedMember.totalSpent||0).toLocaleString()+" GMC",th.a1]].map(([k,v,c])=>(
                    <div key={k} style={{background:"rgba(0,0,0,0.3)",padding:"12px",border:`1px solid ${th.border}`}}>
                      <div style={{fontSize:8,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:5}}>{k}</div>
                      <div style={{fontSize:16,fontWeight:900,color:c}}>{v}</div>
                    </div>
                  ))}
                </div>
                {/* Delivery info — shows if member filled it */}
                {(selectedMember.deliveryAddress||selectedMember.riderPhone||selectedMember.deliveryTime)&&(
                  <div style={{background:"rgba(0,212,255,0.04)",border:`1px solid ${th.a1}20`,padding:"12px 14px"}}>
                    <div style={{fontSize:8,letterSpacing:2,color:th.a1,textTransform:"uppercase",marginBottom:8}}>🛵 Delivery Info</div>
                    {selectedMember.mapsLink&&(
                      <div style={{marginBottom:6}}>
                        <div style={{fontSize:7,color:th.dim,letterSpacing:1,textTransform:"uppercase",marginBottom:2}}>Maps Link</div>
                        <button onClick={()=>window.open(selectedMember.mapsLink,"_blank")} style={{padding:"4px 10px",background:`${th.a1}15`,border:`1px solid ${th.a1}40`,color:th.a1,cursor:"pointer",fontSize:9,fontFamily:"'Inter',sans-serif",letterSpacing:1}}>📍 Open Map</button>
                      </div>
                    )}
                    {selectedMember.deliveryAddress&&(
                      <div style={{marginBottom:6}}>
                        <div style={{fontSize:7,color:th.dim,letterSpacing:1,textTransform:"uppercase",marginBottom:2}}>Address</div>
                        <div style={{fontSize:11,color:th.text,lineHeight:1.5}}>{selectedMember.deliveryAddress}</div>
                      </div>
                    )}
                    {selectedMember.riderPhone&&(
                      <div style={{marginBottom:6}}>
                        <div style={{fontSize:7,color:th.dim,letterSpacing:1,textTransform:"uppercase",marginBottom:2}}>Rider Phone</div>
                        <div style={{fontSize:11,color:th.text}}>{selectedMember.countryCode||""} {selectedMember.riderPhone}</div>
                      </div>
                    )}
                    {selectedMember.deliveryTime&&(
                      <div>
                        <div style={{fontSize:7,color:th.dim,letterSpacing:1,textTransform:"uppercase",marginBottom:2}}>Preferred Time</div>
                        <div style={{fontSize:11,color:th.a1,textTransform:"capitalize"}}>{selectedMember.deliveryTime==="latenight"?"Late Night":selectedMember.deliveryTime}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* GMC Operation */}
              <div style={{background:th.bgCard,border:`1px solid ${th.border}`,padding:"20px"}}>
                <div style={{fontSize:9,letterSpacing:3,color:th.amber,textTransform:"uppercase",marginBottom:14,textShadow:`0 0 8px ${th.amber}60`}}>💎 GMC Operation</div>

                {/* Quick presets */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:2,marginBottom:10}}>
                  {[200,500,1000,2000,5000].map(v=>(
                    <button key={v} onClick={()=>{setGmcAmt(v);setCustomAmt(false);}} style={{padding:"9px 2px",background:gmcAmt===v&&!customAmt?`${th.amber}20`:"rgba(255,255,255,0.03)",border:`1px solid ${gmcAmt===v&&!customAmt?th.amber:th.border}`,color:gmcAmt===v&&!customAmt?th.amber:th.dim,cursor:"pointer",fontSize:10,fontWeight:700,fontFamily:"'Inter',sans-serif",transition:"all 0.15s",boxShadow:gmcAmt===v&&!customAmt?`0 0 8px ${th.amber}30`:"none"}}>
                      {v>=1000?(v/1000)+"k":v}
                    </button>
                  ))}
                </div>

                {/* Custom amount */}
                <div style={{display:"flex",gap:6,marginBottom:10,alignItems:"center"}}>
                  <input type="number" placeholder="Custom amount..." value={customAmt?gmcAmt:""} onChange={e=>{setGmcAmt(Number(e.target.value)||0);setCustomAmt(true);}}
                    style={{...inputStyle,flex:1,fontSize:14,fontWeight:700}}
                    onFocus={e=>{e.target.style.borderColor=th.amber;setCustomAmt(true);}} onBlur={e=>e.target.style.borderColor=th.border}/>
                  <span style={{fontSize:9,color:th.dim,letterSpacing:2,textTransform:"uppercase",flexShrink:0}}>GMC</span>
                </div>

                {/* Note */}
                <div style={{marginBottom:12}}>
                  <input placeholder="Note (optional)..." value={note} onChange={e=>setNote(e.target.value)}
                    style={{...inputStyle,fontSize:11}}
                    onFocus={e=>e.target.style.borderColor=th.a1} onBlur={e=>e.target.style.borderColor=th.border}/>
                </div>

                {/* Action buttons */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  <button onClick={doTopUp} disabled={!gmcAmt}
                    style={{padding:"13px",background:gmcAmt?`${th.a1}15`:"rgba(255,255,255,0.02)",border:`1px solid ${gmcAmt?th.a1:th.border}`,color:gmcAmt?th.a1:th.dim,cursor:gmcAmt?"pointer":"not-allowed",fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",boxShadow:gmcAmt?`0 0 12px ${th.a1}20`:"none",transition:"all 0.2s"}}>
                    ＋ Add GMC
                  </button>
                  <button onClick={doDeduct} disabled={!gmcAmt||(selectedMember.gmcBalance||0)<gmcAmt}
                    style={{padding:"13px",background:gmcAmt&&(selectedMember.gmcBalance||0)>=gmcAmt?"rgba(232,80,32,0.12)":"rgba(255,255,255,0.02)",border:`1px solid ${gmcAmt&&(selectedMember.gmcBalance||0)>=gmcAmt?"rgba(232,80,32,0.5)":th.border}`,color:gmcAmt&&(selectedMember.gmcBalance||0)>=gmcAmt?"#e85020":th.dim,cursor:gmcAmt&&(selectedMember.gmcBalance||0)>=gmcAmt?"pointer":"not-allowed",fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",transition:"all 0.2s"}}>
                    − Deduct GMC
                  </button>
                </div>
                <div style={{marginTop:8,fontSize:9,color:th.dim,textAlign:"center",letterSpacing:1}}>
                  After: <span style={{color:th.amber,fontWeight:700}}>{((selectedMember.gmcBalance||0)+gmcAmt).toLocaleString()}</span> GMC (add) · <span style={{color:Math.max(0,(selectedMember.gmcBalance||0)-gmcAmt)===0?"#e85020":"#e8a020",fontWeight:700}}>{Math.max(0,(selectedMember.gmcBalance||0)-gmcAmt).toLocaleString()}</span> GMC (deduct)
                </div>
              </div>

              {/* Transaction History for this member */}
              <div style={{background:th.bgCard,border:`1px solid ${th.border}`,padding:"16px"}}>
                <div style={{fontSize:9,letterSpacing:3,color:th.a1,textTransform:"uppercase",marginBottom:12}}>Transaction History · {memberTx.length}</div>
                {memberTx.length===0?(
                  <div style={{textAlign:"center",padding:"20px",color:th.dim,fontSize:11,letterSpacing:1}}>No transactions yet</div>
                ):(
                  <div style={{maxHeight:220,overflowY:"auto",display:"flex",flexDirection:"column",gap:2}}>
                    {memberTx.slice(0,50).map(tx=>(
                      <div key={tx.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",background:"rgba(255,255,255,0.02)",borderLeft:`2px solid ${tx.amount>0?th.a1:"#e85020"}`}}>
                        <div>
                          <div style={{fontSize:10,color:th.text,marginBottom:2}}>{tx.note||"—"}</div>
                          <div style={{fontSize:8,color:th.dim,letterSpacing:1}}>{fmt(tx.at)}</div>
                        </div>
                        <div style={{fontSize:14,fontWeight:900,color:tx.amount>0?th.a1:"#e85020",flexShrink:0,marginLeft:12}}>
                          {tx.amount>0?"+":""}{tx.amount.toLocaleString()} GMC
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>

      {/* All transactions log */}
      {transactions.length>0&&(
        <div style={{marginTop:3,background:th.bgCard,border:`1px solid ${th.border}`,padding:"16px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
            <div style={{fontSize:9,letterSpacing:3,color:th.a1,textTransform:"uppercase"}}>All Transactions · {transactions.length}</div>
            <div style={{display:"flex",gap:2}}>
              {["all","topup","claim"].map(f=>(
                <button key={f} onClick={()=>setTxFilter(f)} style={{padding:"5px 10px",background:txFilter===f?`${th.a1}15`:"transparent",border:`1px solid ${txFilter===f?th.a1:th.border}`,color:txFilter===f?th.a1:th.dim,cursor:"pointer",fontSize:8,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",transition:"all 0.15s"}}>
                  {f==="topup"?"＋ Top-up":f==="claim"?"📦 Claims":"All"}
                </button>
              ))}
            </div>
          </div>
          <div style={{maxHeight:260,overflowY:"auto",display:"flex",flexDirection:"column",gap:2}}>
            {transactions
              .filter(tx=>txFilter==="all"||(txFilter==="topup"&&tx.amount>0)||(txFilter==="claim"&&tx.amount<0))
              .slice(0,100)
              .map(tx=>{
                const m=members.find(x=>x.id===tx.memberId);
                return(
                  <div key={tx.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",background:"rgba(255,255,255,0.015)",borderLeft:`2px solid ${tx.amount>0?th.a1:"#e85020"}`}}>
                    <div style={{flex:"0 0 24px",fontSize:14,textAlign:"center"}}>{tx.amount>0?"💎":"📦"}</div>
                    <div style={{flex:"0 0 130px",fontSize:10,fontWeight:700,color:th.text,textTransform:"uppercase",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m?.name||"Unknown"}</div>
                    <div style={{flex:1,fontSize:10,color:th.dim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tx.note||"—"}</div>
                    <div style={{flex:"0 0 80px",fontSize:11,fontWeight:700,color:tx.amount>0?th.a1:"#e85020",textAlign:"right"}}>{tx.amount>0?"+":""}{tx.amount.toLocaleString()} GMC</div>
                    <div style={{flex:"0 0 110px",fontSize:8,color:th.dim,textAlign:"right",letterSpacing:0.5}}>{fmt(tx.at)}</div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── ORDERS PANEL ──
const ORDER_STATUSES=[
  {id:"new",label:"New",color:"#00d4ff",icon:"🔔"},
  {id:"confirmed",label:"Confirmed",color:"#7b2fff",icon:"✓"},
  {id:"on_the_way",label:"On The Way",color:"#e8a020",icon:"🛵"},
  {id:"delivered",label:"Delivered",color:"#00ff88",icon:"✅"},
];

function OrdersPanel({orders=[],members=[],onUpdateStatus,theme}){
  const th=theme||T.base;
  const [filter,setFilter]=useState("all");
  const [selected,setSelected]=useState(null);
  const [courierView,setCourierView]=useState(false);
  const [toast,setToast]=useState("");

  function showToast(msg){setToast(msg);setTimeout(()=>setToast(""),2500);}

  function fmt(d){
    if(!d) return"—";
    const dt=new Date(d);
    return dt.toLocaleDateString("en-GB",{day:"2-digit",month:"short"})+" "+dt.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
  }

  const filtered=filter==="all"?orders:orders.filter(o=>o.status===filter);
  const newCount=orders.filter(o=>o.status==="new").length;
  const todayCount=orders.filter(o=>new Date(o.createdAt).toDateString()===new Date().toDateString()).length;
  const totalRevenue=orders.reduce((a,o)=>a+o.totalGMC,0);
  const selectedOrder=selected?orders.find(o=>o.id===selected):null;

  function updateStatus(orderId,newStatus){
    onUpdateStatus(orderId,newStatus);
    showToast(`Order ${orderId} → ${newStatus.replace("_"," ").toUpperCase()}`);
  }

  function getNextStatus(current){
    const idx=ORDER_STATUSES.findIndex(s=>s.id===current);
    return idx<ORDER_STATUSES.length-1?ORDER_STATUSES[idx+1]:null;
  }

  return(
    <div style={{position:"relative"}}>
      {toast&&<div style={{position:"fixed",top:80,left:"50%",transform:"translateX(-50%)",background:th.bgCard,border:`1px solid ${th.a1}`,color:th.a1,padding:"12px 24px",fontSize:11,letterSpacing:2,textTransform:"uppercase",zIndex:999,boxShadow:`0 0 20px ${th.a1}30`,fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap"}}>{toast}</div>}

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:3,marginBottom:20}}>
        {[
          ["Total Orders",orders.length,th.a1,"📦"],
          ["New",newCount,newCount>0?"#00d4ff":th.dim,"🔔"],
          ["Today",todayCount,th.a2,"📅"],
          ["Revenue",totalRevenue.toLocaleString()+" GMC","#e8a020","💎"],
        ].map(([l,v,c,ic])=>(
          <div key={l} style={{background:th.bgCard,border:`1px solid ${c}20`,padding:"14px",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",bottom:-4,right:2,fontSize:24,opacity:0.07}}>{ic}</div>
            <div style={{fontSize:8,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:6}}>{l}</div>
            <div style={{fontFamily:"'Inter',sans-serif",fontSize:20,fontWeight:900,color:c}}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3,alignItems:"start"}}>
        {/* LEFT — order list */}
        <div>
          {/* Filter tabs */}
          <div style={{display:"flex",gap:2,marginBottom:3,overflowX:"auto"}}>
            {[{id:"all",label:"All",color:th.dim},...ORDER_STATUSES].map(s=>(
              <button key={s.id} onClick={()=>setFilter(s.id)}
                style={{padding:"7px 12px",background:filter===s.id?`${s.color||th.a1}15`:"transparent",border:`1px solid ${filter===s.id?s.color||th.a1:th.border}`,color:filter===s.id?s.color||th.a1:th.dim,cursor:"pointer",fontSize:9,letterSpacing:1,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap",flexShrink:0,transition:"all 0.15s"}}>
                {s.label}{s.id!=="all"&&orders.filter(o=>o.status===s.id).length>0?` (${orders.filter(o=>o.status===s.id).length})`:""}
              </button>
            ))}
          </div>

          <div style={{background:th.bgCard,border:`1px solid ${th.border}`,maxHeight:520,overflowY:"auto"}}>
            {filtered.length===0?(
              <div style={{padding:"40px 20px",textAlign:"center",color:th.dim}}>
                <div style={{fontSize:28,marginBottom:8,opacity:0.3}}>📦</div>
                <div style={{fontSize:11,letterSpacing:2,textTransform:"uppercase"}}>No orders yet</div>
              </div>
            ):(
              filtered.map(o=>{
                const st=ORDER_STATUSES.find(s=>s.id===o.status)||ORDER_STATUSES[0];
                const isSel=selected===o.id;
                return(
                  <div key={o.id} onClick={()=>setSelected(isSel?null:o.id)}
                    style={{padding:"12px 14px",borderBottom:`1px solid ${th.border}`,cursor:"pointer",background:isSel?`${st.color}08`:"transparent",borderLeft:`3px solid ${isSel?st.color:"transparent"}`,transition:"all 0.15s"}}
                    onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background="rgba(255,255,255,0.02)";}}
                    onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background="transparent";}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                      <div style={{fontSize:10,fontWeight:700,color:th.text,fontFamily:"'Inter',sans-serif"}}>{o.memberName}</div>
                      <div style={{fontSize:9,color:st.color,letterSpacing:1,textTransform:"uppercase",background:`${st.color}15`,padding:"2px 6px",border:`1px solid ${st.color}40`,flexShrink:0,marginLeft:8}}>{st.icon} {st.label}</div>
                    </div>
                    <div style={{fontSize:9,color:th.dim,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.items.map(i=>`${i.strainName} ×${i.qty}`).join(", ")}</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{fontSize:9,color:th.dim,letterSpacing:0.5}}>{fmt(o.createdAt)}</div>
                      <div style={{fontSize:11,fontWeight:700,color:"#e8a020"}}>{o.totalGMC.toLocaleString()} GMC</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT — order detail */}
        <div>
          {!selectedOrder?(
            <div style={{background:th.bgCard,border:`1px solid ${th.border}`,padding:"48px 20px",textAlign:"center"}}>
              <div style={{fontSize:36,marginBottom:12,opacity:0.3}}>📦</div>
              <div style={{fontSize:11,color:th.dim,letterSpacing:2,textTransform:"uppercase"}}>Select an order</div>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              {courierView?(
                /* COURIER VIEW */
                <div style={{background:th.bgCard,border:`1px solid ${th.amber}40`,padding:"20px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                    <div style={{fontSize:9,letterSpacing:3,color:th.amber,textTransform:"uppercase"}}>🛵 Courier Sheet</div>
                    <button onClick={()=>setCourierView(false)} style={{background:"transparent",border:`1px solid ${th.border}`,color:th.dim,padding:"4px 10px",cursor:"pointer",fontSize:9,fontFamily:"'Inter',sans-serif"}}>← Back</button>
                  </div>
                  <div style={{background:"rgba(0,0,0,0.3)",padding:"16px",marginBottom:10}}>
                    <div style={{fontSize:9,color:th.dim,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Deliver To</div>
                    <div style={{fontSize:13,color:th.text,fontWeight:700,marginBottom:8}}>{selectedOrder.memberName}</div>
                    {selectedOrder.deliveryAddress&&<div style={{fontSize:12,color:th.dim,lineHeight:1.6,marginBottom:8}}>{selectedOrder.deliveryAddress}</div>}
                    {selectedOrder.riderPhone&&<div style={{fontSize:13,color:th.a1,fontWeight:700,marginBottom:8}}>📞 {selectedOrder.countryCode} {selectedOrder.riderPhone}</div>}
                    {selectedOrder.mapsLink&&(
                      <button onClick={()=>window.open(selectedOrder.mapsLink,"_blank")} style={{padding:"8px 14px",background:`${th.a1}15`,border:`1px solid ${th.a1}40`,color:th.a1,cursor:"pointer",fontSize:10,fontFamily:"'Inter',sans-serif",letterSpacing:1}}>📍 Open Map</button>
                    )}
                  </div>
                  <div style={{background:"rgba(0,0,0,0.3)",padding:"14px"}}>
                    <div style={{fontSize:9,color:th.dim,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Items</div>
                    {selectedOrder.items.map((item,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${th.border}`}}>
                        <span style={{fontSize:12,color:th.text,fontWeight:700}}>{item.strainName}</span>
                        <span style={{fontSize:11,color:th.dim}}>{item.qty} bits</span>
                      </div>
                    ))}
                  </div>
                </div>
              ):(
                /* FULL ORDER DETAIL */
                <>
                  {/* Header */}
                  <div style={{background:th.bgCard,border:`1px solid ${th.border}`,padding:"16px 18px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                      <div>
                        <div style={{fontSize:9,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:3}}>{selectedOrder.id}</div>
                        <div style={{fontSize:16,fontWeight:900,color:th.text,textTransform:"uppercase"}}>{selectedOrder.memberName}</div>
                        <div style={{fontSize:10,color:th.dim,marginTop:2}}>{selectedOrder.memberContact}</div>
                      </div>
                      <button onClick={()=>setCourierView(true)} style={{padding:"6px 12px",background:`${th.amber}15`,border:`1px solid ${th.amber}40`,color:th.amber,cursor:"pointer",fontSize:9,letterSpacing:1,textTransform:"uppercase",fontFamily:"'Inter',sans-serif"}}>🛵 Courier View</button>
                    </div>
                    {/* Status track */}
                    <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:12}}>
                      {ORDER_STATUSES.map((s,i)=>{
                        const done=ORDER_STATUSES.findIndex(x=>x.id===selectedOrder.status)>=i;
                        return(
                          <div key={s.id} style={{display:"flex",alignItems:"center",flex:1}}>
                            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,flex:"0 0 auto"}}>
                              <div style={{width:24,height:24,borderRadius:"50%",background:done?s.color:"rgba(255,255,255,0.06)",border:`1px solid ${done?s.color:th.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,transition:"all 0.3s"}}>{done?s.icon:""}</div>
                              <div style={{fontSize:7,color:done?s.color:th.dim,letterSpacing:1,textTransform:"uppercase",whiteSpace:"nowrap"}}>{s.label}</div>
                            </div>
                            {i<ORDER_STATUSES.length-1&&<div style={{flex:1,height:1,background:ORDER_STATUSES.findIndex(x=>x.id===selectedOrder.status)>i?s.color:th.border,margin:"0 2px",marginBottom:14,transition:"all 0.3s"}}/>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Items */}
                  <div style={{background:th.bgCard,border:`1px solid ${th.border}`,padding:"14px 16px"}}>
                    <div style={{fontSize:9,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:10}}>Order Items</div>
                    {selectedOrder.items.map((item,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${th.border}`}}>
                        <div>
                          <div style={{fontSize:11,fontWeight:700,color:th.text,textTransform:"uppercase"}}>{item.strainName}</div>
                          <div style={{fontSize:9,color:th.dim,marginTop:2}}>{item.qty} bits</div>
                        </div>
                        <div style={{fontSize:12,fontWeight:700,color:"#e8a020"}}>{item.totalGMC.toLocaleString()} GMC</div>
                      </div>
                    ))}
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:10,paddingTop:8}}>
                      <span style={{fontSize:10,color:th.dim,textTransform:"uppercase",letterSpacing:1}}>Total · {selectedOrder.paidWith==="gmc"?"GMC Balance":"WhatsApp"}</span>
                      <span style={{fontSize:14,fontWeight:900,color:"#e8a020"}}>{selectedOrder.totalGMC.toLocaleString()} GMC</span>
                    </div>
                  </div>

                  {/* Delivery info */}
                  {(selectedOrder.deliveryAddress||selectedOrder.riderPhone)&&(
                    <div style={{background:th.bgCard,border:`1px solid ${th.a1}20`,padding:"14px 16px"}}>
                      <div style={{fontSize:9,letterSpacing:2,color:th.a1,textTransform:"uppercase",marginBottom:10}}>📡 Portal</div>
                      {selectedOrder.deliveryAddress&&<div style={{fontSize:11,color:th.text,lineHeight:1.6,marginBottom:8}}>{selectedOrder.deliveryAddress}</div>}
                      {selectedOrder.mapsLink&&<button onClick={()=>window.open(selectedOrder.mapsLink,"_blank")} style={{padding:"5px 12px",background:`${th.a1}15`,border:`1px solid ${th.a1}40`,color:th.a1,cursor:"pointer",fontSize:9,fontFamily:"'Inter',sans-serif",marginBottom:8,display:"block"}}>📍 Open Map</button>}
                      {selectedOrder.riderPhone&&<div style={{fontSize:11,color:th.dim}}>📞 {selectedOrder.countryCode} {selectedOrder.riderPhone}</div>}
                      {selectedOrder.deliveryTime&&<div style={{fontSize:10,color:th.dim,marginTop:4}}>⏰ Preferred: {selectedOrder.deliveryTime}</div>}
                    </div>
                  )}

                  {/* Status update */}
                  {getNextStatus(selectedOrder.status)&&(
                    <div style={{background:th.bgCard,border:`1px solid ${th.border}`,padding:"14px 16px"}}>
                      <div style={{fontSize:9,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:10}}>Update Status</div>
                      <button onClick={()=>updateStatus(selectedOrder.id,getNextStatus(selectedOrder.status).id)}
                        style={{width:"100%",padding:"13px",background:`${getNextStatus(selectedOrder.status).color}18`,border:`1px solid ${getNextStatus(selectedOrder.status).color}`,color:getNextStatus(selectedOrder.status).color,cursor:"pointer",fontSize:11,fontWeight:900,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",transition:"all 0.2s"}}>
                        {getNextStatus(selectedOrder.status).icon} Mark as {getNextStatus(selectedOrder.status).label}
                      </button>
                    </div>
                  )}

                  {/* Status history */}
                  <div style={{background:th.bgCard,border:`1px solid ${th.border}`,padding:"14px 16px"}}>
                    <div style={{fontSize:9,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:10}}>History</div>
                    {(selectedOrder.statusHistory||[]).map((h,i)=>{
                      const st=ORDER_STATUSES.find(s=>s.id===h.status)||ORDER_STATUSES[0];
                      return(
                        <div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${th.border}`}}>
                          <div style={{fontSize:12,flexShrink:0}}>{st.icon}</div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:10,color:st.color,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>{st.label}</div>
                            {h.note&&<div style={{fontSize:9,color:th.dim}}>{h.note}</div>}
                          </div>
                          <div style={{fontSize:8,color:th.dim,flexShrink:0}}>{fmt(h.at)}</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SETTINGS PANEL ──
function SettingsPanel({contactSettings,onSaveContact,staffSettings,onSaveStaff,theme}){
  const th=theme||T.base;
  const [wa,setWa]=useState(contactSettings?.wa||"66812345678");
  const [lineId,setLineId]=useState(contactSettings?.lineId||"glasscorp");
  const [tgToken,setTgToken]=useState(staffSettings?.tgToken||"");
  const [tgChatId,setTgChatId]=useState(staffSettings?.tgChatId||"");
  const [staffPin,setStaffPin]=useState(staffSettings?.staffPin||"");
  const [saved,setSaved]=useState(false);
  const [tgSaved,setTgSaved]=useState(false);
  const [tgTesting,setTgTesting]=useState(false);
  const [tgTestMsg,setTgTestMsg]=useState("");

  function save(){
    onSaveContact({wa:wa.trim(),lineId:lineId.trim()});
    setSaved(true);
    setTimeout(()=>setSaved(false),2500);
  }
  function saveTg(){
    onSaveStaff({...staffSettings,tgToken:tgToken.trim(),tgChatId:tgChatId.trim(),staffPin:staffPin.trim()});
    setTgSaved(true);
    setTimeout(()=>setTgSaved(false),2500);
  }
  async function testTelegram(){
    if(!tgToken.trim()||!tgChatId.trim()){setTgTestMsg("Enter token and chat ID first");return;}
    setTgTesting(true);setTgTestMsg("");
    try{
      const res=await fetch(`https://api.telegram.org/bot${tgToken.trim()}/sendMessage`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({chat_id:tgChatId.trim(),text:"✅ Glasscorp Arena — Telegram connected! Orders will appear here."})
      });
      const data=await res.json();
      setTgTestMsg(data.ok?"✅ Connected! Check your Telegram.":"❌ Failed: "+data.description);
    }catch(e){setTgTestMsg("❌ Connection error");}
    setTgTesting(false);
  }

  const inputS={width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.04)",border:`1px solid ${th.border}`,color:th.text,padding:"12px 14px",fontSize:14,outline:"none",fontFamily:"'Inter',sans-serif",transition:"border 0.2s"};

  return(
    <div style={{maxWidth:480}}>
      <div style={{fontSize:9,letterSpacing:4,color:th.dim,textTransform:"uppercase",marginBottom:20}}>Contact Settings</div>

      <div style={{background:th.bgCard,border:`1px solid ${th.border}`,padding:"24px",marginBottom:3}}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${th.amber}40,transparent)`}}/>

        {/* WhatsApp */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:9,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp Number
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <div style={{padding:"12px 10px",background:"rgba(37,211,102,0.08)",border:"1px solid rgba(37,211,102,0.2)",color:"#25d366",fontSize:12,fontWeight:700,flexShrink:0}}>+</div>
            <input value={wa} onChange={e=>setWa(e.target.value.replace(/[^0-9]/g,""))}
              inputMode="numeric"
              placeholder="66812345678"
              style={inputS}
              onFocus={e=>e.target.style.borderColor="#25d366"}
              onBlur={e=>e.target.style.borderColor=th.border}/>
          </div>
          <div style={{fontSize:9,color:th.dim,marginTop:5,letterSpacing:1}}>
            Current: wa.me/{wa||"—"} · <span style={{color:"#25d366",cursor:"pointer"}} onClick={()=>window.open("https://wa.me/"+wa,"_blank")}>Test link ↗</span>
          </div>
        </div>

        {/* LINE */}
        <div style={{marginBottom:24}}>
          <div style={{fontSize:9,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#06c755"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
            LINE ID
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <div style={{padding:"12px 10px",background:"rgba(6,199,85,0.08)",border:"1px solid rgba(6,199,85,0.2)",color:"#06c755",fontSize:12,fontWeight:700,flexShrink:0}}>@</div>
            <input value={lineId} onChange={e=>setLineId(e.target.value)}
              placeholder="glasscorp"
              style={inputS}
              onFocus={e=>e.target.style.borderColor="#06c755"}
              onBlur={e=>e.target.style.borderColor=th.border}/>
          </div>
          <div style={{fontSize:9,color:th.dim,marginTop:5,letterSpacing:1}}>
            Current: line.me/ti/p/~{lineId||"—"}
          </div>
        </div>

        <button onClick={save}
          style={{width:"100%",padding:"13px",background:`${th.amber}18`,border:`1px solid ${th.amber}`,color:th.amber,cursor:"pointer",fontSize:10,fontWeight:900,letterSpacing:3,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",transition:"all 0.2s"}}
          onMouseEnter={e=>{e.currentTarget.style.background=`${th.amber}28`;}}
          onMouseLeave={e=>{e.currentTarget.style.background=`${th.amber}18`;}}>
          ✓ Save Contact Settings
        </button>
        {saved&&<div style={{marginTop:8,padding:"8px",background:"rgba(0,255,136,0.08)",border:"1px solid rgba(0,255,136,0.2)",fontSize:9,color:"#00ff88",textAlign:"center",letterSpacing:2,textTransform:"uppercase"}}>✓ Saved</div>}
      </div>

      {/* ── TELEGRAM NOTIFICATIONS ── */}
      <div style={{background:th.bgCard,border:`1px solid ${th.border}`,padding:"24px",marginBottom:3,position:"relative"}}>
        <div style={{fontSize:9,letterSpacing:3,color:"#29b6f6",textTransform:"uppercase",marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:16}}>✈️</span> Telegram Order Notifications
        </div>
        <div style={{fontSize:11,color:th.dim,marginBottom:16,lineHeight:1.7}}>
          Every new order pings your Telegram group instantly — works for WhatsApp AND LINE customers.
          <br/>Get your bot token from <span style={{color:"#29b6f6"}}>@BotFather</span> on Telegram.
        </div>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:9,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:6}}>Bot Token</div>
          <input value={tgToken} onChange={e=>setTgToken(e.target.value)}
            placeholder="1234567890:ABCdef..."
            style={{width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.04)",border:`1px solid ${th.border}`,color:th.text,padding:"11px 13px",fontSize:12,outline:"none",fontFamily:"'Inter',sans-serif"}}
            onFocus={e=>e.target.style.borderColor="#29b6f6"} onBlur={e=>e.target.style.borderColor=th.border}/>
        </div>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:9,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:6}}>Chat ID / Group ID</div>
          <input value={tgChatId} onChange={e=>setTgChatId(e.target.value)}
            placeholder="-1001234567890"
            style={{width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.04)",border:`1px solid ${th.border}`,color:th.text,padding:"11px 13px",fontSize:12,outline:"none",fontFamily:"'Inter',sans-serif"}}
            onFocus={e=>e.target.style.borderColor="#29b6f6"} onBlur={e=>e.target.style.borderColor=th.border}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <button onClick={testTelegram} disabled={tgTesting}
            style={{padding:"11px",background:"rgba(41,182,246,0.1)",border:"1px solid rgba(41,182,246,0.4)",color:"#29b6f6",cursor:"pointer",fontSize:9,fontWeight:700,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",transition:"all 0.2s"}}>
            {tgTesting?"Testing...":"📡 Send Test"}
          </button>
          <button onClick={saveTg}
            style={{padding:"11px",background:`${th.amber}18`,border:`1px solid ${th.amber}`,color:th.amber,cursor:"pointer",fontSize:9,fontWeight:900,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",transition:"all 0.2s"}}>
            ✓ Save
          </button>
        </div>
        {tgTestMsg&&<div style={{padding:"8px",background:tgTestMsg.includes("✅")?"rgba(0,255,136,0.08)":"rgba(232,80,32,0.08)",border:`1px solid ${tgTestMsg.includes("✅")?"rgba(0,255,136,0.3)":"rgba(232,80,32,0.3)"}`,fontSize:10,color:tgTestMsg.includes("✅")?"#00ff88":"#e85020",textAlign:"center",marginBottom:8}}>{tgTestMsg}</div>}
        {tgSaved&&<div style={{padding:"8px",background:"rgba(0,255,136,0.08)",border:"1px solid rgba(0,255,136,0.2)",fontSize:9,color:"#00ff88",textAlign:"center",letterSpacing:2,textTransform:"uppercase"}}>✓ Telegram settings saved</div>}
      </div>

      {/* ── STAFF PIN ── */}
      <div style={{background:th.bgCard,border:`1px solid ${th.border}`,padding:"24px"}}>
        <div style={{fontSize:9,letterSpacing:3,color:th.a2,textTransform:"uppercase",marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:16}}>👥</span> Staff Access
        </div>
        <div style={{fontSize:11,color:th.dim,marginBottom:16,lineHeight:1.7}}>
          Staff PIN gives access to Orders tab only. Owner PIN gives full access.
        </div>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:9,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:6}}>Staff PIN</div>
          <input type="password" value={staffPin} onChange={e=>setStaffPin(e.target.value)}
            placeholder="Set a staff PIN..."
            style={{width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.04)",border:`1px solid ${th.border}`,color:th.text,padding:"11px 13px",fontSize:14,outline:"none",fontFamily:"'Inter',sans-serif",letterSpacing:4}}
            onFocus={e=>e.target.style.borderColor=th.a2} onBlur={e=>e.target.style.borderColor=th.border}/>
        </div>
        <button onClick={saveTg}
          style={{width:"100%",padding:"11px",background:`${th.a2}18`,border:`1px solid ${th.a2}`,color:th.a2,cursor:"pointer",fontSize:9,fontWeight:900,letterSpacing:3,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",transition:"all 0.2s"}}>
          ✓ Save Staff PIN
        </button>
      </div>
    </div>
  );
}

// ── ADMIN PANEL ──
const EFFECTS_LIST=["Euphoric","Creative","Energetic","Relaxed","Sleepy","Happy","Uplifted","Focused","Giggly","Pain Relief","Hungry","Talkative","Tingly","Aroused","Calm"];
const TAGS_LIST=["","MOST CLAIMED","LIMITED","LOCAL BATCH","RARE BATCH","NEW BATCH UNLOCKED","STAFF PICK","SOLD OUT"];

const EMPTY_STRAIN={
  name:"",type:"Hybrid",sativaRatio:50,thc:20,cbd:0.5,
  effects:[],desc:"",gmcCost:400,stock:10,tier:"PREMIUM",tag:"",media:"",media2:"",media3:"",promo:{active:false,label:"",discount:0}
};

function AdminInput({label,value,onChange,type="text",min,max,step,style}){
  const th=T.base;
  return(
    <div style={{marginBottom:12,...style}}>
      <div style={{fontSize:9,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:5}}>{label}</div>
      <input type={type} value={value} onChange={e=>onChange(type==="number"?parseFloat(e.target.value)||0:e.target.value)}
        min={min} max={max} step={step}
        style={{width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.04)",border:`1px solid ${th.border}`,color:th.text,padding:"11px 13px",fontSize:13,outline:"none",fontFamily:"'Inter',sans-serif",transition:"border 0.2s"}}
        onFocus={e=>e.target.style.borderColor=th.a1} onBlur={e=>e.target.style.borderColor=th.border}/>
    </div>
  );
}

function AdminSelect({label,value,onChange,options}){
  const th=T.base;
  return(
    <div style={{marginBottom:12}}>
      <div style={{fontSize:9,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:5}}>{label}</div>
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{width:"100%",boxSizing:"border-box",background:"#13102a",border:`1px solid ${th.border}`,color:th.text,padding:"11px 13px",fontSize:13,outline:"none",fontFamily:"'Inter',sans-serif",cursor:"pointer"}}>
        {options.map(o=>typeof o==="string"?<option key={o} value={o}>{o||"— none —"}</option>:<option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

function StrainEditor({strain,onSave,onCancel,isNew}){
  const th=T.base;
  const [form,setForm]=useState({...EMPTY_STRAIN,...(strain||{})});
  const F=(k,v)=>setForm(f=>({...f,[k]:v}));
  const isSat=form.sativaRatio>=70;
  const isInd=form.sativaRatio<=30;
  const autoType=isSat?"Sativa":isInd?"Indica":"Hybrid";

  // sync type with ratio
  function setRatio(v){
    const r=Math.max(0,Math.min(100,v));
    const t=r>=70?"Sativa":r<=30?"Indica":"Hybrid"; // keep internal type values
    setForm(f=>({...f,sativaRatio:r,type:t}));
  }

  function toggleEffect(e){
    setForm(f=>({...f,effects:f.effects.includes(e)?f.effects.filter(x=>x!==e):[...f.effects,e]}));
  }

  const valid=form.name.trim().length>0&&form.gmcCost>0&&form.stock>=0;

  return(
    <div style={{background:th.bgDeep,position:"fixed",inset:0,zIndex:500,overflowY:"auto",padding:"80px 5vw 100px"}}>
      <div style={{maxWidth:680,margin:"0 auto"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:32,paddingBottom:16,borderBottom:`1px solid ${th.border}`}}>
          <div>
            <div style={{fontSize:9,letterSpacing:4,color:th.amber,textTransform:"uppercase",marginBottom:4}}>{isNew?"Add New Strain":"Edit Strain"}</div>
            <div style={{fontFamily:"'Inter',sans-serif",fontSize:24,fontWeight:900,color:th.text,textTransform:"uppercase"}}>{form.name||"Untitled Strain"}</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <GBtn onClick={onCancel} color={th.dim} outline>Cancel</GBtn>
            <GBtn onClick={()=>valid&&onSave(form)} color={valid?th.a1:"#444"} style={{opacity:valid?1:0.4,cursor:valid?"pointer":"not-allowed"}}>
              {isNew?"＋ Add to Vault":"✓ Save Changes"}
            </GBtn>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
          {/* LEFT */}
          <div>
            <AdminInput label="Strain Name" value={form.name} onChange={v=>F("name",v)}/>
            <AdminInput label="Description" value={form.desc} onChange={v=>F("desc",v)}/>

            <div style={{marginBottom:12}}>
              <div style={{fontSize:9,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:5}}>Sativa / Indica Ratio</div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <span style={{fontSize:10,color:"#00aaff",letterSpacing:1,flexShrink:0}}>⚡ Sativa</span>
                <input type="range" min={0} max={100} value={form.sativaRatio} onChange={e=>setRatio(Number(e.target.value))}
                  style={{flex:1,accentColor:form.sativaRatio>=50?"#00aaff":"#cc0022",cursor:"pointer"}}/>
                <span style={{fontSize:10,color:"#cc0022",letterSpacing:1,flexShrink:0}}>Indica 🔴</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:11,fontWeight:700,color:"#00aaff"}}>{form.sativaRatio}%</span>
                <span style={{fontSize:11,fontWeight:700,color:"#cc0022"}}>{100-form.sativaRatio}%</span>
              </div>
              {/* ratio bar preview */}
              <div style={{height:6,borderRadius:3,overflow:"hidden",background:"rgba(255,255,255,0.06)"}}>
                <div style={{width:form.sativaRatio+"%",height:"100%",background:"linear-gradient(90deg,#00aaff,#00aaff88)",boxShadow:"0 0 8px #00aaff"}}/>
              </div>
              <div style={{marginTop:8,fontSize:10,letterSpacing:2,color:isSat?"#00aaff":isInd?"#cc0022":th.a1,textTransform:"uppercase",textAlign:"center"}}>{getLabel(form.sativaRatio)} · Auto-detected: {autoType}</div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <AdminInput label="Impact %" value={form.thc} onChange={v=>F("thc",v)} type="number" min={0} max={40} step={0.1}/>
              <AdminInput label="CBD % (internal)" value={form.cbd} onChange={v=>F("cbd",v)} type="number" min={0} max={20} step={0.1}/>
            </div>
          </div>

          {/* RIGHT */}
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <AdminInput label="GMC Cost / bit" value={form.gmcCost} onChange={v=>F("gmcCost",v)} type="number" min={1}/>
              <AdminInput label="Stock (bits)" value={form.stock} onChange={v=>F("stock",v)} type="number" min={0}/>
            </div>

            <AdminSelect label="Tier" value={form.tier} onChange={v=>F("tier",v)} options={TIERS}/>
            <AdminSelect label="Tag Badge" value={form.tag} onChange={v=>F("tag",v)} options={TAGS_LIST}/>

            {/* Effects */}
            <div style={{marginBottom:12}}>
              <div style={{fontSize:9,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:8}}>Upgrades ({form.effects.length} selected)</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {EFFECTS_LIST.map(e=>{
                  const on=form.effects.includes(e);
                  return(
                    <button key={e} onClick={()=>toggleEffect(e)}
                      style={{padding:"5px 10px",background:on?`${th.a1}20`:"transparent",border:`1px solid ${on?th.a1:th.border}`,color:on?th.a1:th.dim,cursor:"pointer",fontSize:9,letterSpacing:1,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",boxShadow:on?`0 0 8px ${th.a1}40`:"none",transition:"all 0.15s"}}>
                      {e}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── MEDIA UPLOAD ── */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:9,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:8}}>Hero Media (GIF / Image)</div>

              {/* Preview box */}
              <div style={{width:"100%",height:160,background:`${th.bgDeep}`,border:`2px dashed ${form.media?th.a1:th.border}`,marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden",transition:"border 0.2s",cursor:"pointer"}}
                onClick={()=>document.getElementById("mediaFileInput").click()}>
                {form.media?(
                  <>
                    <img src={form.media} alt="preview" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center"}}/>
                    <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0)",transition:"background 0.2s"}}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(0,0,0,0.45)"}
                      onMouseLeave={e=>e.currentTarget.style.background="rgba(0,0,0,0)"}>
                      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",color:"#fff",fontSize:10,letterSpacing:2,textTransform:"uppercase",fontWeight:700,textAlign:"center",pointerEvents:"none",opacity:0,transition:"opacity 0.2s"}}
                        className="hover-label">
                        Click to change
                      </div>
                    </div>
                    {/* remove button */}
                    <button onClick={e=>{e.stopPropagation();F("media","");}} style={{position:"absolute",top:8,right:8,width:28,height:28,borderRadius:"50%",background:"rgba(0,0,0,0.7)",border:"1px solid rgba(255,255,255,0.2)",color:"#fff",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif",zIndex:2}}>✕</button>
                  </>
                ):(
                  <div style={{textAlign:"center",pointerEvents:"none"}}>
                    <div style={{fontSize:32,marginBottom:8,opacity:0.4}}>🌿</div>
                    <div style={{fontSize:10,color:th.dim,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Click to upload</div>
                    <div style={{fontSize:9,color:th.dim,opacity:0.6}}>GIF · JPG · PNG · WEBP</div>
                  </div>
                )}
              </div>

              {/* Hidden file input */}
              <input id="mediaFileInput" type="file" accept="image/*,.gif" style={{display:"none"}}
                onChange={async e=>{
                  const file=e.target.files?.[0];
                  if(!file) return;
                  if(file.size>20*1024*1024){alert("File too large. Max 20MB.");return;}
                  F("mediaUploading",true);
                  const url=await sbUploadImage(file);
                  F("mediaUploading",false);
                  if(url) F("media",url);
                  else alert("Upload failed. Check your connection.");
                  e.target.value="";
                }}/>

              {/* OR paste URL */}
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <input placeholder="Or paste GIF / image URL..." value={form.media&&form.media.startsWith("http")?form.media:""} onChange={e=>F("media",e.target.value)}
                  style={{flex:1,background:"rgba(255,255,255,0.04)",border:`1px solid ${th.border}`,color:th.text,padding:"9px 12px",fontSize:11,outline:"none",fontFamily:"'Inter',sans-serif"}}
                  onFocus={e=>e.target.style.borderColor=th.a1} onBlur={e=>e.target.style.borderColor=th.border}/>
                {form.media&&<button onClick={()=>F("media","")} style={{padding:"9px 12px",background:"rgba(232,80,32,0.1)",border:"1px solid rgba(232,80,32,0.3)",color:"#e85020",cursor:"pointer",fontSize:9,letterSpacing:1,textTransform:"uppercase",fontFamily:"'Inter',sans-serif"}}>Clear</button>}
              </div>

              {form.mediaUploading&&(
                <div style={{fontSize:9,color:th.a1,marginTop:5,letterSpacing:1,display:"flex",alignItems:"center",gap:6}}>
                  <span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span> Uploading to Supabase...
                </div>
              )}
              {form.media&&form.media.startsWith("https://febslpxjssjijooiukot")&&(
                <div style={{fontSize:9,color:"#00ff88",marginTop:5,letterSpacing:1}}>
                  ✓ Saved to Supabase Storage — visible everywhere
                </div>
              )}
              {/* Photo 2 + 3 */}
              {[["media2","Photo 2 (optional)"],["media3","Photo 3 (optional)"]].map(([key,lbl])=>(
                <div key={key} style={{marginTop:8}}>
                  <div style={{fontSize:8,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:5}}>{lbl}</div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <div style={{width:48,height:48,flexShrink:0,overflow:"hidden",background:th.bgDeep,border:`1px dashed ${form[key]?th.a1:th.border}`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}
                      onClick={()=>document.getElementById("mediaInput_"+key).click()}>
                      {form[key]?<img src={form[key]} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:16,opacity:0.3}}>+</span>}
                    </div>
                    <input id={"mediaInput_"+key} type="file" accept="image/*,.gif" style={{display:"none"}}
                      onChange={async e=>{
                        const file=e.target.files?.[0];
                        if(!file) return;
                        if(file.size>20*1024*1024){return;}
                        const url=await sbUploadImage(file);
                        if(url) F(key,url);
                        e.target.value="";
                      }}/>
                    <input placeholder="Or paste URL..." value={form[key]&&form[key].startsWith("http")?form[key]:""} onChange={e=>F(key,e.target.value)}
                      style={{flex:1,background:"rgba(255,255,255,0.04)",border:`1px solid ${th.border}`,color:th.text,padding:"8px 10px",fontSize:11,outline:"none",fontFamily:"'Inter',sans-serif"}}
                      onFocus={e=>e.target.style.borderColor=th.a1} onBlur={e=>e.target.style.borderColor=th.border}/>
                    {form[key]&&<button onClick={()=>F(key,"")} style={{padding:"8px 10px",background:"rgba(232,80,32,0.1)",border:"1px solid rgba(232,80,32,0.3)",color:"#e85020",cursor:"pointer",fontSize:9,fontFamily:"'Inter',sans-serif"}}>✕</button>}
                  </div>
                </div>
              ))}
            </div>

            {/* Live Preview Card */}
            <div style={{marginTop:16}}>
              <div style={{fontSize:9,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:8}}>Live Preview</div>
              <div style={{background:th.bgCard,border:`1px solid ${th.border}`,overflow:"hidden",position:"relative"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:isSat?"linear-gradient(90deg,#ff1493,#00ffff)":isInd?"linear-gradient(90deg,#cc0022,#5500aa)":"linear-gradient(90deg,#ff1493,#cc0022)",zIndex:2}}/>
                {/* mini media preview */}
                <div style={{width:"100%",height:90,background:`${th.bgDeep}`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {form.media?(
                    <img src={form.media} alt="preview" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                  ):(
                    <BudPlaceholder color1={isSat?"#00aaff":isInd?"#cc0022":th.a1} color2={isSat?"#00ffff":isInd?"#5500aa":"#cc0022"} size={80}/>
                  )}
                  <div style={{position:"absolute",bottom:0,left:0,right:0,height:30,background:`linear-gradient(transparent,${th.bgCard})`,pointerEvents:"none"}}/>
                </div>
                <div style={{padding:"10px 12px"}}>
                  <div style={{fontSize:13,fontWeight:900,color:th.text,textTransform:"uppercase",marginBottom:4}}>{form.name||"Strain Name"}</div>
                  <div style={{fontSize:9,color:getTheme(form.type).a1,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>{getLabel(form.sativaRatio)} · {form.tier}</div>
                  <div style={{display:"flex",gap:14}}>
                    <div><div style={{fontSize:8,color:th.dim}}>Impact</div><div style={{fontSize:13,fontWeight:700,color:th.a1}}>{form.thc}%</div></div>
                    <div></div>
                    <div><div style={{fontSize:8,color:th.dim}}>GMC/g</div><div style={{fontSize:13,fontWeight:700,color:th.amber}}>{form.gmcCost}</div></div>
                    <div><div style={{fontSize:8,color:th.dim}}>Stock</div><div style={{fontSize:13,fontWeight:700,color:form.stock<=5?"#e85020":"#00ff88"}}>{form.stock} bits</div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminPanel({t,user,strains,setStrains,members=[],transactions=[],onUpdateBalance,discountSettings,setDiscountSettings,featuredIds=[],setFeaturedIds,onExit,onAddGMC,contactSettings,onSaveContact,staffSettings,onSaveStaff,orders=[],onUpdateOrderStatus,staffMode=false}){
  const th=T.base;
  const [gmcAmt,setGmcAmt]=useState(1000);
  const [added,setAdded]=useState(false);
  const [activeTab,setActiveTab]=useState("inventory");
  useEffect(()=>{if(staffMode)setActiveTab("orders");},[staffMode]);
  const [editing,setEditing]=useState(null); // strain object or "new"
  const [deleteConfirm,setDeleteConfirm]=useState(null); // strain id
  const [toast,setToast]=useState("");

  function showToast(msg){setToast(msg);setTimeout(()=>setToast(""),2500);}

  async function saveStrain(form){
    if(editing==="new"){
      const dbRow=strainToDb(form);
      const saved=await sbInsert("strains",dbRow);
      if(saved){
        const newS=dbToStrain(saved);
        setStrains(ss=>[...ss,newS]);
        showToast(`✓ "${form.name}" added to The Vault`);
      } else {
        showToast(`⚠ Save failed — check connection`);
      }
    } else {
      const dbRow=strainToDb(form);
      await sbUpdate("strains",{id:form.id},dbRow);
      // Re-fetch from Supabase so image_url → media mapping is correct everywhere
      const rows=await sbGet("strains",`id=eq.${form.id}`);
      const updated=rows&&rows.length>0?dbToStrain(rows[0]):form;
      setStrains(ss=>ss.map(s=>s.id===form.id?updated:s));
      showToast(`✓ "${form.name}" updated`);
    }
    setEditing(null);
  }

  async function deleteStrain(id){
    const s=strains.find(x=>x.id===id);
    await sbDelete("strains",{id});
    setStrains(ss=>ss.filter(x=>x.id!==id));
    setDeleteConfirm(null);
    showToast(`🗑 "${s?.name}" removed from shelf`);
  }

  async function adjustStock(id,delta){
    const s=strains.find(x=>x.id===id);
    if(!s) return;
    const newStock=Math.max(0,s.stock+delta);
    setStrains(ss=>ss.map(x=>x.id===id?{...x,stock:newStock}:x));
    await sbUpdate("strains",{id},{stock:newStock});
  }

  function doAddGMC(){
    onAddGMC(gmcAmt);
    setAdded(true);
    showToast(`✓ ${gmcAmt.toLocaleString()} GMC added to ${user?.name||"member"}`);
    setTimeout(()=>setAdded(false),2000);
  }

  const totalStock=strains.reduce((a,s)=>a+s.stock,0);
  const lowStock=strains.filter(s=>s.stock<=5&&s.stock>0);
  const outOfStock=strains.filter(s=>s.stock===0);

  // Show editor overlay
  if(editing!==null){
    return <StrainEditor
      strain={editing==="new"?null:editing}
      onSave={saveStrain}
      onCancel={()=>setEditing(null)}
      isNew={editing==="new"}/>;
  }

  return(
    <div style={{minHeight:"100vh",background:th.bgDeep,paddingBottom:100,position:"relative"}}>

      {/* Toast */}
      {toast&&(
        <div style={{position:"fixed",top:80,left:"50%",transform:"translateX(-50%)",background:th.bgCard,border:`1px solid ${th.a1}`,color:th.a1,padding:"12px 24px",fontSize:12,letterSpacing:2,textTransform:"uppercase",zIndex:999,boxShadow:`0 0 20px ${th.a1}30`,fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap"}}>
          {toast}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:th.bgCard,border:"1px solid #e85020",padding:"28px",maxWidth:340,width:"100%",boxShadow:"0 0 40px rgba(232,80,32,0.2)"}}>
            <div style={{fontSize:32,marginBottom:12,textAlign:"center"}}>⚠️</div>
            <div style={{fontSize:14,fontWeight:700,color:th.text,textAlign:"center",textTransform:"uppercase",marginBottom:8}}>Delete Strain?</div>
            <p style={{fontSize:12,color:th.dim,textAlign:"center",marginBottom:20,lineHeight:1.6}}>
              "{strains.find(s=>s.id===deleteConfirm)?.name}" will be permanently removed from The Vault.
            </p>
            <div style={{display:"flex",gap:8}}>
              <GBtn onClick={()=>setDeleteConfirm(null)} color={th.dim} outline style={{flex:1}}>Cancel</GBtn>
              <GBtn onClick={()=>deleteStrain(deleteConfirm)} color="#e85020" style={{flex:1}}>🗑 Delete</GBtn>
            </div>
          </div>
        </div>
      )}

      {/* Admin Header */}
      <div style={{background:`linear-gradient(90deg,${th.bgCard},${th.bg})`,borderBottom:`1px solid ${th.amber}40`,padding:"18px 5vw",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,position:"sticky",top:62,zIndex:90}}>
        <div>
          <div style={{fontSize:8,letterSpacing:4,color:th.amber,textTransform:"uppercase",textShadow:`0 0 8px ${th.amber}`,marginBottom:2}}>🔐 Control Room · Admin Access</div>
          <div style={{fontFamily:"'Inter',sans-serif",fontSize:"clamp(18px,3vw,26px)",fontWeight:900,color:th.text,textTransform:"uppercase",letterSpacing:"-0.02em"}}>Admin Panel</div>
        </div>
        <GBtn onClick={onExit} color={th.dim} outline>✕ Exit</GBtn>
      </div>

      {/* Sub-tabs */}
      <div style={{display:"flex",gap:0,padding:"0 5vw",borderBottom:`1px solid ${th.border}`,background:th.bgCard,overflowX:"auto"}}>
        {(staffMode?[["orders","📦 Orders"]]:[["orders","📦 Orders"],["inventory","◈ Inventory"],["dashboard","⬡ Dashboard"],["members","◉ Members"],["discounts","⚡ Discounts"],["ai","🤖 AI Assistant"],["settings","⚙ Settings"]]).map(([k,l])=>(
          <button key={k} onClick={()=>setActiveTab(k)} style={{padding:"13px 20px",background:"transparent",borderBottom:`2px solid ${activeTab===k?th.amber:"transparent"}`,borderTop:"none",borderLeft:"none",borderRight:"none",color:activeTab===k?th.amber:th.dim,cursor:"pointer",fontSize:10,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",transition:"all 0.2s",whiteSpace:"nowrap",flexShrink:0}}>
            {l}
          </button>
        ))}
      </div>

      <div style={{padding:"28px 5vw"}}>

        {/* ── ORDERS TAB ── */}
        {activeTab==="orders"&&(
          <OrdersPanel orders={orders} members={members} onUpdateStatus={onUpdateOrderStatus} theme={th}/>
        )}

        {/* ── INVENTORY TAB ── */}
        {activeTab==="inventory"&&(
          <div>
            {/* Top bar */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12}}>
              <div>
                <div style={{fontSize:9,letterSpacing:4,color:th.dim,textTransform:"uppercase",marginBottom:4}}>Strain Management · {strains.length} strains</div>
                <div style={{display:"flex",gap:12,alignItems:"center"}}>
                  {lowStock.length>0&&<span style={{fontSize:9,color:"#e8a020",letterSpacing:1}}>⚠️ {lowStock.length} low stock</span>}
                  {outOfStock.length>0&&<span style={{fontSize:9,color:"#e85020",letterSpacing:1}}>🔴 {outOfStock.length} out of stock</span>}
                </div>
              </div>
              <GBtn onClick={()=>setEditing("new")} color={th.a1}>＋ Add New Strain</GBtn>
            </div>

            {/* Strain rows */}
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
              {strains.map(s=>{
                const sth=getTheme(s.type);
                const ts=TIER_S[s.tier]||TIER_S["TOP"];
                const stockColor=s.stock===0?"#e85020":s.stock<=5?"#e8a020":"#00ff88";
                const isSat=s.type==="Sativa"||s.sativaRatio>=70;
                const isInd=s.type==="Indica"||s.sativaRatio<=30;
                return(
                  <div key={s.id} style={{background:th.bgCard,border:`1px solid ${th.border}`,padding:"16px 20px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",position:"relative",transition:"border 0.2s"}}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=sth.a1}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=th.border}>

                    {/* type color bar */}
                    <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:isSat?"#00aaff":isInd?"#cc0022":"linear-gradient(180deg,#ff1493,#cc0022)"}}/>

                    {/* Name + type */}
                    <div style={{flex:"0 0 200px",paddingLeft:8}}>
                      <div style={{fontSize:13,fontWeight:900,color:th.text,textTransform:"uppercase",letterSpacing:"-0.01em",marginBottom:3}}>{s.name}</div>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <span style={{fontSize:8,color:sth.a1,letterSpacing:2,textTransform:"uppercase"}}>{getLabel(s.sativaRatio)}</span>
                        <span style={{fontSize:8,color:ts.color,letterSpacing:1}}>{ts.icon} {s.tier}</span>
                        {s.tag&&<span style={{fontSize:7,color:th.amber,background:`${th.amber}15`,padding:"1px 5px",border:`1px solid ${th.amber}30`,letterSpacing:1}}>{s.tag}</span>}
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{display:"flex",gap:16,flex:1,minWidth:180}}>
                      {[["Impact",s.thc+"%",th.a1],["GMC",s.gmcCost+"/bit",th.amber]].map(([k,v,c])=>(
                        <div key={k}>
                          <div style={{fontSize:8,color:th.dim,letterSpacing:1,textTransform:"uppercase"}}>{k}</div>
                          <div style={{fontSize:13,fontWeight:700,color:c}}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Stock adjuster */}
                    <div style={{display:"flex",alignItems:"center",gap:6,flex:"0 0 auto"}}>
                      <button onClick={()=>adjustStock(s.id,-1)} style={{width:26,height:26,background:"transparent",border:`1px solid ${th.border}`,color:th.dim,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif"}}>−</button>
                      <div style={{textAlign:"center",minWidth:52}}>
                        <div style={{fontSize:16,fontWeight:900,color:stockColor,fontFamily:"'Inter',sans-serif"}}>{s.stock}</div>
                        <div style={{fontSize:7,color:th.dim,letterSpacing:1,textTransform:"uppercase"}}>bits</div>
                      </div>
                      <button onClick={()=>adjustStock(s.id,1)} style={{width:26,height:26,background:"transparent",border:`1px solid ${th.border}`,color:th.dim,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif"}}>＋</button>
                    </div>

                    {/* Actions */}
                    <div style={{display:"flex",gap:6,flex:"0 0 auto"}}>
                      <button onClick={()=>setEditing({...s})} style={{padding:"8px 14px",background:`${th.a1}12`,border:`1px solid ${th.a1}40`,color:th.a1,cursor:"pointer",fontSize:9,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",transition:"all 0.2s"}}
                        onMouseEnter={e=>{e.target.style.background=`${th.a1}25`;}}
                        onMouseLeave={e=>{e.target.style.background=`${th.a1}12`;}}>
                        ✏ Edit
                      </button>
                      <button onClick={()=>setDeleteConfirm(s.id)} style={{padding:"8px 14px",background:"rgba(232,80,32,0.1)",border:"1px solid rgba(232,80,32,0.3)",color:"#e85020",cursor:"pointer",fontSize:9,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",transition:"all 0.2s"}}
                        onMouseEnter={e=>{e.target.style.background="rgba(232,80,32,0.2)";}}
                        onMouseLeave={e=>{e.target.style.background="rgba(232,80,32,0.1)";}}>
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {strains.length===0&&(
              <div style={{textAlign:"center",padding:"60px 20px",color:th.dim,border:`1px dashed ${th.border}`}}>
                <div style={{fontSize:40,marginBottom:12}}>◈</div>
                <div style={{fontSize:13,letterSpacing:2,textTransform:"uppercase",marginBottom:16}}>No strains in The Vault</div>
                <GBtn onClick={()=>setEditing("new")} color={th.a1}>＋ Add First Strain</GBtn>
              </div>
            )}
          </div>
        )}

        {/* ── DASHBOARD TAB ── */}
        {activeTab==="dashboard"&&(
          <div>
            {/* ── FEATURED DROPS MANAGER ── */}
            <div style={{marginBottom:32}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:10}}>
                <div>
                  <div style={{fontSize:9,letterSpacing:4,color:th.amber,textTransform:"uppercase",marginBottom:4}}>Featured Drops · Homepage</div>
                  <div style={{fontSize:11,color:th.dim}}>{featuredIds.length} strain{featuredIds.length!==1?"s":""} showing · max 6</div>
                </div>
                <GBtn onClick={()=>setFeaturedIds([])} color={th.dim} outline>Clear All</GBtn>
              </div>

              {/* Selected featured strains — reorderable */}
              <div style={{display:"flex",flexDirection:"column",gap:2,marginBottom:12}}>
                {featuredIds.length===0&&(
                  <div style={{padding:"20px",textAlign:"center",border:`1px dashed ${th.border}`,color:th.dim,fontSize:11,letterSpacing:1}}>
                    No featured drops selected — add from the list below
                  </div>
                )}
                {featuredIds.map((id,idx)=>{
                  const s=strains.find(x=>x.id===id);
                  if(!s) return null;
                  const sth=getTheme(s.type);
                  const isSat=s.sativaRatio>=70;
                  const isInd=s.sativaRatio<=30;
                  return(
                    <div key={id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:th.bgCard,border:`1px solid ${th.amber}30`,borderLeft:`3px solid ${th.amber}`}}>
                      {/* Position number */}
                      <div style={{width:24,height:24,borderRadius:"50%",background:`${th.amber}20`,border:`1px solid ${th.amber}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,color:th.amber,flexShrink:0}}>{idx+1}</div>
                      {/* Thumb */}
                      <div style={{width:36,height:36,flexShrink:0,overflow:"hidden",background:th.bgDeep,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {s.media?<img src={s.media} alt={s.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<BudPlaceholder color1={isSat?"#00aaff":isInd?"#cc0022":sth.a1} color2={isSat?"#00ddff":isInd?"#5500aa":"#cc0022"} size={32}/>}
                      </div>
                      {/* Info */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,fontWeight:700,color:th.text,textTransform:"uppercase",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</div>
                        <div style={{fontSize:8,color:sth.a1,letterSpacing:1,textTransform:"uppercase"}}>{s.tier} · {s.gmcCost} GMC/bit · {s.stock} bits</div>
                      </div>
                      {/* Promo badge */}
                      {s.promo?.active&&s.promo.label&&(
                        <div style={{fontSize:8,color:"#ffc800",background:"rgba(255,200,0,0.12)",padding:"2px 7px",border:"1px solid rgba(255,200,0,0.3)",letterSpacing:1,textTransform:"uppercase",flexShrink:0}}>⚡ {s.promo.label}</div>
                      )}
                      {/* Move up/down */}
                      <div style={{display:"flex",flexDirection:"column",gap:2,flexShrink:0}}>
                        <button onClick={()=>{if(idx===0)return;const arr=[...featuredIds];[arr[idx-1],arr[idx]]=[arr[idx],arr[idx-1]];setFeaturedIds(arr);}}
                          disabled={idx===0}
                          style={{width:22,height:22,background:"transparent",border:`1px solid ${th.border}`,color:idx===0?th.border:th.dim,cursor:idx===0?"default":"pointer",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif",transition:"all 0.15s"}}>▲</button>
                        <button onClick={()=>{if(idx===featuredIds.length-1)return;const arr=[...featuredIds];[arr[idx+1],arr[idx]]=[arr[idx],arr[idx+1]];setFeaturedIds(arr);}}
                          disabled={idx===featuredIds.length-1}
                          style={{width:22,height:22,background:"transparent",border:`1px solid ${th.border}`,color:idx===featuredIds.length-1?th.border:th.dim,cursor:idx===featuredIds.length-1?"default":"pointer",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif",transition:"all 0.15s"}}>▼</button>
                      </div>
                      {/* Remove */}
                      <button onClick={()=>setFeaturedIds(ids=>ids.filter(x=>x!==id))}
                        style={{width:26,height:26,background:"rgba(232,80,32,0.1)",border:"1px solid rgba(232,80,32,0.3)",color:"#e85020",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif",flexShrink:0,transition:"all 0.15s"}}>✕</button>
                    </div>
                  );
                })}
              </div>

              {/* All strains — tap to add */}
              <div style={{fontSize:9,letterSpacing:3,color:th.dim,textTransform:"uppercase",marginBottom:8}}>
                {featuredIds.length>=6?"Max 6 reached — remove one to add another":"Add to featured"}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:2}}>
                {strains.filter(s=>!featuredIds.includes(s.id)).map(s=>{
                  const sth=getTheme(s.type);
                  const isSat=s.sativaRatio>=70;
                  const isInd=s.sativaRatio<=30;
                  const canAdd=featuredIds.length<6;
                  return(
                    <button key={s.id}
                      onClick={()=>{if(!canAdd)return;setFeaturedIds(ids=>[...ids,s.id]);}}
                      disabled={!canAdd}
                      style={{padding:"10px 12px",background:"rgba(255,255,255,0.02)",border:`1px solid ${canAdd?th.border:"rgba(255,255,255,0.05)"}`,cursor:canAdd?"pointer":"not-allowed",display:"flex",alignItems:"center",gap:8,opacity:canAdd?1:0.4,transition:"all 0.15s",textAlign:"left"}}
                      onMouseEnter={e=>{if(canAdd){e.currentTarget.style.borderColor=th.amber;e.currentTarget.style.background="rgba(232,160,32,0.06)";}}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=th.border;e.currentTarget.style.background="rgba(255,255,255,0.02)";}}>
                      <div style={{width:32,height:32,flexShrink:0,overflow:"hidden",background:th.bgDeep,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {s.media?<img src={s.media} alt={s.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<BudPlaceholder color1={isSat?"#00aaff":isInd?"#cc0022":sth.a1} color2={isSat?"#00ddff":isInd?"#5500aa":"#cc0022"} size={28}/>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:10,fontWeight:700,color:th.text,textTransform:"uppercase",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</div>
                        <div style={{fontSize:8,color:sth.a1,letterSpacing:1,textTransform:"uppercase"}}>{s.tier}</div>
                      </div>
                      {canAdd&&<span style={{fontSize:14,color:th.amber,flexShrink:0}}>+</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{height:1,background:`linear-gradient(90deg,transparent,${th.border},transparent)`,margin:"0 0 28px"}}/>

            {/* ── SALES STATS ── */}
            {(()=>{
              const now=new Date();
              const weekAgo=new Date(now-7*24*60*60*1000);
              const claimTxs=transactions.filter(tx=>tx.amount<0);
              const weekTxs=claimTxs.filter(tx=>new Date(tx.at||0)>=weekAgo);
              const totalRevenue=transactions.filter(tx=>tx.amount<0).reduce((a,tx)=>a+Math.abs(tx.amount),0);
              const avgOrder=claimTxs.length>0?Math.round(totalRevenue/claimTxs.length):0;
              const activeMems=members.filter(m=>(m.totalSpent||0)>0).length;
              // top strain by volume
              const strainVolume={};
              claimTxs.forEach(tx=>{
                const match=tx.note?.match(/Claimed (\d+) bits of (.+)/);
                if(match){const name=match[2];strainVolume[name]=(strainVolume[name]||0)+parseInt(match[1]);}
              });
              const topStrain=Object.entries(strainVolume).sort((a,b)=>b[1]-a[1])[0];
              return(
                <div style={{marginBottom:28}}>
                  <div style={{fontSize:9,letterSpacing:4,color:"#00ff88",textTransform:"uppercase",marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:4,height:4,background:"#00ff88",boxShadow:"0 0 6px #00ff88"}}/>
                    Sales Intelligence
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:3,marginBottom:3}}>
                    {[
                      ["Total Revenue",totalRevenue.toLocaleString()+" GMC","#e8a020","💰"],
                      ["This Week",weekTxs.length+" claims","#00ff88","📈"],
                      ["Avg Order",avgOrder.toLocaleString()+" GMC",th.a1,"◈"],
                      ["Active Members",activeMems+"/"+members.length,th.a2,"◉"],
                      ["Total Claims",claimTxs.length,"#00ff88","📦"],
                      ["Top Batch",topStrain?topStrain[0]:"—",th.amber,"🏆"],
                    ].map(([label,val,color,ic])=>(
                      <div key={label} style={{background:th.bgCard,border:`1px solid ${color}20`,padding:"14px",position:"relative",overflow:"hidden"}}>
                        <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${color}40,transparent)`}}/>
                        <div style={{position:"absolute",bottom:-4,right:2,fontSize:24,opacity:0.06}}>{ic}</div>
                        <div style={{fontSize:7,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:6}}>{label}</div>
                        <div style={{fontFamily:"'Inter',sans-serif",fontSize:label==="Top Batch"?13:20,fontWeight:900,color:color,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{val}</div>
                      </div>
                    ))}
                  </div>
                  {/* Revenue trend — weekly bar chart */}
                  {(()=>{
                    const days=7;
                    const bars=Array.from({length:days},(_,i)=>{
                      const d=new Date(now);d.setDate(d.getDate()-i);
                      const dayStr=d.toDateString();
                      const rev=transactions.filter(tx=>tx.amount<0&&new Date(tx.at||0).toDateString()===dayStr).reduce((a,tx)=>a+Math.abs(tx.amount),0);
                      return{day:d.toLocaleDateString("en-GB",{weekday:"short"}),rev};
                    }).reverse();
                    const maxRev=Math.max(...bars.map(b=>b.rev),1);
                    return(
                      <div style={{background:th.bgCard,border:`1px solid ${th.border}`,padding:"14px 16px"}}>
                        <div style={{fontSize:8,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:12}}>7-Day Revenue</div>
                        <div style={{display:"flex",gap:4,alignItems:"flex-end",height:48}}>
                          {bars.map((b,i)=>(
                            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                              <div style={{width:"100%",background:b.rev>0?"#00ff88":"rgba(255,255,255,0.04)",height:Math.max(3,(b.rev/maxRev)*44)+"px",boxShadow:b.rev>0?"0 0 6px rgba(0,255,136,0.4)":"none",transition:"height 0.3s"}}/>
                              <div style={{fontSize:7,color:th.dim,letterSpacing:0.5}}>{b.day}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            <div style={{fontSize:9,letterSpacing:4,color:th.dim,textTransform:"uppercase",marginBottom:20}}>Vault Overview</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:3,marginBottom:28}}>
              {[
                ["Total Strains",strains.length,th.a1,"💊"],
                ["Total Stock",totalStock+"g",th.a2,"📦"],
                ["Exotic Drops",strains.filter(s=>s.tier==="EXOTIC").length,th.amber,"💎"],
                ["Low Stock",lowStock.length,lowStock.length>0?"#e8a020":th.dim,"⚠️"],
                ["Out of Stock",outOfStock.length,outOfStock.length>0?"#e85020":th.dim,"🔴"],
                ["Avg GMC/g",strains.length?(strains.reduce((a,s)=>a+s.gmcCost,0)/strains.length).toFixed(0):"—",th.a1,"💰"],
              ].map(([label,val,color,ic])=>(
                <div key={label} style={{background:th.bgCard,border:`1px solid ${color}25`,padding:"18px",position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",bottom:-6,right:-4,fontSize:36,opacity:0.07}}>{ic}</div>
                  <div style={{fontSize:8,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:8}}>{label}</div>
                  <div style={{fontFamily:"'Inter',sans-serif",fontSize:28,fontWeight:900,color:color,textShadow:`0 0 12px ${color}50`}}>{val}</div>
                </div>
              ))}
            </div>

            {(lowStock.length>0||outOfStock.length>0)&&(
              <div style={{background:"rgba(232,80,32,0.06)",border:"1px solid rgba(232,80,32,0.25)",padding:"16px 20px",marginBottom:24}}>
                <div style={{fontSize:10,letterSpacing:2,color:"#e85020",textTransform:"uppercase",marginBottom:12,fontWeight:700}}>⚠️ Stock Alerts</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {outOfStock.map(s=>(
                    <div key={s.id} style={{background:"rgba(232,80,32,0.15)",border:"1px solid rgba(232,80,32,0.4)",padding:"6px 12px",fontSize:11,color:"#e85020",display:"flex",gap:8,alignItems:"center"}}>
                      🔴 {s.name} — OUT OF STOCK
                      <button onClick={()=>setEditing({...s})} style={{background:"transparent",border:"none",color:"#e85020",cursor:"pointer",fontSize:9,letterSpacing:1,textDecoration:"underline",fontFamily:"'Inter',sans-serif",padding:0}}>Restock</button>
                    </div>
                  ))}
                  {lowStock.map(s=>(
                    <div key={s.id} style={{background:"rgba(232,160,32,0.12)",border:"1px solid rgba(232,160,32,0.35)",padding:"6px 12px",fontSize:11,color:"#e8a020",display:"flex",gap:8,alignItems:"center"}}>
                      ⚠️ {s.name} — {s.stock}g left
                      <button onClick={()=>setEditing({...s})} style={{background:"transparent",border:"none",color:"#e8a020",cursor:"pointer",fontSize:9,letterSpacing:1,textDecoration:"underline",fontFamily:"'Inter',sans-serif",padding:0}}>Restock</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tier breakdown */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3,marginBottom:24}}>
              {TIERS.map(tier=>{
                const ts=TIER_S[tier];
                const items=strains.filter(s=>s.tier===tier);
                const tierStock=items.reduce((a,s)=>a+s.stock,0);
                return(
                  <div key={tier} style={{background:th.bgCard,border:`1px solid ${ts.color}25`,padding:"20px"}}>
                    <div style={{fontSize:18,marginBottom:6}}>{ts.icon}</div>
                    <div style={{fontSize:11,fontWeight:900,color:ts.color,textTransform:"uppercase",letterSpacing:1,marginBottom:10,textShadow:`0 0 10px ${ts.color}`}}>{tier}</div>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <div><div style={{fontSize:8,color:th.dim,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Strains</div><div style={{fontSize:20,fontWeight:900,color:th.text}}>{items.length}</div></div>
                      <div style={{textAlign:"right"}}><div style={{fontSize:8,color:th.dim,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Stock</div><div style={{fontSize:20,fontWeight:900,color:ts.color}}>{tierStock}g</div></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stock bar chart */}
            <div style={{background:th.bgCard,border:`1px solid ${th.border}`,padding:"20px"}}>
              <div style={{fontSize:9,letterSpacing:3,color:th.a1,textTransform:"uppercase",marginBottom:16}}>Stock Levels</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {[...strains].sort((a,b)=>b.stock-a.stock).map(s=>{
                  const pct=totalStock>0?(s.stock/Math.max(...strains.map(x=>x.stock)))*100:0;
                  const sc=s.stock===0?"#e85020":s.stock<=5?"#e8a020":"#00ff88";
                  return(
                    <div key={s.id} style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{flex:"0 0 150px",fontSize:10,color:th.text,textTransform:"uppercase",letterSpacing:"-0.01em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</div>
                      <div style={{flex:1,height:5,background:"rgba(255,255,255,0.04)",borderRadius:3,overflow:"hidden"}}>
                        <div style={{width:pct+"%",height:"100%",background:sc,boxShadow:`0 0 6px ${sc}`,transition:"width 0.4s"}}/>
                      </div>
                      <div style={{flex:"0 0 40px",fontSize:11,fontWeight:700,color:sc,textAlign:"right"}}>{s.stock}g</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── MEMBERS + GMC UNIFIED TAB ── */}
        {activeTab==="members"&&(
          <GMCOperationsPanel
            members={members}
            transactions={transactions}
            onUpdateBalance={onUpdateBalance}
            theme={th}
          />
        )}

        {/* ── DISCOUNTS TAB ── */}
        {activeTab==="discounts"&&discountSettings&&(
          <DiscountPanel discountSettings={discountSettings} setDiscountSettings={setDiscountSettings} strains={strains} setStrains={setStrains} theme={th}/>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab==="settings"&&(
          <SettingsPanel contactSettings={contactSettings} onSaveContact={onSaveContact} staffSettings={staffSettings} onSaveStaff={onSaveStaff} theme={th}/>
        )}

        {/* ── AI ASSISTANT TAB ── */}
        {activeTab==="ai"&&(
          <AdminAI
            strains={strains}
            members={members}
            transactions={transactions}
            theme={th}
          />
        )}

      </div>
    </div>
  );
}


// ── DISCOUNT PANEL ──
function DiscountPanel({discountSettings,setDiscountSettings,strains,setStrains,theme}){
  const th=theme||T.base;
  const DS=discountSettings;
  function setDS(fn){setDiscountSettings(fn);}

  function updateTier(i,field,val){
    setDS(d=>({...d,tiers:d.tiers.map((t,idx)=>idx===i?{...t,[field]:val}:t)}));
  }
  function addTier(){
    setDS(d=>({...d,tiers:[...d.tiers,{minGrams:d.tiers.length>0?Math.max(...d.tiers.map(t=>t.minGrams))+5:5,discount:5}]}));
  }
  function removeTier(i){
    setDS(d=>({...d,tiers:d.tiers.filter((_,idx)=>idx!==i)}));
  }
  function toggleTierApply(tier){
    setDS(d=>({...d,applyTo:{...d.applyTo,[tier]:!d.applyTo[tier]}}));
  }
  function setStrainPromo(strainId,promo){
    setStrains(ss=>ss.map(s=>s.id===strainId?{...s,promo}:s));
  }

  const inputS={background:"rgba(255,255,255,0.04)",border:`1px solid ${th.border}`,color:th.text,padding:"8px 10px",fontSize:12,outline:"none",fontFamily:"'Inter',sans-serif",width:"100%",boxSizing:"border-box"};

  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,alignItems:"start"}}>

      {/* LEFT — Bulk Tiers */}
      <div>
        <div style={{fontSize:9,letterSpacing:4,color:th.dim,textTransform:"uppercase",marginBottom:16}}>Bulk Discount Tiers</div>

        {/* Master toggle */}
        <div style={{background:th.bgCard,border:`1px solid ${DS.enabled?th.a1:th.border}`,padding:"14px 16px",marginBottom:3,display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:DS.enabled?`0 0 12px ${th.a1}15`:"none"}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:DS.enabled?th.a1:th.dim,textTransform:"uppercase",letterSpacing:1}}>Bulk Discounts</div>
            <div style={{fontSize:9,color:th.dim,marginTop:2}}>{DS.enabled?"Active — applying to selected tiers":"Disabled globally"}</div>
          </div>
          <button onClick={()=>setDS(d=>({...d,enabled:!d.enabled}))}
            style={{padding:"6px 14px",background:DS.enabled?`${th.a1}20`:"rgba(255,255,255,0.05)",border:`1px solid ${DS.enabled?th.a1:th.border}`,color:DS.enabled?th.a1:th.dim,cursor:"pointer",fontSize:9,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",transition:"all 0.2s"}}>
            {DS.enabled?"ON":"OFF"}
          </button>
        </div>

        {/* Apply to tiers */}
        <div style={{background:th.bgCard,border:`1px solid ${th.border}`,padding:"14px 16px",marginBottom:3}}>
          <div style={{fontSize:9,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:10}}>Apply bulk to</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {TIERS.map(tier=>{
              const ts=TIER_S[tier];
              const on=DS.applyTo[tier];
              return(
                <button key={tier} onClick={()=>toggleTierApply(tier)}
                  style={{padding:"6px 12px",background:on?`${ts.color}18`:"transparent",border:`1px solid ${on?ts.color:th.border}`,color:on?ts.color:th.dim,cursor:"pointer",fontSize:9,letterSpacing:1,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",transition:"all 0.15s",boxShadow:on?`0 0 8px ${ts.color}30`:"none"}}>
                  {ts.icon} {tier}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tier rows */}
        <div style={{background:th.bgCard,border:`1px solid ${th.border}`,padding:"14px 16px",marginBottom:3}}>
          <div style={{fontSize:9,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:12}}>Discount Tiers</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {DS.tiers.sort((a,b)=>a.minGrams-b.minGrams).map((tier,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:6,alignItems:"center"}}>
                <div>
                  <div style={{fontSize:8,color:th.dim,letterSpacing:1,marginBottom:3}}>Min grams</div>
                  <input type="number" value={tier.minGrams} onChange={e=>updateTier(i,"minGrams",Number(e.target.value)||1)}
                    style={{...inputS,textAlign:"center"}} min={1}
                    onFocus={e=>e.target.style.borderColor=th.a1} onBlur={e=>e.target.style.borderColor=th.border}/>
                </div>
                <div>
                  <div style={{fontSize:8,color:th.dim,letterSpacing:1,marginBottom:3}}>Discount %</div>
                  <input type="number" value={tier.discount} onChange={e=>updateTier(i,"discount",Math.min(100,Number(e.target.value)||0))}
                    style={{...inputS,textAlign:"center",color:th.amber}} min={0} max={100}
                    onFocus={e=>e.target.style.borderColor=th.amber} onBlur={e=>e.target.style.borderColor=th.border}/>
                </div>
                <button onClick={()=>removeTier(i)} style={{width:28,height:28,background:"rgba(232,80,32,0.1)",border:"1px solid rgba(232,80,32,0.3)",color:"#e85020",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif",marginTop:16}}>✕</button>
              </div>
            ))}
          </div>
          <button onClick={addTier} style={{width:"100%",marginTop:10,padding:"9px",background:`${th.a1}10`,border:`1px dashed ${th.a1}40`,color:th.a1,cursor:"pointer",fontSize:9,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",transition:"all 0.2s"}}>
            + Add Tier
          </button>
        </div>

        {/* Preview table */}
        <div style={{background:th.bgCard,border:`1px solid ${th.border}`,padding:"14px 16px"}}>
          <div style={{fontSize:9,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:10}}>Preview (400 GMC/g base)</div>
          {[1,5,10,20].map(g=>{
            const sorted=[...DS.tiers].sort((a,b)=>b.minGrams-a.minGrams);
            const match=DS.enabled?sorted.find(t=>g>=t.minGrams):null;
            const disc=match?match.discount:0;
            const price=Math.round(400*g*(1-disc/100));
            return(
              <div key={g} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${th.border}`,alignItems:"center"}}>
                <span style={{fontSize:10,color:th.dim}}>{g}g</span>
                {disc>0?<span style={{fontSize:9,color:"#00ff88",letterSpacing:1}}>-{disc}%</span>:<span style={{fontSize:9,color:th.dim,opacity:0.4}}>no discount</span>}
                <span style={{fontSize:11,fontWeight:700,color:disc>0?th.amber:th.dim}}>{price.toLocaleString()} GMC</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT — Per Strain Promos */}
      <div>
        <div style={{fontSize:9,letterSpacing:4,color:th.dim,textTransform:"uppercase",marginBottom:16}}>Strain Promos</div>
        <div style={{background:th.bgCard,border:`1px solid ${th.border}`,padding:"12px"}}>
          <div style={{fontSize:9,color:th.dim,letterSpacing:1,marginBottom:12,lineHeight:1.6}}>Set a promo on any strain. Promo overrides bulk discount for that strain only.</div>
          <div style={{display:"flex",flexDirection:"column",gap:2,maxHeight:600,overflowY:"auto"}}>
            {strains.map(s=>{
              const sth=getTheme(s.type);
              const promo=s.promo||{active:false,label:"",discount:0};
              const isSat=s.sativaRatio>=70;
              const isInd=s.sativaRatio<=30;
              return(
                <div key={s.id} style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${promo.active?"rgba(255,200,0,0.3)":th.border}`,padding:"12px",borderLeft:`3px solid ${promo.active?"#ffc800":isSat?"#00aaff":isInd?"#cc0022":sth.a1}`}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:promo.active?10:0}}>
                    <div>
                      <div style={{fontSize:11,fontWeight:700,color:th.text,textTransform:"uppercase"}}>{s.name}</div>
                      <div style={{fontSize:8,color:sth.a1,letterSpacing:1,textTransform:"uppercase"}}>{s.tier} · {s.gmcCost} GMC/g</div>
                    </div>
                    <button onClick={()=>setStrainPromo(s.id,{...promo,active:!promo.active})}
                      style={{padding:"5px 12px",background:promo.active?"rgba(255,200,0,0.2)":"rgba(255,255,255,0.04)",border:`1px solid ${promo.active?"rgba(255,200,0,0.5)":th.border}`,color:promo.active?"#ffc800":th.dim,cursor:"pointer",fontSize:9,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",transition:"all 0.15s",boxShadow:promo.active?"0 0 8px rgba(255,200,0,0.3)":"none"}}>
                      {promo.active?"⚡ ON":"OFF"}
                    </button>
                  </div>
                  {promo.active&&(
                    <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:6}}>
                      <input placeholder='Label e.g. "WEEK SPECIAL"' value={promo.label||""} onChange={e=>setStrainPromo(s.id,{...promo,label:e.target.value})}
                        style={{...inputS,fontSize:11}}
                        onFocus={e=>e.target.style.borderColor="#ffc800"} onBlur={e=>e.target.style.borderColor=th.border}/>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <input type="number" placeholder="%" value={promo.discount||""} onChange={e=>setStrainPromo(s.id,{...promo,discount:Math.min(100,Number(e.target.value)||0)})}
                          style={{...inputS,width:52,textAlign:"center",color:"#ffc800",padding:"8px 6px"}} min={0} max={100}
                          onFocus={e=>e.target.style.borderColor="#ffc800"} onBlur={e=>e.target.style.borderColor=th.border}/>
                        <span style={{fontSize:9,color:th.dim,flexShrink:0}}>%</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}

// ── CART PANEL ──
function CartPanel({cart,strains,user,onClose,onUpdateQty,onRemove,onSpendGMC,onPurchaseGMC,calcCartItem,cartTotal,onShelf}){
  const th=T.base;
  const totalGMC=cartTotal();
  const canSpend=user&&(user.gmcBalance||0)>=totalGMC&&cart.length>0;
  const totalSaving=cart.reduce((sum,item)=>{
    const s=strains.find(x=>x.id===item.strainId);
    if(!s) return sum;
    return sum+calcCartItem(s,item.qty).saving;
  },0);

  return(
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:149,backdropFilter:"blur(2px)"}}/>

      {/* Panel slides in from right */}
      <div style={{
        position:"fixed",top:62,right:0,bottom:0,
        width:"min(420px,100vw)",
        background:th.bgDeep,
        borderLeft:`1px solid ${th.border}`,
        boxShadow:`-8px 0 40px rgba(0,0,0,0.6)`,
        zIndex:150,display:"flex",flexDirection:"column",
        animation:"slideInRight 0.25s ease-out"
      }}>
        <style>{`@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>

        {/* Header */}
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${th.border}`,background:th.bgCard,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
          <div>
            <div style={{fontSize:13,fontWeight:900,color:th.text,textTransform:"uppercase",letterSpacing:1}}>Inventory</div>
            <div style={{fontSize:9,color:th.dim,letterSpacing:2,textTransform:"uppercase",marginTop:2}}>
              {cart.length===0?"Empty":cart.reduce((s,i)=>s+i.qty,0)+" items · "+totalGMC.toLocaleString()+" GMC"}
            </div>
          </div>
          <button onClick={onClose} style={{width:28,height:28,borderRadius:"50%",background:"rgba(255,255,255,0.06)",border:`1px solid ${th.border}`,color:th.dim,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif"}}>✕</button>
        </div>

        {/* Items */}
        <div style={{flex:1,overflowY:"auto",padding:"12px"}}>
          {cart.length===0?(
            <div style={{textAlign:"center",padding:"60px 20px",color:th.dim}}>
              <div style={{fontSize:40,marginBottom:12,opacity:0.3}}>◈</div>
              <div style={{fontSize:11,letterSpacing:2,textTransform:"uppercase"}}>Your inventory is empty</div>
              <div style={{fontSize:10,marginTop:8,opacity:0.6}}>Add strains from The Vault</div>
            </div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:2}}>
              {cart.map(item=>{
                const s=strains.find(x=>x.id===item.strainId);
                if(!s) return null;
                const{base,saving,total,disc}=calcCartItem(s,item.qty);
                const sth=getTheme(s.type);
                const isSat=s.sativaRatio>=70;
                const isInd=s.sativaRatio<=30;
                return(
                  <div key={item.strainId} style={{background:th.bgCard,border:`1px solid ${th.border}`,padding:"14px",position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",left:0,top:0,bottom:0,width:2,background:isSat?"#00aaff":isInd?"#cc0022":"linear-gradient(180deg,#00aaff,#cc0022)"}}/>
                    <div style={{display:"flex",gap:10,alignItems:"flex-start",paddingLeft:8}}>
                      {/* Media thumb */}
                      <div style={{width:48,height:48,flexShrink:0,overflow:"hidden",background:th.bgDeep,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {s.media?(
                          <img src={s.media} alt={s.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                        ):(
                          <BudPlaceholder color1={isSat?"#00aaff":isInd?"#cc0022":sth.a1} color2={isSat?"#00ddff":isInd?"#5500aa":"#cc0022"} size={44}/>
                        )}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,fontWeight:900,color:th.text,textTransform:"uppercase",letterSpacing:"-0.01em",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</div>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
                          <span style={{fontSize:8,color:sth.a1,letterSpacing:1,textTransform:"uppercase"}}>{getLabel(s.sativaRatio)}</span>
                          {disc>0&&(
                            <span style={{fontSize:8,color:"#00ff88",letterSpacing:1,background:"rgba(0,255,136,0.12)",padding:"1px 5px",border:"1px solid rgba(0,255,136,0.3)"}}>
                              -{disc}% {s.promo?.active?"PROMO":"BULK"}
                            </span>
                          )}
                        </div>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                          {/* Qty controls */}
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <button onClick={()=>onUpdateQty(item.strainId,item.qty-1)} style={{width:22,height:22,background:"transparent",border:`1px solid ${th.border}`,color:th.dim,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif"}}>−</button>
                            <span style={{fontSize:12,fontWeight:700,color:th.text,minWidth:20,textAlign:"center"}}>{item.qty} bits</span>
                            <button onClick={()=>onUpdateQty(item.strainId,Math.min(s.stock,item.qty+1))} style={{width:22,height:22,background:"transparent",border:`1px solid ${th.border}`,color:th.dim,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif"}}>+</button>
                          </div>
                          {/* Price */}
                          <div style={{textAlign:"right"}}>
                            {saving>0&&<div style={{fontSize:9,color:th.dim,textDecoration:"line-through"}}>{base.toLocaleString()}</div>}
                            <div style={{fontSize:13,fontWeight:900,color:"#e8a020"}}>{total.toLocaleString()} GMC</div>
                          </div>
                        </div>
                      </div>
                      <button onClick={()=>onRemove(item.strainId)} style={{background:"transparent",border:"none",color:th.dim,cursor:"pointer",fontSize:12,padding:2,flexShrink:0,marginTop:2,fontFamily:"'Inter',sans-serif"}}>✕</button>
                    </div>
                  </div>
                );
              })}
              {/* Add More Batches — subtle link at bottom of items */}
              {onShelf&&(
                <button onClick={onShelf}
                  style={{width:"100%",marginTop:6,padding:"10px",background:"transparent",border:`1px dashed ${th.border}`,color:th.dim,cursor:"pointer",fontSize:9,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=th.a1;e.currentTarget.style.color=th.a1;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=th.border;e.currentTarget.style.color=th.dim;}}>
                  <span style={{fontSize:11}}>◈</span>
                  Add More Batches
                </button>
              )}
            </div>
          )}
        </div>

        {/* Summary + Checkout */}
        {cart.length>0&&(
          <div style={{padding:"16px",borderTop:`1px solid ${th.border}`,background:th.bgCard,flexShrink:0}}>
            {/* Savings line */}
            {totalSaving>0&&(
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,padding:"8px 12px",background:"rgba(0,255,136,0.06)",border:"1px solid rgba(0,255,136,0.2)"}}>
                <span style={{fontSize:10,color:"#00ff88",letterSpacing:1,textTransform:"uppercase"}}>💚 You save</span>
                <span style={{fontSize:11,fontWeight:700,color:"#00ff88"}}>{totalSaving.toLocaleString()} GMC</span>
              </div>
            )}
            {/* Total */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <span style={{fontSize:11,color:th.dim,letterSpacing:2,textTransform:"uppercase"}}>Total</span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <GMCCoin size={18} theme={{amber:"#e8a020"}}/>
                <span style={{fontSize:22,fontWeight:900,color:"#e8a020",fontFamily:"'Inter',sans-serif"}}>{totalGMC.toLocaleString()}</span>
              </div>
            </div>
            {/* Balance check */}
            {user&&(
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:14,fontSize:10,color:th.dim}}>
                <span style={{letterSpacing:1,textTransform:"uppercase"}}>Your balance</span>
                <span style={{color:canSpend?th.a1:"#e85020",fontWeight:700}}>{(user.gmcBalance||0).toLocaleString()} GMC {!canSpend&&user?"(insufficient)":""}</span>
              </div>
            )}
            {/* Two checkout buttons */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <button onClick={onSpendGMC} disabled={!canSpend}
                style={{padding:"13px 8px",background:canSpend?`${th.a1}18`:"rgba(255,255,255,0.04)",border:`1px solid ${canSpend?th.a1:th.border}`,color:canSpend?th.a1:th.dim,cursor:canSpend?"pointer":"not-allowed",fontSize:9,fontWeight:700,letterSpacing:1,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",transition:"all 0.2s",boxShadow:canSpend?`0 0 12px ${th.a1}20`:"none"}}>
                <div style={{fontSize:14,marginBottom:3}}>💎</div>
                Spend GMC
                {user&&<div style={{fontSize:8,opacity:0.7,marginTop:2}}>{(user.gmcBalance||0).toLocaleString()} available</div>}
              </button>
              <button onClick={onPurchaseGMC}
                style={{padding:"13px 8px",background:"rgba(37,211,102,0.12)",border:"1px solid rgba(37,211,102,0.4)",color:"#25d366",cursor:"pointer",fontSize:9,fontWeight:700,letterSpacing:1,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",transition:"all 0.2s"}}>
                <div style={{fontSize:14,marginBottom:3}}>💚</div>
                Buy GMC
                <div style={{fontSize:8,opacity:0.7,marginTop:2}}>via WhatsApp</div>
              </button>
            </div>
            {!user&&(
              <div style={{fontSize:10,color:th.dim,textAlign:"center",marginTop:10,letterSpacing:1}}>Login to spend GMC · or buy via WhatsApp</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── STRAIN QUICK-ADD BOTTOM SHEET ──
function StrainQuickAdd({strain,onClose,onConfirm,calcDiscount,calcCartItem,discountSettings,existingQty}){
  const th=T.base;
  const PRESETS=[5,10,20,50,100];
  const [qty,setQty]=useState(existingQty||1);
  const [adding,setAdding]=useState(false);
  const [done,setDone]=useState(false);
  const inputRef=useRef(null);

  const isSat=strain.sativaRatio>=70;
  const isInd=strain.sativaRatio<=30;
  const isHyb=!isSat&&!isInd;
  const sth=getTheme(strain.type);
  const glowColor=isSat?"#00aaff":isInd?"#cc0022":sth.a1;

  const disc=calcDiscount(strain,qty);
  const{base,saving,total}=calcCartItem(strain,qty);

  // next discount tier nudge
  const sortedTiers=discountSettings?.enabled&&discountSettings.applyTo[strain.tier]
    ?[...(discountSettings.tiers||[])].sort((a,b)=>a.minGrams-b.minGrams)
    :[];
  const currentTier=sortedTiers.filter(t=>qty>=t.minGrams).sort((a,b)=>b.minGrams-a.minGrams)[0];
  const nextTier=sortedTiers.find(t=>t.minGrams>qty);
  const gramsToNext=nextTier?nextTier.minGrams-qty:null;

  function confirm(){
    if(adding||done) return;
    setAdding(true);
    setTimeout(()=>{
      setDone(true);
      onConfirm(strain.id, qty);
      setTimeout(()=>{ onClose(); },900);
    },700);
  }

  // close on backdrop tap
  return(
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position:"fixed",inset:0,zIndex:299,
        background:"rgba(0,0,0,0.7)",
        backdropFilter:"blur(3px)",
        animation:"fadeIn 0.2s ease-out"
      }}/>

      {/* Sheet */}
      <div style={{
        position:"fixed",bottom:0,left:0,right:0,
        zIndex:300,
        background:th.bgDeep,
        borderTop:`1px solid ${glowColor}40`,
        borderRadius:"16px 16px 0 0",
        boxShadow:`0 -8px 60px rgba(0,0,0,0.8), 0 -2px 0 ${glowColor}30`,
        animation:"sheetUp 0.32s cubic-bezier(0.32,0.72,0,1)",
        maxHeight:"92vh",
        overflowY:"auto",
        paddingBottom:"env(safe-area-inset-bottom,16px)"
      }}>
        <style>{`
          @keyframes sheetUp{from{transform:translateY(100%);opacity:0.6}to{transform:translateY(0);opacity:1}}
          @keyframes fadeIn{from{opacity:0}to{opacity:1}}
          @keyframes sweep{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
          @keyframes popIn{0%{transform:scale(0.9);opacity:0}100%{transform:scale(1);opacity:1}}
        `}</style>

        {/* Drag handle */}
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 4px"}}>
          <div style={{width:40,height:4,borderRadius:2,background:"rgba(255,255,255,0.15)"}}/>
        </div>

        {/* Close button */}
        <button onClick={onClose} style={{
          position:"absolute",top:14,right:16,
          width:32,height:32,borderRadius:"50%",
          background:"rgba(255,255,255,0.08)",
          border:`1px solid ${th.border}`,
          color:th.dim,cursor:"pointer",fontSize:14,
          display:"flex",alignItems:"center",justifyContent:"center",
          fontFamily:"'Inter',sans-serif",zIndex:1
        }}>✕</button>

        {/* ── PRODUCT INFO ROW ── */}
        <div style={{display:"grid",gridTemplateColumns:"140px 1fr",gap:16,padding:"8px 20px 20px",alignItems:"start"}}>
          {/* Media */}
          <div style={{
            width:140,height:140,flexShrink:0,overflow:"hidden",
            background:th.bgCard,border:`1px solid ${glowColor}25`,
            display:"flex",alignItems:"center",justifyContent:"center",position:"relative"
          }}>
            {strain.media?(
              <img src={strain.media} alt={strain.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            ):(
              <BudPlaceholder color1={glowColor} color2={isSat?"#00ddff":isInd?"#5500aa":"#cc0022"} size={130}/>
            )}
            <div style={{position:"absolute",inset:0,boxShadow:`inset 0 0 20px ${glowColor}15`}}/>
          </div>

          {/* Info */}
          <div style={{paddingTop:4}}>
            {/* Type + promo badges */}
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
              <div style={{
                display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",
                background:isSat?"linear-gradient(90deg,#00aaff20,#00ddff10)":isInd?"linear-gradient(90deg,#cc002220,#5500aa10)":"linear-gradient(90deg,#00aaff15,#cc002215)",
                border:`1px solid ${glowColor}50`
              }}>
                <span style={{fontSize:8}}>{isSat?"⚡":isInd?"🌑":"🌀"}</span>
                <span style={{fontSize:8,letterSpacing:2,color:glowColor,fontWeight:700,textTransform:"uppercase"}}>{getLabel(strain.sativaRatio)}</span>
              </div>
              {strain.promo?.active&&strain.promo.label&&(
                <div style={{
                  display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",
                  background:"linear-gradient(90deg,rgba(255,200,0,0.18),rgba(255,160,0,0.08),rgba(255,200,0,0.18))",
                  border:"1px solid rgba(255,200,0,0.5)",
                  backgroundSize:"200% 100%",animation:"promoShimmer 2s linear infinite"
                }}>
                  <span style={{fontSize:8,color:"#ffc800",fontWeight:900,letterSpacing:2,textTransform:"uppercase",textShadow:"0 0 6px rgba(255,200,0,0.6)"}}>⚡ {strain.promo.label}</span>
                </div>
              )}
            </div>

            <div style={{
              fontFamily:"'Inter',sans-serif",
              fontSize:"clamp(18px,5vw,26px)",
              fontWeight:900,color:th.text,
              textTransform:"uppercase",letterSpacing:"-0.02em",
              lineHeight:0.95,marginBottom:12
            }}>
              {isSat?<GlitchText text={strain.name} active={true}/>:strain.name}
            </div>

            {/* Stats row */}
            <div style={{display:"flex",gap:12,marginBottom:10}}>
              {[["Impact",strain.thc+"%",isSat?"#00aaff":isInd?"#CC0022":"#FF1493"],["Base",strain.gmcCost+" GMC",th.amber]].map(([k,v,c])=>(
                <div key={k}>
                  <div style={{fontSize:7,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginBottom:2}}>{k}</div>
                  <div style={{fontSize:14,fontWeight:900,color:c,fontFamily:"'Inter',sans-serif"}}>{v}</div>
                </div>
              ))}
            </div>

            {/* Effects */}
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {strain.effects.slice(0,4).map(e=>(
                <span key={e} style={{fontSize:7,letterSpacing:1,color:th.dim,textTransform:"uppercase",border:`1px solid ${th.border}`,padding:"2px 6px"}}>{e}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ── AMOUNT SELECTOR ── */}
        <div style={{padding:"0 20px 20px"}}>
          <div style={{fontSize:9,letterSpacing:3,color:th.dim,textTransform:"uppercase",marginBottom:12}}>Select Amount</div>

          {/* Preset chips */}
          <div style={{display:"flex",gap:6,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
            {PRESETS.map(p=>{
              const pDisc=calcDiscount(strain,p);
              const isActive=qty===p;
              return(
                <button key={p} onClick={()=>setQty(p)} style={{
                  flexShrink:0,
                  padding:"10px 14px",
                  background:isActive?`${glowColor}20`:"rgba(255,255,255,0.04)",
                  border:`1px solid ${isActive?glowColor:th.border}`,
                  color:isActive?glowColor:th.dim,
                  cursor:"pointer",fontFamily:"'Inter',sans-serif",
                  transition:"all 0.15s",
                  boxShadow:isActive?`0 0 12px ${glowColor}30`:"none",
                  position:"relative",
                  minWidth:52,textAlign:"center"
                }}>
                  <div style={{fontSize:13,fontWeight:700,letterSpacing:0}}>{p}g</div>
                  {pDisc>0&&(
                    <div style={{fontSize:7,color:isActive?"#00ff88":th.dim,letterSpacing:1,marginTop:2}}>-{pDisc}%</div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom qty row */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
            <button onClick={()=>setQty(q=>Math.max(1,q-1))} style={{
              width:40,height:40,flexShrink:0,
              background:"rgba(255,255,255,0.05)",
              border:`1px solid ${th.border}`,
              color:th.text,cursor:"pointer",fontSize:20,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontFamily:"'Inter',sans-serif",borderRadius:0,
              transition:"all 0.15s"
            }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=glowColor;e.currentTarget.style.color=glowColor;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=th.border;e.currentTarget.style.color=th.text;}}>
              −
            </button>

            <div style={{flex:1,position:"relative"}}>
              <input
                ref={inputRef}
                type="number"
                value={qty}
                onChange={e=>{
                  const v=parseInt(e.target.value)||1;
                  setQty(Math.min(strain.stock,Math.max(1,v)));
                }}
                style={{
                  width:"100%",boxSizing:"border-box",
                  background:"rgba(255,255,255,0.05)",
                  border:`1px solid ${glowColor}60`,
                  color:th.text,padding:"10px 40px 10px 16px",
                  fontSize:22,fontWeight:900,outline:"none",
                  fontFamily:"'Inter',sans-serif",textAlign:"center",
                  letterSpacing:1
                }}
                onFocus={e=>e.target.style.borderColor=glowColor}
                onBlur={e=>e.target.style.borderColor=`${glowColor}60`}
                min={1} max={strain.stock}
              />
              <span style={{
                position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",
                fontSize:13,color:th.dim,fontWeight:700,letterSpacing:1,
                fontFamily:"'Inter',sans-serif"
              }}>g</span>
            </div>

            <button onClick={()=>setQty(q=>Math.min(strain.stock,q+1))} style={{
              width:40,height:40,flexShrink:0,
              background:"rgba(255,255,255,0.05)",
              border:`1px solid ${th.border}`,
              color:th.text,cursor:"pointer",fontSize:20,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontFamily:"'Inter',sans-serif",borderRadius:0,
              transition:"all 0.15s"
            }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=glowColor;e.currentTarget.style.color=glowColor;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=th.border;e.currentTarget.style.color=th.text;}}>
              +
            </button>

            <div style={{flexShrink:0,fontSize:10,color:th.dim,letterSpacing:1,textTransform:"uppercase",minWidth:40,textAlign:"right"}}>
              {strain.stock} bits<br/>
              <span style={{fontSize:7}}>in stock</span>
            </div>
          </div>

          {/* ── PRICING BREAKDOWN ── */}
          <div style={{
            background:th.bgCard,
            border:`1px solid ${th.border}`,
            padding:"16px",marginBottom:14,
            position:"relative",overflow:"hidden"
          }}>
            {/* Base */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontSize:11,color:th.dim,letterSpacing:1,textTransform:"uppercase"}}>
                {qty} bits × {strain.gmcCost} GMC/bit
              </span>
              <span style={{fontSize:13,color:th.dim,fontWeight:700,fontFamily:"'Inter',sans-serif",
                textDecoration:disc>0?"line-through":"none"}}>
                {base.toLocaleString()} GMC
              </span>
            </div>

            {/* Discount row — shows what kind */}
            {disc>0&&(
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,padding:"8px 10px",
                background:strain.promo?.active?"rgba(255,200,0,0.08)":"rgba(0,255,136,0.06)",
                border:`1px solid ${strain.promo?.active?"rgba(255,200,0,0.3)":"rgba(0,255,136,0.2)"}`
              }}>
                <span style={{fontSize:10,color:strain.promo?.active?"#ffc800":"#00ff88",letterSpacing:1,textTransform:"uppercase",fontWeight:700}}>
                  {strain.promo?.active?`⚡ ${strain.promo.label} −${disc}%`:`📦 Bulk deal −${disc}%`}
                </span>
                <span style={{fontSize:12,color:strain.promo?.active?"#ffc800":"#00ff88",fontWeight:900,fontFamily:"'Inter',sans-serif"}}>
                  −{saving.toLocaleString()} GMC
                </span>
              </div>
            )}

            {/* Next tier nudge */}
            {!strain.promo?.active&&nextTier&&gramsToNext&&(
              <div style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:9,color:th.dim,letterSpacing:1,textTransform:"uppercase"}}>
                    Add {gramsToNext}g more → unlock {nextTier.discount}% off
                  </span>
                  <span style={{fontSize:9,color:th.dim}}>{currentTier?currentTier.discount+"% now":"no discount yet"}</span>
                </div>
                {/* Progress bar to next tier */}
                <div style={{height:3,background:"rgba(255,255,255,0.06)",borderRadius:2,overflow:"hidden"}}>
                  <div style={{
                    height:"100%",
                    width:Math.min(100,((qty-(currentTier?.minGrams||0))/(nextTier.minGrams-(currentTier?.minGrams||0)))*100)+"%",
                    background:`linear-gradient(90deg,${glowColor},#00ff88)`,
                    boxShadow:`0 0 6px ${glowColor}`,
                    transition:"width 0.3s ease"
                  }}/>
                </div>
              </div>
            )}

            {/* Separator */}
            <div style={{height:1,background:`linear-gradient(90deg,transparent,${th.border},transparent)`,margin:"4px 0 10px"}}/>

            {/* Total */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:12,color:th.text,letterSpacing:2,textTransform:"uppercase",fontWeight:700}}>Total</span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <GMCCoin size={20} theme={{amber:"#e8a020"}}/>
                <span style={{
                  fontFamily:"'Inter',sans-serif",
                  fontSize:28,fontWeight:900,
                  color:"#e8a020",
                  textShadow:"0 0 20px rgba(232,160,32,0.6)",
                  animation:"popIn 0.2s ease-out"
                }}>{total.toLocaleString()}</span>
              </div>
            </div>

            {disc>0&&(
              <div style={{textAlign:"right",marginTop:4,fontSize:10,color:"#00ff88",letterSpacing:1}}>
                💚 You save {saving.toLocaleString()} GMC
              </div>
            )}
          </div>

          {/* ── ADD BUTTON ── */}
          <button
            onClick={confirm}
            disabled={adding||done||qty<1||qty>strain.stock}
            style={{
              width:"100%",padding:"16px",
              background:done
                ?`linear-gradient(90deg,#00ff88,#00cc66)`
                :adding
                  ?`linear-gradient(90deg,${glowColor},${glowColor}88,${glowColor})`
                  :`linear-gradient(135deg,${glowColor}20,${glowColor}10)`,
              border:`1px solid ${done?"#00ff88":adding?glowColor:glowColor+"60"}`,
              color:done?"#002200":adding?"#fff":glowColor,
              cursor:adding||done?"default":"pointer",
              fontSize:12,fontWeight:900,letterSpacing:3,textTransform:"uppercase",
              fontFamily:"'Inter',sans-serif",
              position:"relative",overflow:"hidden",
              transition:"all 0.3s",
              boxShadow:done?`0 0 30px #00ff8840`:adding?`0 0 20px ${glowColor}40`:`0 0 10px ${glowColor}20`
            }}>
            {/* sweep animation while adding */}
            {adding&&!done&&(
              <div style={{
                position:"absolute",inset:0,
                background:`linear-gradient(90deg,transparent,${glowColor}40,transparent)`,
                animation:"sweep 0.7s ease-in-out",
                pointerEvents:"none"
              }}/>
            )}
            <span style={{position:"relative",zIndex:1}}>
              {done?"✓ Added to Inventory":adding?"Adding...":qty>strain.stock?"Out of Stock":`Add ${qty} bits to Inventory`}
            </span>
          </button>

          {qty>strain.stock&&(
            <div style={{textAlign:"center",marginTop:8,fontSize:10,color:"#e85020",letterSpacing:1}}>
              Only {strain.stock} bits available
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── AI HELPERS ──
async function callClaude(messages, system){
  try{
    const res=await fetch("https://api.anthropic.com/v1/messages",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "anthropic-dangerous-direct-browser-access":"true"
      },
      body:JSON.stringify({
        model:"claude-sonnet-4-20250514",
        max_tokens:1000,
        system,
        messages
      })
    });
    if(!res.ok){const err=await res.text();console.error("API error:",res.status,err);return "Sorry, something went wrong. Please try again.";}
    const data=await res.json();
    return data?.content?.[0]?.text||"Sorry, something went wrong. Please try again.";
  }catch(e){
    console.error("callClaude error:",e);
    return "Connection error. Please try again.";
  }
}

// ── WIZARD — Customer facing chat ──
function BudAdvisor({strains,onViewStrain,openWA}){
  const th=T.base;
  const [open,setOpen]=useState(false);
  const [minimized,setMinimized]=useState(false);
  const [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [pulse,setPulse]=useState(true);
  const bottomRef=useRef(null);
  const inputRef=useRef(null);

  function close(){ setOpen(false); setMinimized(false); }
  function minimize(){ setMinimized(true); }
  function restore(){ setMinimized(false); setTimeout(()=>inputRef.current?.focus(),150); }

  // pulse animation to draw attention
  useEffect(()=>{
    const t=setTimeout(()=>setPulse(false),4000);
    return()=>clearTimeout(t);
  },[]);

  useEffect(()=>{
    if(open&&msgs.length===0){
      setMsgs([{role:"assistant",content:"Welcome to the Vault. ✦ I'm your Wizard. Clear your mind — tell me your vibe, your night, your intention. I'll guide you to the upgrade that finds you."}]);
    }
  },[open]);

  useEffect(()=>{
    bottomRef.current?.scrollIntoView({behavior:"smooth"});
  },[msgs,loading]);

  function buildSystem(){
    const shelfList=strains.map(s=>`• ${s.name} (${getLabel(s.sativaRatio)}) — Impact:${s.thc}% — Upgrades: ${s.effects.join(", ")} — ${s.gmcCost} GMC/bit — ${s.stock} bits in stock — "${s.desc}"`).join("\n");
    return `You are the Wizard for Glasscorp Arena — an exclusive cyberpunk cannabis collective in Glasscorp City (Pattaya), Thailand. You are mystical, sharp, and deeply knowledgeable — like a trusted wizard inside the vault who knows every batch and every upgrade by heart.

VAULT INVENTORY (live):
${shelfList}

GLASSCORP LANGUAGE — always use these words:
- Strain types: Spark (energizing), Deep (relaxing), Flux (balanced)
- THC = Impact (potency level)
- Effects = Upgrades (what the batch unlocks for the user)
- Grams = Bits
- Drops/strains = Batches
- The shop = The Vault
- Delivery = Portal delivery

HOW GLASSCORP WORKS:
- Members load GMC (Glasscorp Member Credit) via WhatsApp or LINE
- 1 THB = 1 GMC · Minimum load: 1,000 GMC
- Members use GMC to claim batches from The Vault
- 1-2 hour portal delivery across Glasscorp City
- Contact: WhatsApp or LINE @glasscorp

YOUR JOB:
- Recommend batches based on mood, vibe, activity, or desired upgrades
- Explain Spark vs Deep vs Flux — never say Sativa/Indica/Hybrid
- Explain Impact levels — never say THC
- Help new members understand the GMC system
- Always mention specific batch names from The Vault
- If bits = 0, don't recommend that batch
- If someone is ready to order, tell them to tap the WhatsApp button
- When recommending batches: write MAX 1 short sentence intro, then list ONLY the batch names. The UI will show cards automatically. Example: "Two batches for that vibe:" then list names. Do NOT describe each batch in detail — the cards show everything.
- For non-recommendation responses: keep it 2-3 sentences max
- Auto-detect language: respond in Thai if user writes Thai, English if English
- Be cool, sharp, and game-world confident — you are part of the vault
- Never say dispensary, store, shop, or weed — say vault, batch, collection`;
  }

  async function send(){
    const text=input.trim();
    if(!text||loading) return;
    setInput("");
    const newMsgs=[...msgs,{role:"user",content:text}];
    setMsgs(newMsgs);
    setLoading(true);
    const reply=await callClaude(
      newMsgs.map(m=>({role:m.role,content:m.content})),
      buildSystem()
    );
    setMsgs(m=>[...m,{role:"assistant",content:reply}]);
    setLoading(false);
    setTimeout(()=>inputRef.current?.focus(),100);
  }

  // parse reply — extract mentioned strains, clean markdown, highlight names
  function parseReply(text){
    const mentioned=strains.filter(s=>s.stock>0&&text.toLowerCase().includes(s.name.toLowerCase()));
    // strip markdown bold
    let clean=text.replace(/\*\*([^*]+)\*\*/g,"$1");
    // build highlighted segments — find ALL strain names in order of appearance
    const allMentioned=strains.filter(s=>clean.toLowerCase().includes(s.name.toLowerCase()));
    // find every occurrence position
    const positions=[];
    allMentioned.forEach(s=>{
      let idx=0;
      const lower=clean.toLowerCase();
      const name=s.name.toLowerCase();
      while((idx=lower.indexOf(name,idx))!==-1){
        positions.push({start:idx,end:idx+s.name.length,strain:s});
        idx+=s.name.length;
      }
    });
    // sort by start position, remove overlaps
    positions.sort((a,b)=>a.start-b.start);
    const noOverlap=positions.filter((p,i)=>i===0||p.start>=positions[i-1].end);
    // build segments from positions
    const segs=[];
    let cursor=0;
    noOverlap.forEach(p=>{
      if(p.start>cursor) segs.push({txt:clean.slice(cursor,p.start),isStrain:false});
      segs.push({txt:clean.slice(p.start,p.end),isStrain:true,strain:p.strain});
      cursor=p.end;
    });
    if(cursor<clean.length) segs.push({txt:clean.slice(cursor),isStrain:false});
    return{text:clean,mentioned,segments:segs.length>0?segs:[{txt:clean,isStrain:false}]};
  }

  // Mini batch card for chat
  function MiniBatchCard({strain,onView}){
    const isSpark=strain.type==="Sativa"||strain.type==="Sativa Hybrid";
    const isDeep=strain.type==="Indica"||strain.type==="Indica Hybrid";
    const glowColor=isSpark?"#00aaff":isDeep?"#CC0022":"#FF1493";
    const typeLabel=isSpark?"⚡ Spark":isDeep?"🌑 Deep":"🌀 Flux";
    const ts=TIER_S[strain.tier]||TIER_S["TOP"];
    return(
      <div style={{
        width:140,flexShrink:0,
        background:"rgba(0,0,0,0.4)",
        border:`1px solid ${glowColor}30`,
        overflow:"hidden",
        cursor:"pointer",
        transition:"all 0.2s",
      }}
        onClick={()=>onView(strain)}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=glowColor+"80";e.currentTarget.style.boxShadow=`0 0 12px ${glowColor}20`;}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=glowColor+"30";e.currentTarget.style.boxShadow="none";}}>
        {/* Top color bar */}
        <div style={{height:2,background:`linear-gradient(90deg,${glowColor},${glowColor}60,transparent)`}}/>
        {/* Media or Ki energy */}
        <div style={{height:70,overflow:"hidden",background:"rgba(0,0,0,0.3)",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
          {strain.media?(
            <img src={strain.media} alt={strain.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          ):(
            <KiEnergy type={strain.type} size={52}/>
          )}
          {/* tier badge */}
          <div style={{position:"absolute",top:4,right:4,fontSize:7,color:ts.color,background:"rgba(0,0,0,0.7)",padding:"1px 5px",letterSpacing:1}}>{ts.icon}</div>
        </div>
        {/* Info */}
        <div style={{padding:"8px 10px"}}>
          <div style={{fontSize:10,fontWeight:900,color:"#e8e0f0",textTransform:"uppercase",letterSpacing:"-0.01em",marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{strain.name}</div>
          <div style={{fontSize:8,color:glowColor,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{typeLabel}</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div>
              <div style={{fontSize:7,color:"rgba(255,255,255,0.35)",letterSpacing:1,textTransform:"uppercase"}}>Impact</div>
              <div style={{fontSize:13,fontWeight:900,color:glowColor,fontFamily:"'Inter',sans-serif"}}>{strain.thc}%</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:7,color:"rgba(255,255,255,0.35)",letterSpacing:1,textTransform:"uppercase"}}>GMC</div>
              <div style={{fontSize:13,fontWeight:900,color:"#e8a020",fontFamily:"'Inter',sans-serif"}}>{strain.gmcCost}</div>
            </div>
          </div>
          <div style={{fontSize:8,color:"rgba(255,255,255,0.25)",letterSpacing:1,marginBottom:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{strain.effects.slice(0,2).join(" · ")}</div>
          <button style={{width:"100%",padding:"5px",background:`${glowColor}15`,border:`1px solid ${glowColor}40`,color:glowColor,fontSize:8,letterSpacing:2,textTransform:"uppercase",cursor:"pointer",fontFamily:"'Inter',sans-serif",fontWeight:700}}>
            View Batch →
          </button>
        </div>
      </div>
    );
  }

  const QUICK_PROMPTS=["Deep vibes tonight 🌑","Spark my creativity ⚡","Flux me something balanced 🌀","I'm new to the vault 🌱","High impact batch 💥","Most claimed batch 🔥"];

  return(
    <>
      <style>{`
        @keyframes budPulse{0%,100%{box-shadow:0 0 20px ${th.a1}60,0 0 40px ${th.a1}20}50%{box-shadow:0 0 30px ${th.a1}90,0 0 60px ${th.a1}40}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideDown{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(20px)}}
        .msg-in{animation:slideUp 0.25s ease-out}
        .wc-btn:hover{background:rgba(255,255,255,0.12)!important;}
      `}</style>

      {/* Backdrop — closes chat when tapping anywhere outside */}
      {open&&!minimized&&(
        <div onClick={minimize} style={{position:"fixed",inset:0,zIndex:198,background:"transparent",cursor:"default"}}/>
      )}

      {/* Floating button — shows when closed or minimized */}
      {(!open||minimized)&&(
        <button onClick={()=>{setOpen(true);restore();}}
          title="Wizard"
          style={{
            width:44,height:44,
            background:open||minimized?"rgba(0,212,255,0.2)":"rgba(0,212,255,0.1)",
            border:`1px solid ${open||minimized?"rgba(0,212,255,0.7)":"rgba(0,212,255,0.35)"}`,
            cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
            position:"relative",
            boxShadow:open||minimized?`0 0 16px rgba(0,212,255,0.5)`:`0 0 10px rgba(0,212,255,0.2)`,
            transition:"all 0.2s",
            animation:pulse&&!open?"budPulse 2s ease-in-out infinite":undefined,
          }}
          onMouseEnter={e=>{e.currentTarget.style.background="rgba(0,212,255,0.22)";e.currentTarget.style.boxShadow="0 0 18px rgba(0,212,255,0.5)";e.currentTarget.style.borderColor="rgba(0,212,255,0.7)";}}
          onMouseLeave={e=>{if(!open&&!minimized){e.currentTarget.style.background="rgba(0,212,255,0.1)";e.currentTarget.style.boxShadow="0 0 10px rgba(0,212,255,0.2)";e.currentTarget.style.borderColor="rgba(0,212,255,0.35)";}}}>
          {/* Wand SVG icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 4V2"/>
            <path d="M15 16v-2"/>
            <path d="M8 9h2"/>
            <path d="M20 9h2"/>
            <path d="M17.8 11.8 19 13"/>
            <path d="M15 9h0"/>
            <path d="M17.8 6.2 19 5"/>
            <path d="m3 21 9-9"/>
            <path d="M12.2 6.2 11 5"/>
          </svg>
          {msgs.length===0&&(
            <div style={{position:"absolute",top:-3,right:-3,width:8,height:8,borderRadius:"50%",background:"#e8a020",boxShadow:"0 0 6px #e8a020"}}/>
          )}
          {minimized&&msgs.length>0&&(
            <div style={{position:"absolute",top:-4,right:-4,minWidth:16,height:16,borderRadius:8,background:"#e85020",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#fff",fontWeight:700,fontFamily:"'Inter',sans-serif",padding:"0 3px"}}>
              {msgs.filter(m=>m.role==="assistant").length}
            </div>
          )}
        </button>
      )}

      {/* Chat panel */}
      {open&&!minimized&&(
        <div style={{
          position:"fixed",bottom:130,right:14,
          width:"min(380px,calc(100vw - 28px))",
          height:"min(520px,calc(100vh - 200px))",
          background:th.bgDeep,
          border:`1px solid ${th.border}`,
          boxShadow:`0 0 60px rgba(0,0,0,0.8),0 0 30px ${th.a2}10`,
          display:"flex",flexDirection:"column",zIndex:199,
          animation:"slideUp 0.25s ease-out",
        }}>
          {/* Header */}
          <div style={{padding:"12px 16px",borderBottom:`1px solid ${th.border}`,background:th.bgCard,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
            <div style={{width:28,height:28,background:`${th.a1}12`,border:`1px solid ${th.a1}30`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={th.a1} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/>
                <path d="M17.8 11.8 19 13"/><path d="M15 9h0"/><path d="M17.8 6.2 19 5"/>
                <path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/>
              </svg>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,fontWeight:900,color:th.text,textTransform:"uppercase",letterSpacing:1,fontFamily:"'Inter',sans-serif"}}>Wizard</div>
              <div style={{display:"flex",alignItems:"center",gap:5,marginTop:1}}>
                <div style={{width:5,height:5,borderRadius:"50%",background:"#00ff88",boxShadow:"0 0 4px #00ff88"}}/>
                <div style={{fontSize:8,color:"#00ff88",letterSpacing:2,textTransform:"uppercase",fontFamily:"'Inter',sans-serif"}}>AI · Online</div>
              </div>
            </div>
            <div style={{display:"flex",gap:4,flexShrink:0}}>
              <button className="wc-btn" onClick={minimize} style={{width:24,height:24,background:"transparent",border:`1px solid ${th.border}`,color:th.dim,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontFamily:"'Inter',sans-serif",transition:"all 0.15s",lineHeight:1}}>─</button>
              <button className="wc-btn" onClick={close} style={{width:24,height:24,background:"rgba(232,80,32,0.08)",border:"1px solid rgba(232,80,32,0.25)",color:"#e85020",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontFamily:"'Inter',sans-serif",transition:"all 0.15s",lineHeight:1}}>✕</button>
            </div>
          </div>

          {/* Messages */}
          <div style={{flex:1,overflowY:"auto",padding:"16px",display:"flex",flexDirection:"column",gap:12}}>
            {msgs.map((m,i)=>{
              const isBot=m.role==="assistant";
              const {text,mentioned,segments}=parseReply(m.content);
              return(
                <div key={i} className="msg-in" style={{display:"flex",flexDirection:"column",alignItems:isBot?"flex-start":"flex-end",gap:6}}>
                  {isBot?(
                    <div style={{
                      maxWidth:"88%",
                      padding:"11px 15px",
                      background:"rgba(255,255,255,0.04)",
                      borderRadius:0,
                      borderLeft:`2px solid ${th.a1}50`,
                      fontSize:13,color:th.text,lineHeight:1.7,
                      fontFamily:"'Inter',sans-serif",
                    }}>
                      {segments.map((seg,si)=>seg.isStrain?(
                        <span key={si} style={{
                          color:getTheme(seg.strain.type).a1,
                          fontWeight:700,
                          background:`${getTheme(seg.strain.type).a1}15`,
                          padding:"1px 4px",
                          borderBottom:`1px solid ${getTheme(seg.strain.type).a1}50`,
                          cursor:"pointer",
                        }}
                          onClick={()=>{setOpen(false);setMinimized(false);setTimeout(()=>onViewStrain(seg.strain),50);}}
                        >{seg.txt}</span>
                      ):(
                        <span key={si}>{seg.txt}</span>
                      ))}
                    </div>
                  ):(
                    <div style={{
                      maxWidth:"80%",
                      padding:"10px 14px",
                      background:`${th.a2}14`,
                      borderRadius:0,
                      fontSize:13,color:th.text,lineHeight:1.6,
                      fontFamily:"'Inter',sans-serif",
                    }}>{text}</div>
                  )}
                  {isBot&&mentioned.length>0&&(
                    <div style={{
                      display:"flex",gap:8,
                      overflowX:"auto",
                      paddingBottom:4,
                      maxWidth:"calc(100vw - 60px)",
                      width:"100%",
                    }}>
                      {mentioned.map(s=>(
                        <MiniBatchCard key={s.id} strain={s} onView={s=>{setOpen(false);setMinimized(false);setTimeout(()=>onViewStrain(s),50);}}/>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {loading&&(
              <div style={{display:"flex",alignItems:"flex-start"}}>
                <div style={{padding:"11px 15px",background:"rgba(255,255,255,0.04)",borderLeft:`2px solid ${th.a1}50`}}>
                  <div style={{display:"flex",gap:5,alignItems:"center"}}>
                    {[0,1,2].map(i=>(
                      <div key={i} style={{width:5,height:5,borderRadius:"50%",background:th.a1,animation:`dot${i} 1.2s ease-in-out infinite`,animationDelay:`${i*0.2}s`,opacity:0.4}}/>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <style>{`@keyframes dot0{0%,80%,100%{opacity:0.2;transform:scale(0.7)}40%{opacity:1;transform:scale(1)}}@keyframes dot1{0%,80%,100%{opacity:0.2;transform:scale(0.7)}40%{opacity:1;transform:scale(1)}}@keyframes dot2{0%,80%,100%{opacity:0.2;transform:scale(0.7)}40%{opacity:1;transform:scale(1)}}`}</style>
            <div ref={bottomRef}/>
          </div>

          {/* Quick prompts — always visible */}
          <div style={{padding:"8px 12px",borderTop:`1px solid ${th.border}`,display:"flex",gap:4,overflowX:"auto",flexShrink:0}}>
            {QUICK_PROMPTS.map(p=>(
              <button key={p} onClick={()=>{if(loading)return;const txt=p.trim();if(!txt)return;const newMsgs=[...msgs,{role:"user",content:txt}];setMsgs(newMsgs);setLoading(true);setInput("");callClaude(newMsgs.map(m=>({role:m.role,content:m.content})),buildSystem()).then(reply=>{setMsgs(m=>[...m,{role:"assistant",content:reply}]);setLoading(false);}).catch(()=>{setMsgs(m=>[...m,{role:"assistant",content:"Connection error. Please try again."}]);setLoading(false);});}}
                style={{padding:"5px 10px",background:"transparent",border:`1px solid ${th.border}`,color:th.dim,cursor:"pointer",fontSize:9,letterSpacing:1,fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap",transition:"all 0.15s",flexShrink:0}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=th.a1;e.currentTarget.style.color=th.a1;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=th.border;e.currentTarget.style.color=th.dim;}}>
                {p}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{padding:"10px 12px 14px",borderTop:`1px solid ${th.border}`,display:"flex",gap:8,flexShrink:0,background:th.bgCard}}>
            <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
              placeholder="Ask me anything..."
              style={{flex:1,background:"rgba(255,255,255,0.04)",border:`1px solid ${th.border}`,color:th.text,padding:"13px 14px",fontSize:14,outline:"none",fontFamily:"'Inter',sans-serif",WebkitAppearance:"none"}}
              onFocus={e=>e.target.style.borderColor=th.a1}
              onBlur={e=>e.target.style.borderColor=th.border}/>
            <button onClick={send} disabled={!input.trim()||loading}
              style={{width:46,height:46,flexShrink:0,background:input.trim()&&!loading?`${th.a1}20`:"rgba(255,255,255,0.04)",border:`1px solid ${input.trim()&&!loading?th.a1:th.border}`,color:input.trim()&&!loading?th.a1:th.dim,cursor:input.trim()&&!loading?"pointer":"not-allowed",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.2s",boxShadow:input.trim()&&!loading?`0 0 10px ${th.a1}30`:"none"}}>
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── ADMIN AI ASSISTANT ──
function AdminAI({strains,members,transactions,theme}){
  const th=theme||T.base;
  const [msgs,setMsgs]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const bottomRef=useRef(null);
  const inputRef=useRef(null);

  useEffect(()=>{
    if(msgs.length===0){
      const totalGMC=members.reduce((a,m)=>a+(m.gmcBalance||0),0);
      const lowStock=strains.filter(s=>s.stock<=5);
      setMsgs([{role:"assistant",content:`Control Room AI online 🔐\n\nQuick snapshot:\n• ${strains.length} batches in The Vault · ${strains.reduce((a,s)=>a+s.stock,0)}g total stock\n• ${members.length} registered members · ${totalGMC.toLocaleString()} GMC in circulation\n• ${transactions.length} total transactions\n${lowStock.length>0?`⚠️ Low stock: ${lowStock.map(s=>s.name).join(", ")}`:"✓ All stock levels healthy"}\n\nWhat do you need?`}]);
    }
  },[]);

  useEffect(()=>{
    bottomRef.current?.scrollIntoView({behavior:"smooth"});
  },[msgs,loading]);

  function buildAdminSystem(){
    const now=new Date().toISOString();
    const shelfData=strains.map(s=>`${s.name}|${s.type}|THC:${s.thc}%|CBD:${s.cbd}%|${s.gmcCost}GMC/g|stock:${s.stock}g|tier:${s.tier}|effects:${s.effects.join(",")}`).join("\n");
    const memberData=members.map(m=>`${m.name}|${m.contact==="line"?`LINE:${m.lineId}`:`WA:${m.phone}`}|balance:${m.gmcBalance||0}GMC|spent:${m.totalSpent||0}GMC|rank:${getRank(m.totalSpent||0).name}|joined:${m.joinedAt?.slice(0,10)||"unknown"}`).join("\n");
    const recentTx=transactions.slice(0,30).map(tx=>{const m=members.find(x=>x.id===tx.memberId);return`${tx.at?.slice(0,16)||"—"}|${m?.name||"unknown"}|${tx.amount>0?"+":""}${tx.amount}GMC|${tx.note||"—"}`;}).join("\n");
    const totalGMC=members.reduce((a,m)=>a+(m.gmcBalance||0),0);
    const totalSpent=members.reduce((a,m)=>a+(m.totalSpent||0),0);
    const topSpenders=[...members].sort((a,b)=>(b.totalSpent||0)-(a.totalSpent||0)).slice(0,5).map(m=>`${m.name}: ${(m.totalSpent||0).toLocaleString()} GMC`).join(", ");

    return`You are the Control Room AI assistant for Glasscorp Arena — a cannabis membership club in Pattaya, Thailand. You assist the owner/admin with business operations, analysis, and content creation.

CURRENT DATE/TIME: ${now}

=== LIVE SHELF DATA ===
${shelfData||"No strains"}

=== MEMBER REGISTRY (${members.length} total) ===
${memberData||"No members yet"}
Top spenders: ${topSpenders||"none"}
Total GMC in circulation: ${totalGMC.toLocaleString()}
Total GMC spent all time: ${totalSpent.toLocaleString()}

=== RECENT TRANSACTIONS (last 30) ===
${recentTx||"No transactions"}

YOUR CAPABILITIES:
- Analyze sales patterns, stock levels, member activity
- Identify slow-moving strains, top sellers, at-risk stock
- Draft WhatsApp/LINE promotional messages for specific strains
- Suggest pricing adjustments, promotions, restock priorities
- Answer any question about the business data above
- Help write member communication, announcements, menus
- Calculate GMC stats, revenue estimates, member engagement metrics

BE: concise, data-driven, actionable. The owner is busy — give direct answers with numbers.
FORMAT: use bullet points for lists, bold key numbers with **, keep it scannable.`;
  }

  async function send(){
    const text=input.trim();
    if(!text||loading) return;
    setInput("");
    const newMsgs=[...msgs,{role:"user",content:text}];
    setMsgs(newMsgs);
    setLoading(true);
    const reply=await callClaude(
      newMsgs.map(m=>({role:m.role,content:m.content})),
      buildAdminSystem()
    );
    setMsgs(m=>[...m,{role:"assistant",content:reply}]);
    setLoading(false);
    setTimeout(()=>inputRef.current?.focus(),100);
  }

  const QUICK_ADMIN=[
    "Which strains need restocking?",
    "Who are my top 5 members?",
    "Draft a promo for our exotic drops",
    "How much GMC has been loaded this week?",
    "Which strains are slow moving?",
    "Write a WhatsApp blast for new members",
  ];

  const inputStyle={flex:1,background:"rgba(255,255,255,0.04)",border:`1px solid ${th.border}`,color:th.text,padding:"10px 13px",fontSize:12,outline:"none",fontFamily:"'Inter',sans-serif"};

  return(
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 200px)",minHeight:500,background:th.bgCard,border:`1px solid ${th.amber}40`,position:"relative",overflow:"hidden"}}>
      {/* top accent */}
      <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${th.amber},${th.a1},${th.a2})`}}/>

      {/* Header */}
      <div style={{padding:"16px 20px",borderBottom:`1px solid ${th.border}`,display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
        <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${th.amber}30,${th.a1}20)`,border:`1px solid ${th.amber}50`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🤖</div>
        <div>
          <div style={{fontSize:13,fontWeight:900,color:th.amber,textTransform:"uppercase",letterSpacing:1}}>Control Room AI</div>
          <div style={{fontSize:9,color:th.dim,letterSpacing:2,textTransform:"uppercase"}}>Claude · Full data access</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:"#00ff88",boxShadow:"0 0 6px #00ff88"}}/>
          <span style={{fontSize:9,color:th.dim,letterSpacing:1,textTransform:"uppercase"}}>Live data</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:"auto",padding:"20px",display:"flex",flexDirection:"column",gap:14}}>
        {msgs.map((m,i)=>{
          const isBot=m.role==="assistant";
          return(
            <div key={i} style={{display:"flex",flexDirection:"column",alignItems:isBot?"flex-start":"flex-end"}}>
              <div style={{
                maxWidth:"88%",padding:"12px 16px",
                background:isBot?th.bgDeep:`${th.amber}12`,
                border:`1px solid ${isBot?th.border:th.amber+"40"}`,
                fontSize:12,color:th.text,lineHeight:1.75,
                whiteSpace:"pre-wrap",wordBreak:"break-word"
              }}>
                {m.content}
              </div>
            </div>
          );
        })}
        {loading&&(
          <div style={{display:"flex"}}>
            <div style={{padding:"12px 16px",background:th.bgDeep,border:`1px solid ${th.border}`}}>
              <div style={{display:"flex",gap:5,alignItems:"center"}}>
                {[0,1,2].map(i=>(
                  <div key={i} style={{width:7,height:7,borderRadius:"50%",background:th.amber,opacity:0.5,animation:`dot${i} 1.2s ease-in-out infinite`,animationDelay:`${i*0.25}s`}}/>
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Quick prompts */}
      <div style={{padding:"8px 16px",borderTop:`1px solid ${th.border}`,display:"flex",gap:4,overflowX:"auto",flexShrink:0}}>
        {QUICK_ADMIN.map(p=>(
          <button key={p} onClick={()=>{if(loading)return;const txt=p.trim();if(!txt)return;const newMsgs=[...msgs,{role:"user",content:txt}];setMsgs(newMsgs);setLoading(true);setInput("");callClaude(newMsgs.map(m=>({role:m.role,content:m.content})),buildSystem()).then(reply=>{setMsgs(m=>[...m,{role:"assistant",content:reply}]);setLoading(false);}).catch(()=>{setMsgs(m=>[...m,{role:"assistant",content:"Connection error. Please try again."}]);setLoading(false);});}}
            style={{padding:"5px 12px",background:"transparent",border:`1px solid ${th.border}`,color:th.dim,cursor:"pointer",fontSize:9,letterSpacing:1,fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap",transition:"all 0.15s",flexShrink:0}}
            onMouseEnter={e=>{e.target.style.borderColor=th.amber;e.target.style.color=th.amber;}}
            onMouseLeave={e=>{e.target.style.borderColor=th.border;e.target.style.color=th.dim;}}>
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{padding:"12px 16px",borderTop:`1px solid ${th.border}`,display:"flex",gap:8,flexShrink:0}}>
        <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
          placeholder="Ask anything about your business..."
          style={inputStyle}
          onFocus={e=>e.target.style.borderColor=th.amber}
          onBlur={e=>e.target.style.borderColor=th.border}/>
        <button onClick={send} disabled={!input.trim()||loading}
          style={{padding:"0 18px",height:42,background:input.trim()&&!loading?`linear-gradient(135deg,${th.amber},${th.a1})`:"rgba(255,255,255,0.06)",border:"none",color:th.bgDeep,cursor:input.trim()&&!loading?"pointer":"not-allowed",fontSize:11,fontWeight:700,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",transition:"all 0.2s",opacity:input.trim()&&!loading?1:0.4}}>
          ASK
        </button>
      </div>
    </div>
  );
}

// ── CONFIRM CLAIM MODAL ──
function ConfirmModal({items,total,user,onConfirm,onCancel}){
  const th=T.base;
  const hasSaved=!!(user?.deliveryAddress||user?.mapsLink);
  const [useDefault,setUseDefault]=useState(hasSaved);
  const [address,setAddress]=useState(useDefault?user?.deliveryAddress||"":"");
  const [mapsLink,setMapsLink]=useState(useDefault?user?.mapsLink||"":"");
  const [countryCode,setCountryCode]=useState(user?.countryCode||"+66");
  const [phone,setPhone]=useState(useDefault?user?.riderPhone||"":"");



  function handleUseDefault(val){
    setUseDefault(val);
    if(val){
      setAddress(user?.deliveryAddress||"");
      setMapsLink(user?.mapsLink||"");
      setCountryCode(user?.countryCode||"+66");
      setPhone(user?.riderPhone||"");
    } else {
      setAddress(""); setMapsLink(""); setPhone("");
    }
  }

  const canConfirm=address.trim().length>0;

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <style>{`.cm-input:focus{border-color:#00d4ff!important;outline:none!important;}`}</style>
      <div style={{background:T.base.bgCard,border:`1px solid ${T.base.border}`,width:"100%",maxWidth:420,maxHeight:"90vh",overflowY:"auto",position:"relative"}}>
        {/* Top accent */}
        <div style={{height:2,background:"linear-gradient(90deg,#7b2fff,#00d4ff,#7b2fff)"}}/>

        <div style={{padding:"22px 20px"}}>
          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <div>
              <div style={{fontSize:8,letterSpacing:3,color:T.base.a1,textTransform:"uppercase",marginBottom:3}}>Order Confirmation</div>
              <div style={{fontFamily:"'Inter',sans-serif",fontSize:18,fontWeight:900,color:T.base.text,textTransform:"uppercase"}}>Confirm Claim</div>
            </div>
            <button onClick={onCancel} style={{width:28,height:28,background:"rgba(255,255,255,0.06)",border:`1px solid ${T.base.border}`,color:T.base.dim,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif"}}>✕</button>
          </div>

          {/* Order summary */}
          <div style={{background:"rgba(0,0,0,0.3)",border:`1px solid ${T.base.border}`,padding:"12px 14px",marginBottom:16}}>
            <div style={{fontSize:8,letterSpacing:2,color:T.base.dim,textTransform:"uppercase",marginBottom:8}}>Order Summary</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {items.map((item,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:11,color:T.base.text,fontWeight:700}}>{item.name}</div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{fontSize:10,color:T.base.dim}}>{item.qty} bits</span>
                    <span style={{fontSize:11,fontWeight:700,color:"#e8a020"}}>{item.total.toLocaleString()} GMC</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{borderTop:`1px solid ${T.base.border}`,marginTop:10,paddingTop:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:10,color:T.base.dim,letterSpacing:1,textTransform:"uppercase"}}>Total</span>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <GMCCoin size={16} theme={{amber:"#e8a020"}}/>
                <span style={{fontSize:18,fontWeight:900,color:"#e8a020",fontFamily:"'Inter',sans-serif"}}>{total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Address selector */}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:8,letterSpacing:2,color:T.base.dim,textTransform:"uppercase",marginBottom:8}}>📡 Delivery Portal</div>

            {/* Use saved / different — only show if has saved */}
            {hasSaved&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:12}}>
                {[
                  {val:true,label:"My Portal",icon:"📡",sub:"Use saved address"},
                  {val:false,label:"Different",icon:"📍",sub:"Enter new address"},
                ].map(opt=>(
                  <button key={String(opt.val)} onClick={()=>handleUseDefault(opt.val)}
                    style={{padding:"10px 8px",background:useDefault===opt.val?`${T.base.a1}15`:"rgba(255,255,255,0.02)",border:`1px solid ${useDefault===opt.val?T.base.a1:T.base.border}`,color:useDefault===opt.val?T.base.a1:T.base.dim,cursor:"pointer",fontFamily:"'Inter',sans-serif",transition:"all 0.15s",textAlign:"center",boxShadow:useDefault===opt.val?`0 0 8px ${T.base.a1}25`:"none"}}>
                    <div style={{fontSize:14,marginBottom:3}}>{opt.icon}</div>
                    <div style={{fontSize:9,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>{opt.label}</div>
                    <div style={{fontSize:8,opacity:0.6,marginTop:1}}>{opt.sub}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Saved address preview */}
            {useDefault&&hasSaved&&(
              <div style={{background:"rgba(0,212,255,0.04)",border:`1px solid ${T.base.a1}20`,padding:"10px 12px",marginBottom:8}}>
                {user?.deliveryAddress&&<div style={{fontSize:11,color:T.base.text,lineHeight:1.5,marginBottom:user?.mapsLink?6:0}}>{user.deliveryAddress}</div>}
                {user?.mapsLink&&(
                  <button onClick={()=>window.open(user.mapsLink,"_blank")} style={{padding:"4px 10px",background:`${T.base.a1}15`,border:`1px solid ${T.base.a1}40`,color:T.base.a1,cursor:"pointer",fontSize:9,fontFamily:"'Inter',sans-serif"}}>📍 View on Map</button>
                )}
                {user?.riderPhone&&<div style={{fontSize:10,color:T.base.dim,marginTop:6}}>📞 {user.countryCode||""} {user.riderPhone}</div>}
              </div>
            )}

            {/* New address form */}
            {!useDefault&&(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <textarea
                  className="cm-input"
                  value={address}
                  onChange={e=>setAddress(e.target.value)}
                  placeholder="Building, floor, room / street / area / landmark..."
                  rows={2}
                  style={{width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.03)",border:`1px solid ${T.base.border}`,color:T.base.text,padding:"11px 13px",fontSize:12,fontFamily:"'Inter',sans-serif",resize:"none",lineHeight:1.6}}
                />
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input
                    className="cm-input"
                    value={mapsLink}
                    onChange={e=>setMapsLink(e.target.value)}
                    placeholder="Google Maps link (optional)..."
                    style={{flex:1,background:"rgba(255,255,255,0.03)",border:`1px solid ${T.base.border}`,color:T.base.text,padding:"10px 13px",fontSize:11,fontFamily:"'Inter',sans-serif"}}
                  />
                  {mapsLink&&(
                    <button onClick={()=>window.open(mapsLink,"_blank")} style={{flexShrink:0,padding:"10px 10px",background:`${T.base.a1}15`,border:`1px solid ${T.base.a1}40`,color:T.base.a1,cursor:"pointer",fontSize:10,fontFamily:"'Inter',sans-serif"}}>📍</button>
                  )}
                </div>
                <div style={{display:"flex",gap:6}}>
                  <select value={countryCode} onChange={e=>setCountryCode(e.target.value)}
                    style={{flexShrink:0,background:"#13102a",border:`1px solid ${T.base.border}`,color:T.base.text,padding:"10px 8px",fontSize:12,fontFamily:"'Inter',sans-serif",cursor:"pointer",maxWidth:100}}>
                    {COUNTRY_CODES.map(c=><option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                  </select>
                  <input
                    className="cm-input"
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={e=>setPhone(e.target.value.replace(/[^0-9]/g,""))}
                    placeholder="Phone for courier..."
                    style={{flex:1,background:"rgba(255,255,255,0.03)",border:`1px solid ${T.base.border}`,color:T.base.text,padding:"10px 13px",fontSize:13,fontFamily:"'Inter',sans-serif"}}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm button */}
          <button
            onClick={()=>canConfirm&&onConfirm({address:useDefault?user?.deliveryAddress||"":address,mapsLink:useDefault?user?.mapsLink||"":mapsLink,phone:useDefault?`${user?.countryCode||""} ${user?.riderPhone||""}`.trim():`${countryCode} ${phone}`.trim()})}
            disabled={!canConfirm}
            style={{width:"100%",padding:"15px",background:canConfirm?`linear-gradient(90deg,${T.base.a1}20,${T.base.a2}20,${T.base.a1}20)`:"rgba(255,255,255,0.03)",border:`1px solid ${canConfirm?T.base.a1:T.base.border}`,color:canConfirm?T.base.a1:T.base.dim,cursor:canConfirm?"pointer":"not-allowed",fontSize:11,fontWeight:900,letterSpacing:3,textTransform:"uppercase",fontFamily:"'Inter',sans-serif",boxShadow:canConfirm?`0 0 20px ${T.base.a1}20`:"none",transition:"all 0.2s"}}>
            ◆ Confirm & Claim ◆
          </button>

          {!canConfirm&&(
            <div style={{fontSize:9,color:"#e85020",textAlign:"center",marginTop:8,letterSpacing:1}}>Please enter a delivery address to continue</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── TELEGRAM NOTIFICATION ──
async function sendTelegramOrder(order, staffSettings){
  const token=(staffSettings?.tgToken||"").trim();
  const chatId=(staffSettings?.tgChatId||"").trim();
  if(!token||!chatId) return;
  const timeStr=new Date(order.createdAt).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
  const dateStr=new Date(order.createdAt).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
  const itemsStr=order.items.map(i=>`  • ${i.strainName} × ${i.qty} bits — ${i.totalGMC.toLocaleString()} GMC`).join("\n");
  const msg=[
    `🔔 NEW ORDER — Glasscorp Arena`,
    ``,
    `🆔 ${order.id}`,
    `👤 ${order.memberName}`,
    `💬 ${order.memberContact||"—"}`,
    ``,
    `📦 Items:`,
    itemsStr,
    ``,
    `💎 Total: ${order.totalGMC.toLocaleString()} GMC`,
    `💳 Paid with: ${order.paidWith==="gmc"?"GMC Balance":"WhatsApp"}`,
    ``,
    `📍 ${order.deliveryAddress||"No address"}`,
    order.mapsLink?`🗺 ${order.mapsLink}`:"",
    order.riderPhone?`📞 ${(order.countryCode||"")} ${order.riderPhone}`:"",
    order.deliveryTime?`⏰ Preferred: ${order.deliveryTime}`:"",
    ``,
    `🕐 ${timeStr} · ${dateStr}`,
  ].filter(l=>l!==undefined&&!(l===""&&false)).join("\n");
  try{
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({chat_id:chatId,text:msg,parse_mode:"HTML"})
    });
  }catch(e){console.log("Telegram error:",e);}
}

// ── MEMBER REGISTRY HELPERS ──
const REGISTRY_KEY="glasscorp_members_v1";
const CONTACT_KEY="glasscorp_contact_v1";
function loadContactSettings(){try{return JSON.parse(localStorage.getItem(CONTACT_KEY)||"null")||{wa:"66812345678",lineId:"glasscorp"};}catch{return{wa:"66812345678",lineId:"glasscorp"};}}
function saveContactSettings(s){try{localStorage.setItem(CONTACT_KEY,JSON.stringify(s));}catch{}}
const FEATURED_KEY="glasscorp_featured_v1";
function loadFeatured(){try{return JSON.parse(localStorage.getItem(FEATURED_KEY)||"null")||null;}catch{return null;}}
function saveFeatured(ids){try{localStorage.setItem(FEATURED_KEY,JSON.stringify(ids));}catch{}}
const TX_KEY="glasscorp_transactions_v1";
function loadRegistry(){try{return JSON.parse(localStorage.getItem(REGISTRY_KEY)||"[]");}catch{return[];}}
function saveRegistry(r){try{localStorage.setItem(REGISTRY_KEY,JSON.stringify(r));}catch{}}
function loadTx(){try{return JSON.parse(localStorage.getItem(TX_KEY)||"[]");}catch{return[];}}
function saveTx(tx){try{localStorage.setItem(TX_KEY,JSON.stringify(tx));}catch{}}
const ORDERS_KEY="glasscorp_orders_v1";
const STAFF_KEY="glasscorp_staff_v1";
function loadOrders(){try{return JSON.parse(localStorage.getItem(ORDERS_KEY)||"[]");}catch{return[];}}
function saveOrders(o){try{localStorage.setItem(ORDERS_KEY,JSON.stringify(o));}catch{}}
function loadStaffSettings(){try{return JSON.parse(localStorage.getItem(STAFF_KEY)||"null")||{staffPin:"",tgToken:"",tgChatId:""};}catch{return{staffPin:"",tgToken:"",tgChatId:""};}}
function saveStaffSettings(s){try{localStorage.setItem(STAFF_KEY,JSON.stringify(s));}catch{}}
function genOrderId(){return"GC-"+Date.now().toString(36).toUpperCase();}

// ── MAIN APP ──
export default function App(){
  const [lang,setLang]=useState("en");
  const t=L[lang];
  const [ageOk,setAgeOk]=useState(()=>localStorage.getItem("glasscorp_age_ok")==="1");
  const [user,setUser]=useState(null);
  const [tab,setTab]=useState("home");
  const [strain,setStrain]=useState(null);
  const [claimDone,setClaimDone]=useState(false);
  const [showPin,setShowPin]=useState(false);
  const [pinInput,setPinInput]=useState("");
  const [pinError,setPinError]=useState(false);
  const [liveStrains,setLiveStrains]=useState(STRAINS);
  const [strainsLoaded,setStrainsLoaded]=useState(false);
  const [contactSettings,setContactSettings]=useState(()=>loadContactSettings());
  const [orders,setOrders]=useState(()=>loadOrders());
  const [staffSettings,setStaffSettings]=useState(()=>loadStaffSettings());
  const [staffMode,setStaffMode]=useState(false);
  const [logoTaps,setLogoTaps]=useState(0);
  const logoTapTimer=useRef(null);
  const [featuredIds,setFeaturedIds]=useState(()=>loadFeatured()||STRAINS.slice(0,3).map(s=>s.id));
  const [advisorStrain,setAdvisorStrain]=useState(null);
  const [members,setMembers]=useState(()=>loadRegistry());
  const [transactions,setTransactions]=useState(()=>loadTx());
  const [cart,setCart]=useState([]);
  const [confirmModal,setConfirmModal]=useState(null); // {type:'cart'|'claim', strain?, qty?} // [{strainId, qty}]
  const [cartOpen,setCartOpen]=useState(false);
  const [discountSettings,setDiscountSettings]=useState({
    enabled:true,
    tiers:[
      {minGrams:5,discount:10},
      {minGrams:10,discount:15},
      {minGrams:20,discount:20},
    ],
    applyTo:{"EXOTIC":true,"PREMIUM":true,"TOP":true}
  });
  const th=T.base;

  // ── SESSION + GOOGLE OAUTH TOKEN DETECTION ──
  useEffect(()=>{
    // Check for Google OAuth token in URL hash (after redirect back)
    const urlToken = sbGetTokenFromUrl();
    const sessionToken = urlToken || localStorage.getItem("glasscorp_session");
    if(sessionToken){
      sbGetSession().then(async session=>{
        if(!session) return;
        const authId = session.user?.id;
        if(!authId) return;
        const member = await sbGetMemberByAuthId(authId);
        if(member){
          setUser(member);
          setMembers(ms=>{
            const exists=ms.find(m=>m.id===member.id);
            if(exists) return ms.map(m=>m.id===member.id?member:m);
            return [...ms,member];
          });
        } else if(urlToken){
          // New Google user — need personame
          // Store google user data and force profile tab to show personame picker
          localStorage.setItem("glasscorp_google_pending", JSON.stringify(session.user));
          setTab("profile");
        }
      }).catch(()=>{});
    }
  },[]);

  // ── LOAD FROM SUPABASE ON STARTUP ──
  useEffect(()=>{
    // Load strains
    sbGet("strains","active=eq.true&order=id.asc").then(rows=>{
      if(rows&&rows.length>0){
        setLiveStrains(rows.map(dbToStrain));
        const ids=rows.slice(0,3).map(r=>r.id);
        setFeaturedIds(f=>f.length>0?f:ids);
        setStrainsLoaded(true);
      } else {
        // Seed default strains into Supabase on first run
        Promise.all(STRAINS.map(s=>sbInsert("strains",strainToDb(s)))).then(saved=>{
          const valid=saved.filter(Boolean).map(dbToStrain);
          if(valid.length>0) setLiveStrains(valid);
          setStrainsLoaded(true);
        }).catch(()=>setStrainsLoaded(true));
      }
    }).catch(()=>setStrainsLoaded(true));

    // Load members
    sbGet("members","order=joined_at.desc").then(rows=>{
      if(rows&&rows.length>0) setMembers(rows.map(dbToMember));
    }).catch(()=>{});

    // Load orders
    sbGet("orders","order=created_at.desc&limit=500").then(rows=>{
      if(rows&&rows.length>0){
        setOrders(rows.map(r=>({
          id:r.id, memberId:r.member_id, memberName:r.member_name,
          memberContact:r.member_contact, items:r.items||[],
          totalGMC:r.total_gmc, paidWith:r.paid_with,
          deliveryAddress:r.delivery_address, mapsLink:r.maps_link,
          riderPhone:r.rider_phone, countryCode:r.country_code,
          deliveryTime:r.delivery_time, status:r.status||"new",
          statusHistory:r.status_history||[], createdAt:r.created_at,
          updatedAt:r.updated_at,
        })));
      }
    }).catch(()=>{});

    // Load transactions
    sbGet("transactions","order=at.desc&limit=500").then(rows=>{
      if(rows&&rows.length>0){
        setTransactions(rows.map(r=>({id:r.id,memberId:r.member_id,note:r.note,amount:r.amount,at:r.at})));
      }
    }).catch(()=>{});
  },[]);

  // sync to localStorage as backup
  useEffect(()=>{ saveRegistry(members); },[members]);
  useEffect(()=>{ saveFeatured(featuredIds); },[featuredIds]);
  useEffect(()=>{ saveOrders(orders); },[orders]);
  useEffect(()=>{ saveTx(transactions); },[transactions]);

  // onLogin — receives a fully formed member object from auth
  function registerMember(member){
    setUser(member);
    setMembers(ms=>{
      const exists=ms.find(m=>m.id===member.id);
      if(exists) return ms.map(m=>m.id===member.id?member:m);
      return [...ms,member];
    });
    setTab("home");
    window.scrollTo(0,0);
  }

  function updateMemberBalance(memberId,gmcDelta,txNote){
    setMembers(ms=>ms.map(m=>{
      if(m.id!==memberId) return m;
      const newBal=Math.max(0,(m.gmcBalance||0)+gmcDelta);
      const newSpent=gmcDelta<0?(m.totalSpent||0)+Math.abs(gmcDelta):m.totalSpent;
      // Sync to Supabase
      sbUpdate("members",{id:memberId},{gmc_balance:newBal,total_spent:newSpent}).catch(()=>{});
      return {...m,gmcBalance:newBal,totalSpent:newSpent};
    }));
    setUser(u=>{
      if(!u||u.id!==memberId) return u;
      return {...u,gmcBalance:Math.max(0,(u.gmcBalance||0)+gmcDelta),totalSpent:gmcDelta<0?(u.totalSpent||0)+Math.abs(gmcDelta):u.totalSpent};
    });
    const tx={id:Date.now(),memberId,note:txNote,amount:gmcDelta,at:new Date().toISOString()};
    setTransactions(txs=>[tx,...txs].slice(0,500));
    // Save transaction to Supabase
    sbInsert("transactions",{id:tx.id,member_id:memberId,note:txNote,amount:gmcDelta,at:tx.at}).catch(()=>{});
  }

  // ── DISCOUNT CALC ── per strain, per qty
  function calcDiscount(strain,qty){
    if(!strain) return 0;
    // promo overrides everything for that strain
    if(strain.promo?.active&&strain.promo.discount>0) return strain.promo.discount;
    // bulk tier — check if this tier has discounts enabled
    if(!discountSettings.enabled) return 0;
    if(!discountSettings.applyTo[strain.tier]) return 0;
    const sorted=[...discountSettings.tiers].sort((a,b)=>b.minGrams-a.minGrams);
    const tier=sorted.find(t=>qty>=t.minGrams);
    return tier?tier.discount:0;
  }

  function calcCartItem(strain,qty){
    const disc=calcDiscount(strain,qty);
    const base=strain.gmcCost*qty;
    const saving=Math.round(base*disc/100);
    return{base,saving,total:base-saving,disc};
  }

  function addToCart(strainId,qty=1,absolute=false){
    setCart(c=>{
      const ex=c.find(i=>i.strainId===strainId);
      if(absolute){
        if(ex) return c.map(i=>i.strainId===strainId?{...i,qty}:i);
        return [...c,{strainId,qty}];
      }
      if(ex) return c.map(i=>i.strainId===strainId?{...i,qty:i.qty+qty}:i);
      return [...c,{strainId,qty}];
    });
  }
  function removeFromCart(strainId){ setCart(c=>c.filter(i=>i.strainId!==strainId)); }
  function updateCartQty(strainId,qty){
    if(qty<=0){removeFromCart(strainId);return;}
    setCart(c=>c.map(i=>i.strainId===strainId?{...i,qty}:i));
  }
  function clearCart(){ setCart([]); }

  function cartTotal(){
    return cart.reduce((sum,item)=>{
      const s=liveStrains.find(x=>x.id===item.strainId);
      if(!s) return sum;
      return sum+calcCartItem(s,item.qty).total;
    },0);
  }
  function cartItemCount(){ return cart.reduce((s,i)=>s+i.qty,0); }

  function handleCartSpendGMC(){
    const total=cartTotal();
    if(!user||(user.gmcBalance||0)<total) return;
    setCartOpen(false);
    setConfirmModal({type:"cart"});
  }
  function executeCartSpend(deliveryInfo){
    const items=cart.map(item=>{
      const s=liveStrains.find(x=>x.id===item.strainId);
      if(!s) return null;
      const{total}=calcCartItem(s,item.qty);
      return{strainId:s.id,strainName:s.name,qty:item.qty,totalGMC:total};
    }).filter(Boolean);
    items.forEach(item=>{
      updateMemberBalance(user.id,-item.totalGMC,`Claimed ${item.qty} bits of ${item.strainName}`);
    });
    const order={
      id:genOrderId(),
      memberId:user.id,memberName:user.name,
      memberContact:user.contact==="line"?`LINE: ${user.lineId||""}`:`WA: ${user.phone||""}`,
      items,totalGMC:cartTotal(),
      deliveryAddress:deliveryInfo?.address||"",
      mapsLink:deliveryInfo?.mapsLink||"",
      riderPhone:deliveryInfo?.phone||"",
      countryCode:user.countryCode||"+66",
      deliveryTime:user.deliveryTime||"",
      status:"new",
      statusHistory:[{status:"new",at:new Date().toISOString(),note:"Order placed"}],
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString(),
      paidWith:"gmc"
    };
    setOrders(os=>[order,...os]);
    sendTelegramOrder(order,staffSettings);
    // Save order to Supabase
    sbInsert("orders",{
      id:order.id, member_id:order.memberId, member_name:order.memberName,
      member_contact:order.memberContact, items:order.items,
      total_gmc:order.totalGMC, paid_with:order.paidWith,
      delivery_address:order.deliveryAddress, maps_link:order.mapsLink,
      rider_phone:order.riderPhone, country_code:order.countryCode,
      delivery_time:order.deliveryTime, status:order.status,
      status_history:order.statusHistory,
      created_at:order.createdAt, updated_at:order.updatedAt
    }).catch(()=>{});
    clearCart();
    setConfirmModal(null);
    setClaimDone(true);
    setTimeout(()=>setClaimDone(false),3000);
  }

  function handleCartPurchaseGMC(){
    const items=cart.map(item=>{
      const s=liveStrains.find(x=>x.id===item.strainId);
      if(!s) return "";
      const{base,saving,total,disc}=calcCartItem(s,item.qty);
      return `${s.name} x${item.qty} bits${disc>0?` (-${disc}%)`:""} = ${total.toLocaleString()} GMC`;
    }).filter(Boolean).join("%0A");
    const total=cartTotal();
    const msg=`Hi Glasscorp! 🌿 I'd like to purchase GMC and place this order:%0A%0A${items}%0A%0ATotal: ${total.toLocaleString()} GMC (= ${total.toLocaleString()} THB)%0A%0APlease help me load GMC to complete this order. Thank you!`;
    openExternal(`https://wa.me/${contactSettings.wa||"66812345678"}?text=${msg}`);
  }

  function openExternal(url){
    try{
      if(window.top&&window.top!==window.self){
        window.top.location.href=url;
        return;
      }
    }catch(_err){}
    const link=document.createElement("a");
    link.href=url;
    link.target="_blank";
    link.rel="noopener noreferrer external";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  function openWA(msg){openExternal("https://wa.me/"+(contactSettings.wa||"66812345678")+"?text="+encodeURIComponent(msg||""));}
    function openWA(msg){window.open("https://wa.me/66812345678?text="+encodeURIComponent(msg||""));}
  function handleClaim(s,qty){
    if(!user||(user.gmcBalance||0)<s.gmcCost*qty) return;
    setConfirmModal({type:"claim",strain:s,qty});
  }
  function executeDirectClaim(s,qty,deliveryInfo){
    const{total}=calcCartItem(s,qty);
    updateMemberBalance(user.id,-total,`Claimed ${qty} bits of ${s.name}`);
    const order={
      id:genOrderId(),
      memberId:user.id,memberName:user.name,
      memberContact:user.contact==="line"?`LINE: ${user.lineId||""}`:`WA: ${user.phone||""}`,
      items:[{strainId:s.id,strainName:s.name,qty,totalGMC:total}],
      totalGMC:total,
      deliveryAddress:deliveryInfo?.address||"",
      mapsLink:deliveryInfo?.mapsLink||"",
      riderPhone:deliveryInfo?.phone||"",
      countryCode:user.countryCode||"+66",
      deliveryTime:user.deliveryTime||"",
      status:"new",
      statusHistory:[{status:"new",at:new Date().toISOString(),note:"Order placed"}],
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString(),
      paidWith:"gmc"
    };
    setOrders(os=>[order,...os]);
    sendTelegramOrder(order,staffSettings);
    // Save order to Supabase
    sbInsert("orders",{
      id:order.id, member_id:order.memberId, member_name:order.memberName,
      member_contact:order.memberContact, items:order.items,
      total_gmc:order.totalGMC, paid_with:order.paidWith,
      delivery_address:order.deliveryAddress, maps_link:order.mapsLink,
      rider_phone:order.riderPhone, country_code:order.countryCode,
      delivery_time:order.deliveryTime, status:order.status,
      status_history:order.statusHistory,
      created_at:order.createdAt, updated_at:order.updatedAt
    }).catch(()=>{});
    setConfirmModal(null);
    setClaimDone(true);
    setTimeout(()=>{setClaimDone(false);setStrain(null);setTab("shelf");},3000);
  }
  function tryPin(){
    if(pinInput==="902311"){
      setShowPin(false);setPinInput("");setPinError(false);
      setStaffMode(false);setTab("admin");window.scrollTo(0,0);
    } else if(staffSettings.staffPin&&pinInput===staffSettings.staffPin){
      setShowPin(false);setPinInput("");setPinError(false);
      setStaffMode(true);setTab("admin");window.scrollTo(0,0);
    } else {
      setPinError(true);setPinInput("");
    }
  }

  function updateOrderStatus(orderId,newStatus){
    setOrders(os=>os.map(o=>{
      if(o.id!==orderId) return o;
      const history=[...(o.statusHistory||[]),{status:newStatus,at:new Date().toISOString(),note:`Status updated to ${newStatus.replace("_"," ")}`}];
      const updated={...o,status:newStatus,statusHistory:history,updatedAt:new Date().toISOString()};
      // Sync to Supabase
      sbUpdate("orders",{id:orderId},{status:newStatus,status_history:history,updated_at:updated.updatedAt}).catch(()=>{});
      return updated;
    }));
  }

  if(!ageOk) return(
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&display=swap');*{margin:0;padding:0;box-sizing:border-box;}body{background:#080612;font-family:'Inter',sans-serif;}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:0.01ms!important;animation-iteration-count:1!important;transition-duration:0.01ms!important;}}@keyframes azron-breathe{0%,100%{opacity:0.13;transform:translateY(0px)}50%{opacity:0.18;transform:translateY(-8px)}}@keyframes azron-breathe-mobile{0%,100%{opacity:0.08;transform:translateY(0px)}50%{opacity:0.12;transform:translateY(-6px)}}`}</style>
      <GlobalParticles/>
      <div style={{position:"fixed",inset:0,background:th.bgDeep,zIndex:999,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,overflow:"hidden"}}>
        {/* AZRON — age gate guardian, desktop right / mobile behind */}
        <img src={CHARS.AZRON} alt="" aria-hidden="true" style={{
          position:"absolute",
          right:"-5%",bottom:"-5%",
          height:"90vh",width:"auto",
          objectFit:"contain",objectPosition:"bottom right",
          opacity:0.15,
          animation:"azron-breathe 6s ease-in-out infinite",
          pointerEvents:"none",
          userSelect:"none",
          filter:"drop-shadow(0 0 40px rgba(255,215,0,0.15))",
        }}/>
        {/* Mobile AZRON — centered behind content */}
        <style>{`@media(max-width:640px){.azron-age{right:unset!important;left:50%!important;transform:translateX(-50%)!important;height:70vh!important;opacity:0.08!important;animation:azron-breathe-mobile 6s ease-in-out infinite!important;}}`}</style>
        <img src={CHARS.AZRON} alt="" aria-hidden="true" className="azron-age" style={{
          position:"absolute",
          right:"-5%",bottom:"-5%",
          height:"90vh",width:"auto",
          objectFit:"contain",objectPosition:"bottom right",
          opacity:0.15,
          animation:"azron-breathe 6s ease-in-out infinite",
          pointerEvents:"none",
          userSelect:"none",
          display:"none",
        }}/>
        <div style={{position:"relative",zIndex:1,textAlign:"center",maxWidth:400}}>
          <div style={{fontFamily:"'Inter',sans-serif",fontSize:"clamp(44px,10vw,72px)",fontWeight:900,color:th.a1,letterSpacing:"-0.02em",textTransform:"uppercase",textShadow:`0 0 30px ${th.a1},0 0 60px ${th.a1}40`,marginBottom:6}}>GLASSCORP</div>
          <div style={{fontSize:9,letterSpacing:5,color:th.a2,textTransform:"uppercase",marginBottom:44,textShadow:`0 0 10px ${th.a2}`}}>Member Collective</div>
          <div style={{background:"rgba(13,10,26,0.95)",border:`1px solid ${th.border}`,padding:"36px 28px",backdropFilter:"blur(20px)",boxShadow:`0 0 60px ${th.a2}12`}}>
            <div style={{fontSize:44,marginBottom:12}}>⚠️</div>
            <div style={{fontFamily:"'Inter',sans-serif",fontSize:20,fontWeight:900,color:th.text,textTransform:"uppercase",letterSpacing:2,marginBottom:10}}>Adults Only</div>
            <p style={{fontSize:13,color:th.dim,lineHeight:1.7,marginBottom:28}}>You must be <strong style={{color:th.amber}}>21 years or older</strong> to access this platform.</p>
            <GBtn onClick={()=>{setAgeOk(true);localStorage.setItem("glasscorp_age_ok","1");}} color={th.a1} style={{width:"100%"}}>✓ I am 21+ — Enter The Vault</GBtn>
            <div style={{fontSize:9,letterSpacing:2,color:th.dim,textTransform:"uppercase",marginTop:14}}>🇹🇭 Legal Platform · Members Only</div>
          </div>
        </div>
      </div>
    </>
  );

  return(
    <div style={{fontFamily:"'Inter',sans-serif",background:th.bgDeep,minHeight:"100vh"}}>
      <GlobalParticles/>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&display=swap');*{margin:0;padding:0;box-sizing:border-box;}body{background:#080612;font-family:'Inter',sans-serif;}button{font-family:'Inter',sans-serif;}`}</style>

      {/* PIN */}
      {showPin&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{background:th.bgCard,border:`1px solid ${th.border}`,padding:28,width:"100%",maxWidth:300,boxShadow:`0 0 40px ${th.a2}20`}}>
            <div style={{fontFamily:"'Inter',sans-serif",fontSize:16,fontWeight:900,color:th.amber,marginBottom:6,textAlign:"center",textTransform:"uppercase",letterSpacing:2}}>{t.adminAccess}</div>
            <p style={{fontSize:11,color:th.dim,textAlign:"center",marginBottom:18,letterSpacing:1}}>{t.enterPin}</p>
            <input type="password" inputMode="numeric" maxLength={6} value={pinInput} onChange={e=>setPinInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryPin()} placeholder="◆ ◆ ◆ ◆" style={{width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.04)",border:`1px solid ${pinError?"#cc2244":th.border}`,color:th.text,padding:"14px",fontSize:22,outline:"none",textAlign:"center",letterSpacing:12,marginBottom:8,fontFamily:"'Inter',sans-serif"}}/>
            {pinError&&<p style={{color:"#cc2244",fontSize:10,textAlign:"center",margin:"0 0 10px",letterSpacing:1}}>{t.wrongPin}</p>}
            <div style={{display:"flex",gap:8,marginTop:6}}>
              <GBtn onClick={()=>{setShowPin(false);setPinInput("");setPinError(false);}} color={th.dim} outline style={{flex:1}}>Cancel</GBtn>
              <GBtn onClick={tryPin} color={th.amber} style={{flex:2}}>Enter</GBtn>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirmModal&&user&&(
        <ConfirmModal
          items={confirmModal.type==="cart"
            ?cart.map(item=>{const s=liveStrains.find(x=>x.id===item.strainId);if(!s)return null;const{total}=calcCartItem(s,item.qty);return{name:s.name,qty:item.qty,total};}).filter(Boolean)
            :[{name:confirmModal.strain?.name,qty:confirmModal.qty,total:confirmModal.strain?calcCartItem(confirmModal.strain,confirmModal.qty).total:0}]
          }
          total={confirmModal.type==="cart"?cartTotal():confirmModal.strain?calcCartItem(confirmModal.strain,confirmModal.qty).total:0}
          user={user}
          onConfirm={(deliveryInfo)=>{
            if(confirmModal.type==="cart") executeCartSpend(deliveryInfo);
            else executeDirectClaim(confirmModal.strain,confirmModal.qty,deliveryInfo);
          }}
          onCancel={()=>setConfirmModal(null)}
        />
      )}

      {/* CLAIM SUCCESS */}
      {claimDone&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:60,marginBottom:14}}>✅</div>
            <div style={{fontFamily:"'Inter',sans-serif",fontSize:28,fontWeight:900,color:th.a1,textTransform:"uppercase",textShadow:`0 0 20px ${th.a1}`,marginBottom:8}}>{t.claimRequest}</div>
            <p style={{color:th.dim,fontSize:14}}>{t.claimDesc}</p>
          </div>
        </div>
      )}

      {/* CART PANEL */}
      {cartOpen&&(
        <CartPanel
          cart={cart}
          strains={liveStrains}
          user={user}
          onClose={()=>setCartOpen(false)}
          onUpdateQty={updateCartQty}
          onRemove={removeFromCart}
          onSpendGMC={handleCartSpendGMC}
          onPurchaseGMC={handleCartPurchaseGMC}
          calcCartItem={calcCartItem}
          cartTotal={cartTotal}
          onShelf={()=>{setCartOpen(false);setTab("shelf");window.scrollTo(0,0);}}
        />
      )}

      {/* NAV */}
      <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 5vw",height:62,background:`${th.bgDeep}f2`,backdropFilter:"blur(20px)",borderBottom:`1px solid ${th.border}`}}>
        <button onClick={()=>{
          setTab("home");setStrain(null);window.scrollTo(0,0);
          // secret 5-tap admin trigger
          setLogoTaps(n=>{
            const next=n+1;
            if(logoTapTimer.current) clearTimeout(logoTapTimer.current);
            if(next>=5){ setLogoTaps(0); setShowPin(true); return 0; }
            logoTapTimer.current=setTimeout(()=>setLogoTaps(0),2000);
            return next;
          });
        }} style={{background:"none",border:"none",cursor:"pointer",fontFamily:"'Inter',sans-serif",fontSize:18,fontWeight:900,color:th.a1,letterSpacing:"-0.01em",textTransform:"uppercase",padding:0,textShadow:`0 0 15px ${th.a1}`}}>
          Glasscorp
        </button>
        <div style={{display:"flex",alignItems:"center",gap:20}}>
          <button onClick={()=>{setTab("shelf");setStrain(null);window.scrollTo(0,0);}}
            style={{
              background:tab==="shelf"?`${th.a1}15`:"rgba(0,212,255,0.06)",
              border:`1px solid ${tab==="shelf"?th.a1:"rgba(0,212,255,0.25)"}`,
              cursor:"pointer",
              fontSize:9,letterSpacing:2,
              color:tab==="shelf"?th.a1:"rgba(0,212,255,0.7)",
              textTransform:"uppercase",
              padding:"6px 10px",
              fontFamily:"'Inter',sans-serif",
              fontWeight:700,
              boxShadow:tab==="shelf"?`0 0 14px ${th.a1}40,inset 0 0 10px ${th.a1}10`:"0 0 6px rgba(0,212,255,0.1)",
              transition:"all 0.25s",
              display:"flex",alignItems:"center",gap:5,
              height:32,
            }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=th.a1;e.currentTarget.style.color=th.a1;e.currentTarget.style.boxShadow=`0 0 16px ${th.a1}50,inset 0 0 12px ${th.a1}12`;e.currentTarget.style.background=`${th.a1}18`;}}
            onMouseLeave={e=>{if(tab!=="shelf"){e.currentTarget.style.borderColor="rgba(0,212,255,0.25)";e.currentTarget.style.color="rgba(0,212,255,0.7)";e.currentTarget.style.boxShadow="0 0 6px rgba(0,212,255,0.1)";e.currentTarget.style.background="rgba(0,212,255,0.06)";}}}>
            <span style={{fontSize:10}}>◈</span>
            {t.shelf}
          </button>
          <button onClick={()=>setLang(l=>l==="en"?"th":"en")} style={{background:"transparent",border:`1px solid ${th.border}`,cursor:"pointer",fontSize:9,letterSpacing:2,color:th.dim,textTransform:"uppercase",padding:"6px 10px",fontFamily:"'Inter',sans-serif",transition:"all 0.2s",boxShadow:`0 0 6px ${th.border}`}}>
            {lang==="en"?"🇹🇭 TH":"🇬🇧 EN"}
          </button>
          {/* INVENTORY ICON */}
          <button onClick={()=>setCartOpen(o=>!o)} style={{position:"relative",background:"transparent",border:`1px solid ${cartOpen?th.a1:th.border}`,cursor:"pointer",padding:"6px 10px",display:"flex",alignItems:"center",gap:6,transition:"all 0.2s",boxShadow:cartOpen?`0 0 10px ${th.a1}40`:`0 0 6px ${th.border}`}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cartOpen?th.a1:th.dim} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            <span style={{fontSize:9,letterSpacing:2,color:cartOpen?th.a1:th.dim,textTransform:"uppercase",fontFamily:"'Inter',sans-serif"}}>Inventory</span>
            {cartItemCount()>0&&(
              <div style={{position:"absolute",top:-6,right:-6,minWidth:18,height:18,borderRadius:9,background:th.a1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:th.bgDeep,fontWeight:900,fontFamily:"'Inter',sans-serif",padding:"0 4px",boxShadow:`0 0 8px ${th.a1}`}}>
                {cartItemCount()}
              </div>
            )}
          </button>

        </div>
      </nav>

      <div style={{paddingTop:62,paddingBottom:"calc(72px + env(safe-area-inset-bottom,0px))"}}>

        {tab==="home"&&!strain&&!advisorStrain&&<HomePage t={t} onShelf={()=>{setTab("shelf");window.scrollTo(0,0);}} onRedeem={()=>openWA("Hi Glasscorp! I would like to redeem GMC.")} strains={liveStrains} featuredIds={featuredIds} cart={cart} onAddToCart={addToCart} calcDiscount={calcDiscount} calcCartItem={calcCartItem} discountSettings={discountSettings} onView={s=>{setStrain(s);window.scrollTo(0,0);}}/>}
        {tab==="shelf"&&!strain&&!advisorStrain&&<TheShelf t={t} user={user} strains={liveStrains} cart={cart} onAddToCart={addToCart} calcDiscount={calcDiscount} calcCartItem={calcCartItem} discountSettings={discountSettings} onView={s=>{setStrain(s);window.scrollTo(0,0);}}/>}
        {(strain||advisorStrain)&&<StrainDetail strain={strain||advisorStrain} t={t} user={user} onBack={()=>{setStrain(null);setAdvisorStrain(null);setTab("shelf");window.scrollTo(0,0);}} onClaim={handleClaim} onLogin={()=>{setStrain(null);setAdvisorStrain(null);setTab("profile");window.scrollTo(0,0);}} calcDiscount={calcDiscount} calcCartItem={calcCartItem} discountSettings={discountSettings} onAddToCart={addToCart} cart={cart}/>}
        {tab==="profile"&&!strain&&!advisorStrain&&<ProfilePage t={t} user={user} onLogin={registerMember} onSkip={()=>setTab("home")} onLogout={()=>{ const tok=localStorage.getItem("glasscorp_session"); if(tok) sbSignOut(tok).catch(()=>{}); localStorage.removeItem("glasscorp_session"); localStorage.removeItem("glasscorp_google_pending"); setUser(null); setTab("home"); }} onShowPin={()=>setShowPin(true)} onShelf={()=>{setTab("shelf");window.scrollTo(0,0);}} onRedeem={()=>openWA("Hi Glasscorp! I would like to redeem GMC.")} onUpdateProfile={(updated)=>{
  setUser(updated);
  setMembers(ms=>ms.map(m=>m.id===updated.id?updated:m));
  // Sync delivery info to Supabase
  sbUpdate("members",{id:updated.id},{
    delivery_address:updated.deliveryAddress||"",
    maps_link:updated.mapsLink||"",
    rider_phone:updated.riderPhone||"",
    country_code:updated.countryCode||"+66"
  }).catch(()=>{});
}} transactions={transactions} onAddToCart={addToCart} strains={liveStrains} onOpenCart={()=>setCartOpen(true)} orders={orders}/>}
        {tab==="admin"&&!strain&&!advisorStrain&&<AdminPanel t={t} user={user} strains={liveStrains} setStrains={setLiveStrains} members={members} transactions={transactions} onUpdateBalance={updateMemberBalance} discountSettings={discountSettings} setDiscountSettings={setDiscountSettings} featuredIds={featuredIds} setFeaturedIds={setFeaturedIds} onExit={()=>setTab("home")} onAddGMC={(amt)=>{ if(user) updateMemberBalance(user.id,amt,"Manual GMC top-up"); }} contactSettings={contactSettings} onSaveContact={(s)=>{setContactSettings(s);saveContactSettings(s);}} staffSettings={staffSettings} onSaveStaff={(s)=>{setStaffSettings(s);saveStaffSettings(s);}} orders={orders} onUpdateOrderStatus={updateOrderStatus} staffMode={staffMode}/>}
      </div>

      {/* BOTTOM NAV */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:`${th.bgDeep}f8`,backdropFilter:"blur(20px)",borderTop:`1px solid ${th.border}`,display:"flex",flexDirection:"column",zIndex:100,boxShadow:`0 -4px 30px ${th.a2}08`}}>
        <div style={{display:"flex",width:"100%"}}>
          {[["home","⬡","Home"],["shelf","◈",t.shelf],["profile","◉",t.profile]].map(([k,ic,l])=>(
            <button key={k} onClick={()=>{setTab(k);setStrain(null);window.scrollTo(0,0);}} style={{flex:1,padding:"11px 4px 9px",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,position:"relative"}}>
              <span style={{fontSize:16,color:tab===k?th.a1:th.dim,textShadow:tab===k?`0 0 10px ${th.a1}`:"none",transition:"all 0.2s"}}>{ic}</span>
              <span style={{fontSize:8,fontWeight:700,color:tab===k?th.a1:th.dim,letterSpacing:1,textTransform:"uppercase",textShadow:tab===k?`0 0 8px ${th.a1}`:"none",transition:"all 0.2s"}}>{l}</span>
              {tab===k&&<div style={{position:"absolute",bottom:0,left:"20%",right:"20%",height:2,background:th.a1,boxShadow:`0 0 8px ${th.a1}`}}/>}
            </button>
          ))}
        </div>
        {/* iPhone home bar safe area */}
        <div style={{height:"env(safe-area-inset-bottom,0px)",background:"transparent"}}/>
      </div>

      {/* FLOATING CONTACT + WIZARD */}
      <div style={{position:"fixed",bottom:72,right:14,display:"flex",flexDirection:"column",gap:6,zIndex:99,alignItems:"flex-end"}}>
        <BudAdvisor strains={liveStrains} onViewStrain={s=>{setStrain(null);setAdvisorStrain(s);window.scrollTo(0,0);}} openWA={(msg)=>window.open("https://wa.me/66812345678?text="+encodeURIComponent(msg||""))}/>
        {/* LINE */}
        <button onClick={()=>openExternal("https://line.me/ti/p/~"+(contactSettings.lineId||"glasscorp"))}
          title="LINE"
          style={{width:42,height:42,background:"rgba(6,199,85,0.12)",border:"1px solid rgba(6,199,85,0.35)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,boxShadow:"0 0 10px rgba(6,199,85,0.2)",transition:"all 0.2s"}}
          onMouseEnter={e=>{e.currentTarget.style.background="rgba(6,199,85,0.25)";e.currentTarget.style.boxShadow="0 0 16px rgba(6,199,85,0.4)";}}
          onMouseLeave={e=>{e.currentTarget.style.background="rgba(6,199,85,0.12)";e.currentTarget.style.boxShadow="0 0 10px rgba(6,199,85,0.2)";}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#06c755">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
          </svg>
        </button>
        {/* WhatsApp */}
        <button onClick={()=>openWA("Hi Glasscorp! 🌿")}
          title="WhatsApp"
          style={{width:42,height:42,background:"rgba(37,211,102,0.12)",border:"1px solid rgba(37,211,102,0.35)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 10px rgba(37,211,102,0.2)",transition:"all 0.2s"}}
          onMouseEnter={e=>{e.currentTarget.style.background="rgba(37,211,102,0.25)";e.currentTarget.style.boxShadow="0 0 16px rgba(37,211,102,0.4)";}}
          onMouseLeave={e=>{e.currentTarget.style.background="rgba(37,211,102,0.12)";e.currentTarget.style.boxShadow="0 0 10px rgba(37,211,102,0.2)";}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </button>
      </div>
    </div>
  );
}
