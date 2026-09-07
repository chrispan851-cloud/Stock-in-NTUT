const FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfGJtE0EDrqeBnySbNHFnzYmU2mbHge6eBHNQ3nnuZLC6Bf8A/formResponse";

const ENTRY = {
  date: "entry.2101330737",
  item: "entry.929138264",
  type: "entry.513085917",
  person: "entry.2133739501",
  qty: "entry.617108285",
  customer: "entry.737578233",
  content: "entry.1020555408",
  note: "entry.1214459614",
  paymentNote: "entry.1546836264"
};

const PEOPLE = [
  "黃志宏",
  "吳書璇",
  "張卜介",
  "潘虹吟"
];

const ITEMS = [
  "膠潤水亮飲-8包/盒",
  "MW肽極粹安撫面膜",
  "元氣茶酵素-2025袋裝",
  "元氣茶酵素-2025盒裝",
  "新A肽-15ml滴管瓶",
  "新超肽-真空瓶 30ml",
  "大水凝乳",
  "無痕肌修膚水凝乳 30ml-軟管",
  "完膜肽健衛兵-升級版",
  "MinWin口腔護理保健液",
  "大勇腱 250ml",
  "即克鬆 15mL-盒",
  "水漾肌保濕活膚露 100ml-盒",
  "勇腱潤節舒緩霜 30ML",
  "青春調理凝膠 15ml盒",
  "早安小一號綠咖啡 90入",
  "早安小一號綠咖啡 30入",
  "美白精華液 2026-50ml-盒"
];

const STOCK_CSV_URL =
  "https://docs.google.com/spreadsheets/d/13tRDiHhpYCaUylrlkLL3PB6bcB8u5aT583TEwqMzH34/gviz/tq?tqx=out:csv&gid=813555188&tq=" +
  encodeURIComponent("SELECT B,C WHERE B IS NOT NULL");

const $ = id => document.getElementById(id);
let STOCK = {};
let SELECTED = new Set();

function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function localToday(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function init(){
  $("date").value = localToday();

  $("person").innerHTML =
    `<option value="">請選擇</option>` +
    PEOPLE.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join("");

  renderPicker();
  renderSelected();
  loadStock();
}

function renderPicker(){
  const q = $("itemSearch").value.trim().toLowerCase();
  const list = ITEMS.filter(name => name.toLowerCase().includes(q));

  $("itemList").innerHTML = list.map(name => {
    const checked = SELECTED.has(name);
    return `
      <label class="item-row ${checked ? "selected" : ""}">
        <input class="item-check" type="checkbox" value="${esc(name)}" ${checked ? "checked" : ""}>
        <span class="item-name">${esc(name)}</span>
        <span class="stock-pill" data-stock-name="${esc(name)}">${stockText(name)}</span>
      </label>`;
  }).join("");

  document.querySelectorAll(".item-check").forEach(cb => {
    cb.addEventListener("change", () => {
      if(cb.checked) SELECTED.add(cb.value);
      else SELECTED.delete(cb.value);
      renderPicker();
      renderSelected();
    });
  });

  refreshStockPills();
}

function stockText(name){
  if(!(name in STOCK)) return "庫存 —";
  return `庫存 ${STOCK[name]}`;
}

function refreshStockPills(){
  document.querySelectorAll("[data-stock-name]").forEach(elm => {
    const name = elm.dataset.stockName;
    if(!(name in STOCK)){
      elm.textContent = "庫存 —";
      elm.className = "stock-pill";
      return;
    }

    const raw = STOCK[name];
    const num = Number(raw);
    elm.textContent = `庫存 ${raw}`;

    if(Number.isFinite(num) && num <= 0) elm.className = "stock-pill zero";
    else if(Number.isFinite(num) && num <= 5) elm.className = "stock-pill low";
    else elm.className = "stock-pill";
  });
}

function renderSelected(){
  const names = [...SELECTED];

  $("pickerLabel").textContent =
    names.length ? `已選 ${names.length} 項` : "選擇品項";

  $("selectedSummary").textContent =
    names.length ? `已選 ${names.length} 項` : "尚未選擇品項";

  if(!names.length){
    $("selectedItemsBox").innerHTML = `<span class="muted">尚未選擇品項</span>`;
    return;
  }

  $("selectedItemsBox").innerHTML = names.map(name => `
    <div class="selected-row" data-selected="${esc(name)}">
      <div>${esc(name)}</div>
      <span class="stock-pill">${stockText(name)}</span>
      <input class="selected-qty" data-name="${esc(name)}"
             type="number" min="0.01" step="0.01" placeholder="數量">
      <button class="remove-btn" type="button" data-remove="${esc(name)}">×</button>
    </div>
  `).join("");

  document.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", () => {
      SELECTED.delete(btn.dataset.remove);
      renderPicker();
      renderSelected();
    });
  });
}

$("itemPickerBtn").addEventListener("click", () => {
  $("itemPickerPanel").classList.toggle("hidden");
});

$("itemSearch").addEventListener("input", renderPicker);

