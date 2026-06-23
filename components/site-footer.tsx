import { Facebook, Instagram, Mail, MessageCircle } from "lucide-react";
import Link from "next/link";
import { OysterLogo } from "@/components/oyster-logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#020202]">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-14 md:grid-cols-[1.25fr_.8fr_.8fr] md:px-8">
        <div>
          <OysterLogo />
          <p className="mt-5 max-w-sm text-xs leading-6 text-white/40">Ostras selecionadas sob demanda e entregues com data e hora programada para transformar momentos especiais em experiências memoráveis.</p>
          <div className="mt-5 flex gap-3">
            {[
              { href: "https://instagram.com/queroostra", label: "Instagram", Icon: Instagram },
              { href: "https://facebook.com/queroostraoficial", label: "Facebook", Icon: Facebook },
              { href: "mailto:contato@queroostra.com.br", label: "E-mail", Icon: Mail },
              { href: "/cardapio", label: "Atendimento", Icon: MessageCircle },
            ].map(({ href, label, Icon }) => <a key={label} href={href} aria-label={label} className="grid size-10 place-items-center rounded-full border border-white/10 text-white/45 transition hover:border-gold hover:text-gold"><Icon size={17} /></a>)}
          </div>
        </div>
        <div>
          <p className="footer-title">Navegação</p>
          <div className="footer-links"><Link href="/">Início</Link><Link href="/cardapio">Cardápio</Link><Link href="/produtos">Produtos</Link><Link href="/blog">Blog</Link></div>
        </div>
        <div>
          <p className="footer-title">Conteúdo</p>
          <div className="footer-links"><Link href="/blog?categoria=guia-de-ostras">Guia de ostras</Link><Link href="/blog?categoria=onde-comer-em-sao-paulo">Onde comer em SP</Link><Link href="/blog?categoria=harmonizacao">Harmonização</Link><Link href="/dashboard">Minha conta</Link></div>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-center text-[0.62rem] text-white/25">© {new Date().getFullYear()} Quero Ostra. Todos os direitos reservados.</div>
    </footer>
  );
}
