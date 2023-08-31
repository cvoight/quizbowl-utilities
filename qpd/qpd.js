/** Settings dialog (480 x 640 px) */
const settings = () => render("Settings", 430, 546);
/** Pronunciation guide placement dialog (672 x 896 px) */
const place = () => render("Page", 622, 662, "Place pronunciation guides");
/** HtmlService wrappers for templated HTML. Displays modal dialog. */
const render = (fn, w, h, title = fn) => {
  const html = HtmlService.createTemplateFromFile(fn)
    .evaluate()
    .setWidth(w)
    .setHeight(h);
  SpreadsheetApp.getUi().showModalDialog(html, title);
};
const include = (fn) => HtmlService.createHtmlOutputFromFile(fn).getContent();
/**
 *
 */
function fontList() {
  const response = UrlFetchApp.fetch("https://www.googleapis.com/webfonts/v1/webfonts?key=AIzaSyBcPy5nPys7OFf2sktjs1e7lEDlCPOxVjY");
  const o = JSON.parse(response.getContentText());
  return o.items.map(e => e.family);
}
const userProperties = () => PropertiesService.getUserProperties();
const defaultSettings = {
  font: "Source Sans Pro",
  color: "#777777",
  concatenate: "false",
};
class Settings {
  constructor() {
    const userSettings = userProperties().getProperties();
    Object.assign(this, defaultSettings, userSettings);
    return new Proxy(this, {
      get(target, key) {
        return userProperties().getProperty(key) ?? defaultSettings[key];
      },
    });
  }
}
const userOptions = new Settings();
const getSettings = () => userOptions;
const setSettings = (o) => (userProperties().setProperties(o), o);
/**
 *
 */
// const getDocs = () => {
//   const urls = SpreadsheetApp.getActiveSpreadsheet()
//     .getRangeByName("links")
//     .getValues()
//     .flat();
//   return urls
//     .filter((e) => e.length !== 0)
//     .map((e) => ({
//       id: e.match(/\/document\/d\/([a-zA-Z0-9-_]+)/)[1],
//       name: DocumentApp.openByUrl(e).getName(),
//     }));
// };
function getDocs() {
  const links = SpreadsheetApp.getActiveSpreadsheet()
    .getRangeByName("links")
    .getValues()
    .flat();
  return links
    .filter((e) => e.length !== 0)
    .map((e) => {
      return { url: e, name: DocumentApp.openByUrl(e).getName() };
      // return { url: e, name: DocumentApp.openByUrl(e).getName().substring(0,8) };
    });
}
/**
 *
 */
