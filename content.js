// paints the aging overlay on the page itself, inside a closed shadow dom
if (window.top === window.self) {
  (() => {
    let settings = null;
    let shownstage = 0;
    let host = null;
    let root = null;

    const grain =
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

    const crackimg =
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 700' preserveAspectRatio='none'%3E%3Cg fill='none' stroke='%23241a10' stroke-width='1.3' stroke-opacity='0.75'%3E%3Cpath d='M-10,150 L170,175 L235,120 L410,205 L520,165 L690,240 L850,195 L1010,250'/%3E%3Cpath d='M235,120 L260,10 M410,205 L470,330 L430,470 M690,240 L730,120 M690,240 L640,360 L700,520'/%3E%3Cpath d='M-10,520 L150,500 L300,560 L470,540 L620,600 L800,560 L1010,610'/%3E%3Cpath d='M300,560 L280,690 M620,600 L660,700 M150,500 L120,410'/%3E%3Cpath d='M60,-10 L95,140 L60,300 L110,430 L70,600'/%3E%3Cpath d='M930,-10 L900,160 L950,320 L905,470'/%3E%3C/g%3E%3C/svg%3E\")";

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
      .grain {
        background-image: ${grain}; background-size: 150px 150px;
        mix-blend-mode: overlay; opacity: var(--grain, 0);
        transition: opacity 1.1s ease; animation: flicker 1.4s steps(4) infinite;
      }
      .cracks {
        background-image: ${crackimg}; background-size: 100% 100%;
        mix-blend-mode: multiply; opacity: var(--cracks, 0);
        transition: opacity 1.4s ease;
      }
      .vignette {
        background: radial-gradient(120% 120% at 50% 42%,
          transparent 45%, rgba(30,18,6,.55) 100%);
        opacity: var(--vig, 0); transition: opacity 1.1s ease;
      }
      .ash { overflow: hidden; opacity: var(--ash, 0); transition: opacity 1.1s ease; }
      .mote {
        position: absolute; bottom: -12px; border-radius: 50%;
        background: rgba(70,52,34,.55); filter: blur(.4px);
        animation: rise linear infinite;
      }
      .sweep {
        background: radial-gradient(circle at 50% 50%,
          rgba(255,246,225,.92), rgba(255,246,225,0) 60%);
        mix-blend-mode: screen; opacity: 0; transform: scale(0);
        transform-origin: 50% 50%;
      }
      @keyframes flicker {
        0% { background-position: 0 0; }
        25% { background-position: -40px 30px; }
        50% { background-position: 30px -20px; }
        75% { background-position: -20px -30px; }
        100% { background-position: 0 0; }
      }
      @keyframes rise {
        0%   { transform: translate(0,0); opacity: 0; }
        12%  { opacity: .75; }
        100% { transform: translate(24px,-112vh); opacity: 0; }
      }
      @keyframes bloom {
        0%   { opacity: 0; transform: scale(0); }
        28%  { opacity: .55; }
        100% { opacity: 0; transform: scale(3.2); }
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
