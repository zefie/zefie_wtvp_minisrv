// rpcli.cpp - Minimal RealAudio 5/6 (G2) CLI encoder using RealProducer ActiveX
// Build (MSVC example):
//   cl rpcli.cpp /EHsc /D_CRT_SECURE_NO_WARNINGS ole32.lib oleaut32.lib
//
// You must also #import the RealProducer control type library (prct3260.ocx).
// Adjust the path below to wherever the control is registered/installed.

#ifndef __cplusplus
#error rpcli.cpp uses C++ COM features (#import, __uuidof). Compile with MSVC C++.
#endif

#define COBJMACROS
#include <windows.h>
#include <ole2.h>
#include <oleauto.h>
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <string.h>

#import "prct3260.ocx" no_namespace named_guids raw_interfaces_only

#define MINIMP3_IMPLEMENTATION
#include "minimp3.h"

static void die(const char *msg);
static void cleanup_temp_input(void);

static char g_temp_input_path[MAX_PATH] = {0};

static BSTR ansi_to_bstr(const char *s) {
    int wlen;
    BSTR b;
    if (!s) {
        return NULL;
    }

    wlen = MultiByteToWideChar(CP_ACP, 0, s, -1, NULL, 0);
    if (wlen <= 0) {
        return NULL;
    }

    b = SysAllocStringLen(NULL, (UINT)(wlen - 1));
    if (!b) {
        return NULL;
    }

    if (MultiByteToWideChar(CP_ACP, 0, s, -1, b, wlen) <= 0) {
        SysFreeString(b);
        return NULL;
    }

    return b;
}

static void bstr_to_ansi(BSTR b, char *buf, size_t bufSize) {
    if (!buf || bufSize == 0) {
        return;
    }

    buf[0] = '\0';
    if (!b) {
        return;
    }

    WideCharToMultiByte(CP_ACP, 0, b, -1, buf, (int)bufSize, NULL, NULL);
}

static void pump_pending_messages(void) {
    MSG msg;

    while (PeekMessage(&msg, NULL, 0, 0, PM_REMOVE)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }
}

static void die_last_error(IProducerControl *ctl, const char *fallback) {
    long lastError = 0;
    BSTR errorText = NULL;
    char buf[512];

    if (!ctl) {
        die(fallback);
    }

    if (FAILED(ctl->get_LastError(&lastError)) || lastError == 0) {
        die(fallback);
    }

    if (SUCCEEDED(ctl->GetErrorString(lastError, &errorText)) && errorText) {
        bstr_to_ansi(errorText, buf, sizeof(buf));
        SysFreeString(errorText);
        fprintf(stderr, "error: %s (code=%ld)\n", buf[0] ? buf : fallback, lastError);
    } else {
        fprintf(stderr, "error: %s (code=%ld)\n", fallback, lastError);
    }

    cleanup_temp_input();
    ExitProcess(1);
}

// Simple helper: print and exit
static void die(const char *msg) {
    fprintf(stderr, "error: %s\n", msg);
    cleanup_temp_input();
    ExitProcess(1);
}

static void cleanup_temp_input(void) {
    if (g_temp_input_path[0]) {
        DeleteFileA(g_temp_input_path);
        g_temp_input_path[0] = '\0';
    }
}

static const char *path_ext(const char *path) {
    const char *dot;

    if (!path) {
        return NULL;
    }

    dot = strrchr(path, '.');
    return dot ? dot : NULL;
}

static int is_mpeg_audio_input(const char *path) {
    const char *ext = path_ext(path);

    if (!ext) {
        return 0;
    }

    return _stricmp(ext, ".mp1") == 0 ||
           _stricmp(ext, ".mp2") == 0 ||
           _stricmp(ext, ".mp3") == 0;
}

static int is_wav_input(const char *path) {
    const char *ext = path_ext(path);

    if (!ext) {
        return 0;
    }

    return _stricmp(ext, ".wav") == 0;
}

static double gain_db_to_scale(double gainDb) {
    return pow(10.0, gainDb / 20.0);
}

static int parse_gain_db(const char *s, double *gainDbOut) {
    char *end = NULL;
    double value;

    if (!s || !*s || !gainDbOut) {
        return 0;
    }

    value = strtod(s, &end);
    if (!end || *end != '\0') {
        return 0;
    }

    *gainDbOut = value;
    return 1;
}

static short apply_gain_sample(short sample, double gainScale) {
    double scaled = (double)sample * gainScale;
    if (scaled > 32767.0) {
        return 32767;
    }
    if (scaled < -32768.0) {
        return -32768;
    }
    return (short)(scaled >= 0.0 ? scaled + 0.5 : scaled - 0.5);
}

static void write_u16le(unsigned char *dst, unsigned value) {
    dst[0] = (unsigned char)(value & 0xffu);
    dst[1] = (unsigned char)((value >> 8) & 0xffu);
}

static void write_u32le(unsigned char *dst, unsigned value) {
    dst[0] = (unsigned char)(value & 0xffu);
    dst[1] = (unsigned char)((value >> 8) & 0xffu);
    dst[2] = (unsigned char)((value >> 16) & 0xffu);
    dst[3] = (unsigned char)((value >> 24) & 0xffu);
}

static void fill_wav_header(unsigned char *header,
                            unsigned dataBytes,
                            int sampleRate,
                            int channels,
                            int bitsPerSample) {
    unsigned byteRate = (unsigned)(sampleRate * channels * bitsPerSample / 8);
    unsigned blockAlign = (unsigned)(channels * bitsPerSample / 8);

    memcpy(header + 0, "RIFF", 4);
    write_u32le(header + 4, 36u + dataBytes);
    memcpy(header + 8, "WAVE", 4);
    memcpy(header + 12, "fmt ", 4);
    write_u32le(header + 16, 16u);
    write_u16le(header + 20, 1u);
    write_u16le(header + 22, (unsigned)channels);
    write_u32le(header + 24, (unsigned)sampleRate);
    write_u32le(header + 28, byteRate);
    write_u16le(header + 32, blockAlign);
    write_u16le(header + 34, (unsigned)bitsPerSample);
    memcpy(header + 36, "data", 4);
    write_u32le(header + 40, dataBytes);
}

