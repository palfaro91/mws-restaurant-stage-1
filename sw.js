const cacheName = 'restaurant-mws-v1';
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
  if (isHTTPReq(event.request)){
    event.respondWith(
         caches.open(cacheName).then(cache => {
           return cache.match(event.request).then(cachedResponse => {
             if (cachedResponse) return cachedResponse;
             return fetch(event.request).then(response => {
               // if (!response || response.status !== 200){ TODO investigate img responses
               //   return response;
               // }
               console.log("wil put to cache ", event.request);
               cache.put(event.request, response.clone());
               return response;
             });
           })
         }).catch(err => {
           console.log(" there is an error ",err);
         })
     )
  }
});

function isHTTPReq(req){
  return /https?/.test(req.url);
}
