export interface LoginResponse {
  success?: boolean;
  message?: string;
  user?: {
    login: string;
    role: string;
    blocked?: boolean;
  };
  requires2FA?: boolean;
  requiresGoogleAuth?: boolean;
  blocked?: boolean;  
}