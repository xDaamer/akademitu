import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { TEACHER_TICKER_PIXELS_PER_SECOND } from '../config';

/** Yüklenemeyen görsellerin yerine geçen marka logosu (public/ kökünde). */
const FALLBACK_IMAGE_URL = '/logo-white.png';

/** Tek bir görsel bu süre içinde yüklenmezse akış onsuz başlar. */
const IMAGE_PRELOAD_TIMEOUT_MS = 3000;

/** Ölçülemeyen görseller için makul bir portre oranı (4:5). */
const FALLBACK_ASPECT_RATIO = 0.8;

export interface TeacherTickerConfig {
  /** Saniyede kat edilen piksel. Verilirse hız kaynağı budur. */
  pixelsPerSecond: number | null;
  /** Eski şema: bir turun kaç saniye süreceği. Geriye dönük uyumluluk için okunur. */
  speedSeconds: number | null;
  phaseOffsetSeconds: number;
  activeImagesLeft: string[];
  activeImagesRight: string[];
}

export interface TeacherImageItem {
  id: string;
  filename: string;
  imageUrl: string;
  aspectRatio: number;
  naturalWidth?: number;
  naturalHeight?: number;
}

type RawTeacherImage = Pick<
  TeacherImageItem,
  'id' | 'filename' | 'imageUrl'
>;

const EMPTY_CONFIG: TeacherTickerConfig = {
  pixelsPerSecond: null,
  speedSeconds: null,
  phaseOffsetSeconds: 4,
  activeImagesLeft: [],
  activeImagesRight: [],
};

const readPositiveNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null;

const readFilenames = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter(
        (entry): entry is string =>
          typeof entry === 'string' &&
          entry.trim() !== '' &&
          entry !== '*'
      )
    : [];

