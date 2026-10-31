/* ============================================================
   طبقة Firebase المشتركة: الحسابات + الطلبات
   بتعرّف window.CL وبتبعت event "cl-ready" لما تجهز.
   ============================================================ */
const SDK = "https://www.gstatic.com/firebasejs/10.12.2";
const cfg = window.FIREBASE_CONFIG || {};
const ADMINS = (window.ADMIN_EMAILS || []).map((e) => e.toLowerCase());

const CL = { enabled: false, user: null, profile: null };
const listeners = new Set();

if (cfg.apiKey) {
  try {
    const [{ initializeApp }, A, F] = await Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-auth.js`),
      import(`${SDK}/firebase-firestore.js`),
    ]);
    const app = initializeApp(cfg);
    const auth = A.getAuth(app);
    const db = F.getFirestore(app);
    const errMsg = (e) => ({
      "auth/invalid-credential": "الإيميل أو الباسورد غلط.",
      "auth/wrong-password": "الباسورد غلط.",
      "auth/user-not-found": "مفيش حساب بالإيميل ده.",
      "auth/email-already-in-use": "الإيميل ده عليه حساب بالفعل — جرّب تسجّل دخول.",
      "auth/weak-password": "الباسورد لازم يكون 6 حروف على الأقل.",
      "auth/invalid-email": "الإيميل مش مكتوب صح.",
      "auth/popup-closed-by-user": "اتقفلت نافذة Google قبل ما تكمل.",
      "auth/too-many-requests": "محاولات كتير — استنى شوية وجرّب تاني.",
      "auth/unauthorized-domain": "الدومين ده مش متضاف في Firebase (Authorized domains).",
      "permission-denied": "مش مسموحلك بالعملية دي.",
    }[e.code] || "حصلت مشكلة، جرّب تاني.");
    const wrap = (fn) => async (...a) => { try { return await fn(...a); } catch (e) { console.error(e); throw new Error(errMsg(e)); } };

    Object.assign(CL, {
      enabled: true,
      isAdmin: (u = CL.user) => !!u && !!u.email && u.emailVerified && ADMINS.includes(u.email.toLowerCase()),

      signIn: wrap((email, pass) => A.signInWithEmailAndPassword(auth, email, pass)),
      signUp: wrap(async (name, email, pass) => {
        const { user } = await A.createUserWithEmailAndPassword(auth, email, pass);
        await A.updateProfile(user, { displayName: name });
        await F.setDoc(F.doc(db, "users", user.uid), { name, email, createdAt: F.serverTimestamp() }, { merge: true });
        await user.reload();
        CL.user = auth.currentUser;
        CL.profile = { ...CL.profile, name, email };
        emit();
      }),
      google: wrap(() => A.signInWithPopup(auth, new A.GoogleAuthProvider())),
      resetPassword: wrap((email) => A.sendPasswordResetEmail(auth, email)),
      signOut: () => A.signOut(auth),

      saveProfile: wrap(async (data) => {
        await F.setDoc(F.doc(db, "users", CL.user.uid), { ...data, updatedAt: F.serverTimestamp() }, { merge: true });
        CL.profile = { ...CL.profile, ...data };
      }),

      createOrder: wrap(async (order) => {
        const number = "CL-" + Date.now().toString(36).toUpperCase().slice(-6);
        await F.addDoc(F.collection(db, "orders"), {
          ...order, number, uid: CL.user.uid, email: CL.user.email || "",
          status: "جديد", createdAt: F.serverTimestamp(),
        });
        return number;
      }),
      cancelOrder: wrap((id) => F.updateDoc(F.doc(db, "orders", id), { status: "ملغي", updatedAt: F.serverTimestamp() })),

      // live lists — callback gets [{id, ...data}] newest first
      watchMyOrders(cb, onErr) {
        const q = F.query(F.collection(db, "orders"), F.where("uid", "==", CL.user.uid));
        return F.onSnapshot(q, (s) => cb(sortDocs(s)), (e) => onErr?.(errMsg(e)));
      },
      watchAllOrders(cb, onErr) {
        const q = F.query(F.collection(db, "orders"), F.orderBy("createdAt", "desc"), F.limit(500));
        return F.onSnapshot(q, (s) => cb(sortDocs(s), s.docChanges()), (e) => onErr?.(errMsg(e)));
      },
      setStatus: wrap((id, status) => F.updateDoc(F.doc(db, "orders", id), { status, updatedAt: F.serverTimestamp() })),
    });

    function sortDocs(s) {
      return s.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }))
        .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    }

    await new Promise((resolve) => {
      A.onAuthStateChanged(auth, async (u) => {
        CL.user = u;
        CL.profile = null;
        if (u) {
          try { const snap = await F.getDoc(F.doc(db, "users", u.uid)); CL.profile = snap.exists() ? snap.data() : {}; }
          catch { CL.profile = {}; }
        }
        emit();
        resolve();
      });
    });
  } catch (e) {
    console.error("Firebase failed to load", e);
    CL.enabled = false;
  }
}

function emit() { listeners.forEach((cb) => cb(CL.user)); }
CL.onUser = (cb) => { listeners.add(cb); cb(CL.user); return () => listeners.delete(cb); };
CL.isAdmin ||= () => false;

window.CL = CL;
document.dispatchEvent(new Event("cl-ready"));
