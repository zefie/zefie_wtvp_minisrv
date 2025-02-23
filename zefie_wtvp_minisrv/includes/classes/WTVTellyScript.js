const LZSS = require("./LZSS.js");

const WhitespaceInstruction = {
    ADD_NONE: 0,
    ADD_BEFORE: 1,
    ADD_AFTER: 2,
    ADD_BOTH: 3,
    CHECK_NEWSCOPE1: 4,
    CHECK_NEWSCOPE2: 5,
    CHECK_IF_MATH: 6,
};

const ScopeCheckStep = {
    OFF: 0,
    RB_DELIMITER_CHECK: 1,
    CB_DELIMITER_CHECK: 2,
    SINGLE_LINE_CHECK: 3,
    SINGLE_LINE_HIT: 4,
    MULTI_LINE_CHECK: 5,
};

// --- Helper Enums & Constants ---

const PACKED_TELLYSCRIPT_HEADER_SIZE = 0x24; // 36 bytes
const UNKNOWN1_VALUE = 0x0101FFFF;

const TellyScriptState = {
    UNKNOWN: -1,
    PACKED: 0,
    TOKENIZED: 1,
    RAW: 2,
};

const TellyScriptType = {
    ORIGINAL: 0,
    DIALSCRIPT: 1,
};

const reservedKeywords = new Set([
    'int', 'char', 'if', 'else', 'while', 'return', 'void', 'for', 'delay', 'flush', 'break',
    'printf', 'atoi', 'main', 'setprogressmode', 'setprogresstext', 'setworkingnumber',
    'setprogresspercentage', 'setprogressdirty', 'strcpy', 'strcat', 'setwindowsize',
    'enablemodem', 'builtin_winkdtr', 'setflowcontrol', 'setbaud', 'setdtr', 'sendstr',
    'setusername', 'setpassword', 'setpapmode', 'startppp', 'getpppresult', 'ticks',
    'getpreregnumber', 'getserialnumber', 'getsecret', 'getphonesettings', 'setstatus',
    'sprintf', 'setconnectionstats', 'setforcehook', 'waitfor', 'setnameservice',
    'getline', 'connectingwithvideoad', 'version', 'alert', 'system_getboxfeatureflags',
    'parsesystemtime', 'getdatetimelocal', 'getdayofweek', 'gethour', 'getminute',
    'getmonth', 'getyear', 'getconnectretrycount', 'dialerror', 'setfullpopnumber',
    'setconnectretrycount', 'setani', 'setlocalpopcount', 'computefcs'
]);


class WTVTellyScriptTokenizer {
    constructor(rawData) {        
        this.rawData = rawData;
        this.tokenizedData = [];
        this.index = 0;
        this.endIndex = rawData.length - 1;
        this.lineNumber = 1;
        this.setupReplacements();
    }

    setupReplacements() {
        // Map strings (or symbol sequences) to their token codes.
        this.replacements = new Map();
        this.replacements.set("!", 0x21);
        this.replacements.set("%", 0x25);
        this.replacements.set("&&", 0x26);
        this.replacements.set("(", 0x28);
        this.replacements.set(")", 0x29);
        this.replacements.set("*", 0x2A);
        this.replacements.set("+", 0x2B);
        this.replacements.set(",", 0x2C);
        this.replacements.set("-", 0x2D);
        this.replacements.set("/", 0x2F);
        this.replacements.set(";", 0x3B);
        this.replacements.set("<", 0x3C);
        this.replacements.set("=", 0x3D);
        this.replacements.set(">", 0x3E);
        this.replacements.set("&", 0x40);
        this.replacements.set("+=", 0x41);
        this.replacements.set("-=", 0x42);
        this.replacements.set("--", 0x44);
        this.replacements.set("==", 0x45);
        this.replacements.set(">=", 0x47);
        this.replacements.set("<=", 0x4C);
        this.replacements.set("*=", 0x4D);
        this.replacements.set("!=", 0x4E);
        this.replacements.set("++", 0x50);
        this.replacements.set("/=", 0x56);
        this.replacements.set("[", 0x5B);
        this.replacements.set("]", 0x5D);
        this.replacements.set("break", 0x62);
        this.replacements.set("char", 0x63);
        this.replacements.set("else", 0x65);
        this.replacements.set("for", 0x66);
        this.replacements.set("if", 0x69);
        this.replacements.set("int", 0x6C);
        this.replacements.set("return", 0x72);
        this.replacements.set("while", 0x77);
        this.replacements.set("{", 0x7B);
        this.replacements.set("||", 0x7C);
        this.replacements.set("}", 0x7D);
        // Newline tokens (both "\n" and "\r") map to 0x7F
        this.replacements.set("\n", 0x7F);
        this.replacements.set("\r", 0x7F);
    }

    getNextCharacter() {
        if (this.index <= this.endIndex) {
            return this.rawData[this.index++];
        }
        return null;
    }

    // Peek at the next character without advancing the index.
    peekCharacter() {
        if (this.index <= this.endIndex) {
            return this.rawData[this.index];
        }
        return null;
    }

    // Build a sequence from the current character while it matches the given regex pattern.
    buildCheckSequence(firstChar, pattern) {
        let sequence = "";
        const regex = new RegExp(pattern);
        if (regex.test(firstChar)) {
            sequence += firstChar;
            while (this.index <= this.endIndex) {
                let nextChar = this.getNextCharacter();
                if (regex.test(nextChar)) {
                    sequence += nextChar;
                } else {
                    this.index--; // step back if it doesn't match
                    break;
                }
            }
        }
        return sequence;
    }

    // Handle escape sequences inside strings and constants.
    consumeEscapeSequence() {
        const ch = this.getNextCharacter();
        switch (ch) {
            case "a":
                return String.fromCharCode(0x07);
            case "b":
                return String.fromCharCode(0x08);
            case "t":
                return String.fromCharCode(0x09);
            case "n":
                return String.fromCharCode(0x0A);
            case "v":
                return String.fromCharCode(0x0B);
            case "f":
                return String.fromCharCode(0x0C);
            case "r":
                return String.fromCharCode(0x0D);
            case "x":
            case "X":
                const digit1 = this.getNextCharacter();
                const digit2 = this.getNextCharacter();
                return String.fromCharCode(parseInt(digit1 + digit2, 16));
            default:
                return ch;
        }
    }

