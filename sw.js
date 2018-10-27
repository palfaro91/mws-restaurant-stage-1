const cacheName = 'restaurant-mws-v1';
/**
 * Register service worker
 */
function registerServiceWorker() {
  if (!navigator.serviceWorker) return;
  navigator.serviceWorker.register('../sw.js').then(reg => {
    console.log('Service worker registered');
  }).catch(err => {
    console.log("Error registering sw ", err);
  })
}

self.addEventListener('install', function(event) {
  event.waitUntil(
      caches.open(cacheName).then(cache => {
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
      }).catch(err => {
        console.error("Error on caches open", err);
      })
  );
});

self.addEventListener('fetch', (event) => {
  let req = event.request, updateOnFetch = ['/restaurants', '/reviews', '/reviews/'];
  let url = new URL(req.url);
  // return restaurant.html when query string is appended
  if (~event.request.url.indexOf("restaurant.html")) {
    req = new Request("restaurant.html");
  }

  if (isHTTPReq(req) && req.method === "GET"){
    event.respondWith(
         caches.open(cacheName).then(cache => {
           console.log("my url pathname ", url, updateOnFetch);
           if (updateOnFetch.indexOf(url.pathname) > -1){
             return fetch(req).then(response => {
               cache.put(req, response.clone());
               console.log("this is my response ", response);
               return response;
             })
           }
           if (url.origin === location.origin) {
             if (url.pathname === '/') {
               return caches.match('index.html').then(res => {
                 if (res) {
                   return res;
                 }
                 return fetch(req).then(response => {
                   if (response.status !== 200){
                     return response;
                   }
                   cache.put(req, response.clone());
                   return response;
                 });
               })
             }
           }
           return cache.match(req).then(cachedResponse => {
             if (cachedResponse) {
               return cachedResponse;
             }
             return fetch(req).then(response => {
               if (response.status !== 200){
                 if (url.hostname === 'api.tiles.mapbox.com' || url.pathname.endsWith('.png')){
                   cache.put(req, response.clone());
                 }
                 return response;
               }
               cache.put(req, response.clone());
               return response;
             });
           })
         }).catch(err => {
           return new Response('An error has occurred', {
             status: 500,
             statusText: "Application error"
           })
         })
     )
  }else{
    event.respondWith(fetch(event.request));
  }
});

function isHTTPReq(req){
  return /https?/.test(req.url);
}
