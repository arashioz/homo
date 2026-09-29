import { useMemo, useState } from "react";
import {
  IonBadge,
  IonButton,
  IonCheckbox,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  IonToast,
} from "@ionic/react";
import { addOutline, calendarOutline, closeOutline, filterOutline, refreshOutline } from "ionicons/icons";
import { PageFeedback } from "../components/page-feedback";
import { PageHeading } from "../components/page-heading";
import { useApiResource } from "../hooks/use-api-resource";
import { ApiError, apiRequest } from "../lib/api";
import { formatDate, isOverdue, isToday } from "../lib/format";
import { recordId, type Project, type SessionUser, type Task } from "../types";

type TaskFilter = "ALL" | "MINE" | "TODAY" | "OVERDUE" | "DONE";

const taskStatusLabels: Record<string, string> = {
  TODO: "برای انجام",
  IN_PROGRESS: "در حال انجام",
  REVIEW: "در بررسی",
  BLOCKED: "مسدود",
  DONE: "انجام‌شده",
  CANCELLED: "لغو شده",
};

const priorityLabels: Record<string, string> = {
  LOW: "کم",
  MEDIUM: "متوسط",
  HIGH: "زیاد",
  URGENT: "فوری",
};

const emptyTasks: Task[] = [];
const emptyProjects: Project[] = [];

interface TasksPageProps {
  token: string;
  user: SessionUser;
}

