const mangayomiSources = [{
    "name": "Bato.to",
    "lang": "all",
    "baseUrl": "https://bato.si",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/tympanicblock61/mangayomi-extensions/refs/heads/main/javascript/icon/all.bato.png",
    "typeSource": "single",
    "isManga": true,
    "isNsfw": true,
    "itemType": 0,
    "version": "0.0.12",
    "pkgPath": "manga/src/all/bato.js",
    "notes": ""
}];

const queries = {
    "get_content_searchComic":"query get_content_searchComic($select: SearchComic_Select) {get_content_searchComic(select: $select) {items {id data {name slug summary {text} urlPath urlCover600 genres artists authors uploadStatus }}}}",
    "get_content_comicNode": "query get_content_comicNode($id: ID!) {get_content_comicNode(id: $id) {id data {name slug summary {text} urlPath urlCover600 genres artists authors uploadStatus}}}",
    "get_content_chapterList": "query get_content_chapterList($comicId: ID!) {get_content_chapterList(comicId: $comicId) {data {datePublic dname urlPath userNode {data {name}}}}}",
    "get_content_chapterNode": "query get_content_chapterNode($id: ID!) {get_content_chapterNode(id: $id) {data {imageFiles}}}"
}
const Languages = {
    "Arabic": "ar",
    "Armenian": "hy",
    "Azerbaijani": "az",
    "Amharic": "am",
    "English": "en",
    "Afrikaans": "af",
    "Belarusian": "be",
    "Albanian": "sq",
    "Bengali": "bn",
    "Burmese": "my",
    "Cebuano": "ceb",
    "Danish": "da",
    "Estonian": "et",
    "Finnish": "fi",
    "German": "de",
    "Hebrew": "he",
    "Gujarati": "gu",
    "Icelandic": "is",
    "Irish": "ga",
    "Javanese": "jv",
    "Korean": "ko",
    "Lao": "lo",
    "Luxembourgish": "lb",
    "Malay": "ms",
    "Maori": "mi",
    "Mongolian": "mn",
    "nyanja": "ny",
    "Polish": "pl",
    "Romanian": "ro",
    "Samoan": "sm",
    "SoSotho": "st",
    "Sinhalese": "si",
    "Somali": "so",
    "Swahili": "sw",
    "Tigrinya": "ti",
    "Tamil": "ta",
    "Turkmen": "tk",
    "Uzbek": "uz",
    "Zulu": "zu",
    "Yoruba": "yo",
    "Urdu": "ur",
    "Turkish": "tr",
    "Thai": "th",
    "Tajik": "tg",
    "Slovenian": "sl",
    "Sindhi": "sd",
    "Serbo-Croatian": "sh",
    "Russian": "ru",
    "Persian": "fa",
    "Norwegian": "no",
    "Maltese": "mt",
    "Malagasy": "mg",
    "Lithuanian": "lt",
    "Kyrgyz": "ky",
    "Kazakh": "kk",
    "Japanese": "ja",
    "Indonesian": "id",
    "Hungarian": "hu",
    "Hausa": "ha",
    "Guarani": "gn",
    "Georgian": "ka",
    "Filipino": "fil",
    "Czech": "cs",
    "Catalan": "ca",
    "Bulgarian": "bg",
    "Bosnian": "bs",
    "Cambodian": "km",
    "Chinese": "zh",
    "Croatian": "hr",
    "Dutch": "nl",
    "Faroese": "fo",
    "French": "fr",
    "Greek": "el",
    "Haitian Creole": "ht",
    "Hindi": "hi",
    "Igbo": "ig",
    "Italian": "it",
    "Kannada": "kn",
    "Kurdish": "ku",
    "Latvian": "lv",
    "Macedonian": "mk",
    "Malayalam": "ml",
    "Nepali": "ne",
    "Marathi": "mr",
    "Pashto": "ps",
    "Portuguese": "pt",
    "Romansh": "rm",
    "Serbian": "sr",
    "Slovak": "sk",
    "Shona": "sn",
    "Spanish": "es",
    "Swedish": "sv",
    "Telugu": "te",
    "Tonga": "to",
    "Ukrainian": "uk",
    "Vietnamese": "vi",
    "Chinese (Taiwan)": "zh_tw",
    "Chinese (HongKong)": "zh_hk",
    "Spanish (Latin America)": "es_419",
    "Portuguese (Brazil)": "pt_br",
    "Moldavian": "mo",
    "Other": "_t"
}

const StatusMap = {
    "ongoing": 0,
    "completed": 1,
    "hiatus": 2,
    "cancelled": 3,
    "pending": 4,
    "unknown": 5
}

function convertTypes(type, obj) {
    let state = [];
        for (const name of Object.keys(obj)) {
        state.push({ type_name:type, name, value: obj[name] })
    }
    return state;
}