static unsigned char *read_entire_file(const char *path, size_t *sizeOut) {
    FILE *fp;
    unsigned char *data;
    __int64 fileSize;

    if (!sizeOut) {
        return NULL;
    }

    *sizeOut = 0;
    fp = fopen(path, "rb");
    if (!fp) {
        return NULL;
    }

    if (_fseeki64(fp, 0, SEEK_END) != 0) {
        fclose(fp);
        return NULL;
    }

    fileSize = _ftelli64(fp);
    if (fileSize < 0) {
        fclose(fp);
        return NULL;
    }

    if (_fseeki64(fp, 0, SEEK_SET) != 0) {
        fclose(fp);
        return NULL;
    }

    data = (unsigned char *)malloc((size_t)fileSize);
    if (!data) {
        fclose(fp);
        return NULL;
    }

    if (fileSize > 0 && fread(data, 1, (size_t)fileSize, fp) != (size_t)fileSize) {
        free(data);
        fclose(fp);
        return NULL;
    }

    fclose(fp);
    *sizeOut = (size_t)fileSize;
    return data;
}

static int make_temp_wav_path(char *pathBuf, size_t pathBufSize) {
    char tempDir[MAX_PATH];
    char tempFile[MAX_PATH];
    char *dot;

    if (!pathBuf || pathBufSize < MAX_PATH) {
        return 0;
    }

    if (!GetTempPathA((DWORD)sizeof(tempDir), tempDir)) {
        return 0;
    }

    if (!GetTempFileNameA(tempDir, "rpc", 0, tempFile)) {
        return 0;
    }

    DeleteFileA(tempFile);
    dot = strrchr(tempFile, '.');
    if (dot) {
        strcpy(dot, ".wav");
    }

    strcpy(pathBuf, tempFile);
    return 1;
}

static int decode_mpeg_audio_to_wav(const char *inputPath,
                                    char *outputPath,
                                    size_t outputPathSize,
                                    double gainScale) {
    unsigned char *inputData = NULL;
    size_t inputSize = 0;
    mp3dec_t dec;
    size_t pos = 0;
    FILE *out = NULL;
    unsigned char wavHeader[44] = {0};
    unsigned dataBytes = 0;
    int sampleRate = 0;
    int channels = 0;
    int haveAudio = 0;

    if (!make_temp_wav_path(outputPath, outputPathSize)) {
        return 0;
    }

    inputData = read_entire_file(inputPath, &inputSize);
    if (!inputData) {
        return 0;
    }

    out = fopen(outputPath, "wb");
    if (!out) {
        free(inputData);
        return 0;
    }

    if (fwrite(wavHeader, 1, sizeof(wavHeader), out) != sizeof(wavHeader)) {
        fclose(out);
        DeleteFileA(outputPath);
        free(inputData);
        return 0;
    }

    mp3dec_init(&dec);
    while (pos < inputSize) {
        mp3dec_frame_info_t info;
        mp3d_sample_t pcm[MINIMP3_MAX_SAMPLES_PER_FRAME];
        int samples = mp3dec_decode_frame(&dec, inputData + pos, (int)(inputSize - pos), pcm, &info);

        if (info.frame_bytes <= 0) {
            ++pos;
            continue;
        }

        pos += (size_t)info.frame_bytes;
        if (samples <= 0) {
            continue;
        }

        if (!haveAudio) {
            sampleRate = info.hz;
            channels = info.channels;
            haveAudio = 1;
        } else if (sampleRate != info.hz || channels != info.channels) {
            fclose(out);
            DeleteFileA(outputPath);
            free(inputData);
            die("mpeg input changed sample rate or channel count mid-stream");
        }

        if (gainScale != 1.0) {
            int sampleIndex;
            for (sampleIndex = 0; sampleIndex < samples; ++sampleIndex) {
                pcm[sampleIndex] = apply_gain_sample(pcm[sampleIndex], gainScale);
            }
        }

        if (fwrite(pcm, sizeof(mp3d_sample_t), (size_t)samples, out) != (size_t)samples) {
            fclose(out);
            DeleteFileA(outputPath);
            free(inputData);
            return 0;
        }
        dataBytes += (unsigned)(samples * sizeof(mp3d_sample_t));
    }

    free(inputData);

    if (!haveAudio) {
        fclose(out);
        DeleteFileA(outputPath);
        return 0;
    }

    fill_wav_header(wavHeader, dataBytes, sampleRate, channels, 16);
    if (fseek(out, 0, SEEK_SET) != 0 || fwrite(wavHeader, 1, sizeof(wavHeader), out) != sizeof(wavHeader)) {
        fclose(out);
        DeleteFileA(outputPath);
        return 0;
    }

    fclose(out);
    return 1;
}

static int find_wav_data_chunk(const unsigned char *data,
                               size_t size,
                               size_t *fmtOffset,
                               unsigned *fmtSize,
                               size_t *dataOffset,
                               unsigned *dataSize) {
    size_t pos = 12;

    if (!data || size < 44 || memcmp(data, "RIFF", 4) != 0 || memcmp(data + 8, "WAVE", 4) != 0) {
        return 0;
    }

    *fmtOffset = 0;
    *fmtSize = 0;
    *dataOffset = 0;
    *dataSize = 0;

    while (pos + 8 <= size) {
        unsigned chunkSize = (unsigned)data[pos + 4] |
                             ((unsigned)data[pos + 5] << 8) |
                             ((unsigned)data[pos + 6] << 16) |
                             ((unsigned)data[pos + 7] << 24);
        size_t chunkData = pos + 8;

        if (chunkData + chunkSize > size) {
            return 0;
        }

        if (memcmp(data + pos, "fmt ", 4) == 0) {
            *fmtOffset = chunkData;
            *fmtSize = chunkSize;
        } else if (memcmp(data + pos, "data", 4) == 0) {
            *dataOffset = chunkData;
            *dataSize = chunkSize;
        }

        pos = chunkData + chunkSize + (chunkSize & 1u);
    }

    return *fmtOffset != 0 && *dataOffset != 0;
}

