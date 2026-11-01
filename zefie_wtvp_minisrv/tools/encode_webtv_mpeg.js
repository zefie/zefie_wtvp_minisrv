#!/usr/bin/env node
'use strict';

/**
 * WebTV MPEG-1 PS Encoder (VideoFlash / DealerDemo-compatible)
 *
 * Two-pass pipeline:
 *   1. ffmpeg encodes input to MPEG-1 PS (codec settings only)
 *   2. ES extracted via structure-aware pack walk (never naive payload scan)
 *   3. Video ES patched to attract.mpg sequence-header template + sequence_end (B7)
 *   4. Output rebuilt matching DealerDemo pack structure:
 *        - One PES per pack: BA(12) + PES_hdr(6) + ff_0f(2) + data
 *        - Full packs are 2048 bytes (2028 data); final packs may be short (no zero-pad)
 *        - All PES optional headers: ff 0f (no timestamps)
 *        - 3 audio pre-fill packs, then 1 audio per ~N video packs
 *        - No BB system header; no ISO end code B9 (use sequence_end B7)
 *
 * Usage: node encode_webtv_mpeg.js <input_video> <output.mpg> [duration_seconds]
 * Flags: --ba-header attract|mpeg1  --audio-interval N  --audio-encoder mp2|mp2fixed
 *         --audio-es <file>
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
 * Patch every sequence header to the DealerDemo / attract.mpg template:
 *   00 00 01 B3 11 00 D0 1A FF FF E0 A4
 *   = 272x208, aspect=1, fr_code=10, bit_rate=0x3FFFF, marker=1,
 *     vbv=20, constrained_parameters_flag=1, no custom quant matrices
 *
 * VidFlash hard-requires marker_bit=1 after bit_rate; other fields match
 * every known-good VideoFlash title.
 */
function patchSequenceHeaders(videoES) {
    // Bytes immediately after 00 00 01 B3
    const seqFields = Buffer.from('1100d01affffe0a4', 'hex');
    let i = 0;
    let n = 0;
    while (i < videoES.length - 11) {
        if (videoES[i] === 0x00 && videoES[i + 1] === 0x00 &&
            videoES[i + 2] === 0x01 && videoES[i + 3] === 0xB3) {
            seqFields.copy(videoES, i + 4);
            n++;
            i += 12;
        } else {
            i++;
        }
    }
    console.log(`[+] Patched ${n} sequence header(s) to attract template (272x208, fr=10, br=0x3FFFF, vbv=20, constrained=1)`);
    return n;
}

/** Append MPEG-1 sequence_end (0x1B7). Known-good files use B7; never ISO end B9. */
function appendSequenceEnd(videoES, repeats = 2) {
    const end = Buffer.alloc(4 * repeats);
    for (let r = 0; r < repeats; r++) {
        end[r * 4] = 0x00;
        end[r * 4 + 1] = 0x00;
        end[r * 4 + 2] = 0x01;
        end[r * 4 + 3] = 0xB7;
    }
    return Buffer.concat([videoES, end]);
}

/**
 * DealerDemo attract.mpg has exactly one sequence header and one GOP header for
 * the entire title. ffmpeg emits a fresh 00 00 01 B3 (+ often B8) every keyframe,
 * which appears to make VideoFlash re-init and silently drop audio after a short
 * time while video keeps playing.
 *
 * Keep the first B3 (12 bytes: start+8 params, no quant matrices) and first B8
 * (8 bytes: start+4 params); strip later repeats.
 */
