// ===== Google Form 設定 =====
// 由目前 iPhone 捷徑截圖整理。
// 若未來換表單，只需要改這裡與 ENTRY。
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

// 與「產品庫存」捷徑使用同一份 Google Sheet。
// 一次讀取 B、C 欄，不再對每個產品各發一個查詢。
// B = 產品名稱，C = 庫存數量
const STOCK_CSV_URL =
  "https://docs.google.com/spreadsheets/d/13tRDiHhpYCaUylrlkLL3PB6bcB8u5aT583TEwqMzH34/gviz/tq?tqx=out:csv&gid=813555188&tq=" +
  encodeURIComponent("SELECT B,C WHERE B IS NOT NULL");

let STOCK = {};


// 由捷徑截圖整理出的負責人
const PEOPLE = [
  "黃志宏",
  "吳書璇",
  "張卜介",
  "潘虹吟"
];

// 由捷徑截圖可見內容整理出的品項
const ITEMS = [
  "膠潤水亮飲-8包/盒",
  "MW肽極粹安撫面膜",
  "元氣茶酵素-2025袋裝",
  "元氣茶酵素-2025盒裝",
  "新A肽-15ml 滴管瓶",
  "新超肽-真空瓶 30ml",
  "大水凝乳",
  "無痕肌修膚水凝乳 30ml盒-軟管",
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

const $ = id => document.getElementById(id);

function localToday(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function init(){
  $("date").value = localToday();
  $("person").innerHTML =
    `<option value="">請選擇</option>` +
    PEOPLE.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("");

  renderItems(ITEMS);
  loadStock();
}

function renderItems(list){
  $("itemList").innerHTML = list.map((name)=>{
    const idx = ITEMS.indexOf(name);
    return `
      <div class="item-row" data-index="${idx}" data-name="${esc(name)}">
        <input class="item-check" type="checkbox" data-index="${idx}" />
        <div class="item-name">${esc(name)}</div>
        <span class="stock-pill loading" data-stock-name="${esc(name)}">讀取中</span>
        <input class="qty-input" data-index="${idx}" type="number" min="0.01" step="0.01" placeholder="數量" disabled />
      </div>`;
  }).join("");

  document.querySelectorAll(".item-check").forEach(cb=>{
    cb.addEventListener("change", ()=>{
      const idx = cb.dataset.index;
      const qty = document.querySelector(`.qty-input[data-index="${idx}"]`);
      const row = cb.closest(".item-row");
      qty.disabled = !cb.checked;
      if(cb.checked){
        row.classList.add("selected");
        qty.focus();
      }else{
        row.classList.remove("selected");
        qty.value = "";
      }
      updateSummary();
    });
  });

  document.querySelectorAll(".qty-input").forEach(q=>{
    q.addEventListener("input", updateSummary);
  });
}


function refreshStockPills(){
  document.querySelectorAll("[data-stock-name]").forEach(elm=>{
    const name = elm.dataset.stockName;
    if(!(name in STOCK)){
      elm.textContent = "庫存 —";
      elm.className = "stock-pill";
      return;
    }

    const raw = STOCK[name];
    const num = Number(raw);
    elm.textContent = `庫存 ${raw}`;

    if(Number.isFinite(num) && num <= 0){
      elm.className = "stock-pill zero";
    }else if(Number.isFinite(num) && num <= 5){
      elm.className = "stock-pill low";
    }else{
      elm.className = "stock-pill";
    }
  });
}

function getSelectedItems(){
  return [...document.querySelectorAll(".item-check:checked")].map(cb=>{
    const idx = Number(cb.dataset.index);
    const qtyEl = document.querySelector(`.qty-input[data-index="${idx}"]`);
    return {name: ITEMS[idx], qty: Number(qtyEl.value)};
  });
}

function updateSummary(){
  const selected = getSelectedItems();
  if(!selected.length){
    $("selectedSummary").textContent = "尚未選擇品項";
    return;
  }
  const complete = selected.filter(x=>x.qty>0).length;
  $("selectedSummary").textContent =
    `已選 ${selected.length} 項，${complete} 項已填數量`;
}

$("itemSearch").addEventListener("input", e=>{
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll(".item-row").forEach(row=>{
    const name = row.dataset.name.toLowerCase();
    row.style.display = name.includes(q) ? "" : "none";
  });
});

$("clearItemsBtn").addEventListener("click", ()=>{
  document.querySelectorAll(".item-check:checked").forEach(cb=>{
    cb.checked = false;
    cb.dispatchEvent(new Event("change"));
  });
});

// 用標準 HTML form POST 到隱藏 iframe。
// 這可以避開 GitHub Pages 與 Google Forms 的跨網域讀取限制。
function submitOne(record){
  return new Promise((resolve, reject)=>{
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

    Object.entries(fields).forEach(([name,value])=>{
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value ?? "";
      form.appendChild(input);
    });

    document.body.appendChild(form);

    // 只能確認瀏覽器完成送出動作，無法跨網域讀取 Google 回覆內容。
    try{
      form.submit();
      setTimeout(()=>{
        form.remove();
        resolve();
      }, 850);
    }catch(err){
      form.remove();
      reject(err);
    }
  });
}

$("recordForm").addEventListener("submit", async e=>{
  e.preventDefault();

  const selected = getSelectedItems();
  if(!selected.length){
    alert("請至少選擇一個品項。");
    return;
  }
  if(selected.some(x=>!(x.qty>0))){
    alert("已勾選的每個品項都要填數量。");
    return;
  }
  if(!$("person").value){
    alert("請選擇負責人。");
    return;
  }

  if($("type").value === "領出"){
    const insufficient = selected.find(x=>{
      if(!(x.name in STOCK)) return false;
      const current = Number(STOCK[x.name]);
      return Number.isFinite(current) && x.qty > current;
    });
    if(insufficient){
      alert(`${insufficient.name} 庫存只有 ${STOCK[insufficient.name]}，領出數量不可填 ${insufficient.qty}。`);
      return;
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

  const batch = selected.map(x=>({...common, item:x.name, qty:x.qty}));

  // 留一份本機批次備份，避免使用者忘記剛剛送了什麼。
  localStorage.setItem("lastSubmittedBatch", JSON.stringify({
    at:new Date().toISOString(),
    rows:batch
  }));

  const btn = $("submitBtn");
  btn.disabled = true;
  btn.textContent = `送出中 0 / ${batch.length}`;
  $("statusBox").innerHTML =
    `<span class="status-warn">正在逐筆送出 ${batch.length} 筆資料，請先不要關閉頁面。</span>`;

  let sent = 0;
  try{
    for(const row of batch){
      await submitOne(row);
      sent++;
      btn.textContent = `送出中 ${sent} / ${batch.length}`;
    }

    $("statusBox").innerHTML =
      `<span class="status-ok">已完成 ${sent} 筆送出動作。</span><br>` +
      `每個品項會是 Google Form 裡獨立的一筆回覆。` +
      `<br><small>注意：瀏覽器因跨網域限制，無法直接讀取 Google Sheet 是否已完成同步；這裡確認的是送出流程已執行。</small>`;

    // 送出後只清除品項/數量，保留共同欄位方便連續操作
    document.querySelectorAll(".item-check:checked").forEach(cb=>{
      cb.checked = false;
      cb.dispatchEvent(new Event("change"));
    });

    // Google Form → Sheet 可能需要一點同步時間，先延遲後重新讀取。
    $("stockSyncText").textContent = "等待 Google Sheet 更新後重新讀取…";
    setTimeout(loadStock, 2500);
  }catch(err){
    $("statusBox").innerHTML =
      `<span class="status-error">送出過程中發生錯誤；已送出 ${sent} / ${batch.length} 筆。</span><br>` +
      `剛才的批次內容仍保存在這台裝置的瀏覽器中。`;
  }finally{
    btn.disabled = false;
    btn.textContent = "送出到 Google Form";
  }
});

// ===== Google Sheet 庫存讀取 =====
$("refreshStockBtn").addEventListener("click", loadStock);

async function loadStock(){
  $("stockSyncText").textContent = "正在讀取 Google Sheet…";
  document.querySelectorAll("[data-stock-name]").forEach(elm=>{
    elm.textContent = "讀取中";
    elm.className = "stock-pill loading";
  });

  try{
    const res = await fetch(STOCK_CSV_URL, {cache:"no-store"});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    const rows = parseCSV(text);
    const map = {};

    // gviz CSV 的第一列通常是欄名；逐列辨認即可。
    rows.forEach((r, idx)=>{
      const name = String(r[0] ?? "").trim();
      const stock = String(r[1] ?? "").trim();
      if(!name) return;

      const lowered = name.toLowerCase();
      if(idx === 0 && (lowered.includes("產品") || lowered.includes("品項") || lowered === "b")){
        return;
      }
      map[name] = stock;
    });

    STOCK = map;
    refreshStockPills();

    const matched = ITEMS.filter(name => name in STOCK).length;
    $("stockSyncText").textContent =
      `已讀取 ${Object.keys(STOCK).length} 筆庫存，與目前品項清單匹配 ${matched} 筆。`;
  }catch(err){
    console.error(err);
    $("stockSyncText").textContent =
      "庫存讀取失敗；仍可填表，但送出前請自行確認庫存。";
    document.querySelectorAll("[data-stock-name]").forEach(elm=>{
      elm.textContent = "庫存 ?";
      elm.className = "stock-pill";
    });
  }
}

function parseCSV(text){
  const rows = [];
  let row = [], cell = "", quoted = false;

  for(let i=0;i<text.length;i++){
    const c = text[i];
    if(quoted){
      if(c === '"' && text[i+1] === '"'){
        cell += '"'; i++;
      }else if(c === '"'){
        quoted = false;
      }else{
        cell += c;
      }
    }else{
      if(c === '"'){
        quoted = true;
      }else if(c === ","){
        row.push(cell); cell="";
      }else if(c === "
"){
        row.push(cell.replace(/$/,"")); rows.push(row);
        row=[]; cell="";
      }else{
        cell += c;
      }
    }
  }
  row.push(cell.replace(/$/,""));
  rows.push(row);
  return rows;
}

init();
