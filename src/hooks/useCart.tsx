import { createContext, ReactNode, useContext, useRef, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  }, []);

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      let { data: stock } = await api.get<Stock>(`/stock/${productId}`)

      const productExists = cart.find(product => product.id === productId)
      let amount = productExists ? productExists.amount : 0;
      amount += 1

      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExists) {
        if (amount <= stock.amount) {
          const updatedCart = cart.map(product => {
            if (product.id === productExists.id) {
              product.amount = amount
              
              return product
            }

            return product
          })

          setCart([...updatedCart])
        }
      } else {
        let { data: product } = await api.get<Product>(`/products/${productId}`)

        product = {
          ...product,
          amount: 1
        }

        setCart([...cart, product])
      }
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.some(product => product.id === productId)

      if (productExists) {
        const cartWithoutRemovedProduct = cart.filter(product => {
          return product.id !== productId 
        })
  
        setCart([...cartWithoutRemovedProduct])
      } else {
        throw new Error()
      }
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({ productId, amount }: UpdateProductAmount) => {
    try {
      let { data: stock } = await api.get<Stock>(`/stock/${productId}`)
      const productExists = cart.find(product => product.id === productId)

      if (amount <= 0) {
        return;
      }

      if (stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExists) {
        productExists.amount = amount
        setCart([...cart])
      } else {
        throw new Error()
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
