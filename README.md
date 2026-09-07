# GitHub Google Form 庫存介面 v10

## 這版的設計
- 品項清單固定寫在 GitHub 程式裡，不再從 Google Sheet 讀取。
- 固定品項使用使用者原本 iPhone 捷徑截圖中的清單。
- Google Sheet 只負責讀取庫存數量（B 欄品項、C 欄庫存）。
- 即使 Google Sheet 庫存讀取失敗，品項選單仍會立即正常顯示與使用。
- 庫存讀取改用 Google Visualization JSONP，避免一般瀏覽器跨網域 fetch 問題。
- 多品項複選、各自數量、拆成多筆 Google Form 回覆功能保留。
- 日後若要新增正式品項，只要修改 app.js 裡的 ITEMS 清單即可。