function retrieveDb() {
  const cache = CacheService.getScriptCache();
  const ids = "abcdefghij".split("");
  const cached = cache.getAll(ids);
  if (ids.every((e) => Object.keys(cached).includes(e))) {
    let values = new Array();
    for (const k in cached) {
      values.push(JSON.parse(cached[k]));
    }
    return values.flat();
  }
  // The Quizbowl Pronouncing Dictionary is licensed under the
  // Open Database License (ODbL).
  // const database =
  //   SpreadsheetApp.openById("1B96WA4fiMgRjiyy7wmuGZD291C6Yxz-wecCrHUkwa-E")
  //     .getSheetByName("pgs")
  //     .getDataRange()
  //     .getValues();
  const values = SpreadsheetApp.openById(
    "1W-iksD86--98TkMt0Df42Pj26l9pvyWxX_FXOpVkxkU"
  )
    .getRange("pgs!A3:B14581")
    .getValues();
  const n = ids.length;
  const is = Array.from(new Array(n), (_, i) => i);
  let obj = new Object();
  for (let i of is) {
    let startIdx = Math.ceil((i * values.length) / n);
    let endIdx = Math.ceil(((i + 1) * values.length) / n) + 1;
    obj[ids[i]] = JSON.stringify(values.slice(startIdx, endIdx));
  }
  cache.putAll(obj, 21600);
  return values;
}
function getPGs(id) {
  const doc = DocumentApp.openById(id);
  const body = doc.getBody();
  const text = normalize(body.getText());
  const values = retrieveDb();
  const tooCommon = [
    "He", "Death", "were", "de", "on", "00", "David", "11", "II", "U", "V", "I",
    "Griffin", "Robert", "Adam", "Charles", "Images", "son", "cis", "mate", "l",
    "Pope", "Ali", "leads", "Paris", "re", "Mary", "service", "Powell", "bases",
    "Ion", "Laura", "Nancy", "lead", "oil", "hare", "K", "Wolf", "sake", "Part",
    "comes", "General", "100", "St. John", "Adam's", "Ralph", "Jose", "Richard",
    "patent", "Benjamin", "Berkeley", "Jordan", "Reading", "August", "Orleans",
    "meme", "taste", "aware", "engage", "Helen",
  ];
  const pgs = values.reduce((r, [w, pg]) => {
    const wn = normalize(w);
    if (tooCommon.includes(wn)) return r;
    if (wn.includes("|")) {
      const wns = new Set(wn.split("|"));
      for (const e of wns) {
        r.has(e)
          ? r.get(e).add(pg)
          : r.set(e.replace(/^.*:/, ""), new Set([pg]));
      }
      return r;
    }
    r.has(wn) ? r.get(wn).add(pg) : r.set(wn, new Set([pg]));
    return r;
  }, new Map());
  const processor = new KeywordProcessor(true);
  processor.addKeywordsFromArray(Array.from(pgs.keys()));
  const keywordsFound = processor.extractKeywords(text);
  const keywords = [...new Set(keywordsFound)];
  const sb = escapeRegExp("<>\n\r\f.!?");
  function PGObject(keyword, pg, sentence) {
    this.keyword = keyword;
    this.pg = pg;
    this.sentence = sentence;
  }
  return keywords.flatMap((k) => {
    // need to figure out how to match whitespace after punctuation
    // and quotation marks after punctuation
    const match = text.match(
      new RegExp(
        `[^${sb}]*(?<=\\W|^)(${escapeRegExp(
          k
        )})(?=\\W)[^${sb}]*(?:[${sb}]['"]?|$)`,
        "gm"
      )
    );
    const pg =
      userOptions.concatenate === "true"
        ? Array.from(pgs.get(k)).join("|")
        : Array.from(pgs.get(k))[0];
    return match
      ? match.reduce((r, m) => {
          let placed = m.match(
            new RegExp(`${escapeRegExp(k)} \\("${escapeRegExp(pg)}"\\)`, "g")
          );
          if (placed) return r;
          r.push(new PGObject(k, pg, m));
          return r;
        }, [])
      : [];
  });
}
/*
 *
 */
function insertPGs(id, s, pg) {
  const ss = s.toString();
  const doc = DocumentApp.openById(id);
  const body = doc.getBody();
  const text = body.editAsText();
  const pgformed = `\u00a0(“${pg}”)`;
  const ntext = normalize(body.getText());
  const re = new RegExp(`${escapeRegExp(ss)}`);
  const match = ntext.match(re);
  const idx = match.index + ss.length;
  const endIdx = idx + pgformed.length - 1;
  text.insertText(idx, pgformed);
  function Style() {
    this[DocumentApp.Attribute.FONT_FAMILY] = userOptions.font;
    this[DocumentApp.Attribute.FOREGROUND_COLOR] = userOptions.color;
    this[DocumentApp.Attribute.BOLD] = false;
    this[DocumentApp.Attribute.ITALIC] = false;
    this[DocumentApp.Attribute.UNDERLINE] = false;
  }
  text.setAttributes(idx + 1, endIdx, new Style());
  return { index: idx, id: id, searchterm: ss, pg: pg };
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
// normalization for string equivalence. must not alter length.
function normalize(s) {
  return (
    s
      .normalize("NFD")
      // https://www.unicode.org/Public/UCD/latest/ucd/PropList.txt
      //\p{Diacritics} includes \u00b7 interpunct.
      .replaceAll(/[\u0300-\u036f]/g, "")
      .replaceAll(/[\u201c-\u201f\u2033]/g, '"')
      .replaceAll(/[\u02bb\u2018-\u201b\u2032]/g, "'")
      //\p{Dash}\p{Hyphen} doesn't work.
      .replaceAll(/[\p{Pd}]/gu, "-")
      .replaceAll(/[\u01C3]/g, "!")
      .replaceAll(/[\u00d7\u2715\u2716]/g, "x")
      .replaceAll(/[\p{Zs}]/gu, " ")
  );
}
