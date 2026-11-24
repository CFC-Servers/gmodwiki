import { describe, expect, it } from "vitest";
import { removeDeadStyles } from "./css.js";

describe("removeDeadStyles", () => {
  it("keeps whitelisted icons and drops unused ones", () => {
    const css = [
      ".mdi-account::before {\n  content: \"a\";\n}\n",
      ".mdi-never-used::before {\n  content: \"b\";\n}\n",
      "#sidebar {\n  color: red;\n}\n",
    ].join("");

    const result = removeDeadStyles(css);

    expect(result).toContain(".mdi-account::before");
    expect(result).toContain("#sidebar");
    expect(result).not.toContain(".mdi-never-used");
  });

  it("leaves no comment fragments when a dropped rule contains commented-out blocks", () => {
    const css = [
      ".mdi-rotate-45 {\n",
      "  /*\n",
      "      &.mdi-flip-h:before {\n",
      "          transform: scaleX(-1) rotate(45deg);\n",
      "      }\n",
      "      &.mdi-flip-v:before {\n",
      "          transform: scaleY(-1) rotate(45deg);\n",
      "      }\n",
      "      */\n",
      "}\n",
      "#sidebar {\n  color: red;\n}\n",
    ].join("");

    const result = removeDeadStyles(css);

    expect(result).not.toContain("*/");
    expect(result).not.toContain("mdi-flip");
    expect(result).toContain("#sidebar");
  });
});
