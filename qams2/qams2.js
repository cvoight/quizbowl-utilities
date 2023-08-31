/* ****************************************************************************
 * This Google Apps Script is used to track and manage set production in a
 * Google Sheets answer spreadsheet.
 * Completion: uses initials to determine how many questions a person has
 * claimed, written, or edited and bold/underline status to determine whether a
 * question has been finished or needs to be rewritten.
 * Packet templates: generates packet templates based on a user-defined
 * distribution specification.
 * https://docs.google.com/spreadsheets/d/1KTmfDe4JwHpVDyjkgkiwK0ev8Gp2pawSekfSLms0Pk4/edit#gid=564996451
 * Author: Cody Voight
 * Version: 1.0.0-public
 * ***************************************************************************/

/**
 * @OnlyCurrentDoc
 */

// qams uses named ranges to collect and set data. It does not write or read
// data outside the ranges.

// the answer space, structured with packets as column headers and tossups
// and bonuses in alternating rows (with tossups as Row 1 of the range).
// if your answer space is structured differently, see the comments in the
// writerCompletion function below.
const answerRangeString = "answers";
// 1-column writer initials range, which must be a unique string
const initialsRangeString = "initials";
// 9-column range to set totals by writer
const totalsRangeString = "totals";
// 1-column range to get distribution
const distributionRangeString = "distribution";
// the template space, structured with packets as rows (alternating tossups and
// bonuses) and question indices as columns
const templatesRangeString = "templates";

/******************************************************************************/

// creates the qams menu
function onOpen(e) {
  SpreadsheetApp.getUi()
    .createMenu("qams²")
    .addItem("Completion", "ui_completion")
    .addItem("Generate packet templates", "packetTemplates")
    .addToUi();
}

// queues updates to the sheet
function onEdit(e) {
  const dp = PropertiesService.getDocumentProperties();
  dp.setProperty("update", "true");
}

// updates the sheet when used with a time-based trigger
function doUpdate() {
  const dp = PropertiesService.getDocumentProperties();
  if (dp.getProperty("update") !== "true") return;
  dp.setProperty("update", "false");
  completion();
}

/******************************************************************************/

function ui_completion() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const errorAlertTitle = "qams execution error";
  const namedRangeNotFound =
    "A named range could not be found. Please\
      double-check the named ranges against the script variables.";
  const rangeVerification = function (...ranges) {
    if (ranges.some((e) => e === null)) {
      throw new Error(namedRangeNotFound);
    } else {
      return true;
    }
  };

  try {
    rangeVerification(
      ss.getRangeByName(answerRangeString),
      ss.getRangeByName(initialsRangeString),
      ss.getRangeByName(totalsRangeString)
    );
  } catch (e) {
    ui.alert(errorAlertTitle, e, ui.ButtonSet.OK);
    return;
  }

  completion();
}

