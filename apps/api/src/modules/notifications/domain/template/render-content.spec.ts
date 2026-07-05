import { renderContent } from './render-content';

describe('renderContent', () => {
  it('sustituye placeholders simples', () => {
    expect(renderContent('Hola {{ name }}', { name: 'Ana' })).toBe('Hola Ana');
  });

  it('soporta rutas punteadas', () => {
    expect(
      renderContent('{{ user.email }}', { user: { email: 'a@b.com' } }),
    ).toBe('a@b.com');
  });

  it('renderiza recursivamente objetos', () => {
    expect(
      renderContent(
        { subject: 'Hi {{ n }}', html: '<p>{{ n }}</p>' },
        { n: 'Bob' },
      ),
    ).toEqual({ subject: 'Hi Bob', html: '<p>Bob</p>' });
  });

  it('una variable ausente se sustituye por vacío', () => {
    expect(renderContent('x{{ missing }}y', {})).toBe('xy');
  });
});
