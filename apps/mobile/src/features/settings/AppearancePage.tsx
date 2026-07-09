import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useThemeStore, type Theme } from '@/store/theme.store';

/**
 * Ajuste de apariencia: selector de tema Claro / Oscuro / Sistema (DS §8,
 * segmented control tipo pill). La preferencia la persiste el theme store y la
 * aplica `ThemeProvider`; «Sistema» sigue a `prefers-color-scheme`.
 */
export default function AppearancePage() {
  const { t } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  function onChange(value: Theme) {
    setTheme(value);
    void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/tabs/settings" text="" />
          </IonButtons>
          <IonTitle>{t('appearance.title')}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <p className="core-section-label">{t('appearance.theme')}</p>
        <IonSegment
          className="core-segment"
          value={theme}
          onIonChange={(e) => onChange(e.detail.value as Theme)}
        >
          <IonSegmentButton value="light">
            {t('appearance.light')}
          </IonSegmentButton>
          <IonSegmentButton value="dark">
            {t('appearance.dark')}
          </IonSegmentButton>
          <IonSegmentButton value="system">
            {t('appearance.system')}
          </IonSegmentButton>
        </IonSegment>
        <p className="core-subtitle" style={{ margin: '12px 4px 0' }}>
          {t('appearance.hint')}
        </p>
      </IonContent>
    </IonPage>
  );
}
