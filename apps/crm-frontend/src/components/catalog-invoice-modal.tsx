import { useEffect, useMemo, useState } from "react";
import { IonButton, IonIcon, IonInput, IonModal, IonSelect, IonSelectOption, IonSpinner, IonTextarea } from "@ionic/react";
import { addOutline, closeOutline, documentTextOutline, trashOutline } from "ionicons/icons";
import { ApiError, apiRequest } from "../lib/api";
import { formatMoney, parseInteger } from "../lib/format";
import { recordId, type Invoice, type Project } from "../types";

type CatalogProduct = {
  id: number;
  title: string;
  sku?: string;
  category: string;
  protocol?: string | null;
  price: number | null;
  priceLabel?: string | null;
  colors: string[];
  image?: string | null;
};

type CatalogCategory = { name: string; count: number };
type ProtocolFilter = "" | "WIFI" | "ZIGBEE";
type LineKind = "PRODUCT" | "SERVICE";
const logoFullPath = "/logo/homo-logo-full.jpeg";
type Line = {
  id: string;
  productId?: string;
  title: string;
  secondary: string;
  quantity: number;
  color: string;
  unitPrice: number;
  kind: LineKind;
  note: string;
  colors: string[];
};

function matchesProtocol(product: CatalogProduct, filter: ProtocolFilter) {
  if (!filter) return true;
  const protocol = product.protocol ?? "";
  return filter === "WIFI" ? /wi-?fi|وای.?فای/i.test(protocol) : /zigbee|زیگبی/i.test(protocol);
}

function invoiceLines(invoice?: Invoice): Line[] {
  return (invoice?.lines ?? []).filter((line) => !isInstallationLine(line)).map((line, index) => ({
    id: `saved-${recordId(invoice)}-${index}`,
    productId: line.productId,
    title: line.title,
    secondary: line.kind === "SERVICE" ? "خدمت / آیتم سفارشی" : "محصول کاتالوگ",
    quantity: line.quantity,
    color: "",
    unitPrice: line.unitPrice,
    kind: line.kind ?? (line.productId ? "PRODUCT" : "SERVICE"),
    note: line.note ?? line.color ?? "",
    colors: [],
  }));
}

function isInstallationLine(line: NonNullable<Invoice["lines"]>[number]) {
  return line.note?.startsWith("هزینه نصب") || line.title.startsWith("هزینه نصب");
}

function defaultInstallationPercent(invoice?: Invoice) {
  const line = invoice?.lines?.find(isInstallationLine);
  const match = line?.note?.match(/([0-9۰-۹]+)\s*٪/);
  return match ? Math.min(100, Math.max(0, parseInteger(match[1]) || 15)) : 15;
}

function invoiceSetting(invoice: Invoice | undefined, label: string) {
  const pattern = new RegExp(`${label}\\s*:\\s*([^\\n]+)`);
  return invoice?.description?.match(pattern)?.[1]?.trim() ?? "";
}

function invoiceNotes(invoice?: Invoice) {
  return invoice?.description?.split("\n").filter((line) => !/^پروتکل پروژه\s*:|^رنگ پروژه\s*:|^توضیحات پروژه\s*:/.test(line)).join("\n") ?? "";
}

