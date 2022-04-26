/*
 * @Date: 2022-04-13 17:10:11
 * @LastEditTime: 2022-04-26 15:17:26
 */

import FlvDemux from '/index.esm.js';

async function init () {
    const flv = new FlvDemux();
    const result = await flv.load('https://devcdn.xylink.com/video-tset/t15.flv');
    console.log('result', result)
}

init();








