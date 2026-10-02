/* Shared demo data + GPS simulation for KinTrack pages. */

const ZONES = [
  { id:"home",    name:"Home",               center:[43.6680,-79.3990], r:140 },
  { id:"school",  name:"Palmerston School",  center:[43.6712,-79.4120], r:170 },
  { id:"park",    name:"Christie Pits Park", center:[43.6646,-79.4205], r:180 },
  { id:"library", name:"Palmerston Library", center:[43.6620,-79.4098], r:110 },
];

// Four GPS tags, each clipped to a child's bag / jacket and left in different places.
const DEVICES = [
  { id:"TAG-01", name:"Tag 01", owner:"Emma", attached:"School backpack", color:"#2563EB", battery:82, speed:0.0016,
    route:[[43.6680,-79.3990],[43.6688,-79.4030],[43.6697,-79.4070],[43.6706,-79.4105],[43.6712,-79.4120]] },
  { id:"TAG-02", name:"Tag 02", owner:"Liam", attached:"Jacket pocket", color:"#059669", battery:41, speed:0.0022,
    route:[[43.6712,-79.4120],[43.6700,-79.4140],[43.6683,-79.4165],[43.6668,-79.4185],[43.6646,-79.4205]] },
  { id:"TAG-03", name:"Tag 03", owner:"Sofia", attached:"Lunch bag", color:"#D97706", battery:17, speed:0.0003,
    route:[[43.6619,-79.4096],[43.6622,-79.4101],[43.6618,-79.4100]] },
  { id:"TAG-04", name:"Tag 04", owner:"Noah", attached:"Bike seat", color:"#7C3AED", battery:66, speed:0.0030,
    route:[[43.6646,-79.4205],[43.6628,-79.4232],[43.6610,-79.4262],[43.6596,-79.4300],[43.6585,-79.4335]] },
];

/* ---------- helpers ---------- */
const $ = id => document.getElementById(id);
const fmtTime = d => d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", second:"2-digit" });
function haversine(a, b){
  const R=6371000, toR=x=>x*Math.PI/180;
  const dLat=toR(b[0]-a[0]), dLng=toR(b[1]-a[1]);
  const h=Math.sin(dLat/2)**2+Math.cos(toR(a[0]))*Math.cos(toR(b[0]))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
function zoneOf(pos){ return ZONES.find(z => haversine(pos, z.center) <= z.r) || null; }
function nearestZone(pos){ return ZONES.map(z=>({ z, m:haversine(pos,z.center) })).sort((a,b)=>a.m-b.m)[0]; }
function routeLen(r){ let s=0; for(let i=1;i<r.length;i++) s+=haversine(r[i-1],r[i]); return s; }
function pointAt(route, f){ // f in [0,1] along the route
  let target=f*routeLen(route);
  for(let i=1;i<route.length;i++){
    const seg=haversine(route[i-1],route[i]);
    if(target<=seg){ const t=seg?target/seg:0; return [route[i-1][0]+(route[i][0]-route[i-1][0])*t, route[i-1][1]+(route[i][1]-route[i-1][1])*t]; }
    target-=seg;
  }
  return route[route.length-1];
}
function statusOf(d){
  if(d.zone) return { label:`At ${d.zone.name}`, cls:"text-green bg-green/10" };
  if(d.speedKmh>1) return { label:"Moving", cls:"text-amber bg-amber/10" };
  return { label:"Stopped", cls:"text-muted bg-panel-2" };
}
function alertsFor(d){
  const a=[];
  if(!d.zone) a.push("Outside safe zone");
  if(d.battery<20) a.push("Low battery");
  return a;
}
function batteryIcon(b){ return b>80?"battery_full":b>50?"battery_5_bar":b>20?"battery_3_bar":"battery_1_bar"; }

/* ---------- simulation ---------- */
DEVICES.forEach((d,i) => {
  d.t = [0.05, 0.1, 0.3, 0.0][i]; d.dir = 1;
  d.pos = pointAt(d.route, d.t); d.prev = d.pos;
  d.zone = zoneOf(d.pos); d.trail = [d.pos]; d.speedKmh = 0; d.lastSeen = new Date();
});

// Advance every tag one 2-second step; calls onEvent(device, text, kind) for zone/battery changes.
function stepAll(onEvent){
  DEVICES.forEach(d => {
    d.t += d.speed * d.dir * (0.6 + Math.random()*0.8);
    if(d.t>=1){ d.t=1; d.dir=-1; } if(d.t<=0){ d.t=0; d.dir=1; }
    d.prev = d.pos;
    d.pos = pointAt(d.route, d.t);
    d.speedKmh = haversine(d.prev, d.pos) / 2 * 3.6; // metres per 2 s → km/h
    d.lastSeen = new Date();
    d.battery = Math.max(3, d.battery - 0.03);
    d.trail.push(d.pos); if(d.trail.length>120) d.trail.shift();

    const z = zoneOf(d.pos);
    if(z?.id !== d.zone?.id){
      if(d.zone) onEvent(d, `left ${d.zone.name}`, "leave");
      if(z) onEvent(d, `arrived at ${z.name}`, "enter");
      else onEvent(d, "is outside all safe zones", "warn");
      d.zone = z;
    }
    if(d.battery<20 && !d.lowBatLogged){ d.lowBatLogged = true; onEvent(d, `battery low (${Math.round(d.battery)}%)`, "warn"); }
  });
}

/* ---------- sidebar (mobile) ---------- */
function openSidebar(){ $("sidebar").classList.remove("-translate-x-full"); $("backdrop").classList.remove("hidden"); }
function closeSidebar(){ if(window.innerWidth<768){ $("sidebar").classList.add("-translate-x-full"); $("backdrop").classList.add("hidden"); } }
