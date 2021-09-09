/**
 * Pure-JS implementation of WebTV's LZPF compression
 *
 * This compression algorithm is based on LZP by Charles Bloom and was originally written for server to client communication by Andy McFadden
 * This uses a (static) Huffman dictionary that was tuned for character occurances in a typical HTML page at the time (around 1996-1997).
 *
 * Andy McFadden: 
 *  https://fadden.com/
 * LZP: 
 *  https://cbloom.com/src/index_lz.html
 *  https://en.wikibooks.org/wiki/Data_Compression/Dictionary_compression#LZP
 *
 * I wouldn't recommend using LZPF on anything but HTML and other text-based data (unless the data has many repeating bytes)
 * LZPF can be replaced with gzip for LC2 and newer boxes.  Classic is stuck with LZPF.
 * 
 * Reverse engineered and ported by: Eric MacDonald (eMac)
 * Modified By: zefie
**/

class WTVLzpf {
    // Note: currentlty doesn't offer optimal streaming support but this is good enough to meet perf demands at the scale we're at.

    current_bit_length = 0;
    current_bits = 0;
    ring_bufer_index = 0xFFFF;
    working_data = 0;
    match_index = 0;
    compression_mode = 0;
    checksum = 0;
    filler_byte = 0x20
    hash_table = new Uint16Array(0x1000)
    ring_buffer = new Uint8Array(0x2000)
    encoded_data = [];

