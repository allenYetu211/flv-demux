/*
 * @Date: 2022-04-24 11:03:01
 * @LastEditTime: 2022-04-24 15:41:22
 */
import DecodeUTF8 from '@/utils/decode-UTF8';


class PST {
    private le;

    constructor () {
        this.le = (function () {
            const buf = new ArrayBuffer(2);
            (new DataView(buf)).setInt16(0, 256, true) // little-endian write
            return (new Int16Array(buf))[0] === 256 // platform-spec read, if equal then LE
        })()
    }

    parseScriptTagData(buffer, bufferOffset, bufferSize) {
        let data = {};

        try {
            const name = this.parseMetaValue(buffer, bufferOffset, bufferSize);
            const value = this.parseMetaValue(buffer, bufferOffset + name.size, bufferSize - name.size);
            console.log('value', value);
            data[name.data] = value.data;
        } catch (e) {
            throw e;
        }
        console.log('data', data);
        return data;
    }

    parseMetaValue(data, bufferOffset, bufferSize) {
        // @ts-ignore
        let buffer = new ArrayBuffer();
        if (data instanceof ArrayBuffer) {
            buffer = data;
        } else {
            buffer = data.buffer;
        }

        const dataView = new DataView(buffer, bufferOffset, bufferSize);
        const type = dataView.getUint8(0);
        let offset = 1;
        let isObjEnd = false;
        let value;

        switch (type) {
            case 0:  // Number(Double) type
                value = dataView.getFloat64(1, !this.le);
                offset += 8;
                break;
            case 1: {  // Boolean type
                let b = dataView.getUint8(1);
                value = b ? true : false;
                offset += 1;
                break;
            }
            case 2: {  // String type
                const str = this.parseString(buffer, bufferOffset + 1, bufferSize - 1);
                value = str.data;
                offset += str.size;
                break;
            }
            case 3: { // Object(s) type
                value = {};
                let terminal = 0;  // workaround for malformed Objects which has missing ScriptDataObjectEnd
                if ((dataView.getUint32(bufferSize - 4, !this.le) & 0x00FFFFFF) === 9) {
                    terminal = 3;
                }
                while (offset < bufferSize - 4) {  // 4 === type(UI8) + ScriptDataObjectEnd(UI24)
                    let amfobj = this.parseObject(buffer, bufferOffset + offset, bufferSize - offset - terminal);
                    if (amfobj.objectEnd)
                        break;
                    value[amfobj.data.name] = amfobj.data.value;
                    offset += amfobj.size;
                }
                if (offset <= bufferSize - 3) {
                    let marker = dataView.getUint32(offset - 1, !this.le) & 0x00FFFFFF;
                    if (marker === 9) {
                        offset += 3;
                    }
                }
                break;
            }
            case 8: { // ECMA array type (Mixed array)
                value = {};
                offset += 4;  // ECMAArrayLength(UI32)
                let terminal = 0;  // workaround for malformed MixedArrays which has missing ScriptDataObjectEnd
                if ((dataView.getUint32(bufferSize - 4, !this.le) & 0x00FFFFFF) === 9) {
                    terminal = 3;
                }
                while (offset < bufferSize - 8) {  // 8 === type(UI8) + ECMAArrayLength(UI32) + ScriptDataVariableEnd(UI24)
                    let amfvar = this.parseVariable(buffer, bufferOffset + offset, bufferSize - offset - terminal);
                    if (amfvar.objectEnd)
                        break;
                    value[amfvar.data.name] = amfvar.data.value;
                    offset += amfvar.size;
                }
                if (offset <= bufferSize - 3) {
                    let marker = dataView.getUint32(offset - 1, !this.le) & 0x00FFFFFF;
                    if (marker === 9) {
                        offset += 3;
                    }
                }
                break;
            }
            case 9:  // ScriptDataObjectEnd
                value = undefined;
                offset = 1;
                isObjEnd = true;
                break;
            case 10: {  // Strict array type
                // ScriptDataValue[n]. NOTE: according to video_file_format_spec_v10_1.pdf
                value = [];
                let strictArrayLength = dataView.getUint32(1, !this.le);
                offset += 4;
                for (let i = 0; i < strictArrayLength; i++) {
                    let val = this.parseMetaValue(buffer, bufferOffset + offset, bufferSize - offset);
                    value.push(val.data);
                    offset += val.size;
                }
                break;
            }
            case 11: {  // Date type
                let date = this.parseDate(buffer, bufferOffset + 1, bufferSize - 1);
                value = date.data;
                offset += date.size;
                break;
            }
            case 12: {  // Long string type
                let amfLongStr = this.parseString(buffer, bufferOffset + 1, bufferSize - 1);
                value = amfLongStr.data;
                // offset += amfLongStr.size;
                break;
            }
            default:
            // ignore and skip
            offset = bufferSize;
        }

        return {
            data: value,
            size: offset,
            isObjEnd: isObjEnd,
        };

    }

    // parseString 解析 tag
    parseString(buffer, buffetOffset, bufferSize) {
        // const dv = new DataView(buffer, this.readOffset);
        const dv = new DataView(buffer, buffetOffset, bufferSize);
        const strLen = dv.getUint16(0, !this.le);
        let str = '';
        if (strLen > 0) {
            // str = DecodeUTF8.decode(new Uint8Array(buffer, this.readOffset + 2, strLen));
            str = DecodeUTF8.decode(new Uint8Array(buffer, buffetOffset + 2, strLen));
            // str = DecodeUTF8.decode(new Uint8Array(buffer, this.readOffset + 2,  buffer.byteLength - 2));
        } else {
            str = '';
        }
        let size = strLen + 2;
        // this.readOffset += size;
        return {
            data: str,
            size
        };
    }


     parseObject(buffer, bufferOffset, bufferSize) {
        let name = this.parseString(buffer, bufferOffset, bufferSize);
        let value = this.parseMetaValue(buffer, bufferOffset + name.size, bufferSize - name.size);
        let isObjectEnd = value.isObjEnd;

        return {
            data: {
                name: name.data,
                value: value.data
            },
            size: name.size + value.size,
            objectEnd: isObjectEnd
        };
    }

     parseDate(buffer, bufferOffset, bufferSize) {
      
        let v = new DataView(buffer, bufferOffset, bufferSize);
        let timestamp = v.getFloat64(0, !this.le);
        let localTimeOffset = v.getInt16(8, !this.le);
        timestamp += localTimeOffset * 60 * 1000;  // get UTC time

        return {
            data: new Date(timestamp),
            size: 8 + 2
        };
    }

     parseVariable(buffer, bufferOffset, bufferSize) {
        return this.parseObject(buffer, bufferOffset, bufferSize);
    }
}

export default new PST();
