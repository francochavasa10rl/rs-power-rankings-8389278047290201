const firebaseConfig = {
  apiKey: "AIzaSyBNwd71SpCA4Ctflw2UcuZxfVwl3L3liZw",
  authDomain: "rs-power-rankings.firebaseapp.com",
  databaseURL: "https://rs-power-rankings-default-rtdb.firebaseio.com",
  projectId: "rs-power-rankings",
  storageBucket: "rs-power-rankings.firebasestorage.app",
  messagingSenderId: "985630009457",
  appId: "1:985630009457:web:9b4da8d80e6e5673cc13d0"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const rankingRef = db.ref("live-ranking");

const teamsData = [
  { id: "tsm", name:"TSM", logo:"logos/tsm.png" },
  { id: "furia", name:"FURIA ESPORTS", logo:"logos/furia.png" },
  { id: "shopify", name:"SHOPIFY REBELLION", logo:"logos/shopify.png" },
  { id: "nrg", name:"NRG ESPORTS", logo:"logos/nrg.png" },
  { id: "vitality", name:"TEAM VITALITY", logo:"logos/vitality.png" },
  { id: "kc", name:"KARMINE CORP", logo:"logos/kc.png" },
  { id: "falcons", name:"TEAM FALCONS", logo:"logos/falcons.png" },
  { id: "ssg", name:"SPACESTATION GAMING", logo:"logos/ssg.png" },
  { id: "mates", name:"GENTLE MATES", logo:"logos/gentlemates.png" },
  { id: "pwr", name:"PWR", logo:"logos/pwr.png" },
  { id: "tm", name:"TWISTED MINDS", logo:"logos/twisted.png" },
  { id: "mibr", name:"MIBR", logo:"logos/mibr.png" },
  { id: "gk", name:"GEEKAY ESPORTS", logo:"logos/geekay.png" },
  { id: "nip", name:"NINJAS IN PYJAMAS", logo:"logos/nip.png" },
  { id: "vp", name:"VIRTUS.PRO", logo:"logos/vp.png" },
  { id: "5f", name:"FIVE FEARS", logo:"logos/5f.png" }
];

let isRemoteUpdate = false;

/* ================= INIT ================= */

function init() {
  const board = document.getElementById("board");
  board.innerHTML = "";

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
      animation: 120,
      onEnd: () => {
        updatePos(rUl);
        syncColumn(i);
      }
    };

    new Sortable(rUl, sortOpt);
    new Sortable(pUl, sortOpt);

    // 🔥 IMPORTANTE: undo NO llama syncColumn
    document.getElementById(`undo-${i}`).onclick = () => undo(i);
    document.getElementById(`reset-${i}`).onclick = () => reset(i);
    document.getElementById(`name-${i}`).oninput = () => syncColumn(i);
  }

  listenRealtime();
}

/* ================= CREAR TEAM ================= */

function createTeam(t) {
  const li = document.createElement("li");
  li.className = "team-item";
  li.dataset.id = t.id;
  li.innerHTML = `
    <span class="position"></span>
    <div class="logo-box"><img src="${t.logo}"></div>
    <span class="team-name">${t.name}</span>
  `;
  return li;
}

/* ================= POSICIONES ================= */

function updatePos(el) {
  const items = el.querySelectorAll(".team-item");
  const count = items.length;

  items.forEach((item, index) => {
    const rank = (16 - count + 1) + index;
    item.querySelector(".position").textContent = `#${rank}`;
    item.dataset.rank = rank;
  });
}

/* ================= SYNC ================= */

function syncColumn(i) {
  if (isRemoteUpdate) return;

  const rUl = document.getElementById(`ranked-${i}`);
  const nameInput = document.getElementById(`name-${i}`);
  if (!rUl || !nameInput) return;

  const ids = Array.from(rUl.querySelectorAll("li")).map(li => li.dataset.id);
  const columnRef = rankingRef.child(`h${i}`);

  columnRef.once("value").then(snapshot => {
    const currentData = snapshot.val() || {};

    columnRef.update({
      prevIds: currentData.ids || [],
      n: nameInput.value || "",
      ids: ids,
      updated: Date.now()
    });
  });
}

/* ================= LISTENER REALTIME ================= */

function listenRealtime() {
  rankingRef.on("value", snap => {
    const data = snap.val();
    if (!data) return;

    isRemoteUpdate = true;

    for (let i = 1; i <= 4; i++) {
      const hData = data[`h${i}`];
      if (!hData) continue;

      const input = document.getElementById(`name-${i}`);
      const rUl = document.getElementById(`ranked-${i}`);
      const pUl = document.getElementById(`pool-${i}`);

      const ids = hData.ids || [];

      // nombre
      if (input && input.value !== hData.n) {
        input.value = hData.n || "";
      }

      const currentIds = Array.from(rUl.querySelectorAll("li")).map(li => li.dataset.id);

      if (JSON.stringify(currentIds) !== JSON.stringify(ids)) {

        rUl.innerHTML = "";
        ids.forEach(id => {
          const team = teamsData.find(t => t.id === id);
          if (team) rUl.appendChild(createTeam(team));
        });

        pUl.innerHTML = "";
        teamsData.forEach(t => {
          if (!ids.includes(t.id)) {
            pUl.appendChild(createTeam(t));
          }
        });

        updatePos(rUl);
      }
    }

    isRemoteUpdate = false;
  });
}

/* ================= UNDO GLOBAL ================= */

function undo(i) {
  const columnRef = rankingRef.child(`h${i}`);

  columnRef.once("value").then(snapshot => {
    const data = snapshot.val();
    if (!data || !data.prevIds) return;

    columnRef.update({
      ids: data.prevIds,
      prevIds: data.ids || [],
      updated: Date.now()
    });
  });
}

/* ================= RESET ================= */

function reset(i) {
  if (!confirm("¿Limpiar esta lista?")) return;

  const columnRef = rankingRef.child(`h${i}`);

  columnRef.once("value").then(snapshot => {
    const data = snapshot.val() || {};

    columnRef.update({
      prevIds: data.ids || [],
      ids: [],
      updated: Date.now()
    });
  });
}

document.addEventListener("DOMContentLoaded", init);
