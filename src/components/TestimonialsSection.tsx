import { useEffect, useState } from 'react';
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
    
    // Real-time subscription to testimonials table
    if (supabase) {
      const subscription = supabase
        .channel('public:testimonials')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'testimonials' },
          () => {
            // When data changes, refetch testimonials
            fetchTestimonials();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
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
          Velilerimizin Görüşleri
        </h2>

        {/* YORUMLAR KONTEYNERI - OTOMATİK SAĞDAN SOLA AKIŞ */}
        <div className="border-t-4 border-b-4 border-[#191F61] py-8 overflow-hidden bg-white/40">
          <div
            dir="rtl"
            className="flex gap-6 animate-scroll"
          >
            {/* İlk döngü */}
            {testimonials.map((testimonial) => (
              <div
                key={`${testimonial.id}-1`}
                className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300 shrink-0 w-80 border border-slate-100"
              >
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
            
            {/* İkinci döngü (seamless loop için) */}
            {testimonials.map((testimonial) => (
              <div
                key={`${testimonial.id}-2`}
                className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300 shrink-0 w-80 border border-slate-100"
              >
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
      </div>

      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .animate-scroll {
          animation: scroll 40s linear infinite;
          width: max-content;
        }
        

      `}</style>
    </section>
  );
}
