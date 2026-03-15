import { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-secondary/20 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-serif)' }}>
            {title}
          </h1>
          <p className="text-muted-foreground text-lg">
            {subtitle}
          </p>
        </div>
        
        <div className="bg-card border border-border rounded-2xl shadow-xl p-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {children}
        </div>
        
        <p className="text-center text-sm text-muted-foreground mt-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Secured with Google OAuth 2.0
        </p>
      </div>
    </div>
  );
}
