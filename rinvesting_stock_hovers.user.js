// ==UserScript==
// @name        /r/investing stock hovers
// @namespace   http://www.genericmaker.com/
// @include     http://www.reddit.com/r/investing*
// @include     https://www.reddit.com/r/investing*
// @include     http://www.reddit.com/r/options*
// @include     https://www.reddit.com/r/options*
// @include     http://www.reddit.com/r/stocks*
// @include     https://www.reddit.com/r/stocks*
// @include     http://www.reddit.com/r/stockmarket*
// @include     https://www.reddit.com/r/stockmarket*
// @version     4
// @grant       GM_xmlhttpRequest
// @downloadURL https://raw.githubusercontent.com/GeorgeHahn/r-investing-helper/master/rinvesting_stock_hovers.user.js
// ==/UserScript==

function log(obj) {
  //console.log(obj);
}

// http://stackoverflow.com/a/10730777/1042744
function textNodesUnder(el) {
  var n, a = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
  while (n = walk.nextNode()) a.push(n);
  return a;
}

//http://stackoverflow.com/a/3955096/1042744
Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

function findContentTextNodes() {
  var body = document.body.children;
  for(var i = 0; i < body.length; i++) {
    if(body[i].className === "content") {
      return textNodesUnder(body[i]);
    }
  }
}

function run() {
  var content = findContentTextNodes();
  var capsregex = new RegExp(/\b([A-Z]{2,})\b/g);
  
  content.forEach(function (node) {
    var matches = cleanup(node.textContent.match(capsregex));
    if (matches !== null) {
      // matches = all stock matches here
      // node = text node
      var parent = node.parentElement;
      var sym = document.createElement("div");
      sym.innerHTML = node.textContent;
      
      matches.forEach(function (match) {
        getTickerInfo(match, function(ticker) {
          if(ticker.Symbol !== match)
            return;
          var info = "<span title=\"" + ticker.Name + " $" + ticker.LastPrice + " ($" + ticker.Change + ", " + ticker.ChangePercent + "%)\"><b><i>" + ticker.Symbol + "</i></b></span>"
          var matchregex = new RegExp(match,"g");
          sym.innerHTML = sym.innerHTML.replace(matchregex, info);
        });
      });
      
      parent.replaceChild(sym, node);
    }
  });
}

function cleanup(transform) {
  if(transform === null)
    return null;
  
  return transform;
  
  //return transform.remove("OP")
  //                .remove("YOLO");
}

function MakeReq(url, callback) {
  log("Requesting " + url);
  var request = GM_xmlhttpRequest({
    method: "GET",
    url: url,
    onload: function(res) {
      if (res.status >= 200 && res.status < 400) {
        if(res.responseText.indexOf("No symbol matches") === -1) {
          log("Got response for " + url);
          callback(JSON.parse(res.responseText));
        } else {
          log("No symbol matches returned for request: " + url);
        }
      } else {
        // should probably handle error
        log("Error: " + res.responseText + " status " + res.status);
      }
    },
    onerror: function(res) {
      log("Not sure what happened, but the API request failed");
      log(res);
    },
  });
}

var tickerstore = {}; // Stored ticker data
var tickerstorewait = {}; // Array of callbacks (queue while waiting for quote API request to return)

function getTickerInfo(symbol, callback) {
  if(tickerstore[symbol] === undefined) {
    if(tickerstorewait[symbol] === undefined)
    {
      tickerstorewait[symbol] = [function() { callback(tickerstore[symbol]); }];
      log("Requesting " + symbol);
      
      MakeReq("http://dev.markitondemand.com/Api/v2/Quote/json?symbol=" + symbol, function(ticker) {
        log("Got ticker info for " + symbol);
        tickerstore[symbol] = ticker;
        tickerstorewait[symbol].forEach(function(callback){ callback(); });
        tickerstorewait[symbol] = null;
      });
    }
    else {
      log("Queueing request for " + symbol);
      tickerstorewait[symbol].push(function() { callback(tickerstore[symbol]); } );
    }
  }
  else {
    log("Using cached request for " + symbol);
    callback(tickerstore[symbol]);
  }
}

window.addEventListener('load', function () {
  run();
}, false);
