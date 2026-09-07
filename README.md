# GitHub Pages 庫存進出表

這是一個純前端、免伺服器的庫存管理網頁。

## 功能
- 新增 / 編輯 / 刪除品項
- 設定安全庫存
- 入庫 / 出庫
- 防止出庫超過現有庫存
- 自動計算目前庫存
- 低庫存提醒
- 搜尋品項與進出紀錄
- CSV 匯出
- JSON 完整備份 / 還原
- 手機可用

## 如何放到 GitHub Pages
1. 在 GitHub 建立一個新的 Repository。
2. 把 `index.html`、`styles.css`、`app.js` 上傳到 Repository 根目錄。
3. 進入 Repository → Settings → Pages。
4. Source 選擇 `Deploy from a branch`。
5. Branch 選 `main`，資料夾選 `/root`。
6. 儲存後，GitHub 會提供 Pages 網址。

## 重要限制
目前資料儲存在瀏覽器 localStorage：
- 換手機 / 換電腦不會自動同步。
- 清除瀏覽器網站資料可能造成資料消失。
- 建議定期使用「完整備份 JSON」。
- 若需要多人共用、跨裝置同步，可再改成 Supabase / Firebase / Google Sheets 後端。
