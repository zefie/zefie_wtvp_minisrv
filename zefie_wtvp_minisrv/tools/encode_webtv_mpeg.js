#!/usr/bin/env node
'use strict';

/**
 * WebTV MPEG-1 PS Encoder
 *
 * This tool is incomplete, and may not generate correct WebTV MPEG yet
 * 
 * Two-pass pipeline:
 *   1. ffmpeg encodes input to MPEG-1 PS (codec settings only)
 *   2. ES extracted via structure-aware pack walk (never naive payload scan)
 *   3. Video ES patched: fr_code=10, constrained_parameters_flag=1
 *   4. Output rebuilt as strict 2048-byte packs matching attract.mpg structure:
 *        - One PES per pack: BA(12) + PES_hdr(6) + ff_0f(2) + data(2028) = 2048
 *        - All PES optional headers: ff 0f (no timestamps)
 *        - 3 audio pre-fill packs, then 1 audio per ~7 video packs
 *        - No BB system header packet
 *
 * Usage: node encode_webtv_mpeg.js <input_video> <output.mpg> [duration_seconds]
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PACK_SIZE = 2048;
// MPEG-1 pack header variants used by known working files.
const BA_HDR_MPEG1 = Buffer.from('000001ba2100010001802711', 'hex');
const BA_HDR_ATTRACT = Buffer.from('000001ba0000025447474747', 'hex');
const MP2_BITRATE_MPEG1_L2 = [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0];
const MP2_SR_MPEG1 = [44100, 48000, 32000, 0];
// Usable data per pack: 2048 - BA(12) - PES_fixed_hdr(6) - ff_0f(2) = 2028
const DATA_PER_PACK = PACK_SIZE - BA_HDR_MPEG1.length - 6 - 2; // 2028


function runCmd(args, description) {
    console.log(`[*] ${description}...`);
    try {
        execFileSync(args[0], args.slice(1), { stdio: ['ignore', 'pipe', 'pipe'] });
        console.log('[+] OK');
        return true;
    } catch (e) {
        const stderr = e.stderr ? e.stderr.toString().slice(0, 500) : e.message;
        console.error(`[!] Failed: ${stderr}`);
        return false;
    }
}


/**
 * Extract video (E0) and audio (C0) elementary streams.
 * Uses structure-aware pack walk — never scans payload bytes for start codes.
 */
function extractES(mpgPath) {
    console.log('[*] Extracting elementary streams (structure-aware)...');

    const d = fs.readFileSync(mpgPath);
    const videoChunks = [];
    const audioChunks = [];

    let i = 0;
    while (i < d.length - 4) {
        if (d[i] !== 0x00 || d[i+1] !== 0x00 || d[i+2] !== 0x01) {
            i++;
            continue;
        }
        const sid = d[i+3];

        if (sid === 0xBA) {
            const mpeg2 = (d[i+4] & 0xC0) === 0x40;
            const hlen = mpeg2 ? 14 + (d[i+13] & 0x07) : 12;
            i += hlen;

        } else if (sid === 0xE0 || sid === 0xC0) {
            const pktLen = (d[i+4] << 8) | d[i+5];
            const end = i + 6 + pktLen;
            let j = i + 6;

            // Skip stuffing bytes (0xFF)
            while (j < end && d[j] === 0xFF) j++;

            if (j < end) {
                let h = d[j];
                // Skip STD buffer (0x4x marker, 2 bytes)
                if ((h & 0xC0) === 0x40) {
                    j += 2;
                    h = j < end ? d[j] : 0;
                }
                // Skip PTS-only (5 bytes) or PTS+DTS (10 bytes) or no-ts (1 byte)
                if ((h & 0xF0) === 0x20) {
                    j += 5;
                } else if ((h & 0xF0) === 0x30) {
                    j += 10;
                } else if (h === 0x0F) {
                    j += 1;
                }
            }

            if (j <= end) {
                const payload = d.slice(j, end);
                if (sid === 0xE0) videoChunks.push(payload);
                else audioChunks.push(payload);
            }
            i = end;

        } else if (sid === 0xB9) {
            break; // PS end code

        } else if (sid >= 0xBB && sid <= 0xBF) {
            const pktLen = (d[i+4] << 8) | d[i+5];
            i += 6 + pktLen;

        } else {
            i++;
        }
    }

    const videoES = Buffer.concat(videoChunks);
    const audioES = Buffer.concat(audioChunks);
    console.log(`[+] Extracted: video=${videoES.length} bytes, audio=${audioES.length} bytes`);
    return { videoES, audioES };
}


