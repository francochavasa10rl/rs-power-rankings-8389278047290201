// CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI", // Búscala en Configuración del Proyecto en Firebase
  databaseURL: "https://rs-power-rankings-default-rtdb.firebaseio.com/",
  projectId: "rs-power-rankings",
  appId: "TU_APP_ID_AQUI" // Búscala en Configuración del Proyecto en Firebase
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const teamsData = [
  { id: "tsm", name:"TSM", logo:"logos/tsm.png" },
  { id: "furia", name:"FURIA ESPORTS", logo:"logos/furia.png" },
  { id: "shopify", name:"SHOPIFY REBELLION", logo:"logos/shopify.png" },
  { id: "nrg", name:"NRG ESPORTS", logo:"logos/nrg.png" },
  { id: "vitality", name:"TEAM VITALITY", logo:"logos/vitality.png" },
  { id: "kc", name:"KARMINE CORP", logo:"logos/kc.png" },
  { id: "falcons", name:"TEAM FALCONS", logo:"logos/falcons.png" },
  { id: "ssg", name:"SPACESTATION", logo:"logos/ssg.png" },
  { id: "mates", name:"GENTLE MATES", logo:"logos/gentlemates.png" },
  { id: "pwr", name:"PWR", logo:"logos/pwr.png" },
  { id: "tm", name:"TWISTED MINDS", logo:"logos/twisted.png" },
  { id: "mibr", name:"MIBR", logo:"logos/mibr.png" },
  { id: "gk", name:"GEEKAY ESPORTS", logo:"logos/geekay.png" },
  { id: "nip", name:"NINJAS", logo:"logos/nip.png" },
  { id: "vp", name:"VIRTUS.PRO", logo:"logos/vp.png" },
  { id: "5f", name:"FIVE FEARS", logo:"logos/5f.png" }
];

const board = document.getElementById("board");
const histories = { 1: [], 2: [], 3: [], 4: [] };
let isRemoteUpdate = false;

function init() {
  for (let i = 1; i <= 4; i++) {
    createColumn(i);
  }
  escucharCambiosRemotos();
}

function createColumn(i) {
  const col = document.createElement("div");
  col.className = "column";
  col.innerHTML = `
    <input type="text" class="host-input" id="name-${i}" placeholder="HOST ${i}">
    <div class="column-controls">
      <button class="btn-undo" id="undo-${i}">↶ Deshacer</button>
      <button class="btn-reset" id="reset-${i}">Reiniciar Lista</button>
    </div>
    <ul class="ranked-list" id="ranked-${i}"></ul>
    <ul class="pool-list" id="pool-${i}"></ul>
  `;
  board.appendChild(col);

  const rankedEl = document.getElementById(`ranked-${i}`);
  const poolEl = document.getElementById(`pool-${i}`);

  teamsData.forEach(team => {
    poolEl.appendChild(createTeamElement(team));
  });

  const options = {
    group: `shared-${i}`,
    animation: 150,
    onStart: () => saveHistory(i),
    onEnd: () => {
      updatePositions(rankedEl);
      subirAFirebase();
    }
  };

  new Sortable(rankedEl, options);
  new Sortable(poolEl, options);

  document.getElementById(`undo-${i}`).onclick = () => undo(i);
  document.getElementById(`reset-${i}`).onclick = () => reset(i);
  document.getElementById(`name-${i}`).oninput = () => subirAFirebase();
}

function createTeamElement(team) {
  const li = document.createElement("li");
  li.className = "team-item";
  li.dataset.id = team.id;
  li.innerHTML = `
    <span class="position"></span>
    <div class="logo-box"><img src="${team.logo}"></div>
    <span class="team-name">${team.name}</span>
  `;
  return li;
}

function updatePositions(el) {
  el.querySelectorAll(".position").forEach((span, index) => {
    span.textContent = `#${index + 1}`;
  });
}

function saveHistory(i) {
  const ranked = document.getElementById(`ranked-${i}`).innerHTML;
  const pool = document.getElementById(`pool-${i}`).innerHTML;
  histories[i].push({ ranked, pool });
  if (histories[i].length > 20) histories[i].shift();
}

function undo(i) {
  if (histories[i].length > 0) {
    const state = histories[i].pop();
    document.getElementById(`ranked-${i}`).innerHTML = state.ranked;
    document.getElementById(`pool-${i}`).innerHTML = state.pool;
    updatePositions(document.getElementById(`ranked-${i}`));
    subirAFirebase();
  }
}

function reset(i) {
  if (confirm("¿Reiniciar esta lista completa?")) {
    saveHistory(i);
    const ranked = document.getElementById(`ranked-${i}`);
    const pool = document.getElementById(`pool-${i}`);
    Array.from(ranked.children).forEach(item => pool.appendChild(item));
    updatePositions(ranked);
    subirAFirebase();
  }
}

function subirAFirebase() {
  if (isRemoteUpdate) return;
  const data = {};
  for (let i = 1; i <= 4; i++) {
    data[`host${i}`] = {
      name: document.getElementById(`name-${i}`).value,
      rankedIds: Array.from(document.querySelectorAll(`#ranked-${i} li`)).map(li => li.dataset.id)
    };
  }
  db.ref('live-ranking').set(data);
}

function escucharCambiosRemotos() {
  db.ref('live-ranking').on('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    isRemoteUpdate = true;
    
    for (let i = 1; i <= 4; i++) {
      const hostData = data[`host${i}`];
      if (!hostData) continue;

      document.getElementById(`name-${i}`).value = hostData.name;
      const rankedUl = document.getElementById(`ranked-${i}`);
      const poolUl = document.getElementById(`pool-${i}`);
      
      hostData.rankedIds.forEach(id => {
        const item = document.querySelector(`.column:nth-child(${i}) [data-id="${id}"]`);
        if (item) rankedUl.appendChild(item);
      });
      updatePositions(rankedUl);
    }
    isRemoteUpdate = false;
  });
}

init();