    // Tokenize a double-quoted string.
    tokenizeString() {
        // Token code 0x53 denotes a string.
        this.tokenizedData.push(0x53);
        while (this.index <= this.endIndex) {
            let ch = this.getNextCharacter();
            if (ch === '"') break;
            if (ch === "\\") {
                ch = this.consumeEscapeSequence();
            }
            this.tokenizedData.push(ch.charCodeAt(0));
        }
        // Null terminator.
        this.tokenizedData.push(0x00);
    }

    // Add a constant token. The constant is stored as token 0x43 followed by digit bytes.
    tokenizeConstantNumber(constantDigits) {
        this.tokenizedData.push(0x43);
        let pastLeadingZeros = false;
        for (let i = 0; i < constantDigits.length; i++) {
            if (pastLeadingZeros || constantDigits[i] !== 0) {
                pastLeadingZeros = true;
                // Store the digit as its ASCII code.
                this.tokenizedData.push(constantDigits[i] + 0x30);
            }
        }
        this.tokenizedData.push(0x00);
    }

    // Tokenize a constant delimited by single quotes.
    tokenizeConstant() {
        const constantDigits = [];
        // Read characters until we hit the closing constant delimiter.
        while (this.index <= this.endIndex) {
            let ch = this.getNextCharacter();
            if (ch === "'") break;
            if (ch === "\\") {
                ch = this.consumeEscapeSequence();
            }
            // In the original code the character code is adjusted.
            constantDigits.push(ch.charCodeAt(0) - 0x30);
        }
        this.tokenizeConstantNumber(constantDigits);
    }

    // Tokenize an identifier or (if it matches a numeric pattern) a constant.
    tokenizeIdentifierOrConstant(checkSequence) {
        if (/^[a-zA-Z_]/.test(checkSequence)) {
            // Token 0x49 indicates an identifier.
            this.tokenizedData.push(0x49);
            for (let i = 0; i < checkSequence.length; i++) {
                this.tokenizedData.push(checkSequence.charCodeAt(i));
            }
            this.tokenizedData.push(0x00);
        } else if (/^(0x|)?[0-9a-fA-F]+$/.test(checkSequence)) {
            // Process as a constant.
            let hexString = "";
            if (checkSequence.startsWith("0x") || checkSequence.startsWith("0X")) {
                hexString = checkSequence.substring(2);
            } else {
                hexString = parseInt(checkSequence, 10).toString(16).toUpperCase();
            }
            const constantDigits = [];
            for (let i = 0; i < hexString.length; i++) {
                constantDigits.push(parseInt(hexString[i], 16));
            }
            this.tokenizeConstantNumber(constantDigits);
        } else {
            throw new Error("Invalid constant '" + checkSequence + "' at line " + this.lineNumber);
        }
    }

    // The main tokenize method processes the raw script and produces an array of token bytes.
    tokenize() {
        while (this.index <= this.endIndex) {
            let ch = this.getNextCharacter();

            // Handle comments starting with "/*" and ending with "*/".
            if (ch === "/" && this.peekCharacter() === "*") {
                this.getNextCharacter(); // consume '*'
                while (this.index <= this.endIndex) {
                    let commentChar = this.getNextCharacter();
                    if (commentChar === "*" && this.peekCharacter() === "/") {
                        this.getNextCharacter(); // consume '/'
                        break;
                    }
                }
                continue;
            }

            // Skip whitespace (spaces and tabs).
            if (ch === " " || ch === "\t") {
                continue;
            } else if (ch === '"') {
                this.tokenizeString();
            } else if (ch === "'") {
                this.tokenizeConstant();
            } else {
                // Try to build an identifier/number sequence.
                let currentIdx = this.index;
                let checkSequence = this.buildCheckSequence(ch, "^[a-zA-Z0-9_]$");
                if (checkSequence !== "") {
                    if (this.replacements.has(checkSequence)) {
                        this.tokenizedData.push(this.replacements.get(checkSequence));
                    } else {
                        this.tokenizeIdentifierOrConstant(checkSequence);
                    }
                } else {
                    // Not alphanumeric – try symbol sequence.
                    this.index = currentIdx;
                    checkSequence = this.buildCheckSequence(ch, "^[\\-+=<>!\\|\\&]$");
                    if (this.replacements.has(checkSequence)) {
                        this.tokenizedData.push(this.replacements.get(checkSequence));
                    } else if (this.replacements.has(ch)) {
                        let replacement = this.replacements.get(ch);
                        if (replacement === 0x7F) {
                            this.lineNumber++;
                        }
                        this.tokenizedData.push(replacement);                           
                    } else {
                        throw new Error("Invalid character '" + ch + "' at line " + this.lineNumber);
                    }
                }
            }
        }
        // Append the EOF token.
        this.tokenizedData.push(0xFF);
        return this.tokenizedData;
    }
}

/**
 * TellyScriptDetokenizer converts an array of token bytes back into a formatted script string.
 */
class WTVTellyScriptDetokenizer {
    constructor(tokenizedData) {
        this.tokenizedData = tokenizedData;
        this.rawData = "";
        this.index = 0;
        this.endIndex = tokenizedData.length - 1;
        this.scriptStarted = false;
        this.scopeCheckStep = ScopeCheckStep.OFF;
        this.checkScopeCBLevel = 0;
        this.checkScopeRBLevel = 0;
        this.cBracketScopeLevel = 0;
        this.rBracketScopeLevel = 0;
        this.setupInstructions();
    }

