"use strict";

// 페이지 동작 — 값을 계산하는 함수와, 그 값을 화면에 쓰는 함수를 나눕니다

const TAB_KEYS = ["ArrowLeft", "ArrowRight", "Home", "End"];
const TAB_ICON = {
  on: "assets/9f8f7.svg",
  off: "assets/cb2e4.svg",
};
const PREVIEW_MESSAGE =
  "입력 항목을 확인했습니다. 현재는 디자인 미리보기로, 상담 내용은 실제 전송되지 않았습니다.";

// 1. 메뉴 — 열림의 반대만 계산하고, 화면 반영은 renderMenu가 합니다
function nextOpen(open) {
  return !open;
}

function menuLabel(open) {
  return open ? "메뉴 닫기" : "메뉴 열기";
}

function renderMenu(button, nav, open) {
  button.setAttribute("aria-expanded", String(open));
  button.setAttribute("aria-label", menuLabel(open));
  nav.classList.toggle("open", open);
}

function connectMenu(button, nav) {
  const isOpen = () => button.getAttribute("aria-expanded") === "true";

  button.addEventListener("click", () => {
    renderMenu(button, nav, nextOpen(isOpen()));
  });
  [...nav.querySelectorAll("a")].forEach((link) => {
    link.addEventListener("click", () => renderMenu(button, nav, false));
  });
}

// 2. 인증 탭 — 다음 번호는 입력만 보고 정합니다
function nextServiceIndex(current, key) {
  if (key === "Home") return 0;
  if (key === "End") return 1;
  return 1 - current;
}

function serviceCountLabel(index) {
  return index ? "02 / 02" : "01 / 02";
}

function tabIcon(selected) {
  return selected ? TAB_ICON.on : TAB_ICON.off;
}

function renderService(tabs, countEl, index) {
  tabs.forEach((tab, i) => {
    const selected = i === index;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    tab.querySelector("img").src = tabIcon(selected);
    document.querySelector("#" + tab.getAttribute("aria-controls")).hidden = !selected;
  });
  countEl.textContent = serviceCountLabel(index);
}

function connectServices(tabs, countEl) {
  let index = 0;
  const show = (next, focus = false) => {
    index = next;
    renderService(tabs, countEl, index);
    if (focus) tabs[index].focus();
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => show(i));
    tab.addEventListener("keydown", (event) => {
      if (!TAB_KEYS.includes(event.key)) return;
      event.preventDefault();
      show(nextServiceIndex(index, event.key), true);
    });
  });

  [...document.querySelectorAll(".service-prev, .service-next")].forEach((button) => {
    button.addEventListener("click", () => show(nextServiceIndex(index)));
  });
  [...document.querySelectorAll("[data-select-service]")].forEach((link) => {
    link.addEventListener("click", () => show(Number(link.dataset.selectService)));
  });
}

// 3. 상담 분야 — 고른 값과 같은 항목만 켜진 목록을 만듭니다
function interestChecks(inputs, value) {
  return inputs.map((input) => ({
    input,
    checked: input.value === value,
  }));
}

function renderInterest(checks) {
  checks.forEach(({ input, checked }) => {
    input.checked = checked;
  });
}

function connectInterest(links, inputs) {
  [...links].forEach((link) => {
    link.addEventListener("click", () => {
      renderInterest(interestChecks([...inputs], link.dataset.interest));
    });
  });
}

// 4. 개인정보 안내 — 좌표가 창 밖인지만 계산합니다
function isOutside(bounds, x, y) {
  return x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom;
}

function connectPrivacy(dialog) {
  [...document.querySelectorAll(".privacy-link")].forEach((button) => {
    button.addEventListener("click", () => dialog.showModal());
  });
  [...document.querySelectorAll(".dialog-close, .dialog-done")].forEach((button) => {
    button.addEventListener("click", () => dialog.close());
  });
  dialog.addEventListener("click", (event) => {
    const outside = isOutside(dialog.getBoundingClientRect(), event.clientX, event.clientY);
    if (event.target === dialog && outside) dialog.close();
  });
}

// 5. 상담 신청 — 전송 대신 안내 문장만 돌려줍니다
function previewStatus() {
  return PREVIEW_MESSAGE;
}

function renderStatus(statusEl, message) {
  statusEl.hidden = false;
  statusEl.textContent = message;
  statusEl.scrollIntoView({ block: "nearest" });
}

function connectForm(form, statusEl) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    renderStatus(statusEl, previewStatus());
  });
}

// 6. 연결 — 계산 함수를 화면 요소에 붙입니다
connectMenu(document.querySelector(".menu-toggle"), document.querySelector("#nav-links"));
connectServices([...document.querySelectorAll("[data-service]")], document.querySelector("#service-count"));
connectInterest(document.querySelectorAll("[data-interest]"), document.querySelectorAll("[name=interest]"));
connectPrivacy(document.querySelector("#privacy"));
connectForm(document.querySelector("#consultation"), document.querySelector("#form-status"));
