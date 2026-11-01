#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function printUsage() {
  console.error('Usage: node tools/service_script_check.js <script-file> [--line <n>] [--context <n>] [--script]');
  console.error('Examples:');
  console.error('  node tools/service_script_check.js boxcheck.html.js --line 83');
  console.error('  node tools/service_script_check.js boxcheck.html.js --script');
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length < 2) {
  printUsage();
}

let filePath;
let lineNumber = null;
let context = 5;
let scriptMode = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--line' || arg === '-l') {
    i += 1;
    lineNumber = args[i] ? Number(args[i]) : NaN;
    if (!Number.isInteger(lineNumber) || lineNumber < 1) {
      console.error('Error: --line must be a positive integer.');
      process.exit(1);
    }
  } else if (arg === '--context' || arg === '-c') {
    i += 1;
    context = args[i] ? Number(args[i]) : NaN;
    if (!Number.isInteger(context) || context < 0) {
      console.error('Error: --context must be a non-negative integer.');
      process.exit(1);
    }
  } else if (arg === '--script' || arg === '-s') {
    scriptMode = true;
  } else if (!filePath) {
    filePath = arg;
  } else {
    console.error(`Unknown argument: ${arg}`);
    printUsage();
  }
}

if (!filePath || (!scriptMode && !lineNumber)) {
  printUsage();
}

const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
if (!fs.existsSync(absolutePath)) {
  console.error(`Error: file not found: ${absolutePath}`);
  process.exit(1);
}

const fileText = fs.readFileSync(absolutePath, 'utf8');

function findDataLiteral(text) {
  const dataPattern = /\bdata\b\s*=\s*/g;
  let match;
  while ((match = dataPattern.exec(text)) !== null) {
    let idx = match.index + match[0].length;
    while (idx < text.length && /\s/.test(text[idx])) idx += 1;
    if (idx >= text.length) break;
    const opener = text[idx];
    if (opener === '`' || opener === '"' || opener === "'") {
      return parseLiteral(text, idx);
    }
  }
  return null;
}

function parseLiteral(text, startIndex) {
  const quote = text[startIndex];
  let value = '';
  let i = startIndex + 1;
  let escaped = false;
  let braceDepth = 0;
  let inExpression = false;

  if (quote === '`') {
    while (i < text.length) {
      const ch = text[i];
      if (escaped) {
        value += ch;
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
        value += ch;
      } else if (ch === '$' && text[i + 1] === '{') {
        inExpression = true;
        braceDepth = 0;
        value += '${';
        i += 1;
      } else if (inExpression) {
        if (ch === '{') {
          braceDepth += 1;
        } else if (ch === '}') {
          if (braceDepth === 0) {
            inExpression = false;
          } else {
            braceDepth -= 1;
          }
        }
        value += ch;
      } else if (ch === '`') {
        return { text: value, startIndex, endIndex: i + 1 };
      } else {
        value += ch;
      }
      i += 1;
    }
  } else {
    while (i < text.length) {
      const ch = text[i];
      if (escaped) {
        value += ch;
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === quote) {
        return { text: value, startIndex, endIndex: i + 1 };
      } else {
        value += ch;
      }
      i += 1;
    }
  }
  return null;
}

function findScriptBlocks(html) {
  const pattern = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  const blocks = [];
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const contentOffset = match[0].indexOf(match[1]);
    blocks.push({
      content: match[1],
      startIndex: match.index,
      contentStartIndex: match.index + contentOffset,
      raw: match[0]
    });
  }
  return blocks;
}

function computeLineNumber(text, index) {
  return text.slice(0, index).split(/\r\n|\n|\r/).length + 1;
}

function printContext(lines, errorLine, context) {
  const startLine = Math.max(1, errorLine - context);
  const endLine = Math.min(lines.length, errorLine + context);
  const width = String(endLine).length;
  for (let idx = startLine; idx <= endLine; idx += 1) {
    const marker = idx === errorLine ? '>' : ' ';
    const padded = String(idx).padStart(width, ' ');
    console.log(`${marker} ${padded}: ${lines[idx - 1]}`);
  }
}

function getErrorLocation(err) {
  const lineNumber = err.lineNumber || err.line || err.loc?.line || null;
  const columnNumber = err.columnNumber || err.column || err.loc?.column || null;
  if (lineNumber) {
    return { lineNumber, columnNumber };
  }

  if (typeof err.stack === 'string') {
    const match = err.stack.match(/\n\s*at .*:(\d+):(\d+)/);
    if (match) {
      return { lineNumber: Number(match[1]), columnNumber: Number(match[2]) };
    }
  }
  return { lineNumber: null, columnNumber: null };
}

