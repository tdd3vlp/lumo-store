"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { banners } from "@/data/mockBanners";

export default function HeroCarousel() {
  return (
    <div className="overflow-hidden rounded-[32px]">
      <Swiper
        modules={[Autoplay]}
        autoplay={{ delay: 4000, disableOnInteraction: false }}
        loop
        slidesPerView={1}
        spaceBetween={20}
        className="hero-swiper"
      >
        {banners.map((banner) => (
          <SwiperSlide key={banner.id}>
            <div
              className="relative min-h-[280px] overflow-hidden rounded-[32px] border border-white/60 shadow-[0_18px_40px_rgba(143,92,255,0.14)] md:min-h-[420px]"
              style={{
                backgroundImage: `
                  linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.58) 42%, rgba(255,255,255,0.14) 100%),
                  url(${banner.image})
                `,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(143,92,255,0.24),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.14),transparent_24%)]" />

              <div className="relative z-10 flex h-full max-w-2xl flex-col justify-end p-6 md:p-10">
                <span className="mb-4 inline-flex w-fit rounded-full border border-white/60 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#7c4dff] shadow-sm">
                  {banner.badge}
                </span>

                <h2 className="mb-4 text-3xl font-black leading-tight text-[#251a3d] md:text-5xl">
                  {banner.title}
                </h2>

                <p className="mb-6 max-w-xl text-sm leading-6 text-[#5d4f7f] md:text-base">
                  {banner.description}
                </p>

                <div className="flex flex-wrap gap-3">
                  <button className="rounded-2xl bg-[linear-gradient(135deg,#8f5cff,#b281ff)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(143,92,255,0.28)] transition hover:translate-y-[-1px]">
                    Смотреть подборку
                  </button>

                  <button className="rounded-2xl border border-white/60 bg-white/75 px-5 py-3 text-sm font-semibold text-[#4b3a70] shadow-sm transition hover:bg-white">
                    Открыть каталог
                  </button>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