    /**
     * This is used to encode (one-byte) literals with no previous tracked occurence.
     * 
     * - Bytes with best compression: SPACE and LF and e"/<>Tainoprst
     * - Bytes with good compression: TAB and ,-.1=ABCDEFGHILNOPRSbcdfghlmuw
     * - Bytes that don't change the length of the bit stream: 024:MW_kvy
     * - The rest will increase the length of bit stream
     * 
     * I don't know what process they used to build this dictionary. I assume they 
     * frequency-scanned a bunch of HTML files they had.
     *
     * Using ISO-8859-1 chracter encoding. Didn't seem like they used a different 
     * dictionary for Japan builds (ISO-2022-JP).
    **/
    nomatchEncode = [
        /* [FLATTENED HUFFMAN CODE, CODE BIT LENGTH] */
        [0x0000, 0x10] /* NUL */, [0x0001, 0x10] /* SOH */, [0x0002, 0x10] /* STX */,
        [0x0003, 0x10] /* ETX */, [0x0004, 0x10] /* EOT */, [0x009A, 0x0F] /* ENQ */,
        [0x0005, 0x10] /* ACK */, [0x009C, 0x0F] /* BEL */, [0x009E, 0x0F] /* BS  */,
        [0x3400, 0x06] /* TAB */, [0x7000, 0x05] /* LF  */, [0x00A0, 0x0F] /* VT  */,
        [0x0006, 0x10] /* FF  */, [0x0380, 0x09] /* CR  */, [0x0007, 0x10] /* SO  */,
        [0x0008, 0x10] /* SI  */, [0x0009, 0x10] /* DLE */, [0x000A, 0x10] /* DC1 */,
        [0x000B, 0x10] /* DC2 */, [0x000C, 0x10] /* DC3 */, [0x000D, 0x10] /* DC4 */,
        [0x000E, 0x10] /* NAK */, [0x000F, 0x10] /* SYN */, [0x00A2, 0x0F] /* BTB */,
        [0x0010, 0x10] /* CAN */, [0x0011, 0x10] /* EM  */, [0x0012, 0x10] /* SUB */,
        [0x0013, 0x10] /* ESC */, [0x0014, 0x10] /* FS  */, [0x0015, 0x10] /* GS  */,
        [0x0016, 0x10] /* RS  */, [0x0017, 0x10] /* US  */, [0xE000, 0x04] /* SPACE */,
        [0x0200, 0x0A] /* !   */, [0x7800, 0x05] /* "   */, [0x0400, 0x09] /* #   */,
        [0x00B0, 0x0E] /* $   */, [0x0018, 0x10] /* %   */, [0x0120, 0x0B] /* &   */,
        [0x0480, 0x09] /* '   */, [0x0140, 0x0B] /* (   */, [0x0160, 0x0B] /* )   */,
        [0x0240, 0x0A] /* *   */, [0x00B8, 0x0D] /* +   */, [0x1400, 0x07] /* ,   */,
        [0x1600, 0x07] /* -   */, [0x3800, 0x06] /* .   */, [0x8000, 0x05] /* /   */,
        [0x0A00, 0x08] /* 0   */, [0x1800, 0x07] /* 1   */, [0x0B00, 0x08] /* 2   */,
        [0x0500, 0x09] /* 3   */, [0x0C00, 0x08] /* 4   */, [0x0580, 0x09] /* 5   */,
        [0x0600, 0x09] /* 6   */, [0x0680, 0x09] /* 7   */, [0x0700, 0x09] /* 8   */,
        [0x0780, 0x09] /* 9   */, [0x0D00, 0x08] /* :   */, [0x0180, 0x0B] /* ;   */,
        [0x8800, 0x05] /* <   */, [0x3C00, 0x06] /* =   */, [0x9000, 0x05] /* >   */,
        [0x0280, 0x0A] /* ?   */, [0x00B4, 0x0E] /* @   */, [0x4000, 0x06] /* A   */,
        [0x1A00, 0x07] /* B   */, [0x1C00, 0x07] /* C   */, [0x1E00, 0x07] /* D   */,
        [0x4400, 0x06] /* E   */, [0x2000, 0x07] /* F   */, [0x2200, 0x07] /* G   */,
        [0x2400, 0x07] /* H   */, [0x4800, 0x06] /* I   */, [0x01A0, 0x0B] /* J   */,
        [0x02C0, 0x0A] /* K   */, [0x2600, 0x07] /* L   */, [0x0E00, 0x08] /* M   */,
        [0x4C00, 0x06] /* N   */, [0x5000, 0x06] /* O   */, [0x2800, 0x07] /* P   */,
        [0x00C0, 0x0C] /* Q   */, [0x5400, 0x06] /* R   */, [0x2A00, 0x07] /* S   */,
        [0x9800, 0x05] /* T   */, [0x0800, 0x09] /* U   */, [0x0880, 0x09] /* V   */,
        [0x0F00, 0x08] /* W   */, [0x00D0, 0x0C] /* X   */, [0x0300, 0x0A] /* Y   */,
        [0x0900, 0x09] /* Z   */, [0x0019, 0x10] /* [   */, [0x001A, 0x10] /* \   */,
        [0x001B, 0x10] /* ]   */, [0x001C, 0x10] /* ^   */, [0x1000, 0x08] /* _   */,
        [0x001D, 0x10] /* `   */, [0xA000, 0x05] /* a   */, [0x2C00, 0x07] /* b   */,
        [0x5800, 0x06] /* c   */, [0x5C00, 0x06] /* d   */, [0xF000, 0x04] /* e   */,
        [0x2E00, 0x07] /* f   */, [0x3000, 0x07] /* g   */, [0x6000, 0x06] /* h   */,
        [0xA800, 0x05] /* i   */, [0x01C0, 0x0B] /* j   */, [0x1100, 0x08] /* k   */,
        [0x6400, 0x06] /* l   */, [0x6800, 0x06] /* m   */, [0xB000, 0x05] /* n   */,
        [0xB800, 0x05] /* o   */, [0xC000, 0x05] /* p   */, [0x01E0, 0x0B] /* q   */,
        [0xC800, 0x05] /* r   */, [0xD000, 0x05] /* s   */, [0xD800, 0x05] /* t   */,
        [0x3200, 0x07] /* u   */, [0x1200, 0x08] /* v   */, [0x6C00, 0x06] /* w   */,
        [0x0980, 0x09] /* x   */, [0x1300, 0x08] /* y   */, [0x0340, 0x0A] /* z   */,
        [0x00E0, 0x0C] /* {   */, [0x00F0, 0x0C] /* |   */, [0x0100, 0x0C] /* }   */,
        [0x0110, 0x0C] /* ~   */, [0x001E, 0x10] /* DEL */, [0x001F, 0x10] /* €   */,
        [0x0020, 0x10] /*     */, [0x0021, 0x10] /* ‚   */, [0x0022, 0x10] /* ƒ   */,
        [0x0023, 0x10] /* „   */, [0x0024, 0x10] /* …   */, [0x0025, 0x10] /* †   */,
        [0x0026, 0x10] /* ‡   */, [0x0027, 0x10] /* ˆ   */, [0x0028, 0x10] /* ‰   */,
        [0x0029, 0x10] /* Š   */, [0x002A, 0x10] /* ‹   */, [0x002B, 0x10] /* Œ   */,
        [0x002C, 0x10] /*     */, [0x002D, 0x10] /* Ž   */, [0x002E, 0x10] /*     */,
        [0x002F, 0x10] /*     */, [0x00A4, 0x0F] /* ‘   */, [0x00A6, 0x0F] /* ’   */,
        [0x00A8, 0x0F] /* “   */, [0x0030, 0x10] /* ”   */, [0x0031, 0x10] /* •   */,
        [0x0032, 0x10] /* –   */, [0x0033, 0x10] /* —   */, [0x0034, 0x10] /* ˜   */,
        [0x0035, 0x10] /* ™   */, [0x0036, 0x10] /* š   */, [0x0037, 0x10] /* ›   */,
        [0x0038, 0x10] /* œ   */, [0x0039, 0x10] /*     */, [0x003A, 0x10] /* ž   */,
        [0x003B, 0x10] /* Ÿ   */, [0x003C, 0x10] /* NBSP*/, [0x003D, 0x10] /* ¡   */,
        [0x003E, 0x10] /* ¢   */, [0x003F, 0x10] /* £   */, [0x0040, 0x10] /* ¤   */,
        [0x0041, 0x10] /* ¥   */, [0x0042, 0x10] /* ¦   */, [0x0043, 0x10] /* §   */,
        [0x0044, 0x10] /* ¨   */, [0x0045, 0x10] /* ©   */, [0x0046, 0x10] /* ª   */,
        [0x0047, 0x10] /* «   */, [0x0048, 0x10] /* ¬   */, [0x0049, 0x10] /* SHY */,
        [0x004A, 0x10] /* ®   */, [0x004B, 0x10] /* ¯   */, [0x004C, 0x10] /* °   */,
        [0x004D, 0x10] /* ±   */, [0x004E, 0x10] /* ²   */, [0x004F, 0x10] /* ³   */,
        [0x0050, 0x10] /* ´   */, [0x0051, 0x10] /* µ   */, [0x0052, 0x10] /* ¶   */,
        [0x0053, 0x10] /* ·   */, [0x0054, 0x10] /* ¸   */, [0x0055, 0x10] /* ¹   */,
        [0x0056, 0x10] /* º   */, [0x0057, 0x10] /* »   */, [0x0058, 0x10] /* ¼   */,
        [0x0059, 0x10] /* ½   */, [0x005A, 0x10] /* ¾   */, [0x005B, 0x10] /* ¿   */,
        [0x005C, 0x10] /* À   */, [0x005D, 0x10] /* Á   */, [0x005E, 0x10] /* Â   */,
        [0x005F, 0x10] /* Ã   */, [0x0060, 0x10] /* Ä   */, [0x0061, 0x10] /* Å   */,
        [0x0062, 0x10] /* Æ   */, [0x00AA, 0x0F] /* Ç   */, [0x0063, 0x10] /* È   */,
        [0x0064, 0x10] /* É   */, [0x0065, 0x10] /* Ê   */, [0x0066, 0x10] /* Ë   */,
        [0x0067, 0x10] /* Ì   */, [0x0068, 0x10] /* Í   */, [0x0069, 0x10] /* Î   */,
        [0x006A, 0x10] /* Ï   */, [0x006B, 0x10] /* Ð   */, [0x006C, 0x10] /* Ñ   */,
        [0x006D, 0x10] /* Ò   */, [0x006E, 0x10] /* Ó   */, [0x006F, 0x10] /* Ô   */,
        [0x0070, 0x10] /* Õ   */, [0x0071, 0x10] /* Ö   */, [0x0072, 0x10] /* ×   */,
        [0x0073, 0x10] /* Ø   */, [0x0074, 0x10] /* Ù   */, [0x0075, 0x10] /* Ú   */,
        [0x0076, 0x10] /* Û   */, [0x0077, 0x10] /* Ü   */, [0x0078, 0x10] /* Ý   */,
        [0x0079, 0x10] /* Þ   */, [0x007A, 0x10] /* ß   */, [0x007B, 0x10] /* à   */,
        [0x007C, 0x10] /* á   */, [0x007D, 0x10] /* â   */, [0x007E, 0x10] /* ã   */,
        [0x007F, 0x10] /* ä   */, [0x0080, 0x10] /* å   */, [0x0081, 0x10] /* æ   */,
        [0x0082, 0x10] /* ç   */, [0x0083, 0x10] /* è   */, [0x0084, 0x10] /* é   */,
        [0x0085, 0x10] /* ê   */, [0x0086, 0x10] /* ë   */, [0x0087, 0x10] /* ì   */,
        [0x0088, 0x10] /* í   */, [0x0089, 0x10] /* î   */, [0x008A, 0x10] /* ï   */,
        [0x008B, 0x10] /* ð   */, [0x008C, 0x10] /* ñ   */, [0x008D, 0x10] /* ò   */,
        [0x00AC, 0x0F] /* ó   */, [0x008E, 0x10] /* ô   */, [0x008F, 0x10] /* õ   */,
        [0x0090, 0x10] /* ö   */, [0x0091, 0x10] /* ÷   */, [0x0092, 0x10] /* ø   */,
        [0x0093, 0x10] /* ù   */, [0x00AE, 0x0F] /* ú   */, [0x0094, 0x10] /* û   */,
        [0x0095, 0x10] /* ü   */, [0x0096, 0x10] /* ý   */, [0x0097, 0x10] /* þ   */,
        [0x0098, 0x10] /* ÿ   */, [0x0099, 0x10]
    ];


