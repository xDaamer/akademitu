import React, { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';

export interface TeacherTickerConfig {
  speedSeconds: number;
  phaseOffsetSeconds: number;
  activeImages: string[];
}

export interface TeacherImageItem {
  id: string;
  filename: string;
  imageUrl: string;
}

export const TeacherTicker: React.FC = () => {
  // Config loaded from /teachers/config.json
  const [config, setConfig] = useState<TeacherTickerConfig>({
    speedSeconds: 21.6,
    phaseOffsetSeconds: 4,
    activeImages: ['logo-white.png'],
  });

  const [imagesList, setImagesList] = useState<TeacherImageItem[]>([]);

  // 1. Fetch config from /teachers/config.json
  useEffect(() => {
    async function loadConfig() {
      try {
        const response = await fetch('/teachers/config.json?v=' + Date.now());
        if (response.ok) {
          const json = await response.json();
          setConfig({
            speedSeconds: typeof json.speedSeconds === 'number' ? json.speedSeconds : 18,
            phaseOffsetSeconds: typeof json.phaseOffsetSeconds === 'number' ? json.phaseOffsetSeconds : 4,
            activeImages: Array.isArray(json.activeImages) ? json.activeImages : ['logo-white.png'],
          });
        }
      } catch (err) {
        console.warn('teachers/config.json okunamadı:', err);
      }
    }
    loadConfig();
  }, []);

  // 2. Build image list directly from config.activeImages (public folder, no glob needed)
  useEffect(() => {
    const items: TeacherImageItem[] = config.activeImages
      .filter((filename) => filename && filename !== '*')
      .map((filename, idx) => ({
        id: `config-${idx}-${filename}`,
        filename,
        imageUrl: `/teachers/${filename}`,
      }));
    setImagesList(items);
  }, [config.activeImages]);

  // If no images uploaded or selected in config.json
  if (imagesList.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-300 space-y-3 bg-white/5 rounded-2xl border border-dashed border-white/20">
        <ImageIcon className="w-10 h-10 text-[#c5a059] animate-bounce" />
        <p className="text-sm font-semibold text-white">Yüklenmiş Görsel Bulunamadı</p>
        <p className="text-xs text-slate-300 max-w-xs">
          Lütfen <code className="bg-black/40 px-1.5 py-0.5 rounded text-[#B6D6CC]">public/teachers/</code> klasörüne görsellerinizi ekleyin.
        </p>
      </div>
    );
  }

  const buildLoopList = (items: TeacherImageItem[]) => {
    if (items.length === 0) return [];

    const cycle = [...items, ...items];
    return [...cycle, ...cycle];
  };

  const splitIndex = Math.ceil(imagesList.length / 2);
  const leftItems = imagesList.slice(0, splitIndex);
  const rightItems = imagesList.slice(splitIndex);
  const col1Items = buildLoopList(leftItems.length > 0 ? leftItems : imagesList);
  const col2Items = buildLoopList(rightItems.length > 0 ? rightItems : imagesList);

      return (
        <div className="relative h-full overflow-hidden">
          <style>{`
            @keyframes teacherScrollDown { from { transform: translateY(0); } to { transform: translateY(-50%); } }
            @keyframes teacherScrollUp   { from { transform: translateY(-50%); } to { transform: translateY(0); } }
          `}</style>
          {/* ÇERÇEVE DOKUNUŞU: ÜST VE ALT PERDE GRADIENTI (MASKING FRAME EFFECT - YUMUŞAK GEÇİŞ) */}
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#12164a] via-[#12164a]/60 to-transparent z-20 pointer-events-none" />
         <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#3540a3] via-[#3540a3]/60 to-transparent z-20 pointer-events-none" />

      {/*a YAN YANA İKİ SÜTUN (TWO PARALLEL STREAMING COLUMNS) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 h-full">
        <ScrollColumn items={col1Items} speedSeconds={config.speedSeconds} />
        <ScrollColumn items={col2Items} speedSeconds={config.speedSeconds} reverse={true} />
      </div>
    </div>
  );
};

// =========================================================================
// CSS ANIMATION SÜTUN — duration aynı = hız kesinlikle aynı
// =========================================================================
interface ScrollColumnProps {
  items: TeacherImageItem[];
  speedSeconds: number;
  reverse?: boolean;
}

const ScrollColumn: React.FC<ScrollColumnProps> = ({ items, speedSeconds, reverse = false }) => {
  const animationStyle: React.CSSProperties = {
    animationName: reverse ? 'teacherScrollUp' : 'teacherScrollDown',
    animationDuration: `${speedSeconds}s`,
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
  };

  return (
    <div className="overflow-hidden h-full relative">
      <div style={animationStyle} className="space-y-3.5 will-change-transform">
        {items.map((item, index) => (
          <PureImageCard key={`col-${item.id}-${index}`} item={item} />
        ))}
      </div>
    </div>
  );
};

// =========================================================================
// SADECE GÖRSEL İÇEREN KUTUCUK (PURE IMAGE CARD - NO TEXT)
// =========================================================================
interface PureImageCardProps {
  item: TeacherImageItem;
}

const PureImageCard: React.FC<PureImageCardProps> = ({ item }) => {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [imgSrc, setImgSrc] = useState<string>(item.imageUrl);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImgSrc(item.imageUrl);
    setHasError(false);

    // Preload image to calculate natural aspect ratio instantly
    const img = new Image();
    img.src = item.imageUrl;
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    };
    img.onerror = () => {
      const fallbackSrc = `/public/teachers/${item.filename}`;
      const fallbackImg = new Image();
      fallbackImg.src = fallbackSrc;
      fallbackImg.onload = () => {
        if (fallbackImg.naturalWidth && fallbackImg.naturalHeight) {
          setAspectRatio(fallbackImg.naturalWidth / fallbackImg.naturalHeight);
        }
      };
    };
  }, [item.imageUrl, item.filename]);

  const handleError = () => {
    if (imgSrc === `/teachers/${item.filename}`) {
      // Try the app logo as a final fallback
      setImgSrc('/teachers/logo-white.png');
    } else if (imgSrc === '/teachers/logo-white.png') {
      setHasError(true);
    } else {
      setHasError(true);
    }
  };

  return (
    <div
      className="w-full bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg overflow-hidden transition-all duration-300 hover:bg-white/20 hover:shadow-xl"
      style={{
        aspectRatio: aspectRatio ? `${aspectRatio}` : '1 / 1',
      }}
    >
      {!hasError ? (
        <img
          src={imgSrc}
          alt={item.filename}
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth && img.naturalHeight) {
              setAspectRatio(img.naturalWidth / img.naturalHeight);
            }
          }}
          onError={handleError}
          className={`${
            item.filename.toLowerCase().includes('logo')
              ? 'w-4/5 h-4/5 object-contain'
              : 'w-full h-full object-cover'
          }`}
        />
      ) : (
        <div className="py-6 px-3 text-center text-slate-300 text-xs font-mono">
          <ImageIcon className="w-6 h-6 mx-auto mb-1 text-slate-400" />
          <span>{item.filename}</span>
        </div>
      )}
    </div>
  );
};
