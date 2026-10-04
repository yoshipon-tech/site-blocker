import "./style.css";
import { addSite, removeEntry, type EditorDeps } from "@/utils/editor";
import { hostPermissions } from "@/utils/rules";
import {
  describeCurrentPage,
  describeEntries,
  type CurrentPage,
  type EntryRow,
} from "@/utils/site";
import { blocklistItem, pendingSiteItem } from "@/utils/storage";

const list = document.querySelector<HTMLUListElement>("#sites");
const empty = document.querySelector<HTMLDivElement>("#empty");
const count = document.querySelector<HTMLParagraphElement>("#count");
const form = document.querySelector<HTMLFormElement>("#add");
const input = document.querySelector<HTMLInputElement>("#site-input");
const message = document.querySelector<HTMLParagraphElement>("#message");
const currentCard = document.querySelector<HTMLElement>(".current");
const currentSite =
  document.querySelector<HTMLParagraphElement>("#current-site");
const currentAdd = document.querySelector<HTMLButtonElement>("#current-add");
const currentStatus =
  document.querySelector<HTMLSpanElement>("#current-status");

// Manifest の型は MV2 との合併で、MV2 には host_permissions がない（any になる）。MV3 に絞って取り出す
const manifest = browser.runtime.getManifest();

const deps: EditorDeps = {
  permissions: browser.permissions,
  blocklist: blocklistItem,
  pendingSite: pendingSiteItem,
  requiredOrigins:
    manifest.manifest_version === 3 ? (manifest.host_permissions ?? []) : [],
};

// Dawn には警告色がないので、成功もエラーも同じ見た目の1行で伝える
function showMessage(text: string) {
  if (!message) return;
  message.textContent = text;
}

function reportError(text: string) {
  return (error: unknown) => {
    console.error(text, error);
    showMessage(text);
  };
}

/**
 * ポップアップを開いたときのタブの URL。開いている間は読み直さない。
 * activeTab により、アイコンを押して開いたときだけ読める。読めなければ undefined
 */
const currentUrl: Promise<string | undefined> = browser.tabs
  .query({ active: true, currentWindow: true })
  .then(([tab]) => tab?.url)
  .catch((error: unknown) => {
    console.error("今開いているページを読めませんでした", error);
    return undefined;
  });

/** カードの追加ボタンが足すドメイン。追加できる状態のときだけ入る */
let currentDomain: string | undefined;

async function add(): Promise<void> {
  if (!input) return;
  // 権限の要求はクリックから時間が経つと拒まれるので、addSite の前に別の処理を挟まない
  const result = await addSite(input.value, deps);
  if (result.ok) {
    input.value = "";
  }
  showAddResult(result);
}

async function addCurrent(): Promise<void> {
  if (currentDomain === undefined) return;
  // 入力欄からの追加と同じ経路で足す。カードは保存内容の変化で描き直され「登録済み」になる
  showAddResult(await addSite(currentDomain, deps));
}

function showAddResult(result: Awaited<ReturnType<typeof addSite>>) {
  showMessage(result.ok ? `${result.domain} を追加しました` : result.reason);
}

async function remove(row: EntryRow): Promise<void> {
  await removeEntry(row, deps);
  showMessage(`${row.label} を削除しました`);
}

/** 有効なサイトのうち、ブロックに要る権限を拡張が持っていないもの */
async function findUnpermitted(rows: EntryRow[]): Promise<Set<string>> {
  const domains = rows
    .filter((row) => row.invalidReason === undefined)
    .map((row) => row.label);
  const permitted = await Promise.all(
    domains.map((domain) =>
      browser.permissions.contains({ origins: hostPermissions([domain]) }),
    ),
  );
  return new Set(domains.filter((_, i) => !permitted[i]));
}

function renderRow(row: EntryRow, unpermitted: Set<string>): HTMLLIElement {
  const item = document.createElement("li");
  const site = document.createElement("span");
  site.className = "site";
  // 保存内容は外から書かれることもあるので、必ずテキストとして出す
  site.textContent = row.label;

  const note =
    row.invalidReason ??
    (unpermitted.has(row.label)
      ? "アクセスが許可されていないため、ブロックされていません"
      : undefined);
  if (note !== undefined) {
    const small = document.createElement("small");
    small.className = "note";
    small.textContent = row.invalidReason ? `無効: ${note}` : note;
    site.append(small);
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn-quiet";
  button.textContent = "削除";
  button.setAttribute("aria-label", `${row.label} を削除`);
  button.addEventListener("click", () => {
    remove(row).catch(reportError(`${row.label} を削除できませんでした`));
  });

  item.append(site, button);
  return item;
}

function renderCurrent(page: CurrentPage) {
  if (!currentCard || !currentSite || !currentAdd || !currentStatus) return;

  currentDomain = page.kind === "addable" ? page.domain : undefined;
  // サイト名は URL から作った値なので、必ずテキストとして出す
  currentSite.textContent =
    page.kind === "unavailable" ? "このページは追加できません" : page.domain;
  currentSite.classList.toggle("is-unavailable", page.kind === "unavailable");
  currentAdd.hidden = page.kind !== "addable";
  if (page.kind === "addable") {
    // 見た目は入力欄と同じ「追加」なので、名前で区別できるようにする
    currentAdd.setAttribute("aria-label", `${page.domain} を追加`);
  }
  currentStatus.hidden = page.kind !== "registered";
  currentCard.hidden = false;
}

// 描画は非同期なので、後から始めた描画だけを反映する
let latestRender = 0;

async function render(): Promise<void> {
  const current = ++latestRender;
  const stored = await blocklistItem.getValue();
  const rows = describeEntries(stored);
  const unpermitted = await findUnpermitted(rows);
  const page = describeCurrentPage(await currentUrl, stored);
  if (current !== latestRender || !list || !empty || !count) {
    return;
  }

  renderCurrent(page);

  list.replaceChildren(...rows.map((row) => renderRow(row, unpermitted)));
  count.textContent = `登録中 ${rows.length.toLocaleString()}件`;
  count.hidden = rows.length === 0;
  empty.hidden = rows.length > 0;
}

function renderAndReport() {
  render().catch(reportError("ブロックリストを表示できませんでした"));
}

currentAdd?.addEventListener("click", () => {
  addCurrent().catch(reportError("サイトを追加できませんでした"));
});

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  add().catch(reportError("サイトを追加できませんでした"));
});

blocklistItem.watch(renderAndReport);
browser.permissions.onAdded.addListener(renderAndReport);
browser.permissions.onRemoved.addListener(renderAndReport);
renderAndReport();
