const mangayomiSources = [{
    "name": "Comix",
    "lang": "all",
    "baseUrl": "https://comix.to",
    "apiUrl": "https://comix.to/api",
    "iconUrl": "https://comix.to/images/icon_512x512.png",
    "typeSource": "single",
    "itemType": 0,
    "isManga": true,
    "isNsfw": true,
    "version": "0.0.1",
    "pkgPath": "manga/src/all/comix.js",
    "notes": "this is not finished, it was rushed, missing some options, but works"
}];

const StatusMap = {
    "releasing": 0,
    "finished": 1,
    "on_hiatus": 2,
    "discontinued": 3,
    "not_yet_released": 4,
    "unknown": 5
}
class DefaultExtension extends MProvider {
    constructor() {
        super();
        this.client = new Client();
        this.prefs = new SharedPreferences();
        this.limit = 100;
        this.cache = {}; // term cache
        this.cache_init = false;
    }

    async initCache() {
        await Promise.all([
            this.cacheTerms("demographic"),
            this.cacheTerms("genre"),
            this.cacheTerms("theme")
        ]);
    }

    async cacheTerms(type) {
        this.cache[type] = {};
        const firstResp = await this.client.get(`${this.source.apiUrl}/v2/terms?type=${type}&limit=${this.limit}`);
        const firstJson = JSON.parse(firstResp.body);
        const last_page = firstJson.result.pagination.last_page;
        const pageRequests = [];
        for (let page = 1; page <= last_page; page++) {
            pageRequests.push(this.client.get(`${this.source.apiUrl}/v2/terms?type=${type}&page=${page}&limit=${this.limit}`));
        }
        const results = await Promise.all(pageRequests);
        for (const r of results) {
            const j = JSON.parse(r.body);
            for (const item of j.result.items) {
                this.cache[type][item.term_id] = item.title;
            }
        }
    }

    async getAPI(type, days, exclude_genres) {
        var query = ""
        for (const genre in exclude_genres) {
            if (query.length == 0) query += "?";
            query += `exclude_genres[]=${genre}`;
        }
        if (exclude_genres.length == 0) query += "?";
        else query += "&";
        query += `type=${type}`;
        query += `&days=${days}`;
        query += `&limit=${this.limit}`;
        console.log(query);
        var resp = await this.client.get(`${this.source.apiUrl}/v2/top${query}`, {})
        return JSON.parse(resp.body);
    }

    async getTerm(type, id) {
        if (this.cache[type] && this.cache[type][id] !== undefined) {
            return this.cache[type][id];
        }
        const resp = await this.client.get(`${this.source.apiUrl}/v2/terms?type=${type}&ids[]=${id}&limit=1`);
        const j = JSON.parse(resp.body);
        if (j.status === 200 && j.result.items.length > 0) {
            for (const item of j.result.items) {
                if (item.type === type && item.term_id === Number(id)) {
                    return item.title;
                }
            }
        }
        return "Unknown";
    }

    async getTermBatch(type, ids) {
        const uncachedIds = ids.filter(id => !this.cache[type] || this.cache[type][id] === undefined);
        const result = {};
        if (uncachedIds.length > 0) {
            const query = uncachedIds.map(id => `ids[]=${id}`).join("&");
            const resp = await this.client.get(`${this.source.apiUrl}/v2/terms?type=${type}&${query}&limit=${uncachedIds.length}`);
            const j = JSON.parse(resp.body);
            if (j.status === 200 && j.result.items.length > 0) {
                for (const item of j.result.items) {
                    result[item.term_id] = item.title;
                }
            }
        }
        return ids.map(id => (this.cache[type] && this.cache[type][id]) || result[id] || "Unknown");
    }

    async collectSection(start_idx, term_type, term_ids) {
        let idx = start_idx;
        const remaining = term_ids.slice(start_idx);
        const titles = await this.getTermBatch(term_type, remaining);
        const ids = [];
        for (let t of titles) {
            if (t !== "Unknown") {
                ids.push(t);
                idx += 1;
            } else break;
        }
        return [ids, idx];
    }

    async classifyTerms(term_ids) {
        const sections = ["demographics", "genres", "themes", "authors", "artists", "publishers"];
        const result = {};
        for (const k of sections) result[k] = [];
        let i = 0;
        const n = term_ids.length;
        if (i < n) {
            const demo = await this.getTerm("demographic", term_ids[i]);
            if (demo !== "Unknown") {
                result.demographics.push(demo);
                i += 1;
            }
        }
        const typeMapping = {
            genres: "genre",
            themes: "theme",
            authors: "author",
            artists: "artist",
            publishers: "publisher"
        };
        for (const sec of sections.slice(1)) {
            const [ids, newIndex] = await this.collectSection(i, typeMapping[sec], term_ids);
            result[sec] = ids;
            i = newIndex;
        }
        for (const k of Object.keys(result)) {
            if (result[k].length === 0) result[k] = ["Unknown"];
        }
        return result;
    }

    async comicData(comic, full) {
        const data = {
            name: comic.title,
            imageUrl: comic.poster.large,
            link: `${this.source.baseUrl}/title/${comic.hash_id}`,
            genre: [],
            author: null,
            artist: null,
            description: comic.synopsis,
            status: StatusMap[comic.status] ?? 5
        };
        if (full) {
            const classification = await this.classifyTerms(comic.term_ids);
            data.genre = classification.genres;
            data.author = classification.authors.join("&");
            data.artist = classification.artists.join("&");
        }
        return data;
    }

    async getPopular(page) {
        if (!this.cache_init) await this.initCache();
        const resp = await this.getAPI("trending", 1, []);
        const items = resp.result.items;
        const list = await Promise.all(items.map(c => this.comicData(c, false)));
        return {
            list,
            hasNextPage: false
        };
    }

