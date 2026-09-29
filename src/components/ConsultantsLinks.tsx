import { CONSULTANTS, telHref, waHref } from "@/lib/contact";

export function ConsultantsInline() {
  return (
    <span className="consult-inline">
      {CONSULTANTS.map((c, i) => (
        <span key={c.phone}>
          {i > 0 ? " · " : null}
          {c.name}{" "}
          <a href={telHref(c.phone)} dir="ltr">
            {c.phone}
          </a>
        </span>
      ))}
    </span>
  );
}

export function ConsultantsNav() {
  return (
    <details className="nav-consult">
      <summary className="nav-cta">تماس</summary>
      <div className="nav-consult-menu">
        {CONSULTANTS.map((c) => (
          <a key={c.phone} href={telHref(c.phone)}>
            <strong>{c.name}</strong>
            <span>{c.role}</span>
            <span dir="ltr">{c.phone}</span>
          </a>
        ))}
      </div>
    </details>
  );
}

export function ConsultantsActions({ whatsapp }: { whatsapp?: boolean }) {
  return (
    <div className="consult-actions">
      {CONSULTANTS.map((c) => (
        <div key={c.phone} className="consult-action">
          <span>{c.role}</span>
          <strong>{c.name}</strong>
          <div className="hero-actions">
            <a href={telHref(c.phone)} className="btn btn-primary">
              تماس {c.firstName}
            </a>
            {whatsapp ? (
              <a href={waHref(c.phone)} className="btn btn-ghost" target="_blank" rel="noreferrer">
                واتساپ
              </a>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