export function TasksPage({ token, user }: TasksPageProps) {
  const tasksResource = useApiResource<Task[]>("/tasks", token);
  const projectsResource = useApiResource<Project[]>("/projects", token);
  const [filter, setFilter] = useState<TaskFilter>("MINE");
  const [query, setQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [message, setMessage] = useState<string>();
  const [messageColor, setMessageColor] = useState<"success" | "danger">("success");

  const tasks = tasksResource.data ?? emptyTasks;
  const projects = projectsResource.data ?? emptyProjects;
  const projectNames = useMemo(
    () => new Map(projects.map((project) => [recordId(project), project.name])),
    [projects],
  );

  const visibleTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fa-IR");
    return tasks.filter((task) => {
      const matchesFilter = filter === "ALL"
        || (filter === "MINE" && recordId(task.assigneeId) === user.id)
        || (filter === "TODAY" && isToday(task.dueAt) && task.status !== "DONE")
        || (filter === "OVERDUE" && isOverdue(task.dueAt) && task.status !== "DONE")
        || (filter === "DONE" && task.status === "DONE");
      return matchesFilter && (!normalizedQuery || task.title.toLocaleLowerCase("fa-IR").includes(normalizedQuery));
    });
  }, [filter, query, tasks, user.id]);

  const showMessage = (text: string, color: "success" | "danger") => {
    setMessageColor(color);
    setMessage(text);
  };

  async function updateTaskStatus(task: Task, status: string) {
    const id = recordId(task);
    if (!id || status === task.status) return;
    tasksResource.setData((current) => current?.map((item) => recordId(item) === id ? { ...item, status } : item));
    try {
      const updated = await apiRequest<Task>(`/tasks/${id}`, { method: "PATCH", token, body: { status } });
      tasksResource.setData((current) => current?.map((item) => recordId(item) === id ? updated : item));
    } catch (exception) {
      await tasksResource.reload();
      showMessage(exception instanceof ApiError ? exception.message : "تغییر وضعیت ثبت نشد.", "danger");
    }
  }

  async function toggleChecklist(task: Task, index: number) {
    const id = recordId(task);
    if (!id) return;
    tasksResource.setData((current) => current?.map((item) => {
      if (recordId(item) !== id) return item;
      return {
        ...item,
        checklist: item.checklist.map((entry, entryIndex) => entryIndex === index ? { ...entry, checked: !entry.checked } : entry),
      };
    }));
    try {
      const updated = await apiRequest<Task>(`/tasks/${id}/checklist/${index}`, { method: "PATCH", token });
      tasksResource.setData((current) => current?.map((item) => recordId(item) === id ? updated : item));
    } catch (exception) {
      await tasksResource.reload();
      showMessage(exception instanceof ApiError ? exception.message : "تغییر چک‌لیست ثبت نشد.", "danger");
    }
  }

  const reload = async () => {
    await Promise.all([tasksResource.reload(), projectsResource.reload()]);
  };

  return (
    <>
      <PageHeading
        eyebrow="پیگیری کارهای روزانه"
        title="تسک‌های من"
        description="کارها را بررسی کنید، وضعیتشان را تغییر دهید و آیتم‌های چک‌لیست را همان‌جا تیک بزنید."
        action={
          <div className="page-action-group">
            <IonButton fill="outline" aria-label="به‌روزرسانی تسک‌ها" onClick={() => void reload()}><IonIcon slot="icon-only" icon={refreshOutline} /></IonButton>
            <IonButton onClick={() => setIsCreateOpen(true)}><IonIcon slot="start" icon={addOutline} />تسک جدید</IonButton>
          </div>
        }
      />

      <div className="task-toolbar">
        <div className="task-filter-scroll" aria-label="فیلتر تسک‌ها">
          {([
            ["MINE", "تسک‌های من"],
            ["TODAY", "امروز"],
            ["OVERDUE", "عقب‌افتاده"],
            ["DONE", "انجام‌شده"],
            ["ALL", "همه"],
          ] as [TaskFilter, string][]).map(([value, label]) => (
            <button className={filter === value ? "active" : ""} key={value} type="button" onClick={() => setFilter(value)}>{label}</button>
          ))}
        </div>
        <IonItem className="search-control" lines="none">
          <IonIcon slot="start" icon={filterOutline} />
          <IonInput value={query} onIonInput={(event) => setQuery(event.detail.value ?? "")} placeholder="جست‌وجوی تسک" />
        </IonItem>
      </div>

      <PageFeedback
        loading={tasksResource.loading}
        error={tasksResource.error}
        empty={!tasksResource.loading && !tasksResource.error && visibleTasks.length === 0}
        emptyTitle={filter === "MINE" ? "تسکی به شما تخصیص داده نشده" : "تسکی برای این فیلتر پیدا نشد"}
        emptyDescription="با ساخت یک تسک جدید، کارهای روزانه را از همین‌جا مدیریت کنید."
        onRetry={() => void reload()}
      >
        <section className="task-list">
          {visibleTasks.map((task) => {
            const taskId = recordId(task);
            const checklist = task.checklist ?? [];
            const completedItems = checklist.filter((item) => item.checked).length;
            return (
              <article className={`task-card ${task.status === "DONE" ? "is-complete" : ""}`} key={taskId || task.title}>
                <div className="task-card-top">
                  <div className="task-copy">
                    <div className="task-meta-row">
                      <IonBadge className={`priority-badge priority-${task.priority.toLowerCase()}`}>{priorityLabels[task.priority] ?? task.priority}</IonBadge>
                      {projectNames.get(recordId(task.projectId)) ? <span>{projectNames.get(recordId(task.projectId))}</span> : <span>بدون پروژه</span>}
                    </div>
                    <h2>{task.title}</h2>
                  </div>
                  <IonSelect
                    aria-label="وضعیت تسک"
                    className="status-select"
                    interface="popover"
                    value={task.status}
                    onIonChange={(event) => void updateTaskStatus(task, String(event.detail.value))}
                  >
                    {Object.entries(taskStatusLabels).map(([value, label]) => <IonSelectOption key={value} value={value}>{label}</IonSelectOption>)}
                  </IonSelect>
                </div>

                <div className="task-card-info">
                  <span className={isOverdue(task.dueAt) && task.status !== "DONE" ? "due-date overdue" : "due-date"}><IonIcon icon={calendarOutline} />سررسید: {formatDate(task.dueAt)}</span>
                  {checklist.length ? <span>{completedItems.toLocaleString("fa-IR")} از {checklist.length.toLocaleString("fa-IR")} آیتم انجام شده</span> : null}
                </div>

                {checklist.length ? (
                  <div className="task-checklist">
                    {checklist.map((item, index) => (
                      <IonCheckbox
                        className="checklist-item"
                        checked={item.checked}
                        key={`${taskId}-${index}-${item.title}`}
                        onIonChange={() => void toggleChecklist(task, index)}
                      >
                        {item.title}
                      </IonCheckbox>
                    ))}
                  </div>
                ) : <div className="task-no-checklist">برای این تسک چک‌لیستی ثبت نشده است.</div>}
              </article>
            );
          })}
        </section>
      </PageFeedback>

      <CreateTaskModal
        isOpen={isCreateOpen}
        projects={projects}
        onDismiss={() => setIsCreateOpen(false)}
        onCreated={(task) => {
          tasksResource.setData((current) => [task, ...(current ?? [])]);
          setIsCreateOpen(false);
          showMessage("تسک جدید با موفقیت ثبت شد.", "success");
        }}
        onError={(error) => showMessage(error, "danger")}
        token={token}
        user={user}
      />
      <IonToast isOpen={Boolean(message)} message={message} color={messageColor} duration={3200} onDidDismiss={() => setMessage(undefined)} />
    </>
  );
}

