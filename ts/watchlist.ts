/// FEATURES
// ✅ Items 'new' today — compare last seen timestamp, flag items with no timestamp or timestamp < 24h ago
// Ignore certain users - e.g. the-lost-co
// Track absolute position for a given search/category
// Page summary at top:
///  - Total on sale
///  - Total never seen

class BuySellItem {
    prices?: number[];
    note?: String;
    price_history?: {[key: number]: string};
    first_seen?: string;
    username?: string;
}

function doSomething() {
    var items = document.getElementsByClassName("bsitem");
    
    // var itemTitleAnchors = document.querySelectorAll<HTMLElement>(".bsitem > table:first-child  tr:nth-child(1) td:nth-child(2) a:first-child");
    
    var allItems: NodeListOf<HTMLElement> = document.querySelectorAll<HTMLElement>(".bsitem > table:first-child  tr:nth-child(1) td:nth-child(2)");
    
    // console.log("Found " + allItems.length + " items!");

    allItems.forEach(manipulateItem)
}

function manipulatePrice(oldPrice: number, priceValue: number, priceElement: HTMLTableDataCellElement | HTMLTableHeaderCellElement) {
    if (oldPrice == priceValue || oldPrice <= 0) {
        return;
    }
    console.log("Manipulating price row: " + priceValue);
    priceElement.innerHTML = '<big style="color: red">' + priceElement.innerHTML + '</big>&nbsp;<s>' + priceElement.innerText.replace(priceValue.toString(), oldPrice.toString()) + '</s>';
}

function highlightNewItem(highlightElement: HTMLElement) {
    highlightElement.style.background = "DarkSeaGreen";
}

function addNotesRow(itemTable: HTMLTableElement, itemID: String) {
    console.log("Adding notes row");
    var notesRow = itemTable.insertRow();
    var notesCell = notesRow.insertCell();
    notesCell.innerHTML = `<form style="width: 100%" onsubmit="event.preventDefault();saveNotes('notes-${itemID}','${itemID}');"><b>Notes:</b><br><input type="text" name="notes" style="height: 3em; width: 90%;" id="notes-${itemID}"><br><input type="submit" value="Save Note"></form>`;
}

function saveNotes(textFieldID: String, itemID: String) {
    let textField = document.querySelector(`#${textFieldID}`) as HTMLTextAreaElement;
    let text = textField.innerText;

    /// THIS DOESN'T WORK
    // let pricePromise = browser.storage.local.get(itemKey);
    // pricePromise.then((item) => {
    //     item.notes = text;
    //     browser.storage.local.set({itemID: item});
    // }, (error) => {
    //     console.log("Error fetching key " + itemKey + ": " + error);
    // });
}

function manipulateItem(item: HTMLElement) {
    var titleAnchor: HTMLLinkElement | null = item.querySelector("a:first-child") as HTMLLinkElement;
    if (titleAnchor) {
        var itemName = titleAnchor.innerText;
        // console.log("Item name: " + itemName);
    }
    
    var itemID = titleAnchor.href.replace(/\D/g,'');
    // console.log("Item ID: " + itemID);
    var itemTable = item.querySelector("table");
    if (itemTable) {
        let priceElement = itemTable.rows[2].cells[0];
        let usernameRowAnchors = itemTable.rows[1].querySelectorAll("a");
        var userNameString: string = "";
        if (usernameRowAnchors.length > 0) {
            userNameString = usernameRowAnchors[0].innerText;
        }
        // var priceHTML = priceElement.innerHTML;
        var rawPriceString = priceElement.innerText;
        var priceValue = parseInt(rawPriceString.replace(/\D/g,''), 10); // Compare price to stored price

        var itemKey = "item-" + itemID;

        function onGet(storageFetchObject = {}) {
            console.log("Fetched stored item for ID " + itemID + ": " + storageFetchObject.toString());
            
            var storedItem: BuySellItem = storageFetchObject[itemKey];
            if (storedItem === undefined) {
                storedItem = new BuySellItem();
            }

            var username: string | undefined = storedItem.username;
            if (username === undefined) {
                username = userNameString;
            }

            var prices: number[] | undefined = storedItem.prices;
            if (prices === undefined) {
                prices = [];
            }

            console.log("Fetched prices: " + prices);

            var note = storedItem.note;
            if (note === undefined) {
                note = "";
            }

            console.log("Fetched note: " + note);

            var lastPrice: number = 0;
            if (prices.length > 0) {
                lastPrice = prices[0];
            }
            console.log("Last Price:" + lastPrice);

            if (lastPrice != priceValue) {
                // First time we've seen this new different price
                prices.unshift(priceValue);
            } else if (prices.length > 1) {
                // Price is same as last price and we have more prices - try and get the real last price
                lastPrice = prices[1];
            }
            console.log("All previous prices: " + prices);

            var priceHistory = storedItem.price_history;
            if (priceHistory === undefined) {
                priceHistory = {};
            }
            if (priceHistory[priceValue] === undefined) {
                priceHistory[priceValue] = (new Date()).toJSON();
            }

            console.log("Price History: " + priceHistory);

            var firstSeen = storedItem.first_seen;
            let nowDate: Date = new Date();
            let firstSeenDate: Date;
            if (firstSeen === undefined) {
                firstSeenDate = nowDate;
            } else {
                firstSeenDate = new Date(firstSeen);
            }

            if (item.parentNode) {
                let highlightElement = item.parentNode.querySelector("img");
                if (highlightElement) {
                    if ((firstSeenDate.valueOf() - nowDate.valueOf())/(60*60) > -86400) { // 24h ago
                        highlightNewItem(highlightElement);
                    }
                }
            }
            console.log("First seen: " + firstSeenDate);

            manipulatePrice(lastPrice, priceValue, priceElement);

            if (itemTable) {
                addNotesRow(itemTable, itemID);
            }

            // Serialize object back into storage
            var newItemObject: BuySellItem = {};
            newItemObject.prices = prices;
            newItemObject.price_history = priceHistory;
            newItemObject.first_seen = firstSeenDate.toJSON();
            newItemObject.note = note;
            newItemObject.username = username;

            let setPromise = browser.storage.local.set({['item-'+itemID]: newItemObject});
            browser.storage.sync.set({['item-'+itemID]: newItemObject});
            setPromise.then(()=> {
                
            }, (error) => {
                console.log("Error saving " + itemID + ": " + error.toString());
            });
        }

        console.log("Fetching stored item for key: " + itemKey);

        let pricePromise = browser.storage.local.get([itemKey]).then(onGet, (error) => {
            console.log("Error fetching key " + itemKey + ": " + error);
        });
    }
}

if (document.readyState === "loading") {  // Loading hasn't finished yet
    document.addEventListener("DOMContentLoaded", doSomething);
} else {  // `DOMContentLoaded` has already fired
    doSomething();
}