export function CatalogInvoiceModal({
  project,
  projects,
  customerNames,
  customerName,
  token,
  invoice,
  onDismiss,
  onSaved,
}: {
  project: Project;
  projects?: Project[];
  customerNames?: Map<string, string>;
  customerName: string;
  token: string;
  invoice?: Invoice;
  onDismiss: () => void;
  onSaved: (invoice: Invoice) => Promise<void>;
}) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [protocolFilter, setProtocolFilter] = useState<ProtocolFilter>("");
  const [selectedProjectId, setSelectedProjectId] = useState(() => recordId(project));
  const [lines, setLines] = useState<Line[]>(() => invoiceLines(invoice));
  const [invoiceNumber, setInvoiceNumber] = useState(() => invoice?.number ?? "");
  const [invoiceTitle, setInvoiceTitle] = useState(() => invoice?.title || `فاکتور ${project.name}`);
  const [invoiceDate, setInvoiceDate] = useState(() => invoice?.issueDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [discountAmount, setDiscountAmount] = useState(() => String(invoice?.discountAmount ?? 0));
  const [invoiceNote, setInvoiceNote] = useState(() => invoiceNotes(invoice));
  const [projectProtocol, setProjectProtocol] = useState(() => invoiceSetting(invoice, "پروتکل پروژه") || project.protocol || "");
  const [projectDescription, setProjectDescription] = useState(() => invoiceSetting(invoice, "توضیحات پروژه") || invoiceSetting(invoice, "رنگ پروژه") || project.projectColor || "");
  const [installationPercent, setInstallationPercent] = useState(() => defaultInstallationPercent(invoice));
  const [customTitle, setCustomTitle] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customQuantity, setCustomQuantity] = useState("1");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [mobilePane, setMobilePane] = useState<"catalog" | "composer">(invoice ? "composer" : "catalog");
  const editing = Boolean(invoice);
  const projectOptions = projects?.length ? projects : [project];
  const selectedProject = projectOptions.find((item) => recordId(item) === selectedProjectId) ?? project;
  const selectedCustomerName = customerNames?.get(recordId(selectedProject.customerId)) ?? customerName;

  function changeProject(nextProjectId: string) {
    const nextProject = projectOptions.find((item) => recordId(item) === nextProjectId);
    setSelectedProjectId(nextProjectId);
    if (!nextProject) return;
    if (!projectProtocol && nextProject.protocol) setProjectProtocol(nextProject.protocol);
    if (!projectDescription && nextProject.projectColor) setProjectDescription(nextProject.projectColor);
  }

  useEffect(() => {
    fetch("/site-api/crm/catalog")
      .then(async (response) => {
        if (!response.ok) throw new Error("کاتالوگ سایت در دسترس نیست");
        return response.json() as Promise<{ products: CatalogProduct[]; categories: CatalogCategory[] }>;
      })
      .then((data) => {
        setProducts(data.products);
        setCategories(data.categories);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "خواندن کاتالوگ ممکن نشد"))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fa-IR");
    return products.filter((product) => (
      (!category || product.category === category)
      && matchesProtocol(product, protocolFilter)
      && (!needle || `${product.title} ${product.sku ?? ""} ${product.category} ${product.protocol ?? ""}`.toLocaleLowerCase("fa-IR").includes(needle))
    ));
  }, [products, query, category, protocolFilter]);

  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const installationAmount = Math.round(subtotal * installationPercent / 100);
  const parsedDiscount = Math.max(0, parseInteger(discountAmount) || 0);
  const total = Math.max(0, subtotal + installationAmount - parsedDiscount);

  function add(product: CatalogProduct) {
    const productPrice = product.price;
    if (productPrice == null) {
      setError("این محصول قیمت عددی ندارد؛ قیمت را ابتدا در سایت اصلی ثبت کنید.");
      return;
    }

    setError(undefined);
    setLines((current) => {
      const index = current.findIndex((line) => line.productId === String(product.id) && line.color === "");
      if (index < 0) {
        return [...current, {
          id: `product-${product.id}`,
          productId: String(product.id),
          title: product.title,
          secondary: product.protocol || product.category,
          quantity: 1,
          color: "",
          unitPrice: productPrice,
          kind: "PRODUCT",
          note: `دسته: ${product.category}${product.protocol ? ` · پروتکل: ${product.protocol}` : ""}`,
          colors: product.colors ?? [],
        }];
      }
      return current.map((line, lineIndex) => (
        lineIndex === index ? { ...line, quantity: line.quantity + 1 } : line
      ));
    });
  }

  function addCustomItem() {
    const title = customTitle.trim();
    const unitPrice = parseInteger(customPrice);
    const quantity = Math.max(1, parseInteger(customQuantity) || 1);

    if (!title) {
      setError("عنوان خدمت یا آیتم سفارشی را وارد کنید.");
      return;
    }
    if (!customPrice.trim() || !Number.isSafeInteger(unitPrice) || unitPrice < 1) {
      setError("قیمت واحد خدمت را به تومان وارد کنید.");
      return;
    }

    setLines((current) => [...current, {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title,
      secondary: "خدمت / آیتم سفارشی",
      quantity,
      color: "",
      unitPrice,
      kind: "SERVICE",
      note: "خدمت یا آیتم سفارشی",
      colors: [],
    }]);
    setCustomTitle("");
    setCustomPrice("");
    setCustomQuantity("1");
    setError(undefined);
  }

  function updateLine(index: number, changes: Partial<Line>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...changes } : line));
  }

  async function saveInvoice(issue = false) {
    if (!lines.length) return;
    setBusy(true);
    setError(undefined);
    const description = [
      projectProtocol && `پروتکل پروژه: ${projectProtocol}`,
      projectDescription.trim() && `توضیحات پروژه: ${projectDescription.trim()}`,
      invoiceNote.trim(),
    ].filter(Boolean).join("\n") || undefined;
    const body = {
      projectId: recordId(selectedProject),
      number: invoiceNumber.trim() || undefined,
      title: invoiceTitle.trim() || `فاکتور ${selectedProject.name}`,
      description,
      issueDate: invoiceDate ? `${invoiceDate}T00:00:00.000Z` : undefined,
      discountAmount: parsedDiscount,
      lines: [...lines.map((line) => ({
        productId: line.productId,
        title: line.title,
        kind: line.kind,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        note: line.note || undefined,
      })), ...(installationPercent > 0 && subtotal > 0 ? [{
        title: `هزینه نصب (${installationPercent.toLocaleString("fa-IR")}٪)`,
        kind: "SERVICE" as const,
        quantity: 1,
        unitPrice: installationAmount,
        note: `هزینه نصب · ${installationPercent.toLocaleString("fa-IR")}٪ از مبلغ تجهیزات`,
      }] : [])],
    };
    try {
      const saved = invoice
        ? await apiRequest<Invoice>(`/invoices/${recordId(invoice)}`, { method: "PATCH", token, body })
        : await apiRequest<Invoice>("/invoices", { method: "POST", token, body });
      const shouldIssue = issue && saved.status === "DRAFT";
      const finalInvoice = shouldIssue
        ? await apiRequest<Invoice>(`/invoices/${recordId(saved)}/issue`, { method: "POST", token })
        : saved;
      await onSaved(finalInvoice);
      onDismiss();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "ذخیره فاکتور ممکن نشد.");
    } finally {
      setBusy(false);
    }
  }

  return <IonModal isOpen onDidDismiss={onDismiss} className="catalog-invoice-modal">
    <div className="catalog-invoice-shell">
      <header>
        <div>
          <span>PRODUCT CATALOG · INVOICE BUILDER</span>
          <h2>{editing ? "ویرایش پیش‌فاکتور" : "ثبت پیش‌فاکتور"}</h2>
          <p>{selectedProject.name} · مشتری: {selectedCustomerName}</p>
        </div>
        <IonButton className="catalog-invoice-close" fill="clear" onClick={onDismiss} aria-label="بستن"><IonIcon slot="icon-only" icon={closeOutline} /></IonButton>
      </header>
      <div className="invoice-mobile-tabs" role="tablist" aria-label="بخش‌های فاکتور">
        <button type="button" className={mobilePane === "catalog" ? "active" : ""} onClick={() => setMobilePane("catalog")}>کاتالوگ</button>
        <button type="button" className={mobilePane === "composer" ? "active" : ""} onClick={() => setMobilePane("composer")}>فاکتور {lines.length ? `(${lines.length.toLocaleString("fa-IR")})` : ""}</button>
      </div>

      <div className="catalog-invoice-layout" data-pane={mobilePane}>
        <section className="catalog-picker">
          <IonInput className="catalog-search" value={query} placeholder="جست‌وجوی محصول یا کد کالا" onIonInput={(event) => setQuery(event.detail.value ?? "")} />
          <div className="catalog-protocols" aria-label="فیلتر پروتکل">
            <button type="button" className={protocolFilter === "" ? "active" : ""} onClick={() => setProtocolFilter("")}>همه</button>
            <button type="button" className={protocolFilter === "WIFI" ? "active" : ""} onClick={() => setProtocolFilter("WIFI")}>Wi‑Fi</button>
            <button type="button" className={protocolFilter === "ZIGBEE" ? "active" : ""} onClick={() => setProtocolFilter("ZIGBEE")}>Zigbee</button>
          </div>
          {loading ? <IonSpinner /> : <>
            <div className="catalog-categories">
              <button type="button" className={!category ? "active" : ""} onClick={() => setCategory("")}>همه <small>{products.length.toLocaleString("fa-IR")}</small></button>
              {categories.map((item) => <button type="button" key={item.name} className={category === item.name ? "active" : ""} onClick={() => setCategory(item.name)}>{item.name} <small>{item.count.toLocaleString("fa-IR")}</small></button>)}
            </div>
            <p className="catalog-result-count">{visible.length.toLocaleString("fa-IR")} محصول</p>
            <div className="catalog-products">
              {visible.slice(0, 80).map((product) => <button type="button" key={product.id} onClick={() => add(product)}>
                {product.image ? <img src={product.image} alt="" /> : <span className="catalog-image-placeholder">H</span>}
                <div><strong>{product.title}</strong><small>{product.sku || product.category}{product.protocol ? ` · ${product.protocol}` : ""}</small></div>
                <span>{product.price == null ? product.priceLabel || "استعلام" : formatMoney(product.price)}</span>
                <IonIcon icon={addOutline} />
              </button>)}
            </div>
          </>}
        </section>

        <section className="invoice-composer">
          <div className="invoice-paper-head"><img src={logoFullPath} alt="هومو خانه هوشمند" /><strong>پیش‌نمایش فاکتور · {selectedCustomerName}</strong></div>
          {projectOptions.length ? <section className="invoice-project-select" aria-label="اتصال فاکتور به پروژه"><IonSelect interface="popover" value={selectedProjectId} placeholder="پروژه فاکتور" onIonChange={(event) => changeProject(String(event.detail.value ?? ""))}>{projectOptions.map((item) => <IonSelectOption key={recordId(item)} value={recordId(item)}>{item.name} · {item.code} · {customerNames?.get(recordId(item.customerId)) ?? ""}</IonSelectOption>)}</IonSelect></section> : null}
          <section className="invoice-core-fields" aria-label="ویرایش اطلاعات اصلی فاکتور"><IonInput value={invoiceNumber} placeholder="شماره فاکتور (اختیاری)" onIonInput={(event) => setInvoiceNumber(event.detail.value ?? "")} /><IonInput value={invoiceTitle} placeholder="عنوان فاکتور" onIonInput={(event) => setInvoiceTitle(event.detail.value ?? "")} /><IonInput type="date" value={invoiceDate} onIonInput={(event) => setInvoiceDate(event.detail.value ?? "")} /><IonInput value={discountAmount} inputMode="numeric" placeholder="تخفیف کل (تومان)" onIonInput={(event) => setDiscountAmount(event.detail.value ?? "0")} /><IonTextarea autoGrow value={invoiceNote} placeholder="یادداشت فاکتور (اختیاری)" onIonInput={(event) => setInvoiceNote(event.detail.value ?? "")} /></section>
          <section className="invoice-project-config" aria-label="مشخصات پروژه برای فاکتور">
            <div><strong>مشخصات پروژه</strong><small>پروتکل و توضیحات انتخاب‌شده در پیش‌نمایش و فاکتور ثبت می‌شود.</small></div>
            <div className="invoice-protocol-options">
              {[["Wi-Fi", "Wi-Fi"], ["Zigbee", "Zigbee"], ["ترکیبی", "Wi-Fi + Zigbee"]].map(([label, value]) => <button key={value} type="button" className={projectProtocol === value ? "active" : ""} onClick={() => setProjectProtocol(value)}>{label}</button>)}
            </div>
            <IonInput value={projectDescription} placeholder="توضیحات پروژه / کلیدها" onIonInput={(event) => setProjectDescription(event.detail.value ?? "")} />
          </section>
          <section className="custom-invoice-item" aria-label="افزودن خدمت یا آیتم سفارشی">
            <div className="custom-invoice-copy"><strong>افزودن خدمت یا آیتم سفارشی</strong><small>برای نصب، اجرت، خدمات پس از فروش یا هر ردیف خارج از کاتالوگ</small></div>
            <IonInput value={customTitle} placeholder="عنوان خدمت / آیتم" onIonInput={(event) => setCustomTitle(event.detail.value ?? "")} />
            <IonInput value={customPrice} inputMode="numeric" placeholder="قیمت واحد (تومان)" onIonInput={(event) => setCustomPrice(event.detail.value ?? "")} />
            <IonInput value={customQuantity} inputMode="numeric" placeholder="تعداد" onIonInput={(event) => setCustomQuantity(event.detail.value ?? "")} />
            <IonButton fill="outline" onClick={addCustomItem}><IonIcon slot="start" icon={addOutline} />افزودن خدمت</IonButton>
          </section>

          {lines.length ? <div className="invoice-lines">
            {lines.map((line, index) => <div className="invoice-line" key={line.id}>
              <div className="invoice-line-description"><IonInput value={line.title} aria-label="عنوان ردیف" onIonInput={(event) => updateLine(index, { title: event.detail.value ?? "" })} /><small>{line.secondary}</small></div>
              <label className="invoice-unit-price">قیمت واحد (تومان)<IonInput value={String(line.unitPrice)} inputMode="numeric" aria-label="قیمت واحد" onIonInput={(event) => updateLine(index, { unitPrice: Math.max(0, parseInteger(event.detail.value) || 0) })} /></label>
              <label className="invoice-color-field">توضیحات<IonInput value={line.note} placeholder="اختیاری" aria-label="توضیحات" onIonInput={(event) => updateLine(index, { note: event.detail.value ?? "" })} /></label>
              <IonInput className="invoice-qty" value={String(line.quantity)} inputMode="numeric" aria-label="تعداد" onIonInput={(event) => updateLine(index, { quantity: Math.max(1, parseInteger(event.detail.value) || 1) })} />
              <IonButton fill="clear" color="danger" aria-label={`حذف ${line.title}`} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}><IonIcon slot="icon-only" icon={trashOutline} /></IonButton>
              <b>{formatMoney(line.quantity * line.unitPrice)}</b>
            </div>)}
            <div className="invoice-line invoice-installation-line">
              <div><strong>هزینه نصب</strong><small>درصد قابل‌ویرایش از مبلغ تجهیزات</small></div>
              <label className="invoice-unit-price">درصد نصب<IonInput value={String(installationPercent)} inputMode="numeric" aria-label="درصد هزینه نصب" onIonInput={(event) => setInstallationPercent(Math.min(100, Math.max(0, parseInteger(event.detail.value) || 0)))} /></label>
              <span className="invoice-installation-rate">{subtotal > 0 ? `${formatMoney(subtotal)} × ${installationPercent.toLocaleString("fa-IR")}٪` : "—"}</span>
              <span />
              <span />
              <b>{formatMoney(installationAmount)}</b>
            </div>
          </div> : <p className="invoice-empty">محصولی از کاتالوگ انتخاب کنید یا یک خدمت / آیتم سفارشی بسازید.</p>}

          <div className="invoice-total"><span>جمع کل</span><strong>{formatMoney(total)}</strong></div>
          <div className="invoice-save-actions">
            <IonButton fill="outline" disabled={!lines.length || busy} onClick={() => void saveInvoice(false)}>{busy ? <IonSpinner /> : editing ? "ذخیره تغییرات" : "ذخیره پیش‌نویس"}</IonButton>
            <IonButton disabled={!lines.length || busy} onClick={() => void saveInvoice(true)}>{busy ? <IonSpinner /> : <><IonIcon slot="start" icon={documentTextOutline} />{editing ? "ذخیره و ارسال پیش‌فاکتور" : "ثبت و ارسال پیش‌فاکتور"}</>}</IonButton>
          </div>
          {error ? <p className="invoice-error">{error}</p> : null}
        </section>
      </div>
      <div className="invoice-sticky-bar">
        <div><span>{lines.length.toLocaleString("fa-IR")} ردیف</span><strong>{formatMoney(total)}</strong></div>
        <IonButton fill="outline" disabled={!lines.length || busy} onClick={() => void saveInvoice(false)}>{editing ? "ذخیره" : "پیش‌نویس"}</IonButton>
        <IonButton disabled={!lines.length || busy} onClick={() => void saveInvoice(true)}>{editing ? "ارسال پیش‌فاکتور" : "ثبت پیش‌فاکتور"}</IonButton>
      </div>
    </div>
  </IonModal>;
}
