"use strict";

/* 모바일 메뉴 */
const menuButton = document.querySelector(".menu-toggle");
const nav = document.querySelector("#nav-links");

function setMenuOpen(open) {
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "메뉴 닫기" : "메뉴 열기");
  nav.classList.toggle("open", open);
}

menuButton.addEventListener("click", () => {
  setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
});

nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => setMenuOpen(false));
});

/* 인증 서비스 탭 */
const TAB_ICON = {
  on: "assets/9f8f7.svg",
  off: "assets/cb2e4.svg",
};

let serviceIndex = 0;
const serviceTabs = [...document.querySelectorAll("[data-service]")];
const serviceCount = document.querySelector("#service-count");

function setService(index, focus = false) {
  serviceIndex = index;

  serviceTabs.forEach((tab, i) => {
    const selected = i === index;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    tab.querySelector("img").src = selected ? TAB_ICON.on : TAB_ICON.off;
    document.querySelector("#" + tab.getAttribute("aria-controls")).hidden = !selected;
  });

  serviceCount.textContent = index ? "02 / 02" : "01 / 02";
  if (focus) serviceTabs[index].focus();
}

function serviceIndexFromKey(key) {
  if (key === "Home") return 0;
  if (key === "End") return 1;
  return 1 - serviceIndex;
}

serviceTabs.forEach((tab, i) => {
  tab.addEventListener("click", () => setService(i));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    setService(serviceIndexFromKey(event.key), true);
  });
});

document.querySelectorAll(".service-prev, .service-next").forEach((button) => {
  button.addEventListener("click", () => setService(1 - serviceIndex));
});

document.querySelectorAll("[data-select-service]").forEach((link) => {
  link.addEventListener("click", () => setService(Number(link.dataset.selectService)));
});

/* 상담 분야 선택 */
document.querySelectorAll("[data-interest]").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll("[name=interest]").forEach((input) => {
      input.checked = input.value === link.dataset.interest;
    });
  });
});

/* 개인정보 안내 */
const dialog = document.querySelector("#privacy");

document.querySelectorAll(".privacy-link").forEach((button) => {
  button.addEventListener("click", () => dialog.showModal());
});

document.querySelectorAll(".dialog-close, .dialog-done").forEach((button) => {
  button.addEventListener("click", () => dialog.close());
});

dialog.addEventListener("click", (event) => {
  if (event.target !== dialog) return;

  const bounds = dialog.getBoundingClientRect();
  const outside =
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom;

  if (outside) dialog.close();
});

/* 상담 폼 미리보기 */
const form = document.querySelector("#consultation");
const formStatus = document.querySelector("#form-status");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  formStatus.hidden = false;
  formStatus.textContent =
    "입력 항목을 확인했습니다. 현재는 디자인 미리보기로, 상담 내용은 실제 전송되지 않았습니다.";
  formStatus.scrollIntoView({ block: "nearest" });
});
