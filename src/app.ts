/*
 * @Date: 2022-04-13 17:10:11
 * @LastEditTime: 2022-04-26 15:14:45
 */
import { loadFetch } from './http/fetch';
import { FLVdemux } from './demux/flv-demux';

class FlvDemux {
    TAG: string = '';
    FLVdemux: FLVdemux;
    constructor () {
        this.TAG = 'FlvDemux';
    }

    /**
     * 获取媒体流数据
     */
    public async load(url) {
        const result = await loadFetch(url);
        this.FLVdemux = new FLVdemux(result);
        const flvHead = await this.FLVdemux.parseFlvHeader();
        const flvScriptTag = await this.FLVdemux.parseFlvFirstTag();
        const flvBodyTag = await this.FLVdemux.parseFlvVideoAudioTag();

        return  {
            flvHead,
            flvScriptTag,
            flvVideoAudioTag: flvBodyTag
        }
    }
}

export default FlvDemux;
