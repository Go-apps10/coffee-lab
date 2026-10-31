# Coffee Lab — دليل التشغيل والنشر

## الملفات
| الملف | فيه إيه |
|---|---|
| `index.html` | محتوى الموقع (النصوص، الأقسام، الأسئلة الشائعة) |
| `styles.css` | الشكل والألوان |
| `config.js` | **رقم الواتساب، الأسعار، التوليفات، الشحن، وبصمة نكهة كل نوع بن** — عدّل من هنا |
| `script.js` | السلة وإرسال الطلب (مش محتاج تلمسه) |
| `lab.js` + `lab.css` | تجربة المعمل التفاعلية: العينات ← التحميص ← الطحن ← التحليل |
| `favicon.svg` | أيقونة التاب |
| `firebase-config.js` | **مفاتيح Firebase وإيميل الأدمن** — لازم تملاه عشان الحسابات تشتغل |
| `firebase.js` + `common.js` | الاتصال بـ Firebase (الحسابات والطلبات) |
| `account.html` + `account.js` | صفحة العميل: تسجيل دخول، بياناته، ومتابعة طلباته |
| `admin.html` + `admin.js` | لوحة الأدمن: كل الطلبات مباشر، تغيير الحالة، الإحصائيات |
| `pages.css` | شكل صفحات الحساب والأدمن |
| `firestore.rules` | قواعد الأمان لقاعدة البيانات (بتتنسخ في Firebase) |

## قبل النشر — لازم تعمل الحاجات دي
1. **`config.js`** → حط رقم الواتساب بتاعك (`whatsapp: "2010xxxxxxxx"`)، والإنستجرام والإيميل.
2. **`config.js`** → راجع أسعار التوليفات، سعر الشحن، وحد الشحن المجاني.
3. **`index.html`** → شيل قسم "آراء تجريبية" أو حط آراء حقيقية.
4. راجع سياسة المرتجع ومدة التوصيل في الأسئلة الشائعة.

## النشر (مجاني — 5 دقايق) عن طريق Netlify
1. ادخل https://app.netlify.com/drop واعمل حساب.
2. اسحب فولدر `coffee-lab` كله وارميه في الصفحة.
3. هيديك لينك زي `coffee-lab-123.netlify.app` — الموقع شغال.
4. من **Site settings → Change site name** غيّر الاسم لـ `coffeelab-eg` مثلاً.

بدائل: Cloudflare Pages أو GitHub Pages (نفس الفكرة، مجانيين).

## دومين خاص (اختياري ~ 500–800 ج.م/سنة)
1. اشتري دومين `coffeelab.com` أو `.store` أو `.eg` من Namecheap / GoDaddy.
2. في Netlify: **Domain management → Add a domain** وامشي على الخطوات (بيدّيك DNS تحطه عند شركة الدومين).
3. الـ HTTPS بيتفعّل لوحده.

## إزاي الطلبات بتوصل
- **قبل تفعيل Firebase:** العميل يملا السلة ← يكتب بياناته ← يتفتح واتساب برسالة جاهزة فيها الطلب ← يبعتها لرقمك.
- **بعد تفعيل Firebase:** العميل لازم يسجل دخول ← الطلب بيتحفظ في قاعدة البيانات ← بيظهر فوراً في `admin.html` بصوت تنبيه ← العميل بيتابع حالته من `account.html`.

## تفعيل الحسابات ولوحة الأدمن (Firebase — مجاني)
1. ادخل https://console.firebase.google.com واعمل **Add project** باسم `coffee-lab` (Google Analytics مش ضروري).
2. **Build → Authentication → Get started**، وفعّل:
   - **Email/Password**
   - **Google** (اختار إيميل الدعم وحفظ)
3. في **Authentication → Settings → Authorized domains** دوس **Add domain** وضيف: `go-apps10.github.io`
4. **Build → Firestore Database → Create database** ← اختار مكان قريب (مثلاً `europe-west`) ← **Start in production mode**.
5. في **Firestore → Rules**: امسح الموجود، الصق محتوى ملف `firestore.rules`، غيّر `admin@example.com` لإيميلك، ودوس **Publish**.
6. **Project settings (⚙️) → General → Your apps → أيقونة `</>` (Web)** ← سمّيه أي اسم ← هيظهرلك `firebaseConfig`.
   انسخ القيم دي في `firebase-config.js` (الـ apiKey ده عادي يبقى في الموقع، مش سر — الحماية من الـ rules).
7. في `firebase-config.js` غيّر `admin@example.com` لنفس إيميلك.
8. ارفع التعديلات، وادخل على `admin.html` وسجل دخول **بحساب Google** بإيميل الأدمن.

> ⚠️ الأسعار بتتحسب في المتصفح، فراجع إجمالي أي طلب في اللوحة قبل ما تأكده مع العميل.

## مراحل جاية (لما الشغل يكبر)
- **دفع أونلاين بالفيزا:** Paymob أو Fawry أو Kashier — محتاجين سجل تجاري وبطاقة ضريبية، وساعتها الموقع هيحتاج باك إند بسيط.
- **صور حقيقية:** صوّر أكياس البن وحطها بدل الرسومات (ممكن نعدلها سوا).
- **Google Analytics / Meta Pixel** لو هتعمل إعلانات.
