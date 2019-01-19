export default class Util {
    static withProgress(promises, callback) {
        let done = 0;
        callback(0, promises.length);
        return promises.map(prom => {
            return prom.then(result => {
                callback(++done, promises.length);
                return result;
            })
        })
    }
};