static int rewrite_wav_with_gain(const char *inputPath,
                                 char *outputPath,
                                 size_t outputPathSize,
                                 double gainScale) {
    unsigned char *data = NULL;
    size_t size = 0;
    size_t fmtOffset;
    unsigned fmtSize;
    size_t dataOffset;
    unsigned dataSize;
    unsigned short formatTag;
    unsigned short channels;
    unsigned sampleRate;
    unsigned short bitsPerSample;
    FILE *out = NULL;
    unsigned char header[44] = {0};
    unsigned sampleCount;
    unsigned i;

    if (!make_temp_wav_path(outputPath, outputPathSize)) {
        return 0;
    }

    data = read_entire_file(inputPath, &size);
    if (!data) {
        return 0;
    }

    if (!find_wav_data_chunk(data, size, &fmtOffset, &fmtSize, &dataOffset, &dataSize) || fmtSize < 16) {
        free(data);
        return 0;
    }

    formatTag = (unsigned short)(data[fmtOffset] | (data[fmtOffset + 1] << 8));
    channels = (unsigned short)(data[fmtOffset + 2] | (data[fmtOffset + 3] << 8));
    sampleRate = (unsigned)data[fmtOffset + 4] |
                 ((unsigned)data[fmtOffset + 5] << 8) |
                 ((unsigned)data[fmtOffset + 6] << 16) |
                 ((unsigned)data[fmtOffset + 7] << 24);
    bitsPerSample = (unsigned short)(data[fmtOffset + 14] | (data[fmtOffset + 15] << 8));

    if (formatTag != 1 || bitsPerSample != 16 || channels == 0) {
        free(data);
        return 0;
    }

    out = fopen(outputPath, "wb");
    if (!out) {
        free(data);
        return 0;
    }

    fill_wav_header(header, dataSize, (int)sampleRate, (int)channels, 16);
    if (fwrite(header, 1, sizeof(header), out) != sizeof(header)) {
        fclose(out);
        DeleteFileA(outputPath);
        free(data);
        return 0;
    }

    sampleCount = dataSize / 2u;
    for (i = 0; i < sampleCount; ++i) {
        short sample = (short)((unsigned short)data[dataOffset + i * 2] |
                               ((unsigned short)data[dataOffset + i * 2 + 1] << 8));
        short scaled = apply_gain_sample(sample, gainScale);
        unsigned char outBytes[2];
        outBytes[0] = (unsigned char)(scaled & 0xff);
        outBytes[1] = (unsigned char)(((unsigned short)scaled >> 8) & 0xff);
        if (fwrite(outBytes, 1, 2, out) != 2) {
            fclose(out);
            DeleteFileA(outputPath);
            free(data);
            return 0;
        }
    }

    fclose(out);
    free(data);
    return 1;
}

// Map rating string to something we can store as a property
static const char *rating_to_str(const char *r) {
    if (_stricmp(r, "G")  == 0) return "G";
    if (_stricmp(r, "PG") == 0) return "PG";
    if (_stricmp(r, "R")  == 0) return "R";
    if (_stricmp(r, "X")  == 0) return "X";
    return NULL;
}

// Mode → AUDIO_CONTENT_* (from docs)
static AUDIO_CONTENT mode_to_audio_content(const char *m) {
    // These constants come from the RealProducer type library.
    // You’ll need to confirm exact values in the imported header:
    //   AUDIO_CONTENT_VOICE, AUDIO_CONTENT_VOICE_OVER_MUSIC, AUDIO_CONTENT_MUSIC, AUDIO_CONTENT_STEREO, etc.
    if (_stricmp(m, "voice") == 0)      return AUDIO_CONTENT_VOICE;
    if (_stricmp(m, "voice-bgm") == 0)  return AUDIO_CONTENT_VOICE_BACKGROUND;
    if (_stricmp(m, "stereo") == 0)     return AUDIO_CONTENT_MUSIC_STEREO;
    // default: music
    return AUDIO_CONTENT_MUSIC;
}

// Target → TARGET_* + TargetXXModem property
typedef enum {
    TGT_WEBTV,
    TGT_56K,
    TGT_ISDN,
    TGT_CABLE,
    TGT_PC
} target_t;

typedef struct {
    ICodecCookie *cookie;
    AUDIO_CONTENT content;
    long codecId;
    long flavorId;
    char name[512];
} selected_codec_t;

typedef struct {
    char title[256];
    char artist[256];
    char album[256];
    char year[64];
    char genre[128];
    char comment[512];
    char copyright[256];
} id3_metadata_t;

static target_t parse_target(const char *s) {
    if (!s) return TGT_WEBTV;
    if (_stricmp(s, "WebTV") == 0) return TGT_WEBTV;
    if (_stricmp(s, "56k")   == 0) return TGT_56K;
    if (_stricmp(s, "ISDN")  == 0) return TGT_ISDN;
    if (_stricmp(s, "Cable") == 0) return TGT_CABLE;
    if (_stricmp(s, "PC")    == 0) return TGT_PC;
    return TGT_WEBTV;
}

static TARGET_AUDIENCE target_to_audience(target_t tgt) {
    switch (tgt) {
    case TGT_WEBTV:
        return TARGET_28_MODEM;
    case TGT_56K:
        return TARGET_56_MODEM;
    case TGT_ISDN:
        return TARGET_SINGLE_ISDN;
    case TGT_CABLE:
        return TARGET_LAN_LOW;
    case TGT_PC:
        return TARGET_LAN_HIGH;
    }

    return TARGET_28_MODEM;
}