/**
 * Patch fr_code=10 and constrained_parameters_flag=1 in video ES buffer in-place.
 */
function patchSequenceHeaders(videoES) {
    let i = 0;
    let n = 0;
    while (i < videoES.length - 11) {
        // Find 00 00 01 B3
        if (videoES[i] === 0x00 && videoES[i+1] === 0x00 &&
            videoES[i+2] === 0x01 && videoES[i+3] === 0xB3) {
            videoES[i+7] = (videoES[i+7] & 0xF0) | 0x0A;  // fr_code = 10
            videoES[i+11] |= 0x04;                          // constrained_parameters_flag
            n++;
            i += 4;
        } else {
            i++;
        }
    }
    console.log(`[+] Patched ${n} sequence header(s): fr_code=10, constrained=1`);
    return n;
}


/**
 * Normalize MP2 frame headers for maximum WebTV compatibility.
 * Clears the "original" bit (header byte3 bit2), matching attract.mpg (fffd50c0).
 */
function normalizeMP2Headers(audioES) {
    let i = 0;
    let patched = 0;

    while (i < audioES.length - 4) {
        if (audioES[i] === 0xFF && (audioES[i + 1] & 0xE0) === 0xE0) {
            const b1 = audioES[i + 1];
            const b2 = audioES[i + 2];

            const version = (b1 >> 3) & 0x03; // 3 => MPEG-1
            const layer = (b1 >> 1) & 0x03;   // 2 => Layer II
            const brIdx = (b2 >> 4) & 0x0F;
            const srIdx = (b2 >> 2) & 0x03;
            const pad = (b2 >> 1) & 0x01;

            if (version === 3 && layer === 2 && MP2_BITRATE_MPEG1_L2[brIdx] && MP2_SR_MPEG1[srIdx]) {
                const bitrate = MP2_BITRATE_MPEG1_L2[brIdx] * 1000;
                const sampleRate = MP2_SR_MPEG1[srIdx];
                const frameLen = Math.floor((144 * bitrate) / sampleRate) + pad;

                // Clear "original" bit (bit2 in 4th header byte): c4 -> c0
                audioES[i + 3] &= 0xFB;
                patched++;

                i += frameLen;
                continue;
            }
        }
        i++;
    }

    console.log(`[+] Normalized MP2 headers: patched ${patched} frame(s)`);
}


/**
 * Build MPEG-1 PS with strict 2048-byte packs matching attract.mpg structure:
 *   - One PES per pack
 *   - All PES optional headers: ff 0f (no timestamps)
 *   - 3 audio pre-fill packs, then 1 audio per ~7 video packs
 *   - No BB system header
 */
