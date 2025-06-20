import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

const ResetPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const { requestPasswordReset, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      // Toast already handles empty field if needed, or add specific alert
      // For now, rely on Supabase/useAuth error handling for invalid email format
      return;
    }
    const success = await requestPasswordReset(email);
    if (success) {
      setIsSubmitted(true);
      // Email state can be cleared if desired after submission
      // setEmail(''); 
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 selection:bg-primary/20 selection:text-primary">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md shadow-xl rounded-xl border-border/60">
        <CardHeader className="space-y-2 pt-8">
          <div className="flex justify-center mb-3">
            <img src="https://i.hizliresim.com/eh46dsr.png" alt="QR Takip Logo" className="h-16 object-contain" />
          </div>
          <CardTitle className="text-3xl font-bold text-center text-foreground">Şifre Sıfırla</CardTitle>
          {!isSubmitted ? (
            <CardDescription className="text-center text-muted-foreground pb-2">
              Hesabınıza ait e-posta adresini girin. Size şifrenizi sıfırlamanız için bir bağlantı göndereceğiz.
            </CardDescription>
          ) : (
            <CardDescription className="text-center text-green-600 dark:text-green-500 pb-2">
              E-posta adresinize bir şifre sıfırlama bağlantısı gönderildi. Lütfen gelen kutunuzu (ve spam klasörünü) kontrol edin.
            </CardDescription>
          )}
        </CardHeader>
        
        {!isSubmitted ? (
          <CardContent className="px-6 sm:px-8 pb-6 pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email-reset">Email Adresiniz</Label>
                <Input
                  id="email-reset"
                  type="email"
                  placeholder="ornek@sirket.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 text-base"
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full text-base py-3 h-11 mt-2" 
                disabled={isLoading || !email}
                variant="default"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-5 w-5" />
                )}
                Sıfırlama Bağlantısı Gönder
              </Button>
            </form>
          </CardContent>
        ) : (
          <CardContent className="px-6 sm:px-8 pb-6 pt-4 text-center">
            <p className="text-muted-foreground">
              Eğer 5 dakika içinde e-posta almazsanız, lütfen spam klasörünüzü kontrol edin veya <button onClick={() => setIsSubmitted(false)} className="text-primary hover:underline">tekrar deneyin</button>.
            </p>
          </CardContent>
        )}
        
        <CardFooter className="px-6 sm:px-8 pb-8 pt-4 border-t border-border/60 mt-2">
          <Button 
            variant="outline" 
            className="w-full text-base" 
            onClick={() => navigate('/login')}
            disabled={isLoading}
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Giriş Sayfasına Dön
          </Button>
        </CardFooter>
      </Card>
      <p className="text-xs text-muted-foreground text-center mt-8">
        &copy; {new Date().getFullYear()} QR Takip Sistemi. Tüm hakları saklıdır.
      </p>
    </div>
  );
};

export default ResetPasswordPage; 