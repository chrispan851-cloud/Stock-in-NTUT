const STORAGE_ITEMS = "inventory_items_v1";
const STORAGE_TX = "inventory_transactions_v1";

let items = load(STORAGE_ITEMS, []);
let transactions = load(STORAGE_TX, []);

const el = id => document.getElementById(id);

function load(key, fallback){
  try{
    const v = JSON.parse(localStorage.getItem(key));
    return Array.isArray(v) ? v : fallback;
  }catch{
    return fallback;
  }
}

function save(){
  localStorage.setItem(STORAGE_ITEMS, JSON.stringify(items));
  localStorage.setItem(STORAGE_TX, JSON.stringify(transactions));
}

function uid(){
  return crypto?.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2);
}

function today(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function fmt(n){
  const v = Number(n || 0);
  return Number.isInteger(v) ? String(v) : v.toLocaleString("zh-TW",{maximumFractionDigits:2});
}

function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function render(){
  renderStats();
  renderItemSelect();
  renderItems();
  renderTransactions();
}

function renderStats(){
  el("itemCount").textContent = items.length;
  el("totalStock").textContent = fmt(items.reduce((a,b)=>a+Number(b.stock||0),0));
  el("lowStockCount").textContent = items.filter(i=>Number(i.stock)<=Number(i.minStock)).length;
}

function renderItemSelect(){
  const select = el("txItem");
  const current = select.value;
  select.innerHTML = `<option value="">請選擇</option>` + items
    .slice().sort((a,b)=>a.name.localeCompare(b.name,"zh-Hant"))
    .map(i=>`<option value="${esc(i.id)}">${esc(i.name)}${i.spec ? "｜"+esc(i.spec):""}</option>`).join("");
  if(items.some(i=>i.id===current)) select.value = current;
}

function renderItems(){
  const q = el("itemSearch").value.trim().toLowerCase();
  const tbody = el("itemTableBody");
  const rows = items.filter(i=>{
    const text = `${i.name} ${i.spec} ${i.unit} ${i.note}`.toLowerCase();
    return text.includes(q);
  }).sort((a,b)=>a.name.localeCompare(b.name,"zh-Hant"));

  if(!rows.length){
    tbody.innerHTML = `<tr><td colspan="8" class="empty">沒有符合的品項</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(i=>{
    const low = Number(i.stock) <= Number(i.minStock);
    return `<tr class="${low ? "low-row":""}">
      <td><strong>${esc(i.name)}</strong></td>
      <td>${esc(i.spec)}</td>
      <td>${esc(i.unit)}</td>
      <td>${fmt(i.minStock)}</td>
      <td><strong>${fmt(i.stock)}</strong></td>
      <td><span class="badge ${low ? "low":"ok"}">${low ? "低庫存":"正常"}</span></td>
      <td>${esc(i.note)}</td>
      <td>
        <button class="action-link" onclick="editItem('${i.id}')">編輯</button>
        <button class="action-link danger" onclick="deleteItem('${i.id}')">刪除</button>
      </td>
    </tr>`;
  }).join("");
}

function renderTransactions(){
  const q = el("txSearch").value.trim().toLowerCase();
  const type = el("txFilterType").value;
  const tbody = el("txTableBody");
  const filtered = transactions.filter(t=>{
    const item = items.find(i=>i.id===t.itemId);
    const text = `${t.itemName || item?.name || ""} ${t.person} ${t.note}`.toLowerCase();
    return text.includes(q) && (!type || t.type===type);
  }).sort((a,b)=> (b.createdAt || "").localeCompare(a.createdAt || ""));

  if(!filtered.length){
    tbody.innerHTML = `<tr><td colspan="9" class="empty">目前沒有紀錄</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(t=>{
    const item = items.find(i=>i.id===t.itemId);
    const name = t.itemName || item?.name || "已刪除品項";
    const unit = t.unit || item?.unit || "";
    return `<tr>
      <td>${esc(t.date)}</td>
      <td>${esc(name)}</td>
      <td><span class="badge ${t.type}">${t.type==="in" ? "入庫":"出庫"}</span></td>
      <td>${fmt(t.qty)}</td>
      <td>${esc(unit)}</td>
      <td>${esc(t.person)}</td>
      <td>${esc(t.note)}</td>
      <td>${esc(formatDateTime(t.createdAt))}</td>
      <td><button class="action-link danger" onclick="deleteTransaction('${t.id}')">刪除並回復庫存</button></td>
    </tr>`;
  }).join("");
}

function formatDateTime(s){
  if(!s) return "";
  const d = new Date(s);
  return d.toLocaleString("zh-TW",{hour12:false});
}

el("itemForm").addEventListener("submit", e=>{
  e.preventDefault();
  const id = el("itemId").value;
  const data = {
    name: el("itemName").value.trim(),
    spec: el("itemSpec").value.trim(),
    unit: el("itemUnit").value.trim(),
    minStock: Number(el("itemMin").value),
    stock: Number(el("itemStock").value),
    note: el("itemNote").value.trim()
  };

  if(id){
    const idx = items.findIndex(i=>i.id===id);
    if(idx >= 0) items[idx] = {...items[idx], ...data};
  }else{
    items.push({id:uid(), ...data, createdAt:new Date().toISOString()});
  }
  save();
  resetItemForm();
  render();
});

function resetItemForm(){
  el("itemId").value = "";
  el("itemForm").reset();
  el("itemMin").value = 0;
  el("itemStock").value = 0;
}

el("resetItemBtn").addEventListener("click", resetItemForm);

window.editItem = function(id){
  const i = items.find(x=>x.id===id);
  if(!i) return;
  el("itemId").value = i.id;
  el("itemName").value = i.name;
  el("itemSpec").value = i.spec || "";
  el("itemUnit").value = i.unit;
  el("itemMin").value = i.minStock;
  el("itemStock").value = i.stock;
  el("itemNote").value = i.note || "";
  window.scrollTo({top:0,behavior:"smooth"});
};

window.deleteItem = function(id){
  const i = items.find(x=>x.id===id);
  if(!i) return;
  if(!confirm(`確定刪除「${i.name}」？歷史進出紀錄會保留。`)) return;
  items = items.filter(x=>x.id!==id);
  save();
  render();
};

el("txForm").addEventListener("submit", e=>{
  e.preventDefault();
  const item = items.find(i=>i.id===el("txItem").value);
  if(!item){
    alert("請先選擇品項。");
    return;
  }
  const qty = Number(el("txQty").value);
  const type = el("txType").value;

  if(type==="out" && qty > Number(item.stock)){
    alert(`庫存不足。目前只有 ${fmt(item.stock)} ${item.unit}。`);
    return;
  }

  item.stock = Number(item.stock) + (type==="in" ? qty : -qty);

  transactions.push({
    id: uid(),
    date: el("txDate").value,
    itemId: item.id,
    itemName: item.name,
    unit: item.unit,
    type,
    qty,
    person: el("txPerson").value.trim(),
    note: el("txNote").value.trim(),
    createdAt: new Date().toISOString()
  });

  save();
  el("txQty").value = "";
  el("txPerson").value = "";
  el("txNote").value = "";
  render();
});

window.deleteTransaction = function(id){
  const t = transactions.find(x=>x.id===id);
  if(!t) return;
  if(!confirm("確定刪除此紀錄？系統會同步回復該筆對庫存造成的變化。")) return;

  const item = items.find(i=>i.id===t.itemId);
  if(item){
    item.stock = Number(item.stock) + (t.type==="in" ? -Number(t.qty) : Number(t.qty));
    if(item.stock < 0){
      alert("無法刪除：回復後庫存會小於 0。");
      return;
    }
  }

  transactions = transactions.filter(x=>x.id!==id);
  save();
  render();
};

function toCsv(rows){
  return rows.map(row => row.map(v => {
    const s = String(v ?? "");
    return `"${s.replace(/"/g,'""')}"`;
  }).join(",")).join("\r\n");
}

function download(name, content, type="text/plain;charset=utf-8"){
  const blob = new Blob(["\ufeff", content], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

el("exportItemsBtn").addEventListener("click", ()=>{
  const rows = [
    ["品項","規格","單位","安全庫存","現有庫存","備註"],
    ...items.map(i=>[i.name,i.spec,i.unit,i.minStock,i.stock,i.note])
  ];
  download(`庫存總表_${today()}.csv`, toCsv(rows), "text/csv;charset=utf-8");
});

el("exportTxBtn").addEventListener("click", ()=>{
  const rows = [
    ["日期","品項","類型","數量","單位","操作者/領用人","備註","建立時間"],
    ...transactions
      .slice()
      .sort((a,b)=> (a.createdAt||"").localeCompare(b.createdAt||""))
      .map(t=>[t.date,t.itemName,t.type==="in"?"入庫":"出庫",t.qty,t.unit,t.person,t.note,formatDateTime(t.createdAt)])
  ];
  download(`進出紀錄_${today()}.csv`, toCsv(rows), "text/csv;charset=utf-8");
});

el("backupBtn").addEventListener("click", ()=>{
  const data = JSON.stringify({
    version:1,
    exportedAt:new Date().toISOString(),
    items,
    transactions
  }, null, 2);
  download(`庫存備份_${today()}.json`, data, "application/json;charset=utf-8");
});

el("restoreInput").addEventListener("change", async e=>{
  const file = e.target.files?.[0];
  if(!file) return;
  try{
    const obj = JSON.parse(await file.text());
    if(!Array.isArray(obj.items) || !Array.isArray(obj.transactions)) throw new Error();
    if(!confirm("匯入備份會覆蓋目前資料，確定繼續？")) return;
    items = obj.items;
    transactions = obj.transactions;
    save();
    render();
    alert("匯入完成。");
  }catch{
    alert("備份檔格式不正確。");
  }finally{
    e.target.value = "";
  }
});

el("itemSearch").addEventListener("input", renderItems);
el("txSearch").addEventListener("input", renderTransactions);
el("txFilterType").addEventListener("change", renderTransactions);

el("txDate").value = today();
render();