    setupInstructions() {
        // Constants used for formatting.
        this.INDENT_WHITESPACE_COUNT = 1;
        this.INDENT_WHITESPACE_CHARACTER = "\t";
        this.SEPARATOR_WHITESPACE_CHARACTER = " ";
        this.NEWLINE_WHITESPACE_CHARACTER = "\n";
        this.USE_HEX_INTEGER_AFTER = 0x1000;

        // The mapping of token values to detokenization instructions.
        // Each instruction can specify:
        // - an optional function (instruction) to handle the token,
        // - a literal output string,
        // - whitespace handling,
        // - scope adjustments, and termination.
        this.instructions = {};
        const addInstruction = (token, instr) => {
            this.instructions[token] = instr;
        };

        addInstruction(0x21, {
            instruction: null,
            output: "",
            whitespace: WhitespaceInstruction.ADD_NONE,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x25, {
            instruction: null,
            output: "",
            whitespace: WhitespaceInstruction.ADD_BOTH,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x26, {
            instruction: null,
            output: "&&",
            whitespace: WhitespaceInstruction.ADD_BOTH,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x28, {
            instruction: null,
            output: "",
            whitespace: WhitespaceInstruction.ADD_NONE,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 1,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x29, {
            instruction: null,
            output: "",
            whitespace: WhitespaceInstruction.ADD_NONE,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: -1,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x2A, {
            instruction: null,
            output: "",
            whitespace: WhitespaceInstruction.CHECK_IF_MATH,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x2B, {
            instruction: null,
            output: "",
            whitespace: WhitespaceInstruction.ADD_BOTH,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x2C, {
            instruction: null,
            output: "",
            whitespace: WhitespaceInstruction.ADD_AFTER,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x2D, {
            instruction: null,
            output: "",
            whitespace: WhitespaceInstruction.ADD_BOTH,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x2F, {
            instruction: null,
            output: "",
            whitespace: WhitespaceInstruction.ADD_BOTH,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x3B, {
            instruction: null,
            output: "",
            whitespace: WhitespaceInstruction.ADD_NONE,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x3C, {
            instruction: null,
            output: "",
            whitespace: WhitespaceInstruction.ADD_BOTH,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x3D, {
            instruction: null,
            output: "",
            whitespace: WhitespaceInstruction.ADD_BOTH,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x3E, {
            instruction: null,
            output: "",
            whitespace: WhitespaceInstruction.ADD_BOTH,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x40, {
            instruction: null,
            output: "&",
            whitespace: WhitespaceInstruction.ADD_NONE,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x41, {
            instruction: null,
            output: "+=",
            whitespace: WhitespaceInstruction.ADD_BOTH,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x42, {
            instruction: null,
            output: "-=",
            whitespace: WhitespaceInstruction.ADD_BOTH,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x43, {
            // Constant token: call the dedicated handler.
            instruction: () => this.detokenizeConstant(),
            output: "",
            whitespace: WhitespaceInstruction.ADD_NONE,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x44, {
            instruction: null,
            output: "--",
            whitespace: WhitespaceInstruction.ADD_NONE,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x45, {
            instruction: null,
            output: "==",
            whitespace: WhitespaceInstruction.ADD_BOTH,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x47, {
            instruction: null,
            output: ">=",
            whitespace: WhitespaceInstruction.ADD_BOTH,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x49, {
            // Identifier token.
            instruction: () => this.detokenizeIdentifier(),
            output: "",
            whitespace: WhitespaceInstruction.ADD_NONE,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x4C, {
            instruction: null,
            output: "<=",
            whitespace: WhitespaceInstruction.ADD_BOTH,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x4D, {
            instruction: null,
            output: "*=",
            whitespace: WhitespaceInstruction.ADD_BOTH,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x4E, {
            instruction: null,
            output: "!=",
            whitespace: WhitespaceInstruction.ADD_BOTH,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x50, {
            instruction: null,
            output: "++",
            whitespace: WhitespaceInstruction.ADD_NONE,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x53, {
            // String token.
            instruction: () => this.detokenizeString(),
            output: "",
            whitespace: WhitespaceInstruction.ADD_NONE,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x56, {
            instruction: null,
            output: "/=",
            whitespace: WhitespaceInstruction.ADD_BOTH,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x5B, {
            instruction: null,
            output: "",
            whitespace: WhitespaceInstruction.ADD_NONE,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x5D, {
            instruction: null,
            output: "",
            whitespace: WhitespaceInstruction.ADD_NONE,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x62, {
            instruction: null,
            output: "break",
            whitespace: WhitespaceInstruction.ADD_NONE,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x63, {
            instruction: null,
            output: "char",
            whitespace: WhitespaceInstruction.ADD_AFTER,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x65, {
            instruction: null,
            output: "else",
            whitespace: WhitespaceInstruction.CHECK_NEWSCOPE1,
            enterScopeCheck: ScopeCheckStep.CB_DELIMITER_CHECK,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x66, {
            instruction: null,
            output: "for",
            whitespace: WhitespaceInstruction.ADD_AFTER,
            enterScopeCheck: ScopeCheckStep.RB_DELIMITER_CHECK,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x69, {
            instruction: null,
            output: "if",
            whitespace: WhitespaceInstruction.ADD_AFTER,
            enterScopeCheck: ScopeCheckStep.RB_DELIMITER_CHECK,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x6C, {
            instruction: null,
            output: "int",
            whitespace: WhitespaceInstruction.ADD_AFTER,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x72, {
            instruction: null,
            output: "return",
            whitespace: WhitespaceInstruction.ADD_AFTER,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x77, {
            instruction: null,
            output: "while",
            whitespace: WhitespaceInstruction.ADD_AFTER,
            enterScopeCheck: ScopeCheckStep.RB_DELIMITER_CHECK,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x7B, {
            instruction: null,
            output: "",
            whitespace: WhitespaceInstruction.CHECK_NEWSCOPE2,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 1,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x7C, {
            instruction: null,
            output: "||",
            whitespace: WhitespaceInstruction.ADD_BOTH,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x7D, {
            instruction: null,
            output: "",
            whitespace: WhitespaceInstruction.ADD_NONE,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: -1,
            moveRBracket: 0,
            scriptStartIgnore: false,
            terminate: false,
        });
        addInstruction(0x7F, {
            // Newline token.
            instruction: () => this.detokenizeNewline(),
            output: "",
            whitespace: WhitespaceInstruction.ADD_NONE,
            enterScopeCheck: ScopeCheckStep.OFF,
            moveCBracket: 0,
            moveRBracket: 0,
            scriptStartIgnore: true,
            terminate: false,
        });
        addInstruction(0xFF, {
            // EOF token.
            terminate: true,
        });
    }

    // Reads a constant token. It converts the following digit bytes into a number,
    // and if large, outputs in hexadecimal (and may include a comment with its alphanumeric form).
    detokenizeConstant() {
        let constantValue = 0;
        let alphanumericValue = "";
        let ii = 0;
        this.index++; // skip the token identifier (0x43)
        while (this.index < this.tokenizedData.length) {
            let byteVal = this.tokenizedData[this.index];
            if (byteVal === 0x00) break;
            let digit = byteVal - 0x30;
            if (digit >= 0 && digit <= 0x0F) {
                constantValue = (constantValue << 4) + digit;
            }
            if (ii >= 1 && (ii % 2) === 1 && alphanumericValue !== null) {
                let charValue = constantValue & 0xFF;
                if (charValue >= 0x30 && charValue <= 0x5A) {
                    alphanumericValue += String.fromCharCode(charValue);
                } else {
                    alphanumericValue = null;
                }
            }
            ii++;
            this.index++;
        }
        if (alphanumericValue === "") {
            alphanumericValue = null;
        }
        if (constantValue < this.USE_HEX_INTEGER_AFTER) {
            this.rawData += constantValue.toString();
        } else {
            this.rawData += "0x" + constantValue.toString(16).toUpperCase();
            if (alphanumericValue !== null) {
                this.rawData += " /* " + alphanumericValue + " */";
            }
        }
    }

    // Reads a string token until the null terminator and outputs it with proper escape replacements.
    detokenizeString() {
        let count = 0;
        let startIndex = ++this.index;
        while (this.index <= this.endIndex) {
            if (this.tokenizedData[this.index] === 0x00) break;
            count++;
            this.index++;
        }
        let chars = [];
        for (let i = startIndex; i < startIndex + count; i++) {
            chars.push(String.fromCharCode(this.tokenizedData[i]));
        }
        let str = chars.join("");
        str = str.replace(/\x07/g, "\\a")
            .replace(/\x08/g, "\\b")
            .replace(/\x09/g, "\\t")
            .replace(/\x0A/g, "\\n")
            .replace(/\x0B/g, "\\v")
            .replace(/\x0C/g, "\\f")
            .replace(/\x0D/g, "\\r");
        this.rawData += '"' + str + '"';
    }

    // Reads an identifier token (until the null terminator).
    detokenizeIdentifier() {
        this.index++; // skip the identifier token indicator (0x49)
        while (this.index < this.tokenizedData.length) {
            let byteVal = this.tokenizedData[this.index];
            if (byteVal === 0x00) break;
            this.rawData += String.fromCharCode(byteVal);
            this.index++;
        }
    }

    // Handles newline tokens: outputs a newline plus indentation based on scope.
    detokenizeNewline() {
        if (!this.scriptStarted) return;
        this.rawData += this.NEWLINE_WHITESPACE_CHARACTER;
        let whitespaceAmount = this.cBracketScopeLevel * this.INDENT_WHITESPACE_COUNT;
        if (this.index < this.endIndex && this.tokenizedData[this.index + 1] === 0x7D) {
            whitespaceAmount -= this.INDENT_WHITESPACE_COUNT;
        }
        for (let i = 0; i < whitespaceAmount; i++) {
            this.rawData += this.INDENT_WHITESPACE_CHARACTER;
        }
    }

    // The main detokenize loop reads each token and either calls its custom handler or
    // outputs the mapped literal text (adding whitespace as required).
    detokenize() {
        this.rawData = "";
        this.index = 0;
        while (this.index <= this.endIndex) {
            let token = this.tokenizedData[this.index];
            if (this.instructions.hasOwnProperty(token)) {
                let instr = this.instructions[token];
                if (instr.terminate) break;
                if (instr.instruction) {
                    instr.instruction();
                } else {
                    let output = "";
                    if (!instr.output) {
                        output += String.fromCharCode(token);
                    } else {
                        output += instr.output;
                    }
                    if (instr.whitespace === WhitespaceInstruction.ADD_BEFORE) {
                        output = this.SEPARATOR_WHITESPACE_CHARACTER + output;
                    } else if (instr.whitespace === WhitespaceInstruction.ADD_AFTER) {
                        output += this.SEPARATOR_WHITESPACE_CHARACTER;
                    } else if (instr.whitespace === WhitespaceInstruction.ADD_BOTH) {
                        output = this.SEPARATOR_WHITESPACE_CHARACTER + output + this.SEPARATOR_WHITESPACE_CHARACTER;
                    } else if (instr.whitespace === WhitespaceInstruction.CHECK_NEWSCOPE1) {
                        if (this.index >= 2 && this.tokenizedData[this.index - 1] === 0x7D)
                            output = this.SEPARATOR_WHITESPACE_CHARACTER + output + this.SEPARATOR_WHITESPACE_CHARACTER;
                        else
                            output = output + this.SEPARATOR_WHITESPACE_CHARACTER;
                    } else if (instr.whitespace === WhitespaceInstruction.CHECK_NEWSCOPE2) {
                        if (this.index >= 2 && this.tokenizedData[this.index - 1] === 0x29)
                            output = this.SEPARATOR_WHITESPACE_CHARACTER + output;
                    } else if (instr.whitespace === WhitespaceInstruction.CHECK_IF_MATH) {
                        if (this.index >= 2 && this.tokenizedData[this.index - 1] === 0x00)
                            output = " " + output + " ";
                    }

                    this.cBracketScopeLevel += instr.moveCBracket;
                    this.rBracketScopeLevel += instr.moveRBracket;

                    if (instr.enterScopeCheck !== ScopeCheckStep.OFF) {
                        this.scopeCheckStep = instr.enterScopeCheck;
                        this.checkScopeCBLevel = this.cBracketScopeLevel;
                        this.checkScopeRBLevel = this.rBracketScopeLevel;
                    }

                    this.rawData += output;
                }
                if (!instr.scriptStartIgnore) {
                    this.scriptStarted = true;
                }
            } else {
                this.rawData += token.toString();
            }
            this.index++;
        }
        return this.rawData;
    }
}


class WTVTellyScriptMinifier {
    // 1. Tokenization: Build the token array from raw text
    tokenize(input) {
        // Define token specs as pairs: [regex, tokenType]
        const tokenSpecs = [
            [/^\s+/, 'WHITESPACE'],                          // Whitespace
            [/^\/\/.*/, null],                        // Single-line comment (skip)
            [/^\/\*[\s\S]*?\*\//, null],               // Multi-line comment (skip)
            // Keywords (update with your TellyScript keywords as needed)
            [/^\b(int|char|if|else|while|return|void)\b/, 'KEYWORD'],
            // Identifiers (variable and function names)
            [/^\b[a-zA-Z_][a-zA-Z0-9_]*\b/, 'IDENTIFIER'],
            // Hexadecimal numbers (e.g., 0xe100)
            [/^0x[0-9a-fA-F]+/, 'NUMBER'],
            // Decimal numbers
            [/^\d+/, 'NUMBER'],
            // String literals (supports escaped quotes)
            [/^"([^"\\]|\\.)*"/, 'STRING'],
            [/^'([^'\\]|\\.)*'/, 'STRING'],
            // Punctuation (parentheses, braces, commas, semicolons, etc.)
            [/^[{};,\[\]\(\)]/, 'PUNCTUATION'],
            // Operators (covers common operators; adjust as needed)
            [/^(==|!=|<=|>=|[+\-*/=<>!&|%]+)/, 'OPERATOR']
        ];

        const tokens = [];
        let remaining = input;

        while (remaining.length > 0) {
            let matched = false;
            for (const [regex, tokenType] of tokenSpecs) {
                const match = regex.exec(remaining);
                if (match) {
                    matched = true;
                    const tokenValue = match[0];
                    // Only include tokens with a type (skip whitespace/comments)
                    if (tokenType) {
                        tokens.push({ type: tokenType, value: tokenValue });
                    }
                    // Slice off the matched portion of the input
                    remaining = remaining.slice(tokenValue.length);
                    break;
                }
            }
            if (!matched) {
                throw new Error("Unexpected token: " + remaining[0]);
            }
        }
        return tokens;
    }

    detokenize(tokens) {
        let output = "";
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            if (token.type === 'WHITESPACE') {
                token.value = token.value.replaceAll("\r", "\n");
                if (token.value.indexOf("\n") !== -1) output += token.value.replaceAll("\n\n", "\n");
                else output += " ";
            } else {
                output += token.value;
            }

            // Look ahead to the next token
            if (i < tokens.length - 1) {
                const nextToken = tokens[i + 1];
                // Insert a space if both tokens are of types that, if concatenated, could form a different valid token.
                if (token.type === 'OPERATOR' && token.value === '=' && nextToken.type === 'OPERATOR' && nextToken.value === '&') {
                    output += " ";
                }
                if ((token.type === 'IDENTIFIER' || token.type === 'NUMBER') &&
                    (nextToken.type === 'IDENTIFIER' || nextToken.type === 'NUMBER') ||
                    token.type === 'KEYWORD') {
                    output += " ";
                }
            }
        }
        return output;
    }

    // 2. Minification: Dynamically generate short names for variable identifiers

    // Helper: Convert a counter to a short name (0 -> "a", 1 -> "b", ... 26 -> "aa", etc.)
    generateShortName(counter) {
        let name = '';
        let n = counter;
        do {
            name = String.fromCharCode(97 + (n % 26)) + name;
            n = Math.floor(n / 26) - 1;
        } while (n >= 0);
        return name;
    }

    // Reserved keywords that should not be renamed (include any built-in function names too)

    minifyIdentifiers(tokens) {
        const mapping = {}; // Map original identifier -> short name
        let counter = 0;

        // First pass: Build mapping for each identifier that isn't a reserved keyword.
        tokens.forEach(token => {
            if (token.type === 'IDENTIFIER' && !reservedKeywords.has(token.value)) {
                if (!(token.value in mapping)) {
                    mapping[token.value] = this.generateShortName(counter++);
                }
            }
        });

        // Second pass: Replace identifier token values with their short names.
        tokens.forEach(token => {
            if (token.type === 'IDENTIFIER' && mapping[token.value]) {
                token.value = mapping[token.value];
            }
        });

        return tokens;
    }


    minify(tellyscript) {
        // Tokenize the raw text
        let tokens = this.tokenize(tellyscript.raw_data);
        // Minify identifier names
        tokens = this.minifyIdentifiers(tokens);
        return this.detokenize(tokens);
    }
}

class WTVTellyScript {

    // --- TellyScript Class ---
    /*
     * Constructs a new TellyScript object.
     * @param {Uint8Array|string} data - The TellyScript data (either packed, tokenized, or raw).
     * @param {number} dataState - One of TellyScriptState (default: PACKED).
     * @param {number} tellyscriptType - One of TellyScriptType (default: ORIGINAL).
     * @param {object} preprocessor_definitions - A dictionary of preprocessor definitions.
     * @param {number} version_minor - The minor version number (default: 1).
     */
    constructor(data, dataState = TellyScriptState.PACKED, preprocessor_definitions = {}, version_minor = 1, tellyscriptType = TellyScriptType.ORIGINAL) {
        this.tellyscript_type = tellyscriptType;
        this.packed_data = null;
        this.packed_header = null;
        this.tokenized_data = null;
        this.raw_data = null;
        this.preprocessor_definitions = preprocessor_definitions;
        this.version_minor = version_minor;

        this.process(data, dataState);
    }

    preprocess() {
        var definitions = this.preprocessor_definitions || {};
        // Split input into lines (handling CRLF and LF)
        const lines = this.raw_data.split(/\r?\n/);
        const output = [];
        // A stack to track whether the current block is active.
        // Start with "true" so that top-level lines are output.
        const stateStack = [true];

        // Process each line one by one.
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Only process directives if they are left-aligned.
            if (line.startsWith("#")) {
                if (/^#ifdef\b/.test(line)) {
                    // Get the label immediately after "#ifdef"
                    const token = line.slice(6).split(/\s/)[0];
                    const condition = !!definitions[token];
                    // The block is active only if the parent block is active and condition is true.
                    const active = stateStack[stateStack.length - 1] && condition;
                    stateStack.push(active);
                    continue; // Do not output this directive line.
                } else if (/^#ifndef\b/.test(line)) {
                    const token = line.slice(7).split(/\s/)[0];
                    const condition = !definitions[token];
                    const active = stateStack[stateStack.length - 1] && condition;
                    stateStack.push(active);
                    continue;
                } else if (/^#if\b/.test(line)) {
                    // Expect exactly "#if 1" or "#if 0" (no extra spaces allowed).
                    const token = line.slice(3).split(/\s/)[0];
                    if (token !== "1" && token !== "0") {
                        throw new Error(
                            `Invalid #if condition at line ${i + 1}: "${line}"`
                        );
                    }
                    const condition = token === "1";
                    const active = stateStack[stateStack.length - 1] && condition;
                    stateStack.push(active);
                    continue;
                } else if (/^#else\b/.test(line)) {
                    if (stateStack.length <= 1) {
                        throw new Error(`#else without matching #if at line ${i + 1}`);
                    }
                    // Flip the state of the current block while considering the parent's state.
                    const previous = stateStack.pop();
                    const newState = stateStack[stateStack.length - 1] && !previous;
                    stateStack.push(newState);
                    continue;
                } else if (/^#endif\b/.test(line)) {
                    if (stateStack.length <= 1) {
                        throw new Error(`#endif without matching #if at line ${i + 1}`);
                    }
                    stateStack.pop();
                    continue;
                } else if (/^#include\b/.test(line)) {
                    // Silently remove #include directives.
                    continue;
                }
            }
            // For non-directive lines (or lines with unrecognized directives),
            // output them only if the current block is active.
            if (stateStack[stateStack.length - 1]) {
                output.push(line);
            }
        }

        this.raw_data = output.join("\n");
    }


    minify() {
        let minifier = new WTVTellyScriptMinifier();
        this.raw_data = minifier.minify(this);
        this.raw_data = this.raw_data.replaceAll("\n\n\n", "\n");
        this.tokenize();
        this.pack();        
    }

    ipToHex(ip) {
        const parts = ip.split('.');
        if (parts.length !== 4) {
            throw new Error('Invalid IP address');
        }
        let num = 0;
        for (let i = 0; i < 4; i++) {
            const part = parseInt(parts[i], 10);
            if (part < 0 || part > 255) {
                throw new Error('Invalid IP address');
            }
            num = (num << 8) | part;
        }
        // Convert to unsigned 32-bit number before converting to hex
        return "0x" + (num >>> 0).toString(16).toUpperCase();
    }

    setTemplateVars(service_name, dialin_number, DNS1IP, DNS2IP) {
        this.raw_data = this.raw_data.replaceAll("%ServiceName%", service_name);
        this.raw_data = this.raw_data.replaceAll("%DialinNumber%", dialin_number);
        this.raw_data = this.raw_data.replaceAll("%DNSIP1%", DNS1IP);
        this.raw_data = this.raw_data.replaceAll("%DNSIP2%", DNS2IP);
        this.raw_data = this.raw_data.replaceAll("%DNS1%", this.ipToHex(DNS1IP));
        this.raw_data = this.raw_data.replaceAll("%DNS2%", this.ipToHex(DNS2IP));   
    }

    // --- Big Endian Converter Helpers ---

    toUint32(bytes, offset) {
        return (
            (bytes[offset] << 24) >>> 0 |
            (bytes[offset + 1] << 16) |
            (bytes[offset + 2] << 8) |
            (bytes[offset + 3])
        ) >>> 0;
    }

    uint32ToBytes(num) {
        return [
            (num >>> 24) & 0xff,
            (num >>> 16) & 0xff,
            (num >>> 8) & 0xff,
            num & 0xff,
        ];
    }

    // --- CRC32 Calculation ---

    crc32(data) {
        const crc32Table = [
                0x00000000, 0x77073096, 0xee0e612c, 0x990951ba, 0x076dc419, 0x706af48f,
                0xe963a535, 0x9e6495a3, 0x0edb8832, 0x79dcb8a4, 0xe0d5e91e, 0x97d2d988,
                0x09b64c2b, 0x7eb17cbd, 0xe7b82d07, 0x90bf1d91, 0x1db71064, 0x6ab020f2,
                0xf3b97148, 0x84be41de, 0x1adad47d, 0x6ddde4eb, 0xf4d4b551, 0x83d385c7,
                0x136c9856, 0x646ba8c0, 0xfd62f97a, 0x8a65c9ec, 0x14015c4f, 0x63066cd9,
                0xfa0f3d63, 0x8d080df5, 0x3b6e20c8, 0x4c69105e, 0xd56041e4, 0xa2677172,
                0x3c03e4d1, 0x4b04d447, 0xd20d85fd, 0xa50ab56b, 0x35b5a8fa, 0x42b2986c,
                0xdbbbc9d6, 0xacbcf940, 0x32d86ce3, 0x45df5c75, 0xdcd60dcf, 0xabd13d59,
                0x26d930ac, 0x51de003a, 0xc8d75180, 0xbfd06116, 0x21b4f4b5, 0x56b3c423,
                0xcfba9599, 0xb8bda50f, 0x2802b89e, 0x5f058808, 0xc60cd9b2, 0xb10be924,
                0x2f6f7c87, 0x58684c11, 0xc1611dab, 0xb6662d3d, 0x76dc4190, 0x01db7106,
                0x98d220bc, 0xefd5102a, 0x71b18589, 0x06b6b51f, 0x9fbfe4a5, 0xe8b8d433,
                0x7807c9a2, 0x0f00f934, 0x9609a88e, 0xe10e9818, 0x7f6a0dbb, 0x086d3d2d,
                0x91646c97, 0xe6635c01, 0x6b6b51f4, 0x1c6c6162, 0x856530d8, 0xf262004e,
                0x6c0695ed, 0x1b01a57b, 0x8208f4c1, 0xf50fc457, 0x65b0d9c6, 0x12b7e950,
                0x8bbeb8ea, 0xfcb9887c, 0x62dd1ddf, 0x15da2d49, 0x8cd37cf3, 0xfbd44c65,
                0x4db26158, 0x3ab551ce, 0xa3bc0074, 0xd4bb30e2, 0x4adfa541, 0x3dd895d7,
                0xa4d1c46d, 0xd3d6f4fb, 0x4369e96a, 0x346ed9fc, 0xad678846, 0xda60b8d0,
                0x44042d73, 0x33031de5, 0xaa0a4c5f, 0xdd0d7cc9, 0x5005713c, 0x270241aa,
                0xbe0b1010, 0xc90c2086, 0x5768b525, 0x206f85b3, 0xb966d409, 0xce61e49f,
                0x5edef90e, 0x29d9c998, 0xb0d09822, 0xc7d7a8b4, 0x59b33d17, 0x2eb40d81,
                0xb7bd5c3b, 0xc0ba6cad, 0xedb88320, 0x9abfb3b6, 0x03b6e20c, 0x74b1d29a,
                0xead54739, 0x9dd277af, 0x04db2615, 0x73dc1683, 0xe3630b12, 0x94643b84,
                0x0d6d6a3e, 0x7a6a5aa8, 0xe40ecf0b, 0x9309ff9d, 0x0a00ae27, 0x7d079eb1,
                0xf00f9344, 0x8708a3d2, 0x1e01f268, 0x6906c2fe, 0xf762575d, 0x806567cb,
                0x196c3671, 0x6e6b06e7, 0xfed41b76, 0x89d32be0, 0x10da7a5a, 0x67dd4acc,
                0xf9b9df6f, 0x8ebeeff9, 0x17b7be43, 0x60b08ed5, 0xd6d6a3e8, 0xa1d1937e,
                0x38d8c2c4, 0x4fdff252, 0xd1bb67f1, 0xa6bc5767, 0x3fb506dd, 0x48b2364b,
                0xd80d2bda, 0xaf0a1b4c, 0x36034af6, 0x41047a60, 0xdf60efc3, 0xa867df55,
                0x316e8eef, 0x4669be79, 0xcb61b38c, 0xbc66831a, 0x256fd2a0, 0x5268e236,
                0xcc0c7795, 0xbb0b4703, 0x220216b9, 0x5505262f, 0xc5ba3bbe, 0xb2bd0b28,
                0x2bb45a92, 0x5cb36a04, 0xc2d7ffa7, 0xb5d0cf31, 0x2cd99e8b, 0x5bdeae1d,
                0x9b64c2b0, 0xec63f226, 0x756aa39c, 0x026d930a, 0x9c0906a9, 0xeb0e363f,
                0x72076785, 0x05005713, 0x95bf4a82, 0xe2b87a14, 0x7bb12bae, 0x0cb61b38,
                0x92d28e9b, 0xe5d5be0d, 0x7cdcefb7, 0x0bdbdf21, 0x86d3d2d4, 0xf1d4e242,
                0x68ddb3f8, 0x1fda836e, 0x81be16cd, 0xf6b9265b, 0x6fb077e1, 0x18b74777,
                0x88085ae6, 0xff0f6a70, 0x66063bca, 0x11010b5c, 0x8f659eff, 0xf862ae69,
                0x616bffd3, 0x166ccf45, 0xa00ae278, 0xd70dd2ee, 0x4e048354, 0x3903b3c2,
                0xa7672661, 0xd06016f7, 0x4969474d, 0x3e6e77db, 0xaed16a4a, 0xd9d65adc,
                0x40df0b66, 0x37d83bf0, 0xa9bcae53, 0xdebb9ec5, 0x47b2cf7f, 0x30b5ffe9,
                0xbdbdf21c, 0xcabac28a, 0x53b39330, 0x24b4a3a6, 0xbad03605, 0xcdd70693,
                0x54de5729, 0x23d967bf, 0xb3667a2e, 0xc4614ab8, 0x5d681b02, 0x2a6f2b94,
                0xb40bbe37, 0xc30c8ea1, 0x5a05df1b, 0x2d02ef8d
        ];
        let crc = 0xffffffff;
        for (let i = 0; i < data.length; i++) {
            crc = crc32Table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
        }
        return crc >>> 0;
    }

    // --- Auto-Detection ---
    autoDetectState(data) {
        if (data instanceof Uint8Array) {
            if (data.length > 4) {
                const magic = this.toUint32(data, 0);
                if (magic === 0x414e4459) { // "ANDY"
                    this.tellyscript_type = TellyScriptType.ORIGINAL;
                    return TellyScriptState.PACKED;
                } else if (magic === 0x564b4154) { // "VKAT"
                    this.tellyscript_type = TellyScriptType.DIALSCRIPT;
                    return TellyScriptState.PACKED;
                } else {
                    let hasNull = false, hasEOF = false;
                    for (let byte of data) {
                        if (byte === 0x00) hasNull = true;
                        if (byte === 0xff) hasEOF = true;
                    }
                    if (hasNull && hasEOF) return TellyScriptState.TOKENIZED;
                    else return TellyScriptState.RAW;
                }
            } else {
                return TellyScriptState.UNKNOWN;
            }
        } else if (typeof data === "string") {
            return TellyScriptState.RAW;
        }
        return TellyScriptState.UNKNOWN;
    }

    // --- Process Input ---
    process(data, dataState) {
        if (dataState === TellyScriptState.UNKNOWN) {
            dataState = this.autoDetectState(data);
        }

        if (data instanceof Uint8Array) {
            if (dataState === TellyScriptState.PACKED) {
                this.packed_data = data;
                this.unpack();
                this.detokenize();
            } else if (dataState === TellyScriptState.TOKENIZED) {
                this.tokenized_data = data;
                this.pack();
                this.detokenize();
            } else if (dataState === TellyScriptState.RAW) {
                // For RAW byte data, convert to string (assuming UTF-8)                
                this.process(new TextDecoder().decode(data), dataState);
            }
        } else if (typeof data === "string") {
            if (dataState === TellyScriptState.RAW) {
                this.raw_data = data;
                this.preprocess()
                this.tokenize();
                this.pack();
            } else if (dataState === TellyScriptState.PACKED || dataState === TellyScriptState.TOKENIZED) {
                // For string input with a PACKED/TOKENIZED flag, convert to bytes using UTF-8.
                const bytes = new TextEncoder().encode(data);
                this.process(bytes, dataState);
            }
        }
    }

    // --- Unpacking ---
    unpack() {
        // Read header fields from the first 36 bytes.
        const headerBytes = this.packed_data.slice(0, PACKED_TELLYSCRIPT_HEADER_SIZE);
        this.packed_header = {
            magic: String.fromCharCode(...headerBytes.slice(0, 4)),
            version_major: this.toUint32(headerBytes, 4),
            version_minor: this.toUint32(headerBytes, 8),
            script_id: this.toUint32(headerBytes, 12),
            script_mod: this.toUint32(headerBytes, 16),
            compressed_data_length: this.toUint32(headerBytes, 20),
            decompressed_data_length: this.toUint32(headerBytes, 24),
            decompressed_checksum: this.toUint32(headerBytes, 28),
            unknown1: this.toUint32(headerBytes, 32),
        };

        // Extract compressed data from the remainder of the packed_data.
        const compressed_data = this.packed_data.slice(PACKED_TELLYSCRIPT_HEADER_SIZE);
        // Decompress using LZSS
        const comp = new LZSS();
        this.tokenized_data = comp.expand(compressed_data, this.packed_header.decompressed_data_length);
        // Calculate and store the checksum.
        this.packed_header.actual_decompressed_checksum = this.crc32(this.tokenized_data);        
        return this.tokenized_data;
    }

    // --- Detokenization ---
    detokenize() {
        // Uses the previously defined TellyScriptDetokenizer class.
        this.raw_data = new WTVTellyScriptDetokenizer(this.tokenized_data).detokenize();
        return this.raw_data;
    }

    // --- Tokenization ---
    tokenize() {
        // Uses the previously defined TellyScriptTokenizer class.
        this.tokenized_data = new WTVTellyScriptTokenizer(this.raw_data).tokenize();
        return this.tokenized_data;
    }

    // --- Packing ---
    pack() {
        // Compress tokenized data using LZSS.
        const comp = new LZSS();
        const compressed_data = comp.compress(this.tokenized_data);
        const crc = this.crc32(this.tokenized_data);

        // Generate a random script_id.
        const r1 = Math.floor(Math.random() * (1 << 16));
        const r2 = Math.floor(Math.random() * (1 << 16));
        let script_id = (r1 << 16) | r2;

        let end_value = 0x1b39;
        if ((script_id & 0x80000000) !== 0) {
            end_value = 0xdd67;
        }
        script_id = (script_id & 0x80000000) | (Math.floor((script_id & 0x7fffffff) / 10000) * 10000 + end_value);

        this.packed_header = {
            magic: (this.tellyscript_type === TellyScriptType.DIALSCRIPT) ? "VKAT" : "ANDY",
            version_major: (this.packed_header && this.packed_header.version_major) ? this.packed_header.version_major : 1,
            version_minor: (this.packed_header && this.packed_header.version_minor) ? this.packed_header.version_minor : this.version_minor,
            script_id: script_id,
            script_mod: Math.floor(Date.now() / 1000),
            compressed_data_length: compressed_data.length,
            decompressed_data_length: this.tokenized_data.length,
            decompressed_checksum: crc,
            actual_decompressed_checksum: crc,
            unknown1: UNKNOWN1_VALUE,
        };

        const headerBytes = this.serializePackedHeader(this.packed_header);
        const totalLength = PACKED_TELLYSCRIPT_HEADER_SIZE + compressed_data.length;
        this.packed_data = new Uint8Array(totalLength);
        this.packed_data.set(headerBytes, 0);
        this.packed_data.set(compressed_data, PACKED_TELLYSCRIPT_HEADER_SIZE);

        return this.packed_data;
    }

    // --- Serialize Header ---
    serializePackedHeader(header) {
        const buffer = new Uint8Array(PACKED_TELLYSCRIPT_HEADER_SIZE);
        // magic: 4 characters
        for (let i = 0; i < 4; i++) {
            buffer[i] = header.magic.charCodeAt(i);
        }
        // Next fields: each 4 bytes in Big Endian order.
        buffer.set(this.uint32ToBytes(header.version_major), 4);
        buffer.set(this.uint32ToBytes(header.version_minor), 8);
        buffer.set(this.uint32ToBytes(header.script_id), 12);
        buffer.set(this.uint32ToBytes(header.script_mod), 16);
        buffer.set(this.uint32ToBytes(header.compressed_data_length), 20);
        buffer.set(this.uint32ToBytes(header.decompressed_data_length), 24);
        buffer.set(this.uint32ToBytes(header.decompressed_checksum), 28);
        buffer.set(this.uint32ToBytes(header.unknown1), 32);

        return buffer;
    }
}

module.exports = WTVTellyScript;