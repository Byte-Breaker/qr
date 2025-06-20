import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SelfieCaptureProps {
  onSelfieCaptured: (file: File) => void;
  required?: boolean;
}

const SelfieCapture: React.FC<SelfieCaptureProps> = ({ onSelfieCaptured, required }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraInitializing, setIsCameraInitializing] = useState(false);
  const [hasSelfieBeenProcessed, setHasSelfieBeenProcessed] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  // Derived state to determine if the video element should be rendered and active
  const shouldRenderVideo = !capturedImage && !!stream && !isCameraInitializing;

  const startCamera = useCallback(async () => {
    setIsCameraInitializing(true);
    setError(null);
    setCapturedImage(null);
    setHasSelfieBeenProcessed(false);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      setStream(mediaStream);
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Kamera erişim izni reddedildi. Lütfen tarayıcı ayarlarından izin verin.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('Kamera bulunamadı. Lütfen bir kameranın bağlı olduğundan emin olun.');
        } else {
          setError('Kamera başlatılamadı. Başka bir uygulama kamerayı kullanıyor olabilir.');
        }
      } else {
        setError('Kamera başlatılırken bilinmeyen bir hata oluştu.');
      }
      setStream(null);
    } finally {
      setIsCameraInitializing(false);
    }
  }, [setStream]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
  }, [setStream]);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (shouldRenderVideo && videoElement && stream) {
      if (videoElement.srcObject !== stream) {
        videoElement.srcObject = stream;
      }

      const handleCanPlay = () => {
        videoElement.play()
          .then(() => {
            if (error && error.startsWith('Video oynatılamadı')) setError(null);
          })
          .catch(e => {
            if (e.name !== 'AbortError') {
              setError(`Video oynatılamadı (${e.name}). Kamera başka bir uygulama tarafından kullanılmıyor olabilir mi?`);
            }
          });
      };

      const handleVideoError = (e: Event) => {
        setError('Video yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
      };

      videoElement.addEventListener('loadeddata', handleCanPlay);
      videoElement.addEventListener('error', handleVideoError);

      if (videoElement.paused && videoElement.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
         handleCanPlay();
      }

      return () => {
        videoElement.removeEventListener('loadeddata', handleCanPlay);
        videoElement.removeEventListener('error', handleVideoError);
      };

    } else if (videoElement) {
      if (videoElement.srcObject) {
        videoElement.srcObject = null;
      }
      if (!videoElement.paused) {
        videoElement.pause();
      }
    }
  }, [stream, shouldRenderVideo, error, setError]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const takePicture = () => {
    if (videoRef.current && canvasRef.current && stream) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');

      if (context) {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        context.setTransform(1, 0, 0, 1, 0, 0);
        
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        setHasSelfieBeenProcessed(false);
        stopCamera();
      }
    }
  };

  useEffect(() => {
    if (capturedImage && !hasSelfieBeenProcessed) {
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
          onSelfieCaptured(file);
          setHasSelfieBeenProcessed(true);
        })
        .catch(fetchError => {
          setError('Selfie dosyası oluşturulurken bir hata oluştu.');
        });
    }
  }, [capturedImage, onSelfieCaptured, hasSelfieBeenProcessed, setHasSelfieBeenProcessed, setError]);

  const retakePicture = () => {
    setCapturedImage(null);
    setError(null);
    setHasSelfieBeenProcessed(false);
    startCamera();
  };

  return (
    <Card className="w-full max-w-sm mx-auto border-border/60 shadow-md">
      <CardContent className="p-4 sm:p-6">
        <div className="aspect-[4/3] w-full bg-muted rounded-md overflow-hidden relative flex items-center justify-center">
          {!capturedImage && stream && !isCameraInitializing && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
          )}
          {capturedImage && (
            <img 
                src={capturedImage} 
                alt="Çekilen Selfie" 
                className="w-full h-full object-cover" 
            />
          )}
          {!stream && !capturedImage && !error && !isCameraInitializing && (
            <div className="text-center p-4">
              <Camera className="w-16 h-16 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Selfie çekmek için kamerayı başlatın.</p>
            </div>
          )}
           {isCameraInitializing && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
                <Camera className="w-12 h-12 text-primary animate-pulse mb-2" />
                <p className="text-sm text-primary">Kamera başlatılıyor...</p>
            </div>
           )}
        </div>
        
        {error && (
          <div className="mt-3 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-start">
            <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="flex-grow">{error}</span>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div className="mt-4 space-y-2">
          {!stream && !capturedImage && !isCameraInitializing && (
            <Button onClick={startCamera} className="w-full" disabled={isCameraInitializing}>
              <Camera className="mr-2 h-4 w-4" /> Kamerayı Başlat
            </Button>
          )}
          {stream && !capturedImage && (
            <Button onClick={takePicture} className="w-full" variant="default">
              Selfie Çek
            </Button>
          )}
          {capturedImage && (
            <Button onClick={retakePicture} variant="outline" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" /> Tekrar Çek
            </Button>
          )}
        </div>
        {required && !capturedImage && stream && (
             <p className="text-xs text-destructive mt-2 text-center">Selfie çekmek zorunludur (Bir selfie çekin).</p>
        )}
         {required && !capturedImage && !stream && !error && (
             <p className="text-xs text-muted-foreground mt-2 text-center">Kayıt için selfie gereklidir.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default SelfieCapture; 