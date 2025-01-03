const prototypes = {
    String: {
        reverse: function () {
            return this.split("").reverse().join("");
        },
        toHexString: function () {
            var result = '';
            for (var i = 0; i < this.length; i++) {
                result += this.charCodeAt(i).toString(16);
            }
            return result;
        }
    },
    Array: {
        replace: function(sub, newSub) {
            splits = this.split(sub, 2);
            return Array.concat(splits[0], newSub, splits[1])
        },
        moveKey: function (from, to) {
            this.splice(to, 0, this.splice(from, 1)[0]);
            return this;
        }
    }
};

for (const [type, methods] of Object.entries(prototypes)) {
    for (const [name, method] of Object.entries(methods)) {
        if (!global[type].prototype[name]) {
            global[type].prototype[name] = method;
        }
    }
}
