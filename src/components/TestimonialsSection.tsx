import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

  useEffect(() => {
    fetchTestimonials();
  }, []);

  async function fetchTestimonials() {
    try {
      if (!supabase) {
        console.warn('Supabase not configured');
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
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

  return (
    <section className="py-12 sm:py-16 overflow-hidden bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-black text-[#191F61] mb-12 text-center">
          Öğrencilerimiz Ne Diyor?
        </h2>

        {/* YORUMLAR KONTEYNERI - SAĞDAN SOLA AKIŞ, ÜSTÜN ALT BORDER */}
        <div className="border-t-2 border-b-2 border-[#191F61]/20 py-8 overflow-x-auto scrollbar-hide">
          <div
            dir="rtl"
            className="flex gap-6 pb-4 min-w-max"
          >
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.id}
                className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300 shrink-0 w-80 border border-slate-200/50"
              >
                {/* YILDIZLAR */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-[#c5a059] text-[#c5a059]"
                    />
                  ))}
                </div>

                {/* YORUM METNİ */}
                <p className="text-slate-700 text-sm leading-relaxed mb-4 italic">
                  "{testimonial.content}"
                </p>

                {/* ÖĞRENCİ BİLGİSİ */}
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

        {/* SCROLL İPUCU (Mobil için) */}
        <div className="mt-4 text-center text-xs text-slate-500 sm:hidden">
          ← Kaydır →
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  );
}
