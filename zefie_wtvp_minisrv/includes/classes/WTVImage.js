/**
 * WTVImage - WebTV PNG/Image Conversion Utility
 *
 * WebTV cannot display PNG natively.  This class converts PNGs (and other
 * sharp-compatible sources) to the appropriate WebTV format:
 *
 *   • No alpha channel  → JPEG  (WebTV supports JPEG natively)
 *   • Palette/indexed PNG (color type 3) with alpha → Artemis ALF GIF 1:1
 *     (palette and per-palette alpha values preserved exactly from PLTE/tRNS)
 *   • Full-color RGBA PNG → quantized Artemis ALF GIF
 *
 * Artemis ALP/ALF format:
 *   WebTV's "Artemis" format embeds a GIF Application Extension block with the
 *   identifier "Artemis ALP" or "Artemis ALF" containing a per-palette-entry
 *   alpha lookup table.  This breaks the GIF89a standard but was supported by
 *   WebTV's own rendering engine.
 *
 *   ALP – the alpha table is prefixed with a black (0,0,0) phantom entry so
 *          that palette index 0 is always fully-transparent black.
 *   ALF – the alpha table is suffixed with a black (0,0,0) phantom entry
 *          (last palette slot is fully-transparent black).
 *
 * Decoder reverse-engineered from:
 *   https://gist.github.com/PajamaFrix/399c0785c5bb3b1d80757e84a0c1d6ab
 */

const sharp = require('sharp');
const zlib  = require('zlib');

// ---------------------------------------------------------------------------
// Class wrapper
// ---------------------------------------------------------------------------

class WTVImage {
    // ---------------------------------------------------------------------------
    // Low-level GIF 89a helpers
    // ---------------------------------------------------------------------------

    /** Parse the raw GIF logical screen descriptor and return key fields. */
    parseGIFHeader(buf) {
        if (buf.length < 13) throw new Error('Buffer too short to be a GIF');
        const sig = buf.slice(0, 6).toString('ascii');
        if (sig !== 'GIF87a' && sig !== 'GIF89a') throw new Error('Not a GIF file');
        const width  = buf.readUInt16LE(6);
        const height = buf.readUInt16LE(8);
        const packed = buf[10];
        const hasGCT    = (packed & 0x80) !== 0;
        const gctSize   = hasGCT ? (1 << ((packed & 0x07) + 1)) : 0; // number of entries
        const bgIndex   = buf[11];
        const pixelAR   = buf[12];
        const gctOffset = 13;
        const gctBytes  = gctSize * 3;
        return { width, height, packed, hasGCT, gctSize, gctOffset, gctBytes, bgIndex, pixelAR };
    }

    /**
     * Write a GIF89a header + logical screen descriptor.
     * @param {number} width
     * @param {number} height
     * @param {number} gctEntries  - number of palette entries (must be power of 2, 2–256)
     * @param {number} bgIndex
     * @returns {Buffer} 13-byte header
     */
    buildGIFHeader(width, height, gctEntries, bgIndex = 0) {
        const sizeField = Math.log2(gctEntries) - 1; // 0-7
        const packed = 0x80 | 0x70 | (sizeField & 0x07); // GCT present, color resolution=8 bits, no sort, gctSize
        const buf = Buffer.alloc(13);
        buf.write('GIF89a', 0, 'ascii');
        buf.writeUInt16LE(width,  6);
        buf.writeUInt16LE(height, 8);
        buf[10] = packed;
        buf[11] = bgIndex;
        buf[12] = 0x00; // pixel aspect ratio
        return buf;
    }

    /**
     * Build a GIF89a Graphics Control Extension block.
     * Reference WebTV Artemis GIFs always have a GCE with transparentFlag=1
     * and transparentColorIndex=0, used by the renderer for hard transparency.
     * The Artemis alpha table provides additional partial alpha for the rest.
     * @param {number} transparentIdx - palette index treated as fully transparent
     * @param {boolean} hasTransparent - whether to set the transparent flag
     * @returns {Buffer} 8-byte GCE block
     */
    buildGCE(transparentIdx = 0, hasTransparent = true) {
        const buf = Buffer.alloc(8);
        buf[0] = 0x21; // extension introducer
        buf[1] = 0xF9; // graphic control label
        buf[2] = 0x04; // block size
        buf[3] = hasTransparent ? 0x01 : 0x00; // packed: transparent color flag
        buf[4] = 0x00; buf[5] = 0x00; // delay time
        buf[6] = transparentIdx & 0xFF;
        buf[7] = 0x00; // block terminator
        return buf;
    }

    /**
     * Build a GIF Application Extension block.
     * @param {string} appName  - exactly 8 chars
     * @param {string} authCode - exactly 3 chars
     * @param {Buffer} data
     * @returns {Buffer}
     */
    buildAppExtension(appName, authCode, data) {
        if (appName.length !== 8)  throw new Error('GIF app name must be 8 chars');
        if (authCode.length !== 3) throw new Error('GIF auth code must be 3 chars');

        // Split data into sub-blocks (max 255 bytes each)
        const subBlocks = [];
        let offset = 0;
        while (offset < data.length) {
            const len = Math.min(255, data.length - offset);
            subBlocks.push(Buffer.from([len]));
            subBlocks.push(data.slice(offset, offset + len));
            offset += len;
        }
        subBlocks.push(Buffer.from([0x00])); // block terminator

        return Buffer.concat([
            Buffer.from([0x21, 0xFF, 0x0B]),          // ext introducer, app label, block size
            Buffer.from(appName + authCode, 'ascii'),  // 11-byte app identifier
            ...subBlocks
        ]);
    }

