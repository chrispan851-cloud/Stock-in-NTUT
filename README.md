# GitHub Pages → Google Form 庫存介面 v4

此版本不再把正式庫存紀錄存在 localStorage，而是直接送到既有 Google Form。

## 已完成
- 日期
- 領出 / 入庫
- 負責人下拉清單
- 多品項複選
- 每個品項可填不同數量
- 一次按送出後，自動拆成多筆 Google Form 回覆
- 客戶 / 內容 / 備註 / 款項備註
- 手機版面
- Google Sheet 庫存統整讀取介面預留

## Google Form 欄位
- 日期：entry.2101330737
- 產品：entry.929138264
- 出入庫：entry.513085917
- 負責人：entry.2133739501
- 數量：entry.617108285
- 客戶：entry.737578233
- 內容：entry.1020555408
- 備註：entry.1214459614
- 款項備註：entry.1546836264

## 重要
GitHub Pages 與 Google Forms 是不同網域，因此瀏覽器可以把資料送出去，但無法直接讀取 Google Forms 的回覆頁來驗證「Google Sheet 已完成同步」。

也就是說：
- 可確認網頁有執行送出。
- 無法只靠這個前端頁面保證 Google Sheet 已寫入。
- 若要做到真正的「寫入成功才顯示成功」，之後可改用 Apps Script 或其他有回傳 JSON 的 API。

## 更新 GitHub Pages
把 index.html、styles.css、app.js 上傳覆蓋原 Repository 的同名檔案即可。


## v5 庫存顯示
- 使用原「產品庫存」捷徑相同的 Google Sheet。
- GitHub 開頁時一次讀取 B 欄（品項）與 C 欄（庫存）。
- 庫存直接顯示在每個品項右側，不另外占一張大表。
- 庫存 <= 5 會顯示低庫存提示樣式；<= 0 顯示缺貨樣式。
- 領出數量若大於目前讀到的庫存，會阻止送出。
- 送出 Google Form 後等待 2.5 秒自動重新讀取庫存。
- 可手動按「重新整理庫存」。
