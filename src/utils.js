import { readFileSync } from "fs";

export function fetchDefaultExport(file) {
  const code = readFileSync(file, "utf-8");

  var match = /export default/.exec(code);
  if (match) {
    let index = match.index + 15,
      word = "";

    for (let i = index; i < code.length; i++) {
      const char = code[i];
      word += char;

      if (char != " ") nonSpaceFound = true;

      if (word.includes("function ")) {
        if (char === "(") {
          index = word.indexOf("function") + 9;
          return word.substring(index, word.length-1).trim();
        }
      } else if (["\n", ";", "=", " "].includes(char)) {
        return word.substring(0, word.length-1).trim();
      } else if (i == code.length -1) {
        return word.trim();
      }
    }
  }

  match = /export {.*as.*default/.exec(code);
  if (match) {
    const index = code.indexOf(" as default", match.index) - 1;
    var nonSpaceFound = false;
    for (let i = index; index > match.index; i-- ) {
      const char = code[i];
      if (char != " ") nonSpaceFound = true;

      if ((nonSpaceFound && char === " ") || char === "," || char === "{") {
        return code.substring(i + 1, index).trim();
      }
    }
  }

  return "";
}
