import type { ReactNode } from "react";
import { IonButton, IonIcon, IonSpinner } from "@ionic/react";
import { alertCircleOutline, refreshOutline } from "ionicons/icons";

interface PageFeedbackProps {
  loading?: boolean;
  error?: string;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRetry?: () => void;
  children: React.ReactNode;
}

export function PageFeedback({
  loading,
  error,
  empty,
  emptyTitle = "هنوز موردی وجود ندارد",
  emptyDescription,
  emptyAction,
  onRetry,
  children,
}: PageFeedbackProps) {
  if (loading) {
    return (
      <div className="feedback-state" aria-live="polite">
        <IonSpinner name="crescent" />
        <span>در حال دریافت اطلاعات…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feedback-state feedback-error" role="alert">
        <IonIcon icon={alertCircleOutline} />
        <strong>دریافت اطلاعات ناموفق بود</strong>
        <span>{error}</span>
        {onRetry ? <IonButton fill="outline" onClick={onRetry}><IonIcon slot="start" icon={refreshOutline} />تلاش دوباره</IonButton> : null}
      </div>
    );
  }

  if (empty) {
    return (
      <div className="feedback-state empty-state">
        <div className="empty-mark">+</div>
        <strong>{emptyTitle}</strong>
        {emptyDescription ? <span>{emptyDescription}</span> : null}
        {emptyAction}
      </div>
    );
  }

  return <>{children}</>;
}