function scanBraceMismatches(text) {
  let line = 1;
  let column = 1;
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;
  let templateExprDepth = 0;
  const unmatchedCloses = [];
  const openStack = [];

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
        line += 1;
        column = 1;
      } else {
        column += 1;
      }
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 1;
        column += 2;
        continue;
      }
      if (ch === '\n') {
        line += 1;
        column = 1;
      } else {
        column += 1;
      }
      continue;
    }

    if (inSingle) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === "'") {
        inSingle = false;
      }
      if (ch === '\n') {
        line += 1;
        column = 1;
      } else {
        column += 1;
      }
      continue;
    }

    if (inDouble) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inDouble = false;
      }
      if (ch === '\n') {
        line += 1;
        column = 1;
      } else {
        column += 1;
      }
      continue;
    }

    if (inBacktick) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '$' && next === '{') {
        templateExprDepth += 1;
        i += 1;
        column += 2;
        continue;
      } else if (ch === '`' && templateExprDepth === 0) {
        inBacktick = false;
      } else if (ch === '}' && templateExprDepth > 0) {
        templateExprDepth -= 1;
      }
      if (ch === '\n') {
        line += 1;
        column = 1;
      } else {
        column += 1;
      }
      continue;
    }

    if (ch === '/' && next === '/') {
      inLineComment = true;
      i += 1;
      column += 2;
      continue;
    }

    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i += 1;
      column += 2;
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      column += 1;
      continue;
    }

    if (ch === '"') {
      inDouble = true;
      column += 1;
      continue;
    }

    if (ch === '`') {
      inBacktick = true;
      templateExprDepth = 0;
      column += 1;
      continue;
    }

    if (ch === '{') {
      if (!inBacktick || templateExprDepth > 0) {
        openStack.push({ line, column });
      }
      column += 1;
      continue;
    }

    if (ch === '}') {
      if (!inBacktick || templateExprDepth > 0) {
        if (openStack.length === 0) {
          unmatchedCloses.push({ line, column });
        } else {
          openStack.pop();
        }
      }
      column += 1;
      continue;
    }

    if (ch === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }

  return { unmatchedCloses, unmatchedOpens: openStack };
}

function findUnmatchedCloseBrace(text) {
  const result = scanBraceMismatches(text);
  if (result.unmatchedCloses.length > 0) {
    return result.unmatchedCloses[0].line;
  }
  return null;
}

function findLikelyExtraCloseBrace(text, errorLine) {
  const result = scanBraceMismatches(text);
  if (result.unmatchedCloses.length > 0) {
    return result.unmatchedCloses[0].line;
  }
  if (result.unmatchedOpens.length > 0) {
    // Unclosed open brace—return the last remaining open brace before the end.
    return result.unmatchedOpens[result.unmatchedOpens.length - 1].line;
  }
  return null;
}

function findLikelyExtraCloseBrace(text, errorLine) {
  let line = 1;
  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;
  let templateExprDepth = 0;
  const positions = [];

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
        line += 1;
      }
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 1;
        continue;
      }
      if (ch === '\n') {
        line += 1;
      }
      continue;
    }

    if (inSingle) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === "'") {
        inSingle = false;
      }
      if (ch === '\n') {
        line += 1;
      }
      continue;
    }

    if (inDouble) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inDouble = false;
      }
      if (ch === '\n') {
        line += 1;
      }
      continue;
    }

    if (inBacktick) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '$' && next === '{') {
        templateExprDepth += 1;
        i += 1;
        continue;
      } else if (ch === '`' && templateExprDepth === 0) {
        inBacktick = false;
      } else if (ch === '}' && templateExprDepth > 0) {
        templateExprDepth -= 1;
      }
      if (ch === '\n') {
        line += 1;
      }
      continue;
    }

    if (ch === '/' && next === '/') {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i += 1;
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      continue;
    }

    if (ch === '"') {
      inDouble = true;
      continue;
    }

    if (ch === '`') {
      inBacktick = true;
      templateExprDepth = 0;
      continue;
    }

    if (ch === '}') {
      positions.push(line);
    }

    if (ch === '\n') {
      line += 1;
    }
  }

  for (let i = positions.length - 1; i >= 0; i -= 1) {
    if (positions[i] < errorLine) {
      return positions[i];
    }
  }
  return null;
}

const literal = findDataLiteral(fileText);
if (!literal) {
  console.error('Error: Could not locate a `data` assignment or recognizable string literal in the specified file.');
  process.exit(1);
}

const dataStartLine = computeLineNumber(fileText, literal.startIndex);
const dataText = literal.text;
const dataLines = dataText.split(/\r\n|\n|\r/);
const totalLines = dataLines.length;

if (lineNumber !== null) {
  if (lineNumber > totalLines) {
    console.error(`Error: requested line ${lineNumber} is beyond data content length (${totalLines} lines).`);
    process.exit(1);
  }

  const startLine = Math.max(1, lineNumber - context);
  const endLine = Math.min(totalLines, lineNumber + context);
  const width = String(endLine).length;

  console.log(`File: ${absolutePath}`);
  console.log(`Data content lines ${startLine}-${endLine} of ${totalLines} (requested ${lineNumber})`);
  for (let idx = startLine; idx <= endLine; idx += 1) {
    const marker = idx === lineNumber ? '>' : ' ';
    const padded = String(idx).padStart(width, ' ');
    console.log(`${marker} ${padded}: ${dataLines[idx - 1]}`);
  }
}