interface CreateTaskModalProps {
  isOpen: boolean;
  projects: Project[];
  token: string;
  user: SessionUser;
  onDismiss: () => void;
  onCreated: (task: Task) => void;
  onError: (error: string) => void;
}

function CreateTaskModal({ isOpen, projects, token, user, onDismiss, onCreated, onError }: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueAt, setDueAt] = useState("");
  const [checklistText, setChecklistText] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const checklist = checklistText.split("\n").map((line) => line.trim()).filter(Boolean).map((item) => ({ title: item, checked: false }));
      const task = await apiRequest<Task>("/tasks", {
        method: "POST",
        token,
        body: {
          title: title.trim(),
          projectId: projectId || undefined,
          assigneeId: user.id,
          priority,
          dueAt: dueAt || undefined,
          checklist,
        },
      });
      setTitle("");
      setProjectId("");
      setPriority("MEDIUM");
      setDueAt("");
      setChecklistText("");
      onCreated(task);
    } catch (exception) {
      onError(exception instanceof ApiError ? exception.message : "ایجاد تسک ممکن نشد.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onDismiss} className="form-modal">
      <div className="modal-shell">
        <div className="modal-heading"><div><span className="page-eyebrow">برنامه‌ریزی کار</span><h2>تسک جدید</h2></div><IonButton fill="clear" aria-label="بستن" onClick={onDismiss}><IonIcon slot="icon-only" icon={closeOutline} /></IonButton></div>
        <form onSubmit={submit} className="modal-form">
          <IonItem className="form-item" lines="none"><IonLabel position="stacked">عنوان تسک</IonLabel><IonInput value={title} onIonInput={(event) => setTitle(event.detail.value ?? "")} placeholder="مثلاً هماهنگی بازدید پروژه" required /></IonItem>
          <IonItem className="form-item" lines="none"><IonLabel position="stacked">پروژه (اختیاری)</IonLabel><IonSelect interface="popover" value={projectId} placeholder="انتخاب پروژه" onIonChange={(event) => setProjectId(String(event.detail.value ?? ""))}>{projects.map((project) => <IonSelectOption key={recordId(project)} value={recordId(project)}>{project.name}</IonSelectOption>)}</IonSelect></IonItem>
          <div className="form-grid">
            <IonItem className="form-item" lines="none"><IonLabel position="stacked">اولویت</IonLabel><IonSelect interface="popover" value={priority} onIonChange={(event) => setPriority(String(event.detail.value))}>{Object.entries(priorityLabels).map(([value, label]) => <IonSelectOption key={value} value={value}>{label}</IonSelectOption>)}</IonSelect></IonItem>
            <IonItem className="form-item" lines="none"><IonLabel position="stacked">سررسید</IonLabel><IonInput type="date" value={dueAt} onIonInput={(event) => setDueAt(event.detail.value ?? "")} /></IonItem>
          </div>
          <IonItem className="form-item" lines="none"><IonLabel position="stacked">چک‌لیست (هر خط یک آیتم)</IonLabel><IonTextarea autoGrow value={checklistText} onIonInput={(event) => setChecklistText(event.detail.value ?? "")} placeholder={"تماس با مشتری\nثبت گزارش بازدید"} /></IonItem>
          <IonButton className="primary-action" type="submit" expand="block" disabled={saving || !title.trim()}>{saving ? <IonSpinner name="crescent" /> : "ثبت تسک"}</IonButton>
        </form>
      </div>
    </IonModal>
  );
}
