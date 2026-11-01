class LZSS {
    constructor() {
        this.ring_buffer_size = 0x1000;       // 4096 bytes
        this.root_index = 0x1000;             // 4096
        this.max_match_length = 0x11;         // 17 bytes
        this.match_threshold = 0x03;          // minimum match length = 3
        this.match_position = 0;
        this.match_length = 0;
        this.clear();
    }

    clear() {
        // Allocate ring buffer with extra room for lookahead.
        this.ring_buffer = new Uint8Array(this.ring_buffer_size + this.max_match_length);
        // Initialize helper arrays.
        this.parent = new Array(this.ring_buffer_size + 1).fill(0);
        this.rchild = new Array((this.ring_buffer_size * 2) + 1).fill(0);
        this.lchild = new Array((this.ring_buffer_size * 2) + 1).fill(0);

        // Fill the first part of the ring buffer with spaces (0x20).
        for (let ii = 0; ii < (this.ring_buffer_size - this.max_match_length); ii++) {
            this.ring_buffer[ii] = 0x20;
        }
        // Initialize rchild for indices beyond the ring buffer.
        for (let ii = this.ring_buffer_size + 1; ii < this.rchild.length; ii++) {
            this.rchild[ii] = this.root_index;
        }
        // Set all parent pointers to the root index.
        for (let ii = 0; ii < (this.ring_buffer_size - 1); ii++) {
            this.parent[ii] = this.root_index;
        }
        this.match_position = 0;
        this.match_length = 0;
    }

    insertNode(i) {
        const keyi = this.ring_buffer[i];
        let keyii = this.ring_buffer[i + 1] ^ this.ring_buffer[i + 2];
        keyii = ((keyii ^ (keyii >> 4)) & 0x0F) << 8;

        let parent_index = i;
        let parent_link = (this.ring_buffer_size + 1) + keyi + keyii;
        let child_index = parent_link;
        let child_link = i;

        // Initialize children for node i.
        this.rchild[i] = this.root_index;
        this.lchild[i] = this.root_index;
        this.match_length = 0;
        let matched_list = this.rchild;
        let cmp_index = 1;
        let looped = 0;
        while (true) {
            looped++;
            if (looped >= 0xFFFF) {
                throw new Error("Runaway loop in insertNode!");
            }
            if (cmp_index >= 0) {
                cmp_index = this.rchild[parent_link];
                matched_list = this.rchild;
            } else {
                cmp_index = this.lchild[parent_link];
                matched_list = this.lchild;
            }
            if (cmp_index === this.root_index) {
                parent_index = i;
                child_index = parent_link;
                child_link = i;
                break;
            }
            parent_link = cmp_index;
            let ii = 1;
            while (ii < this.max_match_length) {
                if (this.ring_buffer[i + ii] !== this.ring_buffer[parent_link + ii]) {
                    break;
                }
                ii++;
            }
            if (ii > this.match_length) {
                this.match_length = ii;
                this.match_position = parent_link;
                if (ii > (this.max_match_length - 1)) {
                    this.parent[i] = this.parent[parent_link];
                    this.rchild[i] = this.rchild[parent_link];
                    this.lchild[i] = this.lchild[parent_link];
                    this.parent[this.rchild[i]] = i;
                    this.parent[this.lchild[i]] = i;
                    if (this.rchild[this.parent[parent_link]] !== parent_link) {
                        matched_list = this.lchild;
                    } else {
                        matched_list = this.rchild;
                    }
                    child_index = this.parent[parent_link];
                    child_link = i;
                    parent_index = parent_link;
                    parent_link = this.root_index;
                    break;
                }
            }
        }
        this.parent[parent_index] = parent_link;
        matched_list[child_index] = child_link;
    }

    deleteNode(i) {
        if (this.parent[i] !== this.root_index) {
            let ii = 0;
            if (this.rchild[i] === this.root_index) {
                ii = this.lchild[i];
            } else if (this.lchild[i] === this.root_index) {
                ii = this.rchild[i];
            } else {
                ii = this.lchild[i];
                if (ii !== this.root_index) {
                    let looped = 0;
                    while (ii !== this.root_index) {
                        looped++;
                        if (looped >= 0xFFFF) {
                            throw new Error("Runaway loop in deleteNode!");
                        }
                        ii = this.rchild[ii];
                    }
                    this.rchild[this.parent[ii]] = this.lchild[ii];
                    this.parent[this.lchild[ii]] = this.parent[ii];
                    this.lchild[ii] = this.lchild[i];
                    this.parent[this.lchild[i]] = ii;
                }
                this.rchild[ii] = this.rchild[i];
                this.parent[this.rchild[i]] = ii;
            }
            this.parent[ii] = this.parent[i];
            const parent_link = this.parent[i];
            if (this.rchild[parent_link] !== i) {
                this.lchild[parent_link] = ii;
            } else {
                this.rchild[parent_link] = ii;
            }
            this.parent[i] = this.root_index;
        }
    }

    compress(uncompressedData) {
        const uncompressed_size = uncompressedData.length;
        let i = 0;
        let ring_index = 0;
        const ring_footer_start = this.ring_buffer_size - this.max_match_length - 1;
        let footer_index = ring_footer_start;
        let length = 0;

        // Fill lookahead buffer.
        for (; length <= this.max_match_length && i < uncompressed_size; length++) {
            this.ring_buffer[ring_footer_start + length] = uncompressedData[i++];
        }

        let mask = 1; // use as 8-bit flag
        const code_buffer = new Array(0x14).fill(0); // 20 bytes buffer; first byte holds flags.
        let code_buffer_index = 1;
        const compressed_data = [];

        this.insertNode(ring_footer_start);
        while (length > 0) {
            if (this.match_length > length) {
                this.match_length = length;
            }

            if (this.match_length >= this.match_threshold) {
                let _match_position = footer_index - this.match_position - 1;
                if (_match_position < 0) {
                    _match_position += this.ring_buffer_size;
                }
                code_buffer[code_buffer_index++] = _match_position & 0xFF;
                code_buffer[code_buffer_index++] =
                    (((_match_position >> 4) & 0xF0) | (this.match_length - this.match_threshold)) & 0xFF;
            } else {
                this.match_length = 1;
                code_buffer[0] |= mask;
                code_buffer[code_buffer_index++] = this.ring_buffer[footer_index];
            }

            // Shift mask as an 8-bit value.
            mask = (mask << 1) & 0xFF;
            if (mask === 0) {
                for (let ii = 0; ii < code_buffer_index; ii++) {
                    compressed_data.push(code_buffer[ii]);
                }
                code_buffer[0] = 0;
                mask = 1;
                code_buffer_index = 1;
            }

            const last_match_length = this.match_length;
            if (last_match_length > 0) {
                for (let ii = 0; ii < last_match_length; ii++, i++) {
                    this.deleteNode(ring_index);
                    if (i < uncompressed_size) {
                        this.ring_buffer[ring_index] = uncompressedData[i];
                        if (ring_index <= (this.max_match_length - 1)) {
                            this.ring_buffer[this.ring_buffer_size + ring_index] = uncompressedData[i];
                        }
                    } else {
                        i = uncompressed_size - 1;
                        length--;
                    }
                    ring_index = (ring_index + 1) & (this.ring_buffer_size - 1);
                    footer_index = (footer_index + 1) & (this.ring_buffer_size - 1);
                    if (length !== 0) {
                        this.insertNode(footer_index);
                    }
                }
            }
        }

        if (code_buffer_index > 1) {
            for (let ii = 0; ii < code_buffer_index; ii++) {
                compressed_data.push(code_buffer[ii]);
            }
        }

        return new Uint8Array(compressed_data);
    }

    expand(compressedData, uncompressedSize = 0, flagsStart = 0) {
        const compressed_size = compressedData.length;
        const uncompressed_data = [];
        let flags = flagsStart >>> 0;
        let i = 0;
        while (i < compressed_size) {
            if ((flags & 0x100) === 0) {
                flags = compressedData[i] | 0xFF00;
                i++;
            }
            const current_byte = compressedData[i];
            if ((flags & 0x01) === 0x01) {
                uncompressed_data.push(current_byte);
            } else {
                i++;
                const next_byte = compressedData[i];
                const m = (((next_byte & 0xF0) << 4) | current_byte) >>> 0;
                const matchLen = (next_byte & 0x0F) + this.match_threshold;
                for (let ii = 0; ii < matchLen; ii++) {
                    const index = uncompressed_data.length - (m + 1);
                    uncompressed_data.push(uncompressed_data[index]);
                }
            }
            flags >>= 1;
            i++;
            if (uncompressedSize > 0 && uncompressed_data.length >= uncompressedSize) {
                break;
            }
        }
        return new Uint8Array(uncompressed_data);
    }
}

module.exports = LZSS;