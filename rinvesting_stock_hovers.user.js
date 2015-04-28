// ==UserScript==
// @name        /r/investing stock hovers
// @namespace   http://www.genericmaker.com/
// @include     https?://www.reddit.com/r/investing/*
// @include     https?://www.reddit.com/r/options/*
// @version     1
// @grant       GM_xmlhttpRequest
// @downloadURL https://raw.githubusercontent.com/GeorgeHahn/r-investing-helper/master/rinvesting_stock_hovers.user.js
// ==/UserScript==

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
        getTickerInfo(match, function(info) {
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
  var request = GM_xmlhttpRequest({
    method: "GET",
    url: url,
    onload: function(res) {
      if (res.status >= 200 && res.status < 400) {
        if(res.responseText.indexOf("No symbol matches") === -1)
          callback(JSON.parse(res.responseText));
      } else {
        // should probably handle error
        console.log("Error: " + res.responseText + " status " + res.status);
      }
    }
  });
}

var tickerstore = {}; // Stored ticker data
var tickerstorewait = {}; // Array of callbacks (queue while waiting for quote API request to return)

function getTickerInfo(symbol, callback) {
  if(tickerstore[symbol] === undefined) {
    if(tickerstorewait[symbol] === undefined)
    {
      tickerstorewait[symbol] = [function() { callback(tickerstore[symbol]); }];
      console.log("Requesting " + symbol);
      
      MakeReq("http://dev.markitondemand.com/Api/v2/Quote/json?symbol=" + symbol, function(ticker) {
        tickerstore[symbol] = "<span title=\"" + ticker.Name + " $" + ticker.LastPrice + " ($" + ticker.Change + ", " + ticker.ChangePercent + "%)\"><b><i>" + ticker.Symbol + "</i></b></span>";
        tickerstorewait[symbol].forEach(function(callback){ callback(); });
        tickerstorewait[symbol] = null;
      });
    }
    else {
      //console.log("Queueing request for " + symbol);
      tickerstorewait[symbol].push(function() { callback(tickerstore[symbol]); } );
    }
  }
  else {
    //console.log("Using cached request for " + symbol);
    callback(tickerstore[symbol]);
  }
}

window.addEventListener('load', function () {
  run();
}, false);
