class WTVDownloadList {

    download_list = "";
    content_type = "wtv/download-list";

    constructor() {
        this.clear();
    }

    /**
     * Clears the download list
     */
    clear() {
        this.download_list = "";
    }

    /**
     * Alias to clear() (clears the download list)
     */
    reset() {
        this.clear();
    }

    /**
     * Returns the download list.
     * @returns {string} Download list for client;
     */
    getDownloadList() {
        return this.download_list;
    }

    /**
     * Adds a DISPLAY command to the download list
     * @param {string} message Message to display to the client
     */
    display(message) {
        this.download_list += "DISPLAY " + message + "\n\n";
    }

    /**
     * Adds an EXECUTE command to the download list
     * @param {string} command client command to execute
     */
    execute(command) {
        this.download_list += "EXECUTE " + command + "\n\n";
    }

    /**
     * Adds a CREATE partition command to the download list
     * @param {string} path file://Disk/ path to desired partition
     * @param {string} size Size of the desired partition
     */
    createPartition(path, size) {
        this.download_list += "CREATE " + path + "\n";
        this.download_list += "partition-size: " + size + "\n\n";
    }

    /**
     * Adds a CREATE-GROUP command to the download list
     * @param {string} name Group name
     * @param {string} path file://Disk/ path of desired group
     * @param {string} state Group state
     * @param {boolean|null} service_owned Sets service owned flag. (null = don't set)
     */
    createGroup(name, path, state = 'invalid', service_owned = null) {
        this.download_list += "CREATE-GROUP " + name + "\n";
        this.download_list += "state: " + state + "\n";
        if (service_owned !== null) this.download_list += "service-owned: " + service_owned + "\n";
        this.download_list += "base: " + path + "\n\n";
    }

    /**
     * An alias for createGroup() that handles creating the '-UPDATE' group for you
     * @param {string} name Group name
     * @param {string} path file://Disk/ path of desired group
     * @param {string} state Group state
     * @param {boolean} service_owned Sets service owned flag.
     */
    createUpdateGroup(name, path, state = 'invalid', service_owned = false) {
        this.createGroup(name + "-UPDATE", path, state);
        this.createGroup(name, path, state, service_owned);
    }

    /**
     * Adds a DELETE command to the download list
     * @param {string} path Non-absolute path of client destination file (relative to group base) if group defined, otherwise absolute file://Disk/ path to delete
     * @param {string} group Group to which it belongs
     */
    delete(path, group = null) {
        this.download_list += "DELETE " + path + "\n";
        if (group !== null) this.download_list += "group: " + group + "\n\n";
    }

    /**
     * Adds a PUT command to the download list
     * @param {string} path Absolute file://Disk/ path of a file to upload to the service
     * @param {string} destination Destination address (wtv url on service) in which to POST upload the file to
     * @param {string} display Message to display while working on this file
     */
    put(path, destination) {
        this.download_list += "PUT " + path + "\n";
        this.download_list += "location: " + destination + "\n";
    }

    /**
     * Adds a GET command to the download list
     * @param {string} file Non-absolute path of client destination file (relative to group base)
     * @param {string} path Absolute file://Disk/ path of destination
     * @param {string} source wtv-url to fetch file from
     * @param {string} group Group this file belongs to
     * @param {string} display Message to display while working on this file
     * @param {string} checksum md5sum of the file
     * @param {string} file_permission File permissions
     */
    get(file, path, source, group, checksum = null, file_permission = 'r') {
        this.download_list += "GET " + file + "\n";
        this.download_list += "group: " + group + "-UPDATE\n";
        this.download_list += "location: " + source + "\n";
        this.download_list += "file-permission: " + file_permission + "\n";
        if (checksum != null) this.download_list += "wtv-checksum: " + checksum + "\n";
        this.download_list += "service-source-location: /webtv/content/" + source.substr(source.indexOf('-') + 1, source.indexOf(':/') - source.indexOf('-') - 1) + "d/" + source.substr(source.indexOf(':/') + 2) + "\n";
        this.download_list += "client-dest-location: " + path + "\n\n";
    }

    /**
     * Adds a RENAME command to the download list
     * @param {string} srcfile Non-absolute path of client source file (relative to source group base)
     * @param {string} destfile Non-absolute path of client destination file (relative to destination group base)
     * @param {string} srcgroup Source Group
     * @param {string} destgroup Destination Group
     */
    rename(srcfile, destfile, srcgroup, destgroup) {
        this.download_list += "RENAME " + srcfile + "\n";
        this.download_list += "group: " + srcgroup + "-UPDATE\n";
        this.download_list += "destination-group: " + destgroup + "\n";
        this.download_list += "location: " + destfile + "\n\n";
    }

    /**
     * Adds a SET-GROUP command to the download list
     * @param {any} group Group to set state of
     * @param {any} state State to set group to
     * @param {any} version Version to set group to
     */
    setGroup(group, state, version) {
        this.download_list += "SET-GROUP " + group + "\n";
        this.download_list += "state: " + state + "\n";
        this.download_list += "version: " + version + "\n";
        this.download_list += "last-checkup-time: " + new Date().toUTCString().replace("GMT", "+0000") + "\n\n";
    }
    /**
     * Adds a DELETE-GROUP command to the download list
     * @param {any} group Group to delete
     */
    deleteGroup(group) {
        this.download_list += "DELETE-GROUP " + group + "\n\n";
    }

    /**
     * An alias for deleteGroup() that handles deleting the '-UPDATE' group files for you
     * @param {any} group
     * @param {any} path
     */
    deleteGroupUpdate(group, path) {
        this.deleteGroup(group + "-UPDATE");
        this.delete(path + ".GROUP-UPDATE/");
    }
}

module.exports = WTVDownloadList;