/**
 * open db connection
 */
const iDBee = idb.open('mws-restaurants', 1, function(upgradeDB) {
  switch(upgradeDB.oldVersion) {
    case 0:
    case 1:
      upgradeDB.createObjectStore('restaurants', {keyPath: 'id'});
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
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
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
        callback(null, data);
      }
    }).catch (err => {
      console.error("Error fetching restaurants ", err);
      // attempt to get from idb on err
      iDBee.then(function(db){
        let store = db.transaction('resturants').objectStore('restaurants');
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
    iDBee.then(function(db){
      let store = db.transaction('restaurants').objectStore('restaurants');
      return store.get(+id);
    }).then(function(restaurant){
      if (restaurant){
        callback(null, restaurant);
      }else{
        // fetch all restaurants with proper error handling.
        DBHelper.fetchRestaurants((error, restaurants) => {
          if (error) {
            callback(error, null);
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
    })
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

}

