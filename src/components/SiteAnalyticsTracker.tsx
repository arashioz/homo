"use client";

import { useEffect } from "react";

const visitorKey = "homo_site_visitor";

function visitorId() {
  const current = localStorage.getItem(visitorKey);
  if (current) return current;
  const value = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(visitorKey, value);
  return value;
}

function send(payload: Record<string, string>) {
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
    return;
  }
  void fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
}

export function SiteAnalyticsTracker() {
  useEffect(() => {
    const id = visitorId();
    send({ type: "pageview", path: `${location.pathname}${location.search}`, visitorId: id });
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest("a,button") : null;
      if (!target) return;
      const label = target.getAttribute("data-analytics-label") || target.getAttribute("aria-label") || target.textContent?.trim().replace(/\s+/g, " ").slice(0, 120);
      send({ type: "click", path: location.pathname, visitorId: id, ...(label ? { label } : {}), ...(target instanceof HTMLAnchorElement && target.href ? { href: target.href } : {}) });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}