function buildWebTVPS(videoES, audioES, outputPath, audioIntervalOverride, baHeaderMode) {
    console.log('[*] Building WebTV MPEG-1 PS...');

    const P = DATA_PER_PACK; // 2028

    const baHdr = baHeaderMode === 'attract' ? BA_HDR_ATTRACT : BA_HDR_MPEG1;

    function makePack(streamId, data) {
        // Pad or trim data to exactly P bytes
        const payload = Buffer.alloc(P);
        data.copy(payload, 0, 0, Math.min(data.length, P));

        const pktLen = P + 2; // ff 0f(2) + data(P) = 2030
        const pesHdr = Buffer.alloc(8);
        pesHdr[0] = 0x00; pesHdr[1] = 0x00; pesHdr[2] = 0x01; pesHdr[3] = streamId;
        pesHdr[4] = (pktLen >> 8) & 0xFF;
        pesHdr[5] = pktLen & 0xFF;
        pesHdr[6] = 0xFF; // ff 0f
        pesHdr[7] = 0x0F;

        return Buffer.concat([baHdr, pesHdr, payload]); // 12 + 6 + 2 + 2028 = 2048
    }

    // Split ES into P-byte chunks
    const vChunks = [];
    for (let i = 0; i < videoES.length; i += P) vChunks.push(videoES.slice(i, i + P));
    const aChunks = [];
    for (let i = 0; i < audioES.length; i += P) aChunks.push(audioES.slice(i, i + P));

    if (!vChunks.length || !aChunks.length) {
        console.error('[!] Empty video or audio stream');
        return false;
    }

    // Use natural A/V ratio — matches actual bitrate split in the encoded file.
    // attract.mpg uses 7 because its video bitrate is ~7x its audio bitrate.
    // Our encoded video is lower bitrate so the natural ratio is ~3.
    const naturalInterval = Math.max(1, Math.round(vChunks.length / aChunks.length));
    const audioInterval = Number.isFinite(audioIntervalOverride) && audioIntervalOverride > 0
        ? Math.floor(audioIntervalOverride)
        : naturalInterval;
    console.log(`[*] ${vChunks.length} video chunks, ${aChunks.length} audio chunks, ` +
                `1 audio per ~${audioInterval} video`);

    const packs = [];
    let aIdx = 0;

    // Pre-fill: 3 audio packs to prime the WebTV audio buffer (matches attract.mpg)
    const preFill = Math.min(3, aChunks.length);
    for (let k = 0; k < preFill; k++, aIdx++) {
        packs.push(makePack(0xC0, aChunks[aIdx]));
    }

    // Simple fixed-interval interleave: emit audioInterval video packs, then 1 audio pack
    let vIdx = 0;
    while (vIdx < vChunks.length || aIdx < aChunks.length) {
        for (let k = 0; k < audioInterval && vIdx < vChunks.length; k++) {
            packs.push(makePack(0xE0, vChunks[vIdx++]));
        }
        if (aIdx < aChunks.length) {
            packs.push(makePack(0xC0, aChunks[aIdx++]));
        }
    }

    const endCode = Buffer.from([0x00, 0x00, 0x01, 0xB9]);
    const output = Buffer.concat([...packs, endCode]);

    fs.writeFileSync(outputPath, output);
    console.log(`[+] Wrote ${packs.length} packs (${output.length} bytes)`);
    return true;
}


function verifyFile(mpgPath) {
    console.log('[*] Verifying file structure...');
    try {
        const result = execFileSync('ffprobe', [
            '-v', 'error',
            '-show_entries', 'stream=codec_name,codec_type',
            '-of', 'default=noprint_wrappers=1',
            mpgPath
        ], { encoding: 'utf8' });
        if (result.includes('mpeg1video') && result.includes('mp2')) {
            console.log('[+] Valid: mpeg1video + mp2');
            return true;
        }
        console.error('[!] Missing video or audio stream');
        return false;
    } catch (e) {
        console.error(`[!] ffprobe failed: ${e.message}`);
        return false;
    }
}


function checkPacks(mpgPath) {
    console.log('[*] Checking pack structure...');
    const d = fs.readFileSync(mpgPath);
    const baPos = [];
    for (let i = 0; i < d.length - 3; i++) {
        if (d[i] === 0x00 && d[i+1] === 0x00 && d[i+2] === 0x01 && d[i+3] === 0xBA) {
            baPos.push(i);
            i += 3;
        }
    }
    if (baPos.length < 2) {
        console.error('[!] Less than 2 BA packs found');
        return false;
    }
    const strides = new Set();
    for (let i = 0; i < baPos.length - 1; i++) {
        strides.add(baPos[i+1] - baPos[i]);
    }
    if (strides.size === 1 && strides.has(2048)) {
        console.log(`[+] Perfect: all ${baPos.length} packs are 2048 bytes`);
        return true;
    }
    console.log(`[!] Pack strides vary: ${[...strides].sort((a, b) => a - b).join(', ')}`);
    return false;
}


/**
 * Encode video to WebTV-compatible MPEG-1 PS.
 *
 * @param {string} inputFile   Any video file ffmpeg can read
 * @param {string} outputFile  Output .mpg path
 * @param {number|null} duration  Optional clip length in seconds
 */
