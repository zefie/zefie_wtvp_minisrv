const LZPF = require("./includes/classes/WTVLzpf.js")
const lzpf = new LZPF();

const testString = "This is a test string to compress and decompress";

// Compress
const compressed = lzpf.Compress(testString);
console.log("Original data:", testString);
console.log("Compressed data (hex):", compressed.toString('hex'));

// Decompress with diagnostics
const decompressed = lzpf.Decompress(compressed);
console.log("Decompressed:", decompressed.toString());

// Compare
console.log("Original length:", testString.length);
console.log("Decompressed length:", decompressed.length);
console.log("Match:", testString === decompressed.toString());