    /**
     * Parse all GIF Application Extension blocks from a buffer.
     * Returns an array of { appName, authCode, dataOffset, dataLength, blockStart, blockEnd }
     */
    findAppExtensions(buf) {
        const results = [];
        let i = 13; // skip header + LSD
        const hdr = this.parseGIFHeader(buf);
        i += hdr.gctBytes; // skip global color table

        while (i < buf.length - 1) {
            if (buf[i] === 0x3B) break; // GIF trailer
            if (buf[i] === 0x2C) break; // image descriptor – stop scanning extensions

            if (buf[i] === 0x21) {
                const label = buf[i + 1];
                if (label === 0xFF) {
                    // Application extension
                    const blockSize = buf[i + 2]; // should be 11
                    if (blockSize === 0x0B && i + 2 + blockSize < buf.length) {
                        const appId = buf.slice(i + 3, i + 14).toString('ascii');
                        const appName = appId.slice(0, 8);
                        const authCode = appId.slice(8, 11);
                        const blockStart = i;
                        // Collect sub-block data
                        const dataChunks = [];
                        let j = i + 14;
                        while (j < buf.length && buf[j] !== 0x00) {
                            const subLen = buf[j];
                            if (subLen === 0) break;
                            dataChunks.push(buf.slice(j + 1, j + 1 + subLen));
                            j += 1 + subLen;
                        }
                        const blockEnd = j + 1; // include terminator
                        results.push({
                            appName,
                            authCode,
                            data: Buffer.concat(dataChunks),
                            blockStart,
                            blockEnd
                        });
                        i = blockEnd;
                        continue;
                    }
                } else {
                    // Other extension – skip sub-blocks
                    let j = i + 2;
                    while (j < buf.length) {
                        const subLen = buf[j];
                        j++;
                        if (subLen === 0) break;
                        j += subLen;
                    }
                    i = j;
                    continue;
                }
            }
            i++;
        }
        return results;
    }

    // ---------------------------------------------------------------------------
    // LZW encoder / decoder (minimal, for GIF image data blocks)
    // ---------------------------------------------------------------------------

    /**
     * Decode LZW-compressed GIF image data into an array of palette indices.
     * @param {Buffer} data  - raw sub-block data (already concatenated)
     * @param {number} minCodeSize
     * @param {number} pixelCount
     * @returns {Uint8Array}
     */
    lzwDecode(data, minCodeSize, pixelCount) {
        const clearCode = 1 << minCodeSize;
        const eodCode   = clearCode + 1;
        let codeSize    = minCodeSize + 1;
        let codeMask    = (1 << codeSize) - 1;

        // Build initial code table
        const initTable = () => {
            const t = [];
            for (let i = 0; i < clearCode; i++) t.push([i]);
            t.push(null); // clear
            t.push(null); // eod
            return t;
        };

        let table = initTable();
        let nextCode = eodCode + 1;

        const output = new Uint8Array(pixelCount);
        let outIdx = 0;

        let bitBuf = 0;
        let bitCount = 0;
        let byteIdx = 0;

        const readCode = () => {
            while (bitCount < codeSize) {
                if (byteIdx >= data.length) return eodCode;
                bitBuf |= data[byteIdx++] << bitCount;
                bitCount += 8;
            }
            const code = bitBuf & codeMask;
            bitBuf >>= codeSize;
            bitCount -= codeSize;
            return code;
        };

        let prevEntry = null;

        let code = readCode();
        while (code !== eodCode) {
            if (code === clearCode) {
                table = initTable();
                nextCode = eodCode + 1;
                codeSize = minCodeSize + 1;
                codeMask = (1 << codeSize) - 1;
                prevEntry = null;
                code = readCode();
                if (code === eodCode) break;
                const entry = table[code];
                for (const v of entry) output[outIdx++] = v;
                prevEntry = entry;
            } else {
                let entry;
                if (code < table.length && table[code] !== null) {
                    entry = table[code];
                } else if (code === nextCode) {
                    entry = prevEntry.concat(prevEntry[0]);
                } else {
                    break; // corrupt
                }
                for (const v of entry) output[outIdx++] = v;
                if (prevEntry !== null && nextCode < 4096) {
                    table[nextCode++] = prevEntry.concat(entry[0]);
                    if (nextCode > codeMask && codeSize < 12) {
                        codeSize++;
                        codeMask = (1 << codeSize) - 1;
                    }
                }
                prevEntry = entry;
            }
            code = readCode();
        }
        return output;
    }

    /**
     * Encode an array of palette indices using GIF LZW.
     * @param {Uint8Array} indices
     * @param {number} minCodeSize
     * @returns {Buffer}  raw LZW data (not yet wrapped in sub-blocks)
     */
    lzwEncode(indices, minCodeSize) {
        const clearCode = 1 << minCodeSize;
        const eodCode   = clearCode + 1;

        const initTable = () => {
            const t = new Map();
            for (let i = 0; i < clearCode; i++) t.set(String(i), i);
            return t;
        };

        let table = initTable();
        let nextCode = eodCode + 1;
        let codeSize = minCodeSize + 1;

        const output = [];
        let bitBuf = 0;
        let bitCount = 0;

        const emitCode = (code) => {
            bitBuf |= code << bitCount;
            bitCount += codeSize;
            while (bitCount >= 8) {
                output.push(bitBuf & 0xFF);
                bitBuf >>= 8;
                bitCount -= 8;
            }
        };

        emitCode(clearCode);

        let buffer = String(indices[0]);
        for (let i = 1; i < indices.length; i++) {
            const next = buffer + ',' + indices[i];
            if (table.has(next)) {
                buffer = next;
            } else {
                emitCode(table.get(buffer));
                if (nextCode < 4096) {
                    table.set(next, nextCode++);
                    // GIF LZW off-by-one: decoder lags by one dict entry, so the
                    // encoder must bump codeSize when nextCode > (1 << codeSize),
                    // i.e., one iteration LATER than naive `>=` would suggest.
                    if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
                } else {
                    emitCode(clearCode);
                    table = initTable();
                    nextCode = eodCode + 1;
                    codeSize = minCodeSize + 1;
                }
                buffer = String(indices[i]);
            }
        }
        emitCode(table.get(buffer));
        emitCode(eodCode);

        if (bitCount > 0) output.push(bitBuf & 0xFF);
        return Buffer.from(output);
    }