class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
        this.prefs = new SharedPreferences();
        this.defaultUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
        this.graphql_endpoint = "apo"; // or ap2, which is v4 and uses different queries
        this.query_size = 10;
    }

    // custom defined functions
    fixURL(u) {
        return u.replace(
            /(^|\/\/)(k)(\d*\.)/i,
            `$1n$3`
        );
    }
    get baseUrl() {
      let baseUrl = this.prefs.get("baseurl");
      if (baseUrl.length == 0) baseUrl = this.source.baseUrl;
      if (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);
      return baseUrl;
    }
    getHeaders(url) {
        return {
            'referer': url,
            'user-agent': (this.prefs.get("useragent")).length == 0 ? this.defaultUserAgent : this.prefs.get("useragent"),
            'accept': '*/*',
            'accept-encoding': 'gzip, deflate',
            'connection': 'keep-alive'
        };
    }
    async graphql(query_name, variables) {
        let headers = this.getHeaders(this.baseUrl);
        headers["content-type"] = "application/json";

        const res = await this.client.post(`${this.baseUrl}/${this.graphql_endpoint}`, headers, {
            query: queries[query_name],
            variables: variables || {},
            operationName: null
        });
        const js = JSON.parse(res.body || "{}");
        if (js.data && js.data[query_name]) return js.data[query_name];
        return js;
    }
    comicData(comic) {
        return {
            name: comic["data"]["name"],
            imageUrl: this.fixURL(comic["data"]["urlCover600"]),
            link: this.baseUrl+comic["data"]["urlPath"],
            genre: comic["data"]["genres"],
            author: comic["data"]["authors"].join(" & "),
            artist: comic["data"]["artists"].join(" & "),
            description: comic["data"]["summary"]["text"],
            status: StatusMap[comic["data"]["uploadStatus"]] ?? 5
        }
    }
    async searchComics(where, page, extra = {}) {
        let res = await this.graphql("get_content_searchComic", {
            "select": {
                "where": where,
                "page": page,
                "size": this.query_size,
                ...extra
            }
        });
        let list = res.items.map(e => this.comicData(e));
        return {list, hasNextPage: list.length == this.query_size};
    }

    // mangayomi functions
    get supportsLatest() {
        return true;
    }
    async getPopular(page) {
        return await this.searchComics("popular", page);
    }
    async search(query, page, filters) {
        let incGenres = [];
        let excGenres = [];
        let incOLangs = [];
        let incTLangs = [];
        let batoStatus = "";
        let origStatus = "";
        filters.forEach(filter => {
            if (filter.type === "GenreFilter") {
                incGenres = filter.state.filter(e => e.state === 1).map(e => e.value);
                excGenres = filter.state.filter(e => e.state === 2).map(e => e.value);
            }
            if (filter.type === "OrigLangFilter") {
                incOLangs = filter.state.filter(e => e.state).map(e => e.value)
            }
            if (filter.type === "TransLangFilter") {
                incTLangs = filter.state.filter(e => e.state).map(e => e.value);
            }
            if (filter.type === "BatoStatus") {
                if (filter.values[filter.state].value != "unknown") batoStatus = filter.values[filter.state].value;
            }
            if (filter.type == "OriginalStatus") {
                if (filter.values[filter.state].value != "unknown") origStatus = filter.values[filter.state].value;
            }
        })
        return this.searchComics("browse", page, {
            "word": query,
            excGenres,
            incGenres,
            incOLangs,
            incTLangs,
            batoStatus,
            origStatus
        })
    }
    async getLatestUpdates(page) {
        return await this.searchComics("latest", page);
    }
    async getDetail(link) {
        const match = link.match(/\/title\/(\d+)/);
        const id = match ? match[1] : null;
        let comic = await this.graphql("get_content_comicNode", {
            "id": id
        });
        let chaps = await this.graphql("get_content_chapterList", {
            "comicId": id,
        });
        let chapters = [];
        console.log(chaps);

        for (const chapter of chaps.reverse()) {
            chapters.push({
                name: chapter["data"]["dname"],
                url: this.baseUrl+chapter["data"]["urlPath"],
                dateUpload: String(new Date(chapter["data"]["datePublic"]).getTime()),
                scanlator: chapter?.data?.userNode?.data?.name || "Unknown",
            })
        }
        return {
            link,
            chapters,
            ...this.comicData(comic)
        }
    }
    async getPageList(link) {
        const match = link.match(/\/title\/(\d+)[^/]+\/(\d+)/);
        const comicId = match ? match[1] : null;
        const chapterId = match ? match[2] : null;
        let res = await this.graphql("get_content_chapterNode", {
            id: chapterId
        })
        return res.data.imageFiles.map(u => this.fixURL(u));
    }
    getFilterList() {
        return [
            {
                type_name: "GroupFilter",
                type: "GenreFilter",
                name: "Genres",
                state: convertTypes("TriState",{
                    "Artbook": "artbook",
                    "Cartoon": "cartoon",
                    "Comic": "comic",
                    "Doujinshi": "doujinshi",
                    "Imageset": "imageset",
                    "Manga": "manga",
                    "Manhua": "manhua",
                    "Manhwa": "manhwa",
                    "Webtoon": "webtoon",
                    "Western": "western",
                    "Josei": "josei",
                    "Seinen": "seinen",
                    "Shoujo": "shoujo",
                    "Shoujo ai": "shoujo_ai",
                    "Shounen": "shounen",
                    "Shounen ai": "shounen_ai",
                    "Yaoi": "yaoi",
                    "Yuri": "yuri",
                    "Gore": "gore",
                    "Bloody": "bloody",
                    "Violence": "violence",
                    "Ecchi": "ecchi",
                    "Adult": "adult",
                    "Mature": "mature",
                    "Smut": "smut",
                    "Hentai": "hentai",
                    "4-Koma": "_4_koma",
                    "Action": "action",
                    "Adaptation": "adaptation",
                    "Adventure": "adventure",
                    "Aliens": "aliens",
                    "Animals": "animals",
                    "Anthology": "anthology",
                    "cars": "cars",
                    "Comedy": "comedy",
                    "Cooking": "cooking",
                    "crime": "crime",
                    "Crossdressing": "crossdressing",
                    "Cultivation": "cultivation",
                    "Delinquents": "delinquents",
                    "Dementia": "dementia",
                    "Demons": "demons",
                    "Drama": "drama",
                    "Fantasy": "fantasy",
                    "Fan-Colored": "fan_colored",
                    "Full Color": "full_color",
                    "Game": "game",
                    "Gender Bender": "gender_bender",
                    "Genderswap": "genderswap",
                    "Ghosts": "ghosts",
                    "Gyaru": "gyaru",
                    "Harem": "harem",
                    "Harlequin": "harlequin",
                    "Historical": "historical",
                    "Horror": "horror",
                    "Incest": "incest",
                    "Isekai": "isekai",
                    "Kids": "kids",
                    "Loli": "loli",
                    "Magic": "magic",
                    "Magical Girls": "magical_girls",
                    "Martial Arts": "martial_arts",
                    "Mecha": "mecha",
                    "Medical": "medical",
                    "Military": "military",
                    "Monster Girls": "monster_girls",
                    "Monsters": "monsters",
                    "Music": "music",
                    "Mystery": "mystery",
                    "Netorare/NTR": "netorare",
                    "Ninja": "ninja",
                    "Office Workers": "office_workers",
                    "Oneshot": "oneshot",
                    "parody": "parody",
                    "Philosophical": "philosophical",
                    "Police": "police",
                    "Post-Apocalyptic": "post_apocalyptic",
                    "Psychological": "psychological",
                    "Reincarnation": "reincarnation",
                    "Reverse Harem": "reverse_harem",
                    "Romance": "romance",
                    "Samurai": "samurai",
                    "School Life": "school_life",
                    "Sci-Fi": "sci_fi",
                    "Shota": "shota",
                    "Slice of Life": "slice_of_life",
                    "SM/BDSM": "sm_bdsm",
                    "Space": "space",
                    "Sports": "sports",
                    "Super Power": "super_power",
                    "Superhero": "superhero",
                    "Supernatural": "supernatural",
                    "Survival": "survival",
                    "Thriller": "thriller",
                    "Time Travel": "time_travel",
                    "Traditional Games": "traditional_games",
                    "Tragedy": "tragedy",
                    "Vampires": "vampires",
                    "Video Games": "video_games",
                    "Villainess": "villainess",
                    "Virtual Reality": "virtual_reality",
                    "Wuxia": "wuxia",
                    "Xianxia": "xianxia",
                    "Xuanhuan": "xuanhuan",
                    "Zombies": "zombies",
                })
            },
            {
                type_name: "GroupFilter",
                type: "OrigLangFilter",
                name: "Original Language",
                state: convertTypes("CheckBox",Languages)
            },
            {
                type_name: "GroupFilter",
                type: "TransLangFilter",
                name: "Translated Language",
                state: convertTypes("CheckBox",Languages)
            },
            {
                type_name: "SelectFilter",
                type: "BatoStatus",
                name: "Bato Status",
                state: 5,
                values: convertTypes("SelectOption", Object.fromEntries(Object.keys(StatusMap).map(e => [e.charAt(0).toUpperCase() + e.slice(1), e])))
            },
            {
                type_name: "SelectFilter",
                type: "OriginalStatus",
                name: "Original Series Status",
                state: 5,
                values: convertTypes("SelectOption", Object.fromEntries(Object.keys(StatusMap).map(e => [e.charAt(0).toUpperCase() + e.slice(1), e])))
            }
        ]
    }
    getSourcePreferences() {
        return [
            {
                "key": "baseurl",
                "editTextPreference": {
                    "title": "Set Custom BaseUrl",
                    "summary": "Custom BaseUrl",
                    "value": this.source.baseUrl,
                    "dialogTitle": "Custom BaseUrl",
                    "dialogMessage": "set the baseurl to use, this can be bato.to or a mirror",
                }
            },
            {
                "key": "useragent",
                "editTextPreference": {
                    "title": "Set Custom User-Agent",
                    "summary": "Custom User-Agent",
                    "value": this.defaultUserAgent,
                    "dialogTitle": "Custom User-Agent",
                    "dialogMessage": "set this to whatever valid useragent you want (some might get blocked)",
                }
            }
        ]
    }
}
