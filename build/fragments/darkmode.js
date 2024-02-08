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
    .body > .content, #pagelinks a.active {
      background: url(https://i.imgur.com/iKHU5u8.png);
    }
    .body, body > div.body > div.footer, body > div.body > div.content {
      background: url(https://i.imgur.com/iKHU5u8.png);
      background-color: rgba(0, 0, 0, 0.2) !important;
      backdrop-filter: blur(2px);
    }
    .body > .footer > div > div ul li a {
      color: #fff;
    }
    .markdown > .function .function_line {
      background-color: rgba(0, 0, 0, 0.25) !important;
      backdrop-filter: blur(4px);
    }
    .body-tabs ul li a.active {
      background-color: #333;
      color: #fff;
    }
    .markdown {
      color: #999;
    }
    .markdown .code {
      background-color: rgba(0, 0, 0, 0.25) !important;
      backdrop-filter: blur(4px);
    }
    .markdown code {
      background-color: rgba(0, 0, 0, 0.5) !important;
      backdrop-filter: blur(4px);
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
const button = document.getElementById("toggle-dark-mode");

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

button.addEventListener("click", toggleDarkMode)
window.addEventListener("load", checkDarkMode)
