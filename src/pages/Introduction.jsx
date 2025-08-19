import React from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/Introduction.css';
import '../styles/Layout.css';

// 這個元件用來處理包含 <strong> 標籤的 HTML 內容
const DangerousHTML = ({ html }) => {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

function Introduction() {
  const { t } = useTranslation();

  return (
    <main className="main-content width-intro">
      <h1 className="page-title">{t('introductionPage.title')}</h1>

      <div className="content-section">
        <h2>
          <span className="icon">🎯</span>
          {t('introductionPage.whatIsTitle')}
        </h2>
        <p>{t('introductionPage.whatIsText')}</p>
      </div>

      <div className="content-section">
        <h2>
          <span className="icon">🚀</span>
          {t('introductionPage.howToUseTitle')}
        </h2>
        <p>{t('introductionPage.howToUseText')}</p>
        <ul>
          <li><DangerousHTML html={t('introductionPage.step1')} /></li>
          <li><DangerousHTML html={t('introductionPage.step2')} /></li>
          <li><DangerousHTML html={t('introductionPage.step3')} /></li>
        </ul>
      </div>

      <div className="content-section">
        <h2>
          <span className="icon">📊</span>
          {t('introductionPage.trackProgressTitle')}
        </h2>
        <p><DangerousHTML html={t('introductionPage.trackProgressText')} /></p>
      </div>
    </main>
  );
}

export default Introduction;