export const TeacherTicker: React.FC = () => {
  const [config, setConfig] =
    useState<TeacherTickerConfig>(EMPTY_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [imagesList, setImagesList] = useState<TeacherImageItem[]>([]);
  const [imagesReady, setImagesReady] = useState(false);
  const [leftGroupHeight, setLeftGroupHeight] = useState(0);

  // ============================================================
  // 1. CONFIG YÜKLE
  // ============================================================
  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const response = await fetch(
          '/teachers/config.json?v=' + Date.now(),
          { cache: 'no-store' }
        );

        if (!response.ok) {
          throw new Error(`Config HTTP ${response.status}`);
        }

        const json = await response.json();

        if (cancelled) return;

        setConfig({
          pixelsPerSecond: readPositiveNumber(json.pixelsPerSecond),
          speedSeconds: readPositiveNumber(json.speedSeconds),
          phaseOffsetSeconds:
            readPositiveNumber(json.phaseOffsetSeconds) ??
            EMPTY_CONFIG.phaseOffsetSeconds,
          activeImagesLeft: readFilenames(json.activeImagesLeft),
          activeImagesRight: readFilenames(json.activeImagesRight),
        });
      } catch (err) {
        console.warn('teachers/config.json okunamadı:', err);
      } finally {
        // Hata durumunda da işaretlenir: aksi halde boş-durum paneli
        // hiç görünmez ve bileşen sonsuza kadar boş kalır.
        if (!cancelled) setConfigLoaded(true);
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
  const rawImageItems = useMemo<RawTeacherImage[]>(() => {
    const toItems = (filenames: string[], side: 'left' | 'right') =>
      filenames.map((filename, idx) => ({
        id: `${side}-${idx}-${filename}`,
        filename,
        imageUrl: `/teachers/${filename}`,
      }));

    return [
      ...toItems(config.activeImagesLeft, 'left'),
      ...toItems(config.activeImagesRight, 'right'),
    ];
  }, [config.activeImagesLeft, config.activeImagesRight]);

  // ============================================================
  // 3. TÜM GÖRSELLERİ ANİMASYON BAŞLAMADAN ÖNCE PRELOAD ET
  //    Böylece ilk karede kart yükseklikleri kesindir ve akış
  //    başladıktan sonra layout kaymaz.
  // ============================================================
  useEffect(() => {
    let cancelled = false;

    if (rawImageItems.length === 0) {
      setImagesList([]);
      setImagesReady(true);
      return;
    }

    setImagesReady(false);

    // Her görselin kendi zaman aşımı var: takılan tek bir dosya
    // tüm hero'yu süresiz boş bırakamaz.
    const loadOne = (item: RawTeacherImage) =>
      new Promise<TeacherImageItem>((resolve) => {
        const img = new Image();
        let settled = false;

        const finish = (loaded: TeacherImageItem) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          img.onload = null;
          img.onerror = null;
          resolve(loaded);
        };

        const timer = window.setTimeout(
          () =>
            finish({ ...item, aspectRatio: FALLBACK_ASPECT_RATIO }),
          IMAGE_PRELOAD_TIMEOUT_MS
        );

        img.onload = () => {
          const { naturalWidth, naturalHeight } = img;

          finish({
            ...item,
            aspectRatio:
              naturalWidth && naturalHeight
                ? naturalWidth / naturalHeight
                : FALLBACK_ASPECT_RATIO,
            naturalWidth,
            naturalHeight,
          });
        };

        img.onerror = () =>
          finish({ ...item, aspectRatio: FALLBACK_ASPECT_RATIO });

        img.src = item.imageUrl;
      });

    Promise.all(rawImageItems.map(loadOne)).then((loadedItems) => {
      if (cancelled) return;
      setImagesList(loadedItems);
      setImagesReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [rawImageItems]);

  // ============================================================
  // 4. SÜTUNLAR
  // ============================================================
  const { col1Items, col2Items } = useMemo(() => {
    const left = imagesList.filter((item) => item.id.startsWith('left-'));
    const right = imagesList.filter((item) => item.id.startsWith('right-'));

    return {
      col1Items: left.length > 0 ? left : imagesList,
      col2Items: right.length > 0 ? right : imagesList,
    };
  }, [imagesList]);

  // ============================================================
  // 5. HIZ
  //    Süre değil px/sn: sol sütunda 3, sağda 4 görsel olsa bile
  //    ikisi de aynı hızda akar. (Eskiden ikisine de aynı saniye
  //    verildiği için çok görselli sütun ~%33 hızlı akıyordu.)
  // ============================================================
  const handleLeftMeasure = useCallback((height: number) => {
    setLeftGroupHeight(height);
  }, []);

  const pixelsPerSecond = useMemo(() => {
    if (config.pixelsPerSecond) return config.pixelsPerSecond;

    // Eski `speedSeconds` şeması: sol sütunun ölçülen boyu üzerinden
    // px/sn'ye çevrilir, sonra iki sütuna da aynısı uygulanır.
    if (config.speedSeconds && leftGroupHeight > 0) {
      return leftGroupHeight / config.speedSeconds;
    }

    return TEACHER_TICKER_PIXELS_PER_SECOND;
  }, [config.pixelsPerSecond, config.speedSeconds, leftGroupHeight]);

  // `speedSeconds` yolunda hız ölçüme bağlı; ölçüm gelmeden başlatırsak
  // varsayılan hızdan gerçek hıza görünür bir sıçrama olur.
  const speedResolved =
    Boolean(config.pixelsPerSecond) ||
    !config.speedSeconds ||
    leftGroupHeight > 0;

  // ============================================================
  // CONFIG VEYA GÖRSELLER HAZIR DEĞİL
  // ============================================================
  if (!configLoaded || !imagesReady) {
    return <div className="relative h-full overflow-hidden" />;
  }

  // ============================================================
  // GÖRSEL YOK
  // ============================================================
  if (imagesList.length === 0) {
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
          klasörüne görsellerinizi ekleyin ve{' '}
          <code className="bg-black/40 px-1.5 py-0.5 rounded text-[#B6D6CC]">
            config.json
          </code>{' '}
          içinde listeleyin.
        </p>
      </div>
    );
  }

  return (
    <div
      className="teacher-ticker relative h-full overflow-hidden"
      role="img"
      aria-label="Derece hocalarımızdan kareler"
    >
      <div className="grid grid-cols-2 gap-3 sm:gap-4 h-full">
        <ScrollColumn
          items={col1Items}
          pixelsPerSecond={pixelsPerSecond}
          reverse={false}
          phaseOffsetSeconds={0}
          enabled={speedResolved}
          onMeasure={handleLeftMeasure}
        />

        <ScrollColumn
          items={col2Items}
          pixelsPerSecond={pixelsPerSecond}
          reverse={true}
          phaseOffsetSeconds={config.phaseOffsetSeconds}
          enabled={speedResolved}
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
  pixelsPerSecond: number;
  reverse?: boolean;
  phaseOffsetSeconds?: number;
  enabled: boolean;
  onMeasure?: (groupHeight: number) => void;
}

const ScrollColumn: React.FC<ScrollColumnProps> = ({
  items,
  pixelsPerSecond,
  reverse = false,
  phaseOffsetSeconds = 0,
  enabled,
  onMeasure,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  const [groupHeight, setGroupHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  /*
   * ÖLÇÜM
   *
   * Kaydırma mesafesi yüzdeden değil, ilk grubun gerçek yüksekliğinden
   * gelir. Her kart kendi alt boşluğunu (margin-bottom) taşıdığı için
   * grup yüksekliği o boşluğu da içerir; dolayısıyla bir grup boyu
   * kayınca dikişteki aralık, gruplar içindeki aralıkla birebir aynı olur.
   *
   *   ÖNCE   [foto 14 foto 14 foto] 0 [foto 14 foto 14 foto]  ← dikişte sıkışma
   *   SONRA  [foto 14 foto 14 foto 14][foto 14 foto 14 foto 14]
   *
   * Tam sayıya yuvarlamak alt-piksel kaymasını ve buna bağlı bulanıklığı
   * da engeller.
   */
  /*
   * ÖLÇÜMÜN ANİMASYONA SIZMASINI ENGELLEMEK
   *
   * groupHeight aşağıda hem --ticker-shift (keyframe'in bitiş değeri) hem de
   * --ticker-duration'a besleniyor. İkisi de ÇALIŞAN bir animasyonun girdisi:
   * 1px'lik bir değişim, tarayıcının mevcut konumu anında yeniden interpole
   * etmesine ve geçen süre/süre oranını yeniden eşlemesine yol açar — şerit
   * gözle görülür biçimde ileri geri sıçrar.
   *
   * Sıçramayı tetikleyen şey pop-up'ın <body>'ye uyguladığı kaydırma kilidiydi:
   * position:fixed tüm dokümanı yeniden layout eder, kartlar aspect-ratio ile
   * boyutlandığı için genişlikteki her oynama yüksekliğe dönüşür ve buradaki
   * ResizeObserver tetiklenir. Kilit açılışta bir kez, kapanışta bir kez daha
   * kurulup söküldüğü için sıçrama iki yönlü oluyordu.
   *
   * İki savunma: (1) geçici dalgalanmayı tek ölçüme indiren debounce — kilit
   * kurma ve sökme birbirini götürdüğü için sonuç genelde HİÇ değişmemiş bir
   * değer olur, dolayısıyla animasyona hiçbir şey ulaşmaz, (2) alt-piksel
   * gürültüsünü eleyen eşik.
   *
   * Track'i yeniden key'leyip animasyonu temiz başlatmak da düşünüldü ve
   * bilinçli olarak yapılmadı: groupRef track'in İÇİNDE, yani remount
   * ResizeObserver'ı kopmuş bir düğüme bağlı bırakırdı; ayrıca tüm görseller
   * remount olup göz kırpardı. Geriye kalan tek senaryo olan cihaz döndürme
   * zaten sayfanın tamamını yeniden akıtıyor, orada bir sıçrama görünmüyor.
   */
  const EPSILON_PX = 2;

  useLayoutEffect(() => {
    const group = groupRef.current;
    const viewport = viewportRef.current;
    if (!group || !viewport) return;

    const applyMeasurement = () => {
      const nextGroup = Math.round(group.getBoundingClientRect().height);
      const nextViewport = Math.round(
        viewport.getBoundingClientRect().height
      );

      setGroupHeight((prev) =>
        Math.abs(prev - nextGroup) <= EPSILON_PX ? prev : nextGroup
      );
      setViewportHeight((prev) =>
        Math.abs(prev - nextViewport) <= EPSILON_PX ? prev : nextViewport
      );
    };

    // İlk ölçüm anında: şerit ancak ölçüldükten sonra çalışmaya başlıyor.
    applyMeasurement();

    let frame = 0;
    let timer = 0;

    const scheduleMeasurement = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(applyMeasurement);
      }, 150);
    };

    const observer = new ResizeObserver(scheduleMeasurement);
    observer.observe(group);
    observer.observe(viewport);

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
    };
  }, [items]);


  useEffect(() => {
    if (groupHeight > 0) onMeasure?.(groupHeight);
  }, [groupHeight, onMeasure]);

  /*
   * KOPYA SAYISI
   *
   * Bir grup boyu kaydığımız için, kayma sonundaki karede geriye kalan
   * (copies - 1) grubun görüntü alanını doldurması gerekir. Az görselli
   * bir config'de 2 kopya yetmez ve döngüde boşluk görünür.
   */
  /*
   * Histerezis: kopya sayısı yalnızca ARTAR. copies değişmek, animasyonlu
   * track'in DOM çocuklarını değiştirmek demek; bu da grubun yüksekliğini
   * değiştirip yukarıdaki ResizeObserver'ı yeniden tetikliyor — kendi kendini
   * besleyen bir döngü. Geçici bir yükseklik düşüşünün o döngüyü başlatmasını
   * engelliyoruz; fazladan bir kopya yalnızca ekran dışında durur, zararsızdır.
   */
  const maxCopies = useRef(2);
  const copies = useMemo(() => {
    if (groupHeight <= 0 || viewportHeight <= 0) return maxCopies.current;
    const needed = Math.max(2, Math.ceil(viewportHeight / groupHeight) + 1);
    maxCopies.current = Math.max(maxCopies.current, needed);
    return maxCopies.current;
  }, [groupHeight, viewportHeight]);

  const durationSeconds =
    groupHeight > 0 && pixelsPerSecond > 0
      ? groupHeight / pixelsPerSecond
      : 0;

  const isRunning = enabled && durationSeconds > 0;

  const trackStyle = {
    '--ticker-shift': `${-groupHeight}px`,
    '--ticker-duration': `${durationSeconds}s`,
    '--ticker-delay':
      phaseOffsetSeconds > 0 ? `-${phaseOffsetSeconds}s` : '0s',
  } as React.CSSProperties;

  return (
    <div
      ref={viewportRef}
      className="teacher-scroll-viewport relative h-full overflow-hidden"
    >
      <div
        className={`teacher-scroll-track ${
          reverse
            ? 'teacher-scroll-track--up'
            : 'teacher-scroll-track--down'
        }`}
        style={trackStyle}
        data-running={isRunning ? 'true' : 'false'}
      >
        {Array.from({ length: copies }, (_, copyIndex) => (
          <div
            key={`copy-${copyIndex}`}
            ref={copyIndex === 0 ? groupRef : undefined}
            className="teacher-scroll-group"
            aria-hidden={copyIndex > 0 ? true : undefined}
          >
            {items.map((item) => (
              <TeacherPhoto
                key={`${copyIndex}-${item.id}`}
                item={item}
                priority={copyIndex === 0}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// TEACHER PHOTO
// ============================================================

interface TeacherPhotoProps {
  item: TeacherImageItem;
  priority: boolean;
}

const TeacherPhoto: React.FC<TeacherPhotoProps> = ({ item, priority }) => {
  const [imgSrc, setImgSrc] = useState(item.imageUrl);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImgSrc(item.imageUrl);
    setHasError(false);
  }, [item.imageUrl]);

  const handleError = () => {
    if (imgSrc !== FALLBACK_IMAGE_URL) {
      setImgSrc(FALLBACK_IMAGE_URL);
      return;
    }

    setHasError(true);
  };

  // Şeffaf logo, fotoğraf gibi kırpılmamalı; arkasına da bir plaka gerekir.
  const isPlate = imgSrc.toLowerCase().includes('logo');

  return (
    <div
      className={`teacher-card w-full flex items-center justify-center${
        isPlate ? ' teacher-card--plate' : ''
      }`}
      style={{
        aspectRatio: `${
          item.aspectRatio > 0 ? item.aspectRatio : FALLBACK_ASPECT_RATIO
        }`,
      }}
    >
      {!hasError ? (
        <img
          src={imgSrc}
          /* Fotoğraflar dekoratif: erişilebilir ad dıştaki
             role="img" sarmalayıcısında bir kez veriliyor. */
          alt=""
          width={item.naturalWidth}
          height={item.naturalHeight}
          onError={handleError}
          draggable={false}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          className={
            isPlate
              ? 'w-4/5 h-4/5 object-contain'
              : 'w-full h-full object-cover'
          }
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
