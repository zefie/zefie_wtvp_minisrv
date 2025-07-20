'use strict';
const { WTVShared, clientShowAlert } = require("./WTVShared.js");

class WTVProxy {
    constructor(minisrv_config) {
        this.minisrv_config = minisrv_config;
        this.wtvshared = new WTVShared(this.minisrv_config);
    }

    transformHtml(html) {
        try {
            // Apply existing transformations
            let transformed = html
                .replace(/[^\x20-\x7E\n\r\t]/g, '') // Remove non-ASCII
                .replace(/\s+/g, ' ') // Collapse whitespace
                .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
                .replace(/<meta\b[^<]*(?:(?!>)<[^<]*)*>/gi, '') // Remove meta tags
                .replace(/<img\b[^<]*(?:(?!>)<[^<]*)*>/gi, '') // Remove images
                .replace(/<input\b[^<]*(?:(?!>)<[^<]*)*>/gi, '') // Remove input tags
                .replace(/<link\b[^<]*(?:(?!>)<[^<]*)*>/gi, '') // Remove link tags
                .replace(/<embed\b[^<]*(?:(?!>)<[^<]*)*>/gi, '') // Remove embed tags
                .replace(/<a\b[^<]*(?:(?!>)<[^<]*)*>/gi, '') // Remove links
                .replace(/<\/a>/gi, '') // Remove closing links
                .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
                .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+\s*=\s*("[^"]*"|'[^']*'|[^ >]+)/gi, '')
                .replace(/style\s*=\s*("[^"]*"|'[^']*'|[^ >]+)/gi, '')
                .replace(/class\s*=\s*("[^"]*"|'[^']*'|[^ >]+)/gi, '')
                .replace(/id\s*=\s*("[^"]*"|'[^']*'|[^ >]+)/gi, '')
                .replace(/<(div|span|section|article|aside|header|footer|nav)\b/gi, '')
                .replace(/<\/(div|span|section|article|aside|header|footer|nav)>/gi, '')
                .replace(/FP_preloadImgs\s*\(.*?\)/gi, '');

            // Normalize for processing
            transformed = transformed
                .replace(/>\s+</g, '><') // Remove accidental whitespace between tags
                .replace(/</g, '\n<')    // Add newline before each tag
                .replace(/>/g, '>\n')    // Add newline after each tag
                .replace(/\n\s*\n/g, '\n'); // Collapse multiple newlines

            // Format with indentation
            const lines = transformed.split('\n');
            let indentLevel = 0;
            const indentSize = 2;

            const formatted = lines.map((line) => {
                const trimmed = line.trim();
                if (trimmed === '') return '';

                const isClosing = /^<\/.+?>/.test(trimmed);
                const isSelfClosing = /^<.+?\/>$/.test(trimmed) ||
                                      /^<hr/i.test(trimmed) || /^<br/i.test(trimmed) ||
                                      /^<meta/i.test(trimmed) || /^<img/i.test(trimmed) ||
                                      /^<input/i.test(trimmed) || /^<audioscope/i.test(trimmed);
                const isOpening = /^<([a-zA-Z0-9]+)(?!.*\/>).*?>/.test(trimmed) && !isClosing;

                if (isClosing) indentLevel = Math.max(indentLevel - 1, 0);

                const indentedLine = ' '.repeat(indentLevel * indentSize) + trimmed;

                if (isOpening && !isSelfClosing) indentLevel++;

                return indentedLine;
            });

            transformed = formatted.join('\n').trim();

            // Wrap in DOCTYPE and HTML structure
            transformed = `<!DOCTYPE html>\n<html>\n  <head>\n    <meta http-equiv="content-type" content="text/html; charset=iso-8859-1">\n  </head>\n  <body>\n${transformed}\n  </body>\n</html>`;

            // Truncate if necessary
            if (transformed.length > 512) {
                transformed = transformed.substring(0, 512);
                transformed = transformed.substring(0, transformed.lastIndexOf('<')) + '\n  </body>\n</html>';
            }

            return Buffer.from(transformed, 'ascii').toString('ascii');
        } catch (err) {
            throw new Error(`HTML transformation failed: ${err.message}`);
        }
    }
}

module.exports = WTVProxy;