static AUDIO_CONTENT codec_name_to_audio_content(const char *name) {
    if (!name) {
        return AUDIO_CONTENT_MUSIC;
    }
    if (strstr(name, "Stereo") != NULL) {
        return AUDIO_CONTENT_MUSIC_STEREO;
    }
    if (strstr(name, "Music") != NULL) {
        return AUDIO_CONTENT_MUSIC;
    }
    return AUDIO_CONTENT_VOICE;
}

static int parse_codec_index(const char *s) {
    char *end = NULL;
    long value;

    if (!s || !*s) {
        return -1;
    }

    value = strtol(s, &end, 10);
    if (!end || *end != '\0' || value < 0 || value > 0x7fffffffL) {
        return -1;
    }

    return (int)value;
}

static void trim_trailing_space(char *s) {
    size_t len;

    if (!s) {
        return;
    }

    len = strlen(s);
    while (len > 0) {
        char ch = s[len - 1];
        if (ch != ' ' && ch != '\t' && ch != '\r' && ch != '\n' && ch != '\0') {
            break;
        }
        s[len - 1] = '\0';
        --len;
    }
}

static void copy_latin1_text(char *dst, size_t dstSize, const unsigned char *src, size_t srcSize) {
    size_t i;
    size_t out = 0;

    if (!dst || dstSize == 0) {
        return;
    }

    dst[0] = '\0';
    if (!src || srcSize == 0) {
        return;
    }

    for (i = 0; i < srcSize && out + 1 < dstSize; ++i) {
        unsigned char ch = src[i];
        if (ch == 0) {
            break;
        }
        dst[out++] = (char)ch;
    }
    dst[out] = '\0';
    trim_trailing_space(dst);
}

static void copy_utf16_text(char *dst, size_t dstSize, const unsigned char *src, size_t srcSize, int bigEndian) {
    wchar_t *wideBuf;
    size_t chars;
    size_t i;

    if (!dst || dstSize == 0) {
        return;
    }

    dst[0] = '\0';
    if (!src || srcSize < 2) {
        return;
    }

    chars = srcSize / 2;
    wideBuf = (wchar_t *)malloc((chars + 1) * sizeof(wchar_t));
    if (!wideBuf) {
        return;
    }

    for (i = 0; i < chars; ++i) {
        unsigned value;
        if (bigEndian) {
            value = ((unsigned)src[i * 2] << 8) | (unsigned)src[i * 2 + 1];
        } else {
            value = (unsigned)src[i * 2] | ((unsigned)src[i * 2 + 1] << 8);
        }
        wideBuf[i] = (wchar_t)value;
        if (value == 0) {
            chars = i;
            break;
        }
    }
    wideBuf[chars] = L'\0';

    WideCharToMultiByte(CP_ACP, 0, wideBuf, -1, dst, (int)dstSize, NULL, NULL);
    trim_trailing_space(dst);
    free(wideBuf);
}

static void decode_id3_text_payload(const unsigned char *src, size_t srcSize, char *dst, size_t dstSize) {
    unsigned char enc;

    if (!dst || dstSize == 0) {
        return;
    }

    dst[0] = '\0';
    if (!src || srcSize == 0) {
        return;
    }

    enc = src[0];
    src += 1;
    srcSize -= 1;

    switch (enc) {
    case 0:
    case 3:
        copy_latin1_text(dst, dstSize, src, srcSize);
        break;
    case 1:
        if (srcSize >= 2 && src[0] == 0xFE && src[1] == 0xFF) {
            copy_utf16_text(dst, dstSize, src + 2, srcSize - 2, 1);
        } else if (srcSize >= 2 && src[0] == 0xFF && src[1] == 0xFE) {
            copy_utf16_text(dst, dstSize, src + 2, srcSize - 2, 0);
        } else {
            copy_utf16_text(dst, dstSize, src, srcSize, 0);
        }
        break;
    case 2:
        copy_utf16_text(dst, dstSize, src, srcSize, 1);
        break;
    default:
        break;
    }
}

static unsigned read_synchsafe32(const unsigned char *src) {
    return ((unsigned)(src[0] & 0x7f) << 21) |
           ((unsigned)(src[1] & 0x7f) << 14) |
           ((unsigned)(src[2] & 0x7f) << 7) |
           (unsigned)(src[3] & 0x7f);
}

static unsigned read_be32(const unsigned char *src) {
    return ((unsigned)src[0] << 24) |
           ((unsigned)src[1] << 16) |
           ((unsigned)src[2] << 8) |
           (unsigned)src[3];
}

static void assign_if_empty(char *dst, size_t dstSize, const char *src) {
    if (!dst || dstSize == 0 || !src || !src[0] || dst[0]) {
        return;
    }
    strncpy(dst, src, dstSize - 1);
    dst[dstSize - 1] = '\0';
}

static void parse_id3v1_tag(const unsigned char *data, size_t size, id3_metadata_t *meta) {
    if (!data || size < 128 || !meta) {
        return;
    }

    if (memcmp(data + size - 128, "TAG", 3) != 0) {
        return;
    }

    assign_if_empty(meta->title, sizeof(meta->title), "");
    copy_latin1_text(meta->title, sizeof(meta->title), data + size - 125, 30);
    copy_latin1_text(meta->artist, sizeof(meta->artist), data + size - 95, 30);
    copy_latin1_text(meta->album, sizeof(meta->album), data + size - 65, 30);
    copy_latin1_text(meta->year, sizeof(meta->year), data + size - 35, 4);
    copy_latin1_text(meta->comment, sizeof(meta->comment), data + size - 31, 30);
}