    /** Wrap raw data into GIF sub-blocks (255-byte max each). */
    wrapSubBlocks(data) {
        const chunks = [];
        let offset = 0;
        while (offset < data.length) {
            const len = Math.min(255, data.length - offset);
            chunks.push(Buffer.from([len]));
            chunks.push(data.slice(offset, offset + len));
            offset += len;
        }
        chunks.push(Buffer.from([0x00])); // block terminator
        return Buffer.concat(chunks);
    }

    /** Read and concatenate GIF sub-block data starting at offset, return { data, endOffset }. */
    readSubBlocks(buf, offset) {
        const chunks = [];
        while (offset < buf.length) {
            const len = buf[offset++];
            if (len === 0) break;
            chunks.push(buf.slice(offset, offset + len));
            offset += len;
        }
        return { data: Buffer.concat(chunks), endOffset: offset };
    }

    /**
     * Build the Artemis alpha lookup table payload for ALP/ALF.
     *
     * ALP stores its alpha table with a phantom transparent palette entry
     * at index 0, so the payload omits that slot and encodes only the
     * remaining indices.
     * ALF stores its alpha table directly and may be left full-length.
     */
    buildArtemisAlphaTable(type, alphaTable) {
        if (type !== 'ALP') return Buffer.from(alphaTable);

        // Drop the phantom transparent index 0.
        // ALP output should preserve the full remaining alpha table so WebTV
        // does not default missing ALP entries to transparent.
        return Buffer.from(alphaTable.slice(1));
    }

    isSimplePaletteTransparency(alphaTable) {
        let transparentIndex = -1;
        for (let i = 0; i < alphaTable.length; i++) {
            const a = alphaTable[i];
            if (a !== 0 && a !== 0xFF) return false;
            if (a === 0) {
                if (transparentIndex !== -1) return false;
                transparentIndex = i;
            }
        }
        return transparentIndex >= 0;
    }

    encodePalettePNGAsStandardGIF(pngInfo) {
        const { palette, indices, width, height, colors, alphaTable } = pngInfo;
        const transparentIdx = alphaTable.findIndex((a) => a === 0);
        if (transparentIdx < 0) throw new Error('No transparent palette entry found');

        const finalIndices = Buffer.from(indices);
        const finalPalette = Buffer.from(palette);
        const minCodeSize = Math.max(2, Math.ceil(Math.log2(colors)));
        const lzwEncoded  = this.lzwEncode(finalIndices, minCodeSize);
        const lzwBlocks   = this.wrapSubBlocks(lzwEncoded);

        const imgDesc = Buffer.alloc(10);
        imgDesc[0] = 0x2C;
        imgDesc.writeUInt16LE(0, 1);
        imgDesc.writeUInt16LE(0, 3);
        imgDesc.writeUInt16LE(width,  5);
        imgDesc.writeUInt16LE(height, 7);
        imgDesc[9] = 0x00;

        const gceBlock = this.buildGCE(transparentIdx, true);
        const gifHeader = this.buildGIFHeader(width, height, colors, 0);

        return Buffer.concat([
            gifHeader,
            finalPalette,
            gceBlock,
            imgDesc,
            Buffer.from([minCodeSize]),
            lzwBlocks,
            Buffer.from([0x3B])
        ]);
    }

    // ---------------------------------------------------------------------------
    // Artemis alpha extension codec
    // ---------------------------------------------------------------------------

    /**
     * Detect whether a GIF buffer contains an Artemis ALP or ALF block.
     * @param {Buffer} gifBuf
     * @returns {'ALP'|'ALF'|null}
     */
    detectArtemisType(gifBuf) {
        if (gifBuf.indexOf(Buffer.from('Artemis ALP', 'ascii')) !== -1) return 'ALP';
        if (gifBuf.indexOf(Buffer.from('Artemis ALF', 'ascii')) !== -1) return 'ALF';
        return null;
    }

