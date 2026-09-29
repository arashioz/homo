import vazirmatnRegularUrl from "@fontsource/vazirmatn/files/vazirmatn-arabic-400-normal.woff2";
import vazirmatnBoldUrl from "@fontsource/vazirmatn/files/vazirmatn-arabic-800-normal.woff2";
import { formatDate, formatMoney } from "./format";
import type { Invoice } from "../types";

const logoFullPath = "/logo/homo-logo-full.jpeg";
export type InvoicePdfLayout = "items" | "grid";

export function invoiceStatusLabel(status: string, kind?: string) {
  if (kind === "PROFORMA" && (status === "SENT" || status === "DRAFT" || status === "OVERDUE")) return "پیش‌فاکتور";
  const labels: Record<string, string> = {
    DRAFT: "پیش‌نویس",
    SENT: "فاکتور صادرشده",
    PARTIALLY_PAID: "پرداخت بخشی",
    PAID: "پرداخت‌شده",
    OVERDUE: "سررسید گذشته",
    CANCELLED: "حذف/باطل‌شده",
  };
  return labels[status] ?? status;
}

export function invoiceDocumentTitle(invoice: Invoice) {
  return invoice.kind === "PROFORMA" || (invoice.status === "DRAFT" && invoice.kind !== "INVOICE")
    ? "پیش فاکتور"
    : "فاکتور فروش";
}

export function invoiceMessage(invoice: Invoice, projectName: string, customerName: string) {
  const label = invoiceDocumentTitle(invoice);
  return `خانه هوشمند\nمشتری: ${customerName}\n${label}: ${invoice.number}\nپروژه: ${projectName}\nمبلغ: ${formatMoney(invoice.totalAmount)}\nمانده: ${formatMoney(invoice.outstandingAmount)}`;
}

export async function copyInvoiceMessage(invoice: Invoice, projectName: string, customerName: string) {
  await navigator.clipboard.writeText(invoiceMessage(invoice, projectName, customerName));
}

export function smsInvoice(invoice: Invoice, projectName: string, customerName: string) {
  window.location.href = `sms:?body=${encodeURIComponent(invoiceMessage(invoice, projectName, customerName))}`;
}