function completion() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // named range, or null if not found
  const answerRange = ss.getRangeByName(answerRangeString);
  const initialsRange = ss.getRangeByName(initialsRangeString);
  const totalsRange = ss.getRangeByName(totalsRangeString);

  // Object[][], a 2D array of values (Number, Boolean, Date, or String).
  // Empty cells are represented by an empty string.
  const answerValues = answerRange.getValues();
  // String[][], a 2D array of color codes in CSS notation ('#ffffff', 'white').
  const answerBackgrounds = answerRange.getBackgrounds();
  // String[][] – 2D array of font weights ('bold', 'normal').
  const answerFontWeights = answerRange.getFontWeights();
  // String[][] – 2D array of line styles ('underline', 'line-through', 'none').
  const answerFontLines = answerRange.getFontLines();
  const initials = initialsRange.getValues().filter((e) => e[0].length);

  const claimedRegEx = /\[(.+)\]/;
  const writtenRegEx = /\<(.+)\>/;
  const editedRegEx = /\|(.+)\|/;

  function process(v, bg, fw, fl) {
    if (!v.length) {
      return [v, null, null, null];
    } else if (v.includes("✘") || fl === "underline") {
      // return ["✘" + v.replaceAll("✘","").trim(), "#ffcccc", null, "underline"];
      return ["✘" + v.replaceAll("✘", "").trim(), "#ee3377", null, null];
    } else if (v.includes("✔") || fw === "bold") {
      // return ["✔" + v.replaceAll("✔","").trim(), "#ccddaa", "bold", null];
      return ["✔" + v.replaceAll("✔", "").trim(), "#44bb99", null, null];
    } else {
      const background = editedRegEx.test(v)
        ? "#99ddff"
        : writtenRegEx.test(v)
        ? "#bbcc33"
        : claimedRegEx.test(v)
        ? "#eeeebb"
        : null; // : bg;
      return [v, background, fw, fl];
    }
  }

  const zipWith2D = (f, ...iters) =>
    iters[0].map((row, rowIdx) =>
      row.map((_, colIdx) => f(...iters.map((iter) => iter[rowIdx][colIdx])))
    );
  const zip2D = (...iters) =>
    iters[0].map((row, rowIdx) =>
      row.map((_, colIdx) => iters.map((iter) => iter[rowIdx][colIdx]))
    );
  const correctedAnswerSpace = zipWith2D(
    process,
    answerValues,
    answerBackgrounds,
    answerFontWeights,
    answerFontLines
  );

  const vecAdd = (...vs) =>
    vs[0].map((_, i) => vs.reduce((p, c) => p + c[i], 0));

  base = new Array(9).fill(0);
  base_null = new Array(9).fill(null);
  claimTU = [1, 0, 1, 0, 0, 0, 0, 0, 0];
  claimB = [0, 1, 1, 0, 0, 0, 0, 0, 0];
  writeTU = [0, 0, 0, 1, 0, 1, 0, 0, 0];
  writeB = [0, 0, 0, 0, 1, 1, 0, 0, 0];
  editTU = [0, 0, 0, 0, 0, 0, 1, 0, 1];
  editB = [0, 0, 0, 0, 0, 0, 0, 1, 1];

  // Map(initials) preserves order of writers
  const totals = correctedAnswerSpace.reduce((p, r, i) => {
    const row = r.reduce((m, [v, bg, fw, fl]) => {
      if (!v.length) return m;
      const editor = editedRegEx.exec(v);
      const writer = writtenRegEx.exec(v);
      const claimer = claimedRegEx.exec(v);
      if (claimer)
        m.set(
          claimer[1],
          vecAdd(m.get(claimer[1]) || base, i % 2 ? claimB : claimTU)
        );
      if (writer)
        m.set(
          writer[1],
          vecAdd(m.get(writer[1]) || base, i % 2 ? writeB : writeTU)
        );
      if (editor)
        m.set(
          editor[1],
          vecAdd(m.get(editor[1]) || base, i % 2 ? editB : editTU)
        );
      return m;
    }, new Map(initials));
    for (const initial of row.keys()) {
      p.set(initial, vecAdd(row.get(initial) || base, p.get(initial) || base));
    }
    return p;
  }, new Map(initials));

  const [
    correctedValues,
    correctedBackgrounds,
    correctedFontWeights,
    correctedFontLines,
  ] = zip2D(...zip2D(...correctedAnswerSpace));
  answerRange.setValues(correctedValues);
  answerRange.setBackgrounds(correctedBackgrounds);
  answerRange.setFontWeights(correctedFontWeights);
  answerRange.setFontLines(correctedFontLines);
  const ins = Array.from(
    { length: totalsRange.getHeight() },
    (_, i) => [[...totals.keys()][i]] || [null]
  );
  initialsRange.setValues(ins);
  const ts = Array.from(
    { length: totalsRange.getHeight() },
    (_, i) => [...totals.values()][i] || base
  );
  totalsRange.setValues(ts.map((r) => r.map((e) => (e ? e : null))));
}

/******************************************************************************/

