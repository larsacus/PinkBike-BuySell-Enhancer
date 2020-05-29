/// FEATURES
// ✅ Items 'new' today — compare last seen timestamp, flag items with no timestamp or timestamp < 24h ago
// Ignore certain users - e.g. the-lost-co
// Track absolute position for a given search/category
// Page summary at top:
///  - Total on sale
///  - Total never seen

class BuySellItem {
    prices?: number[]
    note?: string
    price_history?: {[key: number]: string}
    first_seen?: string
    username?: string
}

class Preferences {
    first_date: string = (new Date()).toJSON()
    ignored_sellers: string[] = []
}

class NoteSaveMessage {
    note_id: string
    field_tag: string

    constructor(id: string, tag: string) {
        this.note_id = id
        this.field_tag = tag
    }
}

class HistoricalPrice {
    price: number
    date: Date

    constructor(price: number, date: Date) {
        this.price = price
        this.date = date
    }
}

function doSomething() {
    // transferStorage()
    var items = document.getElementsByClassName("bsitem")
    
    // var itemTitleAnchors = document.querySelectorAll<HTMLElement>(".bsitem > table:first-child  tr:nth-child(1) td:nth-child(2) a:first-child");
    
    browser.storage.local.get(["preferences"]).then((obj = {}) => {
        var allItems: NodeListOf<HTMLElement> = document.querySelectorAll<HTMLElement>(".bsitem > table:first-child  tr:nth-child(1) td:nth-child(2)")
    
        // console.log("Found " + allItems.length + " items!");

        let pref: Preferences = obj.preferences || new Preferences()

        browser.storage.local.set({["preferences"]: pref})

        let allHTMLItems: Array<HTMLElement> = Array.prototype.slice.call(allItems.values.apply)
        let allItemIDs = allHTMLItems.map((value: HTMLElement):string => {
            return itemIDFromItemRow(value)
        })
        let allItemDefinitions: []
        allItems.forEach((item) => {
            manipulateItem(item, pref)
        })
    });
}

function manipulatePrice(historicalPrices: HistoricalPrice[], priceValue: number, priceElement: HTMLTableDataCellElement | HTMLTableHeaderCellElement) {
    let pricesByPrice = [...historicalPrices].sort((a,b) => a.price - b.price)
    let highestPrice = pricesByPrice.pop()

    if (!highestPrice) {
        return
    }

    let oldPrice = highestPrice.price
    if (oldPrice === priceValue || oldPrice <= 0) {
        return
    }

    let tooltipHTML: string = ""
    if (historicalPrices.length > 1) {
        tooltipHTML = "<ul>"
        historicalPrices.forEach(previousPrice => {
            tooltipHTML += `<li><em>$${previousPrice.price}</em>&nbsp;&mdash;&nbsp;${previousPrice.date.toLocaleDateString()}</li>`
        })
        tooltipHTML+="</ul>"
    }

    if (priceElement.innerHTML.includes("<s>")) {
        // Price has already been manipulated — skip
        return
    }
    console.log("Manipulating price row: " + priceValue)
    priceElement.innerHTML = '<big style="color: red" class="bs-tooltip">' + priceElement.innerHTML + `<span class="bs-tooltiptext">${tooltipHTML}</span></big>&nbsp;<s>` + priceElement.innerText.replace(priceValue.toString(), oldPrice.toString()) + '</s>'
}

function highlightNewItem(highlightElement: HTMLElement) {
    highlightElement.style.background = "DarkSeaGreen"
}

function addNotesRow(itemTable: HTMLTableElement, itemID: string, note: string) {
    console.log("Adding notes row")
    var notesRow = itemTable.insertRow()
    var notesCell = notesRow.insertCell()
    const fieldID = `notes-${itemID}`
    notesCell.innerHTML = `<form style="width: 100%" onsubmit="event.preventDefault();window.postMessage({'note_id': '${itemID}', 'field_tag': '${fieldID}'}, window.location.origin);return false;"><b>Notes:</b><br><input type="text" name="notes" style="height: 3em; width: 90%;" id="notes-${itemID}" value="${note}"><br><input type="submit" value="Save Note"></form>`
}

function saveNotes(noteSaveMessage: NoteSaveMessage) {
    let textFieldID: String = noteSaveMessage.field_tag
    let itemID: String = noteSaveMessage.note_id
    let textFieldSelector = `#${textFieldID}`
    let textField = document.querySelector(textFieldSelector) as HTMLTextAreaElement
    let text = textField.value

    console.log(`Attempting to save note "${text}" for text field ID ${textFieldID}`)

    let pricePromise = browser.storage.local.get([itemID])
    pricePromise.then((item) => {
        item.note = text
        browser.storage.local.set({[`item-${itemID}`]: item})
        console.log(`Successfully saved note "${text}" for text field ID ${textFieldID}`)
    }, (error) => {
        console.error("Error fetching key " + itemID + ": " + error)
    });
}

function itemIDFromItemRow(itemRow: HTMLElement): string {
    var titleAnchor: HTMLLinkElement | null = itemRow.querySelector("a:first-child") as HTMLLinkElement

    return titleAnchor.href.replace(/\D/g,'')
}

function manipulateItem(item: HTMLElement, preferences: Preferences) {
    
    // if (titleAnchor) {
    //     var itemName = titleAnchor.innerText;
    //     // console.log("Item name: " + itemName);
    // }
    
    var itemID = itemIDFromItemRow(item)
    // console.log("Item ID: " + itemID);
    var itemTable = item.querySelector("table")
    if (itemTable) {
        modifyTableItem(itemTable, itemID, item, preferences)
    }
}

