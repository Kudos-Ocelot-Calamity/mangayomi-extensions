const mangayomiSources = [{
    "name": "RoliaScan",
    "lang": "en",
    "baseUrl": "https://roliascan.com",
    "apiUrl": "",
    "iconUrl": "https://raw.githubusercontent.com/Kudos-Ocelot-Calamity/mangayomi-extensions/refs/heads/main/dart/manga/multisrc/madara/src/en/roliascan/icon.png",
    "typeSource": "single",
    "itemType": 0,
    "version": "0.0.1",
    "pkgPath": "manga/src/en/roliascan.js"
}];

class DefaultExtension extends MProvider {

    getHeaders(url) {
        return {
            "User-Agent": "Mozilla/5.0",
            "Referer": this.source.baseUrl
        };
    }

    // ============================
    // Popular
    // ============================
    async getPopular(page) {
        const url = `${this.source.baseUrl}/manga/?page=${page}`;
        const res = await this.client.get(url, { headers: this.getHeaders(url) });
        const doc = HTML.parse(res.body);

        const list = [];

        doc.querySelectorAll(".page-item-detail").forEach(card => {
            const title = card.querySelector(".h5 a")?.textContent.trim() ?? "";
            const link = card.querySelector(".h5 a")?.getAttribute("href");
            const img = card.querySelector("img")?.getAttribute("data-src") ||
                        card.querySelector("img")?.getAttribute("src");

            list.push({ name: title, link, imageUrl: img });
        });

        const hasNext = !!doc.querySelector(".page-link[rel='next'], .next");

        return { list, hasNext };
    }

    // ============================
    // Latest Updates
    // ============================
    async getLatestUpdates(page) {
        const url = `${this.source.baseUrl}/latest-updates/?page=${page}`;
        const res = await this.client.get(url, { headers: this.getHeaders(url) });
        const doc = HTML.parse(res.body);

        const list = [];

        doc.querySelectorAll(".page-item-detail").forEach(card => {
            const title = card.querySelector(".h5 a")?.textContent.trim() ?? "";
            const link = card.querySelector(".h5 a")?.getAttribute("href");
            const img = card.querySelector("img")?.getAttribute("data-src") ||
                        card.querySelector("img")?.getAttribute("src");

            list.push({ name: title, link, imageUrl: img });
        });

        const hasNext = !!doc.querySelector(".page-link[rel='next'], .next");

        return { list, hasNext };
    }

    // ============================
    // Search
    // ============================
    async search(query, page, filters) {
        const url = `${this.source.baseUrl}/?s=${encodeURIComponent(query)}&post_type=wp-manga&page=${page}`;
        const res = await this.client.get(url, { headers: this.getHeaders(url) });
        const doc = HTML.parse(res.body);

        const list = [];

        doc.querySelectorAll(".c-tabs-item__content, .page-item-detail").forEach(card => {
            const title = card.querySelector(".h4 a, .h5 a")?.textContent.trim() ?? "";
            const link = card.querySelector(".h4 a, .h5 a")?.getAttribute("href");
            const img = card.querySelector("img")?.getAttribute("data-src") ||
                        card.querySelector("img")?.getAttribute("src");

            list.push({ name: title, link, imageUrl: img });
        });

        const hasNext = !!doc.querySelector(".page-link[rel='next'], .next");

        return { list, hasNext };
    }

    // ============================
    // Manga Details
    // ============================
    async getDetail(url) {
        const res = await this.client.get(url, { headers: this.getHeaders(url) });
        const doc = HTML.parse(res.body);

        const name = doc.querySelector(".post-title h1")?.textContent.trim() ?? "";
        const img = doc.querySelector(".summary_image img")?.getAttribute("data-src") ||
                    doc.querySelector(".summary_image img")?.getAttribute("src");
        const description = doc.querySelector(".summary__content")?.textContent.trim() ?? "";

        const genres = [];
        doc.querySelectorAll(".genres-content a").forEach(g => genres.push(g.textContent.trim()));

        const statusText = doc.querySelector(".post-status .summary-content")?.textContent.toLowerCase() ?? "";
        let status = 0;
        if (statusText.includes("ongoing")) status = 1;
        if (statusText.includes("completed")) status = 2;

        const chapters = await this.getChapters(url);

        return {
            name,
            imageUrl: img,
            description,
            genres,
            status,
            author: doc.querySelector(".author-content a")?.textContent.trim() ?? "",
            chapters
        };
    }

    // ============================
    // Chapters
    // ============================
    async getChapters(url) {
        const res = await this.client.get(url, { headers: this.getHeaders(url) });
        const doc = HTML.parse(res.body);

        const chapters = [];

        doc.querySelectorAll(".wp-manga-chapter").forEach((row, index) => {
            const a = row.querySelector("a");
            const name = a?.textContent.trim() ?? "";
            const link = a?.getAttribute("href");
            const date = row.querySelector(".chapter-release-date")?.textContent.trim() ?? "";

            chapters.push({
                name,
                link,
                date,
                number: index + 1
            });
        });

        chapters.reverse();
        return chapters;
    }

    // ============================
    // Pages
    // ============================
    async getPageList(url) {
        const res = await this.client.get(url, { headers: this.getHeaders(url) });
        const doc = HTML.parse(res.body);

        const pages = [];

        doc.querySelectorAll(".reading-content img").forEach((img, index) => {
            const src = img.getAttribute("data-src") || img.getAttribute("src");
            if (src) pages.push({ index, imageUrl: src });
        });

        return pages;
    }

    // ============================
    // Unused for manga
    // ============================
    async getHtmlContent(url) { return ""; }
    async cleanHtmlContent(html) { return html; }
    async getVideoList(url) { return []; }
    getFilterList() { return []; }
    getSourcePreferences() { return []; }
}
