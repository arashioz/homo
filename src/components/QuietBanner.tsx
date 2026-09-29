import Link from "next/link";

export function QuietBanner({
  src,
  href,
  alt,
}: {
  src: string;
  href?: string;
  alt: string;
}) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  );
  if (href) {
    return (
      <Link href={href} className="quiet-banner">
        {img}
      </Link>
    );
  }
  return <div className="quiet-banner">{img}</div>;
}