function stripRepeatSeqAndGopHeaders(videoES) {
    const chunks = [];
    let i = 0;
    let keptSeq = 0;
    let keptGop = 0;
    let strippedSeq = 0;
    let strippedGop = 0;
    let last = 0;

    while (i < videoES.length - 3) {
        if (videoES[i] === 0x00 && videoES[i + 1] === 0x00 && videoES[i + 2] === 0x01) {
            const sid = videoES[i + 3];
            if (sid === 0xB3 && i + 11 < videoES.length) {
                // No custom quant matrices in our template => fixed 12-byte header
                if (keptSeq === 0) {
                    keptSeq = 1;
                    i += 12;
                } else {
                    chunks.push(videoES.subarray(last, i));
                    i += 12;
                    last = i;
                    strippedSeq++;
                }
                continue;
            }
            if (sid === 0xB8 && i + 7 < videoES.length) {
                if (keptGop === 0) {
                    keptGop = 1;
                    i += 8;
                } else {
                    chunks.push(videoES.subarray(last, i));
                    i += 8;
                    last = i;
                    strippedGop++;
                }
                continue;
            }
        }
        i++;
    }
    chunks.push(videoES.subarray(last));
    const out = Buffer.concat(chunks);
    console.log(`[+] Sequence/GOP headers: kept ${keptSeq} seq + ${keptGop} GOP; ` +
                `stripped ${strippedSeq} seq + ${strippedGop} GOP ` +
                `(${videoES.length} -> ${out.length} bytes)`);
    return out;
}


/**
 * Remove long MPEG-1 video zero-stuffing runs between start codes (>= 8 bytes).
 * ffmpeg CBR (minrate) inserts these; attract.mpg has none. Short 0–3 byte aligns
 * are left alone (normal bitstream padding).
 */
