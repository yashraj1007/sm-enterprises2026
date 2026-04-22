import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { useAuth } from '../App';
import { ShoppingCart, Search, Plus, Minus, X, Check, Laptop, Cpu, Activity, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from '../utils';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'laptop' | 'accessory';
  specs: any;
  imageUrl: string;
  stock: number;
}

interface CartItem extends Product {
  quantity: number;
}

export default function Shopping() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | 'laptop' | 'accessory'>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'products'));
        setProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const addToCart = (product: Product) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setOrderStatus('loading');
    try {
      await addDoc(collection(db, 'orders'), {
        userId: user?.uid,
        customerEmail: user?.email,
        items: cart.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity })),
        total: cartTotal,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      
      setCart([]);
      setOrderStatus('success');
      setTimeout(() => {
        setOrderStatus('idle');
        setIsCartOpen(false);
      }, 3000);
    } catch (error) {
      console.error('Checkout error:', error);
      setOrderStatus('idle');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) && 
    (category === 'all' || p.category === category)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tech Store</h1>
          <p className="text-gray-600">Find the best hardware for your needs.</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 w-full md:w-64"
            />
          </div>
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ShoppingCart className="h-6 w-6 text-gray-600" />
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex space-x-4 mb-8 overflow-x-auto pb-2">
        {['all', 'laptop', 'accessory'].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat as any)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize whitespace-nowrap ${
              category === cat ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {cat}s
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse bg-white rounded-xl h-80 border border-gray-100"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
           {filteredProducts.map((product) => (
            <motion.div
              key={product.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col group"
            >
              <div 
                className="h-48 overflow-hidden bg-gray-100 cursor-zoom-in relative"
                onClick={() => setSelectedProduct(product)}
              >
                <img
                  src={product.imageUrl || 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes('picsum.photos')) {
                      target.src = 'https://picsum.photos/seed/' + product.id + '/500/300';
                    }
                  }}
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Laptop className="text-white h-8 w-8" />
                </div>
              </div>
              <div className="p-6 flex-grow flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors cursor-pointer" onClick={() => setSelectedProduct(product)}>{product.name}</h3>
                  <span className="text-blue-600 font-bold">{formatCurrency(product.price)}</span>
                </div>
                <p className="text-gray-500 text-sm mb-4 line-clamp-2">{product.description}</p>
                {product.specs && (product.specs.processor || product.specs.ram || product.specs.storage) && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {product.specs.processor && (
                      <div className="bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                         <span className="text-blue-600">Processor:</span> {product.specs.processor}
                      </div>
                    )}
                    {product.specs.ram && (
                      <div className="bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                         <span className="text-purple-600">RAM:</span> {product.specs.ram}
                      </div>
                    )}
                    {product.specs.storage && (
                      <div className="bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                         <span className="text-green-600">Storage:</span> {product.specs.storage}
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => addToCart(product)}
                  className="mt-auto w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add to Cart
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Full View Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 m-auto max-w-4xl max-h-[90vh] bg-white rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden flex flex-col md:flex-row"
            >
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white md:text-gray-900 rounded-full z-10 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>

              <div className="w-full md:w-1/2 h-64 md:h-full bg-gray-100 relative">
                <img 
                  src={selectedProduct.imageUrl || 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'} 
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-8 md:p-12 w-full md:w-1/2 flex flex-col overflow-y-auto">
                <div className="mb-8">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-2 block">{selectedProduct.category}</span>
                  <h2 className="text-4xl font-black text-gray-900 tracking-tight leading-tight">{selectedProduct.name}</h2>
                  <p className="text-3xl font-black text-blue-600 mt-4 tracking-tighter">{formatCurrency(selectedProduct.price)}</p>
                </div>

                <div className="space-y-6 flex-grow">
                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">OVERVIEW</h4>
                    <p className="text-gray-600 leading-relaxed font-medium">{selectedProduct.description}</p>
                  </div>

                  {selectedProduct.specs && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">TECHNICAL SPECIFICATIONS</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {selectedProduct.specs.processor && (
                          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <span className="text-xs font-black text-gray-400 uppercase">Processor</span>
                            <span className="text-sm font-bold text-gray-900">{selectedProduct.specs.processor}</span>
                          </div>
                        )}
                        {selectedProduct.specs.ram && (
                          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <span className="text-xs font-black text-gray-400 uppercase">Memory</span>
                            <span className="text-sm font-bold text-gray-900">{selectedProduct.specs.ram}</span>
                          </div>
                        )}
                        {selectedProduct.specs.storage && (
                          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <span className="text-xs font-black text-gray-400 uppercase">Storage</span>
                            <span className="text-sm font-bold text-gray-900">{selectedProduct.specs.storage}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-12 flex gap-4">
                  <button
                    onClick={() => {
                      addToCart(selectedProduct);
                      setSelectedProduct(null);
                    }}
                    className="flex-grow bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 hover:-translate-y-1 transition-all"
                  >
                    ADD TO CART
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-[70] flex flex-col"
            >
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center">
                  <ShoppingCart className="mr-2 h-6 w-6" /> Your Cart
                </h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-6 space-y-6">
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-gray-500">Your cart is empty</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex space-x-4">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="h-20 w-20 object-cover rounded-lg" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="h-20 w-20 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 italic">
                          <Laptop className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                      <div className="flex-grow">
                        <h4 className="font-bold text-gray-900">{item.name}</h4>
                        <p className="text-blue-600 font-medium">{formatCurrency(item.price)}</p>
                        <div className="flex items-center mt-2 space-x-3">
                          <button onClick={() => updateQuantity(item.id, -1)} className="p-1 border border-gray-200 rounded hover:bg-gray-50"><Minus className="h-3 w-3" /></button>
                          <span className="text-sm font-medium">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)} className="p-1 border border-gray-200 rounded hover:bg-gray-50"><Plus className="h-3 w-3" /></button>
                          <button onClick={() => removeFromCart(item.id)} className="ml-auto text-red-500 hover:text-red-600"><X className="h-4 w-4" /></button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <div className="flex justify-between text-lg font-bold mb-6">
                    <span>Total</span>
                    <span>{formatCurrency(cartTotal)}</span>
                  </div>
                  <button
                    onClick={handleCheckout}
                    disabled={orderStatus === 'loading'}
                    className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center ${
                      orderStatus === 'success' ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {orderStatus === 'loading' ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : orderStatus === 'success' ? (
                      <><Check className="mr-2 h-5 w-5" /> Order Placed!</>
                    ) : (
                      'Checkout Now'
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
