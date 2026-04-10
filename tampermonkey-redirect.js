// ==UserScript==
// @name         Redirect Gmod Wiki to CFC-Servers/gmodwiki
// @namespace    https://gmodwiki.com/
// @version      1.0
// @description  wiki.facepunch.com/gmod > gmodwiki.com
// @author       https://github.com/Be1zebub
// @match        https://wiki.facepunch.com/gmod/*
// @grant        none
// ==/UserScript==

(function() {
    "use strict";
    window.location.href = `https://gmodwiki.com${window.location.pathname}${window.location.search}${window.location.hash}`;
})();