static void parse_id3v2_comment(const unsigned char *payload, size_t payloadSize, char *dst, size_t dstSize) {
    unsigned char enc;
    size_t offset;

    if (!payload || payloadSize < 5) {
        return;
    }

    enc = payload[0];
    offset = 4;

    if (enc == 0 || enc == 3) {
        while (offset < payloadSize && payload[offset] != 0) {
            ++offset;
        }
        if (offset < payloadSize) {
            ++offset;
        }
    } else {
        while (offset + 1 < payloadSize && (payload[offset] != 0 || payload[offset + 1] != 0)) {
            offset += 2;
        }
        if (offset + 1 < payloadSize) {
            offset += 2;
        }
    }

    if (offset < payloadSize) {
        unsigned char *tmp = (unsigned char *)malloc(payloadSize - offset + 1);
        if (!tmp) {
            return;
        }
        tmp[0] = enc;
        memcpy(tmp + 1, payload + offset, payloadSize - offset);
        decode_id3_text_payload(tmp, payloadSize - offset + 1, dst, dstSize);
        free(tmp);
    }
}

static void parse_id3v2_tag(const unsigned char *data, size_t size, id3_metadata_t *meta) {
    unsigned version;
    unsigned flags;
    size_t tagSize;
    size_t pos;

    if (!data || size < 10 || !meta) {
        return;
    }

    if (memcmp(data, "ID3", 3) != 0) {
        return;
    }

    version = data[3];
    flags = data[5];
    tagSize = read_synchsafe32(data + 6);
    pos = 10;

    if ((flags & 0x40) != 0 && size >= pos + 4) {
        unsigned extSize = version == 4 ? read_synchsafe32(data + pos) : read_be32(data + pos);
        pos += extSize;
    }

    while (pos + 10 <= size && pos < tagSize + 10) {
        char frameId[5];
        unsigned frameSize;
        const unsigned char *payload;

        memcpy(frameId, data + pos, 4);
        frameId[4] = '\0';
        if (frameId[0] == 0) {
            break;
        }

        frameSize = version == 4 ? read_synchsafe32(data + pos + 4) : read_be32(data + pos + 4);
        pos += 10;
        if (frameSize == 0 || pos + frameSize > size) {
            break;
        }

        payload = data + pos;
        if (strcmp(frameId, "TIT2") == 0) {
            decode_id3_text_payload(payload, frameSize, meta->title, sizeof(meta->title));
        } else if (strcmp(frameId, "TPE1") == 0) {
            decode_id3_text_payload(payload, frameSize, meta->artist, sizeof(meta->artist));
        } else if (strcmp(frameId, "TALB") == 0) {
            decode_id3_text_payload(payload, frameSize, meta->album, sizeof(meta->album));
        } else if (strcmp(frameId, "TYER") == 0 || strcmp(frameId, "TDRC") == 0) {
            decode_id3_text_payload(payload, frameSize, meta->year, sizeof(meta->year));
        } else if (strcmp(frameId, "TCON") == 0) {
            decode_id3_text_payload(payload, frameSize, meta->genre, sizeof(meta->genre));
        } else if (strcmp(frameId, "TCOP") == 0) {
            decode_id3_text_payload(payload, frameSize, meta->copyright, sizeof(meta->copyright));
        } else if (strcmp(frameId, "COMM") == 0) {
            parse_id3v2_comment(payload, frameSize, meta->comment, sizeof(meta->comment));
        }

        pos += frameSize;
    }
}

static void id3_meta_to_description(const id3_metadata_t *meta, char *dst, size_t dstSize) {
    int wrote = 0;

    if (!dst || dstSize == 0) {
        return;
    }

    dst[0] = '\0';
    if (!meta) {
        return;
    }

    if (meta->album[0]) {
        _snprintf(dst + strlen(dst), dstSize - strlen(dst), "%sAlbum: %s", wrote ? " | " : "", meta->album);
        wrote = 1;
    }
    if (meta->year[0]) {
        _snprintf(dst + strlen(dst), dstSize - strlen(dst), "%sYear: %s", wrote ? " | " : "", meta->year);
        wrote = 1;
    }
    if (meta->comment[0]) {
        _snprintf(dst + strlen(dst), dstSize - strlen(dst), "%s%s", wrote ? " | " : "", meta->comment);
    }
}

static int load_id3_metadata(const char *path, id3_metadata_t *meta) {
    unsigned char *data;
    size_t size;

    if (!path || !meta) {
        return 0;
    }

    memset(meta, 0, sizeof(*meta));
    data = read_entire_file(path, &size);
    if (!data) {
        return 0;
    }

    parse_id3v2_tag(data, size, meta);
    parse_id3v1_tag(data, size, meta);
    free(data);

    return meta->title[0] || meta->artist[0] || meta->album[0] || meta->year[0] ||
           meta->genre[0] || meta->comment[0] || meta->copyright[0];
}

static int get_audio_codec_by_index(IProducerControl *ctl, int codecIndex, selected_codec_t *selected) {
    IEnumIDispatch *enumDisp = NULL;
    HRESULT hr;
    LONG count = 0;
    IDispatch *pDisp = NULL;
    LONG i;

    if (!selected) {
        return 0;
    }

    memset(selected, 0, sizeof(*selected));
    selected->codecId = -1;
    selected->flavorId = -1;
    selected->content = AUDIO_CONTENT_MUSIC;

    hr = ctl->get_AudioCodecEnum(&enumDisp);
    if (FAILED(hr) || !enumDisp) {
        return 0;
    }

    enumDisp->GetCount(&count);
    if (codecIndex < 0 || codecIndex >= count) {
        enumDisp->Release();
        return 0;
    }

    enumDisp->First(&pDisp);
    for (i = 0; i < count && pDisp; ++i) {
        if (i == codecIndex) {
            IAudioCodecInfo *codec = NULL;
            if (SUCCEEDED(pDisp->QueryInterface(__uuidof(IAudioCodecInfo), (void**)&codec))) {
                BSTR name = NULL;
                codec->get_CodecName(&name);
                codec->get_CodecCookie(&selected->cookie);
                if (selected->cookie) {
                    selected->cookie->get_codecId(&selected->codecId);
                    selected->cookie->get_flavorId(&selected->flavorId);
                }
                bstr_to_ansi(name, selected->name, sizeof(selected->name));
                selected->content = codec_name_to_audio_content(selected->name);
                if (name) SysFreeString(name);
                codec->Release();
            }
            pDisp->Release();
            enumDisp->Release();
            return selected->cookie != NULL;
        }

        {
            IDispatch *next = NULL;
            enumDisp->Next(&next);
            pDisp->Release();
            pDisp = next;
        }
    }

    if (pDisp) pDisp->Release();
    enumDisp->Release();
    return 0;
}

