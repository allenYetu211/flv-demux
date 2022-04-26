/*
 * @Date: 2022-04-14 11:33:07
 * @LastEditTime: 2022-04-26 15:09:57
 */


export class FLVTag {
    PreviousTagSize: number = 0;
    TagType: number = 0;
    DataSize: number = 0;
    Timestamp: number = 0;
    // StramId: Uint8Array;
    StramId: number = 0;
    TimestampExtended: Uint8Array;
    body: Uint8Array;
    tagSize: Uint8Array;
    StreamID: number = 0;
    Data: number = 0;
    Video?: {
        FrameType: string;
        CodecID: string;
        AVCPacketType: string;
        CompositionTime: number | string;
    } 
    Audio?: {
        SoundFormat: string
        SoundRate: string
        SoundSize: string
        SoundType: string
        // SoundData
      }
    

    // 转换时间戳显示
    static getTimestamp(array) {
        const arr = [];
        for (let i = 0; i < array.length; i++) {
            arr.push((array[i].toString(16).length === 1 ? '0' + array[i].toString(16) : array[i].toString(16)));
        }
        arr.pop();
        const time = arr.join('');
        return parseInt(time, 16);
    }

    // 转换数据大小显示
    static readAsInt (arr) {
        let temp = '';
        function padStart4Hex (hexNum) {
            let hexStr = hexNum.toString(16);
            return hexStr.padStart(2, '0');
        }
        arr.forEach(num => {
            temp += padStart4Hex(num);
        });
        return parseInt(temp, 16)
    }

    
}