if (scriptMode) {
  const scriptBlocks = findScriptBlocks(dataText);
  if (scriptBlocks.length === 0) {
    console.error('Error: no <script> blocks found in data content.');
    process.exit(1);
  }

  console.log(`Checking ${scriptBlocks.length} <script> block(s) inside data content for syntax errors...`);
  let errorCount = 0;

  for (let idx = 0; idx < scriptBlocks.length; idx += 1) {
    const block = scriptBlocks[idx];
    const blockLine = computeLineNumber(dataText, block.contentStartIndex);
    const filename = `${absolutePath} [data script ${idx + 1}]`;
    try {
      new vm.Script(block.content, { filename });
      console.log(`  [OK] script block ${idx + 1} starting at data line ${blockLine}`);
    } catch (err) {
      errorCount += 1;
      const location = getErrorLocation(err);
      const lineNumberInScript = location.lineNumber;
      const columnNumber = location.columnNumber;
      const braceResult = scanBraceMismatches(block.content);
      const fallbackLine = block.content.split(/\r\n|\n|\r/).length + 1;
      const mismatchLine = findLikelyExtraCloseBrace(block.content, lineNumberInScript || fallbackLine);
      let report = `  [ERROR] script block ${idx + 1} starting at data line ${blockLine}: ${err.message}`;
      let absoluteErrorLine = null;
      if (lineNumberInScript) {
        absoluteErrorLine = blockLine + lineNumberInScript - 1;
        const absoluteErrorFileLine = dataStartLine + absoluteErrorLine - 1;
        report += ` (script line ${lineNumberInScript}, data line ${absoluteErrorLine}, file line ${absoluteErrorFileLine}`;
        if (columnNumber) report += `, column ${columnNumber}`;
        report += `)`;
      }
      if (braceResult.unmatchedCloses.length > 0) {
        const close = braceResult.unmatchedCloses[0];
        const absoluteMismatchLine = blockLine + close.line - 1;
        const absoluteMismatchFileLine = dataStartLine + absoluteMismatchLine - 1;
        report += ` [unmatched '}' at script line ${close.line}, data line ${absoluteMismatchLine}, file line ${absoluteMismatchFileLine}]`;
      } else if (braceResult.unmatchedOpens.length > 0) {
        const open = braceResult.unmatchedOpens[braceResult.unmatchedOpens.length - 1];
        const absoluteMismatchLine = blockLine + open.line - 1;
        const absoluteMismatchFileLine = dataStartLine + absoluteMismatchLine - 1;
        report += ` [unclosed '{' at script line ${open.line}, data line ${absoluteMismatchLine}, file line ${absoluteMismatchFileLine}]`;
      } else if (mismatchLine) {
        const absoluteMismatchLine = blockLine + mismatchLine - 1;
        const absoluteMismatchFileLine = dataStartLine + absoluteMismatchLine - 1;
        report += ` [extra '}' likely at script line ${mismatchLine}, data line ${absoluteMismatchLine}, file line ${absoluteMismatchFileLine}]`;
      }
      console.error(report);

      const blockLines = block.content.split(/\r\n|\n|\r/);
      if (braceResult.unmatchedCloses.length > 0) {
        const close = braceResult.unmatchedCloses[0];
        console.log(`  [unmatched close brace] script line ${close.line}:`);
        const hintContextStart = Math.max(1, close.line - context);
        const hintContextEnd = Math.min(blockLines.length, close.line + context);
        for (let j = hintContextStart; j <= hintContextEnd; j += 1) {
          const marker = j === close.line ? '>' : ' ';
          const width = String(hintContextEnd).length;
          const padded = String(j).padStart(width, ' ');
          console.log(`${marker} ${padded}: ${blockLines[j - 1]}`);
        }
      } else if (braceResult.unmatchedOpens.length > 0) {
        const open = braceResult.unmatchedOpens[braceResult.unmatchedOpens.length - 1];
        console.log(`  [unclosed open brace] script line ${open.line}:`);
        const hintContextStart = Math.max(1, open.line - context);
        const hintContextEnd = Math.min(blockLines.length, open.line + context);
        for (let j = hintContextStart; j <= hintContextEnd; j += 1) {
          const marker = j === open.line ? '>' : ' ';
          const width = String(hintContextEnd).length;
          const padded = String(j).padStart(width, ' ');
          console.log(`${marker} ${padded}: ${blockLines[j - 1]}`);
        }
      } else if (mismatchLine) {
        console.log(`  [extra brace] script line ${mismatchLine} detected as the likely cause:`);
        const hintContextStart = Math.max(1, mismatchLine - context);
        const hintContextEnd = Math.min(blockLines.length, mismatchLine + context);
        for (let j = hintContextStart; j <= hintContextEnd; j += 1) {
          const marker = j === mismatchLine ? '>' : ' ';
          const width = String(hintContextEnd).length;
          const padded = String(j).padStart(width, ' ');
          console.log(`${marker} ${padded}: ${blockLines[j - 1]}`);
        }
      } else if (lineNumberInScript) {
        console.log(`  Context around error in script block ${idx + 1}:`);
        printContext(blockLines, lineNumberInScript, context);
      }
    }
  }

  if (errorCount > 0) {
    process.exit(1);
  }
}
