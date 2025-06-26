import React, { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

const AdBanner: React.FC = () => {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense Error:', e);
    }
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      width: '100%',
      backgroundColor: '#f1f1f1',
      textAlign: 'center',
      zIndex: 10000,
      borderTop: '1px solid #e0e0e0',
      minHeight: '50px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* 
        O ID do cliente já foi adicionado.
        Agora, substitua 'YOUR_AD_SLOT_ID' pelo ID do bloco de anúncios que você acabou de criar no AdSense.
      */}
      <ins className="adsbygoogle"
           style={{ display: 'block', width: '320px', height: '50px' }}
           data-ad-client="ca-pub-5138549414459170" // SEU ID DE CLIENTE (JÁ INSERIDO)
           data-ad-slot="YOUR_AD_SLOT_ID"          // COLE O SEU ID DE BLOCO DE ANÚNCIO AQUI
           data-ad-format="auto"
           data-full-width-responsive="true">
      </ins>
    </div>
  );
};

export default AdBanner;
