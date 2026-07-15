import { api, auth, entities, uploadFile } from './apiClient';

const db = {
  auth: {
    isAuthenticated: async () => auth.isAuthenticated(),
    me: async () => auth.me(),
    login: async (email, password) => auth.login(email, password),
    register: async (userData) => auth.register(userData),
    logout: async () => {
      await auth.logout();
      window.location.href = '/login';
    },
    redirectToLogin: (returnUrl) => {
      const loginUrl = returnUrl ? `/login?return=${encodeURIComponent(returnUrl)}` : '/login';
      window.location.href = loginUrl;
    },
    forgotPassword: (email) => auth.forgotPassword(email),
    resetPassword: (token, password) => auth.resetPassword(token, password),
  },
  entities,
  integrations: {
    Core: {
      UploadFile: ({ file }) => uploadFile(file),
    },
  },
};

export { db };
export default db;
