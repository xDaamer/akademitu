import React, { useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

export interface TeacherTickerConfig {
  speedSeconds: number;
  phaseOffsetSeconds: number;
  activeImagesLeft: string[];
  activeImagesRight: string[];
}

export interface TeacherImageItem {
  id: string;
  filename: string;
  imageUrl: string;
  aspectRatio?: number;
}

export const TeacherTicker: React.FC = () => {
  const [config, setConfig] = useState<TeacherTickerConfig>({
    speedSeconds: 21.6,
    phaseOffsetSeconds: 4,
    activeImagesLeft: ['logo-white.png'],
    activeImagesRight: ['logo-white.png'],
  });

  const [imagesList, setImagesList] = useState<TeacherImageItem[]>([]);
  const [imagesReady, setImagesReady] = useState(false);

  // ============================================================
  // 1. CONFIG YÜKLE
  // ============================================================
  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const response = await fetch(
          '/teachers/config.json?v=' + Date.now(),
          {
            cache: 'no-store',
          }
        );

        if (!response.ok) {
          throw new Error(`Config HTTP ${response.status}`);
        }

        const json = await response.json();

        if (cancelled) return;

        setConfig({
          speedSeconds:
            typeof json.speedSeconds === 'number'
              ? json.speedSeconds
              : 18,

          phaseOffsetSeconds:
            typeof json.phaseOffsetSeconds === 'number'
              ? json.phaseOffsetSeconds
              : 4,

          activeImagesLeft:
            Array.isArray(json.activeImagesLeft)
              ? json.activeImagesLeft
              : ['logo-white.png'],

          activeImagesRight:
            Array.isArray(json.activeImagesRight)
              ? json.activeImagesRight
              : ['logo-white.png'],
        });
      } catch (err) {
        console.warn(
          'teachers/config.json okunamadı:',
          err
        );
      }
    }

    loadConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  // ============================================================
  // 2. CONFIG'TEN IMAGE LIST OLUŞTUR
  // ============================================================
  const rawImageItems = useMemo(() => {
    const leftItems: TeacherImageItem[] =
      config.activeImagesLeft
        .filter(
          (filename) =>
            filename &&
            filename !== '*'
        )
        .map((filename, idx) => ({
          id: `left-${idx}-${filename}`,
          filename,
          imageUrl: `/teachers/${filename}`,
        }));

    const rightItems: TeacherImageItem[] =
      config.activeImagesRight
        .filter(
          (filename) =>
            filename &&
            filename !== '*'
        )
        .map((filename, idx) => ({
          id: `right-${idx}-${filename}`,
          filename,
          imageUrl: `/teachers/${filename}`,
        }));

    return [...leftItems, ...rightItems];
  }, [
    config.activeImagesLeft,
    config.activeImagesRight,
  ]);

  // ============================================================
  // 3. TÜM GÖRSELLERİ ANİMASYON BAŞLAMADAN ÖNCE PRELOAD ET
  // ============================================================
  useEffect(() => {
    let cancelled = false;

    if (rawImageItems.length === 0) {
      setImagesList([]);
      setImagesReady(true);
      return;
    }

    setImagesReady(false);

    async function preloadImages() {
      const loadedItems =
        await Promise.all(
          rawImageItems.map(
            (item) =>
              new Promise<TeacherImageItem>(
                (resolve) => {
                  const img = new Image();

                  img.onload = () => {
                    const aspectRatio =
                      img.naturalWidth &&
                      img.naturalHeight
                        ? img.naturalWidth /
                          img.naturalHeight
                        : 1;

                    resolve({
                      ...item,
                      aspectRatio,
                    });
                  };

                  img.onerror = () => {
                    // Görsel yüklenemezse yine de
                    // animasyon geometrisini bozma.
                    resolve({
                      ...item,
                      aspectRatio: 1,
                    });
                  };

                  img.src = item.imageUrl;
                }
              )
          )
        );

      if (cancelled) return;

      setImagesList(loadedItems);
      setImagesReady(true);
    }

    preloadImages();

    return () => {
      cancelled = true;
    };
  }, [rawImageItems]);

  // ============================================================
  // GÖRSEL YOK
  // ============================================================
  if (imagesList.length === 0 && imagesReady) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-300 space-y-3 bg-white/5 rounded-2xl border border-dashed border-white/20">
        <ImageIcon className="w-10 h-10 text-[#c5a059] animate-bounce" />

        <p className="text-sm font-semibold text-white">
          Yüklenmiş Görsel Bulunamadı
        </p>

        <p className="text-xs text-slate-300 max-w-xs">
          Lütfen{' '}
          <code className="bg-black/40 px-1.5 py-0.5 rounded text-[#B6D6CC]">
            public/teachers/
          </code>{' '}
          klasörüne görsellerinizi ekleyin.
        </p>
      </div>
    );
  }

  // ============================================================
  // ANİMASYON BAŞLAMADAN ÖNCE BEKLE
  // Böylece ilk açılışta layout değişmez.
  // ============================================================
  if (!imagesReady) {
    return (
      <div className="relative h-full overflow-hidden" />
    );
  }

  const leftItems = imagesList.filter((item) =>
    item.id.startsWith('left-')
  );

  const rightItems = imagesList.filter((item) =>
    item.id.startsWith('right-')
  );

  const col1Items =
    leftItems.length > 0
      ? leftItems
      : imagesList;

  const col2Items =
    rightItems.length > 0
      ? rightItems
      : imagesList;

  return (
    <div className="relative h-full overflow-hidden">
      <style>{`
        /*
         * SEAMLESS INFINITE LOOP
         *
         * Track içerisinde:
         *
         * [1 2 3 4] [1 2 3 4]
         *
         * İlk grup tamamen yukarı çıktığında
         * ikinci grup birebir aynı pozisyondadır.
         *
         * Bu nedenle hiçbir jump oluşmaz.
         */

        @keyframes teacherScrollDown {
          from {
            transform: translate3d(0, 0, 0);
          }

          to {
            transform: translate3d(0, -50%, 0);
          }
        }

        @keyframes teacherScrollUp {
          from {
            transform: translate3d(0, -50%, 0);
          }

          to {
            transform: translate3d(0, 0, 0);
          }
        }

        .teacher-scroll-track {
          will-change: transform;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform: translate3d(0, 0, 0);
        }

        .teacher-scroll-group {
          flex-shrink: 0;
        }
      `}</style>

      {/* ÜST MASK */}
      <div
        className="
          absolute
          top-0
          left-0
          right-0
          h-8
          bg-gradient-to-b
          from-[#12164a]
          via-[#12164a]/60
          to-transparent
          z-20
          pointer-events-none
        "
      />

      {/* ALT MASK */}
      <div
        className="
          absolute
          bottom-0
          left-0
          right-0
          h-8
          bg-gradient-to-t
          from-[#3540a3]
          via-[#3540a3]/60
          to-transparent
          z-20
          pointer-events-none
        "
      />

      {/* İKİ SÜTUN */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 h-full">
        <ScrollColumn
          items={col1Items}
          speedSeconds={config.speedSeconds}
          reverse={false}
          phaseOffsetSeconds={0}
        />

        <ScrollColumn
          items={col2Items}
          speedSeconds={config.speedSeconds}
          reverse={true}
          phaseOffsetSeconds={
            config.phaseOffsetSeconds
          }
        />
      </div>
    </div>
  );
};

// ============================================================
// SCROLL COLUMN
// ============================================================

interface ScrollColumnProps {
  items: TeacherImageItem[];
  speedSeconds: number;
  reverse?: boolean;
  phaseOffsetSeconds?: number;
}

const ScrollColumn: React.FC<
  ScrollColumnProps
> = ({
  items,
  speedSeconds,
  reverse = false,
  phaseOffsetSeconds = 0,
}) => {
  if (items.length === 0) return null;

  /*
   * EN ÖNEMLİ KISIM:
   *
   * Artık 3 kere değil, TAM OLARAK 2 kere
   * aynı listeyi render ediyoruz.
   *
   * [1 2 3 4]
   * [1 2 3 4]
   *
   * Track yüksekliği = 2 × group yüksekliği
   *
   * translateY(-50%) =
   * tam olarak bir grubun yüksekliği.
   *
   * Böylece:
   *
   * 1 → 2 → 3 → 4 → 1 → 2 → 3 → 4
   *
   * kesintisiz akar.
   */

  const duplicatedItems = [
    ...items,
    ...items,
  ];

  const animationName = reverse
    ? 'teacherScrollUp'
    : 'teacherScrollDown';

  const animationDelay =
    phaseOffsetSeconds > 0
      ? `-${phaseOffsetSeconds}s`
      : '0s';

  const animationStyle: React.CSSProperties = {
    animationName,
    animationDuration: `${speedSeconds}s`,
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
    animationDelay,
    animationFillMode: 'both',
  };

  return (
    <div className="overflow-hidden h-full relative">
      <div
        className="teacher-scroll-track"
        style={animationStyle}
      >
        {/* ==================================================
            İLK TAM GRUP
            ================================================== */}
        <div className="teacher-scroll-group space-y-3.5">
          {items.map((item, index) => (
            <PureImageCard
              key={`group-a-${item.id}-${index}`}
              item={item}
            />
          ))}
        </div>

        {/* ==================================================
            İKİNCİ TAM GRUP
            İLK GRUBUN BİREBİR KOPYASI
            ================================================== */}
        <div className="teacher-scroll-group space-y-3.5">
          {items.map((item, index) => (
            <PureImageCard
              key={`group-b-${item.id}-${index}`}
              item={item}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// PURE IMAGE CARD
// ============================================================

interface PureImageCardProps {
  item: TeacherImageItem;
}

const PureImageCard: React.FC<
  PureImageCardProps
> = ({ item }) => {
  const [imgSrc, setImgSrc] =
    useState(item.imageUrl);

  const [hasError, setHasError] =
    useState(false);

  useEffect(() => {
    setImgSrc(item.imageUrl);
    setHasError(false);
  }, [item.imageUrl]);

  const handleError = () => {
    if (
      imgSrc !==
      '/teachers/logo-white.png'
    ) {
      setImgSrc(
        '/teachers/logo-white.png'
      );
      return;
    }

    setHasError(true);
  };

  return (
    <div
      className="
        w-full
        bg-white/10
        backdrop-blur-md
        rounded-2xl
        flex
        items-center
        justify-center
        shadow-lg
        overflow-hidden
        transition-all
        duration-300
        hover:bg-white/20
        hover:shadow-xl
      "
      style={{
        /*
         * Aspect ratio artık animasyon başladıktan
         * sonra değişmiyor.
         */
        aspectRatio:
          item.aspectRatio &&
          item.aspectRatio > 0
            ? `${item.aspectRatio}`
            : '1 / 1',
      }}
    >
      {!hasError ? (
        <img
          src={imgSrc}
          alt={item.filename}
          onError={handleError}
          draggable={false}
          decoding="async"
          className={
            item.filename
              .toLowerCase()
              .includes('logo')
              ? 'w-4/5 h-4/5 object-contain'
              : 'w-full h-full object-cover'
          }
        />
      ) : (
        <div className="py-6 px-3 text-center text-slate-300 text-xs font-mono">
          <ImageIcon className="w-6 h-6 mx-auto mb-1 text-slate-400" />

          <span>
            {item.filename}
          </span>
        </div>
      )}
    </div>
  );
};