import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiClientError } from '@/lib/api';
import { tokenStore } from '@/lib/tokenStore';
import type { ApiOk, AuthMe, AuthUser, TokenPair } from '@/types/api';

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => tokenStore.getUser());
  const [isLoading, setIsLoading] = useState(true);

  // Ao carregar a aplicação, revalida a sessão salva contra /auth/me — cobre
  // o caso de o token ter sido revogado ou a conta desativada nesse meio-tempo.
  useEffect(() => {
    const accessToken = tokenStore.getAccessToken();
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    api
      .get<ApiOk<AuthMe>>('/auth/me')
      .then((res) => {
        setUser({ id: res.data.id, email: res.data.email, role: res.data.role });
      })
      .catch(() => {
        tokenStore.clear();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(input: LoginInput) {
    const res = await api.post<ApiOk<{ user: AuthUser } & TokenPair>>('/auth/login', input, { skipAuth: true });
    tokenStore.setSession(res.data.accessToken, res.data.refreshToken, res.data.user);
    setUser(res.data.user);
  }

  async function register(input: RegisterInput) {
    const res = await api.post<ApiOk<{ user: AuthUser } & TokenPair>>('/auth/register', input, { skipAuth: true });
    tokenStore.setSession(res.data.accessToken, res.data.refreshToken, res.data.user);
    setUser(res.data.user);
  }

  function logout() {
    tokenStore.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}

export { ApiClientError };
