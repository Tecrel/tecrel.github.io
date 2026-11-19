const sdk = 'https://www.gstatic.com/firebasejs/13.4.0/';

export async function connect(config) {
  const [appModule, authModule, dbModule] = await Promise.all([
    import(sdk + 'firebase-app.js'),
    import(sdk + 'firebase-auth.js'),
    import(sdk + 'firebase-firestore.js'),
  ]);
  const app = appModule.initializeApp(config);
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
