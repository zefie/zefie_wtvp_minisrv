'use strict';
const { WTVShared } = require("./WTVShared.js");

class WTVMinifyingProxy {
    constructor(minisrv_config) {
        this.minisrv_config = minisrv_config;
        this.wtvshared = new WTVShared(this.minisrv_config);
        
        // HTML 3.0/4.0 compatible tags and attributes
        this.allowedTags = [
            'html', 'head', 'title', 'meta', 'body', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'br', 'hr', 'div', 'span', 'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 
            'td', 'th', 'tbody', 'thead', 'tfoot', 'form', 'input', 'textarea', 'select',
            'option', 'button', 'b', 'i', 'u', 'strong', 'em', 'center', 'font', 'big', 
            'small', 'sub', 'sup', 'pre', 'code', 'blockquote', 'dl', 'dt', 'dd'
        ];
        
        this.allowedAttributes = [
            'href', 'src', 'alt', 'title', 'width', 'height', 'border', 'align', 'valign',
            'bgcolor', 'color', 'size', 'face', 'target', 'name', 'value', 'type', 'action',
            'method', 'cols', 'rows', 'cellpadding', 'cellspacing', 'nowrap',
            // JellyScript event handlers
            'onclick', 'onload', 'onunload', 'onsubmit', 'onreset', 'onfocus', 'onblur', 
            'onchange', 'onmouseover', 'onmouseout', 'onmousedown', 'onmouseup'
        ];
        
        // CSS properties to convert to HTML attributes
        this.cssToHtml = {
            'text-align': 'align',
            'vertical-align': 'valign',
            'background-color': 'bgcolor',
            'color': 'color',
            'font-size': 'size',
            'font-family': 'face',
            'width': 'width',
            'height': 'height'
        };
        
        // JellyScript (WebTV JavaScript) supported features
        this.jellyScriptSupported = {
            // Core JavaScript objects and methods
            objects: ['window', 'document', 'history', 'location', 'navigator'],
            domMethods: ['getElementById', 'getElementsByTagName', 'getElementsByName'],
            windowMethods: ['alert', 'confirm', 'prompt', 'open', 'close', 'focus', 'blur'],
            historyMethods: ['back', 'forward', 'go'],
            documentMethods: ['write', 'writeln', 'open', 'close'],
            events: ['onclick', 'onload', 'onunload', 'onsubmit', 'onreset', 'onfocus', 'onblur', 'onchange'],
            // Basic JavaScript features
            features: ['var', 'function', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'return']
        };
        
        // Modern JavaScript features not supported by JellyScript
        this.unsupportedJSFeatures = [
            // Modern ES6+ features
            'const', 'let', 'arrow functions', '=>', 'class', 'extends', 'import', 'export',
            // Modern APIs
            'fetch', 'Promise', 'async', 'await', 'XMLHttpRequest', 'addEventListener',
            // jQuery and libraries
            '\\$\\(', 'jQuery', 'angular', 'react', 'vue', 'prototype\\.js',
            // Modern DOM methods
            'querySelector', 'querySelectorAll', 'classList', 'dataset'
        ];
    }

    /**
     * Transform modern HTML to HTML 3.0/4.0 compatible version
     * @param {string} html - The HTML content to transform
     * @param {string} url - The original URL (for fixing relative links)
     * @returns {string} - Transformed HTML
     */
    transformHtml(html, url = '') {
        try {
            let transformed = html;
            
            // Step 1: Clean up the HTML structure
            transformed = this.cleanHtml(transformed);
            
            // Step 2: Convert modern tags to compatible ones
            transformed = this.convertModernTags(transformed);
            
            // Step 3: Extract and convert CSS to HTML attributes
            transformed = this.convertCssToAttributes(transformed);
            
            // Step 4: Fix links and images
            transformed = this.fixUrls(transformed, url);
            
            // Step 5: Remove unsupported content
            transformed = this.removeUnsupportedContent(transformed);
            
            // Step 6: Minify and optimize
            transformed = this.minifyHtml(transformed);
            
            // Step 7: Return the processed content (structure will be handled by transformForWebTV)
            return transformed;
            
        } catch (err) {
            throw new Error(`HTML transformation failed: ${err.message}`);
        }
    }

