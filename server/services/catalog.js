/* Fixed vocabularies shared by validation, the partner extranet and the public site. */

export const PROPERTY_TYPES = {
  hotel: ['Hotel', 'Resort', 'Boutique Hotel', 'Guest House', 'Hostel', 'Heritage Hotel'],
  homestay: ['Homestay', 'Villa', 'Cottage', 'Apartment', 'Farm Stay', 'Tent'],
};
export const ALL_PROPERTY_TYPES = [...PROPERTY_TYPES.hotel, ...PROPERTY_TYPES.homestay];

// Keys match the amenity icons used by the website.
export const AMENITIES = ['wifi', 'pool', 'parking', 'restaurant', 'ac', 'gym', 'spa', 'bar', 'roomservice', 'kitchen'];

export const ROOM_AMENITIES = ['TV', 'Tea/coffee maker', 'Work desk', 'In-room safe', 'Hair dryer', 'Mini fridge', 'Balcony', 'Bathtub', 'Kitchenette', 'Sofa', 'Iron', 'Heater'];

// Artwork themes the site can draw for a listing without photos.
export const SCENES = ['beach', 'city', 'heritage', 'mountain', 'lake', 'river', 'tea', 'forest', 'snow', 'island', 'desert'];

export const MEAL_PLANS = {
  EP: { label: 'Room Only', inclusions: ['No meals included'] },
  CP: { label: 'Breakfast included', inclusions: ['Free breakfast'] },
  MAP: { label: 'Breakfast + lunch or dinner', inclusions: ['Free breakfast', 'Lunch or dinner included'] },
  AP: { label: 'All meals included', inclusions: ['Breakfast, lunch and dinner included'] },
};

export const PATTERNS = {
  pincode: /^[1-9]\d{5}$/,
  pan: /^[A-Z]{5}\d{4}[A-Z]$/,
  gstin: /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  account: /^\d{9,18}$/,
  time: /^([01]\d|2[0-3]):[0-5]\d$/,
};
