import { useState } from 'react';
import AnnouncementBar from '../components/AnnouncementBar';
import Header from '../components/Header';
import HeroSlider from '../components/HeroSlider';
import FeaturesBar from '../components/FeaturesBar';
import ProductSection from '../components/ProductSection';
import PromoCards from '../components/PromoCards';
import AboutSection from '../components/AboutSection';
import ContactSection from '../components/ContactSection';
import Footer from '../components/Footer';
import CartDrawer from '../components/CartDrawer';
import WhatsAppFAB from '../components/WhatsAppFAB';
import MyOrders from './MyOrders';

export default function Home() {
  const [cartOpen, setCartOpen] = useState(false);
  const [myOrdersOpen, setMyOrdersOpen] = useState(false);

  return (
    <>
      <AnnouncementBar />
      <Header
        onCartOpen={() => setCartOpen(true)}
        onMyOrders={() => setMyOrdersOpen(true)}
      />
      <HeroSlider />
      <FeaturesBar />
      <ProductSection />
      <PromoCards />
      <AboutSection />
      <ContactSection />
      <Footer />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <WhatsAppFAB />
      {myOrdersOpen && <MyOrders onClose={() => setMyOrdersOpen(false)} />}
    </>
  );
}
