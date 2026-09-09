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

// src/client/headers.ts
var MARK = "data-dsh-relay-headers";
var NS = "llm-pi-ai";
var PROTOCOL = 'select[aria-label="API protocol"], select[aria-label="API \u534F\u8BAE"]';
var CATALOG = 'section[aria-label="Models"], section[aria-label="\u6A21\u578B\u76EE\u5F55"]';
function text(en, zh2) {
  return document.documentElement.lang.startsWith("zh") ? zh2 : en;
}
function profile(source, route) {
  if (source === null || typeof source !== "object") return;
  const providers = source.providers;
  const value = providers?.[route];
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}
function parseHeaders(input) {
  if (input.trim() === "") return void 0;
  const value = JSON.parse(input);
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.values(value).some((item) => typeof item !== "string")) {
    throw new Error(text("Headers must be a JSON object with string values.", "Headers \u5FC5\u987B\u662F\u5B57\u7B26\u4E32\u503C\u7684 JSON \u5BF9\u8C61\u3002"));
  }
  const tokens = input.match(/"(?:[^"\\]|\\.)*"/g) ?? [];
  const seen = /* @__PURE__ */ new Set();
  for (let i = 0; i < tokens.length; i += 2) {
    const name = JSON.parse(tokens[i]).toLowerCase();
    if (seen.has(name)) throw new Error(text("Duplicate header name (case-insensitive).", "Header \u540D\u79F0\u91CD\u590D\uFF08\u4E0D\u533A\u5206\u5927\u5C0F\u5199\uFF09\u3002"));
    seen.add(name);
  }
  const headers = new Headers();
  for (const [name, entry] of Object.entries(value)) {
    if (/[\u0000-\u0008\u000a-\u001f\u007f]/.test(entry)) throw new Error(text("Invalid HTTP header value.", "HTTP Header \u503C\u975E\u6CD5\u3002"));
    try {
      headers.set(name, entry);
    } catch {
      throw new Error(text("Invalid HTTP header name or value.", "HTTP Header \u540D\u79F0\u6216\u503C\u975E\u6CD5\u3002"));
    }
  }
  return value;
}
function syncHeaders(remote, signal, alreadyOpen = false) {
  for (const protocol of document.querySelectorAll(PROTOCOL)) {
    const field = protocol.parentElement;
    if (field === null || field.nextElementSibling?.hasAttribute(MARK)) continue;
    const details = protocol.closest("details");
    const editor = details?.parentElement;
    const box = document.createElement("div");
    box.setAttribute(MARK, "");
    box.style.cssText = "display:flex;flex-direction:column;gap:8px;min-width:0";
    if (editor === null || editor === void 0) {
      if (field.parentElement?.querySelector('input[aria-label="Provider ID"], input[aria-label="\u63D0\u4F9B\u65B9 ID"]') == null) continue;
      box.textContent = text("Headers: create the provider first, then open Edit.", "Headers\uFF1A\u8BF7\u5148\u521B\u5EFA\u63D0\u4F9B\u65B9\uFF0C\u518D\u6253\u5F00\u7F16\u8F91\u586B\u5199\u3002");
      field.after(box);
      continue;
    }
    const route = editor.firstElementChild?.lastElementChild?.textContent ?? "";
    if (route === "") continue;
    field.after(box);
    mountHeaders(remote, signal, editor, protocol, box, route, alreadyOpen);
  }
}
function mountHeaders(remote, signal, editor, protocol, box, route, alreadyOpen) {
  const label = document.createElement("label");
  label.textContent = "Headers (JSON)";
  label.style.cssText = "display:flex;flex-direction:column;gap:8px;font-size:13px";
  const input = document.createElement("textarea");
  input.rows = 4;
  input.spellcheck = false;
  input.autocomplete = "off";
  input.setAttribute("aria-label", `Headers ${route}`);
  input.placeholder = '{\n  "User-Agent": "claude-cli/2.1.263 (external, cli)"\n}';
  input.style.cssText = "box-sizing:border-box;width:100%;resize:vertical;padding:8px 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-primary);color:var(--dsw-alias-label-primary);font:13px/1.5 monospace";
  label.append(input);
  const hint = document.createElement("span");
  hint.style.cssText = "font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)";
  hint.textContent = text(
    "Save Headers separately; Apply below does not save this field. Save other edits first and reopen. Blank restores inheritance. UA rewriting requires a saved Base URL.",
    "Headers \u5355\u72EC\u4FDD\u5B58\uFF0C\u4E0B\u65B9\u201C\u4FDD\u5B58\u201D\u4E0D\u4F1A\u63D0\u4EA4\u6B64\u5B57\u6BB5\u3002\u8BF7\u5148\u4FDD\u5B58\u5176\u4ED6\u7F16\u8F91\u5E76\u91CD\u65B0\u6253\u5F00\u3002\u7559\u7A7A\u6062\u590D\u7EE7\u627F\uFF1BUA \u8986\u5199\u9700\u5DF2\u4FDD\u5B58 API \u5730\u5740\u3002"
  );
  const button = document.createElement("button");
  button.type = "button";
  button.style.cssText = "align-self:flex-start;padding:6px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-primary);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer";
  const discard = document.createElement("button");
  discard.type = "button";
  discard.style.cssText = button.style.cssText;
  discard.textContent = text("Discard Headers edits", "\u653E\u5F03 Headers \u4FEE\u6539");
  const status = document.createElement("span");
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.style.cssText = "font-size:12px;line-height:18px";
  box.append(label, hint, button, discard, status);
  let loadedHeaders = "";
  let namespace;
  let writable = false;
  let busy = false;
  let saved = false;
  let nativeDirty = alreadyOpen;
  const alive = () => !signal.aborted && box.isConnected;
  const reopen = () => text("Close and reopen this editor before continuing.", "\u8BF7\u5173\u95ED\u5E76\u91CD\u65B0\u6253\u5F00\u6B64\u7F16\u8F91\u5668\u540E\u7EE7\u7EED\u3002");
  const render = () => {
    input.disabled = busy || namespace === void 0 || !writable || saved;
    button.disabled = busy || saved || namespace !== void 0 && !writable;
    discard.hidden = saved || input.value === loadedHeaders;
    discard.disabled = busy || namespace === void 0 || !writable;
    button.textContent = busy ? text("Loading\u2026", "\u5904\u7406\u4E2D\u2026") : namespace === void 0 ? text("Retry loading Headers", "\u91CD\u65B0\u52A0\u8F7D Headers") : text("Save Headers", "\u4FDD\u5B58 Headers");
  };
  const changed = (event) => {
    if (event.target instanceof Node && !box.contains(event.target)) nativeDirty = true;
  };
  editor.addEventListener("input", changed, { capture: true, signal });
  editor.addEventListener("change", changed, { capture: true, signal });
  editor.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target.closest("button") : null;
    const actions = editor.lastElementChild;
    if (target !== null && target.parentElement === actions && target === actions?.lastElementChild && (busy || saved || input.value !== loadedHeaders)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      status.textContent = saved ? reopen() : busy ? text("Wait for Headers to finish saving.", "\u8BF7\u7B49\u5F85 Headers \u64CD\u4F5C\u5B8C\u6210\u3002") : text(
        "Headers have unsaved edits. Save Headers first, or copy the draft and discard Headers edits before applying other fields.",
        "Headers \u5C1A\u672A\u4FDD\u5B58\u3002\u8BF7\u5148\u4FDD\u5B58 Headers\uFF1B\u82E5\u5176\u4ED6\u5B57\u6BB5\u4E5F\u6709\u4FEE\u6539\uFF0C\u8BF7\u5148\u590D\u5236 Headers \u8349\u7A3F\u5E76\u653E\u5F03\u5176\u4FEE\u6539\uFF0C\u518D\u4FDD\u5B58\u5176\u4ED6\u5B57\u6BB5\u3002"
      );
      return;
    }
    if (target?.closest(CATALOG) && !target.hasAttribute("aria-expanded")) nativeDirty = true;
  }, { capture: true, signal });
  const load = async () => {
    busy = true;
    render();
    try {
      const [described, directory] = await Promise.all([
        remote.settings.describe(),
        remote.llm.listConfigurableProviders()
      ]);
      if (!alive()) return;
      if (!described.ok) throw new Error(described.error.message);
      if (!directory.ok) throw new Error(directory.error.message);
      const entry = directory.value.find((item) => item.provider === route && item.settingsNs === NS && item.declared === true && item.settingsPath.length === 2 && item.settingsPath[0] === "providers" && item.settingsPath[1] === route);
      const view = described.value.namespaces.find((item) => item.ns === NS);
      if (entry === void 0 || view === void 0 || profile(view.value, route) === void 0) {
        input.hidden = true;
        button.hidden = true;
        status.textContent = text("Headers are available after this custom provider has been created.", "\u8BF7\u5148\u521B\u5EFA\u6B64\u81EA\u5B9A\u4E49\u63D0\u4F9B\u65B9\uFF0C\u518D\u7F16\u8F91 Headers\u3002");
        return;
      }
      namespace = view;
      writable = described.value.writable;
      const stored = profile(view.user, route)?.headers;
      loadedHeaders = stored === void 0 ? "" : JSON.stringify(stored, null, 2);
      input.value = loadedHeaders;
      status.textContent = !writable ? text("Settings are read-only.", "\u8BBE\u7F6E\u4E3A\u53EA\u8BFB\u3002") : alreadyOpen ? reopen() : "";
    } catch (error) {
      if (alive()) status.textContent = text("Could not load Headers: ", "\u65E0\u6CD5\u52A0\u8F7D Headers\uFF1A") + String(error instanceof Error ? error.message : error);
    } finally {
      busy = false;
      if (alive()) render();
    }
  };
  input.addEventListener("input", render, { signal });
  discard.addEventListener("click", () => {
    if (!alive() || busy || saved) return;
    input.value = loadedHeaders;
    input.removeAttribute("aria-invalid");
    status.textContent = "";
    render();
  }, { signal });
  button.addEventListener("click", () => {
    if (!alive() || busy || saved) return;
    if (namespace === void 0) {
      void load();
      return;
    }
    if (!writable || protocol.disabled) {
      status.textContent = text("The provider editor is read-only or busy.", "\u63D0\u4F9B\u65B9\u7F16\u8F91\u5668\u4E3A\u53EA\u8BFB\u6216\u6B63\u5728\u4FDD\u5B58\u3002");
      return;
    }
    if (nativeDirty) {
      status.textContent = alreadyOpen ? reopen() : text(
        "Other fields were edited. Copy your Headers draft and discard Headers edits; apply other fields, then reopen to save Headers.",
        "\u5176\u4ED6\u5B57\u6BB5\u5DF2\u7F16\u8F91\u3002\u8BF7\u5148\u590D\u5236 Headers \u8349\u7A3F\u5E76\u653E\u5F03\u5176\u4FEE\u6539\uFF0C\u7528\u4E0B\u65B9\u201C\u4FDD\u5B58\u201D\u63D0\u4EA4\u5176\u4ED6\u5B57\u6BB5\uFF0C\u518D\u91CD\u65B0\u6253\u5F00\u4FDD\u5B58 Headers\u3002"
      );
      return;
    }
    let headers;
    try {
      headers = parseHeaders(input.value);
    } catch (error) {
      status.textContent = error instanceof SyntaxError ? text("Headers must be valid JSON.", "Headers \u5FC5\u987B\u662F\u6709\u6548 JSON\u3002") : String(error instanceof Error ? error.message : error);
      input.setAttribute("aria-invalid", "true");
      return;
    }
    input.removeAttribute("aria-invalid");
    busy = true;
    status.textContent = "";
    render();
    const op = headers === void 0 ? { op: "unset", path: ["providers", route, "headers"] } : { op: "set", path: ["providers", route, "headers"], value: headers };
    void remote.settings.mutate(NS, [op], namespace.revision).then((result) => {
      if (!alive()) return;
      if (!result.ok) {
        status.textContent = result.error.code === "settings/conflict" ? text("Settings changed elsewhere. Your Headers draft is kept; copy it before reopening this editor.", "\u914D\u7F6E\u5DF2\u5728\u5176\u4ED6\u4F4D\u7F6E\u4FEE\u6539\u3002Headers \u8349\u7A3F\u5DF2\u4FDD\u7559\uFF1B\u8BF7\u590D\u5236\u8349\u7A3F\u540E\u91CD\u65B0\u6253\u5F00\u7F16\u8F91\u5668\u3002") : result.error.message;
        return;
      }
      saved = true;
      status.textContent = text("Headers saved. ", "Headers \u5DF2\u4FDD\u5B58\u3002") + reopen();
    }).catch(() => {
      if (alive()) status.textContent = text("Could not save Headers. Your draft is kept; retry or reopen to check the stored value.", "Headers \u4FDD\u5B58\u5931\u8D25\uFF0C\u8349\u7A3F\u5DF2\u4FDD\u7559\uFF1B\u8BF7\u91CD\u8BD5\uFF0C\u6216\u91CD\u65B0\u6253\u5F00\u68C0\u67E5\u5DF2\u4FDD\u5B58\u503C\u3002");
    }).finally(() => {
      busy = false;
      if (alive()) render();
    });
  }, { signal });
  void load();
}
function removeHeaders() {
  for (const box of document.querySelectorAll(`[${MARK}]`)) box.remove();
}

