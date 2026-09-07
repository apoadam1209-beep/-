# البيت الصامت — لعبة ألغاز سينمائية

نموذج أولي للعبة هروب وألغاز باللغة العربية.

## التشغيل الصحيح

لا تفتح ملف `index.html` من صفحة GitHub نفسها؛ GitHub يعرض الملف كنص/صفحة غير مكتملة، ولا يشغّل المشروع كاستضافة ويب.

### تشغيل محليًا

```bash
python3 -m http.server 4173
```

ثم افتح:

```text
http://localhost:4173
```

### النشر على GitHub Pages

1. ارفع أو ادمج فرع `arena/01a07941-repo` إلى `main`.
2. من المستودع افتح **Settings → Pages**.
3. اختر **Deploy from a branch**.
4. اختر فرع `main` والمجلد `/ (root)` ثم اضغط **Save**.
5. افتح الرابط الذي يظهر لك GitHub Pages، وليس رابط ملف `index.html` داخل GitHub.

يجب أن تبقى الملفات التالية في نفس المستوى:

- `index.html`
- `style.css`
- `app.js`
- مجلد `assets`
