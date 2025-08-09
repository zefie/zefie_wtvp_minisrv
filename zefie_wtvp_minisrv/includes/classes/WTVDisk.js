/**
 * wtv/download-list creation helper class
 * By: zefie
 */

const { WTVShared, clientShowAlert } = require("./WTVShared.js");

class WTVDownloadList {

    download_list = "";
    service_name = "";
    content_type = "wtv/download-list";
    wtvshared = null;
    clientShowAlert = null;
    minisrv_config = [];

    /**
     * Constructs the WTVDownloadList Class
     * @param {string} service_name Service name to use in wtv-urls
     */
    constructor(minisrv_config, service_name = "wtv-disk") {
        this.minisrv_config = minisrv_config;
        this.wtvshared = new WTVShared(minisrv_config);
        this.clientShowAlert = clientShowAlert;
        this.service_name = service_name;
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
        this.download_list += `DISPLAY ${message}\n\n`;
    }

    /**
     * Adds an EXECUTE command to the download list
     * @param {string} command client command to execute
     */
    execute(command) {
        this.download_list += `EXECUTE ${command}\n\n`;
    }

    /**
     * Adds a CREATE partition command to the download list
     * @param {string} path file://Disk/ path to desired partition
     * @param {string} size Size of the desired partition
     */
    createPartition(path, size) {
        this.download_list += `CREATE ${path}\npartition-size: ${size}\n\n`;
    }

