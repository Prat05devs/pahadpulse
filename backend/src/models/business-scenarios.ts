export interface BusinessWeights {
  connectivity: number;      // 0-10: IT, BPO, Remote work
  tourism: number;           // 0-10: Hotels, Restaurants, Rentals
  roads: number;             // 0-10: Manufacturing, Logistics
  urbanPopulation: number;   // 0-10: Retail, Healthcare, Education
  agriculture: number;       // 0-10: Dairy, Food processing, Herbs
  safety: number;            // 0-10: Heavy capital investment, data centers
}

export interface BusinessScenario {
  id: string;
  name: string;
  category: string;
  description: string;
  weights: BusinessWeights;
}

export const BUSINESS_SCENARIOS: BusinessScenario[] = [
  // CATEGORY: HOSPITALITY & TOURISM
  { id: 't1', name: 'Boutique Homestay', category: 'Tourism', description: 'Small, premium local stay focusing on experiential travel.', weights: { connectivity: 6, tourism: 10, roads: 4, urbanPopulation: 1, agriculture: 3, safety: 6 } },
  { id: 't2', name: 'Large Hotel Resort', category: 'Tourism', description: 'High-capacity hotel with amenities.', weights: { connectivity: 8, tourism: 10, roads: 8, urbanPopulation: 4, agriculture: 2, safety: 7 } },
  { id: 't3', name: 'Adventure Sports Agency', category: 'Tourism', description: 'Rafting, trekking, paragliding operations.', weights: { connectivity: 4, tourism: 10, roads: 6, urbanPopulation: 2, agriculture: 0, safety: 8 } },
  { id: 't4', name: 'Pilgrimage Tour Operator', category: 'Tourism', description: 'Specialized tours for Char Dham and temples.', weights: { connectivity: 5, tourism: 10, roads: 9, urbanPopulation: 3, agriculture: 0, safety: 6 } },
  { id: 't5', name: 'Cafe & Bakery', category: 'Tourism', description: 'Modern cafe targeting tourists and urban locals.', weights: { connectivity: 6, tourism: 8, roads: 5, urbanPopulation: 9, agriculture: 4, safety: 5 } },
  { id: 't6', name: 'High-Altitude Trekking Camp', category: 'Tourism', description: 'Remote camping and trekking base.', weights: { connectivity: 2, tourism: 8, roads: 2, urbanPopulation: 0, agriculture: 1, safety: 8 } },
  { id: 't7', name: 'Wellness Retreat', category: 'Tourism', description: 'Yoga and Ayurveda health center.', weights: { connectivity: 5, tourism: 8, roads: 5, urbanPopulation: 2, agriculture: 5, safety: 7 } },
  { id: 't8', name: 'Two-Wheeler Rentals', category: 'Tourism', description: 'Scooter and bike rentals for tourists.', weights: { connectivity: 4, tourism: 10, roads: 9, urbanPopulation: 6, agriculture: 0, safety: 5 } },
  { id: 't9', name: 'Taxi / Cab Fleet', category: 'Tourism', description: 'Intercity and sightseeing transport.', weights: { connectivity: 6, tourism: 9, roads: 10, urbanPopulation: 8, agriculture: 0, safety: 6 } },
  { id: 't10', name: 'Local Handicrafts Shop', category: 'Tourism', description: 'Retail store selling local souvenirs.', weights: { connectivity: 3, tourism: 9, roads: 4, urbanPopulation: 6, agriculture: 2, safety: 4 } },

  // CATEGORY: IT & SERVICES
  { id: 'i1', name: 'IT Services / Software Dev', category: 'IT & Services', description: 'Software agency or startup.', weights: { connectivity: 10, tourism: 0, roads: 3, urbanPopulation: 8, agriculture: 0, safety: 6 } },
  { id: 'i2', name: 'BPO / Call Center', category: 'IT & Services', description: 'Customer support or telemarketing hub.', weights: { connectivity: 10, tourism: 0, roads: 4, urbanPopulation: 9, agriculture: 0, safety: 7 } },
  { id: 'i3', name: 'Co-working Space', category: 'IT & Services', description: 'Shared office for freelancers and startups.', weights: { connectivity: 10, tourism: 2, roads: 5, urbanPopulation: 9, agriculture: 0, safety: 6 } },
  { id: 'i4', name: 'Data Center', category: 'IT & Services', description: 'Server hosting facility.', weights: { connectivity: 10, tourism: 0, roads: 7, urbanPopulation: 2, agriculture: 0, safety: 10 } },
  { id: 'i5', name: 'Digital Marketing Agency', category: 'IT & Services', description: 'SEO, social media, and advertising.', weights: { connectivity: 9, tourism: 3, roads: 2, urbanPopulation: 8, agriculture: 0, safety: 4 } },
  { id: 'i6', name: 'Remote Freelance Hub', category: 'IT & Services', description: 'Community house for digital nomads.', weights: { connectivity: 10, tourism: 6, roads: 3, urbanPopulation: 5, agriculture: 0, safety: 5 } },
  { id: 'i7', name: 'EdTech Startup', category: 'IT & Services', description: 'Online education and tutoring.', weights: { connectivity: 9, tourism: 0, roads: 2, urbanPopulation: 7, agriculture: 0, safety: 4 } },
  { id: 'i8', name: 'Fintech / Accounting Services', category: 'IT & Services', description: 'Financial consulting and software.', weights: { connectivity: 9, tourism: 0, roads: 3, urbanPopulation: 8, agriculture: 0, safety: 6 } },
  { id: 'i9', name: 'Telemedicine Clinic', category: 'IT & Services', description: 'Remote healthcare consultations.', weights: { connectivity: 10, tourism: 0, roads: 4, urbanPopulation: 6, agriculture: 0, safety: 7 } },
  { id: 'i10', name: 'Cybersecurity Firm', category: 'IT & Services', description: 'Security consulting and monitoring.', weights: { connectivity: 10, tourism: 0, roads: 3, urbanPopulation: 7, agriculture: 0, safety: 6 } },

  // CATEGORY: AGRICULTURE & FOOD PROCESSING
  { id: 'a1', name: 'Dairy Processing Plant', category: 'Agriculture', description: 'Milk collection and packaging facility.', weights: { connectivity: 4, tourism: 0, roads: 8, urbanPopulation: 5, agriculture: 10, safety: 5 } },
  { id: 'a2', name: 'Organic Farming', category: 'Agriculture', description: 'Chemical-free crop cultivation.', weights: { connectivity: 2, tourism: 1, roads: 5, urbanPopulation: 2, agriculture: 10, safety: 4 } },
  { id: 'a3', name: 'Herbal & Aromatic Extraction', category: 'Agriculture', description: 'Processing medicinal plants and oils.', weights: { connectivity: 3, tourism: 0, roads: 6, urbanPopulation: 2, agriculture: 9, safety: 4 } },
  { id: 'a4', name: 'Fruit Processing (Jams/Juices)', category: 'Agriculture', description: 'Value addition for local horticulture.', weights: { connectivity: 3, tourism: 2, roads: 7, urbanPopulation: 4, agriculture: 10, safety: 4 } },
  { id: 'a5', name: 'Mushroom Cultivation', category: 'Agriculture', description: 'Indoor commercial mushroom farming.', weights: { connectivity: 3, tourism: 1, roads: 6, urbanPopulation: 4, agriculture: 8, safety: 4 } },
  { id: 'a6', name: 'Beekeeping / Honey Production', category: 'Agriculture', description: 'Apiary and honey extraction.', weights: { connectivity: 2, tourism: 2, roads: 4, urbanPopulation: 2, agriculture: 8, safety: 3 } },
  { id: 'a7', name: 'Tea Estate & Processing', category: 'Agriculture', description: 'Cultivating and processing mountain tea.', weights: { connectivity: 4, tourism: 5, roads: 6, urbanPopulation: 1, agriculture: 10, safety: 4 } },
  { id: 'a8', name: 'Cold Storage Facility', category: 'Agriculture', description: 'Refrigerated warehousing for crops.', weights: { connectivity: 5, tourism: 0, roads: 10, urbanPopulation: 4, agriculture: 9, safety: 7 } },
  { id: 'a9', name: 'Poultry Farm', category: 'Agriculture', description: 'Egg and meat production.', weights: { connectivity: 2, tourism: 0, roads: 7, urbanPopulation: 6, agriculture: 8, safety: 5 } },
  { id: 'a10', name: 'Floriculture', category: 'Agriculture', description: 'Growing flowers for commercial sale.', weights: { connectivity: 3, tourism: 2, roads: 8, urbanPopulation: 5, agriculture: 9, safety: 4 } },

  // CATEGORY: MANUFACTURING & LOGISTICS
  { id: 'm1', name: 'Light Engineering / Assembly', category: 'Manufacturing', description: 'Assembling electronics or small parts.', weights: { connectivity: 6, tourism: 0, roads: 10, urbanPopulation: 6, agriculture: 0, safety: 8 } },
  { id: 'm2', name: 'Pharmaceutical Manufacturing', category: 'Manufacturing', description: 'Medicine production facility.', weights: { connectivity: 6, tourism: 0, roads: 10, urbanPopulation: 5, agriculture: 1, safety: 9 } },
  { id: 'm3', name: 'Automobile Parts Factory', category: 'Manufacturing', description: 'OEM parts manufacturing.', weights: { connectivity: 5, tourism: 0, roads: 10, urbanPopulation: 6, agriculture: 0, safety: 8 } },
  { id: 'm4', name: 'Handloom & Textile', category: 'Manufacturing', description: 'Weaving and apparel production.', weights: { connectivity: 4, tourism: 4, roads: 6, urbanPopulation: 5, agriculture: 3, safety: 5 } },
  { id: 'm5', name: 'Logistics Hub / Warehousing', category: 'Manufacturing', description: 'Supply chain distribution center.', weights: { connectivity: 7, tourism: 0, roads: 10, urbanPopulation: 6, agriculture: 2, safety: 7 } },
  { id: 'm6', name: 'Furniture Manufacturing', category: 'Manufacturing', description: 'Wood and metal furniture plant.', weights: { connectivity: 4, tourism: 0, roads: 9, urbanPopulation: 5, agriculture: 2, safety: 6 } },
  { id: 'm7', name: 'Packaging Materials Factory', category: 'Manufacturing', description: 'Cardboard and plastic packaging.', weights: { connectivity: 5, tourism: 0, roads: 9, urbanPopulation: 6, agriculture: 2, safety: 7 } },
  { id: 'm8', name: 'Cosmetics Manufacturing', category: 'Manufacturing', description: 'Beauty and personal care products.', weights: { connectivity: 6, tourism: 1, roads: 8, urbanPopulation: 6, agriculture: 4, safety: 7 } },
  { id: 'm9', name: 'EV Charging Network', category: 'Manufacturing', description: 'Electric vehicle charging infrastructure.', weights: { connectivity: 8, tourism: 6, roads: 10, urbanPopulation: 7, agriculture: 0, safety: 6 } },
  { id: 'm10', name: 'Recycling Plant', category: 'Manufacturing', description: 'Waste management and recycling.', weights: { connectivity: 4, tourism: 0, roads: 9, urbanPopulation: 8, agriculture: 0, safety: 8 } },

  // CATEGORY: RETAIL, HEALTHCARE & EDUCATION
  { id: 'r1', name: 'Supermarket / Grocery Chain', category: 'Retail & Services', description: 'Large retail grocery store.', weights: { connectivity: 5, tourism: 2, roads: 7, urbanPopulation: 10, agriculture: 4, safety: 5 } },
  { id: 'r2', name: 'Multi-Specialty Hospital', category: 'Retail & Services', description: 'Advanced healthcare facility.', weights: { connectivity: 8, tourism: 2, roads: 9, urbanPopulation: 10, agriculture: 0, safety: 9 } },
  { id: 'r3', name: 'Diagnostic Lab', category: 'Retail & Services', description: 'Pathology and imaging center.', weights: { connectivity: 7, tourism: 0, roads: 6, urbanPopulation: 9, agriculture: 0, safety: 6 } },
  { id: 'r4', name: 'K-12 School', category: 'Retail & Services', description: 'Private education institution.', weights: { connectivity: 6, tourism: 0, roads: 7, urbanPopulation: 10, agriculture: 0, safety: 8 } },
  { id: 'r5', name: 'Higher Education / College', category: 'Retail & Services', description: 'University or technical institute.', weights: { connectivity: 8, tourism: 0, roads: 8, urbanPopulation: 9, agriculture: 0, safety: 8 } },
  { id: 'r6', name: 'Automobile Dealership', category: 'Retail & Services', description: 'Car or bike sales and service.', weights: { connectivity: 5, tourism: 0, roads: 9, urbanPopulation: 9, agriculture: 0, safety: 6 } },
  { id: 'r7', name: 'Fitness Center / Gym', category: 'Retail & Services', description: 'Health and wellness club.', weights: { connectivity: 4, tourism: 1, roads: 5, urbanPopulation: 9, agriculture: 0, safety: 5 } },
  { id: 'r8', name: 'Cloud Kitchen', category: 'Retail & Services', description: 'Delivery-only restaurant.', weights: { connectivity: 7, tourism: 2, roads: 6, urbanPopulation: 10, agriculture: 0, safety: 5 } },
  { id: 'r9', name: 'Pharmacy Chain', category: 'Retail & Services', description: 'Medical retail stores.', weights: { connectivity: 6, tourism: 2, roads: 6, urbanPopulation: 10, agriculture: 0, safety: 5 } },
  { id: 'r10', name: 'Event Management', category: 'Retail & Services', description: 'Weddings and corporate events.', weights: { connectivity: 7, tourism: 7, roads: 7, urbanPopulation: 9, agriculture: 0, safety: 6 } },

  // CATEGORY: GENERAL / OTHER
  { id: 'other', name: 'Other / General Business', category: 'Other', description: 'A holistic assessment across all metrics.', weights: { connectivity: 5, tourism: 5, roads: 5, urbanPopulation: 5, agriculture: 5, safety: 5 } },
];