    /**
     * This is the dictionary that reduces the size based on repeated patterns in the file.
     * 
     * When we find a byte match in the ring buffer we use this dictionary to encode the length of the matched bytes.
     * 
     * - These are intentionally 32-bit.  The leftmost flag bit is 1 in each of these to tell the decoder to use match decoding.
     * - LZP hash bits are used to encode the position where the matched bytes start.
     * - We're allowed to match up to 298 bytes before we can't encode more (we need an entry in this dictionary for each byte more).
     * - We can reach for matches 65KB behind the current LZ cursor (65KB is the ring buffer size and highest a 16-bit hash can reach).
    **/
    matchEncode = [
        /* [MATCH CODE, MATCH CODE BIT LENGTH] */
        [0x80000000, 0x01], [0x80000000, 0x03],
        [0xA0000000, 0x03], [0xC0000000, 0x03],
        [0xE0000000, 0x06], [0xE4000000, 0x06],
        [0xE8000000, 0x06], [0xEC000000, 0x06],
        [0xF0000000, 0x06], [0xF4000000, 0x06],
        [0xF8000000, 0x06], [0xFC000000, 0x0B],
        [0xFC200000, 0x0B], [0xFC400000, 0x0B],
        [0xFC600000, 0x0B], [0xFC800000, 0x0B],
        [0xFCA00000, 0x0B], [0xFCC00000, 0x0B],
        [0xFCE00000, 0x0B], [0xFD000000, 0x0B],
        [0xFD200000, 0x0B], [0xFD400000, 0x0B],
        [0xFD600000, 0x0B], [0xFD800000, 0x0B],
        [0xFDA00000, 0x0B], [0xFDC00000, 0x0B],
        [0xFDE00000, 0x0B], [0xFE000000, 0x0B],
        [0xFE200000, 0x0B], [0xFE400000, 0x0B],
        [0xFE600000, 0x0B], [0xFE800000, 0x0B],
        [0xFEA00000, 0x0B], [0xFEC00000, 0x0B],
        [0xFEE00000, 0x0B], [0xFF000000, 0x0B],
        [0xFF200000, 0x0B], [0xFF400000, 0x0B],
        [0xFF600000, 0x0B], [0xFF800000, 0x0B],
        [0xFFA00000, 0x0B], [0xFFC00000, 0x0B],
        [0xFFE00000, 0x13], [0xFFE02000, 0x13],
        [0xFFE04000, 0x13], [0xFFE06000, 0x13],
        [0xFFE08000, 0x13], [0xFFE0A000, 0x13],
        [0xFFE0C000, 0x13], [0xFFE0E000, 0x13],
        [0xFFE10000, 0x13], [0xFFE12000, 0x13],
        [0xFFE14000, 0x13], [0xFFE16000, 0x13],
        [0xFFE18000, 0x13], [0xFFE1A000, 0x13],
        [0xFFE1C000, 0x13], [0xFFE1E000, 0x13],
        [0xFFE20000, 0x13], [0xFFE22000, 0x13],
        [0xFFE24000, 0x13], [0xFFE26000, 0x13],
        [0xFFE28000, 0x13], [0xFFE2A000, 0x13],
        [0xFFE2C000, 0x13], [0xFFE2E000, 0x13],
        [0xFFE30000, 0x13], [0xFFE32000, 0x13],
        [0xFFE34000, 0x13], [0xFFE36000, 0x13],
        [0xFFE38000, 0x13], [0xFFE3A000, 0x13],
        [0xFFE3C000, 0x13], [0xFFE3E000, 0x13],
        [0xFFE40000, 0x13], [0xFFE42000, 0x13],
        [0xFFE44000, 0x13], [0xFFE46000, 0x13],
        [0xFFE48000, 0x13], [0xFFE4A000, 0x13],
        [0xFFE4C000, 0x13], [0xFFE4E000, 0x13],
        [0xFFE50000, 0x13], [0xFFE52000, 0x13],
        [0xFFE54000, 0x13], [0xFFE56000, 0x13],
        [0xFFE58000, 0x13], [0xFFE5A000, 0x13],
        [0xFFE5C000, 0x13], [0xFFE5E000, 0x13],
        [0xFFE60000, 0x13], [0xFFE62000, 0x13],
        [0xFFE64000, 0x13], [0xFFE66000, 0x13],
        [0xFFE68000, 0x13], [0xFFE6A000, 0x13],
        [0xFFE6C000, 0x13], [0xFFE6E000, 0x13],
        [0xFFE70000, 0x13], [0xFFE72000, 0x13],
        [0xFFE74000, 0x13], [0xFFE76000, 0x13],
        [0xFFE78000, 0x13], [0xFFE7A000, 0x13],
        [0xFFE7C000, 0x13], [0xFFE7E000, 0x13],
        [0xFFE80000, 0x13], [0xFFE82000, 0x13],
        [0xFFE84000, 0x13], [0xFFE86000, 0x13],
        [0xFFE88000, 0x13], [0xFFE8A000, 0x13],
        [0xFFE8C000, 0x13], [0xFFE8E000, 0x13],
        [0xFFE90000, 0x13], [0xFFE92000, 0x13],
        [0xFFE94000, 0x13], [0xFFE96000, 0x13],
        [0xFFE98000, 0x13], [0xFFE9A000, 0x13],
        [0xFFE9C000, 0x13], [0xFFE9E000, 0x13],
        [0xFFEA0000, 0x13], [0xFFEA2000, 0x13],
        [0xFFEA4000, 0x13], [0xFFEA6000, 0x13],
        [0xFFEA8000, 0x13], [0xFFEAA000, 0x13],
        [0xFFEAC000, 0x13], [0xFFEAE000, 0x13],
        [0xFFEB0000, 0x13], [0xFFEB2000, 0x13],
        [0xFFEB4000, 0x13], [0xFFEB6000, 0x13],
        [0xFFEB8000, 0x13], [0xFFEBA000, 0x13],
        [0xFFEBC000, 0x13], [0xFFEBE000, 0x13],
        [0xFFEC0000, 0x13], [0xFFEC2000, 0x13],
        [0xFFEC4000, 0x13], [0xFFEC6000, 0x13],
        [0xFFEC8000, 0x13], [0xFFECA000, 0x13],
        [0xFFECC000, 0x13], [0xFFECE000, 0x13],
        [0xFFED0000, 0x13], [0xFFED2000, 0x13],
        [0xFFED4000, 0x13], [0xFFED6000, 0x13],
        [0xFFED8000, 0x13], [0xFFEDA000, 0x13],
        [0xFFEDC000, 0x13], [0xFFEDE000, 0x13],
        [0xFFEE0000, 0x13], [0xFFEE2000, 0x13],
        [0xFFEE4000, 0x13], [0xFFEE6000, 0x13],
        [0xFFEE8000, 0x13], [0xFFEEA000, 0x13],
        [0xFFEEC000, 0x13], [0xFFEEE000, 0x13],
        [0xFFEF0000, 0x13], [0xFFEF2000, 0x13],
        [0xFFEF4000, 0x13], [0xFFEF6000, 0x13],
        [0xFFEF8000, 0x13], [0xFFEFA000, 0x13],
        [0xFFEFC000, 0x13], [0xFFEFE000, 0x13],
        [0xFFF00000, 0x13], [0xFFF02000, 0x13],
        [0xFFF04000, 0x13], [0xFFF06000, 0x13],
        [0xFFF08000, 0x13], [0xFFF0A000, 0x13],
        [0xFFF0C000, 0x13], [0xFFF0E000, 0x13],
        [0xFFF10000, 0x13], [0xFFF12000, 0x13],
        [0xFFF14000, 0x13], [0xFFF16000, 0x13],
        [0xFFF18000, 0x13], [0xFFF1A000, 0x13],
        [0xFFF1C000, 0x13], [0xFFF1E000, 0x13],
        [0xFFF20000, 0x13], [0xFFF22000, 0x13],
        [0xFFF24000, 0x13], [0xFFF26000, 0x13],
        [0xFFF28000, 0x13], [0xFFF2A000, 0x13],
        [0xFFF2C000, 0x13], [0xFFF2E000, 0x13],
        [0xFFF30000, 0x13], [0xFFF32000, 0x13],
        [0xFFF34000, 0x13], [0xFFF36000, 0x13],
        [0xFFF38000, 0x13], [0xFFF3A000, 0x13],
        [0xFFF3C000, 0x13], [0xFFF3E000, 0x13],
        [0xFFF40000, 0x13], [0xFFF42000, 0x13],
        [0xFFF44000, 0x13], [0xFFF46000, 0x13],
        [0xFFF48000, 0x13], [0xFFF4A000, 0x13],
        [0xFFF4C000, 0x13], [0xFFF4E000, 0x13],
        [0xFFF50000, 0x13], [0xFFF52000, 0x13],
        [0xFFF54000, 0x13], [0xFFF56000, 0x13],
        [0xFFF58000, 0x13], [0xFFF5A000, 0x13],
        [0xFFF5C000, 0x13], [0xFFF5E000, 0x13],
        [0xFFF60000, 0x13], [0xFFF62000, 0x13],
        [0xFFF64000, 0x13], [0xFFF66000, 0x13],
        [0xFFF68000, 0x13], [0xFFF6A000, 0x13],
        [0xFFF6C000, 0x13], [0xFFF6E000, 0x13],
        [0xFFF70000, 0x13], [0xFFF72000, 0x13],
        [0xFFF74000, 0x13], [0xFFF76000, 0x13],
        [0xFFF78000, 0x13], [0xFFF7A000, 0x13],
        [0xFFF7C000, 0x13], [0xFFF7E000, 0x13],
        [0xFFF80000, 0x13], [0xFFF82000, 0x13],
        [0xFFF84000, 0x13], [0xFFF86000, 0x13],
        [0xFFF88000, 0x13], [0xFFF8A000, 0x13],
        [0xFFF8C000, 0x13], [0xFFF8E000, 0x13],
        [0xFFF90000, 0x13], [0xFFF92000, 0x13],
        [0xFFF94000, 0x13], [0xFFF96000, 0x13],
        [0xFFF98000, 0x13], [0xFFF9A000, 0x13],
        [0xFFF9C000, 0x13], [0xFFF9E000, 0x13],
        [0xFFFA0000, 0x13], [0xFFFA2000, 0x13],
        [0xFFFA4000, 0x13], [0xFFFA6000, 0x13],
        [0xFFFA8000, 0x13], [0xFFFAA000, 0x13],
        [0xFFFAC000, 0x13], [0xFFFAE000, 0x13],
        [0xFFFB0000, 0x13], [0xFFFB2000, 0x13],
        [0xFFFB4000, 0x13], [0xFFFB6000, 0x13],
        [0xFFFB8000, 0x13], [0xFFFBA000, 0x13],
        [0xFFFBC000, 0x13], [0xFFFBE000, 0x13],
        [0xFFFC0000, 0x13], [0xFFFC2000, 0x13],
        [0xFFFC4000, 0x13], [0xFFFC6000, 0x13],
        [0xFFFC8000, 0x13], [0xFFFCA000, 0x13],
        [0xFFFCC000, 0x13], [0xFFFCE000, 0x13],
        [0xFFFD0000, 0x13], [0xFFFD2000, 0x13],
        [0xFFFD4000, 0x13], [0xFFFD6000, 0x13],
        [0xFFFD8000, 0x13], [0xFFFDA000, 0x13],
        [0xFFFDC000, 0x13], [0xFFFDE000, 0x13],
        [0xFFFE0000, 0x13], [0xFFFE2000, 0x13],
        [0xFFFE4000, 0x13], [0xFFFE6000, 0x13],
        [0xFFFE8000, 0x13], [0xFFFEA000, 0x13],
        [0xFFFEC000, 0x13], [0xFFFEE000, 0x13],
        [0xFFFF0000, 0x13], [0xFFFF2000, 0x13],
        [0xFFFF4000, 0x13], [0xFFFF6000, 0x13],
        [0xFFFF8000, 0x13], [0xFFFFA000, 0x13],
        [0xFFFFC000, 0x13], [0xFFFFE000, 0x13],
        // We never should select these.  These were in the original executable so including them here.
        [0x00000000, 0x00], [0x00000000, 0x00]
    ];