// src/client/provider-order.ts
var KEY = "dsh-relay-models:provider-order:v1";
var HANDLE = "data-dsh-relay-provider-handle";
var DRAGGING = "data-dsh-relay-provider-dragging";
var DROP = "data-dsh-relay-provider-drop";
var HINT = "dsh-relay-provider-order-hint";
function text2(en, zh2) {
  return document.documentElement.lang.startsWith("zh") ? zh2 : en;
}
function readRows(list) {
  const rows = [];
  for (const element of list.children) {
    if (!(element instanceof HTMLLIElement)) return [];
    const head = element.firstElementChild;
    const name = head?.querySelector(":scope > span:first-of-type > span:first-child")?.textContent;
    const edit = head?.querySelector(':scope > span > button[aria-label^="Edit "], :scope > span > button[aria-label^="\u7F16\u8F91 "]');
    const label = edit?.getAttribute("aria-label")?.replace(/^(?:Edit|编辑) /, "");
    if (!(head instanceof HTMLElement) || !name || !label) return [];
    const id = label === name ? label : label.startsWith(`${name} (`) && label.endsWith(")") ? label.slice(name.length + 2, -1) : "";
    if (!id || rows.some((row) => row.id === id)) return [];
    rows.push({ element, head, id, label });
  }
  return rows;
}
function readOrder() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) && value.every((id) => typeof id === "string" && id.length > 0) ? [...new Set(value)] : [];
  } catch {
    return [];
  }
}
function arrange(list, rows, order) {
  const rank = new Map(order.map((id, index) => [id, index]));
  const sorted = [...rows].sort((a, b) => (rank.get(a.id) ?? order.length) - (rank.get(b.id) ?? order.length));
  const focused = document.activeElement;
  const selection = (focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement) && focused.selectionStart !== null ? [focused.selectionStart, focused.selectionEnd, focused.selectionDirection] : void 0;
  const move = list.moveBefore;
  let next = list.firstElementChild;
  for (const row of sorted) {
    if (row.element !== next) {
      if (move !== void 0) move.call(list, row.element, next);
      else if (row.element.contains(focused)) {
        while (next !== null && next !== row.element) {
          const displaced = next;
          next = next.nextElementSibling;
          list.append(displaced);
        }
      } else list.insertBefore(row.element, next);
    }
    next = row.element.nextElementSibling;
  }
  if (focused instanceof HTMLElement && list.contains(focused) && document.activeElement !== focused) {
    focused.focus({ preventScroll: true });
    if (selection !== void 0 && (focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement)) {
      focused.setSelectionRange(selection[0], selection[1], selection[2] ?? void 0);
    }
  }
}
var MODEL_MENU = '[role="menu"][aria-label="Model and reasoning effort"], [role="menu"][aria-label="\u6A21\u578B\u4E0E\u63A8\u7406\u7B49\u7EA7"]';
function modelRows(menu) {
  if (!menu.id.endsWith("-menu")) return void 0;
  const trigger = [...document.querySelectorAll('button[aria-haspopup="menu"][aria-controls]')].find((button) => button.getAttribute("aria-controls") === menu.id);
  if (trigger === void 0) return void 0;
  const list = menu.querySelector('section[role="group"]')?.parentElement;
  if (!(list instanceof HTMLElement) || list.parentElement !== menu) return void 0;
  const prefix = `${menu.id.slice(0, -5)}-`;
  const rows = [];
  for (const element of list.children) {
    const heading = element.firstElementChild;
    if (!(element instanceof HTMLElement) || !element.matches('section[role="group"]') || !heading?.id.startsWith(prefix) || element.getAttribute("aria-labelledby") !== heading.id || !element.querySelector(':scope > button[role="menuitemradio"]')) return void 0;
    const id = heading.id.slice(prefix.length);
    if (!id || rows.some((row) => row.id === id)) return void 0;
    rows.push({ element, id });
  }
  return rows.length > 0 ? { list, rows, trigger } : void 0;
}
function createProviderSorting(signal) {
  let order = readOrder();
  let list;
  let original = [];
  const modelLists = /* @__PURE__ */ new Map();
  const syncModels = () => {
    const seen = /* @__PURE__ */ new Set();
    for (const menu of document.querySelectorAll(MODEL_MENU)) {
      const found = modelRows(menu);
      if (found === void 0) continue;
      const { list: list2, rows } = found;
      seen.add(list2);
      const baseline = modelLists.get(list2) ?? { menu, original: [] };
      for (const row of rows) if (!baseline.original.includes(row.id)) baseline.original.push(row.id);
      modelLists.set(list2, baseline);
      arrange(list2, rows, [...order, ...baseline.original.filter((id) => !order.includes(id))]);
    }
    for (const list2 of modelLists.keys()) if (!seen.has(list2)) modelLists.delete(list2);
  };
  let hintLocale;
  const handles = /* @__PURE__ */ new Map();
  let dragged;
  let indicator;
  const hint = document.createElement("p");
  hint.id = HINT;
  hint.setAttribute("role", "status");
  hint.setAttribute("aria-live", "polite");
  hint.style.cssText = "margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)";
  const style = document.createElement("style");
  style.textContent = `
    button[${HANDLE}] { display:inline-flex;align-items:center;justify-content:center;flex:none;width:24px;height:28px;padding:0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary);font:20px/1 sans-serif;cursor:grab; }
    button[${HANDLE}]:hover { background:var(--dsw-alias-interactive-bg-hover); }
    button[${HANDLE}]:focus-visible { outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px; }
    li[${DRAGGING}] { opacity:0.5; }
    li[${DROP}="before"] { box-shadow:0 -3px 0 var(--dsw-alias-brand-primary); }
    li[${DROP}="after"] { box-shadow:0 3px 0 var(--dsw-alias-brand-primary); }
  `;
  document.head.append(style);
  const clearIndicator = () => {
    indicator?.removeAttribute(DROP);
    indicator = void 0;
  };
  const endDrag = () => {
    dragged?.removeAttribute(DRAGGING);
    dragged = void 0;
    clearIndicator();
  };
  const detach = () => {
    endDrag();
    if (list !== void 0) arrange(list, readRows(list), original);
    for (const [row, handle] of handles) {
      if (document.activeElement === handle) row.querySelector('button[aria-label^="Edit "], button[aria-label^="\u7F16\u8F91 "]')?.focus({ preventScroll: true });
      handle.remove();
    }
    handles.clear();
    hint.remove();
    list = void 0;
    original = [];
  };
  const rowAt = (target) => {
    const row = target instanceof Element ? target.closest("li") : null;
    return row instanceof HTMLLIElement && row.parentElement === list && handles.has(row) ? row : void 0;
  };
  const handleAt = (target) => {
    const row = rowAt(target);
    return row !== void 0 && target instanceof Element && target.closest(`button[${HANDLE}]`) === handles.get(row) ? row : void 0;
  };
  const sync2 = () => {
    if (signal.aborted) return;
    syncModels();
    const candidates = [...document.querySelectorAll('[role="dialog"] ul')];
    const found = candidates.find((candidate) => {
      const title = candidate.parentElement?.querySelector(":scope > h2")?.textContent;
      return (title === "Models" || title === "\u6A21\u578B") && readRows(candidate).length > 0;
    });
    if (found !== list) {
      detach();
      list = found;
      hintLocale = void 0;
    }
    if (hintLocale !== document.documentElement.lang) {
      hintLocale = document.documentElement.lang;
      hint.textContent = text2(
        "Drag the handles to reorder, or focus a handle and use \u2191 / \u2193. Saved only in this browser.",
        "\u62D6\u52A8\u624B\u67C4\u6392\u5E8F\uFF0C\u6216\u805A\u7126\u624B\u67C4\u540E\u4F7F\u7528 \u2191 / \u2193\u3002\u987A\u5E8F\u4EC5\u4FDD\u5B58\u5728\u5F53\u524D\u6D4F\u89C8\u5668\u3002"
      );
    }
    if (list === void 0) return;
    const rows = readRows(list);
    for (const [element, handle] of handles) {
      if (!rows.some((row) => row.element === element)) {
        if (element === dragged) endDrag();
        handle.remove();
        handles.delete(element);
      }
    }
    for (const [index, row] of rows.entries()) {
      if (!original.includes(row.id)) {
        const following = rows.slice(index + 1).find((item) => original.includes(item.id));
        original.splice(following === void 0 ? original.length : original.indexOf(following.id), 0, row.id);
      }
      let handle = handles.get(row.element);
      if (handle === void 0) {
        handle = document.createElement("button");
        handle.type = "button";
        handle.draggable = true;
        handle.setAttribute(HANDLE, "");
        handle.setAttribute("aria-describedby", HINT);
        handle.setAttribute("aria-keyshortcuts", "ArrowUp ArrowDown");
        handle.textContent = "\u283F";
        handles.set(row.element, handle);
      }
      handle.setAttribute("aria-label", text2(`Reorder ${row.label}`, `\u8C03\u6574\u987A\u5E8F ${row.label}`));
      handle.title = text2("Drag to reorder, or use \u2191 / \u2193", "\u62D6\u52A8\u6392\u5E8F\uFF0C\u6216\u4F7F\u7528 \u2191 / \u2193");
      if (handle.parentElement !== row.head) row.head.prepend(handle);
    }
    if (hint.nextElementSibling !== list) list.before(hint);
    arrange(list, rows, [...order, ...original.filter((id) => !order.includes(id))]);
  };
  const save = (rows, ids, moved) => {
    if (list === void 0 || ids.every((id, index) => id === rows[index]?.id)) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {
      hint.textContent = text2("Could not save the order in this browser; order unchanged.", "\u6D4F\u89C8\u5668\u65E0\u6CD5\u4FDD\u5B58\u6392\u5E8F\uFF0C\u987A\u5E8F\u672A\u6539\u53D8\u3002");
      return;
    }
    order = ids;
    arrange(list, rows, order);
    syncModels();
    const row = rows.find((item) => item.element === moved);
    hint.textContent = text2(
      `Order saved in this browser. ${row.label}: ${ids.indexOf(row.id) + 1} of ${ids.length}.`,
      `\u987A\u5E8F\u5DF2\u4FDD\u5B58\u5728\u5F53\u524D\u6D4F\u89C8\u5668\u3002${row.label}\uFF1A\u7B2C ${ids.indexOf(row.id) + 1} \u4F4D\uFF0C\u5171 ${ids.length} \u4F4D\u3002`
    );
  };
  document.addEventListener("dragstart", (event) => {
    const row = handleAt(event.target);
    if (row === void 0 || event.dataTransfer === null) return;
    endDrag();
    dragged = row;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/x-dsh-relay-provider", readRows(list).find((item) => item.element === row).id);
    event.dataTransfer.setDragImage?.(row, 16, 16);
    row.setAttribute(DRAGGING, "");
  }, { signal });
  document.addEventListener("dragover", (event) => {
    const target = rowAt(event.target);
    if (dragged === void 0 || dragged.parentElement !== list || target === void 0) return;
    event.preventDefault();
    if (event.dataTransfer !== null) event.dataTransfer.dropEffect = "move";
    clearIndicator();
    if (target === dragged) return;
    const rect = target.getBoundingClientRect();
    target.setAttribute(DROP, event.clientY < rect.top + rect.height / 2 ? "before" : "after");
    indicator = target;
  }, { signal });
  document.addEventListener("drop", (event) => {
    if (dragged === void 0) return;
    event.preventDefault();
    const target = rowAt(event.target);
    if (dragged.parentElement !== list || target === void 0 || list === void 0) {
      endDrag();
      return;
    }
    const rows = readRows(list);
    const moved = rows.find((row) => row.element === dragged);
    const destination = rows.find((row) => row.element === target);
    if (moved !== void 0 && destination !== void 0 && moved !== destination) {
      const ids = rows.filter((row) => row !== moved).map((row) => row.id);
      const rect = target.getBoundingClientRect();
      const after = event.clientY >= rect.top + rect.height / 2;
      ids.splice(ids.indexOf(destination.id) + Number(after), 0, moved.id);
      save(rows, ids, moved.element);
    }
    endDrag();
  }, { signal });
  document.addEventListener("dragend", endDrag, { signal });
  document.addEventListener("dragleave", (event) => {
    if (!(event.relatedTarget instanceof Node) || !list?.contains(event.relatedTarget)) clearIndicator();
  }, { signal });
  document.addEventListener("keydown", (event) => {
    const element = handleAt(event.target);
    if (element === void 0 || list === void 0 || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const rows = readRows(list);
    const index = rows.findIndex((row) => row.element === element);
    const to = index + (event.key === "ArrowUp" ? -1 : 1);
    if (index < 0 || to < 0 || to >= rows.length) return;
    const ids = rows.map((row) => row.id);
    const [id] = ids.splice(index, 1);
    ids.splice(to, 0, id);
    save(rows, ids, element);
  }, { signal });
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY && event.key !== null) return;
    order = readOrder();
    sync2();
  }, { signal });
  document.addEventListener("keydown", (event) => {
    if (!["ArrowUp", "ArrowDown"].includes(event.key) || !(event.target instanceof Node)) return;
    for (const { menu } of modelLists.values()) {
      if (!menu.isConnected) continue;
      const found = modelRows(menu);
      if (found === void 0 || !menu.contains(event.target) && !found.trigger.contains(event.target)) continue;
      const items = [...menu.querySelectorAll('button[role="menuitemradio"]')].filter((item) => !item.disabled);
      if (items.length === 0) return;
      event.preventDefault();
      event.stopPropagation();
      const active = Math.max(0, items.indexOf(document.activeElement));
      items[(active + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
      return;
    }
  }, { capture: true, signal });
  signal.addEventListener("abort", () => {
    detach();
    for (const [list2, { menu, original: original2 }] of modelLists) {
      const found = modelRows(menu);
      if (found?.list === list2) arrange(list2, found.rows, original2);
    }
    modelLists.clear();
    style.remove();
  }, { once: true });
  return sync2;
}

// src/client/index.ts
var inject = ["remote", "remote.settings", "remote.llm"];
var MARK2 = "data-dsh-relay";
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
  return node.matches(ID_SELECTOR) && node.parentElement?.parentElement?.parentElement?.matches('section[aria-label="Models"], section[aria-label="\u6A21\u578B\u76EE\u5F55"]') === true;
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
function sync(choices, aliases, signal) {
  if (choices.length === 0) return;
  const ids = new Set(choices.map((choice) => choice.id));
  const seen = /* @__PURE__ */ new Set();
  for (const input of document.querySelectorAll(ID_SELECTOR)) {
    if (!isIdInput(input)) continue;
    const entry = input.parentElement?.parentElement;
    if (!(entry instanceof HTMLElement)) continue;
    const id = input.value.trim();
    let box = entry.querySelector(`[${MARK2}]`);
    if (id.length === 0 || autoMatched(id, ids)) {
      box?.remove();
      continue;
    }
    seen.add(entry);
    if (box == null) {
      box = document.createElement("div");
      box.setAttribute(MARK2, "");
      box.style.cssText = "display:flex;flex-direction:column;gap:4px;padding:0 0 8px;min-width:0";
      const label = document.createElement("span");
      label.style.cssText = "font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)";
      label.textContent = zh() ? "\u672A\u5339\u914D\uFF1A\u4ECE pi.dev \u9009\u4E00\u6761\u8865\u5168\u80FD\u529B" : "Unmatched: pick a pi.dev model to fill capabilities";
      const select2 = document.createElement("select");
      select2.style.cssText = "font-size:13px;line-height:20px;padding:4px 8px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-primary);color:var(--dsw-alias-label-primary)";
      const error = document.createElement("span");
      error.setAttribute("role", "alert");
      error.style.cssText = "font-size:12px;line-height:18px;color:var(--dsw-alias-state-error-primary)";
      select2.addEventListener("change", async () => {
        const modelId = input.value.trim();
        if (signal.aborted || input.disabled || select2.disabled || modelId.length === 0) return;
        const catalogId = select2.value;
        const nameInput = entry.querySelector(NAME_SELECTOR);
        const originalName = nameInput instanceof HTMLInputElement ? nameInput.value : void 0;
        select2.dataset.dshPending = "1";
        select2.disabled = true;
        error.textContent = "";
        try {
          const response = await fetch("/dsh-relay-models/alias", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: modelId, catalogId }),
            signal
          });
          if (signal.aborted) return;
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          if (catalogId.length === 0) delete aliases[modelId];
          else aliases[modelId] = catalogId;
          const choice = choices.find((item) => item.id === catalogId);
          if (select2.isConnected && input.value.trim() === modelId && choice !== void 0 && nameInput instanceof HTMLInputElement && !nameInput.disabled && nameInput.value === originalName && nameInput.value !== choice.name) {
            setReactInput(nameInput, choice.name);
          }
        } catch {
          if (!signal.aborted && select2.isConnected && input.value.trim() === modelId) {
            error.textContent = zh() ? "\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002" : "Could not save. Please try again.";
          }
        } finally {
          if (!signal.aborted && select2.isConnected) {
            delete select2.dataset.dshPending;
            select2.disabled = input.disabled;
            select2.value = aliases[input.value.trim()] ?? "";
          }
        }
      }, { signal });
      paintSelect(select2, choices);
      box.append(label, select2, error);
      input.parentElement?.after(box);
    }
    if (box.dataset.dshModelId !== id) {
      box.dataset.dshModelId = id;
      const error = box.querySelector('[role="alert"]');
      if (error !== null) error.textContent = "";
    }
    const select = box.querySelector("select");
    if (select instanceof HTMLSelectElement) {
      select.setAttribute("aria-label", zh() ? `\u8865\u5168\u80FD\u529B ${id}` : `Fill capabilities ${id}`);
      if (select.dataset.dshPending !== "1") {
        select.value = aliases[id] ?? "";
        select.disabled = input.disabled;
      }
    }
  }
  for (const stale of document.querySelectorAll(`[${MARK2}]`)) {
    const parent = stale.parentElement;
    if (parent instanceof HTMLElement && !seen.has(parent)) stale.remove();
  }
}
function apply(ctx) {
  ctx.effect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const syncProviderSorting = createProviderSorting(signal);
    let choices = [];
    let aliases = {};
    let scheduled = false;
    const observer = new MutationObserver(() => {
      schedule();
    });
    const observe = () => {
      if (!signal.aborted) observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["aria-label"] });
    };
    const schedule = () => {
      if (signal.aborted || scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        if (signal.aborted) return;
        observer.disconnect();
        try {
          sync(choices, aliases, signal);
          syncHeaders(ctx.remote, signal);
          syncProviderSorting();
        } finally {
          observe();
        }
      });
    };
    void fetch("/dsh-relay-models/catalog", { signal }).then(async (response) => response.ok ? await response.json() : []).then((body) => {
      if (signal.aborted) return;
      const rows = Array.isArray(body) ? body : isRecord(body) && Array.isArray(body.choices) ? body.choices : [];
      if (isRecord(body) && isRecord(body.aliases)) {
        aliases = Object.fromEntries(Object.entries(body.aliases).filter((entry) => typeof entry[1] === "string"));
      }
      choices = rows.filter((row) => isRecord(row) && typeof row.id === "string" && typeof row.name === "string" && typeof row.provider === "string");
      schedule();
    }).catch(() => {
    });
    const onInput = (event) => {
      if (isIdInput(event.target)) schedule();
    };
    syncHeaders(ctx.remote, signal, true);
    syncProviderSorting();
    observe();
    document.addEventListener("input", onInput, true);
    return () => {
      controller.abort();
      observer.disconnect();
      document.removeEventListener("input", onInput, true);
      for (const box of document.querySelectorAll(`[${MARK2}]`)) box.remove();
      removeHeaders();
    };
  });
}
return module.exports; } });
