import { publicationDraft } from './publish-input.mjs';

const sdk = 'https://www.gstatic.com/firebasejs/13.4.0/';

export async function connect(config) {
  const { publishTrigger, ...firebaseConfig } = config;
  const [appModule, authModule, dbModule] = await Promise.all([
    import(sdk + 'firebase-app.js'),
    import(sdk + 'firebase-auth.js'),
    import(sdk + 'firebase-firestore.js'),
  ]);
  const app = appModule.initializeApp(firebaseConfig);
  const auth = authModule.getAuth(app);
  const database = dbModule.getFirestore(app);
  const workspace = dbModule.doc(database, 'private', 'author-workspace');

  return {
    observe: callback => authModule.onAuthStateChanged(auth, callback),
    signin(provider) {
      const instance = provider === 'github'
        ? new authModule.GithubAuthProvider()
        : new authModule.GoogleAuthProvider();
      return authModule.signInWithPopup(auth, instance);
    },
    async phone(number, element) {
      const verifier = new authModule.RecaptchaVerifier(auth, element);
      try {
        return await authModule.signInWithPhoneNumber(auth, number, verifier);
      } finally {
        verifier.clear();
      }
    },
    signout: () => authModule.signOut(auth),
    async submitPublication(user, draft) {
      const publication = publicationDraft(draft);
      const payload = new TextEncoder().encode(JSON.stringify([user.uid, publication]));
      const digest = await crypto.subtle.digest('SHA-256', payload);
      const id = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
      const document = dbModule.doc(database, 'publish-queue', id);
      try {
        await dbModule.setDoc(document, {
          ...publication, ownerUid: user.uid, status: 'pending', submittedAt: dbModule.serverTimestamp(),
        });
      } catch (error) {
        // An existing queued draft is immutable. Retry by reading that job.
        if (error.code !== 'permission-denied') throw error;
        const existing = await dbModule.getDocFromServer(document);
        if (!existing.exists() || existing.data().ownerUid !== user.uid) throw error;
      }
      let started = false;
      if (publishTrigger) {
        try {
          const token = await user.getIdToken();
          const response = await fetch(publishTrigger + '/publish/' + id, {
            method: 'POST', headers: { Authorization: 'Bearer ' + token },
            redirect: 'error', signal: AbortSignal.timeout(5000),
          });
          started = response.status === 202;
        } catch { /* The queued submission is already saved for the scheduled worker. */ }
      }
      return { id, started };
    },
    async publicationStatus(id) {
      if (!/^[a-f0-9]{64}$/.test(id)) throw new Error('任务编号无效。');
      const snapshot = await dbModule.getDocFromServer(dbModule.doc(database, 'publish-queue', id));
      if (!snapshot.exists()) throw new Error('找不到该提交任务。');
      const { status, commit, blobSha, reason } = snapshot.data();
      return { status, commit, blobSha, reason };
    },
    async workspace(user) {
      const { claims } = await user.getIdTokenResult();
      if (claims.firebase?.sign_in_provider !== 'github.com' ||
          !claims.firebase?.identities?.['github.com']?.includes('249088501')) return null;
      const snapshot = await dbModule.getDocFromServer(workspace);
      const html = snapshot.data()?.html;
      if (typeof html !== 'string' || !html.startsWith('<!doctype html>')) {
        throw new Error('作者工作台尚未配置。');
      }
      return html;
    },
  };
}
