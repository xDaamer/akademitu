import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import './index.css';

/*
 * AuthProvider BrowserRouter'ın İÇİNDE: sağladığı fonksiyonlar (giriş sonrası
 * yönlendirme gibi) router bağlamına ihtiyaç duyabiliyor.
 *
 * Kök seviyede duruyor çünkü açılışta bir kez /api/auth/me çağrılıyor ve
 * yalnızca portal route'larında sağlanırsa, portala geçişte oturum durumu
 * sıfırdan sorulmak zorunda kalırdı. Anonim ziyaretçi için maliyeti tek bir
 * 401; karşılığında oturum bilgisi tüm uygulamada hazır (header'a "hesabım"
 * eklemek gibi bir sonraki adımlar için de gerekli).
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