static int apply_audio_codec_to_target(ITargetAudienceInfo *info,
                                       AUDIO_CONTENT content,
                                       ICodecCookie *cookie) {
    if (!info || !cookie) {
        return 0;
    }

    return SUCCEEDED(info->put_AudioCodec(TARGET_AUDIENCES_AUDIO, content, cookie));
}

static int apply_selected_audio_codec(IProducerControl *ctl,
                                      target_t tgt,
                                      const selected_codec_t *selected) {
    ITargetAudienceInfo *info = NULL;
    TARGET_AUDIENCE audienceList[] = {
        TARGET_28_MODEM,
        TARGET_56_MODEM,
        TARGET_SINGLE_ISDN,
        TARGET_DUAL_ISDN,
        TARGET_LAN_LOW,
        TARGET_LAN_HIGH
    };
    int applied = 0;
    int i;

    if (!ctl || !selected || !selected->cookie) {
        return 0;
    }

    for (i = 0; i < (int)(sizeof(audienceList) / sizeof(audienceList[0])); ++i) {
        if (SUCCEEDED(ctl->get_TargetAudienceInfo(audienceList[i], &info)) && info) {
            applied |= apply_audio_codec_to_target(info, selected->content, selected->cookie);
            info->Release();
            info = NULL;
        }
    }

    if (SUCCEEDED(ctl->get_TargetAudienceInfo(target_to_audience(tgt), &info)) && info) {
        applied |= apply_audio_codec_to_target(info, selected->content, selected->cookie);
        info->Release();
    }

    return applied;
}

// Enable only one target audience based on CLI
static void set_target_audience(IProducerControl *ctl, target_t tgt) {
    // First, clear all target audiences
    ctl->put_Target28KModem(VARIANT_FALSE);
    ctl->put_Target56KModem(VARIANT_FALSE);
    ctl->put_TargetSingleISDN(VARIANT_FALSE);
    ctl->put_TargetDSLCableModem(VARIANT_FALSE);
    ctl->put_TargetLAN(VARIANT_FALSE);

    switch (tgt) {
    case TGT_WEBTV:
        ctl->put_Target28KModem(VARIANT_TRUE);
        break;
    case TGT_56K:
        ctl->put_Target56KModem(VARIANT_TRUE);
        break;
    case TGT_ISDN:
        ctl->put_TargetSingleISDN(VARIANT_TRUE);
        break;
    case TGT_CABLE:
        ctl->put_TargetDSLCableModem(VARIANT_TRUE);
        break;
    case TGT_PC:
        ctl->put_TargetLAN(VARIANT_TRUE);
        break;
    }
}

// List all audio codecs using AudioCodecEnum
static void list_codecs(IProducerControl *ctl) {
    IEnumIDispatch *enumDisp = NULL;
    HRESULT hr = ctl->get_AudioCodecEnum(&enumDisp);
    if (FAILED(hr) || !enumDisp) {
        die("failed to get AudioCodecEnum");
    }

    LONG count = 0;
    enumDisp->GetCount(&count);

    printf("Available audio codecs:\n");

    IDispatch *pDisp = NULL;
    enumDisp->First(&pDisp);
    for (LONG i = 0; i < count && pDisp; ++i) {
        IAudioCodecInfo *codec = NULL;
        if (SUCCEEDED(pDisp->QueryInterface(__uuidof(IAudioCodecInfo), (void**)&codec))) {
            BSTR name = NULL;
            ICodecCookie *cookie = NULL;
            long codecId = -1;
            long flavorId = -1;
            codec->get_CodecName(&name);
            codec->get_CodecCookie(&cookie);
            if (cookie) {
                cookie->get_codecId(&codecId);
                cookie->get_flavorId(&flavorId);
            }

            char buf[512];
            WideCharToMultiByte(CP_ACP, 0, name, -1, buf, sizeof(buf), NULL, NULL);
            printf("  %ld: %s (codecId=%ld, flavorId=%ld)\n", i, buf, codecId, flavorId);

            SysFreeString(name);
            if (cookie) cookie->Release();
            codec->Release();
        }
        IDispatch *next = NULL;
        enumDisp->Next(&next);
        pDisp->Release();
        pDisp = next;
    }

    if (pDisp) pDisp->Release();
    enumDisp->Release();
}

