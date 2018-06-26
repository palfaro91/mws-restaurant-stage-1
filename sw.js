const cacheName = 'restaurant-v1';
self.addEventListener('install', function(event) {
  event.waitUntil(
      caches.open(cacheName).then(function(cache) {
        return cache.addAll(
            [
                '/css/styles.css',
                '/js/dbhelper.js',
                '/js/main.js',
                '/js/restaurant_info.js',
                'index.html',
                'restaurant.html'
            ]
        );
      })
  );
});


self.addEventListener('fetch', function(event){
  event.respondWith(
      caches.open(cacheName).then(cache => {
       return cache.match(event.request).then(cachedResponse => {
          if (cachedResponse) return cachedResponse;
          return fetch(event.request).then(response => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
      }).catch(err => {
        console.log(" there is an error ",err);
      })
  )
});