    get supportsLatest() {
        return true;
    }

    getHeaders(url) {
        return {}
    }
    async getLatestUpdates(page) {
        var res = await this.client.get(`${this.source.apiUrl}/v2/manga?scope=hot&limit=${this.limit}&order[chapter_updated_at]=desc&page=${page}`)
        var res = JSON.parse(res.body);
        var items = res.result.items;
        const list = await Promise.all(items.map(c => this.comicData(c, false)));
        return {
            list,
            hasNextPage: page != res.result.pagination.last_page
        }
    }
    async search(query, page, filters) {
        // https://comix.to/api/v2/manga?order[relevance]=desc&keyword=shangri&statuses[]=releasing&statuses[]=finished&statuses[]=on_hiatus&statuses[]=discontinued&statuses[]=not_yet_released&genres[]=6&genres[]=87264&genres[]=7&genres[]=8&genres[]=9&genres[]=10&genres[]=11&genres[]=87265&genres[]=12&genres[]=13&genres[]=87266&genres[]=14&genres[]=15&genres[]=16&genres[]=17&genres[]=87267&genres[]=18&genres[]=19&genres[]=20&genres[]=21&genres[]=22&genres[]=23&genres[]=24&genres[]=25&genres[]=87268&genres[]=26&genres[]=27&genres[]=28&genres[]=29&genres[]=30&genres[]=31&genres[]=32&genres[]=33&genres[]=34&genres[]=35&genres[]=36&genres[]=37&genres[]=38&genres[]=39&genres[]=40&genres[]=41&genres[]=42&genres[]=43&genres[]=44&genres[]=45&genres[]=46&genres[]=47&genres[]=48&genres[]=49&genres[]=50&genres[]=51&genres[]=52&genres[]=53&genres[]=54&genres[]=55&genres[]=56&genres[]=57&genres[]=58&genres[]=59&genres[]=60&genres[]=61&genres[]=62&genres[]=63&genres[]=64&genres[]=65&genres[]=66&genres[]=67&genres[]=93164&genres[]=93167&genres[]=93165&genres[]=93166&genres[]=93168&genres[]=93172&genres[]=93170&genres[]=93169&genres[]=93171&genres_mode=or&demographics[]=3&demographics[]=4&demographics[]=1&demographics[]=2&authors[]=81339&artists[]=81340&release_year[from]=2026&release_year[to]=1990&limit=28
        var res = await this.client.get(`${this.source.apiUrl}/v2/manga?keyword=${query}&limit=${this.limit}&page=${page}`)
        var res = JSON.parse(res.body);
        var items = res.result.items;
        const list = await Promise.all(items.map(c => this.comicData(c, false)));
        return {
            list,
            hasNextPage: page != res.result.pagination.last_page
        }
    }
    async getChapters(url, comic) {
        const id = url.split("/").pop();

        const firstResp = await this.client.get(`${this.source.apiUrl}/v2/manga/${id}/chapters?limit=${this.limit}`);
        const firstJson = JSON.parse(firstResp.body);
        const last_page = firstJson.result.pagination.last_page;
        const pageRequests = [];
        for (let page = 1; page <= last_page; page++) {
            pageRequests.push(this.client.get(`${this.source.apiUrl}/v2/manga/${id}/chapters?limit=${this.limit}&page=${page}`));
        }

        const chapters = [];

        const results = await Promise.all(pageRequests);
        for (const r of results) {
            const j = JSON.parse(r.body);
            for (const c of j.result.items) {
                chapters.push({
                    name: c.name && c.name.length ? c.name : `Chapter ${c.number}`,
                    url: `${url}/${c.chapter_id}`,
                    dateUpload: String(new Date(c.updated_at * 1000).getTime()),
                    scanlator: c.scanlation_group?.name ?? "Unknown"
                })
            }
        }

        return chapters;
    }
    async getDetail(link) {
        var [id] = link.split("/").slice(-1);
        var comic = await this.client.get(`${this.source.apiUrl}/v2/manga/${id}`);
        comic = JSON.parse(comic.body);
        comic = comic["result"];
        return {
            link,
            chapters: await this.getChapters(link, comic),
            ...await this.comicData(comic, true)
        };
    }
    decodeFlight(entry) {
        if (!Array.isArray(entry)) return null;
        const payload = entry[1];
        if (typeof payload !== "string" || !payload.startsWith("d:")) return null;
        return JSON.parse(payload.slice(2));
    }
    async getChapterImages(url) {
        var res = await this.client.get(url);
        var doc = new Document(res.body);

        const scripts = doc.select("script");
        const flightEntries = [];

        for (const s of scripts) {
            const txt = s.text;
            if (!txt || !txt.includes("__next_f.push")) continue;

            const matches = txt.match(/__next_f\.push\((\[[\s\S]*?\])\)/g);
            if (!matches) continue;

            for (const m of matches) {
                const arr = eval(m.replace("__next_f.push", ""));
                flightEntries.push(arr);
            }
        }

        var chapters = [];
        for (const entry of flightEntries) {
            const decoded = this.decodeFlight(entry);
            if (!decoded) continue;

            const data = decoded[3];
            if (!data?.chapter) continue;

            const c = data.chapter;
            chapters.push({
                number: c.number,
                link: c._link,
                createdAt: c.created_at,
                images: c.images,
            })
        }
        return chapters;
    }
    async getPageList(url) {
        var id = url.split("/").slice(1)[0].split("-")[0];

        for (const chapter of await this.getChapterImages(url)) {
            if (chapter.link.includes(id)) {
                return chapter.images.map((i) => i.url)
            }
        }
        return []
    }
    getFilterList() {
        return []
    }
    getSourcePreferences() {
        return []
    }
}
