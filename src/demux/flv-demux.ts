/*
 * @Date: 2022-04-13 18:48:19
 * @LastEditTime: 2022-04-26 14:26:39
 */
import { FLVTag } from '@/parse/flv-tag';
import PST from '@/parse/script-tag';
import PAT from '@/parse/audio-tag';
import PVT from '@/parse/video-tag';

export class FLVdemux {
    arrayBuffer: ArrayBuffer;
    u8b: Uint8Array;
    flvHeader;
    readOffset: number = 0;
    index: number = 0;  // 当前操作buffer位置
    scriptTagInfo;  // 当前操作buffer位置
    tags: any[] = [];

    tempFlag = true

    constructor (buffer) {
        this.arrayBuffer = buffer;
        this.u8b = new Uint8Array(buffer) || new Uint8Array(0);
    }
    /**
     * 解析flv头部信息
     */
    parseFlvHeader() {
        // 前三个字节总是为FLV , 分别是 0x46, 0x4c, 0x56;
        // const Signature = this.u8b.slice(0, 3);
        /***
         * TODO 偏移的原由
         *  Offset in bytes from start of file to start of body (that is, size of header)
         */
        // 从第6位开始到第9位为偏移长度，总为9
        const readBit32 = () => {
            return (
                (this.u8b[this.index] << 24) |
                (this.u8b[this.index += 1] << 16) |
                (this.u8b[this.index += 1]) << 8 |
                (this.u8b[this.index += 1])
            )
        };
        const Signature = this.readData(3);
        const Version = this.readData(1)[0];
        const TypeFlag: number = this.readData(1)[0];
        const DataOffset = readBit32();
        this.readData(1);
        // 此时的index为8 , 需要手动在进行一位移动，才能将index指向正确的位置 9.才是全部的header

        this.flvHeader = {
            Signature, // flv头部签名
            Version, // 从第四位开始 为flv版本号 
            TypeFlagsReserved1: 0, //   TODO 计算方式待确认，总是为0
            TypeFlagAudio: (TypeFlag & 4) >>> 2, // 第五位开始，第6 bit为音频标志位 0x01 表示有音频
            TypeFlagsReserved2: 0,//  TODO 计算方式待确认，总是为0
            TypeFlagVideo: (TypeFlag & 1),  // 第五位开始，第8 bit为视频标志位  0x01 表示有视频
            DataOffset: DataOffset // 第六四位开始，为数据偏移量，这个总是为9
        };

        return this.flvHeader;
    }


    /**
   * 截取Flv中Tag的信息
   * @returns 
   */
    parseFlvTagData() {
        const tag = new FLVTag();
        // 当剩余数据量满足与一个基本的tag头部信息时，则进行解析。
        if (this.unreadLength > 11) {
            // 获取tag头信息
            tag.TagType = this.readData(1)[0];
            tag.DataSize = FLVTag.readAsInt(this.readData(3));
            tag.Timestamp = FLVTag.getTimestamp(this.readData(3));
            tag.TimestampExtended = this.readData(1);
            tag.StramId = FLVTag.readAsInt(this.readData(3));
            tag.body = this.readData(tag.DataSize);
            tag.tagSize = this.readData(4);
            return tag;
        }
    }

    /**
     * 解析flv 中的script tags
     * @returns {Array} flv tags
     */
    parseFlvFirstTag() {
        // 计算flv body的长度，从第13个字节开始计算， head字节为9，然后加上后面一个4字节的size，这个size是前一个tag的大小，但是第一个tag是不存在的所以第一个size总是为0
        this.readData(4);  // 先偏移4个字节，去除第一个为空的previous TgsSize
        const tag = this.parseFlvTagData();
        // 18为script tag，  第一个tag 为script tag，单独处理script data 属性， 
        if (tag.TagType === 18) {
            // const scriptDataValue = PST.parseScriptTagData(this.u8b, this.index, tag.DataSize);
            const scriptDataValue = PST.parseScriptTagData(tag.body, 0, tag.DataSize);
            this.scriptTagInfo = {
                TagType: tag.TagType,
                DataSize: tag.DataSize,
                Timestamp: tag.Timestamp,
                TimestampExtended: tag.TimestampExtended,
                StramId: tag.StramId,
                body: scriptDataValue
            };
            return this.scriptTagInfo;
        }
    }

    /**
     * 解析flv中video audio tags
     */
    parseFlvVideoAudioTag() {
        return new Promise((resolve, reject) => {
            try {
                //  将所有的tag进行拆分
                while (this.index < this.u8b.length) {
                    const tag = this.parseFlvTagData();

                    if (tag.TagType === 9) {
                        this.tags.push(PVT.parseVideoTagData(tag))
                        // PVT.parseVideoTagData(tag.body, 0, tag.DataSize);
                    }
                    // 音频tag
                    if (tag.TagType === 8) {
                        this.tags.push(PAT.parseAudioTagData(tag));
                    }
                }

                resolve(this.tags);
            } catch (e) { 
                reject(e)
            }

        })

    }

    /**
     * 获取buffer对应数据内容，并移动读取位置
     * @param length 
     * @returns bufferArray
     */
    readData(length) {
        const _index = this.index
        this.index += length
        return this.u8b.slice(_index, _index + length)
    }

    get unreadLength() {
        return this.u8b.length - this.index
    }
    /**
     * 判断是否为flv格式
     */
    isFlv() {
        const buffer = this.u8b
        return (buffer[0] !== 0x46 || buffer[1] !== 0x4C || buffer[2] !== 0x56 || buffer[3] !== 0x01)
    }
}