    /**
     * Clean HTML by removing comments, normalizing whitespace
     */
    cleanHtml(html) {
        return html
            // Remove HTML comments
            .replace(/<!--[\s\S]*?-->/g, '')
            // Remove CDATA sections
            .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')
            // Remove XML declarations
            .replace(/<\?xml[^>]*\?>/g, '')
            // Normalize whitespace
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Convert modern HTML5/CSS3 tags to HTML 3.0/4.0 compatible versions
     */
    convertModernTags(html) {
        // Convert semantic HTML5 tags to divs with classes
        const semanticTags = {
            'header': 'div',
            'footer': 'div', 
            'nav': 'div',
            'section': 'div',
            'article': 'div',
            'aside': 'div',
            'main': 'div',
            'figure': 'div',
            'figcaption': 'div'
        };
        
        Object.entries(semanticTags).forEach(([modern, classic]) => {
            // Opening tags
            html = html.replace(new RegExp(`<${modern}\\b([^>]*)>`, 'gi'), `<${classic}$1>`);
            // Closing tags
            html = html.replace(new RegExp(`</${modern}>`, 'gi'), `</${classic}>`);
        });
        
        return html;
    }

    /**
     * Extract CSS styles and convert them to HTML attributes where possible
     */
    convertCssToAttributes(html) {
        // Extract CSS rules from style blocks before removing them
        const cssRules = new Map();
        
        html = html.replace(/<style\b[^<]*?>(.*?)<\/style>/gis, (match, cssContent) => {
            // Parse CSS rules and store them
            const rules = cssContent.match(/([^{]+)\{([^}]+)\}/g);
            if (rules) {
                rules.forEach(rule => {
                    const [selector, styles] = rule.split('{');
                    if (selector && styles) {
                        const cleanSelector = selector.trim();
                        const cleanStyles = styles.replace('}', '').trim();
                        cssRules.set(cleanSelector, cleanStyles);
                    }
                });
            }
            return ''; // Remove the style block
        });
        
        // Apply CSS rules to matching elements with WebTV-specific handling
        html = this.applyCssRulesToElements(html, cssRules);
        
        // Convert inline styles to HTML attributes and wrap non-form elements with font-size in font tags
        html = html.replace(/<(\w+)([^>]*)\s+style\s*=\s*["']([^"']+)["']([^>]*?)(\s*\/?)>/gi, (match, tagName, beforeStyle, styles, afterStyle, selfClosing) => {
            const result = this.parseStyleToAttributes(styles, tagName);
            
            if (result.fontSize && !/^(input|select|textarea)$/i.test(tagName)) {
                // For non-form elements with font-size, wrap in font tag
                const elementWithAttributes = result.attributes ? 
                    `<${tagName}${beforeStyle} ${result.attributes}${afterStyle}${selfClosing}>` :
                    `<${tagName}${beforeStyle}${afterStyle}${selfClosing}>`;
                
                // Self-closing tags or void elements
                if (selfClosing || /^(br|hr|img|input|area|base|col|embed|link|meta|source|track|wbr)$/i.test(tagName)) {
                    return `<font size="${result.fontSize}">${elementWithAttributes}</font>`;
                }
                
                // For container elements, we need to find the matching closing tag
                return `<font size="${result.fontSize}">${elementWithAttributes}`;
            } else if (result.attributes) {
                // For form elements or elements without font-size, just add attributes
                return `<${tagName}${beforeStyle} ${result.attributes}${afterStyle}${selfClosing}>`;
            }
            return `<${tagName}${beforeStyle}${afterStyle}${selfClosing}>`;
        });
        
        // Simple approach: find unmatched font tags and close them at the next major element boundary
        let openFontTags = 0;
        html = html.replace(/<\/?[^>]+>/g, (tag) => {
            if (tag.startsWith('<font size=') && !tag.includes('</font>')) {
                openFontTags++;
                return tag;
            } else if (tag.startsWith('</') && openFontTags > 0) {
                openFontTags--;
                return tag + '</font>';
            }
            return tag;
        });
        
        return html;
    }

    /**
     * Parse CSS style string and convert to HTML attributes
     */
    parseStyleToAttributes(styleString, elementTag = '') {
        const attributes = [];
        let fontSize = null;
        const styles = styleString.split(';');
        
        styles.forEach(style => {
            const [property, value] = style.split(':').map(s => s.trim());
            if (property && value && this.cssToHtml[property]) {
                let htmlValue = value;
                
                // Convert CSS values to HTML equivalents
                if (property === 'font-size') {
                    htmlValue = this.convertFontSize(value);
                    
                    // Handle font-size differently for form vs non-form elements
                    const isFormElement = /^(input|select|textarea)$/i.test(elementTag);
                    if (isFormElement) {
                        // For form elements, add size attribute directly
                        attributes.push(`${this.cssToHtml[property]}="${htmlValue}"`);
                    } else {
                        // For non-form elements, store font size for font tag wrapping
                        fontSize = htmlValue;
                    }
                    return;
                } else if (property === 'color' || property === 'background-color') {
                    htmlValue = this.convertColor(value);
                } else if (property === 'width' || property === 'height') {
                    htmlValue = this.convertDimension(value);
                }
                
                attributes.push(`${this.cssToHtml[property]}="${htmlValue}"`);
            }
        });
        
        return {
            attributes: attributes.join(' '),
            fontSize: fontSize
        };
    }

    /**
     * Apply CSS rules to matching elements and handle WebTV-specific attribute priorities
     */
    applyCssRulesToElements(html, cssRules) {
        for (const [selector, styles] of cssRules) {
            if (selector.startsWith('.')) {
                // Handle class selectors (e.g., .lst)
                const className = selector.substring(1);
                const regex = new RegExp(`<(input[^>]*class\\s*=\\s*["'][^"']*\\b${className}\\b[^"']*["'][^>]*)>`, 'gi');
                html = html.replace(regex, (match, tagContent) => {
                    // Convert CSS styles to attributes for this element (input tag)
                    const result = this.parseStyleToAttributes(styles, 'input');
                    const attributes = result.attributes || '';
                    if (attributes) {
                        let newTagContent = tagContent;
                        
                        // Special handling for input elements: WebTV prioritizes size over width
                        if (attributes.includes('width=')) {
                            const existingSize = tagContent.match(/size\s*=\s*["']?(\d+)["']?/i);
                            const widthMatch = attributes.match(/width="(\d+)"/);
                            
                            if (existingSize && widthMatch) {
                                // Both size and width exist - for WebTV, recalculate size based on CSS width
                                const cssWidth = parseInt(widthMatch[1]);
                                const currentSize = parseInt(existingSize[1]);
                                // Use larger of the two for better WebTV compatibility
                                const betterSize = Math.max(Math.round(cssWidth / 8), currentSize);
                                
                                // Replace the existing size with the better calculated size
                                newTagContent = tagContent.replace(/size\s*=\s*["']?\d+["']?/i, `size="${betterSize}"`);
                                
                                // Add other attributes except width
                                const filteredAttributes = attributes.replace(/width="[^"]*"/, '').trim();
                                if (filteredAttributes) {
                                    newTagContent = `${newTagContent} ${filteredAttributes}`;
                                }
                            } else if (existingSize) {
                                // If input already has size attribute, don't add width
                                const filteredAttributes = attributes.replace(/\s*width="[^"]*"/, '');
                                newTagContent = `${tagContent} ${filteredAttributes}`;
                            } else {
                                // Convert width to size if no existing size
                                const pixelWidth = parseInt(widthMatch[1]);
                                // Rough conversion: ~8-10 pixels per character for WebTV
                                const charSize = Math.round(pixelWidth / 8);
                                const sizeAttr = `size="${Math.min(charSize, 80)}"`; // Cap at 80 chars
                                const otherAttributes = attributes.replace(/width="[^"]*"/, '').trim();
                                const finalAttributes = otherAttributes ? `${sizeAttr} ${otherAttributes}` : sizeAttr;
                                newTagContent = `${tagContent} ${finalAttributes}`;
                            }
                        } else {
                            // No width attribute, add all attributes normally
                            newTagContent = `${tagContent} ${attributes}`;
                        }
                        
                        return `<${newTagContent}>`;
                    }
                    return match;
                });
                
                // Also handle non-input elements with this class
                const generalRegex = new RegExp(`<((?!input)[^>]+class\\s*=\\s*["'][^"']*\\b${className}\\b[^"']*["'][^>]*)>`, 'gi');
                html = html.replace(generalRegex, (match, tagContent) => {
                    const attributes = this.parseStyleToAttributes(styles);
                    if (attributes) {
                        return `<${tagContent} ${attributes}>`;
                    }
                    return match;
                });
            }
        }
        return html;
    }

    /**
     * Convert CSS font-size to HTML size attribute (1-7)
     */
    convertFontSize(cssSize) {
        const size = parseInt(cssSize);
        if (size <= 8) return '1';
        if (size <= 10) return '2';
        if (size <= 12) return '3';
        if (size <= 14) return '4';
        if (size <= 18) return '5';
        if (size <= 24) return '6';
        return '7';
    }

    /**
     * Convert CSS dimensions (width/height) to HTML format
     */
    convertDimension(cssDimension) {
        // Remove 'px' suffix and return just the number for HTML attributes
        if (cssDimension.endsWith('px')) {
            return cssDimension.slice(0, -2);
        }
        // Convert 'em' to pixels (assume 1em = 16px, which is the WebTV default)
        if (cssDimension.includes('em')) {
            const emValue = parseFloat(cssDimension);
            if (!isNaN(emValue)) {
                const pixels = Math.round(emValue * 16);
                return pixels.toString();
            }
        }
        // Convert 'rem' to pixels (same as em for WebTV)
        if (cssDimension.includes('rem')) {
            const remValue = parseFloat(cssDimension);
            if (!isNaN(remValue)) {
                const pixels = Math.round(remValue * 16);
                return pixels.toString();
            }
        }
        // For percentages, keep as-is
        if (cssDimension.endsWith('%')) {
            return cssDimension;
        }
        // Remove !important and other CSS-specific suffixes
        let cleanDimension = cssDimension.replace(/\s*!important\s*/, '').trim();
        
        // For other units or plain numbers, return as-is
        return cleanDimension;
    }

    /**
     * Convert CSS colors to HTML color format
     */
    convertColor(cssColor) {
        // If already in hex format, return as-is
        if (cssColor.startsWith('#')) return cssColor;
        
        // Convert named colors to hex
        const namedColors = {
            'black': '#000000', 'white': '#FFFFFF', 'red': '#FF0000',
            'green': '#008000', 'blue': '#0000FF', 'yellow': '#FFFF00',
            'cyan': '#00FFFF', 'magenta': '#FF00FF', 'gray': '#808080',
            'grey': '#808080', 'darkgray': '#A9A9A9', 'lightgray': '#D3D3D3'
        };
        
        return namedColors[cssColor.toLowerCase()] || cssColor;
    }

    /**
     * Fix relative URLs to absolute ones
     */
    fixUrls(html, baseUrl) {
        if (!baseUrl) return html;
        
        try {
            const base = new URL(baseUrl);
            
            // Fix image sources
            html = html.replace(/src\s*=\s*["']([^"']+)["']/gi, (match, src) => {
                if (src.startsWith('http') || src.startsWith('data:')) return match;
                const absoluteUrl = new URL(src, base).href;
                return `src="${absoluteUrl}"`;
            });
            
            // Fix links
            html = html.replace(/href\s*=\s*["']([^"']+)["']/gi, (match, href) => {
                if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('#')) return match;
                const absoluteUrl = new URL(href, base).href;
                return `href="${absoluteUrl}"`;
            });
            
        } catch (e) {
            // If URL parsing fails, return original HTML
        }
        
        return html;
    }

    /**
     * Remove unsupported content but preserve JellyScript-compatible JavaScript
     */
    removeUnsupportedContent(html) {
        // Process script tags to filter for JellyScript compatibility
        html = html.replace(/<script\b[^<]*?>(.*?)<\/script>/gis, (match, scriptContent) => {
            const processedScript = this.processJellyScript(scriptContent);
            if (processedScript.trim()) {
                return `<script>${processedScript}</script>`;
            }
            return ''; // Remove empty or incompatible scripts
        });
        
        // WebTV form fixes: ensure proper input types and attributes
        html = html.replace(/<input([^>]*name="q"[^>]*)>/gi, (match, attributes) => {
            // Make sure search input has type="text" if not specified
            if (!attributes.includes('type=')) {
                attributes = attributes.trim() + ' type="text"';
            }
            return `<input ${attributes}>`;
        });
        
        // Fix submit buttons to have better sizing for WebTV
        html = html.replace(/<input([^>]*type="submit"[^>]*)>/gi, (match, attributes) => {
            // Add width if not present to make buttons more visible
            if (!attributes.includes('width=') && !attributes.includes('size=')) {
                // Extract button text to determine appropriate width
                const valueMatch = attributes.match(/value="([^"]*)"/) || ['', ''];
                const buttonText = valueMatch[1];
                let buttonWidth = Math.max(buttonText.length * 8, 80); // Minimum 80px
                attributes = attributes.trim() + ` width="${buttonWidth}"`;
            }
            return `<input ${attributes}>`;
        });
        
        // Remove other unsupported content
        return html
            // Remove noscript content (show it since we support basic JS)
            .replace(/<noscript\b[^>]*>/gi, '')
            .replace(/<\/noscript>/gi, '')
            // Remove object/embed tags
            .replace(/<object\b[^>]*>.*?<\/object>/gis, '')
            .replace(/<embed\b[^>]*\/?>/gi, '')
            // Remove iframes
            .replace(/<iframe\b[^>]*>.*?<\/iframe>/gis, '')
            // Remove link tags (CSS, etc.)
            .replace(/<link\b[^>]*\/?>/gi, '')
            // Remove meta tags except content-type and charset
            .replace(/<meta\b(?![^>]*(?:content-type|charset))[^>]*\/?>/gi, '')
            // Keep JellyScript event handlers, remove modern ones
            .replace(/on(?!click|load|unload|submit|reset|focus|blur|change|mouseover|mouseout|mousedown|mouseup)\w+\s*=\s*("[^"]*"|'[^']*'|[^ >]+)/gi, '')
            // Remove unsupported attributes but keep some basic ones
            .replace(/\b(?:class|data-\w+)\s*=\s*("[^"]*"|'[^']*'|[^ >]+)/gi, '');
    }

    /**
     * Minify HTML while preserving readability
     */
    minifyHtml(html) {
        return html
            // Remove extra whitespace between tags
            .replace(/>\s+</g, '><')
            // Remove leading/trailing whitespace from lines
            .replace(/^\s+|\s+$/gm, '')
            // Collapse multiple spaces to single space
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    /**
     * Ensure valid HTML structure with proper DOCTYPE
     */
    ensureValidStructure(html) {
        // Extract title if present
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : 'WebTV Page';
        
        // Extract body content - look for body tag first, then fallback to content after head
        let bodyContent = '';
        const bodyMatch = html.match(/<body[^>]*>(.*?)<\/body>/is);
        
        if (bodyMatch) {
            bodyContent = bodyMatch[1];
        } else {
            // No body tag found, extract everything after head or use all content
            const headEndMatch = html.match(/<\/head>/i);
            if (headEndMatch) {
                bodyContent = html.substring(html.indexOf(headEndMatch[0]) + headEndMatch[0].length);
            } else {
                bodyContent = html;
            }
        }
        
        // Remove any remaining head/html/body/doctype tags to avoid nesting
        bodyContent = bodyContent
            .replace(/<!DOCTYPE[^>]*>/gi, '')
            .replace(/<\/?(?:html|head|body)[^>]*>/gi, '')
            .replace(/<title[^>]*>.*?<\/title>/gi, '')
            .replace(/<meta[^>]*>/gi, '')
            .trim();
        
        // If content is too long, truncate intelligently
        if (bodyContent.length > 32768) { // 32KB limit for WebTV
            bodyContent = this.intelligentTruncate(bodyContent, 32768);
        }
        
        // Build proper HTML structure
        return `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1">
<title>${title}</title>
</head>
<body>
${bodyContent}
</body>
</html>`;
    }

    /**
     * Process JavaScript to be JellyScript (WebTV JavaScript) compatible
     * @param {string} scriptContent - The JavaScript content to process
     * @returns {string} - JellyScript-compatible JavaScript or empty if incompatible
     */
    processJellyScript(scriptContent) {
        if (!scriptContent || !scriptContent.trim()) return '';
        
        let processed = scriptContent.trim();
        
        // Check for and remove unsupported modern JavaScript features
        for (const feature of this.unsupportedJSFeatures) {
            const regex = new RegExp(feature, 'gi');
            if (regex.test(processed)) {
                // If script contains unsupported features, try to clean or remove
                processed = this.cleanUnsupportedJS(processed, feature);
            }
        }
        
        // Convert some modern syntax to JellyScript-compatible equivalents
        processed = this.convertToJellyScript(processed);
        
        // Check if remaining script is simple enough for JellyScript
        if (this.isJellyScriptCompatible(processed)) {
            return processed;
        }
        
        return ''; // Remove incompatible scripts
    }

    /**
     * Convert modern JavaScript to JellyScript-compatible equivalents where possible
     */
    convertToJellyScript(script) {
        let converted = script;
        
        // Convert addEventListener to traditional event handlers (basic cases)
        converted = converted.replace(
            /(\w+)\.addEventListener\s*\(\s*['"](\w+)['"]\s*,\s*(\w+)\s*\)/gi,
            '$1.on$2 = $3'
        );
        
        // Convert querySelector to getElementById (simple cases)
        converted = converted.replace(
            /document\.querySelector\s*\(\s*['"]#(\w+)['"]\s*\)/gi,
            'document.getElementById("$1")'
        );
        
        // Convert console.log to alert (for debugging)
        converted = converted.replace(/console\.log\s*\(/gi, 'alert(');
        
        // Remove 'use strict' directives
        converted = converted.replace(/['"]use strict['"];?\s*/gi, '');
        
        // Convert const/let to var
        converted = converted.replace(/\b(const|let)\b/gi, 'var');
        
        return converted;
    }

    /**
     * Clean unsupported JavaScript features from script
     */
    cleanUnsupportedJS(script, feature) {
        // For major libraries, remove the entire script
        if (feature.includes('jQuery') || feature.includes('\\$\\(') || 
            feature.includes('angular') || feature.includes('react')) {
            return '';
        }
        
        // For specific unsupported features, try to remove just those lines
        const lines = script.split('\n');
        const cleanedLines = lines.filter(line => {
            const trimmedLine = line.trim();
            
            // Skip empty lines and comments
            if (!trimmedLine || trimmedLine.startsWith('//')) return true;
            
            // Check if this line contains the unsupported feature
            const regex = new RegExp(feature, 'gi');
            return !regex.test(line);
        });
        
        return cleanedLines.join('\n');
    }

    /**
     * Check if script is compatible with JellyScript limitations
     */
    isJellyScriptCompatible(script) {
        if (!script || script.trim().length === 0) return false;
        
        // Check script length (JellyScript has memory limitations)
        if (script.length > 8192) return false; // 8KB limit for scripts
        
        // Check for obviously incompatible patterns
        const incompatiblePatterns = [
            /import\s+.*from/gi,        // ES6 imports
            /export\s+/gi,              // ES6 exports
            /class\s+\w+\s+extends/gi,  // ES6 classes
            /=>\s*{/gi,                 // Arrow functions
            /async\s+function/gi,       // Async functions
            /await\s+/gi,               // Await expressions
            /Promise\s*\(/gi,           // Promises
            /fetch\s*\(/gi,             // Fetch API
        ];
        
        for (const pattern of incompatiblePatterns) {
            if (pattern.test(script)) return false;
        }
        
        // Simple heuristic: if it's mostly basic JavaScript, it's probably OK
        const basicPatterns = [
            /function\s+\w+/gi,         // Function declarations
            /var\s+\w+/gi,              // Variable declarations
            /if\s*\(/gi,                // If statements
            /for\s*\(/gi,               // For loops
            /while\s*\(/gi,             // While loops
            /document\./gi,             // Document methods
            /window\./gi,               // Window methods
            /alert\s*\(/gi,             // Alert calls
        ];
        
        let basicCount = 0;
        for (const pattern of basicPatterns) {
            if (pattern.test(script)) basicCount++;
        }
        
        // If we found several basic patterns and no complex ones, it's probably OK
        return basicCount > 0;
    }
    intelligentTruncate(content, maxLength) {
        if (content.length <= maxLength) return content;
        
        let truncated = content.substring(0, maxLength);
        
        // Try to cut at a tag boundary
        const lastCloseTag = truncated.lastIndexOf('>');
        const lastOpenTag = truncated.lastIndexOf('<');
        
        if (lastCloseTag > lastOpenTag) {
            truncated = truncated.substring(0, lastCloseTag + 1);
        } else {
            // Cut at word boundary
            const lastSpace = truncated.lastIndexOf(' ');
            if (lastSpace > maxLength * 0.8) { // Only if we don't lose too much
                truncated = truncated.substring(0, lastSpace);
            }
        }
        
        // Add truncation notice
        truncated += '<p><i>[Content truncated for WebTV compatibility]</i></p>';
        
        return truncated;
    }

    /**
     * Transform HTML specifically for WebTV constraints
     * @param {string} html - HTML content
     * @param {string} url - Original URL
     * @param {Object} options - Transformation options
     * @returns {string} - WebTV-compatible HTML
     */
    transformForWebTV(html, url = '', options = {}) {
        const defaults = {
            maxWidth: 544,        // WebTV screen width
            maxTableWidth: 500,   // Max table width
            simplifyTables: true, // Convert complex tables to simple ones
            removeImages: false,  // Whether to remove images entirely
            maxImageWidth: 400,   // Max image width
            preserveLinks: true,  // Keep navigation links
        };
        
        const config = { ...defaults, ...options };
        
        // Extract title from original HTML first
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : 'WebTV Page';
        
        // Transform the HTML content
        let transformed = this.transformHtml(html, url);
        
        // Extract body content from either the transformed HTML or use all content
        let bodyContent = '';
        const bodyMatch = transformed.match(/<body[^>]*>(.*?)<\/body>/is);
        
        if (bodyMatch) {
            bodyContent = bodyMatch[1].trim();
        } else {
            // No body tag found, extract content after head or use transformed content
            const headEndMatch = transformed.match(/<\/head>/i);
            if (headEndMatch) {
                bodyContent = transformed.substring(transformed.indexOf(headEndMatch[0]) + headEndMatch[0].length);
            } else {
                bodyContent = transformed;
            }
            
            // Clean up any remaining structural tags
            bodyContent = bodyContent
                .replace(/<!DOCTYPE[^>]*>/gi, '')
                .replace(/<\/?(?:html|head|body)[^>]*>/gi, '')
                .replace(/<title[^>]*>.*?<\/title>/gi, '')
                .replace(/<meta[^>]*>/gi, '')
                .trim();
        }
        
        // WebTV-specific optimizations on body content
        if (config.simplifyTables) {
            bodyContent = this.simplifyTables(bodyContent, config.maxTableWidth);
        }
        
        if (config.removeImages) {
            bodyContent = bodyContent.replace(/<img[^>]*>/gi, '');
        } else {
            bodyContent = this.optimizeImages(bodyContent, config.maxImageWidth);
        }
                
        // Ensure content isn't too long
        if (bodyContent.length > 32768) {
            bodyContent = this.intelligentTruncate(bodyContent, 32768);
        }
        
        // Rebuild the HTML with the processed body content
        return `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
<html>
<head>
<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1">
<title>${title}</title>
</head>
<body>
${bodyContent}
</body>
</html>`;
    }

    /**
     * Simplify complex tables for WebTV
     */
    simplifyTables(html, maxWidth) {
        return html.replace(/<table[^>]*>/gi, `<table border="1" cellpadding="2" cellspacing="0" width="${maxWidth}">`);
    }

    /**
     * Optimize images for WebTV display
     */
    optimizeImages(html, maxWidth) {
        return html.replace(/<img([^>]*)>/gi, (match, attrs) => {
            // Add max width if not specified
            if (!attrs.includes('width=')) {
                attrs += ` width="${maxWidth}"`;
            }
            return `<img${attrs}>`;
        });
    }
}

module.exports = WTVMinifyingProxy;
