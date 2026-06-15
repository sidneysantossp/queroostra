export type ExperienceProduct = {
  id: string;
  name: string;
  size: string;
  details: string[];
  price: number;
  image: string;
  tag?: string;
};

export type MenuProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
};

export type BeverageCategory = {
  id: string;
  name: string;
  eyebrow: string;
  description: string;
  products: MenuProduct[];
};

export type CartProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
};

export const CART_STORAGE_KEY = "quero-ostra-cart";

export const oysterExperiences: ExperienceProduct[] = [
  {
    id: "gratinada",
    name: "Brasa Gourmet",
    size: "Ostras gratinadas",
    details: ["Limões selecionados", "Molho especial da casa", "Com gelo e sal"],
    price: 149.9,
    image: "/images/ostra-gratinada.png",
  },
  {
    id: "baby",
    name: "Degustação",
    size: "Ostras baby",
    details: ["Limões selecionados", "Molho especial da casa", "Com gelo e sal"],
    price: 69.9,
    image: "/images/kit-degustacao.png",
  },
  {
    id: "tradicional",
    name: "Happy Hour",
    size: "Ostras tradicionais",
    details: ["Limões selecionados", "Molho especial da casa", "Com gelo e sal"],
    price: 79.9,
    image: "/images/kit-happy-hour.png",
    tag: "Mais escolhido",
  },
  {
    id: "premium",
    name: "Momentos",
    size: "Ostras grandes",
    details: ["Limões selecionados", "Molho especial da casa", "Com gelo e sal"],
    price: 129.9,
    image: "/images/kit-premium.png",
  },
];

export const beverageCategories: BeverageCategory[] = [
  {
    id: "aguas",
    name: "Águas",
    eyebrow: "Leve e essencial",
    description: "Água mineral de 500 ml para acompanhar sua experiência.",
    products: [
      {
        id: "agua-sem-gas",
        name: "Água mineral sem gás",
        description: "Garrafa 500 ml",
        price: 6,
      },
      {
        id: "agua-com-gas",
        name: "Água mineral com gás",
        description: "Garrafa 500 ml",
        price: 7,
      },
    ],
  },
  {
    id: "refrigerantes",
    name: "Refrigerantes",
    eyebrow: "Clássicos gelados",
    description: "Latas individuais para servir bem geladas.",
    products: [
      {
        id: "coca-cola",
        name: "Coca-Cola",
        description: "Lata 350 ml",
        price: 8.5,
      },
      {
        id: "guarana",
        name: "Guaraná",
        description: "Lata 350 ml",
        price: 8.5,
      },
      {
        id: "fanta",
        name: "Fanta Laranja",
        description: "Lata 350 ml",
        price: 8.5,
      },
    ],
  },
  {
    id: "cervejas",
    name: "Cervejas",
    eyebrow: "Brinde bem gelado",
    description: "Rótulos populares para harmonizar com as ostras.",
    products: [
      {
        id: "brahma",
        name: "Brahma",
        description: "Lata 350 ml",
        price: 9.9,
      },
      {
        id: "heineken",
        name: "Heineken",
        description: "Long neck 330 ml",
        price: 13.9,
      },
      {
        id: "itaipava",
        name: "Itaipava",
        description: "Lata 350 ml",
        price: 8.9,
      },
    ],
  },
  {
    id: "vinhos",
    name: "Vinhos",
    eyebrow: "Harmonizações selecionadas",
    description: "Vinhos escolhidos para acompanhar ostras frescas e gratinadas.",
    products: [
      {
        id: "sauvignon-blanc",
        name: "Sauvignon Blanc",
        description: "Vinho branco seco • 750 ml",
        price: 89.9,
      },
      {
        id: "chardonnay",
        name: "Chardonnay",
        description: "Vinho branco • 750 ml",
        price: 109.9,
      },
      {
        id: "espumante-brut",
        name: "Espumante Brut",
        description: "Espumante nacional • 750 ml",
        price: 119.9,
      },
    ],
  },
];

export const cartProducts: CartProduct[] = [
  ...oysterExperiences.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.size,
    price: product.price,
    category: "ostras",
    image: product.image,
  })),
  ...beverageCategories.flatMap((category) =>
    category.products.map((product) => ({
      ...product,
      category: category.id,
    })),
  ),
];
