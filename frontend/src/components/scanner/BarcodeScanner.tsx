'use client';
import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';
import toast from 'react-hot-toast';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

// Native BarcodeDetector isn't in the default TS DOM lib yet.
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorInterface {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
interface BarcodeDetectorConstructor {
  new (options?: { formats: string[] }): BarcodeDetectorInterface;
  getSupportedFormats?: () => Promise<string[]>;
}

const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'];

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannedRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cameraLabel, setCameraLabel] = useState('');

  useEffect(() => {
    let cancelled = false;
    let zxingReader: BrowserMultiFormatReader | null = null;

    function handleError(e: unknown) {
      if (cancelled) return;
      const name = (e as { name?: string })?.name;
      if (name === 'NotReadableError') {
        setError("Камера бошқа дастур томонидан банд. Бошқа дастурларни ёпиб қайта уриниб кўринг.");
      } else if (name === 'NotFoundError') {
        setError('Камера топилмади.');
      } else {
        setError('Камерага рухсат берилмаган. Браузер созламаларидан рухсат беринг.');
      }
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Бу браузер камерани қўллаб-қувватламайди ёки саҳифа хавфсиз уланиш (HTTPS) орқали очилмаган");
        return;
      }

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        if (!videoDevices.length) {
          setError('Камера топилмади');
          return;
        }

        const backCamera = videoDevices.find((d) => /back|rear|environment/i.test(d.label));
        const selected = backCamera || videoDevices[videoDevices.length - 1];
        setCameraLabel(selected.label || 'Камера');

        // Soft resolution preference only (`ideal`, never `min`/`exact`) —
        // a 1D barcode needs enough pixels to resolve its thin bars, but
        // this must never hard-fail on a camera that can't hit it.
        const constraints: MediaStreamConstraints = {
          video: {
            deviceId: selected.deviceId ? { exact: selected.deviceId } : undefined,
            facingMode: selected.deviceId ? undefined : { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };

        const NativeDetector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
          .BarcodeDetector;

        if (NativeDetector) {
          // Native OS-level barcode detection (Chrome/Edge on Android and
          // desktop) — hardware-accelerated and far more accurate than the
          // JS decoder below. Not supported on Safari/iOS, hence the fallback.
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
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

          let formats = NATIVE_FORMATS;
          try {
            if (NativeDetector.getSupportedFormats) {
              const supported = await NativeDetector.getSupportedFormats();
              const narrowed = NATIVE_FORMATS.filter((f) => supported.includes(f));
              if (narrowed.length) formats = narrowed;
            }
          } catch {
            // Use the default format list if capability query fails
          }

          const detector = new NativeDetector({ formats });

          const tick = async () => {
            if (cancelled || scannedRef.current) return;
            if (videoRef.current && videoRef.current.readyState >= 2) {
              try {
                const results = await detector.detect(videoRef.current);
                if (results.length > 0 && !scannedRef.current) {
                  scannedRef.current = true;
                  const code = results[0].rawValue.trim();
                  toast.success(`Код ўқилди: ${code}`, { duration: 1500 });
                  onScan(code);
                  return;
                }
              } catch {
                // Transient detection errors are expected between frames
              }
            }
            rafRef.current = requestAnimationFrame(tick);
          };
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        // Fallback: JS-based decoder for browsers without BarcodeDetector
        const hints = new Map();
        hints.set(DecodeHintType.TRY_HARDER, true);
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.ITF,
        ]);
        const reader = new BrowserMultiFormatReader(hints, 150);
        zxingReader = reader;

        await reader.decodeFromConstraints(constraints, videoRef.current!, (result, err) => {
          if (result && !scannedRef.current) {
            scannedRef.current = true;
            const code = result.getText().trim();
            toast.success(`Код ўқилди: ${code}`, { duration: 1500 });
            onScan(code);
          }
          if (err) {
            // Suppress "no code in frame" — expected while aiming the camera
          }
        });

        if (videoRef.current) {
          videoRef.current.onloadeddata = () => setLoading(false);
        }
        setTimeout(() => setLoading(false), 1500);
      } catch (e) {
        handleError(e);
      }
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      zxingReader?.reset();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur">
        <div>
          <h3 className="font-bold text-white text-base">Штрих-код сканери</h3>
          {cameraLabel && (
            <p className="text-xs text-white/50 mt-0.5 truncate max-w-[200px]">{cameraLabel}</p>
          )}
        </div>
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
            <button
              onClick={onClose}
              className="mt-6 px-8 py-3 bg-white text-black rounded-2xl font-semibold hover:bg-gray-100 transition-colors"
            >
              Орқага
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 relative overflow-hidden">
          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black gap-4">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              <p className="text-white/70 text-sm">Камера ишга тушмоқда...</p>
            </div>
          )}

          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
          />

          {/* No frame overlay — camera scans the full view automatically */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pointer-events-none pb-6 pt-10 bg-gradient-to-t from-black/70 to-transparent">
            <p className="text-white/90 text-sm font-medium text-center px-6">
              Штрих-кодни камерага тутинг
            </p>
            <p className="mt-1 text-white/50 text-xs text-center">
              Автоматик аниқланади
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
