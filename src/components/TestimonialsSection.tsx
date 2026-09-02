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

    const renderLoop = () => {
      if (!isDragging.current) {
        const cycleWidth = track.scrollWidth / 2;
        offsetRef.current += 0.8;

        if (offsetRef.current >= cycleWidth) {
          offsetRef.current -= cycleWidth;
        }

        track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
      }

      animationRef.current = window.requestAnimationFrame(renderLoop);
    };

    animationRef.current = window.requestAnimationFrame(renderLoop);

    return () => {
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

  const repeatedTestimonials = [...testimonials, ...testimonials, ...testimonials];

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    const container = scrollRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    isDragging.current = true;
    startX.current = event.clientX;
    startScrollLeft.current = container.scrollLeft;
    container.classList.add('dragging');
    track.style.animationPlayState = 'paused';
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
    const track = trackRef.current;
    if (!container || !track) return;

    if (event && typeof event.currentTarget.releasePointerCapture === 'function') {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // no-op
      }
    }

    isDragging.current = false;
    container.classList.remove('dragging');
    track.style.animationPlayState = '';
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
              className="flex gap-6 w-max"
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

      <style>{`
        .animate-scroll {
          will-change: transform;
        }
      `}</style>
    </section>
  );
}