    /**
     * Decode a WebTV Artemis ALP/ALF GIF and return an RGBA Buffer (raw pixel data)
     * along with metadata.
     *
     * The decoder replicates the logic of artemis_alpha_splitter.py:
     *   1. Locate the Artemis identifier and read the alpha lookup table.
     *   2. Reconstruct a secondary GIF where the alpha table forms the grayscale palette.
     *   3. Combine the original GIF's RGB pixels with the alpha channel derived from
     *      the reconstructed GIF.
     *
     * @param {Buffer} gifBuf - raw GIF file contents
     * @returns {Promise<{ rgba: Buffer, width: number, height: number, type: string }>}
     */
    async decodeArtemisGIF(gifBuf) {
        const appExtensions = this.findAppExtensions(gifBuf);
        const artemisExt = appExtensions.find((ext) => ext.appName === 'Artemis ' && (ext.authCode === 'ALP' || ext.authCode === 'ALF'));
        if (!artemisExt) throw new Error('GIF does not contain an Artemis ALP/ALF block');

        const type = artemisExt.authCode;
        const alphaTable = artemisExt.data;

        const hdr = this.parseGIFHeader(gifBuf);

        // Find first image descriptor and decode indices for alpha lookup
        let scanPos = 13 + hdr.gctBytes;
        while (scanPos < gifBuf.length) {
            const b = gifBuf[scanPos];
            if (b === 0x2C) break; // image descriptor
            if (b === 0x3B) throw new Error('No image descriptor found in GIF');
            if (b === 0x21) {
                scanPos += 2;
                const label = gifBuf[scanPos - 1];
                if (label === 0xF9) {
                    const gceBlockSize = gifBuf[scanPos];
                    scanPos += 1 + gceBlockSize + 1;
                } else if (label === 0xFF) {
                    const appBlockSize = gifBuf[scanPos];
                    scanPos += 1 + appBlockSize;
                    while (scanPos < gifBuf.length && gifBuf[scanPos] !== 0) {
                        scanPos += gifBuf[scanPos] + 1;
                    }
                    scanPos++;
                } else {
                    while (scanPos < gifBuf.length && gifBuf[scanPos] !== 0) {
                        scanPos += gifBuf[scanPos] + 1;
                    }
                    scanPos++;
                }
                continue;
            }
            scanPos++;
        }

        if (scanPos >= gifBuf.length) throw new Error('Could not find image descriptor');

        const imgDescStart  = scanPos;
        const imgDescPacked = gifBuf[imgDescStart + 9];
        const hasLCT        = (imgDescPacked & 0x80) !== 0;
        const lctSize       = hasLCT ? (1 << ((imgDescPacked & 0x07) + 1)) : 0;
        const lzwStart      = imgDescStart + 10 + lctSize * 3;
        const minCodeSize   = gifBuf[lzwStart];

        const width  = hdr.width;
        const height = hdr.height;
        const pixelCount = width * height;

        const { data: rawLZWData } = this.readSubBlocks(gifBuf, lzwStart + 1);
        const indices = this.lzwDecode(rawLZWData, minCodeSize, pixelCount);

        const origImg = await sharp(gifBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const origData = origImg.data;

        if (origData.length !== pixelCount * 4) {
            throw new Error('Unexpected original image buffer size');
        }

        const rgba = Buffer.from(origData);
        for (let i = 0; i < pixelCount; i++) {
            const idx = indices[i];
            if (type === 'ALP') {
                rgba[i * 4 + 3] = (idx === 0) ? 0x00 : ((idx - 1 < alphaTable.length) ? alphaTable[idx - 1] : 0xFF);
            } else {
                rgba[i * 4 + 3] = (idx < alphaTable.length) ? alphaTable[idx] : 0xFF;
            }
        }

        return { rgba, width, height, type };
    }

    /**
     * Quantize an RGBA image into a GIF palette and extract the real palette
     * and alpha table using gifski-style heuristics.
     *
     * This function uses sharp to produce a color-indexed GIF, then rebuilds
     * the true RGB palette and per-index alpha values from the original pixels.
     * It is intentionally dependency-light and avoids requiring native imagequant
     * bindings or experimental Node flags.
     */
    async quantizeArtemisRGBA(rgbaData, width, height, opts) {
        const pixelCount = width * height;

        // Use sharp's PNG palette mode (libimagequant) instead of its GIF
        // encoder.  GIF only supports 1-bit alpha so its quantizer collapses
        // partial-alpha pixels to fully-opaque or fully-transparent before
        // clustering, destroying the per-pixel alpha we need to reconstruct.
        // libimagequant under the PNG path clusters in true 4D RGBA space
        // and gives us per-pixel palette indices we can hand to our own
        // alpha-histogram pass.
        const pngOpts = {
            palette: true,
            colors: Math.max(2, Math.min(256, opts.colors || 256)),
            // Carry through dither / effort if the caller specified them.
            dither: (opts.imgopts && typeof opts.imgopts.dither === 'number') ? opts.imgopts.dither : 1.0,
            effort: (opts.imgopts && typeof opts.imgopts.effort === 'number') ? opts.imgopts.effort : 7,
            compressionLevel: 0,
        };

        const quantizedPNGBuf = await sharp(rgbaData, { raw: { width, height, channels: 4 } })
            .png(pngOpts)
            .toBuffer();

        const { palette: rawPalette, indices, colors } = this.extractPalettePNG(quantizedPNGBuf);

        const rSums = new Float64Array(colors);
        const gSums = new Float64Array(colors);
        const bSums = new Float64Array(colors);
        const wSums = new Float64Array(colors);
        const alphaHists = Array.from({ length: colors }, () => new Uint32Array(256));
        const counts = new Uint32Array(colors);

        for (let i = 0; i < pixelCount; i++) {
            const idx = indices[i];
            if (idx >= colors) continue;
            const p = i * 4;
            const a = rgbaData[p + 3];
            const w = a / 255;
            rSums[idx] += rgbaData[p]     * w;
            gSums[idx] += rgbaData[p + 1] * w;
            bSums[idx] += rgbaData[p + 2] * w;
            wSums[idx] += w;
            alphaHists[idx][a] += 1;
            counts[idx]++;
        }

        const realPalette = Buffer.alloc(colors * 3, 0);
        const alphaTable = Buffer.alloc(colors, 0xFF);
        for (let i = 0; i < colors; i++) {
            if (counts[i] === 0) continue;
            if (wSums[i] > 0) {
                realPalette[i * 3]     = Math.round(rSums[i] / wSums[i]);
                realPalette[i * 3 + 1] = Math.round(gSums[i] / wSums[i]);
                realPalette[i * 3 + 2] = Math.round(bSums[i] / wSums[i]);
            }

            const hist = alphaHists[i];
            const total = counts[i];

            let modeAlpha = 0;
            let modeCount = -1;
            for (let a = 0; a <= 255; a++) {
                const c = hist[a];
                if (c > modeCount || (c === modeCount && a === 255)) {
                    modeCount = c;
                    modeAlpha = a;
                }
            }

            let opaqueCount = 0;
            for (let a = 240; a <= 255; a++) opaqueCount += hist[a];
            if (total > 0 && (opaqueCount / total) >= 0.50) {
                alphaTable[i] = 255;
                continue;
            }

            if (total > 0 && (hist[0] / total) >= 0.50) {
                alphaTable[i] = 0;
                continue;
            }

            let chosen = modeAlpha;
            if (chosen >= 252) chosen = 255;
            else chosen = chosen & 0xF8;
            alphaTable[i] = chosen;
        }

        let bestZeroIdx = -1;
        let bestZeroCount = 0;
        for (let i = 0; i < colors; i++) {
            if (alphaTable[i] === 0 && counts[i] > bestZeroCount) {
                bestZeroIdx = i;
                bestZeroCount = counts[i];
            }
        }

        return { colors, indices, realPalette, alphaTable, bestZeroIdx };
    }

    /**
     * Encode an RGBA image (raw Buffer or sharp-compatible input) into a WebTV
     * Artemis ALF GIF.
     *
     * Steps:
     *   1. Quantize the image to a ≤256-color palette, extracting per-palette-entry
     *      average alpha.
     *   2. Build a GIF89a with the Artemis ALF application extension block.
     *   3. The alpha lookup table is stored as the app extension payload.
     *
     * @param {Buffer|string} input - raw RGBA buffer, file path, or any sharp-compatible source
     * @param {object}  [opts]
     * @param {number}  [opts.colors=256]   - palette size (must be power of 2, 2-256)
     * @param {'ALP'|'ALF'} [opts.type='ALF']
     * @returns {Promise<Buffer>} - GIF89a file contents
     */
    async encodeArtemisGIF(input, opts = {}) {
        const paletteSize = opts.colors || 256;
        const type        = opts.type || 'ALF';

        const sharpSrc = (typeof input === 'string' || Buffer.isBuffer(input))
            ? sharp(input)
            : input;

        const { data: rgbaData, info } = await sharpSrc
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const { width, height } = info;

        const { colors, indices, realPalette, alphaTable, bestZeroIdx } = await this.quantizeArtemisRGBA(rgbaData, width, height, opts);

        const transparentIdx = (type === 'ALF') ? colors - 1 : 0;
        const finalIndices = Buffer.from(indices);
        const fullAlpha = Buffer.from(alphaTable);
        if (bestZeroIdx >= 0 && bestZeroIdx !== transparentIdx) {
            const tmpR = realPalette[transparentIdx * 3];
            const tmpG = realPalette[transparentIdx * 3 + 1];
            const tmpB = realPalette[transparentIdx * 3 + 2];
            realPalette[transparentIdx * 3]     = realPalette[bestZeroIdx * 3];
            realPalette[transparentIdx * 3 + 1] = realPalette[bestZeroIdx * 3 + 1];
            realPalette[transparentIdx * 3 + 2] = realPalette[bestZeroIdx * 3 + 2];
            realPalette[bestZeroIdx * 3]        = tmpR;
            realPalette[bestZeroIdx * 3 + 1]    = tmpG;
            realPalette[bestZeroIdx * 3 + 2]    = tmpB;

            const tmpA = fullAlpha[transparentIdx];
            fullAlpha[transparentIdx] = fullAlpha[bestZeroIdx];
            fullAlpha[bestZeroIdx]    = tmpA;

            for (let i = 0; i < finalIndices.length; i++) {
                const v = finalIndices[i];
                if (v === transparentIdx)       finalIndices[i] = bestZeroIdx;
                else if (v === bestZeroIdx)     finalIndices[i] = transparentIdx;
            }
        }

        if (bestZeroIdx >= 0) {
            realPalette[transparentIdx * 3]     = 0;
            realPalette[transparentIdx * 3 + 1] = 0;
            realPalette[transparentIdx * 3 + 2] = 0;
        }

        const emitAlphaTable = this.buildArtemisAlphaTable(type, fullAlpha);
        const hasTransparent = bestZeroIdx >= 0;

        // Re-encode the LZW image stream from our (possibly swapped) indices.
        const newMinCodeSize = Math.max(2, Math.ceil(Math.log2(colors)));
        const lzwEncoded  = this.lzwEncode(finalIndices, newMinCodeSize);
        const lzwBlocks   = this.wrapSubBlocks(lzwEncoded);

        const imgDesc = Buffer.alloc(10);
        imgDesc[0] = 0x2C;
        imgDesc.writeUInt16LE(0, 1);
        imgDesc.writeUInt16LE(0, 3);
        imgDesc.writeUInt16LE(width,  5);
        imgDesc.writeUInt16LE(height, 7);
        imgDesc[9] = 0x00;

        const appExtBlock = this.buildAppExtension('Artemis ', type, emitAlphaTable);
        const gceBlock    = this.buildGCE(transparentIdx, hasTransparent);
        const gifHeader   = this.buildGIFHeader(width, height, colors, 0);

        return Buffer.concat([
            gifHeader,
            realPalette,
            gceBlock,
            appExtBlock,
            imgDesc,
            Buffer.from([newMinCodeSize]),
            lzwBlocks,
            Buffer.from([0x3B])
        ]);
    }

    // ---------------------------------------------------------------------------
    // Minimal PNG chunk parser (for palette/indexed PNGs)
    // ---------------------------------------------------------------------------

    /** Walk a PNG buffer and return a Map of chunkType -> Buffer[] (data only). */
    parsePNGChunks(buf) {
        const PNG_SIG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        if (!buf.slice(0, 8).equals(PNG_SIG)) throw new Error('Not a PNG file');
        const chunks = new Map();
        let offset = 8;
        while (offset < buf.length) {
            const length   = buf.readUInt32BE(offset);     offset += 4;
            const type     = buf.slice(offset, offset + 4).toString('ascii'); offset += 4;
            const data     = buf.slice(offset, offset + length); offset += length;
            offset += 4; // skip CRC
            if (!chunks.has(type)) chunks.set(type, []);
            chunks.get(type).push(data);
        }
        return chunks;
    }

    /**
     * Check if a PNG buffer is an indexed-color (palette) PNG.
     * Color type 3 = indexed color.  Byte 25 of the file = color type in IHDR.
     * @param {Buffer} pngBuf
     * @returns {boolean}
     */
    isPalettePNG(pngBuf) {
        if (pngBuf.length < 26) return false;
        // PNG sig(8) + chunk length(4) + 'IHDR'(4) + width(4) + height(4) + bitdepth(1) + colortype(1)
        return pngBuf[25] === 3;
    }

    /**
     * Extract palette, alpha table, pixel indices, width, and height from an
     * indexed-color PNG.  Handles bit depths 1, 2, 4, and 8.
     *
     * @param {Buffer} pngBuf
     * @returns {{ palette: Buffer, alphaTable: Buffer, indices: Uint8Array,
     *             width: number, height: number, colors: number }}
     */
    extractPalettePNG(pngBuf) {
        const chunks = this.parsePNGChunks(pngBuf);

        if (!chunks.has('IHDR')) throw new Error('PNG missing IHDR chunk');
        if (!chunks.has('PLTE')) throw new Error('PNG missing PLTE chunk (not a palette PNG)');

        const ihdr      = chunks.get('IHDR')[0];
        const width     = ihdr.readUInt32BE(0);
        const height    = ihdr.readUInt32BE(4);
        const bitDepth  = ihdr[8];
        const colorType = ihdr[9];
        const interlace = ihdr[12];

        if (colorType !== 3) throw new Error('PNG is not indexed-color (color type 3)');
        if (interlace  !== 0) throw new Error('Interlaced palette PNGs are not supported');

        const palette = chunks.get('PLTE')[0]; // RGB triplets
        const colors  = palette.length / 3;

        // tRNS gives per-palette-entry alpha (may be shorter than palette)
        const tRNSData = chunks.has('tRNS') ? chunks.get('tRNS')[0] : Buffer.alloc(0);
        const alphaTable = Buffer.alloc(colors, 0xFF); // default opaque
        for (let i = 0; i < tRNSData.length && i < colors; i++) {
            // Quantize to multiples of 8 (reference ALP convention).
            let a = tRNSData[i];
            if (a >= 252) a = 255;
            else a = a & 0xF8;
            alphaTable[i] = a;
        }

        // Decompress IDAT
        const idatData = Buffer.concat(chunks.get('IDAT'));
        const raw      = zlib.inflateSync(idatData);

        // Un-filter scanlines
        const bytesPerRow = Math.ceil(width * bitDepth / 8);
        const indices     = new Uint8Array(width * height);
        let rawOffset = 0;
        let prevRow   = Buffer.alloc(bytesPerRow, 0);

        for (let y = 0; y < height; y++) {
            const filterType = raw[rawOffset++];
            const row        = raw.slice(rawOffset, rawOffset + bytesPerRow);
            rawOffset += bytesPerRow;

            const recon = Buffer.alloc(bytesPerRow);
            for (let i = 0; i < bytesPerRow; i++) {
                const x    = row[i];
                const a    = i >= 1         ? recon[i - 1]    : 0; // left
                const b    = prevRow[i];                            // above
                const c    = i >= 1         ? prevRow[i - 1]  : 0; // above-left
                switch (filterType) {
                    case 0: recon[i] = x;                                break; // None
                    case 1: recon[i] = (x + a) & 0xFF;                  break; // Sub
                    case 2: recon[i] = (x + b) & 0xFF;                  break; // Up
                    case 3: recon[i] = (x + Math.floor((a + b) / 2)) & 0xFF; break; // Average
                    case 4: {                                                    // Paeth
                        const p  = a + b - c;
                        const pa = Math.abs(p - a);
                        const pb = Math.abs(p - b);
                        const pc = Math.abs(p - c);
                        recon[i] = (x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xFF;
                        break;
                    }
                    default: throw new Error(`Unknown PNG filter type ${filterType}`);
                }
            }

            // Unpack bits to per-pixel indices
            for (let x = 0; x < width; x++) {
                if (bitDepth === 8) {
                    indices[y * width + x] = recon[x];
                } else {
                    const byteIdx  = Math.floor(x * bitDepth / 8);
                    const bitShift = 8 - bitDepth - (x * bitDepth % 8);
                    const mask     = (1 << bitDepth) - 1;
                    indices[y * width + x] = (recon[byteIdx] >> bitShift) & mask;
                }
            }
            prevRow = recon;
        }

        // Round palette color count up to the next valid GIF power-of-two
        const validSizes = [2, 4, 8, 16, 32, 64, 128, 256];
        const gifColors  = validSizes.find(s => s >= colors) || 256;

        // Pad palette and alpha table to gifColors entries if needed
        const paddedPalette = Buffer.alloc(gifColors * 3, 0);
        palette.copy(paddedPalette, 0, 0, Math.min(palette.length, gifColors * 3));

        const paddedAlpha = Buffer.alloc(gifColors, 0);
        alphaTable.copy(paddedAlpha, 0, 0, Math.min(alphaTable.length, gifColors));

        return { palette: paddedPalette, alphaTable: paddedAlpha, indices, width, height, colors: gifColors };
    }

    /**
     * Encode an already-decoded palette PNG directly into an Artemis GIF without
     * re-quantization.  The original PLTE palette and tRNS alpha table are used 1:1.
     *
     * @param {Buffer} pngBuf
     * @param {object} [opts]
     * @param {'ALP'|'ALF'} [opts.type='ALP']
     * @returns {Promise<Buffer>}
     */
    async paletteImageToArtemisGIF(pngBuf, opts = {}) {
        const type = opts.type || 'ALP';
        const { palette, alphaTable, indices, width, height, colors } = this.extractPalettePNG(pngBuf);

        const transparentIdx = (type === 'ALF') ? colors - 1 : 0;

        // Find first palette entry with alpha=0 and swap it into the expected
        // transparent colour slot for the selected Artemis type.
        let zeroIdx = -1;
        for (let i = 0; i < colors; i++) {
            if (alphaTable[i] === 0) { zeroIdx = i; break; }
        }

        const finalIndices = Buffer.from(indices);
        const finalPalette = Buffer.from(palette);
        const finalAlpha   = Buffer.from(alphaTable);
        if (zeroIdx >= 0 && zeroIdx !== transparentIdx) {
            const tmpR = finalPalette[transparentIdx * 3],            tmpG = finalPalette[transparentIdx * 3 + 1],            tmpB = finalPalette[transparentIdx * 3 + 2];
            finalPalette[transparentIdx * 3]     = finalPalette[zeroIdx * 3];
            finalPalette[transparentIdx * 3 + 1] = finalPalette[zeroIdx * 3 + 1];
            finalPalette[transparentIdx * 3 + 2] = finalPalette[zeroIdx * 3 + 2];
            finalPalette[zeroIdx * 3]            = tmpR;
            finalPalette[zeroIdx * 3 + 1]        = tmpG;
            finalPalette[zeroIdx * 3 + 2]        = tmpB;
            const tmpA = finalAlpha[transparentIdx];
            finalAlpha[transparentIdx] = finalAlpha[zeroIdx];
            finalAlpha[zeroIdx]       = tmpA;
            for (let i = 0; i < finalIndices.length; i++) {
                const v = finalIndices[i];
                if (v === transparentIdx) finalIndices[i] = zeroIdx;
                else if (v === zeroIdx)   finalIndices[i] = transparentIdx;
            }
        }

        if (zeroIdx >= 0) {
            finalPalette[transparentIdx * 3]     = 0;
            finalPalette[transparentIdx * 3 + 1] = 0;
            finalPalette[transparentIdx * 3 + 2] = 0;
        }

        // Emit full alphaTable (no truncation; WebTV may default missing
        // entries to 0x00 transparent rather than 0xFF opaque).
        const emitAlphaTable = this.buildArtemisAlphaTable(type, finalAlpha);

        const minCodeSize = Math.max(2, Math.ceil(Math.log2(colors)));
        const appExtBlock = this.buildAppExtension('Artemis ', type, emitAlphaTable);
        const gceBlock    = this.buildGCE(transparentIdx, zeroIdx >= 0);
        const lzwEncoded  = this.lzwEncode(finalIndices, minCodeSize);
        const lzwBlocks   = this.wrapSubBlocks(lzwEncoded);

        const imgDesc = Buffer.alloc(10);
        imgDesc[0] = 0x2C;
        imgDesc.writeUInt16LE(0, 1);
        imgDesc.writeUInt16LE(0, 3);
        imgDesc.writeUInt16LE(width,  5);
        imgDesc.writeUInt16LE(height, 7);
        imgDesc[9] = 0x00;

        return Buffer.concat([
            this.buildGIFHeader(width, height, colors, 0),
            finalPalette,
            gceBlock,
            appExtBlock,
            imgDesc,
            Buffer.from([minCodeSize]),
            lzwBlocks,
            Buffer.from([0x3B])
        ]);
    }

    // ---------------------------------------------------------------------------
    // PNG → WebTV format router
    // ---------------------------------------------------------------------------

    /**
     * Convert a PNG to the appropriate WebTV-compatible format:
     *   - PNG without alpha  → JPEG
     *   - Palette PNG (color type 3) with alpha → Artemis ALF GIF
     *   - Full-color RGBA PNG → quantized Artemis ALF GIF
     *
     * @param {string|Buffer} input  - file path or raw PNG Buffer
     * @param {object} [opts]
     * @param {number} [opts.colors=256]         - palette size for full-color quantization
     * @param {'ALP'|'ALF'} [opts.type='ALP']   - Artemis variant
     * @param {number} [opts.jpegQuality=85]     - JPEG quality (0-100) when no alpha
     * @param {number} [opts.maxWidth]           - maximum width to scale to before encoding
     * @param {number} [opts.maxHeight]          - maximum height to scale to before encoding
     * @returns {Promise<{ data: Buffer, mime: string }>}
     */
    async ImageToWebTV(input, opts = {}) {
        let pngBuf = Buffer.isBuffer(input) ? input : require('fs').readFileSync(input);
        const maxWidth  = Number(opts.maxWidth)  > 0 ? Number(opts.maxWidth)  : null;
        const maxHeight = Number(opts.maxHeight) > 0 ? Number(opts.maxHeight) : null;
        const originalIsPalettePNG = this.isPalettePNG(pngBuf);
        const inputMeta = await sharp(pngBuf).metadata();
        const willResize = (maxWidth && inputMeta.width > maxWidth) || (maxHeight && inputMeta.height > maxHeight);
        if (willResize) {
            const resizeOpts = { fit: 'inside', withoutEnlargement: true };
            if (maxWidth)  resizeOpts.width  = maxWidth;
            if (maxHeight) resizeOpts.height = maxHeight;
            pngBuf = await sharp(pngBuf)
                .resize(resizeOpts)
                .png()
                .toBuffer();
        }
        const meta   = willResize ? await sharp(pngBuf).metadata() : inputMeta;
        let usesAlpha = false;

        if (meta.hasAlpha) {
            // Many PNG files include an alpha channel that is fully opaque.
            // Treat those as non-alpha images and keep JPEG path.
            try {
                const stats = await sharp(pngBuf).stats();
                if (stats.channels && stats.channels[3]) {
                    usesAlpha = stats.channels[3].min < 255;
                }
            } catch (e) {
                // Fallback to channel presence when stats cannot be computed.
                usesAlpha = true;
            }
        }

        if (!meta.hasAlpha || !usesAlpha) {
            // No alpha channel → JPEG
            const data = await sharp(pngBuf)
                .jpeg({ quality: opts.jpegQuality || 85 })
                .toBuffer();
            return { data, mime: 'image/jpeg' };
        }

        if (this.isPalettePNG(pngBuf)) {
            // Palette/indexed PNGs should preserve palette + tRNS alpha exactly by default.
            // If resizing was applied, the palette is no longer preserved and we must
            // re-quantize the image before producing an Artemis GIF.
            const forceRequantize = opts.forceRequantizePalette || willResize;
            const pngInfo = this.extractPalettePNG(pngBuf);
            if (!forceRequantize && this.isSimplePaletteTransparency(pngInfo.alphaTable)) {
                const data = this.encodePalettePNGAsStandardGIF(pngInfo);
                return { data, mime: 'image/gif' };
            }
            const data = forceRequantize
                ? await this.encodeArtemisGIF(pngBuf, opts)
                : await this.paletteImageToArtemisGIF(pngBuf, opts);
            return { data, mime: 'image/gif' };
        }

        // Full-color RGBA → quantize
        const data = await this.encodeArtemisGIF(pngBuf, opts);
        return { data, mime: 'image/gif' };
    }

    async ImageToArtemisGIF(input, opts = {}) {
        const result = await this.ImageToWebTV(input, opts);
        if (result.mime !== 'image/gif') throw new Error('Input image has no alpha; cannot encode as Artemis GIF. Use ImageToWebTV() instead.');
        return result.data;
    }

    /**
     * Convert a WebTV Artemis ALP/ALF GIF to a standard RGBA PNG.
     *
     * @param {string|Buffer} input - file path or raw Buffer
     * @returns {Promise<Buffer>} PNG file contents
     */
    async artemisGIFtoPNG(input) {
        const gifBuf = Buffer.isBuffer(input) ? input : require('fs').readFileSync(input);
        const { rgba, width, height } = await this.decodeArtemisGIF(gifBuf);
        return sharp(rgba, { raw: { width, height, channels: 4 } })
            .png()
            .toBuffer();
    }

    // ---------------------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------------------

    /**
     * Detect whether a GIF buffer is a WebTV Artemis alpha GIF.
     * @param {Buffer} gifBuf
     * @returns {'ALP'|'ALF'|null}
     */
    static detect(gifBuf) {
        return WTVImage._impl.detectArtemisType(gifBuf);
    }

    /**
     * Decode a WebTV Artemis ALP/ALF GIF to raw RGBA pixel data.
     * @param {Buffer} gifBuf
     * @returns {Promise<{ rgba: Buffer, width: number, height: number, type: string }>}
     */
    static decode(gifBuf) {
        return WTVImage._impl.decodeArtemisGIF(gifBuf);
    }

    /**
     * Encode raw RGBA image data (or any sharp-compatible source) into a WebTV
     * Artemis ALP/ALF GIF.
     * @param {Buffer|string} input
     * @param {object} [opts]
     * @param {number} [opts.colors=256]
     * @param {'ALP'|'ALF'} [opts.type='ALP']
     * @returns {Promise<Buffer>}
     */
    static encode(input, opts = {}) {
        return WTVImage._impl.encodeArtemisGIF(input, opts);
    }
    
    /**
     * Convert an unsupported image to the appropriate WebTV format.
     * @param {string|Buffer} input
     * @param {object} [opts]
     * @returns {Promise<{ data: Buffer, mime: string }>}
     */
    static ImageToWebTV(input, opts = {}) {
        return WTVImage._impl.ImageToWebTV(input, opts);
    }

    /**
     * Convert a image with alpha to a WebTV Artemis GIF.
     * Throws if the input has no alpha channel.
     * @param {string|Buffer} input
     * @param {object} [opts]
     * @param {number} [opts.colors=256]
     * @param {'ALP'|'ALF'} [opts.type='ALP']
     * @returns {Promise<Buffer>}
     */
    static ImageToGIF(input, opts = {}) {
        return WTVImage._impl.ImageToArtemisGIF(input, opts);
    }

    /**
     * Convert a WebTV Artemis ALP/ALF GIF to a standard RGBA PNG.
     * @param {string|Buffer} input
     * @returns {Promise<Buffer>}
     */
    static gifToPNG(input) {
        return WTVImage._impl.artemisGIFtoPNG(input);
    }
}

WTVImage._impl = new WTVImage();

module.exports = WTVImage;
