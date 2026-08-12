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
    speedSeconds: 18,
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

  // 2. Discover files uploaded to /public/teachers/ or listed in config.json
  useEffect(() => {
    try {
      // Vite glob for public/teachers directory
      const globFiles = import.meta.glob<string>(
        '/public/teachers/*.{png,jpg,jpeg,webp,svg,PNG,JPG,JPEG,WEBP,SVG}',
        { eager: true, import: 'default' }
      );

      const map = new Map<string, TeacherImageItem>();

      // A) Process files found via Vite glob
      Object.entries(globFiles).forEach(([filePath, url], index) => {
        const filename = filePath.split('/').pop() || `gorsel-${index}`;

        // Filter based on activeImages in config.json (flexible case & extension matching)
        const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.')).toLowerCase();
        const isAllowed =
          config.activeImages.length === 0 ||
          config.activeImages.includes('*') ||
          config.activeImages.some((active) => {
            const activeLower = active.toLowerCase();
            const activeNoExt = activeLower.substring(0, activeLower.lastIndexOf('.'));
            return (
              activeLower === filename.toLowerCase() ||
              (activeNoExt && activeNoExt === nameWithoutExt)
            );
          });

        if (isAllowed) {
          map.set(filename, {
            id: `glob-${index}-${filename}`,
            filename,
            imageUrl: `/teachers/${filename}`,
          });
        }
      });

      // B) Process files listed in config.json activeImages directly
      config.activeImages.forEach((filename, idx) => {
        if (filename && filename !== '*' && !map.has(filename)) {
          map.set(filename, {
            id: `config-${idx}-${filename}`,
            filename,
            imageUrl: `/teachers/${filename}`,
          });
        }
      });

      setImagesList(Array.from(map.values()));
    } catch (err) {
      console.error('Yüklenen hoca fotoğrafları taranırken hata oluştu:', err);
    }
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

  // Duplicate items enough times to ensure smooth infinite loop
  const buildLoopList = (items: TeacherImageItem[], offsetMultiplier = 0) => {
    // If only 1 or 2 items, repeat them to fill height
    let baseList = items;
    while (baseList.length < 6) {
      baseList = [...baseList, ...items];
    }
    // Shift items slightly for column 2 so columns don't look identical
    if (offsetMultiplier > 0 && baseList.length > 1) {
      const shift = offsetMultiplier % baseList.length;
      baseList = [...baseList.slice(shift), ...baseList.slice(0, shift)];
    }
    // Repeat for infinite animation loop (0% to -50%)
    return [...baseList, ...baseList];
  };

  const col1Items = buildLoopList(imagesList, 0);
  const col2Items = buildLoopList(imagesList, 1);

      return (
        <div className="relative h-full overflow-hidden">
          {/* ÇERÇEVE DOKUNUŞU: ÜST VE ALT PERDE GRADIENTI (MASKING FRAME EFFECT - YUMUŞAK GEÇİŞ) */}
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#12164a] via-[#12164a]/60 to-transparent z-20 pointer-events-none" />
         <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#3540a3] via-[#3540a3]/60 to-transparent z-20 pointer-events-none" />

      {/*a YAN YANA İKİ SÜTUN (TWO PARALLEL STREAMING COLUMNS) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 h-full">
        {/* 1. SÜTUN (AŞAĞI DOĞRU AKAN SÜTUN) */}
        <div className="overflow-hidden h-full relative">
          <div
            className="animate-teacher-scroll-down space-y-3.5 hover:[animation-play-state:paused]"
            style={{
              animationDuration: `${config.speedSeconds}s`,
              animationDelay: '0s',
            }}
          >
            {col1Items.map((item, index) => (
              <PureImageCard
                key={`c1-${item.id}-${index}`}
                item={item}
              />
            ))}
          </div>
        </div>

        {/* 2. SÜTUN (FAZ FARKI İLE AŞAĞI DOĞRU AKAN SÜTUN) */}
        <div className="overflow-hidden h-full relative">
          <div
            className="animate-teacher-scroll-down space-y-3.5 hover:[animation-play-state:paused]"
            style={{
              animationDuration: `${config.speedSeconds}s`,
              animationDelay: `-${config.phaseOffsetSeconds}s`, // FAZ FARKI
            }}
          >
            {col2Items.map((item, index) => (
              <PureImageCard
                key={`c2-${item.id}-${index}`}
                item={item}
              />
            ))}
          </div>
        </div>
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
    if (imgSrc.startsWith('/teachers/')) {
      // Try /public/teachers/ fallback
      setImgSrc(`/public/teachers/${item.filename}`);
    } else if (imgSrc.startsWith('/public/teachers/')) {
      // Try direct logo asset fallback
      setImgSrc('/teachers/logo-white.png');
    } else {
      setHasError(true);
    }
  };

  return (
    <div
      className="w-full bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 hover:bg-white/20 hover:border-[#c5a059]/50 hover:scale-[1.02] group overflow-hidden"
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
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
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
