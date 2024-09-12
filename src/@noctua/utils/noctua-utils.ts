export class NoctuaUtils {

    public static cleanID(dirtyId: string) {
        if (dirtyId) {
            return dirtyId.replace(/\W/g, '_')
        }
        return dirtyId;
    }
    public static filterArrayByString(mainArr, searchText) {
        if (searchText === '') {
            return mainArr;
        }

        searchText = searchText.toLowerCase();

        return mainArr.filter(itemObj => {
            return this.searchInObj(itemObj, searchText);
        });
    }

    public static searchInObj(itemObj, searchText) {
        for (const prop in itemObj) {
            if (!itemObj.hasOwnProperty(prop)) {
                continue;
            }

            const value = itemObj[prop];

            if (typeof value === 'string') {
                if (this.searchInString(value, searchText)) {
                    return true;
                }
            } else if (Array.isArray(value)) {
                if (this.searchInArray(value, searchText)) {
                    return true;
                }
            }

            if (typeof value === 'object') {
                if (this.searchInObj(value, searchText)) {
                    return true;
                }
            }
        }
    }

    public static searchInArray(arr, searchText) {
        for (const value of arr) {
            if (typeof value === 'string') {
                if (this.searchInString(value, searchText)) {
                    return true;
                }
            }

            if (typeof value === 'object') {
                if (this.searchInObj(value, searchText)) {
                    return true;
                }
            }
        }
    }

    public static searchInString(value, searchText) {
        return value.toLowerCase().includes(searchText);
    }

    public static generateGUID() {
        function S4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }

        return S4() + S4();
    }

    public static toggleInArray(item, array) {
        if (array.indexOf(item) === -1) {
            array.push(item);
        } else {
            array.splice(array.indexOf(item), 1);
        }
    }

    public static handleize(text) {
        return text.toString().toLowerCase()
            .replace(new RegExp("/\s+/g"), '-')           // Replace spaces with -
            .replace(new RegExp("/[^\w\-]+/g"), '')       // Remove all non-word chars
            .replace(new RegExp("/\-\-+/g"), '-')         // Replace multiple - with single -
            .replace(new RegExp("/^-+/"), '')             // Trim - from start of text
            .replace(new RegExp("/-+$/"), '');            // Trim - from end of text
    }

    public static formatSolrQueryString(query: string): string {
        const alphanumericRegex = /^[a-zA-Z0-9 ]+$/;
        let formattedQuery = query;
        const minimalQueryLength = 3;

        if (query && query.length > 0) {
            let hasCursor = query.slice(-1) !== ' ';
            query = query.trim();

            if (query.length > 0 && alphanumericRegex.test(query) && hasCursor) {
                let tokens = query.split(/\s+/);
                let lastToken = tokens[tokens.length - 1];

                if (tokens.length === 1 && lastToken.length >= minimalQueryLength) {
                    tokens[tokens.length - 1] = lastToken + '*';
                } else if (tokens.length > 1) {
                    tokens[tokens.length - 1] = lastToken + '*';
                }

                formattedQuery = tokens.join(' ');
            }
        }

        return formattedQuery;
    }

    // olde func from bbop_golr

    public static getGOlrQueryQ(new_query) {
        const alphanum = new RegExp(/^[a-zA-Z0-9 ]+$/);

        let comfy_query = new_query;
        const minimal_query_length = 3;

        // Check that there is something there.
        if (new_query && new_query.length && new_query.length > 0) {

            // Check if the last real input has a space after it.
            var has_cursor_p = true;
            if (new_query.slice(-1) === ' ') {
                has_cursor_p = false;
            }

            // Now chomp it down again to get rid of whitespace.
            new_query = new_query.trim();

            // Check (again) that there is something there.
            if (new_query && new_query.length && new_query.length > 0) {

                // That it is alphanum+space-ish and that we actually
                // might want to add a wildcard (i.e. has cursor).
                if (alphanum.test(new_query) && has_cursor_p) {

                    // Break it into tokens and get the last.
                    var tokens = new_query.split(new RegExp('\\s+'));
                    var last_token = tokens[tokens.length - 1];
                    //ll('last: ' + last_token);

                    if (tokens.length === 1) {

                        // If it is three or more, add the wildcard.
                        if (last_token.length >= minimal_query_length) {
                            tokens[tokens.length - 1] = last_token + '*';
                        }
                    } else {
                        tokens[tokens.length - 1] = last_token + '*';
                    }
                    // And join it all back into our comfy query.
                    comfy_query = tokens.join(' ');
                }
            }
        }

        // Kick it back to the normal set_query.
        return comfy_query;
    };
}
