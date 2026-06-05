# Medical Imaging System - Frontend

Hệ thống chuyển đổi X-ray sang CT scan sử dụng AI.

## 📋 Yêu cầu hệ thống

- Node.js >= 16.x
- npm >= 8.x
- Backend đang chạy (port 8999)
- Kong Gateway (nếu chạy production)

## 🚀 Cài đặt

```bash
# Clone repository
git clone <repository-url>
cd DoAnPtit_FrontEnd

# Cài đặt dependencies
npm install
```

## ⚙️ Cấu hình Environment

Có 3 file environment:

| File | Mục đích |
|------|----------|
| `.env` | Default + hướng dẫn sử dụng |
| `.env.development` | Development (npm start) |
| `.env.production` | Production (npm run build) |

## 🔧 Development Mode

**Sử dụng khi:** Phát triển, debug, test local

```bash
npm start
```

| Thông số | Giá trị |
|----------|---------|
| URL | http://localhost:3000 |
| API | http://localhost:8999 (trực tiếp) |
| Socket | http://localhost:8999 |
| Env file | `.env.development` |
| Hot reload | ✅ Có |

### Yêu cầu:
- Backend chạy ở port 8999
- Không cần Kong

```
┌─────────┐         ┌─────────┐
│ Browser │ ──────▶ │ Backend │
│  :3000  │         │  :8999  │
└─────────┘         └─────────┘
```

---

## 🚀 Production Mode (qua Kong)

**Sử dụng khi:** Deploy production, test integration với Kong

### Bước 1: Build

```bash
npm run build:kong
```

### Bước 2: Serve

```bash
# Cài đặt serve (nếu chưa có)
npm install -g serve

# Chạy
serve -s build -l 5000
```

### Bước 3: Truy cập

| Thông số | Giá trị |
|----------|---------|
| URL | http://localhost:8000/api/v1/fe/medical/ |
| API | http://localhost:8000/api/v1/medical (qua Kong) |
| Socket | http://localhost:8000/socket.io |
| Env file | `.env.production` |
| Hot reload | ❌ Không |

### Yêu cầu:
- Backend chạy ở port 8999
- Kong Gateway chạy ở port 8000
- Kong routes đã được cấu hình

```
┌─────────┐      ┌──────┐      ┌─────────┐
│ Browser │ ───▶ │ Kong │ ───▶ │ Backend │
│         │      │ :8000│      │  :8999  │
└─────────┘      └──────┘      └─────────┘
```

---

## 📦 Scripts

| Script | Mô tả |
|--------|-------|
| `npm start` | Chạy development server (port 3000) |
| `npm run build` | Build production (PUBLIC_URL=/) |
| `npm run build:kong` | Build production cho Kong (PUBLIC_URL=/api/v1/fe/medical) |
| `npm test` | Chạy tests |

---

## 🔌 Kong Gateway Setup

### Routes cần cấu hình:

| Route | Service | Strip Path |
|-------|---------|------------|
| `/api/v1/medical` | Backend :8999 | true |
| `/api/v1/fe/medical` | Frontend :5000 | true |
| `/socket.io` | Backend :8999 | false |

### Ví dụ tạo route qua Kong Admin API:

```bash
# Service cho Backend
curl -X POST http://localhost:8001/services \
  -d name=medical-api \
  -d url=http://host.docker.internal:8999

# Route cho API
curl -X POST http://localhost:8001/services/medical-api/routes \
  -d name=api-medical-route \
  -d paths[]=/api/v1/medical \
  -d strip_path=true

# Service cho Frontend
curl -X POST http://localhost:8001/services \
  -d name=medical-fe \
  -d url=http://host.docker.internal:5000

# Route cho Frontend
curl -X POST http://localhost:8001/services/medical-fe/routes \
  -d name=route-front-end-medical \
  -d paths[]=/api/v1/fe/medical \
  -d strip_path=true

# Route cho Socket.IO
curl -X POST http://localhost:8001/services/medical-api/routes \
  -d name=api-medical-socket \
  -d paths[]=/socket.io \
  -d strip_path=false
```

---

## 🐛 Troubleshooting

### 1. CORS Error

**Triệu chứng:** `Access to XMLHttpRequest blocked by CORS policy`

**Giải pháp:** Kiểm tra Backend đã thêm origin vào CORS config:
```python
# Backend config.py
cors_origins = [
    "http://localhost:3000",   # Development
    "http://localhost:8000",   # Kong
]
```

### 2. 404 Static Assets

**Triệu chứng:** favicon.svg, manifest.json trả về 404

**Giải pháp:** Đảm bảo dùng `npm run build:kong` (không phải `npm run build`)

### 3. Socket.IO không connect

**Triệu chứng:** WebSocket connection failed

**Giải pháp:**
- Kiểm tra Kong route `/socket.io` có `strip_path=false`
- Kiểm tra Backend Socket.IO CORS config

### 4. 307 Redirect Loop

**Triệu chứng:** Request bị redirect liên tục

**Giải pháp:** Backend cần có `redirect_slashes=False`:
```python
# Backend main.py
app = FastAPI(redirect_slashes=False)
```

---

## 📁 Cấu trúc thư mục

```
DoAnPtit_FrontEnd/
├── public/              # Static files
├── src/
│   ├── components/      # React components
│   ├── pages/           # Page components
│   ├── services/        # API services
│   │   ├── api.js       # Axios instance
│   │   └── socket.js    # Socket.IO client
│   ├── config/          # App configuration
│   └── App.jsx          # Main app
├── .env                 # Default env (hướng dẫn)
├── .env.development     # Development config
├── .env.production      # Production config
└── package.json
```

---

## 📞 Liên hệ

- Backend: [DoAnPtit_Backend](../DoAnPtit_Backend)
- Author: QuyDatSadBoy
