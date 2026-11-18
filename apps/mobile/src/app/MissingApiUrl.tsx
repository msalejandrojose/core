/**
 * Pantalla para un build sin `VITE_API_URL`. Sin ella la app no puede hablar
 * con la API; mejor decirlo claro que quedarse en blanco. No usa Ionic ni el
 * kit: tiene que pintarse aunque falle cualquier otra cosa.
 */
export function MissingApiUrl() {
  return (
    <main
      style={{
        minHeight: '100vh',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'calc(24px + env(safe-area-inset-top, 0px)) 24px 24px',
        background: '#f2f2f7',
        color: '#1c1c1e',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
      }}
    >
      <section
        style={{ maxWidth: 360, background: '#fff', borderRadius: 22, padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <h1 style={{ margin: 0, fontSize: 20, lineHeight: '26px' }}>Falta la dirección del servidor</h1>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.4, color: '#3a3a3c' }}>
          Este build de Brío se compiló sin <code>VITE_API_URL</code>, así que no sabe a qué API conectarse.
        </p>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.4, color: '#6c6c70' }}>
          Ponla en <code>apps/mobile/.env.production.local</code> (por ejemplo, la URL de Cloud Run de{' '}
          <code>brio-api</code>, sin <code>/v1</code>), vuelve a compilar e instala de nuevo desde Forja o Xcode.
        </p>
      </section>
    </main>
  );
}
