import React, { useState, useEffect, ChangeEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  getCurrentEmployee, 
  updateEmployee, 
  Employee, 
  uploadAvatar
} from '@/services/supabaseService';
import { Loader2, User, Save, Paintbrush, UploadCloud, XCircle } from 'lucide-react';

const Profile = () => {
  const { 
    user, 
    isAuthenticated, 
    isLoading: authLoading, 
    updateUserMetadata
  } = useAuth();
  const { theme } = useTheme();
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // State for avatar upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const data = await getCurrentEmployee(user);
        if (data) {
          setEmployeeData(data);
          setName(data.name);
          setEmail(data.email);
          // Set initial preview to existing avatar
          if (data.avatar_url) {
            setPreviewUrl(data.avatar_url);
          } else if (user.user_metadata?.avatar_url) { // Fallback to auth user metadata avatar
            setPreviewUrl(user.user_metadata.avatar_url);
          }
        }
      } catch (error) {
        console.error('Çalışan bilgileri yüklenirken hata:', error);
        toast({
          title: 'Veri Yükleme Hatası',
          description: 'Profil bilgileri yüklenirken bir sorun oluştu.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchEmployeeData();
    }
  }, [user, toast]);

  // Effect to update preview when user object from useAuth changes (e.g. after metadata update)
  useEffect(() => {
    if (user?.user_metadata?.avatar_url && !selectedFile) {
      setPreviewUrl(user.user_metadata.avatar_url);
    } else if (employeeData?.avatar_url && !selectedFile) {
      setPreviewUrl(employeeData.avatar_url);
    }
  }, [user?.user_metadata?.avatar_url, employeeData?.avatar_url, selectedFile]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      if (!isEditing) setIsEditing(true); // Auto-enable editing mode if a file is selected
    } else {
      setSelectedFile(null);
      // Revert to original avatar if file selection is cancelled
      setPreviewUrl(employeeData?.avatar_url || user?.user_metadata?.avatar_url || null);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setName(employeeData?.name || '');
    setEmail(employeeData?.email || '');
    setSelectedFile(null);
    setPreviewUrl(employeeData?.avatar_url || user?.user_metadata?.avatar_url || null);
  };

  // Redirect if not authenticated
  if (!isAuthenticated && !authLoading) {
    return <Navigate to="/login" replace />;
  }

  const handleSaveProfile = async () => {
    if (!employeeData || !user) return;
    
    try {
      setIsSaving(true);
      let newAvatarUrl = employeeData.avatar_url; // Keep existing by default

      // 1. Upload new avatar if selected
      if (selectedFile) {
        // Pass user.id (auth_id) for RLS and path consistency in storage
        const uploadedUrl = await uploadAvatar(user.id, selectedFile);
        if (uploadedUrl) {
          newAvatarUrl = uploadedUrl;
        } else {
          // Avatar upload failed, but profile info might still be saved
          // Or you can choose to stop the entire save process
          toast({
            title: 'Avatar Yükleme Başarısız',
            description: 'Avatar yüklenemedi ancak diğer bilgiler kaydedilebilir.',
            variant: 'destructive',
          });
          // throw new Error("Avatar upload failed"); // Uncomment to stop if avatar is critical
        }
      }

      // 2. Prepare employee data updates
      const updates: Partial<Employee> = {
        name,
        email,
      };
      if (newAvatarUrl !== employeeData.avatar_url) {
        updates.avatar_url = newAvatarUrl;
      }

      // 3. Update employee record in the database (if there are changes)
      let dbUpdatedEmployee = employeeData;
      if (name !== employeeData.name || email !== employeeData.email || updates.avatar_url) {
        const updated = await updateEmployee(employeeData.id, updates);
        if (updated) {
          dbUpdatedEmployee = updated;
          setEmployeeData(updated); // Update local employee state
        } else {
          throw new Error("Profil veritabanında güncellenemedi.");
        }
      }
      
      // 4. Update Supabase Auth user metadata (if avatar changed)
      if (newAvatarUrl && newAvatarUrl !== user.user_metadata?.avatar_url) {
        await updateUserMetadata({ avatar_url: newAvatarUrl });
        // The useAuth hook's onAuthStateChange will update the user object, triggering Navbar update.
      }

      setIsEditing(false);
      setSelectedFile(null); // Clear selected file after successful save
      // Preview URL will be updated by useEffect watching user.user_metadata.avatar_url or employeeData.avatar_url
      setPreviewUrl(newAvatarUrl); // Explicitly set preview URL after successful save

      toast({
        title: 'Profil Güncellendi',
        description: 'Profil bilgileriniz başarıyla güncellendi.',
      });

    } catch (error: any) {
      console.error('Profil güncellenirken hata:', error);
      toast({
        title: 'Güncelleme Hatası',
        description: 'Profil bilgileriniz güncellenirken bir sorun oluştu.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500 mb-4" />
            <p className="text-muted-foreground">Profil bilgileri yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Profilim</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Paintbrush className="w-4 h-4 mr-2" />
              <span className="text-sm mr-2 text-muted-foreground">Tema:</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sol Kart - Profil Özeti */}
          <Card className="md:col-span-1">
            <CardHeader className="flex flex-col items-center">
              <div className="relative group">
                <Avatar className="h-24 w-24 mb-2 cursor-pointer" onClick={() => document.getElementById('avatar-upload-input')?.click()}>
                  <AvatarImage src={previewUrl || ''} alt={employeeData?.name} />
                  <AvatarFallback className="text-2xl bg-brand-500 text-white">
                    {(employeeData?.name || user?.email || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <label 
                    htmlFor="avatar-upload-input" 
                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <UploadCloud className="w-8 h-8 text-white" />
                  </label>
                )}
              </div>
              <input 
                type="file" 
                id="avatar-upload-input" 
                accept="image/*" 
                onChange={handleFileChange}
                className="hidden"
                disabled={!isEditing && !selectedFile} // Allow change if editing or if a new file is already selected (to change selection)
              />
              {selectedFile && isEditing && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-1 text-xs text-red-500 hover:text-red-700"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(employeeData?.avatar_url || user?.user_metadata?.avatar_url || null);
                  }}
                >
                  <XCircle className="w-3 h-3 mr-1" /> Seçimi İptal Et
                </Button>
              )}

              <CardTitle className="mt-2">{employeeData?.name || user?.email}</CardTitle>
              <CardDescription>{employeeData?.email || user?.email}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-sm text-muted-foreground mb-1">Rol</div>
              <div className="font-medium mb-4">
                {employeeData?.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}
              </div>
              
              <div className="text-sm text-muted-foreground mb-1">Departman</div>
              <div className="font-medium">
                {employeeData?.department_id ? 'Departman Bilgisi' : 'Belirtilmemiş'}
              </div>
            </CardContent>
          </Card>
          
          {/* Sağ Kart - Profil Düzenleme */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Profil Bilgileri</CardTitle>
              <CardDescription>
                Kişisel bilgilerinizi buradan görüntüleyebilir ve düzenleyebilirsiniz.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Ad Soyad</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Ad Soyad"
                  className="dark:bg-muted/20"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isEditing}
                  placeholder="E-posta adresi"
                  className="dark:bg-muted/20"
                />
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <Label>Hesap Bilgileri</Label>
                <div className="rounded-md bg-muted/40 dark:bg-muted/20 p-4 text-sm">
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Kullanıcı ID:</span>
                    <span className="font-mono">{employeeData?.id.substring(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hesap Oluşturma:</span>
                    <span>{new Date(employeeData?.created_at || '').toLocaleDateString('tr-TR')}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-muted-foreground">Tema Ayarı:</span>
                    <span className="capitalize">{theme} Mod</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-4">
              {isEditing ? (
                <>
                  <Button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="bg-transparent border border-input hover:bg-accent hover:text-accent-foreground"
                  >
                    İptal
                  </Button>
                  <Button 
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Kaydediliyor
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Kaydet
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => setIsEditing(true)}
                >
                  <User className="mr-2 h-4 w-4" />
                  Profili Düzenle
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile; 