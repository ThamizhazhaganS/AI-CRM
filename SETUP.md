# 🏠 ABC Builders — AI Voice Agent CRM
## How to Start the Software

---

## ▶️ EVERY DAY — Full Startup (Copy-Paste These)

Open a terminal in VS Code (`Ctrl + backtick`) inside `d:\TRY 1 Call` and run these **3 commands in order**:

### 1️⃣ Clear any old processes
```powershell
Get-Process -Name "node","uvicorn","python" -ErrorAction SilentlyContinue | Stop-Process -Force
```

### 2️⃣ Start the app
```powershell
npm run prod
```
Wait until you see: `✓ Ready in ~1300ms`

### 3️⃣ Start the phone tunnel (open a 2nd terminal)
```powershell
C:\Users\kayal\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe http 8000
```
> After this, tell Antigravity **"restart the tunnel"** and it will auto-update Twilio.

### 4️⃣ Open the dashboard
```
http://localhost:3000
```

---

## 📞 Making Calls

| Method | How |
|---|---|
| **Real phone call** | Dial `+1 (659) 276-5057` |
| **Browser demo** | Click **"Live AI Demo Dialer"** button (bottom-right of dashboard) |

---

## 🔄 After Editing Any Code File

```powershell
Get-Process -Name "node","uvicorn","python" -ErrorAction SilentlyContinue | Stop-Process -Force
npm run build
npm run prod
```

---

## 📋 Command Reference

| Command | Purpose |
|---|---|
| `npm run prod` | ✅ Start the app (use every day) |
| `npm run build` | Recompile after code changes |
| `npm run dev` | Slow dev mode (avoid) |

---

## 🔑 Important Info

| Item | Value |
|---|---|
| **Dashboard** | http://localhost:3000 |
| **Backend API** | http://localhost:8000 |
| **Twilio Phone** | +1 (659) 276-5057 |
| **ngrok Dashboard** | http://localhost:4040 |
