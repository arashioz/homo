import Image from "next/image";
import type { Project } from "@/lib/types";

export function ProjectsSection({ projects }: { projects: Project[] }) {
  return (
    <section id="projects" className="section">
      <div className="section-head reveal">
        <div>
          <h2>پروژه‌های اجراشده</h2>
          <p>نمونه‌کارهای نصب و راه‌اندازی تیم هومو</p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="empty-projects reveal">
          به‌زودی پروژه‌های جدید اینجا منتشر می‌شود.
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((p) => (
            <article key={p.id} className="project-card reveal">
              <div className="project-media">
                <Image src={p.image} alt={p.title} fill sizes="(max-width:860px) 100vw, 33vw" />
              </div>
              <div className="project-body">
                {p.location && <span className="project-loc">{p.location}</span>}
                <h3>{p.title}</h3>
                <p>{p.description}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
