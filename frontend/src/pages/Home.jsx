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

export default function Home() {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <>
      <AnnouncementBar />
      <Header onCartOpen={() => setCartOpen(true)} />
      <HeroSlider />
      <FeaturesBar />
      <ProductSection />
      <PromoCards />
      <AboutSection />
      <ContactSection />
      <Footer />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <WhatsAppFAB />
    </>
  );
}
