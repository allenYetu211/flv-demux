/*
 * @Date: 2022-04-13 17:10:11
 * @LastEditTime: 2022-04-24 16:02:29
 */
import { loadFetch } from './http/fetch';
import { FLVdemux } from './demux/parse';

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
        const flvHead = this.FLVdemux.parseFlvHeader();
        const flvScriptTag = this.FLVdemux.parseFlvFirstTag();
        const flvBodyTag = this.FLVdemux.parseFlvVideoAudioTag();
        console.log('flvScriptTag', flvScriptTag);
    }
}

export default FlvDemux;
