/* ============================================================
   LOVABLE — Error Boundary & safe wrappers
   Guarantees one broken product / section can NEVER take down
   the whole page. Wrap any subtree; a crash shows a quiet
   fallback and logs, while siblings keep rendering.
   ============================================================ */
(function () {
  const R = window.React;
  if (!R) { console.error("ErrorBoundary: React not loaded yet"); return; }

  // central log (also visible to an admin diagnostics panel later)
  const LOG = [];
  window.LBErrors = LOG;
  function logError(scope, error, info) {
    const entry = { scope, message: (error && error.message) || String(error),
      stack: (error && error.stack) || "", at: new Date().toISOString() };
    LOG.push(entry);
    if (LOG.length > 200) LOG.shift();
    try { console.warn("[LB error:" + scope + "]", error, info); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent("lb:error", { detail: entry })); } catch (e) {}
  }
  window.LBlogError = logError;

  class ErrorBoundary extends R.Component {
    constructor(props) { super(props); this.state = { failed: false }; }
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(error, info) {
      logError(this.props.scope || "unknown", error, info);
      if (typeof this.props.onError === "function") { try { this.props.onError(error, info); } catch (e) {} }
    }
    componentDidUpdate(prev) {
      // allow recovery when the keyed content changes (e.g. route change)
      if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
    }
    render() {
      if (this.state.failed) {
        if (this.props.silent) return null;
        if (typeof this.props.fallback === "function") return this.props.fallback();
        if (this.props.fallback !== undefined) return this.props.fallback;
        return R.createElement("div", { className: "lb-eb" },
          R.createElement("span", null, this.props.label || "この項目を表示できませんでした"));
      }
      return this.props.children;
    }
  }

  // convenience wrapper: <Safe scope="x"> … </Safe>
  function Safe(props) {
    return R.createElement(ErrorBoundary, props, props.children);
  }

  window.ErrorBoundary = ErrorBoundary;
  window.Safe = Safe;
})();
