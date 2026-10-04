import { isDomain } from "./blocklist";
import { hostPermissions } from "./rules";
import { checkAdd, normalizeSite, type Checked, type EntryRow } from "./site";

type Origins = { origins: string[] };

/** 編集で使う外部の一部。ポップアップと background では本物を、テストでは偽物を渡す */
export type EditorDeps = {
  permissions: {
    contains(permissions: Origins): Promise<boolean>;
    request(permissions: Origins): Promise<boolean>;
    remove(permissions: Origins): Promise<boolean>;
  };
  blocklist: {
    getValue(): Promise<unknown>;
    setValue(value: unknown): Promise<void>;
  };
  pendingSite: {
    getValue(): Promise<string | null>;
    setValue(value: string | null): Promise<void>;
  };
  /** manifest の host_permissions。インストール時から持つ権限で、手放せない */
  requiredOrigins: readonly string[];
};

/** サイトの権限のパターン。ルールの requestDomains と同じくサブドメインを含む */
function originOf(domain: string): string {
  return hostPermissions([domain])[0] ?? "";
}

function entriesOf(stored: unknown): unknown[] {
  return Array.isArray(stored) ? stored : [];
}

/**
 * 入力したサイトをブロックリストの末尾に足す。
 * 権限を持っていればすぐ保存する。持っていなければ pendingSite に書いてから権限を求め、
 * 保存は許可を受けた background（completePendingSite）に任せる。ポップアップが閉じても追加を失わないため
 */
export async function addSite(
  input: string,
  deps: EditorDeps,
): Promise<Checked<{ domain: string }>> {
  const normalized = normalizeSite(input);
  if (!normalized.ok) {
    return normalized;
  }
  const { domain } = normalized;

  const stored = await deps.blocklist.getValue();
  const checked = checkAdd(stored, domain);
  if (!checked.ok) {
    return checked;
  }

  const permission = { origins: [originOf(domain)] };
  if (await deps.permissions.contains(permission)) {
    await deps.blocklist.setValue([...entriesOf(stored), domain]);
    return { ok: true, domain };
  }

  await deps.pendingSite.setValue(domain);
  if (!(await deps.permissions.request(permission))) {
    await deps.pendingSite.setValue(null);
    return {
      ok: false,
      reason: `${domain} へのアクセスが許可されなかったため、ブロックできません。追加しませんでした`,
    };
  }
  return { ok: true, domain };
}

/**
 * 権限が許可されたとき、待っていた追加を仕上げる（background の permissions.onAdded から呼ぶ）。
 * 待っていたサイトのパターンが許可されたときだけ足す
 */
export async function completePendingSite(
  origins: readonly string[] | undefined,
  deps: Pick<EditorDeps, "blocklist" | "pendingSite">,
): Promise<void> {
  const pending = await deps.pendingSite.getValue();
  if (pending === null || !origins?.includes(originOf(pending))) {
    return;
  }

  const stored = await deps.blocklist.getValue();
  // 既に入っていれば足さない（同じ許可が2度届いた場合など）
  if (checkAdd(stored, pending).ok) {
    await deps.blocklist.setValue([...entriesOf(stored), pending]);
  }
  await deps.pendingSite.setValue(null);
}

/**
 * 画面の1行に当たる項目をブロックリストから外す。
 * 追加時に求めた権限は手放す。インストール時からの権限は手放せないので触らない
 */
export async function removeEntry(
  row: Pick<EntryRow, "index" | "value">,
  deps: EditorDeps,
): Promise<void> {
  const stored = await deps.blocklist.getValue();
  if (!Array.isArray(stored)) {
    // 配列でない値は丸ごと消す。初期値には戻さない
    await deps.blocklist.setValue([]);
    return;
  }

  const entries: unknown[] = stored;
  // 画面を描いた後に保存内容が変わっていれば、位置ではなく値で探し直す
  const index =
    row.index < entries.length && isSameEntry(entries[row.index], row.value)
      ? row.index
      : entries.findIndex((entry) => isSameEntry(entry, row.value));
  if (index === -1) {
    return;
  }
  const next = entries.filter((_, i) => i !== index);
  await deps.blocklist.setValue(next);

  const { value } = row;
  if (!isDomain(value)) {
    return;
  }
  const origin = originOf(value);
  // 重複していた同じサイトがまだ残っていれば、そのサイトのブロックに要る
  if (!next.includes(value) && !deps.requiredOrigins.includes(origin)) {
    await deps.permissions.remove({ origins: [origin] });
  }
}

function isSameEntry(a: unknown, b: unknown): boolean {
  return Object.is(a, b) || JSON.stringify(a) === JSON.stringify(b);
}
