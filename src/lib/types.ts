export type Category = { id: string; name: string; sort: number; active: boolean };

export type Option = {
  id: string; option_group_id: string; name: string;
  price: number; color: string | null; active: boolean; sort: number;
};

export type OptionGroup = {
  id: string; name: string; min_pick: number; max_pick: number | null;
  required: boolean; sort: number; options: Option[];
};

export type Product = {
  id: string; category_id: string; name: string; description: string | null;
  price: number; image_url: string | null; is_build: boolean;
  active: boolean; sold_out: boolean; sort: number;
  groups?: { sort: number; group: OptionGroup }[];
};

export type Comanda = {
  id: string; number: number; token: string;
  status: "livre" | "aberta" | "fechada";
};

export type OrderItemOption = { id: string; name: string; price: number };
export type OrderItem = {
  id: string; name: string; unit_price: number; qty: number;
  order_item_options: OrderItemOption[];
};
export type Order = {
  id: string; comanda_id: string;
  status: "novo" | "preparando" | "pronto" | "entregue";
  total: number; created_at: string;
  order_items: OrderItem[];
  comanda?: { number: number; status: string };
};

// linha do carrinho (antes de enviar)
export type CartLine = {
  uid: string; product_id: string; name: string; unit_price: number;
  qty: number; kind: string; options: { name: string; price: number }[];
};
