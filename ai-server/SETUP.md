# تشغيل AI Server على جهاز جديد

## المتطلبات
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) مثبّت وشغّال

## الخطوات

### 1. انسخي هذا المجلد على الجهاز الجديد
المجلد: `ai-server/`
يحتوي على:
- `app.py`
- `requirements.txt`
- `Dockerfile`
- `docker-compose.yml`
- `.env` ← **مهم: انسخيه يدوياً، لا يُرفع على GitHub**

### 2. شغّلي الـ container
```bash
cd ai-server
docker compose up --build
```
> المرة الأولى تأخذ دقيقة لتحميل المكتبات. المرات التالية أسرع.

### 3. تحقّقي أنه شغّال
افتحي المتصفح على:
```
http://localhost:5000/health
```
المفروض ترجع:
```json
{"status": "ok", "model": "qwen3.6-plus"}
```

---

## أوامر مفيدة

| الأمر | الوظيفة |
|-------|---------|
| `docker compose up -d` | تشغيل في الخلفية |
| `docker compose down` | إيقاف وحذف الـ container |
| `docker compose stop` | إيقاف مؤقت (بدون حذف) |
| `docker compose start` | إعادة تشغيل بعد stop |
| `docker compose restart` | إعادة تشغيل سريعة |
| `docker compose logs -f` | مشاهدة اللوقات live |
| `docker compose ps` | حالة الـ container |
| `docker compose up -d --build` | إعادة بناء بعد تعديل `app.py` |

---

## ملف .env
يجب أن يحتوي على:
```
DASHSCOPE_API_KEY=...
AI_MODEL=qwen3.6-plus
AI_FAST_MODEL=qwen3.6-plus
GAS_SCRIPT_URL=...
UPLOAD_SECRET=...
```