    /**
     * Adds a CREATE-GROUP command to the download list
     * @param {string} name Group name
     * @param {string} path file://Disk/ path of desired group
     * @param {string} state Group state
     * @param {boolean|null} service_owned Sets service owned flag. (null = don't set)
     */
    createGroup(name, path, state = 'invalid', service_owned = null) {
        this.download_list += `CREATE-GROUP ${name}\nstate: ${state}\n`;
        if (service_owned !== null) this.download_list += `service-owned: ${service_owned}\n`;
        this.download_list += `base: ${path}\n\n`;
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
     * @param {string|null} group Group to which it belongs
     * @param {string|null} original_filename Use this filename (useful if WTV GZ)
     */
    delete(path, group = null, original_filename = null) {
        path = this.checkOriginalName(path, original_filename);
        this.download_list += `DELETE ${path}\n`;
        if (group) this.download_list += `group: ${group}\n\n`;
        else this.download_list += "\n";
    }

    /**
     * Adds a PUT command to the download list
     * @param {string} path Absolute file://Disk/ path of a file to upload to the service
     * @param {string} destination Destination address (wtv url on service) in which to POST upload the file to
     */
    put(path, destination) {
        this.download_list += `PUT ${path}\nlocation: ${destination}\n\n`;
    }

    /**
    * Alias to put() for User Store
    * @param {string} path Absolute file://Disk/ path of a file to upload to the service
    * @param {string} destination Destination file path in the User Store
    */
    putUserStoreDest(path, destination) {
        this.put(path, `${this.service_name}:/userstore?partialPath=${encodeURIComponent(destination)}`);
    }

    /**
     * Alias to putUserStoreDest() that generates the destination
     * @param {string} path
     */
    putUserStore(path) {
        const destination = path.replace("file://", "");
        this.putUserStoreDest(path, destination);
    }
    /**
     * Adds a GET command to the download list
     * @param {string} file Non-absolute path of client destination file (relative to group base)
     * @param {string} path Absolute file://Disk/ path of destination
     * @param {string} source wtv-url to fetch file from
     * @param {string} group Group this file belongs to
     * @param {string|null} checksum md5sum of the file
     * @param {string|null} uncompressed_size Uncompressed size of gzip file
     * @param {string|null} original_filename Use this filename (useful if WTV GZ)
     * @param {string} file_permission File permissions
     */
    get(file, path, source, group, checksum = null, uncompressed_size = null, original_filename = null, file_permission = 'r') {
        if (original_filename) {
            path = path.replace(file, original_filename);
        }
        this.download_list += `GET ${original_filename || file}\n`;

        source = source.replace(/\\/g, "/");
        this.download_list += `group: ${group}-UPDATE\n`;
        this.download_list += `location: ${source}\n`;
        this.download_list += `file-permission: ${file_permission}\n`;
        if (checksum != null) this.download_list += `wtv-checksum: ${checksum}\n`;
        if (uncompressed_size != null) this.download_list += `wtv-uncompressed-filesize: ${uncompressed_size}\n`;
        this.download_list += `service-source-location: /webtv/content/${source.substring(source.indexOf('-') + 1, source.indexOf(':/'))}d/${source.substring(source.indexOf(':/') + 2)}\n`;        
        this.download_list += `client-dest-location: ${path}\n\n`;
    }

    /**
     * Helper function for WTV GZIP, if original_name is set, use this filename instead of the name in the path
     * @param {string} path
     * @param {string} original_name
     * @returns {string} Path, with filename replaces by original_name, or just path if original_name = null
     */
    checkOriginalName(path, original_name) {
        if (original_name) {
            const tmp = this.wtvshared.getFilePath(path);
            if (tmp.length > 0) return `${tmp}/${original_name}`;
            return original_name;
        } else return path;
    }

    getGroupDataFromClientPost(post_data) {
        if (typeof post_data == 'string') post_data = post_data.split("\n\n");
        const group_data = [];
        post_data.forEach(function (v) {
            if (v.substring(0, 4) == "file") {
                const block_split = v.split("\n");
                const group_data_entry = {};
                group_data_entry.path = block_split[0];
                block_split.forEach(function (block_section) {
                    if (block_section.indexOf(": ") > 0) {
                        const block_section_split = block_section.split(": ");
                        group_data_entry[block_section_split[0]] = block_section_split[1];
                    }
                });
                group_data[group_data_entry.group] = group_data_entry;
            }
        });
        return group_data;
    }

    /**
     * Adds a RENAME command to the download list
     * @param {string} srcfile Non-absolute path of client source file (relative to source group base)
     * @param {string} destfile Non-absolute path of client destination file (relative to destination group base)
     * @param {string} srcgroup Source Group
     * @param {string} destgroup Destination Group
     * @param {string} original_filename Use this filename (useful if WTV GZ)
     */
    rename(srcfile, destfile, srcgroup, destgroup, original_filename = null) {
        if (original_filename) {
            srcfile = this.checkOriginalName(srcfile, original_filename);
            destfile = this.checkOriginalName(destfile, original_filename);
        }
        this.download_list += `RENAME ${srcfile}\n`;
        this.download_list += `group: ${srcgroup}-UPDATE\n`;
        this.download_list += `destination-group: ${destgroup}\n`;
        this.download_list += `location: ${destfile}\n\n`;
    }

    /**
     * Adds a SET-GROUP command to the download list
     * @param {string} group Group to set state of
     * @param {string} state State to set group to
     * @param {string} version Version to set group to
     */
    setGroup(group, state, version) {
        this.download_list += `SET-GROUP ${group}\n`;
        this.download_list += `state: ${state}\n`;
        this.download_list += `version: ${version}\n`;
        this.download_list += `last-checkup-time: ${new Date().toUTCString().replace("GMT", "+0000")}\n\n`;
    }

    /**
     * Adds a DELETE-GROUP command to the download list
     * @param {string} group Group to delete
     */
    deleteGroup(group) {
        this.download_list += `DELETE-GROUP ${group}\n\n`;
    }

    /**
     * An alias for deleteGroup() that handles deleting the '-UPDATE' group files for you
     * @param {string} group Group to delete
     * @param {string} path Group base path
     */
    deleteGroupUpdate(group, path) {
        this.deleteGroup(`${group}-UPDATE`);
        this.delete(`${path}.GROUP-UPDATE/`);
    }
}

module.exports = WTVDownloadList;