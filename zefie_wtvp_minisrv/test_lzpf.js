const WTVLzpf = require("./includes/classes/WTVLzpf.js")
const lzpf = new WTVLzpf();

// Test with a simple string
const testString = "This is a test string to compress and decompress";
const compressed = lzpf.Compress(testString);
const decompressed = lzpf.Decompress(compressed);

console.log("Original:", testString);
console.log("Decompressed:", decompressed.toString());
console.log("Match:", testString === decompressed.toString());

// Test with HTML-like data (which LZPF was optimized for)
const htmlString = "<html><body><h1>Test</h1><p>This is a paragraph.</p></body></html>";
const compressedHtml = lzpf.Compress(htmlString);
const decompressedHtml = lzpf.Decompress(compressedHtml);

console.log("HTML match:", htmlString === decompressedHtml.toString());
