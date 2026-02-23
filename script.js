const firebaseConfig = {
  apiKey: "AIzaSyBNwd71SpCA4Ctflw2UcuZxfVwl3L3liZw",
  authDomain: "rs-power-rankings.firebaseapp.com",
  databaseURL: "https://rs-power-rankings-default-rtdb.firebaseio.com",
  projectId: "rs-power-rankings",
  storageBucket: "rs-power-rankings.firebasestorage.app",
  messagingSenderId: "985630009457",
  appId: "1:985630009457:web:9b4da8d80e6e5673cc13d0",
  measurementId: "G-63M7CLLH8K"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const teamsData = [
  { id: "tsm", name:"TSM", logo:"logos/tsm.png" }, { id: "furia", name:"FURIA ESPORTS", logo:"logos/furia.png" },
  { id: "shopify", name:"SHOPIFY REBELLION", logo:"logos/shopify.png" }, { id: "nrg", name:"NRG ESPORTS", logo:"logos/nrg.png" },
  { id: "vitality", name:"TEAM VITALITY", logo:"logos/vitality.png" }, { id: "kc", name:"KARMINE CORP", logo:"logos/kc.png" },
  { id: "falcons", name:"TEAM FALCONS", logo:"logos/falcons.png" }, { id: "ssg", name:"SPACESTATION GAMING", logo:"logos/ssg.png" },
  { id: "mates", name:"GENTLE MATES", logo:"logos/gentlemates.png" }, { id: "pwr", name:"PWR", logo:"logos/pwr.png" },
  { id: "tm", name:"TWISTED MINDS", logo:"logos/twisted.png" }, { id: "mibr", name:"MIBR", logo:"logos/mibr.png" },
  { id: "gk", name:"GEEKAY ESPORTS", logo:"logos/geekay.png" }, { id: "nip", name:"NINJAS IN PYJAMAS", logo:"logos/nip.png" },
  { id: "vp", name:"VIRTUS.PRO", logo:"logos/vp.png" }, { id: "5f", name:"FIVE FEARS", logo:"logos/5f.png" }
];

const histories = { 1: [], 2: [], 3: [], 4: [] };
let isRemoteUpdate = false;

function init() {
  const board = document.getElementById("board");
  board.innerHTML = ""; // Limpiamos por las dudas
  
  for (let i = 1; i <= 4; i++) {
    const col = document.createElement("div");
    col.className = "column";
    col.innerHTML = `
      <input type="text" class="host-input" id="name-${i}" placeholder="HOST ${i}">
      <div class="column-controls">
        <button class="btn-undo" id="undo-${i}">↶ DESHACER</button>
        <button class="btn-reset" id="reset-${i}">REINICIAR LISTA</button>
      </div>
      <ul class="ranked-list" id="ranked-${i}"></ul>
      <ul class="pool-list" id="pool-${i}"></ul>
    `;
    board.appendChild(col);
    
    const rUl = document.getElementById(`ranked-${i}`);
    const pUl = document.getElementById(`pool-${i}`);
    teamsData.forEach(t => pUl.appendChild(createTeam(t)));

    const sortOpt = { 
      group: `shared-${i}`, 
      animation: 150, 
      onStart: () => saveHistory(i),
      onEnd: () => { 
        console.log(`Moviendo equipo en Host ${i}`);
        updatePos(rUl); 
        sync(); 
      }
    };
    
    new Sortable(rUl, sortOpt); 
    new Sortable(pUl, sortOpt);

    // VINCULACIÓN DE EVENTOS REFORZADA
    document.getElementById(`undo-${i}`).onclick = () => {
        console.log(`Botón Deshacer Host ${i} presionado`);
        undo(i);
        sync();
    };

    document.getElementById(`reset-${i}`).onclick = () => {
        console.log(`Botón Reiniciar Host ${i} presionado`);
        reset(i);
        sync();
    };

    document.getElementById(`name-${i}`).oninput = () => {
        sync();
    };
  }
  listen();
}

function createTeam(t) {
  const li = document.createElement("li"); 
  li.className = "team-item"; li.dataset.id = t.id;
  li.innerHTML = `<span class="position"></span><div class="logo-box"><img src="${t.logo}"></div><span class="team-name">${t.name}</span>`;
  return li;
}

function updatePos(el) { 
    if(!el) return;
    const items = el.querySelectorAll(".team-item");
    const count = items.length;
    items.forEach((item, index) => {
        const span = item.querySelector(".position");
        const rank = (16 - count + 1) + index;
        span.textContent = `#${rank}`;
        item.dataset.rank = rank;
    });
}

function sync() {
  if (isRemoteUpdate) return;
  
  const data = {};
  for(let i=1; i<=4; i++) {
    const rUl = document.getElementById(`ranked-${i}`);
    const nameInput = document.getElementById(`name-${i}`);
    
    if (rUl && nameInput) {
        const ids = Array.from(rUl.querySelectorAll("li")).map(li => li.dataset.id);
        data[`h${i}`] = { 
            n: nameInput.value, 
            ids: ids 
        };
    }
  }
  
  console.log("Intentando subir datos a Firebase...", data);
  db.ref('live-ranking').set(data)
    .then(() => console.log("✅ Datos guardados en Firebase"))
    .catch(err => console.error("❌ Error al guardar:", err));
}

function listen() {
  db.ref('live-ranking').on('value', snap => {
    const data = snap.val(); 
    if(!data) return;
    
    console.log("📥 Datos recibidos de Firebase", data);
    isRemoteUpdate = true;

    for(let i=1; i<=4; i++) {
      const hData = data[`h${i}`];
      if(!hData) continue; 
      
      const input = document.getElementById(`name-${i}`);
      const rUl = document.getElementById(`ranked-${i}`);
      const pUl = document.getElementById(`pool-${i}`);
      
      // Actualizar nombre (solo si no estamos escribiendo)
      if(input && document.activeElement !== input) {
          input.value = hData.n || "";
      }
      
      if(rUl && pUl && hData.ids) {
        rUl.innerHTML = "";
        hData.ids.forEach(id => {
          const team = teamsData.find(t => t.id === id);
          if(team) rUl.appendChild(createTeam(team));
        });
        
        pUl.innerHTML = "";
        teamsData.forEach(t => {
          if (!hData.ids.includes(t.id)) pUl.appendChild(createTeam(t));
        });
        
        updatePos(rUl);
      }
    }
    isRemoteUpdate = false;
  });
}

function saveHistory(i) {
    const r = document.getElementById(`ranked-${i}`);
    const p = document.getElementById(`pool-${i}`);
    if(r && p) {
        histories[i].push({ r: r.innerHTML, p: p.innerHTML });
    }
}

function undo(i) {
    if(histories[i] && histories[i].length > 0) {
        const s = histories[i].pop();
        document.getElementById(`ranked-${i}`).innerHTML = s.r;
        document.getElementById(`pool-${i}`).innerHTML = s.p;
        updatePos(document.getElementById(`ranked-${i}`));
    }
}

function reset(i) {
    if(confirm("¿Limpiar esta lista?")) {
        saveHistory(i);
        const r = document.getElementById(`ranked-${i}`);
        const p = document.getElementById(`pool-${i}`);
        if(r && p) {
            Array.from(r.children).forEach(it => p.appendChild(it));
            r.innerHTML = "";
            updatePos(r);
        }
    }
}

document.addEventListener('DOMContentLoaded', init);
