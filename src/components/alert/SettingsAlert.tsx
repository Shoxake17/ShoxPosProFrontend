// components/alert/SettingsAlert.tsx
import { toast, ToastOptions } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

type Theme = 'dark' | 'light';
type TFunc = (key: string) => string;

const baseOptions = (theme: Theme): ToastOptions => ({
  position: 'top-right',
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: theme === 'dark' ? 'dark' : 'light',
});

// ✅ Sessiya tugadi
export const alertSessionExpired = (theme: Theme, t: TFunc) => {
  toast.error(t('sessionExpired'), {
    ...baseOptions(theme),
    autoClose: 4000,
  });
};

// ✅ Force logout
export const alertForceLogout = (theme: Theme, t: TFunc) => {
  toast.error(t('forceLogout'), {
    ...baseOptions(theme),
    autoClose: 3000,
  });
};

// ✅ Til o'zgartirildi
export const alertLanguageChanged = (theme: Theme, t: TFunc, langDisplay: string) => {
  toast.success(`${t('languageChanged')}: ${langDisplay}`, {
    ...baseOptions(theme),
    autoClose: 3000,
  });
};

// ✅ Umumiy muvaffaqiyat xabari
export const alertSuccess = (theme: Theme, message: string) => {
  toast.success(message, {
    ...baseOptions(theme),
    autoClose: 4000,
  });
};

// ✅ Umumiy xato xabari
export const alertError = (theme: Theme, message: string) => {
  toast.error(message, {
    ...baseOptions(theme),
    autoClose: 4000,
  });
};
