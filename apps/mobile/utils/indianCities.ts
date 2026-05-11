export const INDIAN_CITIES: string[] = [
  'Agartala', 'Agra', 'Ahmedabad', 'Ahmednagar', 'Aizawl', 'Ajmer', 'Akola',
  'Aligarh', 'Alwar', 'Ambala', 'Amravati', 'Amritsar', 'Anand', 'Anantapur',
  'Aurangabad', 'Bareilly', 'Belgaum', 'Bellary', 'Bengaluru', 'Bhopal',
  'Bhubaneswar', 'Bikaner', 'Bilaspur', 'Bokaro', 'Chandigarh', 'Chennai',
  'Coimbatore', 'Cuttack', 'Daman', 'Davangere', 'Dehradun', 'Delhi',
  'Dhanbad', 'Dimapur', 'Durgapur', 'Erode', 'Faridabad', 'Firozabad',
  'Gandhinagar', 'Ghaziabad', 'Gorakhpur', 'Gulbarga', 'Guntur', 'Gurgaon',
  'Guwahati', 'Gwalior', 'Haridwar', 'Hubli', 'Hyderabad', 'Imphal',
  'Indore', 'Itanagar', 'Jabalpur', 'Jaipur', 'Jalandhar', 'Jammu',
  'Jamnagar', 'Jamshedpur', 'Jhansi', 'Jodhpur', 'Kakinada', 'Kanpur',
  'Kochi', 'Kohima', 'Kolhapur', 'Kolkata', 'Kota', 'Kozhikode',
  'Kurnool', 'Latur', 'Lucknow', 'Ludhiana', 'Madurai', 'Mangaluru',
  'Mathura', 'Meerut', 'Moradabad', 'Mumbai', 'Mysuru', 'Nagpur',
  'Nashik', 'Navi Mumbai', 'Nellore', 'New Delhi', 'Noida', 'Panaji',
  'Patna', 'Pimpri-Chinchwad', 'Pondicherry', 'Pune', 'Raipur', 'Rajkot',
  'Ranchi', 'Rourkela', 'Salem', 'Shillong', 'Shimla', 'Siliguri',
  'Solapur', 'Srinagar', 'Surat', 'Thiruvananthapuram', 'Thane', 'Thrissur',
  'Tiruchirappalli', 'Tirunelveli', 'Tirupati', 'Tiruppur', 'Udaipur',
  'Ujjain', 'Vadodara', 'Varanasi', 'Vijayawada', 'Visakhapatnam',
  'Warangal',
];

export function searchCities(query: string): string[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return INDIAN_CITIES.filter((c) => c.toLowerCase().startsWith(q)).slice(0, 8);
}
