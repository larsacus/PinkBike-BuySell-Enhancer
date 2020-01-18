/// FEATURES
// ✅ Items 'new' today — compare last seen timestamp, flag items with no timestamp or timestamp < 24h ago
// Ignore certain users - e.g. the-lost-co
// Track absolute position for a given search/category
// Page summary at top:
///  - Total on sale
///  - Total never seen

class BuySellItem {
    prices?: number[];
    note?: string;
    price_history?: {[key: number]: string};
    first_seen?: string;
    username?: string;
}

class Preferences {
    first_date: string = (new Date()).toJSON();
    ignored_sellers: string[] = [];
}

class NoteSaveMessage {
    note_id: string
    field_tag: string
}

function doSomething() {
    var items = document.getElementsByClassName("bsitem");
    
    // var itemTitleAnchors = document.querySelectorAll<HTMLElement>(".bsitem > table:first-child  tr:nth-child(1) td:nth-child(2) a:first-child");
    
    browser.storage.sync.get(["preferences"]).then((obj = {}) => {
        var allItems: NodeListOf<HTMLElement> = document.querySelectorAll<HTMLElement>(".bsitem > table:first-child  tr:nth-child(1) td:nth-child(2)");
    
        // console.log("Found " + allItems.length + " items!");

        let pref: Preferences | undefined = obj.preferences;
        let prefObj: Preferences;
        if (pref === undefined) {
            prefObj = new Preferences();
        } else {
            prefObj = pref;
        }

        browser.storage.sync.set({["preferences"]: prefObj});
    
        allItems.forEach((item) => {
            manipulateItem(item, prefObj);
        })
    });
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

function addNotesRow(itemTable: HTMLTableElement, itemID: string, note: string) {
    console.log("Adding notes row");
    var notesRow = itemTable.insertRow();
    var notesCell = notesRow.insertCell();
    const fieldID = `notes-${itemID}`
    notesCell.innerHTML = `<form style="width: 100%" onsubmit="event.preventDefault();window.postMessage({'note_id': '${itemID}', 'field_tag': '${fieldID}'}, window.location.origin);return false;"><b>Notes:</b><br><input type="text" name="notes" style="height: 3em; width: 90%;" id="notes-${itemID}" value="${note}"><br><input type="submit" value="Save Note"></form>`;
}

function saveNotes(noteSaveMessage: NoteSaveMessage) {
    let textFieldID: String = noteSaveMessage.field_tag
    let itemID: String = noteSaveMessage.note_id
    let textFieldSelector = `#${textFieldID}`
    let textField = document.querySelector(textFieldSelector) as HTMLTextAreaElement;
    let text = textField.value;

    console.log(`Attempting to save note "${text}" for text field ID ${textFieldID}`)

    let pricePromise = browser.storage.sync.get([itemID]);
    pricePromise.then((item) => {
        item.note = text;
        browser.storage.sync.set({['item-'+itemID]: item});
        console.log(`Successfully saved note "${text}" for text field ID ${textFieldID}`)
    }, (error) => {
        console.log("Error fetching key " + itemID + ": " + error);
    });
}

function manipulateItem(item: HTMLElement, preferences: Preferences) {
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

            if (itemTable) {
                addNotesRow(itemTable, itemID, note);
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
            // prices = prices.filter((value) => {
            //     return (value < 10000);
            // })
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
                    if (((firstSeenDate.valueOf() - nowDate.valueOf())/(60*60) > -43200) &&
                        ((firstSeenDate.valueOf() - (new Date(preferences.first_date)).valueOf()) > -86400)) { // 24h ago
                        highlightNewItem(highlightElement);
                    }
                }
            }
            console.log("First seen: " + firstSeenDate);

            manipulatePrice(lastPrice, priceValue, priceElement);

            // Serialize object back into storage
            var newItemObject: BuySellItem = {};
            newItemObject.prices = prices;
            newItemObject.price_history = priceHistory;
            newItemObject.first_seen = firstSeenDate.toJSON();
            newItemObject.note = note;
            newItemObject.username = username;

            let setPromise = browser.storage.sync.set({['item-'+itemID]: newItemObject});
            setPromise.then(()=> {
                
            }, (error) => {
                console.log("Error saving " + itemID + ": " + error.toString());
            });
        }

        console.log("Fetching stored item for key: " + itemKey);

        let pricePromise = browser.storage.sync.get([itemKey]).then(onGet, (error) => {
            console.log("Error fetching key " + itemKey + ": " + error);
        });
    }
}

function receiveMessage(event: MessageEvent) {
    if(isNoteCreationEvent(event.data)) {
        console.log(`Received message: ${event.data}`)
        saveNotes(event.data);
    }
}

if (document.readyState === "loading") {  // Loading hasn't finished yet
    document.addEventListener("DOMContentLoaded", doSomething);
} else {  // `DOMContentLoaded` has already fired
    doSomething();
}

const isNoteCreationEvent = (noteCreationEvent: NoteSaveMessage): noteCreationEvent is NoteSaveMessage => (<NoteSaveMessage>noteCreationEvent).note_id !== undefined

window.addEventListener("message", receiveMessage, false);