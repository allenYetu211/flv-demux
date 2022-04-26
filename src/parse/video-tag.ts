/*
 * @Date: 2022-04-24 16:29:53
 * @LastEditTime: 2022-04-26 15:18:36
 */

import { FLVTag } from '@/parse/flv-tag';

enum FRAME_TYPE {
    'key frame (for AVC, a seekable frame)' = 1,
    'inter frame(for AVC, a non - seekable frame)' = 2,
    'disposable inter frame(H.263 only)' = 3,
    'generated key frame(reserved for server use only)' = 4,
    'video info / command frame' = 5
}

enum CODEC_ID_TYPE {
    'JPEG (currently unused)' = 1,
    'Sorenson H.263' = 2,
    'Screen video' = 3,
    'On2 VP6' = 4,
    'On2 VP6 with alpha channel' = 5,
    'Screen video version 2' = 6,
    'AVC' = 7,
}

enum AVC_PACKET_TYPE {
    'AVC sequence header' = 0,
    'AVC NALU' = 1,
    'VC end of sequence (lower level NALU sequence ender is not required or supported)' = 2,
}

class PVT {
    // 整体偏移值
    index: number = 0;
    u8b: Uint8Array;
    currentTag: FLVTag = null;
    videoTrack = { type: 'video', id: 1, sequenceNumber: 0, samples: [], length: 0 };
    frameType: number = null;
    codecId: number = null;
    el = (function () {
        let buf = new ArrayBuffer(2);
        (new DataView(buf)).setInt16(0, 256, true);  // little-endian write
        return (new Int16Array(buf))[0] === 256;  // platform-spec read, if equal then LE
    })();

    parseVideoTagData(tag) {
        this.u8b = tag.body;
        this.currentTag = tag;
        this.index = 0;

        const spec = this.readData(1)[0];
        this.frameType = (spec & 0xF0) >>> 4;
        let codecId = this.codecId = spec & 0x0F;
        // 如果 编码格式不是AVC H264，则不解析
        if (codecId !== 7) {
            throw new Error('Not support codecId,  codecId: ' + codecId);
        }

        this.parseAVCPacket()
        return this.currentTag;
    }

    /**
     * AVC解析
     * @param length 
     * @returns 
     */
    parseAVCPacket() {
        const currentAvc = this.u8b;
        const { buffer } = currentAvc;
        const dataView = new DataView(buffer, this.index, this.unreadLength);
        const AVCPacketType = dataView.getUint8(0);
        let cpsTime = dataView.getUint32(0, !this.el) & 0x00FFFFFF
        cpsTime = (cpsTime << 8) >> 8;

        this.currentTag.Video = {
            FrameType: `${FRAME_TYPE[this.frameType]}: ${this.frameType}`,
            CodecID: `${CODEC_ID_TYPE[this.codecId]}: ${this.codecId}`,
            AVCPacketType: `${AVC_PACKET_TYPE[AVCPacketType]}: ${AVCPacketType}`,
            //  如果AVCPacketType=1，则为时间cts偏移量 
            CompositionTime: AVCPacketType === 0 ? 0 : cpsTime
        }
    }

    /**
     * TODO: 转码时候在进行处理
     * 解析flv video中的详细信息
     * @param length 
     * @returns 
     */
    parseFLVVideoAVC(AVCPacketType) {
        const currentAvc = this.u8b;
        const { buffer } = currentAvc;
        // 0: AVC 序列头信息
        if (AVCPacketType === 0) {
            this.readData(4);
            this.parseAVCDecoderConfigurationRecord(buffer);
        }
        // 1: AVC NALU
        else if (AVCPacketType === 1) {
        }
        // 2: AVC end of sequence (lower level NALU sequence ender is not required or supported)
        else if (AVCPacketType === 2) {
        } else {
        }
    }

    parseAVCDecoderConfigurationRecord(buffer) {
        if (this.unreadLength < 7) {
            throw new Error('AVC: parseAVCDecoderConfigurationRecord error');
        }
        const dataView = new DataView(buffer, this.index, this.unreadLength);
        const meta = {};
        const track = this.videoTrack;
        meta['id'] = track.id;
        meta['timescale'] = track.id;
        meta['duration'] = track.id;

        let version = dataView.getUint8(0);  // configurationVersion
        let avcProfile = dataView.getUint8(1);  // avcProfileIndication
        let profileCompatibility = dataView.getUint8(2);  // profile_compatibility
        let avcLevel = dataView.getUint8(3);  // AVCLevelIndication
        if (version !== 1 || avcProfile === 0) {
            throw new Error('AVC: Invalid AVCDecoderConfigurationRecord');
        }
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

export default new PVT();
