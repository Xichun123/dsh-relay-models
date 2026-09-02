window.__ModuleLoader__.load({ id: "dsh-relay-models", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var inject = [];
var MARK = "data-dsh-relay";
var ID_SELECTOR = 'input[aria-label^="\u6A21\u578B ID "], input[aria-label^="Model ID "]';
var NAME_SELECTOR = 'input[aria-label^="\u663E\u793A\u540D\u79F0 "], input[aria-label^="Display name "]';
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function autoMatched(id, ids) {
  if (ids.has(id)) return true;
  const slash = id.lastIndexOf("/");
  return slash >= 0 && ids.has(id.slice(slash + 1));
}
function isIdInput(node) {
  if (!(node instanceof HTMLInputElement)) return false;
  const label = node.getAttribute("aria-label") ?? "";
  return label.startsWith("\u6A21\u578B ID ") || label.startsWith("Model ID ");
}
function zh() {
  return typeof document !== "undefined" && document.documentElement.lang.startsWith("zh");
}
function setReactInput(input, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}
function paintSelect(select, choices) {
  if (select.dataset.dshPainted === "1") return;
  const groups = /* @__PURE__ */ new Map();
  for (const choice of choices) {
    const list = groups.get(choice.provider) ?? [];
    list.push(choice);
    groups.set(choice.provider, list);
  }
  const none = document.createElement("option");
  none.value = "";
  none.textContent = zh() ? "\u4E0D\u8865\u5168" : "Skip";
  select.append(none);
  for (const [provider, list] of groups) {
    const group = document.createElement("optgroup");
    group.label = provider;
    for (const choice of list) {
      const option = document.createElement("option");
      option.value = choice.id;
      option.textContent = `${choice.id} \u2014 ${choice.name}`;
      group.append(option);
    }
    select.append(group);
  }
  select.dataset.dshPainted = "1";
}
function sync(choices, aliases) {
  if (choices.length === 0) return;
  const ids = new Set(choices.map((choice) => choice.id));
  const seen = /* @__PURE__ */ new Set();
  for (const input of document.querySelectorAll(ID_SELECTOR)) {
    if (!(input instanceof HTMLInputElement)) continue;
    const entry = input.parentElement?.parentElement;
    if (!(entry instanceof HTMLElement)) continue;
    const id = input.value.trim();
    let box = entry.querySelector(`[${MARK}]`);
    if (id.length === 0 || autoMatched(id, ids)) {
      box?.remove();
      continue;
    }
    seen.add(entry);
    if (box == null) {
      box = document.createElement("div");
      box.setAttribute(MARK, "");
      box.style.cssText = "display:flex;flex-direction:column;gap:4px;padding:0 0 8px;min-width:0";
      const label = document.createElement("span");
      label.style.cssText = "font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)";
      label.textContent = zh() ? "\u672A\u5339\u914D\uFF1A\u4ECE pi.dev \u9009\u4E00\u6761\u8865\u5168\u80FD\u529B" : "Unmatched: pick a pi.dev model to fill capabilities";
      const select2 = document.createElement("select");
      select2.style.cssText = "font-size:13px;line-height:20px;padding:4px 8px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-primary);color:var(--dsw-alias-label-primary)";
      select2.addEventListener("change", () => {
        const modelId = input.value.trim();
        if (modelId.length === 0) return;
        const catalogId = select2.value;
        if (catalogId.length === 0) delete aliases[modelId];
        else aliases[modelId] = catalogId;
        const choice = choices.find((item) => item.id === catalogId);
        const nameInput = entry.querySelector(NAME_SELECTOR);
        if (choice !== void 0 && nameInput instanceof HTMLInputElement && nameInput.value !== choice.name) {
          setReactInput(nameInput, choice.name);
        }
        void fetch("/dsh-relay-models/alias", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: modelId, catalogId })
        });
      });
      paintSelect(select2, choices);
      box.append(label, select2);
      input.parentElement?.after(box);
    }
    const select = box.querySelector("select");
    if (select instanceof HTMLSelectElement) select.value = aliases[id] ?? "";
  }
  for (const stale of document.querySelectorAll(`[${MARK}]`)) {
    const parent = stale.parentElement;
    if (parent instanceof HTMLElement && !seen.has(parent)) stale.remove();
  }
}
function apply() {
  let choices = [];
  let aliases = {};
  let scheduled = false;
  const observer = new MutationObserver(() => {
    schedule();
  });
  const observe = () => {
    observer.observe(document.body, { childList: true, subtree: true });
  };
  const schedule = () => {
    if (scheduled || choices.length === 0) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      observer.disconnect();
      try {
        sync(choices, aliases);
      } finally {
        observe();
      }
    });
  };
  void fetch("/dsh-relay-models/catalog").then(async (response) => response.ok ? await response.json() : []).then((body) => {
    const rows = Array.isArray(body) ? body : isRecord(body) && Array.isArray(body.choices) ? body.choices : [];
    if (isRecord(body) && isRecord(body.aliases)) {
      aliases = Object.fromEntries(Object.entries(body.aliases).filter((entry) => typeof entry[1] === "string"));
    }
    choices = rows.filter((row) => isRecord(row) && typeof row.id === "string" && typeof row.name === "string" && typeof row.provider === "string");
    schedule();
  }).catch(() => {
  });
  observe();
  document.addEventListener("input", (event) => {
    if (isIdInput(event.target)) schedule();
  }, true);
}
return module.exports; } });