function stripVideoZeroStuffing(videoES) {
    const sc = [];
    for (let i = 0; i < videoES.length - 3; i++) {
        if (videoES[i] === 0x00 && videoES[i + 1] === 0x00 && videoES[i + 2] === 0x01) {
            sc.push(i);
        }
    }
    if (sc.length === 0) return videoES;

    const chunks = [];
    let removed = 0;
    let gaps = 0;
    if (sc[0] > 0) chunks.push(videoES.subarray(0, sc[0]));

    for (let s = 0; s < sc.length; s++) {
        const start = sc[s];
        const next = (s + 1 < sc.length) ? sc[s + 1] : videoES.length;
        let end = next;
        while (end > start + 4 && videoES[end - 1] === 0x00) end--;
        const run = next - end;
        // Only strip CBR-style pads; tiny aligns are normal.
        if (run >= 8) {
            removed += run;
            gaps++;
            chunks.push(videoES.subarray(start, end));
        } else {
            chunks.push(videoES.subarray(start, next));
        }
    }

    const out = Buffer.concat(chunks);
    if (removed > 0) {
        console.log(`[+] Stripped video zero-stuffing: ${removed} bytes in ${gaps} gap(s) ` +
                    `(${videoES.length} -> ${out.length})`);
    }
    return out;
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
 * Build MPEG-1 PS matching DealerDemo / attract.mpg structure:
 *   - One PES per pack
 *   - All PES optional headers: ff 0f (no timestamps)
 *   - Full packs = 2048; trailing packs may be short (never zero-pad ES)
 *   - 3 audio pre-fill packs, then 1 audio per ~N video packs
 *   - No BB system header; no ISO_11172_end (B9)
 */
function buildWebTVPS(videoES, audioES, outputPath, audioIntervalOverride, baHeaderMode) {
    console.log('[*] Building WebTV MPEG-1 PS...');

    const P = DATA_PER_PACK; // 2028

    const baHdr = baHeaderMode === 'attract' ? BA_HDR_ATTRACT : BA_HDR_MPEG1;

    /**
     * @param {number} streamId
     * @param {Buffer} data  ES payload (<= P)
     * @param {boolean} allowShort  true only for the final pack in the file
     */
    function makePack(streamId, data) {
        // DealerDemo: always `ff 0f` (1 stuffing byte). Short packs are OK (even
        // mid-stream — attract has a short C0 before the final E0s). Never pad
        // short payloads with bulk PES 0xFF (breaks WebTV) or ES zeros.
        const payload = data.length > P ? data.subarray(0, P) : data;
        const stuffingCount = 1;
        const pktLen = stuffingCount + 1 + payload.length;
        const header = Buffer.alloc(6 + stuffingCount + 1);
        header[0] = 0x00; header[1] = 0x00; header[2] = 0x01; header[3] = streamId;
        header[4] = (pktLen >> 8) & 0xFF;
        header[5] = pktLen & 0xFF;
        header.fill(0xFF, 6, 6 + stuffingCount);
        header[6 + stuffingCount] = 0x0F;

        return Buffer.concat([baHdr, header, payload]);
    }

    // 2028-byte chunks; trailing short chunk of each ES is kept (attract allows
    // a short C0 mid-stream, not only as the final pack).
    const vChunks = [];
    for (let i = 0; i < videoES.length; i += P) {
        vChunks.push(videoES.subarray(i, Math.min(i + P, videoES.length)));
    }
    const aChunks = [];
    for (let i = 0; i < audioES.length; i += P) {
        aChunks.push(audioES.subarray(i, Math.min(i + P, audioES.length)));
    }

    if (!vChunks.length || !aChunks.length) {
        console.error('[!] Empty video or audio stream');
        return false;
    }

    const plan = [];
    let aIdx = 0;
    let vIdx = 0;

    // Pre-fill: 3 audio packs to prime the WebTV audio buffer (matches attract.mpg).
    const preFill = Math.min(3, aChunks.length);
    for (let k = 0; k < preFill; k++, aIdx++) {
        plan.push({ sid: 0xC0, data: aChunks[aIdx] });
    }

    const vTotal = videoES.length;
    const aTotal = audioES.length;
    const ratio = aTotal ? (vTotal / aTotal) : 0;
    let vSent = 0;
    let aSent = 0;
    for (let k = 0; k < preFill; k++) aSent += aChunks[k].length;

    if (Number.isFinite(audioIntervalOverride) && audioIntervalOverride > 0) {
        const audioInterval = Math.max(1, Math.floor(audioIntervalOverride));
        console.log(`[*] ${vChunks.length} video chunks, ${aChunks.length} audio chunks, ` +
                    `prefill=${preFill}, fixed 1 audio per ${audioInterval} video`);
        while (vIdx < vChunks.length || aIdx < aChunks.length) {
            for (let k = 0; k < audioInterval && vIdx < vChunks.length; k++) {
                plan.push({ sid: 0xE0, data: vChunks[vIdx++] });
            }
            if (aIdx < aChunks.length) {
                plan.push({ sid: 0xC0, data: aChunks[aIdx++] });
            }
        }
    } else {
        console.log(`[*] ${vChunks.length} video chunks, ${aChunks.length} audio chunks, ` +
                    `prefill=${preFill}, byte-ratio mux (V:A=${ratio.toFixed(2)})`);
        while (vIdx < vChunks.length || aIdx < aChunks.length) {
            const audioLeft = aIdx < aChunks.length;
            const videoLeft = vIdx < vChunks.length;
            const audioBehind = audioLeft && (!videoLeft || (aSent * vTotal <= vSent * aTotal));
            if (audioBehind) {
                plan.push({ sid: 0xC0, data: aChunks[aIdx] });
                aSent += aChunks[aIdx].length;
                aIdx++;
            } else if (videoLeft) {
                plan.push({ sid: 0xE0, data: vChunks[vIdx] });
                vSent += vChunks[vIdx].length;
                vIdx++;
            } else {
                break;
            }
        }
    }

    const packs = plan.map((item) => makePack(item.sid, item.data));

    // Sequence_end (B7) is already in the video ES. Do not append ISO end B9 —
    // no known-good VideoFlash title uses 0xB9.
    const output = Buffer.concat(packs);

    fs.writeFileSync(outputPath, output);
    const shortCount = packs.filter(p => p.length !== PACK_SIZE).length;
    console.log(`[+] Wrote ${packs.length} packs (${output.length} bytes` +
                (shortCount ? `, ${shortCount} short trailing pack(s)` : '') + ')');
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
    let hasB9 = false;
    let hasB7 = false;
    let hasBB = false;
    for (let i = 0; i < d.length - 3; i++) {
        if (d[i] === 0x00 && d[i + 1] === 0x00 && d[i + 2] === 0x01) {
            const sid = d[i + 3];
            if (sid === 0xBA) {
                baPos.push(i);
                i += 3;
            } else if (sid === 0xB9) {
                hasB9 = true;
            } else if (sid === 0xB7) {
                hasB7 = true;
            } else if (sid === 0xBB) {
                hasBB = true;
            }
        }
    }
    if (baPos.length < 2) {
        console.error('[!] Less than 2 BA packs found');
        return false;
    }

    let ok = true;
    // DealerDemo mostly uses 2048-byte packs, but short packs mid-stream are legal
    // (attract has a short C0 before the final video packs). Only reject oversize.
    let shortInternal = 0;
    for (let i = 0; i < baPos.length - 1; i++) {
        const stride = baPos[i + 1] - baPos[i];
        if (stride > PACK_SIZE) {
            console.log(`[!] Oversized pack stride at #${i}: ${stride}`);
            ok = false;
        } else if (stride < PACK_SIZE) {
            shortInternal++;
        }
    }
    const lastLen = d.length - baPos[baPos.length - 1];
    if (lastLen > PACK_SIZE) {
        console.log(`[!] Final pack too large: ${lastLen}`);
        ok = false;
    } else {
        console.log(`[+] ${baPos.length} packs` +
            (shortInternal ? `, ${shortInternal} short mid-stream` : '') +
            (lastLen < PACK_SIZE ? `, final short (${lastLen} B)` : '') +
            ' — OK');
    }

    if (hasB9) {
        console.log('[!] Found ISO end code 0xB9 (known-good titles never use this)');
        ok = false;
    }
    if (hasBB) {
        console.log('[!] Found system header 0xBB (known-good titles omit this)');
        ok = false;
    }
    if (hasB7) console.log('[+] Found sequence_end 0xB7');
    else console.log('[!] Missing sequence_end 0xB7');

    return ok;
}


/**
 * Encode video to WebTV-compatible MPEG-1 PS.
 *
 * @param {string} inputFile   Any video file ffmpeg can read
 * @param {string} outputFile  Output .mpg path
 * @param {number|null} duration  Optional clip length in seconds
 */
function buildFfmpegCmd(inputFile, tmpFile, duration, audioEncoder, withNoise) {
    // Attract is ~7:1 V:A with real coded bits (no CBR zero-pad, no heavy PES stuffing).
    // Never use -minrate — VidFlash rejects ES zero pads.
    const vf = withNoise
        ? 'fps=15,scale=272:208,setsar=1,noise=alls=6:allf=t+u'
        : 'fps=15,scale=272:208,setsar=1';
    const cmd = ['ffmpeg', '-y', '-i', inputFile];
    if (duration !== undefined && duration !== null) cmd.push('-t', String(duration));
    cmd.push(
        '-vf', vf,
        '-c:v', 'mpeg1video',
        '-b:v', '600k',
        '-maxrate', '800k',
        '-bufsize', '400k',
        '-g', '900',
        '-keyint_min', '900',
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
    return cmd;
}

function encodeWebTV(inputFile, outputFile, duration, audioIntervalOverride, baHeaderMode, audioEncoder, audioESOverridePath) {
    const tmpFile = outputFile.replace(/(\.[^.]+)$/, '_raw$1');

    // Step 1: Encode with ffmpeg (MPEG-1 video + MP2 audio, raw mux)
    if (!runCmd(buildFfmpegCmd(inputFile, tmpFile, duration, audioEncoder, false),
        'Encoding with ffmpeg (MPEG-1 PS)')) return false;

    // Step 2: Extract ES using structure-aware pack walk
    let { videoES, audioES } = extractES(tmpFile);
    if (!videoES.length || !audioES.length) {
        console.error('[!] Failed to extract elementary streams');
        return false;
    }

    // Soft/simple sources under-shoot -b:v (~1.8:1). Attract is ~7:1. Re-encode once
    // with light noise so we get real coded bits (not CBR zeros, not PES stuffing).
    if (audioES.length && videoES.length / audioES.length < 4) {
        console.log(`[!] V:A=${(videoES.length / audioES.length).toFixed(2)} too low; ` +
                    're-encoding with noise to raise video bitrate...');
        if (!runCmd(buildFfmpegCmd(inputFile, tmpFile, duration, audioEncoder, true),
            'Re-encoding with noise (MPEG-1 PS)')) return false;
        ({ videoES, audioES } = extractES(tmpFile));
        if (!videoES.length || !audioES.length) {
            console.error('[!] Failed to extract elementary streams after re-encode');
            return false;
        }
        console.log(`[+] After noise re-encode: V:A=${(videoES.length / audioES.length).toFixed(2)}`);
    }

    // Step 3: Patch sequence header(s) to attract template, strip repeats so the
    // ES has a single B3 + single B8 (matches DealerDemo), then append B7.
    let videoMut = Buffer.from(videoES);
    patchSequenceHeaders(videoMut);
    videoMut = stripRepeatSeqAndGopHeaders(videoMut);
    videoMut = stripVideoZeroStuffing(videoMut);
    videoMut = appendSequenceEnd(videoMut, 2);

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


/**
 * Remux raw elementary streams with our packer (no ffmpeg). Used for A/V bisects.
 * @param {boolean} patchVideo  when false, leave video ES bytes untouched
 */
function remuxWebTV(videoESPath, audioESPath, outputFile, audioIntervalOverride, baHeaderMode, patchVideo) {
    if (!fs.existsSync(videoESPath) || !fs.existsSync(audioESPath)) {
        console.error('[!] --video-es / --audio-es file missing');
        return false;
    }
    let videoMut = Buffer.from(fs.readFileSync(videoESPath));
    let audioMut = Buffer.from(fs.readFileSync(audioESPath));
    console.log(`[*] Remux ES: video=${videoMut.length} audio=${audioMut.length} patchVideo=${patchVideo}`);

    if (patchVideo) {
        patchSequenceHeaders(videoMut);
        videoMut = stripRepeatSeqAndGopHeaders(videoMut);
        videoMut = stripVideoZeroStuffing(videoMut);
        videoMut = appendSequenceEnd(videoMut, 2);
    }
    normalizeMP2Headers(audioMut);

    if (!buildWebTVPS(videoMut, audioMut, outputFile, audioIntervalOverride, baHeaderMode)) return false;
    if (!verifyFile(outputFile)) return false;
    checkPacks(outputFile);
    console.log(`\n[+] Successfully remuxed: ${outputFile}`);
    return true;
}


// --- CLI entry point ---
const args = process.argv.slice(2);
if (args.length < 2) {
    const script = path.basename(process.argv[1]);
    console.error(`Usage: node ${script} <input_video> <output.mpg> [duration_seconds]`);
    console.error(`       node ${script} --remux <output.mpg> --video-es V.es --audio-es A.es`);
    console.error(`Example: node ${script} myvideo.mp4 webtv.mpg 15`);
    process.exit(1);
}

let audioIntervalOverride = null;
// Default to attract-style BA header (matches every DealerDemo title family)
let baHeaderMode = 'attract';
let audioEncoder = 'mp2fixed';
let audioESOverridePath = null;
let videoESPath = null;
let remuxMode = false;
let patchVideo = true;
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
    } else if (args[i] === '--video-es' && i + 1 < args.length) {
        videoESPath = args[i + 1];
        i++;
    } else if (args[i] === '--remux') {
        remuxMode = true;
    } else if (args[i] === '--no-patch-video') {
        patchVideo = false;
    } else {
        nonFlagArgs.push(args[i]);
    }
}

if (remuxMode) {
    const outputFile = nonFlagArgs[0];
    if (!outputFile || !videoESPath || !audioESOverridePath) {
        console.error('[!] Remux requires: --remux <output.mpg> --video-es V.es --audio-es A.es');
        process.exit(1);
    }
    if (!remuxWebTV(videoESPath, audioESOverridePath, outputFile, audioIntervalOverride, baHeaderMode, patchVideo)) {
        process.exit(1);
    }
} else {
    const [inputFile, outputFile, durationArg] = nonFlagArgs;
    const duration = (durationArg !== undefined && durationArg !== null) ? parseFloat(durationArg) : null;

    if (!fs.existsSync(inputFile)) {
        console.error(`[!] Input file not found: ${inputFile}`);
        process.exit(1);
    }

    if (!encodeWebTV(inputFile, outputFile, duration, audioIntervalOverride, baHeaderMode, audioEncoder, audioESOverridePath)) {
        process.exit(1);
    }
}
