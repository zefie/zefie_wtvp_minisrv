class WTVClientSessionData {

    /***********************************\
    |* Special Thanks to:              *|
    |*                         No one  *|
    |* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~  *|
    |*   There is literally nothing    *|
    |*    special about this class     *|
    \***********************************/

    data_store = null;

    constructor() {
        this.data_store = new Array();
    }

    get(key = null) {
        if (typeof (this.data_store) === 'undefined') return null;
        else if (key === null) return this.data_store;
        else if (this.data_store[key]) return this.data_store[key];
        else return null;
    }

    set(key, value) {
        if (key === null) throw ("ClientSessionData.set(): invalid key provided");
        if (typeof (this.data_store) === 'undefined') this.data_store = new Array();
        this.data_store[key] = value;
    }

    delete(key) {
        if (key === null) throw ("ClientSessionData.delete(): invalid key provided");
        delete this.data_store[key];
    }
}


module.exports = WTVClientSessionData;