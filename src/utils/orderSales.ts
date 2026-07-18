type OrderProduct = { productId: unknown; quantity: unknown };

const quantityOf = (product: OrderProduct) => Number(product.quantity) || 0;

export const buildSalesIncrementOps = (products: OrderProduct[] = []) =>
  products.map((product) => ({
    updateOne: {
      filter: { _id: product.productId },
      update: { $inc: { salesCount: quantityOf(product) } },
    },
  }));

export const buildSalesDecrementOps = (products: OrderProduct[] = []) =>
  products.map((product) => ({
    updateOne: {
      filter: { _id: product.productId },
      update: [
        {
          $set: {
            salesCount: {
              $max: [0, { $subtract: ["$salesCount", quantityOf(product)] }],
            },
          },
        },
      ],
    },
  }));
