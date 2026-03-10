import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import PlantBatch from '../src/models/PlantBatch.js';
import User from '../src/models/User.js';

const randomQty = (min = 10, max = 100) => Math.floor(Math.random() * (max - min + 1)) + min;

const CDN = 'https://cdn.shopify.com/s/files/1/0150/6262/products';

const plants = [
  // Indoor
  {
    name: 'Areca Palm - Zone A',
    plantType: 'Areca Palm',
    scientificName: 'Dypsis lutescens',
    category: 'indoor',
    quantity: randomQty(),
    zone: 'A',
    location: 'Greenhouse 1',
    imageUrl: `${CDN}/areca-palm_grande.jpg`,
    notes: 'Popular indoor palm, requires indirect light',
  },
  {
    name: 'Snake Plant - Zone B',
    plantType: 'Snake Plant',
    scientificName: 'Sansevieria trifasciata',
    category: 'indoor',
    quantity: randomQty(),
    zone: 'B',
    location: 'Greenhouse 1',
    imageUrl: `${CDN}/snake-plant_grande.jpg`,
    notes: 'Low maintenance, air purifying',
  },
  {
    name: 'ZZ Plant - Zone A',
    plantType: 'ZZ Plant',
    scientificName: 'Zamioculcas zamiifolia',
    category: 'indoor',
    quantity: randomQty(),
    zone: 'A',
    location: 'Greenhouse 2',
    imageUrl: `${CDN}/zz-plant_grande.jpg`,
    notes: 'Drought tolerant, low light',
  },
  {
    name: 'Aglaonema Red Valentine - Zone C',
    plantType: 'Aglaonema Red Valentine',
    scientificName: 'Aglaonema commutatum',
    category: 'indoor',
    quantity: randomQty(),
    zone: 'C',
    location: 'Greenhouse 2',
    imageUrl: `${CDN}/aglaonema-red_grande.jpg`,
    notes: 'Vibrant red and green foliage',
  },
  {
    name: 'Kentia Palm - Zone A',
    plantType: 'Kentia Palm',
    scientificName: 'Howea forsteriana',
    category: 'indoor',
    quantity: randomQty(),
    zone: 'A',
    location: 'Greenhouse 1',
    imageUrl: `${CDN}/kentia-palm_grande.jpg`,
    notes: 'Elegant fronds, shade tolerant',
  },
  {
    name: 'Peace Lily - Zone B',
    plantType: 'Peace Lily',
    scientificName: 'Spathiphyllum wallisii',
    category: 'indoor',
    quantity: randomQty(),
    zone: 'B',
    location: 'Greenhouse 2',
    imageUrl: `${CDN}/peace-lily_grande.jpg`,
    notes: 'White blooms, air purifying',
  },
  {
    name: 'Pothos - Zone C',
    plantType: 'Pothos',
    scientificName: 'Epipremnum aureum',
    category: 'indoor',
    quantity: randomQty(),
    zone: 'C',
    location: 'Greenhouse 1',
    imageUrl: `${CDN}/pothos_grande.jpg`,
    notes: 'Trailing vine, very easy care',
  },
  {
    name: 'Money Plant - Zone B',
    plantType: 'Money Plant',
    scientificName: 'Pachira aquatica',
    category: 'indoor',
    quantity: randomQty(),
    zone: 'B',
    location: 'Greenhouse 3',
    imageUrl: `${CDN}/money-plant_grande.jpg`,
    notes: 'Braided trunk, indirect light',
  },
  {
    name: 'Rubber Plant - Zone A',
    plantType: 'Rubber Plant',
    scientificName: 'Ficus elastica',
    category: 'indoor',
    quantity: randomQty(),
    zone: 'A',
    location: 'Greenhouse 3',
    imageUrl: `${CDN}/rubber-plant_grande.jpg`,
    notes: 'Large glossy leaves',
  },
  {
    name: 'Fiddle Leaf Fig - Zone C',
    plantType: 'Fiddle Leaf Fig',
    scientificName: 'Ficus lyrata',
    category: 'indoor',
    quantity: randomQty(),
    zone: 'C',
    location: 'Greenhouse 3',
    imageUrl: `${CDN}/fiddle-leaf-fig_grande.jpg`,
    notes: 'Large violin-shaped leaves, bright indirect light',
  },

  // Outdoor
  {
    name: 'Bougainvillea - Zone D',
    plantType: 'Bougainvillea',
    scientificName: 'Bougainvillea glabra',
    category: 'outdoor',
    quantity: randomQty(),
    zone: 'D',
    location: 'Outdoor Nursery 1',
    imageUrl: `${CDN}/bougainvillea_grande.jpg`,
    notes: 'Vibrant purple/pink bracts, full sun',
  },
  {
    name: 'Jasmine - Zone D',
    plantType: 'Jasmine',
    scientificName: 'Jasminum sambac',
    category: 'outdoor',
    quantity: randomQty(),
    zone: 'D',
    location: 'Outdoor Nursery 1',
    imageUrl: `${CDN}/jasmine_grande.jpg`,
    notes: 'Fragrant white flowers',
  },
  {
    name: 'Hibiscus - Zone E',
    plantType: 'Hibiscus',
    scientificName: 'Hibiscus rosa-sinensis',
    category: 'outdoor',
    quantity: randomQty(),
    zone: 'E',
    location: 'Outdoor Nursery 2',
    imageUrl: `${CDN}/hibiscus_grande.jpg`,
    notes: 'Tropical blooms, UAE climate friendly',
  },
  {
    name: 'Bird of Paradise - Zone E',
    plantType: 'Bird of Paradise',
    scientificName: 'Strelitzia reginae',
    category: 'outdoor',
    quantity: randomQty(),
    zone: 'E',
    location: 'Outdoor Nursery 2',
    imageUrl: `${CDN}/bird-of-paradise_grande.jpg`,
    notes: 'Iconic orange flowers',
  },
  {
    name: 'Croton - Zone D',
    plantType: 'Croton',
    scientificName: 'Codiaeum variegatum',
    category: 'outdoor',
    quantity: randomQty(),
    zone: 'D',
    location: 'Outdoor Nursery 1',
    imageUrl: `${CDN}/croton_grande.jpg`,
    notes: 'Colorful foliage, full sun',
  },
  {
    name: 'Desert Rose - Zone F',
    plantType: 'Desert Rose',
    scientificName: 'Adenium obesum',
    category: 'outdoor',
    quantity: randomQty(),
    zone: 'F',
    location: 'Outdoor Nursery 3',
    imageUrl: `${CDN}/desert-rose_grande.jpg`,
    notes: 'Thrives in UAE heat, beautiful blooms',
  },

  // Cactus & Succulent
  {
    name: 'Aloe Vera - Zone F',
    plantType: 'Aloe Vera',
    scientificName: 'Aloe barbadensis miller',
    category: 'cactus',
    quantity: randomQty(),
    zone: 'F',
    location: 'Succulent House',
    imageUrl: `${CDN}/aloe-vera_grande.jpg`,
    notes: 'Medicinal, minimal watering',
  },
  {
    name: 'Echeveria - Zone F',
    plantType: 'Echeveria',
    scientificName: 'Echeveria elegans',
    category: 'succulent',
    quantity: randomQty(),
    zone: 'F',
    location: 'Succulent House',
    imageUrl: `${CDN}/echeveria_grande.jpg`,
    notes: 'Rosette succulent, decorative',
  },
  {
    name: 'Jade Plant - Zone F',
    plantType: 'Jade Plant',
    scientificName: 'Crassula ovata',
    category: 'succulent',
    quantity: randomQty(),
    zone: 'F',
    location: 'Succulent House',
    imageUrl: `${CDN}/jade-plant_grande.jpg`,
    notes: 'Thick fleshy leaves, slow growing',
  },
  {
    name: 'Barrel Cactus - Zone F',
    plantType: 'Barrel Cactus',
    scientificName: 'Ferocactus wislizeni',
    category: 'cactus',
    quantity: randomQty(10, 40),
    zone: 'F',
    location: 'Succulent House',
    imageUrl: `${CDN}/barrel-cactus_grande.jpg`,
    notes: 'Round shape, very drought tolerant',
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find admin user for createdBy
    const admin = await User.findOne({ role: 'admin' });

    if (!admin) {
      console.error('No admin user found. Run seed:admin first.');
      process.exit(1);
    }

    // Remove existing batches
    await PlantBatch.deleteMany({});
    console.log('Cleared existing plant batches');

    // Add createdBy to each plant
    const plantsWithAdmin = plants.map((p) => ({
      ...p,
      createdBy: admin._id,
    }));

    const result = await PlantBatch.insertMany(plantsWithAdmin);
    console.log(`Seeded ${result.length} plant batches`);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Done');
  }
};

seed();