// Set basic clip properties (Title, Author, etc.)
static void set_clip_properties(IProducerControl *ctl,
                                const char *title,
                                const char *author,
                                const char *copyright,
                                const char *description,
                                const char *keywords,
                                const char *rating) {
    if (title) {
        BSTR b = ansi_to_bstr(title);
        ctl->put_Title(b);
        SysFreeString(b);
    }
    if (author) {
        BSTR b = ansi_to_bstr(author);
        ctl->put_Author(b);
        SysFreeString(b);
    }
    if (copyright) {
        BSTR b = ansi_to_bstr(copyright);
        ctl->put_Copyright(b);
        SysFreeString(b);
    }

    // Extra metadata via SetStringProperty (from docs)
    if (description) {
        BSTR key = SysAllocString(L"Description");
        BSTR val = ansi_to_bstr(description);
        ctl->SetStringProperty(key, val);
        SysFreeString(key);
        SysFreeString(val);
    }
    if (keywords) {
        BSTR key = SysAllocString(L"Keywords");
        BSTR val = ansi_to_bstr(keywords);
        ctl->SetStringProperty(key, val);
        SysFreeString(key);
        SysFreeString(val);
    }
    if (rating) {
        const char *r = rating_to_str(rating);
        if (r) {
            BSTR key = SysAllocString(L"Rating");
            BSTR val = ansi_to_bstr(r);
            ctl->SetStringProperty(key, val);
            SysFreeString(key);
            SysFreeString(val);
        }
    }

    // SelectiveRecord, MobilePlay, Indexable → false via custom numeric props
    // Names are inferred; adjust to actual property names if they exist directly.
    {
        BSTR key = SysAllocString(L"SelectiveRecord");
        ctl->SetNumberProperty(key, 0);
        SysFreeString(key);
    }
    {
        BSTR key = SysAllocString(L"MobilePlay");
        ctl->SetNumberProperty(key, 0);
        SysFreeString(key);
    }
    {
        BSTR key = SysAllocString(L"Indexable");
        ctl->SetNumberProperty(key, 0);
        SysFreeString(key);
    }
}

static void usage(void) {
    fprintf(stderr,
        "Usage: rpcli [options] input.(wav|mp1|mp2|mp3) [output.ra]\n"
        "Options:\n"
        "  --ra5 | --g2           Set PlayerCompatibility (default: G2 / PLAYER_6)\n"
        "  --codec-list           List available audio codecs and exit\n"
        "  --codec N              Select codec list entry N; mutually exclusive with --target\n"
        "  --gain DB              Apply PCM gain in dB before encoding; negative values reduce level\n"
        "  --id3                  Fill unset metadata fields from ID3 tags when present\n"
        "  --mode voice|voice-bgm|stereo|music   (default: music)\n"
        "  --target WebTV|56k|ISDN|Cable|PC      (default: WebTV)\n"
        "  --title TEXT\n"
        "  --author TEXT\n"
        "  --copyright TEXT\n"
        "  --description TEXT\n"
        "  --keywords TEXT\n"
        "  --rating G|PG|R|X\n"
    );
}

