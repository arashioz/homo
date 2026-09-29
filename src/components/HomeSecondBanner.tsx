export function HomeSecondBanner() {
  return (
    <section id="shop" className="section home-second-banner home-about-banners" aria-label="درباره خانه هوشمند هومو">
      <div className="home-about-card-visual" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/banners/homo-about-card.png" alt="" />
      </div>
      <article className="home-about-copy">
        <span>ABOUT HOMO</span>
        <h2>درباره هومو</h2>
        <p>
          هومو کار هوشمندسازی ساختمان را از سال ۱۴۰۴ شروع کرده؛ با تمرکز روی انتخاب درست قطعات،
          اجرای خلوت و تجربه‌ای که کنترل خانه را ساده‌تر کند.
        </p>
        <p>
          در این مسیر، بخشی از قطعات را توسعه داده‌ایم و بخشی را از شرکت‌های واردکننده معتبر تهیه
          می‌کنیم. هومو هنوز در حال توسعه است؛ برای ساختن حال خوب، برای کاربرهای خوب.
        </p>
      </article>
    </section>
  );
}