    /**
     * Initialize the Lzpf class.
     *
     * @returns {undefined}
     */
    constructor() {
    this.reset();
    }

    /**
     * Sets starting values for the compression algorithm.
     *
     * @returns {undefined}
     */
    reset() {
        this.current_bit_length = 0;
        this.current_bits = 0;
        this.ring_bufer_index = 0xFFFF;
        this.working_data = 0;
        this.match_index = 0;
        this.compression_mode = 0;
        this.checksum = 0;
        this.ring_buffer.fill(this.filler_byte, 0, 0x2000)
        this.hash_table.fill(0xFFFF, 0, 0x1000);
        this.encoded_data = [];
    }

    /**
     * Appends a byte to the end of the compressed byte array.  Re-allocates as needed
     *
     * @param byte {Number} char code of the byte to be added.
     *
     * @returns {undefined}
     */
    AddByte(byte) {
        this.encoded_data.push(byte);
    }

    /**
     * Add bits onto the compressed bit stream.
     * 
     * When we reach 8 bits we push a byte onto the compressed byte array.
     *
     * @param bits {Number} bits to add
     * @param bit_length {Number} bit length
     *
     * @returns {undefined}
     */
    AddBits(bits, bit_length) {
        this.current_bits |= bits >>> (this.current_bit_length & 0x1F);
        this.current_bit_length += bit_length;

        while (this.current_bit_length > 7) {
            this.AddByte((this.current_bits >>> 0x18) & 0xFF);

            this.current_bit_length -= 8;
            this.current_bits = (this.current_bits << 8) & 0xFFFFFFFF;
        }
    }

