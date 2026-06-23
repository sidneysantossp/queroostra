"use client";

import { Play } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { ProductMedia } from "@/lib/domain";

export function ProductMediaGallery({
  productName,
  showPreparedBadge,
  containImages,
  cover,
  media,
}: {
  productName: string;
  showPreparedBadge: boolean;
  containImages: boolean;
  cover: ProductMedia;
  media: ProductMedia[];
}) {
  const gallery = [cover, ...media].slice(0, 5);
  const [activeIndex, setActiveIndex] = useState(0);
  const active = gallery[activeIndex] ?? cover;

  return (
    <div>
      <div className="relative aspect-[4/3] max-h-[540px] overflow-hidden rounded-2xl border border-gold/20 bg-black">
        {active.type === "video" ? (
          <video
            key={active.url}
            src={active.url}
            poster={active.posterUrl}
            controls
            playsInline
            preload="metadata"
            className="size-full object-contain"
            aria-label={active.alt || `Vídeo de ${productName}`}
          />
        ) : (
          <Image
            src={active.url}
            alt={active.alt || `${productName} - imagem ${activeIndex + 1}`}
            fill
            priority={activeIndex === 0}
            unoptimized={active.url.startsWith("http")}
            className={containImages ? "object-contain p-5 sm:p-7" : "object-cover"}
            sizes="(max-width: 1023px) 100vw, 52vw"
          />
        )}
        {(active.type === "video" || showPreparedBadge) && (
          <span className="absolute bottom-4 left-4 rounded-full border border-gold/30 bg-black/75 px-4 py-2 text-[0.6rem] uppercase tracking-[0.15em] text-champagne">
            {active.type === "video" ? "Vídeo da experiência" : "Preparado sob demanda"}
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-5 gap-2" aria-label="Galeria do produto">
        {gallery.map((item, index) => (
          <button
            key={`${item.url}-${index}`}
            type="button"
            onClick={() => setActiveIndex(index)}
            aria-label={`Exibir ${item.type === "video" ? "vídeo" : "imagem"} ${index + 1} de ${productName}`}
            aria-pressed={activeIndex === index}
            className={`relative aspect-square overflow-hidden rounded-xl border bg-[#080808] transition ${activeIndex === index ? "border-gold" : "border-white/10 hover:border-gold/40"}`}
          >
            {item.type === "video" ? (
              <>
                {item.posterUrl ? (
                  <Image src={item.posterUrl} alt="" fill unoptimized={item.posterUrl.startsWith("http")} className="object-cover" sizes="120px" />
                ) : (
                  <video src={item.url} muted playsInline preload="metadata" className="size-full object-cover" />
                )}
                <span className="absolute inset-0 grid place-items-center bg-black/35"><Play size={18} className="fill-gold text-gold" /></span>
              </>
            ) : (
              <Image src={item.url} alt="" fill unoptimized={item.url.startsWith("http")} className={containImages ? "object-contain p-1.5" : "object-cover"} sizes="120px" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