$("clearItemsBtn").addEventListener("click", () => {
  SELECTED.clear();
  renderPicker();
  renderSelected();
});

$("refreshStockBtn").addEventListener("click", loadStock);

async function loadStock(){
  $("stockSyncText").textContent = "正在讀取 Google Sheet…";

  try{
    const res = await fetch(STOCK_CSV_URL, {cache:"no-store"});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    const rows = parseCSV(text);
    const map = {};

    rows.forEach((r, idx) => {
      const name = String(r[0] ?? "").trim();
      const stock = String(r[1] ?? "").trim();
      if(!name) return;

      if(idx === 0){
        const n = name.toLowerCase();
        if(n.includes("產品") || n.includes("品項") || n === "b") return;
      }

      map[name] = stock;
    });

    STOCK = map;
    refreshStockPills();
    renderSelected();

    const matched = ITEMS.filter(x => x in STOCK).length;
    $("stockSyncText").textContent =
      `已讀取 ${Object.keys(STOCK).length} 筆庫存；品項匹配 ${matched}/${ITEMS.length}。`;
  }catch(err){
    console.error(err);
    $("stockSyncText").textContent =
      "庫存讀取失敗；表單仍可使用。";
  }
}

function parseCSV(text){
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for(let i=0; i<text.length; i++){
    const c = text[i];

    if(quoted){
      if(c === '"' && text[i+1] === '"'){
        cell += '"';
        i++;
      }else if(c === '"'){
        quoted = false;
      }else{
        cell += c;
      }
    }else{
      if(c === '"'){
        quoted = true;
      }else if(c === ","){
        row.push(cell);
        cell = "";
      }else if(c === "\n"){
        row.push(cell.replace(/\r$/, ""));
        rows.push(row);
        row = [];
        cell = "";
      }else{
        cell += c;
      }
    }
  }

  row.push(cell.replace(/\r$/, ""));
  rows.push(row);
  return rows;
}

function submitOne(record){
  return new Promise((resolve, reject) => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = FORM_URL;
    form.target = "googleFormSink";
    form.style.display = "none";

    const fields = {
      [ENTRY.date]: record.date,
      [ENTRY.item]: record.item,
      [ENTRY.type]: record.type,
      [ENTRY.person]: record.person,
      [ENTRY.qty]: record.qty,
      [ENTRY.customer]: record.customer,
      [ENTRY.content]: record.content,
      [ENTRY.note]: record.note,
      [ENTRY.paymentNote]: record.paymentNote
    };

    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value ?? "";
      form.appendChild(input);
    });

    document.body.appendChild(form);

    try{
      form.submit();
      setTimeout(() => {
        form.remove();
        resolve();
      }, 900);
    }catch(err){
      form.remove();
      reject(err);
    }
  });
}

$("recordForm").addEventListener("submit", async e => {
  e.preventDefault();

  const names = [...SELECTED];
  if(!names.length){
    alert("請至少選擇一個品項。");
    return;
  }

  if(!$("person").value){
    alert("請選擇負責人。");
    return;
  }

  const qtyMap = {};
  let invalid = false;

  document.querySelectorAll(".selected-qty").forEach(input => {
    const qty = Number(input.value);
    if(!(qty > 0)) invalid = true;
    qtyMap[input.dataset.name] = qty;
  });

  if(invalid){
    alert("每個已選品項都要填數量。");
    return;
  }

  if($("type").value === "領出"){
    for(const name of names){
      if(name in STOCK){
        const current = Number(STOCK[name]);
        if(Number.isFinite(current) && qtyMap[name] > current){
          alert(`${name} 目前庫存 ${STOCK[name]}，領出數量不可填 ${qtyMap[name]}。`);
          return;
        }
      }
    }
  }

  const common = {
    date: $("date").value,
    type: $("type").value,
    person: $("person").value,
    customer: $("customer").value.trim(),
    content: $("content").value.trim(),
    note: $("note").value.trim(),
    paymentNote: $("paymentNote").value.trim()
  };

  const batch = names.map(name => ({
    ...common,
    item: name,
    qty: qtyMap[name]
  }));

  const btn = $("submitBtn");
  btn.disabled = true;
  $("statusBox").innerHTML =
    `<span class="status-warn">正在送出 ${batch.length} 筆…</span>`;

  let sent = 0;

  try{
    for(const row of batch){
      btn.textContent = `送出中 ${sent + 1}/${batch.length}`;
      await submitOne(row);
      sent++;
    }

    $("statusBox").innerHTML =
      `<span class="status-ok">已執行 ${sent} 筆 Google Form 送出。</span>`;

    SELECTED.clear();
    renderPicker();
    renderSelected();

    setTimeout(loadStock, 3000);
  }catch(err){
    console.error(err);
    $("statusBox").innerHTML =
      `<span class="status-error">送出中斷，已完成 ${sent}/${batch.length} 筆。</span>`;
  }finally{
    btn.disabled = false;
    btn.textContent = "送出到 Google Form";
  }
});

init();