    /**
     * Starts a compression stream
     *
     * @returns {undefined} Lzpf compression data
     */
    Begin() {
        this.reset();
    }

    /**
     * Encode a block of data.  Used for streamed chunks.
     *
     * @param unencoded_data {Buffer} data to encode
     * @param compress_data {Boolean} compress data
     *
     * @returns {Buffer} Lzpf encoded data
     */
    EncodeBlock(unencoded_data, compress_data) {
        this.encoded_data = [];
        var uncompressed_len = unencoded_data.byteLength;

        var i = 0;
        var hash_index = 0;
        while (i < uncompressed_len) {
            var code_length = -1;
            var code = -1;

            var byte = unencoded_data.readUInt8(i);
            this.ring_buffer[i & 0x1FFF] = byte;

            if (this.match_index > 0) {
                // Cozy time
                if (byte != this.ring_buffer[this.ring_bufer_index] || this.match_index > 0x0127) {
                    // End of matching.  Either we no longer match or we reached out limit.
                    code_length = this.matchEncode[this.match_index][1];
                    code = this.matchEncode[this.match_index][0];
                    this.match_index = 0;
                    this.compression_mode = 3;
                } else {
                    // Previous iteration found a match so we continue matching until we can't.
                    this.match_index = (this.match_index + 1) & 0x1FFF;
                    this.ring_bufer_index = (this.ring_bufer_index + 1) & 0x1FFF;
                    this.checksum = (this.checksum + byte) & 0xFFFF;
                    this.working_data = ((this.working_data * 0x0100) + byte) & 0xFFFFFFFF;
                    i++;
                }
            } else {
                this.ring_bufer_index = 0xFFFF;

                if (i >= 3) {
                    // Start recoding data so we can lookup matches.
                    hash_index = (this.working_data >>> 0x0B ^ this.working_data) & 0x0FFF;
                    this.ring_bufer_index = this.hash_table[hash_index];
                    this.hash_table[hash_index] = i & 0x1FFF;
                } else {
                    // The first three uncompressed bytes aren't used for the matching algorithm.
                    this.compression_mode++;
                }

                if (this.ring_bufer_index == 0xFFFF) {
                    // We never seen this byte before so we encode it with our Huffman dictionary.
                    code_length = this.nomatchEncode[byte][1];
                    code = this.nomatchEncode[byte][0] << 0x10;
                } else if (byte == this.ring_buffer[this.ring_bufer_index] && compress_data) {
                    // Wow dude, a match has been found.  Let's switch get our own room in the next iteration to see if we match further.
                    this.match_index = 1;
                    this.ring_bufer_index = (this.ring_bufer_index + 1) & 0x1FFF;
                    this.compression_mode = 4;
                } else {
                    // We've seen these bytes before but the index in the ring buffer doesn't match so we revert to our neat Huffman dictionary
                    // We add 1 flag bit of 0 to account for the fact we've had a hash table hit but no hit in the ring buffer.
                    code_length = this.nomatchEncode[byte][1] + 1;
                    code = this.nomatchEncode[byte][0] << 0x0F;
                }

                this.checksum = (this.checksum + byte) & 0xFFFF;
                // We work on a 2-byte context so we store the last two bytes so we can do cool lookups with it
                this.working_data = ((this.working_data * 0x0100) + byte) & 0xFFFFFFFF;
                i++;
            }

            if (code_length > 0) {
                this.AddBits(code, code_length);
            }
        }
    }

