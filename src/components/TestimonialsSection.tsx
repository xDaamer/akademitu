import React, { useEffect, useRef, useState } from 'react';
import { Quote, Star } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface Testimonial {
  id: string;
  student_name: string;
  student_grade: string;
  content: string;
  rating: number;
}

/** Yorum şeridinin saniyede kat ettiği piksel (ekran tazeleme hızından bağımsız). */
const TESTIMONIAL_SCROLL_PIXELS_PER_SECOND = 48;

/**
 * Listenin şeritte kaç kez tekrarlandığı. Döngü matematiği de bunu kullanır;
 * ikisi ayrı yerlerde yazıldığı için (3 kopya render edilip tur scrollWidth/2
 * kabul edildiği için) her turda sert bir sıçrama oluşuyordu.
 */
const TESTIMONIAL_SET_COUNT = 3;

export function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);

  useEffect(() => {
    fetchTestimonials();
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // Hareketi azalt tercihi açıksa şerit hiç akmaz.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let lastTimestamp: number | null = null;
    let cycleWidth = 0;

    /*
     * Bir tam tur = aynı kartın iki kopyası arasındaki mesafe.
     *
     * `scrollWidth / 3` kullanmak yanlış: scrollWidth N kart + (N-1) boşluk
     * içerir, dolayısıyla üçe bölünce kopya başına boşluğun 2/3'ü eksik kalır
     * (24px'lik gap'te tur başına 8px). Kartların gerçek konumunu ölçmek hem
     * bu farkı hem de responsive kart genişliklerini kendiliğinden çözer.
     */
    const measureCycle = () => {
      const cards = track.children;
      const cardsPerSet = cards.length / TESTIMONIAL_SET_COUNT;

      if (!Number.isInteger(cardsPerSet) || !cards[cardsPerSet]) {
        cycleWidth = 0;
        return;
      }

      cycleWidth = Math.abs(
        cards[cardsPerSet].getBoundingClientRect().left -
          cards[0].getBoundingClientRect().left
      );
    };

    measureCycle();

    const observer = new ResizeObserver(measureCycle);
    observer.observe(track);

    const renderLoop = (timestamp: number) => {
      /*
       * Kare başına değil, geçen SÜREYE göre ilerle. Sabit "+0.8 px/kare"
       * 60Hz'de 48 px/sn iken 120Hz ProMotion ekranda 96 px/sn oluyordu —
       * aynı site makineye göre iki farklı hızda akıyordu.
       * Sekme arka plandayken oluşan dev sıçramaları da 100ms'e kırpıyoruz.
       */
      const deltaSeconds =
        lastTimestamp === null
          ? 0
          : Math.min((timestamp - lastTimestamp) / 1000, 0.1);

      lastTimestamp = timestamp;

      if (!isDragging.current && cycleWidth > 0) {
        offsetRef.current =
          (offsetRef.current +
            TESTIMONIAL_SCROLL_PIXELS_PER_SECOND * deltaSeconds) %
          cycleWidth;

        track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
      }

      animationRef.current = window.requestAnimationFrame(renderLoop);
    };

    animationRef.current = window.requestAnimationFrame(renderLoop);

    return () => {
      observer.disconnect();

      if (animationRef.current) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, [testimonials.length]);

  async function fetchTestimonials() {
    if (!supabase) {
      setTestimonials([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('testimonials')
        .select('id, student_name, student_grade, content, rating')
        .eq('is_published', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      setTestimonials(data || []);
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      setTestimonials([]);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="py-12 text-center text-slate-500">
        Yorumlar yükleniyor...
      </div>
    );
  }

  if (testimonials.length === 0) {
    return null;
  }

  const repeatedTestimonials = Array.from(
    { length: TESTIMONIAL_SET_COUNT },
    () => testimonials
  ).flat();

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    const container = scrollRef.current;
    if (!container) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    isDragging.current = true;
    startX.current = event.clientX;
    startScrollLeft.current = container.scrollLeft;
    container.classList.add('dragging');
    // Akış rAF ile sürüldüğü için duraklatma `isDragging` üzerinden olur;
    // burada bir CSS animasyonu yok (eski `animationPlayState` yazımı no-op'tu).
    container.style.cursor = 'grabbing';
    container.style.userSelect = 'none';
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = scrollRef.current;
    if (!container || !isDragging.current) return;

    const walk = event.clientX - startX.current;
    container.scrollLeft = startScrollLeft.current - walk;
  };

  const stopDragging = (event?: React.PointerEvent<HTMLDivElement>) => {
    const container = scrollRef.current;
    if (!container) return;

    if (event && typeof event.currentTarget.releasePointerCapture === 'function') {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // no-op
      }
    }

    isDragging.current = false;
    container.classList.remove('dragging');
    container.style.cursor = '';
    container.style.userSelect = '';
  };

  return (
    <section className="py-12 sm:py-16 overflow-hidden bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 bg-[#191F61]/10 text-[#191F61] border border-[#c5a059]/30 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold mb-3 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]" />
            <span>Veli & Öğrenci Yorumları</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#191F61] tracking-tight">
            Velilerimizin Görüşleri
          </h2>
        </div>

        <div className="border-t-4 border-b-4 border-[#191F61] py-8 bg-white/40 overflow-visible relative">
          <div
            ref={scrollRef}
            dir="rtl"
            className="cursor-grab active:cursor-grabbing select-none overflow-x-hidden px-2 py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            style={{ touchAction: 'pan-y' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            onContextMenu={(event) => event.preventDefault()}
          >
            <div
              ref={trackRef}
              className="flex gap-6 w-max will-change-transform"
            >
              {repeatedTestimonials.map((testimonial, index) => (
                <div
                  key={`${testimonial.id}-${index}`}
                  className="group bg-white rounded-xl p-6 shadow-sm hover:shadow-[0_8px_14px_rgba(25,31,97,0.05)] hover:-translate-y-0.5 transition-all duration-200 shrink-0 w-80 border border-slate-100"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-0.5" aria-label={`${testimonial.rating || 5} / 5 yıldız`}>
                      {Array.from({ length: 5 }).map((_, starIndex) => (
                        <Star
                          key={starIndex}
                          className={`w-3.5 h-3.5 ${
                            starIndex < (testimonial.rating || 5)
                              ? 'fill-[#c5a059] text-[#c5a059]'
                              : 'fill-slate-200 text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <Quote className="w-5 h-5 text-[#191F61]/10 shrink-0" />
                  </div>

                  <p className="text-slate-700 text-sm leading-relaxed mb-4 italic">
                    "{testimonial.content}"
                  </p>

                  <div className="border-t border-slate-100 pt-4">
                    <p className="font-bold text-[#191F61] text-sm">
                      {testimonial.student_name}
                    </p>
                    {testimonial.student_grade && (
                      <p className="text-xs text-slate-500 mt-1">
                        {testimonial.student_grade}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
