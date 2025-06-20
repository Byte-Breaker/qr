import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LogEntry } from '@/services/supabaseService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Camera, X, Zap, CheckCircle, AlertTriangle, InfoIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats, Html5QrcodeResult } from 'html5-qrcode';
import { cn } from '@/lib/utils';

// TransactionType for QR data mapping
export type TransactionType = 'check-in' | 'check-out' | 'lunch-start' | 'lunch-end';

const mapQrDataToTransactionType = (qrData: string): TransactionType | null => {
  const lowerQrData = qrData.toLowerCase().trim();
  if (lowerQrData === 'check-in' || lowerQrData === 'entry') return 'check-in';
  if (lowerQrData === 'check-out' || lowerQrData === 'exit') return 'check-out';
  if (lowerQrData === 'lunch-start') return 'lunch-start';
  if (lowerQrData === 'lunch-end') return 'lunch-end';
  try {
    const jsonData = JSON.parse(qrData);
    if (jsonData && typeof jsonData.type === 'string') {
      const type = jsonData.type.toLowerCase() as TransactionType;
      if (['check-in', 'check-out', 'lunch-start', 'lunch-end'].includes(type)) {
        return type;
      }
    }
  } catch (e) { /* Not JSON or wrong format */ }
  console.warn("QR Data did not map to a known TransactionType:", qrData);
  return null;
};

interface QRScannerProps {
  onSuccessfulScan: (type: TransactionType, decodedText: string) => void;
  employeeId?: string | null;
  latestLog?: LogEntry | null;
}

const QRScanner: React.FC<QRScannerProps> = ({ onSuccessfulScan, employeeId, latestLog }) => {
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const { toast } = useToast();
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerRegionId = `qr-scanner-region-${Math.random().toString(36).substring(7)}`;

  const stopScanner = useCallback(() => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
      html5QrCodeRef.current.stop()
        .then(() => console.log("QR Scanner stopped."))
        .catch(err => console.error("Error stopping QR scanner:", err));
    }
    html5QrCodeRef.current = null;
  }, []);

  useEffect(() => {
    let didCancel = false;

    if (isScannerActive) {
      setScanResult(null);
      const scannerRegionElement = document.getElementById(scannerRegionId);
      if (!scannerRegionElement) {
        console.error("Scanner region element not found:", scannerRegionId);
        setCameraError("QR Tarayıcı alanı oluşturulamadı.");
        setIsScannerActive(false);
        return;
      }

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(
          scannerRegionId,
          { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false }
        );
      }
      const currentScanner = html5QrCodeRef.current;

      const qrCodeSuccessCallback = (decodedText: string, decodedResult: Html5QrcodeResult) => {
        if (didCancel) return;
        console.log(`QR Code detected: ${decodedText}`, decodedResult);
        setIsScannerActive(false);

        const transactionType = mapQrDataToTransactionType(decodedText);
        if (transactionType) {
          if (latestLog) {
            if (latestLog.type === 'check-in' && transactionType === 'check-in') {
              setScanResult({type: 'error', message: 'Zaten giriş yaptınız. Önce çıkış yapın veya mola başlatın.'});
              return;
            }
            if (latestLog.type === 'check-out' && (transactionType === 'check-out' || transactionType === 'lunch-start' || transactionType === 'lunch-end')) {
              setScanResult({type: 'error', message: 'Zaten çıkış yaptınız. Yeni bir işlem için önce giriş yapın.'});
              return;
            }
          }

          onSuccessfulScan(transactionType, decodedText);
          setScanResult({type: 'success', message: `${transactionType} işlemi için veri alındı.`});
        } else {
          setScanResult({type: 'error', message: 'Geçersiz QR Kod. Lütfen doğru bir kod tarayın.'});
        }
      };

      const qrCodeErrorCallback = (errorMessage: string) => { /* console.warn(errorMessage) */ };

      const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
      
      if (currentScanner.getState() !== Html5QrcodeScannerState.SCANNING) {
        currentScanner.start({ facingMode: "environment" }, config, qrCodeSuccessCallback, qrCodeErrorCallback)
          .then(() => {
            if (didCancel) return;
          setCameraError(null);
            console.log("QR Scanner started.");
          })
          .catch((err: any) => {
            if (didCancel) return;
            console.error("QR Scanner start error:", err);
            let msg = "Kamera başlatılamadı.";
            if (typeof err === 'string' && err.toLowerCase().includes("permission denied")) {
              msg = "Kamera izni reddedildi. Tarayıcı ayarlarını kontrol edin.";
            } else if (err.name === 'NotAllowedError') {
              msg = "Kamera erişim izni verilmedi.";
          } else if (err.message) {
              msg = err.message;
          }
            setCameraError(msg);
          setIsScannerActive(false);
        });
      }

      return () => {
        didCancel = true;
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isScannerActive, onSuccessfulScan, scannerRegionId, latestLog, stopScanner]);

  const handleStartScan = () => {
    if (!employeeId) {
      toast({ title: "Hata", description: "Çalışan ID'si bulunamadı. Lütfen tekrar giriş yapın.", variant: "destructive" });
      return;
    }
    setCameraError(null);
    setScanResult(null);
    setIsScannerActive(true);
  };

  const handleStopScan = () => setIsScannerActive(false);

  return (
    <Card className="bg-card rounded-xl shadow-lg border border-border/60 flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-foreground">QR Kod ile İşlem</CardTitle>
        <CardDescription className="text-sm">
          Giriş/çıkış veya mola işlemleri için QR kodunuzu taratın.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow flex flex-col items-center justify-center space-y-4 p-4 sm:p-6">
        <div id={scannerRegionId} className={cn("w-full max-w-xs aspect-square rounded-lg overflow-hidden bg-muted/30 border-2 border-dashed border-border", isScannerActive ? "border-primary/50" : "")}>
          {!isScannerActive && !cameraError && !scanResult && (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center cursor-default">
              <Camera className="size-16 text-muted-foreground/70 mb-4" strokeWidth={1.5}/>
              <p className="text-base font-medium text-muted-foreground">Taramayı başlatmak için butona tıklayın.</p>
            </div>
          )}
        </div>
        
        {scanResult && !isScannerActive && (
          <div className={cn("w-full max-w-xs p-3 rounded-md text-center text-sm font-medium", 
                            scanResult.type === 'success' ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400")}>
            {scanResult.type === 'success' ? <CheckCircle className="inline mr-2 h-5 w-5"/> : <AlertTriangle className="inline mr-2 h-5 w-5"/>}
            {scanResult.message}
          </div>
        )}
        
        {cameraError && !isScannerActive && (
          <div className="w-full max-w-xs p-3 rounded-md text-destructive-foreground bg-destructive text-center text-sm font-medium">
            <AlertTriangle className="inline mr-2 h-5 w-5"/> {cameraError}
          </div>
        )}

      </CardContent>
      
      <CardFooter className="p-4 sm:p-6 border-t border-border/60">
        {!isScannerActive ? (
          <Button 
            onClick={handleStartScan} 
            className="w-full text-base py-3 bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={!employeeId}
          >
            <Zap className="size-5 mr-2" />
            Taramayı Başlat
          </Button>
        ) : (
          <Button 
            onClick={handleStopScan} 
            variant="outline"
            className="w-full text-base py-3"
          >
            <X className="size-5 mr-2" />
            Durdur ve Kapat
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default QRScanner;
