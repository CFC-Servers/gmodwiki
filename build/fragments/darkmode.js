// from incredible-gmod.ru with <3
// https://github.com/Be1zebub/Small-GLua-Things/blob/master/dark_wiki.js
// Modified by github.com/brandonsturgeon for use in github.com/CFC-Servers/gmodwiki
const style = `
    :root {
      color-scheme: dark;
    }
    ::-webkit-scrollbar {
      width: 0.5em;
    }
    ::-webkit-scrollbar-thumb {
      background: rgb(92, 92, 92)
    }
    ::-webkit-scrollbar-thumb:hover{
      background: rgb(31, 31, 31);
    }
    .body, div.footer, div.content {
      background-color: rgba(0, 0, 0, 0.2) !important;
    }
    .footer > div > div ul li a {
      color: #fff;
    }
    .function_line {
      background-color: rgba(0, 0, 0, 0.25) !important;
    }
    a.active {
      background-color: #333;
      color: #fff;
    }
    .markdown {
      color: #999;
    }
    .markdown .code {
      background-color: rgba(0, 0, 0, 0.25) !important;
    }
    .markdown code {
      background-color: rgba(0, 0, 0, 0.5) !important;
    }
    .markdown span.key {
      background-color: #000;
    }
    .markdown h2 {
      color: #0082ff;
    }
    .markdown h3 {
      color: #0082ff;
    }
    .body-tabs ul li a {
      color: #fff;
    }
    .markdown table td {
      border: 1px solid #111;
      background-color: #222;
    }
    .markdown table th {
      border: 1px solid #111;
      background-color: #333;
    }
    .member_line {
      color: #999;
    }
    .member_line a.subject {
      color: #0082ff !important;
    }

  .highlight {
      background-color: #dd610082;
  }
`;

const transitions = `
    .body, div.footer, div.content {
      transition: background-color 0.2s;
    }
    .body > .footer > div > div ul li a {
      transition: color 0.2s;
    }
    .function_line {
      transition: background-color 0.2s;
    }
    a.active {
      transition: background-color 0.2s color 0.2s;
    }
    .markdown, .markdown .code, .markdown code, .markdown span.key, .markdown h2, .markdown h3, .body-tabs ul li a, .markdown table td, .markdown table th, .member_line, .member_line a.subject, .highlight {
      transition: background-color 0.2s border 0.2s;
    }
`;

function addTransitions() {
    const head = document.getElementsByTagName("head")[0];
    if (!head) { return; }

    const styleElement = document.createElement("style");
    styleElement.id = "dark-mode-transitions";
    styleElement.type = "text/css";
    styleElement.innerHTML = transitions;
    head.appendChild(styleElement);
}

function addGlobalStyle() {
    const head = document.getElementsByTagName("head")[0];
    if (!head) { return; }

    const styleElement = document.createElement("style");
    styleElement.id = "dark-mode";
    styleElement.type = "text/css";
    styleElement.innerHTML = style;
    head.appendChild(styleElement);
}

function removeGlobalStyle() {
    const style = document.getElementById("dark-mode");
    if (style) style.remove();
}

function setDarkMode(value) {
    localStorage.setItem("darkMode", value);
}

function getDarkMode() {
    return localStorage.getItem("darkMode");
}

let darkModeEnabled = getDarkMode() === "true";

function checkDarkMode() {
  if (darkModeEnabled) {
      addGlobalStyle();
  } else {
      removeGlobalStyle();
  }
}

function toggleDarkMode() {
    darkModeEnabled = !darkModeEnabled
    if (darkModeEnabled) {
        setDarkMode("true");
    } else {
        setDarkMode("false");
    }
    checkDarkMode()
}

window.addEventListener("DOMContentLoaded", () => {
    addTransitions()
    checkDarkMode()
})

window.addEventListener("load", () => {
    const button = document.getElementById("toggle-dark-mode")
    button.addEventListener("click", toggleDarkMode)
})
