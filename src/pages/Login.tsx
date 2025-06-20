import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogIn, UserPlus, Smartphone, Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ThemeToggle from '@/components/ThemeToggle';
import SelfieCapture from '@/components/SelfieCapture';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const { login, signup, isLoading, isAuthenticated } = useAuth();
  const [currentOperation, setCurrentOperation] = useState<'login' | 'signup' | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
        alert("Lütfen email ve şifrenizi girin.");
        return;
    }
    setCurrentOperation('login');
    await login(email, password);
    setCurrentOperation(null);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
        alert("Lütfen tüm alanları doldurun.");
        return;
    }
    if (!selfieFile) {
        alert("Lütfen kayıt olmak için bir selfie çekin.");
        return;
    }
    setCurrentOperation('signup');
    await signup(email, password, name, selfieFile);
    setCurrentOperation(null);
  };

  if (isAuthenticated && !isLoading) {
    return <Navigate to="/" replace />;
  }

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
          <CardTitle className="text-3xl font-bold text-center text-foreground">Hoş Geldiniz</CardTitle>
          <CardDescription className="text-center text-muted-foreground pb-2">
            QR Personel Takip Sistemine giriş yapın veya yeni hesap oluşturun.
          </CardDescription>
        </CardHeader>
        
        <Tabs defaultValue="login" className="w-full">
          <div className="px-6 sm:px-8 pb-2">
            <TabsList className="grid w-full grid-cols-2 bg-muted/60 p-1 h-auto rounded-lg">
              <TabsTrigger value="login" className="py-2.5 text-sm data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-md rounded-md">Giriş Yap</TabsTrigger>
              <TabsTrigger value="signup" className="py-2.5 text-sm data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-md rounded-md">Kayıt Ol</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="login" className="px-6 sm:px-8 pb-6 pt-4">
              <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email-login">Email Adresiniz</Label>
                  <Input
                  id="email-login"
                    type="email"
                    placeholder="ornek@sirket.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  className="h-11 text-base"
                  autoComplete="email"
                  disabled={isLoading && currentOperation === 'login'}
                  />
                </div>
              <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                  <Label htmlFor="password-login">Şifreniz</Label>
                  <Link to="/reset-password" className="text-xs text-primary hover:underline focus-visible:ring-1 focus-visible:ring-ring rounded-sm">
                    Şifremi Unuttum?
                    </Link>
                  </div>
                  <Input
                  id="password-login"
                    type="password"
                  placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  className="h-11 text-base"
                  autoComplete="current-password"
                  disabled={isLoading && currentOperation === 'login'}
                  />
                </div>
                <Button 
                  type="submit" 
                className="w-full text-base py-3 h-11 mt-2" 
                disabled={isLoading && currentOperation === 'login'}
                variant="default"
                >
                {isLoading && currentOperation === 'login' ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                  <LogIn className="mr-2 h-5 w-5" />
                )}
                Giriş Yap
                </Button>
              </form>
          </TabsContent>
          
          <TabsContent value="signup" className="px-6 sm:px-8 pb-6 pt-4">
              <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name-signup">Adınız Soyadınız</Label>
                  <Input
                  id="name-signup"
                    type="text"
                  placeholder="Ahmet Yılmaz"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  className="h-11 text-base"
                  autoComplete="name"
                  disabled={isLoading && currentOperation === 'signup'}
                  />
                </div>
              <div className="space-y-1.5">
                <Label htmlFor="email-signup">Email Adresiniz</Label>
                  <Input
                  id="email-signup"
                    type="email"
                    placeholder="ornek@sirket.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  className="h-11 text-base"
                  autoComplete="email"
                  disabled={isLoading && currentOperation === 'signup'}
                  />
                </div>
              <div className="space-y-1.5">
                <Label htmlFor="password-signup">Yeni Şifreniz</Label>
                  <Input
                  id="password-signup"
                    type="password"
                  placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  className="h-11 text-base"
                  autoComplete="new-password"
                  disabled={isLoading && currentOperation === 'signup'}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="selfie-capture">Selfie</Label>
                  <SelfieCapture 
                    onSelfieCaptured={(file) => setSelfieFile(file)}
                    required={true} 
                  />
                  {!selfieFile && (
                     <p className="text-xs text-destructive-foreground bg-destructive p-2 rounded-md mt-1 text-center">Kayıt olmak için selfie çekmek zorunludur.</p>
                  )}
                </div>
                <Button 
                  type="submit" 
                className="w-full text-base py-3 h-11 mt-2"
                disabled={(isLoading && currentOperation === 'signup') || !selfieFile}
                variant="default"
                >
                {isLoading && currentOperation === 'signup' ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                  <UserPlus className="mr-2 h-5 w-5" />
                  )}
                Hesap Oluştur
                </Button>
              </form>
          </TabsContent>
        </Tabs>

        <div className="px-6 sm:px-8 pb-4 pt-4 text-center">
          <a
            href="/app/QR_Login.apk"
            download="QR_Login.apk"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2 w-full mt-2 shadow-sm border border-input hover:border-primary/50"
          >
            <Download className="mr-2 h-5 w-5" />
            Mobil Uygulamayı İndir (APK)
          </a>
           <p className="text-xs text-muted-foreground mt-2">
            Android cihazlar için QR okuyucu uygulamamız.
          </p>
        </div>
        
        <CardFooter className="px-6 sm:px-8 pb-8 pt-4 border-t border-border/60 mt-2">
          <p className="text-xs text-muted-foreground text-center w-full">
            Bir sorun mu yaşıyorsunuz? <Link to="/contact-support" className="text-primary hover:underline">Destek ile iletişime geçin</Link>.
          </p>
        </CardFooter>
      </Card>
       <p className="text-xs text-muted-foreground text-center mt-8">
        &copy; {new Date().getFullYear()} QR Takip Sistemi. Tüm hakları saklıdır.
      </p>
    </div>
  );
};

export default Login;
