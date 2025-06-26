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
      <ins className="adsbygoogle"
           style={{ display: 'block', width: '100%' }} // Estilo ajustado para responsividade
           data-ad-client="ca-pub-5138549414459170" // Seu ID de cliente
           data-ad-slot="7561598071"               // Seu ID de bloco de anúncio (atualizado)
           data-ad-format="auto"
           data-full-width-responsive="true">
      </ins>
    </div>
  );
};

export default AdBanner;