int main(int argc, char **argv) {
    const char *mode = "music";
    const char *target_str = "WebTV";
    const char *title = NULL;
    const char *author = NULL;
    const char *copyright = NULL;
    const char *description = NULL;
    const char *keywords = NULL;
    const char *rating = NULL;
    int player_is_ra5 = 0;
    int do_codec_list = 0;
    int codec_index = -1;
    int use_gain = 0;
    int use_id3 = 0;
    int target_was_explicit = 0;
    selected_codec_t selected_codec;
    id3_metadata_t id3_meta;
    char id3_description[640] = {0};
    const char *encoder_input = NULL;
    char decoded_input[MAX_PATH] = {0};
    double gain_db = 0.0;
    double gain_scale = 1.0;

    const char *infile = NULL;
    char outbuf[MAX_PATH] = {0};
    const char *outfile = NULL;

    // Parse options
    int i = 1;
    for (; i < argc; ++i) {
        if (strcmp(argv[i], "--ra5") == 0) {
            player_is_ra5 = 1;
        } else if (strcmp(argv[i], "--g2") == 0) {
            player_is_ra5 = 0;
        } else if (strcmp(argv[i], "--codec-list") == 0) {
            do_codec_list = 1;
        } else if (strcmp(argv[i], "--codec") == 0 && i+1 < argc) {
            codec_index = parse_codec_index(argv[++i]);
            if (codec_index < 0) {
                die("--codec requires a non-negative integer");
            }
        } else if (strcmp(argv[i], "--gain") == 0 && i+1 < argc) {
            if (!parse_gain_db(argv[++i], &gain_db)) {
                die("--gain requires a numeric dB value");
            }
            use_gain = 1;
        } else if (strcmp(argv[i], "--id3") == 0) {
            use_id3 = 1;
        } else if (strcmp(argv[i], "--mode") == 0 && i+1 < argc) {
            mode = argv[++i];
        } else if (strcmp(argv[i], "--target") == 0 && i+1 < argc) {
            target_str = argv[++i];
            target_was_explicit = 1;
        } else if (strcmp(argv[i], "--title") == 0 && i+1 < argc) {
            title = argv[++i];
        } else if (strcmp(argv[i], "--author") == 0 && i+1 < argc) {
            author = argv[++i];
        } else if (strcmp(argv[i], "--copyright") == 0 && i+1 < argc) {
            copyright = argv[++i];
        } else if (strcmp(argv[i], "--description") == 0 && i+1 < argc) {
            description = argv[++i];
        } else if (strcmp(argv[i], "--keywords") == 0 && i+1 < argc) {
            keywords = argv[++i];
        } else if (strcmp(argv[i], "--rating") == 0 && i+1 < argc) {
            rating = argv[++i];
        } else if (strncmp(argv[i], "--", 2) == 0) {
            fprintf(stderr, "unknown option: %s\n", argv[i]);
            usage();
            return 1;
        } else {
            // first non-option is input
            infile = argv[i];
            if (i+1 < argc) {
                outfile = argv[i+1];
            }
            break;
        }
    }

    if (!infile && !do_codec_list) {
        usage();
        return 1;
    }

    if (codec_index >= 0 && target_was_explicit) {
        die("--codec is mutually exclusive with --target");
    }

    if (use_gain) {
        gain_scale = gain_db_to_scale(gain_db);
    }

    if (!outfile && infile) {
        // derive output: input + ".ra"
        const char *p = strrchr(infile, '.');
        size_t len = p ? (size_t)(p - infile) : strlen(infile);
        if (len >= sizeof(outbuf)-4) die("input filename too long");
        memcpy(outbuf, infile, len);
        strcpy(outbuf + len, ".ra");
        outfile = outbuf;
    }

    memset(&id3_meta, 0, sizeof(id3_meta));
    if (use_id3 && !load_id3_metadata(infile, &id3_meta)) {
        fprintf(stderr, "warning: no usable ID3 metadata found in %s\n", infile);
    }

    if (use_id3) {
        if (!title && id3_meta.title[0]) title = id3_meta.title;
        if (!author && id3_meta.artist[0]) author = id3_meta.artist;
        if (!copyright && id3_meta.copyright[0]) copyright = id3_meta.copyright;
        if (!keywords && id3_meta.genre[0]) keywords = id3_meta.genre;
        if (!description) {
            id3_meta_to_description(&id3_meta, id3_description, sizeof(id3_description));
            if (id3_description[0]) {
                description = id3_description;
            }
        }
    }

    HRESULT hr = CoInitializeEx(NULL, COINIT_APARTMENTTHREADED);
    if (FAILED(hr)) die("CoInitialize failed");

    IProducerControl *ctl = NULL;
    hr = CoCreateInstance(__uuidof(ProducerControl),
                          NULL,
                          CLSCTX_INPROC_SERVER,
                          __uuidof(IProducerControl),
                          (void**)&ctl);
    if (FAILED(hr) || !ctl) {
        CoUninitialize();
        die("failed to create ProducerControl (is prct3260.ocx installed/registered?)");
    }

    if (do_codec_list) {
        list_codecs(ctl);
        ctl->Release();
        CoUninitialize();
        return 0;
    }

    memset(&selected_codec, 0, sizeof(selected_codec));
    selected_codec.codecId = -1;
    selected_codec.flavorId = -1;

    encoder_input = infile;
    if (is_mpeg_audio_input(infile)) {
        if (!decode_mpeg_audio_to_wav(infile, decoded_input, sizeof(decoded_input), gain_scale)) {
            ctl->Release();
            CoUninitialize();
            die("failed to decode mpeg audio input with minimp3");
        }
        strcpy(g_temp_input_path, decoded_input);
        encoder_input = g_temp_input_path;
    } else if (use_gain && is_wav_input(infile)) {
        if (!rewrite_wav_with_gain(infile, decoded_input, sizeof(decoded_input), gain_scale)) {
            ctl->Release();
            CoUninitialize();
            die("failed to apply gain to wav input; only PCM 16-bit WAV is supported");
        }
        strcpy(g_temp_input_path, decoded_input);
        encoder_input = g_temp_input_path;
    }

    if (codec_index >= 0 && !get_audio_codec_by_index(ctl, codec_index, &selected_codec)) {
        ctl->Release();
        CoUninitialize();
        die("invalid codec index");
    }

    // Input properties
    ctl->put_InputType(INPUT_SOURCE_FILE);
    {
        BSTR b = ansi_to_bstr(encoder_input);
        ctl->put_InputFilename(b);
        SysFreeString(b);
    }
    ctl->put_InputDoAudio(VARIANT_TRUE);
    ctl->put_InputDoVideo(VARIANT_FALSE);
    ctl->put_InputDoEvents(VARIANT_FALSE);

    // Output properties
    ctl->put_DoOutputFile(VARIANT_TRUE);
    {
        BSTR b = ansi_to_bstr(outfile);
        ctl->put_OutputFilename(b);
        SysFreeString(b);
    }

    // PlayerCompatibility: RA5 vs G2 (PLAYER_5 / PLAYER_6)
    ctl->put_PlayerCompatibility(player_is_ra5 ? PLAYER_5 : PLAYER_6);

    // SureStream: hard-coded false (single-rate)
    ctl->put_SureStream(VARIANT_FALSE);

    // AudioContent (mode)
    ctl->put_AudioContent(codec_index >= 0 ? selected_codec.content : mode_to_audio_content(mode));

    // Target audience
    set_target_audience(ctl, parse_target(target_str));

    if (codec_index >= 0 && !apply_selected_audio_codec(ctl, parse_target(target_str), &selected_codec)) {
        if (selected_codec.cookie) selected_codec.cookie->Release();
        ctl->Release();
        CoUninitialize();
        die("failed to apply selected codec");
    }

    // Clip properties + custom props
    set_clip_properties(ctl, title, author, copyright,
                        description, keywords, rating);

    // Start encoding
    hr = ctl->StartEncoding();
    if (FAILED(hr)) {
        ctl->Release();
        CoUninitialize();
        die("StartEncoding failed");
    }

    // RealProducer uses STA COM callbacks/messages while encoding.
    // Pump the queue so the control can make progress in a console app.
    VARIANT_BOOL isEnc = VARIANT_FALSE;
    DWORD startTick = GetTickCount();
    do {
        long lastError = 0;

        pump_pending_messages();
        ctl->get_IsEncoding(&isEnc);

        if (SUCCEEDED(ctl->get_LastError(&lastError)) && lastError != 0) {
            ctl->StopEncoding();
            if (selected_codec.cookie) selected_codec.cookie->Release();
            die_last_error(ctl, "encoding failed");
        }

        if (GetTickCount() - startTick > 300000) {
            ctl->StopEncoding();
            if (selected_codec.cookie) selected_codec.cookie->Release();
            die_last_error(ctl, "encoding timed out");
        }

        MsgWaitForMultipleObjects(0, NULL, FALSE, 100, QS_ALLINPUT);
    } while (isEnc == VARIANT_TRUE);

    {
        long lastError = 0;
        if (SUCCEEDED(ctl->get_LastError(&lastError)) && lastError != 0) {
            if (selected_codec.cookie) selected_codec.cookie->Release();
            die_last_error(ctl, "encoding completed with an error");
        }
    }

    // StopEncoding (in case)
    ctl->StopEncoding();

    if (selected_codec.cookie) selected_codec.cookie->Release();
    ctl->Release();
    CoUninitialize();
    cleanup_temp_input();

    printf("Encoded %s -> %s\n", infile, outfile);
    return 0;
}
