'use strict';
const { spawn } = require('child_process');

class WTVAudioProxy {
    constructor(minisrv_config) {
        this.minisrv_config = minisrv_config || {};
        const audioProxyConfig = (minisrv_config && minisrv_config.config && minisrv_config.config.audio_proxy) ? minisrv_config.config.audio_proxy : {};
        this.config = Object.assign({
            enabled: false,
            types: [
                'audio/mpeg',
                'audio/mp3',
                'audio/wav',
                'audio/ogg',
                'audio/x-wav',
                'audio/flac',
                'audio/x-flac',
                'audio/aac',
                'audio/mp4',
                'audio/x-m4a',
                'audio/x-ms-wma'
            ],
            bitrate: '20k',
            sampleRate: 16000,
            channels: 1,
            maxDurationSeconds: 480,
            ffmpegPath: 'ffmpeg'
        }, audioProxyConfig);

        if (!Array.isArray(this.config.types)) {
            this.config.types = [];
        }
        this.config.types = this.config.types.map((t) => String(t).toLowerCase().trim()).filter(Boolean);
        this.config.bitrate = String(this.config.bitrate || '20k');
        this.config.sampleRate = parseInt(this.config.sampleRate, 10) || 16000;
        this.config.channels = parseInt(this.config.channels, 10) || 1;
        this.config.maxDurationSeconds = parseInt(this.config.maxDurationSeconds, 10) || 480;
        this.config.ffmpegPath = String(this.config.ffmpegPath || 'ffmpeg');
    }

    isEnabled() {
        return this.config.enabled === true;
    }

    normalizeContentType(contentType) {
        if (!contentType) return '';
        return contentType.split(';')[0].trim().toLowerCase();
    }

    shouldProxy(contentType) {
        if (!this.isEnabled()) return false;
        const normalized = this.normalizeContentType(contentType);
        return normalized && this.config.types.includes(normalized);
    }

    async inspectDuration(sourceData) {
        return new Promise((resolve, reject) => {
            const args = [
                '-hide_banner',
                '-nostdin',
                '-i',
                'pipe:0',
                '-f',
                'null',
                '-'
            ];
            const ffprobe = spawn(this.config.ffmpegPath, args, { stdio: ['pipe', 'ignore', 'pipe'] });
            let stderr = '';

            ffprobe.stderr.on('data', (chunk) => {
                stderr += chunk.toString();
            });

            ffprobe.on('error', (err) => reject(err));
            ffprobe.on('close', (code) => {
                const matches = stderr.match(/Duration:\s*([0-9]{2}):([0-9]{2}):([0-9]{2}\.[0-9]+)/);
                if (matches) {
                    const hours = parseInt(matches[1], 10);
                    const minutes = parseInt(matches[2], 10);
                    const seconds = parseFloat(matches[3]);
                    return resolve(hours * 3600 + minutes * 60 + seconds);
                }
                if (code === 0) {
                    return resolve(0);
                }
                return reject(new Error(`ffmpeg failed to inspect media: ${stderr.trim()}`));
            });

            ffprobe.stdin.end(sourceData);
        });
    }

    async transcode(sourceData) {
        return new Promise((resolve, reject) => {
            const args = [
                '-hide_banner',
                '-nostdin',
                '-y',
                '-i',
                'pipe:0',
                '-vn',
                '-acodec',
                'libmp3lame',
                '-b:a',
                this.config.bitrate,
                '-ar',
                String(this.config.sampleRate),
                '-ac',
                String(this.config.channels),
                '-f',
                'mp3',
                'pipe:1'
            ];
            const ffmpeg = spawn(this.config.ffmpegPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });
            const outputChunks = [];
            let stderr = '';

            ffmpeg.stdout.on('data', (chunk) => outputChunks.push(chunk));
            ffmpeg.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
            ffmpeg.on('error', (err) => reject(err));
            ffmpeg.on('close', (code) => {
                if (code !== 0) {
                    return reject(new Error(`ffmpeg transcode failed (${code}): ${stderr.trim()}`));
                }
                resolve(Buffer.concat(outputChunks));
            });

            ffmpeg.stdin.end(sourceData);
        });
    }

    async transformIfNeeded(headers, data) {
        if (!headers || !this.shouldProxy(headers['Content-type'])) {
            return { headers, data };
        }

        if (headers['Content-Encoding'] && headers['Content-Encoding'].toLowerCase() !== 'identity') {
            return { headers, data };
        }

        const sourceBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data || '');
        if (sourceBuffer.length === 0) {
            return { headers, data: sourceBuffer };
        }

        const duration = await this.inspectDuration(sourceBuffer);
        if (duration > this.config.maxDurationSeconds) {
            const error = new Error(`Audio duration ${duration.toFixed(1)}s exceeds maximum of ${this.config.maxDurationSeconds}s`);
            error.code = 'AUDIO_TOO_LONG';
            throw error;
        }

        const converted = await this.transcode(sourceBuffer);
        const originalType = this.normalizeContentType(headers['Content-type']);
        if (converted.length >= sourceBuffer.length && (originalType === 'audio/wav' || originalType === 'audio/mpeg')) {
            return { headers, data: sourceBuffer };
        }

        const newHeaders = Object.assign({}, headers);
        newHeaders['Content-type'] = 'audio/mpeg';
        delete newHeaders['Content-Encoding'];
        delete newHeaders['Content-Length'];
        return { headers: newHeaders, data: converted };
    }
}

module.exports = WTVAudioProxy;
