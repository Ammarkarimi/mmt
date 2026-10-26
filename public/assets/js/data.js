/* TripSaathi – static demo data. All names, airlines, operators and offers are fictional. */
(function () {
  const D = (window.TS_DATA = {});

  /* ---------------------------------------------------------------- Airports */
  D.airports = [
    { code: 'DEL', city: 'New Delhi', name: 'Indira Gandhi International Airport', country: 'India', lat: 28.56, lon: 77.1, popular: 1 },
    { code: 'BOM', city: 'Mumbai', name: 'Chhatrapati Shivaji International Airport', country: 'India', lat: 19.09, lon: 72.87, popular: 1 },
    { code: 'BLR', city: 'Bengaluru', name: 'Kempegowda International Airport', country: 'India', lat: 13.2, lon: 77.71, popular: 1 },
    { code: 'GOI', city: 'Goa', name: 'Dabolim Airport', country: 'India', lat: 15.38, lon: 73.83, popular: 1 },
    { code: 'MAA', city: 'Chennai', name: 'Chennai International Airport', country: 'India', lat: 12.99, lon: 80.17, popular: 1 },
    { code: 'CCU', city: 'Kolkata', name: 'Netaji Subhas Chandra Bose International Airport', country: 'India', lat: 22.65, lon: 88.45, popular: 1 },
    { code: 'HYD', city: 'Hyderabad', name: 'Rajiv Gandhi International Airport', country: 'India', lat: 17.24, lon: 78.43, popular: 1 },
    { code: 'DXB', city: 'Dubai', name: 'Dubai International Airport', country: 'United Arab Emirates', lat: 25.25, lon: 55.36, popular: 1, intl: 1 },
    { code: 'SIN', city: 'Singapore', name: 'Changi Airport', country: 'Singapore', lat: 1.36, lon: 103.99, popular: 1, intl: 1 },
    { code: 'BKK', city: 'Bangkok', name: 'Suvarnabhumi Airport', country: 'Thailand', lat: 13.69, lon: 100.75, popular: 1, intl: 1 },
    { code: 'PNQ', city: 'Pune', name: 'Pune International Airport', country: 'India', lat: 18.58, lon: 73.92 },
    { code: 'AMD', city: 'Ahmedabad', name: 'Sardar Vallabhbhai Patel International Airport', country: 'India', lat: 23.07, lon: 72.63 },
    { code: 'JAI', city: 'Jaipur', name: 'Jaipur International Airport', country: 'India', lat: 26.82, lon: 75.81 },
    { code: 'COK', city: 'Kochi', name: 'Cochin International Airport', country: 'India', lat: 10.15, lon: 76.4 },
    { code: 'TRV', city: 'Thiruvananthapuram', name: 'Trivandrum International Airport', country: 'India', lat: 8.48, lon: 76.92 },
    { code: 'LKO', city: 'Lucknow', name: 'Chaudhary Charan Singh International Airport', country: 'India', lat: 26.76, lon: 80.89 },
    { code: 'SXR', city: 'Srinagar', name: 'Srinagar International Airport', country: 'India', lat: 33.99, lon: 74.77 },
    { code: 'IXL', city: 'Leh', name: 'Kushok Bakula Rimpochee Airport', country: 'India', lat: 34.14, lon: 77.55 },
    { code: 'IXB', city: 'Bagdogra', name: 'Bagdogra Airport', country: 'India', lat: 26.68, lon: 88.33 },
    { code: 'GAU', city: 'Guwahati', name: 'Lokpriya Gopinath Bordoloi International Airport', country: 'India', lat: 26.11, lon: 91.59 },
    { code: 'PAT', city: 'Patna', name: 'Jay Prakash Narayan Airport', country: 'India', lat: 25.59, lon: 85.09 },
    { code: 'VNS', city: 'Varanasi', name: 'Lal Bahadur Shastri International Airport', country: 'India', lat: 25.45, lon: 82.86 },
    { code: 'IXC', city: 'Chandigarh', name: 'Chandigarh International Airport', country: 'India', lat: 30.67, lon: 76.79 },
    { code: 'UDR', city: 'Udaipur', name: 'Maharana Pratap Airport', country: 'India', lat: 24.62, lon: 73.9 },
    { code: 'IXZ', city: 'Port Blair', name: 'Veer Savarkar International Airport', country: 'India', lat: 11.64, lon: 92.73 },
    { code: 'ATQ', city: 'Amritsar', name: 'Sri Guru Ram Dass Jee International Airport', country: 'India', lat: 31.71, lon: 74.8 },
    { code: 'BBI', city: 'Bhubaneswar', name: 'Biju Patnaik International Airport', country: 'India', lat: 20.24, lon: 85.82 },
    { code: 'IDR', city: 'Indore', name: 'Devi Ahilya Bai Holkar Airport', country: 'India', lat: 22.72, lon: 75.8 },
    { code: 'NAG', city: 'Nagpur', name: 'Dr. Babasaheb Ambedkar International Airport', country: 'India', lat: 21.09, lon: 79.05 },
    { code: 'MLE', city: 'Male', name: 'Velana International Airport', country: 'Maldives', lat: 4.19, lon: 73.53, intl: 1 },
    { code: 'DPS', city: 'Bali', name: 'Ngurah Rai International Airport', country: 'Indonesia', lat: -8.75, lon: 115.17, intl: 1 },
    { code: 'KUL', city: 'Kuala Lumpur', name: 'Kuala Lumpur International Airport', country: 'Malaysia', lat: 2.75, lon: 101.71, intl: 1 },
    { code: 'HKT', city: 'Phuket', name: 'Phuket International Airport', country: 'Thailand', lat: 8.11, lon: 98.32, intl: 1 },
    { code: 'CMB', city: 'Colombo', name: 'Bandaranaike International Airport', country: 'Sri Lanka', lat: 7.18, lon: 79.88, intl: 1 },
    { code: 'KTM', city: 'Kathmandu', name: 'Tribhuvan International Airport', country: 'Nepal', lat: 27.7, lon: 85.36, intl: 1 },
    { code: 'DOH', city: 'Doha', name: 'Hamad International Airport', country: 'Qatar', lat: 25.27, lon: 51.61, intl: 1 },
    { code: 'AUH', city: 'Abu Dhabi', name: 'Zayed International Airport', country: 'United Arab Emirates', lat: 24.43, lon: 54.65, intl: 1 },
    { code: 'LHR', city: 'London', name: 'Heathrow Airport', country: 'United Kingdom', lat: 51.47, lon: -0.45, intl: 1 },
    { code: 'CDG', city: 'Paris', name: 'Charles de Gaulle Airport', country: 'France', lat: 49.01, lon: 2.55, intl: 1 },
    { code: 'JFK', city: 'New York', name: 'John F. Kennedy International Airport', country: 'United States', lat: 40.64, lon: -73.78, intl: 1 },
    { code: 'SYD', city: 'Sydney', name: 'Kingsford Smith Airport', country: 'Australia', lat: -33.94, lon: 151.18, intl: 1 },
  ];

  /* ---------------------------------------------------------------- Airlines (fictional) */
  D.airlines = [
    { code: 'SK', name: 'Skylark Airways', color: '#2563eb', color2: '#60a5fa', factor: 1.0 },
    { code: 'SF', name: 'Saffron Air', color: '#ea580c', color2: '#fdba74', factor: 1.12 },
    { code: 'BK', name: 'BlueKite', color: '#0891b2', color2: '#67e8f9', factor: 0.92 },
    { code: 'MN', name: 'Monsoon Airlines', color: '#059669', color2: '#6ee7b7', factor: 0.96 },
    { code: 'PK', name: 'Peacock Air', color: '#7c3aed', color2: '#c4b5fd', factor: 1.2 },
    { code: 'GJ', name: 'GoJet India', color: '#e11d48', color2: '#fda4af', factor: 0.9 },
  ];
  D.intlAirlines = [
    { code: 'DF', name: 'Desert Falcon', color: '#b45309', color2: '#fcd34d', factor: 1.15 },
    { code: 'LC', name: 'Lion City Air', color: '#be123c', color2: '#fecdd3', factor: 1.25 },
    { code: 'AW', name: 'Atlantic Wings', color: '#1e3a8a', color2: '#93c5fd', factor: 1.3 },
  ];
  D.hubs = ['DEL', 'BOM', 'BLR', 'HYD', 'CCU', 'MAA'];
  D.intlHubs = ['DXB', 'DOH', 'SIN', 'AUH'];

  D.cabinClasses = [
    { key: 'E', label: 'Economy/Premium Economy', short: 'Economy', mult: 1 },
    { key: 'PE', label: 'Premium Economy', short: 'Premium Economy', mult: 1.65 },
    { key: 'B', label: 'Business', short: 'Business', mult: 3.1 },
    { key: 'F', label: 'First Class', short: 'First Class', mult: 4.8 },
  ];

  D.specialFares = [
    { key: 'regular', label: 'Regular', sub: 'Regular fares' },
    { key: 'student', label: 'Student', sub: 'Extra discounts/baggage' },
    { key: 'armed', label: 'Armed Forces', sub: 'Up to ₹600 off' },
    { key: 'senior', label: 'Senior Citizen', sub: 'Up to ₹600 off' },
    { key: 'doctor', label: 'Doctor and Nurses', sub: 'Up to ₹600 off' },
  ];

  /* ---------------------------------------------------------------- Hotel cities */
  D.hotelCities = [
    { name: 'Goa', country: 'India', kind: 'beach', tier: 3200, localities: ['Calangute', 'Baga', 'Candolim', 'Anjuna', 'Panaji', 'Colva', 'Vagator'], landmark: 'Baga Beach' },
    { name: 'New Delhi', country: 'India', kind: 'heritage', tier: 3600, localities: ['Connaught Place', 'Aerocity', 'Karol Bagh', 'Paharganj', 'South Delhi', 'Chanakyapuri'], landmark: 'India Gate' },
    { name: 'Mumbai', country: 'India', kind: 'city', tier: 4200, localities: ['Andheri', 'Juhu', 'Colaba', 'Bandra', 'Powai', 'Lower Parel'], landmark: 'Gateway of India' },
    { name: 'Bengaluru', country: 'India', kind: 'city', tier: 3400, localities: ['MG Road', 'Indiranagar', 'Whitefield', 'Koramangala', 'Electronic City'], landmark: 'Cubbon Park' },
    { name: 'Jaipur', country: 'India', kind: 'heritage', tier: 2800, localities: ['C-Scheme', 'MI Road', 'Amer', 'Malviya Nagar', 'Bani Park'], landmark: 'Hawa Mahal' },
    { name: 'Manali', country: 'India', kind: 'mountain', tier: 2400, localities: ['Old Manali', 'Mall Road', 'Solang Valley', 'Vashisht', 'Aleo'], landmark: 'Mall Road' },
    { name: 'Udaipur', country: 'India', kind: 'lake', tier: 3600, localities: ['Lake Pichola', 'City Palace Area', 'Fateh Sagar', 'Hiran Magri'], landmark: 'Lake Pichola' },
    { name: 'Shimla', country: 'India', kind: 'mountain', tier: 2600, localities: ['Mall Road', 'Kufri', 'Chotta Shimla', 'Mashobra'], landmark: 'The Ridge' },
    { name: 'Rishikesh', country: 'India', kind: 'river', tier: 2200, localities: ['Tapovan', 'Laxman Jhula', 'Ram Jhula', 'Shivpuri'], landmark: 'Laxman Jhula' },
    { name: 'Munnar', country: 'India', kind: 'tea', tier: 2900, localities: ['Chithirapuram', 'Pallivasal', 'Devikulam', 'Town Centre'], landmark: 'Tea Museum' },
    { name: 'Ooty', country: 'India', kind: 'tea', tier: 2500, localities: ['Charing Cross', 'Fern Hill', 'Lovedale', 'Coonoor Road'], landmark: 'Ooty Lake' },
    { name: 'Mussoorie', country: 'India', kind: 'mountain', tier: 2700, localities: ['Mall Road', 'Landour', 'Kempty Road', 'Library Chowk'], landmark: 'Gun Hill' },
    { name: 'Hyderabad', country: 'India', kind: 'heritage', tier: 3100, localities: ['Banjara Hills', 'HITEC City', 'Gachibowli', 'Secunderabad'], landmark: 'Charminar' },
    { name: 'Chennai', country: 'India', kind: 'beach', tier: 3000, localities: ['T Nagar', 'Egmore', 'OMR', 'Guindy', 'Nungambakkam'], landmark: 'Marina Beach' },
    { name: 'Kolkata', country: 'India', kind: 'heritage', tier: 2700, localities: ['Park Street', 'Salt Lake', 'New Town', 'Esplanade'], landmark: 'Victoria Memorial' },
    { name: 'Agra', country: 'India', kind: 'heritage', tier: 2500, localities: ['Taj Ganj', 'Fatehabad Road', 'Sadar Bazaar'], landmark: 'Taj Mahal' },
    { name: 'Varanasi', country: 'India', kind: 'river', tier: 2300, localities: ['Assi Ghat', 'Dashashwamedh', 'Cantonment', 'Godowlia'], landmark: 'Dashashwamedh Ghat' },
    { name: 'Darjeeling', country: 'India', kind: 'tea', tier: 2600, localities: ['Mall Road', 'Gandhi Road', 'Ghoom', 'Lebong'], landmark: 'Tiger Hill' },
    { name: 'Leh', country: 'India', kind: 'snow', tier: 3000, localities: ['Changspa', 'Fort Road', 'Main Bazaar', 'Skara'], landmark: 'Shanti Stupa' },
    { name: 'Srinagar', country: 'India', kind: 'lake', tier: 3100, localities: ['Dal Lake', 'Rajbagh', 'Boulevard Road', 'Nishat'], landmark: 'Dal Lake' },
    { name: 'Pondicherry', country: 'India', kind: 'beach', tier: 2900, localities: ['White Town', 'Auroville', 'Promenade', 'Serenity Beach'], landmark: 'Promenade Beach' },
    { name: 'Alleppey', country: 'India', kind: 'lake', tier: 3300, localities: ['Punnamada', 'Marari', 'Kainakary', 'Finishing Point'], landmark: 'Vembanad Lake' },
    { name: 'Coorg', country: 'India', kind: 'forest', tier: 3400, localities: ['Madikeri', 'Kushalnagar', 'Virajpet', 'Siddapur'], landmark: "Abbey Falls" },
    { name: 'Dubai', country: 'United Arab Emirates', kind: 'city', tier: 7800, localities: ['Deira', 'Bur Dubai', 'Downtown', 'Dubai Marina', 'Jumeirah'], landmark: 'Downtown Dubai' },
    { name: 'Bangkok', country: 'Thailand', kind: 'city', tier: 4600, localities: ['Sukhumvit', 'Silom', 'Pratunam', 'Riverside', 'Khao San'], landmark: 'Grand Palace' },
    { name: 'Singapore', country: 'Singapore', kind: 'city', tier: 9800, localities: ['Marina Bay', 'Orchard', 'Little India', 'Sentosa', 'Chinatown'], landmark: 'Marina Bay' },
    { name: 'Bali', country: 'Indonesia', kind: 'island', tier: 5200, localities: ['Seminyak', 'Ubud', 'Kuta', 'Nusa Dua', 'Canggu'], landmark: 'Seminyak Beach' },
    { name: 'Maldives', country: 'Maldives', kind: 'island', tier: 16500, localities: ['North Male Atoll', 'South Male Atoll', 'Maafushi', 'Baa Atoll'], landmark: 'Male' },
    { name: 'Phuket', country: 'Thailand', kind: 'beach', tier: 4800, localities: ['Patong', 'Kata', 'Karon', 'Phuket Town'], landmark: 'Patong Beach' },
    { name: 'London', country: 'United Kingdom', kind: 'city', tier: 14500, localities: ['Kensington', 'Westminster', 'Paddington', 'Covent Garden'], landmark: 'Hyde Park' },
    { name: 'Paris', country: 'France', kind: 'city', tier: 13800, localities: ['Le Marais', 'Montmartre', 'Saint-Germain', 'Opera'], landmark: 'Eiffel Tower' },
  ];

  D.hotelNames = [
    'Saffron Stays', 'The Neem Tree', 'Marigold Residency', 'Cedar Crest', 'Azure Sands Resort', 'Kesar Haveli',
    'The Urban Nest', 'Silver Oak Suites', 'Palm Grove Inn', 'Moonstone Boutique Hotel', 'Jasmine Court',
    'The Riverstone', 'Teak & Timber Lodge', 'Seven Hills Retreat', 'Orchid Bloom Hotel', 'Lotus Courtyard',
    'The Banyan Retreat', 'Amber Palace Hotel', 'Coral Bay Resort', 'The Peepal Inn', 'Indigo Heights',
    'Sandalwood Suites', 'The Monsoon House', 'Ivory Tower Hotel', 'Golden Pagoda Inn', 'Willow Creek Resort',
    'Starlight Grand', 'The Copper Kettle', 'Emerald Bay Hotel', 'Mango Tree Residency',
  ];
  D.homestayNames = [
    'Cloud Nine Homestay', 'Grandma\'s Cottage', 'The Pine Cabin', 'Blue Door Villa', 'Hilltop Hideaway', 'Casa Serena',
    'The Orchard House', 'Firefly Farmstay', 'Laughing Waters Villa', 'Courtyard Bungalow', 'Wildflower Cottage',
    'Riverbend Homestay', 'Sunset Terrace Villa', 'The Attic Loft', 'Mistwood Cabin', 'Tamarind Villa', 'Bamboo Grove Stay',
    'The Writer\'s Retreat', 'Peacock Garden Villa', 'Monk\'s Rest Homestay',
  ];

  D.amenities = [
    { key: 'wifi', label: 'Free Wi-Fi', icon: 'wifi' },
    { key: 'pool', label: 'Swimming Pool', icon: 'pool' },
    { key: 'parking', label: 'Free Parking', icon: 'parking' },
    { key: 'restaurant', label: 'Restaurant', icon: 'food' },
    { key: 'ac', label: 'Air Conditioning', icon: 'snow' },
    { key: 'gym', label: 'Gym', icon: 'gym' },
    { key: 'spa', label: 'Spa', icon: 'spa' },
    { key: 'bar', label: 'Bar', icon: 'glass' },
    { key: 'roomservice', label: '24-hour Room Service', icon: 'bell' },
    { key: 'kitchen', label: 'Kitchenette', icon: 'kitchen' },
  ];

  /* ---------------------------------------------------------------- Holiday packages */
  D.packages = [
    { id: 'p1', name: 'Goa Beach Bliss', dest: 'Goa', country: 'India', cities: [['Goa', 4]], price: 13999, mrp: 17999, kind: 'beach', themes: ['Beach', 'Family', 'Honeymoon'], stars: 3, rating: 4.4,
      highlights: ['North Goa sightseeing', 'Sunset cruise on the Mandovi', 'Dudhsagar day trip'] },
    { id: 'p2', name: 'Kerala Backwaters & Hills', dest: 'Kerala', country: 'India', cities: [['Munnar', 2], ['Thekkady', 1], ['Alleppey', 1], ['Kochi', 1]], price: 22499, mrp: 27999, kind: 'lake', themes: ['Honeymoon', 'Nature', 'Family'], stars: 4, rating: 4.6,
      highlights: ['Overnight houseboat stay', 'Tea estate walk', 'Spice plantation tour'] },
    { id: 'p3', name: 'Kashmir – Paradise on Earth', dest: 'Kashmir', country: 'India', cities: [['Srinagar', 3], ['Gulmarg', 1], ['Pahalgam', 2]], price: 24999, mrp: 31499, kind: 'lake', themes: ['Hill Station', 'Honeymoon', 'Family'], stars: 4, rating: 4.7,
      highlights: ['Shikara ride on Dal Lake', 'Gondola ride in Gulmarg', 'Betaab Valley visit'] },
    { id: 'p4', name: 'Leh Ladakh Expedition', dest: 'Ladakh', country: 'India', cities: [['Leh', 3], ['Nubra', 1], ['Pangong', 1]], price: 28999, mrp: 34999, kind: 'snow', themes: ['Adventure', 'Hill Station'], stars: 3, rating: 4.8,
      highlights: ['Khardung La pass', 'Camp stay at Pangong', 'Double-hump camel safari'] },
    { id: 'p5', name: 'Andaman Island Escape', dest: 'Andaman', country: 'India', cities: [['Port Blair', 2], ['Havelock', 2], ['Neil', 1]], price: 31999, mrp: 38999, kind: 'island', themes: ['Beach', 'Honeymoon', 'Adventure'], stars: 4, rating: 4.6,
      highlights: ['Radhanagar beach', 'Snorkelling at Elephant Beach', 'Light & sound show'] },
    { id: 'p6', name: 'Royal Rajasthan', dest: 'Rajasthan', country: 'India', cities: [['Jaipur', 2], ['Jodhpur', 1], ['Udaipur', 2]], price: 21999, mrp: 26499, kind: 'desert', themes: ['Heritage', 'Family'], stars: 4, rating: 4.5,
      highlights: ['Amber Fort', 'Mehrangarh Fort', 'Boat ride on Lake Pichola'] },
    { id: 'p7', name: 'Himachal Hill Hop', dest: 'Himachal', country: 'India', cities: [['Shimla', 2], ['Manali', 3]], price: 16499, mrp: 20999, kind: 'mountain', themes: ['Hill Station', 'Family', 'Honeymoon'], stars: 3, rating: 4.4,
      highlights: ['Kufri excursion', 'Solang Valley', 'Hadimba temple'] },
    { id: 'p8', name: 'Dubai Delights', dest: 'Dubai', country: 'United Arab Emirates', cities: [['Dubai', 4]], price: 49999, mrp: 58999, kind: 'city', themes: ['International', 'Family', 'Shopping'], stars: 4, rating: 4.5, intl: 1,
      highlights: ['Desert safari with BBQ dinner', 'Dhow cruise', 'City tour with observation deck'] },
    { id: 'p9', name: 'Thailand Fiesta', dest: 'Thailand', country: 'Thailand', cities: [['Pattaya', 2], ['Bangkok', 2]], price: 38999, mrp: 45999, kind: 'beach', themes: ['International', 'Beach', 'Friends'], stars: 3, rating: 4.3, intl: 1,
      highlights: ['Coral Island tour', 'Bangkok temple tour', 'Safari world'] },
    { id: 'p10', name: 'Bali Romance', dest: 'Bali', country: 'Indonesia', cities: [['Ubud', 2], ['Seminyak', 3]], price: 54999, mrp: 64999, kind: 'island', themes: ['International', 'Honeymoon', 'Beach'], stars: 4, rating: 4.7, intl: 1,
      highlights: ['Private pool villa', 'Rice terrace swing', 'Sunset temple visit'] },
    { id: 'p11', name: 'Maldives Overwater Retreat', dest: 'Maldives', country: 'Maldives', cities: [['Maldives', 3]], price: 89999, mrp: 109999, kind: 'island', themes: ['International', 'Honeymoon', 'Beach', 'Luxury'], stars: 5, rating: 4.9, intl: 1,
      highlights: ['Water villa stay', 'Speedboat transfers', 'All meals included'] },
    { id: 'p12', name: 'Singapore & Malaysia Combo', dest: 'Singapore', country: 'Singapore', cities: [['Singapore', 3], ['Kuala Lumpur', 2]], price: 72999, mrp: 84999, kind: 'city', themes: ['International', 'Family'], stars: 4, rating: 4.6, intl: 1,
      highlights: ['Sentosa island with cable car', 'Night safari', 'Genting highlands'] },
    { id: 'p13', name: 'Sikkim & Darjeeling Trails', dest: 'Sikkim', country: 'India', cities: [['Gangtok', 3], ['Darjeeling', 2]], price: 23999, mrp: 28999, kind: 'tea', themes: ['Hill Station', 'Nature', 'Family'], stars: 3, rating: 4.5,
      highlights: ['Tsomgo lake', 'Toy train joy ride', 'Tiger Hill sunrise'] },
    { id: 'p14', name: 'Uttarakhand Spiritual Sojourn', dest: 'Uttarakhand', country: 'India', cities: [['Rishikesh', 2], ['Haridwar', 1], ['Mussoorie', 2]], price: 18999, mrp: 22999, kind: 'river', themes: ['Spiritual', 'Hill Station'], stars: 3, rating: 4.3,
      highlights: ['Ganga aarti', 'River rafting', 'Kempty falls'] },
    { id: 'p15', name: 'Vietnam Discovery', dest: 'Vietnam', country: 'Vietnam', cities: [['Hanoi', 2], ['Halong Bay', 1], ['Ho Chi Minh City', 2]], price: 61999, mrp: 71999, kind: 'island', themes: ['International', 'Adventure', 'Friends'], stars: 4, rating: 4.6, intl: 1,
      highlights: ['Overnight cruise in Halong Bay', 'Old quarter food walk', 'Cu Chi tunnels'] },
    { id: 'p16', name: 'Europe Highlights', dest: 'Europe', country: 'Europe', cities: [['Paris', 3], ['Switzerland', 3], ['Amsterdam', 2]], price: 189999, mrp: 219999, kind: 'snow', themes: ['International', 'Family', 'Luxury'], stars: 4, rating: 4.8, intl: 1,
      highlights: ['Seine river cruise', 'Alpine mountain excursion', 'Canal cruise'] },
    { id: 'p17', name: 'Meghalaya Meadows', dest: 'Meghalaya', country: 'India', cities: [['Shillong', 2], ['Cherrapunji', 2]], price: 19999, mrp: 24499, kind: 'forest', themes: ['Nature', 'Adventure'], stars: 3, rating: 4.5,
      highlights: ['Living root bridges', 'Dawki river boating', 'Seven Sisters falls'] },
    { id: 'p18', name: 'Ooty & Coorg Getaway', dest: 'Karnataka', country: 'India', cities: [['Ooty', 2], ['Coorg', 2]], price: 17999, mrp: 21999, kind: 'tea', themes: ['Hill Station', 'Family', 'Nature'], stars: 3, rating: 4.4,
      highlights: ['Botanical garden', 'Coffee plantation walk', 'Abbey falls'] },
  ];
  D.holidayThemes = ['Honeymoon', 'Family', 'Beach', 'Hill Station', 'Adventure', 'Heritage', 'International', 'Nature', 'Spiritual', 'Luxury'];
  D.holidayFromCities = ['New Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'];

  /* ---------------------------------------------------------------- Trains */
  D.stations = [
    { code: 'NDLS', name: 'New Delhi', city: 'New Delhi', lat: 28.64, lon: 77.22 },
    { code: 'BCT', name: 'Mumbai Central', city: 'Mumbai', lat: 18.97, lon: 72.82 },
    { code: 'CSMT', name: 'Mumbai CSMT', city: 'Mumbai', lat: 18.94, lon: 72.84 },
    { code: 'SBC', name: 'KSR Bengaluru', city: 'Bengaluru', lat: 12.98, lon: 77.57 },
    { code: 'MAS', name: 'Chennai Central', city: 'Chennai', lat: 13.08, lon: 80.27 },
    { code: 'HWH', name: 'Howrah Jn', city: 'Kolkata', lat: 22.58, lon: 88.34 },
    { code: 'SC', name: 'Secunderabad Jn', city: 'Hyderabad', lat: 17.43, lon: 78.5 },
    { code: 'JP', name: 'Jaipur Jn', city: 'Jaipur', lat: 26.92, lon: 75.79 },
    { code: 'ADI', name: 'Ahmedabad Jn', city: 'Ahmedabad', lat: 23.02, lon: 72.6 },
    { code: 'LKO', name: 'Lucknow Charbagh', city: 'Lucknow', lat: 26.83, lon: 80.92 },
    { code: 'BSB', name: 'Varanasi Jn', city: 'Varanasi', lat: 25.32, lon: 82.98 },
    { code: 'PNBE', name: 'Patna Jn', city: 'Patna', lat: 25.6, lon: 85.13 },
    { code: 'PUNE', name: 'Pune Jn', city: 'Pune', lat: 18.53, lon: 73.87 },
    { code: 'ERS', name: 'Ernakulam Jn', city: 'Kochi', lat: 9.97, lon: 76.29 },
    { code: 'CDG', name: 'Chandigarh', city: 'Chandigarh', lat: 30.7, lon: 76.82 },
    { code: 'ASR', name: 'Amritsar Jn', city: 'Amritsar', lat: 31.63, lon: 74.87 },
    { code: 'MAO', name: 'Madgaon', city: 'Goa', lat: 15.27, lon: 73.97 },
    { code: 'AGC', name: 'Agra Cantt', city: 'Agra', lat: 27.16, lon: 77.99 },
    { code: 'BPL', name: 'Bhopal Jn', city: 'Bhopal', lat: 23.27, lon: 77.41 },
    { code: 'GHY', name: 'Guwahati', city: 'Guwahati', lat: 26.18, lon: 91.75 },
    { code: 'DDN', name: 'Dehradun', city: 'Dehradun', lat: 30.32, lon: 78.03 },
    { code: 'JAT', name: 'Jammu Tawi', city: 'Jammu', lat: 32.71, lon: 74.88 },
  ];
  D.trainTypes = [
    { type: 'Rajdhani Express', classes: ['3A', '2A', '1A'], speed: 78, factor: 1.35 },
    { type: 'Vande Bharat Express', classes: ['CC', 'EC'], speed: 84, factor: 1.45, maxKm: 900 },
    { type: 'Shatabdi Express', classes: ['CC', 'EC'], speed: 74, factor: 1.25, maxKm: 800 },
    { type: 'Duronto Express', classes: ['SL', '3A', '2A', '1A'], speed: 72, factor: 1.2 },
    { type: 'Superfast Express', classes: ['SL', '3A', '2A', '1A'], speed: 58, factor: 1 },
    { type: 'Humsafar Express', classes: ['3E', '3A', 'SL'], speed: 62, factor: 1.1 },
    { type: 'Garib Rath Express', classes: ['3A', 'CC'], speed: 60, factor: 0.75 },
    { type: 'Mail', classes: ['SL', '3A', '2A'], speed: 50, factor: 0.9 },
    { type: 'Sampark Kranti Express', classes: ['SL', '3A', '2A'], speed: 60, factor: 1 },
  ];
  D.trainClasses = [
    { key: 'ALL', label: 'All Class' },
    { key: 'SL', label: 'Sleeper Class', rate: 0.55 },
    { key: '3E', label: 'Third AC Economy', rate: 1.3 },
    { key: '3A', label: 'Third AC', rate: 1.45 },
    { key: '2A', label: 'Second AC', rate: 2.1 },
    { key: '1A', label: 'First AC', rate: 3.5 },
    { key: 'CC', label: 'AC Chair Car', rate: 1.25 },
    { key: 'EC', label: 'Executive Chair Car', rate: 2.4 },
  ];

  /* ---------------------------------------------------------------- Bus / cab cities */
  D.roadCities = [
    { city: 'New Delhi', state: 'Delhi', lat: 28.61, lon: 77.21 },
    { city: 'Manali', state: 'Himachal Pradesh', lat: 32.24, lon: 77.19 },
    { city: 'Shimla', state: 'Himachal Pradesh', lat: 31.1, lon: 77.17 },
    { city: 'Dehradun', state: 'Uttarakhand', lat: 30.32, lon: 78.03 },
    { city: 'Rishikesh', state: 'Uttarakhand', lat: 30.09, lon: 78.27 },
    { city: 'Haridwar', state: 'Uttarakhand', lat: 29.95, lon: 78.16 },
    { city: 'Jaipur', state: 'Rajasthan', lat: 26.91, lon: 75.79 },
    { city: 'Agra', state: 'Uttar Pradesh', lat: 27.18, lon: 78.01 },
    { city: 'Chandigarh', state: 'Chandigarh', lat: 30.73, lon: 76.78 },
    { city: 'Amritsar', state: 'Punjab', lat: 31.63, lon: 74.87 },
    { city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.85, lon: 80.95 },
    { city: 'Mumbai', state: 'Maharashtra', lat: 19.08, lon: 72.88 },
    { city: 'Pune', state: 'Maharashtra', lat: 18.52, lon: 73.86 },
    { city: 'Goa', state: 'Goa', lat: 15.5, lon: 73.83 },
    { city: 'Bengaluru', state: 'Karnataka', lat: 12.97, lon: 77.59 },
    { city: 'Mysuru', state: 'Karnataka', lat: 12.3, lon: 76.64 },
    { city: 'Coorg', state: 'Karnataka', lat: 12.42, lon: 75.74 },
    { city: 'Chennai', state: 'Tamil Nadu', lat: 13.08, lon: 80.27 },
    { city: 'Pondicherry', state: 'Puducherry', lat: 11.94, lon: 79.81 },
    { city: 'Hyderabad', state: 'Telangana', lat: 17.39, lon: 78.49 },
    { city: 'Ahmedabad', state: 'Gujarat', lat: 23.02, lon: 72.57 },
    { city: 'Udaipur', state: 'Rajasthan', lat: 24.59, lon: 73.71 },
    { city: 'Kochi', state: 'Kerala', lat: 9.93, lon: 76.27 },
    { city: 'Munnar', state: 'Kerala', lat: 10.09, lon: 77.06 },
    { city: 'Indore', state: 'Madhya Pradesh', lat: 22.72, lon: 75.86 },
    { city: 'Kolkata', state: 'West Bengal', lat: 22.57, lon: 88.36 },
    { city: 'Darjeeling', state: 'West Bengal', lat: 27.04, lon: 88.26 },
    { city: 'Varanasi', state: 'Uttar Pradesh', lat: 25.32, lon: 82.97 },
    { city: 'Nainital', state: 'Uttarakhand', lat: 29.38, lon: 79.46 },
    { city: 'Mussoorie', state: 'Uttarakhand', lat: 30.46, lon: 78.07 },
  ];
  D.busOperators = [
    'RoadKing Travels', 'Neelkanth Tours', 'GreenLine Coaches', 'Highway Express', 'Sairam Travels', 'Orange Arrow',
    'Nightrider Coaches', 'Konkan Kings', 'Royal Rath Travels', 'BlueBird Coaches', 'Shivneri Travels', 'Morning Star Bus',
  ];
  D.busTypes = [
    { label: 'A/C Sleeper (2+1)', ac: 1, sleeper: 1, factor: 1.35 },
    { label: 'Multi-Axle A/C Semi Sleeper (2+2)', ac: 1, sleeper: 0, factor: 1.2 },
    { label: 'A/C Seater / Sleeper (2+1)', ac: 1, sleeper: 1, factor: 1.25 },
    { label: 'Non A/C Seater (2+2)', ac: 0, sleeper: 0, factor: 0.7 },
    { label: 'Non A/C Sleeper (2+1)', ac: 0, sleeper: 1, factor: 0.9 },
    { label: 'Electric A/C Seater (2+2)', ac: 1, sleeper: 0, factor: 1.1 },
  ];
  D.cabs = [
    { key: 'hatch', name: 'Hatchback', eg: 'Compact hatchback or similar', seats: 4, bags: 1, rate: 11, ac: 1, color: '#f97316' },
    { key: 'sedan', name: 'Sedan', eg: 'Compact sedan or similar', seats: 4, bags: 2, rate: 12.5, ac: 1, color: '#2563eb' },
    { key: 'suv', name: 'SUV', eg: '7-seater MUV or similar', seats: 6, bags: 3, rate: 16, ac: 1, color: '#059669' },
    { key: 'psuv', name: 'Premium SUV', eg: 'Full-size premium SUV or similar', seats: 6, bags: 4, rate: 21, ac: 1, color: '#111827' },
    { key: 'tempo', name: 'Tempo Traveller', eg: '12-seater van', seats: 12, bags: 8, rate: 26, ac: 1, color: '#7c3aed' },
  ];
  D.rentalPackages = ['1 hr 10 km', '2 hrs 20 km', '4 hrs 40 km', '8 hrs 80 km', '12 hrs 120 km'];

  /* ---------------------------------------------------------------- Visa / Forex / Insurance */
  D.visaCountries = ['United Arab Emirates', 'Singapore', 'Thailand', 'United Kingdom', 'Schengen (Europe)', 'United States', 'Australia', 'Japan', 'Vietnam', 'Malaysia', 'Indonesia', 'Turkey', 'Egypt', 'Sri Lanka', 'Canada', 'New Zealand'];
  D.currencies = [
    { code: 'USD', name: 'US Dollar', rate: 84.2 }, { code: 'EUR', name: 'Euro', rate: 91.4 }, { code: 'GBP', name: 'British Pound', rate: 109.6 },
    { code: 'AED', name: 'UAE Dirham', rate: 22.9 }, { code: 'SGD', name: 'Singapore Dollar', rate: 63.1 }, { code: 'THB', name: 'Thai Baht', rate: 2.48 },
    { code: 'AUD', name: 'Australian Dollar', rate: 55.8 }, { code: 'JPY', name: 'Japanese Yen', rate: 0.56 }, { code: 'CAD', name: 'Canadian Dollar', rate: 61.5 },
  ];

  /* ---------------------------------------------------------------- Offers & coupons */
  D.offers = [
    { id: 'o1', cat: 'Flights', tag: 'DOM FLIGHTS', title: 'Flat 12% OFF* on domestic flights', desc: 'Fly anywhere in India this festive season and save more on every booking.', code: 'TSFLY', kind: 'city' },
    { id: 'o2', cat: 'Hotels', tag: 'HOTELS', title: 'Up to 35% OFF on handpicked stays', desc: 'Weekend getaways and long holidays, now lighter on the wallet.', code: 'TSSTAY', kind: 'beach' },
    { id: 'o3', cat: 'Bank Offers', tag: 'BANK OFFER', title: 'Up to ₹2,500 OFF with select credit cards', desc: 'Pay with eligible credit cards and EMI to get instant savings.', code: 'TSCARD', kind: 'heritage' },
    { id: 'o4', cat: 'Holidays', tag: 'HOLIDAYS', title: 'Save up to ₹15,000 on international holidays', desc: 'Bali, Dubai, Thailand and more – with flights, stays and sightseeing.', code: 'TSHOLI', kind: 'island' },
    { id: 'o5', cat: 'Trains', tag: 'TRAINS', title: 'Zero payment gateway fee on train tickets', desc: 'Book via UPI and enjoy free cancellation on select trains.', code: 'TSRAIL', kind: 'mountain' },
    { id: 'o6', cat: 'Cabs', tag: 'CABS', title: 'Flat ₹350 OFF on outstation cabs', desc: 'Road trips made easy with verified drivers and clean cars.', code: 'TSRIDE', kind: 'desert' },
    { id: 'o7', cat: 'Bus', tag: 'BUS', title: 'Up to 20% OFF on bus tickets', desc: 'Travel across 1,000+ routes with comfortable sleeper buses.', code: 'TSBUS', kind: 'forest' },
    { id: 'o8', cat: 'Flights', tag: 'INTL FLIGHTS', title: 'Up to ₹7,000 OFF on international flights', desc: 'Plan your next trip abroad with special fares to 100+ cities.', code: 'TSWORLD', kind: 'snow' },
    { id: 'o9', cat: 'Hotels', tag: 'HOMESTAYS', title: 'Villas & homestays from ₹1,499', desc: 'Private spaces for families and friends. Book entire properties.', code: 'TSHOME', kind: 'tea' },
    { id: 'o10', cat: 'Bank Offers', tag: 'UPI OFFER', title: 'Get ₹150 cashback on UPI payments', desc: 'Minimum transaction ₹2,000. Valid once per user per month.', code: 'TSUPI', kind: 'lake' },
    { id: 'o11', cat: 'Holidays', tag: 'HONEYMOON', title: 'Free candle-light dinner on honeymoon packages', desc: 'Kerala, Kashmir, Andaman & Maldives – romance included.', code: 'TSLOVE', kind: 'river' },
    { id: 'o12', cat: 'Flights', tag: 'STUDENTS', title: 'Extra 10 kg baggage for students', desc: 'Show a valid student ID and fly with more luggage at no extra cost.', code: 'TSSTUDENT', kind: 'city' },
  ];
  D.coupons = [
    { code: 'TSFLY', for: ['flight'], desc: 'Flat 12% off on domestic flights (max ₹1,500)', pct: 12, max: 1500 },
    { code: 'TSWORLD', for: ['flight'], desc: '₹1,200 off on international flights', flat: 1200, min: 15000 },
    { code: 'TSSTAY', for: ['hotel'], desc: '20% off on hotels (max ₹2,000)', pct: 20, max: 2000 },
    { code: 'TSHOME', for: ['hotel'], desc: '₹500 off on homestays & villas', flat: 500 },
    { code: 'TSHOLI', for: ['holiday'], desc: '₹5,000 off on holiday packages', flat: 5000, min: 20000 },
    { code: 'TSRAIL', for: ['train'], desc: '₹40 off – zero gateway fee', flat: 40 },
    { code: 'TSBUS', for: ['bus'], desc: '15% off on bus tickets (max ₹250)', pct: 15, max: 250 },
    { code: 'TSRIDE', for: ['cab'], desc: '₹350 off on outstation cabs', flat: 350, min: 1500 },
    { code: 'TSUPI', for: ['flight', 'hotel', 'holiday', 'train', 'bus', 'cab', 'insurance'], desc: '₹150 instant discount for all bookings', flat: 150, min: 2000 },
    { code: 'TSCARD', for: ['flight', 'hotel', 'holiday'], desc: '10% off with select credit cards (max ₹2,500)', pct: 10, max: 2500 },
  ];

  /* ---------------------------------------------------------------- Homepage content */
  D.collections = [
    { title: 'Stays in & around Delhi for a weekend getaway', tag: 'TOP 8', kind: 'mountain', link: 'hotels.html?city=Rishikesh' },
    { title: 'Beach Destinations', tag: 'TOP 11', kind: 'beach', link: 'hotels.html?city=Goa' },
    { title: 'Weekend getaways from Mumbai', tag: 'TOP 9', kind: 'forest', link: 'hotels.html?city=Coorg' },
    { title: 'Hill Stations', tag: 'TOP 12', kind: 'snow', link: 'hotels.html?city=Manali' },
    { title: 'Lakeside Retreats', tag: 'TOP 7', kind: 'lake', link: 'hotels.html?city=Udaipur' },
    { title: 'Tea Garden Stays', tag: 'TOP 6', kind: 'tea', link: 'hotels.html?city=Munnar' },
  ];
  D.hiddenGems = [
    { name: 'Chopta', state: 'Uttarakhand', tag: 'Mini Switzerland of India', kind: 'snow' },
    { name: 'Gokarna', state: 'Karnataka', tag: 'Quiet beaches & cliffs', kind: 'beach' },
    { name: 'Ziro', state: 'Arunachal Pradesh', tag: 'Rice fields & music', kind: 'tea' },
    { name: 'Majuli', state: 'Assam', tag: 'World\'s largest river island', kind: 'river' },
    { name: 'Hampi', state: 'Karnataka', tag: 'Boulders & ruins', kind: 'desert' },
    { name: 'Spiti', state: 'Himachal Pradesh', tag: 'High-altitude desert', kind: 'mountain' },
    { name: 'Tawang', state: 'Arunachal Pradesh', tag: 'Monasteries in the clouds', kind: 'snow' },
    { name: 'Varkala', state: 'Kerala', tag: 'Cliffside sunsets', kind: 'island' },
  ];
  D.popularRoutes = [
    ['DEL', 'BOM'], ['BOM', 'GOI'], ['BLR', 'DEL'], ['DEL', 'GOI'], ['HYD', 'BLR'], ['CCU', 'DEL'],
    ['MAA', 'BOM'], ['DEL', 'DXB'], ['BOM', 'SIN'], ['DEL', 'BKK'], ['BLR', 'COK'], ['PNQ', 'DEL'],
  ];
  D.trending = ['Goa', 'Dubai', 'Manali', 'Bangkok', 'Jaipur', 'Singapore', 'Udaipur', 'Munnar'];
})();
