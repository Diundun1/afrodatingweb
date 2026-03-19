self.addEventListener("install", function (event) {
  event.waitUntil(preLoad());
});

var preLoad = function () {
  console.log("Installing web app");
  return caches.open("offline").then(function (cache) {
    console.log("caching index and important routes");
    return cache.addAll(["/"]);
  });
};

self.addEventListener("fetch", function (event) {
  event.respondWith(
    checkResponse(event.request).catch(function () {
      return returnFromCache(event.request);
    })
  );
  event.waitUntil(addToCache(event.request));
});

var checkResponse = function (request) {
  return new Promise(function (fulfill, reject) {
    fetch(request).then(function (response) {
      if (response.status !== 404) {
        fulfill(response);
      } else {
        reject();
      }
    }, reject);
  });
};

var addToCache = function (request) {
  return caches.open("offline").then(function (cache) {
    return fetch(request).then(function (response) {
      console.log(response.url + " was cached");
      return cache.put(request, response);
    });
  });
};

var returnFromCache = function (request) {
  return caches.open("offline").then(function (cache) {
    return cache.match(request).then(function (matching) {
      if (!matching || matching.status == 404) {
        return cache.match("index.html");
      } else {
        return matching;
      }
    });
  });
};

// Push notification handler — mirrors service-worker.js
self.addEventListener("push", function (event) {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch (e) {
    data = { title: "Diundun", body: event.data?.text() || "" };
  }

  const type = data.data?.type || "default";
  const isCall = type === "incoming_call" || type === "call";
  const senderName =
    data.data?.sender?.name ||
    data.data?.senderName ||
    data.data?.callerName ||
    data.title ||
    "Someone";

  const options = {
    body: isCall ? `Incoming call from ${senderName}` : data.body || "You have a new notification",
    icon: "/icon-192x192.png",
    badge: "/badge-72x72.png",
    vibrate: isCall ? [500, 200, 500, 200, 500] : [200, 100, 200],
    requireInteraction: isCall,
    renotify: isCall,
    data: {
      ...data.data,
      url: isCall ? "/incoming-call" : data.url || "/",
      isCall,
      senderName,
    },
    tag: isCall
      ? `call-${data.data?.room || "call"}`
      : `msg-${data.data?.room || "default"}`,
  };

  event.waitUntil(
    self.registration.showNotification(
      isCall ? "📞 Incoming Call" : data.title || "Diundun",
      options,
    )
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const data = event.notification.data || {};
  const isCall = data.isCall || data.type === "incoming_call";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      const callPayload = {
        callUrl: data.callUrl,
        callerId: data.callerId,
        callerName: data.callerName || data.senderName,
        room: data.room,
        callType: data.callType || "video",
      };

      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.focus();
          client.postMessage(
            isCall
              ? { type: "INCOMING_CALL", payload: callPayload }
              : { type: "OPEN_CHAT", payload: { roomId: data.room || data.roomId } }
          );
          return;
        }
      }

      if (clients.openWindow) {
        var url = isCall
          ? `/incoming-call?callUrl=${encodeURIComponent(data.callUrl || "")}&callerId=${data.callerId || ""}&callerName=${encodeURIComponent(data.callerName || "")}&room=${data.room || ""}&callType=${data.callType || "video"}`
          : `/chat/${data.room || data.roomId || ""}`;
        return clients.openWindow(url);
      }
    })
  );
});