export function whatsappInvoice(invoice: Invoice, projectName: string, customerName: string, mobile?: string) {
  const text = encodeURIComponent(invoiceMessage(invoice, projectName, customerName));
  const phone = toWhatsAppPhone(mobile);
  window.open(phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
}

export function downloadInvoicePdf(invoice: Invoice, projectName: string, customerName: string, layout: InvoicePdfLayout) {
  printInvoice(invoice, projectName, customerName, layout);
}

export function printInvoice(invoice: Invoice, projectName: string, customerName: string, layout: InvoicePdfLayout = "items") {
  const logoUrl = new URL(logoFullPath, window.location.origin).href;
  const documentTitle = invoiceDocumentTitle(invoice);
  const documentNoLabel = documentTitle === "پیش فاکتور" ? "شماره پیش فاکتور" : "شماره فاکتور";
  const projectProtocol = invoiceProjectSetting(invoice, "پروتکل پروژه") || "—";
  const projectColor = invoiceProjectSetting(invoice, "توضیحات پروژه") || invoiceProjectSetting(invoice, "رنگ پروژه") || "—";
  const rows = (invoice.lines ?? []).map((line, index) => `<tr><td class="row-index">${(index + 1).toLocaleString("fa-IR")}</td><td class="desc"><b>${safe(line.title)}</b>${line.note ? `<small>${safe(line.note)}</small>` : ""}${line.color ? `<em>توضیحات: ${safe(line.color)}</em>` : ""}</td><td>${line.quantity.toLocaleString("fa-IR")}</td><td>${line.unitPrice.toLocaleString("fa-IR")}</td><td class="amount">${line.lineTotal.toLocaleString("fa-IR")}</td></tr>`).join("");
  const cards = (invoice.lines ?? []).map((line, index) => `<article class="invoice-card"><div class="card-head"><span>${(index + 1).toLocaleString("fa-IR")}</span><b>${safe(line.kind === "SERVICE" ? "خدمت" : "کالا")}</b></div><h3>${safe(line.title)}</h3>${line.note ? `<p>${safe(line.note)}</p>` : ""}${line.color ? `<p>${safe(line.color)}</p>` : ""}<dl><div><dt>تعداد</dt><dd>${line.quantity.toLocaleString("fa-IR")}</dd></div><div><dt>قیمت واحد</dt><dd>${line.unitPrice.toLocaleString("fa-IR")}</dd></div><div><dt>مبلغ کل</dt><dd>${line.lineTotal.toLocaleString("fa-IR")}</dd></div></dl></article>`).join("");
  const invoiceBody = layout === "grid"
    ? `<section class="invoice-grid">${cards || `<p class="empty">ردیفی برای این فاکتور ثبت نشده است.</p>`}</section>`
    : `<table><thead><tr><th>ردیف</th><th>شرح کالا / خدمت</th><th>تعداد</th><th>قیمت واحد</th><th>مبلغ کل</th></tr></thead><tbody>${rows || `<tr><td colspan="5">ردیفی برای این فاکتور ثبت نشده است.</td></tr>`}</tbody></table>`;
  const popup = window.open("", "_blank");
  if (!popup) return;
  popup.document.write(`<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>${safe(invoice.number)}</title><style>
@font-face{font-family:VazirmatnInvoice;src:url('${vazirmatnRegularUrl}') format('woff2');font-weight:400;font-style:normal;font-display:block}@font-face{font-family:VazirmatnInvoice;src:url('${vazirmatnBoldUrl}') format('woff2');font-weight:800;font-style:normal;font-display:block}
*{box-sizing:border-box}body{margin:0;background:#eef2f3;color:#14232b;font-family:VazirmatnInvoice,sans-serif;font-size:12px;padding:24px}.paper{width:186mm;min-height:273mm;margin:auto;background:#fff;padding:13mm 12mm 11mm;border:1px solid #d8e0e1;box-shadow:0 16px 48px rgba(19,44,53,.13)}.top{display:grid;grid-template-columns:1fr 170px;gap:20px;align-items:stretch;border-bottom:3px solid #0f766e;padding-bottom:16px}.brand{display:flex;align-items:center;gap:14px}.brand-logo{width:142px;height:67px;border-radius:10px;object-fit:cover}.brand h1{margin:0;font-size:24px;font-weight:800;letter-spacing:-.04em}.brand small{display:block;margin-top:4px;color:#587079;font-size:10px}.invoice-no{background:#12343f;color:#fff;padding:13px 15px;text-align:center}.invoice-no span,.layout-badge{display:block;color:#a8cfca;font-size:10px}.invoice-no b{display:block;margin-top:7px;direction:ltr;font-size:16px}.layout-badge{margin-top:8px;color:#d8f4ef}.info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:0;margin:18px 0;border:1px solid #d9e1e2}.info-card{min-height:63px;padding:11px 13px;border-left:1px solid #d9e1e2;border-bottom:1px solid #d9e1e2;background:#fbfcfc}.info-card:nth-child(2n){border-left:0}.info-card span{display:block;color:#688087;font-size:9px;font-weight:800}.info-card strong{display:block;margin-top:6px;font-size:12px;font-weight:700}.status{color:#08746d;font-style:normal}table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#12343f;color:#fff;padding:10px 9px;text-align:right;font-size:10px;font-weight:800}td{padding:10px 9px;border-bottom:1px solid #dce4e5;vertical-align:top;font-size:10px}tbody tr:nth-child(even) td{background:#f5f8f8}.row-index{width:34px;color:#638087;text-align:center;font-weight:800}.desc b{display:block;font-size:11px}.desc small,.desc em{display:block;margin-top:4px;color:#62767b;font-size:9px;line-height:1.7;font-style:normal}.amount{font-weight:800;white-space:nowrap}.invoice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}.invoice-card{display:grid;gap:8px;min-height:118px;padding:12px;border:1px solid #d9e1e2;border-radius:12px;background:linear-gradient(180deg,#fff,#f7faf9);break-inside:avoid}.card-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.card-head span{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#12343f;color:#fff;font-weight:800}.card-head b{color:#0f766e;font-size:9px}.invoice-card h3{margin:0;color:#14232b;font-size:12px;line-height:1.7}.invoice-card p{margin:0;color:#62767b;font-size:9px;line-height:1.8}.invoice-card dl{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:auto 0 0}.invoice-card dl div{padding:7px;border-radius:8px;background:#edf4f3}.invoice-card dt{color:#688087;font-size:8px;font-weight:800}.invoice-card dd{margin:3px 0 0;color:#14232b;font-size:10px;font-weight:800}.empty{grid-column:1/-1;margin:0;padding:24px;border:1px dashed #cfdadb;border-radius:12px;text-align:center;color:#688087}.summary{display:grid;grid-template-columns:1fr 230px;gap:18px;align-items:stretch;margin-top:18px}.note{padding:12px 0;color:#597077;font-size:9px;line-height:2;border-top:1px solid #cfdadb}.total{padding:14px 16px;background:#0f766e;color:#fff}.total span{display:block;font-size:10px;color:#cde9e5}.total strong{display:block;margin-top:7px;font-size:17px;font-weight:800}.footer{display:flex;justify-content:space-between;gap:20px;align-items:end;margin-top:28px;padding-top:12px;border-top:1px solid #d6dfe0;color:#60777d;font-size:9px}.sign{width:150px;padding-top:24px;border-bottom:1px solid #9aabad;text-align:center;color:#324e56;font-weight:800}@media print{body{background:#fff;padding:0}.paper{width:auto;min-height:0;border:0;box-shadow:none;padding:0}.info-card,table,.summary,.invoice-card{break-inside:avoid}@page{size:A4 portrait;margin:12mm}}@media(max-width:760px){body{padding:0}.paper{width:auto;padding:20px}.top,.summary,.invoice-grid{grid-template-columns:1fr}.invoice-no{text-align:right}.info-grid{grid-template-columns:1fr}.info-card,.info-card:nth-child(2n){border-left:0;border-bottom:1px solid #d9e1e2}.info-card:last-child{border-bottom:0}.footer{flex-direction:column;align-items:stretch}.sign{margin-right:auto}}
</style><body><main class="paper"><section class="top"><div class="brand"><img class="brand-logo" src="${logoUrl}" alt="هومو خانه هوشمند"><div><h1>هومو | HOMO</h1><small>${safe(documentTitle)} تجهیزات و خدمات خانه هوشمند</small></div></div><div class="invoice-no"><span>${safe(documentNoLabel)}</span><b>${safe(invoice.number)}</b><em class="layout-badge">${layout === "grid" ? "نسخه گرید" : "نسخه آیتمی"}</em></div></section><section class="info-grid"><div class="info-card"><span>مشتری</span><strong>${safe(customerName)}</strong></div><div class="info-card"><span>پروژه</span><strong>${safe(projectName)}</strong></div><div class="info-card"><span>پروتکل پروژه</span><strong>${safe(projectProtocol)}</strong></div><div class="info-card"><span>توضیحات پروژه</span><strong>${safe(projectColor)}</strong></div><div class="info-card"><span>عنوان ${safe(documentTitle)}</span><strong>${safe(invoice.title || documentTitle)}</strong></div><div class="info-card"><span>تاریخ / وضعیت</span><strong>${formatDate(invoice.issueDate)} · <i class="status">${safe(invoiceStatusLabel(invoice.status, invoice.kind))}</i></strong></div></section>${invoiceBody}<section class="summary"><div class="note">مبالغ به تومان است. ${documentTitle === "پیش فاکتور" ? "این سند پیش‌فاکتور است و پس از ثبت پرداخت به فاکتور فروش تبدیل می‌شود." : "توضیحات و پروتکل هر کالا در شرح ردیف و مشخصات پروژه ثبت شده است."}</div><div class="total"><span>جمع کل ${safe(documentTitle)} (تومان)</span><strong>${invoice.totalAmount.toLocaleString("fa-IR")}</strong></div></section><section class="footer"><div>خانه هوشمند هومو · طراحی، تأمین تجهیزات و اجرای سیستم‌های هوشمندسازی</div><div class="sign">مهر و امضا</div></section></main></body></html>`);
  popup.document.close();
  const printStyle = popup.document.createElement("style");
  printStyle.textContent = "body{font-family:VazirmatnInvoice,sans-serif!important}@page{size:A4 portrait;margin:12mm}";
  popup.document.head.append(printStyle);
  let printed = false;
  const openPrint = () => { if (printed) return; printed = true; popup.focus(); popup.print(); };
  window.setTimeout(openPrint, 700);
  void popup.document.fonts.ready.then(openPrint).catch(openPrint);
}

function invoiceProjectSetting(invoice: Invoice, label: string) {
  return invoice.description?.match(new RegExp(`${label}\\s*:\\s*([^\\n]+)`))?.[1]?.trim() ?? "";
}

function safe(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

function toWhatsAppPhone(mobile?: string) {
  const digits = (mobile ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("98")) return digits;
  if (digits.startsWith("0")) return `98${digits.slice(1)}`;
  return digits;
}
