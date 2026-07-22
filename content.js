// paints the aging overlay on the page itself, inside a closed shadow dom
if (window.top === window.self) {
  (() => {
    let settings = null;
    let shownstage = 0;
    let host = null;
    let root = null;

    const css = `
      :host { all: initial; }
      #root {
        position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;
        opacity: 1; transition: opacity .6s ease;
      }
      #root.clean { display: none; }
      #root > div { position: absolute; inset: 0; }
      .filter {
        -webkit-backdrop-filter: var(--bf, none); backdrop-filter: var(--bf, none);
        transition: -webkit-backdrop-filter 1.1s ease, backdrop-filter 1.1s ease;
      }
      .tint {
        background: #6b4f2a; mix-blend-mode: multiply;
        opacity: var(--tint, 0); transition: opacity 1.1s ease;
      }
    `;

    function build() {
      host = document.createElement("div");
      host.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
      host.setAttribute("aria-hidden", "true");
      const shadow = host.attachShadow({ mode: "closed" });
      const style = document.createElement("style");
      style.textContent = css;
      root = document.createElement("div");
      root.id = "root";
      root.className = "clean";
      shadow.append(style, root);
      (document.documentElement || document.body).appendChild(host);
    }

    function clean() {
      if (!root) return;
      if (!root.classList.contains("clean")) root.classList.add("clean");
      shownstage = 0;
    }
  })();
}
