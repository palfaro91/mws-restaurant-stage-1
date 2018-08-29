const cacheName = 'restaurant-mws-v1';
/**
 * Register service worker
 */
function registerServiceWorker() {
  if (!navigator.serviceWorker) return;
  navigator.serviceWorker.register('../sw.js').then(reg => {
    console.log('Service worker registered');
  });
}

self.addEventListener('install', function(event) {
  event.waitUntil(
      caches.open(cacheName).then(function(cache) {
        return cache.addAll(
            [
                '/css/styles.css',
                '/js/dbhelper.js',
                '/js/main.js',
                '/js/restaurant_info.js',
                '/js/idb.js',
                'index.html',
                'restaurant.html'
            ]
        );
      })
  );
});

self.addEventListener('fetch', (event) => {
  let req = event.request;
  // return restaurant.html when query string is appended
  if (~event.request.url.indexOf("restaurant.html")) {
    req = new Request("restaurant.html");
  }
  if (isHTTPReq(req)){
    event.respondWith(
         caches.open(cacheName).then(cache => {
           return cache.match(req).then(cachedResponse => {
             if (cachedResponse) return cachedResponse;
             return fetch(req).then(response => {
               if (response.status !== 200){ //TODO investigate img responses
                 return response;
               }
               cache.put(req, response.clone());
               return response;
             });
           })
         }).catch(err => {
           console.log(" there is an error ",err);
           return new Response('An error has occurred', {
             status: 500,
             statusText: "Application error"
           })
         })
     )
  }
});

function isHTTPReq(req){
  return /https?/.test(req.url);
}
