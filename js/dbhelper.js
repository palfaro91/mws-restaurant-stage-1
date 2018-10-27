/**
 * open db connection
 */
const iDBee = idb.open('mws-restaurants', 2, function(upgradeDB) {
  switch(upgradeDB.oldVersion) {
    case 0:
    case 1:
      upgradeDB.createObjectStore('restaurants', {keyPath: 'id'});
    case 2:
      upgradeDB.createObjectStore('reviews', {keyPath: 'id', autoIncrement: true});
      upgradeDB.transaction.objectStore('reviews').createIndex('restaurant_id', 'restaurant_id');
    // case 3:
  }
});

/**
 * Common database helper functions.
 */

class DBHelper {
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
     // Change this to your server port
    return `http://localhost:${DBHelper.PORT}/restaurants`;
  }

  static get PORT(){
    return 1337;
  }

  static get REVIEWS_URL(){
    return `http://localhost:${DBHelper.PORT}/reviews`;
  }

  static get FAV_STORAGE_KEY(){
    return '_res-raf';
  }

  static get REV_STORAGE_KEY(){
    return '_res-rar-';
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback, id) {
    let endpoint = !id ? DBHelper.DATABASE_URL : `${DBHelper.DATABASE_URL}/${id}`;
    fetch(endpoint, {method: 'Get'})
    .then( res => res.json())
    .then( data => {
      // store in idb for future
      if (data && data.length){
        iDBee.then( (db) => {
          let restaurantStore = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
          for (const restaurant of data) {
            restaurantStore.put(restaurant)
          }
          callback(null, data);
        });
      }else{
        iDBee.then( (db) => {
          let restaurantStore = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
          restaurantStore.put(data);
          callback(null, data);
        });
      }
    }).catch (err => {
      // console.error("Error fetching restaurants dbHELPER ", err);
      // attempt to get from idb on err
      iDBee.then(function(db){
        let store = db.transaction('restaurants').objectStore('restaurants');
        return store.getAll();
      }).then(function(items){
        callback(null, items);
      }).catch(function(err){
        callback(err, null);
      })
    })
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    //TODO refactor into service

    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        iDBee.then(function(db){
          let store = db.transaction('restaurants').objectStore('restaurants');
          return store.get(+id);
        }).then(function(restaurant){
          if (restaurant){
            callback(null, restaurant);
          }else{
            // fetch all restaurants with proper error handling.
            callback(error, null);
          }
        })
      } else {
        // const restaurant = restaurants.find(r => r.id == id);
        if (restaurants) { // Got the restaurant
          callback(null, restaurants);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    }, id);
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Get restaurants from db
   */

  static getRestrauntsFromDb(){
    return DBHelper.openDB().then(function(db){
      let store = db.transaction('restaurants').objectStore('restaurants');
      return store.getAll();
    })
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return restaurant.photograph ? `/img/${restaurant.photograph}.jpg` : `/img/${restaurant.id}.jpg`;
  }

  /**
   * Map marker for a restaurant.
   */
   static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(newMap);
    return marker;
  }

  /**
   * fetch reviews
   */

  static fetchReviewsForRestaurant(callback, id) {
    let endpoint = !id ? DBHelper.REVIEWS_URL : `${DBHelper.REVIEWS_URL}/?restaurant_id=${id}`;
    fetch(endpoint, {method: 'Get'})
    .then( res => res.json())
    .then( data => {
      // store in idb for future
      let unsynced = DBHelper.getUnsyncedReviews();
      if (data && data.length){
        iDBee.then( (db) => {
          let reviewsStore = db.transaction('reviews', 'readwrite').objectStore('reviews');
          for (const review of data) {
            reviewsStore.put(review)
          }
          callback(null, [...data, ...unsynced]);
        });
      }else{
        callback(null, [...data, ...unsynced]);
      }
    }).catch (err => {
      // attempt to get from idb on err
      iDBee.then(function(db){
        let store = db.transaction('reviews').objectStore('reviews');
        return store.getAll();
      }).then(function(items){
        callback(null, items);
      }).catch(function(err){
        callback(err, null);
      })
    })
  }

  /**
   * post review
   */

  static postReview(review){
    if (!review || !review.restaurant_id || !review.comments) return Promise.resolve({error: true, message: "Please leave a comment."});
    return fetch(DBHelper.REVIEWS_URL, {
      method: 'POST',
      body: JSON.stringify(review),
      headers:{
        'Content-Type': 'application/json'
      }
    }).then(res => {
      if (!res.ok && !res.redirected) {
        return;
      }else{
        return res.json();
      }
    }).then(data => {
        return iDBee.then ( (db) => {
          if (!db) return data;
          let reviewsStore = db.transaction('reviews', 'readwrite').objectStore('reviews');
          reviewsStore.put(data);
          return data;
        }).catch( err => {
          return data;
        })
    }).catch(err => {
      review.createdAt = (new Date()).toISOString(); // mock createdAt
      if ('localStorage' in window){
        let failed = JSON.parse(localStorage.getItem(`${DBHelper.REV_STORAGE_KEY}${review.restaurant_id}`)) || []; // check for existing fails else new array
        failed.push(review);
        localStorage.setItem(`${DBHelper.REV_STORAGE_KEY}${review.restaurant_id}`, JSON.stringify(failed));
        return {status: "cached", review};
      }
    })
  }

  /**
   * retrieve unsynced from localstorage
   */

  static getUnsyncedReviews(){
    if ('localStorage' in window){
      // check for existing fails else new array
      return JSON.parse(localStorage.getItem(
          `${DBHelper.REV_STORAGE_KEY}${getParameterByName('id')}`)) || [];
    }
    return [];
  }

  /**
   * Update favorite status
   */
  static updateFavorite(id, favorite) {
    const url = `${DBHelper.DATABASE_URL}/${id}/?is_favorite=${favorite}`,
    config = {
      body: JSON.stringify({"is_favorite": favorite}),
      method: 'PUT'
    };
    return fetch(url, config)
    .then(response => {
      // If we don't get a good response then assume we're offline
      if (!response.ok && !response.redirected) {
        return;
      }else{
        return response.json();
      }
    }).then(json => {
      return iDBee.then( (db) => {
        if (!db) return json;
        let restaurantStore = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
        return restaurantStore.get(id)
        .then(restaurant => {
          restaurant.is_favorite = json.is_favorite;
          restaurantStore.put(restaurant);
          return json;
        })
      })
    }).catch(err => {
      if ('localStorage' in window){
        let failed = JSON.parse(localStorage.getItem(DBHelper.FAV_STORAGE_KEY)) || []; // check for existing fails else new array
        failed = addOrReplace(failed, {id, favorite});
        localStorage.setItem(DBHelper.FAV_STORAGE_KEY, JSON.stringify(failed));
        return DBHelper.updateFavoriteCache(id, favorite)
        .then(rest => ({status: "cached"}));
      }
    })
  }
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */
  static postAReview(review){
    return fetch(DBHelper.REVIEWS_URL, {
      method: 'POST',
      body: JSON.stringify(review),
      headers:{
        'Content-Type': 'application/json'
      }
    }).then(res => {
      if (!res.ok && !res.redirected) {
        return;
      }else{
        return res.json();
      }
    }).then(data => {
      return iDBee.then ( (db) => {
        if (!db) return data;
        let reviewsStore = db.transaction('reviews', 'readwrite').objectStore('reviews');
        reviewsStore.put(data);
        return data;
      }).catch( err => {
        return data;
      })
    })
  }
  static attemptFailedReviews(){
    const key = `${DBHelper.REV_STORAGE_KEY}${getParameterByName('id')}`;
    const todos = JSON.parse(localStorage.getItem(key)); // existing failed attempts
    if (todos === null){
      return;
    }else if (todos && !todos.length){
      localStorage.removeItem(key);
    }else{
      return Promise.all(todos.map(todo => DBHelper.postAReview(todo)))
      .then(finalTodos => {
        localStorage.removeItem(key);
        return {synced: true, message: 'Reviews have been synced!'};
      })
    }
  }
  static attemptFailedReqs(){
    const todos = JSON.parse(localStorage.getItem(DBHelper.FAV_STORAGE_KEY)); // existing failed attempts
    if (todos === null){
      return;
    }else if (todos && !todos.length){
      localStorage.removeItem(DBHelper.FAV_STORAGE_KEY);
    }else{
      return Promise.all(todos.map(todo => DBHelper.putFavorite(todo.id, todo.favorite)))
      .then(responses => {
        return Promise.all(responses.map(response => DBHelper.updateFavoriteCache(response.id, response.is_favorite)))
      })
      .then(resp => {
        return Promise.all(todos.filter(_todo => {
          return resp.filter(_res => _res.id === _todo.id ).length === 0;
        }))
      })
      .then(finalTodos => {
        if (finalTodos && finalTodos.length){
          localStorage.setItem(DBHelper.FAV_STORAGE_KEY, JSON.stringify(finalTodos));
        }else{
          localStorage.removeItem(DBHelper.FAV_STORAGE_KEY);
        }
        return {synced: true, message: 'Favorites have been synced!'};
      })
    }
  }
  static putFavorite(id, favorite){
    const url = `${DBHelper.DATABASE_URL}/${id}/?is_favorite=${favorite}`,
        config = {
          body: JSON.stringify({"is_favorite": favorite}),
          method: 'PUT'
        };
    return fetch(url, config)
    .then(response => {
      // If we don't get a good response then assume we're offline
      if (!response.ok && !response.redirected) {
        return;
      }else{
        return response.json();
      }
    })
  }
  static updateFavoriteCache(id, favorite){
    return iDBee.then( (db) => {
      let restaurantStore = db.transaction('restaurants', 'readwrite').objectStore('restaurants');
      return restaurantStore.get(id)
      .then(restaurant => {
        console.log("updating the db entry" , restaurant);
        restaurant.is_favorite = favorite;
        restaurantStore.put(restaurant);
        return restaurant;
      })
    });
  }
}
function addOrReplace(array, item){
  const items = [...array];
  const i = items.findIndex(_item => _item.id === item.id);
  if (i > -1) items[i] = item;
  else items.push(item);
  return items;
}
/**
 * Get a parameter by name from page URL.
 */
function getParameterByName(name, url){
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
      results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};