    /**
     * Ends a compression stream.
     *
     * @param compression_mode {Number} the end type used to finalize
     *
     * @returns {Buffer} Lzpf compression data
     */
    Finish() {
        var code_length = -1;
        var code = -1;

        if (this.compression_mode == 2) {
            this.AddBits(0x00990000, 0x10);
        } else if (this.compression_mode >= 3) {
            if (this.compression_mode == 4) {
                code_length = this.matchEncode[this.match_index][1];
                code = this.matchEncode[this.match_index][0];
                this.AddBits(code, code_length);
            }

            var hash_index = (this.working_data >>> 0x0B ^ this.working_data) & 0x0FFF;
            var ring_bufer_index = this.hash_table[hash_index];
            if (ring_bufer_index == 0xFFFF) {
                this.AddBits(0x00990000, 0x10);
            } else {
                this.AddBits(0x004C8000, 0x11);
            }
        }

        // Add checksum bits
        this.AddBits((this.checksum << 0x10) & 0xFFFFFFFF, 0x08);
        this.AddBits((this.checksum << 0x18) & 0xFFFFFFFF, 0x08);

        // If we have leftover bits then add it.
        if (this.current_bits != 0x00) {
            this.AddByte((this.current_bits >>> 0x18) & 0xFF);
        }

        this.AddByte(this.filler_byte);

        return Buffer.from(this.encoded_data);
    }

    /**
     * Converts the data to a Javascript Buffer object
     *
     * @param data {String|Buffer} Data to convert
     *
     * @returns {Buffer} Javascript Buffer object
     */
    ConvertToBuffer(data) {
        data = new Buffer.from(data.toString('binary'));
        return data;
    }

    /**
     * Compress data using WebTV's Lzpf compression algorithm and adds the footer to the end.
     *
     * @param uncompressed_data {String|Buffer} data to compress
     *
     * @returns {Buffer} Lzpf compression data
     */
    Compress(uncompressed_data) {
        uncompressed_data = this.ConvertToBuffer(uncompressed_data);
        this.Begin();
        this.EncodeBlock(uncompressed_data, true);
        return this.Finish();
    }
}

module.exports = WTVLzpf;
