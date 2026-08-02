import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { CartProvider } from '@/hooks/useCart';
import { Layout } from '@/components/layout/layout';
import { RequireAuth } from '@/components/layout/require-auth';
import { AdminLayout } from '@/admin/layout/admin-layout';
import { AdminDashboard } from '@/admin/pages/dashboard';
import { AdminProducts } from '@/admin/pages/products';
import { AdminBrands } from '@/admin/pages/brands';
import { AdminCategories } from '@/admin/pages/categories';
import { AdminStock } from '@/admin/pages/stock';
import { AdminOrders } from '@/admin/pages/orders';
import { AdminServiceOrders } from '@/admin/pages/service-orders';
import { AdminServiceCatalog } from '@/admin/pages/service-catalog';
import { AdminCustomers } from '@/admin/pages/customers';
import { AdminUsers } from '@/admin/pages/users';
import { AdminCoupons } from '@/admin/pages/coupons';
import { AdminBanners } from '@/admin/pages/banners';
import { AdminSettings } from '@/admin/pages/settings';
import { AdminLogs } from '@/admin/pages/logs';
import { AdminWarranties } from '@/admin/pages/warranties';
import { AdminWarrantyPolicies } from '@/admin/pages/warranty-policies';
import { AdminReports } from '@/admin/pages/reports';
import { WarrantyLookup } from '@/pages/warranty-lookup';
import { Home } from '@/pages/home';
import { Catalog } from '@/pages/catalog';
import { ProductDetailPage } from '@/pages/product-detail';
import { Login } from '@/pages/login';
import { Register } from '@/pages/register';
import { Checkout } from '@/pages/checkout';
import { OrderPayment } from '@/pages/order-payment';
import { OrderDetailPage } from '@/pages/order-detail';
import { MyOrders } from '@/pages/my-orders';
import { MyAccount } from '@/pages/my-account';
import { ServicePage } from '@/pages/service';
import { ContactPage } from '@/pages/contact';
import { NotFound } from '@/pages/not-found';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="produtos" element={<AdminProducts />} />
              <Route path="marcas" element={<AdminBrands />} />
              <Route path="categorias" element={<AdminCategories />} />
              <Route path="estoque" element={<AdminStock />} />
              <Route path="pedidos" element={<AdminOrders />} />
              <Route path="ordens-servico" element={<AdminServiceOrders />} />
              <Route path="catalogo-servicos" element={<AdminServiceCatalog />} />
              <Route path="clientes" element={<AdminCustomers />} />
              <Route path="usuarios" element={<AdminUsers />} />
              <Route path="cupons" element={<AdminCoupons />} />
              <Route path="banners" element={<AdminBanners />} />
              <Route path="configuracoes" element={<AdminSettings />} />
              <Route path="logs" element={<AdminLogs />} />
              <Route path="garantias" element={<AdminWarranties />} />
              <Route path="politicas-garantia" element={<AdminWarrantyPolicies />} />
              <Route path="relatorios" element={<AdminReports />} />
            </Route>

            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="catalogo" element={<Catalog />} />
              <Route path="produto/:slug" element={<ProductDetailPage />} />
              <Route path="entrar" element={<Login />} />
              <Route path="cadastro" element={<Register />} />
              <Route path="checkout" element={<Checkout />} />
              <Route
                path="pedidos/:id/pagamento"
                element={
                  <RequireAuth>
                    <OrderPayment />
                  </RequireAuth>
                }
              />
              <Route
                path="pedidos/:id"
                element={
                  <RequireAuth>
                    <OrderDetailPage />
                  </RequireAuth>
                }
              />
              <Route
                path="meus-pedidos"
                element={
                  <RequireAuth>
                    <MyOrders />
                  </RequireAuth>
                }
              />
              <Route
                path="minha-conta"
                element={
                  <RequireAuth>
                    <MyAccount />
                  </RequireAuth>
                }
              />
              <Route path="assistencia" element={<ServicePage />} />
              <Route path="garantia" element={<WarrantyLookup />} />
              <Route path="contato" element={<ContactPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