function packetTemplates() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const distributionRange = ss.getRangeByName(distributionRangeString);
  const templatesRange = ss.getRangeByName(templatesRangeString);

  const frequencyMap2 = (m, e) =>
    m.set(e.substring(0, 2), (m.get(e.substring(0, 2)) || 0) + 1);
  const frequencyMap4 = (m, e) =>
    m.set(e.substring(0, 4), (m.get(e.substring(0, 4)) || 0) + 1);
  const shuffle = (r, e, i) => {
    const rand = Math.floor(Math.random() * (i + 1));
    r[i] = r[rand];
    r[rand] = e;
    return r;
  };
  const swap = (xs, a, b) => (([xs[a], xs[b]] = [xs[b], xs[a]]), xs);

  const csp = (constraints) => {
    const constrain = (variables) => {
      return constraints.reduce((p, c) => {
        const [h, t, b, n, constraint] = c;
        return constraint(variables.slice(h, t + 1), b, n) ? p + 1 : p;
      }, 0);
    };

    const solve = (variables, level = 0) => {
      if (level > 5) return solve(variables.reduce(shuffle, []));
      if (constrain(variables) === 0) return variables;

      const indices = Array.from(
        { length: variables.length },
        (_, i) => i
      ).flatMap((i1, i, a) => a.slice(i + 1).map((i2) => [i1, i2]));
      const swaps = indices.map((e) => swap(variables.slice(), e[0], e[1]));
      const mc = swaps.reduce((p, c) => (constrain(c) < constrain(p) ? c : p));

      return solve(mc, level + 1);
    };

    return solve;
  };

  const packetizingProblem = (distribution) => {
    const size = distribution.length;
    const variables = distribution.reduce(shuffle, []);

    const consecutive = Array.from({ length: size - 1 }, (_, i) => [
      i,
      i + 1,
      "",
      "",
      (v, b, n) => v[0].substring(0, 2) === v[1].substring(0, 2),
    ]);

    const categoryFrequency = variables.reduce(frequencyMap2, new Map());
    const categories = Array.from(categoryFrequency.entries(), ([k, v]) => {
      if (v < 2) return [];
      const code = k.substring(1, 2);
      if (code !== "A" && code !== "B") return [];
      const width = code === "A" ? size / v : size / 2;
      const n = code === "A" ? 1 : Math.ceil(v / 2);
      return Array.from({ length: code === "B" ? 2 : v }, (_, i) => [
        Math.round(i * width),
        Math.round((i + 1) * width - 1),
        k,
        n,
        (v, b, n) =>
          v.reduce((p, c) => (c.substring(0, 2) === b ? p + 1 : p), 0) > n,
      ]);
    }).flat();

    const subcategoryFrequency = variables.reduce(frequencyMap4, new Map());
    const subcategories = Array.from(
      subcategoryFrequency.entries(),
      ([k, v]) => {
        if (v < 2) return [];
        const code = k.substring(3, 4);
        if (code !== "a" && code !== "b") return [];
        const width = code === "a" ? size / v : size / 2;
        const n = code === "a" ? 1 : Math.ceil(v / 2);
        return Array.from({ length: code === "b" ? 2 : v }, (_, i) => [
          Math.round(i * width),
          Math.round((i + 1) * width - 1),
          k,
          n,
          (v, b, n) =>
            v.reduce((p, c) => (c.substring(0, 4) === b ? p + 1 : p), 0) > n,
        ]);
      }
    ).flat();

    const constraints = consecutive.concat(categories, subcategories);
    return { variables, constraints };
  };

  const distribution = distributionRange
    .getValues()
    .flatMap((e) => (e[0] === "" ? [] : e));

  const templates = templatesRange.getValues().map((e) => {
    if (e[0] !== "") {
      const { variables, constraints } = packetizingProblem(distribution);
      const solve = csp(constraints);
      const template = solve(variables);
      e.splice(2, template.length, ...template);
    }
    return e;
  });

  templatesRange.setValues(templates);
}
