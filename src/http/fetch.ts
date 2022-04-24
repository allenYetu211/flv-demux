/*
 * @Date: 2022-04-13 17:16:57
 * @LastEditTime: 2022-04-13 17:40:47
 */


export const loadFetch = async (url: string, option?: RequestInit) => {
    const reject = await fetch(url, option);
    return reject.arrayBuffer();
}
