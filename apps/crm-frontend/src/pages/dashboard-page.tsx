import { IonButton, IonIcon, IonProgressBar } from "@ionic/react";
import {
  arrowBackOutline,
  briefcaseOutline,
  checkmarkCircleOutline,
  peopleOutline,
  refreshOutline,
} from "ionicons/icons";
import { useApiResource } from "../hooks/use-api-resource";
import { formatDate, isOverdue, isToday } from "../lib/format";
import type { CrmPage, Customer, Project, Task } from "../types";
import { PageFeedback } from "../components/page-feedback";
import { PageHeading } from "../components/page-heading";

interface DashboardPageProps {
  token: string;
  onNavigate: (page: CrmPage) => void;
}

const projectStatusLabels: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  READY: "آماده شروع",
  IN_PROGRESS: "در حال اجرا",
  ON_HOLD: "متوقف",
  COMPLETED: "تکمیل‌شده",
  CANCELLED: "لغو شده",
};

export function DashboardPage({ token, onNavigate }: DashboardPageProps) {
  const customers = useApiResource<Customer[]>("/customers", token);
  const projects = useApiResource<Project[]>("/projects", token);
  const tasks = useApiResource<Task[]>("/tasks", token);
  const allLoading = customers.loading || projects.loading || tasks.loading;
  const error = customers.error ?? projects.error ?? tasks.error;
  const reload = async () => {
    await Promise.all([customers.reload(), projects.reload(), tasks.reload()]);
  };

  const taskList = tasks.data ?? [];
  const projectList = projects.data ?? [];
  const customerList = customers.data ?? [];
  const todayTasks = taskList.filter((task) => isToday(task.dueAt) && task.status !== "DONE");
  const overdueTasks = taskList.filter((task) => isOverdue(task.dueAt) && task.status !== "DONE");
  const activeProjects = projectList.filter((project) => project.status === "IN_PROGRESS");

  return (
    <>
      <PageHeading
        eyebrow="نمای کلی کسب‌وکار"
        title="صبح بخیر، آمادهٔ یک روز منظم هستید؟"
        description="وضعیت مشتری‌ها، پروژه‌ها و کارهای ضروری را از همین‌جا دنبال کنید."
        action={<IonButton fill="outline" onClick={() => void reload()}><IonIcon slot="start" icon={refreshOutline} />به‌روزرسانی</IonButton>}
      />

      <PageFeedback loading={allLoading} error={error} onRetry={() => void reload()}>
        <section className="stats-grid">
          <article className="stat-card teal">
            <span className="stat-icon"><IonIcon icon={peopleOutline} /></span>
            <div><strong>{customerList.length.toLocaleString("fa-IR")}</strong><span>مشتری و لید</span></div>
            <button type="button" onClick={() => onNavigate("customers")}>مشاهده <IonIcon icon={arrowBackOutline} /></button>
          </article>
          <article className="stat-card indigo">
            <span className="stat-icon"><IonIcon icon={briefcaseOutline} /></span>
            <div><strong>{activeProjects.length.toLocaleString("fa-IR")}</strong><span>پروژهٔ در حال اجرا</span></div>
            <button type="button" onClick={() => onNavigate("projects")}>پروژه‌ها <IonIcon icon={arrowBackOutline} /></button>
          </article>
          <article className="stat-card amber">
            <span className="stat-icon"><IonIcon icon={checkmarkCircleOutline} /></span>
            <div><strong>{todayTasks.length.toLocaleString("fa-IR")}</strong><span>تسک سررسید امروز</span></div>
            <button type="button" onClick={() => onNavigate("tasks")}>تسک‌ها <IonIcon icon={arrowBackOutline} /></button>
          </article>
          <article className="stat-card rose">
            <span className="stat-icon"><IonIcon icon={checkmarkCircleOutline} /></span>
            <div><strong>{overdueTasks.length.toLocaleString("fa-IR")}</strong><span>تسک عقب‌افتاده</span></div>
            <button type="button" onClick={() => onNavigate("tasks")}>رسیدگی <IonIcon icon={arrowBackOutline} /></button>
          </article>
        </section>

        <section className="dashboard-columns">
          <article className="dashboard-panel">
            <div className="panel-heading">
              <div><h2>پروژه‌های فعال</h2><p>آخرین وضعیت اجرای پروژه‌ها</p></div>
              <button type="button" onClick={() => onNavigate("projects")}>همهٔ پروژه‌ها</button>
            </div>
            {activeProjects.length ? (
              <div className="project-compact-list">
                {activeProjects.slice(0, 5).map((project) => (
                  <div className="project-compact" key={project._id ?? project.id ?? project.code}>
                    <div className="project-compact-header">
                      <div><strong>{project.name}</strong><span>{project.code}</span></div>
                      <span>{project.progress.toLocaleString("fa-IR")}٪</span>
                    </div>
                    <IonProgressBar value={Math.min(Math.max(project.progress, 0), 100) / 100} />
                    <div className="project-compact-footer"><span>{projectStatusLabels[project.status] ?? project.status}</span><span>پایان: {formatDate(project.targetEndDate)}</span></div>
                  </div>
                ))}
              </div>
            ) : <div className="inline-empty">پروژهٔ در حال اجرایی وجود ندارد.</div>}
          </article>

          <article className="dashboard-panel task-summary-panel">
            <div className="panel-heading">
              <div><h2>کارهای نیازمند توجه</h2><p>اولویت‌بندی‌شده بر اساس سررسید</p></div>
              <button type="button" onClick={() => onNavigate("tasks")}>تسک‌های من</button>
            </div>
            {taskList.filter((task) => task.status !== "DONE").slice(0, 5).map((task) => (
              <div className="task-summary" key={task._id ?? task.id ?? task.title}>
                <span className={isOverdue(task.dueAt) ? "task-dot overdue" : "task-dot"} />
                <div><strong>{task.title}</strong><span>سررسید: {formatDate(task.dueAt)}</span></div>
                <span className="task-priority">{task.priority}</span>
              </div>
            ))}
            {!taskList.filter((task) => task.status !== "DONE").length ? <div className="inline-empty">کار باز ندارید؛ عالی است.</div> : null}
          </article>
        </section>
      </PageFeedback>
    </>
  );
}
