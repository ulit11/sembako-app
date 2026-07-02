const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // Clean database
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});

  // Hash password
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create test user
  const testUser = await prisma.user.create({
    data: {
      email: 'agung@example.com',
      password: hashedPassword,
      name: 'Agung Prasetyo'
    }
  });

  console.log(`Created test user: ${testUser.name} (${testUser.email})`);

  // Create products related to test user
  const sampleProducts = [
    {
      barcode: "8992741905273",
      name: "Beras Premium Cianjur 5kg",
      description: "Beras pandan wangi cianjur kualitas super, pulen dan harum.",
      stock: 15,
      minStock: 5,
      costPrice: 62000,
      sellPrice: 70000,
      unit: "karung",
      category: "Beras & Sembako",
      userId: testUser.id
    },
    {
      barcode: "8991002301452",
      name: "Minyak Goreng Bimoli 2L",
      description: "Minyak goreng kelapa sawit refill pouch 2 liter.",
      stock: 20,
      minStock: 5,
      costPrice: 31500,
      sellPrice: 36000,
      unit: "pouch",
      category: "Minyak & Mentega",
      userId: testUser.id
    },
    {
      barcode: "089686010074",
      name: "Indomie Mi Goreng Spesial",
      description: "Mi instan goreng rasa spesial dari Indofood.",
      stock: 120,
      minStock: 20,
      costPrice: 2750,
      sellPrice: 3200,
      unit: "bungkus",
      category: "Mi & Instan",
      userId: testUser.id
    },
    {
      barcode: "",
      name: "Telur Ayam Negeri per Kg",
      description: "Telur ayam segar curah langsung dari peternakan.",
      stock: 35,
      minStock: 8,
      costPrice: 24000,
      sellPrice: 28000,
      unit: "kg",
      category: "Beras & Sembako",
      userId: testUser.id
    },
    {
      barcode: "8998866100213",
      name: "Gula Pasir Gulaku Premium 1kg",
      description: "Gula pasir tebu murni kualitas premium bersih.",
      stock: 25,
      minStock: 5,
      costPrice: 14500,
      sellPrice: 17000,
      unit: "kg",
      category: "Beras & Sembako",
      userId: testUser.id
    },
    {
      barcode: "8991002111242",
      name: "Tepung Terigu Segitiga Biru 1kg",
      description: "Tepung terigu serbaguna untuk kue, roti, dan gorengan.",
      stock: 18,
      minStock: 5,
      costPrice: 11000,
      sellPrice: 13000,
      unit: "pcs",
      category: "Bumbu Dapur",
      userId: testUser.id
    },
    {
      barcode: "8992002302482",
      name: "Teh Celup Sariwangi isi 25",
      description: "Teh hitam celup asli berkualitas isi 25 kantong.",
      stock: 3,
      minStock: 5,
      costPrice: 5000,
      sellPrice: 6500,
      unit: "box",
      category: "Minuman",
      userId: testUser.id
    },
    {
      barcode: "8992696112015",
      name: "Sabun Lifebuoy Merah 85g",
      description: "Sabun mandi batang antibakteri total 10.",
      stock: 45,
      minStock: 10,
      costPrice: 3400,
      sellPrice: 4200,
      unit: "pcs",
      category: "Sabun & Mandi",
      userId: testUser.id
    },
    {
      barcode: "8991002340512",
      name: "Royco Kaldu Sapi 100g",
      description: "Bumbu penyedap rasa ekstrak kaldu daging sapi.",
      stock: 2,
      minStock: 5,
      costPrice: 8500,
      sellPrice: 10000,
      unit: "pack",
      category: "Bumbu Dapur",
      userId: testUser.id
    },
    {
      barcode: "8998899000122",
      name: "Aqua Galon 19 Liter",
      description: "Air minum dalam kemasan galon isi ulang 19L (hanya isi).",
      stock: 0,
      minStock: 3,
      costPrice: 17000,
      sellPrice: 20000,
      unit: "galon",
      category: "Minuman",
      userId: testUser.id
    }
  ];

  for (const product of sampleProducts) {
    await prisma.product.create({
      data: product
    });
  }

  console.log("Database seeded successfully with sembako products!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
