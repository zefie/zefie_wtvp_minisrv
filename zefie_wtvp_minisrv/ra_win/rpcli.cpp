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
#include <string.h>

#import "prct3260.ocx" no_namespace named_guids raw_interfaces_only

static void die(const char *msg);

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

    ExitProcess(1);
}

// Simple helper: print and exit
static void die(const char *msg) {
    fprintf(stderr, "error: %s\n", msg);
    ExitProcess(1);
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
        "Usage: rpcli [options] input.wav [output.ra]\n"
        "Options:\n"
        "  --ra5 | --g2           Set PlayerCompatibility (default: G2 / PLAYER_6)\n"
        "  --codec-list           List available audio codecs and exit\n"
        "  --codec N              Select codec list entry N; mutually exclusive with --target\n"
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
    int target_was_explicit = 0;
    selected_codec_t selected_codec;

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

    if (!outfile && infile) {
        // derive output: input + ".ra"
        const char *p = strrchr(infile, '.');
        size_t len = p ? (size_t)(p - infile) : strlen(infile);
        if (len >= sizeof(outbuf)-4) die("input filename too long");
        memcpy(outbuf, infile, len);
        strcpy(outbuf + len, ".ra");
        outfile = outbuf;
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

    if (codec_index >= 0 && !get_audio_codec_by_index(ctl, codec_index, &selected_codec)) {
        ctl->Release();
        CoUninitialize();
        die("invalid codec index");
    }

    // Input properties
    ctl->put_InputType(INPUT_SOURCE_FILE);
    {
        BSTR b = ansi_to_bstr(infile);
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

    printf("Encoded %s -> %s\n", infile, outfile);
    return 0;
}
