// Modules
import axios from 'axios';
import cheerio from 'cheerio';

// Helper Functions

export type NewsType = {
    title: string,
    media: string,
    date: string,
    datetime: Date,
    desc: string,
    link: string,
    img: string
};

const lexicalDateParser = (dateToCheck: string): [string, Date | null] => {
    if (!dateToCheck) return ['', null];
    
    let dateTmp = dateToCheck.slice(dateToCheck.lastIndexOf('..') + 2);
    let datetimeTmp: Date | null = new Date(dateTmp);
    
    if (isNaN(datetimeTmp.getTime())) {
        dateTmp = dateToCheck;
        datetimeTmp = null;
    }

    if (dateTmp.startsWith(' ')) {
        dateTmp = dateTmp.slice(1);
    }
    return [dateTmp, datetimeTmp];
};

// Always return news for the last 7 days
const defineDate = (_: string): Date => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
};

// Google News functions

const user_agent = 'Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:64.0) Gecko/20100101 Firefox/64.0';

const buildResponse = async (url: string, lang: string): Promise<Array<NewsType>> => {
    const headers = {
        'User-Agent': user_agent,
        'Accept-Language': `${lang};q=0.9`
    };

    const response = await axios.get(url, { headers });
    const content = cheerio.load(response.data);
    const results: Array<NewsType> = [];

    const articles = content("a[jsname]");

    articles.each((_, article) => {
        const item = content(article);
        console.log(item.html())

        // Parsing logic from the original code
        const tmpText = item.find("h3").text().trim();
        const tmpLink = item.attr("href") || "";
        const tmpMedia = item.find('div').find('div').find('div').next().text().trim();
        const tmpDateData = item.find('div').next().find('span').text().trim();
        const [tmpDate, tmpDatetime] = lexicalDateParser(tmpDateData);
        const tmpDesc = item.next().find('div').next().find('div').find('div').find('div').text().trim();
        const tmpImg = item.find("img").attr("src") || "";

        results.push({
            title: tmpText,
            media: tmpMedia,
            date: tmpDate,
            datetime: defineDate(tmpDate),
            desc: tmpDesc,
            link: tmpLink,
            img: tmpImg
        } satisfies NewsType);
    });

    return results;
};


export const searchNews = async (key: string, lang: string = "en", period: string = "7d") => {
    const encodedKey = encodeURIComponent(key);
    const url = `https://www.google.com/search?q=${encodedKey}&lr=lang_${lang}&tbs=qdr:${period}&tbm=nws`;
    return await buildResponse(url, lang);
};

