/*
 * @Date: 2022-04-24 16:29:58
 * @LastEditTime: 2022-04-26 14:28:14
 */

import { FLVTag } from '@/parse/flv-tag';

enum SOUND_FORMAT_TYPE {
    'Linear PCM, platform endian' = 0,
    'ADPCM' = 1,
    'MP3' = 2,
    'Linear PCM, little endian' = 3,
    'Nellymoser 16 kHz mono' = 4,
    'Nellymoser 8 kHz mono' = 5,
    'Nellymoser' = 6,
    'G.711 A-law logarithmic PCM' = 7,
    'G.711 mu-law logarithmic PCM' = 8,
    'reserved' = 9,
    'AAC' = 10,
    'Speex' = 11,
    'MP3 8 kHz' = 14,
    'Device-specific sound' = 15,
}

enum SOUND_RATE_TYPE {
    '5.5 kHz' = 0,
    '11 kHz' = 1,
    '22 kHz' = 2,
    '44 kHz' = 3,
}

enum SOUND_SIZE_TYPE {
    '8-bit samples' = 0,
    '16-bit samples' = 1,
}

enum SOUND_TYPE {
    'Mono sound' = 0,
    'Stereo sound' = 1,
}

class PAT {
    index: number = 0;
    u8b: Uint8Array;
    currentTag: FLVTag = null;
    el = (function () {
        let buf = new ArrayBuffer(2);
        (new DataView(buf)).setInt16(0, 256, true);  // little-endian write
        return (new Int16Array(buf))[0] === 256;  // platform-spec read, if equal then LE
    })();

    parseAudioTagData(tag) {
        this.u8b = tag.body;
        this.currentTag = tag;
        this.index = 0;
        const { buffer } = this.u8b;
        const dataView = new DataView(buffer, this.index, this.unreadLength);
        const soundSpec = dataView.getUint8(0);
        // 音频格式
        const soundFormat = SOUND_FORMAT_TYPE[soundSpec >>> 4];
        // 音频码率
        const soundRate = SOUND_RATE_TYPE[(soundSpec & 12) >>> 2];
        const soundUB1 = (soundSpec & 2) >>> 1;
        const soundSize = SOUND_SIZE_TYPE[soundUB1];
        const soundType = SOUND_TYPE[soundUB1];

        this.currentTag.Audio = {
            SoundFormat: soundFormat,
            SoundRate: soundRate,
            SoundSize: soundSize,
            SoundType: soundType
        }

        //  TODO 转码需要解析body
        return this.currentTag;
    }

    readData(length) {
        const _index = this.index;
        this.index += length;
        return this.u8b.slice(_index, this.index);
    }

    get unreadLength() {
        return this.u8b.length - this.index
    }

}

export default new PAT();
