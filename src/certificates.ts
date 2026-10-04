import { CERTIFICATES, type Certificate } from "./certificate-data";
import { asset, element } from "./dom";
import { unlock } from "./achievements";

export function initCertificates(certificates: readonly Certificate[] = CERTIFICATES): void {
  if (!certificates.length) return;
  const section = element("certificates");
  const grid = element("certificate-grid");
  const dialog = element<HTMLDialogElement>("certificate-dialog");
  const preview = element<HTMLImageElement>("certificate-preview");
  const download = element<HTMLAnchorElement>("certificate-download");
  const verify = element<HTMLAnchorElement>("certificate-verify");
  const close = element<HTMLButtonElement>("certificate-close");
  for (const certificate of certificates) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "certificate-card";
    const image = document.createElement("img");
    image.src = asset(certificate.preview);
    image.alt = "";
    image.loading = "lazy";
    const title = document.createElement("strong");
    title.textContent = certificate.title;
    const caption = document.createElement("span");
    caption.textContent = `${certificate.issuer} · ${certificate.date}`;
    button.append(image, title, caption);
    button.addEventListener("click", () => {
      unlock("certificates");
      element("certificate-name").textContent = certificate.title;
      preview.src = asset(certificate.preview);
      preview.alt = `${certificate.title} — ${certificate.issuer}`;
      download.href = asset(certificate.pdf);
      download.download = certificate.pdf.split("/").pop() ?? "certificate.pdf";
      verify.hidden = !certificate.verificationUrl;
      if (certificate.verificationUrl) verify.href = certificate.verificationUrl;
      else verify.removeAttribute("href");
      dialog.showModal();
      close.focus();
    });
    grid.append(button);
  }
  close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  section.hidden = false;
}
