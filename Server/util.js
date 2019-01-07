Map.prototype.find = function(matcher) {
    for (let [key, val] of this) {
        if (matcher(val, key)) {
            return val;
        }
    }
    return null;
};