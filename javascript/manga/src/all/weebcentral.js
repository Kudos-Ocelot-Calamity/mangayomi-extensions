const mangayomiSources = [{
    "name": "WeebCentral",
    "lang": "All",
    "baseUrl": "https://weebcentral.com",
    "apiUrl": "",
    "iconUrl": "https://weebcentral.com/favicon.ico",
    "typeSource": "multi",
    "isManga": true,
    "isNsfw": true,
    "itemType": 0,
    "version": "0.0.1",
    "pkgPath": "manga/src/all/weebcentral.js",
    "notes": "This extension is in working order but it is not finished."
}];

const StatusMap = {
  "Ongoing": 0,
  "Complete": 1,
  "Hiatus": 2,
  "Canceled": 3 
}

class DefaultExtension extends MProvider {
    constructor() {
      super();
      this.client = new Client();
      this.prefs = new SharedPreferences();
      this.cache = {};
      this.limit = 32;
    }
    // custom functions
    removeLastPath(url) {
      if (url.endsWith("/")) url = url.slice(0, -1);
      const lastSlash = url.lastIndexOf("/");
      return url.slice(0, lastSlash);
    }
    findSeriesLink(article) {
      for (const a of article.select("a")) {
        const href = a.getHref;
        if (href && href.includes("/series/")) return href;
      }
      return null;
    }
    async extractManga(url) {
      const doc = new Document((await this.client.get(url)).body);
      const map = {};
      const list = [];
    
      for (const a of doc.select("article[data-tip]")) {
        const key = a.attr("data-tip");
        (map[key] ??= []).push(a);
      }
    
      for (const name in map) {
        const articles = map[name];
    
        let link = null;
        let imageUrl = null;
    
        for (const a of articles) {
          if (!link) link = this.findSeriesLink(a);
    
          if (!imageUrl) {
            imageUrl =
              a.selectFirst("picture source")?.attr("srcset")?.split(" ")[0] ||
              a.selectFirst("picture img")?.attr("src") ||
              null;
          }
        }
    
        list.push({ name, imageUrl, link:this.removeLastPath(link) });
      }
    
      for (const a of doc.select("article:not([data-tip])")) {
        const link = this.findSeriesLink(a);
        if (!link) continue;
    
        const title =
          a.selectFirst(".font-semibold.text-lg")?.text?.trim() ||
          a.selectFirst("a")?.text?.trim() ||
          null;
        if (!title) continue;
    
        const imageUrl =
          a.selectFirst("picture source")?.attr("srcset")?.split(" ")[0] ||
          a.selectFirst("picture img")?.attr("src") ||
          null;
    
        list.push({ name: title, imageUrl, link: this.removeLastPath(link) });
      }
      console.log(list.length)
      return { list, hasNextPage: !url.includes("hot") && list.length >= this.limit };
    }
    async extractChapters(url) {
      const doc = new Document((await this.client.get(url)).body, this.getHeaders(url));
      const chapters = [];
      for (const chapter of doc.select("div")) {
        
        chapters.push({
            url: chapter.selectFirst("a").getHref,
            name: chapter.selectFirst("a > span.grow.flex.items-center.gap-2 > span").text,
            dateUpload: String(new Date(chapter.selectFirst("a > time").text).getTime()),
            //scanlator: 
        })
      }
      return chapters;
    }
    getHeaders(url) {
        return {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0',
      }
    }
    async getPopular(page) {
        return await this.extractManga(`${this.source.baseUrl}/hot-updates`);
    }
    get supportsLatest() {
        return true;
    }
    async getLatestUpdates(page) {
        return await this.extractManga(`${this.source.baseUrl}/latest-updates/${page}`);
    }
    async search(query, page, filters) {
        return await this.extractManga(`${this.source.baseUrl}/search/data?author=&text=${query}&sort=Best%20Match&order=Descending&official=Any&anime=Any&adult=Any&display_mode=Full%20Display&limit=${this.limit}&offset=${this.limit*(page-1)}`)
    }
    async getDetail(link) {
      const doc = new Document((await this.client.get(link)).body);
    
      const imageUrl =
        doc.selectFirst("picture source")?.attr("srcset")?.split(" ")[0] ||
        doc.selectFirst("picture img")?.attr("src") ||
        null;
      const sections = doc.select("section");
    
      let authors = [];
      let genre = [];
      let status = null;
      let description = null;
      
      for (const section of sections) {
        const lis = section.select("li");
        if (!lis.length) continue;
    
        for (const li of lis) {
          const strongText = li.selectFirst("strong")?.text?.trim() || "";
    
          if (strongText.startsWith("Author")) {
            authors = li.select("a").map(a => a.text.trim());
          } else if (strongText.startsWith("Tags")) {
            genre = li.select("a").map(a => a.text.trim());
          } else if (strongText.startsWith("Status")) {
            status = li.selectFirst("a")?.text?.trim() || null;
            console.log(status);
          } else if (strongText.startsWith("Description")) {
            description = li.selectFirst("p")?.text?.trim() || null;
          }
        }
      }
      
      return {
        name: doc.selectFirst("h1")?.text?.trim() || null,
        link,
        imageUrl,
        author: authors.join("&"),
        genre,
        status: StatusMap[status] ?? 5,
        description,
        chapters: await this.extractChapters(`${link}/full-chapter-list`)
      };
    }
    async getPageList(url) {
        const doc = new Document((await this.client.get(`${url}/images?reading_style=long_strip`)).body);
        return doc.select("img").map(u => u.getSrc);
    }
    getFilterList() {
        return [];
    }
    getSourcePreferences() {
        return [];
    }
}
