#!/usr/bin/env node
/**
 * wtV_img_converter.js - WebTV PNG/GIF conversion CLI
 *
 * Usage:
 *   node wtV_img_converter.js <command> [options] <input> [output]
 *
 * Commands:
 *   convert   Convert a PNG to the best WebTV format (auto: JPEG or Artemis GIF)
 *   encode    Convert a PNG with alpha to an Artemis ALP/ALF GIF
 *   decode    Convert a WebTV Artemis ALP/ALF GIF back to a PNG
 *   detect    Report whether a GIF contains an Artemis ALP/ALF block
 *
 * Options:
 *   --type <ALP|ALF>     Artemis variant to use for encoding (default: ALP)
 *   --colors <n>         Palette size for full-color quantization (default: 256)
 *   --quality <n>        JPEG quality when output is JPEG (default: 85)
 *   --output, -o <file>  Output file path (alternative to positional argument)
 *   --help, -h           Show this help
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const WTVImage = require('../includes/classes/WTVImage');

// ---------------------------------------------------------------------------
// Argument parser
// ---------------------------------------------------------------------------
function parseArgs(argv) {
    const args = { options: {}, positional: [] };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--help' || a === '-h') {
            args.options.help = true;
        } else if (a === '--type') {
            args.options.type = argv[++i];
        } else if (a === '--colors') {
            args.options.colors = parseInt(argv[++i], 10);
        } else if (a === '--quality') {
            args.options.quality = parseInt(argv[++i], 10);
        } else if (a === '--max-width') {
            args.options.maxWidth = parseInt(argv[++i], 10);
        } else if (a === '--max-height') {
            args.options.maxHeight = parseInt(argv[++i], 10);
        } else if (a === '--output' || a === '-o') {
            args.options.output = argv[++i];
        } else if (a.startsWith('--')) {
            console.error(`Unknown option: ${a}`);
            process.exit(1);
        } else {
            args.positional.push(a);
        }
    }
    return args;
}

function printHelp() {
    console.log(`
WebTV Image Converter
=======================
Usage: node wtv_img_converter.js <command> [options] <input> [output]

Commands:
  convert   Convert an image to the best WebTV format
            - No alpha       → JPEG
            - Palette PNG    → Artemis GIF (palette 1:1, no requantization)
            - Full-color RGBA → Artemis GIF (quantized)

  encode    Convert a PNG with alpha to an Artemis ALP or ALF GIF
            (throws if the PNG has no alpha channel)

  decode    Convert a WebTV Artemis ALP/ALF GIF back to a standard RGBA PNG

  detect    Report whether a file is an Artemis ALP/ALF GIF (no output file needed)

Options:
  --type <ALP|ALF>     Artemis variant for encoding/convert  (default: ALF)
  --colors <n>         Palette size for full-color quantization (default: 256)
  --quality <n>        JPEG quality when output is JPEG (default: 85)
  --max-width <n>      Maximum width to scale input before encoding
  --max-height <n>     Maximum height to scale input before encoding
  --output, -o <file>  Output file path
  --help, -h           Show this help

Examples:
  node wtV_img_converter.js convert logo.png
  node wtV_img_converter.js convert logo.png logo_wtv.gif --type ALF --colors 128
  node wtV_img_converter.js encode icon.png icon.gif --type ALP
  node wtV_img_converter.js decode artemis.gif result.png
  node wtV_img_converter.js detect artemis.gif
`.trim());
}

// ---------------------------------------------------------------------------
// Output path helpers
// ---------------------------------------------------------------------------
function resolveOutput(inputFile, suggestedExt, override) {
    if (override) return override;
    const base = path.join(
        path.dirname(inputFile),
        path.basename(inputFile, path.extname(inputFile))
    );
    return base + suggestedExt;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
async function cmdConvert(inputFile, outputFile, opts) {
    const ImageBuf = fs.readFileSync(inputFile);
    const { data, mime } = await WTVImage.ImageToWebTV(ImageBuf, {
        type:        opts.type      || 'ALP',
        colors:      opts.colors    || 256,
        jpegQuality: opts.quality   || 85,
        maxWidth:    opts.maxWidth,
        maxHeight:   opts.maxHeight
    }, {
        "quality": 80,
        "compressionLevel": 9,
        "palette": true,
        "effort": 10
    });

    const ext  = mime === 'image/gif' ? '.gif' : '.jpg';
    const dest = resolveOutput(inputFile, ext, outputFile);
    fs.writeFileSync(dest, data);
    console.log(`[convert] ${inputFile} → ${dest}  (${mime}, ${data.length} bytes)`);
}

async function cmdEncode(inputFile, outputFile, opts) {
    const ImageBuf = fs.readFileSync(inputFile);
    const gifBuf = await WTVImage.ImageToGIF(ImageBuf, {
        type:   opts.type   || 'ALF',
        colors: opts.colors || 256
    });

    const dest = resolveOutput(inputFile, '.gif', outputFile);
    fs.writeFileSync(dest, gifBuf);
    const type = WTVImage.detect(gifBuf);
    console.log(`[encode] ${inputFile} → ${dest}  (Artemis ${type}, ${gifBuf.length} bytes)`);
}

async function cmdDecode(inputFile, outputFile, opts) {
    const gifBuf = fs.readFileSync(inputFile);
    const type   = WTVImage.detect(gifBuf);
    if (!type) {
        console.error(`[decode] ${inputFile} does not contain an Artemis ALP/ALF block.`);
        process.exit(1);
    }

    const ImageBuf = await WTVImage.gifToPNG(gifBuf);
    const dest   = resolveOutput(inputFile, '.png', outputFile);
    fs.writeFileSync(dest, ImageBuf);
    console.log(`[decode] ${inputFile} (Artemis ${type}) → ${dest}  (${ImageBuf.length} bytes)`);
}

function cmdDetect(inputFile) {
    const buf  = fs.readFileSync(inputFile);
    const type = WTVImage.detect(buf);
    if (type) {
        console.log(`[detect] ${inputFile}  →  Artemis ${type}`);
    } else {
        console.log(`[detect] ${inputFile}  →  Not an Artemis ALP/ALF GIF`);
    }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
(async () => {
    const raw  = process.argv.slice(2);
    const args = parseArgs(raw);

    if (args.options.help || args.positional.length === 0) {
        printHelp();
        process.exit(0);
    }

    const command   = args.positional[0];
    const inputFile = args.positional[1];
    const outputFile = args.options.output || args.positional[2] || null;

    if (!inputFile) {
        console.error('Error: no input file specified.');
        printHelp();
        process.exit(1);
    }

    if (!fs.existsSync(inputFile)) {
        console.error(`Error: input file not found: ${inputFile}`);
        process.exit(1);
    }

    try {
        switch (command) {
            case 'convert': await cmdConvert(inputFile, outputFile, args.options); break;
            case 'encode':  await cmdEncode(inputFile, outputFile, args.options);  break;
            case 'decode':  await cmdDecode(inputFile, outputFile, args.options);  break;
            case 'detect':  cmdDetect(inputFile);                                  break;
            default:
                console.error(`Unknown command: ${command}`);
                printHelp();
                process.exit(1);
        }
    } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
})();
