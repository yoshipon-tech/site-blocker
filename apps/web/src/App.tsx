import { useEffect, useState } from "react";
import { parseBlockedUrl } from "./blockedUrl";
import "./App.css";

function useHash(): string {
  const [hash, setHash] = useState(() => window.location.hash);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return hash;
}

export function App() {
  const blocked = parseBlockedUrl(useHash());
  // リダイレクトで元URLは履歴に残らないので、戻ると「ブロック対象を開く前のページ」に戻る
  const canGoBack = window.history.length > 1;

  return (
    <div className="page">
      <main className="content">
        {blocked ? (
          <p className="lead">
            <strong>{blocked.host ?? blocked.url}</strong>{" "}
            は今ブロックしています
          </p>
        ) : (
          <p className="lead">
            このページは site-blocker 拡張がブロックしたときに開く画面です
          </p>
        )}

        <h1 className="headline">
          いまは、
          <br />
          目の前のことに。
        </h1>

        {canGoBack && (
          <button
            type="button"
            className="back"
            onClick={() => window.history.back()}
          >
            前のページに戻る
          </button>
        )}

        {blocked && (
          <p className="url">
            <span className="url-label">開こうとしたURL</span>
            <span className="url-value">{blocked.url}</span>
          </p>
        )}
      </main>

      <div className="scenery" aria-hidden="true">
        <div className="sun" />
        <div className="sea" />
      </div>
    </div>
  );
}