function modifyTableItem(itemTable: HTMLTableElement, itemID: string, item: HTMLElement, preferences: Preferences) {
    let priceElement = itemTable.rows[2].cells[0]
    let usernameRowAnchors = itemTable.rows[1].querySelectorAll("a")
    var userNameString: string = ""
    if (usernameRowAnchors.length > 0) {
        userNameString = usernameRowAnchors[0].innerText
    }
    // var priceHTML = priceElement.innerHTML;
    var rawPriceString = priceElement.innerText
    var currentPrice = parseInt(rawPriceString.replace(/\D/g, ''), 10) // Compare price to stored price
    var itemKey = `item-${itemID}`
    function onGet(storageFetchObject: {[key: string]: BuySellItem}) {
        console.log("Fetched stored item for ID " + itemID + ": ", storageFetchObject)
        var storedItem: BuySellItem = storageFetchObject[itemKey] || new BuySellItem()
        var username: string = storedItem.username || userNameString
        var prices: number[] = storedItem.prices || []
        console.log("Fetched prices: ", prices)

        var note = storedItem.note || ""
        if (itemTable) {
            addNotesRow(itemTable, itemID, note)
        }

        console.log("Fetched note: ", note)

        var lastPrice: number = prices[0] || 0
        console.log("Last Price:", lastPrice)

        if (lastPrice !== currentPrice) {
            // First time we've seen this new different price
            prices.unshift(currentPrice)
        }
        else if (prices.length > 1) {
            // Price is same as last price and we have more prices - try and get the real last price
            lastPrice = prices[1]
        }
        prices = prices.filter((value) => {
            return (value < 10000)
        })
        console.log("All previous prices: ", prices)

        var priceHistory: {[key: number]: string} = storedItem.price_history || {}
        if (priceHistory[currentPrice] === undefined) {
            priceHistory[currentPrice] = (new Date()).toJSON()
        }

        let sortedPriceArray = Array<HistoricalPrice>()
        prices.forEach( (key, i, a) => {
            let dateString: string | undefined = priceHistory[key]
            console.log(`Adding price ${key} for date`, dateString)
            if (dateString) {
                sortedPriceArray.push(new HistoricalPrice(Number(key),new Date(dateString)))
            }
        })
        
        sortedPriceArray = sortedPriceArray
            .filter(a => { return a.price < 10000})
            .sort((a, b) => { return a.date.getTime() - b.date.getTime() })

        console.log("Price History: ", sortedPriceArray);
        var firstSeen = storedItem.first_seen
        let nowDate: Date = new Date()
        let firstSeenDate: Date;
        if (!firstSeen) {
            firstSeenDate = nowDate
        }
        else {
            firstSeenDate = new Date(firstSeen)
        }
        if (item.parentNode) {
            let highlightElement = item.parentNode.querySelector("img")
            if (highlightElement) {
                if (((firstSeenDate.valueOf() - nowDate.valueOf()) / (60 * 60) > -43200) &&
                    ((firstSeenDate.valueOf() - (new Date(preferences.first_date)).valueOf()) > -64800)) { // 18h ago
                    highlightNewItem(highlightElement)
                }
            }
        }
        console.log("First seen: ", firstSeenDate)
        manipulatePrice(sortedPriceArray, currentPrice, priceElement)
        // Serialize object back into storage
        saveItem(prices, priceHistory, firstSeenDate, note, username, itemKey, itemID)
    }
    console.log("Fetching stored item for key: ", itemKey)
    let pricePromise = browser.storage.local.get([itemKey]).then(onGet, (error) => {
        console.error("Error fetching key " + itemKey + ": ", error)
    });
}

function saveItem(prices: number[], priceHistory: { [key: number]: string; }, firstSeenDate: Date, note: string, username: string, itemKey: string, itemID: string) {
    var newItemObject: BuySellItem = {}
    newItemObject.prices = prices
    newItemObject.price_history = priceHistory
    newItemObject.first_seen = firstSeenDate.toJSON()
    newItemObject.note = note
    newItemObject.username = username
    let setPromise = browser.storage.local.set({ [itemKey]: newItemObject })
    setPromise.then(() => {
    }, (error) => {
        console.error("Error saving " + itemID + ": " + error.toString())
    })
}

function receiveMessage(event: MessageEvent) {
    if(isNoteCreationEvent(event.data)) {
        console.log(`Received message: ${event.data}`)
        saveNotes(event.data);
    }
}

// function transferStorage() {
//     function onGet(storageFetchObject = {}) {
//         console.log('fetched storage')
//         // browser.storage.local.set(storageFetchObject)
//         // console.log("done migrating storage")
//     }
//     browser.storage.local.get().then(onGet, (error) => {
//         console.error("Error fetching all items");
//     })
// }

if (document.readyState === "loading") {  // Loading hasn't finished yet
    document.addEventListener("DOMContentLoaded", doSomething)
} else {  // `DOMContentLoaded` has already fired
    doSomething()
}

const isNoteCreationEvent = (noteCreationEvent: NoteSaveMessage): noteCreationEvent is NoteSaveMessage => (<NoteSaveMessage>noteCreationEvent).note_id !== undefined

window.addEventListener("message", receiveMessage, false);