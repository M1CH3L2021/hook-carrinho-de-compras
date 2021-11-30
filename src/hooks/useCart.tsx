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
      let { data: product } = await api.get<Product>(`/products/${productId}`)
      let { data: stock } = await api.get<Stock>(`/stock/${productId}`)
      
      product = {
        ...product,
        amount: 1
      }

      stock = {
        ...stock,
        amount: stock.amount - 1
      }

      const isProductAlreadyInCart = cart.some(product => {
        return product.id === productId
      })

      isProductAlreadyInCart
        ? toast.info('Este produto já está no carrinho!')
        : setCart([...cart, product])
      console.log(cart)
    } catch {
      toast.error('Falha ao adicionar produto ao carrinho')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartWithoutRemovedProduct = cart.filter(product => {
        return product.id !== productId 
      })

      setCart([...cartWithoutRemovedProduct])
      console.log(cart)
    } catch {
      toast.error('Falha ao remover produto do carrinho')
    }
  };

  const updateProductAmount = async ({ productId, amount }: UpdateProductAmount) => {
    try {
      let { data: stock } = await api.get<Stock>(`/stock/${productId}`)

      const cartWithAmountsUpdated = cart.map(product => {
        if (product.id === productId && amount < stock.amount + 1) {
          product.amount = amount
          return product
        }

        return product
      })

      if (amount > stock.amount) {
        toast.warn('O estoque deste produto se esgotou!')
      } else {
        setCart([...cartWithAmountsUpdated])
      }
    } catch {
      toast.error('Falha ao alterar a quantidade do produto!')
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
