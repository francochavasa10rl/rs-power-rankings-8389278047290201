// CONFIGURACIÓN DE TU FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyBNwd71SpCA4Ctflw2UcuZxfVwl3L3liZw",
  authDomain: "rs-power-rankings.firebaseapp.com",
  databaseURL: "https://rs-power-rankings-default-rtdb.firebaseio.com",
  projectId: "rs-power-rankings",
  appId: "1:985630009457:web:9b4da8d80e6e5673cc13d0"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const teamsData = [
  { id: "tsm", name:"TSM", logo:"logos/tsm.png" }, { id: "furia", name:"FURIA", logo:"logos/furia.png" },
  { id: "shopify", name:"SHOPIFY", logo:"logos/shopify.png" }, { id: "nrg", name:"NRG", logo:"logos/nrg.png" },
  { id: "vitality", name:"VITALITY", logo:"logos/vitality.png" }, { id: "kc", name:"KC", logo:"logos/kc.png" },
  { id: "falcons", name:"FALCONS", logo:"logos/falcons.png" }, { id: "ssg", name:"SSG", logo:"logos/ssg.png" },
  { id: "mates", name:"G. MATES", logo:"logos/gentlemates.png" }, { id: "pwr", name:"PWR", logo:"logos/pwr.png" },
  { id: "tm", name:"TWISTED", logo:"logos/twisted.png" }, { id: "mibr", name:"MIBR", logo:"logos/mibr.png" },
  { id: "gk", name:"GEEKAY", logo:"logos/geekay.png" }, { id: "nip", name:"NINJAS", logo:"logos/nip.png" },
  { id: "vp", name:"V.PRO", logo:"logos/vp.png" }, { id: "5f", name:"5 FEARS", logo:"logos/5f.png" }
];

const histories = { 1: [], 2: [], 3: [], 4: [] };
let isRemoteUpdate = false;

function init() {
  for (let i = 1; i <= 4; i++) {
    const col = document.createElement("div");
    col.className = "column";
    col.innerHTML = `
      <input type="text" class="host-input" id="name-${i}" placeholder="HOST ${i}">
      <div class="column-controls">
        <button class="btn-undo" id="undo-${i}">↶</button>
        <button class="btn-reset" id="reset-${i}">Reset</button>
      </div>
      <ul class="ranked-list" id="ranked-${i}"></ul>
      <ul class="pool-list" id="pool-${i}"></ul>
    `;
    document.getElementById("board").appendChild(col);
    
    const rUl = document.getElementById(`ranked-${i}`);
    const pUl = document.getElementById(`pool-${i}`);
    
    teamsData.forEach(t => pUl.appendChild(createTeam(t)));

    const opt = { 
        group: `shared-${i}`, 
        animation: 150, 
        onStart: () => saveHistory(i),
        onEnd: () => { updatePos(rUl); sync(); }
    };
    
    new Sortable(rUl, opt); 
    new Sortable(pUl, opt);

    document.getElementById(`undo-${i}`).onclick = () => undo(i);
    document.getElementById(`reset-${i}`).onclick = () => reset(i);
    document.getElementById(`name-${i}`).oninput = () => sync();
  }
  listen();
}

function createTeam(t) {
  const li = document.createElement("li"); li.className = "team-item"; li.dataset.id = t.id;
  li.innerHTML = `<span class="position"></span><div class="logo-box"><img src="${t.logo}"></div><span class="team-name">${t.name}</span>`;
  return li;
}

// POSICIÓN: El de abajo es el #1, crecen hacia arriba.
function updatePos(el) { 
    const items = el.querySelectorAll(".team-item");
    items.forEach((item, index) => {
        const span = item.querySelector(".position");
        span.textContent = `#${index + 1}`;
    });
}

function saveHistory(i) {
    histories[i].push({
        r: document.getElementById(`ranked-${i}`).innerHTML,
        p: document.getElementById(`pool-${i}`).innerHTML
    });
    if(histories[i].length > 15) histories[i].shift();
}

function sync() {
  if (isRemoteUpdate) return;
  const data = {};
  for(let i=1; i<=4; i++) {
    data[`h${i}`] = { 
        n: document.getElementById(`name-${i}`).value, 
        ids: Array.from(document.querySelectorAll(`#ranked-${i} li`)).map(li => li.dataset.id) 
    };
  }
  db.ref('live-data').set(data);
}

function listen() {
  db.ref('live-data').on('value', snap => {
    const data = snap.val(); if(!data) return;
    isRemoteUpdate = true;
    for(let i=1; i<=4; i++) {
      if(!data[`h${i}`]) continue;
      document.getElementById(`name-${i}`).value = data[`h${i}`].n;
      const rUl = document.getElementById(`ranked-${i}`);
      data[`h${i}`].ids.forEach(id => {
        const item = document.querySelector(`.column:nth-child(${i}) [data-id="${id}"]`);
        if(item) rUl.appendChild(item);
      });
      updatePos(rUl);
    }
    isRemoteUpdate = false;
  });
}

function undo(i) {
    if(histories[i].length) {
        const s = histories[i].pop();
        document.getElementById(`ranked-${i}`).innerHTML = s.r;
        document.getElementById(`pool-${i}`).innerHTML = s.p;
        updatePos(document.getElementById(`ranked-${i}`));
        sync();
    }
}

function reset(i) {
    if(confirm("¿Resetear?")) {
        saveHistory(i);
        const r = document.getElementById(`ranked-${i}`);
        const p = document.getElementById(`pool-${i}`);
        Array.from(r.children).forEach(it => p.appendChild(it));
        updatePos(r); sync();
    }
}

init();
