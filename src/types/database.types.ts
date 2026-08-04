// Simple Database types to avoid React serialization issues
export interface Database {
  public: {
    Tables: {
      products: any;
      orders: any;
      inventory: any;
      inventory_logs: any;
      cart: any;
      profiles: any;
      face_analyses: any;
    };
  };
}
