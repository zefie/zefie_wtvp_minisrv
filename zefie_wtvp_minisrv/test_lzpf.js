const LZPF = require("./includes/classes/LZPF.js")
const LZPF2 = require("./includes/classes/WTVLzpf.js");
const lzpf = new LZPF();
const lzpf2 = new LZPF2();

const testString = "This is a test string to compress and decompress";

// Compress
const compressed = lzpf.compress(testString);
console.log("Original data:", testString);
console.log("Compressed data (hex)           :", compressed.toString('hex'));

// compress with LZPF2
const compressed2 = lzpf2.Compress(testString);
console.log("Compressed data with LZPF2 (hex):", compressed2.toString('hex'));


// Decompress with diagnostics
const decompressed = lzpf.expand(compressed);
console.log("Decompressed:", decompressed.toString());

// Decompress LZPF2
const decompressed2 = lzpf.expand(compressed2);
console.log("Decompressed LZPF2:", decompressed2.toString());

// Compare
console.log("Original length:", testString.length);
console.log("Decompressed length:", decompressed.length);
console.log("Match:", testString === decompressed.toString());