function encodeWebTV(inputFile, outputFile, duration, audioIntervalOverride, baHeaderMode, audioEncoder, audioESOverridePath) {
    const tmpFile = outputFile.replace(/(\.[^.]+)$/, '_raw$1');

    // Step 1: Encode with ffmpeg (MPEG-1 video + MP2 audio, raw mux)
    const cmd = ['ffmpeg', '-y', '-i', inputFile];
    if (duration != null) cmd.push('-t', String(duration));
    cmd.push(
        '-vf', 'fps=15,scale=272:208,setsar=1',
        '-c:v', 'mpeg1video',
        '-b:v', '500k',
        '-maxrate', '700k',
        '-bufsize', '1024k',
        '-g', '15',
        '-bf', '2',
        '-c:a', audioEncoder,
        '-ar', '44100',
        '-ac', '1',
        '-b:a', '80k',
        '-strict', 'unofficial',
        '-f', 'mpeg',
        '-muxrate', '2000k',
        tmpFile
    );
    if (!runCmd(cmd, 'Encoding with ffmpeg (MPEG-1 PS)')) return false;

    // Step 2: Extract ES using structure-aware pack walk
    const { videoES, audioES } = extractES(tmpFile);
    if (!videoES.length || !audioES.length) {
        console.error('[!] Failed to extract elementary streams');
        return false;
    }

    // Step 3: Patch video sequence headers (fr_code=10, constrained=1)
    const videoMut = Buffer.from(videoES);
    patchSequenceHeaders(videoMut);

    let audioSource = audioES;
    if (audioESOverridePath) {
        if (!fs.existsSync(audioESOverridePath)) {
            console.error(`[!] Audio ES override not found: ${audioESOverridePath}`);
            return false;
        }
        audioSource = fs.readFileSync(audioESOverridePath);
        console.log(`[+] Using external audio ES override: ${audioESOverridePath} (${audioSource.length} bytes)`);
    }

    const audioMut = Buffer.from(audioSource);
    normalizeMP2Headers(audioMut);

    // Step 4: Rebuild as proper WebTV PS
    if (!buildWebTVPS(videoMut, audioMut, outputFile, audioIntervalOverride, baHeaderMode)) return false;

    // Step 5: Verify
    if (!verifyFile(outputFile)) return false;
    checkPacks(outputFile);

    // Cleanup temp file
    try { fs.unlinkSync(tmpFile); } catch (_) {}

    console.log(`\n[+] Successfully encoded: ${outputFile}`);
    return true;
}


// --- CLI entry point ---
const args = process.argv.slice(2);
if (args.length < 2) {
    const script = path.basename(process.argv[1]);
    console.error(`Usage: node ${script} <input_video> <output.mpg> [duration_seconds]`);
    console.error(`Example: node ${script} myvideo.mp4 webtv.mpg 15`);
    process.exit(1);
}

let audioIntervalOverride = null;
let baHeaderMode = 'mpeg1';
let audioEncoder = 'mp2fixed';
let audioESOverridePath = null;
const nonFlagArgs = [];
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--audio-interval' && i + 1 < args.length) {
        audioIntervalOverride = parseInt(args[i + 1], 10);
        i++;
    } else if (args[i] === '--ba-header' && i + 1 < args.length) {
        baHeaderMode = String(args[i + 1]).toLowerCase() === 'attract' ? 'attract' : 'mpeg1';
        i++;
    } else if (args[i] === '--audio-encoder' && i + 1 < args.length) {
        const v = String(args[i + 1]).toLowerCase();
        audioEncoder = (v === 'mp2fixed') ? 'mp2fixed' : 'mp2';
        i++;
    } else if (args[i] === '--audio-es' && i + 1 < args.length) {
        audioESOverridePath = args[i + 1];
        i++;
    } else {
        nonFlagArgs.push(args[i]);
    }
}

const [inputFile, outputFile, durationArg] = nonFlagArgs;
const duration = durationArg != null ? parseFloat(durationArg) : null;

if (!fs.existsSync(inputFile)) {
    console.error(`[!] Input file not found: ${inputFile}`);
    process.exit(1);
}

if (!encodeWebTV(inputFile, outputFile, duration, audioIntervalOverride, baHeaderMode, audioEncoder, audioESOverridePath)) {
    process.exit(1);
}
