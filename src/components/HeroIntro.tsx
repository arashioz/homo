import Link from "next/link";
import { SmartHomeIntroDialog } from "@/components/AiExplainer";

const logoFullPath = "/logo/homo-logo-full.jpeg";

export function HeroIntro() {
  return (
    <section id="top" className="intro-page intro-page-simple">
      <div className="intro-pattern intro-pattern-dots" aria-hidden />
      <div className="intro-pattern intro-pattern-lines intro-pattern-motion" aria-hidden />
      <div className="intro-logo-pattern" aria-hidden>
        <img src={logoFullPath} alt="" width={720} height={340} />
      </div>
      <div className="intro-copy">
        <p className="intro-role">HOMO SMART HOME</p>
        <h1>زندگی هوشمند<span>در خانه هوشمند</span></h1>
        <p className="intro-lead">هوشمند یعنی کنترل ساده خونه با گوشی و صدای شما</p>
        <div className="intro-actions">
          <Link href="/products" className="btn btn-intro">مشاهدهٔ تجهیزات</Link>
          <SmartHomeIntroDialog />
        </div>
      </div>
      <a href="#shop" className="intro-scroll" aria-label="رفتن به محصولات"><i /></a>
    </section>
  );
}
