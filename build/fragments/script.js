var EditDisplay;
var Edit;
var Preview;
var Decorator;
class Navigate {
    static Init() {
        this.pageContent = document.getElementById("pagecontent");
        this.pageTitle = document.getElementById("pagetitle");
        this.pageFooter = document.getElementById("pagefooter");
        this.pageTitle2 = document.getElementById("tabs_page_title");
        this.sideBar = document.getElementById("sidebar");
        this.links = this.sideBar.getElementsByTagName("a");
        this.details = this.sideBar.getElementsByTagName("details");
    }
    static ToPage(address, push = true) {
        if (this.pageContent == null) {
            window.location.href = address;
            return true;
        }

        address = address.replaceAll(window.location.origin, "");

        if (address === "" || address === "/") {
            address = "/index";
        }

        var newData;
        this.pageTitle2.innerText = "Loading..";
        this.pageContent.parentElement.classList.add("loading");

        fetch(`/content${address}.json`, { method: 'GET' })
            .then(r => r.json())
            .then(json => {
            newData = json;
        }).catch((e) => {
            newData = { html: "Failed to load page <b>" + address + "</b>" + (e ? "<p>" + e.toString() + "</p>" : ""), title: "Failed to load page", footer: "" };
            console.warn("Failed to fetch " + address);
        }).then(() => {
            if (push) {
                history.pushState({}, "", address);
            }

            requestAnimationFrame(() => {
                window.scrollTo(0, 0);
                this.UpdatePage(newData);
                this.pageContent.parentElement.classList.remove("loading");

                requestAnimationFrame(() => {
                    this.UpdateSidebar();
                    if (window.innerWidth <= 780) {
                        var e = document.getElementById("sidebar");
                        e.classList.remove("visible");
                    }
                });
            })
        });

        return false;
    }

    static UpdatePage(json) {
        requestAnimationFrame(() => {
            this.pageContent.innerHTML = json.html;
            this.pageTitle.innerText = json.title;
            this.pageFooter.innerHTML = json.footer;
            this.pageTitle2.innerText = "";

            requestAnimationFrame(() => {
                var a = document.createElement("a");
                a.classList.add("parent");
                a.text = "Home";
                a.href = "/";
                this.pageTitle2.appendChild(a);
                this.pageTitle2.append("/");
                var a2 = document.createElement("a");
                a2.text = json.title;
                a2.href = `/${json.address}`;
                this.pageTitle2.appendChild(a2);
                var siteTitle = document.title.substring(document.title.lastIndexOf(" - "));
                document.title = json.title + siteTitle;
            })
        })

    }

    static UpdateSidebar() {
        let links = this.links;
        let address = location.href;
        if (address.indexOf("#") > 0) {
            address = address.substring(0, address.indexOf("#"));
        }
        for (var i = 0; i < links.length; i++) {
            var a = links[i];

            if (a.href == address) {
                a.classList.add("active");
                var parent = a.parentElement;
                while (parent != null) {
                    if (parent.tagName == "DETAILS") {
                        var d = parent;
                        d.open = true;
                    }
                    parent = parent.parentElement;
                }
            } else {
                if (a.classList.contains("active")) {
                    a.classList.remove("active");
                }
            }

        }
        var details = this.details;
        for (var i = 0; i < details.length; i++) {
            if (a.classList.contains("active")) {
                a.classList.remove("active");
            }
        }
    }

    static OnNavigated(event) {
        let address = document.location.href;
        if (address.indexOf("#") > 0) {
            address = address.substring(0, address.indexOf("#"));
        }

        this.ToPage(address, false);
    }

    static Install() {
        this.Init();
        window.onpopstate = e => this.OnNavigated(e);

        if (this.pageContent == null)
            return true;

        var thisHost = window.location.host;
        this.sideBar.addEventListener("click", (e) => {
            var a = e.target;

            if (a.host != thisHost)
                return;

            let val = a.getAttribute("href");
            if (val == null || val == "")
                return;

            if (val.indexOf("#") >= 0 || val.indexOf("~") >= 0)
                return;

            if (!(e.ctrlKey || e.shiftKey || e.altKey)) {
                Navigate.ToPage(val);
                e.preventDefault();
            }
        });

        this.pageContent.addEventListener("click", (e) => {
            var a = e.target;
            if (a.host != thisHost)
                return;

            if (a.tagName !== "A")
                return;

            let val = a.getAttribute("href");
            if (val == null || val == "")
                return;

            if (val.indexOf("#") >= 0 || val.indexOf("~") >= 0)
                return;

            if (!(e.ctrlKey || e.shiftKey || e.altKey)) {
                Navigate.ToPage(val);
                e.preventDefault();
            }
        });
    }
}
Navigate.cache = {};


