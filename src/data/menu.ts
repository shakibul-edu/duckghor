export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId?: string;
}

export interface Category {
  id: string;
  name: string;
  order?: number;
}

export const MOCK_MENU: MenuItem[] = [
  {
    id: "m1",
    name: "Classic Cheeseburger",
    description: "Angus beef patty with cheddar, lettuce, tomato, and our secret sauce.",
    price: 12.99,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "m2",
    name: "Margherita Pizza",
    description: "Wood-fired pizza with San Marzano tomatoes, fresh mozzarella, and basil.",
    price: 16.50,
    image: "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "m3",
    name: "Spicy Chicken Sandwich",
    description: "Crispy fried chicken breast with spicy mayo and pickles on a brioche bun.",
    price: 11.99,
    image: "https://images.unsplash.com/photo-1626082896492-766af4eb65ed?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "m4",
    name: "Caesar Salad",
    description: "Crisp romaine, parmesan cheese, croutons, and house-made Caesar dressing.",
    price: 9.99,
    image: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "m5",
    name: "Asahi Sushi Platter",
    description: "Chef's selection of 12 premium sashimi and nigiri pieces.",
    price: 28.00,
    image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "m6",
    name: "Pad Thai",
    description: "Stir-fried rice noodles with egg, peanuts, bean sprouts, and tamarind sauce.",
    price: 14.50,
    image: "https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=600&q=80"
  }
];
