import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { apiFetch, ApiRequestError, hasSessionHint } from '../lib/api';

/*
 * OTURUM DURUMU
 * ============================================================================
 * Burada JETON TUTULMUYOR ve tutulamaz: access/refresh token httpOnly çerezde,
 * JavaScript'in erişemeyeceği yerde. Bu context yalnızca "kim giriş yapmış"
 * sorusunun cevabını taşıyor; cevabı da sunucuya sorarak (/api/auth/me)
 * alıyor. Sayfa yenilendiğinde oturumun ayakta kalmasını sağlayan şey
 * localStorage değil, çerezin kendisi.
 */

export interface PortalUser {
  id: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
}

interface SignUpInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  website: string;
}

interface SignUpResult {
  /** E-posta doğrulaması açıksa true: hesap açıldı ama giriş için onay gerek. */
  requiresEmailConfirmation: boolean;
}

interface AuthContextValue {
  user: PortalUser | null;
  /** İlk /api/auth/me cevabı gelene kadar true. */
  isLoading: boolean;
  login: (phone: string, password: string, website: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<SignUpResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /*
   * Açılışta oturum sorgulanıyor. 401 bir HATA DEĞİL, "giriş yapılmamış"
   * demek — bu yüzden sessizce yutuluyor; konsola hata basmak her anonim
   * ziyaretçide gürültü yaratırdı.
   */
  useEffect(() => {
    let cancelled = false;

    /*
     * Hiç oturum açılmamışsa sunucuya hiç sorulmuyor. Bu site ağırlıklı olarak
     * anonim ziyaretçi alıyor; onlar için /api/auth/me + /api/auth/refresh +
     * tekrar /api/auth/me üç boşa istek demekti.
     */
    if (!hasSessionHint()) {
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    apiFetch<{ user: PortalUser }>('/api/auth/me', { skipRefresh: false })
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (phone: string, password: string, website: string) => {
    const data = await apiFetch<{ user: PortalUser }>('/api/auth/login', {
      method: 'POST',
      body: { phone, password, website },
      /* Giriş isteğinin 401'i "şifre yanlış" demek; yenileme denemek anlamsız
         ve kullanıcıya gösterilecek mesajı geciktirirdi. */
      skipRefresh: true,
    });
    setUser(data.user);
  }, []);

  const signUp = useCallback(async (input: SignUpInput): Promise<SignUpResult> => {
    const data = await apiFetch<{
      requiresEmailConfirmation?: boolean;
      user?: PortalUser;
    }>('/api/auth/signup', {
      method: 'POST',
      body: input,
      skipRefresh: true,
    });

    if (data.user) setUser(data.user);

    return { requiresEmailConfirmation: Boolean(data.requiresEmailConfirmation) };
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST', skipRefresh: true });
    } catch (err) {
      /* Sunucu tarafı iptal başarısız olsa da kullanıcı çıkmış sayılmalı:
         çerezleri sunucu her hâlükârda siliyor (bkz. routes/auth.ts). */
      if (!(err instanceof ApiRequestError)) throw err;
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, login, signUp, logout }),
    [user, isLoading, login, signUp, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth yalnızca <AuthProvider> içinde kullanılabilir.');
  }
  return context;
}
