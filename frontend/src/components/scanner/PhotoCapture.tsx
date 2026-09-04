'use client';
import { useEffect, useRef, useState } from 'react';

interface PhotoCaptureProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

const MAX_DIMENSION = 800;
const JPEG_QUALITY = 0.75;

export function PhotoCapture({ onCapture, onClose }: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [captured, setCaptured] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Бу браузер камерани қўллаб-қувватламайди ёки саҳифа хавфсиз уланиш (HTTPS) орқали очилмаган');
        setLoading(false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 1280 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadeddata = () => setLoading(false);
          await videoRef.current.play();
        }
        setTimeout(() => setLoading(false), 1500);
      } catch (e) {
        if (cancelled) return;
        const name = (e as { name?: string })?.name;
        if (name === 'NotReadableError') {
          setError('Камера бошқа дастур томонидан банд.');
        } else if (name === 'NotFoundError') {
          setError('Камера топилмади.');
        } else {
          setError('Камерага рухсат берилмаган. Браузер созламаларидан рухсат беринг.');
        }
        setLoading(false);
      }
    }

    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    const scale = Math.min(1, MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCaptured(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
  };

  const confirm = () => {
    if (captured) onCapture(captured);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur">
        <h3 className="font-bold text-white text-base">Маҳсулот расми</h3>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {error ? (
        <div className="flex-1 flex items-center justify-center text-white text-center p-8">
          <div>
            <p className="text-6xl mb-5">📷</p>
            <p className="font-semibold text-lg">{error}</p>
            <p className="text-white/60 text-sm mt-2">Расмсиз ҳам маҳсулот қўшишингиз мумкин.</p>
            <button
              onClick={onClose}
              className="mt-6 px-8 py-3 bg-white text-black rounded-2xl font-semibold hover:bg-gray-100 transition-colors"
            >
              Орқага
            </button>
          </div>
        </div>
      ) : captured ? (
        <div className="flex-1 relative overflow-hidden flex flex-col">
          <div className="flex-1 relative">
            <img src={captured} alt="" className="w-full h-full object-contain bg-black" />
          </div>
          <div className="flex items-center justify-center gap-4 px-4 py-6 bg-black/80">
            <button
              onClick={() => setCaptured(null)}
              className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-semibold transition-colors"
            >
              Қайта олиш
            </button>
            <button
              onClick={confirm}
              className="px-8 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl font-semibold transition-colors"
            >
              Ишлатиш
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black gap-4">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              <p className="text-white/70 text-sm">Камера ишга тушмоқда...</p>
            </div>
          )}

          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center pb-8 pt-10 bg-gradient-to-t from-black/70 to-transparent">
            <button
              onClick={takePhoto}
              disabled={loading}
              className="w-16 h-16 rounded-full bg-white border-4 border-white/40 hover:scale-105 active:scale-95 transition-transform disabled:opacity-40"
              title="Суратга олиш"
            />
          </div>
        </div>
      )}
    </div>
  );
}