class Parser {
    constructor(rules) {
        this.parseRE = null;
        this.ruleSrc = [];
        this.ruleMap = {};
        this.add(rules);
    }
    add(rules) {
        for (var rule in rules) {
            var s = rules[rule].source;
            this.ruleSrc.push(s);
            this.ruleMap[rule] = new RegExp('^(' + s + ')$', "i");
        }
        this.parseRE = new RegExp(this.ruleSrc.join('|'), 'gmi');
    }
    ;
    tokenize(input) {
        return input.match(this.parseRE);
    }
    ;
    identify(token) {
        for (var rule in this.ruleMap) {
            if (this.ruleMap[rule].test(token)) {
                return rule;
            }
        }
    }
    ;
}
;

class TextareaDecorator {
    constructor(textarea, display, parser) {
        this.input = textarea;
        this.output = display;
        this.parser = parser;
    }
    color(input, output, parser) {
        var oldTokens = output.childNodes;
        var newTokens = parser.tokenize(input);
        var firstDiff, lastDiffNew, lastDiffOld;
        for (firstDiff = 0; firstDiff < newTokens.length && firstDiff < oldTokens.length; firstDiff++)
            if (newTokens[firstDiff] !== oldTokens[firstDiff].textContent)
                break;
        while (newTokens.length < oldTokens.length)
            output.removeChild(oldTokens[firstDiff]);
        for (lastDiffNew = newTokens.length - 1, lastDiffOld = oldTokens.length - 1; firstDiff < lastDiffOld; lastDiffNew--, lastDiffOld--)
            if (newTokens[lastDiffNew] !== oldTokens[lastDiffOld].textContent)
                break;
        for (; firstDiff <= lastDiffOld; firstDiff++) {
            oldTokens[firstDiff].className = parser.identify(newTokens[firstDiff]);
            oldTokens[firstDiff].textContent = oldTokens[firstDiff].innerText = newTokens[firstDiff];
        }
        for (var insertionPt = oldTokens[firstDiff] || null; firstDiff <= lastDiffNew; firstDiff++) {
            var span = document.createElement("span");
            span.className = parser.identify(newTokens[firstDiff]);
            span.textContent = span.innerText = newTokens[firstDiff];
            output.insertBefore(span, insertionPt);
        }
    }
    ;
    update() {
        var input = textarea.value;
        if (input) {
            this.color(input, this.output, this.parser);
        }
        else {
            this.output.innerHTML = '';
        }
    }
}



window.ToggleClass = function(element, classname) {
    var e = document.getElementById(element);
    if (e.classList.contains(classname))
        e.classList.remove(classname);
    else
        e.classList.add(classname);
}


function CopyCode(event) {
    var code = event.target.closest("div.code").innerText;
    navigator.clipboard.writeText(code);
    var btn = event.target.closest("copy");
    var icn = btn.querySelector(".mdi");
    icn.classList.replace("mdi-content-copy", "mdi-check");
    btn.classList.add("copied");
    clearTimeout(icn.copyTimeout);
    icn.copyTimeout = setTimeout(function () {
        icn.classList.replace("mdi-check", "mdi-content-copy");
        btn.classList.remove("copied");
    }, 5000);
}


var SearchInput;
var SearchResults;
var SidebarContents;
var MaxResultCount = 200;
var ResultCount = 0;
var SearchDelay = null;
function InitSearch() {
    SearchInput = document.getElementById("search");
    SearchResults = document.getElementById("searchresults");
    SidebarContents = document.getElementById("contents");
    SearchInput.addEventListener("input", e => {
        clearTimeout(SearchDelay);
        SearchDelay = setTimeout(UpdateSearch, 200);
    });
    SearchInput.addEventListener("keyup", e => {
        if (e.keyCode == 13) {
            window.location.href = "/websearch?query=" + SearchInput.value;
        }
    });
}

