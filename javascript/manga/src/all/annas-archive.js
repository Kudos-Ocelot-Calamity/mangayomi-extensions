// this shit uses epub
//

const mangayomiSources = [{
    "name": "Anna's Archive",
    "lang": "all",
    "baseUrl": "https://annas-archive.org",
    "apiUrl": "",
    "iconUrl": "https://annas-archive.org/favicon-32x32.png",
    "typeSource": "single",
    "isManga": true,
    "isNsfw": true,
    "itemType": 0,
    "version": "0.0.1",
    "pkgPath": "manga/src/all/annas-archive.js",
    "notes": ""
}];

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
        this.prefs = new SharedPreferences();
        this.defaultUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
    }

    // mangayomi functions
    get supportsLatest() {
        return true;
    }
    async getPopular(page) {
        return {};
    }
    async search(query, page, filters) {
        return {};
    }
    async getLatestUpdates(page) {
        return {};
    }
    async getDetail(link) {
        return {};
    }
    async getPageList(link) {
        return [];
    }
    getFilterList() {
        return [];
    }
    getSourcePreferences() {
        return [];
    }
}
