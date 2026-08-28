export interface Category {
  id: string;
  name: string;
  image: string;
  slug: string;
}

export interface MenuItemAddon {
  id: string;
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  storeId: string;
  name: string;
  price: number;
  originalPrice?: number;
  description: string;
  image: string;
  isVeg: boolean;
  isBestseller?: boolean;
  category: string;
  rating?: number;
  ratingCount?: number;
  addons?: MenuItemAddon[];
}

export interface Store {
  id: string;
  name: string;
  rating: number;
  reviewsCount?: number;
  deliveryTime: string;
  deliveryFee: number;
  distance?: string;
  image: string;
  bannerImage?: string;
  cuisines: string[];
  priceForTwo?: string;
  discountOffer?: string;
  tags?: string[];
  menuCategories: string[];
  items: MenuItem[];
}

export interface CartItem {
  id: string; // unique cart item id (combines itemId and addons)
  item: MenuItem;
  store: Store;
  quantity: number;
  selectedAddons: MenuItemAddon[];
  specialInstructions?: string;
}

export type OrderStatus = 'placed' | 'confirmed' | 'cooking' | 'out_for_delivery' | 'delivered';

export interface Order {
  id: string;
  orderNumber: string;
  store: {
    id: string;
    name: string;
    image: string;
    deliveryTime: string;
  };
  items: {
    name: string;
    quantity: number;
    price: number;
    isVeg: boolean;
    addons?: string[];
  }[];
  itemTotal: number;
  deliveryFee: number;
  discount: number;
  taxesAndCharges: number;
  tip: number;
  grandTotal: number;
  status: OrderStatus;
  placedAt: string;
  estimatedDeliveryTime: string;
  deliveryAddress: string;
  driverName?: string;
  driverPhone?: string;
  driverRating?: number;
  driverPhoto?: string;
  paymentMethod: string;
}

export interface UserAddress {
  id: string;
  label: 'Hostel' | 'Home' | 'Work' | 'Other';
  addressLine: string;
  roomNo?: string;
  hostelName?: string;
  locality: string;
  city: string;
  isDefault: boolean;
}

export type ActiveTab = 'home' | 'search' | 'orders';