function UpdateSearch(limitResults = true) {
    if (limitResults)
        MaxResultCount = 100;
    else
        MaxResultCount = 2000;
    var child = SearchResults.lastElementChild;
    while (child) {
        SearchResults.removeChild(child);
        child = SearchResults.lastElementChild;
    }
    var string = SearchInput.value;
    var tags = [];
    var searchTerms = string.split(" ");
    searchTerms.forEach(str => {
        if (str.startsWith("is:") || str.startsWith("not:")) {
            tags.push(str);
            string = string.replace(str, "");
        }
    });
    if (string.length < 2) {
        SidebarContents.classList.remove("searching");
        SearchResults.classList.remove("searching");
        var sidebar = document.getElementById("sidebar");
        var active = sidebar.getElementsByClassName("active");
        if (active.length == 1) {
            active[0].scrollIntoView({ block: "center" });
        }
        return;
    }
    SidebarContents.classList.add("searching");
    SearchResults.classList.add("searching");
    ResultCount = 0;
    Titles = [];
    TitleCount = 0;
    SectionHeader = null;
    if (string.toUpperCase() == string && string.indexOf("_") != -1) {
        string = string.substring(0, string.indexOf("_"));
    }
    var parts = string.split(' ');
    var q = "";
    for (var i in parts) {
        if (parts[i].length < 1)
            continue;
        var t = parts[i].replace(/([^a-zA-Z0-9_-])/g, "\\$1");
        q += ".*(" + t + ")";
    }
    q += ".*";
    var regex = new RegExp(q, 'gi');
    SearchRecursive(regex, SidebarContents, tags);
    if (limitResults && ResultCount > MaxResultCount) {
        var moreresults = document.createElement('a');
        moreresults.href = "#";
        moreresults.classList.add('noresults');
        moreresults.innerHTML = (ResultCount - 100) + ' more results - show more?';
        moreresults.onclick = (e) => { UpdateSearch(false); return false; };
        SearchResults.append(moreresults);
    }
    if (SearchResults.children.length == 0) {
        var noresults = document.createElement('span');
        noresults.classList.add('noresults');
        noresults.innerHTML = 'No results.<br/>Press Enter to search the wiki.';
        SearchResults.appendChild(noresults);
    }
}
var SectionHeader;
var TitleCount = 0;
var Titles = [];
function SearchRecursive(str, el, tags) {
    var title = null;
    if (el.children.length > 0 && el.children[0].tagName == "SUMMARY") {
        title = el.children[0].children[0];
        Titles.push(title);
        TitleCount++;
    }
    var children = el.children;
    for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (child.className == "sectionheader")
            SectionHeader = child;
        if (child.tagName == "A") {
            if (child.parentElement.tagName == "SUMMARY")
                continue;
            var txt = child.getAttribute("search");
            if (txt == null)
                continue;
            var found = txt.match(str);
            if (found && tags.length > 0) {
                var niceTags = { "server": "rs", "sv": "rs",
                    "client": "rc", "cl": "rc",
                    "menu": "rm", "mn": "rm",
                    "deprecated": "depr", "internal": "intrn",
                };
                tags.forEach(str => {
                    var classSearch = str.split(":").slice(1)[0];
                    if (niceTags[classSearch])
                        classSearch = niceTags[classSearch];
                    if (str.startsWith("is:") && classSearch != null && !child.classList.contains(classSearch)) {
                        found = null;
                    }
                    if (str.startsWith("not:") && classSearch != null && child.classList.contains(classSearch)) {
                        found = null;
                    }
                });
            }
            if (found) {
                if (ResultCount < MaxResultCount) {
                    AddSearchTitle();
                    var copy = child.cloneNode(true);
                    copy.onclick = e => Navigate.ToPage(copy.href, true);
                    copy.classList.add("node" + TitleCount);
                    SearchResults.appendChild(copy);
                }
                ResultCount++;
            }
        }
        SearchRecursive(str, child, tags);
    }
    if (title != null) {
        TitleCount--;
        if (Titles[Titles.length - 1] == title) {
            Titles.pop();
        }
    }
}
function AddSearchTitle() {
    if (Titles.length == 0)
        return;
    if (SectionHeader != null) {
        var copy = SectionHeader.cloneNode(true);
        SearchResults.appendChild(copy);
        SectionHeader = null;
    }
    for (var i = 0; i < Titles.length; i++) {
        var cpy = Titles[i].cloneNode(true);
        if (cpy.href) {
            cpy.onclick = e => Navigate.ToPage(cpy.href, true);
        }
        cpy.className = "node" + ((TitleCount - Titles.length) + i);
        SearchResults.appendChild(cpy);
    }
    Titles = [];
}

window.addEventListener('keydown', (e) => {
    if (e.keyCode != 191)
        return;
    if (document.activeElement.tagName == "INPUT")
        return;
    if (document.activeElement.tagName == "TEXTAREA")
        return;
    SearchInput.focus();
    SearchInput.value = "";
    e.preventDefault();
});

window.addEventListener("load", () => {
    requestAnimationFrame(() => {
        var sidebar = document.getElementById( "sidebar" )
        var active = sidebar.getElementsByClassName( "active" )
        if ( active.length == 1 )
        {
            active[0].scrollIntoView( { smooth: true, block: "center" } )
        }

        requestAnimationFrame(() => {
            InitSearch()

            requestAnimationFrame(() => {
                Navigate.Install()
            });
        });
    });
})
