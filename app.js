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

const SHEET_BASE =
  "https://docs.google.com/spreadsheets/d/13tRDiHhpYCaUylrlkLL3PB6bcB8u5aT583TEwqMzH34/gviz/tq";

const SHEET_GID = "813555188";
const SHEET_QUERY = "SELECT B,C WHERE B IS NOT NULL";

const $ = id => document.getElementById(id);

let STOCK = {};
let ITEMS = [];
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

function getCache(){
  try{
    return JSON.parse(localStorage.getItem("inventorySheetCacheV1") || "null");
  }catch{
    return null;
  }
}

function setCache(){
  localStorage.setItem("inventorySheetCacheV1", JSON.stringify({
    at: Date.now(),
    items: ITEMS,
    stock: STOCK
  }));
}

function init(){
  $("date").value = localToday();

  $("person").innerHTML =
    `<option value="">請選擇</option>` +
    PEOPLE.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join("");

  const cache = getCache();
  if(cache?.items?.length){
    ITEMS = cache.items;
    STOCK = cache.stock || {};
    renderPicker();
    renderSelected();
    const t = new Date(cache.at);
    $("stockSyncText").textContent =
      `先顯示上次成功資料（${t.toLocaleString("zh-TW",{hour12:false})}），正在更新…`;
  }else{
    $("itemList").innerHTML = `<div class="muted">正在讀取品項清單…</div>`;
  }

  loadSheetData().catch(()=>{});
}

function renderPicker(){
  const q = $("itemSearch").value.trim().toLowerCase();
  const list = ITEMS.filter(name => name.toLowerCase().includes(q));

  if(!list.length){
    $("itemList").innerHTML = `<div class="muted">沒有符合的品項。</div>`;
    return;
  }

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
  if(!(name in STOCK) || STOCK[name] === "") return "庫存 —";
  return `庫存 ${STOCK[name]}`;
}

function refreshStockPills(){
  document.querySelectorAll("[data-stock-name]").forEach(elm => {
    const name = elm.dataset.stockName;
    if(!(name in STOCK) || STOCK[name] === ""){
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

$("addItemBtn").addEventListener("click", () => {
  const overlay = document.createElement("div");
  overlay.className = "add-item-dialog";
  overlay.innerHTML = `
    <div class="add-item-card">
      <h3>新增臨時品項</h3>
      <label>品項名稱
        <input id="newItemName" placeholder="輸入新品項名稱">
      </label>
      <div class="add-item-actions">
        <button type="button" id="cancelAddItem">取消</button>
        <button type="button" id="confirmAddItem" class="primary">加入</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const input = overlay.querySelector("#newItemName");
  input.focus();

  overlay.querySelector("#cancelAddItem").onclick = () => overlay.remove();
  overlay.querySelector("#confirmAddItem").onclick = () => {
    const name = input.value.trim();
    if(!name) return;
    if(!ITEMS.includes(name)) ITEMS.push(name);
    SELECTED.add(name);
    renderPicker();
    renderSelected();
    overlay.remove();
  };
});

$("refreshStockBtn").addEventListener("click", () => loadSheetData().catch(()=>{}));

function loadSheetData(){
  return new Promise((resolve, reject) => {
    $("stockSyncText").textContent = "正在讀取 Google Sheet…";

    const callbackName = "__sheetCallback_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    const script = document.createElement("script");

    const timeout = setTimeout(() => {
      cleanup();
      if(ITEMS.length){
        $("stockSyncText").textContent =
          "這次更新失敗，已保留上次成功讀取的品項與庫存。";
      }else{
        $("stockSyncText").textContent =
          "庫存讀取失敗；仍可用「＋新增品項」填表。";
      }
      reject(new Error("Sheet refresh timeout"));
    }, 8000);

    function cleanup(){
      clearTimeout(timeout);
      try{ delete window[callbackName]; }catch{}
      script.remove();
    }

    window[callbackName] = data => {
      try{
        const rows = data?.table?.rows || [];
        const nextItems = [];
        const nextStock = {};

        for(const row of rows){
          const name = String(row?.c?.[0]?.v ?? "").trim();
          const stock = String(row?.c?.[1]?.v ?? "").trim();
          if(!name) continue;
          if(!nextItems.includes(name)) nextItems.push(name);
          nextStock[name] = stock;
        }

        if(!nextItems.length) throw new Error("No data");

        ITEMS = nextItems;
        STOCK = nextStock;
        setCache();

        renderPicker();
        renderSelected();

        $("stockSyncText").textContent =
          `已同步 ${ITEMS.length} 個品項。`;

        resolve({items: ITEMS, stock: STOCK});
      }catch(err){
        console.error(err);
        $("stockSyncText").textContent =
          ITEMS.length
            ? "這次更新失敗，已保留上次成功資料。"
            : "庫存讀取失敗；仍可用「＋新增品項」填表。";
        reject(err);
      }finally{
        cleanup();
      }
    };

    const params = new URLSearchParams({
      gid: SHEET_GID,
      tq: SHEET_QUERY,
      tqx: `responseHandler:${callbackName}`
    });

    script.src = `${SHEET_BASE}?${params.toString()}`;
    script.onerror = () => {
      cleanup();
      $("stockSyncText").textContent =
        ITEMS.length
          ? "這次更新失敗，已保留上次成功資料。"
          : "庫存讀取失敗；仍可用「＋新增品項」填表。";
      reject(new Error("Sheet script load failed"));
    };

    document.body.appendChild(script);
  });
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

  const btn = $("submitBtn");
  const originalText = btn.textContent;
  btn.disabled = true;

  // 送出前強制重新抓最新庫存，降低多人同時操作看到舊庫存的風險。
  btn.textContent = "確認最新庫存…";
  $("statusBox").innerHTML =
    `<span class="status-warn">正在重新讀取最新庫存，確認後才會送出。</span>`;

  try{
    await loadSheetData();
  }catch(err){
    btn.disabled = false;
    btn.textContent = originalText;
    $("statusBox").innerHTML =
      `<span class="status-error">送出前無法取得最新庫存，因此本次沒有送出。</span><br>` +
      `請稍後再試，或按「重新整理庫存」成功後再送出。`;
    return;
  }

  // 重新讀取後再檢查一次所選品項是否仍存在。
  for(const name of names){
    if(!ITEMS.includes(name) && !(name in STOCK)){
      // 臨時新增品項可允許沒有 Sheet 庫存資料
      continue;
    }
  }

  if($("type").value === "領出"){
    for(const name of names){
      if(name in STOCK){
        const current = Number(STOCK[name]);
        if(Number.isFinite(current) && qtyMap[name] > current){
          btn.disabled = false;
          btn.textContent = originalText;
          $("statusBox").innerHTML =
            `<span class="status-error">最新庫存不足，本次沒有送出。</span>`;
          alert(`${name} 最新庫存為 ${STOCK[name]}，領出數量不可填 ${qtyMap[name]}。`);
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

  $("statusBox").innerHTML =
    `<span class="status-warn">最新庫存確認完成，正在送出 ${batch.length} 筆…</span>`;

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

    setTimeout(() => loadSheetData().catch(()=>{}), 3000);
  }catch(err){
    console.error(err);
    $("statusBox").innerHTML =
      `<span class="status-error">送出中斷，已完成 ${sent}/${batch.length} 筆。</span>`;
  }finally{
    btn.disabled = false;
    btn.textContent = originalText;
  }
});

init();
