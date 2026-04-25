import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin
  const adminEmail = process.env.ADMIN_INITIAL_EMAIL || 'admin@milanmateria.com';
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin123!';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.admin.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: 'Admin',
    },
  });
  console.log('Admin created:', admin.email);

  // Create categories
  const categories = [
    { name: 'Imperial', slug: 'imperial', description: 'Mates imperiales artesanales', sortOrder: 1 },
    { name: 'Torpedo', slug: 'torpedo', description: 'Mates torpedo premium', sortOrder: 2 },
    { name: 'Algarrobo', slug: 'algarrobo', description: 'Mates de madera de algarrobo', sortOrder: 3 },
    { name: 'Acero', slug: 'acero', description: 'Mates y térmicos de acero inoxidable', sortOrder: 4 },
    { name: 'Bombilla', slug: 'bombilla', description: 'Bombillas premium', sortOrder: 5 },
    { name: 'Canasta', slug: 'canasta', description: 'Canastas y combos regalo', sortOrder: 6 },
    { name: 'Yerba', slug: 'yerba', description: 'Yerbas seleccionadas', sortOrder: 7 },
  ];

  const categoryMap: Record<string, number> = {};
  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categoryMap[cat.slug] = created.id;
    console.log('Category created:', created.name);
  }

  // Create products
  const products = [
    {
      name: 'Imperial Premium Chocolate',
      description: '100% Calabaza y Cuero · Virola y base de Alpaca · Pelotas de Bronce',
      price: 5319000,
      originalPrice: null,
      badge: 'Premium',
      badgeType: 'excl',
      imageUrl: 'uploads/products/imperial-chocolate.jpg',
      categorySlug: 'imperial',
      featured: true,
    },
    {
      name: 'Imperial Cuero Animal Print',
      description: '100% Calabaza gruesa · Guarda de Alpaca · Cuero animal print exclusivo',
      price: 5319000,
      originalPrice: null,
      badge: 'Nuevo',
      badgeType: 'new',
      imageUrl: 'uploads/products/imperial-animal-print.jpg',
      categorySlug: 'imperial',
      featured: true,
    },
    {
      name: 'Imperial Jean',
      description: 'Calabaza premium · Cuero tipo jean · Virola y detalles de Alpaca cincelada a mano',
      price: 5319000,
      originalPrice: null,
      badge: null,
      badgeType: null,
      imageUrl: 'uploads/products/imperial-jean.jpg',
      categorySlug: 'imperial',
      featured: false,
    },
    {
      name: 'Imperial Gajos Pelota',
      description: 'Tamaño mediano · Cuero negro · Calabaza natural · Gajos cosidos a mano',
      price: 4255200,
      originalPrice: 5319000,
      badge: 'Oferta',
      badgeType: 'sale',
      imageUrl: 'uploads/products/imperial-gajos-pelota.jpg',
      categorySlug: 'imperial',
      featured: true,
    },
    {
      name: 'Imperial Cuero Liso Marrón',
      description: 'Calabaza gruesa seleccionada · Cuero vacuno liso marrón · Virola de Alpaca plateada',
      price: 5319000,
      originalPrice: null,
      badge: null,
      badgeType: null,
      imageUrl: 'uploads/products/imperial-cuero-liso.jpg',
      categorySlug: 'imperial',
      featured: false,
    },
    {
      name: 'Imperial Cuero Negro Grabado',
      description: 'Cuero negro con grabado láser personalizable · Base y virola de Alpaca · Pelotas de Bronce',
      price: 5890000,
      originalPrice: null,
      badge: 'Nuevo',
      badgeType: 'new',
      imageUrl: 'uploads/products/imperial-negro-grabado.jpg',
      categorySlug: 'imperial',
      featured: true,
    },
    {
      name: 'Torpedo Algarrobo Alpaca Cincelado',
      description: 'Madera de algarrobo natural · Virola y base de alpaca cincelada a mano',
      price: 3890000,
      originalPrice: null,
      badge: 'Artesanal',
      badgeType: 'excl',
      imageUrl: 'uploads/products/torpedo-algarrobo.jpg',
      categorySlug: 'torpedo',
      featured: true,
    },
    {
      name: 'Torpedo Calabaza Premium Cuero',
      description: 'Calabaza seleccionada · Cuero vacuno genuino · Virola de Alpaca',
      price: 4200000,
      originalPrice: null,
      badge: null,
      badgeType: null,
      imageUrl: 'uploads/products/torpedo-calabaza-cuero.jpg',
      categorySlug: 'torpedo',
      featured: false,
    },
    {
      name: 'Torpedo Cuero Animal Print',
      description: 'Calabaza torpedo · Cuero animal print exclusivo · Guarda de Alpaca cincelada',
      price: 4500000,
      originalPrice: null,
      badge: 'Nuevo',
      badgeType: 'new',
      imageUrl: 'uploads/products/torpedo-animal-print.jpg',
      categorySlug: 'torpedo',
      featured: true,
    },
    {
      name: 'Algarrobo Boca Ancha Acero Inox',
      description: 'Madera de algarrobo natural · Boca ancha · Virola de Acero Inoxidable',
      price: 2950000,
      originalPrice: null,
      badge: null,
      badgeType: null,
      imageUrl: 'uploads/products/algarrobo-boca-ancha.jpg',
      categorySlug: 'algarrobo',
      featured: false,
    },
    {
      name: 'Algarrobo Copita Virola Alpaca',
      description: 'Forma copita · Madera oscura veteada · Virola y pico lateral de Alpaca cincelada',
      price: 3200000,
      originalPrice: null,
      badge: 'Artesanal',
      badgeType: 'excl',
      imageUrl: 'uploads/products/algarrobo-copita.jpg',
      categorySlug: 'algarrobo',
      featured: true,
    },
    {
      name: 'Térmico Acero 304 Doble Pared',
      description: 'Acero inoxidable 304 · Doble pared · Tapa hermética · Compatible con bombilla',
      price: 4500000,
      originalPrice: null,
      badge: null,
      badgeType: null,
      imageUrl: 'uploads/products/acero-termico.jpg',
      categorySlug: 'acero',
      featured: false,
    },
    {
      name: 'Térmico Personalizado Logo Bombilla',
      description: 'Acero 304 · Grabado láser personalizable con nombre o logo · Incluye bombilla de regalo',
      price: 5800000,
      originalPrice: null,
      badge: null,
      badgeType: null,
      imageUrl: 'uploads/products/acero-personalizado.jpg',
      categorySlug: 'acero',
      featured: false,
    },
    {
      name: 'Bombilla Alpaca Coil Premium',
      description: 'Alpaca plateada · Filtro coil de precisión · Pico recto · Lavable',
      price: 1250000,
      originalPrice: null,
      badge: null,
      badgeType: null,
      imageUrl: 'uploads/products/bombilla-alpaca-coil.jpg',
      categorySlug: 'bombilla',
      featured: false,
    },
    {
      name: 'Bombilla Acero Inox Punta Espiral',
      description: 'Acero inoxidable 304 · Punta espiral · Fácil limpieza · Resistente y duradera',
      price: 890000,
      originalPrice: null,
      badge: 'Inox',
      badgeType: 'excl',
      imageUrl: 'uploads/products/bombilla-acero-espiral.jpg',
      categorySlug: 'bombilla',
      featured: false,
    },
    {
      name: 'Canasta Regalo Completa Imperial',
      description: 'Incluye mate imperial + bombilla + yerba premium 250g + caja presentación',
      price: 8900000,
      originalPrice: null,
      badge: 'Gift Set',
      badgeType: 'excl',
      imageUrl: 'uploads/products/canasta-regalo-imperial.jpg',
      categorySlug: 'canasta',
      featured: true,
    },
    {
      name: 'Combo Starter Mate Bombilla Yerba',
      description: 'Ideal para regalar · Mate torpedo + bombilla alpaca + yerba seleccionada 250g',
      price: 6500000,
      originalPrice: null,
      badge: null,
      badgeType: null,
      imageUrl: 'uploads/products/combo-starter.jpg',
      categorySlug: 'canasta',
      featured: false,
    },
    {
      name: 'Yerba Premium Selección Milán 500g',
      description: 'Blend exclusivo · Corte fino · Sin palos · Sabor suave y aromático · Cosecha 2024',
      price: 1490000,
      originalPrice: null,
      badge: null,
      badgeType: null,
      imageUrl: 'uploads/products/yerba-premium-milan.jpg',
      categorySlug: 'yerba',
      featured: false,
    },
    {
      name: 'Yerba Orgánica Flor de Milán 1kg',
      description: 'Orgánica certificada · Sin palos · Sabor intenso y duradero · Producción limitada',
      price: 1750000,
      originalPrice: null,
      badge: null,
      badgeType: null,
      imageUrl: 'uploads/products/yerba-organica.jpg',
      categorySlug: 'yerba',
      featured: false,
    },
  ];

  for (const product of products) {
    const { categorySlug, ...productData } = product;
    const categoryId = categoryMap[categorySlug];
    await prisma.product.create({
      data: {
        ...productData,
        categoryId,
      },
    });
    console.log('Product created:', product.name);
  }

  // Create promotions
  const promotions = [
    {
      type: 'announcement',
      title: '🔥 20% OFF con efectivo o transferencia',
      active: true,
      discountPct: 20,
    },
    {
      type: 'announcement',
      title: '💳 25% OFF + 3 cuotas sin interés',
      active: true,
      discountPct: 25,
    },
    {
      type: 'announcement',
      title: '🚚 Envíos a todo el país',
      active: true,
    },
    {
      type: 'announcement',
      title: '🧉 Mates 100% artesanales',
      active: true,
    },
    {
      type: 'banner',
      title: '20%',
      description: 'EFECTIVO / TRANSFERENCIA',
      active: true,
      discountPct: 20,
    },
    {
      type: 'banner',
      title: '25%',
      description: 'TARJETA DE CRÉDITO',
      active: true,
      discountPct: 25,
    },
    {
      type: 'banner',
      title: '6x',
      description: 'CUOTAS SIN INTERÉS',
      active: true,
    },
  ];

  for (const promo of promotions) {
    await prisma.promotion.create({ data: promo });
    console.log('Promotion created:', promo.title);
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
